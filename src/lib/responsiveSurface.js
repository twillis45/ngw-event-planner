// ─── responsiveSurface — which shell composition a surface gets ──────────────
//
// Phase 5G-C1. The C1 acceptance path spans TWO host experiences — "where the
// event stands" and "what NGW recommends and why" — so exactly two surfaces opt
// out of the fixed phone stage at laptop and above. Everything else keeps it.
//
// WHY THIS IS A FUNCTION AND NOT AN INLINE CONDITION. Layout policy scattered
// through JSX cannot be pinned by a test, and the failure mode is silent: a sheet
// starts widening because someone matched on a heading or a child count. The mode
// is derived ONLY from explicit surface identity (stage + sheet). Never from
// headings, DOM children, visible copy, presence of the ice card, or component
// order.
//
// SCOPE, ruled 2026-08-02:
//   command            plan stage, no sheet     -> orientation + segmented readiness
//   food-recommendation plan stage, food sheet  -> ice recommendation detail
//   legacy             everything else          -> unchanged phone stage + --fit
//
// Guests, Vendors, Budget and every other sheet stay legacy on purpose. They are
// documented responsive debt, not silently stretched surfaces.

export const SURFACE_MODES = Object.freeze(['command', 'food-recommendation', 'legacy']);

/** The shell class for each mode. `legacy` adds nothing — it is the existing stage. */
export const SURFACE_CLASS = Object.freeze({
  command: 'stagewrap--responsive-command',
  'food-recommendation': 'stagewrap--responsive-food',
  legacy: '',
});

/**
 * responsiveSurfaceMode({ stage, sheet }) -> 'command' | 'food-recommendation' | 'legacy'
 *
 * `sheet` is the open sheet's kind, or null/undefined when none is open.
 */
export function responsiveSurfaceMode(state) {
  // `state || {}` rather than a default parameter: a default only covers
  // `undefined`, so destructuring a NULL state threw. The shell passes state
  // straight through, and layout policy must never be the thing that crashes a
  // render — an unrecognised or absent state falls back to the phone stage.
  const { stage, sheet } = (state || {});
  if (stage === 'plan' && !sheet) return 'command';
  if (stage === 'plan' && sheet === 'food') return 'food-recommendation';
  return 'legacy';
}

/** The className to put on .stagewrap for this surface. '' for legacy. */
export function stagewrapClass(state) {
  return SURFACE_CLASS[responsiveSurfaceMode(state)] || '';
}

/**
 * Does this surface opt out of the fixed-stage --fit transform at >=1280px?
 *
 * Both responsive modes do. A two-column composition must not also be uniformly
 * scaled: scaling and reflow solve different problems, and doing both gives fuzzy
 * text, wrong hit areas and misleading breakpoints.
 */
export function optsOutOfFit(state) {
  return responsiveSurfaceMode(state) !== 'legacy';
}
