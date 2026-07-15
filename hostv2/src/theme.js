// Studio Matte doctrine wiring — every color below comes from the LOCKED
// palette source (demo/src/theme/palette.js) and the motion choreography
// system (demo/src/design/motion.js). No raw hex literals in this app:
// host surfaces = the palette's Light mode, The Day = the Dark carbon ramp,
// identity/CTAs = the locked steel-blue gradient. Change the doctrine file,
// this prototype follows.
//
// TYPE is NOT set here. The host-app type scale lives as static CSS custom
// properties (--t-*) in styles.css's :root block — that's the single type
// source (UX_01 type-scale table names the tokens). theme.js stays colors
// and motion only; do not mirror or move the type tokens into JS.
import { dark, carbonNeutral } from '@app/theme/palette';
import { durations, easings } from '@app/design/motion';

// Alpha helper — tints derive from doctrine anchors, never new hues.
const tint = (hex, a) => {
  const s = String(hex).replace('#', '');
  const n = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
};

export function applyStudioMatte() {
  const r = document.documentElement.style;
  const set = (k, v) => r.setProperty(k, v);

  // ── Host surfaces: the de-blued NEUTRAL CARBON ramp (the carbon gray the
  // production shell runs — palette.js carbonNeutral, user-locked 2026-06-23).
  const c = carbonNeutral.mid; // the production default level
  set('--bg', c.bg);
  set('--bg-band', c.surface2);
  set('--card', c.panel);
  set('--ink', dark.textPrimary);
  set('--ink-soft', dark.textSecondary);
  // --muted was aliased to the SAME textSecondary as --ink-soft (and both
  // sit in the steel-blue hue family) — indistinguishable from each other
  // and from the identity accent everywhere they appear together (e.g. the
  // home quiet-index rows' label/value, found 2026-07-11). textMuted is now
  // a genuinely de-blued neutral gray in the palette — use it here so
  // "de-emphasized" reads as a different tone, not a dimmer blue.
  // Color re-audit (path to 10): --muted (dark.textMuted #9a9ca0, L 0.332) and
  // --ink-soft (#849eb8, L 0.328) had IDENTICAL luminance — the two text tiers
  // ranked by hue only, so in grayscale / for a colorblind host they read as one
  // tier. Darkened --muted to #909296 (L 0.287) so "de-emphasized meta" recedes a
  // real luminance step below "secondary body" (card 5.29 vs 5.94), still AA on
  // the tight band (4.85). Scoped to the host shell here — the shared palette is
  // left alone so nothing else shifts.
  set('--muted', '#909296');
  // --faint carries small text (section labels, form-field labels, chevrons). A
  // tint of the now-darker --muted base; α 0.98 keeps it AA on the tight band
  // (≈4.7:1) while sitting a hair below --muted. (The 4.5:1 floor on the band
  // surface physically prevents three widely-spaced grey tiers — the important
  // fix is muted now ranking below ink-soft, above.)
  set('--faint', tint('#909296', 0.98));
  set('--line', c.border);
  set('--line-soft', tint(c.border, 0.55));

  // ── Identity: locked steel-blue (mode-independent) + the CTA gradient ──
  set('--steel', dark.steelBlue);
  set('--steel-dark', dark.steelBlueDark);
  // --steel-soft carries vendor/logistics status pill TEXT on --steel-tint;
  // at the palette's #6F8794 that ran ≈3.8:1 (fails 4.5). Overridden here to a
  // lighter steel that clears 4.5 on the tint — set as a literal (not the
  // palette base) on purpose, so the shared --sheen material detail, which also
  // derives from steelBlueMuted, is left untouched (per-screen audit + brand-lock).
  set('--steel-soft', '#8AA3B0');                 // text-legible steel on carbon
  set('--steel-tint', tint(dark.steelBlue, 0.16));
  // Audit S1: steel was doing triple duty — identity, selection, AND the
  // "in progress" status tier (booked / renting / vendor-mid …), so a host
  // couldn't tell a status pill from a selected chip. --progress carries ONLY
  // the in-progress tier, freeing steel to mean identity + selection. A muted
  // LAVENDER (not a warm slate — that read too close to the steel blue): clearly
  // violet, distinct from steel/green/amber/red/grey, and matte enough for the
  // palette. Clears 4.5:1 on card (6.9), tint-over-card (5.4), and band (4.9).
  set('--progress', '#B3A0CC');
  set('--progress-tint', tint('#B3A0CC', 0.12));
  // Overhead-light material response (brand direction, splash work 2026-07-11):
  // surfaces catch the canvas's top glow as a 1px top sheen. Derived from the
  // steel anchor — same light source as the .app background radial.
  set('--sheen', tint(dark.steelBlueMuted, 0.10));
  set('--cta-grad', `linear-gradient(180deg, ${dark.steelBlueGradientTop} 0%, ${dark.steelBlueGradientBottom} 100%)`);

  // ── Status anchors (Dark calibrations) ──
  set('--ok', dark.successGreen);
  // Dark green-ink for text ON the --ok fill (the all-quiet NEXT tile). Tokenized
  // (was a #0d2018 literal) — 6.2:1 on the green. (Color audit T2.)
  set('--on-ok', '#0d2018');
  // Status-pill TEXT (--ok on --ok-tint) ran 4.35:1 at α=0.14 — large-text-only.
  // Lightened the tint to α=0.10 (a subtler wash) → 4.64:1, clearing small-text
  // AA for the pill label without touching the green itself (2026-07-13 audit).
  set('--ok-tint', tint(dark.successGreen, 0.10));
  set('--warn', dark.amber);
  // Audit I2: was α 0.15 while --ok-tint/--danger-tint are 0.10 — amber chips
  // rendered visibly denser than green/red beside them. Normalized to 0.10.
  set('--warn-tint', tint(dark.amber, 0.10));
  // --danger is the danger TEXT/accent color (severity tags, alert headlines,
  // risk labels, the danger pill). dangerRed was lightened in the palette so
  // this clears 4.5:1 on --danger-tint and on the card. --danger-solid keeps the
  // original deep red for the ONE place danger is a solid fill behind light text
  // (the alert banner) — lightening that fill would have dropped its white-text
  // contrast (per-screen audit cross-cutting fix).
  set('--danger', dark.dangerRed);
  // Same small-text fix as --ok-tint: the tint dropped α 0.14 → 0.10 for the
  // danger pill/label text. WAVE-6 CORRECTION: the "4.42:1 → 4.78:1" figures
  // this comment used to carry did not reproduce. Measured (WCAG relative
  // luminance, dangerRed #F27A70, α=0.10 composited): 5.27:1 over --card,
  // 4.82:1 over --bg-band, 6.71:1 over --carbon — all clear 4.5:1.
  set('--danger-tint', tint(dark.dangerRed, 0.10));
  set('--danger-solid', dark.dangerSolid);
  // WAVE-6 AA REPAIR: danger TEXT on dark grounds gets its OWN token so text
  // legibility never rides on the fill anchors (--danger/--danger-solid are
  // fills/accents and stay untouched — dimming them would break the alert
  // banner's white-on-red). The day-of stack's critical text (the tier word
  // chip on --bg-band, the critical alert headline on --danger-tint) reads
  // this. A literal on purpose, one step lighter than dangerRed — same move
  // as --steel-soft above. Measured: 6.40:1 on --bg-band; on danger-tint(.10)
  // 6.01:1 over --card, 5.50:1 over --bg-band, 7.66:1 over --carbon — every
  // ground clears small-text AA (4.5:1) with margin.
  set('--danger-text', '#F58B82');

  // ── The Day: Dark Standard Carbon ramp ──
  set('--carbon', dark.carbonBody);
  set('--carbon-panel', dark.carbonPanel);
  set('--carbon-line', dark.carbonBorder);
  set('--carbon-text', dark.textPrimary);
  set('--carbon-muted', dark.textMuted);
  set('--steel-muted', dark.steelBlueMuted);

  // ── Motion: choreography timings, no bounce ever ──
  set('--ease-out', easings.out || 'cubic-bezier(0,0,.2,1)');
  set('--ease-standard', easings.standard || 'cubic-bezier(.2,0,0,1)');
  set('--ease-in-out', easings.inOut || 'cubic-bezier(.45,0,.2,1)');
  set('--ms-press', (durations.press || 120) + 'ms');
  set('--ms-ambient', (durations.ambient || 220) + 'ms');
  set('--ms-sheet', (durations.sheetRise || 260) + 'ms');
  set('--ms-escalation', (durations.escalation || 230) + 'ms');
}
