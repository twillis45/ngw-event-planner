// ─── HOW MANY PEOPLE WILL EAT, ASKED ONCE ─────────────────────────────────
//
// A roster ROW is not a PERSON, and a person is not a PLATE. `catererCount`
// counts plates. Eight places across four files derived "confirmed guests" as
// `guests.filter(g => g.rsvp === 'Yes').length` — a row count — and compared
// it to that number.
//
// MEASURED on ev-x-retirement-party 2026-09-27: the row count is 5, the cover
// count is 7, and the difference is one roster row whose own notes ask for
// "Two kids' meals (ages 6, 9)". The hero told the host her caterer was set
// for 60 against 5 confirmed. Both numbers were in the data; only one of them
// answered the question being asked.
//
// ── THIS IS THE FOURTH INSTANCE OF A DOCUMENTED PATTERN ───────────────────
//
// WHERE_WE_ARE records "One field, two meanings, is this repo's recurring
// defect" with three instances from 2026-08-06. The rule was then settled
// three more times, each in its own consumer:
//
//   playbooks/index.js  attendanceBand   "a filled plusOne is a real adult
//                                         riding this row's answer"
//   crabPlan.js         rosterHeadcount  "10 adults each bringing 3 kids
//                                         read as 10 heads"
//   seatingPlan.js      seatsFor         the same fix, for chairs
//
// Three engines had it right and every caller re-derived it wrongly. So the
// answer is not a fourth correct copy — it is ONE reader, here, that the
// callers import. A concept with eight implementations has no owner.
//
// PURE: no I/O, no UI, no storage.
import { attendanceBand } from './playbooks';

/**
 * Confirmed COVERS for an event — what a caterer, a seating plan or a meal
 * count should be sized against.
 *
 * Roster mode: rows + filled plusOnes + the kids those confirmed rows bring,
 * via attendanceBand's `low`. Headcount mode: the host's own number, which is
 * the only thing she has told us. Neither available: **null**.
 *
 * NULL IS NOT ZERO, and the distinction is load-bearing. Zero means "nobody
 * is coming" and will raise a mismatch against any caterer count; null means
 * "we have not been told", and a mismatch claimed against an absent number is
 * the other way to be wrong. Every caller must handle null rather than
 * defaulting it.
 *
 * @param {object} event
 * @returns {number|null}
 */
export function confirmedCovers(event) {
  const ev = event || {};
  let band = null;
  try { band = attendanceBand(ev); } catch (_) { band = null; }

  if (band && band.applicable) {
    // 'rsvp' is the only basis that counts real replies. Any other basis is a
    // modelled spread, and a spread is not a confirmation.
    if (band.basis === 'rsvp') return band.low;
  }
  const own = Number(ev.guestCount != null ? ev.guestCount : ev.guestEstimate);
  return Number.isFinite(own) && own > 0 ? own : null;
}

/**
 * The same number for copy that must never print "null". Returns 0 only where
 * a caller has already decided that an absent count should read as none —
 * which is a display choice, never a comparison input.
 */
export function confirmedCoversOrZero(event) {
  const n = confirmedCovers(event);
  return n == null ? 0 : n;
}
