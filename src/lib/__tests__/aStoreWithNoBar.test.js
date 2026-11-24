// ─── A STORE THAT SELLS NO ALCOHOL STILL ANSWERS A SEARCH FOR WINE ───────────
//
// Probed live 2026-11-24 at a Baltimore store (Maryland keeps most chain
// grocers from selling beer and wine). The store answers every alcohol search
// with the nearest thing it does carry:
//
//   "white wine"     → Holland House™ White Cooking Wine
//   "red wine"       → Holland House® Red Cooking Wine
//   "beer"           → Main Root Ginger Beer
//   "sparkling wine" → Hiyo Peach Mango Organic Social Tonic 4pk
//
// The match check let all four through, so the shopping list priced the bar
// with cooking wine and ginger beer and called it "Your store's shelf price".
// The same terms at a DC store of the same chain find real wine and beer, and
// those must keep pricing.
//
// Owner, 11/24/2026: fix it in the client with a word check (option A); a
// check on the store's own category comes later (B). Note wording approved.
import {
  matchLooksLikeTheLine, storeSearchTerm, isAlcoholLine, ALCOHOL_SEARCH_TERMS,
} from '../knowledge/storeUnitMap';
import { storePriceIndex, storeSellsNoAlcohol, noAlcoholNote } from '../priceLayers';
import { ALL_PLAYBOOKS } from '../playbooks';

const WHITE = { id: 'p_wine_cider_white', item: 'White wine (a bottle per table end)' };
const WINE = { id: 'p_wine', item: 'Wine' };
const BEER = { id: 'p_beer', item: 'Beer' };
const BUBBLY = { id: 'p_bubbles', item: 'Sparkling wine for the toast (plus refills)' };
const SELTZER = { id: 'p_beer_seltzer', item: 'Hard seltzer' };
const TONIC = { id: 'p_signature_mixers', item: 'Tonic water for the cocktail' };
const MIXERS = { id: 'p_mixers', item: 'Mixers (club soda, tonic, ginger beer, citrus)' };
const ICE = { id: 'p_ice', item: 'Ice for drinks and bar service' };

const looks = (line, description) => matchLooksLikeTheLine({ line, term: storeSearchTerm(line), description });

describe('an alcohol line rejects what a dry store sends back', () => {
  test('the four live returns from the store with no bar are rejected', () => {
    expect(looks(WHITE, 'Holland House™ White Cooking Wine')).toBe(false);
    expect(looks(WINE, 'Holland House® Red Cooking Wine')).toBe(false);
    expect(looks(BEER, 'Main Root Ginger Beer')).toBe(false);
    expect(looks(BUBBLY, 'Hiyo Peach Mango Organic Social Tonic 4pk')).toBe(false);
  });

  test('the same terms at a store with a bar still match (live, The Yards, 11/24/2026)', () => {
    expect(looks(WHITE, 'Whitehaven Sauvignon Blanc New Zealand White Wine')).toBe(true);
    expect(looks(WINE, 'Apothic Red Blend California Red Wine')).toBe(true);
    expect(looks(BEER, 'Samuel Adams Winter Break Seasonal Variety Beer')).toBe(true);
    expect(looks(BUBBLY, 'La Marca Prosecco Sparkling Wine')).toBe(true);
    expect(looks(SELTZER, 'Topo Chico Hard Seltzer Variety Pack')).toBe(true);
  });

  test('non-alcohol drinks lines are left alone: a tonic line still buys tonic', () => {
    expect(looks(TONIC, 'Canada Dry Tonic Water, 1 L bottle')).toBe(true);
    // The mixers line searches "club soda"; a tonic coming back is a mixer.
    expect(looks(MIXERS, 'Canada Dry Tonic Water, 1 L bottle')).toBe(true);
  });

  test('exactly five search terms ask a store for alcohol', () => {
    expect([...ALCOHOL_SEARCH_TERMS].sort()).toEqual(['beer', 'hard seltzer', 'red wine', 'sparkling wine', 'white wine']);
    expect(isAlcoholLine(WHITE)).toBe(true);
    expect(isAlcoholLine(SELTZER)).toBe(true);
    expect(isAlcoholLine(TONIC)).toBe(false);
    expect(isAlcoholLine(ICE)).toBe(false);
  });

  test('census: no alcohol-free line in any playbook searches an alcohol term', () => {
    const bad = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const p of pb.purchases || []) {
        if (/\b(mocktails?|zero-proof|non-alcoholic|alcohol-free|n\/a)\b/i.test(p.item || '') && isAlcoholLine(p)) {
          bad.push(`${pb.type || pb.name}: ${p.id} "${p.item}" → ${storeSearchTerm(p)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

// ── THE NOTE ABOVE THE DRINKS ──────────────────────────────────────────────
const hit = (line, description) => ({ name: line.item, matched: true, price: 9.99, size: '750 ml', soldBy: 'UNIT', description });
const miss = (line) => ({ name: line.item, matched: false });
const ROLLS = { id: 'p_rolls', item: 'Dinner rolls' };
const list = [ROLLS, ICE, WINE, BEER];

describe('storeSellsNoAlcohol', () => {
  test('a store that priced groceries but no alcohol line: the note shows', () => {
    const idx = storePriceIndex([
      hit(ROLLS, 'King\'s Hawaiian Original Sweet Rolls'),
      hit(ICE, 'Harris Teeter Party Ice'),
      hit(WINE, 'Holland House® Red Cooking Wine'),
      miss(BEER),
    ]);
    const r = storeSellsNoAlcohol(list, idx);
    expect(r).not.toBeNull();
    expect(r.ids.sort()).toEqual(['p_beer', 'p_wine']);
    expect(['regional', 'national', 'mixed']).toContain(r.fallback);
  });

  test('one real alcohol match: no note', () => {
    const idx = storePriceIndex([hit(ROLLS, 'Dinner Rolls'), hit(WINE, 'Apothic Red Blend California Red Wine'), miss(BEER)]);
    expect(storeSellsNoAlcohol(list, idx)).toBeNull();
  });

  test('a store that priced NOTHING says nothing about alcohol — that is an outage, not a dry store', () => {
    expect(storeSellsNoAlcohol(list, storePriceIndex([miss(ROLLS), miss(ICE), miss(WINE), miss(BEER)]))).toBeNull();
  });

  test('no store picked, or no alcohol line on the list: no note', () => {
    expect(storeSellsNoAlcohol(list, null)).toBeNull();
    expect(storeSellsNoAlcohol([ROLLS, ICE], storePriceIndex([hit(ROLLS, 'Dinner Rolls')]))).toBeNull();
  });

  test('a caterer-quoted bar is not the store\'s to sell', () => {
    const quoted = { ...WINE, quotedBy: 'caterer' };
    const idx = storePriceIndex([hit(ROLLS, 'Dinner Rolls'), miss(WINE)]);
    expect(storeSellsNoAlcohol([ROLLS, quoted], idx)).toBeNull();
  });

  test('the note is the approved wording, naming the layer the bar actually fell back to', () => {
    expect(noAlcoholNote({ fallback: 'regional' })).toBe("This store doesn't sell beer or wine. The bar is priced at the regional average. Buy it at a liquor store.");
    expect(noAlcoholNote({ fallback: 'national' })).toBe("This store doesn't sell beer or wine. The bar is priced at the national average. Buy it at a liquor store.");
    expect(noAlcoholNote({ fallback: 'mixed' })).toBe("This store doesn't sell beer or wine. The bar is priced at the regional and national averages. Buy it at a liquor store.");
    expect(noAlcoholNote(null)).toBeNull();
  });
});
