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
// The playbook's named drinks call (A1, 11/21/2026), not the first decision
// whose `blocks` mention beverage.
const bevDecision = (pb) => (pb.decisions || []).find((d) => d.drinksCall === true);
const plan = (type, picks) => playbookFoodPlan({
  id: 'dry', type, date: '2026-12-12', guestEstimate: 30, guestMode: 'count', guestCountSource: 'host', foodChoices: picks || {},
});
// A drink a guest brings is $0 to the host and is not priced here (Watch Party's
// and Get-Together's defaults hand the drinks to the guests).
const drinks = (fp) => fp.list.filter((l) => l.cat === 'beverage' && !l.skipped && !l.friendBrings);
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
  // Six until the drinks call was named (A1) and the drinks factors became line
  // rules (A7), both 11/21/2026: the rest were read from the wrong decision, or
  // priced by a factor that bought the alcohol at 20-70%.
  expect(DRY.map(([type, , o]) => `${type}: ${o}`).sort()).toEqual([
    'Anniversary: Zero-proof / dry', 'Birthday: No alcohol', 'Client Dinner: No alcohol',
    'Crab Feast: Dry / family-friendly', 'Dinner Party: Zero-proof / dry', 'Fish Fry: Family-friendly / dry',
    'Fundraiser / Gala: Dry', 'Gender Reveal: Mocktails + soft drinks only', 'Get-Together: Dry / family-friendly',
    'Graduation: No alcohol', 'Halloween Party: Zero-proof only', 'Holiday Party: Zero-proof / dry',
    'Housewarming: Zero-proof / dry', 'Juneteenth Cookout: Family-friendly / dry', 'Low Country Boil: Family-friendly / dry',
    'Thanksgiving Hosting: No alcohol: sparkling cider and water', // owner, 11/26/2026
    'The Cookout: Red drink + soda + water (family-friendly)', 'Vow Renewal: Zero-proof / dry', 'Watch Party: Dry / family-friendly',
    'Wedding: Dry',
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
    const otherRows = drinks(plan(type, { [decId]: other }));
    // Batch 4 (owner, 11/24/2026): a combined bar line ("Beer, sweet tea, soda,
    // water") split into one line per drink, and the soft drinks are parts of
    // the bar line, so they leave with it. The dry pick must still buy each of
    // those drinks on a line of its own (Low Country Boil's p_tea_dry, …).
    const byId = new Map(otherRows.map((l) => [l.id, l]));
    const partOfBar = (l) => l.pricedWith && byId.has(l.pricedWith) && ALCOHOL.test(names(byId.get(l.pricedWith)));
    const kept = otherRows.filter((l) => !ALCOHOL.test(names(l)) && !/\b(mixers?|bar)\b/i.test(l.item) && !partOfBar(l));
    expect(rows.map((l) => l.id)).toEqual(expect.arrayContaining(kept.map((l) => l.id)));
    const drink = (l) => String(l.item).split('(')[0].trim().toLowerCase().split(/\s+/).pop();
    const softFromBar = otherRows.filter((l) => partOfBar(l) && !ALCOHOL.test(names(l)));
    expect(softFromBar.filter((l) => !rows.some((r) => r.item.toLowerCase().includes(drink(l)))).map((l) => l.item)).toEqual([]);
  });
});
