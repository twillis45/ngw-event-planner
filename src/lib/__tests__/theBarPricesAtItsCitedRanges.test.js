// ─── THE BAR PRICES AT ITS CITED RANGES (owner ruling, 11/21/2026) ───────────
//
// The drinks tier multiplied the bar lines by 1.6 when the pick read as "a full
// bar". The number had no source (7bc897d3 added it uncited; the line itself
// said "an engine estimate, not a cited price"). Owner: "Set to 1, fix
// misreads." So:
//   • a full bar prices every bar line at its own cited range. Holiday Party
//     already lists spirits and mixers as their own lines, so ×1.6 on beer and
//     wine as well counted the spirits twice;
//   • "Beer + wine + one signature cocktail only" is one added drink, and "None
//     — beer/wine/spirits only" is a plain bar. Neither is a full bar;
//   • "Full open bar" IS a full bar (it read as nothing, so a plain bar outpriced it).
import { beverageTierFor, playbookFoodPlan, getPlaybook } from '../playbooks';

const authored = (type, id) => getPlaybook(type).purchases.find((p) => p.id === id);
const plan = (type, n, picks) => playbookFoodPlan({
  id: 'bar', type, date: '2026-12-12', guestEstimate: n, guestMode: 'count', guestCountSource: 'host', foodChoices: picks || {},
});

test('no tier carries the uncited ×1.6: a full bar is the cited baseline', () => {
  const full = beverageTierFor('hosted full bar, bartender controls pour');
  expect(full).toEqual(expect.objectContaining({ name: 'a full bar', factor: 1 }));
  expect(beverageTierFor('full open bar')).toEqual(expect.objectContaining({ name: 'a full bar' }));
});

test('the two misreads', () => {
  expect(beverageTierFor('beer + wine + one signature cocktail only')).toEqual(expect.objectContaining({ name: 'one added drink' }));
  expect(beverageTierFor('none — beer/wine/spirits only')).toBeNull();
});

test('Holiday Party, full bar: every bar line at its cited range, nothing multiplied', () => {
  const fp = plan('Holiday Party', 30, { alcohol_service: 'Hosted full bar, bartender controls pour' });
  const bar = fp.list.filter((l) => l.cat === 'beverage' && !l.skipped);
  expect(bar.map((l) => l.id)).toEqual(expect.arrayContaining(['p_beer', 'p_wine', 'p_spirits', 'p_mixers']));
  for (const l of bar) {
    expect(l.costFactorApplied).toBeNull();
    expect([l.perUnitLow, l.perUnitHigh]).toEqual(authored('Holiday Party', l.id).unitCostRange);
  }
});

test('a full bar never prices below beer and wine plus one cocktail', () => {
  for (const [type, dec, full, oneMore] of [
    ['Engagement Party', 'bar', 'Full open bar', 'Beer + wine + signature cocktail'],
    ['Retirement Party', 'bar', 'Full open bar', 'Beer/wine + a signature cocktail'],
  ]) {
    const total = (pick) => plan(type, 40, { [dec]: pick }).list.filter((l) => l.cat === 'beverage' && !l.skipped)
      .reduce((s, l) => s + l.low, 0);
    expect(total(full)).toBeGreaterThanOrEqual(total(oneMore));
    expect(beverageTierFor(oneMore.toLowerCase())).toEqual(expect.objectContaining({ name: 'one added drink' }));
  }
});

// THE 1.25 MISFIRES THE SAME WAY ONCE A FULL BAR IS ×1 (11/21/2026): "one added
// drink" priced above a full bar (Holiday Party: "Beer + wine + one signature
// cocktail only" $528 against a hosted full bar's $446). Same class, an uncited
// factor, so it is ×1 too, and no added-drink pick outprices the full bar.
test('no pick prices above its own playbook\'s full bar', () => {
  for (const [type, dec, full, n] of [
    ['Dinner Party', 'alcohol', 'Host provides full bar', 10],
    ['Engagement Party', 'bar', 'Full open bar', 40],
    ['Holiday Party', 'alcohol_service', 'Hosted full bar, bartender controls pour', 30],
    ['Retirement Party', 'bar', 'Full open bar', 40],
  ]) {
    const total = (pick) => plan(type, n, { [dec]: pick }).list.filter((l) => l.cat === 'beverage' && !l.skipped)
      .reduce((s, l) => s + l.low, 0);
    const top = total(full);
    for (const o of getPlaybook(type).decisions.find((d) => d.id === dec).options) {
      expect([type, o, total(o) <= top]).toEqual([type, o, true]);
    }
    expect(beverageTierFor('wine + one cocktail').factor).toBe(1);
  }
});

