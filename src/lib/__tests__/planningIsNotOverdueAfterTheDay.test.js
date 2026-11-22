// ─── A PLANNING STEP IS NOT OVERDUE ONCE THE DAY HAS PASSED (audit 2 lane C P0-4) ─
//
// After the date, the checklist counted planning steps as overdue and the count
// CLIMBED with the calendar: Wanda's "Needs you — N overdue" read 12 the day
// of, 21 the day after, 29 a week on. A step whose job was to get the day ready
// is not late after the day — it simply did not happen. Steps owed AFTER the
// day (thank-yous, returns) still come due, counted from the LAST day of a
// multi-day event (P1-4). Every clock is fixed.
import { taskIsOverdue, taskWindowClosed, taskDueInDays, taskDueLabel } from '../taskLead';

const at = (y, mo, d, h = 10) => new Date(y, mo - 1, d, h);
const EV = { id: 'e', type: 'Birthday', date: '2027-03-20', createdAt: '2026-06-01T12:00:00.000Z', timeline: [] };
const PLAN = { id: 't1', task: 'Order the cake', leadDays: -14 };
const DAYOF = { id: 't2', task: 'Set up the tables', leadDays: 0 };
const AFTER = { id: 't3', task: 'Send the thank-you notes', leadDays: 7 };

test('before the day a missed planning step is overdue (unchanged)', () => {
  expect(taskIsOverdue(PLAN, EV, at(2027, 3, 18))).toBe(true);
  expect(taskWindowClosed(PLAN, EV, at(2027, 3, 18))).toBe(true);
});

test('after the day, planning and day-of steps are not overdue and do not count', () => {
  for (const now of [at(2027, 3, 21), at(2027, 3, 27), at(2027, 4, 20)]) {
    expect(taskIsOverdue(PLAN, EV, now)).toBe(false);
    expect(taskIsOverdue(DAYOF, EV, now)).toBe(false);
    expect(taskWindowClosed(PLAN, EV, now)).toBe(false);
    expect(taskWindowClosed(DAYOF, EV, now)).toBe(false);
    expect(taskDueLabel(PLAN, EV, now)).not.toMatch(/past its window/);
  }
});

test('the count does not climb with the calendar after the date', () => {
  const rows = [PLAN, DAYOF, { id: 'x', leadDays: -30 }, { id: 'y', leadDays: -3 }];
  const n = (now) => rows.filter((t) => taskIsOverdue(t, EV, now)).length;
  expect(n(at(2027, 3, 21))).toBe(0);
  expect(n(at(2027, 3, 27))).toBe(0);
});

test('a step owed after the day still comes due', () => {
  expect(taskIsOverdue(AFTER, EV, at(2027, 3, 25))).toBe(false);
  expect(taskIsOverdue(AFTER, EV, at(2027, 3, 29))).toBe(true);
});

test('on a multi-day trip, an after-step counts from the last day (P1-4)', () => {
  const trip = { ...EV, type: 'Group Trip', date: '2027-05-13', endDate: '2027-05-16' };
  // A week after the FIRST day is only three days after the last.
  expect(taskDueInDays(AFTER, trip, at(2027, 5, 20))).toBe(3);
  expect(taskIsOverdue(AFTER, trip, at(2027, 5, 21))).toBe(false);
  expect(taskIsOverdue(AFTER, trip, at(2027, 5, 24))).toBe(true);
  // Mid-trip, a planning step is not yet "after the day".
  expect(taskIsOverdue(PLAN, trip, at(2027, 5, 15))).toBe(true);
});
