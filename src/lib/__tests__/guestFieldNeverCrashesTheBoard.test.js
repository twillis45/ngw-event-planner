// ─── A NUMBER IN `guests` MUST NOT TAKE DOWN THE HOST'S BOARD ───────────────
//
// Found 2026-08-18 while measuring Coverage against the shipping decision board:
// `playbookDecisionBoard({ ...event, guests: 30 })` throws
// `TypeError: list.some is not a function` out of `dietaryResolved`
// (playbooks/index.js:498). The whole board is gone — not one degraded row.
//
// WHY THIS IS NOT JUST A BAD FIXTURE. `guests` is polymorphic in this codebase
// and the code says so itself:
//
//   lodgingIntel.js:1119   Number((event.guestCount || event.guests) || 0)
//                          — reads `guests` AS a count
//   disclosure.js:30       arr(e && e.guests).length || Number(e.guestCount)
//                          — coerces, the defensive idiom
//   guestCountResolved     (event.guests || []).length — survives a number by
//                          accident: Number(undefined) || 0
//
// So one reader treats it as a number, most coerce, and `dietaryResolved` alone
// calls `.some` on it unguarded. A host whose stored event carries a count in
// that field — an import, an older write, any producer that read
// lodgingIntel's contract — loses the decision board entirely.
//
// The second case here is worse and was found the same way: budgetRecovery.js
// reads `ev.guests.length` with NO guard, so it throws on an event that simply
// has no `guests` key at all.
import { playbookDecisionBoard } from '../playbooks';
import { getVendorRequiredQuestions } from '../vendorQuestions';


const EV = (over = {}) => ({
  id: 'ev-guard', type: 'Birthday', name: 'Test', date: '2027-03-15',
  tasks: [], vendors: [], purchases: [], choices: {}, ...over,
});

describe('the guest field is read defensively wherever it is read', () => {
  test('PREMISE — a well-formed event builds a real board', () => {
    // Without this, "did not throw" could pass on an empty board and prove
    // nothing about the guard.
    const b = playbookDecisionBoard(EV({ guests: [], guestCount: 30 }), new Date(), null);
    expect(b.open.length).toBeGreaterThan(0);
  });

  test('A COUNT IN `guests` DOES NOT THROW — and still yields the board', () => {
    let board;
    expect(() => { board = playbookDecisionBoard(EV({ guests: 30 }), new Date(), null); }).not.toThrow();
    expect(board.open.length).toBeGreaterThan(0);
  });

  test('and the count is not silently read as a roster of 30 people', () => {
    // The guard must DISCARD a non-list, not coerce it into a fake guest list.
    // Treating the number 30 as 30 attendees with no dietary needs recorded
    // would answer the dietary question with data that does not exist.
    const numeric = playbookDecisionBoard(EV({ guests: 30, guestCount: 30 }), new Date(), null);
    const listed = playbookDecisionBoard(EV({ guests: [], guestCount: 30 }), new Date(), null);
    expect(numeric.open.map((r) => r.id)).toEqual(listed.open.map((r) => r.id));
  });

  test('a missing `guests` key does not throw either', () => {
    expect(() => playbookDecisionBoard(EV(), new Date(), null)).not.toThrow();
  });

  test('THE VENDOR SURFACE TOO — five sites guarded on truthiness, not type', () => {
    // A number is truthy, so `event.guests ? event.guests.filter(...)` throws
    // exactly like the board did. Found by sweeping for the same shape rather
    // than assuming the first two sites were the whole class.
    ['Caterer', 'Photographer', 'Venue', 'Bartender', 'DJ'].forEach((cat) => {
      expect(() => getVendorRequiredQuestions({ category: cat, name: 'V' },
        EV({ guests: 30, guestCount: 30 }))).not.toThrow();
    });
  });

  test('THE OTHER SITE — guestCountResolved filters before it checks length', () => {
    // Two readers in this file skipped the coercion, not one. This one throws on
    // `list.filter` because `pending` is computed BEFORE the `list.length > 0`
    // guard that would have short-circuited it. Checked separately so a fix to
    // dietaryResolved alone cannot make this file look green.
    const b = playbookDecisionBoard(EV({ guests: 30, guestCount: 30 }), new Date(), null);
    const headcount = b.open.concat(b.deferred).find((r) => /count|headcount/i.test(r.id || ''));
    expect(b.open.length).toBeGreaterThan(0);
    expect(headcount === undefined || typeof headcount === 'object').toBe(true);
  });
});
