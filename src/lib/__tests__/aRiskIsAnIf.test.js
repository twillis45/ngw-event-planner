// Gold run (GOLD-01, 11/5/2026): on an event with NO date, "Worth having a plan
// for" read "Final headcount still not confirmed 4 days out" — a playbook
// risk's TRIGGER, the condition to plan for, rendered as if it were the event's
// current state. The lane strips the raiser's "Have a plan for:" prefix; what
// is left must still read as a condition.
import { worryLabel } from '../worryLabel';

test('a playbook trigger reads as a condition', () => {
  expect(worryLabel('Have a plan for: Final headcount still not confirmed 4 days out', { wide: true }))
    .toBe('If final headcount still not confirmed 4 days out');
  expect(worryLabel('Have a plan for: A guest has a shellfish allergy', { wide: true }))
    .toBe('If a guest has a shellfish allergy');
});

test('a worry that states a fact is left as it is', () => {
  expect(worryLabel('Guest food allergies not collected', { wide: true })).toBe('Guest food allergies not collected');
});

test('the phone keeps only the first clause, as before', () => {
  expect(worryLabel('Have a plan for: Toast runs long / open-mic rambles / no one can hear', { wide: false }))
    .toBe('If toast runs long — and more…');
  expect(worryLabel('Have a plan for: Toast runs long / open-mic rambles / no one can hear', { wide: true }))
    .toBe('If toast runs long / open-mic rambles / no one can hear');
});

test('lead-time shorthand still reads in days', () => {
  expect(worryLabel('Have a plan for: Rentals not confirmed by T-14d', { wide: true })).toBe('If rentals not confirmed by 14 days out');
});
