// ─── HOW MANY PARTS OF THE PLAN ARE HANDLED: ONE READER (six root causes, 3) ─
//
// Thanksgiving walkthrough P1-3 (11/23/2026): one screen said "6 of 7" on the
// strip, "4 handled" on the what's-counted line (the recommendation
// lifecycle's own count of a different unit) and listed six parts "handled".
// Every surface that says how much of the plan is handled now reads this: the
// strip, the hairline, the calm pole, the what's-counted panel, the tall
// iPad's ribbon (eventOrientation.planRibbon), the menu's readiness line.
//
// The ledger is phaseProgress (deriveEventPhaseProgress → phaseCues): its
// items are the parts, `handled` is each part's verdict.

/**
 * planPartsProgress(phaseCues) → { parts:[{ id, label, handled, route, cueLabel }],
 *   done, total, allHandled } — or null when there is no ledger.
 */
export function planPartsProgress(phaseCues) {
  const items = (phaseCues && Array.isArray(phaseCues.items)) ? phaseCues.items.filter(Boolean) : [];
  if (!items.length) return null;
  const parts = items.map((it) => ({
    id: it.id, label: it.label || it.id, handled: !!it.handled,
    route: it.route || null, cueLabel: it.cueLabel || null,
  }));
  const done = parts.filter((p) => p.handled).length;
  return { parts, done, total: parts.length, allHandled: done === parts.length };
}

/** "6 of 7 parts of your plan handled" / "All 7 parts of your plan handled". */
export function planPartsLine(progress) {
  if (!progress || !progress.total) return null;
  const n = progress.total;
  return progress.allHandled
    ? `All ${n} part${n === 1 ? '' : 's'} of your plan handled`
    : `${progress.done} of ${n} part${n === 1 ? '' : 's'} of your plan handled`;
}
