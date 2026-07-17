// hostSpending(event, priceFactor) — THE single spending source for a host event.
// These tests pin the bug the user reported: the Budget hero showed "$0 of $1,200"
// even with a real food plan, because the food never flowed into spent/committed.
// hostSpending fixes that by reading the SAME playbookFoodPlan the food panel uses.

import { hostSpending } from '../hostSpending';
import { playbookFoodPlan } from '../playbooks';

const mid = (lo, hi) => {
  if (hi <= 0 && lo <= 0) return 0;
  if (hi <= 0) return lo;
  if (lo <= 0) return hi;
  return Math.round((lo + hi) / 2);
};

// A Dinner Party host with a real playbook → a real food spread.
const HOST = (over = {}) => ({
  id: 'e1',
  type: 'Dinner Party',
  date: '2026-08-01',
  guestCount: 12,
  guestMode: 'count',
  totalBudget: 1200,
  budget: [],
  ...over,
});

describe('no food budget without a real count (engine rule)', () => {
  test('no count → food terms are 0, even though the food plan sizes to a typical guess', () => {
    const noCount = { id: 'e2', type: 'Dinner Party', date: '2026-08-01', totalBudget: 1200, budget: [] };
    // The food plan still produces a typical-headcount preview…
    const plan = playbookFoodPlan(noCount, { priceFactor: 1 });
    expect(plan && (plan.foodLow > 0 || plan.foodHigh > 0)).toBe(true);
    // …but the BUDGET must not pick it up.
    const s = hostSpending(noCount, 1);
    expect(s.hasFood).toBe(false);
    expect(s.foodEstimate).toBe(0);
    expect(s.foodBought).toBe(0);
    expect(s.committed).toBe(0);
  });
  test('a real count (entered number) re-enables the food line', () => {
    const s = hostSpending(HOST({ guestCount: 12 }), 1);
    expect(s.hasFood).toBe(true);
    expect(s.committed).toBeGreaterThan(0);
  });
});

describe('total', () => {
  test('uses event.totalBudget when set (>0)', () => {
    expect(hostSpending(HOST({ totalBudget: 1200 })).total).toBe(1200);
  });
  test('falls back to the sum of budget rows budgeted when no total', () => {
    const ev = HOST({ totalBudget: 0, budget: [{ id: 'a', budgeted: 300, actual: 0 }, { id: 'b', budgeted: 200, actual: 0 }] });
    expect(hostSpending(ev).total).toBe(500);
  });
});

describe('food flows into the spending source (the bug)', () => {
  test('a host event with a food plan reports a NON-zero food estimate', () => {
    const sp = hostSpending(HOST());
    expect(sp.hasFood).toBe(true);
    const plan = playbookFoodPlan(HOST(), { priceFactor: 1 });
    expect(sp.foodEstimate).toBe(mid(plan.foodLow, plan.foodHigh));
    expect(sp.foodEstimate).toBeGreaterThan(0);
  });

  test('committed includes the planned (un-bought) food even before anything is bought', () => {
    const sp = hostSpending(HOST());
    // Nothing bought, no manual actuals → spent is 0 but committed reflects the plan.
    expect(sp.spent).toBe(0);
    // 2026-07-07 supplies wiring: committed now includes planned supplies +
    // seating/rentals too — the full plan, not just food.
    expect(sp.committed).toBe(sp.foodEstimate + sp.suppliesEstimate + sp.capacityEstimate);
    expect(sp.committed).toBeGreaterThan(0); // NOT $0 — the reported bug is gone
  });

  test('marking a food item GOT moves it from committed-only into spent', () => {
    const plan = playbookFoodPlan(HOST(), { priceFactor: 1 });
    const foodItem = plan.list.find((i) => i.group !== 'Supplies' && !i.skipped && (i.low > 0 || i.high > 0));
    expect(foodItem).toBeTruthy();
    const itemCost = foodItem.locked != null ? foodItem.locked : mid(foodItem.low, foodItem.high);

    const before = hostSpending(HOST());
    const after = hostSpending(HOST({ foodGot: { [foodItem.id]: true } }));

    expect(before.foodBought).toBe(0);
    expect(after.foodBought).toBe(itemCost);
    // Spent goes UP by the bought item; committed total is unchanged (it already
    // counted that food as planned — it just moved from "remaining" into "bought").
    expect(after.spent).toBe(before.spent + itemCost);
    expect(after.committed).toBe(before.committed);
  });

  test('a locked $ on a got item is used instead of the range midpoint', () => {
    const plan = playbookFoodPlan(HOST(), { priceFactor: 1 });
    const foodItem = plan.list.find((i) => i.group !== 'Supplies' && !i.skipped && (i.low > 0 || i.high > 0));
    const ev = HOST({ foodGot: { [foodItem.id]: true }, foodLocked: { [foodItem.id]: 99 } });
    expect(hostSpending(ev).foodBought).toBe(99);
  });

  test('spent = budget rows actual + food bought', () => {
    const plan = playbookFoodPlan(HOST(), { priceFactor: 1 });
    const foodItem = plan.list.find((i) => i.group !== 'Supplies' && !i.skipped && (i.low > 0 || i.high > 0));
    const itemCost = foodItem.locked != null ? foodItem.locked : mid(foodItem.low, foodItem.high);
    const ev = HOST({
      foodGot: { [foodItem.id]: true },
      budget: [{ id: 'decor', category: 'Decor', budgeted: 100, actual: 40 }],
    });
    expect(hostSpending(ev).spent).toBe(40 + itemCost);
  });
});

describe('no food plan → unchanged (manual-rows-only) behavior', () => {
  test('an event with no playbook has zero food terms and spent = rows actual', () => {
    const ev = {
      id: 'x', type: 'Some Unknown Type', date: '2026-08-01', totalBudget: 800,
      budget: [{ id: 'a', budgeted: 500, actual: 200 }, { id: 'b', budgeted: 300, actual: 100 }],
    };
    const sp = hostSpending(ev);
    expect(sp.hasFood).toBe(false);
    expect(sp.foodEstimate).toBe(0);
    expect(sp.foodBought).toBe(0);
    expect(sp.spent).toBe(300);      // 200 + 100, exactly the old rule
    expect(sp.committed).toBe(300);  // no planned food to add
    expect(sp.total).toBe(800);
  });
});

describe('CRAB-BUDGET-1: a real priced crab order is never counted twice', () => {
  const CRAB = (over = {}) => ({
    id: 'e-crab', type: 'Crab Feast', date: '2026-08-01', guestCount: 24, guestMode: 'count',
    totalBudget: 2000, budget: [], ...over,
  });

  test('no crabPlan yet: foodEstimate carries the independent market guess, crabEstimate is 0', () => {
    const sp = hostSpending(CRAB());
    expect(sp.crabEstimate).toBe(0);
    expect(sp.foodEstimate).toBeGreaterThan(0);
  });

  test('a real priced order: the spread\'s own crab line stops contributing dollars, crabEstimate carries the real total', () => {
    const noCrab = hostSpending(CRAB());
    const withCrab = hostSpending(CRAB({
      crabPlan: { lines: [{ id: 'a', size: 'large', unit: 'bushel', quantity: 2, pricePerUnit: 345 }] },
    }));
    expect(withCrab.crabEstimate).toBe(690); // 2 × 345, host-entered — real money
    // The old bug: foodEstimate ALSO included an independent crab guess on top
    // of crabEstimate. Fixed: foodEstimate drops by (at least) as much as the
    // crab line no longer contributes — total committed money reflects the
    // real order once, not the real order PLUS a phantom market guess.
    expect(withCrab.foodEstimate).toBeLessThan(noCrab.foodEstimate);
    expect(withCrab.committed).toBe(noCrab.committed - noCrab.foodEstimate + withCrab.foodEstimate + withCrab.crabEstimate);
  });

  test('checking off the delegated crab line in the generic list does not ALSO add to foodBought', () => {
    const plan = playbookFoodPlan(CRAB({
      crabPlan: { lines: [{ id: 'a', size: 'large', unit: 'bushel', quantity: 2, pricePerUnit: 345 }] },
    }), { priceFactor: 1 });
    const crabLine = plan.list.find((i) => i.id === 'p_crabs');
    expect(crabLine.crabDelegated).toBe(true);
    expect(crabLine.excludeFromFoodTotal).toBe(true);
    const sp = hostSpending(CRAB({
      crabPlan: { lines: [{ id: 'a', size: 'large', unit: 'bushel', quantity: 2, pricePerUnit: 345, bought: true }] },
      foodGot: { p_crabs: true }, // host also (redundantly) checks it off in the generic list
    }));
    // crabBought (from the crab order's own bought line) carries the real $690;
    // foodBought must NOT add a second $690 on top just because foodGot was set.
    expect(sp.crabBought).toBe(690);
    expect(sp.spent).toBeLessThan(690 * 2);
  });

  test('an explicit host lock on the crab line wins over delegation (rare, but a deliberate override)', () => {
    const plan = playbookFoodPlan(CRAB({
      crabPlan: { lines: [{ id: 'a', size: 'large', unit: 'bushel', quantity: 2, pricePerUnit: 345 }] },
      foodLocked: { p_crabs: 250 },
    }), { priceFactor: 1 });
    const crabLine = plan.list.find((i) => i.id === 'p_crabs');
    expect(crabLine.crabDelegated).toBeFalsy();
    expect(crabLine.locked).toBe(250);
  });

  test('an unpriced order (quantity only, no price yet) still uses the market-estimate fallback', () => {
    const plan = playbookFoodPlan(CRAB({
      crabPlan: { lines: [{ id: 'a', size: 'large', unit: 'bushel', quantity: 2 }] }, // no pricePerUnit
    }), { priceFactor: 1 });
    const crabLine = plan.list.find((i) => i.id === 'p_crabs');
    expect(crabLine.crabDelegated).toBeFalsy();
  });
});

describe('honest bounds', () => {
  test('committed never dips below spent', () => {
    const sp = hostSpending(HOST());
    expect(sp.committed).toBeGreaterThanOrEqual(sp.spent);
  });
  test('null / empty event does not throw', () => {
    expect(() => hostSpending(null)).not.toThrow();
    const sp = hostSpending(null);
    expect(sp.spent).toBe(0);
    expect(sp.total).toBe(0);
  });
});

// `uncommitted` — the headroom, derived in the engine so no reader composes it.
// Pins the live B3 failure: the orchestrator read `committed` and `foodEstimate`
// side by side, couldn't see that food is INSIDE committed, and computed
// 2200 - 1100 - 853 = "$247 of headroom" when the truth was $1,100 — understating
// a host's room by the whole food estimate. Every input was real; the relationship
// was invented. These lock the relationship itself.
describe('uncommitted — headroom is derived once, in the engine', () => {
  test('uncommitted = total - committed (NOT total - committed - foodEstimate)', () => {
    const s = hostSpending(HOST());
    expect(s.uncommitted).toBe(s.total - s.committed);
    // The double-count the model actually made must not equal the honest answer,
    // or this test would pass for the wrong reason.
    expect(s.foodEstimate).toBeGreaterThan(0);
    expect(s.uncommitted).not.toBe(s.total - s.committed - s.foodEstimate);
  });

  test('committed CONTAINS the component estimates — they are not additions to it', () => {
    const s = hostSpending(HOST());
    // Every component sits inside committed, so none may be subtracted again.
    const components = s.foodEstimate + s.suppliesEstimate + s.capacityEstimate + s.crabEstimate + s.vendorOwed;
    expect(s.committed).toBeLessThanOrEqual(Math.max(s.spent, components) + s.spent);
    expect(s.committed).toBeGreaterThanOrEqual(s.foodEstimate);
  });

  test('no budget set → uncommitted is null, never 0 ("no budget" ≠ "no room left")', () => {
    const s = hostSpending({ id: 'e3', type: 'Dinner Party', date: '2026-08-01', guestCount: 12, guestMode: 'count', budget: [] });
    expect(s.total).toBe(0);
    expect(s.uncommitted).toBeNull();
  });

  test('committed past the budget → uncommitted goes negative; the overage is the truth', () => {
    const s = hostSpending(HOST({ totalBudget: 50 }));
    expect(s.committed).toBeGreaterThan(50);
    expect(s.uncommitted).toBe(50 - s.committed);
    expect(s.uncommitted).toBeLessThan(0);
  });
});
