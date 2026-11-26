// Owner, 11/19/2026: "Build the invitation picture email." The picture must say
// what the guest invite page says (hostv2 InviteV2), from the same helpers.
import { inviteCardModel, inviteCardKey } from '../inviteCard';
import { useFrozenClock } from '../../testUtils/frozenClock';

// A week before the party, the day this was written: the event's fixed date is
// still ahead in every timezone (it read as past on 11/26/2026 in UTC+14).
useFrozenClock('2026-11-19T12:00:00.000Z');

const EV = { name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: '2026-11-26', startTime: '16:00', startTimeSource: 'host', venue: 'Vida’s place', hostName: 'Vida Reyes' };

test('the card carries the masthead, the name, the deck line and the facts', () => {
  const m = inviteCardModel(EV);
  expect(m.tone).toBe('light');
  expect(m.mast).toEqual(['An invitation', 'Nov 2026']);
  expect(m.name).toBe('Vida’s Friendsgiving');
  expect(m.deck).toBeTruthy();
  expect(m.facts).toEqual([
    { label: 'When', value: 'Thursday, November 26', sub: '4:00 PM' },
    { label: 'Where', value: 'Vida’s place' },
    { label: 'Hosted by', value: 'Vida Reyes' },
  ]);
});

test('an hour the app proposed is not on the card, as on the page', () => {
  const m = inviteCardModel({ ...EV, startTimeSource: 'derived' });
  expect(m.facts[0].sub).toBe('');
});

test('a memorial gets the muted stationery and "Please join us"', () => {
  const m = inviteCardModel({ ...EV, name: 'Repast for Mr. Lewis', type: 'Repast' });
  expect(m.tone).toBe('muted');
  expect(m.colors.hueDeep).toBe('#6f6152');
  expect(m.eyebrow).toBe('Please join us');
});

test('a formal evening gets the dark stationery, as the page does', () => {
  const m = inviteCardModel({ ...EV, type: 'Gala', timeOfDay: 'evening' });
  expect(m.tone).toBe('dark');
  expect(m.colors.paper).toBe('dark');
});

test('the same card has the same key, and any change makes a new one', () => {
  expect(inviteCardKey(inviteCardModel(EV))).toBe(inviteCardKey(inviteCardModel({ ...EV })));
  expect(inviteCardKey(inviteCardModel(EV))).not.toBe(inviteCardKey(inviteCardModel({ ...EV, venue: 'The barn' })));
});
