import { moneyProvenanceFor } from './budgetEstimator/moneyProvenance.js';

// ─── Provenance markers ─────────────────────────────────────────────────────
// SOURCING_TIERS re-prices every protein line in the app and had no provenance
// field. Its record carries a MEASURED finding: this file USED TO STATE that the
// grocery premium was "honestly backed by the raw per-channel data below", and
// computing the channel ratios from CANONICAL_PROTEIN_PRICES gives means of 0.706
// (costco) and 1.064 (grocery) against the shipped 0.85 and 1.18. The data
// corroborates the direction of both factors and the magnitude of neither, so the
// claim of backing was withdrawn 2026-09-19 (see the block above SOURCING_TIERS
// for the five bases measured and why no factor moved). No number changed.
//
// NONPROTEIN_CHANNEL_FACTOR is the one constant in these files that cites a
// real dated source — and it is still ungrounded, because it deliberately
// ships 10% where the source says 21%. That is `editorial`, not `researched`.
export const SOURCING_TIERS_PROVENANCE          = moneyProvenanceFor('sourcing.tiers');
export const NONPROTEIN_CHANNEL_PROVENANCE      = moneyProvenanceFor('sourcing.nonProteinChannel');

// FOOD-2A Stage 0 — price-table provenance. Metadata ONLY: no function reads these at
// runtime, so this changes no math. It exists so the canonical $ ranges below carry a
// visible vintage + a review cadence (the audit flagged "stale prices, no versioning").
// Bump `asOf`/`version` whenever the ranges are re-researched.
export const PRICE_TABLE_META = {
  version: '1.0.0',
  asOf: '2026-01',            // the vintage of the researched ranges below
  reviewCadence: 'yearly',   // re-verify the canonical ranges at least annually
  source: 'BLS APU + 2025–26 retail price guides (per-line `sources`)',
};

// Protein SOURCING tiers (Figma 1597-2 "Sourcing"). Each tier trades on a DIFFERENT
// axis, and its label names that trade in ITEM-NEUTRAL terms (this is one global tier
// applied across every line, so the label can't assume a product form): butcher on
// FLAVOR, Costco on COST, grocery on CONVENIENCE/SPEED — your regular store, one run,
// no special butcher pickup or Costco trip. Earlier drafts said "pre-marinated" then
// "pre-made" grocery; both were dropped because a product form doesn't fit every item
// the tier touches (host feedback) and collided with the per-item "Grocery" store chip.
// factor scales the PROTEIN lines' unit cost (like beverageFactor scales the bar) so
// the budget moves with the choice.
//
// THESE FACTORS ARE EDITORIAL, NOT DERIVED — read this before quoting them.
// This comment used to say the grocery premium (+18%) was backed by the raw per-channel
// data below. MEASURED 2026-09-19 against CANONICAL_PROTEIN_PRICES (n=10, every line
// carrying its own retail-guide URLs), midpoint to midpoint:
//
//     basis                       costco   grocery
//     mean of per-item ratios      0.706    1.064
//     ratio of the channel means   0.733    1.059
//     median of per-item ratios    0.690    1.048
//     ratio of the low bounds      0.740    1.083
//     ratio of the high bounds     0.730    1.046
//     SHIPPED                      0.85     1.18
//
// Every basis agrees on the DIRECTION of both factors and not one reproduces either
// MAGNITUDE: the shipped Costco discount is ~20% shallower than this file's own
// arithmetic and the shipped grocery premium ~11% steeper. The numbers are NOT moved to
// match, for two reasons kept separate on purpose.
//   (1) THE TABLE DOES NOT DETERMINE ONE NUMBER. The five defensible bases above span
//       0.69-0.74 and 1.05-1.08, and the sentence that claimed backing never named a
//       basis. Picking one now and re-pricing every protein line behind it would be a
//       product decision wearing a research finding's clothes.
//   (2) POPULATION. `srcFactorFor` (playbooks/index.js) applies this factor ONLY to a
//       protein line that resolves NO per-tier range — i.e. exactly the lines
//       CANONICAL_PROTEIN_PRICES does not price. Measured across ALL_PLAYBOOKS on a
//       non-default tier: 6 protein lines use authored `sourcingPrices`, 32 resolve in
//       the canonical table, and 0 fall through to this factor. What it really prices is
//       host-authored protein the table misses. The table is the COMPLEMENT of this
//       factor's population, so its arithmetic is an analogy for these numbers and never
//       a derivation of them.
// So the record stays `estimate` (SOURCING_TIERS_PROVENANCE), and the card shows the
// live "~$X more" delta, so the note names the convenience trade, not a static price
// claim. Default tier = 'butcher'.
export const SOURCING_TIERS = [
  { id: 'butcher', label: 'Fresh butcher',   note: 'Best flavor · pickup day-before', factor: 1.0 },
  { id: 'costco',  label: 'Costco / bulk',   note: 'Lowest cost · buy in advance',     factor: 0.85 },
  { id: 'grocery', label: 'Grocery · one-stop', note: 'Fastest · grab it on your regular run', factor: 1.18 },
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
// Carrier goods are never the protein, even when their authored name is worded after
// what they hold ("Burger + hot dog buns" contains "burger" but IS bread, not beef) —
// without this, that line matched PROTEIN_RE and inherited ground-beef $/lb pricing
// under a non-default sourcing tier (a $0.30-0.60 bun repriced to $3-8 each).
const CARRIER_RE = /\b(bun|buns|bread|roll|rolls|bagel|bagels|tortilla|tortillas)\b/i;

// ── A THING NAMED AFTER A PROTEIN IS NOT THE PROTEIN (2026-09-25) ───────────
//
// Same defect as the bun above, one aisle over. These lines are sold BY THE
// POUND, so a unit check cannot save them — they are simply not the meat their
// name mentions, and the canonical table happily quoted them seafood prices.
// Measured at 30 guests on a non-default tier:
//
//   Fish Fry      · "Cornmeal / fish fry breading + flour"   $2  -> $36
//                   authored $0.55-3/lb, repriced at fish's $9-14/lb
//   Crawfish Boil · "Crawfish/crab boil seasoning … + cayenne + salt"
//                   $14 -> $48, repriced as crawfish
//   Low Country   · "Old Bay / crab boil seasoning (dry + liquid)"
//                   $0.40-1 a serving, quoted $8-14
//
// The pattern is a product CATEGORY word — seasoning, breading, sauce, mix —
// sitting beside the protein it is meant for. That word is the signal, and it
// is a smaller and more stable set than the list of proteins it protects
// against, which is why the exclusion lives here rather than as ever more
// careful protein patterns.
//
// This is the same family as the store-match guard in priceLayers: "ice"
// returning Lipton Iced Tea Bags, "injera" returning shoe inserts. A name
// containing a word is not the thing.
const CONDIMENT_RE = /\b(seasoning|seasonings|spice|spices|rub|marinade|brine|sauce|gravy|broth|stock|bouillon|breading|batter|mix|cornmeal|flour|oil|butter)\b/i;

export function isProteinItem(name) {
  const s = String(name || '');
  if (CARRIER_RE.test(s)) return false;
  if (CONDIMENT_RE.test(s)) return false;
  return PROTEIN_RE.test(s);
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
  // ── FRY FISH AND CRAWFISH CAME OUT OF `seafood` (board, 2026-09-25) ────────
  //
  // `seafood` priced ELEVEN species — crawfish, crab, lobster, oyster, scallop
  // and five fish — from ONE citation, and that citation is a Costco SHRIMP
  // guide. Two practitioner seats fetched real prices and the band was wrong by
  // 2x on both rows anyone had complained about:
  //
  //   live crawfish, by the sack   table $8-14   sourced $2.90-6.00 (3 LA sources)
  //   whiting / catfish / porgy    table $9-14   sourced $3.30-5.99 (2 Baltimore)
  //
  // Every crawfish price above $6 either seat could find was BOILED, sold by the
  // plate — a prepared product, and these lines say live. And a third DMV
  // counter stocks no whiting, porgy, croaker or catfish at all; its cheapest
  // fish is $18.99. Fry fish and center-of-plate fish are sold by DIFFERENT
  // BUSINESSES, so one band across both is the midpoint of two counters and
  // wrong at each — 2x high for the fry counter, 3x low for the other.
  //
  // These two rows carry `grocery` ONLY, on purpose. A butcher does not sell
  // live crawfish by the sack and Costco does not stock whiting or porgy, and
  // no source was found for either. `canonicalProteinPrice` returns null for a
  // missing tier, which leaves the line on its own authored band — the honest
  // answer, and better than inventing a warehouse number to fill the column.
  //
  // PROVENANCE OF THIS BLOCK, because the row it replaces failed exactly here.
  // The prices were fetched by two board seats on 2026-09-25 and I re-fetched
  // two of the four sources MYSELF on 2026-09-26 rather than relay them:
  //   acadiacrawfish  five live sacks, $3.50 / $3.67 / $4.17 / $4.50 / $4.67 a lb
  //   hopkinsseafood  whiting "$3.30 /per pound", the unit stated on the page
  // The mdseafoodmarket listing (catfish $3.99, whiting $5.99, porgy $4.99,
  // perch/tilapia/mullet $4.99) is CONFIRMED as to its figures and AMBIGUOUS as
  // to its unit — the page does not say per pound. Hopkins does, at $3.30, and
  // the two agree, which is why the band stands. Recorded rather than smoothed:
  // the whole reason the old row was wrong is that somebody checked a citation
  // existed instead of reading what it said.
  //
  // NOT FIXED HERE, and still listed in aPoundPriceNeedsAPoundLine's
  // KNOWN_BAND_DISAGREEMENTS: `seafood` below still prices crab, lobster,
  // oyster, clam, mussel, scallop and salmon off the same shrimp page. Those
  // were not measured, so they are left visible rather than quietly adjusted.
  { key: 'fryfish', re: /\b(whiting|porgy|porgies|croaker|catfish|tilapia|mullet|perch)\b/i, grocery: [3, 6],
    sources: ['https://www.mdseafoodmarket.com/collections/fresh-whole-fish-cleaned-to-preference', 'https://hopkinsseafood.com/seafood-shop/fresh-whole-whiting/'] },
  { key: 'crawfish', re: /\b(crawfish|crayfish|mudbug)\b/i, grocery: [3, 6],
    sources: ['https://www.acadiacrawfish.com/product-category/crawfish/live-crawfish/', 'https://kpel965.com/lafayette-crawfish-prices-january-2026-season/', 'https://louisianaradionetwork.com/2026/04/09/46093/'] },
  { key: 'seafood', re: /\b(fish|salmon|seafood|crab|lobster|oyster|clam|mussel|scallop)\b/i, butcher: [7, 13], costco: [6, 11], grocery: [8, 14], sources: ['https://www.eatlikenoone.com/costco-shrimp-guide.htm'] },
  { key: 'turkey',  re: /\b(turkey)\b/i,                                             butcher: [2, 5], costco: [1.5, 3], grocery: [2, 5],  sources: ['https://www.beyondforest.org/post/costco-meat-prices-list-2025'] },
  { key: 'lamb',    re: /\b(lamb|oxtail|goat)\b/i,                                   butcher: [7, 14], costco: [6, 11], grocery: [8, 16], sources: ['https://www.eatlikenoone.com/price-guide-to-buying-beef-at-costco.htm'] },
];

// ── ONE DEFINITION OF "COMPARABLE ON THIS CHANNEL" ─────────────────────────
//
// A channel ratio needs BOTH sides. Rows that carry `grocery` only (fryfish,
// crawfish — no source exists for a butcher sack price or a Costco porgy)
// cannot contribute to a costco-vs-butcher or grocery-vs-butcher ratio.
//
// This lives HERE, beside the table, because two separate test files each grew
// their own copy of the filter the day the partial rows landed — and a rule
// about the table that lives away from the table is the same duplication this
// repo keeps paying for. Every derivation reads this one function.
export const comparableRows = (channel) => CANONICAL_PROTEIN_PRICES.filter(
  (p) => Array.isArray(p[channel]) && Array.isArray(p.butcher),
);

// How many distinct species/cut words a row's regex claims to price. Used by
// the breadth census in backedByATableThatSaysOtherwise: breadth is not a
// defect by itself, but breadth on a single source is how `seafood` came to
// price nine species off one Costco shrimp page.
export const rowBreadth = (row) => String(row.re)
  .replace(/^\/\\b\(?|\)?\\b\/i$/g, '')
  .split('|').length;

// canonicalProteinPrice(name, tier) → [lo,hi] per-channel range, or null. Used as the
// ENGINE fallback for proteins lacking their own sourcingPrices, on NON-default tiers.
// Same carrier exclusion as isProteinItem() — "Burger + hot dog buns / bread" (theCookout's
// p_buns) matches the sausage/beef regexes below on "hot dog"/"burger" alone, which would
// otherwise reprice a $0.30-0.60 bun at $3-8. Guarded here too so this function is safe to
// call directly, not just behind a caller's isProteinItem() pre-filter.
export function canonicalProteinPrice(name, tier) {
  const s = String(name || '');
  if (CARRIER_RE.test(s)) return null;
  const m = CANONICAL_PROTEIN_PRICES.find((c) => c.re.test(s));
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
