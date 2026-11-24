// ─── THE MEALS UNANSWERED ARE COUNTED ONCE (owner, 11/24/2026) ────────────────
// The food page's "Dietary needs" row lost its "N meals unanswered" when the
// estimate card's chip was dropped (0a5dc641, "one food page"); the row could
// read "none yet" while guests still had no meal pick. The count comes back,
// from the tally the estimate card already kept (guest.meal, the field RSVPs,
// CSV imports and the per-guest meal edit write), now one function both read.
// The row's words are measured in hostv2/e2e/theBoardPackageFollowUps.spec.mjs.
const { mealTally } = require('../dietRows');

const g = (meal) => ({ name: 'Guest', rsvp: 'Yes', ...(meal === undefined ? null : { meal }) });

test('counts each meal, and the guests who have not picked one', () => {
  const t = mealTally({ guests: [g('Standard'), g('Vegetarian'), g('Standard'), g(), g(''), g('—')] });
  expect(t.counts).toEqual({ Standard: 2, Vegetarian: 1 });
  expect(t.answered).toBe(3);
  expect(t.unanswered).toBe(3);
});

test('with no answers at all there is nothing to count against (no invented gap)', () => {
  expect(mealTally({ guests: [g(), g(), g()] })).toEqual({ counts: {}, answered: 0, unanswered: 0 });
  expect(mealTally({})).toEqual({ counts: {}, answered: 0, unanswered: 0 });
  expect(mealTally(null)).toEqual({ counts: {}, answered: 0, unanswered: 0 });
});
