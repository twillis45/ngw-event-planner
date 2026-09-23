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
  { id: 'p_ice', item: 'Ice' },
  { id: 'p_ice', item: 'Ice (bar, coolers, punch)' },
  { id: 'p_ice', item: 'Ice (chilling + drinks)' },
  { id: 'p_ice', item: 'Ice (coolers + drinks + red drink)' },
  { id: 'p_ice', item: 'Ice (coolers + drinks)' },
  { id: 'p_ice', item: 'Ice (coolers + drinks, heat-adjusted)' },
  { id: 'p_ice', item: 'Ice (drinks + coolers)' },
  { id: 'p_ice', item: 'Ice (for chilling + drinks)' },
  { id: 'p_ice', item: 'Ice (≈1-1.5 lb/guest)' },
  { id: 'p_ice', item: 'Ice for drinks and bar service' },
  { id: 'p_ice', item: 'Ice for the drink tubs' },

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
  { id: 'p_chicken', item: 'Chicken (legs/thighs/quarters)' },
  { id: 'p_chicken', item: 'BBQ chicken (bone-in pieces)' },
  { id: 'p_chicken', item: 'Whole chicken or cut-up fryer pieces (the main)' },
  { id: 'p_wings', item: 'Chicken wings' },
  { id: 'p_ribs', item: 'Ribs (racks)' },
  { id: 'p_ribs', item: 'Pork ribs (racks)' },
  { id: 'p_turkey', item: 'Turkey (whole bird, or breast for a small table)' },
  { id: 'p_shrimp', item: 'Fresh shrimp (shell-on / head-on)' },
  { id: 'p_shrimp', item: 'Steamed shrimp (Old Bay)' },
  { id: 'p_crawfish', item: 'Live crawfish (by the sack, ~30-35 lb/sack)' },
  { id: 'p_sausage', item: 'Smoked sausage (kielbasa / andouille)' },
  { id: 'p_sausage', item: 'Smoked sausage / andouille' },
  { id: 'p_links', item: 'Smoked sausage / hot links' },
  { id: 'p_chicharron', item: 'Chicharrón (ground pork) for revueltas' },

  // ── Single produce ────────────────────────────────────────────────────────
  // REFUSED: p_mazao "Fresh fruit & vegetables (the mazao / harvest display) —
  // apples, oranges, bananas, gourds, nuts"; p_fruit; p_veg; p_sides_veg —
  // every one of them a basket, and the nuts in the mazao line cost several
  // times what the bananas do.
  { id: 'p_greens', item: 'Collard greens' },
  { id: 'p_greens', item: 'Collard greens (prosperity)' },
  { id: 'p_greens', item: 'Collard or mustard greens' },
  { id: 'p_potatoes', item: 'Small red potatoes' },
  { id: 'p_potatoes', item: 'Small red potatoes (new potatoes)' },
  { id: 'p_yams', item: 'Sweet potatoes for candied yams' },
  { id: 'p_watermelon', item: 'Watermelon (red, symbolic + cooling)' },
  { id: 'p_strawberries', item: 'Strawberries (red garnish / fruit)' },
  { id: 'p_blackeyedpeas', item: 'Black-eyed peas (good fortune)' },

  // ── Single pantry goods ───────────────────────────────────────────────────
  // REFUSED: anything whose item text says "ingredients" — p_potato_salad,
  // p_slaw, p_beans "Baked beans ingredients", p_mac "Baked mac & cheese
  // ingredients", p_stuffing. "Ingredients" is the corpus's own word for a
  // basket, and it is the single most reliable refusal signal in the list.
  // Also refused: p_cornmeal "Cornmeal / fish fry breading + flour" (+ flour),
  // p_butter "Butter (for melting) + dipping dishes" (+ dishes), p_season
  // (seasoning + cayenne + salt), p_cheese "Cheese (3-4 varieties for the
  // board)" — which says plural products in its own text.
  { id: 'p_oil', item: 'Frying oil (peanut or vegetable)' },
  { id: 'p_vinegar', item: 'Apple-cider vinegar (steam liquid + dipping)' },
  { id: 'p_masa', item: 'Masa (instant corn masa harina or fresh masa)' },
  { id: 'p_quesillo', item: 'Quesillo (Salvadoran melting cheese) or mozzarella blend' },
  { id: 'p_oldbay', item: 'Old Bay (or J.O.) seasoning — buy extra' },
  { id: 'p_greencoffee', item: 'Green coffee beans — Ethiopian, unroasted (roasted live at the ceremony)' },
  { id: 'p_beans', item: 'Baked beans / red beans' },
  { id: 'p_beans', item: 'Refried beans (frijoles molidos) for frijol con queso' },

  // ── Single prepared items ────────────────────────────────────────────────
  // Deli products a store sells as one thing by weight.
  // REFUSED: p_mac "Baked mac & cheese ingredients (or pans)" — the "(or pans)"
  // makes the unit itself ambiguous before the contents even matter.
  { id: 'p_potatosalad', item: 'Potato salad' },
  { id: 'p_mac', item: 'Mac & cheese (the side that anchors the table)' },
]);

const key = (id, item) => `${String(id || '').trim()}\u0000${String(item || '').trim()}`;
const ALLOWED = new Set(ALLOW.map((a) => key(a.id, a.item)));

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
export function storeLineTotal({ line, price, size, soldBy } = {}) {
  const p = Number(price);
  if (!(p > 0)) return null;
  const need = lineIsMultipliable(line);
  if (!need) return null;
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

  return { total, packs, byWeight, because, needBase, packBase };
}

const round3 = (n) => Math.round(n * 1000) / 1000;
const trimNum = (n) => {
  const r = Math.round(Number(n) * 100) / 100;
  return String(r);
};
