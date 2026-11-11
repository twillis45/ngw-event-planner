// ─── THE REVEAL'S CONFIDENCE LINE NEEDS A TOKEN THAT DOES NOT FLIP (M1) ─────
//
// The creation reveal is a fixed carbon stage (#0d1014) in BOTH themes, so the
// color of its text cannot come from a token that turns dark in light mode.
// Executes applyStudioMatte for each theme against a stub document and checks
// the resolved --carbon-ink-soft: identical across themes and ≥4.5:1 on the
// stage's base and glow peak (see demo/src/theme/__tests__/revealProvenanceContrast.test.js).
import { describe, it, expect } from 'vitest';

const props = {};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 };
globalThis.window = { location: { search: '', href: 'http://x/' }, history: { replaceState: () => {} } };
globalThis.document = { documentElement: { setAttribute: () => {}, style: { setProperty: (k, v) => { props[k] = v; } } } };

const lum = (hex) => {
  const n = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const resolve = async (theme) => {
  const { applyStudioMatte } = await import('../src/theme.js');
  applyStudioMatte(theme);
  return props['--carbon-ink-soft'];
};

describe('--carbon-ink-soft', () => {
  it('is set, and is the same color in dark and light', async () => {
    const d = await resolve('dark');
    const l = await resolve('light');
    expect(d).toMatch(/^#[0-9a-f]{6}$/i);
    expect(l).toBe(d);
  });

  it('clears 4.5:1 on the reveal base and glow peak in both themes', async () => {
    for (const theme of ['dark', 'light']) {
      const v = await resolve(theme);
      expect(contrast(v, '#0d1014')).toBeGreaterThanOrEqual(4.5);
      expect(contrast(v, '#1e2731')).toBeGreaterThanOrEqual(4.5);
    }
  });
});
