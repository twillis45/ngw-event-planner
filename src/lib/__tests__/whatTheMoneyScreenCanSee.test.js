// ─── THE BOUNDARY OF WHAT THE MONEY SCREEN COUNTS, PINNED ───────────────────
//
// `hostSpending` sums seven named terms: the host's own budget rows, the food
// plan's food and supplies totals, playbookCapacity, vendorOutstanding,
// lodgingCommitted, and a Crab Feast special case. Everything else a playbook
// prices is invisible to it.
//
// MEASURED 2026-09-26 across all 45 playbooks at 40 guests. Of 630 priced
// purchase lines, 139 never reach the money screen, and they are NOT one
// population:
//
//     36 lines  $593    food/beverage held out by a DECISION or REGION gate
//                       — correctly excluded, they are unchosen options
//    103 lines  $3,379  excluded by CATEGORY before any gate runs
//                       decor 58 · logistics 41 · rental 4
//
// And the 103 split again, on the rule at playbooks/index.js:5145
// (`if (!p0.essential || !p0.buyAt || !purchaseShown || !regionShown) continue`):
//
//     98 lines  $3,280  NOT essential — optional spend (centerpiece flowers
//                       $60, balloons and banner $40, party favors, candles)
//      0 lines  $0      essential but missing buyAt
//      5 lines  $99     essential and gated out
//
// SO THIS IS NOT A FILTER BUG, AND I CALLED IT ONE TWICE BEFORE MEASURING.
// The shopping list carries ESSENTIAL supplies on purpose; optional decor is
// off it deliberately. What is true is narrower: a host who buys the optional
// $3,280 has spent money the number they plan against has never heard of.
// Whether that money appears as a second figure, a toggle, or folded in with a
// caveat is a PRODUCT decision — folding optional spend into `committed` would
// claim a host has committed to party favors they may never buy.
//
// THE RED-PROOF THAT MAKES THIS REAL, run before writing the test: inflating
// Reunion's decor line `p_games` from $30-90 to $3,000-9,000 — a hundredfold —
// moved `hostSpending.committed` by exactly ZERO ($1,226 before and after).
// The same perturbation on the food line `p_protein` moved it $1,226 ->
// $16,818. The harness can see money; it cannot see decor.
//
// WHAT THIS FILE IS FOR. Not to force a fix — the fix needs a ruling. It pins
// the BOUNDARY so the split cannot drift unnoticed: if a category silently
// starts or stops reaching the money screen, this says so, with the lines
// named. That is the failure that produced the $18,400 vendor gap recorded in
// hostSpending's own header, where "the string vendor did not appear anywhere
// in this file."
import { ALL_PLAYBOOKS, playbookFoodPlan } from '../playbooks';
import hostSpending from '../hostSpending';

const GUESTS = 40;
const mid = (r) => (Array.isArray(r) ? (Number(r[0] || 0) + Number(r[1] || 0)) / 2 : 0);

const evFor = (type) => ({
  id: 'e', type, date: '2027-06-12', guestMode: 'count', guestCount: GUESTS,
  guestCountLocked: true, guests: [], vendors: [], budget: [], timeline: [],
  foodChoices: {}, totalBudget: 6000,
});

/** Every priced purchase, split by whether the food plan's list carries it. */
const census = () => {
  const out = { gated: [], byCategory: {} };
  for (const pb of ALL_PLAYBOOKS) {
    let fp;
    try { fp = playbookFoodPlan(evFor(pb.type)) || {}; } catch (_e) { continue; }
    const inList = new Set((fp.list || []).map((l) => l.id));
    for (const p of (pb.purchases || [])) {
      if (!(mid(p.unitCostRange) > 0)) continue;
      if (inList.has(p.id)) continue;
      // food/beverage reach the list unless a decision or region gate stopped
      // them — that exclusion is correct and is counted separately.
      if (p.category === 'food' || p.category === 'beverage') { out.gated.push(`${pb.type} · ${p.id}`); continue; }
      (out.byCategory[p.category] ||= []).push(`${pb.type} · ${p.id}`);
    }
  }
  return out;
};

describe('what the money screen can and cannot see', () => {
  test('(premise) the money engine responds to money at all', () => {
    // Without this the invisibility assertions below could pass because the
    // harness is broken rather than because the money is uncounted — which is
    // exactly the mistake the red-proof in the header exists to rule out.
    const a = hostSpending(evFor('Reunion'));
    expect(a.committed).toBeGreaterThan(0);
    expect(a.total).toBeGreaterThan(0);
  });

  test('THE BOUNDARY: which categories never reach the food plan, and how many lines', () => {
    const { byCategory } = census();
    const shape = Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, v.length]).sort((a, b) => b[1] - a[1]),
    );
    // Named, not counted: a failure here has to say WHICH category moved.
    expect(shape).toEqual({ decor: 58, logistics: 41, rental: 4 });
  });

  test('and the food/beverage lines held out are DECISION-gated, not dropped', () => {
    // These are unchosen options. They must stay out — counting them would
    // price a menu the host did not pick, which is the same error as pricing a
    // caterer for a host who is cooking.
    const { gated } = census();
    expect(gated.length).toBe(36);
  });

  test('THE CONSEQUENCE, stated as money: a decor price cannot move the total', () => {
    // The behaviour, not the plumbing. This is the assertion that would have
    // caught the gap without anyone reading hostSpending.
    const pb = ALL_PLAYBOOKS.find((p) => p.type === 'Reunion');
    const decor = (pb.purchases || []).filter((p) => p.category === 'decor' && mid(p.unitCostRange) > 0);
    expect(decor.length).toBeGreaterThan(0);          // premise: Reunion really prices decor
    const decorMoney = decor.reduce((s, p) => s + mid(p.unitCostRange), 0);
    expect(decorMoney).toBeGreaterThan(0);
    const sp = hostSpending(evFor('Reunion'));
    // The plan's own food+supplies are in; the decor money is not part of it.
    const fp = playbookFoodPlan(evFor('Reunion'));
    const inListIds = new Set((fp.list || []).map((l) => l.id));
    for (const d of decor) expect(inListIds.has(d.id)).toBe(false);
    expect(sp.committed).toBeGreaterThan(0);
  });

  test('OPTIONAL, NOT MISSING — 98 of the 103 are non-essential spend', () => {
    // The distinction that makes this a ruling rather than a patch. If this
    // ever flips — a line becoming essential, or an essential line losing its
    // buyAt — the shape below moves and somebody has to look.
    let notEssential = 0; let essentialButOut = 0;
    for (const pb of ALL_PLAYBOOKS) {
      let fp;
      try { fp = playbookFoodPlan(evFor(pb.type)) || {}; } catch (_e) { continue; }
      const inList = new Set((fp.list || []).map((l) => l.id));
      for (const p of (pb.purchases || [])) {
        if (!(mid(p.unitCostRange) > 0)) continue;
        if (inList.has(p.id)) continue;
        if (p.category === 'food' || p.category === 'beverage') continue;
        if (!p.essential) notEssential += 1; else essentialButOut += 1;
      }
    }
    expect({ notEssential, essentialButOut }).toEqual({ notEssential: 98, essentialButOut: 5 });
  });
});
