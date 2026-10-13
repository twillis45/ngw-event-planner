// ─── THE FIXER THAT DESTROYED WHAT IT WAS FIXING ────────────────────────────
//
// `npm run handoff:stamp` rewrites the SHA in HANDOFF.md's `Branch / HEAD`
// row. Until 2026-10-13 it also DELETED the entire rest of that row, every
// time, and printed `✓`.
//
// The row's regex is built from four groups:
//
//   /^(\|\s*Branch \/ HEAD\s*\|[^|]*?`)([0-9a-f]{7,40})(`)([^|]*)\|/m
//    └── $1 label + lead-in ──────────┘└─ $2 SHA ─┘└$3┘└── $4 ──┘
//
// `$4` is `([^|]*)` — everything from the SHA's closing backtick to the cell's
// closing pipe. A markdown table cell cannot carry an unescaped `|`, so that
// group is the WHOLE remainder of the row. The replacement was:
//
//   src.replace(ROW, `$1${head}$3 |`)        // no $4
//
// so the stamp wrote back the label, the new SHA, and a pipe. Everything else
// in the cell was dropped.
//
// ── WHAT IT ACTUALLY COST, MEASURED ─────────────────────────────────────────
//
// Caught on a run where that row held 5,592 characters: the 104-hour
// production-outage record and the four-day lesson written under it, every
// jest and e2e count, and five sessions of matrix history. One command,
// reported successful, and the gate's OWN failure message is what tells you
// to run it — `Fix: npm run handoff:stamp`. So the repo instructed a session
// to delete its own history in order to go green.
//
// Nothing caught it because nothing tested this script at all, and the damage
// is invisible at the call site: `handoff:check` passes afterwards. It passes
// *because* the row was gutted — the SHA it checks is the one thing the stamp
// keeps.
//
// ── WHY A TEST AND NOT JUST THE FIX ─────────────────────────────────────────
//
// The fix is `$4`. One token, and nothing in the repo would notice if it went
// missing again — which is the same shape as the bug: a correct comment
// ("the stamp writes the SHA and NOTHING ELSE", true of intent) sitting above
// code that did something else, with no pressure on either.
//
// So this reads the SHIPPED script — the real regex and the real replacement
// string, extracted from source rather than copied here, so editing either one
// re-points the test at the edit — and drives them over both a fixture row and
// the live HANDOFF.md row.
import fs from 'fs';
import path from 'path';

const SCRIPT = path.join(__dirname, '../../../scripts/handoff-freshness.mjs');
const HANDOFF = path.join(__dirname, '../../../HANDOFF.md');
const src = fs.readFileSync(SCRIPT, 'utf8');

// The script's own ROW literal, rebuilt — not a second copy of the pattern.
function rowRegex() {
  const m = src.match(/^const ROW = \/(.*)\/([gimsuy]*);\s*$/m);
  if (!m) throw new Error('scripts/handoff-freshness.mjs: no `const ROW = /…/;` line found');
  return new RegExp(m[1], m[2]);
}

// The script's own replacement template, with its `${head}` interpolation left
// as a placeholder to substitute.
function stampTemplate() {
  const m = src.match(/src\.replace\(ROW,\s*`([^`]*)`\)/);
  if (!m) throw new Error('scripts/handoff-freshness.mjs: no `src.replace(ROW, `…`)` call found');
  return m[1];
}

const stamp = (text, head) =>
  text.replace(rowRegex(), stampTemplate().replace('${head}', head));

const PROSE =
  ' — 2026-01-01. **A sentence that must survive the stamp.** jest 1 / 1 · e2e 2 tests.';
const FIXTURE = `| Branch / HEAD | \`some-branch\`, rebased onto \`main\` @ \`abc1234\`${PROSE} |\n`;

test('the stamp replaces the SHA and keeps the rest of the row', () => {
  const out = stamp(FIXTURE, 'f7ab7463');
  expect(out).toContain('f7ab7463');
  expect(out).not.toContain('abc1234');
  expect(out).toContain(PROSE.trim());
});

test('the stamp is not lossy — the row keeps its length, minus the old SHA', () => {
  const before = FIXTURE.match(rowRegex())[0];
  const after = stamp(FIXTURE, 'f7ab7463').match(rowRegex())[0];
  // Only the SHA may change width (7 → 8 here). Anything else is deletion.
  expect(after.length - before.length).toBe('f7ab7463'.length - 'abc1234'.length);
});

// THE ONE THAT WOULD HAVE FIRED. Driven over the live row, because the fixture
// is small enough that losing it looks survivable and the real row is not.
test("stamping the live HANDOFF row does not eat the session history in it", () => {
  const handoff = fs.readFileSync(HANDOFF, 'utf8');
  const before = handoff.match(rowRegex());
  expect(before).not.toBeNull();

  const head = before[2];                      // re-stamp the same SHA: a no-op
  const after = stamp(handoff, head).match(rowRegex())[0];

  expect(after).toBe(before[0]);               // byte-identical, or it deleted something
  // And state the stake in the failure message rather than just a length.
  expect(after.length).toBeGreaterThanOrEqual(before[0].length);
});

test('the replacement writes back every group the row regex captures', () => {
  const template = stampTemplate();
  const captures = (rowRegex().source.match(/\((?!\?)/g) || []).length;
  for (let g = 1; g <= captures; g++) {
    if (g === 2) continue;                     // $2 is the SHA — replaced, by design
    expect(template).toContain(`$${g}`);
  }
});
