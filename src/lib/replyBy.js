// ─── When should guests reply by? Propose it, ground it, let the host own it. ──
//
// The old answer was `event.date − 7` — a bare constant, returned with `hard: true`, and
// printed on the invitation as though the host had chosen it. A guest was shown a deadline
// nobody had committed to, and the number wasn't even connected to anything real.
//
// Deleting it was only half an answer. A reply-by date genuinely helps — the whole point of
// an RSVP is to LOCK THE COUNT, and the count has actual downstream deadlines. So: the app
// PROPOSES a date, shows its work, and the host accepts or changes it. Once they do, it is
// theirs (`event.rsvpDeadline`, source 'override') and the invitation may speak it.
//
// Grounded, not guessed. The proposal is derived from the things that genuinely cannot
// proceed without a final headcount:
//
//   · every real vendor's own playbook promise for the count — catering wants the final
//     guest count 7 days out, staffing wants a headcount at 14, a florist wants the final
//     arrangement count at 21 (vendorAccountability/playbooks.js)
//   · the event playbook's own count-dependent tasks — a crab feast's "Pre-order the crabs
//     by size and count" is T-5d
//
// The EARLIEST of those is the real wall. Then add a few days to chase the stragglers,
// because "replies by" and "count locked" are not the same day — somebody always forgets.
//
// If nothing in the plan actually needs a count yet, we say so rather than inventing a
// constraint: the proposal is still offered, but labelled as a general rule of thumb.

import { daysUntil } from './dates';
import { getVendorPlaybook } from './vendorAccountability/playbooks';
import { taskLeadDays } from './taskLead';

// The promise keys across the vendor playbooks that mean "I need to know how many people".
const COUNT_PROMISE_KEYS = new Set(['final_guest_count', 'final_count', 'headcount', 'guest_count', 'passenger_count']);

// Days between "replies are in" and "the count is locked" — nobody replies on the deadline,
// and the host needs room to chase. Not a fudge factor; it is the chase itself, and it is
// disclosed in the copy rather than buried.
export const CHASE_DAYS = 3;

// The rule of thumb used only when NOTHING in the plan depends on a count yet. Labelled as
// such wherever it is shown, so it is never mistaken for a real constraint.
const DEFAULT_COUNT_LEAD = 7;

/**
 * What in this event actually needs a locked headcount, and how early?
 * @returns {{label:string, daysBefore:number, source:'vendor'|'task'}[]} earliest first
 */
export function countDrivers(event) {
  const out = [];
  const ev = event || {};

  for (const v of (Array.isArray(ev.vendors) ? ev.vendors : [])) {
    if (!v || !v.name || v.isInformal) continue;   // a friend helping out is not a deadline
    let pb = null;
    try { pb = getVendorPlaybook(v.category); } catch (_e) { pb = null; }
    const promises = (pb && pb.commonPromises) || [];
    for (const p of promises) {
      if (!COUNT_PROMISE_KEYS.has(p.key)) continue;
      out.push({
        label: `${v.name} needs your ${String(p.label || 'final count').toLowerCase()}`,
        daysBefore: Math.max(0, Number(p.daysBefore) || 0),
        source: 'vendor',
      });
    }
  }

  // The event's own count-dependent work (a crab pre-order can't be placed without a count).
  for (const t of (Array.isArray(ev.timeline) ? ev.timeline : [])) {
    if (!t || t.done) continue;
    const text = String(t.task || '');
    if (!/head\s?count|guest count|final count|by size and count|lock (the )?count/i.test(text)) continue;
    const lead = taskLeadDays(t);
    if (lead == null) continue;
    out.push({ label: text, daysBefore: Math.abs(lead), source: 'task' });
  }

  return out.sort((a, b) => b.daysBefore - a.daysBefore);   // earliest wall first
}

/**
 * The proposed reply-by date, with its reasoning.
 *
 * @returns {null | {
 *   iso: string|null, days: number|null, leadDays: number,
 *   driver: {label,daysBefore,source}|null, drivers: [], grounded: boolean,
 *   why: string, tooClose: boolean
 * }}
 * `grounded: false` means nothing in the plan needs a count yet — the date is a rule of
 * thumb, and every surface that shows it must say so.
 * `tooClose: true` means the event is so near that no honest date can be given; the ask
 * becomes "as soon as you can" rather than a deadline already in the past.
 */
export function proposeReplyBy(event, now) {
  const ev = event || {};
  const toEvent = daysUntil(ev.date, now);
  if (toEvent == null) return null;

  const drivers = countDrivers(ev);
  const driver = drivers[0] || null;
  const grounded = !!driver;
  const countLead = driver ? driver.daysBefore : DEFAULT_COUNT_LEAD;
  const leadDays = -(countLead + CHASE_DAYS);

  // The deadline would already be behind us — do not print a date the guest cannot meet.
  const dueIn = toEvent + leadDays;
  if (dueIn < 0) {
    return {
      iso: null, days: dueIn, leadDays, driver, drivers, grounded, tooClose: true,
      why: grounded
        ? `${driver.label} ${driver.daysBefore} days before the event — that window is already open, so ask for replies as soon as they can.`
        : 'The event is close — ask for replies as soon as they can, rather than naming a date that has passed.',
    };
  }

  const base = new Date(String(ev.date).slice(0, 10) + 'T00:00:00');
  base.setDate(base.getDate() + leadDays);   // leadDays is negative
  const iso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;

  const why = grounded
    ? `${driver.label} ${driver.daysBefore} ${driver.daysBefore === 1 ? 'day' : 'days'} before the event. This gives you ${CHASE_DAYS} days to chase whoever hasn’t answered.`
    : `Nothing in your plan needs a final count yet, so this is a rule of thumb — a week to lock the count, plus ${CHASE_DAYS} days to chase. Change it to whatever suits you.`;

  return { iso, days: dueIn, leadDays, driver, drivers, grounded, tooClose: false, why };
}
