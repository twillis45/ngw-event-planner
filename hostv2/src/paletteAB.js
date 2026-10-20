// ─── PALETTE A/B — REVIEW INSTRUMENT, NOT A PRODUCTION PALETTE ─────────────
//
// Owner §13: produce controlled evidence for a palette question, WITHOUT
// changing production doctrine. So this file overrides a handful of CSS custom
// properties at runtime behind `?palette=warm`, after theme.js has run, and
// touches `src/theme/palette.js` not at all. With the flag absent — which is
// every real session — nothing here executes.
//
// THE QUESTION IS NOT "BLUE VS GOLD". It is whether a warm ivory/brass system
// connects photography, editorial identity and operational UX better than the
// current steel-over-carbon one, WITHOUT losing clarity or accessibility. So
// the two variants share composition, content and geometry exactly; only the
// surface and accent tokens differ.
//
// VARIANT B IS DERIVED FROM THE REFERENCE SET, not invented: warm ivory
// operational light surfaces, near-black warm dark surfaces, and a restrained
// brass/amber accent in the identity slot the steel currently occupies. State
// colours (ok / warn / danger) are deliberately UNCHANGED in both variants —
// they carry meaning, and a palette experiment must not quietly re-map
// semantics.
//
// Every value below was contrast-checked against its own ground; the measured
// ratios live in docs/architecture/redesign/PALETTE_AB_EVIDENCE.md.

export const WARM = {
  light: {
    '--bg': '#F6F1E7',
    '--bg-band': '#EDE5D6',
    '--card': '#FDFBF6',
    '--ink': '#1A1510',
    '--ink-soft': '#453C30',
    '--muted': '#655C4E',
    '--faint': '#766C5F',   // 4.57:1 on --bg (was #7C7265, 4.19 — AA-large only)
    '--line-soft': 'rgba(60,48,30,.14)',
    '--steel-soft': '#7A5B21',
    '--steel-tint': 'rgba(122,91,33,.12)',
  },
  dark: {
    '--bg': '#0F0D0A',
    '--bg-band': '#17130F',
    '--card': '#1C1712',
    '--ink': '#F3EDE1',
    '--ink-soft': '#D2C7B4',
    '--muted': '#A1957F',
    '--faint': '#8A7F6C',
    '--line-soft': 'rgba(240,228,200,.12)',
    '--steel-soft': '#D9A441',
    '--steel-tint': 'rgba(217,164,65,.14)',
  },
};

/** Apply the warm variant. Review only; no-op unless `?palette=warm`. */
export function applyPaletteAB(theme) {
  let want = null;
  try { want = new URLSearchParams(window.location.search).get('palette'); } catch (_) { return false; }
  if (want !== 'warm') return false;
  const set = WARM[theme === 'light' ? 'light' : 'dark'];
  const root = document.documentElement;
  for (const [k, v] of Object.entries(set)) root.style.setProperty(k, v);
  root.setAttribute('data-palette-ab', 'warm');
  return true;
}
