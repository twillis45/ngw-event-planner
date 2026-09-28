// ─── THE RAMP PROMISED A LIGHT END AND DID NOT HAVE ONE ───────────────────
//
// carbonNeutral's own comment says "four darkness levels between the deepest
// dark and the light theme". There were four dark levels and no light one,
// which is why flipping ACTIVE_MODE produced near-black text on a dark
// background: hostv2 takes its SURFACES from this ramp, not from the mode
// bundle. Added 2026-09-28.
import { carbonNeutral } from '../palette';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => {
  const f = hex(h).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('the light step', () => {
  const L = carbonNeutral.light;

  test('it exists, with the same four keys every other step has', () => {
    expect(Object.keys(L).sort()).toEqual(['bg', 'border', 'panel', 'surface2']);
  });

  test('it is actually light — every surface brighter than the lightest dark step', () => {
    for (const k of ['bg', 'panel', 'surface2', 'border']) {
      expect(lum(L[k])).toBeGreaterThan(lum(carbonNeutral.softer[k]));
    }
  });

  test('THE PANEL COMES FORWARD, which on light means brighter than the page', () => {
    // The classic light-mode inversion error is a white page with grey cards,
    // which reads as a disabled screen. Panel must out-rank bg.
    expect(lum(L.panel)).toBeGreaterThan(lum(L.bg));
    expect(lum(L.bg)).toBeGreaterThan(lum(L.surface2));
    expect(lum(L.surface2)).toBeGreaterThan(lum(L.border));
  });

  test('it stays NEUTRAL carbon — not the steel this ramp exists to remove', () => {
    // User ruling 2026-06-23: most of the blue removed, blue ~3 over red.
    // The Figma Light values carry blue 15 over red (#e4ecf3) and are the
    // thing this deliberately does not import.
    for (const k of ['bg', 'panel', 'surface2', 'border']) {
      const [r, , b] = hex(L[k]);
      expect(b - r).toBeGreaterThanOrEqual(0);
      expect(b - r).toBeLessThanOrEqual(5);
    }
  });

  test('the shell ink still clears AA on it', () => {
    // textPrimary light is #0d0f12 — the value that passed the 2026-08-18 AA
    // pass. It has to clear 4.5:1 on every surface it can land on.
    for (const k of ['bg', 'panel', 'surface2']) {
      expect(ratio('#0d0f12', L[k])).toBeGreaterThan(4.5);
    }
  });
});
