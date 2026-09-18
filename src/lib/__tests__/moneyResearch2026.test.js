// ─── The 2026-09-18 money research pass, made checkable ─────────────────────
//
// `moneyProvenanceShape.test.js` proved the SHAPE was honest while the registry
// was empty. This file covers what happened when someone actually went and
// looked: seven pages retrieved, ONE constant promoted, two contradicted, one
// invented dollar figure deleted outright.
//
// Three things it has to keep true, because each is a way this work could rot:
//
//   1. THE CENSUS IS MEASURED. "1 of 17 grounded" is computed from the live
//      records here, not copied into a comment. A tier edited without evidence
//      moves this number and fails.
//   2. THE PROMOTION IS REAL AND NARROW. factors.serviceCharge is grounded, the
//      shipped 0.20 is unchanged, and NOTHING a host is shown first became
//      grounded — the per-head band, the date premiums and the metro index all
//      still force the 'est.' marker.
//   3. THE REFUSAL HOLDS. The $100-250 last-resort band is gone. Nothing
//      reaches the branch today, and when the branch IS forced, the estimator
//      declines instead of inventing a number.
//
// Negative controls throughout: an unsourced constant must still fail the
// predicate, and a fabricated-looking id must not resolve.

import {
  MONEY_SOURCES, MONEY_PROVENANCE, MONEY_PROVENANCE_META,
  isGroundedMoneyFactor, moneyDisclosure, moneySourcesFor,
  BUDGET_TOTAL_FACTOR_KEYS, VENDOR_RANGE_FACTOR_KEYS,
} from '../budgetEstimator/moneyProvenance';
import {
  estimateTotalRange, PER_HEAD_FALLBACK_PROVENANCE, PER_HEAD_BY_TYPE,
} from '../budgetEstimator/totalEstimate';
import {
  SERVICE_CHARGE_DEFAULT, SERVICE_CHARGE_PROVENANCE, TAX_DEFAULT, TAX_PROVENANCE,
  getServiceTaxFactor, DOW_PREMIUM_PROVENANCE, PEAK_SEASON_PROVENANCE,
} from '../estimatorFactors';

// Sources this pass retrieved and read. Named here so a later edit that
// silently swaps one out is a test failure rather than a diff nobody reviewed.
const RETRIEVED_2026_09_18 = [
  'theknot-realweddings-2026',
  'theknot-cheapest-days-2025',
  'theknot-wedding-season-2026',
  'restaurantcalcs-catering-2026',
  'cateringdirectory-perperson-2026',
  'chefry-catering-2026',
  'wpic-rushfees-2026',
  'grandlady-dayofweek-2026',
];

// ─── 1. The census, measured ────────────────────────────────────────────────

describe('the census — before 1 of 17 records cited anything, and none was grounded', () => {
  const groundedKeys = () => Object.entries(MONEY_PROVENANCE)
    .filter(([, p]) => isGroundedMoneyFactor(p)).map(([k]) => k);
  const citingKeys = () => Object.entries(MONEY_PROVENANCE)
    .filter(([, p]) => p.sources.length > 0).map(([k]) => k);

  test('AFTER: exactly one record is grounded, and META agrees with the data', () => {
    expect(groundedKeys()).toEqual(['factors.serviceCharge']);
    expect(MONEY_PROVENANCE_META.groundedCount).toBe(groundedKeys().length);
    expect(MONEY_PROVENANCE_META.researchedAt).toBe('2026-09-18');
  });

  test('AFTER: nine records cite a real source — citing is not grounding', () => {
    const citing = citingKeys().sort();
    expect(citing).toEqual([
      'budget.categoryShares',
      'budget.perHeadByFamily',
      'budget.perHeadByType',
      'factors.dowPremium',
      'factors.peakWeddingSeason',
      'factors.serviceCharge',
      'sourcing.nonProteinChannel',
      'vendor.metroMarkets',
      'vendor.rushFactor',
    ]);
    // Eight of those nine cite something and are STILL not grounded. That gap
    // is the reason the predicate reads the tier AND the registry.
    const citingButUngrounded = citing.filter((k) => !isGroundedMoneyFactor(MONEY_PROVENANCE[k]));
    expect(citingButUngrounded.length).toBe(8);
  });

  test('the count of records did not change — research adds evidence, not entries', () => {
    expect(Object.keys(MONEY_PROVENANCE).length).toBe(17);
  });

  test('every id any record cites resolves — including all eight new ones', () => {
    for (const id of RETRIEVED_2026_09_18) {
      expect(`${id}: ${MONEY_SOURCES[id] ? 'registered' : 'MISSING'}`).toBe(`${id}: registered`);
    }
    for (const [key, prov] of Object.entries(MONEY_PROVENANCE)) {
      for (const id of prov.sources) {
        expect(`${key} -> ${id}: ${MONEY_SOURCES[id] ? 'ok' : 'DANGLING'}`).toBe(`${key} -> ${id}: ok`);
      }
    }
  });
});

// ─── 2. What a source must carry to be here at all ──────────────────────────

describe('source registry — a page nobody read must not be able to look like one somebody did', () => {
  test('every source added by this pass records the date it was actually FETCHED', () => {
    for (const id of RETRIEVED_2026_09_18) {
      const src = MONEY_SOURCES[id];
      // `fetched` means "this registry's author retrieved and read the page".
      // `recordedAt` means the opposite — inherited, not re-read. The one
      // pre-existing entry uses recordedAt and must not quietly gain a fetched.
      expect(src.fetched).toBe('2026-09-18');
      expect(src.recordedAt).toBeUndefined();
    }
    expect(MONEY_SOURCES['consumer-reports-supermarkets-2026'].recordedAt).toBe('2026-08-21');
    expect(MONEY_SOURCES['consumer-reports-supermarkets-2026'].fetched).toBeUndefined();
  });

  test('every source declares its class, and the honest headline is that none is independent', () => {
    const ALLOWED = ['independent', 'government', 'trade_association', 'commercial_practitioner'];
    for (const [id, src] of Object.entries(MONEY_SOURCES)) {
      expect(`${id}: ${ALLOWED.includes(src.sourceClass) ? 'declared' : `UNDECLARED(${src.sourceClass})`}`)
        .toBe(`${id}: declared`);
    }
    // THE FINDING, kept as an assertion rather than prose: this pass found no
    // independent or government measurement of US event pricing. Every source
    // it registered sells, or represents sellers of, the thing it measures.
    const newClasses = RETRIEVED_2026_09_18.map((id) => MONEY_SOURCES[id].sourceClass);
    expect(newClasses).not.toContain('independent');
    expect(newClasses).not.toContain('government');
    expect(new Set(newClasses)).toEqual(new Set(['commercial_practitioner', 'trade_association']));
  });

  test('every interested source discloses its commercial interest', () => {
    for (const id of RETRIEVED_2026_09_18) {
      const src = MONEY_SOURCES[id];
      expect(Array.isArray(src.limitations)).toBe(true);
      expect(`${id}: ${src.limitations.includes('commercial_interest_disclosed') ? 'disclosed' : 'HIDDEN'}`)
        .toBe(`${id}: disclosed`);
    }
  });

  test('every source carries a claim long enough to hold its own conditionals', () => {
    for (const [id, src] of Object.entries(MONEY_SOURCES)) {
      expect(src.url).toMatch(/^https:\/\//);
      expect(typeof src.org).toBe('string');
      expect(src.org.length).toBeGreaterThan(10);
      // A bare number is not a grounded claim (RESEARCH_DOCTRINE section 6).
      expect(`${id} claim length ${src.claim.length} >= 80`).toBe(`${id} claim length ${src.claim.length} >= 80`);
      expect(src.claim.length).toBeGreaterThanOrEqual(80);
    }
  });

  test('NEGATIVE CONTROL: plausible-looking ids that were never registered do not resolve', () => {
    const fabricated = [
      'theknot-realweddings-2027',
      'us-per-head-survey-2026',
      'bls-event-services-index-2026',
      'weddingwire-leadtime-2026',
      'theknot-dayofweek-2026',
      'catering-service-charge-survey-2026',
    ];
    for (const id of fabricated) {
      expect(`${id}: ${MONEY_SOURCES[id] ? 'RESOLVED' : 'absent'}`).toBe(`${id}: absent`);
      expect(isGroundedMoneyFactor({ tier: 'researched', sources: [id] })).toBe(false);
      expect(moneySourcesFor({ sources: [id] })).toEqual([]);
    }
  });

  test('NEGATIVE CONTROL: one fabricated id poisons a list of real ones', () => {
    expect(isGroundedMoneyFactor({ tier: 'researched', sources: RETRIEVED_2026_09_18 })).toBe(true);
    expect(isGroundedMoneyFactor({
      tier: 'researched', sources: [...RETRIEVED_2026_09_18, 'theknot-realweddings-2027'],
    })).toBe(false);
  });
});

// ─── 3. The one promotion ───────────────────────────────────────────────────

describe('factors.serviceCharge — the only constant this pass could honestly promote', () => {
  test('it is grounded, on three separately published sources', () => {
    expect(SERVICE_CHARGE_PROVENANCE.tier).toBe('researched');
    expect(isGroundedMoneyFactor(SERVICE_CHARGE_PROVENANCE)).toBe(true);
    expect(SERVICE_CHARGE_PROVENANCE.sources.sort()).toEqual([
      'cateringdirectory-perperson-2026',
      'chefry-catering-2026',
      'restaurantcalcs-catering-2026',
    ]);
    expect(moneySourcesFor(SERVICE_CHARGE_PROVENANCE).length).toBe(3);
  });

  test('THE SHIPPED NUMBER DID NOT MOVE TO MEET THE EVIDENCE', () => {
    // 0.20 shipped before this pass and ships after it. A promotion that
    // changed the dollar would be a pricing decision wearing a citation.
    expect(SERVICE_CHARGE_DEFAULT).toBe(0.20);
    // ...and it is inside the band all three sources publish.
    expect(SERVICE_CHARGE_DEFAULT).toBeGreaterThanOrEqual(0.18);
    expect(SERVICE_CHARGE_DEFAULT).toBeLessThanOrEqual(0.22);
    for (const src of moneySourcesFor(SERVICE_CHARGE_PROVENANCE)) {
      expect(src.claim).toMatch(/18\s*-\s*22%|18 to 22 percent/);
    }
  });

  test('the composite it sits in is still ungrounded, because the tax half is not', () => {
    // getServiceTaxFactor returns (1 + service) * (1 + tax). Grounding one
    // factor in a product does not ground the product.
    expect(TAX_DEFAULT).toBe(0.06);
    expect(isGroundedMoneyFactor(TAX_PROVENANCE)).toBe(false);
    expect(TAX_PROVENANCE.sources).toEqual([]);
    expect(moneyDisclosure(['factors.serviceCharge', 'factors.tax']).grounded).toBe(false);
    expect(moneyDisclosure(['factors.serviceCharge', 'factors.tax']).mustMark).toBe(true);
    // A surface asking only about the grounded half WOULD clear the mark — so
    // a surface must pass every contributing key, which is the whole contract.
    expect(moneyDisclosure(['factors.serviceCharge']).grounded).toBe(true);
    expect(moneyDisclosure(['factors.serviceCharge']).marker).toBeNull();
  });

  test('runtime is untouched — the same rates, the same multiplier, the same source tag', () => {
    const d = getServiceTaxFactor(true, null, null);
    expect(d.serviceRate).toBe(0.20);
    expect(d.taxRate).toBe(0.06);
    expect(d.multiplier).toBeCloseTo(1.272, 6);
    expect(d.source).toBe('default');
    // The studio override still wins over the (now grounded) default.
    expect(getServiceTaxFactor(true, 0.18, 0.07).source).toBe('studio');
    expect(getServiceTaxFactor(false).multiplier).toBe(1);
  });
});

// ─── 4. Nothing a host is shown first became grounded ───────────────────────

describe('the numbers a host sees first are all still marked', () => {
  test('the budget composite is ungrounded and every contributor fails the predicate', () => {
    const d = moneyDisclosure(BUDGET_TOTAL_FACTOR_KEYS);
    expect(d.grounded).toBe(false);
    expect(d.mustMark).toBe(true);
    expect(d.marker).toBe('est.');
    expect(d.ungrounded.length).toBe(BUDGET_TOTAL_FACTOR_KEYS.length);
    expect(d.unknownKeys).toEqual([]);
  });

  test('the vendor composite is ungrounded too', () => {
    expect(moneyDisclosure(VENDOR_RANGE_FACTOR_KEYS).grounded).toBe(false);
  });

  test('every key the estimator can actually emit is ungrounded', () => {
    const emitted = new Set();
    for (const type of [...Object.keys(PER_HEAD_BY_TYPE), 'The Cookout', 'Not A Real Type', 'Wellness Retreat']) {
      for (const date of [null, '2026-06-20', '2026-12-31']) {
        for (const isDestination of [false, true]) {
          for (const nights of [0, 3]) {
            const r = estimateTotalRange({
              type, guestCount: 50, date, timeOfDay: 'late', metroFactor: 1.65, isDestination, nights,
            });
            if (r) r.provenanceKeys.forEach((k) => emitted.add(k));
          }
        }
      }
    }
    expect(emitted.size).toBeGreaterThan(5);
    const d = moneyDisclosure([...emitted]);
    expect(d.unknownKeys).toEqual([]);
    expect(d.grounded).toBe(false);
    expect(d.ungrounded.length).toBe(emitted.size);
  });

  test('the two contradicted records kept their shipped numbers and their honest tier', () => {
    // Day of week: the survey puts the Saturday-over-Sunday differential at
    // ~1.2% of total spend; we ship +20%. The number stands, the tier does not
    // move, and the record says so.
    expect(DOW_PREMIUM_PROVENANCE.tier).toBe('trade-heuristic');
    expect(isGroundedMoneyFactor(DOW_PREMIUM_PROVENANCE)).toBe(false);
    expect(DOW_PREMIUM_PROVENANCE.sources.length).toBe(2);
    // Peak season: the month set checked out, the +15% did not.
    expect(PEAK_SEASON_PROVENANCE.tier).toBe('trade-heuristic');
    expect(isGroundedMoneyFactor(PEAK_SEASON_PROVENANCE)).toBe(false);
    expect(PEAK_SEASON_PROVENANCE.sources.length).toBe(3);
  });
});

// ─── 5. The refusal that replaced an invented band ──────────────────────────

describe('budget.perHeadFallback — the $100-250 band is gone, not hidden', () => {
  test('the record survives as a gravestone: no constant, no source, not grounded', () => {
    expect(PER_HEAD_FALLBACK_PROVENANCE).not.toBeNull();
    expect(PER_HEAD_FALLBACK_PROVENANCE.count).toBe(0);
    expect(PER_HEAD_FALLBACK_PROVENANCE.sources).toEqual([]);
    expect(isGroundedMoneyFactor(PER_HEAD_FALLBACK_PROVENANCE)).toBe(false);
    // A deleted constant with no record is indistinguishable from one nobody
    // ever examined. The record is the difference.
    expect(PER_HEAD_FALLBACK_PROVENANCE.appliesTo).toMatch(/NO LONGER A CONSTANT/);
  });

  test('no estimate is ever built from it — re-swept, not inherited from the old note', () => {
    const hostile = ['', ' ', 'Not A Real Type', 'zzzzz', '!!!', 'Blorptacular Summit', '12345',
      'undefined', 'null', 'Wedding-ish', 'événement', '🎉', '__proto__', 'constructor'];
    for (const type of hostile) {
      const r = estimateTotalRange({ type, guestCount: 50 });
      if (!r) continue; // refused: either on the type guard or on the new refusal
      expect(`${JSON.stringify(type)} -> ${r.provenanceKeys.join(',')}`)
        .not.toContain('budget.perHeadFallback');
      // Whatever answered, it answered from a REGISTERED table.
      expect(moneyDisclosure(r.provenanceKeys).unknownKeys).toEqual([]);
    }
  });

  test('unrecognised types are answered by the family table, which is registered', () => {
    for (const type of ['Not A Real Type', 'zzzzz', 'qqqwwweee', 'xyzzy', '12345']) {
      const r = estimateTotalRange({ type, guestCount: 1 });
      expect(r.provenanceKeys).toEqual(['budget.perHeadByFamily']);
    }
  });

  // ── FOUND WHILE PROBING THIS, AND FIXED ──────────────────────────────────
  test('a prototype-key event type no longer produces a NaN estimate credited to the per-head table', () => {
    // BEFORE: `PER_HEAD_BY_TYPE['__proto__']` walked the prototype chain and
    // returned Object.prototype — truthy, with no .low/.high — so the
    // estimator emitted { lowTotal: NaN, highTotal: NaN } and cited
    // 'budget.perHeadByType' as its basis. A number that is not a number,
    // attributed to a row that does not exist.
    // AFTER: the own-property lookup lets them fall through, budgetFamilyForType
    // already answers `undefined` for them, and the new refusal returns null.
    // So this is also the proof the refusal is NOT dead code — it is reached,
    // and what it replaced on this path was a NaN dollar figure.
    for (const type of ['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty']) {
      const r = estimateTotalRange({ type, guestCount: 50 });
      expect(`${type} -> ${r === null ? 'refused' : `${r.lowTotal}-${r.highTotal} via ${r.provenanceKeys}`}`)
        .toBe(`${type} -> refused`);
    }
    // The 17 real rows are own properties and answer exactly as before.
    for (const type of Object.keys(PER_HEAD_BY_TYPE)) {
      expect(estimateTotalRange({ type, guestCount: 50 }).provenanceKeys)
        .toEqual(['budget.perHeadByType']);
    }
  });

  test('it is refusal, not omission: an unresolvable type still returns null, never a crash', () => {
    // The whole reason "delete the literal" was not available on its own: `ph`
    // is dereferenced straight afterwards. This proves the replacement is a
    // defined behaviour on the function's existing null contract.
    expect(estimateTotalRange({ type: null, guestCount: 100 })).toBeNull();
    expect(estimateTotalRange({ type: 'Wedding', guestCount: 0 })).toBeNull();
    expect(estimateTotalRange({ type: '', guestCount: 50 })).toBeNull();
  });
});

// The forced case needs the family resolver to answer nothing, which it never
// does today. Mocked in its own module registry so the sweep above stays real.
describe('budget.perHeadFallback — when the branch IS forced, it declines', () => {
  beforeEach(() => { jest.resetModules(); });
  afterAll(() => { jest.resetModules(); });

  test('a strict family resolver makes the estimator return null, not invent a band', async () => {
    jest.doMock('../budgetEstimator/confidence', () => ({
      ...jest.requireActual('../budgetEstimator/confidence'),
      budgetFamilyForType: () => undefined,
    }));
    const { estimateTotalRange: strict } = await import('../budgetEstimator/totalEstimate');

    // A type with no explicit band and no playbook cost now has nowhere to go.
    // ('Blorptacular Summit' is NOT usable here — "Summit" routes it to a real
    // playbook with an authored per-guest cost, which is the lookup working.)
    for (const type of ['zzzzz', 'qqqwwweee', 'Not A Real Type']) {
      expect(`${type} -> ${JSON.stringify(strict({ type, guestCount: 50 }))}`)
        .toBe(`${type} -> null`);
    }

    // THE POINT: before this change the same call returned a $5,000-12,500
    // estimate built from a dollar figure nobody sourced. Rows that DO have a
    // band are unaffected — the refusal is narrow.
    const stillWorks = strict({ type: 'Wedding', guestCount: 150 });
    expect(stillWorks.lowTotal).toBe(30000);
    expect(stillWorks.highTotal).toBe(75000);
    expect(stillWorks.provenanceKeys).toEqual(['budget.perHeadByType']);
  });
});

// ─── 6. No dollar moved ─────────────────────────────────────────────────────
//
// Locked against a 39,312-case sweep of estimateTotalRange taken immediately
// BEFORE this pass (every canonical type x 6 guest counts x 7 dates x 4 time
// slots x destination x nights x metro). The sweep hashed identically after —
// sha256 3dd1237cc398b66de41c50825ed9c7ad02546b3c465d0d1003f49816c207174c —
// including provenanceKeys, so not one figure and not one attribution changed.
// This is the readable subset.

describe('behaviour lock — a research pass that moved a dollar would be a pricing change', () => {
  const CASES = [
    ['Wedding',          150, null,         'afternoon', 1,    false, 0,  30000,  75000],
    ['Wedding',          150, '2026-06-20', 'evening',   1.65, false, 0,  73500, 183800],
    ['Birthday',          30, null,         'afternoon', 1,    false, 0,   1800,   7500],
    ['Birthday',          30, null,         'afternoon', 1,    true,  0,   6000,  18000],
    ['Gala',             400, '2026-12-31', 'late',      1.65, false, 0, 268100, 643500],
    ['Reunion',           30, null,         'afternoon', 1,    false, 2,   2700,  10800],
    ['The Cookout',       12, null,         'afternoon', 1,    false, 0,    200,    400],
    ['Not A Real Type',   75, null,         'afternoon', 1,    false, 0,   4500,  18800],
    ['Conference',       400, '2026-03-11', 'morning',   1,    false, 0,  51000, 136000],
    ['Wellness Retreat',  12, null,         'afternoon', 1,    true,  5,   9600,  33600],
  ];

  for (const [type, guestCount, date, timeOfDay, metroFactor, isDestination, nights, low, high] of CASES) {
    test(`${type} x${guestCount}${date ? ' ' + date : ''} — $${low}-${high}`, () => {
      const r = estimateTotalRange({ type, guestCount, date, timeOfDay, metroFactor, isDestination, nights });
      expect(r.lowTotal).toBe(low);
      expect(r.highTotal).toBe(high);
      expect(moneyDisclosure(r.provenanceKeys).mustMark).toBe(true);
    });
  }

  test('the per-head table itself is byte-for-byte what it was', () => {
    // The Knot puts the average cost per wedding guest at $292. We ship
    // $200-500, midpoint $350, ~20% above it. REPORTED, NOT APPLIED.
    expect(PER_HEAD_BY_TYPE.Wedding).toEqual({ low: 200, high: 500 });
    expect(PER_HEAD_BY_TYPE.Gala).toEqual({ low: 250, high: 600 });
    expect(PER_HEAD_BY_TYPE.Graduation).toEqual({ low: 50, high: 180 });
    expect(Object.keys(PER_HEAD_BY_TYPE).length).toBe(17);
  });
});
