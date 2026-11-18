// ─── THE TRADITIONAL SIDES EACH GET A LINE ──────────────────────────────────
//
// Owner, 11/18/2026: "Friendsgiving and like events need more traditional sides
// for the event." Before this, Friendsgiving had one lumped line ("Sides you cook
// (potatoes, stuffing, a green vegetable, cranberry, a real vegan dish)", 0.75 lb
// a guest, synthesized) and Thanksgiving Hosting a lumped "Vegetable sides" line.
//
// Now each traditional side is its own purchase line with a per-guest portion
// grounded in a registered quantity source. Which sides: Campbell's 2026 State of
// the Sides top five (green bean casserole, mac and cheese, sweet potatoes, mashed
// potatoes, stuffing) plus YouGov's cranberry sauce and corn. Cornbread and salad
// are NOT here: no read source states a cornbread amount, and the salad figures
// disagree.
import { getPlaybook, playbookFoodPlan, playbookChecklist } from '../playbooks';
import { isGroundedItemQty, QTY_SOURCES } from '../knowledge/quantityProvenance';
import { storeSearchTerm } from '../knowledge/storeUnitMap';

const AS_OF = new Date('2026-11-15T12:00:00');
const HOST_MAIN = 'Potluck — host makes the main, friends each bring an assigned dish';
const ALL_ASSIGNED = 'Full potluck — even the main is assigned to a friend';
const HOST_COOKS = 'Host cooks most of it — friends bring drinks and dessert';
const ORDERED = 'Ordered in — a restaurant or caterer cooks, the group splits the bill';

// id → [per-guest qty, unit, curated store term]
const SIDES = {
  p_potatoes: [0.33, 'lb', 'russet potatoes'],
  p_stuffing: [0.75, 'cups cooked', 'stuffing mix'],
  p_green_beans: [0.25, 'lb', 'green beans'],
  p_sweet_potatoes: [0.25, 'lb', 'sweet potatoes'],
  p_cranberry: [0.5, 'cups', 'cranberry sauce'],
  p_mac: [0.125, 'lb dry pasta', 'elbow macaroni'],
  p_corn: [0.25, 'lb', 'frozen corn'],
  p_roast_veg: [0.25, 'lb', 'brussels sprouts'],
};
const IDS = Object.keys(SIDES);

const ev = (type, foodChoices, guestCount = 15) => ({
  id: 'ts', type, name: type, date: '2026-11-21', startTime: '18:00',
  guestCount, guestMode: 'count', foodChoices, vendors: [], guests: [], budget: [], timeline: [],
});
const CASES = [
  ['Friendsgiving', { hosting_model: HOST_COOKS }],
  ['Thanksgiving Hosting', { hosting_model: 'Host cooks the whole meal' }],
];
const rows = (e) => playbookFoodPlan(e).list;
const row = (e, id) => rows(e).find((r) => r.id === id);

describe.each(CASES)('%s, host cooking for 15', (type, picks) => {
  const pb = getPlaybook(type);
  const purchase = (id) => pb.purchases.find((p) => p.id === id);

  test('every traditional side is its own line on the shopping list', () => {
    expect(rows(ev(type, picks)).map((r) => r.id)).toEqual(expect.arrayContaining(IDS));
  });

  test('the lumped lines are gone', () => {
    const ids = pb.purchases.map((p) => p.id);
    expect(ids).not.toContain('p_sides');
    expect(ids).not.toContain('p_sides_veg');
  });

  test.each(IDS)('%s: per-guest amount and unit as sourced', (id) => {
    const [per, unit] = SIDES[id];
    expect(purchase(id).qtyPerGuest).toBe(per);
    expect(purchase(id).unit).toBe(unit);
  });

  test.each(IDS)('%s scales with the guest count', (id) => {
    const small = row(ev(type, picks, 6), id).qty;
    const big = row(ev(type, picks, 24), id).qty;
    expect(big).toBeGreaterThan(small);
  });

  test.each(IDS)('%s carries researched provenance whose sources resolve', (id) => {
    const prov = purchase(id).provenance;
    expect(prov.tier).toBe('researched');
    expect(prov.sources.length).toBeGreaterThanOrEqual(2);
    for (const s of prov.sources) expect(QTY_SOURCES[s]).toBeTruthy();
    expect(isGroundedItemQty(prov)).toBe(true);
    expect(row(ev(type, picks), id).qtyGrounded).toBe(true);
  });

  test('one side is the real vegan dish, and says so', () => {
    expect(purchase('p_roast_veg').item).toMatch(/vegan/i);
    expect(purchase('p_roast_veg').item).toMatch(/no butter/i);
  });

  test.each(IDS)('%s searches the store for its curated term', (id) => {
    expect(storeSearchTerm(purchase(id))).toBe(SIDES[id][2]);
  });
});

describe('Friendsgiving potluck: the sides are assigned, not bought', () => {
  // AMENDED 11/18/2026: under a potluck each side stays on the list as a dish a
  // friend brings — $0 to the host, nameable in the Bringing tab — rather than
  // disappearing. It is still not a host purchase.
  test.each([HOST_MAIN, ALL_ASSIGNED])('%s — every side is a friend\'s dish, $0 and out of the buy count', (model) => {
    const e = ev('Friendsgiving', { hosting_model: model });
    const plan = playbookFoodPlan(e);
    const mine = (plan.list || []).filter((r) => IDS.includes(r.id));
    expect(mine.map((r) => r.id).sort()).toEqual([...IDS].sort());
    for (const r of mine) {
      expect(r.broughtByCommunity).toBe(true);
      expect(r.friendBrings).toBe(true);
      expect([r.low, r.high]).toEqual([0, 0]);
    }
    // …and off the Shop bar's count too (live 11/18/2026: "0 of 22 bought").
    expect(plan.shoppingCount).toBe((plan.list || []).filter((r) => !r.skipped && !r.friendBrings).length);
    expect(plan.itemCount).toBe((plan.list || []).filter((r) => !r.skipped && !r.friendBrings && ['Food', 'Drinks', 'Dessert'].includes(r.group)).length);
  });
  test('ordered in — no side at all', () => {
    const ids = rows(ev('Friendsgiving', { hosting_model: ORDERED })).map((r) => r.id);
    for (const id of IDS) expect(ids).not.toContain(id);
  });

  test('the default potluck names every side in the assignment task', () => {
    const e = ev('Friendsgiving', {});
    const assign = playbookChecklist(e, AS_OF).find((c) => c.id === 'pbt-ts-t_assign');
    expect(assign).toBeTruthy();
    for (const dish of ['mashed potatoes', 'stuffing', 'green bean casserole', 'sweet potatoes', 'cranberry sauce', 'mac and cheese', 'corn', 'vegan']) {
      expect(assign.task.toLowerCase()).toContain(dish);
    }
  });

  test('host cooks: the friends are asked for drinks and dessert, not the sides', () => {
    const ids = playbookChecklist(ev('Friendsgiving', { hosting_model: HOST_COOKS }), AS_OF).map((c) => c.id);
    expect(ids).toContain('pbt-ts-t_assign_light');
    expect(ids).not.toContain('pbt-ts-t_assign');
  });
});

describe('Thanksgiving Hosting: the hosting model still re-prices every side', () => {
  test('the hosting-model decision affects each side line', () => {
    const d = getPlaybook('Thanksgiving Hosting').decisions.find((x) => x.id === 'hosting_model');
    expect(d.affects).toEqual(expect.arrayContaining(IDS));
  });
  test('a full potluck halves the host\'s cost on a side', () => {
    const host = row(ev('Thanksgiving Hosting', { hosting_model: 'Host cooks the turkey and core dishes, guests bring sides and desserts' }), 'p_green_beans');
    const pot = row(ev('Thanksgiving Hosting', { hosting_model: 'Full potluck — Friendsgiving style, host assigns dishes' }), 'p_green_beans');
    expect(pot.high).toBeLessThan(host.high);
  });
});
