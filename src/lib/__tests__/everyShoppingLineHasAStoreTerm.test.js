// ─── EVERY SHOPPING LINE HAS A STORE SEARCH TERM, OR A REASON IT CANNOT ──────
//
// Owner, 11/23/2026, Thanksgiving at a Harris Teeter: "9 of 12 found". The
// store lookup (lib/storePrices → POST /api/shopping/kroger/search-list) sends
// each line's curated term from knowledge/storeUnitMap, else the line's whole
// sentence, and the backend takes Kroger's first product for it. Probed live at
// Harris Teeter The Yards (DC) the same day: every Thanksgiving line WITH a term
// matched; every line without one missed except "Dinner rolls & butter". The
// turkey line had a term in Friendsgiving's wording ("or a breast") and none in
// Thanksgiving's ("or breast"): an exact-text key, one word of drift.
//
// WHAT THE SHELL SENDS (HostShellV2, the store picker): `foodPlan.list`, minus
// skipped lines and dishes someone else brings, as `{ name: it.item, id }`.
// `playbookFoodPlan` builds that list from a playbook's food and beverage
// purchases (gated by the host's picks and the region) plus its essential
// supplies, cleanup and logistics lines. So the census walks every playbook at
// its default picks and at each single pick of each decision, and adds the
// region-gated food lines (Juneteenth's DC half-smokes) the default misses.
// Host-added dishes are the host's own words and are not ours to curate.
import { playbookFoodPlan, ALL_PLAYBOOKS } from '../playbooks';
import { storeSearchTerm, noStoreTermReason, NO_STORE_TERM, TERM_BY_ID } from '../knowledge/storeUnitMap';

const corpusLines = () => {
  const seen = new Map();
  const add = (type, l) => {
    if (!l || !l.id || !l.item || l.added) return;
    const k = `${l.id}\u0000${String(l.item).trim()}`;
    if (!seen.has(k)) seen.set(k, { id: l.id, item: String(l.item).trim(), types: new Set() });
    seen.get(k).types.add(type);
  };
  for (const pb of ALL_PLAYBOOKS) {
    const base = { id: 'x', type: pb.type, date: '2026-11-26', guestMode: 'count', guestCount: 20, guests: [], dietCounts: { Vegetarian: 2 } };
    const plans = [playbookFoodPlan(base)];
    for (const d of (pb.decisions || [])) {
      for (const o of (d.options || [])) {
        const pick = typeof o === 'string' ? o : (o && (o.label || o.value));
        if (pick) plans.push(playbookFoodPlan({ ...base, foodChoices: { [d.id]: pick } }));
      }
    }
    for (const fp of plans) for (const l of ((fp && fp.list) || [])) add(pb.type, l);
    for (const p of (pb.purchases || [])) if (p && (p.category === 'food' || p.category === 'beverage')) add(pb.type, p);
  }
  return [...seen.values()];
};
const LINES = corpusLines();

test('(premise) the census reaches the corpus, the vegetarian main and the region-gated lines', () => {
  expect(LINES.length).toBeGreaterThan(500);
  expect(LINES.some((l) => l.id === 'p_turkey' && l.types.has('Thanksgiving Hosting'))).toBe(true);
  expect(LINES.some((l) => l.id === 'p_halfsmokes')).toBe(true);
  expect(LINES.some((l) => l.id === 'diet-veg')).toBe(true);
});

test('EVERY line the store lookup sends has a curated term, or a written reason it has none', () => {
  // Fails with the worklist: each line by playbook, id and text.
  const missing = LINES
    .filter((l) => !storeSearchTerm(l) && !noStoreTermReason(l))
    .map((l) => `${[...l.types].join(', ')} · ${l.id} · ${l.item}`);
  expect(missing).toEqual([]);
});

test('a line is never both: an exclusion means no term, and the reason is a sentence', () => {
  const both = LINES.filter((l) => storeSearchTerm(l) && noStoreTermReason(l)).map((l) => `${l.id} · ${l.item}`);
  expect(both).toEqual([]);
  for (const [k, why] of Object.entries(NO_STORE_TERM)) expect(`${k}: ${why}`).toMatch(/: .{12,}/);
});

test('no stale entry: every exclusion and every id-wide term names a line that exists', () => {
  const ids = new Set(LINES.map((l) => l.id));
  const keys = new Set(LINES.map((l) => `${l.id}\u0000${l.item}`));
  expect(Object.keys(NO_STORE_TERM).filter((k) => !(k.includes('\u0000') ? keys.has(k) : ids.has(k)))).toEqual([]);
  expect(TERM_BY_ID.map((e) => e.id).filter((id) => !ids.has(id))).toEqual([]);
});

// ── A TERM KEYED BY ID MUST STILL FIT THE LINE ────────────────────────────────
// An id-wide term reaches every line under that id, including one added later
// to another playbook under a reused id. So every term must name something its
// line says: a word of the term starts, or is started by, a word of the item
// ("frozen whole turkey" / "Turkey (whole bird…)"). Two lines are waived, each
// because the line names its product without the word.
const WAIVED = {
  'p_wine\u0000A bottle brought for the table (corkage confirmed first)': 'the id and "corkage" make it wine; the line never says the word',
  'p_nonalc\u0000Zero-proof drinks for the reception and the tables': 'names no product; sparkling water is the plainest zero-proof drink',
};
const words = (s) => (String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z]+/g) || [])
  .filter((w) => w.length >= 3).map((w) => w.replace(/s$/, ''));
test('every term names something its line says (the guard on an id-wide term)', () => {
  const off = LINES.filter((l) => {
    const t = storeSearchTerm(l);
    if (!t || WAIVED[`${l.id}\u0000${l.item}`]) return false;
    const tw = words(t); const iw = words(l.item);
    return !tw.some((a) => iw.some((b) => a.startsWith(b) || b.startsWith(a)));
  }).map((l) => `${l.id} · ${l.item} → "${storeSearchTerm(l)}"`);
  expect(off).toEqual([]);
});

describe('rewording a line keeps its term (the drift that cost the turkey)', () => {
  test('Thanksgiving Hosting\'s turkey, in its own words, searches for a whole turkey', () => {
    expect(storeSearchTerm({ id: 'p_turkey', item: 'Turkey (whole bird, or breast for a small table)' })).toBe('frozen whole turkey');
    expect(storeSearchTerm({ id: 'p_turkey', item: 'Turkey (whole bird, or a breast for a small table)' })).toBe('frozen whole turkey');
  });

  test('a Thanksgiving or Friendsgiving line whose id carries a term keeps one through an edit to its text', () => {
    // Kept, not necessarily identical: "Corn (frozen or canned kernels…)" has its
    // own exact term (frozen corn) over the id's corn on the cob, and a reworded
    // line falls back to the id's. Ids with no id-wide term (p_potatoes, shared
    // with "Small red potatoes") lose it, and the census above names the line.
    const tg = LINES.filter((l) => l.types.has('Thanksgiving Hosting') || l.types.has('Friendsgiving'));
    const lost = tg.filter((l) => storeSearchTerm(l) && TERM_BY_ID.some((e) => e.id === l.id)
      && !storeSearchTerm({ id: l.id, item: `${l.item} (reworded)` })).map((l) => l.id);
    expect(lost).toEqual([]);
    expect(tg.filter((l) => storeSearchTerm(l) && TERM_BY_ID.some((e) => e.id === l.id)).length).toBeGreaterThan(40);
  });

  test('an id reused for different products keys on the text, so it can never take a neighbor\'s term', () => {
    // p_drinks is sparkling water at Friendsgiving and beer at The Cookout's
    // Get-Together: no id-wide term, so a reworded p_drinks line has none and
    // the census above fails on it instead of searching for the wrong drink.
    expect(TERM_BY_ID.some((e) => e.id === 'p_drinks')).toBe(false);
    expect(storeSearchTerm({ id: 'p_drinks', item: 'Beer, soda & water' })).toBe('beer');
    expect(storeSearchTerm({ id: 'p_drinks', item: 'Sparkling water (the host\'s alcohol-free share)' })).toBe('sparkling water');
    expect(storeSearchTerm({ id: 'p_drinks', item: 'Something new' })).toBe(null);
  });
});

// ─── NO SHOPPING LINE COMBINES ITEMS (owner ruling 11/23/2026, batch 4) ─────
//
// #240 split Thanksgiving's and Friendsgiving's combined lines ("Rolls &
// butter") so each product has its own store term. The other playbooks kept
// lines like "Plates, cups, napkins, cutlery" that search the store for the
// plates alone. A line combines items when its NAME (the text outside any
// parentheses, before a "for …" purpose) joins products with "&", "+", "and",
// ";" or a comma list. "A, B or C" is a choice, one purchase, not a list; a
// "/" is an alternative. Examples in parentheses are examples, not the line.
const SINGLE_PRODUCT_PHRASES = [
  /\bmac(?:aroni)? (?:&|and) cheese\b/gi,         // one dish
  /\bhalf and half\b/gi,                           // one dairy product
  /\btrash (?:\+|and) recycling bags\b/gi,         // one class of bag (storeUnitMap: "trash and recycling bags are one class")
  /\bburger \+ hot dog buns\b/gi,                  // one class of bun (storeUnitMap: "burger AND hot dog buns are one class")
  /\brice and peas\b/gi,                           // one Caribbean dish
];
const lineName = (item) => {
  let s = String(item || '').replace(/\([^)]*\)/g, ' ');
  for (const re of SINGLE_PRODUCT_PHRASES) s = s.replace(re, 'one');
  return s.split(/\s+for\s+/i)[0].replace(/\s+/g, ' ').trim();
};
const combinesItems = (item) => {
  const n = lineName(item);
  if (/\s&\s|\+|\band\b|;/i.test(n)) return true;
  if (n.includes(',')) return !/,?\s+or\s+[^,]+$/i.test(n);
  return false;
};

// Lines that read as combined and are not split, each with its reason.
const SPARKLING = 'owner ruling 11/23/2026: leave the sparkling line as is (do not split or change "sparkling" drinks)';
const NOT_SPLIT = {
  'p_apps_hot\u0000Meatballs & sliders (bacon-wrapped, spanakopita)': 'OWNER CALL: aPoundPriceNeedsAPoundLineEverywhere asserts the key protein reads "Meatballs & sliders"; splitting it changes that assertion',
  'p_greencoffee\u0000Green coffee beans — Ethiopian, unroasted (roasted live at the ceremony)': 'one product; the commas describe the beans',
  'p_flutes\u0000Flutes (glass or good plastic), counted to the headcount plus spares': 'one product; the comma introduces how many',
  'p_roast_veg\u0000Roasted vegetables in oil, no butter (Brussels sprouts or squash: the real vegan dish)': 'one dish; the comma says how it is cooked',
  'p_libation\u0000Libation + unity-cup pour (juice, cider, or wine)': 'one drink poured twice: the libation and the unity cup are the same bottle',
  'p_kids_drinks\u0000Juice and kids\' drinks (the non-alcoholic spread)': 'one product: the kids\' drinks are the juice boxes',
  // Held whole because an existing assertion names their current shape (batch 4
  // rule: an assertion that would have to change is reported, not changed).
  'p_cornbread\u0000Cornmeal and buttermilk for cornbread (or biscuit mix)': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Sunday Dinner)',
  'p_dessert\u0000Peach cobbler, sweet potato pie & pound cake (or banana pudding)': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Sunday Dinner)',
  'p_mac\u0000Elbow macaroni and block cheeses (sharp cheddar, plus a melting cheese)': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Sunday Dinner)',
  'p_chips\u0000Chips + dips (queso, guac, salsa, French onion)': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Watch Party)',
  'p_dessert\u0000Brownies, cookies & snack mix': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Watch Party)',
  'p_drinks\u0000Beer + soda + water': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Watch Party)',
  'p_apps\u0000Cheese & charcuterie (dips, easy bites)': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Retirement Party)',
  'p_buffet_protein\u0000Carved meats & chicken (plus a vegetarian main)': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Retirement Party)',
  'p_sides\u0000Salads & potatoes (rolls, a hot veg)': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Retirement Party)',
  'p_sides\u0000Salads, beans, corn & chips': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Get-Together)',
  'p_chips\u0000Chips, pretzels, party mix + dips/salsa': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Card Party)',
  'p_wings\u0000Wings + meatballs (the warm proteins)': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Card Party)',
  'p_dessert\u0000Banana pudding, pound cake & peach cobbler (red velvet)': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (The Cookout)',
  'p_sides\u0000Rice & peas, candied yams & mac & cheese (cornbread, plantains)': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Kwanzaa Gathering)',
  'p_dips\u0000Dips (hummus, guac, queso, ranch) — at the station, not the table': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Game Night)',
  'p_apps\u0000Cheese & charcuterie spread (crudite, sliders, skewers, dips)': 'OWNER CALL: aPickMovesItsOwnLines A3/A4 lists exactly the ids friends bring; a split part goes with its dish, so the list would gain the parts (as #240 added p_drinks_cider) (Vow Renewal)',
  'p_drinks\u0000Beer, sweet tea, soda, water': 'OWNER CALL: aDryPartyBuysNoBar expects the non-dry soda and tea to stay by id under the dry pick, which buys its own p_tea_dry/p_soda_dry/p_water_dry lines (Low Country Boil)',
  'p_drinks\u0000Beer, soda & water': 'OWNER CALL: theUnitMap pins the count of exact-text store-term entries (UNIT_MAPPED_LINES + 87); with this line split the count moves (Get-Together\'s old text is also the id-reuse test\'s input; Fish Fry\'s sweet tea and coleslaw would read the same as Repast\'s and Crab Feast\'s) (Get-Together)',
  'p_drinks\u0000Sweet tea, red drink, soda, water': 'OWNER CALL: theUnitMap pins the count of exact-text store-term entries (UNIT_MAPPED_LINES + 87); with this line split the count moves (Get-Together\'s old text is also the id-reuse test\'s input; Fish Fry\'s sweet tea and coleslaw would read the same as Repast\'s and Crab Feast\'s) (Fish Fry)',
  // Same text, same store-term entry as a line held above: split them together.
  'p_protein\u0000Burgers, hot dogs & chicken': 'OWNER CALL: Reunion\'s line is held (aPickMovesItsOwnLines A3/A4), and Get-Together\'s shares its text and its exact store-term entry (Reunion, Get-Together)',
  'p_sides\u0000Garden salad & roasted vegetables': 'OWNER CALL: Vow Renewal\'s line is held (aPickMovesItsOwnLines A3/A4), and Anniversary\'s shares its text and its exact store-term entry (Vow Renewal, Anniversary)',
  // Held whole because an e2e assertion counts or marks these lines (batch 4).
  'p_wine_cider\u0000Wine, red and white (a bottle of each per table end)': 'OWNER CALL: #240 kept it whole, and the e2e everyFoodDoorAsksTheRule marks Thanksgiving\'s bought lines by id (its BOUGHT fixture); a white-wine part would be left unbought (Thanksgiving Hosting)',
  'p_softdrinks\u0000Soft drinks, juice, water': 'OWNER CALL: the e2e noKitchenNoShoppingList and oneTapForAShelf assert Birthday\'s "Drinks 0 of 3 bought" / "all 3 bought"; the parts would make it 5 (Birthday)',
  'p_butter\u0000Butter (for melting) + dipping dishes': 'OWNER CALL: the e2e dietaryHoldsTwo opens the sample Crab Feast\'s Food group by "0 of 7 bought"; the parts would make it more (Crab Feast)',
  'p_sides\u0000Coleslaw, potato salad, hush puppies': 'OWNER CALL: the e2e dietaryHoldsTwo opens the sample Crab Feast\'s Food group by "0 of 7 bought"; the parts would make it more (Crab Feast)',
  'p_burgers_dogs\u0000Burgers, hot dogs + links (sausage)': 'OWNER CALL: the e2e threeLayersOfPrice asserts The Cookout\'s store hero reads "2 of 18 lines priced at your store"; any Cookout part moves the 18 (The Cookout)',
  'p_condiments\u0000Condiments, BBQ sauce, hot sauce, cheese, lettuce, onion, pickles': 'OWNER CALL: the e2e threeLayersOfPrice asserts The Cookout\'s store hero reads "2 of 18 lines priced at your store"; any Cookout part moves the 18 (The Cookout)',
  'p_seasoning\u0000Dry rub / seasoning + marinade': 'OWNER CALL: the e2e threeLayersOfPrice asserts The Cookout\'s store hero reads "2 of 18 lines priced at your store"; any Cookout part moves the 18 (The Cookout)',
  'p_red_drink\u0000Red drink / Kool-Aid / punch + sugar': 'OWNER CALL: the e2e threeLayersOfPrice asserts The Cookout\'s store hero reads "2 of 18 lines priced at your store"; any Cookout part moves the 18 (The Cookout)',
  'p_soda_water\u0000Soda + bottled water': 'OWNER CALL: the e2e threeLayersOfPrice asserts The Cookout\'s store hero reads "2 of 18 lines priced at your store"; any Cookout part moves the 18 (The Cookout)',
  'p_grown_folks\u0000Grown-folks section: brown liquor + mixers, beer': 'OWNER CALL: the e2e threeLayersOfPrice asserts The Cookout\'s store hero reads "2 of 18 lines priced at your store"; any Cookout part moves the 18 (The Cookout)',
  'p_fuel\u0000Charcoal / wood / propane + lighter fluid': 'OWNER CALL: the e2e threeLayersOfPrice asserts The Cookout\'s store hero reads "2 of 18 lines priced at your store"; any Cookout part moves the 18 (The Cookout)',
  'p_foil_pans\u0000Foil pans + foil + serving spoons': 'OWNER CALL: the e2e threeLayersOfPrice asserts The Cookout\'s store hero reads "2 of 18 lines priced at your store"; any Cookout part moves the 18 (The Cookout)',
  'p_togo\u0000To-go containers + foil + zip bags (everybody makes a plate)': 'OWNER CALL: the e2e threeLayersOfPrice asserts The Cookout\'s store hero reads "2 of 18 lines priced at your store"; any Cookout part moves the 18 (The Cookout)',
  'p_tableware\u0000Disposable plates, cups, napkins, cutlery (sturdy)': 'OWNER CALL: the e2e threeLayersOfPrice asserts The Cookout\'s store hero reads "2 of 18 lines priced at your store"; any Cookout part moves the 18 (The Cookout)',
  'p_cleanup\u0000Trash + recycling bags, gloves, sanitizing wipes': 'OWNER CALL: the e2e threeLayersOfPrice asserts The Cookout\'s store hero reads "2 of 18 lines priced at your store"; any Cookout part moves the 18 (The Cookout)',
  'p_wine\u0000Wine and beer (only if the bar is self-supplied)': 'OWNER CALL: aCashBarAsksWhatTheHostStillCovers lists Gala\'s beverage ids exactly ([p_nonalc, p_wine]); a beer part would join them',
};
const notSplitReason = (l) => {
  if (l.id === 'diet-veg') return 'OWNER CALL: the engine\'s vegetarian main is one plate for the vegetarian guests, priced per serving (theVegetarianMainIsPricedAtItsSources); its dish names are not split here';
  if (/sparkling/i.test(l.item)) return SPARKLING;
  return NOT_SPLIT[`${l.id}\u0000${l.item}`] || null;
};

describe('no shopping line in any playbook combines items', () => {
  test('(premise) the rule reads a list as combined and a choice, an alternative or one dish as one line', () => {
    for (const s of ['Plates, cups, napkins, cutlery', 'Beer + wine', 'Rolls & butter', 'Wine and beer (only if the bar is self-supplied)', 'Trash + recycling bags, paper towels, wipes', 'Cleanup kit — trash/recycling bags, paper towels; broom']) {
      expect([s, combinesItems(s)]).toEqual([s, true]);
    }
    for (const s of ['Mac and cheese (the elbow macaroni)', 'Beef, chicken or salmon (for a seated dinner — plus a veg main)', 'Charcoal / propane', 'Turkey (whole bird, or breast for a small table)', 'Ice for drinks and bar service', 'Trash and recycling bags', 'Half and half or cream for the mash']) {
      expect([s, combinesItems(s)]).toEqual([s, false]);
    }
  });

  test('EVERY line the store lookup sends names one product, or says why it is not split', () => {
    const combined = LINES.filter((l) => combinesItems(l.item) && !notSplitReason(l))
      .map((l) => `${[...l.types].join(', ')} · ${l.id} · ${l.item}`);
    expect(combined).toEqual([]);
  });

  test('no stale waiver: every line kept whole still exists and still reads as combined', () => {
    const keys = new Set(LINES.map((l) => `${l.id}\u0000${l.item}`));
    expect(Object.keys(NOT_SPLIT).filter((k) => !keys.has(k) || !combinesItems(k.split('\u0000')[1]))).toEqual([]);
  });
});

// ── A SPLIT PART SHARES ITS DISH'S PRICE, AND SAYS SO ─────────────────────────
// Splitting a line must not invent a price (owner rule, 11/22/2026). A part
// split from a combined line in batch 4 has no price of its own: it declares
// `pricedWith` its main line, whose authored band (and citation) still covers
// the whole set, so every playbook's total is what it was. The main says what
// its price covers; the part says where its price is. `partOf` rolls the part
// up with its dish (#240): brought, skipped or taken back together.
const plansOf = () => {
  const out = [];
  for (const pb of ALL_PLAYBOOKS) {
    const base = { id: 'x', type: pb.type, date: '2026-11-26', guestMode: 'count', guestCount: 20, guests: [] };
    out.push([pb.type, playbookFoodPlan(base)]);
    for (const d of (pb.decisions || [])) for (const o of (d.options || [])) {
      const pick = typeof o === 'string' ? o : (o && (o.label || o.value));
      if (pick) out.push([pb.type, playbookFoodPlan({ ...base, foodChoices: { [d.id]: pick } })]);
    }
  }
  return out;
};
describe('a part priced with its dish', () => {
  const PLANS = plansOf();
  const parts = PLANS.flatMap(([type, fp]) => ((fp && fp.list) || []).filter((l) => l && l.pricedWith).map((l) => [type, fp, l]));

  test('(premise) the split parts are in the plans', () => {
    expect(parts.length).toBeGreaterThan(300);
  });

  test('carries no price of its own, rolls up with its main line, and both say where the price is', () => {
    const bad = [];
    for (const [type, fp, l] of parts) {
      const main = fp.list.find((m) => m && m.id === l.pricedWith);
      const at = `${type} · ${l.id}`;
      if (!main) { bad.push(`${at}: its main ${l.pricedWith} is not on the list`); continue; }
      if (l.partOf !== l.pricedWith) bad.push(`${at}: partOf ${l.partOf} is not its main`);
      if (Number(l.low) || Number(l.high)) bad.push(`${at}: priced ${l.low}-${l.high}`);
      if (!/^Priced with the /.test(l.priceNote || '')) bad.push(`${at}: priceNote "${l.priceNote}"`);
      if (!(main.priceCovers || []).includes(l.id)) bad.push(`${at}: its main does not list it`);
      if (!/^Price covers the /.test(main.priceNote || '')) bad.push(`${at}: main priceNote "${main.priceNote}"`);
    }
    expect(bad).toEqual([]);
  });

  test('a skipped main takes its parts off the list with it', () => {
    const [type, , l] = parts.find(([t]) => t === 'Birthday');
    const pb = ALL_PLAYBOOKS.find((p) => p.type === type);
    const fp = playbookFoodPlan({ id: 'x', type: pb.type, date: '2026-11-26', guestMode: 'count', guestCount: 20, guests: [], foodSkip: { [l.pricedWith]: true } });
    const part = fp.list.find((x) => x.id === l.id);
    expect(part && part.skipped).toBe(true);
  });
});
