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
 * THE ADMISSION RULE WAS: the line must name ONE product class, so a "+"
 * joining two classes got no term. It is SUPERSEDED (11/23/2026). A line with
 * no term searched its whole sentence and found nothing, so the refusal did not
 * keep a wrong price off the line; it kept every price off it. The owner's ruling
 * the same day splits combined lines into one line per product (Thanksgiving
 * Hosting and Friendsgiving first). Until a playbook's combined line is split,
 * it carries ONE term for its main buy (the first thing it names, unless that is
 * a product a grocery does not sell), and the store layer shows the product it
 * matched, so a host can see what was priced.
 *
 * The 2026-09-23 refusals, kept for the record ("+" lines now get a main-buy term):
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
  // ── FRIENDSGIVING AND THE SIDES (11/18/2026) moved to TERM_BY_ID below. The
  // owner's report ("1 of 11 items is found. Not even the turkey", ZIP 20744)
  // was answered with exact-text entries here; Thanksgiving Hosting's turkey
  // line differed by one word ("or breast" against "or a breast") and so never
  // got the term the Friendsgiving line did. That is the drift TERM_BY_ID ends.
  //
  // ── EVERY OTHER LINE (11/23/2026). One entry per line whose id is reused
  // across playbooks for different products. Every term was probed live at
  // Harris Teeter Old Town Alexandria (Kroger locationId 09700398, the owner's
  // store) on 11/23/2026 with no line ids, so nothing was recorded; the comment
  // is the first product it returned, regular price first.
  { id: 'p_appetizers', item: 'A cheese tray for grazing during the cooking hours', term: 'cheese tray' }, // Great Midwest Gourmet Cheese Tray $14.99 · 18 oz
  { id: 'p_appetizers', item: 'Botanas — tortilla chips', term: 'tortilla chips' }, // Harris Teeter Restaurant Style Tortilla Chips $2.99 ($2.50 sale) · 10 oz
  { id: 'p_apps_cold', item: 'Charcuterie (shrimp, dips)', term: 'charcuterie' }, // Boar's Head Charcuterie Trio Uncured Milano Sa… $12.99 ($9.99 sale) · 6 oz
  { id: 'p_apps_cold', item: 'Deviled eggs (shrimp, caprese skewers)', term: 'deviled eggs' }, // Harris Teeter Deviled Eggs $4.99 · 6 ct
  { id: 'p_batch', item: 'Batch cocktail mixer', term: 'cocktail mixer' }, // Cocktail Crate Classic Old Fashioned Craft Coc… $8.99 · 12.7 fl oz
  { id: 'p_beans', item: 'Baked beans ingredients', term: 'baked beans' }, // Bush's Original Baked Beans 28 oz $3.39 · 28 oz
  { id: 'p_bread', item: 'Bread / rolls / crackers', term: 'bread' }, // Nature's Own Honey Wheat Bread, Non-GMO Sandwi… $4.59 ($2.29 sale) · 20 oz
  { id: 'p_bread', item: 'Dinner rolls', term: 'dinner rolls' }, // King’s Hawaiian Savory Butter Rolls $10.99 ($8.00 sale) · 24 oz
  { id: 'p_candles', item: 'Mishumaa saba — seven Kwanzaa candles (1 black, 3 red, 3 green)', term: 'taper candles' }, // Tuscany Candle Taper Candles - White $3.99 · 6 ct / 10 in
  { id: 'p_condiments', item: 'BBQ sauce', term: 'bbq sauce' }, // Sweet Baby Ray's BBQ Sauce $3.69 ($2.59 sale) · 18 oz
  { id: 'p_corn', item: 'Corn (frozen or canned kernels, or corn pudding)', term: 'frozen corn' }, // Harris Teeter Steamable Yellow Corn $1.69 ($1.33 sale) · 12 oz
  { id: 'p_dessert', item: 'Bakery tart or cake (or ice cream & cookies)', term: 'cake' }, // Private Selection Cinnamon Roll Four Layer Cak… $23.00 · 59 oz (16 servings)
  { id: 'p_dessert', item: 'Banana pudding (red velvet)', term: 'banana pudding' }, // Jell-O Banana Cream Artificially Flavored Inst… $1.79 ($1.50 sale) · 3.4 oz
  { id: 'p_dessert', item: 'Brownies', term: 'brownies' }, // Fresh Foods Market Ghirardelli Chocolate Brown… $9.99 · 6 ct
  { id: 'p_dessert', item: 'Cookies (holiday bark)', term: 'cookies' }, // Chocolate Chip Cookies $3.00 · 12 count
  { id: 'p_dessert', item: 'Cookies', term: 'cookies' }, // Chocolate Chip Cookies $3.00 · 12 count
  { id: 'p_dessert', item: 'Dessert (pies, or the dessert a friend is known for)', term: 'pumpkin pie' }, // Bakery Fresh 8 Inch Pumpkin Pie $4.00 · 21.5 oz (serves 6)
  { id: 'p_dessert', item: 'Mini desserts (fruit, sweet bites)', term: 'mini cupcakes' }, // Bakery Fresh Apple Caramel Mini Cupcakes $5.49 ($5.00 sale) · 12 ct
  { id: 'p_dessert', item: 'Sweet potato pie (or banana pudding)', term: 'sweet potato pie' }, // Bakery Fresh Sweet Potato Pie - 8 Inch $4.00 · 21.5 oz
  { id: 'p_dessert', item: 'Sheet cake', term: 'sheet cake' }, // Harris Teeter Fresh Foods Market 1/4 Sheet Dou… $31.99 · 1 ct
  { id: 'p_dessert', item: 'Sweet potato pie or benne cakes (Karamu dessert)', term: 'sweet potato pie' }, // Bakery Fresh Sweet Potato Pie - 8 Inch $4.00 · 21.5 oz
  { id: 'p_dessert', item: 'Sweets (pound cake, peach cobbler, cookies, banana pudding)', term: 'pound cake loaf' }, // Harris Teeter Old Fashioned Butter Pound Cake… $5.99 · 16 oz
  { id: 'p_dessert', item: 'Watermelon', term: 'watermelon' }, // Mini Seedless Whole Watermelon $5.99 · 1 ct
  { id: 'p_drinks', item: 'Beer', term: 'beer' }, // Samuel Adams Winter Break Seasonal Variety Beer $17.99 · 12 cans / 12 fl oz
  { id: 'p_drinks', item: 'Beer, soda & water', term: 'beer' }, // Samuel Adams Winter Break Seasonal Variety Beer $17.99 · 12 cans / 12 fl oz
  { id: 'p_drinks', item: 'Beer', term: 'beer' }, // Samuel Adams Winter Break Seasonal Variety Beer $17.99 · 12 cans / 12 fl oz
  { id: 'p_drinks', item: 'Bottled water for the stand', term: 'bottled water' }, // Harris Teeter Purified Drinking Bottled Water $3.99 ($3.33 sale) · 24 bottles/16.9 fl oz
  { id: 'p_drinks', item: 'Cold beer', term: 'beer' }, // Samuel Adams Winter Break Seasonal Variety Beer $17.99 · 12 cans / 12 fl oz
  { id: 'p_drinks', item: 'Soft drinks', term: 'soft drinks' }, // Pepsi cola Soda Bottle $3.99 · 2 liter
  { id: 'p_drinks', item: 'Sorrel / hibiscus drink', term: 'hibiscus tea' }, // HT Traders Caffeine Free Raspberry Hibiscus He… $3.19 ($2.50 sale) · 20 ct
  { id: 'p_drinks', item: 'Sparkling water (the host\'s alcohol-free share)', term: 'sparkling water' }, // HT Traders Passionfruit Flavored Sparkling Wat… $6.49 ($3.99 sale) · 12 pk / 12 fl oz
  { id: 'p_drinks', item: 'Sparkling water', term: 'sparkling water' }, // HT Traders Passionfruit Flavored Sparkling Wat… $6.49 ($3.99 sale) · 12 pk / 12 fl oz
  { id: 'p_drinks', item: 'Sweet tea', term: 'sweet tea' }, // Milo's Famous Sweet Iced Tea $5.39 ($3.99 sale) · 1 gal
  { id: 'p_drinks', item: 'Sweet tea', term: 'sweet tea' }, // Milo's Famous Sweet Iced Tea $5.39 ($3.99 sale) · 1 gal
  { id: 'p_food', item: 'BBQ or taco bar (buffet trays)', term: 'taco shells' }, // Harris Teeter Crunchy Taco Shells $1.69 · 4.3 oz
  { id: 'p_food', item: 'Grilled proteins (chicken, or a pizza order)', term: 'chicken thighs' }, // Whole Fresh Chicken Wings $10.00 · 3.25 lb
  { id: 'p_food', item: 'Quiche (brunch spread)', term: 'quiche' }, // Harris Teeter Fresh Foods Market Quiche Lorraine $10.99 · 24 oz
  { id: 'p_food', item: 'Quiche (brunch spread, salads)', term: 'quiche' }, // Harris Teeter Fresh Foods Market Quiche Lorraine $10.99 · 24 oz
  { id: 'p_garnish', item: 'Fresh garnish (mint)', term: 'fresh mint' }, // Mint $3.29 · 1 ct
  { id: 'p_mains', item: 'Jerk chicken (or fish, gumbo, jambalaya)', term: 'chicken thighs' }, // Harris Teeter Boneless Chicken Thighs $5.99 · 1 lb
  { id: 'p_mains', item: 'Pizza or grill proteins (party trays)', term: 'frozen pizza' }, // Red Baron Pepperoni Classic Crust Frozen Pizza $6.79 ($4.99 sale) · 20.61 oz
  { id: 'p_mocktail', item: 'Mocktail mixers (3-4 signature drinks)', term: 'mocktail mixer' }, // Welch's Red Grape Sparkling Juice Cocktail $4.99 ($3.99 sale) · 25.4 fl oz
  { id: 'p_napkins', item: 'Paper towels', term: 'paper towels' }, // Bounty Paper Towels Select-A-Size White 6 Doub… $17.49 ($12.99 sale) · 6 rolls
  { id: 'p_nonalc', item: 'Kids\' drinks: juice boxes (a spooky punch, water)', term: 'juice boxes' }, // Honest Kids Super Fruit Punch Organic Juice Dr… $5.39 · 8 pk / 6 fl oz
  { id: 'p_paper', item: 'Paper goods (plates/cups/cocktail napkins for an app party, leftover containers)', term: 'paper plates' }, // Dixie 8.5-Inch Disposable Paper Plates $4.39 ($3.29 sale) · 48 ct
  { id: 'p_paper', item: 'Paper goods (plates/cups/cocktail napkins for an app reception, leftover containers)', term: 'paper plates' }, // Dixie 8.5-Inch Disposable Paper Plates $4.39 ($3.29 sale) · 48 ct
  { id: 'p_paper', item: 'Paper plates', term: 'paper plates' }, // Dixie 8.5-Inch Disposable Paper Plates $4.39 ($3.29 sale) · 48 ct
  { id: 'p_potatoes', item: 'Mashed potatoes (the potatoes)', term: 'russet potatoes' }, // Russet Potato $1.79 · 1 lb
  { id: 'p_protein', item: 'Beef short rib (or salmon / mushroom wellington for veg)', term: 'beef short ribs' }, // Beef Choice Bone-In Short Ribs $11.99 · 1 lb
  { id: 'p_protein', item: 'Beef, chicken or salmon (for a seated dinner — plus a veg main)', term: 'chicken breast' }, // Harris Teeter Boneless Chicken Breast Value Pack $3.99 ($2.59 sale) · 1 lb
  { id: 'p_protein', item: 'Beef, chicken or salmon (for a seated meal — plus a veg main)', term: 'chicken breast' }, // Harris Teeter Boneless Chicken Breast Value Pack $3.99 ($2.59 sale) · 1 lb
  { id: 'p_protein', item: 'Bone-in chicken', term: 'bone-in chicken' }, // Harris Teeter Bone In Skin On Split Chicken Br… $3.49 ($2.89 sale) · 1 lb
  { id: 'p_protein', item: 'Burger patties', term: 'burger patties' }, // Schweid & Sons The Butcher's Blend 75/25 Groun… $12.99 · 4 ct / 5.3 oz
  { id: 'p_salsa', item: 'Salsa roja ingredients (tomatoes, onion, garlic, peppers)', term: 'roma tomatoes' }, // Fresh Roma Tomato $3.79 · 1 lb
  { id: 'p_season', item: 'Crawfish/crab boil seasoning (Zatarain\'s / Louisiana Fish Fry)', term: 'crab boil' }, // Zatarain's Crawfish, Shrimp & Crab Boil $2.19 · 3 oz
  { id: 'p_season', item: 'Seasoning (salt, pepper, garlic, paprika, Cajun/seasoned salt)', term: 'seasoned salt' }, // Lawry's Seasoned Salt $4.39 ($2.00 sale) · 8 oz
  { id: 'p_seasoning', item: 'Dry rub / seasoning', term: 'bbq rub' }, // Rib Rack BBQ Rub $5.39 ($3.99 sale) · 5.5 oz
  { id: 'p_seasoning', item: 'Old Bay / crab boil seasoning (dry + liquid)', term: 'old bay seasoning' }, // OLD BAY Classic Seafood Seasoning $6.59 · 6 oz
  { id: 'p_serveware', item: 'Buffet serveware: chafing dishes / warmers', term: 'chafing dish' }, // Eco-Foil Half Size Steam Table $13.99 · 10 ct
  { id: 'p_sides', item: 'Chips', term: 'potato chips' }, // Fruit and Vegetable Tray Fresh Cut In Store Da… $16.00 · 64 oz
  { id: 'p_sides', item: 'Potato chips', term: 'potato chips' }, // Harris Teeter Ripple Potato Chips $3.39 ($2.00 sale) · 8 oz
  { id: 'p_sides', item: 'Coleslaw', term: 'coleslaw' }, // Harris Teeter Fresh Foods Market Homestyle Shr… $5.99 ($4.99 sale) · 15 oz
  { id: 'p_sides', item: 'Coleslaw', term: 'coleslaw' }, // Harris Teeter Fresh Foods Market Homestyle Shr… $5.99 ($4.99 sale) · 15 oz
  { id: 'p_sides', item: 'Collard greens', term: 'collard greens' }, // Jumbo Collard Greens Bunch $2.99 ($2.00 sale) · 1 ct
  { id: 'p_sides', item: 'Garden salad', term: 'salad kit' }, // Fresh Express Chopped Caesar Salad Kit $5.49 ($3.99 sale) · 10.4 oz
  { id: 'p_sides', item: 'Rice and peas (cornbread, plantains)', term: 'long grain rice' }, // Harris Teeter Long Grain White Rice $1.79 · 32 oz
  { id: 'p_sides', item: 'Potato salad (rolls, a hot veg)', term: 'potato salad' }, // Harris Teeter Fresh Foods Market Original Pota… $5.99 ($4.99 sale) · 16 oz
  { id: 'p_sides', item: 'Potato salad', term: 'potato salad' }, // Harris Teeter Fresh Foods Market Original Pota… $5.99 ($4.99 sale) · 16 oz
  { id: 'p_snacks', item: 'Fruit cups (mini sandwiches, charcuterie)', term: 'fruit cups' }, // Fruit and Vegetable Tray Fresh Cut In Store Da… $16.00 · 64 oz
  { id: 'p_snacks', item: 'Session snacks (between catered meals)', term: 'snack variety pack' }, // DOT'S SNACK MIX ORIGINAL $6.99 · 14.0 oz
  { id: 'p_softdrinks', item: 'Soda', term: 'soda' }, // Sprite Lemon-Lime Caffeine Free Soda Cans $11.99 · 12 pk / 12 fl oz
  { id: 'p_starch', item: 'Roast potatoes (or rice / risotto)', term: 'red potatoes' }, // Harris Teeter Farmers Market Baby Red Potatoes $5.49 · 3 lb
  { id: 'p_starch', item: 'Spaghetti OR grits', term: 'spaghetti' }, // Harris Teeter Spaghetti Pasta $1.99 ($1.18 sale) · 16 oz
  { id: 'p_tableware', item: 'Paper towels', term: 'paper towels' }, // Bounty Paper Towels Select-A-Size White 6 Doub… $17.49 ($12.99 sale) · 6 rolls
  { id: 'p_veg', item: 'Crudité veg', term: 'veggie tray' }, // Fruit and Vegetable Tray Fresh Cut In Store Da… $16.00 · 64 oz
  { id: 'p_veg', item: 'Roasted vegetables', term: 'mixed vegetables' }, // Fresh Express Chopped Caesar Salad Kit $5.49 ($3.99 sale) · 10.4 oz
  // ── SPLIT LINES, BATCH 4 (owner ruling 11/23/2026): the main lines whose id carries other products elsewhere, and parts whose id does. probed live at Harris
  // Teeter Old Town Alexandria (09700398) on 11/24/2026, no line ids sent.

]);

/**
 * ── ONE TERM PER LINE ID, WHEREVER THE ID MEANS ONE THING ──────────────────
 *
 * The lists above key on (id, EXACT item text), which is right for the multiply
 * allowlist and wrong as the only way to find a search term. Thanksgiving
 * Hosting's turkey line read "or breast for a small table" where Friendsgiving's
 * read "or a breast": one word, and the Thanksgiving turkey searched its whole
 * sentence and found nothing (owner, 11/18/2026: "Not even the turkey"). Any
 * edit to an item's wording dropped its term the same silent way.
 *
 * So a term is looked up by exact text FIRST (an id reused across playbooks for
 * different products, like `p_drinks`, needs that), then by line id alone. An
 * id is listed here only when every line under it, in every playbook, is the
 * same main buy; rewording such a line keeps its term. A line on neither list
 * is either in NO_STORE_TERM with its reason, or the census
 * (everyShoppingLineHasAStoreTerm.test.js) fails and names it.
 *
 * Probed live at Harris Teeter Old Town Alexandria (locationId 09700398, the
 * owner's store) on 11/23/2026, no line ids sent, so nothing was recorded. The
 * comment is the first product returned, regular price first. Two existing
 * terms matched nothing there and are kept from their earlier probes: masa
 * harina and green coffee beans. At McHenry Row, Baltimore, "red wine"
 * returned Holland House red COOKING wine, not a table wine (11/23/2026): the
 * line shows the product it matched, and a Maryland host buys wine elsewhere.
 */
export const TERM_BY_ID = Object.freeze([
  { id: 'p_addins', term: 'littleneck clams' }, // Harris Teeter Farm Raised Littleneck Clams $6.99 · 16 ct
  { id: 'p_alcohol', term: 'beer' }, // Samuel Adams Winter Break Seasonal Variety Beer $17.99 · 12 cans / 12 fl oz
  { id: 'p_allergy_labels', term: 'labels' }, // Avery Multi-Use Removable Labels - White $1.89 · 72 ct
  { id: 'p_appetizer', term: 'charcuterie' }, // Boar's Head Charcuterie Trio Uncured Milano Sa… $12.99 ($9.99 sale) · 6 oz
  { id: 'p_appetizers_crackers', term: 'crackers' }, // Pepperidge Farm Trio Variety Entertainment Cra… $4.79 ($4.00 sale) · 10 oz
  { id: 'p_appetizers_crudite', term: 'baby carrots' }, // Harris Teeter Farmers Market Peeled Baby Carro… $2.19 ($1.50 sale) · 16 oz
  { id: 'p_appetizers_nuts', term: 'mixed nuts' }, // Harris Teeter Salted Roasted Mixed Nuts $15.99 ($12.99 sale) · 32 oz
  { id: 'p_apps', term: 'cheese tray' }, // Great Midwest Gourmet Cheese Tray $14.99 · 18 oz
  { id: 'p_apps_crackers', term: 'crackers' }, // Pepperidge Farm Trio Variety Entertainment Cra… $4.79 ($4.00 sale) · 10 oz
  { id: 'p_apps_crudite', term: 'baby carrots' }, // Harris Teeter Farmers Market Peeled Baby Carro… $2.19 ($1.50 sale) · 16 oz
  { id: 'p_apps_hot', term: 'frozen meatballs' }, // Rosina Italian Style Frozen Meatballs $11.39 ($5.99 sale) · 26 oz
  { id: 'p_aromatics', term: 'yellow onions' }, // Yellow Onions In 3lb Bag $3.99 ($3.00 sale) · 3 lb
  { id: 'p_ballparksnacks', term: 'hot dogs' }, // Ball Park Bun Length Classic Hot Dogs $5.49 · 15oz
  { id: 'p_bar', term: 'red wine' }, // Apothic Red Blend California Red Wine $10.00 · 750 ml
  { id: 'p_batch', term: 'fruit punch' }, // Simply Fruit Punch Juice Drink Bottle $3.29 · 52 fl oz
  { id: 'p_batch_cocktail', term: 'cranberry juice' }, // Harris Teeter 100% Cranberry Juice $4.29 ($3.99 sale) · 64 fl oz
  { id: 'p_beer', term: 'beer' }, // Samuel Adams Winter Break Seasonal Variety Beer $17.99 · 12 cans / 12 fl oz
  { id: 'p_beer-wine', term: 'beer' }, // Samuel Adams Winter Break Seasonal Variety Beer $17.99 · 12 cans / 12 fl oz
  { id: 'p_beer_wine', term: 'beer' }, // Samuel Adams Winter Break Seasonal Variety Beer $17.99 · 12 cans / 12 fl oz
  { id: 'p_beerwine', term: 'beer' }, // Samuel Adams Winter Break Seasonal Variety Beer $17.99 · 12 cans / 12 fl oz
  { id: 'p_beverages', term: 'soda' }, // Sprite Lemon-Lime Caffeine Free Soda Cans $11.99 · 12 pk / 12 fl oz
  { id: 'p_bites', term: 'chicken wings' }, // batch 4 (11/23/2026): the line's main is now this product (was 'charcuterie')
  { id: 'p_blackeyedpeas', term: 'black eyed peas' }, // Harris Teeter Black Eyed Peas $1.39 ($0.75 sale) · 16 fl oz
  { id: 'p_board', term: 'charcuterie' }, // Boar's Head Charcuterie Trio Uncured Milano Sa… $12.99 ($9.99 sale) · 6 oz
  { id: 'p_bread_cornbread', term: 'cornbread mix' }, // Krusteaz Honey Cornbread and Muffin Mix, Honey… $2.99 ($2.50 sale) · 15 oz
  { id: 'p_bubbles', term: 'sparkling wine' }, // Andre Brut Champagne California Sparkling Wine $9.99 · 750 ml
  { id: 'p_bubbly', term: 'sparkling wine' }, // Andre Brut Champagne California Sparkling Wine $9.99 · 750 ml
  { id: 'p_buffet_alt', term: 'spiral ham' }, // Smithfield Spirals Spiral Sliced Hickory Smoke… $3.99 ($1.99 sale) · 1 lb
  { id: 'p_buffet_protein', term: 'rotisserie chicken' }, // Harris Teeter Whole Rotisserie Chicken (Availa… $7.99 · 1 ct
  { id: 'p_buns', term: 'hamburger buns' }, // Harris Teeter 3.75" White Hamburger Buns $2.49 · 8 ct / 11 oz
  { id: 'p_burgers_dogs', term: 'burger patties' }, // Schweid & Sons The Butcher's Blend 75/25 Groun… $12.99 · 4 ct / 5.3 oz
  { id: 'p_butter', term: 'butter' }, // Harris Teeter Salted Butter Quarters $3.59 · 4 ct / 16 oz
  { id: 'p_cake', term: 'cake' }, // Private Selection Cinnamon Roll Four Layer Cak… $23.00 · 59 oz (16 servings)
  { id: 'p_candles', term: 'birthday candles' }, // Bakery Crafts Assorted Colors Smooth Birthday… $1.99 · 16 ct
  { id: 'p_candy', term: 'fun size candy' }, // Snickers Fun Size Chocolate Candy Bars Pack $1.79 · 5 ct / 2.6 oz
  { id: 'p_cards', term: 'playing cards' }, // Bicycle Standard Playing Cards $5.49 · 1 ct
  { id: 'p_champagne', term: 'sparkling wine' }, // Andre Brut Champagne California Sparkling Wine $9.99 · 750 ml
  { id: 'p_charc', term: 'charcuterie' }, // Boar's Head Charcuterie Trio Uncured Milano Sa… $12.99 ($9.99 sale) · 6 oz
  { id: 'p_charcoal', term: 'charcoal' }, // Kingsford Original Charcoal Briquettes, BBQ Ch… $16.99 · 16 lb
  { id: 'p_cheese', term: 'cheese tray' }, // Great Midwest Gourmet Cheese Tray $14.99 · 18 oz
  { id: 'p_chicharron', term: 'ground pork' }, // Niman Ranch All Natural Ground Pork $5.99 ($5.00 sale) · 16 oz
  { id: 'p_chili', term: 'chili beans' }, // Bush's Pinto Beans in a Mild Chili Sauce 16 oz $2.79 ($1.67 sale) · 16 oz
  { id: 'p_chips', term: 'potato chips' }, // Harris Teeter Ripple Potato Chips $3.39 ($2.00 sale) · 8 oz
  { id: 'p_cider', term: 'sparkling cider' }, // Martinelli's Sparkling Apple Cider $5.99 ($3.99 sale) · 1 ct / 25.4 fl oz
  { id: 'p_clean', term: 'dish soap' }, // batch 4 (11/23/2026): the line's main is now this product (was 'trash bags')
  { id: 'p_cleanup', term: 'trash bags' }, // Harris Teeter Tall 13 Gallon Drawstring Kitche… $5.99 ($5.39 sale) · 22 ct
  { id: 'p_cleanup_detergent', term: 'dishwasher detergent' }, // Cascade Complete Fresh Scent Gel Dishwasher De… $9.99 ($6.99 sale) · 75 fl oz
  { id: 'p_cleanup_soap', term: 'dish soap' }, // Harris Teeter Ultra Concentrated Dishwashing L… $2.49 · 24 fl oz
  { id: 'p_cleanup_towels', term: 'paper towels' }, // Bounty Paper Towels Select-A-Size White 6 Doub… $17.49 ($12.99 sale) · 6 rolls
  { id: 'p_cocktail', term: 'cocktail mixer' }, // Cocktail Crate Classic Old Fashioned Craft Coc… $8.99 · 12.7 fl oz
  { id: 'p_coffee', term: 'ground coffee' }, // HT Traders Ground Medium Roast Costa Rican Cof… $12.99 ($7.99 sale) · 11 oz
  { id: 'p_coffee_icecream', term: 'vanilla ice cream' }, // Tillamook Vanilla Bean Ice Cream Tub $8.99 ($5.79 sale) · 1.5 qt
  { id: 'p_coffee_tea', term: 'black tea' }, // Harris Teeter Family Size Black Tea 48 Bags $3.79 · 48 bags
  { id: 'p_coffee_whipped', term: 'whipped cream' }, // Harris Teeter Extra Creamy Whipped Topping $2.99 ($2.50 sale) · 6.5 oz
  { id: 'p_concession_food', term: 'popcorn' }, // LesserEvil Organic Himalayan Pink Salt Popcorn… $4.99 ($4.00 sale) · 4.6 oz
  { id: 'p_condiments', term: 'ketchup' }, // Heinz Tomato Ketchup $6.99 ($3.99 sale) · 32 oz
  { id: 'p_containers', term: 'plastic containers' }, // Glad Rectangular Plastic Containers with Lids $9.19 · 28 oz
  { id: 'p_corn', term: 'corn on the cob' }, // Harris Teeter Farmers Market Sweet Corn On The… $4.99 ($4.00 sale) · 4 ct
  { id: 'p_cornbread', term: 'cornbread mix' }, // Krusteaz Honey Cornbread and Muffin Mix, Honey… $2.99 ($2.50 sale) · 15 oz
  { id: 'p_cornmeal', term: 'fish fry' }, // Louisiana Fish Fry Products New Orleans-Style… $2.49 · 10 oz
  { id: 'p_crackers', term: 'crackers' }, // Pepperidge Farm Trio Variety Entertainment Cra… $4.79 ($4.00 sale) · 10 oz
  { id: 'p_cranberry', term: 'cranberry sauce' }, // Ocean Spray Jellied Cranberry Sauce Canned Sid… $3.29 ($2.50 sale) · 14 ounces
  { id: 'p_cups', term: 'disposable cups' }, // Smart Way Translucent Cups $3.79 · 80 ct / 9 fl oz
  { id: 'p_cups_plates', term: 'disposable cups' }, // Smart Way Translucent Cups $3.79 · 80 ct / 9 fl oz
  { id: 'p_curtido_veg', term: 'green cabbage' }, // Green Cabbage $1.29 ($0.69 sale) · 1 lb
  { id: 'p_dessert_pies', term: 'sweet potato pie' }, // Bakery Fresh Sweet Potato Pie - 8 Inch $4.00 · 21.5 oz
  { id: 'p_dessert_poundcake', term: 'pound cake loaf' }, // Harris Teeter Old Fashioned Butter Pound Cake… $5.99 · 16 oz
  { id: 'p_dessert_pudding', term: 'banana pudding' }, // Jell-O Banana Cream Artificially Flavored Inst… $1.79 ($1.50 sale) · 3.4 oz
  { id: 'p_deviled', term: 'eggs' }, // Harris Teeter Large Grade A White Eggs $2.29 · 12 ct
  { id: 'p_dips', term: 'hummus' }, // Sabra Classic Hummus $4.99 · 8 oz
  { id: 'p_dish', term: 'dish soap' }, // Harris Teeter Ultra Concentrated Dishwashing L… $2.49 · 24 fl oz
  { id: 'p_disposables', term: 'disposable cups' }, // Smart Way Translucent Cups $3.79 · 80 ct / 9 fl oz
  { id: 'p_drinks_cider', term: 'sparkling cider' }, // Martinelli's Sparkling Apple Cider $5.99 ($3.99 sale) · 1 ct / 25.4 fl oz
  { id: 'p_fandisha', term: 'popcorn kernels' }, // Orville Redenbacher’s Original Gourmet Popcorn… $7.59 · 30 oz
  { id: 'p_first_aid', term: 'first aid kit' }, // First Aid Only Compact First Aid Essentials Kit $4.99 · 17 pc
  { id: 'p_firstaid', term: 'first aid kit' }, // First Aid Only Compact First Aid Essentials Kit $4.99 · 17 pc
  { id: 'p_fish', term: 'catfish fillets' }, // Harris Teeter Farm Raised Catfish Fillets $9.99 · 1 lb
  { id: 'p_flutes', term: 'champagne flutes' }, // True Stemless Champagne Flute Set $9.99 · 1 ct
  { id: 'p_foil-oil', term: 'vegetable oil' }, // Harris Teeter Vegetable Oil $5.19 ($3.99 sale) · 48 fl oz
  { id: 'p_foil_pans', term: 'foil pans' }, // Eco-foil Cook N Carry Utility Pan with Lid 4CT $11.39 · 4 ct
  { id: 'p_fruit', term: 'grapes' }, // Harris Teeter Fresh Seedless Red Grapes $4.49 ($2.99 sale) · 1 lb
  { id: 'p_fuel', term: 'charcoal' }, // Kingsford Original Charcoal Briquettes, BBQ Ch… $16.99 · 16 lb
  { id: 'p_garnish', term: 'fresh mint' }, // batch 4 (11/23/2026): the line's main is now this product (was 'limes')
  { id: 'p_giftlog', term: 'notebook' }, // Top Flight 100-Sheet College Rule Memo Book -… $1.99 · 3 x 5 in
  { id: 'p_glassware', term: 'champagne flutes' }, // True Stemless Champagne Flute Set $9.99 · 1 ct
  { id: 'p_gravy', term: 'chicken stock' }, // Harris Teeter Chicken Stock $2.39 ($1.67 sale) · 32 oz
  { id: 'p_gravy_jar', term: 'turkey gravy' }, // Heinz HomeStyle Turkey Gravy, Jar $3.99 ($2.00 sale) · 12 oz
  { id: 'p_gravy_thickener', term: 'all purpose flour' }, // Harris Teeter All Purpose Flour $2.99 ($2.29 sale) · 5 lb
  { id: 'p_grazing', term: 'charcuterie' }, // Boar's Head Charcuterie Trio Uncured Milano Sa… $12.99 ($9.99 sale) · 6 oz
  { id: 'p_green_beans', term: 'green beans' }, // Harris Teeter Farmer’s Market Ready Veggies Gr… $3.99 ($1.99 sale) · 12 oz
  { id: 'p_greencoffee', term: 'green coffee beans' }, // not matched at Old Town
  { id: 'p_greens', term: 'collard greens' }, // Jumbo Collard Greens Bunch $2.99 ($2.00 sale) · 1 ct
  { id: 'p_grown', term: 'beer' }, // Samuel Adams Winter Break Seasonal Variety Beer $17.99 · 12 cans / 12 fl oz
  { id: 'p_grown_folks', term: 'beer' }, // Samuel Adams Winter Break Seasonal Variety Beer $17.99 · 12 cans / 12 fl oz
  { id: 'p_halfsmokes', term: 'smoked sausage' }, // Hillshire Farm Smoked Sausage $6.99 ($3.49 sale) · 14 oz
  { id: 'p_heat', term: 'sunscreen' }, // Banana Boat Sport Ultra Sunscreen Lotion SPF 5… $14.99 · 8 fl oz
  { id: 'p_hotsauce', term: 'hot sauce' }, // Texas Pete Original Hot Sauce $3.49 · 12 fl oz
  { id: 'p_ice', term: 'ice' }, // Reddy Ice Premium Packaged Ice $2.99 · 7 lb
  { id: 'p_icedtea', term: 'iced tea' }, // Gold Peak Slightly Sweet Iced Tea Bottle $3.39 · 52 fl oz
  { id: 'p_juice', term: 'orange juice' }, // Simply Pulp-Free Orange Juice Bottle $5.49 ($3.50 sale) · 46 fl oz
  { id: 'p_kids_drinks', term: 'juice boxes' }, // Honest Kids Super Fruit Punch Organic Juice Dr… $5.39 · 8 pk / 6 fl oz
  { id: 'p_labels', term: 'labels' }, // Avery Multi-Use Removable Labels - White $1.89 · 72 ct
  { id: 'p_labels_marker', term: 'permanent marker' }, // Sharpie Permanent Markers, Fine Point, Black,… $4.29 · 2 count
  { id: 'p_leftover_bags', term: 'gallon storage bags' }, // Harris Teeter One Gallon Slider Storage Bags $2.79 ($2.00 sale) · 15 ct
  { id: 'p_leftover_containers', term: 'plastic containers' }, // Glad Rectangular Plastic Containers with Lids $9.19 · 28 oz
  { id: 'p_leftover_labels', term: 'labels' }, // Avery Multi-Use Removable Labels - White $1.89 · 72 ct
  { id: 'p_lemon', term: 'lemons' }, // Fresh Large Lemon - Each $0.69 · 1 each
  { id: 'p_libation', term: 'apple cider' }, // Zeigler's Old Fashioned Apple Cider $5.99 ($4.99 sale) · 64 fl oz
  { id: 'p_links', term: 'smoked sausage' }, // Hillshire Farm Smoked Sausage $6.99 ($3.49 sale) · 14 oz
  { id: 'p_mac', term: 'elbow macaroni' }, // Harris Teeter Elbow Macaroni $1.99 ($1.18 sale) · 16 oz
  { id: 'p_mac_cheddar', term: 'sharp cheddar cheese' }, // Harris Teeter Sharp Cheddar Cheese $3.49 ($2.99 sale) · 8 oz
  { id: 'p_mac_milk', term: 'whole milk' }, // Harris Teeter Vitamin D Whole Milk $2.59 · 1/2 gal
  { id: 'p_main_alt', term: 'spiral ham' }, // Smithfield Spirals Spiral Sliced Hickory Smoke… $3.99 ($1.99 sale) · 1 lb
  { id: 'p_masa', term: 'masa harina' }, // not matched at Old Town
  { id: 'p_mazao', term: 'apples' }, // Simple Truth Organic Gala Apples – 2 Pound Bag $6.99 ($4.99 sale) · 2 lb
  { id: 'p_meatwat', term: 'chicken drumsticks' }, // Smart Chicken Organic Fresh Chicken Drumsticks $4.99 · 1 lb
  { id: 'p_mintjulep', term: 'fresh mint' }, // Mint $3.29 · 1 ct
  { id: 'p_mixers', term: 'club soda' }, // Harris Teeter Perfect Mixer Club Soda $4.99 ($3.99 sale) · 12 ct / 12 fl oz
  { id: 'p_mocktail', term: 'fruit punch' }, // Simply Fruit Punch Juice Drink Bottle $3.29 · 52 fl oz
  { id: 'p_muhindi', term: 'corn on the cob' }, // Harris Teeter Farmers Market Sweet Corn On The… $4.99 ($4.00 sale) · 4 ct
  { id: 'p_mumbo', term: 'mumbo sauce' }, // Capital City Mild Mambo Sauce $8.39 · 12 fl oz
  { id: 'p_nabeer', term: 'non alcoholic beer' }, // Heineken 0.0 Non-Alcoholic Beer $16.99 · 12 cans / 11.2 fl oz
  { id: 'p_napkins', term: 'paper napkins' }, // Bounty White Paper Napkins $4.99 ($2.99 sale) · 200 ct
  { id: 'p_nonalc', term: 'sparkling water' }, // HT Traders Passionfruit Flavored Sparkling Wat… $6.49 ($3.99 sale) · 12 pk / 12 fl oz
  { id: 'p_oil', term: 'vegetable oil' }, // Harris Teeter Vegetable Oil $5.19 ($3.99 sale) · 48 fl oz
  { id: 'p_oldbay', term: 'old bay seasoning' }, // OLD BAY Classic Seafood Seasoning $6.59 · 6 oz
  { id: 'p_packout', term: 'trash bags' }, // Harris Teeter Tall 13 Gallon Drawstring Kitche… $5.99 ($5.39 sale) · 22 ct
  { id: 'p_paper', term: 'aluminum foil' }, // Harris Teeter Aluminum Foil $4.79 ($4.29 sale) · 75 ft
  { id: 'p_passed', term: 'mixed nuts' }, // Harris Teeter Salted Roasted Mixed Nuts $15.99 ($12.99 sale) · 32 oz
  { id: 'p_peas-rice', term: 'black eyed peas' }, // Harris Teeter Black Eyed Peas $1.39 ($0.75 sale) · 16 fl oz
  { id: 'p_pies', term: 'pumpkin pie' }, // Bakery Fresh 8 Inch Pumpkin Pie $4.00 · 21.5 oz (serves 6)
  { id: 'p_pimentocheese', term: 'pimento cheese' }, // Palmetto Cheese Original Homestyle Pimento Che… $8.99 · 12 oz
  { id: 'p_pimms_strawberries', term: 'strawberries' }, // Fresh Strawberries – 1 LB Clamshell $5.99 ($4.99 sale) · 1 lb
  { id: 'p_pinkblue_treats', term: 'sugar cookies' }, // Sugar Cookies $3.00 · 12 count
  { id: 'p_pizza', term: 'frozen pizza' }, // Red Baron Pepperoni Classic Crust Frozen Pizza $6.79 ($4.99 sale) · 20.61 oz
  { id: 'p_pizza_sliders', term: 'frozen pizza' }, // Red Baron Pepperoni Classic Crust Frozen Pizza $6.79 ($4.99 sale) · 20.61 oz
  { id: 'p_pot', term: 'red beans' }, // Harris Teeter Dark Red Kidney Beans $1.39 ($0.75 sale) · 15.5 oz
  { id: 'p_potato_salad', term: 'red potatoes' }, // Harris Teeter Farmers Market Baby Red Potatoes $5.49 · 3 lb
  { id: 'p_potatoes_butter', term: 'butter' }, // Harris Teeter Salted Butter Quarters $3.59 · 4 ct / 16 oz
  { id: 'p_potatoes_cream', term: 'half and half' }, // Harris Teeter Half & Half $2.29 · 16 fl oz
  { id: 'p_potatosalad', term: 'potato salad' }, // Harris Teeter Fresh Foods Market Original Pota… $5.99 ($4.99 sale) · 16 oz
  { id: 'p_propane', term: 'propane' }, // Blue Rhino Exchange Propane Tank $21.99 · 15 lb
  { id: 'p_protein_ham', term: 'spiral ham' }, // Smithfield Spirals Spiral Sliced Hickory Smoke… $3.99 ($1.99 sale) · 1 lb
  { id: 'p_punch', term: 'fruit punch' }, // Simply Fruit Punch Juice Drink Bottle $3.29 · 52 fl oz
  { id: 'p_punchbase', term: 'fruit punch' }, // Simply Fruit Punch Juice Drink Bottle $3.29 · 52 fl oz
  { id: 'p_quesillo', term: 'mozzarella cheese' }, // Harris Teeter Mozzarella Cheese $3.49 ($2.99 sale) · 8 oz
  { id: 'p_red_drink', term: 'kool aid' }, // Kool Aid Unsweetened Tropical Punch Red Powder… $0.40 · 0.16 oz
  { id: 'p_reddrink', term: 'strawberry soda' }, // Fanta Strawberry Soda Cans $11.99 · 12 pk / 12 fl oz
  { id: 'p_redvelvet', term: 'red velvet cake' }, // Duncan Hines Perfectly Moist Red Velvet Cake Mix $3.19 · 15.25 oz
  { id: 'p_reveal_cake', term: 'cupcakes' }, // Harris Teeter Fresh Foods Market Cookies & Cre… $6.49 ($5.00 sale) · 6 ct
  { id: 'p_ribs', term: 'pork ribs' }, // Baby Back Pork Ribs $5.99 ($3.99 sale) · 1 lb
  { id: 'p_roast_veg', term: 'brussels sprouts' }, // Brussels Sprouts $5.99 ($2.99 sale) · 1 lb
  { id: 'p_roasting_foil', term: 'heavy duty aluminum foil' }, // Reynolds Wrap Heavy Duty Aluminum Foil Food Wr… $6.99 ($5.99 sale) · 50 sq ft
  { id: 'p_roasting_kit', term: 'roasting pan' }, // Handi-foil Extra Deep Super King Roaster Pan w… $16.99 · 1 ct
  { id: 'p_roasting_twine', term: 'kitchen twine' }, // Everyday Living Kitchen Twine Ball - White $8.49 · 300 ft
  { id: 'p_rolls', term: 'dinner rolls' }, // King’s Hawaiian Savory Butter Rolls $10.99 ($8.00 sale) · 24 oz
  { id: 'p_rolls_butter', term: 'butter' }, // Harris Teeter Salted Butter Quarters $3.59 · 4 ct / 16 oz
  { id: 'p_safety_firstaid', term: 'first aid kit' }, // First Aid Only Compact First Aid Essentials Kit $4.99 · 17 pc
  { id: 'p_safetykit', term: 'pain reliever' }, // Tylenol Extra Strength Pain Reliever Fever Red… $2.99 · 10 ct
  { id: 'p_salad', term: 'salad kit' }, // Fresh Express Chopped Caesar Salad Kit $5.49 ($3.99 sale) · 10.4 oz
  { id: 'p_salsa', term: 'salsa' }, // Harris Teeter Thick & Chunky Mild Salsa 16 oz $2.69 ($2.00 sale) · 16 oz
  { id: 'p_sausage', term: 'smoked sausage' }, // Hillshire Farm Smoked Sausage $6.99 ($3.49 sale) · 14 oz
  { id: 'p_seafood', term: 'raw shrimp' }, // Harris Teeter Fishermans Market 21/30 CT Raw S… $39.98 ($19.99 sale) · 2 lb
  { id: 'p_seafood_boil', term: 'raw shrimp' }, // Harris Teeter Fishermans Market 21/30 CT Raw S… $39.98 ($19.99 sale) · 2 lb
  { id: 'p_serveware', term: 'paper plates' }, // Dixie 8.5-Inch Disposable Paper Plates $4.39 ($3.29 sale) · 48 ct
  { id: 'p_serveware_cups', term: 'plastic cups' }, // Harris Teeter Textured Plastic Cups $6.49 ($4.49 sale) · 50 ct
  { id: 'p_serveware_napkins', term: 'paper napkins' }, // Bounty White Paper Napkins $4.99 ($2.99 sale) · 200 ct
  { id: 'p_serveware_spoons', term: 'serving utensils' }, // Harris Teeter Occasions 3 Piece Servingware Set $2.49 · 3 pc
  { id: 'p_serving', term: 'foil pans' }, // Eco-foil Cook N Carry Utility Pan with Lid 4CT $11.39 · 4 ct
  { id: 'p_sides_mac', term: 'elbow macaroni' }, // Harris Teeter Elbow Macaroni $1.99 ($1.18 sale) · 16 oz
  { id: 'p_sides_potato', term: 'potato salad' }, // Harris Teeter Fresh Foods Market Original Pota… $5.99 ($4.99 sale) · 16 oz
  { id: 'p_signature', term: 'cocktail mixer' }, // Cocktail Crate Classic Old Fashioned Craft Coc… $8.99 · 12.7 fl oz
  { id: 'p_slaw', term: 'coleslaw mix' }, // Fresh Express 3-Color Deli Cole Slaw Mix $2.99 · 14 oz
  { id: 'p_smoked-meat', term: 'smoked turkey wings' }, // Morty Pride Smoked Turkey Wings $4.99 ($3.99 sale) · 1 lb
  { id: 'p_snacks', term: 'potato chips' }, // Harris Teeter Ripple Potato Chips $3.39 ($2.00 sale) · 8 oz
  { id: 'p_soda', term: 'soda' }, // Sprite Lemon-Lime Caffeine Free Soda Cans $11.99 · 12 pk / 12 fl oz
  { id: 'p_soda-water', term: 'soda' }, // Sprite Lemon-Lime Caffeine Free Soda Cans $11.99 · 12 pk / 12 fl oz
  { id: 'p_soda_dry', term: 'soda' }, // Sprite Lemon-Lime Caffeine Free Soda Cans $11.99 · 12 pk / 12 fl oz
  { id: 'p_soda_water', term: 'soda' }, // Sprite Lemon-Lime Caffeine Free Soda Cans $11.99 · 12 pk / 12 fl oz
  { id: 'p_softdrinks', term: 'soft drinks' }, // Pepsi cola Soda Bottle $3.99 · 2 liter
  { id: 'p_spread', term: 'veggie tray' }, // Fruit and Vegetable Tray Fresh Cut In Store Da… $16.00 · 64 oz
  { id: 'p_starch_second', term: 'grits' }, // Quaker Quick 5 Minute Grits $3.79 · 24 oz
  { id: 'p_strawberries', term: 'strawberries' }, // Fresh Strawberries – 1 LB Clamshell $5.99 ($4.99 sale) · 1 lb
  { id: 'p_stuffing', term: 'stuffing mix' }, // Pepperidge Farm Herb Seasoned Classic Stuffing $4.29 ($3.50 sale) · 12 oz
  { id: 'p_sugar', term: 'granulated sugar' }, // Harris Teeter Granulated Sugar $2.89 · 2 lb
  { id: 'p_sweet', term: 'cookies' }, // Chocolate Chip Cookies $3.00 · 12 count
  { id: 'p_sweet-tea', term: 'sweet tea' }, // Milo's Famous Sweet Iced Tea $5.39 ($3.99 sale) · 1 gal
  { id: 'p_sweet_potatoes', term: 'sweet potatoes' }, // Sweet Potato $1.99 ($0.39 sale) · 1 lb
  { id: 'p_table', term: 'fresh flowers' }, // Sunshine Bouquet Majestic TG Bouquet $16.00 ($12.00 sale) · 1 ea
  { id: 'p_tableware', term: 'paper plates' }, // Dixie 8.5-Inch Disposable Paper Plates $4.39 ($3.29 sale) · 48 ct
  { id: 'p_tea_dry', term: 'sweet tea' }, // Milo's Famous Sweet Iced Tea $5.39 ($3.99 sale) · 1 gal
  { id: 'p_thermometer', term: 'meat thermometer' }, // GoodCook Classic Stainless Steel Meat Thermome… $9.99 ($8.00 sale) · 1 ct
  { id: 'p_toast_champagne', term: 'sparkling wine' }, // Andre Brut Champagne California Sparkling Wine $9.99 · 750 ml
  { id: 'p_togo', term: 'plastic containers' }, // Glad Rectangular Plastic Containers with Lids $9.19 · 28 oz
  { id: 'p_towels', term: 'paper towels' }, // Bounty Paper Towels Select-A-Size White 6 Doub… $17.49 ($12.99 sale) · 6 rolls
  { id: 'p_trash', term: 'trash bags' }, // Harris Teeter Tall 13 Gallon Drawstring Kitche… $5.99 ($5.39 sale) · 22 ct
  { id: 'p_trashbags', term: 'trash bags' }, // Harris Teeter Tall 13 Gallon Drawstring Kitche… $5.99 ($5.39 sale) · 22 ct
  { id: 'p_treats', term: 'cookies' }, // Chocolate Chip Cookies $3.00 · 12 count
  { id: 'p_turkey', term: 'frozen whole turkey' }, // Harris Teeter Frozen Turkey (16-20 lb) $2.49 ($1.49 sale) · 1 lb
  { id: 'p_veg_option', term: 'acorn squash' }, // Green Acorn Squash $1.99 ($1.49 sale) · 1 lb
  { id: 'p_veganwat', term: 'red lentils' }, // Simple Truth Organic Red Lentils $3.79 ($2.99 sale) · 16 oz
  { id: 'p_veggietray', term: 'veggie tray' }, // Fruit and Vegetable Tray Fresh Cut In Store Da… $16.00 · 64 oz
  { id: 'p_vinegar', term: 'apple cider vinegar' }, // Harris Teeter Apple Cider Vinegar $1.69 · 16 fl oz
  { id: 'p_water', term: 'bottled water' }, // Harris Teeter Purified Drinking Bottled Water $3.99 ($3.33 sale) · 24 bottles/16.9 fl oz
  { id: 'p_water_coffee', term: 'bottled water' }, // Harris Teeter Purified Drinking Bottled Water $3.99 ($3.33 sale) · 24 bottles/16.9 fl oz
  { id: 'p_water_dry', term: 'bottled water' }, // Harris Teeter Purified Drinking Bottled Water $3.99 ($3.33 sale) · 24 bottles/16.9 fl oz
  { id: 'p_water_stage', term: 'bottled water' }, // Harris Teeter Purified Drinking Bottled Water $3.99 ($3.33 sale) · 24 bottles/16.9 fl oz
  { id: 'p_water_tea', term: 'bottled water' }, // Harris Teeter Purified Drinking Bottled Water $3.99 ($3.33 sale) · 24 bottles/16.9 fl oz
  { id: 'p_watermelon', term: 'watermelon' }, // Mini Seedless Whole Watermelon $5.99 · 1 ct
  { id: 'p_wave_one', term: 'frozen appetizers' }, // Bibigo Frozen Mini Wontons Chicken & Vegetable… $9.99 ($5.50 sale) · 24.0 oz
  { id: 'p_wave_two', term: 'slider buns' }, // Pepperidge Farm Sweet Hawaiian Slider Buns $4.29 · 15 oz
  { id: 'p_wine', term: 'red wine' }, // Apothic Red Blend California Red Wine $10.00 · 750 ml
  { id: 'p_wine_beer', term: 'beer' }, // Samuel Adams Winter Break Seasonal Variety Beer $17.99 · 12 cans / 12 fl oz
  { id: 'p_wine_cider', term: 'red wine' }, // Apothic Red Blend California Red Wine $10.00 · 750 ml
  { id: 'p_wine_host', term: 'red wine' }, // Apothic Red Blend California Red Wine $10.00 · 750 ml
  { id: 'p_wings', term: 'chicken wings' }, // Whole Fresh Chicken Wings $10.00 · 3.25 lb
  { id: 'p_yams', term: 'sweet potatoes' }, // Sweet Potato $1.99 ($0.39 sale) · 1 lb
  { id: 'p_zero_sparkler', term: 'sparkling cider' }, // Martinelli's Sparkling Apple Cider $5.99 ($3.99 sale) · 1 ct / 25.4 fl oz
  { id: 'p_zero_sparkler_all', term: 'sparkling cider' }, // Martinelli's Sparkling Apple Cider $5.99 ($3.99 sale) · 1 ct / 25.4 fl oz
  { id: 'p_zeroproof', term: 'mocktail' }, // Mingle Mocktails Non-Alcoholic Cranberry Cosmo $11.99 ($9.99 sale) · 4 cans / 12 fl oz
  // ── SPLIT LINES, BATCH 4 (owner ruling 11/23/2026): one term per part id. probed live at Harris
  // Teeter Old Town Alexandria (09700398) on 11/24/2026, no line ids sent.
  { id: 'p_veg_greens', term: 'salad greens spring mix' }, // BrightFarms Spring Mix Lettuce (all three stores, 11/24); 'salad greens' found Baby Spring Mix, which the form-word check refused
  { id: 'p_appetizer_cheese', term: 'cheese tray' },
  { id: 'p_cocktail_garnish', term: 'limes' },
  { id: 'p_coffee_cream', term: 'coffee creamer' }, // Chobani® Coffee Creamer Limited Batch Cookie But $5.99 · 24 fl oz
  { id: 'p_coffee_sugar', term: 'granulated sugar' },
  { id: 'p_dish_sponges', term: 'sponges' }, // Scrub Daddy® Dual-Sided Sponge and Scrubber Mult $6.99 · 4 pk
  { id: 'p_dish_bags', term: 'trash bags' },
  { id: 'p_softdrinks_juice', term: 'apple juice' }, // Harris Teeter No Sugar Added 100% Apple Juice $3.69 · 64 fl oz
  { id: 'p_softdrinks_water', term: 'bottled water' },
  { id: 'p_candles_lighter', term: 'lighter' }, // BIC Flex Wand Multi Purpose Lighters $10.99 · 2 ct
  { id: 'p_tableware_cups', term: 'disposable cups' },
  { id: 'p_tableware_napkins', term: 'paper napkins' },
  { id: 'p_tableware_cutlery', term: 'plastic cutlery' }, // Harris Teeter Occasions Full Size Clear Dinnerwa $7.19 · 96 ct
  { id: 'p_cleanup_wipes', term: 'wet wipes' }, // Cottonelle® Fresh Care Flushable Wet Wipes $8.99 · 4 ct
  { id: 'p_food_fruit', term: 'fruit tray' }, // Fresh Fruit Party Tray $21 · 73 oz
  { id: 'p_protein_hotdogs', term: 'hot dogs' },
  { id: 'p_protein_chicken', term: 'chicken thighs' },
  { id: 'p_sides_beans', term: 'baked beans' },
  { id: 'p_sides_corn', term: 'corn on the cob' },
  { id: 'p_sides_chips', term: 'potato chips' },
  { id: 'p_condiments_mustard', term: 'yellow mustard' }, // French's Classic Yellow Mustard $2.79 · 14 oz
  { id: 'p_condiments_cheese', term: 'sliced cheese' }, // Harris Teeter™ Colby Jack Sliced Cheese $3.49 · 10 slices / 8 oz
  { id: 'p_condiments_lettuce', term: 'iceberg lettuce' }, // Wrapped Iceberg Lettuce $2.49 · 1 ct
  { id: 'p_condiments_onion', term: 'yellow onions' },
  { id: 'p_dessert_cookies', term: 'cookies' },
  { id: 'p_dessert_smores', term: 'marshmallows' }, // Jet-Puffed Mini Marshmallows, Bag $2.29 · 10 oz
  { id: 'p_drinks_soda', term: 'soda' },
  { id: 'p_drinks_water', term: 'bottled water' },
  { id: 'p_fuel_lighter', term: 'lighter' }, // BIC Flex Wand Multi Purpose Lighters $10.99 · 2 ct
  { id: 'p_cleanup_foil', term: 'aluminum foil' },
  { id: 'p_sides_salads', term: 'potato salad' },
  { id: 'p_sides_fruit', term: 'fruit tray' }, // Fresh Fruit Party Tray $21 · 73 oz
  { id: 'p_sides_dips', term: 'french onion dip' }, // Dean's® French Onion Dip $3.39 · 16 oz
  { id: 'p_drinks_lemonade', term: 'lemonade' }, // Simply® Lemonade Bottle $3.29 · 52 fl oz
  { id: 'p_chips_dips', term: 'french onion dip' }, // Dean's® French Onion Dip $3.39 · 16 oz
  { id: 'p_dessert_mix', term: 'snack mix' }, // Chex Mix™ Cheddar Family Size Snack Mix $5.79 · 13.5 oz
  { id: 'p_daytonadecor_snacks', term: 'snack mix' }, // Chex Mix™ Cheddar Family Size Snack Mix $5.79 · 13.5 oz
  { id: 'p_pimms_strawberries_cream', term: 'whipped cream' },
  { id: 'p_snacks_crackers', term: 'crackers' },
  { id: 'p_snacks_pretzels', term: 'pretzels' }, // Utz, Holiday Shaped Pretzels, Party Size Bag $5.39 · 14 oz
  { id: 'p_snacks_popcorn', term: 'popcorn' },
  { id: 'p_dips_guac', term: 'guacamole' }, // Fresh Made In Store Guacamole Chunky Mild $7 · 14 oz
  { id: 'p_dips_queso', term: 'queso dip' }, // On The Border® Salsa Con Queso $5.69 · 15.5 oz
  { id: 'p_dips_ranch', term: 'ranch dip' }, // Daisy Sour Cream Creamy Ranch Dip $3.59 · 16 oz
  { id: 'p_dessert_brownies', term: 'brownies' },
  { id: 'p_dessert_sweets', term: 'fun size candy' },
  { id: 'p_beer_wine_wine', term: 'red wine' },
  { id: 'p_napkins_wipes', term: 'wet wipes' }, // Cottonelle® Fresh Care Flushable Wet Wipes $8.99 · 4 ct
  { id: 'p_cups_plates_plates', term: 'paper plates' },
  { id: 'p_cups_plates_bowls', term: 'disposable bowls' }, // Solo® Bold Hold™ Paper Bowls $6.99 · 56 ct
  { id: 'p_trash_towels', term: 'paper towels' },
  { id: 'p_crackers_baguette', term: 'baguette' }, // Gran Reserva Baguette $3 · 1 ct
  { id: 'p_fruit_olives', term: 'olives' }, // Harris Teeter™ Sliced Black Olives $2.59 · 2.25 oz
  { id: 'p_veg_hummus', term: 'hummus' },
  { id: 'p_veg_ranch', term: 'ranch dip' }, // Daisy Sour Cream Creamy Ranch Dip $3.59 · 16 oz
  { id: 'p_passed_chips', term: 'tortilla chips' },
  { id: 'p_passed_salsa', term: 'salsa' },
  { id: 'p_cups_paperplates', term: 'paper plates' },
  { id: 'p_cups_napkins', term: 'paper napkins' },
  { id: 'p_cups_picks', term: 'cocktail picks' }, // True Ball Cocktail Picks $3.99 · 20 ct
  { id: 'p_cleanup_sponges', term: 'sponges' }, // Scrub Daddy® Dual-Sided Sponge and Scrubber Mult $6.99 · 4 pk
  { id: 'p_cleanup_stain', term: 'stain remover' }, // OxiClean Max Force Laundry Stain Remover Spray $4.49 · 12 fl oz
  { id: 'p_punch_garnish', term: 'limes' },
  { id: 'p_giftlog_pen', term: 'pens' }, // Pilot G2 Premium Gel Roller Black Ink Fine Point $9.49 · 4 pk
  { id: 'p_tableware_flutes', term: 'champagne flutes' },
  { id: 'p_snacks_veggie', term: 'veggie tray' },
  { id: 'p_snacks_dips', term: 'veggie dip' }, // Marzetti Ranch Veggie Dip $5.19 · 12 oz
  { id: 'p_cleanup_bags', term: 'lawn and leaf bags' }, // Harris Teeter™ Draw String Lawn & Leaf Bags $9.79 · 18 ct
  { id: 'p_cleanup_broom', term: 'broom' }, // Libman® Precision Angle Broom with Dust Pan $14.99 · 1 ct
  { id: 'p_grazing_cheese', term: 'cheese tray' },
  { id: 'p_grazing_crackers', term: 'crackers' },
  { id: 'p_beer_seltzer', term: 'hard seltzer' }, // Topo Chico Hard Seltzer Variety Pack $17.99 · 12 cans / 12 fl oz
  { id: 'p_signature_garnish', term: 'limes' },
  { id: 'p_garnish_citrus', term: 'limes' },
  { id: 'p_garnish_bitters', term: 'bitters' }, // Angostura® Aromatic Bitters $11.99 · 4 fl oz
  { id: 'p_guestbook_pens', term: 'pens' }, // Pilot G2 Premium Gel Roller Black Ink Fine Point $9.49 · 4 pk
  { id: 'p_napkins_plates', term: 'paper plates' },
  { id: 'p_napkins_picks', term: 'cocktail picks' }, // True Ball Cocktail Picks $3.99 · 20 ct
  { id: 'p_napkins_cups', term: 'disposable cups' },
  { id: 'p_apps_charcuterie', term: 'charcuterie' },
  { id: 'p_sides_veg', term: 'mixed vegetables' }, // Harris Teeter® Steamable Mixed Vegetables $1.69 · 12 oz
  { id: 'p_clean_sponges', term: 'sponges' }, // Scrub Daddy® Dual-Sided Sponge and Scrubber Mult $6.99 · 4 pk
  { id: 'p_clean_bags', term: 'trash bags' },
  { id: 'p_signature_mixers', term: 'tonic water' }, // Canada Dry Tonic Water, 1 L bottle $1.89 · 1 l
  { id: 'p_mixers_citrus', term: 'limes' },
  { id: 'p_mixers_bitters', term: 'bitters' }, // Angostura® Aromatic Bitters $11.99 · 4 fl oz
  { id: 'p_apps_hot_sliders', term: 'slider buns' },
  { id: 'p_apps_hot_mushrooms', term: 'stuffed mushrooms' }, // Giorgio® Spinach & Artichoke Stuffed Baby Bella  $5.69 · 8.5 oz
  { id: 'p_apps_cold_cheese', term: 'cheese tray' },
  { id: 'p_apps_cold_crudite', term: 'veggie tray' },
  { id: 'p_dessert_tarts', term: 'mini tarts' }, // Bonne Maman® Raspberry Tartlets $5.99 · 9 ct / 0.53 oz
  { id: 'p_mocktail_juice', term: 'apple juice' }, // Harris Teeter No Sugar Added 100% Apple Juice $3.69 · 64 fl oz
  { id: 'p_mocktail_syrup', term: 'simple syrup' }, // Master of Mixes® Cocktail Essentials Simple Syru $3.99 · 12.7 fl oz
  { id: 'p_mocktail_garnish', term: 'maraschino cherries' }, // Harris Teeter™ Stem Free Maraschino Cherries $2.99 · 10 oz
  { id: 'p_cleanup_supplies', term: 'all purpose cleaner spray' }, // Lysol All Purpose Cleaner Spray Lemon Breeze (all three stores, 11/24); 'cleaning spray' found a Starter Kit at Old Town
  { id: 'p_sides_veggie', term: 'veggie tray' },
  { id: 'p_memory_display_frames', term: 'foam board' }, // UCreate Premium Poster Board, Large Size, for Si $1.89 · 22 x 28 in
  { id: 'p_card_pens', term: 'pens' }, // Pilot G2 Premium Gel Roller Black Ink Fine Point $9.49 · 4 pk
  { id: 'p_cleanup_containers', term: 'plastic containers' },
  { id: 'p_buffet_protein_carved', term: 'spiral ham' },
  { id: 'p_sides_greensalad', term: 'salad kit' },
  { id: 'p_serveware_tongs', term: 'tongs' }, // Goodcook Straight Tongs $5.79 · 1 ct
  { id: 'p_soda-water_water', term: 'bottled water' },
  { id: 'p_paper_cups', term: 'disposable cups' },
  { id: 'p_paper_napkins', term: 'paper napkins' },
  { id: 'p_paper_utensils', term: 'plastic cutlery' }, // Harris Teeter Occasions Full Size Clear Dinnerwa $7.19 · 96 ct
  { id: 'p_nametags_markers', term: 'markers' }, // Crayola Fineline Classic Markers $5.29 · 10 ct
  { id: 'p_apps_meats', term: 'charcuterie' },
  { id: 'p_mixers_garnish', term: 'limes' },
  { id: 'p_zeroproof_nabubbly', term: 'non alcoholic sparkling wine' }, // La Marca Non Alcoholic Sparkling Wine $22.99 · 750 ml
  { id: 'p_tableware_shots', term: 'shot glasses' }, // True Plastic 2 oz Shot Glasses Multipack $7.99 · 50 ct
  { id: 'p_safetykit_recovery', term: 'electrolyte drink' }, // Recover 180™ Strawberry Banana Sports Hydration  $2.39 · 16.9 fl oz
  { id: 'p_water_sports', term: 'sports drinks' }, // Gatorade Orange Sports Drink Multipack Bottles $10.99 · 12 pk / 12 fl oz
  { id: 'p_disposables_napkins', term: 'paper napkins' },
  { id: 'p_disposables_plates', term: 'paper plates' },
  { id: 'p_food_wings', term: 'chicken wings' },
  { id: 'p_guestbook_pen', term: 'pens' }, // Pilot G2 Premium Gel Roller Black Ink Fine Point $9.49 · 4 pk
  { id: 'p_burgers_dogs_hotdogs', term: 'hot dogs' },
  { id: 'p_burgers_dogs_links', term: 'smoked sausage' },
  { id: 'p_mac_cheese', term: 'sharp cheddar cheese' },
  { id: 'p_condiments_ketchup', term: 'ketchup' },
  { id: 'p_condiments_hotsauce', term: 'hot sauce' },
  { id: 'p_condiments_pickles', term: 'pickles' }, // Mt. Olive Kosher Baby Dills Pickles $3.99 · 24 fl oz
  { id: 'p_seasoning_marinade', term: 'marinade' }, // Harris Teeter® Teriyaki Marinade $2.59 · 12.25 fl oz
  { id: 'p_red_drink_sugar', term: 'granulated sugar' },
  { id: 'p_soda_water_water', term: 'bottled water' },
  { id: 'p_grown_folks_mixers', term: 'cola' }, // Coca-Cola® Soda Cans $11.99 · 12 pk / 12 fl oz
  { id: 'p_fuel_fluid', term: 'lighter fluid' }, // Kingsford Charcoal Lighter Fluid, 32 Fl Oz $7.99 · 32 fl oz
  { id: 'p_foil_pans_foil', term: 'aluminum foil' },
  { id: 'p_togo_foil', term: 'aluminum foil' },
  { id: 'p_togo_zip', term: 'zipper bags' }, // Lunchskins Compostable Sandwich Zipper Bags $5.99 · 50 ct
  { id: 'p_cleanup_gloves', term: 'disposable gloves' }, // Harris Teeter™ Vinyl Disposable Medical Exam Glo $6.29 · 50 ct
  { id: 'p_cleanup_sanitizing', term: 'disinfecting wipes' }, // Clorox Disinfecting Wipes Variety Pack Crisp Lem $17.99 · 225 ct
  { id: 'p_cornmeal_flour', term: 'all purpose flour' },
  { id: 'p_hotsauce_lemons', term: 'lemons' },
  { id: 'p_starch_sauce', term: 'pasta sauce' }, // Harris Teeter® Homestyle Parmesan & Romano Pasta $2.39 · 24 oz
  { id: 'p_sides_hushpuppy', term: 'hush puppies' }, // Savannah Classics® Original Fresh Onion Hushpupp $3.99 · 16 oz.
  { id: 'p_sides_fries', term: 'frozen fries' }, // Ore-Ida Crispy Frozen Waffle Fries $6.99 · 22 oz
  { id: 'p_drinks_red', term: 'fruit punch' },
  { id: 'p_containers_foil', term: 'aluminum foil' },
  { id: 'p_cleanup_heavyfoil', term: 'heavy duty aluminum foil' },
  { id: 'p_grown_mixers', term: 'cola' }, // Coca-Cola® Soda Cans $11.99 · 12 pk / 12 fl oz
  { id: 'p_wings_meatballs', term: 'frozen meatballs' },
  { id: 'p_chips_pretzels', term: 'pretzels' }, // Utz, Holiday Shaped Pretzels, Party Size Bag $5.39 · 14 oz
  { id: 'p_chips_mix', term: 'party mix' }, // 20 oz Utz Pub Mix Barrel $10.29 · 20 oz
  { id: 'p_chips_salsa', term: 'salsa' },
  { id: 'p_brown_mixers', term: 'cola' }, // Coca-Cola® Soda Cans $11.99 · 12 pk / 12 fl oz
  { id: 'p_wine_beer_wine', term: 'red wine' },
  { id: 'p_cards_pads', term: 'notepad' }, // Office Works 3 x 3 Inch Self-Stick Note Pads - Y $3.29 · 4 pk / 50 sheets
  { id: 'p_cards_pens', term: 'pens' }, // Pilot G2 Premium Gel Roller Black Ink Fine Point $9.49 · 4 pk
  { id: 'p_napkins_towels', term: 'paper towels' },
  { id: 'p_cornbread_buttermilk', term: 'buttermilk' }, // Harris Teeter® Lowfat Cultured Buttermilk $1.99 · 16 fl oz
  { id: 'p_sweet-tea_lemonade', term: 'lemonade' }, // Simply® Lemonade Bottle $3.29 · 52 fl oz
  { id: 'p_foil-oil_foil', term: 'aluminum foil' },
  { id: 'p_foil-oil_parchment', term: 'parchment paper' }, // Harris Teeter™ Parchment Paper $3.19 · 30 sq ft
  { id: 'p_foil-oil_towels', term: 'paper towels' },
  { id: 'p_togo_plates', term: 'foil pie pans' }, // Handi Foil® Heavy Duty Smooth Wall Pie Pan $6.99 · 3 ct
  { id: 'p_beerwine_wine', term: 'red wine' },
  { id: 'p_water_nonalc', term: 'lemonade' }, // Simply® Lemonade Bottle $3.29 · 52 fl oz
  { id: 'p_bites_charcuterie', term: 'charcuterie' },
  { id: 'p_bites_sliders', term: 'slider buns' },
  { id: 'p_garnish_fruit', term: 'limes' },
  { id: 'p_cups_cutlery', term: 'plastic cutlery' }, // Harris Teeter Occasions Full Size Clear Dinnerwa $7.19 · 96 ct
  { id: 'p_water_tea_tea', term: 'iced tea' },
  { id: 'p_heat_bugspray', term: 'insect repellent' }, // Cutter® Skinsations® Insect Repellent $6.69 · 1 (ea)
  { id: 'p_butter_dishes', term: 'disposable bowls' }, // Solo® Bold Hold™ Paper Bowls $6.99 · 56 ct
  { id: 'p_sides_hushpuppies', term: 'hush puppies' }, // Savannah Classics® Original Fresh Onion Hushpupp $3.99 · 16 oz.
  { id: 'p_softdrinks_tea', term: 'iced tea' },
  { id: 'p_towels_wipes', term: 'wet wipes' }, // Cottonelle® Fresh Care Flushable Wet Wipes $8.99 · 4 ct
  { id: 'p_tableware_bowls', term: 'disposable bowls' }, // Solo® Bold Hold™ Paper Bowls $6.99 · 56 ct
  { id: 'p_season_cayenne', term: 'cayenne pepper' }, // Badia® Ground Cayenne Pepper $2.29 · 1.75 oz
  { id: 'p_season_salt', term: 'salt' }, // Harris Teeter™ Iodized Salt $0.69 · 26 oz
  { id: 'p_aromatics_garlic', term: 'garlic' }, // Garlic $0.75 · 1 ct
  { id: 'p_aromatics_mushrooms', term: 'mushrooms' }, // Harris Teeter Farmers Market Sliced White Mushro $2.49 · 8 oz
  { id: 'p_napkins_napkins', term: 'paper napkins' },
  { id: 'p_napkins_bags', term: 'trash bags' },
  { id: 'p_napkins_gloves', term: 'disposable gloves' }, // Harris Teeter™ Vinyl Disposable Medical Exam Glo $6.29 · 50 ct
  { id: 'p_butter_lemons', term: 'lemons' },
  { id: 'p_butter_cocktail', term: 'cocktail sauce' }, // Heinz Original Cocktail Sauce $3.49 · 12 oz
  { id: 'p_butter_hotsauce', term: 'hot sauce' },
  { id: 'p_drinks_tea', term: 'sweet tea' },
  { id: 'p_batch_garnish', term: 'limes' },
  { id: 'p_tableware_forks', term: 'plastic cutlery' }, // Harris Teeter Occasions Full Size Clear Dinnerwa $7.19 · 96 ct
  { id: 'p_meatwat_beef', term: 'beef stew meat' }, // Harris Teeter Beef Stew Meat $8.99 · 1 lb
  { id: 'p_meatwat_eggs', term: 'eggs' },
  { id: 'p_meatwat_onion', term: 'yellow onions' },
  { id: 'p_veganwat_collards', term: 'collard greens' },
  { id: 'p_fandisha_bread', term: 'bread' },
  { id: 'p_packout_tote', term: 'reusable bag' }, // Harris Teeter Bag 1 ea $0.99 · 1 each
  { id: 'p_appetizers_salsa', term: 'salsa' },
  { id: 'p_appetizers_guac', term: 'guacamole' }, // Fresh Made In Store Guacamole Chunky Mild $7 · 14 oz
  { id: 'p_appetizers_taquitos', term: 'frozen taquitos' }, // El Monterey® Chicken & Cheese Frozen Flour Taqui $10.19 · 20 ct / 20 oz
  { id: 'p_beverages_juice', term: 'apple juice' }, // Harris Teeter No Sugar Added 100% Apple Juice $3.69 · 64 fl oz
  { id: 'p_decor_balloons', term: 'balloons' }, // Birthday Marquee Helium Filled Balloon $11.99 · 31 in
  { id: 'p_drinks_coffee', term: 'ground coffee' },
  { id: 'p_serveware_cutlery', term: 'plastic cutlery' }, // Harris Teeter Occasions Full Size Clear Dinnerwa $7.19 · 96 ct
  { id: 'p_serving_sterno', term: 'sterno' }, // Sterno® Ethanol Gel Canned Heat Pack $10.19 · 3 ct / 2.05 oz
  { id: 'p_mazao_veg', term: 'mixed vegetables' }, // Harris Teeter® Steamable Mixed Vegetables $1.69 · 12 oz
  { id: 'p_mazao_nuts', term: 'mixed nuts' },
  { id: 'p_mains_jollof', term: 'long grain rice' },
  { id: 'p_sides_yams', term: 'sweet potatoes' },
  { id: 'p_drinks_juice', term: 'apple juice' }, // Harris Teeter No Sugar Added 100% Apple Juice $3.69 · 64 fl oz
  { id: 'p_coffee_water', term: 'bottled water' },
  { id: 'p_snacks_coffee', term: 'ground coffee' },
  { id: 'p_snacks_water', term: 'bottled water' },
  { id: 'p_firstaid_sunscreen', term: 'sunscreen' },
  { id: 'p_pledgecards_pens', term: 'pens' }, // Pilot G2 Premium Gel Roller Black Ink Fine Point $9.49 · 4 pk
  { id: 'p_wine_cider_white', term: 'white wine' }, // Whitehaven Sauvignon Blanc New Zealand White Win $17.99 · 750 ml
  { id: 'p_nonalc_zeroproof', term: 'mocktail' },
  { id: 'p_path_lights_step', term: 'light bulbs' }, // Everyday Living® 10.5-Watt (60-Watt) A19 LED Lig $7.99 · 4 pk
  { id: 'p_water_coffee_coffee', term: 'ground coffee' },
  { id: 'p_drinks_juiceboxes', term: 'juice boxes' },
  { id: 'p_allergy_labels_tents', term: 'index cards' }, // Oxford® Ruled Index Cards - White $1.39 · 100 pk
  { id: 'p_allergy_labels_markers', term: 'markers' }, // Crayola Fineline Classic Markers $5.29 · 10 ct
  { id: 'p_nonalc_mocktail', term: 'mocktail' },
  { id: 'p_nonalc_juice', term: 'apple juice' }, // Harris Teeter No Sugar Added 100% Apple Juice $3.69 · 64 fl oz
  { id: 'p_soda_sparkling', term: 'sparkling water' },
  { id: 'p_soda_nabeer', term: 'non alcoholic beer' },
  { id: 'p_soda_juice', term: 'apple juice' }, // Harris Teeter No Sugar Added 100% Apple Juice $3.69 · 64 fl oz
  { id: 'p_nonalc_soda', term: 'soda' },
  { id: 'p_nonalc_applecider', term: 'apple cider' },
  { id: 'p_water_sparkling', term: 'sparkling water' },
  { id: 'p_nonalc_cider', term: 'sparkling cider' },
  { id: 'p_nonalc_tea', term: 'iced tea' },
  { id: 'p_nonalc_water', term: 'bottled water' },
  { id: 'p_water_electrolyte', term: 'electrolyte drink' }, // Recover 180™ Strawberry Banana Sports Hydration  $2.39 · 16.9 fl oz
  { id: 'p_water_soda', term: 'soda' },
  { id: 'p_champagne_cups', term: 'disposable cups' },
  { id: 'p_drinks_mocktail', term: 'mocktail mixer' }, // Mingle® Mocktails Non-Alcoholic Cranberry Cosmo $11.99 · 4 cans / 12 fl oz
]);

/**
 * ── LINES NO GROCERY TERM CAN SERVE, AND WHY ──────────────────────────────
 *
 * A line here searches its own text (the caller's fallback) and is expected to
 * find nothing, or nothing right. Each reason is a product a Kroger-family
 * grocery does not stock, or a probe that returned the wrong kind of thing.
 * Keyed by line id, or by id and exact item text (`id\u0000item`) for one line.
 */
export const NO_STORE_TERM = Object.freeze({
  'diet-veg': 'the engine\'s vegetarian main is a dish named per playbook (stuffed squash with wild rice, grilled portobello); no one grocery term fits every one.',
  'fa-catering': 'a caterer, not a shelf item: the line is the catering band, priced by the caterer.',
  'p_arch': 'event decor (a ceremony arch or backdrop) from a rental or party supplier.',
  'p_avsupplies': 'electronics (HDMI and USB-C adapters, a clicker), not grocery stock.',
  'p_badges': 'printed conference badges, ordered from a printer.',
  'p_ballot': 'printed at home.',
  'p_bar_alcohol': 'names no product ("reception alcohol"); a self-supplied wedding bar is bought by the case from a liquor store.',
  'p_berbere': 'not carried by a US chain grocer (2026-09-23 probe; see the REFUSED list).',
  'p_breakfast': 'catering, not a shelf item.',
  'p_brisket': 'a whole packer brisket is a butcher order: "beef brisket" returned corned beef hash and "brisket" sliced cooked brisket (Old Town, 11/23/2026).',
  'p_brown': 'spirits: probed 11/23/2026 at Harris Teeter Old Town Alexandria VA and McHenry Row Baltimore MD, \'vodka\', \'bourbon\' and \'whiskey\' return a pasta sauce, baked beans and a seasoning; neither store sells spirits. The mixers are the minor part.',
  'p_card': 'a keepsake signing card or memory book from a stationer or party store.',
  'p_cashboxes': 'cash boxes from an office supply store.',
  'p_checkout_kit': 'card readers from a payments provider or electronics store.',
  'p_cini': 'specialty coffee cups; "espresso cups" returned coffee pods (2026-09-23).',
  'p_crabs': 'live or steamed blue crabs come from a crab house: "blue crabs" returned sushi nori and "steamed crabs" nothing (Old Town, 11/23/2026).',
  'p_crawfish': 'live crawfish by the sack come from a seafood supplier; the store sells cooked tubs (2026-09-23).',
  'p_crawfish_boiled': 'boiled crawfish is a pickup order: "crawfish" returned a boil seasoning and "cooked crawfish" nothing (Old Town, 11/23/2026).',
  'p_daytonadecor': 'theme decor from a party store.',
  'p_decor': 'party decor packages (balloon arches, backdrops, props) from a party store or rental.',
  'p_dinner': 'a caterer\'s per-plate dinner.',
  'p_doll_crown': 'ceremonial items from a quinceañera specialty shop.',
  'p_draftboard': 'a whiteboard, not grocery stock.',
  'p_emergencykit': 'names no product ("day-of emergency kit").',
  'p_entrykit': 'home goods (a shoe tray) from a home store.',
  'p_extinguisher': 'a fire extinguisher is a hardware-store item: no match (Old Town, 11/23/2026).',
  'p_fav_drink': 'names no product: the honoree\'s own drink.',
  'p_florals': 'a florist\'s work (centerpieces, bouquet).',
  'p_foodtruck': 'a food truck, not a shelf item.',
  'p_frankincense': 'liturgical incense from a specialty shop.',
  'p_grass': 'fresh-cut strewing grass; no US retail product (see UNSOURCED_PRICE_LINES).',
  'p_guestbook': 'a guest book: "guest book" returned a protein bar (Old Town, 11/23/2026).',
  'p_horchata': 'morro-seed horchata is a Latin-grocer item: "horchata" returned a protein drink and "horchata mix" nothing (Old Town, 11/23/2026).',
  'p_injera': 'not carried by a US chain grocer; "injera" returned shoe inserts (2026-09-23).',
  'p_jebena': 'a clay coffee pot from an Ethiopian importer.',
  'p_kinara': 'a Kwanzaa candle holder from a specialty shop.',
  'p_led_candles': 'LED tea lights: none matched, and "tea lights" returns wax candles, the thing this line replaces (Old Town, 11/23/2026).',
  'p_lighting': 'dance-floor lighting.',
  'p_liquor': 'spirits: probed 11/23/2026 at Harris Teeter Old Town Alexandria VA and McHenry Row Baltimore MD, \'vodka\', \'bourbon\' and \'whiskey\' return a pasta sauce, baked beans and a seasoning; neither store sells spirits.',
  'p_loroco': 'loroco is a Latin-grocer item: "loroco" returned a yogurt cup (Old Town, 11/23/2026).',
  'p_meal': 'a restaurant reservation or a picnic, not a shelf item.',
  'p_memory_display': 'prints from a print shop.',
  'p_mkeka': 'a woven Kwanzaa mat from a specialty shop.',
  'p_music': 'a Bluetooth speaker.',
  'p_namecards': 'printed name cards and table tents.',
  'p_nametags': 'name tags: "name tags" and "name badges" matched nothing (Old Town, 11/23/2026).',
  'p_niterkibbeh': 'not carried by a US chain grocer (2026-09-23).',
  'p_path_lights': 'string and stake lights: no match (Old Town, 11/23/2026).',
  'p_placecards': 'printed place cards.',
  'p_pledgecards': 'printed pledge cards.',
  'p_programs': 'printed programs.',
  'p_pumpkins': 'carving pumpkins are seasonal: "pumpkins" returned canned pumpkin and "carving pumpkin" pumpkin seeds (Old Town, 11/23/2026).',
  'p_reg_supplies': 'printers, scanners and badge stock.',
  'p_reveal_balloon': 'a reveal balloon box or powder cannon from a party store.',
  'p_ringbox': 'a ring box from a jeweler.',
  'p_rings': 'wedding rings.',
  'p_safety_extinguisher': 'a fire extinguisher is a hardware-store item: no match (Old Town, 11/23/2026).',
  'p_safety_gloves': 'heat-resistant grill gloves are a hardware or grill-shop item: no match (Old Town, 11/23/2026).',
  'p_sash': 'a sash from a party store.',
  'p_session_supplies': 'flip charts and office supplies.',
  'p_signage': 'a printed sign package.',
  'p_signin': 'a printed sheet the host makes at home.',
  'p_spirits': 'spirits: probed 11/23/2026 at Harris Teeter Old Town Alexandria VA and McHenry Row Baltimore MD, \'vodka\', \'bourbon\' and \'whiskey\' return a pasta sauce, baked beans and a seasoning; neither store sells spirits.',
  'p_teamcolors': 'team gear from a sporting-goods or party store.',
  'p_tools': 'crab mallets from a seafood supplier or rental.',
  'p_treats_nonfood': 'party favors (stickers, glow bracelets, toys) from a party store.',
  'p_unitycup': 'a Kwanzaa unity cup from a specialty shop.',
  'p_volunteer_id': 'vests and badges.',
  'p_whiskey': 'spirits: probed 11/23/2026 at Harris Teeter Old Town Alexandria VA and McHenry Row Baltimore MD, \'vodka\', \'bourbon\' and \'whiskey\' return a pasta sauce, baked beans and a seasoning; neither store sells spirits.',
  'p_worldcupcolors': 'national flags from a party or sporting-goods store.',
  'p_wristbands': 'admission wristbands from a party or office supplier.',
  'p_zawadi': 'gifts: books, art and handmade things.',
  [`p_cleanup\u0000Catering cleanup`]: 'a catering cleanup, not a shelf item.',
  [`p_paper\u0000Newspaper / brown kraft paper for the table`]: 'kraft or butcher paper: "kraft paper" returned construction paper and "butcher paper" nothing (Old Town, 11/23/2026).',
  [`p_paper\u0000Newspaper / brown kraft paper table cover`]: 'kraft or butcher paper: "kraft paper" returned construction paper and "butcher paper" nothing (Old Town, 11/23/2026).',
  [`p_paper\u0000Newspaper / kraft butcher paper (table cover)`]: 'kraft or butcher paper: "kraft paper" returned construction paper and "butcher paper" nothing (Old Town, 11/23/2026).',
  // ── SPLIT LINES, BATCH 4 (owner ruling 11/23/2026): parts and mains no grocery term serves.
  'p_cocktail_spirits': 'spirits: probed 11/23/2026 at Harris Teeter Old Town Alexandria VA and McHenry Row Baltimore MD, liquor terms return sauces and mixers; spirits come from a liquor store.',
  'p_food_sandwiches': 'a sandwich platter: "sandwich platter" and "sandwich tray" returned pulled pork (Old Town, 11/24/2026); a deli order.',
  'p_tableware_linens': 'table linens: "tablecloth" returned dishcloths and "table cover" nothing (Old Town, 11/24/2026); a party-store or rental item.',
  'p_tableware_covers': 'table covers: "plastic table cover" and "table cover" matched nothing (Old Town, 11/24/2026); a party-store item.',
  'p_teamcolors_decor': 'tailgate decor from a party store.',
  'p_pimms_strawberries_pimms': 'a liqueur from a liquor store; grocery liquor terms return mixers (Old Town, 11/23/2026).',
  'p_worldcupcolors_jerseys': 'team jerseys from a sporting-goods store.',
  'p_worldcupcolors_facepaint': 'face paint from a party store.',
  'p_ballot_prize': 'the prize is the host\'s pick.',
  'p_entrykit_basket': 'home goods (a basket) from a home store.',
  'p_entrykit_hooks': 'home goods (coat hooks) from a hardware store.',
  'p_entrykit_sign': 'a printed or hand-lettered sign.',
  'p_apps_cold_crostini': 'crostini: "crostini" returned a white wine and "crostini toasts" nothing (Old Town, 11/24/2026).',
  'p_dessert_cakepops': 'cake pops: "cake pops" returned Pop-Tarts (Old Town, 11/24/2026); a bakery order.',
  'p_signature_spirits': 'spirits: probed 11/23/2026 at Harris Teeter Old Town Alexandria VA and McHenry Row Baltimore MD, liquor terms return sauces and mixers; spirits come from a liquor store.',
  'p_cleanup_bin': 'a bottle bin: "recycling bin" matched nothing (Old Town, 11/24/2026); a hardware-store item.',
  'p_decor_backdrop': 'party decor (a backdrop) from a party store or rental.',
  'p_decor_covers': 'table covers: "plastic table cover" and "table cover" matched nothing (Old Town, 11/24/2026); a party-store item.',
  'p_decor_props': 'party props from a party store.',
  'p_tableware_utensils': 'serving spoons: "serving spoons" returned a protein powder and "serving spoon" nothing (Old Town, 11/24/2026); a housewares item.',
  'p_cleanup_bins': 'trash bins: "trash can" and "waste basket" matched nothing (Old Town, 11/24/2026); a hardware-store item.',
  'p_memory_display_easel': 'an easel from a craft or office store.',
  'p_serveware_platters': 'platters: "serving platter" and "serving tray" matched nothing (Old Town, 11/24/2026); a housewares item.',
  'p_signin_clipboard': 'a clipboard: no match (Old Town, 11/23/2026).',
  'p_sash_banner': 'a banner from a party store.',
  'p_sash_decor': 'party decor from a party store.',
  'p_dessert_cobbler': 'peach cobbler: "peach cobbler" and "cobbler" returned a yogurt cup (Old Town, 11/24/2026); a bakery order or home-made.',
  'p_grown_folks_liquor': 'spirits: probed 11/23/2026 at Harris Teeter Old Town Alexandria VA and McHenry Row Baltimore MD, liquor terms return sauces and mixers; spirits come from a liquor store.',
  'p_foil_pans_spoons': 'serving spoons: "serving spoons" returned a protein powder and "serving spoon" nothing (Old Town, 11/24/2026); a housewares item.',
  'p_extinguisher_gloves': 'heat-resistant gloves are a hardware or grill-shop item: no match (Old Town, 11/23/2026).',
  'p_cleanup_jug': 'a used-oil jug: an empty container the host keeps, or an auto-parts store item.',
  'p_grown_liquor': 'spirits: probed 11/23/2026 at Harris Teeter Old Town Alexandria VA and McHenry Row Baltimore MD, liquor terms return sauces and mixers; spirits come from a liquor store.',
  'p_heat_citronella': 'citronella candles: "citronella candle" and "citronella" matched nothing (Old Town, 11/24/2026); a hardware or garden-store item.',
  'p_heat_fans': 'box fans from a hardware or home store.',
  'p_tools_knives': 'crab knives from a seafood supplier or rental.',
  'p_cleanup_bucket': 'a shell bucket: "bucket" returned a floor cleaner and "plastic bucket" nothing (Old Town, 11/24/2026); a hardware-store item.',
  'p_tableware_buckets': 'a shell bucket: "bucket" returned a floor cleaner and "plastic bucket" nothing (Old Town, 11/24/2026); a hardware-store item.',
  'p_batch_spirits': 'spirits: probed 11/23/2026 at Harris Teeter Old Town Alexandria VA and McHenry Row Baltimore MD, liquor terms return sauces and mixers; spirits come from a liquor store.',
  'p_horchata_tamarindo': 'tamarindo drink mix is a Latin-grocer item, like the morro-seed horchata.',
  'p_veganwat_shiro': 'shiro (chickpea flour): "chickpea flour" and "garbanzo bean flour" matched nothing (Old Town, 11/24/2026); an Ethiopian or Indian grocer item.',
  'p_frankincense_charcoal': 'a charcoal disc or censer from a specialty shop.',
  'p_beverages_aguas': 'aguas frescas: "agua fresca" returned a spiked malt beverage (Old Town, 11/24/2026); made from fruit, or bought at a Latin grocer.',
  'p_florals_ceremony': 'a florist\'s work (ceremony flowers).',
  'p_florals_bouquet': 'a florist\'s work (a bouquet).',
  'p_florals_accents': 'a florist\'s work (court accents).',
  'p_decor_arch': 'event decor (an arch) from a rental or party supplier.',
  'p_decor_linens': 'event linens come from a rental company.',
  'p_decor_signage': 'printed signage.',
  'p_doll_crown_tiara': 'a quinceañera tiara from a specialty shop.',
  'p_doll_crown_scepter': 'a quinceañera scepter from a specialty shop.',
  'p_doll_crown_heels': 'the heels for the shoe ceremony, from a shoe store.',
  'p_doll_crown_glasses': 'engraved toast glasses from a specialty shop.',
  'p_doll_crown_candles': 'ceremony candles or roses from a specialty shop or florist.',
  'p_cleanup_boxes': 'gift boxes: "storage boxes" returned food containers (Old Town, 11/24/2026); a craft or office store item.',
  'p_serving_utensils': 'serving utensils: "serving spoons" returned a protein powder and "serving spoon" nothing (Old Town, 11/24/2026); a housewares item.',
  'p_table_linens': 'table linens: "tablecloth" returned dishcloths and "table cover" nothing (Old Town, 11/24/2026); a party-store or rental item.',
  'p_table_photo': 'a framed photo display the family makes.',
  'p_mains_oxtail': 'oxtail: no match (Old Town, 11/24/2026); a butcher order.',
  'p_namecards_agenda': 'agendas printed at home or a print shop.',
  'p_cleanup_shredding': 'a document-shredding service, not a shelf item.',
  'p_badges_lanyards': 'conference lanyards, ordered with the badges from a printer.',
  'p_signage_wayfinding': 'a printed sign package.',
  'p_placecards_tablenumbers': 'printed table numbers.',
  'p_signage_auction': 'a printed sign package.',
  'p_checkout_kit_printer': 'a receipt printer from an office or electronics store.',
  'p_checkout_kit_cashbox': 'a cash box from an office supply store.',
  'p_checkout_kit_power': 'power strips and cords from a hardware store.',
  'p_treats_nonfood_teal': 'a teal pumpkin pail from a party store.',
  'p_led_candles_flameless': 'LED candles: none matched, and "candles" returns wax candles, the thing this line replaces (Old Town, 11/23/2026).',
  'p_cashboxes_float': 'a bank float: small bills and coin from the bank.',
  'p_signage_banner': 'a printed banner.',
});

/**
 * ── THE VEGETARIAN MAIN'S DISHES (owner, 11/24/2026) ─────────────────────────
 *
 * The engine builds `diet-veg` (and, for a two-dish plate, `diet-veg_side`)
 * from each playbook's `vegMain`, with a guest count in the text ("Stuffed
 * peppers (for 2 guests)"), so neither an exact-text key nor an id-wide term
 * fits. Keyed by the dish, the text before " (for N guests)". Probed live at
 * Harris Teeter Old Town Alexandria (locationId 09700398) on 11/24/2026, no
 * line ids sent, nothing recorded; the comment is the first product returned.
 */
export const VEG_DISH_TERMS = Object.freeze({
  'Stuffed peppers': 'stuffed peppers', // Stouffer's Stuffed Bell Peppers Frozen Meal $4.39 · 10 oz
  'Grilled veg platter': 'vegetable tray', // Fresh Vegetable Party Tray $20 · 42 oz
  'Grilled portobello caps': 'portobello mushrooms', // Sliced Portobello Mushrooms $3.49 · 6 oz
  'Grilled portobello burgers': 'portobello mushrooms', // same
  'Portobello burgers': 'portobello mushrooms', // same
  'Veggie skewers (zucchini, squash)': 'zucchini', // Zucchini $2.49 · 1 lb ("veggie skewers" matched nothing)
  'Grilled veggie skewers (zucchini, squash)': 'zucchini', // same
  'Fried green tomatoes': 'green tomatoes', // Fresh Green Tomato $3.99 · 1 lb
  'Hush puppies plate': 'hush puppies', // Savannah Classics Original Fresh Onion Hushpuppy $3.99 · 16 oz ("hush puppy mix" matched nothing)
  'Smothered mushroom & bean main': 'mushrooms', // Harris Teeter Sliced White Mushrooms $2.49 · 8 oz
  'Cornbread': 'cornbread mix', // Corn Muffin Mix $1.19 · 8.5 oz
  'Grilled corn, veggie and Old Bay potato skewers': 'corn on the cob', // Harris Teeter Sweet Corn On The Cob $4.99 · 4 ct
  'Baked mac & cheese': 'elbow macaroni', // Harris Teeter Elbow Macaroni $1.99 · 16 oz
  'Greens & candied yam plate': 'collard greens', // Jumbo Collard Greens Bunch $2.99
  'Jollof rice': 'long grain rice', // Harris Teeter Long Grain White Rice $1.79 · 32 oz
  'Black-eyed pea & collard stew': 'black eyed peas', // Harris Teeter Black Eyed Peas $1.39 · 16 fl oz
  'Cheese pizza slices': 'frozen cheese pizza', // DiGiorno Four Cheese Pizza $8.99 · 24.6 oz ("cheese pizza" returned shredded cheese)
  'A fruit-and-veggie tray at the stand': 'fruit tray', // Fresh Fruit Party Tray $21 · 73 oz
  'Mushroom & lentil wellington': 'mushrooms', // see above
  'Wild mushroom and root vegetable wellington': 'mushrooms',
  'Wild mushroom & spinach wellington': 'mushrooms',
  'Butternut squash & sage stuffed shells': 'jumbo pasta shells', // Barilla Jumbo Pasta Shells $3.29 · 12 oz
  'Roasted vegetable & goat cheese tart': 'goat cheese', // Private Selection Crumbled Goat Cheese $5.99 · 4 oz
  'Stuffed mushroom & spinach phyllo bites': 'phyllo dough', // Athens Phyllo Dough $6.69 · 16 oz
  'Stuffed acorn squash with wild rice': 'acorn squash', // Green Acorn Squash $1.99 · 1 lb
  'A big roasted-vegetable and wild rice dish that stands on its own as a main': 'wild rice', // Lundberg Wild Blend Rice $7.49 · 16 oz
  'Mushroom-and-gruyere puff pastry bites': 'puff pastry', // Jus-Rol Puff Pastry $4.99 · 13.2 oz
  'Stuffed jack-o-lantern bell peppers': 'bell peppers', // Fresh Red Bell Pepper $1.79
  'Wild mushroom risotto': 'risotto', // HT Traders Four Cheese Risotto $6.39 · 1 lb
  'Loaded boiled potatoes, corn & mushroom platter': 'red potatoes', // Harris Teeter Baby Red Potatoes $5.49 · 3 lb
  'Corn, potato & mushroom boil platter': 'red potatoes', // same
});
const VEG_IDS = new Set(['diet-veg', 'diet-veg_side']);
const vegDishOf = (item) => String(item || '').replace(/\s*\(for \d+ guests?\)\s*$/, '').trim();

const key = (id, item) => `${String(id || '').trim()}\u0000${String(item || '').trim()}`;
const ALLOWED = new Map(ALLOW.map((a) => [key(a.id, a.item), a]));
// Terms from BOTH lists. Only `ALLOWED` gates multiplication, so a line can
// gain a searchable term without ever gaining a total.
const TERMS = new Map([...ALLOW, ...SEARCH_ONLY].map((a) => [key(a.id, a.item), a.term]));
const TERMS_BY_ID = new Map(TERM_BY_ID.map((a) => [a.id, a.term]));

/** Why this line has no store term, or null when it is meant to have one. */
export function noStoreTermReason(line) {
  if (!line) return null;
  if (VEG_IDS.has(String(line.id || '').trim()) && VEG_DISH_TERMS[vegDishOf(line.item)]) return null;
  return NO_STORE_TERM[key(line.id, line.item)] || NO_STORE_TERM[String(line.id || '').trim()] || null;
}

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
 * Exact (id, item text) first, then the line id alone (TERM_BY_ID). Returns
 * null for a line on neither, and a caller that gets null sends the item text
 * unchanged. The backend falls back the same way.
 */
export function storeSearchTerm(line) {
  if (!line) return null;
  if (VEG_IDS.has(String(line.id || '').trim())) return VEG_DISH_TERMS[vegDishOf(line.item)] || null;
  const exact = TERMS.get(key(line.id, line.item));
  if (exact) return exact;
  // One line of an id can be excluded by its text (the Board Meeting's
  // "Catering cleanup + secure shredding" under p_cleanup's trash bags).
  if (NO_STORE_TERM[key(line.id, line.item)]) return null;
  return TERMS_BY_ID.get(String(line.id || '').trim()) || null;
}

/** How many exact-text entries carry a curated term (multipliable ones included). */
export const SEARCH_TERM_LINES = TERMS.size;
/** How many line ids carry a term for every line under them. */
export const SEARCH_TERM_IDS = TERMS_BY_ID.size;

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

// ── A STORE THAT SELLS NO ALCOHOL STILL ANSWERS A SEARCH FOR WINE ──────────
// Probed live 2026-11-24 at a Baltimore store, where Maryland keeps most chain
// grocers from selling beer and wine: "white wine" came back as White Cooking
// Wine, "beer" as Ginger Beer, "sparkling wine" as a Social Tonic. The same
// terms at a DC store of the same chain find real wine and beer.
//
// So a line that SEARCHES for alcohol also refuses these words. Keyed on the
// search term, not the line text: the mixers, N/A beer and N/A bubbly lines
// search other terms and are untouched. A word check catches the ways seen so
// far; a check on the store's own category is the later fix (owner, 11/24/2026).
export const ALCOHOL_SEARCH_TERMS = Object.freeze(['beer', 'red wine', 'white wine', 'sparkling wine', 'hard seltzer']);
const NOT_ALCOHOL = Object.freeze([
  'cooking', 'non-alcoholic', 'non alcoholic', 'alcohol-free', 'alcohol free',
  'dealcoholized', 'zero proof', 'zero-proof', 'mocktail', 'ginger beer', 'root beer', 'tonic',
]);

/** Does this line ask the store for alcohol? */
export function isAlcoholLine(line) {
  const t = storeSearchTerm(line);
  return !!t && ALCOHOL_SEARCH_TERMS.includes(t);
}

const FORM_WORD_RE = new Map();
const formWord = (w) => {
  if (!FORM_WORD_RE.has(w)) FORM_WORD_RE.set(w, new RegExp(`(^|[^a-z])${w.replace(/[-]/g, '[- ]?')}s?($|[^a-z])`));
  return FORM_WORD_RE.get(w);
};

export function matchLooksLikeTheLine({ line, term, description } = {}) {
  const d = String(description || '').toLowerCase();
  if (!d) return true;                       // nothing to judge; the units still gate
  const asked = `${String((line && line.item) || '')} ${String(term || '')}`.toLowerCase();
  const words = ALCOHOL_SEARCH_TERMS.includes(String(term || '').toLowerCase())
    ? [...NOT_THE_COMMODITY, ...NOT_ALCOHOL]
    : NOT_THE_COMMODITY;
  for (const w of words) {
    // Only a word the PRODUCT has and the LINE does not. "Old Bay seasoning"
    // asks for a seasoning and must still match one.
    //
    // A WHOLE WORD, or its plural (owner-approved 11/24/2026). Read as a
    // fragment, "Scrubber" was a rub and "Master of Mixes" a mix, and the right
    // sponges and simple syrup lost their store price at all three probed
    // stores. The line side stays a fragment on purpose: "cocktail mixer"
    // asking still covers a "Margarita Mix".
    if (formWord(w).test(d) && !asked.includes(w)) return false;
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

/**
 * ── THE CORPUS-WIDE HARVEST, 2026-09-25 ────────────────────────────────────
 *
 * Every priced line in the corpus was sent to a live store on one morning, to
 * answer the question this file's allowlist could only answer twelve lines at
 * a time: how far does a curated term actually carry, across all of it.
 *
 *     lines probed              321
 *     matched                    76  (24%)
 *       with a curated term      43 of 45   (96%)
 *       without one              33 of 276  (12%)
 *
 *     soldBy on matches         66 UNIT / 10 WEIGHT
 *     matches carrying a size   76  (100%)
 *
 * TWO FINDINGS, AND THEY PULL IN OPPOSITE DIRECTIONS.
 *
 * The first is the case FOR curating: a term moves the match rate eight-fold,
 * 12% -> 96%. That is the strongest evidence this file has for its own
 * existence, and it is the reason de-stacking a bundled line is worth doing —
 * not because splitting prices anything by itself, but because a split line
 * can finally be given a term.
 *
 * The second is the case for NOT trusting the other 12%. Roughly one match in
 * eight was wrong, and every wrong one shares a shape — a bundled or vague
 * line, the same population the de-stacking census flags:
 *
 *     "Wine"                  -> Innovine(TM) Wine POURER AND STOPPER  $12.99
 *     "Beer, soda & water"    -> Hiyo Peach Mango organic tonic        $13.99
 *     "Baked beans ingredients" -> a bag of millet
 *
 * A pourer is not wine. These are the same failure as the injera/shoe-insert
 * match recorded above, and the same mitigation applies: the store layer shows
 * WHAT it priced, and `lineIsMultipliable` refuses to let any of them become a
 * line total.
 *
 * NAMED SAMPLES, so a reader can check the shape rather than take the rate:
 *
 *     Bread / rolls        Nature's Own Honey Wheat        20 oz     UNIT   $4.59
 *     Ice                  Reddy Ice Premium Packaged      7 lb      UNIT   $2.99
 *     Buns / bread         HT 3.75" White Hamburger Buns   8 ct/11oz UNIT   $2.49
 *     Chips                Frito-Lay Classic Mix Variety   18 pk     UNIT  $13.69
 *     Salad                Fresh Express Chopped Caesar    10.4 oz   UNIT   $5.49
 *     Cake or cupcakes     Fresh Foods Iced Yellow Cake    12 ct     UNIT  $10.99
 *     Sheet cake/cupcakes  HT Fresh Foods Market           1 ct      UNIT  $31.99
 *     Chicken wings        Whole Fresh Chicken Wings       3.25 lb   UNIT  $10.00
 *     Salsa                HT Thick & Chunky Mild          16 oz     UNIT   $2.69
 *     Soft drinks          Liquid Death Doctor Death Soda  6 ct      UNIT   $9.39
 *     Whole chicken        Harris Teeter Whole Chicken     1 lb      WEIGHT $1.99
 *     Potato salad         HT Fresh Foods Original         16 oz     UNIT   $5.99
 *
 * ── WHAT THIS IS NOT ───────────────────────────────────────────────────────
 *
 * ONE Harris Teeter, ONE metro, ONE morning. Pack sizes are regional and
 * prices are not even weekly — two of the rows above carry a promo price under
 * the shelf price. So this is an OBSERVATION with a store and a date on it,
 * never a universal fact, and nothing here is wired into a price. It is
 * recorded so the next session inherits the measurement instead of re-running
 * the morning.
 *
 * AND IT CANNOT BE EXTENDED TO COSTCO BY THIS ROUTE. Costco is not a Kroger
 * banner and exposes no public product API, so warehouse pack sizes are not
 * reachable from the probe that produced everything above. Costco currently
 * exists in this app as a 0.85 multiplier and as researched per-pound bands —
 * a different evidence tier, and it must stay separately labelled rather than
 * blended with probed numbers.
 *
 * PROVENANCE OF THIS BLOCK: the raw 321-row result was printed once, truncated
 * in the terminal, and never written to a file; the figures and samples above
 * were recovered from the session transcript on 2026-09-26. The aggregate
 * counts and the twelve named rows are first-hand. The "roughly 12% wrong"
 * figure is the probing session's own characterization, carried forward with
 * its three named examples and not independently recounted here.
 */
