// TABLES SEAT PEOPLE (owner approved 11/18/2026). Measured at 15 guests before
// this change: Thanksgiving proposed 15 tables (it read the chair row "Extra
// chairs + a table leaf"), Friendsgiving 1 (the buffet table), Birthday 2 (the
// food + gift tables), Dinner Party a bare 5. A table count now comes from the
// host, then a playbook row that really is seating, then the headcount at the
// standard table of 8, and only then the bare 5.
import { tableCountOf, tableCountBasis, playbookTableCount, headcountTableCount, SEATS_PER_TABLE_DEFAULT } from '../seatingPlan';

const ev = (type, n, extra = {}) => ({ id: 't', type, guestEstimate: n, guests: [], ...extra });

test('the standard table seats 8', () => expect(SEATS_PER_TABLE_DEFAULT).toBe(8));

test.each([
  ['Thanksgiving Hosting', 15, 2],
  ['Friendsgiving', 15, 2],
  ['Birthday', 15, 2],
  ['Dinner Party', 15, 2],
  ['Friendsgiving', 8, 1],
  ['Friendsgiving', 30, 4],
])('%s for %i: %i tables of 8, from the headcount', (type, n, tables) => {
  expect(playbookTableCount(ev(type, n))).toBeNull();     // no buffet, gift, chair or leaf row counts
  expect(tableCountOf(ev(type, n))).toBe(tables);
  expect(tableCountBasis(ev(type, n))).toBe('headcount');
});

test('a real seating row still wins: crab feast long tables, card tables of four', () => {
  expect(tableCountBasis(ev('Crab Feast', 15))).toBe('playbook');
  expect(tableCountOf(ev('Card Party', 16))).toBe(4);
  expect(tableCountBasis(ev('Card Party', 16))).toBe('playbook');
});

test('the host\'s own number wins over everything', () => {
  expect(tableCountOf(ev('Friendsgiving', 15, { tables: 1 }))).toBe(1);
  expect(tableCountBasis(ev('Friendsgiving', 15, { tables: 1 }))).toBe('host');
});

test('a guest list with no estimate counts the list', () => {
  const guests = Array.from({ length: 9 }, (_, i) => ({ id: 'g' + i, name: 'G' + i }));
  expect(headcountTableCount({ id: 't', type: 'Friendsgiving', guests })).toBe(2);
});
