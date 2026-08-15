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
  // ── ANNIVERSARY (registered 2026-08-15) ────────────────────────────────────
  // Two of these corrected a band that was too NARROW rather than simply wrong,
  // and both for the same reason: the item's own `where` lists two very different
  // channels and the authored range only covered one of them. A cake bought at a
  // grocery bakery and a cake bought at a custom bakery are not the same price,
  // and neither is a Trader Joe's arrangement and a florist's.
  'paperlust-weddingcake-2026': {
    org: 'Paperlust, "How Much Does a Wedding Cake Cost? (2026 Guide)" (fetched)',
    url: 'https://paperlust.co/blog/how-much-does-a-wedding-cake-cost/',
    fetched: '2026-08-15',
    claim: 'Per slice 2026: grocery-store bakery $1-5; standard custom bakery $3-8; designer/fondant and boutique studio $8-20+. Whole cakes: Costco full sheet $25-30 (~48 servings); Publix full sheet $80-95 (75-80 servings); Publix tiered $150-800. National average wedding cake ~$540 (The Knot Real Weddings), typical budgets $300-700.',
  },
  'retail-sheetcake-2026': {
    org: 'Costco / Walmart / Publix bakery sheet-cake pricing (listing — figures read from 2026 price-guide search results)',
    url: 'https://costcoguides.com/costco-bakery-menu-prices/',
    fetched: '2026-08-15',
    claim: 'Warehouse and supermarket sheet cakes 2026: Costco half-sheet $24.99 feeding ~48; Publix quarter sheet from ~$24 serving 20-30; Walmart quarter-sheet or 8-inch rounds $25-45. A single-tier rectangular sheet cake with a custom design spans $25-300 by size.',
  },
  'paperlust-centerpieces-2026': {
    org: 'Paperlust, "Wedding Centerpieces: 50+ Ideas + Cost Breakdown (2026 Trends)" (fetched)',
    url: 'https://paperlust.co/blog/wedding-centerpieces-2026/',
    fetched: '2026-08-15',
    claim: 'Per table 2026: DIY simple $20-50; DIY elevated $50-100; florist standard $75-150; florist premium $150-300; luxury installation $300-500+. Hidden costs: vessel rentals $8-25 per piece, delivery and setup often $200-500 per event.',
  },
  'traderjoes-flowers-2026': {
    org: 'Trader Joe\'s flower-section price guides (The Kitchn, The Stem Edit) (listing — figures read from search results)',
    url: 'https://thestemedit.com/trader-joes-flowers-price-a-complete-guide/',
    fetched: '2026-08-15',
    claim: 'Trader Joe\'s bouquets $3.99-19.99: basic bunches (alstroemeria, carnations, daisies) $3.99-4.99; roses/tulips/sunflowers $6.99-9.99; specialty (peonies, ranunculus, orchids) $8.99-12.99. A supermarket rose bouquet runs $12-20, against $40-100 for the same from a traditional florist; a DIY arrangement built from TJ bunches lands ~$30-40.',
  },
  // ── WEDDING PLAYBOOK, remaining 6 priced items (registered 2026-08-15) ─────
  // The grounding pass continued through wedding's other purchases. Result worth
  // recording because it cuts both ways: TWO more ranges were wrong and FOUR were
  // already right. Citation is not a rubber stamp and it is not a rewrite — it is
  // a check, and most of this corpus survives it.
  //
  // `(fetched)` means the page was retrieved and read. `(listing)` means the
  // figures came from a search result set naming that source, which is weaker
  // evidence and is labelled so nobody later mistakes one for the other.
  'paperlust-welcomebags-2026': {
    org: 'Paperlust, "Wedding Welcome Bag Ideas: The Complete Guide for 2026" (fetched)',
    url: 'https://paperlust.co/blog/wedding-welcome-bag-ideas/',
    fetched: '2026-08-15',
    claim: 'US wedding welcome bags, 2026: "Most couples spend between $15 and $35 per bag." Tiers as published: under $15 thoughtful essentials; $15-30 curated mid-range; $30-60 elevated; $60+ luxury keepsake.',
  },
  'pacificgiftbox-welcomebags-2026': {
    org: 'Pacific Gift Box Co., "How Much Do Wedding Welcome Bags Cost? A Real Budget Breakdown" (fetched)',
    url: 'https://www.pacificgiftbox.com/blog/how-much-do-wedding-welcome-bags-cost-a-real-budget-breakdown',
    fetched: '2026-08-15',
    claim: 'Cost per bag "typically lands somewhere between $15 and $150+, depending on what is inside, who does the work, and how it gets delivered." DIY budget builds reach $15-25 per bag excluding assembly labour and hotel coordination. Assembled boxes start at $50 (welcome), $100 (grazing), $150 (luxury).',
  },
  'costhelper-guestbook-2026': {
    org: 'CostHelper Weddings, "Cost of a Guest Book" (fetched)',
    url: 'https://weddings.costhelper.com/guest-book.html',
    fetched: '2026-08-15',
    claim: 'US wedding guest books: inexpensive $25 or less; moderately priced $25-50; expensive $50-80. Signature photo frames $20-170. Shipping typically adds $7-9.',
  },
  'mixbook-guestbook-2026': {
    org: 'Mixbook, "How Much Is a Wedding Guest Book?" (listing — figures read from search results, page not fetched)',
    url: 'https://www.mixbook.com/inspiration/how-much-is-a-wedding-guest-book',
    fetched: '2026-08-15',
    claim: 'Traditional guest books $15-50 for basic models, $100+ for custom handcrafted; moderately priced $30-60 buy better paper and binding; luxury leather or gold foil $100-200.',
  },
  'printitmyway-signs-2026': {
    org: 'PrintItMyWay, "Custom Wedding Sign Maker Online: Design Your Own Welcome Sign (2026)" (fetched)',
    url: 'https://www.printitmyway.com/blog/custom-wedding-sign-maker-online-welcome-sign-2026',
    fetched: '2026-08-15',
    claim: 'US wedding signage 2026: welcome signs $75-145 (acrylic 24x36 $95-145; wood $75-115); seating charts $95-185 (acrylic $125-185). Stated average order value $48-225 depending on size and material.',
  },
  'weddingsigns-materials-2026': {
    org: 'Truly Engaging / Vistaprint / Walmart wedding-sign listings (listing — material bands read from search results)',
    url: 'https://www.trulyengaging.com/shop/wedding-signs',
    fetched: '2026-08-15',
    claim: 'By material: foam board $12-25 (budget); wood $22-48; acrylic $28-65; metal $32-72. Budget welcome signs and seating charts start around $13.99, with mass-retail options under $10.',
  },
  'costhelper-champagne-2026': {
    org: 'CostHelper Weddings, "Cost of a Champagne Toast" (fetched)',
    url: 'https://weddings.costhelper.com/champagne-toast.html',
    fetched: '2026-08-15',
    claim: 'Per-bottle tiers for a wedding toast: budget ~$5 (California sparkling); mid-range ~$14 (Spanish cava); premium $40+ (French champagne). Per person $1.50 low / $3 medium / $7+ high. Caterers may add a corking fee of $1+ per bottle; flute rental ~$0.50-1.00 each.',
  },
  'sparklingwine-band-2026': {
    org: 'The Wedding Wines / High Mountain Weddings toast guides (listing — bands read from search results)',
    url: 'https://www.theweddingwines.com/guides/best-budget-champagne-for-a-wedding-toast',
    fetched: '2026-08-15',
    claim: 'Sparkling wine averages $15-25 per bottle; budget sparkling (e.g. Chandon Brut Classic) $10-15. True Champagne from the Champagne region runs $30-500 retail, with entry options $30-40.',
  },
  'selfsupplied-bar-2026': {
    org: 'Fash "2026 Open Bar Wedding Cost" and eventplanning.com "Wedding Alcohol Cost & Bar Budget Calculator (2026)" (listing — figures read from search results)',
    url: 'https://fash.com/costs/open-bar-wedding-cost',
    fetched: '2026-08-15',
    claim: 'SELF-SUPPLIED alcohol runs $15-30 per person, against $45-100 per person for a venue open bar. Planning norm ~5-6 drinks per guest over ~5 hours at roughly $5 per drink. Venues that allow BYO almost always charge corkage: $1.50-3 per beer, $15-25 per bottle of wine or spirits.',
  },
  'myweddingkit-emergency-2026': {
    org: 'MyWeddingKit, "Wedding Day Emergency Kit: 15 Things You Need in Your Bag (2026)" (fetched)',
    url: 'https://myweddingkit.co/blog/wedding-day-emergency-kit',
    fetched: '2026-08-15',
    claim: '"Total cost for a well-stocked kit runs $25 to $40 when you build it yourself from scratch"; individual drugstore items under $3 each. Pre-made kits sold online typically $60-100.',
  },
  'amazon-emergencykit-2026': {
    org: 'Amazon marketplace listings for bridal/wedding emergency kits (listing — price bands and examples read from search results)',
    url: 'https://www.amazon.com/bridal-emergency-kit/s?k=bridal+emergency+kit',
    fetched: '2026-08-15',
    claim: 'Pre-assembled bridal emergency kits retail in bands up to $10, $10-15, $15-25, $25-35, and $35+. Observed examples: a 30+ piece kit at $21.84 and another at $13.19 (both after a 5% coupon).',
  },
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
