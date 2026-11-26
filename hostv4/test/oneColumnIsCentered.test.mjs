// ONE COLUMN IS CENTERED (owner, 11/26/2026, option B). Measured on live
// 2981924 across 13 iOS and Android devices: the compact layout (an iPad held
// upright, a phone turned sideways, an open foldable) kept its 680px column
// pinned left, up to 312px empty on the right, while the button sat at the
// screen edge. Now the column is centered and the back link, menu button and
// pane button share its edges: max(24px, (width - 680px) / 2). The guest pushed
// over it does the same at 560px. Phones and the split layout are unchanged.
// Measured in WebKit at 667, 744, 780, 834, 844, 932, 984 and 1016 wide: equal
// gaps, button and back link on the column's edges (scratch center.cjs); this
// test keeps the rules from drifting.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const css = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/styles.css'), 'utf8');
const EDGE = 'max(24px, calc((100% - 680px) / 2))';

describe('one column is centered', () => {
  it('the view pads both sides by the same edge', () => {
    expect(css).toContain('.tablet.compact .view { padding-left: ' + EDGE + '; padding-right: ' + EDGE + '; }');
  });
  it('the back link, the pane button and the menu button sit on that edge', () => {
    expect(css).toContain('.tablet.compact .view > .navbar { left: calc(max(24px, (100% - 680px) / 2) - 8px); }');
    expect(css).toContain('.tablet.compact .action { right: ' + EDGE + '; }');
    expect(css).toMatch(/\.tablet\.compact \.menubtn \{ left: calc\(max\(24px, \(100% - 680px\) \/ 2\) - 12px/);
  });
  it('the guest pushed over it centers its 560px column the same way', () => {
    expect(css).toContain('.tablet.compact .gdetail.pushedpane { padding-left: max(24px, calc((100% - 560px) / 2)); padding-right: max(24px, calc((100% - 560px) / 2)); }');
  });
  it('only the compact layout changes', () => {
    const lines = css.split('\n').filter((l) => l.includes('100% - 680px') || l.includes('100% - 560px'));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l.startsWith('.tablet.compact ')).toBe(true);
  });
});
