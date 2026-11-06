// Owner ruling (11/5/2026, option 3): a reply signed "eve" is not matched to
// Eve Brooks (guestMerge.test.js locks that), but the host is asked — and her
// answer sticks across the read-backs that re-deliver every reply.
import { mergeGuestReplies, confirmSameGuest, keepSeparateGuest, likelySameGuest } from '../guestMerge';

const roster = () => [{ id: 'g1', name: 'Eve Brooks', rsvp: '', meal: '—' }, { id: 'g2', name: 'Ana Rivera', rsvp: '' }];

test('a short name with one likely guest is added, and flagged as maybe her', () => {
  const { guests, added } = mergeGuestReplies(roster(), [{ name: 'eve', rsvp: 'Yes', meal: 'Fish', idempotencyKey: 'k1' }]);
  expect(added).toBe(1);
  expect(guests[2]).toMatchObject({ name: 'eve', rsvp: 'Yes', maybeSameAs: 'g1' });
  expect(guests[0].rsvp).toBe('');
});

test('two guests share the first name → no guess', () => {
  expect(likelySameGuest([...roster(), { id: 'g3', name: 'Eve Lane' }], 'eve')).toBeNull();
});

test('a long or full name is never flagged (the ladder already decides it)', () => {
  expect(likelySameGuest(roster(), 'Eve Smith')).toBeNull();
  expect(likelySameGuest(roster(), 'Evelyn')).toBeNull();
});

test('"Same person": the reply moves onto Eve Brooks and the row goes', () => {
  const { guests } = mergeGuestReplies(roster(), [{ name: 'eve', rsvp: 'Yes', meal: 'Fish', idempotencyKey: 'k1' }]);
  const merged = confirmSameGuest(guests, guests[2].id);
  expect(merged).toHaveLength(2);
  expect(merged[0]).toMatchObject({ id: 'g1', name: 'Eve Brooks', rsvp: 'Yes', meal: 'Fish', aka: ['eve'] });
});

test('…and the reply re-arriving next visit lands on her, not a new row', () => {
  const { guests } = mergeGuestReplies(roster(), [{ name: 'eve', rsvp: 'Yes', idempotencyKey: 'k1' }]);
  const merged = confirmSameGuest(guests, guests[2].id);
  const again = mergeGuestReplies(merged, [{ name: 'eve', rsvp: 'Maybe', idempotencyKey: 'k1' }]);
  expect(again.added).toBe(0);
  expect(again.guests).toHaveLength(2);
  expect(again.guests[0].rsvp).toBe('Maybe');
});

test('"Different people": the flag clears and the next visit does not re-ask', () => {
  const { guests } = mergeGuestReplies(roster(), [{ name: 'eve', rsvp: 'Yes', idempotencyKey: 'k1' }]);
  const kept = keepSeparateGuest(guests, guests[2].id);
  expect(kept[2].maybeSameAs).toBeUndefined();
  const again = mergeGuestReplies(kept, [{ name: 'eve', rsvp: 'Yes', idempotencyKey: 'k1' }]);
  expect(again.added).toBe(0);
  expect(again.guests[2].maybeSameAs).toBeUndefined();
});
