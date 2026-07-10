// CRAB-PRICING-1 — crab quantity / bushel / mixed-size contract. No fake
// market prices, no bushel-is-cheaper claims, estimates never actuals,
// coverage from real line math only.

import { buildCrabPlan, defaultCountPerUnit, lineCrabCount } from '../crabPlan';

const ev = (crabPlan, over = {}) => ({ id: 'e-crab', type: 'crab feast', guestCount: 25, crabPlan, ...over });
const line = (over = {}) => ({ id: 'l1', size: 'large', unit: 'dozen', quantity: 1, ...over });

test('1 · one dozen line: 12 crabs, dozen count is definitional', () => {
  const p = buildCrabPlan(ev({ lines: [line()] }));
  expect(p.totalEstimatedCrabs).toBe(12);
  expect(defaultCountPerUnit('large', 'dozen')).toBe(12);
});

test('2 · one bushel line uses the researched size default (~72 large) unless the vendor count is entered', () => {
  expect(buildCrabPlan(ev({ lines: [line({ unit: 'bushel' })] })).totalEstimatedCrabs).toBe(72);
  expect(buildCrabPlan(ev({ lines: [line({ unit: 'bushel', estimatedCountPerUnit: 65 })] })).totalEstimatedCrabs).toBe(65);
});

test('3+4 · mixed sizes/units sum across lines (1 bushel large + 2 dozen jumbo)', () => {
  const p = buildCrabPlan(ev({ lines: [
    line({ id: 'a', unit: 'bushel', size: 'large' }),
    line({ id: 'b', unit: 'dozen', size: 'jumbo', quantity: 2 }),
  ] }));
  expect(p.totalEstimatedCrabs).toBe(72 + 24);
  expect(p.mixedSummary).toBe('1 bushel large + 2 dozen jumbo');
});

test('5 · crabs-per-person coverage math', () => {
  const p = buildCrabPlan(ev({ crabEatingHeadcount: 24, lines: [line({ unit: 'bushel' })] }));
  expect(p.coveredCrabsPerPerson).toBe(3);
});

test('6 · no headcount anywhere → needs_headcount with a routed fix', () => {
  const p = buildCrabPlan({ id: 'e', type: 'crab feast', crabPlan: { lines: [line()] } });
  expect(p.coverageStatus).toBe('needs_headcount');
  expect(p.issues.find(i => i.type === 'headcount').route.focusField).toBe('crab-headcount');
});

test('NO-ORDER-YET: headcount known but zero lines entered reads as "no order yet," not "under-ordered at 0"', () => {
  // Regression: totalEstimatedCrabs/heads = 0 must NOT fall through to the
  // under/covered/extra ratio math and read as coverageStatus 'under' with
  // "This covers about 0 crabs per person" — a false shortfall on a host who
  // simply hasn't started ordering.
  const p = buildCrabPlan(ev({ crabEatingHeadcount: 24, lines: [] }));
  expect(p.coverageStatus).toBe('no_order');
  expect(p.coverageStatus).not.toBe('under');
  expect(p.coveredCrabsPerPerson).toBeNull();
  expect(p.coverageCopy).toMatch(/no crab order yet/i);
  expect(p.coverageCopy).not.toMatch(/0 crabs per person/i);
});

test('7 · mixed/unknown size bushel without vendor count → needs_count_per_unit', () => {
  const p = buildCrabPlan(ev({ crabEatingHeadcount: 20, lines: [line({ size: 'mixed', unit: 'bushel' })] }));
  expect(p.coverageStatus).toBe('needs_count_per_unit');
  const iss = p.issues.find(i => i.type === 'count_per_unit');
  expect(iss.copy).toMatch(/count per bushel/);
  expect(iss.route.focusField).toBe('crabline-l1-count');
});

test('8 · missing price → no invented cost, price issue routed to the line', () => {
  const p = buildCrabPlan(ev({ crabEatingHeadcount: 20, lines: [line()] }));
  expect(p.costComplete).toBe(false);
  expect(p.totalEstimatedCost).toBeNull();
  expect(p.issues.find(i => i.type === 'price').route.focusField).toBe('crabline-l1-price');
});

test('9 · explicit prices sum: 1 bushel @$345 + 2 dozen @$150', () => {
  const p = buildCrabPlan(ev({ crabEatingHeadcount: 24, lines: [
    line({ id: 'a', unit: 'bushel', pricePerUnit: 345 }),
    line({ id: 'b', unit: 'dozen', size: 'jumbo', quantity: 2, pricePerUnit: 150 }),
  ] }));
  expect(p.totalEstimatedCost).toBe(345 + 300);
  expect(p.costComplete).toBe(true);
  expect(p.costPerPerson).toBe(Math.round((645 / 24) * 100) / 100);
});

test('10+11 · bought uses bought-marked lines only; estimate never becomes spent', () => {
  const p = buildCrabPlan(ev({ crabEatingHeadcount: 24, lines: [
    line({ id: 'a', unit: 'bushel', pricePerUnit: 345, bought: true }),
    line({ id: 'b', unit: 'dozen', quantity: 2, pricePerUnit: 80 }),
  ] }));
  expect(p.boughtCost).toBe(345);       // only the bought line
  expect(p.totalEstimatedCost).toBe(505); // plan estimate stays separate
});

test('12+13 · bushel nudge fires for big groups, never forces small ones', () => {
  const big = buildCrabPlan(ev({ crabEatingHeadcount: 50, lines: [line()] }));
  expect(big.bushelLikelyUseful).toBe(true);
  expect(big.bushelExplanation).toMatch(/Bushel buying may make sense/);
  const small = buildCrabPlan(ev({ crabEatingHeadcount: 5, targetCrabsPerPerson: 3, lines: [line()] }));
  expect(small.bushelLikelyUseful).toBe(false);
  expect(small.bushelExplanation == null || /Dozens may be easier/.test(small.bushelExplanation)).toBe(true);
});

test('14 · no cheaper/best-price/market claims anywhere in output', () => {
  const p = buildCrabPlan(ev({ crabEatingHeadcount: 50, lines: [line({ unit: 'bushel', pricePerUnit: 345 }), line({ id: 'b', quantity: 2 })] }));
  const all = JSON.stringify(p);
  expect(all).not.toMatch(/cheaper|cheapest|best price|market price|guaranteed|save \$|locked|final\b/i);
});

test('15 · mixed-size coverage copy: "about N crabs per person"', () => {
  const p = buildCrabPlan(ev({ crabEatingHeadcount: 31, lines: [
    line({ id: 'a', unit: 'bushel', size: 'large' }),
    line({ id: 'b', unit: 'dozen', size: 'jumbo', quantity: 2 }),
  ] }));
  expect(p.coverageCopy).toMatch(/about 3.1 crabs per person/);
});

test('16-18 · under / covered / extra statuses', () => {
  const under = buildCrabPlan(ev({ crabEatingHeadcount: 40, lines: [line({ unit: 'bushel' })] })); // 1.8/pp vs 6 target
  expect(under.coverageStatus).toBe('under');
  expect(under.coverageCopy).toMatch(/Add more if crabs are the main food/);
  const covered = buildCrabPlan(ev({ crabEatingHeadcount: 12, lines: [line({ unit: 'bushel' })] })); // 6/pp
  expect(covered.coverageStatus).toBe('covered');
  const extra = buildCrabPlan(ev({ crabEatingHeadcount: 6, targetCrabsPerPerson: 3, lines: [line({ unit: 'bushel' })] })); // 12/pp vs 3
  expect(extra.coverageStatus).toBe('extra');
  expect(extra.coverageCopy).toMatch(/may be extra unless crabs are the main event/);
});

test('21 · handled requires lines + headcount + counts + coverage (never just "crab selected")', () => {
  expect(buildCrabPlan(ev({ lines: [] })).handled).toBe(false);
  expect(buildCrabPlan(ev({ crabEatingHeadcount: 40, lines: [line({ unit: 'bushel' })] })).handled).toBe(false); // under
  expect(buildCrabPlan(ev({ crabEatingHeadcount: 12, lines: [line({ unit: 'bushel' })] })).handled).toBe(true);
  expect(buildCrabPlan(ev({ crabEatingHeadcount: 40, acceptLowerCoverage: true, lines: [line({ unit: 'bushel' })] })).handled).toBe(true);
});

test('non-crab event with no crab plan is not relevant', () => {
  expect(buildCrabPlan({ id: 'e', type: 'birthday' }).relevant).toBe(false);
  expect(buildCrabPlan({ id: 'e', type: 'birthday', crabPlan: { lines: [line()] } }).relevant).toBe(true);
});

test('half-bushel default counts are half the researched bushel', () => {
  expect(defaultCountPerUnit('large', 'half_bushel')).toBe(36);
  expect(lineCrabCount({ size: 'medium', unit: 'half_bushel', quantity: 1 })).toBe(42);
});
