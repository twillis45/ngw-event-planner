// ─── WHEN A SHELF PRICE CAN BECOME A LINE TOTAL ─────────────────────────────
//
// The store layer shipped 2026-09-23 with `range: null` and a stated reason:
// Kroger prices THEIR package ("12 pk", "1 gal", "16 oz") and the plan counts
// the plan's own units ("11.5 lbs", "42 drinks"). Multiplying one by the other
// produces a confidently wrong total, which is worse than the estimate it
// replaced because it looks like a fact.
//
// This file is the reconciliation that was left open. It answers ONE question:
// may this line's quantity and this product's package be multiplied together?
//
// ── WHAT THE MEASUREMENT SAID, AND WHY MOST OF THE ANSWER IS "NO" ───────────
//
// 491 authored lines across 45 playbooks. Their `unit` field is, for the most
// part, NOT a unit of measure — it is a noun for what the host carries out of
// the shop:
//
//     108  lbs          ← the only large measurable population
//      80  kit
//      39  drinks
//      25  servings      25 bottles    22 sets      18 pieces     8 bites
//       … and a tail of one-offs: `sign package`, `book + pen`, `thermometer`,
//         `9x13 cobbler or 2 pies`, `arch/backdrop`, `pumpkins`
//
// `unitBase` is worse — it holds whole sentences (`bottle per ~7 guests`,
// `urn (~40 cups)`, `cake (serves ~15)`). Display strings, not units.
//
// So arithmetic is available for mass and volume, and nowhere else. 94 distinct
// lines carry lb / gal / qt / L.
//
// ── AND EVEN THERE, THE DIMENSION IS NOT ENOUGH ─────────────────────────────
//
// Half of those 94 are MULTI-PRODUCT lines whose quantity is a basket total:
//
//     "Cheese & charcuterie spread (crudite, sliders, skewers, dips)"   8 lbs
//     "Coleslaw, potato salad, hush puppy mix, fries"                   9 lbs
//     "Vegetable sides (green beans, sweet potatoes, brussels sprouts)"
//     "Mixers + garnishes (juice, soda, citrus, simple syrup)"       10.5 L
//
// One matched Kroger product priced across all 8 lbs of a charcuterie spread is
// a fabricated number wearing a real price's credibility. That is the same
// commodity-vs-dish mismatch `geoItemMap` was written for, and it gets the same
// treatment: an explicit allowlist, matched on purchase id AND full item text,
// so adding a line is a deliberate act and the exclusions are part of the
// document rather than an oversight.
//
// ── THE COUNT BRIDGE WAS CONSIDERED AND REFUSED ─────────────────────────────
//
// "45 drinks ÷ a 12 pk = 4 packs" is tempting and it is wrong on this corpus.
// The `drinks` and `bottles` lines are overwhelmingly MIXED:
//
//     "Beer + wine for the adults"                          42 drinks
//     "Soft drinks, juice, water"                           42 drinks
//     "Wine (red + white + a sparkling)"                   9.2 bottles
//
// Four twelve-packs of one matched soda would price a line that is one third
// soda. And `cups` is ambiguous in the worst way — `cups | Drinks | 92 | Red
// drink / Kool-Aid / punch` is a serving; `cups | Supplies | 84 | Disposable
// cups` is a vessel. Same token, opposite meaning, no way for code to tell.
//
// So counts are refused outright. When a genuinely single-product countable
// line exists (one beverage, named), it can be added here with `dimension:
// 'count'` and the parser below already handles `12 pk` / `6 ct`.
//
// ── THE ASYMMETRY THAT JUSTIFIES BEING CONSERVATIVE ─────────────────────────
//
// A false refusal costs a host nothing: the shelf price still shows as a
// reference beside the estimate, exactly as it did before this file existed.
// A false accept puts a wrong total in their budget. So every judgment call in
// the list below resolves toward refusing.

/** Grams per unit of mass. The only mass units this corpus and Kroger use. */
const MASS = Object.freeze({
  lb: 453.59237, lbs: 453.59237, pound: 453.59237, pounds: 453.59237,
  oz: 28.349523125, ozs: 28.349523125, ounce: 28.349523125, ounces: 28.349523125,
  kg: 1000, g: 1, gram: 1, grams: 1,
});

/** Millilitres per unit of volume. US customary — Kroger is a US retailer. */
const VOLUME = Object.freeze({
  gal: 3785.411784, gals: 3785.411784, gallon: 3785.411784, gallons: 3785.411784,
  qt: 946.352946, qts: 946.352946, quart: 946.352946, quarts: 946.352946,
  pt: 473.176473, pts: 473.176473, pint: 473.176473, pints: 473.176473,
  'fl oz': 29.5735295625, floz: 29.5735295625,
  l: 1000, ls: 1000, liter: 1000, liters: 1000, litre: 1000, litres: 1000,
  ml: 1, mls: 1,
});

/** Count tokens Kroger uses for a package of N. Never a unit of measure. */
const COUNT = Object.freeze(['pk', 'pack', 'ct', 'count', 'each', 'ea']);

/**
 * Resolve a unit token to { dimension, per } — `per` being grams, millilitres,
 * or 1 for a count. null when the token is not a unit of measure at all, which
 * is the answer for most of this corpus (`kit`, `set`, `serving`, `bite`).
 */
export function unitDimension(token) {
  const t = String(token || '').trim().toLowerCase().replace(/\.$/, '');
  if (!t) return null;
  if (MASS[t]) return { dimension: 'mass', per: MASS[t] };
  if (VOLUME[t]) return { dimension: 'volume', per: VOLUME[t] };
  if (COUNT.includes(t)) return { dimension: 'count', per: 1 };
  return null;
}

/**
 * Parse Kroger's `items[].size` string into { qty, dimension, per, unit }.
 *
 * The grammar is taken from Kroger's own published examples — "16 oz", "1 lb",
 * "12 pk", "6 ct", "59 fl oz", "1 gal", "0.5 gal", "1 each" — and is
 * deliberately strict. ANYTHING it does not recognise returns null, and null
 * means the line keeps its estimate. A size string this cannot read is not a
 * reason to guess; it is a reason to stop.
 *
 * Unparsed on purpose: ranges ("2-3 lb"), compound packs ("6 x 12 oz" — that is
 * 72 oz OR 6 units depending on what you are counting, and the difference is not
 * recoverable from the string), and anything with no leading number.
 */
export function parseStoreSize(size) {
  const s = String(size || '').trim().toLowerCase();
  if (!s) return null;
  // Compound packs are refused BEFORE the simple match, or "6 x 12 oz" would
  // silently read as 6 of something.
  if (/\d\s*(x|×)\s*\d/.test(s)) return null;
  if (/\d\s*-\s*\d/.test(s)) return null;
  const m = /^([0-9]+(?:\.[0-9]+)?)\s*(fl\s*oz|[a-z]+)$/.exec(s);
  if (!m) return null;
  const qty = Number(m[1]);
  if (!(qty > 0)) return null;
  const unit = m[2].replace(/\s+/g, ' ').trim();
  const d = unitDimension(unit);
  if (!d) return null;
  return { qty, unit, dimension: d.dimension, per: d.per };
}

/**
 * ── THE ALLOWLIST ──────────────────────────────────────────────────────────
 *
 * A line here asserts: THIS purchase's quantity is a quantity of ONE thing, so
 * a matched product's price per package may be multiplied by it.
 *
 * `item` must match the plan line's item text EXACTLY (trimmed). An exact match
 * is auditable — you can grep the corpus for the string and see every line it
 * touches — and it cannot silently swallow a new multi-product line added later
 * under the same purchase id.
 *
 * Grouped by why they qualify, and the REFUSED column beside each group records
 * the judgment so the next person does not re-derive it.
 */
const ALLOW = Object.freeze([
  // ── Ice ───────────────────────────────────────────────────────────────────
  // The cleanest case in the corpus: one commodity, sold by the bag in pounds,
  // and 11 lines of it across the playbooks.
  { id: 'p_ice', item: 'Ice' , term: 'ice' },
  { id: 'p_ice', item: 'Ice (bar, coolers, punch)' , term: 'ice' },
  { id: 'p_ice', item: 'Ice (chilling + drinks)' , term: 'ice' },
  { id: 'p_ice', item: 'Ice (coolers + drinks + red drink)' , term: 'ice' },
  { id: 'p_ice', item: 'Ice (coolers + drinks)' , term: 'ice' },
  { id: 'p_ice', item: 'Ice (coolers + drinks, heat-adjusted)' , term: 'ice' },
  { id: 'p_ice', item: 'Ice (drinks + coolers)' , term: 'ice' },
  { id: 'p_ice', item: 'Ice (for chilling + drinks)' , term: 'ice' },
  { id: 'p_ice', item: 'Ice (≈1-1.5 lb/guest)' , term: 'ice' },
  { id: 'p_ice', item: 'Ice for drinks and bar service' , term: 'ice' },
  { id: 'p_ice', item: 'Ice for the drink tubs' , term: 'ice' },

  // ── Single proteins ───────────────────────────────────────────────────────
  // Each names one animal product bought by weight. A "/" here is an
  // ALTERNATIVE the host picks between, not a sum — they walk out with one.
  //
  // REFUSED in this group, and why:
  //   p_protein "Beef, chicken or salmon (for a seated dinner — plus a veg
  //             main)"  — "plus a veg main" makes the quantity a basket total
  //   p_protein "Burgers, hot dogs & chicken"            — three products
  //   p_burgers_dogs "Burgers, hot dogs + links"         — three products
  //   p_fish    "Fresh fish (whiting, catfish, porgies)" — three species at
  //             three different $/lb, and the line does not say the split
  //   p_greens  "Collard greens (+ smoked turkey/ham hock)" — greens + meat
  //   p_meatwat / p_veganwat — composed dishes, named as such
  { id: 'p_chicken', item: 'Chicken (legs/thighs/quarters)' , term: 'chicken leg quarters' },
  { id: 'p_chicken', item: 'BBQ chicken (bone-in pieces)' , term: 'bone-in chicken' },
  { id: 'p_chicken', item: 'Whole chicken or cut-up fryer pieces (the main)' , term: 'whole chicken' },
  { id: 'p_wings', item: 'Chicken wings' , term: 'chicken wings' },
  { id: 'p_ribs', item: 'Ribs (racks)' , term: 'pork ribs' },
  { id: 'p_ribs', item: 'Pork ribs (racks)' , term: 'pork ribs' },
  // REMOVED 2026-09-23. FOUR search terms were probed against a live store —
  // "whole turkey", "turkey", "whole turkey fresh", "frozen whole turkey" — and
  // every one returns sliced deli meat or a 3 lb breast roast. At the 31.5 lbs
  // this line sizes to, that is eleven breast roasts at $5.00/lb against a whole
  // bird's ~$1.50. No term reaches the product the line means, so the line comes
  // off rather than carrying a price for a different cut.
  //
  // Third removal of the same shape, and the shape is now named: the match guard
  // catches a product of the wrong KIND; it cannot catch the right product in
  // the wrong STATE (crawfish: cooked not live), the wrong FORM (mac & cheese:
  // dry mix not prepared) or the wrong CUT.
  { id: 'p_shrimp', item: 'Fresh shrimp (shell-on / head-on)' , term: 'raw shrimp' },
  { id: 'p_shrimp', item: 'Steamed shrimp (Old Bay)' , term: 'cooked shrimp' },
  // REMOVED 2026-09-23, same probe: the line says LIVE, by the sack. The store
  // returns a 32 oz tub of cooked Cajun crawfish. Fifteen tubs is not a sack,
  // and the description carries no word a blocklist could catch.
  //
  // Both removals are the same lesson: the match guard catches a product of the
  // wrong KIND. It cannot catch the right product in the wrong STATE.
  { id: 'p_sausage', item: 'Smoked sausage (kielbasa / andouille)' , term: 'smoked sausage' },
  { id: 'p_sausage', item: 'Smoked sausage / andouille' , term: 'smoked sausage' },
  { id: 'p_links', item: 'Smoked sausage / hot links' , term: 'smoked sausage' },
  { id: 'p_chicharron', item: 'Chicharrón (ground pork) for revueltas' , term: 'ground pork' },

  // ── Single produce ────────────────────────────────────────────────────────
  // REFUSED: p_mazao "Fresh fruit & vegetables (the mazao / harvest display) —
  // apples, oranges, bananas, gourds, nuts"; p_fruit; p_veg; p_sides_veg —
  // every one of them a basket, and the nuts in the mazao line cost several
  // times what the bananas do.
  { id: 'p_greens', item: 'Collard greens' , term: 'collard greens' },
  { id: 'p_greens', item: 'Collard greens (prosperity)' , term: 'collard greens' },
  { id: 'p_greens', item: 'Collard or mustard greens' , term: 'collard greens' },
  { id: 'p_potatoes', item: 'Small red potatoes' , term: 'red potatoes' },
  { id: 'p_potatoes', item: 'Small red potatoes (new potatoes)' , term: 'red potatoes' },
  { id: 'p_yams', item: 'Sweet potatoes for candied yams' , term: 'sweet potatoes' },
  { id: 'p_watermelon', item: 'Watermelon (red, symbolic + cooling)' , term: 'watermelon' },
  { id: 'p_strawberries', item: 'Strawberries (red garnish / fruit)' , term: 'strawberries' },
  { id: 'p_blackeyedpeas', item: 'Black-eyed peas (good fortune)' , term: 'black eyed peas' },

  // ── Single pantry goods ───────────────────────────────────────────────────
  // REFUSED: anything whose item text says "ingredients" — p_potato_salad,
  // p_slaw, p_beans "Baked beans ingredients", p_mac "Baked mac & cheese
  // ingredients", p_stuffing. "Ingredients" is the corpus's own word for a
  // basket, and it is the single most reliable refusal signal in the list.
  // Also refused: p_cornmeal "Cornmeal / fish fry breading + flour" (+ flour),
  // p_butter "Butter (for melting) + dipping dishes" (+ dishes), p_season
  // (seasoning + cayenne + salt), p_cheese "Cheese (3-4 varieties for the
  // board)" — which says plural products in its own text.
  { id: 'p_oil', item: 'Frying oil (peanut or vegetable)' , term: 'vegetable oil' },
  { id: 'p_vinegar', item: 'Apple-cider vinegar (steam liquid + dipping)' , term: 'apple cider vinegar' },
  { id: 'p_masa', item: 'Masa (instant corn masa harina or fresh masa)' , term: 'masa harina' },
  { id: 'p_quesillo', item: 'Quesillo (Salvadoran melting cheese) or mozzarella blend' , term: 'mozzarella cheese' },
  { id: 'p_oldbay', item: 'Old Bay (or J.O.) seasoning — buy extra' , term: 'old bay seasoning' },
  { id: 'p_greencoffee', item: 'Green coffee beans — Ethiopian, unroasted (roasted live at the ceremony)' , term: 'green coffee beans' },
  { id: 'p_beans', item: 'Baked beans / red beans' , term: 'baked beans' },
  { id: 'p_beans', item: 'Refried beans (frijoles molidos) for frijol con queso' , term: 'refried beans' },

  // ── Single prepared items ────────────────────────────────────────────────
  // Deli products a store sells as one thing by weight.
  // REFUSED: p_mac "Baked mac & cheese ingredients (or pans)" — the "(or pans)"
  // makes the unit itself ambiguous before the contents even matter.
  { id: 'p_potatosalad', item: 'Potato salad' , term: 'potato salad' },
  // REMOVED 2026-09-23 after the live probe: "macaroni and cheese" returns a
  // 7.25 oz box of Kraft dry mix, and the line is 9.2 lbs of PREPARED dish.
  // Both are mass, both parse, and 21 boxes is not the answer. Dry weight
  // against served weight is a conversion this file does not have and must not
  // guess at — a whole class the match guard cannot see, because the product is
  // not wrong, only its state is.
]);

/**
 * ── SEARCHABLE, BUT NEVER MULTIPLIABLE ────────────────────────────────────
 *
 * The list above answers ONE question — may this line's quantity be multiplied
 * by a package price — and until now the search TERM rode along with it. Those
 * are different questions, and bundling them cost coverage on the one shelf
 * that had none.
 *
 * Measured against a live Baltimore store on 2026-09-23, sending each line's
 * DISPLAY TEXT as the query (which is what a line without a term gets): of
 * twelve non-allowlisted lines probed, ELEVEN matched nothing at all. The whole
 * Supplies shelf — trash bags, charcoal, disposable cups, napkins — priced
 * nothing, not because a store does not sell them but because "Charcoal / lump
 * fuel for the brazier" is not a query.
 *
 * A term here buys a SHELF REFERENCE and nothing more: a real price for a real
 * product beside the estimate. `lineIsMultipliable` still refuses these lines,
 * so none of them can ever produce a line total. That is the whole safety
 * argument — the asymmetry that made the allowlist conservative does not apply
 * to a number nobody adds up.
 *
 * THE ADMISSION RULE, same discipline as above: the line must name ONE product
 * class. A "/" is an ALTERNATIVE the host picks between and is allowed; a "+"
 * joining two different classes is not, because the price shown would be for
 * one of them while sitting on the line for both.
 *
 * Every term below was probed live and is recorded with what it returned.
 * REFUSED on the same probe, and why:
 *   p_togo  "To-go containers + foil + zip bags" — "food storage containers"
 *           returns a $14.99 Snapware PYREX GLASS container. Wrong kind, and
 *           three product classes in the line anyway.
 *   p_fuel  "Charcoal / propane + lighter" — charcoal matches, but the line
 *           also carries lighter fluid. "+" across classes.
 *   p_napkins "Cocktail napkins + hand wipes" — same, wipes are not napkins.
 *   p_cini  "Cini / sini cups" — "espresso cups" returns COFFEE PODS.
 *   p_injera, p_berbere, p_niterkibbeh — a US chain grocer does not carry them.
 *           "injera" returns Airplus® Gel ORTHOTIC SHOE INSERTS at $8.99, and
 *           no word in it a blocklist could catch. That match is why the store
 *           layer now shows WHAT it priced (see priceLayers.js).
 */
const SEARCH_ONLY = Object.freeze([
  // Bread and buns — one product class, "/" alternatives.
  { id: 'p_buns', item: 'Buns / bread', term: 'hamburger buns' },              // HT 3.75" White Hamburger Buns $2.49 · 8 ct
  { id: 'p_buns', item: 'Buns / rolls', term: 'hamburger buns' },              // same
  { id: 'p_buns', item: 'Burger + hot dog buns / bread', term: 'hamburger buns' }, // burger AND hot dog buns are one class
  { id: 'p_bread', item: 'Bread / rolls', term: 'bread' },                     // Artesano® White Bread $4.79 · 20 oz
  { id: 'p_bread', item: 'White bread (loaves)', term: 'white bread' },        // HT Roundtop Sliced Bread $2.39 · 20 oz

  // Supplies — the shelf that priced nothing at all before this.
  { id: 'p_trashbags', item: 'Heavy-duty trash + recycling bags', term: 'trash bags' }, // HT 13 gal $8.99 · 45 ct
  { id: 'p_trash', item: 'Trash + recycling bags', term: 'trash bags' },       // same. trash and recycling bags are one class
  { id: 'p_charcoal', item: 'Charcoal / lump fuel for the brazier', term: 'charcoal' }, // Kingsford Briquettes $16.99 · 16 lb
  { id: 'p_cups', item: 'Disposable cups (self-serve drinks)', term: 'disposable cups' }, // Smart Way Translucent Cups $3.79 · 80 ct
  { id: 'p_napkins', item: 'Cloth or premium paper napkins', term: 'paper napkins' },     // Bounty White Paper Napkins $4.99 · 200 ct
  { id: 'p_napkins', item: 'Napkins (cloth or premium paper)', term: 'paper napkins' },   // same
]);

const key = (id, item) => `${String(id || '').trim()}\u0000${String(item || '').trim()}`;
const ALLOWED = new Map(ALLOW.map((a) => [key(a.id, a.item), a]));
// Terms from BOTH lists. Only `ALLOWED` gates multiplication, so a line can
// gain a searchable term without ever gaining a total.
const TERMS = new Map([...ALLOW, ...SEARCH_ONLY].map((a) => [key(a.id, a.item), a.term]));

/**
 * ── WHAT TO ACTUALLY SEARCH THE STORE FOR ─────────────────────────────────
 *
 * The plan's item text is written for a HOST to read — "Ice (coolers + drinks,
 * heat-adjusted)", "Green coffee beans — Ethiopian, unroasted (roasted live at
 * the ceremony)". Sent to Kroger's `filter.term` it is a poor query, and this
 * is measured rather than supposed: probed against a live Baltimore store on
 * 2026-09-23, **37 of these 44 lines matched nothing at all**, while plain
 * "ice" returns a 7 lb bag immediately.
 *
 * So each entry carries the commodity term. It is a knowledge claim, which is
 * why it lives in the same curated, exact-match list as everything else here
 * and not in a regex that strips parentheses — "Quesillo (Salvadoran melting
 * cheese) or mozzarella blend" does not become a good query by deleting its
 * punctuation.
 *
 * Returns null for a line that is not on the list, and a caller that gets null
 * sends the item text unchanged. The backend falls back the same way.
 */
export function storeSearchTerm(line) {
  return (line ? TERMS.get(key(line.id, line.item)) : null) || null;
}

/** How many lines carry a curated search term (multipliable ones included). */
export const SEARCH_TERM_LINES = TERMS.size;

/**
 * ── AND WHETHER THE THING THAT CAME BACK IS THE THING WE ASKED FOR ────────
 *
 * The unit map guards the UNITS. Nothing guarded the MATCH, and a live probe
 * found what that costs: "Ribs (racks)" matched **Rib Rack® Original BBQ
 * Sauce** and "Pork ribs (racks)" matched **Rib Rack® Sea Salt Pork Rinds**.
 * Both parse cleanly as mass, both would have multiplied to a confident dollar
 * total, and both would have been the price of the wrong thing — 12 bottles of
 * barbecue sauce billed as a rack of ribs.
 *
 * A better search term fixes most of this at the source. This is the backstop
 * for what survives it: product-FORM words that mean "a condiment, a seasoning
 * or a snack made from X" rather than "X". If the matched description carries
 * one and the line we asked for does not, the total is refused.
 *
 * IT IS A HEURISTIC AND IT IS NAMED AS ONE. It cannot prove a match is right;
 * it can only catch a familiar way of being wrong. That is worth having because
 * the cost is asymmetric — a false refusal leaves the shelf price on screen as
 * a reference, exactly as before, while a false accept puts a wrong number in
 * a host's budget.
 */
const NOT_THE_COMMODITY = Object.freeze([
  'sauce', 'marinade', 'seasoning', 'rub', 'dressing', 'gravy', 'broth',
  'bouillon', 'stock', 'rinds', 'jerky', 'flavored', 'flavour', 'scented',
  'mix', 'kit', 'candle', 'soap', 'spray', 'chips', 'crackers', 'cereal',
]);

export function matchLooksLikeTheLine({ line, term, description } = {}) {
  const d = String(description || '').toLowerCase();
  if (!d) return true;                       // nothing to judge; the units still gate
  const asked = `${String((line && line.item) || '')} ${String(term || '')}`.toLowerCase();
  for (const w of NOT_THE_COMMODITY) {
    // Only a word the PRODUCT has and the LINE does not. "Old Bay seasoning"
    // asks for a seasoning and must still match one.
    if (d.includes(w) && !asked.includes(w)) return false;
  }
  return true;
}

/** How many lines the allowlist covers. Exported so a test can pin it. */
export const UNIT_MAPPED_LINES = ALLOW.length;

/**
 * May this line's quantity be multiplied by a package price?
 *
 * Both halves must hold: the line is on the allowlist (one product), AND its
 * unit is a real unit of measure. The second check is not redundant — a line
 * could be added above and then have its unit reworded to `servings`, and the
 * quiet result would be a wrong total rather than a refusal.
 */
export function lineIsMultipliable(line) {
  if (!line || !ALLOWED.has(key(line.id, line.item))) return null;
  const d = unitDimension(line.unit);
  if (!d) return null;
  const qty = Number(line.units) > 0 ? Number(line.units) : Number(line.qty);
  if (!(qty > 0)) return null;
  return { qty, dimension: d.dimension, per: d.per, unit: String(line.unit).trim() };
}

/**
 * The whole reconciliation, in one call.
 *
 * Returns null — meaning "show the shelf price as a reference, as before" —
 * whenever ANY of these is true, and each one is a real case:
 *   • the line is not on the allowlist (a basket, or a `kit`/`set`/`serving`)
 *   • Kroger's size string is one this parser refuses to guess at
 *   • the two are in different dimensions (a "12 pk" against "11.5 lbs")
 *
 * `soldBy` decides whether packages round up. Kroger sends "WEIGHT" for
 * loose goods priced per pound — you buy 11.5 lb of ribs and pay for 11.5 lb —
 * and "UNIT" for packaged goods, where you cannot buy 3.75 bags of ice. The
 * ceiling is applied ONLY in the UNIT case and is always disclosed, because a
 * total that silently covers more than the host asked for is a total they
 * cannot check.
 */
/**
 * ── DOES THE SHELF PRICE AGREE WITH WHAT THIS PLAN WAS BUILT ON? ──────────
 *
 * Every priced line carries `perUnitLow`/`perUnitHigh` — the corpus's own
 * researched band for this commodity, in the line's own unit. A store price is
 * a second, independent measurement of the same thing, so the two can be
 * compared, and that comparison is free: no new data, no new call.
 *
 * Measured across 35 live matches at a Baltimore store: 26 land inside the
 * authored band or within a quarter of its top. That is real corroboration
 * between two sources that have never met. The outliers are informative rather
 * than wrong:
 *
 *   apple-cider vinegar  $13.52/gal vs $3–$7   — a gallon bought as eight
 *                                                16 oz bottles; the jug is ~$5
 *   Old Bay              $15.44/lb  vs $4–$9   — a 6 oz tin, not the tub
 *   deli potato salad    $5.99/lb   vs $1–$3   — the band is for ingredients
 *   strawberries         $5.99/lb   vs $1–$3   — out of season, or a dear store
 *
 * SO THIS DISCLOSES AND NEVER REFUSES. Refusing would throw away a real price
 * because our estimate was low, which is backwards — the shelf price is the
 * better number. What a host needs is to know the two disagree, so they can
 * look. What this must NOT do is explain WHY: small format, dear store and a
 * stale band are indistinguishable from here, and picking one would be
 * invention.
 *
 * THE THRESHOLD IS CHOSEN, NOT DERIVED, AND THERE IS ONLY ONE. A factor of 1.5
 * outside the band in either direction: above `hi × 1.5`, or below `lo ÷ 1.5`.
 * One number rather than two, because two invites each being tuned alone until
 * the rule is no longer sayable in a sentence. It is picked to sit clear of
 * ordinary variation — ice at 1.07× the top and whole chicken at 1.14× are not
 * worth interrupting a host for — and it is stated here so the next person
 * moves it on purpose.
 */
export function bandCheck({ line, perUnit } = {}) {
  const lo = Number(line && line.perUnitLow);
  const hi = Number(line && line.perUnitHigh);
  const p = Number(perUnit);
  if (!(p > 0) || !(hi > 0) || !(lo > 0)) return null;
  if (p > hi * 1.5) {
    return {
      side: 'high',
      factor: Math.round((p / hi) * 10) / 10,
      note: `That is dearer per ${String(line.unit || 'unit').replace(/s$/, '')} than this plan expected — worth a look at the size on the shelf.`,
    };
  }
  if (p < lo / 1.5) {
    return {
      side: 'low',
      factor: Math.round((p / lo) * 100) / 100,
      note: `That is cheaper per ${String(line.unit || 'unit').replace(/s$/, '')} than this plan expected.`,
    };
  }
  return null;
}

export function storeLineTotal({ line, price, size, soldBy, description } = {}) {
  const p = Number(price);
  if (!(p > 0)) return null;
  const need = lineIsMultipliable(line);
  if (!need) return null;
  // The match-quality backstop, BEFORE any arithmetic: a barbecue sauce that
  // parses as 15.5 oz is still not a rack of ribs, and the units would never
  // have noticed.
  if (!matchLooksLikeTheLine({ line, term: storeSearchTerm(line), description })) return null;
  const pack = parseStoreSize(size);
  if (!pack) return null;
  if (pack.dimension !== need.dimension) return null;

  // Both sides in one base measure (grams, millilitres, or bare count).
  const needBase = need.qty * need.per;
  const packBase = pack.qty * pack.per;
  if (!(packBase > 0)) return null;

  const exactPacks = needBase / packBase;
  // WEIGHT: Kroger's price is per its stated size and the good is divisible, so
  // the host pays for exactly what they need. UNIT: whole packages only.
  const byWeight = String(soldBy || '').toUpperCase() === 'WEIGHT';
  const packs = byWeight ? exactPacks : Math.ceil(exactPacks);
  if (!(packs > 0)) return null;
  const total = Math.round(p * packs * 100) / 100;

  const qtyText = `${trimNum(need.qty)} ${need.unit}`;
  const packText = `${trimNum(pack.qty)} ${pack.unit}`;
  const because = byWeight
    ? `${qtyText} at $${p.toFixed(2)} per ${packText} = $${total.toFixed(2)}.`
    : `${packs} × ${packText} at $${p.toFixed(2)} = $${total.toFixed(2)}${
      packs > exactPacks ? ` — covers ${trimNum(need.qty)}, you take home ${trimNum(round3(packs * packBase / need.per))} ${need.unit}` : ''}.`;

  // The store's price expressed in the LINE's own unit, so it can be held
  // against the band the plan was built on. Same arithmetic as the total, read
  // the other way round.
  const perUnit = p * need.per / packBase;
  const band = bandCheck({ line, perUnit });
  return { total, packs, byWeight, because, needBase, packBase, perUnit, band };
}

const round3 = (n) => Math.round(n * 1000) / 1000;
const trimNum = (n) => {
  const r = Math.round(Number(n) * 100) / 100;
  return String(r);
};
