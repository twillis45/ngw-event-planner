// ─── "COOK ANYTHING TO SAFE INTERNAL TEMPS" — IN A HOTEL ─────────────────────
//
// Screen-by-screen census of the Santa Fe 80th with the room-block answer
// stored (host ask: "check that the host is only seeing what they need on each
// screen"). The Day tab, captured verbatim:
//
//   "Food safety — Keep cold food cold and hot food hot; nothing perishable
//    sitting out more than ~2 hours. Cook anything to safe internal temps."
//
// Two screens away the food sheet says "there is no kitchen to cook in", and
// the budget has stopped pricing groceries for the same reason. This is the
// same fact ignored on a third surface.
//
// DEFAULT_DAYOF_CHECKLIST states its own rule directly above itself: "no hazard
// that might not apply". The cook step breaks that rule the moment the kitchen
// answer is known — the rule was already right, the kitchen case just did not
// exist when it was written.
//
// THE ITEM IS NOT DELETED. Half of it is still true: catered food and food
// carried in still cannot sit out for hours. Dropping food safety entirely from
// a gathering because it happens to be catered is the more dangerous of the two
// errors, so only the unfollowable instruction is withdrawn.
import { playbookDayOfChecklist } from '../playbooks';
import { lodgingKitchen } from '../lodgingIntel';

const base = (extra) => ({
  id: 'd', name: "Mom's 80th", type: 'Birthday',
  date: '2027-06-17', endDate: '2027-06-21',
  isDestination: true, venueCity: 'Santa Fe', state: 'NM',
  guestMode: 'count', guestCount: 10, ...extra,
});
const HOTEL = base({ foodChoices: { dest_lodging: 'A room block I guarantee fills' } });
const RENTAL = base({ foodChoices: { dest_lodging: 'A house we rent for everyone' } });
const UNTOLD = base({});
const foodItem = (ev) => (playbookDayOfChecklist(ev).items || []).find((i) => i.id === 'food');

describe('the day-of list does not ask for a stove that is not there', () => {
  test('(premise) the fixtures really do differ, and all three get a food item', () => {
    expect(lodgingKitchen(HOTEL)).toBe(false);
    expect(lodgingKitchen(RENTAL)).toBe(true);
    expect(lodgingKitchen(UNTOLD)).toBe(null);
    for (const ev of [HOTEL, RENTAL, UNTOLD]) expect(foodItem(ev)).toBeTruthy();
  });

  test('THE FIX: a room block is never told to cook to temperature', () => {
    expect(foodItem(HOTEL).detail).not.toMatch(/cook/i);
    expect(foodItem(HOTEL).detail).not.toMatch(/internal temp/i);
  });

  test('the half that still applies SURVIVES — this is not a deletion', () => {
    // The dangerous over-correction. Catered food sitting out is still the
    // hazard it always was, and the item must still say so.
    const it = foodItem(HOTEL);
    expect(it.label).toBe('Food safety');
    expect(it.detail).toMatch(/2 hours/i);
    expect(it.detail).toMatch(/caterer|restaurant/i);
    expect(it.severity).toBe('high');
    // And it is still ON the list, at the same rank — not quietly demoted.
    expect(playbookDayOfChecklist(HOTEL).items.map((i) => i.id)).toContain('food');
  });

  test('NEGATIVE CONTROL: a rental with a kitchen keeps the cook step', () => {
    expect(foodItem(RENTAL).detail).toMatch(/cook/i);
  });

  test('NEGATIVE CONTROL: an UNTOLD kitchen keeps it too', () => {
    // Same asymmetry the food sheet and the budget draw. Not being asked is not
    // being told there is no stove.
    expect(foodItem(UNTOLD).detail).toMatch(/cook/i);
  });

  test('NEGATIVE CONTROL: a LOCAL event keeps it, even holding the answer', () => {
    // Guarded on isDestination, matching kitchenConsequence's own contract.
    const local = base({
      isDestination: false, venueCity: 'Silver Spring', state: 'MD',
      foodChoices: { dest_lodging: 'A room block I guarantee fills' },
    });
    expect(foodItem(local).detail).toMatch(/cook/i);
  });

  test('NEGATIVE CONTROL: the other basics are untouched', () => {
    // Scope. The complaint was one unfollowable instruction, not the list.
    const hotel = playbookDayOfChecklist(HOTEL).items;
    const rental = playbookDayOfChecklist(RENTAL).items;
    expect(hotel.map((i) => i.id)).toEqual(rental.map((i) => i.id));
    for (const id of ['cleanup', 'emergency']) {
      expect(hotel.find((i) => i.id === id).detail)
        .toBe(rental.find((i) => i.id === id).detail);
    }
  });
});
