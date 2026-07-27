// WX SPAN PROOF — Destination + Multi-Day program, P1 "weather range".
// Locks the span weather seams:
//   1. getEventWeatherSpan classifies EVERY span day from ONE fetch
//   2. single-day events answer byte-identically to getEventWeatherRisk
//      (endDate absent ⇒ identical answers — that degradation is the flag,
//      same contract spanProof locks for the date primitives)
//   3. mid-event (day 2 of 3) the passed days drop out and primary is TODAY
//   4. outside the 14-day forecast window: null, and no API call is spent
//
// The OpenWeather key must exist before the module reads it at import time.
process.env.REACT_APP_OPENWEATHER_KEY = 'test-key';
delete process.env.REACT_APP_API_BASE_URL;
const { getEventWeatherRisk, getEventWeatherSpan } = require('../lib/weather');

// Local-calendar ISO date, offset in whole days from today — mirrors dates.js
// local-midnight math so the 14-day window lands where daysUntil says it does.
const iso = (offsetDays) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// One daily-forecast entry; dt at noon UTC so the classifier's UTC date match
// resolves to the same calendar date the row was built for.
const day = (isoDate, over = {}) => ({
  dt: Math.floor(Date.parse(isoDate + 'T12:00:00Z') / 1000),
  pop: 0.1,
  temp: { min: 60, max: 75 },
  weather: [{ main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
  sunset: Math.floor(Date.parse(isoDate + 'T23:30:00Z') / 1000),
  ...over,
});

const payload = (daily) => ({ daily, hourly: [], timezone_offset: 0 });

afterEach(() => { delete global.fetch; jest.restoreAllMocks(); });

const mockForecast = (daily) => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => payload(daily) }));
};

test('multi-day span: one fetch, one classified row per day, indices honest', async () => {
  const d1 = iso(3), d2 = iso(4), d3 = iso(5);
  mockForecast([
    day(d1),
    day(d2, { pop: 0.8, weather: [{ main: 'Rain', description: 'heavy rain', icon: '10d' }] }),
    day(d3),
  ]);
  const span = await getEventWeatherSpan(1, 2, { date: d1, endDate: d3 });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(span.days).toHaveLength(3);
  expect(span.days.map(r => r.dayIndex)).toEqual([1, 2, 3]);
  expect(span.days.every(r => r.dayCount === 3)).toBe(true);
  expect(span.days.map(r => r.date)).toEqual([d1, d2, d3]);
  // Day 2 carries the rain risk; the clear days stay clear.
  expect(span.days[1].risk).toBe('high');
  expect(span.days[0].risk).toBe('clear');
  expect(span.primary).toBe(span.days[0]);
});

test('endDate absent ⇒ one row, byte-identical to getEventWeatherRisk', async () => {
  const d1 = iso(3);
  mockForecast([day(d1, { pop: 0.5, weather: [{ main: 'Rain', description: 'light rain', icon: '10d' }] })]);
  const span = await getEventWeatherSpan(1, 2, { date: d1 });
  const single = await getEventWeatherRisk(1, 2, d1);
  expect(span.days).toHaveLength(1);
  const { dayIndex, dayCount, ...row } = span.primary;
  expect(dayIndex).toBe(1);
  expect(dayCount).toBe(1);
  expect(row).toEqual(single);
});

test('endDate on-or-before start is ignored, matching spanEnd', async () => {
  const d1 = iso(3);
  mockForecast([day(d1)]);
  const span = await getEventWeatherSpan(1, 2, { date: d1, endDate: iso(1) });
  expect(span.days).toHaveLength(1);
});

test('mid-event: passed days drop out, primary is today, indices keep their day-of-span truth', async () => {
  const start = iso(-1), today = iso(0), last = iso(1);
  mockForecast([day(today), day(last, { pop: 0.9, weather: [{ main: 'Rain', description: 'rain', icon: '10d' }] })]);
  const span = await getEventWeatherSpan(1, 2, { date: start, endDate: last });
  expect(span.days).toHaveLength(2);
  // Day 1 is gone (yesterday); the rows still know they are Day 2 and Day 3 of 3.
  expect(span.days.map(r => r.dayIndex)).toEqual([2, 3]);
  expect(span.days.every(r => r.dayCount === 3)).toBe(true);
  expect(span.primary.date).toBe(today);
});

test('whole span outside the forecast window: null, and no API call is spent', async () => {
  mockForecast([]);
  expect(await getEventWeatherSpan(1, 2, { date: iso(20), endDate: iso(22) })).toBeNull();
  expect(await getEventWeatherSpan(1, 2, { date: iso(-5), endDate: iso(-3) })).toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();
});
