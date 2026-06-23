import { itemDietaryFlags, playbookFoodPlan } from '../index';

describe('itemDietaryFlags — honest "double-check" heads-up, not a hard claim', () => {
  test('flags items whose name relates to a noted restriction', () => {
    expect(itemDietaryFlags('Pecan pie', ['Nut allergy'])).toEqual(['nuts']);
    expect(itemDietaryFlags('BBQ chicken (bone-in pieces)', ['Vegetarian'])).toEqual(['not veg']);
    expect(itemDietaryFlags('Cornbread', ['Gluten-free'])).toEqual(['gluten']);
    expect(itemDietaryFlags('Mac & cheese', ['Dairy-free'])).toEqual(['dairy']);
    expect(itemDietaryFlags('Wine', ['Alcohol-free'])).toEqual(['alcohol']);
    expect(itemDietaryFlags('Shrimp / fish for the grill', ['Shellfish'])).toEqual(['shellfish']);
  });
  test('avoids the obvious false positives', () => {
    expect(itemDietaryFlags('Butternut squash', ['Nut allergy'])).toEqual([]); // not a nut
    expect(itemDietaryFlags('Coconut rice', ['Nut allergy'])).toEqual([]);
    expect(itemDietaryFlags('Garden salad', ['Vegetarian'])).toEqual([]);      // no conflict
  });
  test('nothing flagged when no restriction is noted', () => {
    expect(itemDietaryFlags('Pecan pie', [])).toEqual([]);
    expect(itemDietaryFlags('', ['Nut allergy'])).toEqual([]);
  });
  test('multiple restrictions can flag one item, de-duped', () => {
    expect(itemDietaryFlags('Cheese & charcuterie board', ['Vegetarian', 'Dairy-free']).sort())
      .toEqual(['dairy', 'not veg'].sort());
  });
});

describe('playbookFoodPlan attaches dietFlags when restrictions are noted', () => {
  test('meat lines carry "not veg" when Vegetarian is noted', () => {
    const fp = playbookFoodPlan({ type: 'Juneteenth Cookout', guestCount: 20, dietCounts: { Vegetarian: 3 } });
    const meat = fp.list.find((i) => /ribs|chicken|brisket|sausage/i.test(i.item) && !i.skipped);
    expect(meat && meat.dietFlags).toContain('not veg');
  });
  test('no dietCounts → no dietFlags on any item', () => {
    const fp = playbookFoodPlan({ type: 'Juneteenth Cookout', guestCount: 20 });
    expect(fp.list.every((i) => !i.dietFlags)).toBe(true);
  });
});
