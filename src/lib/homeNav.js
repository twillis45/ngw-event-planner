// ─── Home arrival semantics (Slice D-1) ───────────────────────────────────────
// The day-of FOCUS takeover on HostHome "auto-emerges" for an event inside its
// final ~72h window. That is right on a FRESH open (the host launches the app on
// event day → the day surface meets them) but WRONG when the host explicitly
// backed out of a different event to reach their events overview — the takeover
// hijacked "‹ Your events" into today's event and buried every other event
// (the D-0 demo-blocker).
//
// One rule, one place: the takeover may auto-emerge only on a fresh arrival.
// Explicit back-navigation always lands on the events overview. The host can
// still reach the day surface by opening the today event; nothing about the
// takeover itself changes.

export const HOME_ARRIVAL = { FRESH: 'fresh', BACK: 'back' };

export function focusTakeoverAllowed(arrival) {
  // Default-allow: anything that isn't an explicit back-navigation (fresh open,
  // unknown/legacy callers) keeps today's auto-emerge behavior unchanged.
  return arrival !== HOME_ARRIVAL.BACK;
}
