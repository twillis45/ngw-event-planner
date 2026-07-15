// ─── When should you have this vendor's arrival time? ────────────────────────
//
// The Day tab's own empty state says the schedule "fills in as vendors and their arrival
// times settle" — and then the app does nothing whatsoever to make that happen. The arrival
// field is a bare, empty <input type="time"> and the host is left to remember, on their own,
// that a caterer needs chasing.
//
// ── What is and is not groundable here ───────────────────────────────────────
// NOT the clock time. There is no authored "catering arrives 2h before guests" anywhere in
// the playbooks — I grepped setupMinutes | hoursBefore | arrivalOffset | typicalArrival and
// got zero hits. Proposing "4:00 PM" would be inventing the offset, which is precisely the
// bug this whole sweep exists to kill. Only the VENDOR can tell you when they arrive.
//
// IS the DEADLINE. Every vendor playbook authors its own arrival_time promise with its own
// lead, and the leads genuinely vary — catering wants it 3 days out, a photographer 7. That
// is a real constraint, not a constant in playbook clothing (contrast payment_terms, which
// is `daysBefore: 30` in all thirteen playbooks and therefore grounds nothing).
//
// So: we propose the DEADLINE and we draft the ASK. The vendor supplies the hour.

import { daysUntil } from './dates';
import { getVendorPlaybook } from './vendorAccountability/playbooks';

const ARRIVAL_KEYS = new Set(['arrival_time', 'delivery_time', 'setup_window', 'delivery_window']);

/**
 * When this vendor's arrival time should be locked, per their OWN playbook.
 *
 * @returns {null | {
 *   daysBefore: number, dueIso: string, dueInDays: number, overdue: boolean,
 *   label: string, why: string
 * }}
 * Null when the vendor already gave a time, when they're an informal helper (a friend
 * bringing a dish is not a vendor to chase), or when their playbook authors no arrival
 * promise — in which case we say nothing rather than invent a deadline.
 */
export function arrivalAsk(vendor, event, now) {
  const v = vendor || {};
  const ev = event || {};
  if (!v.name || v.isInformal) return null;
  if (String(v.arrivalTime || '').trim()) return null;      // they've already told you
  if (!ev.date) return null;

  let pb = null;
  try { pb = getVendorPlaybook(v.category); } catch (_e) { pb = null; }
  const promise = ((pb && pb.commonPromises) || []).find((p) => p && ARRIVAL_KEYS.has(p.key));
  if (!promise) return null;                                 // no authored lead ⇒ no deadline
  // RE-AUDIT (fresh-eyes, 2026-07-14): getVendorPlaybook falls back to the generic 'other'
  // playbook for any unrecognized category — and OTHER authors arrival_time at 7 days. So
  // the "no authored lead ⇒ no deadline" branch above was effectively unreachable, and the
  // copy attributed the 7-day norm to the CATEGORY: "crab house (steam & season crabs for
  // pickup) usually locks the arrival time 7 days out" — a norm nobody authored for crab
  // houses. The deadline is still worth surfacing (a week out is a fair general rule), but
  // it must OWN being a rule of thumb, not wear the category's name.
  const generic = (pb && pb.categoryKey === 'other');

  const daysBefore = Math.max(0, Number(promise.daysBefore) || 0);
  const toEvent = daysUntil(ev.date, now);
  if (toEvent == null) return null;

  const dueInDays = toEvent - daysBefore;
  const base = new Date(String(ev.date).slice(0, 10) + 'T00:00:00');
  base.setDate(base.getDate() - daysBefore);
  const dueIso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;

  // Casing: lowercase ONLY a single simple word ("Catering" → "catering"). A blanket
  // toLowerCase turned "DJ" into "dj"; the all-caps guard then still mangled mixed strings
  // ("AV / Tech" → "av / tech"). Anything that isn't one plain capitalized word keeps the
  // host's own casing.
  const raw = String(v.category || 'vendor');
  const kind = /^[A-Z][a-z]+$/.test(raw) ? raw.toLowerCase() : raw;
  const overdue = dueInDays < 0;
  const late = Math.abs(dueInDays);

  return {
    daysBefore, dueIso, dueInDays, overdue,
    label: overdue
      ? `${late} ${late === 1 ? 'day' : 'days'} past when you'd want it`
      : dueInDays === 0 ? 'wanted today' : `wanted in ${dueInDays} ${dueInDays === 1 ? 'day' : 'days'}`,
    why: generic
      ? (overdue
        ? `${v.name} still hasn't given you an arrival time. Most vendors lock it about a week out — a rule of thumb, not a ${kind} norm — and that was ${late} ${late === 1 ? 'day' : 'days'} ago. Ask them.`
        : `Most vendors lock their arrival time about a week out — a rule of thumb, not a ${kind} norm. Only ${v.name} can tell you the hour — here's the ask.`)
      : (overdue
        ? `${v.name} still hasn't given you an arrival time, and ${kind} usually locks it ${daysBefore} ${daysBefore === 1 ? 'day' : 'days'} out — that was ${late} ${late === 1 ? 'day' : 'days'} ago. Ask them.`
        : `${kind} usually locks the arrival time ${daysBefore} ${daysBefore === 1 ? 'day' : 'days'} before the event. Only ${v.name} can tell you the hour — here's the ask.`),
  };
}

/** Every vendor still owing you an arrival time, most-overdue first. */
export function openArrivalAsks(event, now) {
  const ev = event || {};
  return (Array.isArray(ev.vendors) ? ev.vendors : [])
    .map((v) => ({ vendor: v, ask: arrivalAsk(v, ev, now) }))
    .filter((x) => x.ask)
    .sort((a, b) => a.ask.dueInDays - b.ask.dueInDays);
}
