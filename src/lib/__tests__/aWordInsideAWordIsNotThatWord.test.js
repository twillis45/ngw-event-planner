// ─── "SCRUBBER" IS NOT A RUB, AND "MASTER OF MIXES" IS NOT A MIX ─────────────
//
// The wrong-product check (`matchLooksLikeTheLine`) refused a match whose name
// CONTAINED a form word the line did not ask for. Contained, not named:
// replaying every live store result saved on 11/24/2026 through it showed it
// throwing away the right product for batch 4 lines at all three stores:
//
//   sponges        → Scrub Daddy® Dual-Sided Sponge and Scrubber Multi-Pack  ("rub")
//   simple syrup   → Master of Mixes® Cocktail Essentials Simple Syrup       ("mix")
//   balloons       → JA-RU Mixed Balloons                                    ("mix")
//   N/A sparkling  → Owen's … Non Alcoholic Cocktail Mixer                   ("mix")
//
// Two more were the right product NAMED by a form word neither the line nor
// its search term carried: salad greens → "… Baby Spring Mix", and cleaning
// spray → "… Multi-Surface Spray Starter Kit" (Old Town). Those are fixed by a
// term that names the form, probed at all three stores. (Bug spray and stain
// spray looked affected in a first replay keyed on the term alone; their line
// text already says "spray", so they never were.)
//
// Owner, 11/24/2026: approved. Nothing here changes a price.
import { matchLooksLikeTheLine, storeSearchTerm } from '../knowledge/storeUnitMap';

const looks = (line, description) => matchLooksLikeTheLine({ line, term: storeSearchTerm(line), description });

describe('a form word counts only as a whole word', () => {
  test('the four right products the fragment rule threw away now match', () => {
    expect(looks({ id: 'p_dish_sponges', item: 'Sponges' }, 'Scrub Daddy® Dual-Sided Sponge and Scrubber Multi-Pack')).toBe(true);
    expect(looks({ id: 'p_mocktail_syrup', item: 'Syrups' }, 'Master of Mixes® Cocktail Essentials Simple Syrup')).toBe(true);
    expect(looks({ id: 'p_decor_balloons', item: 'Balloons' }, 'JA-RU Mixed Balloons')).toBe(true);
    expect(looks({ id: 'p_cleanup_sponges', item: 'Sponges' }, 'Scrub Daddy® Dual-Sided Sponge and Scrubber Multi-Pack')).toBe(true);
    expect(looks({ id: 'p_zeroproof_nabubbly', item: 'N/A bubbly for non-drinkers' }, "Owen's Craft Mixers Sparkling Cranberry Non Alcoholic Cocktail Mixer")).toBe(true);
  });

  test('the wrong products it was written for are still refused', () => {
    // The original cases (storeUnitMap, 2026-09-23 probes) — whole words all.
    expect(looks({ id: 'p_ribs', item: 'Ribs (racks)' }, 'Rib Rack® Original BBQ Sauce')).toBe(false);
    expect(looks({ id: 'p_bubbly', item: 'Sparkling wine / prosecco for mimosas' }, 'Tuscany Candle™ Peach Prosecco Wax Melts')).toBe(false);
    // A plural is still the word.
    expect(looks({ id: 'p_ribs', item: 'Ribs (racks)' }, 'Smokehouse Rib Sauces Variety')).toBe(false);
  });
});

describe('a term that names the form finds the right product', () => {
  // Probed live 11/24/2026 at Old Town, The Yards and McHenry Row: each new term
  // returned the product below (or the same product line) at all three.
  const cases = [
    [{ id: 'p_veg_greens', item: 'Salad greens' }, 'salad greens spring mix', 'BrightFarms Spring Mix Lettuce, 4oz Salad'],
    [{ id: 'p_cleanup_supplies', item: 'Cleaning spray' }, 'all purpose cleaner spray', 'Lysol All Purpose Cleaner Spray Lemon Breeze'],
  ];
  test.each(cases)('%o searches "%s" and keeps "%s"', (line, term, description) => {
    expect(storeSearchTerm(line)).toBe(term);
    expect(looks(line, description)).toBe(true);
  });
});
