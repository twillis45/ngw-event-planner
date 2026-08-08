// ─── THE SPACING LADDER IS A RATCHET, NOT A CLEANUP (board, 2026-08-07) ──────
//
// The wide-screen sitting's structural finding: there is a token scale and there
// is no system. `--sp-1…7` = 4/8/12/16/20/24/32 is a clean 4px ladder, and most
// spacing in the stylesheet bypasses it — 272 off-ladder px values across 26
// distinct numbers, with 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 18, 21, 22, 26, 30
// and 34 all doing structural work. `gap:10px` appears 58 times, `gap:9px` 17,
// and `var(--sp-3)` (12px) is a third value doing the same job.
//
// The board was explicit that a ruled ladder without a gate will not hold,
// because "304 literals did not arrive on purpose" — they accrued one honest
// local decision at a time, which is exactly how this class regrows.
//
// SO THIS IS A RATCHET, NOT A BAN. Rewriting 272 declarations in one pass would
// be a enormous untested visual diff across every surface, and this repo has
// already been bitten three times today by rules that looked right and did
// nothing. The gate freezes the count instead: existing values are grandfathered,
// and the number may only ever go DOWN. The same shape as `gate:cra`, which is
// baselined at 242 of 245 rather than demanding 245.
//
// When you legitimately reduce it, lower BASELINE in the same commit. That is
// the ratchet turning, and it is the only edit to this file that should ever
// be needed.
const fs = require('fs');
const path = require('path');

// The ratified ladder. 0/1/2 are not spacing decisions — they are hairlines,
// resets and optical nudges, and banning them would produce noise, not rigour.
const LADDER = new Set([0, 1, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80]);

// Frozen 2026-08-07 at the board sitting. LOWER THIS, NEVER RAISE IT.
const BASELINE = 272;

const PROP = /\b(margin|padding|gap|row-gap|column-gap)(-top|-right|-bottom|-left|-block|-inline)?\s*:\s*([^;{}]+)/g;

// Comments quote the very values the gate bans (this one does, above), so they
// are stripped before counting — otherwise the gate fails on its own docs, which
// is a trap this repo has already paid for once.
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const offLadder = (css) => {
  const out = [];
  let m;
  const src = stripComments(css);
  PROP.lastIndex = 0;
  while ((m = PROP.exec(src))) {
    const decl = m[0];
    for (const raw of m[3].match(/-?\d+(?:\.\d+)?px/g) || []) {
      const n = Math.abs(parseFloat(raw));
      // Fractional values are almost always a calc() remainder or a hairline,
      // not a chosen step; only whole pixels are ladder decisions.
      if (Number.isInteger(n) && !LADDER.has(n)) out.push({ decl: decl.slice(0, 60), value: n });
    }
  }
  return out;
};

describe('spacing sits on the ratified ladder', () => {
  const cssPath = path.resolve(__dirname, '../../..', 'hostv2/src/styles.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  test('off-ladder spacing values never increase', () => {
    const found = offLadder(css);
    // The message carries the worst offenders, because a bare count tells the
    // next person nothing about where to spend the effort.
    const byValue = found.reduce((acc, f) => { acc[f.value] = (acc[f.value] || 0) + 1; return acc; }, {});
    const worst = Object.entries(byValue).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([v, n]) => `${v}px x${n}`).join(', ');
    // NOTE: jest's `expect` takes ONE argument — the message-as-second-arg form
    // is Playwright's, and passing it here throws inside expect() rather than
    // failing the assertion. Learned by doing it. The diagnostic goes in an
    // explicit throw instead, where it is actually readable.
    if (found.length > BASELINE) {
      throw new Error(
        `Off-ladder spacing went UP: ${found.length} vs baseline ${BASELINE}.\n` +
        `Ladder: ${[...LADDER].join(' ')}.\n` +
        `Most common offenders: ${worst}.\n` +
        'Use a ladder value, or a --sp-* token.');
    }
    if (found.length < BASELINE) {
      throw new Error(
        `Off-ladder spacing went DOWN: ${found.length} vs baseline ${BASELINE}.\n` +
        'You reduced it — lower BASELINE in this test to lock the gain in.');
    }
    expect(found.length).toBe(BASELINE);
  });

  test('the gate actually bites (guard against a dead ratchet)', () => {
    // A gate that cannot fail is worse than no gate: it certifies the thing it
    // was meant to catch. Prove the detector on a synthetic sample rather than
    // trusting that it read the real file correctly.
    expect(offLadder('.x{ gap:10px }')).toHaveLength(1);
    expect(offLadder('.x{ margin:9px 20px }')).toHaveLength(1);   // 20 is legal, 9 is not
    expect(offLadder('.x{ padding:16px 24px }')).toHaveLength(0);
    expect(offLadder('.x{ gap:var(--sp-3) }')).toHaveLength(0);
    // and that comments are stripped, since this file quotes banned values
    expect(offLadder('/* gap:10px is banned */ .x{ gap:16px }')).toHaveLength(0);
  });

  test('the ladder itself is the 4px scale the tokens declare', () => {
    // If --sp-* ever drifts off the ladder the gate is measuring one system
    // while the product uses another.
    const tokens = (css.match(/--sp-\d\s*:\s*(\d+)px/g) || [])
      .map((d) => parseInt(d.match(/(\d+)px/)[1], 10));
    expect(tokens.length).toBeGreaterThan(0);
    for (const t of tokens) expect(LADDER.has(t)).toBe(true);
  });
});
