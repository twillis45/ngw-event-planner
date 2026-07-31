// ─── SOLEMN EVENTS ARE NEVER TOLD THEY ARE LATE ──────────────────────────────
//
// The harm, reproduced in production on 2026-07-31: a repast four days out — a
// family that had just buried someone — opened /hostv2/ and read
//
//   "Mostly on course — a few decisions are past their easy window."
//   "past its window"
//
// "Past its easy window" measures backwards from a deadline the host never
// agreed to. repast.js authors T-5d leads because a burial lands on Saturday,
// so a grieving family is "behind" the moment the app loads. And repast.js
// records as researched cultural fact that the family does NOT cook — a church
// or repast committee carries the meal — so the app was scolding them for being
// slow to arrange food that was already coming.
//
// TWO separate expressions produce that language on this shell, each with its
// own condition. Guarding one leaves the other printing, which is exactly what
// happened: the slips clause was fixed first and the due chip still rendered
// over the hero. Only DRIVING the built shell caught it. These are source gates
// so neither can regress silently.
//
// Deliberately structural, not behavioural: they read the shell source rather
// than rendering it, so they need no clock, no fixtures, and no DOM — nothing
// that could make them date- or timezone-dependent.
const fs = require('fs');
const path = require('path');

const SHELL = path.resolve(__dirname, '../../../hostv2/src/HostShellV2.jsx');
const raw = fs.readFileSync(SHELL, 'utf8');
// Strip comments so a guard mentioned in prose can never satisfy a gate.
const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

describe('a solemn day is never told it is late', () => {
  it('the shell can tell a solemn event from an ordinary one', () => {
    expect(src).toMatch(/const SOLEMN_RE = \/repast\|memorial\|funeral/);
    expect(src).toMatch(/function isSolemnEvent\(event\)/);
    // …and the render path holds that answer, which is what the guards read.
    expect(src).toMatch(/const solemn = useMemo\(\(\) => isSolemnEvent\(event\)/);
  });

  it('SURFACE 1 — the overdue-count clause is suppressed on a solemn event', () => {
    expect(src).toMatch(/if \(od && !solemn\) slips\.push\(/);
    // The unguarded form must be gone entirely, not merely shadowed.
    expect(src).not.toMatch(/if \(od\) slips\.push\(/);
  });

  it('SURFACE 2 — the hero due chip drops the overshoot on a solemn event', () => {
    expect(src).toMatch(/if \(solemn && a\.dueInDays < 0\) return null;/);
  });

  it('only the OVERSHOOT is dropped — forward states still print', () => {
    // A solemn event must still be able to say "due today". Suppressing those
    // would hide real, forward-looking work rather than removing blame.
    expect(src).toMatch(/a\.dueInDays === 0 \? 'due today'/);
    expect(src).toMatch(/a\.dueInDays === 1 \? 'due tomorrow'/);
    expect(src).toMatch(/'due in ' \+ a\.dueInDays \+ ' days'/);
  });

  it('non-solemn events are untouched — every guard only ADDS a condition', () => {
    // Each guard is a narrowing of an existing condition, never a rewrite of the
    // non-solemn path, so ordinary events cannot change behaviour.
    expect(src).toMatch(/if \(od && !solemn\)/);
    expect(src).toMatch(/if \(solemn && a\.dueInDays < 0\) return null;/);
    // The blame strings still EXIST for non-solemn events to use.
    expect(src).toMatch(/past their easy window/);
    expect(src).toMatch(/'past its window'/);
  });
});
