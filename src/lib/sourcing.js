// Protein SOURCING tiers (Figma 1597-2 "Sourcing"). How the host gets the proteins
// reshapes the spread's cost: a warehouse/bulk run is cheapest, a butcher is the
// flavor-first middle, and pre-marinated grocery trays cost a convenience premium.
// factor scales the PROTEIN lines' unit cost (like beverageFactor scales the bar) so
// the budget actually moves with the choice. Honest framing: a typical tier delta, not
// a quote — the spread already shows a range. Default tier = 'butcher' (the baseline).
export const SOURCING_TIERS = [
  { id: 'butcher', label: 'Fresh butcher',          note: 'Best flavor · pickup day-before', factor: 1.0 },
  { id: 'costco',  label: 'Costco / bulk',          note: 'Lowest cost · buy in advance',     factor: 0.85 },
  { id: 'grocery', label: 'Pre-marinated (grocery)', note: 'Fastest · least prep',            factor: 1.18 },
];

export const DEFAULT_SOURCING = 'butcher';

export function sourcingTier(id) {
  return SOURCING_TIERS.find((t) => t.id === id) || SOURCING_TIERS.find((t) => t.id === DEFAULT_SOURCING);
}

export function sourcingFactor(id) {
  return sourcingTier(id).factor;
}

// Is this purchase a PROTEIN (the thing sourcing reshapes)? Keyword-matched on the food
// lines; never touches sides/drinks/supplies.
const PROTEIN_RE = /\b(rib|ribs|chicken|brisket|sausage|hot ?link|half-?smoke|pork|beef|turkey|seafood|shrimp|fish|crab|crawfish|lamb|wing|oxtail|meatball|steak|burger|salmon|prawn|bacon|ham)\b/i;
export function isProteinItem(name) {
  return PROTEIN_RE.test(String(name || ''));
}

// CANONICAL per-channel protein prices ($/lb), researched once and shared by every
// playbook — so a Costco/grocery pick re-prices ANY protein with real numbers, not a
// blanket factor, without re-authoring `sourcingPrices` on 500+ items. An item's own
// `sourcingPrices` still wins; the DEFAULT tier (butcher) is intentionally NOT overridden
// here (it keeps the playbook's authored base, so default money math / tests are unchanged).
// Sources are real 2025–26 retail price guides (Costco / grocery / butcher). Stamp:
export const CANONICAL_PROTEIN_PRICES = [
  { key: 'ribs',    re: /\b(rib|ribs|spare ?rib|baby ?back|st\.? ?louis)\b/i,        butcher: [4, 7], costco: [3, 4],  grocery: [5, 8],  sources: ['https://redtablemeats.com/fresh-meat/pork/how-much-are-pork-ribs-at-costco/', 'https://www.eatlikenoone.com/costco-pork-guide.htm'] },
  { key: 'brisket', re: /\bbrisket\b/i,                                              butcher: [6, 10], costco: [4, 7],  grocery: [5, 9],  sources: ['https://www.smokedbbqsource.com/brisket-prices/', 'https://summeryule.com/costco-brisket/'] },
  { key: 'chicken', re: /\b(chicken|drumstick|thigh|wing|quarter|poultry)\b/i,        butcher: [2, 4], costco: [1, 2.5], grocery: [3, 5],  sources: ['https://www.eatlikenoone.com/chicken-prices-at-costco.htm'] },
  { key: 'sausage', re: /\b(sausage|hot ?link|half-?smoke|brat|kielbasa|andouille|frank|hot ?dog)\b/i, butcher: [4, 7], costco: [3, 5], grocery: [4, 6], sources: ['https://www.beyondforest.org/post/costco-meat-prices-list-2025'] },
  { key: 'beef',    re: /\b(burger|ground beef|patty|patties|steak|beef|meatball)\b/i, butcher: [5, 8], costco: [3, 6],  grocery: [5, 8],  sources: ['https://www.beyondforest.org/post/costco-meat-prices-list-2025', 'https://www.thekitchn.com/costco-kirkland-90-10-ground-beef-review-23776246'] },
  { key: 'pork',    re: /\b(pork|pulled pork|boston butt|shoulder|bacon|ham)\b/i,    butcher: [3, 6], costco: [2, 4],  grocery: [3, 6],  sources: ['https://www.eatlikenoone.com/costco-pork-guide.htm'] },
  { key: 'shrimp',  re: /\b(shrimp|prawn)\b/i,                                       butcher: [8, 13], costco: [6, 10], grocery: [9, 14], sources: ['https://www.eatlikenoone.com/costco-shrimp-guide.htm'] },
  { key: 'seafood', re: /\b(fish|salmon|tilapia|catfish|seafood|crab|crawfish|lobster|oyster|clam|mussel|scallop)\b/i, butcher: [7, 13], costco: [6, 11], grocery: [8, 14], sources: ['https://www.eatlikenoone.com/costco-shrimp-guide.htm'] },
  { key: 'turkey',  re: /\b(turkey)\b/i,                                             butcher: [2, 5], costco: [1.5, 3], grocery: [2, 5],  sources: ['https://www.beyondforest.org/post/costco-meat-prices-list-2025'] },
  { key: 'lamb',    re: /\b(lamb|oxtail|goat)\b/i,                                   butcher: [7, 14], costco: [6, 11], grocery: [8, 16], sources: ['https://www.eatlikenoone.com/price-guide-to-buying-beef-at-costco.htm'] },
];

// canonicalProteinPrice(name, tier) → [lo,hi] per-channel range, or null. Used as the
// ENGINE fallback for proteins lacking their own sourcingPrices, on NON-default tiers.
export function canonicalProteinPrice(name, tier) {
  const m = CANONICAL_PROTEIN_PRICES.find((c) => c.re.test(String(name || '')));
  return m && Array.isArray(m[tier]) ? m[tier] : null;
}

// NON-protein groceries (produce, dairy, fruit, staples, drinks) — a butcher doesn't
// price these, so only the bulk channel moves them: Costco runs ~21% cheaper overall
// than the average grocery (Consumer Reports 2026), but produce/dairy savings are
// modest and waste-prone, so we use a conservative ~10% bulk factor — NOT the deep
// per-lb meat savings. Butcher (default) + grocery = base, so default cost is unchanged.
// Source: https://www.consumerreports.org/money/prices-price-comparison/most-and-least-expensive-supermarkets-a3157951568/
export const NONPROTEIN_CHANNEL_FACTOR = { butcher: 1.0, costco: 0.90, grocery: 1.0 };
export function nonProteinFactor(tier) {
  return NONPROTEIN_CHANNEL_FACTOR[tier] || 1;
}

// Extra WHERE-TO-SHOP stores for supplies. HONEST scope: these stores verifiably CARRY
// the items (Home Depot/Lowe's stock charcoal/propane/coolers/tables/canopies/fans;
// Amazon carries those + disposables) — so we surface them as buying options. We do NOT
// attach a price factor: a definitive per-unit price comparison vs grocery couldn't be
// sourced, so claiming "cheaper at Home Depot" would be fabrication. Buying option ≠ price.
const HARDWARE_RE = /\b(charcoal|propane|firewood|lighter fluid|wood chips?|cooler|ice ?chest|folding table|canopy|tent|pop-?up|fan|citronella|tiki|string light|extension cord|generator|contractor bag|trash)\b/i;
const DISPOSABLE_RE = /\b(plate|cup|cutlery|fork|knife|spoon|napkin|foil|wrap|to-?go|container|paper towel|tablecloth|table cover|serving)\b/i;
export function extraSupplyStores(name) {
  const n = String(name || '');
  const out = [];
  if (HARDWARE_RE.test(n)) out.push('Home Depot', "Lowe's");
  if (HARDWARE_RE.test(n) || DISPOSABLE_RE.test(n)) out.push('Amazon');
  return out;
}

// CANONICAL SUBSTITUTES — sensible budget/availability swaps for common items, so the
// swap chips appear engine-wide even where a playbook didn't author `alternatives`.
// Each is "Name — why" (string form: a swap keeps the line's own BLS/canonical cost).
// An item's OWN authored alternatives always win; this is the shared fallback.
const SUBS = [
  { re: /\brib|ribs\b/i,                      subs: ['Pork shoulder — cheaper, feeds the same crowd', 'Bone-in chicken thighs — budget, hard to overcook'] },
  { re: /\bbrisket\b/i,                        subs: ['Chuck roast — cheaper, same low-and-slow', 'Pork shoulder — budget swap'] },
  { re: /\bchicken\b/i,                        subs: ['Drumsticks — lowest cost per lb', 'Whole chicken cut up — cheaper per lb'] },
  { re: /\b(burger|ground beef|patty)\b/i,     subs: ['Turkey burgers — leaner, cheaper', 'Plant-based patties — if beef is out'] },
  { re: /\b(sausage|hot ?link|brat)\b/i,       subs: ['Turkey sausage — leaner budget swap', 'Store-brand links — cheaper'] },
  { re: /\b(shrimp|prawn)\b/i,                 subs: ['Frozen shrimp — cheaper year-round', 'Tilapia — budget seafood'] },
  { re: /\b(fish|salmon|seafood)\b/i,          subs: ['Frozen fillets — cheaper, consistent', 'Tilapia/catfish — budget swap'] },
  { re: /\b(pork|pulled pork)\b/i,             subs: ['Bone-in chicken thighs — cheaper', 'Turkey — leaner option'] },
  { re: /\bgreens?\b/i,                        subs: ['Frozen greens — cheaper out of season', 'Cabbage — budget, holds longer'] },
  { re: /\b(potato salad|mac|coleslaw)\b/i,    subs: ['Deli/store-made — if short on time', 'Bag of chips — cheapest side'] },
  { re: /\b(cornbread|bun|bread|roll)\b/i,     subs: ['Store-brand — cheaper', 'Sliced bread — budget standby'] },
  { re: /\b(cake|cobbler|dessert|pie)\b/i,     subs: ['Grocery sheet cake — cheaper', 'Store-made — if no time to bake'] },
  { re: /\b(soda|tea|lemonade|punch|drink)\b/i, subs: ['Store-brand / from concentrate — cheaper', 'Make from scratch — lowest cost'] },
];
export function canonicalSubstitutes(name) {
  const m = SUBS.find((s) => s.re.test(String(name || '')));
  return m ? m.subs : [];
}
