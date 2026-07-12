// CRAB-PRICING-1 — crab quantity / bushel / mixed-size contract. No fake
// market prices, no bushel-is-cheaper claims, estimates never actuals,
// coverage from real line math only.

import { buildCrabPlan, defaultCountPerUnit, lineCrabCount, recommendCrabOrder } from '../crabPlan';

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

test('PICKERS-GUARDRAIL: a picker count above the guest list is clamped for coverage math, not silently stored over', () => {
  // 25 guests (the ev() default), host types 75 pickers — impossible, since
  // pickers are a subset of guests. Coverage math must use 25, not 75, and
  // the host must be told why (never a silent override).
  const p = buildCrabPlan(ev({ crabEatingHeadcount: 75, lines: [line({ unit: 'bushel' })] }));
  expect(p.crabEatingHeadcount).toBe(25);
  expect(p.pickerNote).toMatch(/can.t outnumber your 25 guests/i);
  expect(p.coveredCrabsPerPerson).toBe(72 / 25);
});

test('PICKERS-GUARDRAIL: pickers within the guest count pass through with no note', () => {
  const p = buildCrabPlan(ev({ crabEatingHeadcount: 18, lines: [line({ unit: 'bushel' })] }));
  expect(p.crabEatingHeadcount).toBe(18);
  expect(p.pickerNote).toBeNull();
});

test('DENOMINATORS-1: pickers set below the guest count get a neutral reconciling note ("N of your M guests"), not a warning', () => {
  const p = buildCrabPlan(ev({ crabEatingHeadcount: 18, lines: [line({ unit: 'bushel' })] }));
  expect(p.pickerReconcileNote).toBe('18 of your 25 guests are picking crabs.');
  expect(p.pickerNote).toBeNull(); // the clamp warning field stays separate/unused here
});

test('DENOMINATORS-1: no reconcile note when pickers default to the full guest count (nothing to reconcile)', () => {
  const p = buildCrabPlan(ev({ lines: [line({ unit: 'bushel' })] }));
  expect(p.crabEatingHeadcount).toBe(25);
  expect(p.pickerReconcileNote).toBeNull();
});

test('DENOMINATORS-1: the clamp case still uses the warning field, not the reconcile field', () => {
  const p = buildCrabPlan(ev({ crabEatingHeadcount: 75, lines: [line({ unit: 'bushel' })] }));
  expect(p.pickerNote).toMatch(/can.t outnumber your 25 guests/i);
  expect(p.pickerReconcileNote).toBeNull();
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
  // guestCount raised to 40 so the 31-picker fixture stays under the
  // PICKERS-GUARDRAIL ceiling (pickers can't exceed guests) — this test is
  // about the per-person copy format, not the guardrail.
  const p = buildCrabPlan(ev({ crabEatingHeadcount: 31, lines: [
    line({ id: 'a', unit: 'bushel', size: 'large' }),
    line({ id: 'b', unit: 'dozen', size: 'jumbo', quantity: 2 }),
  ] }, { guestCount: 40 }));
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

describe('RECOMMEND-1 — recommendCrabOrder: a real starting mix', () => {
  test('no order yet, small group → dozens, sized to target', () => {
    // 25 guests × 6/person target = 150... but crabEatingHeadcount unset means
    // heads = guestCount fallback = 25 by default in ev(); use a small explicit
    // headcount so the dozen-only branch (<60 total) is exercised.
    const r = recommendCrabOrder(ev({ crabEatingHeadcount: 6, targetCrabsPerPerson: 3, lines: [] }));
    expect(r).not.toBeNull();
    expect(r.lines.every(l => l.unit === 'dozen')).toBe(true);
    expect(r.totalCrabs).toBeGreaterThanOrEqual(6 * 3 * 0.8); // roughly on target, dozen-rounded
  });

  test('large group clears the 60-crab threshold → bushels, matching bushelLikelyUseful', () => {
    const r = recommendCrabOrder(ev({ crabEatingHeadcount: 30, lines: [] })); // 30 × 6 = 180 target
    expect(r.lines.some(l => l.unit === 'bushel')).toBe(true);
    expect(r.totalCrabs).toBeGreaterThan(60);
  });

  test('kids reduce the effective picker count, and it says so', () => {
    const withKids = recommendCrabOrder(ev({ crabEatingHeadcount: 20, lines: [] }, { kidsCount: 10 }));
    const noKids = recommendCrabOrder(ev({ crabEatingHeadcount: 20, lines: [] }));
    expect(withKids.effectivePickers).toBeLessThan(noKids.effectivePickers);
    expect(withKids.note).toMatch(/kids eat less/i);
    expect(noKids.note).not.toMatch(/kids eat less/i);
  });

  test('returned lines are real editable stubs — quantity/unit/size/estimatedCountPerUnit all present', () => {
    const r = recommendCrabOrder(ev({ crabEatingHeadcount: 30, lines: [] }));
    r.lines.forEach(l => {
      expect(typeof l.quantity).toBe('number');
      expect(typeof l.unit).toBe('string');
      expect(typeof l.size).toBe('string');
      expect(typeof l.estimatedCountPerUnit).toBe('number');
    });
  });

  test('summary is a real mixed-order sentence, matching mixedSummary style', () => {
    const r = recommendCrabOrder(ev({ crabEatingHeadcount: 30, lines: [] }));
    expect(r.summary).toMatch(/large/);
  });

  test('non-crab event with no crab plan → null (not relevant)', () => {
    expect(recommendCrabOrder({ id: 'e', type: 'birthday' })).toBeNull();
  });

  test('no headcount anywhere → null, not a garbage recommendation', () => {
    expect(recommendCrabOrder({ id: 'e', type: 'crab feast', crabPlan: { lines: [] } })).toBeNull();
  });
});
