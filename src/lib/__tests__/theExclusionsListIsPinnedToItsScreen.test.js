// ─── THE LIST THE BUDGET ASK PROMISES TO RENDER ────────────────────────────
//
// `theBudgetAskSaysWhoseMoney.spec.mjs` asserts the budget ask names every
// exclusion, and it does that by naming all eight individually — deliberately,
// so a regression says WHICH line went missing rather than that a count moved.
//
// Bench E of the 2026-10-06 review board named the cost of that choice: the
// spec's literals are typed, not read, so a NINTH exclusion added to the
// engine would never appear on screen and nothing would go red. The spec
// cannot read `notIncludedFor` itself — it is a Playwright module and this is
// a CRA module tree — so the coupling lives here instead.
//
// This is the hinge. If the engine's answer changes, this fails, and whoever
// changes it has to go update the e2e that renders it. That is the whole job:
// it is not guarding the exclusions, it is guarding the OTHER test's premise.
import { notIncludedFor } from '../budgetEstimator';

// Exactly what hostv2/e2e/theBudgetAskSaysWhoseMoney.spec.mjs asserts is on
// screen. Keep the two in step; that is the point of this file existing.
const ON_SCREEN_DESTINATION = [
  'Airfare and ground transfers',
  'Lodging beyond the group block',
  'Travel insurance, visas, or permits',
  'Gifts, favors, and thank-you cards',
  'Outfits and accessories for the guest of honor',
  'Tips and gratuities beyond service charge',
  'Cake / dessert when not included with catering',
  'Pre- or post-event gatherings',
];

describe('the exclusions the budget ask renders are the exclusions the engine holds', () => {
  test('a destination Birthday answers with exactly the eight the screen names', () => {
    expect(notIncludedFor('Birthday', { isDestination: true })).toEqual(ON_SCREEN_DESTINATION);
  });

  test('a local Birthday answers with the five, and is told about no visas', () => {
    const local = notIncludedFor('Birthday', {});
    expect(local).toEqual(ON_SCREEN_DESTINATION.slice(3));
    expect(local.join(' ')).not.toMatch(/visa|airfare|lodging/i);
  });

  test('(premise) the travel lines are what the destination flag adds, nothing else', () => {
    // If this ever stops holding, the two assertions above are testing a
    // coincidence rather than the scoping rule they claim to pin.
    const dest = notIncludedFor('Birthday', { isDestination: true });
    const local = notIncludedFor('Birthday', {});
    expect(dest.length - local.length).toBe(3);
    expect(dest.slice(3)).toEqual(local);
  });
});
