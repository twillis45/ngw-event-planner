// ─── THE CREAM INVITE'S RUST LABELS CLEAR 4.5:1 (coordinator, 11/24/2026) ────
// The 11px uppercase labels on the guest invite (WHEN, WHERE, THE FAVOR OF A
// REPLY) and its links are drawn in --hue-deep. On the cream sheet that was
// #B84E1E: 4.27:1 against the sheet's own bottom color (#f2ebdc), under the
// 4.5:1 floor for text, and lower where the sheet's foot is shaded. A palette
// study measured it (renders-palettes/pal.js: the foot is the paper with 6%
// black mixed in). This reads both colors out of the shipped stylesheet and
// does the WCAG math, so a lighter rust fails here before a guest sees it.
// Only the TEXT accent is measured: the rule and ornaments read --hue.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
const rgb = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16));
const lum = (c) => c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
  .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// The cream sheet's own rule: the `.inv2-sheet{` block that starts a line.
const at = css.search(/^\.inv2-sheet\{/m);
const sheet = css.slice(at, css.indexOf('}', at));
const label = (/--hue-deep:\s*(#[0-9a-fA-F]{6})/.exec(sheet) || [])[1];
// The paper's shaded foot: the last stop of its gradient, a variable since the
// palettes (11/24/2026) — --paper-foot on the cream sheet.
const bottom = (/--paper-foot:\s*(#[0-9a-fA-F]{6})/.exec(sheet) || [])[1];

describe('the cream invite’s label color against its paper', () => {
  it('reads both colors from the stylesheet (premise)', () => {
    expect(label).toMatch(/^#/);
    expect(bottom).toBe('#f2ebdc');
  });
  it('clears 4.5:1 on the sheet’s bottom color', () => {
    expect(ratio(rgb(label), rgb(bottom))).toBeGreaterThanOrEqual(4.5);
  });
  it('clears 4.5:1 where the sheet is shaded darkest (the foot: 6% black mixed in)', () => {
    const foot = rgb(bottom).map((v) => v * 0.94);
    expect(ratio(rgb(label), foot)).toBeGreaterThanOrEqual(4.5);
  });
});
