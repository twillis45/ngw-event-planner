// ─── exhaleGate — SSOT #1 ROOT FIX (R3) ──────────────────────────────────────
//
// THE INVARIANT:
//
//   An exhale card ("You're all set", "Everything that needs you is done",
//   "ALL SET") may NOT render while the engine still has a next action.
//
// Why this exists, precisely:
//
// The host surfaces carry THREE parallel "am I done?" computations:
//   1. selectEventNextAction()/eventPlan() — the real engine ladder. It got the
//      isVendorConfirmed fix, so it correctly emits "Confirm <vendor>".
//   2. `prog`/`allProgDone`      (App.js, home)      — 7 axes: Heart, Guests,
//      Budget, Your choices, Food, The Day, Venue.
//   3. `hostPlanAllDone`          (App.js, Plan tab) — a near-copy of the same 7.
//
// Neither (2) nor (3) has a VENDOR axis at all. So they could both go "done"
// while the engine was shouting "Confirm the caterer" — and worse than merely
// disagreeing, they OUTRANKED it: `showLead = !allProgDone && !!na` meant the
// engine's action was *suppressed* and replaced by the congratulation, and the
// Plan hero's `if (allDone) return <ALL SET>` ran BEFORE its own `if (!na)`.
//
// The app computed the truth, hid it, and printed a reward in its place.
//
// Adding a vendor axis to (2) and (3) would fix today's symptom and leave the
// structure that produced it: the next new axis (documents, COI, payments…)
// would be missing from two checklists again. So the rule is inverted instead —
// the ENGINE is the authority, and a checklist may only license calm when the
// engine has nothing left to say. Any future engine tier is covered for free.
//
// Deliberately NOT: "allDone && !na" scattered inline at each call site. That is
// how (2) and (3) drifted apart in the first place. One named rule, one import,
// one test.

/**
 * May a surface render its "you're all set" exhale?
 *
 * @param {boolean} checklistDone  the surface's own local completeness read
 *   (allProgDone / hostPlanAllDone). NECESSARY but never SUFFICIENT.
 * @param {object|null} nextAction the engine's next action (selectEventNextAction /
 *   eventPlan().nextActions[0]). Any truthy action VETOES the exhale.
 * @returns {boolean}
 */
export function mayExhale(checklistDone, nextAction) {
  return !!checklistDone && !nextAction;
}

export default mayExhale;
