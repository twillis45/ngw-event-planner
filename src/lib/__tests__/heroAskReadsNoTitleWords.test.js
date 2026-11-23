// ─── THE HERO ASK READER HOLDS NO REGEX OVER A TITLE (six root causes, cause 1, part 2)
//
// heroAskReadsTheDeclaration.test.js proves, over all 47 playbooks, that no
// ask changes when an item's title words do. This holds the reader's source to
// the same rule, so a new rung that matches title words fails here before any
// sweep has to find the event that exposes it. The claim is about file
// CONTENT (what heroAskFor's code may read), which is what a text gate proves.
const fs = require('fs');
const path = require('path');

describe('the reader holds no regex over a title', () => {
  test('heroAskFor reads no title words', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'heroAsk.js'), 'utf8');
    const start = src.indexOf('export function heroAskFor');
    const end = src.indexOf('\nexport function heroRecord');
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start, end)
      // comments are prose, not code
      .replace(/\/\/[^\n]*/g, '');
    // The title is bound to `t`; it may be measured, trimmed and spoken back,
    // never matched.
    expect(body).not.toMatch(/\.test\(\s*t2?\s*\)/);
    expect(body).not.toMatch(/\bt2?\.match\(/);
    expect(body).not.toMatch(/\.test\([^)]*title/);
    expect(body).not.toMatch(/isCircularAsk|foodAsk\(/);
  });
});
