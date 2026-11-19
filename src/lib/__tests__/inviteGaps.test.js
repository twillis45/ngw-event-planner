// Owner, 11/19/2026: "Before sending invites app should verify if the important
// info is included." The day, the hour the HOST set, and the place.
import { inviteGaps } from '../inviteGaps';

const READY = { date: '2026-11-26', startTime: '16:00', startTimeSource: 'host', venue: 'Vida’s place' };

test('an invite with the day, the hour and the place is ready', () => {
  expect(inviteGaps(READY)).toEqual([]);
});

test.each([
  ['no date', { ...READY, date: '' }, ['date']],
  ['a date that is not a date', { ...READY, date: 'TBD' }, ['date']],
  ['no start time', { ...READY, startTime: '' }, ['time']],
  ['a start time the app proposed, not the host', { ...READY, startTimeSource: 'derived' }, ['time']],
  ['no place', { ...READY, venue: '' }, ['place']],
  ['nothing at all', {}, ['date', 'time', 'place']],
])('%s', (_name, ev, want) => {
  expect(inviteGaps(ev)).toEqual(want);
});

test('an address alone is a place', () => {
  expect(inviteGaps({ ...READY, venue: '', venueAddress: '1200 Charles St, Baltimore, MD' })).toEqual([]);
});

test('a start time with no source on it was set by the host (older events)', () => {
  const { startTimeSource, ...older } = READY;
  expect(inviteGaps(older)).toEqual([]);
});
