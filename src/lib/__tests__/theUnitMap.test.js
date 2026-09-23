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
    expect(UNIT_MAPPED_LINES).toBe(44);

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
    expect(multipliable).toBe(63);
  });
});
