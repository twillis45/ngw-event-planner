// WHO'S HERE AND AT THE TABLE (B6, 11/26/2026; the Thanksgiving mockup, 3:20
// and 4:30 PM). Two shared pieces hostv4's The Day reads:
//   · checkInEdit: tap a guest in (guest.checkedIn, the field the duplicate
//     rule already resets), tap again to undo. Nothing set it before.
//   · tableNeeds: who needs what at the table, grouped by need, from the same
//     reader the dietary counts use (dietTagFor over needs, meal, diets and
//     allergens); a need the tags don't cover is kept as written.
import { checkInEdit } from '../guestEdits';
import { tableNeeds } from '../dietRows';

const EV = {
  id: 'e', name: 'Thanksgiving', guestMode: 'list',
  guests: [
    { id: 'g1', name: 'Bo Reed', rsvp: 'Yes', needs: 'Tree nut allergy' },
    { id: 'g2', name: 'Cy Lane', rsvp: 'Yes', diets: ['Vegetarian'] },
    { id: 'g3', name: 'Di Moss', rsvp: 'Yes', meal: 'vegetarian' },
    { id: 'g4', name: 'Ed Wu', rsvp: 'No', diets: ['Vegan'] },
    { id: 'g5', name: 'Flo Ng', rsvp: 'Yes' },
  ],
};

describe('checking a guest in', () => {
  test('tap in: the time they arrived; tap again: not here', () => {
    const ed = checkInEdit(EV, 'g2', '2026-11-26T20:20:00.000Z');
    expect(ed.patch.guests.find((g) => g.id === 'g2').checkedIn).toBe('2026-11-26T20:20:00.000Z');
    expect(ed.patch.guests.filter((g) => g.checkedIn)).toHaveLength(1);
    expect(ed.msg).toBe('Cy is here.');
    const back = checkInEdit({ ...EV, guests: ed.patch.guests }, 'g2');
    expect(back.patch.guests.find((g) => g.id === 'g2').checkedIn).toBe(null);
    expect(back.msg).toBe('Cy isn’t checked in.');
  });
  test('an unknown guest: no edit', () => {
    expect(checkInEdit(EV, 'nope')).toBe(null);
  });
});

describe('at the table', () => {
  test('grouped by need, from the shared tag reader; who said no is not at the table', () => {
    expect(tableNeeds(EV)).toEqual([
      { need: 'Tree nut allergy', names: ['Bo Reed'] },
      { need: 'Vegetarian', names: ['Cy Lane', 'Di Moss'] },
    ]);
  });
  test('nobody with a need: nothing to show', () => {
    expect(tableNeeds({ guests: [{ id: 'a', name: 'A', rsvp: 'Yes' }] })).toEqual([]);
  });
});
