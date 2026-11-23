// Friendsgiving orders in two ways (owner ruling, 11/23/2026, #239 item 1).
//
// "Ordered in — a restaurant or caterer cooks" was one answer priced at one
// uncited $18-40 a guest, because the engine took ONE per-guest band per
// playbook. A prepared dinner from a market or restaurant and a hired caterer
// are different purchases with different registered prices, so the answer is
// two answers, and the engine now prices the band of the option she picked
// (a vendor's `costRangeByPick`, a general mechanism, not a Friendsgiving rule).
//
//   prepared dinner  $10-25 a guest, thanksgiving-prepared-fox5-2026 +
//                    thanksgiving-prepared-grocerydive-2026. Ordered food, NOT
//                    a hired caterer: no caterer contract, deposit or pay step.
//   caterer          $15-35 a guest, catering-chefry-2026 +
//                    catering-perperson-2026. A hire: the caterer steps apply.
//
// A saved event holding the old answer reads as the caterer (its old words
// named a caterer, its old steps were the caterer's, and $15-35 is the nearer
// band to the old $18-40).
import {
  getPlaybook, playbookFoodPlan, foodApproach, catererHired, choicePickFor, playbookChecklist,
} from '../playbooks';
import { buildVendorPlan } from '../vendorPlan';
import { UNSOURCED_PRICE_LINES } from '../priceBasis';

const PREPARED = 'Order a prepared dinner (market or restaurant)';
const CATERER = 'Hire a caterer';
const OLD = 'Ordered in — a restaurant or caterer cooks, the group splits the bill';
const AS_OF = '2026-11-01';

const ev = (foodChoices = {}, extra = {}) => ({
  id: 'fg2', type: 'Friendsgiving', name: 'Friendsgiving', date: '2026-11-21', startTime: '18:00',
  guestCount: 10, guestMode: 'count', guestCountLocked: true, foodChoices, vendors: [], guests: [], budget: [], timeline: [],
  ...extra,
});
const cat = (e) => playbookFoodPlan(e).list.find((l) => l.id === 'fa-catering');
const tasks = (e) => playbookChecklist(e, AS_OF);
const taskIds = (e) => tasks(e).map((t) => t.id.replace(/^pbt-fg2-/, ''));

test('the one ordered answer is now two: a prepared dinner and a caterer', () => {
  const opts = getPlaybook('Friendsgiving').decisions.find((d) => d.id === 'hosting_model').options;
  expect(opts).toEqual(expect.arrayContaining([PREPARED, CATERER]));
  expect(opts).not.toContain(OLD);
});

describe('a prepared dinner is ordered food, priced at the prepared-dinner sources', () => {
  const e = ev({ hosting_model: PREPARED });
  test('her groceries drop and the food line is $10-25 a guest, cited', () => {
    expect(foodApproach(e).usesCaterer).toBe(true);
    const fp = playbookFoodPlan(e);
    expect(fp.list.map((l) => l.id)).not.toContain('p_turkey');
    const c = cat(e);
    expect([c.low, c.high]).toEqual([100, 250]);
    expect(c.costProvenance.sources).toEqual(['thanksgiving-prepared-fox5-2026', 'thanksgiving-prepared-grocerydive-2026']);
    expect(c.priceBasis.kind).toBe('cited');
  });
  test('no caterer is hired: no caterer step, and the caterer is not required', () => {
    expect(catererHired(e)).toBe(false);
    const ids = taskIds(e);
    expect(ids).toEqual(expect.arrayContaining(['t_order_prepared', 't_confirm_prepared', 't_shop_basics']));
    expect(ids).not.toContain('t_order');
    expect(ids).not.toContain('t_confirm_order');
    expect(tasks(e).filter((t) => /\bcaterer/i.test(t.task))).toEqual([]);
    const row = buildVendorPlan(e).categories.find((r) => /cater/i.test(r.category));
    expect(row.required).toBe(false);
    expect([row.estimateLow, row.estimateHigh]).toEqual([100, 250]);
  });
});

describe('a caterer is a hire, priced at the catering guides', () => {
  const e = ev({ hosting_model: CATERER });
  test('the food line is $15-35 a guest, cited to the catering guides', () => {
    const c = cat(e);
    expect([c.low, c.high]).toEqual([150, 350]);
    expect(c.costProvenance.sources).toEqual(['catering-chefry-2026', 'catering-perperson-2026']);
    expect(c.priceBasis.kind).toBe('cited');
  });
  test('the caterer is hired: its steps apply and the caterer is required', () => {
    expect(catererHired(e)).toBe(true);
    expect(taskIds(e)).toEqual(expect.arrayContaining(['t_order', 't_confirm_order', 't_shop_basics']));
    expect(taskIds(e)).not.toContain('t_order_prepared');
    const row = buildVendorPlan(e).categories.find((r) => /cater/i.test(r.category));
    expect(row.required).toBe(true);
    expect([row.estimateLow, row.estimateHigh]).toEqual([150, 350]);
  });
});

test('a saved event holding the old answer reads as the caterer', () => {
  const e = ev({ hosting_model: OLD });
  expect(choicePickFor(e, 'hosting_model')).toBe(CATERER);
  expect(foodApproach(e).pick).toBe(CATERER);
  expect(catererHired(e)).toBe(true);
  expect([cat(e).low, cat(e).high]).toEqual([150, 350]);
  expect(taskIds(e)).toEqual(expect.arrayContaining(['t_order', 't_confirm_order']));
});

test('both paths cited: the Friendsgiving caterer line is off the estimate list', () => {
  expect(UNSOURCED_PRICE_LINES['Friendsgiving:fa-catering']).toBeUndefined();
});
