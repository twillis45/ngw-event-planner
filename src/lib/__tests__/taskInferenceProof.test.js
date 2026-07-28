// ─── "Done by your plan" adversarial proof (brutal audit, host order 2026-07-28) ──
//
// Every label below is a REAL playbook string the audit caught being marked
// satisfied by a weaker fact than the task claims. A false positive here is the
// worst trust failure the checklist can produce: the host checklist DROPS
// effectiveDone rows (ChecklistGenerator) and taskLead can never call them
// overdue — the app hides work that was never done. These tests pin the class,
// not just the instance: presence facts may prove SET-type tasks, never ACTS.
const { taskSatisfied } = require('../taskEngine');

const t = (task) => ({ task });

// The bare-but-typed event that triggered the live sighting: a headcount, a
// venue name, a budget — and absolutely no work done.
const TYPED = {
  guestCount: 10, totalBudget: 4400, date: '2026-09-11',
  venueCity: 'McHenry', venueState: 'MD', venue: 'Lake house',
};

describe('S4 — a typed headcount proves COUNT tasks only', () => {
  test.each([
    'Recruit 3-5 volunteers (setup, grill, registration table, kids, cleanup)',
    'Greet guests; pour welcome drinks and point folks to seats',
    'Point arriving + seated guests to the guest book; make sure everyone signs',
    'Keep kids + pets back',
    'Order cake: flavor, size for headcount, message, pickup time',
    'Fresh food/garnish/flowers; pick up rentals; buy ice last (~1.5 lb/guest)',
    'Walk the whole guest path, not just the room',
    'Confirm the room block or share group hotel options with guests',
  ])('NOT satisfied by a count: %s', (task) => {
    expect(taskSatisfied(TYPED, t(task))).toBe(false);
  });

  test('count tasks ARE still proven by the count', () => {
    expect(taskSatisfied(TYPED, t('Confirm the final headcount'))).toBe(true);
    expect(taskSatisfied(TYPED, t('Lock the guest count'))).toBe(true);
  });
});

describe('S3 — a venue NAME proves venue-booking tasks only', () => {
  test.each([
    'Name a sober point person, set a buddy system + meetup spot, pre-load rideshare, share live location',
    'Check the forecast; confirm a Plan B location/time you are equally happy with; brief everyone on the trigger time',
    'Tour venue/hall: capacity, power for DJ, parking',
    'Test on the ACTUAL screen/projector + speakers at the venue',
  ])('NOT satisfied by a typed venue: %s', (task) => {
    expect(taskSatisfied(TYPED, t(task))).toBe(false);
  });

  test('booking the venue IS proven by a set venue', () => {
    expect(taskSatisfied(TYPED, t('Book the venue'))).toBe(true);
    expect(taskSatisfied(TYPED, t('Issue venue RFP, run site visits, negotiate + sign contract'))).toBe(true);
  });
});

describe('S1/S2 — vendor acts and cross-role proof', () => {
  const BOOKED_PHOTO = { ...TYPED, vendors: [{ name: 'Lens & Co', category: 'Photography', status: 'Booked' }] };
  test.each([
    'Call every vendor to reconfirm dates, counts, dietary, timings, AV',
    'Send run-of-show to every vendor; confirm arrival times; DECIDE the rain plan',
    'Clear and mark the dance floor; place lights; DJ sound check',
    'Give caterer FINAL headcount and dietary list',
    'Book the DJ; share the vibe and the do-not-play list',
  ])('a booked photographer proves none of: %s', (task) => {
    expect(taskSatisfied(BOOKED_PHOTO, t(task))).toBe(false);
  });

  test('the booked photographer DOES prove its own booking task', () => {
    expect(taskSatisfied(BOOKED_PHOTO, t('Book photographer; agree the coverage window'))).toBe(true);
  });

  test('multi-role booking needs EVERY named role booked', () => {
    const oneOfThree = { ...TYPED, vendors: [{ name: 'Petal & Stem', category: 'Florist', status: 'Booked' }] };
    expect(taskSatisfied(oneOfThree, t('Book florist, rentals, baker, officiant'))).toBe(false);
  });
});

describe('S5 — money proof is never vacuous', () => {
  test('a committed vendor with NO money recorded proves nothing about deposits or balances', () => {
    const noMoney = { ...TYPED, vendors: [{ name: "Soul Daddy's", category: 'Catering', status: 'Booked' }] };
    expect(taskSatisfied(noMoney, t('Book caterer and pay deposits'))).toBe(false);
    expect(taskSatisfied(noMoney, t('Settle vendor balances and tips'))).toBe(false);
  });
  test('recorded + paid money DOES prove it', () => {
    const paid = { ...TYPED, vendors: [{ name: "Soul Daddy's", category: 'Catering', status: 'Booked', cost: 900, depositAmt: 300, depositPaid: true, balancePaid: true }] };
    expect(taskSatisfied(paid, t('Pay the caterer deposit'))).toBe(true);
    expect(taskSatisfied(paid, t('Settle vendor balances'))).toBe(true);
  });
});

describe('S6 — one RSVP reply proves sending, not collecting', () => {
  const ONE_REPLY = { ...TYPED, guests: [{ id: 'a', rsvp: 'Yes' }, { id: 'b' }] };
  test('collect/track stay open on a single reply', () => {
    expect(taskSatisfied(ONE_REPLY, t('Mail invitations 6–8 wks out; track RSVPs + meal choices'))).toBe(false);
    expect(taskSatisfied(ONE_REPLY, t('Collect dietary restrictions from RSVPs'))).toBe(false);
  });
  test('sending IS proven by a reply', () => {
    expect(taskSatisfied(ONE_REPLY, t('Send the invitations'))).toBe(true);
  });
});

describe('S7 — a sourcing choice alone is not a menu', () => {
  test('sourcing-only foodChoices does not lock the menu', () => {
    expect(taskSatisfied({ ...TYPED, foodChoices: { sourcing: 'Host cooks everything' } }, t('Lock the menu (incl. a vegetarian main)'))).toBe(false);
  });
  test('real menu content does', () => {
    expect(taskSatisfied({ ...TYPED, foodChoices: { sourcing: 'Host cooks everything', mains: 'Crab boil' } }, t('Lock the menu (incl. a vegetarian main)'))).toBe(true);
  });
});

describe('decisions are not provable by state', () => {
  test.each([
    'Ticketed (paid) or free registration?',
    'At home or a venue / restaurant?',
  ])('this-or-that questions stay open: %s', (task) => {
    expect(taskSatisfied({ ...TYPED, vendors: [{ name: 'X', status: 'Booked', cost: 100, balancePaid: true }] }, t(task))).toBe(false);
  });
});
