// The vegetarian main is priced at what its sources say (owner ruling,
// 11/23/2026, #239 item 2).
//
// The engine priced the vegetarian main (`diet-veg`, built for every playbook
// when the host cooks for vegetarian guests) at its own $6-12 a serving, with
// no source. The registered prices contradict it:
//   costco-prepared-2026   Costco stuffed bell peppers, under $1 a serving
//   lasagna-retail-2026    Stouffer's vegetable lasagna family tray, $10.79
//                          (Lowes Foods) and $11.49 (Price Chopper) for the
//                          label's four servings: $2.70-2.87 a serving
// So the band is $1-2.87 a serving, cited, and the line is off the estimate
// list. Amy's organic tray ($16.49) is not in the band: the source gives no
// serving count for it, and a count of our own would make the band an estimate.
import { playbookFoodPlan } from '../playbooks';
import { UNSOURCED_PRICE_LINES } from '../priceBasis';
import { isGroundedCost } from '../knowledge/costProvenance';

const ev = (type, foodChoices) => ({
  id: 'veg', type, date: '2026-12-12', guestEstimate: 12, guestMode: 'count', guestCountSource: 'host',
  dietCounts: { Vegetarian: 3 }, foodChoices,
});
const veg = (e) => playbookFoodPlan(e).list.find((l) => l.id === 'diet-veg');

test('three vegetarians: $1-2.87 a serving, $3-9 in all', () => {
  const l = veg(ev('Dinner Party', {}));
  expect(l).toBeTruthy();
  expect([l.perUnitLow, l.perUnitHigh]).toEqual([1, 2.87]);
  expect([l.low, l.high]).toEqual([3, 9]);
});

test('the band cites the registered prices, and the line is off the estimate list', () => {
  const l = veg(ev('Birthday', { food_style: 'Host cooks' }));
  expect(l.costProvenance.sources).toEqual(['costco-prepared-2026', 'lasagna-retail-2026']);
  expect(isGroundedCost(l.costProvenance)).toBe(true);
  expect(l.priceBasis.kind).toBe('cited');
  expect(UNSOURCED_PRICE_LINES['*:diet-veg']).toBeUndefined();
});
