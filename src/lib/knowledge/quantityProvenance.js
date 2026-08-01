// demo/src/lib/knowledge/quantityProvenance.js
//
// Wave-2w GROUNDING — source the ITEM-QUANTITY provenance (how much to buy per guest).
//
// The Grounding re-score (held 5) found the dimension's coverage capped: ~97 shopping-list
// items carry a `provenance` block on an UNSCORED tier ('trade-heuristic' / 'norm' /
// 'consensus' / 'heuristic') stating a per-guest QUANTITY — "~0.5 lb raw protein/guest",
// "6-8 oz entree", "~1 drink/guest/hour", "~1.5 lb ice/guest". Unlike a taste/choreography
// judgment (crab size, dress code — legitimately un-groundable), a per-guest quantity IS a
// researchable planning norm a seasoned caterer quotes from real portion data. This registers
// REAL, dated sources so those quantity claims can be GROUNDED, exactly like the cost axis.
//
// Same discipline as every other axis: researched only with real cited sources, nothing
// invented; a quantity grounds only when its provenance is tier:'researched' AND cites a
// source id that resolves here.

export const QTY_SOURCES = {
  'webstaurant-protein-2026': {
    org: 'WebstaurantStore — How Much Meat to Serve Per Person (protein portion guide)',
    url: 'https://www.webstaurantstore.com/blog/5410/protein-portion-guide.html',
    fetched: '2026-07-16',
    claim: 'US catering protein per person: ~4–6 oz cooked meat for a plated meal, ~6–8 oz for a buffet, ~1 lb for a barbecue (higher for bone-in — pork ribs 8–16 oz, bone-in ham 5–8 oz vs boneless 4–5 oz, crab legs 16–24 oz, T-bone 12–16 oz — because bone/shell is much of the weight). ~0.5 lb of raw protein/guest as one main in a multi-protein spread is consistent with this once cook loss is accounted for.',
  },
  'webstaurant-portions-2026': {
    org: 'WebstaurantStore — Catering Portion Size Guide (sides, salads, total)',
    url: 'https://www.webstaurantstore.com/article/1013/catering-portion-size-guide.html',
    fetched: '2026-07-16',
    claim: 'US catering per person: ~4–6 oz of a starch and ~4–6 oz of vegetables per side; ~1 cup side salad (~2 cups a main salad); a full buffet meal totals ~1–1.25 lb/person across protein, sides, bread, and dessert.',
  },
  'bar-provision-2026': {
    org: 'The Party Source (100-guest planning guide) + Evite / Omnicalculator / Reventals party-drink calculators (consensus)',
    url: 'https://thepartysource.com/blog/how-much-alcohol-for-100-guests',
    fetched: '2026-07-16',
    claim: 'Standard US party drink provisioning: ~1 drink/guest/hour (≈2 in the first hour, ~5–6 drinks/guest over a 4–5h event); a mixed bar skews ~40% beer with beer+wine ~75% of volume; wine ~1 bottle per ~2.5 drinking guests per hour (≈½ bottle per drinker; a 750ml bottle pours ~5 servings); sparkling wine ~1 bottle per 4–5 guests for a mimosa bar; ~2–3 non-alcoholic servings/guest when alcohol is also offered; ice ~1.5 lb/guest (12–15 bags per 100).',
  },
  // PHASE 5F. Registered because `bar-provision-2026` gives ice ~1.5 lb/guest as a
  // GENERAL party figure, and the corpus's outdoor cooks (Cookout, Juneteenth, Crab
  // Feast, Reunion) all author 2 lb/guest with nothing behind them. This is the
  // outdoor case, from a source that publishes one.
  //
  // WHAT IT ACTUALLY SAYS, and the arithmetic, because the prose range and the worked
  // example do not agree: the page states "one to two pounds of ice per person", but
  // its own outdoor-BBQ worked example is 50 guests -> 15 seven-pound bags = 105 lb =
  // 2.1 lb/guest, i.e. ABOVE the stated ceiling. Its indoor example lands at 2.05
  // lb/guest, so the published examples barely distinguish indoor from outdoor even
  // though the prose says they should.
  //
  // NOT DISINTERESTED. A packaged-ice manufacturer profits from a higher figure. That
  // is why this is registered as `trade` and its claim is worded as a ceiling-leaning
  // planning number rather than a measured mean. It corroborates the corpus's authored
  // 2 lb/guest for outdoor events; it does not independently establish it.
  'reddy-ice-2026': {
    org: 'Reddy Ice LLC (packaged-ice manufacturer) - How Much Ice You Need for a Party',
    url: 'https://www.reddyice.com/how-much-ice-you-need-for-a-party/',
    fetched: '2026-08-01',
    claim: 'States 1-2 lb of ice per person. Its own worked OUTDOOR BBQ example is 50 guests = 15 seven-pound bags = 105 lb, i.e. 2.1 lb/guest; the indoor example computes to 2.05 lb/guest. Supports ~2 lb/guest as a ceiling-leaning planning figure for an outdoor event. Vendor-published and commercially interested in a higher number - corroborating, not independent.',
  },
};

// A quantity provenance is GROUNDED only when it is tier:'researched' AND cites >=1 real
// source id that resolves in QTY_SOURCES (mirrors isGroundedCost / isGroundedTiming; an empty,
// synthesized, or sourceless 'researched' provenance is not grounding).
export function isGroundedItemQty(prov) {
  return !!(prov && typeof prov === 'object'
    && prov.tier === 'researched'
    && Array.isArray(prov.sources) && prov.sources.length > 0
    && prov.sources.every((s) => !!QTY_SOURCES[s]));
}

export function qtySourcesFor(prov) {
  if (!prov || !Array.isArray(prov.sources)) return [];
  return prov.sources.map((s) => QTY_SOURCES[s]).filter(Boolean);
}
