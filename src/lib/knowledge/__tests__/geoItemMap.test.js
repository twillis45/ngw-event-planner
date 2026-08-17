// ─── THE ALLOWLIST HAS TO MATCH REAL LINES, AND ONLY THE RIGHT ONES ─────────
//
// Two ways this file can be wrong, and they pull in opposite directions.
//
// TOO NARROW: an exact-match allowlist whose strings have drifted from the
// corpus matches NOTHING. Every call returns null, every price stays national,
// and every test below about composites passes triumphantly while the feature is
// dead. That is the failure the PREMISE block exists to catch, and it is the
// likely one — a copy edit to an item name is enough to cause it.
//
// TOO WIDE: a composite dish picks up a raw-commodity factor and the app shows a
// localized price that is fabricated. Worse than the national average it
// replaced, because it looks researched.
import { geoItemForPurchase, GEO_MAPPED_LINES } from '../geoItemMap';
import { ALL_PLAYBOOKS } from '../../playbooks';

const allPurchases = () => ALL_PLAYBOOKS.flatMap((pb) => (pb && pb.purchases) || []);

describe('PREMISE — every allowlisted string still exists in the corpus', () => {
  test('each mapped line matches at least one real priced purchase', () => {
    // Without this the whole file is theatre. An allowlist matched on exact text
    // is only as good as the text, and the text is edited by people writing copy
    // who have no reason to know this file exists.
    const purchases = allPurchases();
    const mapped = purchases.filter((p) => geoItemForPurchase(p));
    expect(purchases.length).toBeGreaterThan(400);        // the corpus really loaded
    expect(mapped.length).toBeGreaterThan(0);             // something matched at all
    // Every entry in the list earns its place — a stale entry is a silent hole.
    const hitGeos = new Set(mapped.map((p) => geoItemForPurchase(p)));
    expect([...hitGeos].sort()).toEqual(['beerMalt', 'breadWhite', 'chickenLegs', 'chickenWhole', 'wineTable']);
  });

  test('the list is small, and that is the intended shape', () => {
    // If this ever jumps it means someone started matching loosely. Ten commodity
    // series against a corpus of dishes cannot honestly cover much.
    expect(GEO_MAPPED_LINES).toBeLessThan(20);
  });
});

describe('composites never take a commodity factor', () => {
  // The whole reason this is a curated list. Each of these contains a commodity
  // word and must still resolve to null.
  const mustNotMatch = [
    { id: 'p_potato_salad', item: 'Potato salad ingredients' },
    { id: 'p_dessert', item: 'Banana pudding, pound cake & peach cobbler (red velvet)' },
    { id: 'p_protein', item: 'Burgers, hot dogs & chicken' },
    { id: 'p_chips', item: 'Chips + dips (queso, guac, salsa, French onion)' },
    { id: 'p_beer', item: 'Beer + hard seltzer (cans/bottles, on ice)' },
    { id: 'p_bread', item: 'Bread / rolls' },
    { id: 'p_buns', item: 'Burger + hot dog buns / bread' },
    { id: 'p_champagne', item: 'Champagne / sparkling wine for the toast' },
  ];
  test.each(mustNotMatch)('$item is not mapped', (purchase) => {
    expect(geoItemForPurchase(purchase)).toBeNull();
  });

  test('a matching id with different text does NOT match', () => {
    // Substring matching would let "Beer + hard seltzer" through on id alone.
    expect(geoItemForPurchase({ id: 'p_beer', item: 'Beer and something else' })).toBeNull();
    expect(geoItemForPurchase({ id: 'p_wine', item: 'Wine tasting kit' })).toBeNull();
  });

  test('the right text under the WRONG id does not match either', () => {
    expect(geoItemForPurchase({ id: 'p_snacks', item: 'Beer' })).toBeNull();
  });
});

describe('it maps, and refuses to price', () => {
  test('the module exposes NO factor or band function', () => {
    // Board ruling 2026-08-16: geography is already applied in production as a
    // backend basket factor, and a second client-side multiplier would
    // double-apply on the money path from a frozen snapshot. This file names
    // which line may claim which BLS series and stops there. If a band function
    // reappears here, that ruling is being undone by accident.
    // eslint-disable-next-line global-require
    const mod = require('../geoItemMap');
    expect(typeof mod.geoItemForPurchase).toBe('function');
    expect(mod.geoBandFor).toBeUndefined();
    expect(mod.applyGeo).toBeUndefined();
  });

  test('junk input is answered, not thrown at', () => {
    expect(() => geoItemForPurchase(null)).not.toThrow();
    expect(geoItemForPurchase(null)).toBeNull();
    expect(geoItemForPurchase({ id: 'p_beer' })).toBeNull();       // no item text
  });
});
