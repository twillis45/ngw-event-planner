// ─── THE GUEST ROWS SAY WHO IS COMING (G2c-2b-2a; owner, 11/28/2026:
// "Approved, go with your recommendations"; UX_12 §8a, render screen 1) ──────
// What each row of the kit's list shows under the name (+1, "with" a partner,
// kids, diet and allergy tags), the list read by group once any guest has one,
// the plus-ones and kids total, and the find box's match (name, +1, group,
// email: the old sheet's fields). One place, lib/guestRows.
import { guestRowTags, findGuests, households, partyTotals, FIND_FROM } from '../guestRows';

const G = [
  { id: 'r', name: 'Rosa Lane', plusOne: 'Marcus Bell', diets: ['Vegetarian'], group: 'Family' },
  { id: 'm', name: 'Marcus Bell', allergens: ['Tree nuts'], coupleId: 'c1' },
  { id: 'n', name: 'Nia Bell', coupleId: 'c1', kids: 2, group: 'Family' },
  { id: 'd', name: 'Dev Okafor', email: 'dev@example.com', group: 'Work' },
  { id: 'p', name: 'Priya Shah' },
];

test('row tags: the +1, the partner, kids, then diet and allergies', () => {
  expect(guestRowTags(G[0], G)).toEqual(['+1 Marcus Bell', 'Vegetarian']);
  expect(guestRowTags(G[1], G)).toEqual(['with Nia', 'Tree nuts allergy']);
  expect(guestRowTags(G[2], G)).toEqual(['with Marcus', '2 kids']);
  expect(guestRowTags({ name: 'Ann', kids: 1 }, [])).toEqual(['1 kid']);
  expect(guestRowTags(G[4], G)).toEqual([]);
});

test('find matches the name, the +1, the group and the email', () => {
  expect(findGuests(G, 'marcus').map((g) => g.id)).toEqual(['r', 'm']);
  expect(findGuests(G, 'work').map((g) => g.id)).toEqual(['d']);
  expect(findGuests(G, 'dev@').map((g) => g.id)).toEqual(['d']);
  expect(findGuests(G, '  ').length).toBe(5);
  expect(FIND_FROM).toBe(8);
});

test('households: groups in the order first used, everyone else last; none when no one has a group', () => {
  const h = households(G);
  expect(h.map((x) => [x.group, x.guests.map((g) => g.id)])).toEqual([
    ['Family', ['r', 'n']], ['Work', ['d']], ['', ['m', 'p']],
  ]);
  expect(households(G.map(({ group, ...g }) => g))).toBeNull();
});

test('totals: plus-ones and kids across the list', () => {
  expect(partyTotals(G)).toEqual({ plusOnes: 1, kids: 2 });
  expect(partyTotals([])).toEqual({ plusOnes: 0, kids: 0 });
});
