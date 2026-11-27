// THE DAY HAS ITS WEATHER (owner, 11/26/2026: "Yes build the weather line and
// rain actions"). Thanksgiving morning, measured on live: Washington, DC had
// moderate rain at 100%, Chicago light rain, and an indoor plan showed nothing
// anywhere, because rain only raised a heads-up for outdoor events and the
// travel heads-up (snow, ice, storms) showed on Plan, never on The Day. Now:
//   · dayWeather(row): the plain forecast line for any event, real data only;
//   · arrivalWeather(row): what the weather asks of arrivals — snow, ice and
//     storms as before, and now rain at 30%+, with its own checks (a spot by
//     the door for wet coats and umbrellas) and a note to guests.
import { dayWeather, arrivalWeather, guestTravelMessage, travelHazard } from '../weather';

const row = (conditions, icon, pop, min = 48, max = 54) => ({ date: '2026-11-26', conditions, icon, precipitation: pop, temp: { min, max } });
const DC = row('moderate rain', '10d', 100);
const DENVER = row('few clouds', '02d', 0, 34, 62);
const SNOW = row('snow', '13d', 60, 25, 33);

describe('dayWeather: the line', () => {
  test('rain in DC: the forecast in plain words, with its glyph', () => {
    const w = dayWeather(DC);
    expect(w.line).toBe('Moderate rain · 48°–54°F · 100% chance of rain or snow');
    expect(w.glyph).toBe('rain');
    expect(w.arrival.kind).toBe('rain');
  });
  test('a clear day has a line and nothing to do', () => {
    const w = dayWeather(DENVER);
    expect(w.line).toMatch(/^Few clouds · 34°–62°F/);
    expect(w.arrival).toBe(null);
  });
  test('the sample sky is never shown as the real one', () => {
    expect(dayWeather({ ...DC, _sample: true })).toBe(null);
    expect(dayWeather(null)).toBe(null);
  });
});

describe('arrivalWeather: what the weather asks of arrivals', () => {
  test('rain at 30%+: wet coats by the door, extra time, a note to guests', () => {
    const a = arrivalWeather(DC);
    expect(a.kind).toBe('rain');
    expect(a.headline).toMatch(/^Rain forecast for Thursday \(your event day\), 100% chance/);
    expect(a.checks.map((c) => c.key)).toEqual(['wx-coats']);
    expect(a.checks[0].label).toBe('A spot by the door for wet coats and umbrellas');
    expect(guestTravelMessage({ name: 'Thanksgiving', date: '2026-11-26' }, a)).toMatch(/the forecast shows rain\. Leave a little extra time to get here, and bring an umbrella\./);
  });
  test('light rain under 30% asks nothing', () => {
    expect(arrivalWeather(row('light rain', '10d', 20))).toBe(null);
  });
  test('snow keeps its heads-up, now with the path to the door as its check', () => {
    const a = arrivalWeather(SNOW);
    expect(a.kind).toBe('snow');
    expect(a.headline).toBe(travelHazard(SNOW).headline);
    expect(a.checks.map((c) => c.key)).toEqual(['wx-path']);
  });
});
