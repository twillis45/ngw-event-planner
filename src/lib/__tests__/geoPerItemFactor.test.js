// ─── ONE MULTIPLIER PER BAND, NEVER TWO ─────────────────────────────────────
//
// The board's stated bar for this feature, and the only real correctness
// condition in it: a mapped line takes its own commodity factor INSTEAD of the
// basket mean, never in addition to it.
//
// Two multipliers on one band is the failure that matters. It never throws, it
// never looks wrong on screen, and it silently overcharges — a mean of 1.06 and a
// beer factor of 1.06 compounding to 1.12 would put every Northeast host's drinks
// budget ~12% over with a straight face. The whole reason this landed in the
// backend rather than a client-side table is to keep exactly one number in the
// path; these tests are what hold that.
//
// The second condition is quieter and just as important: an UNMAPPED line must
// still take the mean. A change that gave mapped lines their factor and
// accidentally dropped everyone else to 1.0 would remove the regional adjustment
// from ~95% of the plan while looking like an improvement.
import { playbookFoodPlan } from '../playbooks';

// Bachelor Party carries `p_beer` with the exact item text 'Beer', which is one
// of the twelve lines geoItemMap allows. Picked by grepping the corpus, not by
// assuming: the first fixture used The Cookout, which has no p_beer line at all,
// and the PREMISE test below is what caught that before any conclusion rested on
// it.
const EVENT = {
  id: 'ev-geo', type: 'Bachelor Party', date: '2027-07-04',
  guestMode: 'count', guestCount: 40, venue: 'The house',
  venueCity: 'Chicago, IL', venueState: 'IL',
};

const lineFor = (plan, id) => (plan.list || []).find((l) => l && l.id === id) || null;

/** Same plan, three ways: no factors, mean only, mean + per-item. */
const plans = (itemFactors) => playbookFoodPlan(EVENT, { priceFactor: 1.5, itemFactors });

describe('a mapped line takes its own factor INSTEAD of the mean', () => {
  test('PREMISE — the fixture really produces a mapped beer line and an unmapped one', () => {
    // Without this the whole file passes over a plan that has neither, which is
    // exactly how a pricing test goes green while measuring nothing.
    const plan = playbookFoodPlan(EVENT, { priceFactor: 1 });
    expect(plan).toBeTruthy();
    const beer = lineFor(plan, 'p_beer');
    expect(beer).toBeTruthy();          // the mapping targets this exact line
    expect((plan.list || []).length).toBeGreaterThan(6);
  });

  test('the mapped line moves by ITS factor, not the mean, and not both', () => {
    const base = playbookFoodPlan(EVENT, { priceFactor: 1 });
    const withMeanOnly = playbookFoodPlan(EVENT, { priceFactor: 1.5 });
    const withItem = plans({ beerMalt: 1.2 });

    const b0 = lineFor(base, 'p_beer');
    const bMean = lineFor(withMeanOnly, 'p_beer');
    const bItem = lineFor(withItem, 'p_beer');
    expect(b0 && bMean && bItem).toBeTruthy();

    // RATIOS, not absolute dollars. toBeCloseTo(x, -1) tolerates +/-5, which on a
    // small band cannot tell 1.2x from 1.8x apart — the first version of this
    // test could not have detected the very overcharge it exists to catch.
    expect(bMean.high).toBeGreaterThan(b0.high);
    const r = bItem.high / b0.high;
    expect(r).toBeGreaterThan(1.15);
    expect(r).toBeLessThan(1.26);                       // ~1.2, its own factor
    // If this ever exceeds 1.5 the band took BOTH multipliers (1.5 x 1.2 = 1.8)
    // — the silent overcharge this whole file exists to prevent.
    expect(r).toBeLessThan(1.5);
  });

  test('an UNMAPPED line still takes the mean', () => {
    // The quiet half. Mapped lines are ~5% of the corpus; if this regressed, the
    // regional adjustment would silently vanish from the other 95%.
    const base = playbookFoodPlan(EVENT, { priceFactor: 1 });
    const withItem = plans({ beerMalt: 1.2 });
    const unmapped = (withItem.list || []).find((l) => l && l.id !== 'p_beer' && l.high > 0 && !l.locked);
    expect(unmapped).toBeTruthy();
    const b0 = lineFor(base, unmapped.id);
    expect(b0).toBeTruthy();
    const r = unmapped.high / b0.high;
    expect(r).toBeGreaterThan(1.45);
    expect(r).toBeLessThan(1.56);                       // the mean, untouched
  });
});

describe('bad or missing per-item data falls back to the mean, never to a guess', () => {
  const cases = [
    ['no itemFactors at all', undefined],
    ['an empty map', {}],
    ['a null map', null],
    ['a nonsense value', { beerMalt: 'lots' }],
    ['a zero', { beerMalt: 0 }],
    ['an absurd factor', { beerMalt: 40 }],
    ['a negative', { beerMalt: -1.2 }],
  ];
  test.each(cases)('%s → the mean still applies', (_label, factors) => {
    const base = playbookFoodPlan(EVENT, { priceFactor: 1 });
    const plan = playbookFoodPlan(EVENT, { priceFactor: 1.5, itemFactors: factors });
    const b0 = lineFor(base, 'p_beer');
    const b1 = lineFor(plan, 'p_beer');
    const r = b1.high / b0.high;
    expect(r).toBeGreaterThan(1.45);
    expect(r).toBeLessThan(1.56);
  });

  test('a factor for an item this plan does not carry changes nothing', () => {
    const a = playbookFoodPlan(EVENT, { priceFactor: 1.5 });
    const b = playbookFoodPlan(EVENT, { priceFactor: 1.5, itemFactors: { potatoes: 0.82 } });
    expect((b.list || []).map((l) => l.high)).toEqual((a.list || []).map((l) => l.high));
  });
});
