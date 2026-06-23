import { playbookFoodPlan, playbookTasks } from '../index';

// "If a supply is no longer needed, does it leave the plan?" — marking a supply as
// not-needed (the skip "×", which sets event.foodSkip[id]) must (1) drop it from the
// supplies budget total and (2) suppress its operational "Buy X" plan step.
describe('a supply marked not-needed leaves both the budget and the plan step', () => {
  const asOf = '2026-07-01';
  const base = { id: 'cf', type: 'Crab Feast', guestCount: 12, date: '2026-07-04' }; // ~3 days out

  test('skip drops the supplies budget total (and the supply line goes struck-through, reversible)', () => {
    const fp1 = playbookFoodPlan(base);
    const sup = fp1.supplies.find((s) => s.high > 0 && s.buyAt);
    expect(sup).toBeTruthy();
    const fp2 = playbookFoodPlan({ ...base, foodSkip: { [sup.id]: true } });
    expect(fp2.suppliesHigh).toBeLessThan(fp1.suppliesHigh);       // left the budget
    const stillListed = fp2.supplies.find((s) => s.id === sup.id);
    expect(stillListed && stillListed.skipped).toBe(true);          // row stays, marked skipped (reversible)
  });

  test('skip removes the supply from the operational plan steps ("Buy X" disappears)', () => {
    const fp1 = playbookFoodPlan(base);
    const sup = fp1.supplies.find((s) => s.high > 0 && s.buyAt);
    const inTasks = (tasks) => tasks.some((t) => (t.id || '').includes(sup.id) || t.item === sup.short);
    // (whether it currently shows depends on the buy window; the contract is: once
    // skipped it is never a plan step)
    const tasksAfterSkip = playbookTasks({ ...base, foodSkip: { [sup.id]: true } }, asOf);
    expect(inTasks(tasksAfterSkip)).toBe(false);
  });
});
