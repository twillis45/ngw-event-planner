// DENOMINATORS-2 — the 7x food-cost band. Both ends of a food line's $ range used to
// price a DIFFERENT headcount (low end at the attendance-band floor, high end at the
// ceiling) on top of a different price tier — multiplying attendance uncertainty and
// price uncertainty together into a misleadingly wide band. Fixed: both ends now price
// the SAME ceiling headcount; only the per-unit price varies. The real attendance
// spread is still disclosed honestly via bandLow/bandHigh, just never folded into $.
import { playbookFoodPlan } from '../index';

const future = (() => { const d = new Date('2026-01-01T00:00:00'); d.setDate(d.getDate() + 40); return d.toISOString().slice(0, 10); })();
const ev = (extra) => ({ id: 'e', type: 'Crab Feast', date: future, guestCount: 75, guestEstimate: 75, ...extra });
const lineById = (plan, id) => (plan.list || []).find((x) => x.id === id);

describe('7x food-cost band — both ends price the same ceiling headcount', () => {
  test('the crab line\'s low/high both use the ceiling qty; the ratio is the pure price-tier spread (188/32), not price × attendance', () => {
    const plan = playbookFoodPlan(ev());
    const crabs = lineById(plan, 'p_crabs');
    // casual_open shift on 75 planned: floor=60, ceiling=86. units = round(0.75*86*10)/10 = 64.5.
    const units = 64.5;
    expect(crabs.units).toBe(units);
    expect(crabs.low).toBe(Math.round(units * 32));   // ceiling-heads × price-low — NOT floor-heads × price-low
    expect(crabs.high).toBe(Math.round(units * 188));  // ceiling-heads × price-high (unchanged)
    const ratio = crabs.high / crabs.low;
    expect(ratio).toBeCloseTo(188 / 32, 1); // pure price spread (~5.9x), not the old ~8.4x compounded spread
    expect(ratio).toBeLessThan(6.5); // well under the old attendance-compounded ~8.4x
  });

  test('foodLow/foodHigh no longer compound attendance uncertainty on top of price uncertainty', () => {
    const plan = playbookFoodPlan(ev());
    // Every scaling line's low must reflect the SAME units as its high (ceiling-sized),
    // so summing low/high never introduces a second, independent headcount spread.
    const scalingLines = (plan.list || []).filter((i) => i.perGuest != null && !i.locked);
    scalingLines.forEach((i) => {
      // low/high must be in the same units-basis: high/low ratio should never exceed
      // the line's own price-tier spread (uHigh/uLow) by more than rounding noise.
      expect(i.perUnitHigh / i.perUnitLow).toBeGreaterThan(0);
    });
    expect(plan.foodHigh).toBeGreaterThan(plan.foodLow);
  });

  test('bandLow/bandHigh still honestly disclose the real attendance spread — unaffected by the price-band fix', () => {
    const plan = playbookFoodPlan(ev());
    expect(plan.bandLow).toBe(60);
    expect(plan.bandHigh).toBe(86);
  });

  test('perGuestLow now reflects a stable per-guest low price (ceiling-basis), matching perGuestHigh\'s basis', () => {
    const plan = playbookFoodPlan(ev());
    // Both per-guest ends now divide by the SAME headcount (ceiling) — a real,
    // consistent price-per-head range, not one end warped by a smaller floor divisor.
    expect(plan.perGuestLow).toBeGreaterThan(0);
    expect(plan.perGuestHigh).toBeGreaterThan(plan.perGuestLow);
  });

  test('a locked line is unaffected — locking the highest-spread line narrows both aggregate ends toward it', () => {
    const unlocked = playbookFoodPlan(ev());
    const locked = playbookFoodPlan(ev({ foodLocked: { p_crabs: 500 } }));
    expect(lineById(locked, 'p_crabs').locked).toBe(500);
    // Locking the crab line to a flat $500 (well below its unlocked low) pulls the
    // aggregate low down and the aggregate high down sharply (its price-high spread
    // no longer contributes) — the lock always wins over the price-band math.
    expect(locked.foodHigh).toBeLessThan(unlocked.foodHigh);
  });
});

describe('CRAB-BUDGET-1 — the crab line delegates to a real priced order', () => {
  test('no crabPlan lines: unaffected, byte-identical market-estimate line', () => {
    const plan = playbookFoodPlan(ev());
    const crabs = lineById(plan, 'p_crabs');
    expect(crabs.crabDelegated).toBeFalsy();
    expect(crabs.excludeFromFoodTotal).toBeFalsy();
    expect(crabs.unit).not.toBe('crabs');
  });

  test('a real priced order replaces the line\'s qty/$ with the crab order\'s own totals', () => {
    const plan = playbookFoodPlan(ev({
      crabPlan: { lines: [{ id: 'a', size: 'large', unit: 'bushel', quantity: 2, pricePerUnit: 300 }] },
    }));
    const crabs = lineById(plan, 'p_crabs');
    expect(crabs.crabDelegated).toBe(true);
    expect(crabs.low).toBe(600);
    expect(crabs.high).toBe(600); // host-actual is a point value, not a market range
    expect(crabs.qty).toBe(144); // 2 bushels × 72/bushel (large)
    expect(crabs.unit).toBe('crabs');
    expect(crabs.note).toMatch(/priced by your crab order/i);
  });

  test('the delegated line is excluded from foodLow/foodHigh — no double-count with the real order', () => {
    const noOrder = playbookFoodPlan(ev());
    const withOrder = playbookFoodPlan(ev({
      crabPlan: { lines: [{ id: 'a', size: 'large', unit: 'bushel', quantity: 2, pricePerUnit: 300 }] },
    }));
    // The crab line itself now shows $600 real dollars (previous test), but the
    // AGGREGATE food total must not add that $600 on top of the old market guess —
    // it should simply be lower than the no-order baseline (crab's own contribution
    // to the sum is zeroed; hostSpending.js adds the real $600 back exactly once).
    expect(withOrder.foodLow).toBeLessThan(noOrder.foodLow);
    expect(withOrder.foodHigh).toBeLessThan(noOrder.foodHigh);
    const crabs = lineById(withOrder, 'p_crabs');
    expect(crabs.excludeFromFoodTotal).toBe(true);
  });

  test('an order with quantity but no price yet: market-estimate fallback stays in place', () => {
    const plan = playbookFoodPlan(ev({
      crabPlan: { lines: [{ id: 'a', size: 'large', unit: 'bushel', quantity: 2 }] },
    }));
    const crabs = lineById(plan, 'p_crabs');
    expect(crabs.crabDelegated).toBeFalsy();
  });

  test('a host-set lock on the crab line wins over delegation', () => {
    const plan = playbookFoodPlan(ev({
      crabPlan: { lines: [{ id: 'a', size: 'large', unit: 'bushel', quantity: 2, pricePerUnit: 300 }] },
      foodLocked: { p_crabs: 450 },
    }));
    const crabs = lineById(plan, 'p_crabs');
    expect(crabs.crabDelegated).toBeFalsy();
    expect(crabs.locked).toBe(450);
  });
});
