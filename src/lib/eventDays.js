// ─── Days until the event — ONE reader ─────────────────────────────────────
//
// The bug this exists to kill (2026-07-14): vendorIntelligence.js and
// vendorCopilot.js each carried their own copy of
//
//     Math.round((new Date(iso + 'T00:00:00') - Date.now()) / 86400000)
//
// both under a comment proudly declaring them "deliberately self-contained — no
// import from elsewhere." That subtracts a WALL-CLOCK instant from a MIDNIGHT and
// rounds the remainder. At 3pm on the day before the event there are nine hours
// left, nine hours rounds to zero days, and every vendor surface starts announcing
// "Event Day" and "needed today" — to a host whose event is tomorrow.
//
// Days between two DATES is a calendar question, not a duration question. Both
// sides must be midnight, and the answer is exact, so no rounding is needed to
// paper over a half-day. Rounding was hiding the units error.
//
// Anything that asks "how many days until the event" imports this. A second copy
// of this arithmetic is a bug, not an optimization.

/** Local midnight for a `YYYY-MM-DD` (or Date-parsable) value. Null if unparsable. */
function midnight(value) {
  if (!value) return null;
  const d = value instanceof Date ? new Date(value.getTime()) : new Date(String(value).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Whole calendar days from today until `iso`.
 *   tomorrow → 1  (at 00:01 and at 23:59 alike — the clock does not move the date)
 *   today    → 0
 *   yesterday→ -1
 * Returns null when the date is missing or unparsable.
 *
 * @param {string|Date} iso
 * @param {Date} [now] injectable for tests
 */
export function daysUntil(iso, now) {
  const target = midnight(iso);
  if (!target) return null;
  // Read "now" through Date.now() rather than a bare `new Date()` so a caller can
  // pin the clock. Not a test affordance: this module's whole job is time, and time
  // you cannot pin is time you cannot check.
  const today = midnight(now || new Date(Date.now()));
  return Math.round((target - today) / 86_400_000);
}

/** True only on the event's actual calendar date. */
export function isEventDay(iso, now) {
  return daysUntil(iso, now) === 0;
}

/** True once the event's date has passed. */
export function isPastEvent(iso, now) {
  const d = daysUntil(iso, now);
  return d != null && d < 0;
}
