// THE HOST SAYS INDOORS OR OUTSIDE (owner, 11/18/2026: "App needs an indoor
// and outdoor"). hostv2 never asked, so every surface guessed from the venue
// name. The answer now wins everywhere; the guess is only the fallback.
import { placeIsOutdoors, derivePlaceIntelligence } from '../placeIntelligence';
import { playbookDayOfChecklist } from '../playbooks';
import { incidentPlanFor } from '../knowledge/incidentContext';
import { deriveEventPhaseProgress } from '../phaseProgress';

const ev = (extra = {}) => ({ id: 'e', type: 'Birthday', venue: 'Home', venueKind: 'home', guests: [], vendors: [], ...extra });
const rain = (e) => derivePlaceIntelligence(e).sections.find((s) => s.key === 'rain');
const dayRain = (e) => (playbookDayOfChecklist(e).items || []).some((i) => i.key === 'weather');

test('"Outside" at home: the rain row is a risk and the day-of list carries it', () => {
  const e = ev({ indoorOutdoor: 'outdoor' });
  expect(placeIsOutdoors(e)).toBe(true);
  expect(rain(e).state).toBe('risk');
  expect(dayRain(e)).toBe(true);
});

test('"Indoors" at home: no rain backup is asked for', () => {
  expect(rain(ev({ indoorOutdoor: 'indoor' })).state).toBe('na');
});

test('"Indoors" beats an outdoor-sounding venue name', () => {
  const e = ev({ venue: 'The Garden Room', venueKind: 'venue', indoorOutdoor: 'indoor' });
  expect(placeIsOutdoors(e)).toBe(false);
  expect(dayRain(e)).toBe(false);
});

const rainArea = (e) => JSON.stringify(deriveEventPhaseProgress(e, new Date('2027-05-01T12:00:00'))).includes('"id":"rain"');

test('the phase meter: an outdoor type asks for rain unless the host says indoors', () => {
  const e = ev({ type: 'The Cookout', date: '2027-06-01' });
  expect(rainArea(e)).toBe(true);                                // premise
  expect(rainArea({ ...e, indoorOutdoor: 'indoor' })).toBe(false);
  expect(rainArea(ev({ type: 'Birthday', date: '2027-06-01', indoorOutdoor: 'outdoor' }))).toBe(true);
});

test('the incident plan reads the answer too', () => {
  const out = JSON.stringify(incidentPlanFor(ev({ indoorOutdoor: 'outdoor' })));
  const inn = JSON.stringify(incidentPlanFor(ev({ indoorOutdoor: 'indoor' })));
  expect(out).not.toEqual(inn);
});
