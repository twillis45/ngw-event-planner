// ─── "AT 5" IS NOT "AT 5 PM", AND THE SEAM SAID IT WAS ───────────────────────
//
// THE DEFECT (measured 2026-09-19). `smartParseEvent` reads a spoken clock and
// grades what it heard, in three states its own comment sets out:
//
//   'said-exact'       "at 6pm"              — the meridiem is on the page
//   'said-with-bucket' "evening … at 6"      — the host's own bucket disambiguates
//   'said-hour-only'   "at 5"                — "the NUMBER is hers, the half of
//                                              the day is a reading of it, so it
//                                              is marked as the weakest"
//
// MEASURED through the parser:
//
//   "Cookout at 6pm on Saturday"        -> 6:00 PM   said-exact
//   "Evening cookout at 6 on Saturday"  -> 6:00 PM   said-with-bucket
//   "Cookout at 5 on Saturday"          -> 5:00 PM   said-hour-only   ← +12 hours
//   "Brunch at 11 on Saturday"          -> 11:00 AM  said-with-bucket
//
// The creation seam (HostShellV2 ~:6623) then wrote
// `{ startTime, startTimeSource: 'host' }` for ALL THREE and dropped the basis.
// So the grading the parser did — deliberately, in a comment that says why —
// was discarded one function call later by the only caller that had it.
//
// AND IT IS LOAD-BEARING. `startTimeIsConfirmed` is `startTimeSource !==
// 'derived'`, and it gates the invite, the vendor brief and the run-of-show
// clock. A host who typed "cookout at 5" had 5:00 PM sent to her guests and her
// caterer as a confirmed time, with no ask, on a twelve-hour guess the parser
// had already flagged as the weakest thing it knows.
//
// THE RULE. A time the host stated is hers and is confirmed. A time whose half
// of the day the app chose is stored — the number IS hers, throwing it away
// would be the old defect in reverse — but not claimed as confirmed, so the
// shell proposes it back for one tap. The basis rides along in every case, so a
// surface can say WHICH of the three it is instead of guessing.
//
// SAME CLASS, SAME SHAPE as travelFieldsToPersist.js: the seam's rule lives in a
// pure lib because jest cannot execute hostv2, and a `...( ? : {})` spread in the
// shell can only ever be checked by reading source.
//
// PURE: no I/O, no clock, no storage.

/** Bases where the host stated the hour AND the half of the day. */
export const HOST_STATED_BASES = ['said-exact', 'said-with-bucket'];

/** The basis where the app chose the half of the day. */
export const READING_BASIS = 'said-hour-only';

/**
 * The start-time fields the creation seam may persist, given what the parser
 * heard.
 *
 * @param {object} parsed  the parser result (or any object carrying the two fields)
 * @param {string|null} parsed.startTime       "5:00 PM", or falsy when nothing was heard
 * @param {string|null} parsed.startTimeBasis  one of the three grades, or null
 * @returns {object} fields to spread into the stored event — {} when nothing was heard
 */
export function startTimeFieldsToPersist(parsed = {}) {
  const startTime = String((parsed && parsed.startTime) || '').trim();
  if (!startTime) return {};

  const basis = String((parsed && parsed.startTimeBasis) || '').trim() || null;
  const out = { startTime };

  // A basis the seam does not recognise is treated as a READING, not as the
  // host's word. A new grade added to the parser must be classified here on
  // purpose; defaulting the other way would let the next one ship confirmed.
  out.startTimeSource = HOST_STATED_BASES.includes(basis) ? 'host' : 'derived';

  // The basis rides in every case — including when the time is confirmed, so a
  // later surface can still tell "6pm" from "evening at 6" without re-parsing
  // text it no longer has.
  if (basis) out.startTimeBasis = basis;

  return out;
}

/**
 * The honest sentence for a time whose half of the day the app read, or null.
 *
 * The shell's existing derived copy is "We pencilled in 5:00 PM — not you." That
 * is true of a time the app invented from a bucket and FALSE here: the host gave
 * the number. Saying it anyway would trade one inaccuracy for another.
 *
 * @param {object} event
 * @returns {{said: string, shown: string, line: string}|null}
 */
export function startTimeReading(event) {
  const ev = event || {};
  const shown = String(ev.startTime || '').trim();
  if (!shown) return null;
  if (String(ev.startTimeBasis || '') !== READING_BASIS) return null;

  // "5:00 PM" / "17:00" -> the bare hour the host actually typed.
  const m = /^(\d{1,2})(?::(\d{2}))?/.exec(shown);
  if (!m) return null;
  const h24 = parseInt(m[1], 10);
  const said = String(h24 > 12 ? h24 - 12 : h24);
  const mer = /pm/i.test(shown) ? 'PM' : (/am/i.test(shown) ? 'AM' : (h24 >= 12 ? 'PM' : 'AM'));

  return {
    said,
    shown,
    line: `You said ${said} — we read it as ${mer}. Confirm it, or set the time yourself.`,
  };
}

export default startTimeFieldsToPersist;
