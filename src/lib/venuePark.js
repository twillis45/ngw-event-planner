// ─── "AM I EVEN PICKING THE VENUE HERE?" ─────────────────────────────────────
//
// The venue blocker is the most privileged thing on the command board.
// `_selectEventNextActionInner` (CommandCenter.jsx ~3076) promotes it to the
// hero at EVERY urgency level — every other blocker has to reach `critical`
// first — and it declares `blocks: ['vendors','timeline','logistics']`, so
// until it is answered the plan reports three more workstreams as waiting on
// it. That is right for a host who is choosing a venue.
//
// It is wrong for the host who already has one, or who is booking it through a
// resort, a travel agent, or a relative who lives there. For them the app opens
// on "Pick the place in Santa Fe." every single time, and there has never been
// a way to say "not through you". Host ruling 2026-09-22: "this needs a way to
// be parked or preempted with 'are you choosing a venue through app'."
//
// NOTHING NEW IS PERSISTED. `event.decisionBlockerStatus[type]` already exists
// and is already read in the two places that matter — experienceContext.js:69
// filters any blocker carrying a status, and CommandCenter.jsx:3076 drops it
// from the hero. What was missing was a WRITER: only the frozen CRA shell
// (App.js:23210) ever set it, so no hostv2 host could reach it. This module is
// that writer, and it exists rather than letting the shell poke a nested map by
// hand — the same reason venueFor.js owns the raw venue fields.
//
// 'acknowledged', not 'dismissed'. Both values hide the blocker, but
// CommandCenter.jsx:1727 reads 'acknowledged' as **Accepted** in the readiness
// ledger and everything else as **Blocked**. A host who is handling the venue
// themselves has accepted the work, not refused it.
//
// PARKING IS NOT ANSWERING. This deliberately writes nothing to `venue`,
// `venueCity` or any other field venueFor reads, so `phaseProgress` still
// reports the venue address as unhandled and the parts meter does not move.
// The app does not know where the event is; it only knows it is not the one
// finding out. phaseProgress.js:223 already draws this line for deferred
// decisions — "a parked decision is not a made decision" — and this is the
// same line.
export const VENUE_BLOCKER = 'venue-selection';

const statusMap = (event) => {
  const m = event && event.decisionBlockerStatus;
  return (m && typeof m === 'object') ? m : {};
};

/** Has the host said they are handling the venue outside the app? */
export function venueParked(event) {
  return statusMap(event)[VENUE_BLOCKER] === 'acknowledged';
}

/**
 * The patch that parks it. Returned rather than applied so the caller keeps its
 * own persistence path, and spread over the existing map so parking the venue
 * can never drop another blocker's status.
 */
export function parkVenuePatch(event) {
  return { decisionBlockerStatus: { ...statusMap(event), [VENUE_BLOCKER]: 'acknowledged' } };
}

/**
 * The patch that un-parks it. REMOVES the key rather than writing a falsy
 * value: every reader tests truthiness (`!decisionBlockerStatus[b.type]`), so a
 * stored '' or null would read as parked-forever and be invisible in the data.
 */
export function unparkVenuePatch(event) {
  const next = { ...statusMap(event) };
  delete next[VENUE_BLOCKER];
  return { decisionBlockerStatus: next };
}
