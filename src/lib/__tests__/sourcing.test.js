// Bun/bread carrier lines must never be priced as protein — "Burger + hot dog
// buns / bread" (theCookout's p_buns) contains "burger" and "hot dog", which
// match the protein regexes on their own. isProteinItem() already excludes
// carrier words; canonicalProteinPrice() must exclude them too so it's safe
// to call directly, not just behind a caller's isProteinItem() pre-filter.
import { isProteinItem, canonicalProteinPrice } from '../sourcing';

const BUN_ITEMS = ['Burger + hot dog buns / bread', 'Buns / bread', 'Buns / rolls'];

describe('bun/bread carrier lines are never priced as protein', () => {
  test('isProteinItem excludes every bun/bread wording', () => {
    BUN_ITEMS.forEach((name) => expect(isProteinItem(name)).toBe(false));
  });
  test('canonicalProteinPrice returns null for every bun/bread wording, any tier', () => {
    BUN_ITEMS.forEach((name) => {
      expect(canonicalProteinPrice(name, 'costco')).toBeNull();
      expect(canonicalProteinPrice(name, 'grocery')).toBeNull();
    });
  });
  test('a real protein line still prices normally', () => {
    expect(isProteinItem('Burgers, hot dogs & chicken')).toBe(true);
    expect(canonicalProteinPrice('Burgers, hot dogs & chicken', 'costco')).not.toBeNull();
  });
});
