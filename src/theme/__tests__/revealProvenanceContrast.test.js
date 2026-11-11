// Stage-4 P1 (M1, WCAG 1.4.3): the creation reveal's confidence lines
// ("HIGH CONFIDENCE · READY") rendered at 9px, opacity .42 — about 2.0:1.
//
// The reveal stage is a FIXED carbon surface in both themes (styles.css
// .reveal-stage background-color #0d1014, with two faint glows). Every
// theme-moded text token flips dark in light mode, so none of them can carry
// text there — --ink-soft reads 3.45:1 and --steel-soft 2.75:1 in light.
// The line is colored from the design system's secondary text tone instead,
// exposed by hostv2/src/theme.js as --carbon-ink-soft, which does not flip.
// That wiring is executed in hostv2/test/revealProvenanceToken.test.mjs; the
// rendered size/opacity/contrast is pinned by hostv2/e2e/revealProvenanceLegible.spec.mjs.
import { color } from '../../design/tokens';

const lum = (hex) => {
  const n = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// The stage's base, and the brightest point any text can sit on: both radial
// glows (rgba(90,120,145,.16), then rgba(70,95,130,.1)) composited at full
// strength over the base. The vignette only darkens, so it is never tighter.
const REVEAL_BASE = '#0d1014';
const REVEAL_GLOW_PEAK = '#1e2731';

describe('the reveal confidence line clears AA on its ground', () => {
  test('the composite ground is what the two glows produce', () => {
    const over = (fg, a, bg) => bg.map((b, i) => fg[i] * a + b * (1 - a));
    const g = over([70, 95, 130], 0.1, over([90, 120, 145], 0.16, [13, 16, 20]));
    const hex = '#' + g.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    expect(hex).toBe(REVEAL_GLOW_PEAK);
  });

  test('design-system secondary text is ≥4.5:1 on the base and the glow peak', () => {
    expect(color.text.secondary).toBe('#849eb8');
    expect(contrast(color.text.secondary, REVEAL_BASE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color.text.secondary, REVEAL_GLOW_PEAK)).toBeGreaterThanOrEqual(4.5);
  });

  test('NEGATIVE CONTROL: the shipped 9px/.42 treatment really was ~2:1', () => {
    // --muted #909296 at opacity .42 over the base.
    const mix = [0x90, 0x92, 0x96].map((f, i) => f * 0.42 + [13, 16, 20][i] * 0.58);
    const hex = '#' + mix.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    expect(contrast(hex, REVEAL_BASE)).toBeLessThan(2.1);
  });
});
