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
  set('--muted', dark.textMuted);
  set('--faint', tint(dark.textMuted, 0.55));
  set('--line', c.border);
  set('--line-soft', tint(c.border, 0.55));

  // ── Identity: locked steel-blue (mode-independent) + the CTA gradient ──
  set('--steel', dark.steelBlue);
  set('--steel-dark', dark.steelBlueDark);
  set('--steel-soft', dark.steelBlueMuted);       // text-legible steel on carbon
  set('--steel-tint', tint(dark.steelBlue, 0.16));
  // Overhead-light material response (brand direction, splash work 2026-07-11):
  // surfaces catch the canvas's top glow as a 1px top sheen. Derived from the
  // steel anchor — same light source as the .app background radial.
  set('--sheen', tint(dark.steelBlueMuted, 0.10));
  set('--cta-grad', `linear-gradient(180deg, ${dark.steelBlueGradientTop} 0%, ${dark.steelBlueGradientBottom} 100%)`);

  // ── Status anchors (Dark calibrations) ──
  set('--ok', dark.successGreen);
  set('--ok-tint', tint(dark.successGreen, 0.14));
  set('--warn', dark.amber);
  set('--warn-tint', tint(dark.amber, 0.15));
  set('--danger', dark.dangerRed);
  set('--danger-tint', tint(dark.dangerRed, 0.14));

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
  set('--ease-sharp', easings.sharp || 'cubic-bezier(.05,.7,.1,1)');
  set('--ease-in-out', easings.inOut || 'cubic-bezier(.45,0,.2,1)');
  set('--ms-press', (durations.press || 120) + 'ms');
  set('--ms-ambient', (durations.ambient || 220) + 'ms');
  set('--ms-sheet', (durations.sheetRise || 260) + 'ms');
  set('--ms-sheet-dismiss', (durations.sheetDismiss || 360) + 'ms');
  set('--ms-escalation', (durations.escalation || 230) + 'ms');
  set('--ms-emergency', (durations.emergency || 200) + 'ms');
  set('--ms-recovery', (durations.recovery || 360) + 'ms');
}
