// THE RAIN BACKUP IS FOR OUTDOORS (owner, 11/26/2026: "Yes rain backup", on
// dropping the day-before plan's rain row for indoor events). An indoor
// Thanksgiving was told "No rain backup yet" the day before, in hostv2's
// "Event tomorrow" card and hostv4's "Before tomorrow" alike. The plan now asks
// only when some of it may be outside: the place says so (placeIsOutdoors), or
// nothing answers the question yet and the app's own guess says outdoors
// (outdoorsGuess: an outdoor venue, an outdoor word, a type that usually is).
import { buildDayBeforePlan } from '../dayBefore';
import { mayBeOutdoors } from '../placeIntelligence';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock('2026-11-25T21:00:00.000Z');

const ev = (over = {}) => ({
  id: 'e-rain', name: 'Plan', type: 'Thanksgiving', date: daysFromNow(1), venueKind: 'home',
  guestMode: 'count', guestCount: 12, guests: [], budget: [], timeline: [], vendors: [], ...over,
});
const rain = (e) => buildDayBeforePlan(e).sections.find((s) => s.key === 'rain') || null;

test('an indoor Thanksgiving at home: no rain row', () => {
  expect(mayBeOutdoors(ev())).toBe(false);
  expect(rain(ev())).toBe(null);
  expect(rain(ev({ indoorOutdoor: 'indoor' }))).toBe(null);
});

test('a crab feast at home, unanswered: the type usually is outside, so it asks', () => {
  const crab = ev({ type: 'Crab Feast' });
  expect(mayBeOutdoors(crab)).toBe(true);
  expect(rain(crab).open).toBe(1);
});

test('the host’s answer wins: a crab feast marked indoor does not ask', () => {
  expect(rain(ev({ type: 'Crab Feast', indoorOutdoor: 'indoor' }))).toBe(null);
});

test('outdoor or both: it asks, and a saved plan settles it', () => {
  expect(rain(ev({ indoorOutdoor: 'outdoor' })).open).toBe(1);
  expect(rain(ev({ indoorOutdoor: 'both' })).open).toBe(1);
  expect(rain(ev({ indoorOutdoor: 'outdoor', rainPlan: 'Into the garage.' })).open).toBe(0);
});

test('the headline counts only what is asked', () => {
  const plan = buildDayBeforePlan(ev());
  expect(plan.openCount).toBe(plan.sections.reduce((n, s) => n + (s.open || 0), 0));
});
