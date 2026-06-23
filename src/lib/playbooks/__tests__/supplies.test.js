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
  test('supplies are kept OUT of the food $ total (food math unchanged)', () => {
    const fp = playbookFoodPlan({ type: 'Crab Feast', guestCount: 12 });
    // every supply is a non-food category
    expect(fp.supplies.every((s) => s.cat !== 'food' && s.cat !== 'beverage')).toBe(true);
    // none of the supply ids appear in the food list (no double-count)
    const listIds = new Set(fp.list.map((i) => i.id));
    expect(fp.supplies.every((s) => !listIds.has(s.id))).toBe(true);
  });
});
