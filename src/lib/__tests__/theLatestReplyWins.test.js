// Owner's Vida run on the local real stack (11/5/2026): Dee replied Maybe, then
// changed to Yes from another browser. Both rows reached the host — the server
// returns them newest first (`order by submitted_at desc`) — and the merge
// applied them in that order, so the OLDER Maybe was written last and won. The
// toast said "8 replies … 6 yes" while the list counted Coming 5.
import { mergeGuestReplies } from '../guestMerge';

const roster = () => [{ id: 'g1', name: 'Dee Patel', rsvp: '' }, { id: 'g2', name: 'Bea Chen', rsvp: '' }];
const T = (m) => `2026-11-05T22:0${m}:00.000000+00:00`;

test('the newest answer wins, whatever order the server sends', () => {
  const newestFirst = [
    { name: 'Dee Patel', rsvp: 'Yes', at: T(7) },
    { name: 'Bea Chen', rsvp: 'Yes', at: T(5) },
    { name: 'Dee Patel', rsvp: 'Maybe', at: T(6) },
  ];
  const { guests } = mergeGuestReplies(roster(), newestFirst);
  expect(guests.find((g) => g.name === 'Dee Patel').rsvp).toBe('Yes');
  const oldestFirst = [...newestFirst].reverse();
  expect(mergeGuestReplies(roster(), oldestFirst).guests.find((g) => g.name === 'Dee Patel').rsvp).toBe('Yes');
});

test('a guest who changed their answer is one reply, and the yes count matches the list', () => {
  const { merged, yesCount, guests } = mergeGuestReplies(roster(), [
    { name: 'Dee Patel', rsvp: 'Yes', at: T(7) },
    { name: 'Dee Patel', rsvp: 'Maybe', at: T(6) },
    { name: 'Bea Chen', rsvp: 'No', at: T(5) },
  ]);
  expect(merged).toBe(2);   // Dee and Bea, not three rows
  expect(yesCount).toBe(guests.filter((g) => g.rsvp === 'Yes').length);
  expect(yesCount).toBe(1);
});

test('without timestamps the given order stands (same-browser outbox)', () => {
  const { guests } = mergeGuestReplies(roster(), [
    { name: 'Dee Patel', rsvp: 'Maybe' },
    { name: 'Dee Patel', rsvp: 'Yes' },
  ]);
  expect(guests.find((g) => g.name === 'Dee Patel').rsvp).toBe('Yes');
});

test('rows that re-arrive unchanged are not news: "1 reply came in — 1 yes", not "6 yes"', () => {
  const base = [{ id: 'g1', name: 'Dee Patel', rsvp: 'Maybe' }, { id: 'g2', name: 'Bea Chen', rsvp: 'Yes' }];
  const { merged, added, yesCount } = mergeGuestReplies(base, [
    { name: 'Bea Chen', rsvp: 'Yes', at: T(5) },     // already Yes — re-arrival
    { name: 'Dee Patel', rsvp: 'Maybe', at: T(6) },
    { name: 'Dee Patel', rsvp: 'Yes', at: T(7) },    // the only change
  ]);
  expect(merged + added).toBe(1);
  expect(yesCount).toBe(1);
});

test('a guest whose older rows re-arrive is not news when her answer did not change', () => {
  const base = [{ id: 'g1', name: 'Dee Patel', rsvp: 'Yes' }];
  const { merged, added, yesCount, guests } = mergeGuestReplies(base, [
    { name: 'Dee Patel', rsvp: 'Yes', at: T(7) },
    { name: 'Dee Patel', rsvp: 'Maybe', at: T(6) },
  ]);
  expect(guests[0].rsvp).toBe('Yes');
  expect(merged + added).toBe(0);
  expect(yesCount).toBe(0);
});
