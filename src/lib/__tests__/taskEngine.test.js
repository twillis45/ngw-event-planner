import { taskSatisfied, effectiveDone, cateringSelfProvided, hasNamedVendor } from '../taskEngine';

const t = (task) => ({ task });

describe('taskSatisfied — derives from real event state', () => {
  test('guest tasks satisfied once a count/roster exists', () => {
    expect(taskSatisfied({ guestCount: 30 }, t('Confirm the final headcount'))).toBe(true);
    expect(taskSatisfied({ guests: [{ id: 'a' }] }, t('Invite your guests'))).toBe(true);
    expect(taskSatisfied({}, t('Invite your guests'))).toBe(false);
  });

  test('budget tasks satisfied once a budget exists', () => {
    expect(taskSatisfied({ totalBudget: 500 }, t('Set the budget'))).toBe(true);
    expect(taskSatisfied({ budget: [{ budgeted: 100 }] }, t('Set a spending plan'))).toBe(true);
    expect(taskSatisfied({}, t('Set the budget'))).toBe(false);
  });

  test('venue tasks satisfied once a real venue is set (not TBD)', () => {
    expect(taskSatisfied({ venue: "Host's home" }, t('Book the venue'))).toBe(true);
    expect(taskSatisfied({ venue: 'TBD' }, t('Book the venue'))).toBe(false);
    expect(taskSatisfied({}, t('Secure the space'))).toBe(false);
  });

  test('generic vendor tasks satisfied once a named vendor exists', () => {
    expect(taskSatisfied({ vendors: [{ name: 'DJ Sol' }] }, t('Book entertainment / DJ'))).toBe(true);
    expect(taskSatisfied({ vendors: [{ name: '' }] }, t('Book the photographer'))).toBe(false);
    expect(taskSatisfied({}, t('Book the photographer'))).toBe(false);
  });
});

describe('choices are engine inputs — sourcing toggles ripple into caterer tasks', () => {
  test('caterer task DROPS when the host self-provides food (cook / potluck)', () => {
    expect(taskSatisfied({ foodChoices: { sourcing: 'Host cooks everything' } }, t('Book the caterer'))).toBe(true);
    expect(taskSatisfied({ foodChoices: { sourcing: 'Potluck — guests bring a dish' } }, t('Confirm catering headcount'))).toBe(true);
  });

  test('caterer task STAYS when the host is hiring a caterer and none booked yet', () => {
    expect(taskSatisfied({ foodChoices: { sourcing: 'Hire a caterer' } }, t('Book the caterer'))).toBe(false);
  });

  test('caterer task satisfied either way once a real caterer vendor exists', () => {
    expect(taskSatisfied({ foodChoices: { sourcing: 'Hire a caterer' }, vendors: [{ name: "Soul Daddy's" }] }, t('Book the caterer'))).toBe(true);
  });

  test('cateringSelfProvided reads the sourcing choice', () => {
    expect(cateringSelfProvided({ foodChoices: { sourcing: 'Host cooks the mains' } })).toBe(true);
    expect(cateringSelfProvided({ foodChoices: { sourcing: 'Hire a caterer' } })).toBe(false);
    expect(cateringSelfProvided({})).toBe(false);
  });
});

describe('effectiveDone — manual done OR engine-proven', () => {
  test('manual done still counts (override for the unmatched tail)', () => {
    expect(effectiveDone({}, { task: 'Buy nice candles', done: true })).toBe(true);
    expect(effectiveDone({}, { task: 'Buy nice candles', done: false })).toBe(false);
  });
  test('engine state makes a task done without any checkoff', () => {
    expect(effectiveDone({ guestCount: 20 }, { task: 'Confirm headcount', done: false })).toBe(true);
  });
  test('hasNamedVendor guards on a real name', () => {
    expect(hasNamedVendor({ vendors: [{ name: 'Lens & Co' }] })).toBe(true);
    expect(hasNamedVendor({ vendors: [{}] })).toBe(false);
  });
});
