// ─── ONE HEADLINE NUMBER, TWO PRICE BASES ────────────────────────────────────
//
// MEASURED 2026-09-18 on a 150-guest Cookout, sweeping the regional food factor:
//
//     factor            0.90     1.00     1.12
//     foodEstimate      5080     5648     6323     moves
//     suppliesEstimate   808      898     1003     moves
//     capacityEstimate  1453     1453     1453     FLAT
//
// `committed` sums all three. Capacity is 18.2% of it on that event, priced at
// national baseline while the food beside it is priced regionally — and nothing
// said so.
//
// WHY THE FIX IS DISCLOSURE AND NOT A MULTIPLICATION. The factor is a BLS
// Average Price FOOD COMMODITY basket: the backend fetches a grocery basket for
// the region and the nation and takes the mean of the per-item ratios. Chairs,
// tables and glassware are not groceries. Multiplying rental bands by a grocery
// CPI ratio would assert a relationship nobody measured — the same move this
// codebase spent the day removing everywhere else. `vendorEstimator`'s
// METRO_MARKETS is a services index and is the right basis if durables are ever
// genuinely adjusted; that is noted, not guessed at.
import { hostSpending } from '../hostSpending';

const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const COOKOUT = () => ({
  id: 'c', type: 'The Cookout', date: iso(60), guestMode: 'count',
  guestCount: 150, guestEstimate: 150, totalBudget: 26000,
  venueCity: 'Atlanta', venueState: 'GA', foodChoices: {},
});

describe('the mixing is real — the premise, measured', () => {
  test('food and supplies move with the factor; capacity does not', () => {
    // If this ever stops being true the disclosure below is describing nothing.
    const at = (pf) => hostSpending(COOKOUT(), pf);
    const lo = at(0.90); const mid = at(1.00); const hi = at(1.12);
    expect(lo.foodEstimate).toBeLessThan(mid.foodEstimate);
    expect(hi.foodEstimate).toBeGreaterThan(mid.foodEstimate);
    expect(lo.suppliesEstimate).toBeLessThan(mid.suppliesEstimate);
    // The flat one.
    expect(lo.capacityEstimate).toBe(mid.capacityEstimate);
    expect(hi.capacityEstimate).toBe(mid.capacityEstimate);
    expect(mid.capacityEstimate).toBeGreaterThan(0);
  });

  test('and it is a material share of the headline number', () => {
    const s = hostSpending(COOKOUT(), 1.00);
    expect(s.capacityEstimate / s.committed).toBeGreaterThan(0.10);
  });
});

describe('the number declares what it is made of', () => {
  test('a regional factor over a national-priced component reports MIXED', () => {
    expect(hostSpending(COOKOUT(), 1.12).priceBasis.mixed).toBe(true);
    expect(hostSpending(COOKOUT(), 0.90).priceBasis.mixed).toBe(true);
  });

  test('NEGATIVE CONTROL: a factor of 1 mixes nothing', () => {
    // Everything is on the national basis, so there are not two bases to warn
    // about. A flag that is always true is not a flag.
    expect(hostSpending(COOKOUT(), 1.00).priceBasis.mixed).toBe(false);
    expect(hostSpending(COOKOUT()).priceBasis.mixed).toBe(false);
  });

  test('NEGATIVE CONTROL: no national-priced component, nothing to declare', () => {
    // An event with no capacity, vendors, lodging or crab money is priced on one
    // basis throughout, whatever the factor.
    const bare = { id: 'b', type: 'Other', date: iso(60), guestMode: 'count', guestCount: 20, guestEstimate: 20, totalBudget: 500 };
    const s = hostSpending(bare, 1.12);
    expect(s.capacityEstimate).toBe(0);
    expect(s.priceBasis.mixed).toBe(false);
  });

  test('it names which side each component is on', () => {
    const b = hostSpending(COOKOUT(), 1.12).priceBasis;
    expect(b.adjusted).toEqual(['food', 'supplies']);
    expect(b.nationalBaseline).toEqual(['capacity', 'vendorOwed', 'lodging', 'crab']);
    expect(b.factor).toBe(1.12);
  });

  test('the factor is reported as applied, not as passed', () => {
    // A junk factor is coerced to 1 upstream; the disclosure must report what
    // was actually used, or it describes a calculation that did not happen.
    for (const junk of [0, -2, NaN, 'lots', null, undefined]) {
      expect(hostSpending(COOKOUT(), junk).priceBasis.factor).toBe(1);
    }
  });
});

describe('no dollar moved', () => {
  test('adding the disclosure changed no component and no total', () => {
    // The whole point: this commit adds a FACT about the number, not a change
    // to it. Hardcoded from the measurement above.
    const s = hostSpending(COOKOUT(), 1.00);
    expect(s.foodEstimate).toBe(5648);
    expect(s.suppliesEstimate).toBe(898);
    expect(s.capacityEstimate).toBe(1453);
    expect(s.committed).toBe(7999);
  });
});
