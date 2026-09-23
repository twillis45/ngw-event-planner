// ─── TURNING A SHELF PRICE INTO A LINE TOTAL, OR REFUSING TO ─────────────────
//
// The store layer shipped with `range: null` and said why: Kroger prices THEIR
// package, the plan counts the plan's units, and multiplying one by the other
// is a confidently wrong total wearing a real price's credibility.
//
// This is that reconciliation. The tests below are weighted toward the
// REFUSALS, because refusing is what this module mostly does and because a
// false accept is the only failure here that reaches a host's budget.
import {
  unitDimension, parseStoreSize, lineIsMultipliable, storeLineTotal, UNIT_MAPPED_LINES,
  storeSearchTerm, matchLooksLikeTheLine, bandCheck, SEARCH_TERM_LINES,
} from '../knowledge/storeUnitMap';
import { playbookFoodPlan, ALL_PLAYBOOKS } from '../playbooks';

// Lines taken from the real corpus, so these break if the corpus is reworded —
// which is the point of an exact-match allowlist.
const ICE = { id: 'p_ice', item: 'Ice', unit: 'lbs', units: 30 };
const RIBS = { id: 'p_ribs', item: 'Ribs (racks)', unit: 'lbs', units: 11.5 };
const SPREAD = { id: 'p_apps', item: 'Cheese & charcuterie spread (crudite, sliders, skewers, dips)', unit: 'lbs', units: 8 };
const DRINKS = { id: 'p_drinks', item: 'Beer + wine for the adults', unit: 'drinks', units: 42 };

describe('a unit token is either a measure or it is not', () => {
  test('mass, volume and count resolve; the corpus’s nouns do not', () => {
    expect(unitDimension('lbs').dimension).toBe('mass');
    expect(unitDimension('fl oz').dimension).toBe('volume');
    expect(unitDimension('pk').dimension).toBe('count');
    // The four largest non-lb populations in the corpus. None of them is a
    // unit of measure, and treating any of them as one is how a wrong total
    // gets built.
    for (const noun of ['kit', 'set', 'serving', 'bite', 'sign package', 'thermometer']) {
      expect(unitDimension(noun)).toBe(null);
    }
  });
});

describe('Kroger’s size string is parsed strictly, or not at all', () => {
  test('the shapes their API reference actually documents', () => {
    expect(parseStoreSize('1 lb')).toMatchObject({ qty: 1, dimension: 'mass' });
    expect(parseStoreSize('16 oz')).toMatchObject({ qty: 16, dimension: 'mass' });
    expect(parseStoreSize('0.5 gal')).toMatchObject({ qty: 0.5, dimension: 'volume' });
    expect(parseStoreSize('59 fl oz')).toMatchObject({ qty: 59, dimension: 'volume' });
    expect(parseStoreSize('12 pk')).toMatchObject({ qty: 12, dimension: 'count' });
    expect(parseStoreSize('6 ct')).toMatchObject({ qty: 6, dimension: 'count' });
  });

  test('A COMPOUND PACK IS REFUSED, not guessed at', () => {
    // "6 x 12 oz" is 72 oz OR 6 units depending on what you are counting, and
    // the string does not say which. A parser that picked one would be right
    // half the time and silent about it.
    expect(parseStoreSize('6 x 12 oz')).toBe(null);
    expect(parseStoreSize('6 × 12 oz')).toBe(null);
  });

  test('a RANGE is refused — "2-3 lb" is not a quantity', () => {
    expect(parseStoreSize('2-3 lb')).toBe(null);
  });

  test('anything else is null, and null is an answer', () => {
    for (const s of ['', null, 'large', 'family size', 'lb', '12', 'about 2 lb']) {
      expect(parseStoreSize(s)).toBe(null);
    }
  });
});

describe('THE ALLOWLIST IS THE WHOLE SAFETY ARGUMENT', () => {
  test('(premise) every allowlisted line REALLY EXISTS in the corpus, exactly as written', () => {
    // A list of lines that no playbook contains would pass every other test in
    // this file and cover nothing. This is the test that makes the allowlist a
    // map of the corpus rather than a wish about it.
    const real = new Set();
    for (const pb of ALL_PLAYBOOKS) {
      const fp = playbookFoodPlan({ id: 'x', type: pb.type, date: '2026-08-20', guestMode: 'count', guestCount: 20, guests: [] });
      if (!fp) continue;
      for (const l of (fp.list || [])) real.add(`${l.id}\u0000${String(l.item || '').trim()}`);
    }
    // Re-derive the allowlist's own keys by asking the module about each line
    // the corpus holds — anything the module accepts must be a real line.
    let matched = 0;
    for (const k of real) {
      const [id, item] = k.split('\u0000');
      if (lineIsMultipliable({ id, item, unit: 'lbs', units: 1 })) matched += 1;
    }
    // Every entry that names a mass/volume line is reachable. Entries whose
    // corpus line is volume still match here because the probe passes 'lbs';
    // the count is what matters — no entry may be unreachable.
    expect(matched).toBe(UNIT_MAPPED_LINES);
  });

  test('a SINGLE-PRODUCT line is multipliable', () => {
    expect(lineIsMultipliable(ICE)).toMatchObject({ qty: 30, dimension: 'mass' });
    expect(lineIsMultipliable(RIBS)).toMatchObject({ qty: 11.5, dimension: 'mass' });
  });

  test('A BASKET IS NOT, however clean its unit looks', () => {
    // 8 lbs of "cheese & charcuterie spread (crudite, sliders, skewers, dips)".
    // The unit is lbs, the dimension matches a cheese product, and the answer
    // is still no — one matched cheddar priced across all 8 lbs is a fabricated
    // number, not a localized one.
    expect(lineIsMultipliable(SPREAD)).toBe(null);
  });

  test('THE COUNT BRIDGE IS REFUSED — mixed lines are most of the drink corpus', () => {
    // "42 drinks" of "Beer + wine for the adults" is two products. Four
    // twelve-packs of one matched beer would price a line that is half wine.
    expect(lineIsMultipliable(DRINKS)).toBe(null);
  });

  test('allowlisted, but the unit was reworded to a noun ⇒ still refused', () => {
    // Not redundant with the basket test. A line can be added here correctly
    // and later have its unit changed to `servings` by unrelated authoring —
    // and the quiet result would be a wrong total rather than a refusal.
    expect(lineIsMultipliable({ ...ICE, unit: 'servings' })).toBe(null);
    expect(lineIsMultipliable({ ...ICE, unit: 'kit' })).toBe(null);
  });
});

describe('the total, when there is one', () => {
  test('SOLD BY WEIGHT: you pay for what you need, no rounding', () => {
    // 11.5 lbs of ribs, Kroger pricing per 1 lb. Divisible good — the host
    // walks out with 11.5 lbs and pays for 11.5 lbs.
    const r = storeLineTotal({ line: RIBS, price: 4.99, size: '1 lb', soldBy: 'WEIGHT' });
    expect(r.total).toBe(57.39);            // 11.5 × 4.99
    expect(r.byWeight).toBe(true);
    expect(r.because).toMatch(/11\.5 lbs at \$4\.99 per 1 lb = \$57\.39/);
  });

  test('SOLD BY UNIT: whole packages only, and the rounding is DISCLOSED', () => {
    // 30 lbs of ice, sold in 10 lb bags → 3 bags exactly.
    const exact = storeLineTotal({ line: ICE, price: 3.49, size: '10 lb', soldBy: 'UNIT' });
    expect(exact.packs).toBe(3);
    expect(exact.total).toBe(10.47);
    expect(exact.because).not.toMatch(/covers/);   // nothing was rounded

    // 30 lbs of ice, sold in 7 lb bags → 4.29 bags → 5 bags, 35 lbs.
    const up = storeLineTotal({ line: ICE, price: 2.99, size: '7 lb', soldBy: 'UNIT' });
    expect(up.packs).toBe(5);
    expect(up.total).toBe(14.95);
    // A total that silently covers more than the host asked for is a total
    // they cannot check against the shelf.
    expect(up.because).toMatch(/covers 30, you take home 35 lbs/);
  });

  test('UNITS CONVERT ACROSS THE DIMENSION — 16 oz bags against a quantity in lbs', () => {
    // 30 lbs = 480 oz; a 16 oz bag is 1 lb, so 30 bags.
    const r = storeLineTotal({ line: ICE, price: 1.29, size: '16 oz', soldBy: 'UNIT' });
    expect(r.packs).toBe(30);
    expect(r.total).toBe(38.7);
  });

  test('DIFFERENT DIMENSIONS NEVER MULTIPLY — a 12 pk against 11.5 lbs', () => {
    // The single most important refusal in the file. 11.5 ÷ 12 = 0.96 is a
    // number, and it means nothing.
    expect(storeLineTotal({ line: RIBS, price: 18.49, size: '12 pk', soldBy: 'UNIT' })).toBe(null);
  });

  test('every other missing piece returns null, not a partial answer', () => {
    expect(storeLineTotal({ line: SPREAD, price: 9.99, size: '1 lb', soldBy: 'WEIGHT' })).toBe(null);
    expect(storeLineTotal({ line: RIBS, price: 4.99, size: 'family size', soldBy: 'UNIT' })).toBe(null);
    expect(storeLineTotal({ line: RIBS, price: 0, size: '1 lb', soldBy: 'WEIGHT' })).toBe(null);
    expect(storeLineTotal({ line: RIBS, size: '1 lb' })).toBe(null);
    expect(storeLineTotal({})).toBe(null);
  });
});

describe('how far this reaches, measured rather than hoped', () => {
  test('the allowlist covers a MINORITY of the corpus, and the number is pinned', () => {
    // 491 authored lines. 94 carry a unit of measure at all; roughly half of
    // those are baskets. A bigger number here would mean worse totals, not
    // better ones — the same ceiling geoItemMap records for its own 12.
    //
    // Allowed to move. Pinned so that it moves ON PURPOSE.
    expect(UNIT_MAPPED_LINES).toBe(41);

    let total = 0; let multipliable = 0;
    for (const pb of ALL_PLAYBOOKS) {
      const fp = playbookFoodPlan({ id: 'x', type: pb.type, date: '2026-08-20', guestMode: 'count', guestCount: 20, guests: [] });
      if (!fp) continue;
      for (const l of (fp.list || [])) {
        total += 1;
        if (lineIsMultipliable(l)) multipliable += 1;
      }
    }
    expect(total).toBeGreaterThan(400);
    // The honest headline: this is what a host can get a real TOTAL for. Every
    // other line keeps the estimate and, where a product matched, a reference.
    expect(multipliable).toBe(60);
  });
});

// ─── THE UNITS WERE GUARDED. THE MATCH WAS NOT. ──────────────────────────────
//
// Measured against a live Harris Teeter in Baltimore on 2026-09-23, with real
// keys, once the store layer was actually switched on. Two findings, and both
// were invisible to every test written before the probe:
//
//   1. 37 of these 44 lines matched NOTHING. We were sending the plan's display
//      text as the search query — "Ice (coolers + drinks, heat-adjusted)" —
//      while plain "ice" returns a 7 lb bag immediately.
//
//   2. Two of the seven that DID match came back as the wrong product, and both
//      parse cleanly as mass, so the unit map would have multiplied them into a
//      confident dollar total for something the host never wanted.
//
// The fixtures below are that response, verbatim. Real data, not invented — a
// made-up bad match would have been kinder than the one the store actually
// returned.
describe('what the live store actually sent back', () => {
  const RIBS = { id: 'p_ribs', item: 'Ribs (racks)', unit: 'lbs', units: 11.5 };
  const PORKRIBS = { id: 'p_ribs', item: 'Pork ribs (racks)', unit: 'lbs', units: 11.5 };
  const ICE = { id: 'p_ice', item: 'Ice (coolers + drinks, heat-adjusted)', unit: 'lbs', units: 46 };
  const WINGS = { id: 'p_wings', item: 'Chicken wings', unit: 'lbs', units: 12 };
  const OLDBAY = { id: 'p_oldbay', item: 'Old Bay (or J.O.) seasoning — buy extra', unit: 'lbs', units: 1 };

  test('(premise) every allowlisted line carries a search term, and it is NOT the display text', () => {
    // The whole first finding in one assertion. If an entry is ever added
    // without a term, it silently goes back to querying the display string.
    expect(storeSearchTerm(ICE)).toBe('ice');
    expect(storeSearchTerm(ICE)).not.toBe(ICE.item);
    expect(storeSearchTerm(RIBS)).toBe('pork ribs');
    // A line that is not on the list gets null, and the caller sends the text
    // unchanged — the behaviour before any of this existed.
    expect(storeSearchTerm({ id: 'p_apps', item: 'Cheese & charcuterie spread' })).toBe(null);
  });

  test('THE BBQ SAUCE. 12 bottles of it, billed as a rack of ribs.', () => {
    // Verbatim from the live response: filter.term="Ribs (racks)" returned
    // Rib Rack® Original BBQ Sauce, 15.5 oz, $5.39 / $4.99 promo.
    //
    // 11.5 lbs = 184 oz. 184 / 15.5 = 11.87 → 12 bottles × $4.99 = $59.88,
    // presented to a host as what their ribs cost. Nothing about the units was
    // wrong. The units were never the problem.
    const r = storeLineTotal({
      line: RIBS, price: 4.99, size: '15.5 oz', soldBy: 'UNIT',
      description: 'Rib Rack® Original BBQ Sauce',
    });
    expect(r).toBe(null);
  });

  test('…and the pork rinds, which the second ribs line matched', () => {
    const r = storeLineTotal({
      line: PORKRIBS, price: 5.99, size: '4 oz', soldBy: 'UNIT',
      description: 'Rib Rack® Sea Salt Pork Rinds',
    });
    expect(r).toBe(null);
  });

  test('(counter-premise) WITHOUT the description it still totals — so the guard is what stops it', () => {
    // Red-proof, inline. If this passed regardless, the test above would prove
    // nothing about the guard and everything about some other refusal.
    const r = storeLineTotal({ line: RIBS, price: 4.99, size: '15.5 oz', soldBy: 'UNIT' });
    expect(r).not.toBe(null);
    expect(r.packs).toBe(12);
    expect(r.total).toBe(59.88);      // the wrong number, in full
  });

  test('THE GOOD MATCHES ARE NOT COLLATERAL DAMAGE', () => {
    // A guard that refuses everything is not a guard. These three are the real
    // matches from the same live response and all three must survive it.
    const ice = storeLineTotal({
      line: ICE, price: 2.99, size: '7 lb', soldBy: 'UNIT',
      description: 'Reddy Ice Premium Packaged Ice',
    });
    expect(ice.packs).toBe(7);                    // 46 lbs / 7 lb, rounded up
    expect(ice.because).toMatch(/covers 46, you take home 49 lbs/);

    const wings = storeLineTotal({
      line: WINGS, price: 10.0, size: '3.25 lb', soldBy: 'UNIT',
      description: 'Whole Fresh Chicken Wings',
    });
    expect(wings.packs).toBe(4);                  // 12 / 3.25 = 3.69 → 4

    const chicken = storeLineTotal({
      line: { id: 'p_chicken', item: 'Chicken (legs/thighs/quarters)', unit: 'lbs', units: 10.4 },
      price: 2.49, size: '1 lb', soldBy: 'WEIGHT',
      description: 'Smart Chicken Leg Quarters',
    });
    expect(chicken.byWeight).toBe(true);
    expect(chicken.total).toBe(25.9);
  });

  test('A LINE THAT ASKS FOR A SEASONING STILL MATCHES ONE', () => {
    // The guard is "a form word the product has and the LINE does not". Old Bay
    // is a seasoning on purpose, so "seasoning" in the description is exactly
    // right and must not disqualify it. A blocklist that ignored what was asked
    // for would break the one line whose whole identity is a disqualifier word.
    expect(matchLooksLikeTheLine({
      line: OLDBAY, term: 'old bay seasoning', description: 'Old Bay Seasoning',
    })).toBe(true);
    expect(matchLooksLikeTheLine({
      line: RIBS, term: 'pork ribs', description: 'Rib Rack® Original BBQ Sauce',
    })).toBe(false);
  });

  test('no description ⇒ the guard abstains, and the units still decide', () => {
    // Kroger does not always send one. Abstaining is right: this heuristic can
    // only ever catch a familiar way of being wrong, and silence is not evidence.
    expect(matchLooksLikeTheLine({ line: RIBS, term: 'pork ribs' })).toBe(true);
  });

  test('COLLARD GREENS: a correct match the UNITS still refuse', () => {
    // The live store returned "Jumbo Collard Greens Bunch", 1 ct — the right
    // product, in a unit the plan cannot use. A bunch has no stated weight, and
    // 6.9 lbs ÷ "1 ct" is not a number. Both guards are load-bearing and they
    // catch different things.
    const r = storeLineTotal({
      line: { id: 'p_greens', item: 'Collard greens', unit: 'lbs', units: 6.9 },
      price: 2.99, size: '1 ct', soldBy: 'UNIT',
      description: 'Jumbo Collard Greens Bunch',
    });
    expect(r).toBe(null);
  });
});

// ─── TWO INDEPENDENT MEASUREMENTS OF THE SAME COMMODITY ──────────────────────
//
// Every priced line carries the corpus's own researched band. A shelf price is
// a second measurement of the same thing, by a source that has never seen the
// first. Comparing them is free, and across 35 live matches at a Baltimore
// store, 26 agreed — inside the band or within a quarter of its top.
//
// The numbers below are that live response, not inventions.
describe('when the shelf and the plan disagree, the host is told', () => {
  const band = (lo, hi, unit = 'lbs') => ({ id: 'p_x', item: 'X', unit, perUnitLow: lo, perUnitHigh: hi });

  test('AGREEMENT IS SILENT — which is the common case, and noise is not honesty', () => {
    // Ice: $0.43/lb against an authored $0.20–$0.40. 1.07× the top, and not
    // worth a sentence. Whole chicken at 1.14× likewise.
    expect(bandCheck({ line: band(0.2, 0.4), perUnit: 0.43 })).toBe(null);
    expect(bandCheck({ line: band(1.3, 3.5), perUnit: 3.99 })).toBe(null);
    // Comfortably inside says nothing either.
    expect(bandCheck({ line: band(4, 7), perUnit: 5.99 })).toBe(null);
  });

  test('DEARER than the plan expected is disclosed', () => {
    // Apple-cider vinegar: a gallon bought as eight 16 oz bottles works out at
    // $13.52/gal against an authored $3–$7. The jug is about $5.
    const r = bandCheck({ line: band(3, 7, 'gal'), perUnit: 13.52 });
    expect(r.side).toBe('high');
    expect(r.factor).toBe(1.9);
    expect(r.note).toMatch(/dearer per gal than this plan expected/);
    // …and it says to LOOK, not what to conclude.
    expect(r.note).toMatch(/worth a look at the size on the shelf/);
  });

  test('CHEAPER is disclosed too, by the SAME factor — one rule, both directions', () => {
    // Store-brand refried beans: $0.99 for 16 oz against an authored $1.50–$3.
    // Below the floor by more than 1.5×, so it speaks.
    const r = bandCheck({ line: band(1.5, 3), perUnit: 0.99 });
    expect(r.side).toBe('low');
    expect(r.note).toMatch(/cheaper per lb than this plan expected/);

    // And the symmetry is the point: the rule is one factor outside the band in
    // either direction, not two numbers tuned apart until it cannot be stated in
    // a sentence. Just inside the floor stays silent.
    expect(bandCheck({ line: band(1.5, 3), perUnit: 1.05 })).toBe(null);
    expect(bandCheck({ line: band(1.5, 3), perUnit: 4.4 })).toBe(null);
    expect(bandCheck({ line: band(1.5, 3), perUnit: 4.6 }).side).toBe('high');
  });

  test('IT NEVER EXPLAINS WHY, because it cannot', () => {
    // A small format, a dear store and a stale authored band are
    // indistinguishable from here. Naming one would be invention, and this
    // module's whole argument is that it does not invent.
    const r = bandCheck({ line: band(1, 3), perUnit: 5.99 });
    expect(r.note).not.toMatch(/store is|because|since|due to|out of season/i);
  });

  test('IT NEVER REFUSES — the shelf price is the better number', () => {
    // The tempting mistake: treat a disagreement as a bad match and withhold
    // the total. That throws away a real price because our estimate was low,
    // which is backwards. Deli potato salad really is $5.99/lb.
    const line = { id: 'p_potatosalad', item: 'Potato salad', unit: 'lbs', units: 6.9, perUnitLow: 1, perUnitHigh: 3 };
    const r = storeLineTotal({
      line, price: 5.99, size: '16 oz', soldBy: 'UNIT',
      description: 'Harris Teeter Fresh Foods Market Original Potato Salad',
    });
    expect(r).not.toBe(null);
    expect(r.total).toBe(41.93);
    expect(r.band.side).toBe('high');     // flagged, and still delivered
  });

  test('no authored band ⇒ nothing to compare, and nothing is said', () => {
    expect(bandCheck({ line: { unit: 'lbs' }, perUnit: 9 })).toBe(null);
    expect(bandCheck({ line: band(1, 3) })).toBe(null);
    expect(bandCheck({})).toBe(null);
  });
});

describe('the turkey came off the list', () => {
  test('no term reached a whole bird, so the line carries no total', () => {
    // FOUR terms probed live — "whole turkey", "turkey", "whole turkey fresh",
    // "frozen whole turkey" — and every one returns sliced deli meat or a 3 lb
    // breast roast. At 31.5 lbs that is eleven roasts at $5.00/lb against a
    // whole bird's ~$1.50. Removed rather than priced as a different cut.
    const line = { id: 'p_turkey', item: 'Turkey (whole bird, or breast for a small table)', unit: 'lbs', units: 31.5 };
    expect(storeSearchTerm(line)).toBe(null);
    expect(lineIsMultipliable(line)).toBe(null);
    expect(storeLineTotal({
      line, price: 14.99, size: '3 lbs', soldBy: 'UNIT',
      description: 'Butterball All Natural Frozen Turkey Breast Roast',
    })).toBe(null);
  });
});

// ─── SEARCHABLE IS NOT MULTIPLIABLE ─────────────────────────────────────────
//
// The allowlist answers one question — may this line's quantity be multiplied
// by a package price — and the search TERM used to ride along with it. Those
// are different questions, and bundling them cost coverage on the one shelf
// that had none.
//
// Measured live 2026-09-23 at a Baltimore store, sending each line's DISPLAY
// TEXT as the query (what a line with no term gets): of twelve non-allowlisted
// lines probed, ELEVEN matched nothing. "Charcoal / lump fuel for the brazier"
// is not a query. Every term added below was probed and its return recorded in
// the source beside it.
//
// The safety argument is the whole point of this block: a search-only line can
// gain a real shelf price and can NEVER gain a line total.
describe('a term buys a shelf reference, never a total', () => {
  const SEARCH_ONLY_CASES = [
    ['p_buns', 'Buns / bread', 'hamburger buns'],
    ['p_buns', 'Burger + hot dog buns / bread', 'hamburger buns'],
    ['p_bread', 'White bread (loaves)', 'white bread'],
    ['p_trashbags', 'Heavy-duty trash + recycling bags', 'trash bags'],
    ['p_charcoal', 'Charcoal / lump fuel for the brazier', 'charcoal'],
    ['p_cups', 'Disposable cups (self-serve drinks)', 'disposable cups'],
    ['p_napkins', 'Cloth or premium paper napkins', 'paper napkins'],
  ];

  test('(premise) every search-only line REALLY EXISTS in the corpus, exactly as written', () => {
    // Same guard the allowlist has, for the same reason: a term for a line no
    // playbook contains covers nothing and would pass every test below.
    const real = new Set();
    for (const pb of ALL_PLAYBOOKS) {
      const fp = playbookFoodPlan({ id: 'x', type: pb.type, date: '2026-08-20', guestMode: 'count', guestCount: 20, guests: [] });
      if (!fp) continue;
      for (const l of (fp.list || [])) real.add(`${l.id}\u0000${String(l.item || '').trim()}`);
    }
    for (const [id, item] of SEARCH_ONLY_CASES) {
      expect(real.has(`${id}\u0000${item}`)).toBe(true);
    }
  });

  test('THEY GET A TERM — the whole point, since the display text matched nothing', () => {
    for (const [id, item, term] of SEARCH_ONLY_CASES) {
      expect(storeSearchTerm({ id, item })).toBe(term);
    }
  });

  test('AND THEY ARE STILL UNMULTIPLIABLE. This is the test that matters.', () => {
    // A term must never become a licence to price the line. If this ever goes
    // green→red the safety argument above has quietly stopped holding.
    for (const [id, item] of SEARCH_ONLY_CASES) {
      expect(lineIsMultipliable({ id, item, unit: 'lbs', units: 10 })).toBe(null);
      expect(storeLineTotal({
        line: { id, item, unit: 'lbs', units: 10 },
        price: 4.99, size: '1 lb', soldBy: 'WEIGHT', description: item,
      })).toBe(null);
    }
  });

  test('the multiply allowlist is UNCHANGED by any of it', () => {
    // 41 entries, pinned separately above. The term map is strictly larger.
    expect(SEARCH_TERM_LINES).toBe(UNIT_MAPPED_LINES + 11);
    // …and an allowlisted line still gets its own term from the same accessor.
    expect(storeSearchTerm({ id: 'p_ice', item: 'Ice' })).toBe('ice');
  });

  test('a line on NEITHER list gets no term, and the caller sends its text unchanged', () => {
    expect(storeSearchTerm({ id: 'p_apps', item: 'Cheese & charcuterie spread (crudite, sliders, skewers, dips)' })).toBe(null);
    expect(storeSearchTerm({ id: 'p_togo', item: 'To-go containers + foil + zip bags (everybody makes a plate)' })).toBe(null);
  });
});
