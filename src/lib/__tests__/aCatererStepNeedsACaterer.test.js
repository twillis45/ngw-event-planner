// A CATERER STEP NEEDS A BOOKED CATERER (audit 2 lane A P0-3, 11/22/2026).
// "Confirm your caterer and send them the final headcount" read "done by your
// plan" on Vow Renewal, Sweet 16 and Graduation with no caterer booked: the
// words "final headcount" tripped the headcount rule, which a typed guest
// count satisfies. The caterer is the step's subject; a count is not a caterer.
import { taskSatisfied } from '../taskEngine';

const STEP = { task: 'Confirm your caterer and send them the final headcount' };
const base = { type: 'Vow Renewal', guestCount: 60, foodChoices: { food_style: 'Drop-off catering' } };

test('a typed guest count does not close a caterer step with no caterer', () => {
  expect(taskSatisfied(base, STEP)).toBe(false);
});

test('a caterer still only being considered does not close it', () => {
  const ev = { ...base, vendors: [{ id: 'c', name: 'Semper Catering', category: 'Catering', status: 'Quoted', cost: 1500 }] };
  expect(taskSatisfied(ev, STEP)).toBe(false);
});

test('a booked caterer plus the count closes it', () => {
  const ev = { ...base, vendors: [{ id: 'c', name: 'Semper Catering', category: 'Catering', status: 'Contracted', cost: 1500 }] };
  expect(taskSatisfied(ev, STEP)).toBe(true);
});

test('a bare headcount step is still proven by the count', () => {
  expect(taskSatisfied(base, { task: 'Confirm the final headcount' })).toBe(true);
});
