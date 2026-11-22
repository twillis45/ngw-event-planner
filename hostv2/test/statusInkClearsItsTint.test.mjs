// ─── EVERY STATUS INK CLEARS ITS OWN TINT, UNDER EVERY GLOW STOP (11/22/2026) ─
//
// Audit 2, lane F, P1-1 and P1-2. Ruling 30 brightened dark's gray secondary
// text for the steel glow, and nothing checked the colored inks beside it:
// dark's green, red and steel status labels on their own tints measured
// 3.72-4.47:1 under the glow's top stop (the RSVP "Yes", "Worth planning now",
// the board pills, "Sample", the filter chips), and light's steel on its tint
// (the pass chip, After's "What carries forward") 4.13.
//
// And the light theme study (owner, 11/22/2026: "B with the C touches") found
// light's attention ink at the SAME lightness as its meta text: #884E0B vs
// #5D5A56, luminance 1.03:1, so "past its window" read as dirty beige. Status
// has to differ from meta in lightness, not only in hue.
//
// This executes applyStudioMatte for each theme against a stub document and
// measures token PAIRS, so a new role on a token is covered without a browser.
// Every ground is measured bare and under each stop of --canvas-glow (the glow
// stays put while content scrolls, so any row can sit under its top stop).
import { describe, it, expect } from 'vitest';

const props = {};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 };
globalThis.window = { location: { search: '', href: 'http://x/' }, history: { replaceState: () => {} } };
globalThis.document = { documentElement: { setAttribute: () => {}, style: { setProperty: (k, v) => { props[k] = v; } } } };

const parse = (s) => {
  const v = String(s).trim();
  if (v.startsWith('#')) {
    const n = v.slice(1);
    const h = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1);
  }
  const m = v.match(/[\d.]+/g).map(Number);
  return [m[0], m[1], m[2], m[3] === undefined ? 1 : m[3]];
};
const over = (top, under) => top.slice(0, 3).map((c, i) => c * top[3] + under[i] * (1 - top[3])).concat(1);
const lum = ([r, g, b]) => {
  const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const resolve = async (theme) => {
  const { applyStudioMatte } = await import('../src/theme.js');
  for (const k of Object.keys(props)) delete props[k];
  applyStudioMatte(theme);
  return { ...props };
};

// The opaque grounds text sits on. .app paints the glow over --bg and .sheet
// over --sheet-ground, so those two are measured bare and under every glow
// stop; --card and --bg-band are opaque fills laid ON the glow, so bare.
const GLOWED = ['--bg', '--sheet-ground'];
const OPAQUE = ['--card', '--bg-band'];
const grounds = (t) => {
  const glow = (t['--canvas-glow'].match(/rgba?\([^)]+\)/g) || []).map(parse);
  return [
    ...GLOWED.flatMap((g) => {
      const base = parse(t[g]);
      return [{ name: g, rgb: base }, ...glow.map((s, i) => ({ name: `${g} + glow stop ${i}`, rgb: over(s, base) }))];
    }),
    ...OPAQUE.map((g) => ({ name: g, rgb: parse(t[g]) })),
  ];
};

// Each colored ink and the tint it is painted on as a chip or pill.
const ON_TINT = [
  ['--ok', '--ok-tint'], ['--danger', '--danger-tint'], ['--warn', '--warn-tint'],
  ['--steel-soft', '--steel-tint'], ['--ink-soft', '--steel-tint'], ['--progress', '--progress-tint'],
];
const INKS = ['--ink', '--ink-soft', '--muted', '--faint', '--steel-soft', '--ok', '--danger', '--danger-text', '--warn', '--progress'];

for (const theme of ['dark', 'light']) {
  describe(`status inks, ${theme}`, () => {
    it('every ink clears 4.5:1 on every ground, at every glow stop', async () => {
      const t = await resolve(theme);
      const fails = [];
      for (const ink of INKS) for (const g of grounds(t)) {
        const fg = over(parse(t[ink]), g.rgb);
        const r = ratio(fg, g.rgb);
        if (r < 4.5) fails.push(`${ink} on ${g.name}: ${r.toFixed(2)}`);
      }
      expect(fails).toEqual([]);
    });

    it('every status ink clears 4.5:1 on its own tint, at every glow stop', async () => {
      const t = await resolve(theme);
      const fails = [];
      for (const [ink, tint] of ON_TINT) for (const g of grounds(t)) {
        const chip = over(parse(t[tint]), g.rgb);
        const r = ratio(over(parse(t[ink]), chip), chip);
        if (r < 4.5) fails.push(`${ink} on ${tint} over ${g.name}: ${r.toFixed(2)}`);
      }
      expect(fails).toEqual([]);
    });

    // The progress bar (owner, 11/22/2026: "Green should pop more for the
    // progress"). The done strips were --ok at .95 and the open ones
    // --steel-soft at .75: in dark both sit near the same lightness, so done
    // and open told apart by hue alone. Done must stand off its ground (WCAG
    // 1.4.11, 3:1) AND off the open strip; open must still show (the
    // denominator), at every glow stop.
    it('a done strip stands off its ground and off an open strip', async () => {
      const t = await resolve(theme);
      expect(t['--seg-done'], '--seg-done is set').toBeTruthy();
      expect(t['--seg-open'], '--seg-open is set').toBeTruthy();
      const fails = [];
      for (const g of grounds(t)) {
        const done = over(parse(t['--seg-done']), g.rgb);
        const open = over(parse(t['--seg-open']), g.rgb);
        if (ratio(done, g.rgb) < 3) fails.push(`done on ${g.name}: ${ratio(done, g.rgb).toFixed(2)}`);
        if (ratio(done, open) < 2) fails.push(`done vs open on ${g.name}: ${ratio(done, open).toFixed(2)}`);
        if (ratio(open, g.rgb) < 1.3) fails.push(`open on ${g.name}: ${ratio(open, g.rgb).toFixed(2)}`);
      }
      expect(fails).toEqual([]);
    });
  });
}

describe('light attention reads as status, not as meta', () => {
  // Red-proof: the shipped #884E0B on its 10% tint fails all three.
  it('the warn ink differs from the meta ink in lightness', async () => {
    const t = await resolve('light');
    expect(ratio(parse(t['--warn']), parse(t['--muted']))).toBeGreaterThanOrEqual(1.3);
  });
  it('the warn chip stands off the panel and the page in lightness', async () => {
    const t = await resolve('light');
    const chip = over(parse(t['--warn-tint']), parse(t['--card']));
    expect(ratio(chip, parse(t['--card']))).toBeGreaterThanOrEqual(1.3);
    expect(ratio(over(parse(t['--warn-tint']), parse(t['--bg'])), parse(t['--bg']))).toBeGreaterThanOrEqual(1.15);
  });
  it('warn and danger differ in lightness, not only in hue', async () => {
    const t = await resolve('light');
    const warnChip = over(parse(t['--warn-tint']), parse(t['--card']));
    expect(ratio(warnChip, parse(t['--danger-solid']))).toBeGreaterThanOrEqual(3);
  });
});
