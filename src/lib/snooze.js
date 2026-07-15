// ─── Snooze: let the host set something down without losing it ────────────────
//
// The attention audit named this as the reason the zero state can't be believed:
//
//     "The only way to clear an item is to do the work — so a host who has consciously
//      decided to leave something has no way to say so, the list never empties, and they
//      stop reading it. This is why leaders' zero states are believed and ours won't be."
//
// A todo app snoozes to a date the user picks. An event is different: it has a fixed date,
// and every task has its own lead time, so "remind me in a week" can quietly push a thing
// PAST the last moment it could still be done. Snooze here has to respect the clock.
//
// ── The grounded default (host directive pattern) ────────────────────────────
// Like every other default in this app, snooze proposes and the host owns it. The proposed
// resurface point is:
//
//     half of the remaining runway to the event — but NEVER past the item's own lead window
//
// Half the runway, because the closer the event, the less slack there is to sit on a thing.
// Capped at the lead window, because an item due in 4 days must not resurface in 6. And a
// CRITICAL can never be snoozed at all — "your caterer hasn't arrived" is not a someday.
//
// Today the proposal is the only snooze target the UI offers (one "not now" action, no
// date picker); letting the host pick a custom day is a possible future affordance.

import { daysUntil } from './dates';

// One local-date formatter — toISOString() drifts a day after UTC midnight.
const _fmtLocalISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Days from today to when a snoozed item should come back, given the runway + its own lead.
 *  Null when it should not be snoozeable at this distance (too close to matter). */
export function proposedSnoozeDays(event, opts = {}) {
  const toEvent = daysUntil(event && event.date);
  if (toEvent == null || toEvent <= 1) return null;   // 0–1 day out, nothing sits — do it or don't
  // Half the remaining runway, at least 1 day (snoozing to "today" is not snoozing).
  let days = Math.max(1, Math.floor(toEvent / 2));
  // Never resurface AFTER the item's own window closes. leadDays is negative (T-Nd); the
  // window closes `toEvent + leadDays` days from now. Come back with a day to spare.
  if (Number.isFinite(opts.leadDays)) {
    const windowCloses = toEvent + Number(opts.leadDays);      // e.g. 20 days out, T-5d → 15
    if (windowCloses > 0) days = Math.min(days, Math.max(1, windowCloses - 1));
    else return null;                                          // window already open/closed — don't hide it
  }
  return days;
}

/** The ISO date a proposed snooze resurfaces on, or null. */
export function proposedSnoozeUntil(event, opts = {}) {
  const days = proposedSnoozeDays(event, opts);
  if (days == null) return null;
  const base = new Date(); base.setHours(0, 0, 0, 0); base.setDate(base.getDate() + days);
  return _fmtLocalISO(base);
}

/**
 * WAVE-6 (2026-07-15) — custom-date support, lib only (the date picker is phase 2).
 *
 * The host picks a day; the clock still owns the bounds. The picked ISO date is
 * clamped to the honest window:
 *
 *     [ tomorrow,  min(event − 1 day,  window close − 1 day) ]
 *
 * where "window close" is the item's own lead window (event + leadDays; leadDays is
 * negative, T-5d → -5) — the same cap proposedSnoozeDays applies to the proposal.
 * Snoozing to "today" is not snoozing (floor: tomorrow); snoozing past the event or
 * past the item's own last-possible day is hiding, not setting down (ceiling).
 *
 * Returns the clamped 'YYYY-MM-DD', or null when NO valid day exists — the event is
 * tomorrow/today/past, or the item's window is already open/closed. A null is a
 * refusal, same contract as proposedSnoozeUntil: the item cannot be hidden at all.
 * Pure function; no event date → only the tomorrow floor applies (nothing to cap to).
 */
export function clampSnoozeUntil(event, isoDate, opts = {}) {
  if (!isoDate) return null;
  const target = new Date(String(isoDate) + 'T00:00:00');
  if (isNaN(target.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  // Ceiling, in days-from-today: the day before the event, tightened to the day
  // before the item's own window closes when the action carries a real lead.
  let upper = null;                                        // null → no event date, no ceiling
  const toEvent = daysUntil(event && event.date);
  if (toEvent != null) {
    upper = toEvent - 1;                                   // event − 1d
    if (Number.isFinite(opts.leadDays)) {
      upper = Math.min(upper, toEvent + Number(opts.leadDays) - 1);  // window close − 1d
    }
  }
  if (upper != null && upper < 1) return null;             // no valid day — refuse, never hide

  let clamped = target < tomorrow ? tomorrow : target;
  if (upper != null) {
    const ceiling = new Date(today); ceiling.setDate(today.getDate() + upper);
    if (clamped > ceiling) clamped = ceiling;
  }
  return _fmtLocalISO(clamped);
}

/** A CRITICAL is never snoozeable — that is the one hard rule, not a default.
 *  An action with NO id is equally unsnoozeable: there is nothing stable to write
 *  the snooze against. That is a contract, not just a guard — calm fillers ("Event
 *  on track…", the calendar and heart lines) deliberately carry NO id (see
 *  CommandCenter _topActionId), because the lone calm line is a state, not a task,
 *  and "not now" on it would be meaningless. (WAVE-5 RANKING, 2026-07-15.)
 *
 *  BUNDLE SEMANTICS (WAVE-6, 2026-07-15). When one surface contributes ≥3 raises,
 *  eventPlan collapses them into ONE bundle action { id: 'bundle:<surface>',
 *  kind: 'bundle', items: [children] }. Snoozing the bundle writes ONE entry
 *  against the bundle id — that single entry sets aside ALL of its children as a
 *  unit (the whole bundle moves to eventPlan's setAside). Children keep their own
 *  per-item ids: an individually-snoozed child drops out BEFORE bundling (so the
 *  bundle's count reflects only what is actually up), and if the surface later
 *  contributes fewer than 3 raises the per-item snoozes still hold on their own.
 *  A bundle whose level is 'critical' (max of its children) is unsnoozeable like
 *  any critical, and a critical CHILD ignores its own stale snooze as always. */
export function canSnooze(action) {
  if (!action || !action.id) return false;
  return String(action.level || '') !== 'critical';
}

/** Is this action currently snoozed? Reads event.snoozed = { [actionId]: 'YYYY-MM-DD' }. */
export function isSnoozed(event, actionId, now) {
  const map = (event && event.snoozed && typeof event.snoozed === 'object') ? event.snoozed : {};
  const until = map[actionId];
  if (!until) return false;
  const d = daysUntil(until, now);
  // A snooze that has come due is over — it stops hiding the item, automatically. The map
  // entry is harmless to leave; it simply no longer suppresses.
  return d != null && d > 0;
}

/** When a snoozed item comes back — for the "sleeping · back Jul 20" line. */
export function snoozedUntil(event, actionId) {
  const map = (event && event.snoozed && typeof event.snoozed === 'object') ? event.snoozed : {};
  return map[actionId] || null;
}

/**
 * Drop snoozed items out of a ranked list. A CRITICAL ignores its own snooze entry — if an
 * item a host set down has since escalated to critical, it is no longer a someday, and a
 * stale snooze must not bury it.
 */
export function applySnooze(actions, event, now) {
  return (actions || []).filter((a) => {
    if (!a || !a.id) return true;
    if (String(a.level || '') === 'critical') return true;   // critical overrides any snooze
    return !isSnoozed(event, a.id, now);
  });
}
