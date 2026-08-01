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
// Vocabulary consolidation 2026-07-31: the chip's labels now come from here.
const { timeStatusLabel, PAST_WINDOW } = require('../timeStatusLabel');

const SHELL = path.resolve(__dirname, '../../../hostv2/src/HostShellV2.jsx');
const raw = fs.readFileSync(SHELL, 'utf8');
// Strip comments so a guard mentioned in prose can never satisfy a gate.
const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

describe('a solemn day is never told it is late', () => {
  it('the shell can tell a solemn event from an ordinary one', () => {
    // CONVERGED 2026-07-31: the shell now reads the SHARED classifier
    // (@app/lib/solemn) instead of defining its own regex — one derivation for
    // the shell and the copy engine. Stronger than the local copy it replaced.
    expect(src).toMatch(/import \{ isSolemnEvent \} from '@app\/lib\/solemn'/);
    expect(src).not.toMatch(/const SOLEMN_RE = /);
    // …and the render path holds that answer, which is what the guards read.
    expect(src).toMatch(/const solemn = useMemo\(\(\) => isSolemnEvent\(event\)/);
  });

  it('SURFACE 1 — the overdue-count clause is suppressed on a solemn event', () => {
    // The converged guard carries a second suppressor (heroSpeaksThisOverdue,
    // so the scold is said once). Assert BOTH conditions rather than the exact
    // expression, so a third legitimate suppressor is not read as a regression.
    expect(src).toMatch(/if \(od && !heroSpeaksThisOverdue && !solemn\) slips\.push\(/);
    expect(src).not.toMatch(/if \(od\) slips\.push\(/);
  });

  it('SURFACE 2 — the hero due chip drops the overshoot on a solemn event', () => {
    expect(src).toMatch(/if \(solemn && a\.dueInDays < 0\) return null;/);
  });

  it('only the OVERSHOOT is dropped — forward states still print', () => {
    // A solemn event must still be able to say "due today". Suppressing those
    // would hide real, forward-looking work rather than removing blame.
    //
    // VOCABULARY CONSOLIDATION 2026-07-31: the chip's four labels moved to the
    // shared timeStatusLabel helper, so the inline ternary these lines used to
    // match no longer exists. The GUARANTEE is unchanged and is now asserted
    // against the helper's real output rather than the source shape — a stronger
    // check, because it proves what renders instead of how it is written.
    expect(src).toMatch(/timeStatusLabel\(a\.dueInDays\)/);
    expect(timeStatusLabel(0)).toBe('due today');
    expect(timeStatusLabel(1)).toBe('due tomorrow');
    expect(timeStatusLabel(3)).toBe('due in 3 days');
    // and the one state a solemn event must never reach, which the guard above drops
    expect(timeStatusLabel(-1)).toBe('past its window');
  });

  it('non-solemn events are untouched — every guard only ADDS a condition', () => {
    // Each guard is a narrowing of an existing condition, never a rewrite of the
    // non-solemn path, so ordinary events cannot change behaviour.
    expect(src).toMatch(/if \(od && !heroSpeaksThisOverdue && !solemn\)/);
    expect(src).toMatch(/if \(solemn && a\.dueInDays < 0\) return null;/);
    // The blame strings still EXIST for non-solemn events to use. After the
    // 2026-07-31 vocabulary consolidation NEITHER shell surface carries the
    // literal any more — the due chip calls timeStatusLabel and the vendor
    // late-chip renders the shared PAST_WINDOW constant — so the assertion moved
    // to the owner. Suppression is still per-surface and unchanged; only the
    // SOURCE of the language moved.
    expect(src).toMatch(/past their easy window/);
    expect(src).toMatch(/\{PAST_WINDOW\}/);            // the vendor/status late chip
    expect(src).toMatch(/timeStatusLabel\(a\.dueInDays\)/);  // the hero due chip
    expect(PAST_WINDOW).toBe('past its window');
    expect(timeStatusLabel(-1)).toBe('past its window');
  });
});
