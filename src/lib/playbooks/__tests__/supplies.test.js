import { playbookFoodPlan } from '../index';

describe('playbookFoodPlan.supplies — essential non-food gets a checkable line', () => {
  test('Crab Feast surfaces the kraft-paper table cover as a supply, with a real qty', () => {
    const fp = playbookFoodPlan({ type: 'Crab Feast', guestCount: 12 });
    expect(Array.isArray(fp.supplies)).toBe(true);
    const paper = fp.supplies.find((s) => /kraft paper|newspaper/i.test(s.item));
    expect(paper).toBeTruthy();
    expect(paper.qty).not.toBeNull();
    expect(paper.where.length).toBeGreaterThan(0);
  });
  test('supplies live in the list as the Supplies group, OUT of the food $ total', () => {
    const fp = playbookFoodPlan({ type: 'Crab Feast', guestCount: 12 });
    // supplies are non-food and carry group 'Supplies'
    expect(fp.supplies.every((s) => s.cat !== 'food' && s.cat !== 'beverage' && s.group === 'Supplies')).toBe(true);
    // they ARE in the list now (so they get the full food-row functions)…
    const listIds = new Set(fp.list.map((i) => i.id));
    expect(fp.supplies.every((s) => listIds.has(s.id))).toBe(true);
    // …but the food $ total excludes the Supplies group (no inflation of "Food & drink")
    const foodOnly = fp.list.filter((i) => i.group !== 'Supplies' && !i.skipped).reduce((s, i) => s + (i.locked != null ? i.locked : i.low), 0);
    expect(fp.foodLow).toBe(Math.max(0, Math.round(foodOnly / 5) * 5));
  });
  test('supplies carry their own cost total + per-unit info (wired into budget)', () => {
    const fp = playbookFoodPlan({ type: 'Crab Feast', guestCount: 12 });
    expect(fp.suppliesHigh).toBeGreaterThan(0);
    expect(fp.suppliesCount).toBe(fp.supplies.length);
    for (const s of fp.supplies) {
      expect(typeof s.low).toBe('number');
      expect(typeof s.perUnitHigh).toBe('number');
      expect(s.unitBase !== undefined).toBe(true);
    }
  });
});
