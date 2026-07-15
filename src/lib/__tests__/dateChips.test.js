// ─── dateChips — the chip-date helpers keep LOCAL calendar time ───────────────
//
// 2026-07-15 wave-5 over-time fix. The old App.js-local helpers were UTC/local
// split-brained: today8601 was toISOString (after ~8pm ET "Today" wrote tomorrow),
// and nextWeekendISO picked the jump from LOCAL getDay() but added it onto the UTC
// base (Friday 9pm ET "This weekend" wrote SUNDAY). These tests inject the clock
// and compute every expectation from LOCAL components — no hardcoded UTC
// assumptions, so they hold in any test-runner timezone.

import {
  localISO, today8601, addDaysISO, nextWeekendISO, followingWeekendISO,
  addMonthsISO, nextFridayISO, extendSnoozeUntil,
} from '../dateChips';

// Local-constructed instants: same LOCAL calendar date/day-of-week in every TZ.
// 2026-07-17 is a Friday.
const FRI_9PM = new Date(2026, 6, 17, 21, 0, 0);
const SAT_LATE = new Date(2026, 6, 18, 23, 30, 0);
const SUN_NOON = new Date(2026, 6, 19, 12, 0, 0);

test('localISO formats the LOCAL date, whatever the wall clock', () => {
  expect(localISO(new Date(2026, 6, 17, 23, 59, 59))).toBe('2026-07-17');
  expect(localISO(new Date(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
});

test('THE 8PM BUG: today8601 answers the same LOCAL date at every hour of the day', () => {
  // Old code: toISOString().slice — in any UTC-negative zone the evening hours
  // rolled to tomorrow. Sweep all 24 hours; the answer may never move.
  for (let h = 0; h < 24; h++) {
    expect(today8601(new Date(2026, 6, 17, h, 30))).toBe('2026-07-17');
  }
});

test('THE WEEKEND-CHIP BUG: Friday 9pm "This weekend" is SATURDAY, not Sunday', () => {
  // Old code mixed local getDay() (Friday → add 1) with a UTC base that already
  // said Saturday in the evening — writing Sunday. Pin: Saturday, always.
  expect(nextWeekendISO(FRI_9PM)).toBe('2026-07-18');
  // And the same answer at Friday breakfast — the hour may never move the chip.
  expect(nextWeekendISO(new Date(2026, 6, 17, 8, 0))).toBe('2026-07-18');
});

test('weekend chip edges: Saturday is today; Sunday jumps 6 days', () => {
  expect(nextWeekendISO(SAT_LATE)).toBe('2026-07-18');
  expect(nextWeekendISO(SUN_NOON)).toBe('2026-07-25');
});

test('followingWeekendISO is the Saturday after, off the same local clock', () => {
  expect(followingWeekendISO(FRI_9PM)).toBe('2026-07-25');
});

test('nextFridayISO is strictly after today — Friday 9pm answers NEXT Friday', () => {
  expect(nextFridayISO(FRI_9PM)).toBe('2026-07-24');
  expect(nextFridayISO(SAT_LATE)).toBe('2026-07-24');
});

test('addDaysISO never drifts a day: identity add and month rollover', () => {
  expect(addDaysISO('2026-07-17', 0)).toBe('2026-07-17'); // UTC+ zones drifted here
  expect(addDaysISO('2026-01-31', 1)).toBe('2026-02-01');
  expect(addDaysISO(null, 7, FRI_9PM)).toBe('2026-07-24');
  expect(addDaysISO('2026-07-17', -30)).toBe('2026-06-17');
});

test('addMonthsISO keeps the end-of-month guard under the local formatter', () => {
  expect(addMonthsISO(1, new Date(2026, 0, 31, 22, 0))).toBe('2026-02-28');
  expect(addMonthsISO(3, FRI_9PM)).toBe('2026-10-17');
});

describe('extendSnoozeUntil — the decision-board Extend writer', () => {
  test('plain +7d, exactly 7 LOCAL days even at 9pm (never the 8-day hide)', () => {
    expect(extendSnoozeUntil('2026-12-31', 7, FRI_9PM)).toBe('2026-07-24');
    expect(extendSnoozeUntil(null, 7, FRI_9PM)).toBe('2026-07-24');
  });

  test('caps at the day BEFORE the event — never hides a decision past the party', () => {
    // Event 4 days out (2026-07-21): +7 would land AFTER it; cap to the 20th.
    expect(extendSnoozeUntil('2026-07-21', 7, FRI_9PM)).toBe('2026-07-20');
  });

  test('refuses when the cap leaves no room — the decision stays visible', () => {
    expect(extendSnoozeUntil('2026-07-18', 7, FRI_9PM)).toBeNull(); // event tomorrow
    expect(extendSnoozeUntil('2026-07-17', 7, FRI_9PM)).toBeNull(); // event today
    expect(extendSnoozeUntil('2026-07-01', 7, FRI_9PM)).toBeNull(); // event past
  });
});
