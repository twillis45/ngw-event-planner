import { playbookFoodPlan } from '../index';

// event.foodAdd — the host's own named line ("Aunt Carol's potato salad — she's
// bringing it", "extra ice — $15"), the custom-item feature added to V2 (legacy
// already had it: App.js ~10538-10570, ~11415-11457). This closes the remove/add
// asymmetry: a host could swap a playbook item out, but never add their own.
// Cost is OPTIONAL and honest — a $0/blank line is a real state (a potluck dish
// someone else brings costs the host nothing), never a fabricated number.
describe('event.foodAdd — a host-authored line the engine merges into the spread', () => {
  const base = { id: 'cf', type: 'Crab Feast', guestCount: 20, date: '2026-08-01' };

  test('a named line appears in the plan list, carrying its name/owner/cost', () => {
    const plan = playbookFoodPlan({
      ...base,
      foodAdd: [{ id: 'add-1', name: "Aunt Carol's potato salad", owner: 'Aunt Carol', cost: 0, group: 'Food', cat: 'produce' }],
    });
    const line = plan.list.find((i) => i.id === 'add-1');
    expect(line).toBeTruthy();
    expect(line.added).toBe(true);
    expect(line.item).toBe("Aunt Carol's potato salad");
    expect(line.owner).toBe('Aunt Carol');
    expect(line.group).toBe('Food');
    expect(line.low).toBe(0);
    expect(line.high).toBe(0);
  });

  test('a priced custom item ("extra ice — $15") carries that cost as a single committed number', () => {
    const plan = playbookFoodPlan({
      ...base,
      foodAdd: [{ id: 'add-ice', name: 'Extra ice', owner: '', cost: 15, group: 'Supplies', cat: 'supplies' }],
    });
    const line = plan.list.find((i) => i.id === 'add-ice');
    expect(line).toBeTruthy();
    expect(line.low).toBe(15);
    expect(line.high).toBe(15); // a host-entered cost is a point value, not a range
    expect(line.group).toBe('Supplies');
  });

  test('a custom item can be marked bought (event.foodGot) without a locked price', () => {
    // Unlike playbook estimate rows, an added item's cost was already committed
    // at add time — the row itself carries the real $, so the cost-truth gate
    // that blocks checking off an unpriced estimate does not apply here.
    const plan = playbookFoodPlan({
      ...base,
      foodAdd: [{ id: 'add-2', name: 'Store-bought cake', owner: '', cost: 40, group: 'Food', cat: 'other' }],
      foodGot: { 'add-2': true },
    });
    const line = plan.list.find((i) => i.id === 'add-2');
    expect(line.locked).toBeNull();
    // boughtCount/spent totals read event.foodGot directly — confirm the added
    // line is counted as bought like any other line once foodGot flags it.
    expect(plan.boughtCount).toBeGreaterThanOrEqual(1);
  });

  test('a custom item contributes to the real food total', () => {
    const withoutAdd = playbookFoodPlan(base);
    const withAdd = playbookFoodPlan({
      ...base,
      foodAdd: [{ id: 'add-3', name: 'Store-bought cake', owner: '', cost: 35, group: 'Food', cat: 'other' }],
    });
    expect(withAdd.foodLow).toBeGreaterThanOrEqual(withoutAdd.foodLow + 35);
    expect(withAdd.foodHigh).toBeGreaterThanOrEqual(withoutAdd.foodHigh + 35);
    expect(withAdd.itemCount).toBe(withoutAdd.itemCount + 1);
  });

  test('a custom item placed in Supplies does not inflate the food total, but does count in supplies', () => {
    const withoutAdd = playbookFoodPlan(base);
    const withAdd = playbookFoodPlan({
      ...base,
      foodAdd: [{ id: 'add-4', name: 'Extra ice', owner: '', cost: 15, group: 'Supplies', cat: 'supplies' }],
    });
    expect(withAdd.foodLow).toBe(withoutAdd.foodLow);
    expect(withAdd.foodHigh).toBe(withoutAdd.foodHigh);
    expect(withAdd.suppliesHigh).toBeGreaterThanOrEqual(withoutAdd.suppliesHigh + 15);
  });

  test('a skipped custom item is excluded from totals and item count (same !it.skipped rule as every other line)', () => {
    const plan = playbookFoodPlan({
      ...base,
      foodAdd: [{ id: 'add-5', name: 'Store-bought cake', owner: '', cost: 35, group: 'Food', cat: 'other' }],
      foodSkip: { 'add-5': true },
    });
    const baseline = playbookFoodPlan(base);
    const line = plan.list.find((i) => i.id === 'add-5');
    expect(line.skipped).toBe(true);
    expect(plan.foodLow).toBe(baseline.foodLow); // the $35 never entered the total
    expect(plan.itemCount).toBe(baseline.itemCount); // and it isn't counted as an active item
  });

  test('a custom item without a name is dropped (name is the one required field)', () => {
    const plan = playbookFoodPlan({
      ...base,
      foodAdd: [{ id: 'add-6', name: '', owner: 'Someone', cost: 10 }],
    });
    expect(plan.list.find((i) => i.id === 'add-6')).toBeUndefined();
  });
});
