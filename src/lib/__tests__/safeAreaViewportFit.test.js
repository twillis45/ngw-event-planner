// ─── env(safe-area-inset) DOES NOTHING WITHOUT viewport-fit=cover ───────────
//
// Reported from an iOS simulator: "the app is too skinny for the viewport."
//
// hostv2's stylesheet reads `env(safe-area-inset-*)` in 15 places — the content
// block's bottom padding, the .app spacer, the elegant hero's min-height, the
// fold handle, the bottom rail. On iOS **every one of those resolves to 0
// unless the page declares `viewport-fit=cover`**, and Safari then insets the
// whole page inside the safe area rather than painting edge-to-edge. In
// landscape that is visible bars either side.
//
// The CRA has carried the token all along (public/index.html) and the repo's own
// MOBILE_LAYOUT_REPAIR_1 cites that file as "already correct". hostv2 never had
// it: `git log -S viewport-fit -- hostv2/index.html` returns nothing. Not
// removed — never present. A consumer with no producer, which is the same class
// as every other defect found today.
//
// This gate ties the two together so they cannot drift apart again: if the CSS
// depends on safe-area insets, the document must enable them.
import fs from 'fs';
import path from 'path';

const REPO = path.resolve(__dirname, '..', '..', '..');
const read = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');

const CSS = 'hostv2/src/styles.css';
const DOCS = ['hostv2/index.html'];

describe('safe-area insets are actually enabled', () => {
  test('PREMISE — the stylesheet really does depend on safe-area insets', () => {
    // If the CSS ever stops using env(), this gate is about nothing and should
    // be revisited rather than silently passing.
    const uses = (read(CSS).match(/env\(\s*safe-area-inset/g) || []).length;
    expect(uses).toBeGreaterThan(5);
  });

  test('THE DOCUMENT ENABLES THEM — viewport-fit=cover is present', () => {
    for (const doc of DOCS) {
      const html = read(doc);
      const meta = (html.match(/<meta\s+name="viewport"[^>]*>/i) || [])[0] || '';
      expect(meta).toMatch(/viewport-fit\s*=\s*cover/i);
    }
  });

  test('and the CRA has not lost it either', () => {
    // The sibling that was already correct. Named so a future edit to one file
    // cannot quietly diverge from the other.
    const meta = (read('public/index.html').match(/<meta\s+name="viewport"[^>]*>/i) || [])[0] || '';
    expect(meta).toMatch(/viewport-fit\s*=\s*cover/i);
  });

  test('width=device-width survives alongside it', () => {
    // viewport-fit is additive; dropping device-width while adding it would trade
    // one layout defect for a worse one.
    for (const doc of [...DOCS, 'public/index.html']) {
      const meta = (read(doc).match(/<meta\s+name="viewport"[^>]*>/i) || [])[0] || '';
      expect(meta).toMatch(/width\s*=\s*device-width/i);
    }
  });
});
