// ─── A PART OF A DISH GOES WITH ITS DISH ─────────────────────────────────────
//
// Owner ruling, 11/23/2026: separate the combined shopping lines into one line
// per product. "Potatoes, butter & cream (the mash)" became the potatoes, the
// butter and the cream, each with its own store term and price. The butter is
// not a dish anyone brings on its own: it follows the mash (`partOf`).
import { playbookFoodPlan } from '../playbooks';
import { bringingRows } from '../foodBringing';

const TG = (extra = {}) => ({
  id: 'tg', type: 'Thanksgiving Hosting', date: '2026-11-26', guestMode: 'count', guestCount: 12, guests: [], ...extra,
});
const line = (plan, id) => plan.list.find((l) => l.id === id);

test('a guest who brings the mash brings its butter and cream: $0 to the host, asked for once', () => {
  const plan = playbookFoodPlan(TG());   // default: guests bring the sides
  for (const id of ['p_potatoes', 'p_potatoes_butter', 'p_potatoes_cream', 'p_mac', 'p_mac_cheddar', 'p_mac_milk']) {
    expect(line(plan, id).broughtByCommunity).toBe(true);
    expect([line(plan, id).low, line(plan, id).high]).toEqual([0, 0]);
  }
  const asked = bringingRows(plan).map((r) => r.id);
  expect(asked).toEqual(expect.arrayContaining(['p_potatoes', 'p_mac']));
  expect(asked).not.toContain('p_potatoes_butter');
  expect(asked).not.toContain('p_mac_cheddar');
});

test('a name on the dish is the name on its parts', () => {
  const plan = playbookFoodPlan(TG({ foodOwner: { p_potatoes: 'Aunt Rose' } }));
  expect(line(plan, 'p_potatoes_cream').broughtBy).toBe('Aunt Rose');
});

test('"I\'ll make it myself" puts the parts back on her list, priced', () => {
  const plan = playbookFoodPlan(TG({ foodOwner: { p_potatoes: false } }));
  expect(line(plan, 'p_potatoes_butter').broughtByCommunity).toBeFalsy();
  expect(line(plan, 'p_potatoes_butter').high).toBeGreaterThan(0);
});

test('"Not serving it" takes the parts off too', () => {
  const plan = playbookFoodPlan(TG({ foodSkip: { p_rolls: true } }));
  expect(line(plan, 'p_rolls_butter').skipped).toBe(true);
});

test('a host-bought part stays hers when the dish is hers (the gravy\'s thickener)', () => {
  const plan = playbookFoodPlan(TG());
  expect(line(plan, 'p_gravy_thickener').broughtByCommunity).toBeFalsy();
  expect(line(plan, 'p_gravy_thickener').high).toBeGreaterThan(0);
});
