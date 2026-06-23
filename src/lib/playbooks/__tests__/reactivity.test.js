import { playbookFoodPlan } from '../index';

// "Make sure the plan adjusts as changes are made" — the food plan (and the budget
// totals derived from it) must re-derive from event state. playbookFoodPlan is a
// pure function of the event, so a changed choice/count/skip/qty yields a changed
// plan. The UI recomputes it inline on every render, so these deltas reach the
// Budget hero, the supplies line, and the spread.
describe('the plan re-derives as options / count / budget change', () => {
  const base = { type: 'Crab Feast', guestCount: 12 };

  test('guest count drives food AND supplies up', () => {
    const fp1 = playbookFoodPlan(base);
    const fp2 = playbookFoodPlan({ ...base, guestCount: 24 });
    expect(fp2.foodHigh).toBeGreaterThan(fp1.foodHigh);
    expect(fp2.suppliesHigh).toBeGreaterThanOrEqual(fp1.suppliesHigh); // per-guest supplies scale
  });

  test('skipping an item drops the food total (a choice change is reflected)', () => {
    const fp1 = playbookFoodPlan(base);
    const firstFood = fp1.list.find((i) => i.group !== 'Supplies' && !i.skipped && i.high > 0);
    const fp2 = playbookFoodPlan({ ...base, foodSkip: { [firstFood.id]: true } });
    expect(fp2.foodHigh).toBeLessThan(fp1.foodHigh);
  });

  test('a host quantity override moves that line and the total', () => {
    const fp1 = playbookFoodPlan(base);
    const f = fp1.list.find((i) => i.group !== 'Supplies' && !i.skipped && i.high > 0 && i.qty > 0);
    const fp2 = playbookFoodPlan({ ...base, foodQty: { [f.id]: f.qty * 4 } });
    expect(fp2.foodHigh).toBeGreaterThan(fp1.foodHigh);
  });

  test('locking a supply price fixes its cost (flows to the supplies budget line)', () => {
    const fp1 = playbookFoodPlan(base);
    const sup = fp1.supplies.find((s) => s.high > 0);
    const fp2 = playbookFoodPlan({ ...base, foodLocked: { [sup.id]: 5 } });
    const lockedSup = fp2.supplies.find((s) => s.id === sup.id);
    expect(lockedSup.locked).toBe(5);
    // the locked value collapses the supplies range at that line
    expect(fp2.suppliesHigh).toBeLessThanOrEqual(fp1.suppliesHigh);
  });
});
