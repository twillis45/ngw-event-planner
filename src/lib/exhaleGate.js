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

// ─── THE MIRROR CASE: AN EMPTY QUEUE IS NOT A QUIET PLAN ─────────────────────
//
// REPORTED LIVE 2026-09-18 ("Nothing needs you today. Not matching todos, have
// items overdue"), then reproduced and measured:
//
//   the host taps "not now" on the last few cards
//   -> the shell writes event.snoozed[ACTION id]        (HostShellV2 ~:8561)
//   -> eventPlan moves those actions to `setAside`, nextActions = []
//   -> listIsCalm is queue.length === 0                 -> TRUE
//   -> the hero says "Nothing needs you today."
//   -> the step list, one scroll below, still reads
//        "Borrow the extra folding tables — 9 days past its window"
//        "Print the parking map for the corner — 8 days past its window"
//        "Pick up the propane and ice chests — 2 days past its window"
//
// because `taskIsOverdue` honours `task.snoozedUntil` — a per-ROW field on the
// timeline entry — and the action snooze never writes it. TWO SNOOZE STORES, ONE
// FACT: the host set down the CARDS, and the app read that as having set down
// the WORK.
//
// THE FIX IS NOT TO SILENCE THE ROWS. Writing `snoozedUntil` onto the task when
// its card is snoozed would make the contradiction disappear by making the app
// stop calling real late work late — trading a visible lie for an invisible one.
// The rows are right. The calm claim is what is wrong.
//
// So this is the mirror of mayExhale's own invariant. That rule says a CHECKLIST
// may not license calm while the ENGINE still has something to say. This one says
// the ENGINE going quiet does not license calm while a SURFACE THE HOST IS
// LOOKING AT still says something is late. Same principle, other direction: the
// quiet claim has to be true of the whole screen, not of one producer.
//
// PURE, and deliberately takes COUNTS rather than the event: the rows that matter
// are the ones the shell actually RENDERS, after its own resolved-step filter. A
// veto recomputed from `event.timeline` here would count rows the host cannot
// see and raise an alarm they have no way to clear — worse than the defect.

/**
 * Why the screen may not claim quiet, or null when it may.
 *
 * @param {object} opts
 * @param {object|null} opts.moneyWorry  an over-budget heads-up (the 2026-08-03
 *   veto, unchanged): money is the one thing the checklist cannot see.
 * @param {number} opts.overdueCount     past-due rows the host is being shown,
 *   counted from the SAME list that renders them.
 * @returns {{kind:string, count:number, label:string}|null}
 */
export function calmVetoFor({ moneyWorry = null, overdueCount = 0 } = {}) {
  if (moneyWorry) return { kind: 'money', count: 1, label: 'money' };
  const n = Number(overdueCount) || 0;
  if (n > 0) {
    return {
      kind: 'overdue-steps',
      count: n,
      // The honest headline for the state, authored once here so the shell does
      // not write a second wording of the same fact.
      label: n === 1 ? '1 thing is past due' : `${n} things are past due`,
    };
  }
  return null;
}

export default mayExhale;
