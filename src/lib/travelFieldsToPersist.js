// ─── WHAT THE CREATION SEAM MAY WRITE DOWN ABOUT TRAVEL ──────────────────────
//
// THE DEFECT (measured 2026-09-18, inputs-vs-engine-needs audit). The seam wrote
// `isDestination: false` onto every event where the parser simply heard nothing
// about travel. Absence recorded as an answer.
//
// It matters because `smartParseEvent` HAS NO AFFIRMATIVE "THIS IS LOCAL"
// DETECTOR. Read it (~:524): `isDestination` is `travelSaid || (a place that is
// away)`, and `destinationBasis` is null whenever that comes out false. So a
// parser-derived false has only ever meant NO TRAVEL SIGNAL WAS FOUND — never
// "the host told us it is local". Persisting it turned a silence into a decision.
//
// And it is a load-bearing decision: `isDestination` is read by 25 modules. A
// false silently deletes the travel, lodging and transport stack and leaves the
// budget band un-adjusted, on a claim the host never made.
//
// THE OTHER HALF — the bases. The creation chips already render "· heard",
// "· not your area" and "· from your dates" off `destinationBasis` and
// `overnightBasis` (HostShellV2 ~:7403, ~:7441). The seam then dropped both, so
// one screen later nothing could say why the app believed it. Same class as the
// headcount: the provenance was on screen at creation and discarded at persist.
//
// WHY THIS IS A LIB AND NOT FOUR SPREADS IN THE SHELL. jest cannot execute
// hostv2, and the four `...( ? : {})` spreads this replaces were exactly the kind
// of rule that can only be checked by reading source — which is how the
// text-gate ratchet has been climbing all day. The rule is pure and the decision
// table is small, so it belongs where it can be RUN.
//
// PURE: no I/O, no clock, no storage.

/**
 * The travel fields the creation seam may persist, given what was heard and what
 * the host corrected by hand.
 *
 * @param {object} o
 * @param {boolean|null} o.effIsDestination   resolved flag (manual ?? parsed), null when unresolved
 * @param {boolean|null} o.manualIsDestination the host's own chip: true / false / null (untouched)
 * @param {boolean|null} o.effOvernight        resolved overnight answer, null when unknown
 * @param {boolean|null} o.manualOvernight     the host's own chip
 * @param {string|null}  o.destinationBasis    the parser's reason, when it found one
 * @param {string|null}  o.overnightBasis      the parser's reason, when it found one
 * @param {string|null}  o.travelMode          only meaningful for a destination event
 * @returns {object} fields to spread into the stored event — often {}
 */
export function travelFieldsToPersist(o = {}) {
  const {
    effIsDestination = null, manualIsDestination = null,
    effOvernight = null, manualOvernight = null,
    destinationBasis = null, overnightBasis = null,
    travelMode = null,
  } = o;

  const out = {};

  // A POSITIVE FINDING, or the host saying so. Nothing else.
  // - true  -> a real signal (travel language, or a place away from their area)
  // - false -> ONLY when the host tapped "Local event" themselves
  // - anything else -> absent, which every engine already reads as "not told"
  const destinationAnswered = effIsDestination === true || manualIsDestination === false;
  if (destinationAnswered) out.isDestination = effIsDestination;

  // The basis explains the app's own finding, so it rides only when the app is
  // the one claiming it. A host who set the chip by hand owns the answer and
  // needs no reason from us — and attaching the parser's reason to their choice
  // would be us putting words in their mouth.
  if (out.isDestination === true && manualIsDestination == null && destinationBasis) {
    out.destinationBasis = destinationBasis;
  }

  // Overnight already had the "absent means not told" rule; it keeps it, and now
  // carries its reason on the same terms.
  if (effOvernight !== null) {
    out.guestsStayOvernight = effOvernight;
    if (manualOvernight == null && overnightBasis) out.overnightBasis = overnightBasis;
  }

  // Travel mode is meaningless for an event that is not a destination, and
  // writing it would leave a stale answer behind if the flag later flips.
  if (out.isDestination === true && travelMode) out.travelMode = travelMode;

  return out;
}

export default travelFieldsToPersist;
