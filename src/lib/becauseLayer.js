// Sprint 57H — Because Layer (planner reasoning VISIBILITY, not generation). NGW
// now says what matters, what's healthy, and how sure it is — but not WHY. This
// exposes the reasoning the engine ALREADY computed, then discards before render.
//
//   • EXPOSURE ONLY: the "because" strings are built from existing in-scope factors
//     (playbook qtyPerGuest multipliers, authored risk triggers). No new calc, no
//     new intelligence, no inferred/generated explanation. If a rationale can't be
//     traced to a runtime fact, it is NOT shown.
//   • ADDITIVE: quantities, readiness, scores, routes, playbooks unchanged. The only
//     new output is "existing recommendation + existing reasoning."
//   • pi.because flag default OFF ⇒ becauseActive false ⇒ no "Because" line ⇒
//     byte-identical to production.
//   • Universal trust layer: reasoning helps every persona. The persona affects
//     PRESENTATION (host collapsed / planner inline) — never the reasoning content
//     (One Truth). v1 renders one quiet factual line for all.

// pi.because flag (default OFF). Enable via ?pi=because / localStorage
// 'ngw-pi-because'='1' / REACT_APP_PI_BECAUSE='true'. Same triad as the others.
export function becauseOn() {
  // Host Activation v1: default ON (persona-gated downstream). QA off-switch:
  // ?pi-off=because / localStorage 'ngw-pi-because'='0' / REACT_APP_PI_BECAUSE='false'.
  try {
    if (typeof window !== 'undefined') {
      const q = window.location.search || '';
      if (/[?&]pi=because\b/.test(q)) return true;
      if (/[?&]pi-off=because\b/.test(q)) return false;
    }
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('ngw-pi-because');
      if (v === '1') return true;
      if (v === '0') return false;
    }
  } catch (e) { /* storage blocked */ }
  return !(typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_BECAUSE === 'false');
}

// Active for any persona when the flag is on (reasoning is universal). Returns a
// boolean; the render site shows the row's existing `because` string when true.
export function becauseActive() {
  return becauseOn();
}
