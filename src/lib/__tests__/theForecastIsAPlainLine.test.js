// Owner, 11/18/2026: "weather should be wherever else in the app it's
// preferred and/or needed." Indoor events had no forecast at all; the line
// they get says what the sky is doing, with none of the outdoor advice.
import { forecastLine, assessForecastDay } from '../weather';

const day = (iso, { main = 'Clouds', description = 'scattered clouds', pop = 0.1, min = 41.2, max = 55.4 } = {}) => ({
  daily: [{ dt: Math.floor(new Date(iso + 'T12:00:00Z').getTime() / 1000), pop, temp: { min, max }, weather: [{ main, description }], sunset: 0 }],
  hourly: [], timezone_offset: 0,
});

test('a forecast day reads as conditions, high and low, and the chance of rain', () => {
  const row = assessForecastDay(day('2026-11-21'), '2026-11-21');
  expect(forecastLine(row)).toBe('Scattered clouds · 41°–55°F · 10% chance of rain or snow');
});

test('the line carries none of the outdoor advice', () => {
  const row = assessForecastDay(day('2026-11-21', { main: 'Rain', description: 'moderate rain', pop: 0.8 }), '2026-11-21');
  expect(row.summary).toMatch(/rain plan/i);
  expect(forecastLine(row)).toBe('Moderate rain · 41°–55°F · 80% chance of rain or snow');
});

test('no row, or the sample, gives no line', () => {
  expect(forecastLine(null)).toBe('');
  expect(forecastLine({ _sample: true, temp: { min: 1, max: 2 }, precipitation: 70, conditions: 'Rain' })).toBe('');
});
