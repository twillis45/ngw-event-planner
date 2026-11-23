// Live 11/23/2026 (Thanksgiving at home, no town given): the hero said "Add the
// location." over the town card's "Your town — The place is set." Her place
// IS set (her home); what is missing is the town. At home, the ask is the town.
import { deriveEventPhaseProgress } from '../phaseProgress';
import { heroAskFor } from '../heroAsk';

const base = { id: 'e-town', name: 'Thanksgiving Dinner', type: 'Thanksgiving Hosting', date: '2026-11-26', startTime: '15:00', guestEstimate: 14 };
const cue = (ev) => (deriveEventPhaseProgress(ev).items || []).find((i) => i.id === 'location');

test('at home with no town, the location row asks for the town', () => {
  const c = cue({ ...base, venueKind: 'home' });
  expect(c).toBeTruthy();
  expect(c.handled).toBe(false);
  expect(heroAskFor(c)).toBe('Add your town.');
});

test('away from home with nothing set, the ask is still the location', () => {
  const c = cue({ ...base });
  expect(heroAskFor(c)).toBe('Add the location.');
});
