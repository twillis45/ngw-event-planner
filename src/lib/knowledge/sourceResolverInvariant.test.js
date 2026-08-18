// ─── SOURCE RESOLVER INVARIANT (Phase 5A-4.1) ────────────────────────────────
//
// THIS TEST CHANGES NOTHING. It is a safety rail written BEFORE a resolver
// exists, so that a future consolidation is a mechanical change against a proven
// invariant rather than a judgement call.
//
// TODAY: every grounding predicate resolves a source id by direct key lookup into
// its own axis registry — `QTY_SOURCES[id]`, `COST_SOURCES[id]`, and 18 more.
// `groundingSources.js` already unions all 20 axes into 112 normalized records,
// but no predicate consults it. A future `resolveSource(id)` would be built on
// that union.
//
// THE INVARIANT: the union must be a FAITHFUL INDEX of the axis maps — same ids,
// no more, no fewer, and each id resolvable only within the axis that owns it.
// If that holds, a resolver built on the union cannot change any grounding
// outcome. If it ever stops holding, this fails and the migration is blocked.
//
// WHAT WOULD BREAK TRUST, stated as the two failure directions:
//   EXPANSION  — an id grounds through the union that does not ground today.
//                This is the unacceptable one: silent trust inflation.
//   REGRESSION — an id grounds today but not through the union.
//                Visible, but still a loss of earned grounding.
import { groundingSourceCatalog } from './groundingSources';
import { QTY_SOURCES, isGroundedItemQty } from './quantityProvenance';
import { COST_SOURCES, isGroundedCost } from './costProvenance';
import { TIMING_SOURCES } from './timingProvenance';
import { CULTURAL_SOURCES } from './culturalContext';
import { ACCESSIBILITY_SOURCES } from './accessibilityContext';
import { LEGAL_SOURCES } from './legalContext';
import { VENUE_SOURCES } from './venueContext';
import { WEATHER_SOURCES } from './weatherContext';
import { HUMAN_SOURCES } from './humanContext';
import { DIETARY_SOURCES } from './dietaryContext';
import { BUDGET_SOURCES } from './budgetContext';
import { CHILDCARE_SOURCES } from './childcareContext';
import { MILITARY_SOURCES } from './militaryRetirement';
import { DESTINATION_SOURCES } from './destinationContext';
import { SOURCE_CATALOG } from './sourceCatalog';

// The axis maps a predicate can reach today. Deliberately listed by hand: an axis
// added to groundingSources without being represented here is itself a finding.
const AXIS_MAPS = {
  Quantity: QTY_SOURCES,
  Cost: COST_SOURCES,
  Timing: TIMING_SOURCES,
  'Cultural / religious': CULTURAL_SOURCES,
  Accessibility: ACCESSIBILITY_SOURCES,
  'Legal / COI': LEGAL_SOURCES,
  'Venue constraint': VENUE_SOURCES,
  Weather: WEATHER_SOURCES,
  'Human / relational': HUMAN_SOURCES,
  'Dietary / allergy': DIETARY_SOURCES,
  'Budget authority': BUDGET_SOURCES,
  Childcare: CHILDCARE_SOURCES,
  'Military ceremony': MILITARY_SOURCES,
  'Destination / travel': DESTINATION_SOURCES,
};

const catalog = () => groundingSourceCatalog();
const unionIds = () => new Set(catalog().flatMap((g) => g.sources.map((s) => s.id)));

// Strings that must NEVER resolve. These are the real shapes found in the corpus
// (7 purchases cite raw URLs and prose names where an id belongs), plus the
// classic near-miss forms a fuzzy resolver would wrongly accept.
const MUST_NOT_RESOLVE = [
  "Captain White's Seafood (Oxon Hill, MD)",
  'https://www.eatlikenoone.com/chicken-prices-at-costco.htm',
  'https://example.com',
  'WebstaurantStore',                 // the PROVIDER, not the citation
  'webstaurant',                      // prefix
  'webstaurant-protein',              // truncated id
  'WEBSTAURANT-PROTEIN-2026',         // case variant
  'webstaurant-protein-2026 ',        // trailing space
  ' webstaurant-protein-2026',        // leading space
  'bls-cpi',                          // a SOURCE_CATALOG provider id
  '', null, undefined, 0, false, [], {},
];

describe('1 — the source universe is what we think it is', () => {
  // 160 since 2026-08-16 also registered ICE (28 lines had no cost source at all)
  // and BEER (previously written off after two 403s — a fetch failure recorded as
  // an absence of evidence).
  // 156 since 2026-08-16 registered corroborating pork-rib, bone-in-chicken and
  // catering sources, so those three families meet minCorroboration 2.
  // 153 since 2026-08-15 also registered ZERO-PROOF AND MOCKTAILS — the other
  // half of the non-alcoholic split, kept as its own family because a drink
  // built on an NA spirit costs several times a can of soda. Bar pricing
  // ($13-17 a mocktail) is excluded from it on purpose.
  // (151 since 2026-08-15 also registered SODA AND BOTTLED WATER, scoped narrowly
  // to cans and bottles — a mocktail or zero-proof base costs several times as
  // much per drink and is deliberately NOT covered by it.)
  // (149 since 2026-08-15 also registered the CLEANUP KIT family. Those two are
  // deliberately cited at `confidence: 'low'` on every line they touch, because
  // nobody sells a "cleanup kit" — the band is a SUM of individually-priced
  // components (bags, towels, wipes, soap) and says so in its sufficientWhen.)
  // (147 since 2026-08-15 also registered the DISPOSABLE TABLEWARE family — two
  // sources covering 11 per-guest place-setting lines in one pass, the largest
  // reusable family left in the corpus. Note what it does NOT include:
  // `jollychef-disposables-2026` was declined twice in this pass because it is a
  // QUANTITY claim and cannot price anything. The quantity source stays where it
  // belongs and these two carry the price.)
  // (145 since 2026-08-15 registered the WINE family — two sources applied to
  // every uncited per-bottle wine line in the corpus in one pass. That is the
  // shape this work takes now: research a family once, apply it everywhere it
  // legitimately fits, rather than re-opening the same source per playbook.)
  // (143 since 2026-08-15 registered two for `bacheloretteParty` — spirits. Worth
  // noting what did NOT need registering: the same playbook's sparkling line was
  // cited with ZERO new sources, reusing the champagne/sparkling pair already
  // registered for wedding and anniversary. A citation by genuine reuse costs
  // nothing here and still moved the band.)
  // (141 since 2026-08-15 registered four more for `anniversary` — bread and the
  // signage kit. Bread is the clearest channel-span failure the pass has found:
  // its band was too HIGH at the bottom and too LOW at the top, covering only
  // mid-bakery while the item names Bakery AND Grocery.)
  // (137 since 2026-08-15 registered four more for `anniversary` — the app
  // spread and the coffee service. Both were flagged BEFORE research by the
  // channel-span test the earlier batch produced (an item whose `where` names a
  // discount channel and a premium one is a candidate for a band covering only
  // one), and both were too low at the top.
  // (133 since 2026-08-15 also registered four for `anniversary` — cake and
  // florals. Both were corrected for the same reason and it is worth naming:
  // the item's own `where` lists two very different CHANNELS (grocery bakery vs
  // custom bakery; Trader Joe's vs florist) and the authored band only covered
  // one of them, so whichever channel the host picked, the number was wrong for
  // half of them.)
  // (129 since 2026-08-15 registered eleven more price sources for the rest of the
  // wedding playbook — welcome bags, guest book, signage, the toast bottle, the
  // self-supplied bar and the day-of emergency kit. Wedding went 0 -> 7 of 7
  // priced items cited. Two of those six ranges were WRONG and four were already
  // right, which is the useful shape of this work: citation is a check, not a
  // rewrite. Each entry says whether the page was `(fetched)` or read as a
  // `(listing)` in search results, because those are different strengths of
  // evidence and collapsing them is how a citation becomes a decoration.)
  // (118 since 2026-08-14 registered the two wedding-favor price sources in
  // COST_SOURCES — `zola-favors-2026` and `theknot-realweddings-2025`. First
  // items of the grounding pass, and they did not merely add a citation: the
  // corpus range [2, 8] matched editorial guidance that names no survey, while
  // both named surveys put the real band at $1-5 with 56% of couples at $5 or
  // less. The number changed, not just its provenance.)
  // (116 since 2026-08-07 registered the three per-channel protein price sources
  // in COST_SOURCES — `costco-pork-2026`, `costco-chicken-2026`,
  // `costco-groundbeef-2026`. They already backed cited claims in backyardBbq,
  // juneteenthCookout and theCookout, but as RAW URLS inside each purchase's
  // provenance, which no registry resolves — so real, dated, corroborated
  // evidence was failing on its FORM rather than its substance.)
  // (113 since Phase 5F.7 registered `jollychef-disposables-2026` in QTY_SOURCES;
  // 112 after 5F's `reddy-ice-2026`.) This counter is SUPPOSED to move when a real
  // source is added - that is the point of pinning it.
  // (183 since the 2026-08-16 INSIDER PASS registered seven cultural-object
  // sources in COST_SOURCES: `sheromeda-jebena-2026`,
  // `ancientcookware-jebena-2026`, `shebelle-sini-2026`, `eight50-sini-2026`,
  // `blackartdepot-kwanzaa-2026`, `sevensymbols-kwanzaa-2026` and
  // `7principles-mkeka-2026`. Community and specialist retailers rather than a
  // marketplace search, because a jebena is not "a clay pot" and a mkeka is not
  // "a placemat".)
  // (185 since 2026-08-18 registered `bls-oj-2026` and `icedtea-lemonade-2026`
  // in COST_SOURCES. The non-alcoholic drink rows could not be grounded because
  // soda and bottled water had sources and juice and tea did not; these two
  // close that gap. The OJ entry is the BLS frozen-concentrate series and its
  // claim states the reconstitution math, because quoting $4.82/16oz as a
  // per-glass price would overstate it roughly fourfold.)
  test('20 axes, 224 source identities — verified, not assumed', () => {
    const cat = catalog();
    expect(cat.length).toBe(20);
    expect(cat.reduce((n, g) => n + g.sources.length, 0)).toBe(224);
    expect(unionIds().size).toBe(224);        // therefore every id is globally unique
  });

  test('no id appears in two axes', () => {
    const seen = new Map();
    for (const g of catalog()) {
      for (const s of g.sources) {
        expect(seen.has(s.id)).toBe(false);
        seen.set(s.id, g.axis);
      }
    }
  });

  test('every id is a slug — never a URL, never prose', () => {
    for (const id of unionIds()) {
      expect(typeof id).toBe('string');
      expect(id).not.toMatch(/\s/);
      expect(id).not.toMatch(/^https?:/i);
    }
  });

  test('the citation universe and the PROVIDER catalogue stay disjoint', () => {
    // SOURCE_CATALOG rates provider families; the axes name citations. Merging the
    // two id spaces is the specific mistake this test exists to catch.
    const providers = new Set(SOURCE_CATALOG.map((s) => s.id));
    for (const id of unionIds()) expect(providers.has(id)).toBe(false);
    expect(SOURCE_CATALOG.length).toBe(22);
  });
});

describe('2 — the union is a FAITHFUL INDEX of the axis maps', () => {
  // This is the property a resolver would depend on. Asserted per axis so a
  // failure names the axis that drifted.
  test.each(Object.keys(AXIS_MAPS))('%s: union ids === registry keys, exactly', (axis) => {
    const map = AXIS_MAPS[axis];
    const fromMap = Object.keys(map).sort();
    const group = catalog().find((g) => g.axis === axis);
    expect(group).toBeTruthy();
    const fromUnion = group.sources.map((s) => s.id).sort();
    expect(fromUnion).toEqual(fromMap);       // no additions, no omissions
  });

  test('every axis in the union is represented by a real registry (no orphan axes)', () => {
    // 20 axes exist; 14 are covered by AXIS_MAPS above. The remainder are declared
    // so an unreviewed axis cannot appear silently.
    const KNOWN_UNMAPPED = [
      'Incident / guest safety', 'Food safety', 'Fire & burn safety',
      'Booking / vendor collapse', 'Table & seating capacity', 'Group rental fit',
    ];
    const axes = catalog().map((g) => g.axis).sort();
    const accounted = [...Object.keys(AXIS_MAPS), ...KNOWN_UNMAPPED].sort();
    expect(axes).toEqual(accounted);
  });
});

describe('3 — the resolver contract, asserted against TODAY behaviour', () => {
  // A future resolveSource(id) must satisfy exactly this. Written now so the
  // migration is mechanical.
  const resolveViaUnion = (id) => {
    if (typeof id !== 'string' || !id) return null;
    for (const g of catalog()) {
      const hit = g.sources.find((s) => s.id === id);
      if (hit) return { ...hit, axis: g.axis };
    }
    return null;
  };

  test('EXACT id lookup — every known id resolves, and to its own axis', () => {
    for (const g of catalog()) {
      for (const s of g.sources) {
        const r = resolveViaUnion(s.id);
        expect(r).not.toBeNull();
        expect(r.axis).toBe(g.axis);          // axis identity preserved
      }
    }
  });

  test('NO fuzzy matching, NO aliases, NO case folding, NO trimming', () => {
    for (const bad of MUST_NOT_RESOLVE) expect(resolveViaUnion(bad)).toBeNull();
  });

  test('agreement with the map lookup a predicate performs today', () => {
    for (const [axis, map] of Object.entries(AXIS_MAPS)) {
      for (const id of Object.keys(map)) {
        // today: !!MAP[id] -> truthy. future: resolveSource(id) -> non-null.
        expect(!!map[id]).toBe(resolveViaUnion(id) !== null);
      }
      // and a string that is not a key must be falsy under both
      const absent = `__not-a-source-${axis.replace(/\W/g, '')}__`;
      expect(!!map[absent]).toBe(resolveViaUnion(absent) !== null);
    }
  });
});

describe('4 — NO TRUST EXPANSION: grounding outcomes are unchanged', () => {
  // The predicates require BOTH a resolvable source AND an axis-specific tier.
  // A resolver that returned records for more ids would not, by itself, ground
  // anything extra — but these pin the end-to-end outcome so that cannot drift.
  test('quantity: resolvable id + researched tier grounds; anything else does not', () => {
    const good = Object.keys(QTY_SOURCES)[0];
    expect(isGroundedItemQty({ tier: 'researched', sources: [good] })).toBe(true);
    // every way it can fail
    expect(isGroundedItemQty({ tier: 'researched', sources: ['Captain White\'s Seafood'] })).toBe(false);
    expect(isGroundedItemQty({ tier: 'researched', sources: ['https://example.com'] })).toBe(false);
    expect(isGroundedItemQty({ tier: 'primary', sources: [good] })).toBe(false);   // wrong tier
    expect(isGroundedItemQty({ tier: 'researched', sources: [] })).toBe(false);
    expect(isGroundedItemQty({ tier: 'researched' })).toBe(false);
    expect(isGroundedItemQty(null)).toBe(false);
  });

  test('cost: same contract, its own registry', () => {
    const good = Object.keys(COST_SOURCES)[0];
    expect(isGroundedCost({ tier: 'researched', sources: [good] })).toBe(true);
    expect(isGroundedCost({ tier: 'researched', sources: ['bls-cpi'] })).toBe(false);   // provider id
    expect(isGroundedCost({ tier: 'researched', sources: [good, 'nope'] })).toBe(false); // EVERY id must resolve
  });

  test('CROSS-AXIS LEAKAGE: a quantity source must not ground a cost claim', () => {
    // The sharpest failure a naive global resolver would introduce.
    const qty = Object.keys(QTY_SOURCES)[0];
    const cost = Object.keys(COST_SOURCES)[0];
    expect(COST_SOURCES[qty]).toBeUndefined();
    expect(QTY_SOURCES[cost]).toBeUndefined();
    expect(isGroundedCost({ tier: 'researched', sources: [qty] })).toBe(false);
    expect(isGroundedItemQty({ tier: 'researched', sources: [cost] })).toBe(false);
  });

  test('a partially-resolving source list never grounds', () => {
    const good = Object.keys(QTY_SOURCES)[0];
    expect(isGroundedItemQty({ tier: 'researched', sources: [good, 'https://example.com'] })).toBe(false);
  });
});

describe('5 — the migration gate', () => {
  // The single assertion that must pass before ANY predicate is moved onto a
  // resolver. Expressed as a count so the report is unambiguous.
  test('112/112 ids agree between the union and the axis maps', () => {
    let checked = 0, agreed = 0;
    for (const map of Object.values(AXIS_MAPS)) {
      for (const id of Object.keys(map)) {
        checked += 1;
        if (unionIds().has(id) === !!map[id]) agreed += 1;
      }
    }
    // AXIS_MAPS covers 14 of 20 axes; the remaining 6 are asserted structurally above.
    expect(agreed).toBe(checked);
    expect(checked).toBeGreaterThan(0);
  });

  test('0 newly grounded and 0 lost: the union adds and removes nothing', () => {
    const union = unionIds();
    const fromMaps = new Set(Object.values(AXIS_MAPS).flatMap((m) => Object.keys(m)));
    const newlyGrounded = [...union].filter((id) => !fromMaps.has(id));
    const lost = [...fromMaps].filter((id) => !union.has(id));
    expect(lost).toEqual([]);                       // nothing may disappear
    // The union legitimately contains the 6 unmapped axes; none may come from a
    // mapped axis. Assert the surplus is exactly the unmapped-axis population.
    const unmappedIds = new Set(catalog()
      .filter((g) => !AXIS_MAPS[g.axis])
      .flatMap((g) => g.sources.map((s) => s.id)));
    for (const id of newlyGrounded) expect(unmappedIds.has(id)).toBe(true);
  });
});
