// A caterer booking replaces the food it covers, and a pick that names a
// smaller meal is not priced as the whole one (audit 2 lane G #4 and #5).
//
// #4: Dinner Party, Anniversary, The Cookout and Low Country Boil carry their
// caterer option on a non-food call (`help`, `grill_master`, `cook`). A booked
// $2,000 caterer settled nothing there, so the plan kept 5–8 grocery food lines
// and the Shop list told her to buy the meal the caterer brings.
// #5: "Dessert + cake reception only" bought 20 lb of carved meats; "Light bites
// + dessert table only" bought 21 lb of mains; "Drop-off catering for 1 course"
// dropped all six courses and priced a whole catered meal.
import { foodApproach, playbookFoodPlan, getPlaybook } from '../playbooks';

const booked = [{ id: 'v-cat', name: 'Capital Catering', category: 'Catering', status: 'Booked', cost: 2000 }];
const ev = (type, extra = {}) => ({
  id: 'ev-' + type.replace(/\W+/g, ''), type, date: '2027-06-12', guestMode: 'count', guestCount: 40,
  guestCountLocked: true, guestEstimate: 40, budget: [], vendors: [], guests: [], foodChoices: {}, ...extra,
});
const list = (e) => (playbookFoodPlan(e) || {}).list || [];
// The playbook's own food purchases still on the list (the caterer line is not one).
const foodIds = (type) => new Set((getPlaybook(type).purchases || []).filter((p) => p.category === 'food').map((p) => p.id));
const groceryFood = (e) => list(e).filter((i) => foodIds(e.type).has(i.id) && !i.skipped);
const line = (e, id) => list(e).find((i) => i.id === id);

describe('a booked caterer replaces the grocery food', () => {
  for (const type of ['Dinner Party', 'Anniversary', 'The Cookout', 'Low Country Boil']) {
    test(type, () => {
      const e = ev(type, { vendors: booked });
      expect(foodApproach(e).usesCaterer).toBe(true);
      expect(groceryFood(e).map((i) => i.item)).toEqual([]);
      expect(line(e, 'fa-catering')).toBeTruthy();
    });
  }
  test('a host’s own cooking answer still wins over the booking', () => {
    const e = ev('Dinner Party', { vendors: booked, foodChoices: { help: 'Fully DIY' } });
    expect(foodApproach(e).usesCaterer).toBe(false);
  });
});

describe('a smaller meal is not priced as the full meal', () => {
  test('Retirement “Dessert + cake reception only” buys no carved meats, sides or charcuterie', () => {
    const ids = groceryFood(ev('Retirement Party', { foodChoices: { food_style: 'Host cooks', format: 'Dessert + cake reception only' } })).map((i) => i.id);
    expect(ids).not.toEqual(expect.arrayContaining(['p_buffet_protein']));
    expect(ids.filter((id) => ['p_buffet_protein', 'p_sides', 'p_apps'].includes(id))).toEqual([]);
    expect(ids).toContain('p_cake');
  });
  test('Sweet 16 “Light bites + dessert table only” buys no mains', () => {
    const ids = groceryFood(ev('Sweet 16', { foodChoices: { food_style: 'Host + family cook', food_menu: 'Light bites + dessert table only' } })).map((i) => i.id);
    expect(ids).not.toContain('p_pizza');
    expect(ids).toContain('p_cake');
  });
  test('Dinner Party “Drop-off catering for 1 course” keeps the courses she still cooks', () => {
    const e = ev('Dinner Party', { foodChoices: { help: 'Drop-off catering for 1 course' } });
    expect(foodApproach(e).usesCaterer).toBe(false);
    expect(groceryFood(e).length).toBeGreaterThan(1);
    expect(line(e, 'fa-catering')).toBeFalsy();
  });
});
