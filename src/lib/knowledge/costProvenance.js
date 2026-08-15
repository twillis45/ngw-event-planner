// demo/src/lib/knowledge/costProvenance.js
//
// Wave-2i GROUNDING — source the cost-factor provenance.
//
// The Grounding re-score (held 3) found the dimension min-governed by COST: only 1/46
// costFactor decisions (crab_size) carried `tier:'researched'`; the other 45 self-flagged
// "synthesized — needs verification." Its #1 lever: "research the 45 synthesized
// costFactorProvenance to dated market sources — even 10/46 with a costResearched predicate
// mirroring the cultural one would lift the cap off 2%."
//
// This registers REAL, dated market sources (USDA/BLS retail meat prices; 2026 catering
// per-person guides; the DMV crab-house survey crab_size already cites) so a cost factor's
// ratio claim can be GROUNDED. Same discipline as the other axes: researched only with real
// cited sources, nothing invented. Factors reference these ids from their costFactorProvenance.

export const COST_SOURCES = {
  // ── WEDDING FAVORS (registered 2026-08-14) ─────────────────────────────────
  // The first item grounded under the "start grounding" pass, and it did not
  // merely gain a source — it changed the NUMBER. The corpus carried
  // `unitCostRange: [2, 8]`, which matches the editorial band published by
  // wedding-planning guides that name no survey at all. Two named, dated
  // surveys put the real distribution lower, and the corrected range follows
  // the surveys rather than the guidance that agreed with what we already had.
  //
  // Both are reached through the same reporting page, which names each survey
  // and quotes its figures; `url` is the page actually fetched rather than a
  // primary PDF nobody here has opened. Saying which is the difference between
  // a citation and a decoration.
  'zola-favors-2026': {
    org: 'Zola 2026 Registry & Gifting Survey, as reported and quoted by Paperlust, "How Much Do Wedding Favors Cost?" (2026 guide)',
    url: 'https://paperlust.co/blog/how-much-do-wedding-favors-cost/',
    fetched: '2026-08-14',
    claim: 'US wedding favors, 2026: the common spend is $1–5 per guest, with $3 the typical mid-range figure. 56% of couples in Zola\'s 2026 Registry & Gifting Survey kept favors at $5 or less per guest. Tiers as published: budget ≤$1, mid-range $2–3, premium $5+.',
  },
  'theknot-realweddings-2025': {
    org: 'The Knot 2025 Real Weddings Study (couples married 2024; ~17,000 respondents), via theknot.com',
    url: 'https://www.theknot.com/content/average-cost-wedding-favors',
    fetched: '2026-08-14',
    claim: 'Favors AND gifts COMBINED average $460 (this figure includes wedding-party gifts, so the favors-only portion is lower). By guest count: ≤50 guests $301, >100 guests $529. By region: Northeast $473, Mid-Atlantic $591, Midwest $409, South $415, West $419, destination $702. Corroborates the per-guest band from the total side; it does NOT state a per-guest favors figure on its own.',
  },
  'usda-meat-2026': {
    org: 'USDA ERS Meat Price Spreads / U.S. BLS retail food prices',
    url: 'https://www.ers.usda.gov/data-products/meat-price-spreads',
    fetched: '2026-07-16',
    claim: 'US retail, 2026: all-fresh beef ~$9.64/lb (record, +13% YoY); ground beef ~$5.63–6.83/lb; brisket ~$4.50/lb (range $2.50–8); pork chops ~$4.33/lb; chicken is the most affordable meat; premium beef cuts (ribeye ~$14.24/lb, strip ~$13.56/lb) run ~2–3x chicken — so a brisket/steak upgrade over a chicken/ribs base raises protein cost materially.',
  },
  'catering-perperson-2026': {
    org: 'The Catering Finder — Average Catering Cost Per Person 2026 (and corroborating 2026 catering guides)',
    url: 'https://thecateringfinder.com/advice/average-catering-cost-per-person-2026',
    fetched: '2026-07-16',
    claim: '2026 US catering per person: full-service $75–150; buffet with servers $45–85; drop-off buffet $28–50; drop-off $15–35. The food is often identical between drop-off and staffed — the price difference is LABOR — so full-service runs ~2–4x drop-off, and host-cooked/DIY is cheaper still. Add 20–30% for service, gratuity, and tax.',
  },
  // ── PER-CHANNEL PROTEIN PRICING (registered 2026-08-07) ────────────────────
  // These three already back cited claims in backyardBbq, juneteenthCookout and
  // theCookout — but as RAW URLS inside each purchase's provenance, which no
  // registry resolves. `isGroundedCost` and `isGroundedItemQty` both require
  // `sources.every((s) => !!REGISTRY[s])`, so real, dated, corroborated evidence
  // was failing on its FORM.
  //
  // Registering them changes no grounding outcome by itself — the purchases
  // still cite their URLs, and flipping those to ids would move outcomes that
  // `NO TRUST EXPANSION: grounding outcomes are unchanged` deliberately freezes.
  // This is the prerequisite, landed on its own so the governed change can be a
  // single reviewable step rather than a rewrite bundled with a rule change.
  //
  // Each entry names EVERY publisher behind it, following `dmv-crab-2026` — a
  // registry id can itself be the corroborated set, which is what the pricing
  // policy's ">=2 sources" is asking for. Claims are lifted verbatim from the
  // provenance blocks already in the corpus; nothing here is newly asserted.
  'costco-pork-2026': {
    org: 'Red Table Meats (Costco pork rib pricing) + Eat Like No One (Costco pork guide)',
    url: 'https://redtablemeats.com/fresh-meat/pork/how-much-are-pork-ribs-at-costco/',
    corroboratingUrl: 'https://www.eatlikenoone.com/costco-pork-guide.htm',
    fetched: '2026-08-07',
    claim: 'Raw pork ribs cost ~$3–4/lb at Costco, $4–5+/lb at grocery, and more at a butcher or for pre-marinated. Bone-in runs heavy — plan ~half a rack per serious eater; smoke cuts ~30–40% of raw weight.',
  },
  'costco-chicken-2026': {
    org: 'Eat Like No One (Costco chicken prices) + CostcoFDB (Costco chicken price guide)',
    url: 'https://www.eatlikenoone.com/chicken-prices-at-costco.htm',
    corroboratingUrl: 'https://costcofdb.com/the-complete-guide-to-costcos-chicken-prices-tips-and-hacks-costco-guides',
    fetched: '2026-08-07',
    claim: 'Bone-in chicken costs ~$1.79/lb (thighs) or ~$0.99/lb (drumsticks) at Costco; $3–5/lb at grocery; ~$0.50/lb more pre-marinated.',
  },
  'costco-groundbeef-2026': {
    org: 'Beyond Forest (Costco meat price list 2025) + The Kitchn (Kirkland 90/10 ground beef review)',
    url: 'https://www.beyondforest.org/post/costco-meat-prices-list-2025',
    corroboratingUrl: 'https://www.thekitchn.com/costco-kirkland-90-10-ground-beef-review-23776246',
    fetched: '2026-08-07',
    claim: 'Ground beef costs $3.29/lb in bulk at Costco ($6.80/lb in packs) and $5.86–7.66/lb at grocery; chicken runs $1–2.50/lb at Costco. Hot dogs and links price below ground beef per lb.',
  },
  'dmv-crab-2026': {
    org: 'DMV crab-house retail survey (Captain\'s White, Don\'s, Blue Crab House, Cameron\'s)',
    url: 'https://www.captainwhitesseafood.com/',
    fetched: '2026-07-03',
    claim: 'Four DMV blue-crab retail sources, July 2026: Large Male $72–98/dz baseline; Mediums $32–75; Large Females $52–75; XL Males $109–150; Jumbo $149–188 — establishing the size→price ratios used by crab_size.',
  },
};

// A costFactorProvenance is GROUNDED only when it is tier:'researched' AND cites >=1 real
// source id that resolves in COST_SOURCES (mirrors the other axes; an empty or synthesized
// provenance, or a sourceless 'researched' claim, is not grounding).
export function isGroundedCost(prov) {
  return !!(prov && typeof prov === 'object'
    && prov.tier === 'researched'
    && Array.isArray(prov.sources) && prov.sources.length > 0
    && prov.sources.every((s) => !!COST_SOURCES[s]));
}

export function costSourcesFor(prov) {
  if (!prov || !Array.isArray(prov.sources)) return [];
  return prov.sources.map((s) => COST_SOURCES[s]).filter(Boolean);
}
