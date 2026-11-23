// A lone item with no ask and no action label names itself (batch 11, #229
// Left). When every rung declined (a long declarative title, no CTA or only the
// 'Go' routing sentinel, no bundle), the hero printed "Your next step.", which
// names nothing. #229 taught a bundle to speak for its first item in that
// item's own words; a lone item now speaks the same way, in its own title.
// "Your next step." is left only for an item with no words at all: there is
// nothing truthful to name, and the hero still needs a line.
import { heroAskFor } from '../heroAsk';

const LONG = 'Reconcile the outstanding vendor balance ledger entries';

test('a long title with no CTA is the ask, in its own words', () => {
  expect(heroAskFor({ title: LONG })).toBe(LONG + '.');
});
test("the 'Go' sentinel is still never promoted; the title speaks instead", () => {
  expect(heroAskFor({ title: LONG, cta: 'Go' })).toBe(LONG + '.');
});
test('an authored CTA still outranks the title (the ladder order is unchanged)', () => {
  expect(heroAskFor({ title: LONG, primaryCta: 'Settle the balance' })).toBe('Settle the balance.');
});
test('an empty authored ask falls through to the item instead of the placeholder', () => {
  expect(heroAskFor({ title: LONG, ask: '   ' })).toBe(LONG + '.');
});
test('an item with no words at all keeps the one-line floor', () => {
  expect(heroAskFor({})).toBe('Your next step.');
  expect(heroAskFor({ title: '   ' })).toBe('Your next step.');
});
