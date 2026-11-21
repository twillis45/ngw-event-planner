// ─── A DRY PARTY BUYS NO BAR (owner approval, 11/21/2026: "Do those 4") ──────
//
// A "Zero-proof / dry" drinks pick still bought the beer, wine and spirits
// lines, priced at ×0.6 of their cited bands. The ×0.6 had no source, and a
// host who picked no alcohol was still told to buy alcohol. A dry pick now
// drops the bar lines the way a BYOB pick drops the drinks (the same
// `hostBuysIt` rule), and every line left is priced at its own cited band with
// no factor on it. Ice, water, coffee, soda and the zero-proof lines stay.
import { ALL_PLAYBOOKS, beverageTierFor, playbookFoodPlan, getPlaybook } from '../playbooks';

const ALCOHOL = /\b(beer|wine|spirits?|liquor|whiskey|bourbon|vodka|rum|tequila|gin|champagne|prosecco|cocktails?|alcohol)\b/i;
const bevDecision = (pb) => (pb.decisions || []).find((d) => Array.isArray(d.blocks) && d.blocks.some((b) => /beverage/.test(String(b))));
const plan = (type, picks) => playbookFoodPlan({
  id: 'dry', type, date: '2026-12-12', guestEstimate: 30, guestMode: 'count', guestCountSource: 'host', foodChoices: picks || {},
});
const drinks = (fp) => fp.list.filter((l) => l.cat === 'beverage' && !l.skipped);
const names = (l) => `${l.item} ${String(l.id).replace(/^p_/, '').replace(/_/g, ' ')}`;

// Every playbook whose drinks call is priced by the word-tier (no authored
// costFactors) and offers a pick that reads as a dry party.
const DRY = [];
for (const pb of ALL_PLAYBOOKS) {
  const d = bevDecision(pb);
  if (!d || d.costFactors) continue;
  for (const o of d.options || []) {
    const t = beverageTierFor(String(o).toLowerCase());
    if (t && t.name === 'a dry party') DRY.push([pb.type, d.id, o]);
  }
}

test('the dry picks are the ones measured on 11/21/2026', () => {
  expect(DRY.map(([type, , o]) => `${type}: ${o}`).sort()).toEqual([
    'Birthday: No alcohol', 'Client Dinner: No alcohol', 'Dinner Party: Zero-proof / dry',
    'Graduation: No alcohol', 'Holiday Party: Zero-proof / dry', 'Watch Party: Dry / family-friendly',
  ]);
});

test('no drinks tier carries a factor below the cited band', () => {
  expect(beverageTierFor('zero-proof / dry')).toEqual(expect.objectContaining({ name: 'a dry party' }));
  expect(beverageTierFor('zero-proof / dry').factor).toBeUndefined();
});

describe.each(DRY)('%s, %s: "%s"', (type, decId, pick) => {
  const fp = plan(type, { [decId]: pick });
  const rows = drinks(fp);

  test('no beer, wine or spirits line is bought', () => {
    expect(rows.filter((l) => ALCOHOL.test(names(l))).map((l) => l.id)).toEqual([]);
  });

  test('no line carries a factor, and each is priced at its own cited band', () => {
    for (const l of rows) {
      expect([l.id, l.costFactorApplied]).toEqual([l.id, null]);
      expect([l.id, l.perUnitLow, l.perUnitHigh]).toEqual([l.id, ...getPlaybook(type).purchases.find((p) => p.id === l.id).unitCostRange]);
    }
  });

  // Each line is quantity × its authored band, rounded to the dollar, so the
  // drinks total is the sum of the cited lines that remain and nothing else.
  test('the drinks total is the sum of the cited lines that remain', () => {
    const band = (l) => getPlaybook(type).purchases.find((p) => p.id === l.id).unitCostRange;
    const sum = (k) => rows.reduce((s, l) => s + l[k], 0);
    const cited = (k) => rows.reduce((s, l) => s + Math.round(l.qty * band(l)[k === 'low' ? 0 : 1]), 0);
    expect(sum('low')).toBe(cited('low'));
    expect(sum('high')).toBe(cited('high'));
  });

  test('the alcohol-free lines stay: everything a non-dry pick buys except the bar', () => {
    const other = getPlaybook(type).decisions.find((d) => d.id === decId).options
      .find((o) => o !== pick && !/byob|bring/i.test(o));
    const kept = drinks(plan(type, { [decId]: other })).filter((l) => !ALCOHOL.test(names(l)) && !/\b(mixers?|bar)\b/i.test(l.item));
    expect(rows.map((l) => l.id)).toEqual(expect.arrayContaining(kept.map((l) => l.id)));
  });
});
