// Studio Matte doctrine wiring — every color below comes from the LOCKED
// palette source (demo/src/theme/palette.js) and the motion choreography
// system (demo/src/design/motion.js). No raw hex literals in this app:
// host surfaces = the palette's Light mode, The Day = the Dark carbon ramp,
// identity/CTAs = the locked steel-blue gradient. Change the doctrine file,
// this prototype follows.
import { light, dark } from '@app/theme/palette';
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

  // ── Host surfaces: Studio Matte Light mode ──
  set('--bg', light.carbonBody);
  set('--bg-band', light.carbonSurface2);
  set('--card', light.carbonPanel);
  set('--ink', light.textPrimary);
  set('--ink-soft', light.textSecondary);
  set('--muted', light.textSecondary);
  set('--faint', tint(light.textSecondary, 0.55));
  set('--line', light.carbonBorder);
  set('--line-soft', tint(light.carbonBorder, 0.5));

  // ── Identity: locked steel-blue (mode-independent) + the CTA gradient ──
  set('--steel', light.steelBlue);
  set('--steel-dark', light.steelBlueDark);
  set('--steel-tint', tint(light.steelBlue, 0.1));
  set('--cta-grad', `linear-gradient(180deg, ${light.steelBlueGradientTop} 0%, ${light.steelBlueGradientBottom} 100%)`);

  // ── Status anchors (Light calibrations) ──
  set('--ok', light.successGreen);
  set('--ok-tint', tint(light.successGreen, 0.12));
  set('--warn', light.amber);
  set('--warn-tint', tint(light.amber, 0.14));
  set('--danger', light.dangerRed);

  // ── The Day: Dark Standard Carbon ramp ──
  set('--carbon', dark.carbonBody);
  set('--carbon-panel', dark.carbonPanel);
  set('--carbon-line', dark.carbonBorder);
  set('--carbon-text', dark.textPrimary);
  set('--carbon-muted', dark.textSecondary);
  set('--steel-muted', dark.steelBlueMuted);

  // ── Motion: choreography timings, no bounce ever ──
  set('--ease-out', easings.out || 'cubic-bezier(0,0,.2,1)');
  set('--ease-standard', easings.standard || 'cubic-bezier(.2,0,0,1)');
  set('--ms-press', (durations.press || 120) + 'ms');
  set('--ms-ambient', (durations.ambient || 220) + 'ms');
  set('--ms-sheet', (durations.sheetRise || 260) + 'ms');
}
