// A GUEST WHO DELETES HER REPLY TAKES IT OFF THE HOST'S LIST TOO (11/11/2026).
//
// The host's app copies each reply into its own guest list (mergeGuestReplies),
// and that list is saved with the event. Deleting the server row alone would
// leave the copy — allergies included — forever. The server now returns a
// deleted reply as a tombstone ({ withdrawn: true }); these pin what the merge
// does with it.
import { mergeGuestReplies } from '../guestMerge';

const reply = (over = {}) => ({
  name: 'Avery Quinn', rsvp: 'Yes', meal: 'Vegetarian', needs: 'Peanuts',
  allergens: ['Peanuts'], diets: ['Vegetarian'], access: ['Step-free'],
  plusOne: 'Sam Rivera', plusOneMeal: 'Standard', plusOneNeeds: 'Shellfish', kids: 1,
  note: 'Running late', phone: '(410) 555-0100', email: 'guest@example.invalid',
  mailingAddress: '1 Test Lane', picksCrabs: true, lodgingPick: 'lodge-1',
  idempotencyKey: 'key-1', at: '2026-11-11T10:00:00Z', ...over,
});
const gone = (over = {}) => ({ name: 'Avery Quinn', withdrawn: true, idempotencyKey: 'key-1', at: '2026-11-11T11:00:00Z', ...over });

test('a guest the reply added is removed from the list', () => {
  const first = mergeGuestReplies([{ id: 'g-host', name: 'Jordan Blake', rsvp: 'Yes' }], [reply()]);
  expect(first.guests).toHaveLength(2);
  const after = mergeGuestReplies(first.guests, [gone()]);
  expect(after.guests.map((g) => g.name)).toEqual(['Jordan Blake']);
  expect(after.withdrawn).toBe(1);
  expect(after.merged + after.added).toBe(0);
});

test('a guest the host already listed keeps her name and loses every answer', () => {
  const host = [{ id: 'g-1', name: 'Avery Quinn', group: 'Family', rsvp: '' }];
  const first = mergeGuestReplies(host, [reply()]);
  expect(first.guests[0].allergens).toEqual(['Peanuts']);
  const after = mergeGuestReplies(first.guests, [gone()]);
  const g = after.guests[0];
  expect(g).toMatchObject({ id: 'g-1', name: 'Avery Quinn', group: 'Family', rsvp: '' });
  for (const k of ['needs', 'plusOne', 'plusOneNeeds', 'partyNotes', 'phone', 'email', 'address']) expect(g[k]).toBe('');
  for (const k of ['allergens', 'diets', 'access']) expect(g[k]).toEqual([]);
  expect(g.kids).toBe(0);
  expect('picksCrabs' in g).toBe(false);
  expect('lodgingPick' in g).toBe(false);
  expect(after.withdrawn).toBe(1);
  expect(after.merged).toBe(0);
});

test('the tombstone re-arriving on every visit changes nothing', () => {
  const first = mergeGuestReplies([{ id: 'g-1', name: 'Avery Quinn', rsvp: '' }], [reply()]);
  const once = mergeGuestReplies(first.guests, [gone()]);
  const twice = mergeGuestReplies(once.guests, [gone()]);
  expect(twice.guests).toEqual(once.guests);
  expect(twice.withdrawn + twice.merged + twice.added).toBe(0);
});

test('replying again after deleting brings the answers back', () => {
  const first = mergeGuestReplies([], [reply()]);
  const del = mergeGuestReplies(first.guests, [gone()]);
  expect(del.guests).toHaveLength(0);
  const again = mergeGuestReplies(del.guests, [reply({ allergens: ['Gluten'], at: '2026-11-11T12:00:00Z' })]);
  expect(again.guests[0].allergens).toEqual(['Gluten']);
  expect(again.added).toBe(1);
});

test('a deletion leaves other guests and the reply counts alone', () => {
  const host = [{ id: 'g-1', name: 'Jordan Blake', rsvp: '' }];
  const first = mergeGuestReplies(host, [reply()]);
  const mixed = mergeGuestReplies(first.guests, [gone(), { name: 'Jordan Blake', rsvp: 'Yes', at: '2026-11-11T11:30:00Z' }]);
  expect(mixed.guests.map((g) => [g.name, g.rsvp])).toEqual([['Jordan Blake', 'Yes']]);
  expect(mixed).toMatchObject({ merged: 1, added: 0, withdrawn: 1, yesCount: 1 });
});
