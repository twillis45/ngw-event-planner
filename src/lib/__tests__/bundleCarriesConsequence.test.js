// ─── THE BOARD'S RANKING MUST SURVIVE THE BUNDLE BOUNDARY ────────────────────
//
// Measured by the scoring audit, 2026-09-18. `nextActions` groups a surface's
// raises into one bundle once there are three or more. The bundle carried the
// tightest child's DATES (`dueInDays`, `leadDays`) and dropped every signal
// `actionConsequence` reads — `priorityScore`, `gateHolder`, `unlocks` — so the
// bundle scored 0.000 while its own children scored 2.0-3.1.
//
// Crab Feast, ONE HORIZON APART:
//   T-8   1 overdue row  -> single, consequence 2.025
//   T-6   3 overdue rows -> BUNDLE, consequence 0.000
//
// Three or more overdue decisions is the ORDINARY state of a real event from a
// few months out. So on almost every live plan the entire 260-decision
// authoring effort — weight, reversibility, emotionalWeight, the whole board
// scorer — arrived at the host's most important screen as zero.
//
// What ranked instead was `latenessBoost`, which saturates at 4.9. On a wedding
// at T-150 the top TWO actions tied at exactly 4.9000; compareBandedActions
// returns 0 on a tie and the sort is stable, so the host's single most
// important instruction was ordered by producer push order — the exact failure
// the comment at CommandCenter.jsx:2404-2407 says was fixed.
//
// hostv2 imports eventPlan from @app/CommandCenter (HostShellV2.jsx:10), so
// this is the production engine for the host shell, not frozen CRA code.
import { eventPlan, actionConsequence } from '../../CommandCenter';

const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const ev = (type, days, extra) => ({
  id: 'b', type, date: iso(days), guestMode: 'count', guestCount: 80,
  foodChoices: {}, totalBudget: 20000, ...extra,
});
const actions = (e) => ((eventPlan(e) || {}).nextActions || []);
const bundles = (e) => actions(e).filter((a) => a && a.kind === 'bundle');

describe('a bundle carries its children strongest claim', () => {
  test('(premise) a real event actually produces a bundle', () => {
    expect(bundles(ev('Wedding', 150)).length).toBeGreaterThan(0);
  });

  test('a bundle scores above zero — the defect was exactly zero', () => {
    for (const b of bundles(ev('Wedding', 150))) {
      expect(actionConsequence(b)).toBeGreaterThan(0);
    }
  });

  test('a bundle is never weaker than its own strongest child', () => {
    // The bundle stands in for its children; it may not rank below them.
    for (const b of bundles(ev('Wedding', 150))) {
      const kids = (b.items || []).map(actionConsequence);
      if (!kids.length) continue;
      expect(actionConsequence(b)).toBeGreaterThanOrEqual(Math.max(...kids));
    }
  });

  test('priorityScore is the max child, not dropped', () => {
    for (const b of bundles(ev('Wedding', 150))) {
      const ps = (b.items || []).map((a) => a.priorityScore).filter((n) => Number.isFinite(n));
      if (!ps.length) continue;
      expect(b.priorityScore).toBe(Math.max(...ps));
    }
  });

  test('unlocks is the MAX child, never the sum', () => {
    // Summing overcounts: each child counts ITS OWN dependents, and two
    // decisions routinely gate the same downstream work. [food,vendors] beside
    // [food,timeline] sums to 4 against a true union of 3. MAX claims only what
    // one child can evidence.
    for (const b of bundles(ev('Wedding', 150))) {
      const u = (b.items || []).map((a) => a.unlocks).filter((n) => Number.isFinite(n) && n > 0);
      if (!u.length) continue;
      expect(b.unlocks).toBe(Math.max(...u));
      const sum = u.reduce((x, y) => x + y, 0);
      if (sum > Math.max(...u)) expect(b.unlocks).toBeLessThan(sum);
    }
  });

  test('gateHolder is true when any child frees other work', () => {
    for (const b of bundles(ev('Wedding', 150))) {
      const any = (b.items || []).some((a) => a.gateHolder === true);
      expect(b.gateHolder).toBe(any);
    }
  });
});

describe('a bundle can still ask the authored question', () => {
  // Giving bundles a real consequence put them at position one, where heroAskFor
  // reads the ask. With no ask on the bundle it fell to its prose branch and said
  // "Settle your decisions." over six consecutive wedding stages where an authored
  // question had been reaching the host. The bundle carries the LEAD child's ask
  // for the same reason it carries the dates and the scores.
  const askedBundles = (e) => bundles(e).filter((b) => (b.items || []).some((k) => k && k.ask));

  test('(premise) some surface actually authors an ask on its raises', () => {
    expect(askedBundles(ev('Wedding', 180)).length).toBeGreaterThan(0);
  });

  test('the bundle speaks with its most consequential child, verbatim', () => {
    for (const b of askedBundles(ev('Wedding', 180))) {
      let lead = null, best = -Infinity;
      for (const k of b.items) { const c = actionConsequence(k); if (c > best) { best = c; lead = k; } }
      // Verbatim or nothing: never a merged or invented phrasing.
      expect(b.ask).toBe(lead.ask || null);
      if (b.ask) expect(b.items.map((k) => k.ask)).toContain(b.ask);
    }
  });

  test('a bundle whose children authored nothing claims nothing', () => {
    for (const b of bundles(ev('Wedding', 180))) {
      if ((b.items || []).some((k) => k && k.ask)) continue;
      expect(b.ask).toBe(null);          // not '', not a label punctuated into a question
    }
  });
});

describe('the boundary is continuous — no cliff at the third raise', () => {
  // The defect made consequence fall off a cliff at exactly 3 overdue rows.
  // These two horizons sat either side of it: 2.025 -> 0.000.
  test('Crab Feast T-8 (single) and T-6 (bundle) are comparable, not a cliff', () => {
    const top = (e) => Math.max(0, ...actions(e).map(actionConsequence));
    const single = top(ev('Crab Feast', 8));
    const bundled = top(ev('Crab Feast', 6));
    expect(single).toBeGreaterThan(0);
    expect(bundled).toBeGreaterThan(0);
    // Not a collapse: the bundled side must stay within reach of the single side.
    expect(bundled).toBeGreaterThan(single * 0.5);
  });
});

describe('the ranking is decided by consequence, not by array position', () => {
  test('the top two actions are not tied', () => {
    // The defect produced an exact 4.9000 tie between the top two on a wedding,
    // resolved by producer push order because compareBandedActions returns 0.
    const a = actions(ev('Wedding', 150));
    if (a.length < 2) return;
    const scores = a.map(actionConsequence);
    const sorted = [...scores].sort((x, y) => y - x);
    expect(sorted[0]).toBeGreaterThan(sorted[1]);
  });
});
