// ─── WHICH PRICED LINES MAY CARRY A REGIONAL FACTOR ─────────────────────────
//
// `geoCostFactors` holds real BLS regional multipliers for ten commodities.
// `applyGeo` can move a band with them. Between the two sat nothing, so the
// factors were computed, tested, and never applied to a single price in the
// product — the app showed an honest note saying prices were NOT adjusted, and
// that note was the whole of the feature.
//
// THE MISMATCH THAT MAKES THIS A CURATED LIST AND NOT A REGEX. BLS prices
// COMMODITIES (white pan bread, whole chicken, malt beverages). The corpus
// prices DISHES. Of 537 priced lines, 79 so much as mention a commodity word,
// and most of those are composites:
//
//     "Potato salad ingredients"          potatoes + mayo + eggs + celery
//     "Burgers, hot dogs + links"         beef + pork + casings
//     "Banana pudding, pound cake..."     a dessert table
//     "Chips + dips (queso, guac, salsa)" chips are a minority of the cost
//
// A regex on /potato/ would put the raw-potato factor — which swings to 0.823 in
// the Midwest, a 17.7% move — onto a bowl of potato salad whose cost is mostly
// mayonnaise. That is not a localized price; it is a fabricated one, and it
// would be worse than the national average it replaced because it would LOOK
// researched.
//
// So: an explicit allowlist, matched on the purchase id AND the full item text.
// Adding a line here is a deliberate act. The exclusions below are part of the
// document, not an oversight — they record judgments already made so the next
// person does not have to re-derive them.
//
// COVERAGE IS SMALL ON PURPOSE. This reaches roughly 5% of priced lines — the
// honest ceiling of ten commodity series against a corpus of dishes. A bigger
// number here would mean worse prices, not better ones.
//
// THIS FILE MAPS. IT DOES NOT PRICE. (Board ruling, 2026-08-16.)
// Geography is ALREADY applied in production: the backend returns a regional
// basket factor and `playbookFoodPlan` multiplies it into every band. A second,
// client-side multiplier would double-apply on the money path, and would do it
// from a frozen May-2026 snapshot with none of the backend's freshness, failure
// handling, or [0.8, 1.3] clamp.
//
// The precision this file was written to enable already exists server-side and is
// discarded: food_prices.py computes `r / n` per item (line 113) and collapses it
// with fmean one line later. The fix is to stop discarding it there — not to
// rebuild it here from stale numbers.
//
// So what survives is the part that is genuinely client-side work: knowing that
// "Potato salad ingredients" is not potatoes. When the backend returns per-item
// ratios, THIS is the table that says which line may claim which series.

/**
 * Allowlist. `item` must match the purchase's item text EXACTLY (trimmed) —
 * not a substring, not a prefix. An exact match is auditable: you can grep the
 * corpus for the string and see every line it touches.
 */
const ALLOW = Object.freeze([
  // ── Malt beverages ───────────────────────────────────────────────────────
  { id: 'p_beer', item: 'Beer', geo: 'beerMalt' },
  { id: 'p_beer', item: 'Beer (mix of light + craft)', geo: 'beerMalt' },
  { id: 'p_beer', item: 'Beer (mix of light + seasonal/IPA)', geo: 'beerMalt' },

  // ── Table wine ───────────────────────────────────────────────────────────
  { id: 'p_wine', item: 'Wine', geo: 'wineTable' },
  { id: 'p_wine', item: 'Still wine (mix of white/red — lean to what the crowd drinks)', geo: 'wineTable' },
  { id: 'p_wine', item: 'Still wine (white/rosé heavy, some red)', geo: 'wineTable' },
  { id: 'p_wine', item: 'Wine (red + white) for the bar', geo: 'wineTable' },
  { id: 'p_wine', item: 'Wine for the grown folks (optional)', geo: 'wineTable' },

  // ── Bread ────────────────────────────────────────────────────────────────
  // Only the loaf. "Bread / rolls" and "Burger + hot dog buns / bread" are
  // deliberately absent: the BLS series is white PAN bread, and rolls and buns
  // are a different bakery line with their own margin.
  { id: 'p_bread', item: 'White bread (loaves)', geo: 'breadWhite' },

  // ── Chicken ──────────────────────────────────────────────────────────────
  // Two distinct series, and the corpus happens to name the cuts precisely
  // enough to tell them apart, which is why both are safe.
  { id: 'p_chicken', item: 'Whole chicken or cut-up fryer pieces (the main)', geo: 'chickenWhole' },
  { id: 'p_chicken', item: 'Chicken (legs/thighs/quarters)', geo: 'chickenLegs' },
]);

// ─── DELIBERATE EXCLUSIONS ──────────────────────────────────────────────────
// Recorded so the judgment is not made twice, and so a future "why isn't this
// covered?" has an answer that is not "nobody looked".
//
//   "Beer + hard seltzer (cans/bottles, on ice)"  two categories, seltzer is not
//                                                 a malt-beverage series line
//   "Beer / seltzer", "Beer / wine (…)"           mixed commodities in one band
//   "Wine (red + white + a sparkling…)"           sparkling prices unlike still
//   "Sparkling wine / prosecco…", "Champagne…"    no sparkling series in table
//   "Bread / rolls", "Buns / bread"               rolls and buns, not pan bread
//   "Chips + dips (…)", "Chips, pretzels…"        dips carry most of the cost
//   "Potato salad ingredients"                    mostly not potato, by cost
//   "Burgers, hot dogs & chicken", "Beef, chicken or salmon"
//                                                 multi-protein; no single factor
//   "Banana pudding, pound cake & peach cobbler"  a dessert table, not bananas
//   "Meatballs & sliders (bacon-wrapped…)"        bacon is a garnish here
const EXCLUDED_ON_PURPOSE = 15;

/**
 * geoItemForPurchase(purchase) → a geoCostFactors key, or null.
 * Null is the common and correct answer.
 */
export function geoItemForPurchase(purchase) {
  if (!purchase || !purchase.id) return null;
  const item = String(purchase.item || '').trim();
  if (!item) return null;
  const hit = ALLOW.find((a) => a.id === purchase.id && a.item === item);
  return hit ? hit.geo : null;
}

/** How many priced lines this list can reach — for the audit, never for display. */
export const GEO_MAPPED_LINES = ALLOW.length;
export const GEO_EXCLUSIONS_RECORDED = EXCLUDED_ON_PURPOSE;
