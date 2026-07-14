import { taskSatisfied, effectiveDone, cateringSelfProvided, hasNamedVendor } from '../taskEngine';

const t = (task) => ({ task });

describe('taskSatisfied — derives from real event state', () => {
  // C2 — this test previously asserted the BUG on its second line: it pinned
  // "Invite your guests" as DONE because a guest ROW existed (with no reply at all).
  // Adding someone to your list is not inviting them, and a typed headcount cannot
  // prove an invitation was sent. Sending is an ACT; presence never proves an act.
  // Setting the COUNT is still proven by a count — they are different questions.
  test('a guest COUNT is proven by a count — but an INVITATION is not', () => {
    expect(taskSatisfied({ guestCount: 30 }, t('Confirm the final headcount'))).toBe(true);

    // a roster row with no reply proves nothing was ever sent
    expect(taskSatisfied({ guests: [{ id: 'a' }] }, t('Invite your guests'))).toBe(false);
    expect(taskSatisfied({}, t('Invite your guests'))).toBe(false);

    // real evidence the invitations went out: somebody answered
    expect(taskSatisfied({ guests: [{ id: 'a', rsvp: 'Yes' }] }, t('Invite your guests'))).toBe(true);
    expect(taskSatisfied({ guests: [{ id: 'a', rsvp: 'Maybe' }] }, t('Invite your guests'))).toBe(true);
    // …or the host recorded sending them
    expect(taskSatisfied({ guests: [{ id: 'a' }], invitesSentAt: '2026-07-01' }, t('Invite your guests'))).toBe(true);
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

  test('"Set date…" composites are handled the moment the date is set', () => {
    // The playbook setup composite anchors on the date — once the date exists the bundled
    // string drops; the atomic headcount/food dominoes carry on via eventPlan.
    expect(taskSatisfied({ date: '2026-09-01' }, t('Set date, headcount, menu'))).toBe(true);
    expect(taskSatisfied({}, t('Set date, headcount, menu'))).toBe(false);
    expect(taskSatisfied({ date: 'TBD' }, t('Set the date and venue'))).toBe(false);
    expect(taskSatisfied({ date: '2026-09-01' }, t('Set date, headcount, vibe'))).toBe(true);
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
