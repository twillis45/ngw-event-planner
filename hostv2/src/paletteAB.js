// ─── PALETTE A/B/C — REVIEW INSTRUMENT, NOT A PRODUCTION PALETTE ───────────
//
// Owner §13 (2026-10-20): produce controlled evidence for a palette question
// WITHOUT changing production doctrine. So this file overrides a handful of CSS
// custom properties at runtime behind `?palette=`, after theme.js has run, and
// touches `src/theme/palette.js` not at all. With the flag absent — which is
// every real session — nothing here executes.
//
// ── THE THREE VARIANTS ─────────────────────────────────────────────────────
//
//   A  production          steel-blue identity · cool neutral field   (no flag)
//   B  warm (reference)    brass identity      · warm ivory field     ?palette=warm
//   C  warmsteel           steel-blue identity · warm neutral field   ?palette=warmsteel
//
// B IS DERIVED FROM THE REFERENCE SET, not invented. It is the art direction as
// supplied — and it is NOT a candidate, because its accent is decorative gold,
// which `palette.js:35-37` puts on the never-reintroduce list. It exists so the
// comparison has the reference's own answer in it rather than only two of mine.
//
// C IS THE OWNER'S BRIEF, VERBATIM (2026-10-20): *"production steel-blue
// identity/accent + warmer neutral/ivory operational field + current semantic
// state colors."* It is built by SUBTRACTION — it overrides the surface and
// neutral tokens and deliberately does NOT touch `--steel-soft` or
// `--steel-tint`, so the identity accent is production's by construction rather
// than by my matching a hex. That is the whole point of the variant: if steel
// over warm paper reads wrong, it has to be production's actual steel that
// reads wrong, not a steel I nudged to make the test pass.
//
// STATE COLOURS (`--ok` / `--warn` / `--danger` and their tints) are UNCHANGED
// in all three. They carry meaning, and a palette experiment must not quietly
// re-map semantics.
//
// C's field is a warm NEUTRAL, not B's ivory. B's `#F6F1E7` is a yellow paper
// that was chosen to sit under a brass accent; under steel it would read as a
// mismatch between the field's temperature and the accent's. C warms the field
// just far enough to stop fighting the photography — roughly half B's chroma —
// which is the actual hypothesis the owner asked to test.
//
// Measured ratios live in the review report; they are read off the LIVE DOM by
// `_peopleArtDirection.spec.mjs`, never asserted from these literals.

/** B — the reference set's own system. Brass identity, ivory field. */
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

/**
 * C — the candidate. Production steel (NOT overridden here) on a warm neutral
 * field. Light values are a half-step off B toward neutral; dark is a warm
 * near-black rather than B's brown-black, so the steel does not read as a
 * colour cast.
 *
 * `--faint` is the tightest value in the set in both themes and was walked
 * until it cleared 4.5:1 on its own `--bg`; see the measured table in the
 * review report, which is read from what actually paints.
 */
export const WARM_STEEL = {
  light: {
    '--bg': '#F7F4EF',
    '--bg-band': '#EDE9E1',
    '--card': '#FFFDFA',
    '--ink': '#171614',
    '--ink-soft': '#413E39',
    '--muted': '#65605A',
    '--faint': '#716C65',
    '--line-soft': 'rgba(48,42,34,.14)',
    // --steel-soft / --steel-tint DELIBERATELY ABSENT. See the header.
  },
  dark: {
    '--bg': '#131210',
    '--bg-band': '#24221F',
    '--card': '#1D1B18',
    '--ink': '#F2EFEA',
    '--ink-soft': '#CFC9C0',
    '--muted': '#97918A',
    '--faint': '#8D877F',
    '--line-soft': 'rgba(240,234,224,.12)',
  },
};

const VARIANTS = { warm: WARM, warmsteel: WARM_STEEL };

/**
 * Apply a review variant. No-op unless `?palette=warm` or `?palette=warmsteel`.
 * Returns the variant name applied, or false.
 */
export function applyPaletteAB(theme) {
  let want = null;
  try { want = new URLSearchParams(window.location.search).get('palette'); } catch (_) { return false; }
  const set = VARIANTS[want] && VARIANTS[want][theme === 'light' ? 'light' : 'dark'];
  if (!set) return false;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(set)) root.style.setProperty(k, v);
  root.setAttribute('data-palette-ab', want);
  return want;
}
