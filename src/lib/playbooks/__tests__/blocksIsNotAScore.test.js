// ─── `blocks` IS NOT A SCORE, AND THAT IS THE RIGHT ANSWER (2026-09-18) ──────
//
// THE FINDING, as it was handed over: "`blocks` is authored on 95% of decisions
// and contributes ZERO. derivedImportanceOf (index.js) is the only reader of
// `blocks` that touches ranking, and its call site is gated on the decision
// having NO authored weight. All 260 authored decisions DO author `weight`. So
// `blocks` never reaches the board's score."
//
// EVERY PART OF THAT IS TRUE. Measured here, against the real corpus, and
// re-measured on every run so it cannot quietly stop being true:
//
//   authored decisions across ALL_PLAYBOOKS      260
//   …authoring `blocks`                          247   (95.0%)
//   …authoring `weight`                          260   (100%)
//   …authoring `blocks` but NOT `weight`           0   ← the only live path
//
// THE CONCLUSION IS NOT "WIRE IT IN". It is that `blocks` is the wrong shape to
// be a ranking signal, that the board already has the right one, and that
// `blocks` is not idle — it is load-bearing somewhere else. Three measurements,
// all re-run below:
//
// 1. `blocks` IS A DOMAIN-TAG VOCABULARY, NOT A DEPENDENCY GRAPH. 471 authored
//    entries, 147 distinct tags, and only 46 of them (9.8%) name a real decision
//    in their own playbook. The top tags are 'food' (62), 'vendors' (28),
//    'beverage_purchases' (26), 'rentals' (24) — areas of work, not decisions.
//    `dependsOn` is the real edge set: 67 entries, 100% of them real decision
//    ids. The engine already says this out loud at index.js's horizon-anchor
//    comment — "the derived 'gates' signal … fires on any `blocks:['food']`
//    CATEGORY tag, not a real downstream-decision dependency".
//
// 2. A SIGNAL PRESENT ON 92% OF ROWS CANNOT DISCRIMINATE. On the 45 real boards
//    at 45 days out, 235 of 256 rows carry `blocks`. Give all of them the same
//    bump and the ranking barely moves: measured, +1 to every blocks-carrying
//    row reorders 8 rows out of 249, on 4 boards out of 45. Meanwhile the board
//    ALREADY reads the real graph — gateHolder / _dependedOnCount discriminate
//    50 rows of 256, and they do it from `dependsOn`, which is validated.
//
// 3. THE TWO SIGNALS DISAGREE, AND `blocks` IS THE ONE THAT IS WRONG. 179 active
//    rows carry `blocks` while nothing actually depends on them; exactly 1 row is
//    a real gate-holder without `blocks`. Wiring `blocks` into the score would
//    therefore mostly promote rows that gate nothing — it would ADD noise to a
//    ranking that already has the grounded answer.
//
// AND `blocks` IS NOT DEAD CODE. It feeds the board's ROUTE (a decision tagged
// vendors/team/hire/staff deep-links to the Vendors tab), isMenuDecision's
// classification, beverage detection, and playbookContract's cost-affecting
// filter. The last test here proves the route case behaviourally, so "blocks is
// unused" can never be concluded from this file.
//
// SO: NOTHING WAS CHANGED FOR THIS FINDING. No new weighting term was invented
// to make a number move. This test exists to stop the finding being "fixed"
// later by someone who reads only the first paragraph.
import { ALL_PLAYBOOKS, derivedImportanceOf, playbookDecisionBoard } from '../index';

const authored = () => ALL_PLAYBOOKS.flatMap((pb) => (pb.decisions || []).map((d) => ({ pb, d })));
const hasBlocks = (d) => Array.isArray(d.blocks) && d.blocks.length > 0;

describe('blocks: measured, and deliberately not a ranking signal', () => {
  test('the gate is real: every decision authoring blocks also authors weight', () => {
    const all = authored();
    const withBlocks = all.filter(({ d }) => hasBlocks(d));
    const noWeight = all.filter(({ d }) => d.weight == null);
    const blocksAndNoWeight = all.filter(({ d }) => hasBlocks(d) && d.weight == null);
    expect(all.length).toBeGreaterThanOrEqual(260);
    expect(withBlocks.length / all.length).toBeGreaterThan(0.9); // ~95%
    expect(noWeight).toEqual([]);          // 260/260 author weight
    expect(blocksAndNoWeight).toEqual([]); // ⇒ the blocks branch is unreachable
  });

  test('NEGATIVE CONTROL: derivedImportanceOf still reads blocks — the gate is the reason, not a missing read', () => {
    // If someone deletes the `blocks` read from derivedImportanceOf, this fails.
    // A gate that cannot be distinguished from an absent implementation proves nothing.
    const withB = derivedImportanceOf({ id: 'x', label: 'Food model', blocks: ['a'] }, []);
    const without = derivedImportanceOf({ id: 'x', label: 'Food model' }, []);
    expect(withB.reason).toBe('gates');
    expect(without.reason).toBe('neutral');
    expect(withB.score).toBeGreaterThan(without.score);
    // …and it is genuinely unreachable from a real playbook decision, because
    // every one of them authors weight (asserted above).
  });

  test('blocks is a DOMAIN-TAG vocabulary; dependsOn is the dependency graph', () => {
    let blockEntries = 0, blockEntriesNamingADecision = 0;
    let depEntries = 0, depEntriesNamingADecision = 0;
    const tags = new Set();
    for (const pb of ALL_PLAYBOOKS) {
      const ids = new Set((pb.decisions || []).map((d) => d.id));
      for (const d of (pb.decisions || [])) {
        for (const b of (Array.isArray(d.blocks) ? d.blocks : [])) {
          blockEntries += 1; tags.add(b);
          if (ids.has(b)) blockEntriesNamingADecision += 1;
        }
        for (const x of (Array.isArray(d.dependsOn) ? d.dependsOn : [])) {
          depEntries += 1;
          if (ids.has(x)) depEntriesNamingADecision += 1;
        }
      }
    }
    expect(blockEntries).toBeGreaterThan(400);
    // measured 9.8% — a domain vocabulary, not a set of decision references
    expect(blockEntriesNamingADecision / blockEntries).toBeLessThan(0.2);
    expect(tags.size).toBeGreaterThan(100);
    // dependsOn, by contrast, is 100% real ids. It is what the graph is made of.
    expect(depEntries).toBeGreaterThan(0);
    expect(depEntriesNamingADecision).toBe(depEntries);
  });

  test('a +1 blocks bump would move almost nothing — and would disagree with the real graph', () => {
    let rows = 0, moved = 0, boards = 0, boardsChanged = 0;
    let blocksRows = 0, blocksButGatesNothing = 0, gatesButNoBlocks = 0;
    const dt = new Date(); dt.setDate(dt.getDate() + 45);
    const iso = dt.toISOString().slice(0, 10);
    for (const pb of ALL_PLAYBOOKS) {
      let b;
      try { b = playbookDecisionBoard({ id: 'e', type: pb.type, date: iso, guests: [], guestEstimate: 60 }); }
      catch (_e) { continue; }
      const src = new Map((pb.decisions || []).map((d) => [d.id, d]));
      const hb = (r) => { const d = src.get(r.id); return !!(d && hasBlocks(d)); };
      const gates = (r) => !!r.gateHolder || Number(r._dependedOnCount) > 0;
      const active = [...(b.open || [])];
      for (const r of active) {
        if (hb(r)) { blocksRows += 1; if (!gates(r)) blocksButGatesNothing += 1; }
        else if (gates(r)) gatesButNoBlocks += 1;
      }
      const before = active.map((r) => r.id);
      const after = [...active].sort((x, y) => (
        ((y.priorityScore + (hb(y) ? 1 : 0)) - (x.priorityScore + (hb(x) ? 1 : 0)))
        || ((x.daysOut == null ? 9999 : x.daysOut) - (y.daysOut == null ? 9999 : y.daysOut))
      )).map((r) => r.id);
      boards += 1; rows += before.length;
      let m = 0;
      for (let i = 0; i < before.length; i += 1) if (before[i] !== after[i]) m += 1;
      moved += m;
      if (m > 0) boardsChanged += 1;
    }
    expect(boards).toBeGreaterThanOrEqual(40);
    expect(rows).toBeGreaterThan(200);
    // near-constant ⇒ near-zero information. Measured 8/249 rows, 4/45 boards.
    expect(moved / rows).toBeLessThan(0.1);
    expect(boardsChanged / boards).toBeLessThan(0.2);
    // and where it WOULD move things, it mostly promotes rows nothing depends on
    expect(blocksButGatesNothing).toBeGreaterThan(100);
    expect(gatesButNoBlocks).toBeLessThan(10);
  });

  test('blocks is NOT dead — it is what routes a decision to the Vendors tab', () => {
    // The board derives a row's deep link partly from its blocks tags
    // (/vendor|team|hire|staff/). This is behavioural: rows that reach the
    // Vendors tab through their TAGS alone, with nothing in their id or label
    // that could have matched. Delete the blocks read from the route and this
    // number goes to zero.
    const dt = new Date(); dt.setDate(dt.getDate() + 45);
    const iso = dt.toISOString().slice(0, 10);
    let routedByTagAlone = 0;
    for (const pb of ALL_PLAYBOOKS) {
      let b;
      try { b = playbookDecisionBoard({ id: 'e', type: pb.type, date: iso, guests: [], guestEstimate: 60 }); }
      catch (_e) { continue; }
      const src = new Map((pb.decisions || []).map((d) => [d.id, d]));
      for (const r of [...(b.open || []), ...(b.deferred || [])]) {
        const d = src.get(r.id);
        if (!d || !hasBlocks(d)) continue;
        if (!r.route || r.route.tab !== 'Vendors') continue;
        const ownWords = `${d.id || ''} ${d.label || ''}`;
        const tagWords = d.blocks.join(' ');
        if (!/vendor|team|hire|staff/i.test(ownWords) && /vendor|team|hire|staff/i.test(tagWords)) {
          routedByTagAlone += 1;
        }
      }
    }
    expect(routedByTagAlone).toBeGreaterThan(0);
  });
});
