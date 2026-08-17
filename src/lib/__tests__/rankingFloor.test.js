// ─── THE RANKING FLOOR: LATENESS IS A SIGNAL, NOT A VETO ────────────────────
//
// Ranking was 3/10 — the lowest dimension on the 10+ scoreboard and therefore the
// cap on all of it. The defect, re-derived against the running engine on
// 2026-08-17 rather than inherited from the July audit:
//
//   `_rankOverdue` is a BOOLEAN and it sat ABOVE consequence in the comparator,
//   so "is it late" outranked "how much does it matter". A COI 29 days late
//   (consequence 0.4) held position one over a gate-holding vendor reconfirm due
//   tomorrow that unlocks three other things (consequence 7.0). The engine scored
//   the reconfirm 17x more consequential and the comparator threw it away.
//
// The harm is LEARNED IGNORING. The same dead row sits at position one today,
// tomorrow, and in three weeks; the host stops reading position one; and then
// there is no top action at all, just a decoration where one used to be.
//
// The fix is a BOUNDED BOOST rather than a reordering, because reordering only
// moves the pathology: consequence-first would let a merely-scheduled item bury a
// genuinely late critical one, which is the same bug facing the other way. Both
// directions are pinned below, and a fix that holds only one of them is half a fix.
//
// See docs/audits/2026-08-17_RANKING_FLOOR_BOARD.md for the ruling.
import { compareNextActions, compareBandedActions, actionConsequence, latenessBoost } from '../../CommandCenter';

const rank = (rows) => [...rows].sort(compareNextActions).map((r) => r.id);

describe('the case that set the floor', () => {
  // The exact shape re-derived on 2026-08-17, kept as the regression anchor.
  const deadCoi = { id: 'coi', dueInDays: -29, priorityScore: 40, unlocks: 0 };
  const dueTomorrow = { id: 'reconfirm', dueInDays: 1, priorityScore: 300, unlocks: 3, gateHolder: true };
  const justLate = { id: 'balance', dueInDays: -1, priorityScore: 200, unlocks: 1 };

  test('PREMISE — the engine really does score the reconfirm far higher', () => {
    // If this ever stops being true the test below proves nothing: it would be
    // ranking two items the engine considers equivalent.
    expect(actionConsequence(dueTomorrow)).toBeGreaterThan(actionConsequence(deadCoi) * 5);
  });

  test('a 29-day-dead item no longer outranks a gate-holder due tomorrow', () => {
    // Asserts the RELATION, not the podium. Measured totals: balance 7.14,
    // reconfirm 7.00, coi 6.40 — so the dead COI went from FIRST to LAST, which
    // is the fix, and `balance` leads because a one-day-late payment carrying
    // real consequence genuinely should. An earlier version of this test demanded
    // reconfirm be [0] and failed on correct behaviour; the claim in the title is
    // about coi vs reconfirm and that is now what it checks.
    const order = rank([deadCoi, dueTomorrow, justLate]);
    expect(order.indexOf('coi')).toBeGreaterThan(order.indexOf('reconfirm'));
    expect(order[order.length - 1]).toBe('coi');
  });

  test('but the dead item is still ABOVE nothing — it keeps its place in the list', () => {
    // Demotion is not deletion. Rafanelli and Grandmother both pressed on this:
    // the day it bites, the host wants to find it.
    expect(rank([deadCoi, dueTomorrow, justLate])).toContain('coi');
  });
});

describe('both directions, or it is half a fix', () => {
  test('a late CRITICAL item still beats a higher-raw-consequence scheduled one', () => {
    // The mirror-image bug a plain reorder would have introduced.
    const lateCritical = { id: 'late-critical', dueInDays: -3, gateHolder: true, unlocks: 2, priorityScore: 200 };
    const scheduledBig = { id: 'scheduled-big', dueInDays: 4, gateHolder: true, unlocks: 2, priorityScore: 300 };
    expect(actionConsequence(scheduledBig)).toBeGreaterThan(actionConsequence(lateCritical));
    expect(rank([scheduledBig, lateCritical])[0]).toBe('late-critical');
  });

  test('a barely-late trivial item still leads a scheduled gate-holder', () => {
    // The calibration case. This is the existing decisionSoundness guard's
    // fixture, kept here too because it is what set the boost floor at 4: at 3 it
    // lost by 0.14, and the guard was right while the constant was wrong.
    const late = { id: 'late', dueInDays: -6, gateHolder: false, unlocks: 0 };
    const big = { id: 'big', dueInDays: 3, gateHolder: true, unlocks: 2 };
    expect(rank([big, late])[0]).toBe('late');
  });
});

describe('the boost is bounded, which is what stops age winning forever', () => {
  test('it saturates — 29 days late and 90 days late weigh the same', () => {
    // Without saturation, staleness compounds without limit and the oldest item
    // reclaims position one permanently. A 29-day-old problem and a 90-day-old
    // problem are the same kind of problem.
    expect(latenessBoost({ dueInDays: -29 })).toBe(latenessBoost({ dueInDays: -90 }));
    expect(latenessBoost({ dueInDays: -14 })).toBe(latenessBoost({ dueInDays: -29 }));
  });

  test('more-late still outweighs less-late below the cap', () => {
    expect(latenessBoost({ dueInDays: -10 })).toBeGreaterThan(latenessBoost({ dueInDays: -2 }));
  });

  test('an on-time item gets nothing, and junk does not throw', () => {
    expect(latenessBoost({ dueInDays: 3 })).toBe(0);
    expect(latenessBoost({ dueInDays: null })).toBe(0);
    expect(latenessBoost(null)).toBe(0);
    expect(() => latenessBoost(undefined)).not.toThrow();
  });
});

describe('the ordering is a function of the items, not of the array', () => {
  test('the same pair ranks identically reversed', () => {
    const a = { id: 'a', dueInDays: -29, priorityScore: 40 };
    const b = { id: 'b', dueInDays: 1, priorityScore: 300, gateHolder: true, unlocks: 3 };
    expect(rank([a, b])).toEqual(rank([b, a]));
  });
});

describe('band 0 — the criticals the host reads first', () => {
  // W8's SECOND Ranking cap, re-derived 2026-08-17: `compareNextActions` ran for
  // band 1 only, so criticals fell through to producer order. It survived the
  // comparator fix earlier the same day precisely because criticals never called
  // the comparator — the W8 lesson, exactly: a gate on one axis cannot lift a
  // dimension floored on another.
  //
  // None of the nine critical producers sets priorityScore, unlocks or
  // gateHolder, so lateness is the ONLY signal a critical carries. If band 0 does
  // not order by it, nothing does.
  const critical = (id, dueInDays) => ({ id, level: 'critical', dueInDays });
  // Drives the BANDED comparator eventPlan actually sorts with, not
  // compareNextActions. The first version of these tests used the latter and
  // passed identically with the band-0 fix reverted — they were measuring the
  // comparator, which was never the broken part.
  const band = (a) => (a && a.level === 'critical') ? 0 : 1;
  const rankBanded = (rows) => [...rows].sort((x, y) => compareBandedActions(x, y, band)).map((r) => r.id);

  test('among criticals, the more overdue leads', () => {
    const rows = [critical('fresh', -2), critical('ancient', -27), critical('today', 0)];
    expect(rankBanded(rows)).toEqual(['ancient', 'fresh', 'today']);
  });

  test('a critical with no date sorts last among criticals, never first', () => {
    // Absence of a deadline is not urgency. A null must not win by accident.
    expect(rankBanded([critical('undated', null), critical('late', -5)])[0]).toBe('late');
  });

  test('a critical still outranks band-1 work however consequential', () => {
    // Ordering WITHIN band 0 must not have made the band itself negotiable.
    const bigWork = { id: 'big', level: 'attention', dueInDays: 0, gateHolder: true, unlocks: 2, priorityScore: 900 };
    expect(rankBanded([bigWork, critical('crit', 3)])[0]).toBe('crit');
  });
});
