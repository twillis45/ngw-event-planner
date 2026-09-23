// ─── THREE WAYS TO PRICE A LINE, AND SAYING WHICH ONE ────────────────────────
//
// Host directive 2026-09-23: build the three layers.
//
//   STORE     a real shelf price from the store the host picked. Kroger returns
//             one only when a locationId is supplied, and the backend discarded
//             it until today.
//   REGIONAL  the authored band moved by a BLS factor. Four census regions —
//             the finest geography BLS publishes for food.
//   NATIONAL  the band as authored.
//
// THE POINT IS NOT THE LAYERS, IT IS THE ORDER AND THE LABEL. Each layer may
// only replace a worse one for the lines it can actually speak to. A store price
// for beer licenses no claim about napkins, and every line says which layer it
// came from — because earlier today two surfaces gave a host opposite answers
// about the same numbers, and that was with only TWO layers.
import { priceForLine, layerForLine, storePriceIndex, layerCoverage, coverageNote, PRICE_LAYERS } from '../priceLayers';
import { geoItemForPurchase } from '../knowledge/geoItemMap';
import { playbookFoodPlan, ALL_PLAYBOOKS } from '../playbooks';

// A line the geo allowlist genuinely covers — taken from the allowlist itself,
// so this test breaks if the mapping is edited rather than testing a fiction.
const BEER = { id: 'p_beer', item: 'Beer' };
const NAPKINS = { id: 'p_napkins', item: 'Napkins, plates and cups' };

describe('a price says which of the three layers produced it', () => {
  test('(premise) the fixtures are real — one line IS mapped, the other is NOT', () => {
    // Without this the regional test could pass against a line nothing covers,
    // and the national test could pass because the mapping silently broke.
    expect(geoItemForPurchase(BEER)).toBe('beerMalt');
    expect(geoItemForPurchase(NAPKINS)).toBe(null);
  });

  test('NATIONAL is the floor: no state, no store, the band is returned as authored', () => {
    const r = priceForLine({ purchase: BEER, range: [40, 80] });
    expect(r.range).toEqual([40, 80]);
    expect(r.layer).toBe('national');
    expect(r.because).toMatch(/add your venue state/i);
  });

  test('REGIONAL moves a mapped line, and says so', () => {
    const r = priceForLine({ purchase: BEER, range: [40, 80], state: 'MD' });
    expect(r.layer).toBe('regional');
    // Maryland is the South (Census Region 3), and the South factor for malt
    // beverages is below 1 — so the band must come DOWN, not merely change.
    expect(r.range[0]).toBeLessThan(40);
    expect(r.range[1]).toBeLessThan(80);
    expect(r.because).toBeTruthy();
  });

  test('…but an UNMAPPED line stays national even with a state', () => {
    // The curated-allowlist rule, enforced here rather than trusted: paper goods
    // have no BLS commodity series and must not inherit beer's factor.
    const r = priceForLine({ purchase: NAPKINS, range: [20, 30], state: 'MD' });
    expect(r.range).toEqual([20, 30]);
    expect(r.layer).toBe('national');
    expect(r.because).toMatch(/no regional or store price/i);
  });

  test('STORE outranks both, and replaces the band with a POINT', () => {
    // A shelf price is a fact, not an estimate. Scaling an authored band by it
    // would produce a number that is neither.
    const idx = storePriceIndex([{ name: 'Beer', matched: true, price: 18.49, size: '12 pk' }]);
    const r = priceForLine({ purchase: BEER, range: [40, 80], state: 'MD', storeIndex: idx });
    expect(r.layer).toBe('store');
    expect(r.exact).toBe(18.49);
    expect(r.because).toMatch(/shelf price/i);
    expect(r.because).toContain('12 pk');
    // AND IT IS NOT A BAND. Kroger prices a 12-pack; the plan counts drinks.
    // Handing back a range would invite `units * uLow`, which is a wrong total
    // wearing a real price's credibility. Null forces a caller to treat this as
    // the reference it is.
    expect(r.range).toBe(null);
    expect(r.size).toBe('12 pk');
  });

  test('a SALE price is what the host would actually pay', () => {
    const idx = storePriceIndex([{ name: 'Beer', matched: true, price: 18.49, promoPrice: 14.99 }]);
    const r = priceForLine({ purchase: BEER, range: [40, 80], storeIndex: idx });
    expect(r.exact).toBe(14.99);
    expect(r.because).toMatch(/on sale/i);
    expect(r.because).toContain('18.49');      // the regular price is still named
  });

  test('A MATCH WITHOUT A PRICE IS NOT A STORE PRICE', () => {
    // Kroger returns a product match with no price when no locationId was sent.
    // Keeping those would make "your store" mean two different things — matched,
    // and priced — and only one of them is worth anything to a host.
    const idx = storePriceIndex([
      { name: 'Beer', matched: true, description: 'Some Lager 12pk' },   // no price
      { name: 'Wine', matched: false },
      { name: 'Ice', matched: true, price: 0 },                          // not a price
    ]);
    expect(idx.size).toBe(0);
    const r = priceForLine({ purchase: BEER, range: [40, 80], storeIndex: idx });
    expect(r.layer).toBe('national');
  });

  test('NO LAYER EVER RETURNS A BAND IT DID NOT EARN', () => {
    // The regional and national layers DO return bands, because both are bands
    // in the plan's own units. Only the store layer refuses, and the contrast is
    // the point.
    const idx = storePriceIndex([{ name: 'Beer', matched: true, price: 18.49 }]);
    expect(priceForLine({ purchase: BEER, range: [40, 80], storeIndex: idx }).range).toBe(null);
    expect(priceForLine({ purchase: BEER, range: [40, 80], state: 'MD' }).range).not.toBe(null);
    expect(priceForLine({ purchase: NAPKINS, range: [20, 30] }).range).toEqual([20, 30]);
  });

  test('the layers are RANKED, so a surface can reason about better and worse', () => {
    expect(PRICE_LAYERS.store.rank).toBeGreaterThan(PRICE_LAYERS.regional.rank);
    expect(PRICE_LAYERS.regional.rank).toBeGreaterThan(PRICE_LAYERS.national.rank);
  });
});

// ─── AND THE LINE THE SHELL ACTUALLY HOLDS ───────────────────────────────────
//
// The shell does not hold an authored band. `playbookFoodPlan` has already
// multiplied `perUnitLow/High` by the regional factor before a row is rendered,
// so a surface that re-ran the regional layer would apply it TWICE — a ~12%
// silent error, the exact failure the engine's own "never both" comment guards.
//
// So the engine now carries the decision it made (`geoBasis`) and the shell
// LABELS instead of re-pricing. Same module, same ordering, no second opinion.
describe('the engine carries which layer priced each line', () => {
  // The Cookout, because it is one of only ELEVEN playbooks with any line at
  // all that geoItemMap maps — measured below, and the reason the store layer
  // is worth building rather than a nicety.
  const cookout = (opts) => playbookFoodPlan(
    { id: 'e-3l', type: 'The Cookout', date: '2026-08-20', guestMode: 'count', guestCount: 20, guests: [] },
    opts,
  );
  const chicken = (fp) => (fp.list || []).find((l) => l && l.id === 'p_chicken');

  test('(premise) the fixture plan really contains the mapped line', () => {
    // Everything below asserts about `p_chicken`. Written FIRST against a Crab
    // Feast, which has no mapped line at all — this test caught that, and the
    // three "scope" assertions below would otherwise have passed as `basket`
    // while proving nothing about the item path.
    const l = chicken(cookout({}));
    expect(l).toBeTruthy();
    expect(geoItemForPurchase(l)).toBe('chickenLegs');
  });

  test('NO FACTOR: geoBasis is null, and null means national — not "unknown"', () => {
    expect(chicken(cookout({})).geoBasis).toBe(null);
    expect(layerForLine({ purchase: chicken(cookout({})), geoBasis: null }).layer).toBe('national');
  });

  test('ITEM SCOPE: a mapped line records that it used its OWN series', () => {
    const l = chicken(cookout({ priceFactor: 1.1, itemFactors: { chickenLegs: 1.24 } }));
    expect(l.geoBasis).toEqual({ factor: 1.24, item: 'chickenLegs', scope: 'item' });
    // …and the factor it recorded is the one actually in the number beside it.
    expect(l.geoBasis.factor).not.toBe(1.1);
  });

  test('BASKET SCOPE: no series for this line, so the mean stood in — and says so', () => {
    const l = chicken(cookout({ priceFactor: 1.1, itemFactors: {} }));
    expect(l.geoBasis).toEqual({ factor: 1.1, item: null, scope: 'basket' });
    const why = layerForLine({ purchase: l, geoBasis: l.geoBasis }).because;
    expect(why).toMatch(/no published price for this line itself/i);
  });

  test('HOW THIN THE ITEM LAYER ACTUALLY IS — measured, so nobody oversells it', () => {
    // 12 of 491 authored lines across all 45 playbooks carry their own BLS
    // series. Every other line takes the basket mean. That is not a defect —
    // BLS publishes average prices for commodities, and this corpus plans
    // dishes — but it IS the reason the summary note below refuses to let
    // "adjusted for your region" imply 491 published prices.
    //
    // This number is allowed to move. It is pinned so that it moves ON PURPOSE.
    let total = 0; let mapped = 0;
    for (const pb of ALL_PLAYBOOKS) {
      const fp = playbookFoodPlan({ id: 'x', type: pb.type, date: '2026-08-20', guestMode: 'count', guestCount: 20, guests: [] });
      if (!fp) continue;
      for (const l of (fp.list || [])) {
        total += 1;
        let k = null; try { k = geoItemForPurchase(l); } catch { k = null; }
        if (k) mapped += 1;
      }
    }
    expect(total).toBeGreaterThan(400);
    expect(mapped).toBe(12);
  });

  test('the two regional answers do NOT read the same, because they are not', () => {
    // A host who is told "regional" for both cannot tell whether they got beer's
    // own published price or a whole-basket average wearing beer's name.
    const own = layerForLine({ geoBasis: { factor: 1.24, item: 'beerMalt', scope: 'item' } });
    const mean = layerForLine({ geoBasis: { factor: 1.1, item: null, scope: 'basket' } });
    expect(own.layer).toBe('regional');
    expect(mean.layer).toBe('regional');
    expect(own.because).not.toBe(mean.because);
    expect(own.because).toMatch(/own BLS average price/i);
  });

  test('LABELLING NEVER RETURNS A BAND — that is the whole reason it exists', () => {
    // If this ever returns a range, a caller will render it, and the regional
    // factor lands on the number a second time.
    const idx = storePriceIndex([{ name: 'Beer', matched: true, price: 18.49 }]);
    for (const r of [
      layerForLine({ purchase: BEER, geoBasis: null }),
      layerForLine({ purchase: BEER, geoBasis: { factor: 1.2, item: 'beerMalt', scope: 'item' } }),
      layerForLine({ purchase: BEER, geoBasis: { factor: 1.2, item: null, scope: 'basket' }, storeIndex: idx }),
    ]) {
      expect(r.range).toBeUndefined();
      expect('range' in r).toBe(false);
    }
  });

  test('a STORE price still outranks a regional one here too', () => {
    const idx = storePriceIndex([{ name: 'Beer', matched: true, price: 18.49, promoPrice: 14.99, size: '12 pk' }]);
    const r = layerForLine({ purchase: BEER, geoBasis: { factor: 1.24, item: 'beerMalt', scope: 'item' }, storeIndex: idx });
    expect(r.layer).toBe('store');
    expect(r.exact).toBe(14.99);
    expect(r.onSale).toBe(true);
    expect(r.was).toBe(18.49);
    expect(r.size).toBe('12 pk');
  });

  test('THE UNIT MAP TURNS A SHELF PRICE INTO A LINE TOTAL — where it can', () => {
    // End to end through the layer the shell actually calls. `p_ice` is on the
    // unit-map allowlist and `lbs` is a real unit, so 30 lbs against 10 lb bags
    // is three bags. This is the whole point of the map existing.
    const ICE = { id: 'p_ice', item: 'Ice', unit: 'lbs', units: 30 };
    const idx = storePriceIndex([{ name: 'Ice', matched: true, price: 3.49, size: '10 lb', soldBy: 'UNIT' }]);
    const r = layerForLine({ purchase: ICE, geoBasis: null, storeIndex: idx });
    expect(r.layer).toBe('store');
    expect(r.total).toBe(10.47);
    expect(r.packs).toBe(3);
    // The arithmetic is printed, because a total a host cannot check against
    // the shelf is one they have to take on faith.
    expect(r.math).toMatch(/3 × 10 lb at \$3\.49 = \$10\.47/);
  });

  test('…AND LEAVES IT A REFERENCE WHERE IT CANNOT — which is most lines', () => {
    // Same store, same call, a line the map refuses. The shelf price is still
    // real and still shown; it just does not become a number in the budget.
    // Nothing degrades: this is exactly what the store layer did before the map.
    const idx = storePriceIndex([{ name: 'Beer', matched: true, price: 18.49, size: '12 pk', soldBy: 'UNIT' }]);
    const r = layerForLine({ purchase: { ...BEER, unit: 'drinks', units: 42 }, geoBasis: null, storeIndex: idx });
    expect(r.layer).toBe('store');
    expect(r.exact).toBe(18.49);      // the reference survives
    expect(r.total).toBe(null);       // the total does not exist
    expect(r.math).toBe(null);
  });

  test('…and an UNMATCHED line keeps the regional label it earned', () => {
    // The ordering only ever replaces the lines the better layer can speak to.
    const idx = storePriceIndex([{ name: 'Beer', matched: true, price: 18.49 }]);
    const r = layerForLine({ purchase: NAPKINS, geoBasis: { factor: 1.1, item: null, scope: 'basket' }, storeIndex: idx });
    expect(r.layer).toBe('regional');
    expect(r.exact).toBe(null);
  });
});

describe('the sheet never claims more coverage than it has', () => {
  test('COUNTED, not estimated', () => {
    const cov = layerCoverage([
      // Two store matches, and only ONE of them has units the map could
      // reconcile — which is the normal case, not an edge one.
      { layer: 'store', total: 57.39 }, { layer: 'store', total: null },
      { layer: 'regional', scope: 'item' }, { layer: 'regional', scope: 'basket' },
      { layer: 'national' },
    ]);
    expect(cov).toEqual({ store: 2, regional: 2, national: 1, regionalItem: 1, storeTotal: 1, total: 5 });
  });

  test('A MATCHED PRICE AND A SPENDABLE TOTAL ARE COUNTED APART', () => {
    // The gap between them IS the feature's honest limit: a shelf price whose
    // package the plan's units cannot be reconciled against is a reference, and
    // a sheet that counted it as "priced" would imply a number a host can add
    // up. 63 of 491 corpus lines can produce a total; the rest cannot.
    expect(coverageNote({ store: 6, regional: 0, national: 2, storeTotal: 0, total: 8 }))
      .toMatch(/None of them convert to a line total yet — they are shelf references\./);
    expect(coverageNote({ store: 6, regional: 0, national: 2, storeTotal: 2, total: 8 }))
      .toMatch(/2 of those convert to a line total; the rest are shelf references\./);
    // All of them convert ⇒ no clause at all. A caveat with nothing to caveat
    // is noise, and noise is not honesty.
    expect(coverageNote({ store: 6, regional: 0, national: 2, storeTotal: 6, total: 8 }))
      .toBe('6 of 8 lines priced at your store; the rest are averages.');
  });

  test('"adjusted for your region" is not allowed to imply a published local price', () => {
    // The regional layer answers at two qualities, and 12 of 491 authored lines
    // in this corpus get the better one. A note that said only "every line
    // adjusted for your region" would be true and would mislead — which is the
    // failure mode this whole module exists to stop.
    expect(coverageNote({ store: 0, regional: 20, national: 0, regionalItem: 1, total: 20 }))
      .toBe('Every line adjusted for your region. 1 use that item’s own published price; the rest use the regional average.');
    // No item-scope line ⇒ no claim about published prices at all.
    expect(coverageNote({ store: 0, regional: 20, national: 0, regionalItem: 0, total: 20 }))
      .toBe('Every line adjusted for your region.');
  });

  test('"your store" never implies every line', () => {
    // The sentence that stops the best layer speaking for the whole sheet —
    // which is exactly how a true fact becomes a misleading one.
    expect(coverageNote({ store: 2, regional: 1, national: 5, storeTotal: 2, total: 8 }))
      .toBe('2 of 8 lines priced at your store; the rest are averages.');
    expect(coverageNote({ store: 4, regional: 0, national: 0, storeTotal: 4, total: 4 }))
      .toBe('Every line priced at your store.');
  });

  test('…and it falls back through the layers, naming the best one that reached anything', () => {
    expect(coverageNote({ store: 0, regional: 3, national: 5, total: 8 })).toMatch(/3 of 8 lines adjusted/);
    expect(coverageNote({ store: 0, regional: 0, national: 8, total: 8 })).toMatch(/^National averages/);
    expect(coverageNote({ total: 0 })).toBe(null);
  });
});

// ─── A MATCH WE DO NOT BELIEVE IS NOT A STORE PRICE ─────────────────────────
//
// The match-quality guard was written for `storeLineTotal` and lived only
// there, so it decided the TOTAL and nothing else. The price itself — the line
// a host actually reads — was rendered from the same hit without ever asking.
// A rejected match still published its price; only the arithmetic on top of it
// was withheld.
//
// Probed live at a Baltimore store on 2026-09-23, and these are that probe's
// real returns, not invented fixtures:
//
//   "prosecco"      → Tuscany Candle™ Premium Satin Wax Melts - Peach Prosecco
//   "injera"        → Airplus® Gel Women's Orthotic Insole Shoe Inserts, $8.99
//   "espresso cups" → Private Selection® Espresso Roast Coffee Pods, $6.99
//
// Only the first carries a word the guard can see. The other two are why the
// store layer must also SHOW what it priced — a heuristic catches a familiar
// way of being wrong, never every way.
describe('THE STORE LAYER REFUSES A MATCH IT DOES NOT BELIEVE', () => {
  const idx = (desc) => storePriceIndex([
    { name: 'Ribs (racks)', matched: true, price: 3.29, size: '15.5 oz', soldBy: 'UNIT', description: desc },
  ]);
  const RIBS = { id: 'p_ribs', item: 'Ribs (racks)', unit: 'lbs', units: 11.5 };

  test('(premise) a BELIEVABLE match on the same line really does reach the store layer', () => {
    // Without this, the refusals below would pass against a line that could
    // never have been priced in the first place.
    const r = layerForLine({ purchase: RIBS, storeIndex: idx('Smithfield Extra Tender Pork Back Ribs') });
    expect(r.layer).toBe('store');
    expect(r.exact).toBe(3.29);
  });

  test('a BBQ SAUCE matched to a rack of ribs now prices NOTHING, not just no total', () => {
    // The live match that started this: "Ribs (racks)" → Rib Rack® Original
    // BBQ Sauce. Before today the total was refused and the PRICE still showed.
    const r = layerForLine({ purchase: RIBS, storeIndex: idx('Rib Rack® Original BBQ Sauce') });
    expect(r.layer).toBe('national');
    expect(r.exact).toBe(null);
    expect(r.total).toBe(null);
  });

  test('it FALLS THROUGH rather than erroring — regional still gets its turn', () => {
    // A rejected store match must leave the line exactly where a line with no
    // match sits, which for a geo-mapped line is the regional layer.
    const r = layerForLine({
      purchase: RIBS,
      geoBasis: { factor: 1.12, scope: 'item' },
      storeIndex: idx('Rib Rack® Sea Salt Pork Rinds'),
    });
    expect(r.layer).toBe('regional');
  });

  test('`priceForLine` is gated identically — one rule, both entry points', () => {
    const r = priceForLine({ purchase: RIBS, range: [48, 84], storeIndex: idx('Rib Rack® Original BBQ Sauce') });
    expect(r.layer).toBe('national');
    expect(r.range).toEqual([48, 84]);
  });

  test('THE PRODUCT NAME TRAVELS WITH THE PRICE, because the guard cannot catch everything', () => {
    // The shoe-insert case has no word a blocklist could ever hold. What a host
    // needs is to see what was priced, so `product` must be populated — the
    // shell renders it under the price.
    const r = layerForLine({ purchase: RIBS, storeIndex: idx('Smithfield Extra Tender Pork Back Ribs') });
    expect(r.product).toBe('Smithfield Extra Tender Pork Back Ribs');
  });
});
