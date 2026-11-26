// ONE BOARD, ONE COUNT OF OPEN STEPS (owner, 11/26/2026: "App is lying
// somewhere"; live check of 9009f21 at 10:00 AM EST). On the day, one Plan board
// read "20 things still open" (the alert), "27 plan steps still open" (the
// run-through card) and "Needs you — 9 overdue" (the checklist row). Each was
// right by its own rule; they read alike and disagreed. Now one reader,
// openStepCounts, gives every surface its numbers and one vocabulary:
//   left: every step not done    → "27 plan steps left"
//   past: the ones past their window, due before the plan or not → "past their window"
// The checklist's red/amber still weighs only the steps that came due after the
// plan existed (taskIsOverdue): a host is not blamed for those, but they are counted.
import { openStepCounts } from '../openSteps';
import { computeDayAlerts } from '../dayAlerts';
import { buildDayBeforePlan } from '../dayBefore';
import { getEventReadiness } from '../../CommandCenter';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock('2026-11-26T15:00:00.000Z');

// leadDays: negative = days before the event. Made 6 days ago, so the −14 and
// −10 steps were already past due when the plan began; −3, −2 and −1 came due
// since. −5 is done; 0 (today) and +3 (after) are not past their window.
const step = (id, leadDays, done = false) => ({ id, task: 'Step ' + id, leadDays, done });
const ev = () => ({
  id: 'e-open', name: 'Thanksgiving', type: 'Thanksgiving', date: daysFromNow(0),
  createdAt: new Date(Date.now() - 6 * 864e5).toISOString(),
  guestMode: 'count', guestCount: 7, guests: [], vendors: [], budget: [],
  timeline: [step('a', -14), step('b', -10), step('c', -5, true), step('d', -3), step('e', -2), step('f', -1), step('g', 0), step('h', 3)],
});
const num = (s) => Number((String(s).match(/\d+/) || [])[0]);

test('the reader: left holds past, past holds late', () => {
  const c = openStepCounts(ev());
  expect(c).toEqual({ left: 7, past: 5, late: 3 });
});

test('the alert, the run-through and the checklist row print the same past count', () => {
  const e = ev();
  const { past, left } = openStepCounts(e);
  const alert = computeDayAlerts(e).find((a) => a.id === 'overdue-tasks');
  expect(alert.headline).toBe(`${past} steps past their window`);
  const tasks = buildDayBeforePlan(e).sections.find((s) => s.key === 'tasks');
  expect(tasks.open).toBe(left);
  expect(tasks.past).toBe(past);
  expect(tasks.detail).toBe(`${left} left, ${past} past their window. Knock out what matters, let the rest go.`);
  const tl = getEventReadiness(e).timeline;
  expect(tl.note).toBe(`${past} past their window`);
  expect(num(tl.note)).toBe(num(alert.headline));
});

test('the checklist only goes red for steps that came due after the plan was made', () => {
  const r = getEventReadiness(ev()).timeline;
  expect(r.overdue).toBe(3);
  expect(r.status).toBe('AT_RISK');
  // Only steps due before the plan existed: counted, not blamed.
  const early = { ...ev(), timeline: [step('a', -14), step('b', -10), step('g', 0)] };
  const r2 = getEventReadiness(early).timeline;
  expect(r2.note).toBe('2 past their window');
  expect(r2.overdue).toBe(0);
  expect(r2.status).toBe('ATTENTION');
});
