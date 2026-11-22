// BUD-1 — host-friendly budget copy contract. The hero answers in host
// language (what's likely spent, what's left, what needs a price, act or not)
// and NEVER leads with estimate-system words. "spent" is reserved for real
// actuals; quotes/estimates are "known costs" / "spoken for".

import { budgetHeroCopy, unpricedVendorCount, NEAR_BUDGET_HEADROOM } from '../budgetCopy';

const ev = (over = {}) => ({
  id: 'e-bud', recordKind: 'host_event', type: 'Backyard BBQ',
  guests: [], vendors: [], budget: [], timeline: [],
  ...over,
});

// System/estimate words that must never LEAD (the title).
const FORBIDDEN_TITLE = /estimated total|estimate calculated|variance|projection|spend estimate/i;

describe('budgetHeroCopy states', () => {
  test('1. no budget set → set-a-budget hero, no fake numbers', () => {
    const c = budgetHeroCopy(ev(), 1);
    expect(c.state).toBe('unset');
    expect(c.title).toBe('Set a budget so overspend gets flagged early.');
    expect(c.line).toMatch(/you'll see what's left/i);
  });

  test('2. budget set, nothing priced → waiting copy', () => {
    const c = budgetHeroCopy(ev({ totalBudget: 2000 }), 1);
    expect(c.state).toBe('waiting');
    expect(c.title).toBe("Your budget's set — nothing priced yet.");
  });

  test('3. under budget → "about $X left" leads; basis is support copy', () => {
    const c = budgetHeroCopy(ev({ totalBudget: 2000, budget: [{ id: 'r1', category: 'Rentals', actual: 800 }] }), 1);
    expect(c.state).toBe('under');
    expect(c.title).toBe("You've got about $1,200 left.");
    // Owner ruling 11/22/2026 ("Expected spending"): judged on expected cost;
    // what is booked stays visible as the secondary clause.
    expect(c.line).toMatch(/based on \$800 expected against your \$2,000 budget/i);
    expect(c.line).toMatch(/\$800 of it booked so far/);
    expect(c.line).toMatch(/\$800 spent so far/); // rows' actual IS real spend
  });

  test('4. near budget (inside the headroom threshold) → getting-close copy', () => {
    const c = budgetHeroCopy(ev({ totalBudget: 2000, budget: [{ id: 'r1', category: 'Rentals', actual: 1900 }] }), 1);
    expect(c.state).toBe('near');
    expect(c.title).toBe("You're getting close to your budget.");
    expect(c.line).toMatch(/leave about \$100/i);
    expect(NEAR_BUDGET_HEADROOM).toBe(0.15);
  });

  test('5. over budget → direct expected-over headline + review action', () => {
    const c = budgetHeroCopy(ev({ totalBudget: 2000, budget: [{ id: 'r1', category: 'Rentals', actual: 2600 }] }), 1);
    expect(c.state).toBe('over');
    expect(c.title).toBe('Expected costs are $600 over your budget.');
    expect(c.line).toMatch(/review costs before adding more commitments/i);
  });

  test('6. unpriced vendors → caveat appears, counts only named vendors without a price', () => {
    const e = ev({
      totalBudget: 2000,
      budget: [{ id: 'r1', category: 'Rentals', actual: 500 }],
      vendors: [
        { id: 'v1', name: 'Beltway Sound Collective' },            // unpriced
        { id: 'v2', name: 'Capital Rotisserie', cost: 900 },       // priced
        { id: 'v3', name: '' },                                     // unnamed slot — ignored
      ],
    });
    expect(unpricedVendorCount(e)).toBe(1);
    expect(budgetHeroCopy(e, 1).caveat).toBe('1 vendor is still unpriced, so this can change.');
    expect(budgetHeroCopy(ev({ totalBudget: 2000, budget: [{ id: 'r1', actual: 500 }] }), 1).caveat).toBeNull();
  });

  test('7. "spent" only appears when real actuals exist', () => {
    // committed comes from planned food with zero bought → no "spent" wording
    const foodOnly = budgetHeroCopy(ev({
      totalBudget: 2000, guestCount: 20, guestMode: 'count',
      foodPlanChoice: 'cook',
    }), 1);
    if (foodOnly.state === 'under' || foodOnly.state === 'near') {
      expect(foodOnly.numbers.spent).toBe(0);
      expect(foodOnly.line).not.toMatch(/spent/i);
    }
  });

  test('8. no state leads with estimate-system language', () => {
    const states = [
      budgetHeroCopy(ev(), 1),
      budgetHeroCopy(ev({ totalBudget: 2000 }), 1),
      budgetHeroCopy(ev({ totalBudget: 2000, budget: [{ id: 'r', actual: 500 }] }), 1),
      budgetHeroCopy(ev({ totalBudget: 2000, budget: [{ id: 'r', actual: 1950 }] }), 1),
      budgetHeroCopy(ev({ totalBudget: 2000, budget: [{ id: 'r', actual: 2500 }] }), 1),
    ];
    states.forEach(c => expect(c.title).not.toMatch(FORBIDDEN_TITLE));
    // and estimates are never called paid
    states.forEach(c => expect(c.title + ' ' + c.line).not.toMatch(/\bpaid\b/i));
  });
});

// Owner ruling 11/22/2026 ("Expected spending", audit 2 D-03): the hero judges
// over/under on EXPECTED cost — the basis After and the recovery panel use —
// so an estimate past the budget reads over before anything is booked.
describe('Your money judges on expected cost', () => {
  const { expectedHeadroom } = require('../budgetCopy');
  test('expected over the budget with little booked reads over, and says expected', () => {
    const e = ev({ totalBudget: 1000, budget: [{ id: 'r1', category: 'Food', budgeted: 1400 }, { id: 'r2', category: 'Venue', actual: 200 }] });
    const c = budgetHeroCopy(e, 1);
    expect(c.numbers.expected).toBeGreaterThan(1000);
    expect(c.state).toBe('over');
    expect(c.title).toMatch(/^Expected costs are \$[\d,]+ over your budget\.$/);
    expect(c.line).toMatch(/booked so far|none of it booked yet/);
  });
  test('expectedHeadroom is budget less expected, null with no budget', () => {
    expect(expectedHeadroom({ planned: 1000, expected: 1225 })).toBe(-225);
    expect(expectedHeadroom({ planned: 1000, expected: 400 })).toBe(600);
    expect(expectedHeadroom({ planned: 0, expected: 400 })).toBeNull();
  });
});
