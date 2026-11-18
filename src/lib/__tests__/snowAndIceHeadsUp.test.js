// Owner, 11/18/2026: "Yes add the snow and ice heads-up." An indoor event's
// guests still drive through the weather: snow, sleet or freezing rain, and
// thunderstorms raise a guest-travel heads-up; rain alone, a flurry under 30%,
// or the sample never does.
import { travelHazard, guestTravelMessage } from '../weather';

const row = (over) => ({ date: '2026-11-21', icon: '13d', conditions: 'snow', precipitation: 60, temp: { min: 25, max: 33 }, ...over });

test('snow, ice and thunderstorms each raise their own heads-up', () => {
  expect(travelHazard(row())).toMatchObject({ kind: 'snow', glyph: 'snow', pop: 60 });
  expect(travelHazard(row({ conditions: 'freezing rain' }))).toMatchObject({ kind: 'ice', glyph: 'sleet' });
  expect(travelHazard(row({ conditions: 'sleet' }))).toMatchObject({ kind: 'ice' });
  expect(travelHazard(row({ icon: '11d', conditions: 'thunderstorm with rain' }))).toMatchObject({ kind: 'storm', glyph: 'storm' });
  expect(travelHazard(row()).headline).toBe('Snow forecast for Saturday (your event day), 60% chance — guests may need extra time to get there');
});

test('rain, clear skies, a low chance, and the sample raise nothing', () => {
  expect(travelHazard(row({ icon: '10d', conditions: 'moderate rain' }))).toBeNull();
  expect(travelHazard(row({ icon: '01d', conditions: 'clear sky', precipitation: 0 }))).toBeNull();
  expect(travelHazard(row({ precipitation: 29 }))).toBeNull();
  expect(travelHazard(row({ _sample: true }))).toBeNull();
  expect(travelHazard(null)).toBeNull();
});

test('the guest note names the day and the weather, and no hour', () => {
  const note = guestTravelMessage({ name: 'Vida’s Friendsgiving', date: '2026-11-21', startTime: '16:00' }, travelHazard(row()));
  expect(note).toBe('Heads-up for Vida’s Friendsgiving on Saturday: the forecast shows snow. Leave a little extra time to get here and take it slow on the roads. If the weather changes our plans, I\'ll let you know. See you there!');
  expect(note).not.toMatch(/\d{1,2}(:\d{2})?\s*(AM|PM)/i);
});
