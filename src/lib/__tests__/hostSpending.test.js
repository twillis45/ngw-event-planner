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
    expect(sp.committed).toBe(sp.foodEstimate);
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
