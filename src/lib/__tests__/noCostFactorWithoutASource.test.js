// ─── NO COST FACTOR WITHOUT A SOURCE OR A LINE RULE (owner ruling, 11/21/2026) ─
//
// "Apply all but leave crab." A cost factor multiplies a sourced price by a
// number, and 36 of 52 such numbers had no source. The research pass
// (factor-research.md) found 45 of them were really line rules: guests bring a
// dish, a line is not bought, a line is added, a line is priced instead. Those
// are line rules now (`costViaLines`), 22 that multiplied $0 on the caterer
// path are gone, and the 12 potluck legs that cited the catering survey cite
// nothing and price as guests-bring lines. Crab Feast's factors stay, as the
// owner ruled. A pick that does change the cost but has no source yet says so
// (`costPending`), and that list is the owner's, below.
import { ALL_PLAYBOOKS, getPlaybook, playbookFoodPlan } from '../playbooks';
import { isGroundedCost } from '../knowledge/costProvenance';

const factored = () => ALL_PLAYBOOKS.flatMap((pb) => (pb.decisions || [])
  .filter((d) => d.costFactors && Object.keys(d.costFactors).length)
  .map((d) => [pb.type, d]));

test('every factor left is Crab Feast\'s, or is grounded to a registered source', () => {
  const left = factored().map(([type, d]) => `${type} · ${d.id}`).sort();
  expect(left).toEqual([
    'Crab Feast · crab_size', 'Crab Feast · sides', 'Crab Feast · steam_vs_order', 'Crab Feast · where_buy',
    "New Year's Eve Party · toast_pour",
  ]);
  for (const [type, d] of factored()) {
    if (type === 'Crab Feast') continue;
    expect([type, d.id, isGroundedCost(d.costFactorProvenance)]).toEqual([type, d.id, true]);
  }
});

test('the crab factors are exactly as they were (left alone by ruling)', () => {
  const crab = Object.fromEntries((getPlaybook('Crab Feast').decisions || []).filter((d) => d.costFactors).map((d) => [d.id, d.costFactors]));
  expect(crab).toEqual({
    steam_vs_order: { 'Steam them myself': 0.85, 'Buy live, steam in batches': 0.85 },
    crab_size: { 'Mediums ($32–75/dz)': 0.55, 'Large Females ($52–75/dz)': 0.75, 'Extra Large Males ($109–150/dz)': 1.55, 'Jumbo Males ($149–188/dz)': 2 },
    where_buy: { 'Jessie Taylor Seafood — Maine Ave Fish Market (DC Wharf)': 1, 'Seafood market': 1.05, 'Waterman / dock direct': 0.85 },
    sides: { 'Corn + slaw only (keep it crab-forward)': 0.6, 'Full spread (add hush puppies, mac salad, watermelon)': 1.4 },
  });
  // The one crab-feast exception is its drinks call: "Dry" was ×0.2 on the beer.
  expect((getPlaybook('Crab Feast').decisions || []).find((d) => d.id === 'drinks').costFactors).toBeUndefined();
});

test('no potluck leg cites the catering survey any more', () => {
  for (const pb of ALL_PLAYBOOKS) {
    for (const d of pb.decisions || []) {
      const cites = d.costFactorProvenance && (d.costFactorProvenance.sources || []).includes('catering-perperson-2026');
      expect([pb.type, d.id, !!cites]).toEqual([pb.type, d.id, false]);
    }
  }
});

test('a line-rule decision has a line gated on it, and every gate names a real option', () => {
  for (const pb of ALL_PLAYBOOKS) {
    const opts = Object.fromEntries((pb.decisions || []).map((d) => [d.id, new Set(d.options || [])]));
    const gates = [];
    const walk = (g) => { if (!g) return; if (Array.isArray(g)) g.forEach(walk); else if (Array.isArray(g.any)) g.any.forEach(walk); else gates.push(g); };
    for (const p of pb.purchases || []) { walk(p.whenChoice); walk(p.friendsBringWhen); }
    for (const g of gates) {
      if (!opts[g.id]) continue;   // injected decisions (cook_method, dest_*) are checked elsewhere
      for (const o of [...(g.in || []), ...(g.not || [])]) expect([pb.type, g.id, o, opts[g.id].has(o)]).toEqual([pb.type, g.id, o, true]);
    }
    for (const d of (pb.decisions || []).filter((x) => x.costViaLines)) {
      expect([pb.type, d.id, gates.some((g) => g.id === d.id)]).toEqual([pb.type, d.id, true]);
    }
  }
});

test('the picks that change the cost with no source yet, each saying why (owner calls)', () => {
  const pending = ALL_PLAYBOOKS.flatMap((pb) => (pb.decisions || []).filter((d) => d.costPending).map((d) => `${pb.type} · ${d.id}`)).sort();
  expect(pending).toEqual([
    'Crawfish Boil · heat', 'Crawfish Boil · sides', 'Day Party · food',
    // Batch 11 (#233 Left): one catered course has no source and names no course.
    'Dinner Party · help',
    'Ethiopian Coffee Ceremony · injera_source',
    'Fish Fry · fish', 'PTA / Booster Fundraiser · concessions', 'Pupusa Gathering · curtido_ahead', 'Pupusa Gathering · make_vs_order',
    'Retirement Party · bar',
  ]);
});

test('Kwanzaa "several nights" is priced as the Karamu feast (owner: unsourced, 1.0)', () => {
  const t = (occasion) => playbookFoodPlan({ id: 'k', type: 'Kwanzaa Gathering', date: '2026-12-26', guestEstimate: 30, guestMode: 'count', guestCountSource: 'host', foodChoices: occasion ? { occasion } : {} });
  const several = t('Several nights through the week, building to Karamu');
  expect([several.foodLow, several.foodHigh]).toEqual([t().foodLow, t().foodHigh]);
  expect(several.list.every((l) => l.costFactorApplied == null)).toBe(true);
});
