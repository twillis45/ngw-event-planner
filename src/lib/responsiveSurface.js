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

// SCOPE EXTENDED 2026-08-07 — the `data` mode.
//
// Measured before extending: 38 sheet kinds + 7 stages = 45 surfaces, of which
// exactly 2 had a desktop layout. The other 43 rendered as a 393x852 phone
// silhouette on a 1440px screen. The host's ruling is that desktop and wide
// "can't be just a larger version of a mobile viewport", so the debt this file
// documents is now being paid down — through this function, by explicit surface
// identity, which is the mechanism it was built to allow.
//
// WHICH SURFACES, and why not all 38 at once. UX_03 already names the tier that
// should use width: "data — dense tables & boards that should USE width (Budget
// · Guests · triage)". Those are surfaces whose content is a LIST WITH COLUMNS,
// so width buys real density rather than longer lines. Every other sheet is a
// single decision or a form, where extra width buys nothing and costs measure —
// widening those would produce exactly the "silently stretched surfaces" this
// module was written to prevent. They stay legacy, still documented debt.
export const SURFACE_MODES = Object.freeze(['command', 'food-recommendation', 'data', 'legacy']);

/** The shell class for each mode. `legacy` adds nothing — it is the existing stage. */
export const SURFACE_CLASS = Object.freeze({
  command: 'stagewrap--responsive-command',
  'food-recommendation': 'stagewrap--responsive-food',
  data: 'stagewrap--responsive-data',
  legacy: '',
});

/** The dense-data sheets, per UX_03's `data` measure tier. Explicit identity only. */
export const DATA_SHEETS = Object.freeze(['budget', 'guests']);

/**
 * responsiveSurfaceMode({ stage, sheet }) -> 'command' | 'food-recommendation' | 'legacy'
 *
 * `sheet` is the open sheet's kind, or null/undefined when none is open.
 */
/**
 * `?stage=phone` — force the phone silhouette at any window size. LOCAL ONLY.
 *
 * WHY THIS EXISTS. The shell picks its shape from the WINDOW, not from any setting:
 * at >=1280x700 the command and food surfaces deliberately opt out of the 393x852
 * silhouette into a real desktop canvas. So a laptop browser can never show you the
 * phone — and Chrome will not resize below ~614px either, so there was no way to
 * demo the mobile composition in the browser you already have open. Reported four
 * times as "the demo is not mobile". `npm run device -- mobile` solves it with a
 * real device profile; this solves it in the tab you are already looking at.
 *
 * GATED ON LOCALHOST, not on a bundler DEV flag: `import.meta.env` is Vite-only and
 * this module is also compiled by CRA's babel, where it would be a build hazard.
 * Hostname is the signal both bundlers and jest agree on, and the deployed site is
 * not localhost, so this cannot change production behaviour.
 *
 * `loc` is injectable so this is testable without touching global location.
 */
export function phoneStageForced(loc) {
  const l = loc || (typeof window !== 'undefined' ? window.location : null);
  if (!l) return false;
  const host = String(l.hostname || '');
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  if (!isLocal) return false;
  return /(?:^|[?&])stage=phone(?:&|$)/.test(String(l.search || ''));
}

export function responsiveSurfaceMode(state) {
  // The forced phone stage returns LEGACY for every surface, which is exactly what
  // the phone silhouette is — so this reuses the existing path rather than adding a
  // fourth mode, and `optsOutOfFit` follows automatically (both read this function).
  // That matters: without --fit the 393x852 frame would not be scaled to fit the
  // window, which is half of what makes it read as a phone.
  if (phoneStageForced()) return 'legacy';
  // `state || {}` rather than a default parameter: a default only covers
  // `undefined`, so destructuring a NULL state threw. The shell passes state
  // straight through, and layout policy must never be the thing that crashes a
  // render — an unrecognised or absent state falls back to the phone stage.
  const { stage, sheet } = (state || {});
  if (stage === 'plan' && !sheet) return 'command';
  if (stage === 'plan' && sheet === 'food') return 'food-recommendation';
  if (stage === 'plan' && DATA_SHEETS.includes(sheet)) return 'data';
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
