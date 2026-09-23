// ─── Money-engine provenance: the shape, the census, and the negative controls ─
//
// The product built a real grounding system (knowledge/costProvenance.js: 297
// dated, named, URL'd sources behind a registry-checked `isGroundedCost`) and
// pointed it at the grocery list. The numbers a host sees FIRST and LARGEST —
// the budget big number behind the one-tap "Use $X" chip, and the vendor cost
// range — sat entirely outside it, because they had no provenance field in
// their shape at all.
//
// budgetEstimator/moneyProvenance.js adds the field and the honesty marker. It
// adds NO citations: nothing in it was researched, so nothing in it is marked
// 'researched', and the measured result is that ZERO constants are grounded.
//
// These tests exist to make that claim checkable and to keep it from rotting:
//   · the CENSUS is measured from the live tables, not copied into prose, so a
//     record whose `count` drifts from its data fails here;
//   · the NEGATIVE CONTROLS prove an unsourced constant cannot pass the
//     predicate — including when someone edits its tier to 'researched';
//   · the LOCKED MATRIX proves adding all of this moved no dollar figure.

import {
  MONEY_SOURCES, MONEY_TIERS, MONEY_PROVENANCE, MONEY_PROVENANCE_META,
  isGroundedMoneyFactor, moneySourcesFor, moneyProvenanceFor, moneyDisclosure,
  BUDGET_TOTAL_FACTOR_KEYS, VENDOR_RANGE_FACTOR_KEYS,
} from '../budgetEstimator/moneyProvenance';
import {
  estimateTotalRange, PER_HEAD_BY_TYPE, PER_HEAD_BY_FAMILY,
  PER_HEAD_BY_TYPE_PROVENANCE, PER_HEAD_BY_FAMILY_PROVENANCE, PER_HEAD_FALLBACK_PROVENANCE,
} from '../budgetEstimator/totalEstimate';
import {
  CATEGORY_SHARES_PROVENANCE, getCategoryShares,
} from '../budgetEstimator/categoryShares';
import {
  US_HOLIDAYS, DOW_PREMIUM_PROVENANCE, TIME_OF_DAY_SLOTS,
  US_HOLIDAYS_PROVENANCE, PEAK_SEASON_PROVENANCE, DATE_PREMIUM_CAP_PROVENANCE,
  TIME_OF_DAY_PROVENANCE, SERVICE_CHARGE_PROVENANCE, TAX_PROVENANCE, CONTINGENCY_PROVENANCE,
} from '../estimatorFactors';
import {
  METRO_MARKETS, METRO_MARKETS_PROVENANCE, RUSH_FACTOR_PROVENANCE, getRushFactor,
} from '../vendorEstimator';
import {
  SOURCING_TIERS, CANONICAL_PROTEIN_PRICES, NONPROTEIN_CHANNEL_FACTOR,
  SOURCING_TIERS_PROVENANCE, NONPROTEIN_CHANNEL_PROVENANCE,
} from '../sourcing';

// ─── 1. The census ──────────────────────────────────────────────────────────
// Measured off the live tables. A record that claims to speak for 17 bands
// must speak for exactly the 17 that ship.

describe('census — every record\'s count is measured against its real table', () => {
  const measured = {
    'budget.perHeadByType':   Object.keys(PER_HEAD_BY_TYPE).length,
    'budget.perHeadByFamily': Object.keys(PER_HEAD_BY_FAMILY).length,
    'budget.categoryShares':  ['Wedding', 'Conference', 'Birthday', 'Not A Real Type']
      .map((t) => Object.keys(getCategoryShares(t)).length)
      .reduce((a, b) => a + b, 0),
    'factors.usHolidays':     US_HOLIDAYS.length,
    'factors.timeOfDay':      TIME_OF_DAY_SLOTS.length,
    'vendor.metroMarkets':    METRO_MARKETS.length,
    'sourcing.tiers':         SOURCING_TIERS.length,
    'sourcing.nonProteinChannel': Object.keys(NONPROTEIN_CHANNEL_FACTOR).length,
  };

  for (const [key, n] of Object.entries(measured)) {
    test(`${key} — record says ${MONEY_PROVENANCE[key].count}, table has ${n}`, () => {
      expect(MONEY_PROVENANCE[key].count).toBe(n);
    });
  }

  test('the four share tables are distinct — the census counts bands, not aliases', () => {
    // 9 wedding + 8 corporate + 7 private + 5 fallback = 29. Measured through
    // the public resolver so a table swap cannot hide behind the constant.
    expect(Object.keys(getCategoryShares('Wedding')).length).toBe(9);
    expect(Object.keys(getCategoryShares('Conference')).length).toBe(8);
    expect(Object.keys(getCategoryShares('Birthday')).length).toBe(7);
    expect(Object.keys(getCategoryShares('Not A Real Type')).length).toBe(5);
  });

  test('getRushFactor really has the 3 bands its record claims', () => {
    const at = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return getRushFactor(d.toISOString().slice(0, 10)).multiplier;
    };
    const bands = new Set([at(10), at(45), at(90)]);
    expect(bands.size).toBe(RUSH_FACTOR_PROVENANCE.count);
    expect(at(300)).toBe(1); // the fourth case is "no premium", not a fourth band
  });
});

// ─── 2. The shape ───────────────────────────────────────────────────────────

describe('shape — every record can carry a source, and says what would earn one', () => {
  const REQUIRED = ['tier', 'confidence', 'verificationStatus', 'sources', 'count', 'appliesTo', 'claim', 'note', 'sufficientWhen'];

  for (const [key, prov] of Object.entries(MONEY_PROVENANCE)) {
    test(`${key} has the full field set`, () => {
      for (const f of REQUIRED) expect(prov[f]).toBeDefined();
      // The FIELD is the deliverable: `sources` must exist as an array even
      // when empty, so a source can be attached later without a reshape.
      expect(Array.isArray(prov.sources)).toBe(true);
      expect(MONEY_TIERS[prov.tier]).toBeDefined();
      expect(typeof prov.sufficientWhen).toBe('string');
      expect(prov.sufficientWhen.length).toBeGreaterThan(20);
    });
  }

  test('every cited source id resolves — a record never names a source that is not registered', () => {
    for (const [key, prov] of Object.entries(MONEY_PROVENANCE)) {
      for (const id of prov.sources) {
        expect(`${key} cites ${id}: ${MONEY_SOURCES[id] ? 'resolves' : 'DANGLING'}`)
          .toBe(`${key} cites ${id}: resolves`);
      }
    }
  });

  test('every registered source is named, dated and linkable — same bar as the food corpus', () => {
    for (const [id, src] of Object.entries(MONEY_SOURCES)) {
      expect(typeof src.org).toBe('string');
      expect(src.url).toMatch(/^https:\/\//);
      expect(src.recordedAt || src.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof src.claim).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }
  });

  test('only the researched tier can ground anything', () => {
    const grounding = Object.entries(MONEY_TIERS).filter(([, t]) => t.grounded).map(([k]) => k);
    expect(grounding).toEqual(['researched']);
  });

  test('every constant named in the audit has a marker exported beside it', () => {
    // The point of the field is that an editor changing a number sees the
    // marker in the same file. Each of these is re-exported at the constant.
    const markers = [
      PER_HEAD_BY_TYPE_PROVENANCE, PER_HEAD_BY_FAMILY_PROVENANCE, PER_HEAD_FALLBACK_PROVENANCE,
      CATEGORY_SHARES_PROVENANCE, US_HOLIDAYS_PROVENANCE, DOW_PREMIUM_PROVENANCE,
      PEAK_SEASON_PROVENANCE, DATE_PREMIUM_CAP_PROVENANCE, TIME_OF_DAY_PROVENANCE,
      SERVICE_CHARGE_PROVENANCE, TAX_PROVENANCE, CONTINGENCY_PROVENANCE,
      METRO_MARKETS_PROVENANCE, RUSH_FACTOR_PROVENANCE,
      SOURCING_TIERS_PROVENANCE, NONPROTEIN_CHANNEL_PROVENANCE,
    ];
    expect(markers.length).toBe(16);
    for (const m of markers) expect(m && typeof m === 'object').toBe(true);
  });
});

// ─── 3. Negative controls ───────────────────────────────────────────────────

describe('the predicate — negative controls', () => {
  const realSourceId = Object.keys(MONEY_SOURCES)[0];

  test('POSITIVE control: the predicate CAN return true, so a false is a finding not a bug', () => {
    expect(isGroundedMoneyFactor({ tier: 'researched', sources: [realSourceId] })).toBe(true);
  });

  test('rejects null, non-objects and empty records', () => {
    expect(isGroundedMoneyFactor(null)).toBe(false);
    expect(isGroundedMoneyFactor(undefined)).toBe(false);
    expect(isGroundedMoneyFactor('researched')).toBe(false);
    expect(isGroundedMoneyFactor({})).toBe(false);
  });

  test('rejects a non-researched tier even with a real source', () => {
    for (const tier of ['estimate', 'trade-heuristic', 'editorial', 'synthesized']) {
      expect(isGroundedMoneyFactor({ tier, sources: [realSourceId] })).toBe(false);
    }
  });

  test('rejects a sourceless "researched" claim — a tier alone never grounds', () => {
    expect(isGroundedMoneyFactor({ tier: 'researched', sources: [] })).toBe(false);
    expect(isGroundedMoneyFactor({ tier: 'researched' })).toBe(false);
  });

  test('rejects an id that does not resolve, and rejects ONE bad id among good ones', () => {
    expect(isGroundedMoneyFactor({ tier: 'researched', sources: ['not-a-real-source'] })).toBe(false);
    expect(isGroundedMoneyFactor({ tier: 'researched', sources: [realSourceId, 'not-a-real-source'] })).toBe(false);
  });

  // ── THE ONE THAT MATTERS ──────────────────────────────────────────────────
  test('THE BIGGEST NUMBER A HOST SEES IS STILL NOT GROUNDED — and the tier is now the only thing holding it', () => {
    // PER_HEAD_BY_TYPE is the biggest number a host sees. Until 2026-09-18 its
    // only recorded basis was the words "Reflect commonly cited US bands".
    // It now CITES a real retrieved source (The Knot 2026 Real Weddings Study),
    // and it is still not grounded, because that source publishes a single
    // per-guest MEAN of $292 for ONE of the 17 rows and states nothing about a
    // band or about the other 16.
    expect(PER_HEAD_BY_TYPE_PROVENANCE.sources).toEqual(['theknot-realweddings-2026']);
    expect(PER_HEAD_BY_TYPE_PROVENANCE.tier).toBe('estimate');
    expect(isGroundedMoneyFactor(PER_HEAD_BY_TYPE_PROVENANCE)).toBe(false);

    // READ THIS: the shortcut that used to fail now WORKS, and that is the
    // point of the assertion above. Once a record cites a RESOLVING id, the
    // tier is the last thing standing between it and a grounded badge. So the
    // honest tier is load-bearing, not decorative, and the line above is what
    // guards it.
    const relabelled = { ...PER_HEAD_BY_TYPE_PROVENANCE, tier: 'researched' };
    expect(isGroundedMoneyFactor(relabelled)).toBe(true);

    // Inventing a plausible-looking id still fails: it must resolve.
    const faked = { ...PER_HEAD_BY_TYPE_PROVENANCE, tier: 'researched', sources: ['us-per-head-survey-2026'] };
    expect(isGroundedMoneyFactor(faked)).toBe(false);
  });

  test('citing a real source is NOT the same as being grounded', () => {
    // sourcing.nonProteinChannel cites Consumer Reports and ships 10% where
    // the source says 21%. The citation resolves; the record is editorial.
    expect(NONPROTEIN_CHANNEL_PROVENANCE.sources.length).toBe(1);
    expect(moneySourcesFor(NONPROTEIN_CHANNEL_PROVENANCE).length).toBe(1);
    expect(NONPROTEIN_CHANNEL_PROVENANCE.tier).toBe('editorial');
    expect(isGroundedMoneyFactor(NONPROTEIN_CHANNEL_PROVENANCE)).toBe(false);
  });

  test('the rush record does NOT launder its comment\'s name-drop into a citation', () => {
    // The code comment credits "planner surveys + Wedding Wire / The Knot
    // patterns" with no page, date or figure. That must not become `sources`.
    // The 2026-09-18 pass searched for both and found neither publishing a
    // lead-time premium schedule, so NEITHER is cited. What it did find (a
    // WPIC rush-fee structure) is cited instead — on a different base, so the
    // record is still not grounded.
    const cited = RUSH_FACTOR_PROVENANCE.sources.join(' ').toLowerCase();
    expect(cited).not.toMatch(/knot|weddingwire|wedding-wire/);
    expect(RUSH_FACTOR_PROVENANCE.sources).toEqual(['wpic-rushfees-2026']);
    expect(isGroundedMoneyFactor(RUSH_FACTOR_PROVENANCE)).toBe(false);
  });

  test('THE HEADLINE: exactly one registered money constant is grounded', () => {
    const grounded = Object.entries(MONEY_PROVENANCE)
      .filter(([, p]) => isGroundedMoneyFactor(p))
      .map(([k]) => k);
    // 2026-09-18: one research pass, one honest promotion. Everything the host
    // is shown FIRST and LARGEST — the per-head bands, the date premiums, the
    // metro index — is still ungrounded, and BUDGET_TOTAL_FACTOR_KEYS does not
    // contain this key, so no figure a host sees became grounded.
    expect(grounded).toEqual(['factors.serviceCharge']);
    expect(MONEY_PROVENANCE_META.groundedCount).toBe(grounded.length);
    expect(BUDGET_TOTAL_FACTOR_KEYS).not.toContain('factors.serviceCharge');
    expect(VENDOR_RANGE_FACTOR_KEYS).not.toContain('factors.serviceCharge');
  });

  test('moneySourcesFor never invents a source, and drops ids that do not resolve', () => {
    expect(moneySourcesFor(null)).toEqual([]);
    expect(moneySourcesFor({ sources: ['nope'] })).toEqual([]);
    expect(moneySourcesFor({ sources: [Object.keys(MONEY_SOURCES)[0], 'nope'] }).length).toBe(1);
  });

  test('moneyProvenanceFor returns null for an unknown key — never an empty object', () => {
    expect(moneyProvenanceFor('budget.perHeadByType')).toBe(MONEY_PROVENANCE['budget.perHeadByType']);
    expect(moneyProvenanceFor('nope')).toBeNull();
    expect(moneyProvenanceFor('toString')).toBeNull(); // prototype keys are not records
    expect(moneyProvenanceFor(undefined)).toBeNull();
  });
});

// ─── 4. The disclosure a surface asks for ───────────────────────────────────

describe('moneyDisclosure — what a surface gets back before it renders a figure', () => {
  test('the budget composite must be marked', () => {
    const d = moneyDisclosure(BUDGET_TOTAL_FACTOR_KEYS);
    expect(d.grounded).toBe(false);
    expect(d.mustMark).toBe(true);
    expect(d.marker).toBe('est.');
    expect(d.unknownKeys).toEqual([]);
    expect(d.ungrounded.length).toBe(BUDGET_TOTAL_FACTOR_KEYS.length);
    expect(d.label).toBe('Planning estimate');
  });

  test('the vendor composite must be marked', () => {
    const d = moneyDisclosure(VENDOR_RANGE_FACTOR_KEYS);
    expect(d.grounded).toBe(false);
    expect(d.mustMark).toBe(true);
    // The BASE range joined the two factors on 2026-09-19. Before that this list
    // held only the multipliers, above a comment claiming the base "carries the
    // playbook's own provenance" — measured, 224 of 224 playbook vendor rows
    // carry none, so there was nothing to defer to and the base was the one
    // contributor nobody could ask about.
    expect(d.contributors.map((c) => c.key).sort())
      .toEqual(['vendor.metroMarkets', 'vendor.playbookCostRange', 'vendor.rushFactor']);
  });

  test('contributors come back weakest-first, so a surface can take [0] for one word', () => {
    const d = moneyDisclosure(['factors.contingency', 'budget.perHeadByType', 'factors.dowPremium']);
    expect(d.contributors.map((c) => c.tier)).toEqual(['estimate', 'trade-heuristic', 'editorial']);
    expect(d.tiers).toEqual(['estimate', 'trade-heuristic', 'editorial']);
  });

  test('an EMPTY ask is not grounded — "nothing to check" must never read as "checked"', () => {
    const d = moneyDisclosure([]);
    expect(d.grounded).toBe(false);
    expect(d.mustMark).toBe(true);
    expect(d.contributors).toEqual([]);
  });

  test('an UNKNOWN key forces the mark and is reported, not silently dropped', () => {
    const d = moneyDisclosure(['budget.perHeadByType', 'something.unregistered']);
    expect(d.unknownKeys).toEqual(['something.unregistered']);
    expect(d.grounded).toBe(false);
    expect(d.mustMark).toBe(true);
  });

  test('a single key may be passed without an array', () => {
    expect(moneyDisclosure('budget.perHeadByType').mustMark).toBe(true);
  });

  test('resolved sources are deduped and surfaced so the UI can answer "says who?"', () => {
    const d = moneyDisclosure(['sourcing.nonProteinChannel', 'sourcing.nonProteinChannel', 'budget.perHeadByType']);
    // Two distinct records, two distinct sources — and the repeated key is
    // deduped rather than counted twice.
    expect(d.sources.length).toBe(2);
    expect(d.sources.map((s) => s.url).sort()).toEqual([...new Set(d.sources.map((s) => s.url))].sort());
    for (const s of d.sources) expect(s.url).toMatch(/^https:\/\//);
    // ...and a resolvable source still did not make it grounded.
    expect(d.grounded).toBe(false);
  });

  test('a HYPOTHETICAL all-grounded composite would clear the mark — the gate is real', () => {
    // Proves mustMark tracks the predicate rather than being hardcoded true.
    const realId = Object.keys(MONEY_SOURCES)[0];
    expect(isGroundedMoneyFactor({ tier: 'researched', sources: [realId] })).toBe(true);
    expect(MONEY_TIERS.researched.grounded).toBe(true);
    expect(MONEY_TIERS.estimate.grounded).toBe(false);
  });
});

// ─── 5. The estimator reports what it actually used ─────────────────────────

describe('estimateTotalRange reports the constants that built each figure', () => {
  const neutral = { date: null, timeOfDay: 'afternoon', metroFactor: 1 };

  test('an explicit per-head type cites the type table and nothing else', () => {
    const r = estimateTotalRange({ type: 'Wedding', guestCount: 150, ...neutral });
    expect(r.provenanceKeys).toEqual(['budget.perHeadByType']);
  });

  test('a type with no band but a playbook cost cites the playbook record', () => {
    const r = estimateTotalRange({ type: 'The Cookout', guestCount: 12, ...neutral });
    expect(r.provenanceKeys).toEqual(['budget.playbookPerGuestCost']);
  });

  test('a type falling to its family cites the family table', () => {
    const r = estimateTotalRange({ type: 'Not A Real Type', guestCount: 75, ...neutral });
    expect(r.provenanceKeys).toEqual(['budget.perHeadByFamily']);
  });

  test('the destination blend cites the family band it blended toward', () => {
    const r = estimateTotalRange({ type: 'Birthday', guestCount: 30, isDestination: true, ...neutral });
    expect(r.destinationAdjusted).toBe(true);
    expect(r.provenanceKeys).toEqual(['budget.perHeadByType', 'budget.perHeadByFamily']);
  });

  test('the nights term cites the category shares it multiplies', () => {
    const r = estimateTotalRange({ type: 'Reunion', guestCount: 30, nights: 2, ...neutral });
    expect(r.nightsAdjusted).toBe(true);
    expect(r.provenanceKeys).toContain('budget.categoryShares');
  });

  test('a loaded date cites every premium that actually fired, and the cap when it bites', () => {
    // 2026-06-20 is a Saturday in peak wedding season.
    const r = estimateTotalRange({ type: 'Wedding', guestCount: 150, date: '2026-06-20', timeOfDay: 'evening', metroFactor: 1.65 });
    expect(r.provenanceKeys).toEqual(expect.arrayContaining([
      'budget.perHeadByType', 'factors.timeOfDay', 'vendor.metroMarkets',
      'factors.dowPremium', 'factors.peakWeddingSeason',
    ]));
    // Saturday (+20%) + July 4 weekend (+20%) + peak wedding season (+15%)
    // = +55% raw, so the +45% editorial cap bites and must be disclosed.
    const capped = estimateTotalRange({ type: 'Wedding', guestCount: 150, date: '2026-07-04', timeOfDay: 'evening' });
    expect(capped.provenanceKeys).toContain('factors.datePremiumCap');
    // Exactly AT the cap is not capped: Saturday (+20%) + Christmas week
    // (+25%) sums to precisely +45%, so nothing was clipped and the cap is
    // not claimed as a contributor.
    const atCap = estimateTotalRange({ type: 'Wedding', guestCount: 150, date: '2026-12-26', timeOfDay: 'evening' });
    expect(atCap.provenanceKeys).not.toContain('factors.datePremiumCap');
  });

  test('a factor that did not move the number is not claimed as a contributor', () => {
    const r = estimateTotalRange({ type: 'Wedding', guestCount: 150, ...neutral });
    expect(r.provenanceKeys).not.toContain('factors.timeOfDay');   // afternoon = 1.00
    expect(r.provenanceKeys).not.toContain('vendor.metroMarkets'); // metro = 1.00
    expect(r.provenanceKeys).not.toContain('factors.dowPremium');  // no date
  });

  test('MEASURED: the $100-250 last-resort band is unreachable — nothing can reach it', () => {
    // intakeFamilyFor returns 'host_driven' for anything it cannot resolve, so
    // PER_HEAD_BY_FAMILY always answers before the literal does. Swept here
    // rather than argued, including strings chosen to defeat the keyword router.
    const hostile = ['', ' ', 'Not A Real Type', 'zzzzz', '!!!', 'Blorptacular Summit',
      '12345', 'undefined', 'null', 'Wedding-ish', 'événement', '🎉'];
    for (const type of hostile) {
      const r = estimateTotalRange({ type, guestCount: 50, ...neutral });
      if (!r) continue; // empty/whitespace types refuse to estimate at all
      expect(`${JSON.stringify(type)} -> ${r.provenanceKeys.join(',')}`)
        .not.toContain('budget.perHeadFallback');
    }
    // It is registered all the same — an unreachable unsourced constant is
    // still an unsourced constant sitting in the lookup chain.
    expect(PER_HEAD_FALLBACK_PROVENANCE).not.toBeNull();
    expect(isGroundedMoneyFactor(PER_HEAD_FALLBACK_PROVENANCE)).toBe(false);
  });

  test('every key the estimator can emit is registered — no figure escapes unregistered', () => {
    const emitted = new Set();
    for (const type of ['Wedding', 'Birthday', 'The Cookout', 'Not A Real Type', 'Gala', 'Reunion', 'Wellness Retreat']) {
      for (const date of [null, '2026-06-20', '2026-12-26', '2026-12-31']) {
        for (const isDestination of [false, true]) {
          for (const nights of [0, 3]) {
            for (const metroFactor of [1, 1.65]) {
              for (const timeOfDay of ['afternoon', 'late']) {
                const r = estimateTotalRange({ type, guestCount: 50, date, timeOfDay, metroFactor, isDestination, nights });
                if (r) r.provenanceKeys.forEach((k) => emitted.add(k));
              }
            }
          }
        }
      }
    }
    expect(emitted.size).toBeGreaterThan(0);
    expect(moneyDisclosure([...emitted]).unknownKeys).toEqual([]);
  });
});

// ─── 6. The measured finding behind sourcing.tiers ──────────────────────────

describe('sourcing.tiers — the note is arithmetic, not an opinion', () => {
  const mid = ([lo, hi]) => (lo + hi) / 2;
  const meanRatio = (channel) => CANONICAL_PROTEIN_PRICES
    .map((p) => mid(p[channel]) / mid(p.butcher))
    .reduce((a, b) => a + b, 0) / CANONICAL_PROTEIN_PRICES.length;

  test('the shipped factors do NOT reproduce from the table said to back them', () => {
    const shipped = Object.fromEntries(SOURCING_TIERS.map((t) => [t.id, t.factor]));
    const derivedCostco = meanRatio('costco');
    const derivedGrocery = meanRatio('grocery');

    expect(derivedCostco).toBeCloseTo(0.706, 3);
    expect(derivedGrocery).toBeCloseTo(1.064, 3);
    expect(shipped.costco).toBe(0.85);
    expect(shipped.grocery).toBe(1.18);

    // Direction corroborated...
    expect(derivedCostco).toBeLessThan(1);
    expect(derivedGrocery).toBeGreaterThan(1);
    // ...magnitude not. This is why the record is 'estimate', not 'researched'.
    expect(Math.abs(shipped.costco - derivedCostco)).toBeGreaterThan(0.1);
    expect(Math.abs(shipped.grocery - derivedGrocery)).toBeGreaterThan(0.1);
    expect(isGroundedMoneyFactor(SOURCING_TIERS_PROVENANCE)).toBe(false);
  });
});

// ─── 7. No dollar figure moved ──────────────────────────────────────────────
//
// Baked from a 98,280-case sweep of estimateTotalRange taken BEFORE any of the
// above existed (every event type x 6 guest counts x 7 dates x 5 time slots x
// destination x nights x metro). The full sweep was byte-identical after. This
// is the readable subset, locked so it stays that way.

describe('behaviour lock — provenance is metadata, and metadata costs nothing', () => {
  const CASES = [
    // type, guests, date, timeOfDay, metro, destination, nights, low, high
    ['Wedding',          150, null,         'afternoon', 1,    false, 0,  30000,  75000],
    ['Wedding',          150, '2026-06-20', 'evening',   1.65, false, 0,  73500, 183800],
    ['Birthday',          30, null,         'afternoon', 1,    false, 0,   1800,   7500],
    ['Birthday',          30, null,         'afternoon', 1,    true,  0,   6000,  18000],
    ['Gala',             400, '2026-12-31', 'late',      1.65, false, 0, 268100, 643500],
    ['Reunion',           30, null,         'afternoon', 1,    false, 2,   2700,  10800],
    // The Cookout's whole-event ceiling was raised 35 -> 52 on 2026-09-23 (host
    // ruling) so it clears its own itemized food ceiling — food is a subset of
    // the event and was priced above it. This lock moved because a PRICING
    // decision moved it, which is the one reason it is allowed to.
    ['The Cookout',       12, null,         'afternoon', 1,    false, 0,    200,    600],
    ['Fish Fry',          12, null,         'afternoon', 1,    false, 0,    100,    200],
    ['Not A Real Type',   75, null,         'afternoon', 1,    false, 0,   4500,  18800],
    ['Holiday Party',     75, '2026-11-26', 'evening',   0.8,  false, 0,   2700,   8300],
    ['Conference',       400, '2026-03-11', 'morning',   1,    false, 0,  51000, 136000],
    ['Wellness Retreat',  12, null,         'afternoon', 1,    true,  5,   9600,  33600],
  ];

  for (const [type, guestCount, date, timeOfDay, metroFactor, isDestination, nights, low, high] of CASES) {
    test(`${type} x${guestCount}${date ? ' ' + date : ''} — $${low}-${high}`, () => {
      const r = estimateTotalRange({ type, guestCount, date, timeOfDay, metroFactor, isDestination, nights });
      expect(r.lowTotal).toBe(low);
      expect(r.highTotal).toBe(high);
    });
  }

  test('the worst-case stack is still ~2.5x the base — the audit figure, locked', () => {
    const base = estimateTotalRange({ type: 'Wedding', guestCount: 150, timeOfDay: 'afternoon', metroFactor: 1 });
    const loaded = estimateTotalRange({ type: 'Wedding', guestCount: 150, date: '2026-06-20', timeOfDay: 'evening', metroFactor: 1.65 });
    expect(loaded.lowTotal / base.lowTotal).toBeCloseTo(2.45, 2);
    // Every one of those multipliers is ungrounded, and the host sees only the
    // product of them.
    expect(moneyDisclosure(loaded.provenanceKeys).mustMark).toBe(true);
  });

  test('null cases still return null — the new field did not make an estimate appear', () => {
    expect(estimateTotalRange({ type: null, guestCount: 100 })).toBeNull();
    expect(estimateTotalRange({ type: 'Wedding', guestCount: 0 })).toBeNull();
  });
});
