// ─── THE COMMUNITY CARRYING THE MEAL IS NOT THE MEAL NOT EXISTING ────────────
//
// Found by the review board, 2026-09-24, and verified by running the engine
// before anything was written:
//
//     a 40-guest Repast returns 6 lines and ZERO food lines.
//
// The host's sheet listed sweet tea, ice, plates, to-go containers, serving
// utensils and trash bags — and not one item of the meal. Chicken and ham,
// greens and mac and potato salad, rolls and cornbread, the cakes and the
// banana pudding are all authored in `repast.js`, all sourced "Brought by the
// community", and all silently dropped.
//
// THE CHAIN. Repast's `food_source` default is "Ask the repast committee to
// carry it". COMMUNITY_OPTION_RE matches "committee", so `communityBrings` is
// true, so `_foodOffPlate` was true, so `hostCooksIt` filtered every
// `category: 'food'` purchase out of the plan.
//
// WHY THE ORIGINAL WAS NOT SIMPLY WRONG. It replaced a real defect: W8
// (2026-07-22) found a repast family being told to buy 28.5 lbs of chicken the
// playbook's own note says the committee brings. Dropping the lines fixed the
// SHOPPING error and introduced a COORDINATION one, because a repast host still
// has to know what is coming and who has it — on the one event type where
// nobody wants to ask twice.
//
// THE DISTINCTION THIS FIXES. A CATERER replaces the food: the host buys
// nothing and a per-guest catering line is injected in its place, so dropping
// those rows is right and stays. The COMMUNITY does not replace the food — the
// dishes still exist and still have to show up. So they are ATTRIBUTED: still
// listed, marked as not the host's to buy, and contributing zero to the budget.
import { playbookFoodPlan } from '../index';

const repast = (pick) => ({
  id: 'ev-repast-test', type: 'Repast', date: '2027-03-14',
  guestMode: 'count', guestCount: 40, totalBudget: 1200,
  venueCity: 'Annapolis', venueState: 'MD',
  ...(pick ? { foodChoices: { food_source: pick } } : {}),
});
const COMMUNITY = 'Ask the repast committee to carry it';
const NEIGHBORS = 'Friends and neighbors sign up to bring dishes';
const CATERED = 'Have it catered';

// Keyed on the ATTRIBUTION, not on the display group: repast files its cakes
// under a `Dessert` group, and the first cut of the fix missed them for exactly
// that reason — the chicken came off the host's budget and the cake did not.
const foodRows = (ev) => (playbookFoodPlan(ev).list || []).filter((i) => i && i.broughtByCommunity);
const allRows = (ev) => playbookFoodPlan(ev).list || [];

describe('the community carries the meal — it does not delete it', () => {
  test('THE DEFECT: the default repast host used to see zero food lines', () => {
    // The default IS the community option, so this is what a real host got.
    expect(foodRows(repast(null)).length).toBeGreaterThan(0);
  });

  test('the dessert is attributed too — it lives in its own group', () => {
    // The regression this pins: `p_dessert` is grouped `Dessert`, so a fix
    // written against `group === 'Food'` leaves the cakes on the host's bill.
    const dessert = allRows(repast(COMMUNITY)).find((r) => r.id === 'p_dessert');
    expect(dessert).toBeTruthy();
    expect(dessert.broughtByCommunity).toBe(true);
    expect(dessert.low).toBe(0);
    expect(dessert.high).toBe(0);
  });

  test('the four authored dishes are all present and attributed', () => {
    const rows = foodRows(repast(COMMUNITY));
    const items = rows.map((r) => String(r.item || ''));
    expect(items.some((s) => /chicken|ham/i.test(s))).toBe(true);
    expect(items.some((s) => /greens|mac|potato salad/i.test(s))).toBe(true);
    expect(items.some((s) => /roll|cornbread/i.test(s))).toBe(true);
    expect(items.some((s) => /cake|pie|pudding/i.test(s))).toBe(true);
    // Attributed, not silently present: every one says who is carrying it.
    for (const r of rows) {
      expect(r.broughtByCommunity).toBe(true);
      expect(String(r.broughtByLabel || '')).not.toHaveLength(0);
    }
  });

  test('and they cost the host nothing — the budget must not move', () => {
    for (const r of foodRows(repast(COMMUNITY))) {
      expect(r.low).toBe(0);
      expect(r.high).toBe(0);
    }
  });

  test('"friends and neighbors sign up" is the same promise, same treatment', () => {
    const rows = foodRows(repast(NEIGHBORS));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.broughtByCommunity === true)).toBe(true);
  });

  test('A CATERER STILL REPLACES THE FOOD — this is the case that must not change', () => {
    // A caterer is not the community: the host buys no ingredients and a
    // per-guest catering line stands in for them. Dropping those rows was
    // always right, and widening this fix to cover catering would put a
    // shopping list back in front of a host who hired someone.
    const authored = allRows(repast(CATERED))
      .filter((r) => /p_protein|p_sides|p_bread|p_dessert/.test(String(r.id)));
    expect(authored).toHaveLength(0);
  });

  test('the beverages and supplies a repast host DOES buy are untouched', () => {
    const hostBuys = allRows(repast(COMMUNITY)).filter((i) => !i.broughtByCommunity);
    expect(hostBuys.length).toBeGreaterThanOrEqual(6);
    expect(hostBuys.every((i) => !i.broughtByCommunity)).toBe(true);
  });
});
