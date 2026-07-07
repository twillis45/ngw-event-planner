// MOMENT-PROTECT-1 — annotate-only. The host-NAMED moment (must_have_moment /
// honoree + their song/drink) rides the day-before plan; nothing is ever
// inferred or invented when the fields are empty.

import { buildDayBeforePlan } from '../dayBefore';

const NOW = new Date('2026-07-17T10:00:00');
const ev = (over = {}) => ({ id: 'e-mp', type: 'bbq', date: '2026-07-18', timeline: [], vendors: [], ...over });

test('named must-have moment rides the plan verbatim', () => {
  const p = buildDayBeforePlan(ev({ must_have_moment: 'The toast to Grandma at sunset' }), NOW);
  expect(p.moment).toEqual({ text: 'The toast to Grandma at sunset', sub: null });
});

test('honoree fallback with song/drink touches, host words only', () => {
  const p = buildDayBeforePlan(ev({ honoree: 'Uncle Marcus', honoree_song: 'What You Won’t Do for Love', honoree_drink: 'Old Fashioned' }), NOW);
  expect(p.moment.text).toBe('Uncle Marcus’s moment');
  expect(p.moment.sub).toBe('their song: What You Won’t Do for Love · their drink: Old Fashioned');
});

test('must-have + honoree touches combine', () => {
  const p = buildDayBeforePlan(ev({ must_have_moment: 'The first dance', honoree: 'Mom', honoreeSong: 'At Last' }), NOW);
  expect(p.moment.text).toBe('The first dance');
  expect(p.moment.sub).toBe('Mom — their song: At Last');
});

test('no named moment → no annotation, nothing invented', () => {
  const p = buildDayBeforePlan(ev(), NOW);
  expect(p.moment).toBeNull();
});
