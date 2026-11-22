// ─── A CATERER PICK HIDES ONLY WHAT IT RULES OUT (#220 Open, 11/22/2026) ─────
//
// Day Party's "Lock food" step names both paths: "confirm the food truck or
// caterer window, or plan the passed bites + grazing table yourself". The
// checklist's caterer gate drops a step that mentions a caterer once the host
// is NOT using one, so the step vanished exactly when the do-it-yourself half
// was the work: on the default pick (passed bites + grazing) and on "Light
// bites only". A step that also offers doing it yourself is not a caterer
// task, so the gate keeps it; a caterer or truck pick renames it to drop the
// do-it-yourself half (copyByAnswer).
import { playbookChecklist } from '../playbooks';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock();

const ev = (picks) => ({
  id: 'dp-lock', name: 'Day Party', type: 'Day Party', date: daysFromNow(40),
  guestMode: 'count', guestEstimate: 25, guestCountSource: 'host', guests: [], vendors: [], budget: [],
  createdAt: daysFromNow(-10), foodChoices: picks || {},
});
const lock = (picks) => (playbookChecklist(ev(picks)) || []).find((r) => r.id === 'pbt-dp-lock-t_food_lock');

describe('Day Party: the do-it-yourself bites step', () => {
  test.each([
    ['unpicked (the default is passed bites + grazing)', {}],
    ['passed bites + grazing picked', { food: 'Light passed bites + grazing table' }],
    ['light bites only picked', { food: 'Light bites only' }],
  ])('shows when the host is not using a caterer: %s', (_l, picks) => {
    const row = lock(picks);
    expect(row).toBeTruthy();
    expect(row.task).toMatch(/yourself/);
  });
  test.each([
    ['a caterer', 'Caterer drop-off small plates', /caterer/],
    ['a food truck', 'Food truck', /food truck/],
  ])('with %s picked, the step confirms the booking and drops the do-it-yourself half', (_l, pick, names) => {
    const row = lock({ food: pick });
    expect(row).toBeTruthy();
    expect(row.task).toMatch(names);
    expect(row.task).not.toMatch(/yourself|passed bites/);
  });
});

// The gate still drops a caterer-only step when the host cooks: foodApproach.test.js.
