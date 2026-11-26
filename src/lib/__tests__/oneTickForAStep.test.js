// ONE TICK FOR A STEP (B2 the day before, 11/26/2026). hostv4's day-before
// "Tonight" ticks plan steps, and hostv2's checklist already does, with three
// things a tick records besides `done`: a shopping step marks what it names
// bought (foodGot), a step a section can prove ("Send the invite") writes
// that fact, and a send step says nothing was sent. That lived inside hostv2's
// toggleTask; stepToggleEdit is now the one tick both shells call.
import { stepToggleEdit, tonightsSteps } from '../stepToggle';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock('2026-11-25T21:00:00.000Z');

const LIST = [
  { id: 'f-turkey', item: 'Whole turkey (14 lb)', group: 'Mains' },
  { id: 'f-cran', item: 'Fresh cranberries', group: 'Sides' },
  { id: 'f-napkin', item: 'Napkins', group: 'Supplies' },
];
const ev = (timeline, over = {}) => ({
  id: 'e-tick', name: 'Thanksgiving', type: 'Thanksgiving', date: daysFromNow(1),
  createdAt: new Date(Date.now() - 20 * 864e5).toISOString(),
  guestMode: 'count', guestCount: 12, guests: [], vendors: [], budget: [], timeline, ...over,
});

test('a plain step flips, and the message counts what is still open', () => {
  const e = ev([{ id: 'a', task: 'Set the table', leadDays: -1, done: false }, { id: 'b', task: 'Chill the wine', leadDays: 0, done: false }]);
  const ed = stepToggleEdit(e, 0, LIST);
  expect(ed.patch.timeline[0].done).toBe(true);
  expect(ed.patch.timeline[1].done).toBe(false);
  expect(ed.msg).toMatch(/^Done: Set the table… — 1 still open\.$/);
  const back = stepToggleEdit({ ...e, timeline: ed.patch.timeline }, 0, LIST);
  expect(back.patch.timeline[0].done).toBe(false);
  expect(back.msg).toMatch(/^Reopened: Set the table/);
});

test('a shopping step marks what it names bought; reopening never un-buys', () => {
  const e = ev([{ id: 'a', task: 'Buy the turkey', leadDays: -3, done: false }]);
  const ed = stepToggleEdit(e, 0, LIST);
  expect(ed.patch.foodGot).toEqual({ 'f-turkey': true });
  expect(ed.msg).toMatch(/1 item marked bought/);
  const back = stepToggleEdit({ ...e, timeline: ed.patch.timeline, foodGot: ed.patch.foodGot }, 0, LIST);
  expect(back.patch.foodGot).toBeUndefined();
});

test('a send step records nothing sent and says so', () => {
  // A send is known by its declared target (lib/stepTarget), as playbook steps carry it.
  const e = ev([{ id: 'a', task: 'Send the invite', target: 'invite', leadDays: -30, done: false }]);
  const ed = stepToggleEdit(e, 0, LIST);
  expect(ed.patch.timeline[0].done).toBe(true);
  expect(ed.msg).toMatch(/Nothing was sent from here\./);
});

test('tonight: the open steps due today, the evening before the event', () => {
  const e = ev([
    { id: 'a', task: 'Cook the make-ahead dishes', leadDays: -1, done: false },
    { id: 'b', task: 'Set the table', leadDays: -1, done: true },
    { id: 'c', task: 'Order the turkey', leadDays: -14, done: false },
    { id: 'd', task: 'Turkey into the oven', leadDays: 0, done: false },
  ]);
  expect(tonightsSteps(e).map((s) => [s.index, s.task])).toEqual([[0, 'Cook the make-ahead dishes']]);
});
