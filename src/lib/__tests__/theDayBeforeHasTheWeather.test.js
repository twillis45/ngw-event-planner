// THE DAY BEFORE HAS THE WEATHER (owner, 11/26/2026: "Yes add the day-before
// weather heads-up"). The arrivals heads-up (rain, snow, ice, storms) showed on
// Plan's pill and on The Day itself, which is too late to put a mat by the door
// or warn guests. The day-before plan now carries tomorrow's forecast: the line,
// what it asks of arrivals (the same checks The Day ticks), and the note to
// guests. Live forecast only; on the day itself The Day's own card has it.
import { buildDayBeforePlan, dayWeatherLabel } from '../dayBefore';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock('2026-11-25T12:00:00.000Z');

const ev = (over = {}) => ({
  id: 'e-wx', name: 'Thanksgiving', type: 'Thanksgiving', date: daysFromNow(1),
  guestMode: 'count', guestCount: 12, guests: [], budget: [], timeline: [], vendors: [], ...over,
});
const row = (conditions, icon, pop, min = 48, max = 54) => ({ date: daysFromNow(1), conditions, icon, precipitation: pop, temp: { min, max } });
const RAIN = row('moderate rain', '10d', 100);
const CLEAR = row('few clouds', '02d', 0, 34, 62);
const weatherOf = (plan) => plan.sections.find((s) => s.key === 'weather') || null;

test('rain tomorrow: the line, the coats check, and the note to guests', () => {
  const plan = buildDayBeforePlan(ev(), new Date(), RAIN);
  const w = weatherOf(plan);
  expect(w.label).toBe('Tomorrow’s weather');
  expect(w.line).toBe('Moderate rain · 48°–54°F · 100% chance of rain or snow');
  expect(w.checks).toEqual([{ key: 'wx-coats', label: 'A spot by the door for wet coats and umbrellas', checked: false }]);
  expect(w.open).toBe(1);
  expect(w.note).toMatch(/Leave a little extra time to get here, and bring an umbrella\./);
  // It counts toward what still matters, and sits right under the plan steps.
  expect(plan.sections[1].key).toBe('weather');
  expect(plan.openCount).toBe(plan.sections.reduce((n, s) => n + (s.open || 0), 0));
});

test('the check ticked on the day-before plan is the one The Day reads', () => {
  const w = weatherOf(buildDayBeforePlan(ev({ safetyChecked: { 'wx-coats': true } }), new Date(), RAIN));
  expect(w.checks[0].checked).toBe(true);
  expect(w.open).toBe(0);
});

test('a clear day: the line, nothing to do', () => {
  const w = weatherOf(buildDayBeforePlan(ev(), new Date(), CLEAR));
  expect(w.line).toMatch(/^Few clouds · 34°–62°F/);
  expect(w.checks).toEqual([]);
  expect(w.open).toBe(0);
  expect(w.note).toBe(null);
});

test('no forecast, the sample sky, or the day itself: no weather section', () => {
  expect(weatherOf(buildDayBeforePlan(ev(), new Date()))).toBe(null);
  expect(weatherOf(buildDayBeforePlan(ev(), new Date(), { ...RAIN, _sample: true }))).toBe(null);
  expect(weatherOf(buildDayBeforePlan(ev({ date: daysFromNow(0) }), new Date(), { ...RAIN, date: daysFromNow(0) }))).toBe(null);
});

test('two days out names the day, not tomorrow', () => {
  expect(dayWeatherLabel(1)).toBe('Tomorrow’s weather');
  expect(dayWeatherLabel(2)).toBe('The day’s weather');
  expect(weatherOf(buildDayBeforePlan(ev({ date: daysFromNow(2) }), new Date(), { ...RAIN, date: daysFromNow(2) })).label).toBe('The day’s weather');
});
