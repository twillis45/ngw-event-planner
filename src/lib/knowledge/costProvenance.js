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
  // ── ZERO-PROOF AND MOCKTAILS, per drink (registered 2026-08-15) ────────────
  // The other half of the non-alcoholic split. Deliberately NOT covered by the
  // soda band below: a zero-proof drink carries an NA spirit, a mixer and a
  // garnish, and costs several times a can of soda. Two families, two bands,
  // because pretending they are one thing would make the expensive item look
  // cheap and the cheap one look extravagant.
  //
  // BAR PRICES ARE EXCLUDED AND SHOULD STAY EXCLUDED. The same research turns up
  // $13-17 mocktails at Boston and Brooklyn bars. That is hospitality pricing
  // for a served drink, not what a host pays to pour one at home, and dropping
  // it into a per-drink band would inflate it roughly tenfold.
  'zeroproof-retail-2026': {
    org: 'The Zero Proof, "Why Are Non-Alcoholic Drinks So Damn Expensive?" (fetched), with BevSpot category averages',
    url: 'https://thezeroproof.com/blogs/the-distiller/why-are-non-alcoholic-drinks-so-damn-expensive',
    fetched: '2026-08-15',
    claim: 'Non-alcoholic spirits average about $25 a bottle per BevSpot and hold flat: Seedlip $30, Everleaf aperitif about $24, Abstinence Cape Floral $35, GELATO BAR NA whiskey $33.99. Athletic Brewing NA beer is $13 a six-pack. Bar and restaurant zero-proof drinks run $13-17, which is served-drink pricing rather than retail.',
  },
  'nabeer-retail-2026': {
    org: 'US non-alcoholic beer and canned-mocktail retail listings, 2026 (listing - figures read from search results)',
    url: 'https://www.walmart.com/browse/food/non-alcoholic-beer-wine/976759_2975985_4158159',
    fetched: '2026-08-15',
    claim: 'NA beer retail has fallen since 2023: Budweiser Alcohol Free $29.99 a 12-pack (about $2.50 a can) and Athletic Brewing craft NA $13 a six-pack (about $2.17 a can). Canned mocktails sit higher - Curious Elixir wholesales at $6 a bottle for two servings against a $16 suggested retail, roughly $8 a serving at the premium end.',
  },
  // ── SODA AND BOTTLED WATER, per serving (registered 2026-08-15) ────────────
  // Scoped narrowly ON PURPOSE. These price a CAN OF SODA or a BOTTLE OF WATER.
  // They do not price a mocktail, a zero-proof spirit, a punch base or brewed
  // iced tea - those carry mixers, garnish and N/A spirits and cost several
  // times as much per drink. Lines bundling those are left for a separate pass
  // rather than flattened into this band.
  'soda-12pack-2026': {
    org: 'LatestCost, "12 Pack Soda Pricing Guide for U.S. Shoppers 2026" (fetched)',
    url: 'https://latestcost.com/12-pack-soda-pricing-u-s-shoppers/',
    fetched: '2026-08-15',
    claim: 'A 12-pack of soda runs $3.00-6.50 (average $4.50), which is $0.25-0.60 per can with an average of $0.38. Store brand $2.50-5.00; craft or specialty $6.00-14.00. By region: urban $4.50-6.50, suburban $3.50-5.50, rural $3.00-5.00; Northeast and South run $5.50-7.00 while the Midwest and West Coast sit at $3.50-5.50 on discount-chain competition. Promotions cut 10-25%.',
  },
  'bottledwater-case-2026': {
    org: 'LatestCost pack-of-water pricing and 2026 bulk-beverage listings (listing - figures read from search results)',
    url: 'https://latestcost.com/cost-pack-water-bottles/',
    fetched: '2026-08-15',
    claim: 'A 24-pack of 16.9oz bottled water runs $4-7 on sale and $6-9 at everyday pricing; 40-48 bottle packs $8-15, premium brands $20+. Per bottle that is $0.13-0.25 for basic brands in a larger pack, rising to $0.50-1.00+ for premium.',
  },
  // ── CLEANUP KIT (registered 2026-08-15) ────────────────────────────────────
  // READ THE CONFIDENCE FIELD ON THESE CITATIONS. A cleanup kit is not a product
  // anybody sells or prices - it is bags plus towels plus wipes or soap, bought
  // separately. So the band is a SUM of individually-priced components, and the
  // items carry `confidence: 'low'` and say so in `sufficientWhen`. That is the
  // same treatment the signage kit got, and for the same reason: the components
  // are real, the bundle is ours.
  'costco-cleaning-2026': {
    org: 'Wealthy Single Mommy, "16 Costco cleaning supply deals" - Kirkland Signature shelf prices (fetched)',
    url: 'https://www.wealthysinglemommy.com/costco-cleaning-supply-deals',
    fetched: '2026-08-15',
    claim: 'Costco 2026: 200 13-gallon drawstring trash bags $20.42 (about 10 cents a bag); 12 rolls of paper towels at 160 sheets each $23.60 (about $1.97 a roll); dish soap starter spray plus two 21.5oz refills $14.74; five 85-count disinfecting wipe canisters $21.33 (about $4.27 each); 24 sponges $12.47. The source notes prices vary by store.',
  },
  'trashbags-retail-2026': {
    org: 'Grocery and big-box trash-bag listings, 2026 (listing - figures read from search results)',
    url: 'https://www.walmart.com/browse/household-essentials/trash-bags/1115193_1073264_1149385',
    fetched: '2026-08-15',
    claim: 'Retail (non-warehouse) tall kitchen bags: 120-count Hefty 13-gallon $17.99, or about $13.49 per 120 on a subscribe-and-save bulk price - roughly 11-15 cents a bag against the warehouse 10 cents. Confirms the warehouse-to-grocery spread on the single largest component of a cleanup kit.',
  },
  // ── DISPOSABLE TABLEWARE, per guest set (registered 2026-08-15) ────────────
  // The largest reusable family left: 17 free per-guest-set lines across the
  // corpus. Note what this does NOT do - `jollychef-disposables-2026` was
  // declined twice earlier in this pass because it is a QUANTITY claim
  // (counts per guest) and cannot price anything. These two are prices, and the
  // quantity source stays where it belongs.
  'disposables-bulk-2026': {
    org: 'DTOCS, "Bulk Disposable Plates for Large Seasonal Gatherings" - a host costing a 200-person event (fetched)',
    url: 'https://dtocs.com/blogs/news/bulk-disposable-plates-for-large-seasonal-gatherings-everything-i-learned-hosting-200-people',
    fetched: '2026-08-15',
    claim: 'Per plate 2026: basic white paper at a grocery store $0.25-0.40; the same from bulk restaurant supply $0.08-0.15; coated paper $0.10-0.12 bulk; good foam $0.09 bulk; premium plastic $0.15-0.25; compartment plates $0.12-0.18; compostable or bamboo $0.18-0.35. Worked example for 200 plates: grocery $50-80 against bulk supply $16-30. The article warns that bulk is not automatically cheaper and that cost-per-plate must be computed before buying.',
  },
  'disposables-partyqty-2026': {
    org: '2026 party-supply planning guides and bulk retail listings (listing - figures read from search results)',
    url: 'https://www.webstaurantstore.com/48825/disposable-party-supplies.html',
    fetched: '2026-08-15',
    claim: 'Basic paper plates run about $18 per 300 (roughly 6 cents each) in bulk packs. Planning norm for a full place setting is 2-3 plates per guest across appetizer, main and dessert, 2-3 cups, one set of cutlery per course and 2-3 napkins, plus 10-15% extra for spills and unexpected guests. Buying cups, utensils and napkins in bulk together saves $100-200 across a party.',
  },
  // ── WINE, per bottle (registered 2026-08-15) ───────────────────────────────
  // Registered once and applied to every uncited per-bottle wine line in the
  // corpus in the same pass - the source-family pattern, which is what makes
  // this work compound rather than repeat.
  //
  // A CAVEAT WORTH THE SPACE: a widely-syndicated January 2026 headline put the
  // average US bottle at $56.78. Tablas Creek published a rebuttal showing that
  // figure is direct-to-consumer data, and DTC is only 10-11% of off-premise
  // volume - the shelf a host actually buys from is nothing like it. Taking the
  // headline at face value would have inflated every band here fourfold while
  // looking impeccably sourced.
  'wine-retail-2026': {
    org: 'LatestCost, "Average Bottle of Wine Cost 2026" (fetched)',
    url: 'https://latestcost.com/average-bottle-of-wine-cost/',
    fetched: '2026-08-15',
    claim: 'US retail 2026 by tier: everyday table wine (the grocery shelf) $8-15; mid-range $15-30; premium $30-100+. By type: red $12-40, white $10-30, rose $10-25. Sparkling $20-60. Retail stores hold $8-25 overall while restaurant markups run $30-100+; online $10-40 before shipping.',
  },
  'wine-statewide-2026': {
    org: "Today's Homeowner state-by-state wine pricing, with the Tablas Creek rebuttal to the $56.78 DTC headline (listing - figures read from search results)",
    url: 'https://todayshomeowner.com/blog/cost/wine-cost-state/',
    fetched: '2026-08-15',
    claim: 'State averages cluster tightly: cheapest Massachusetts $10.97, then Maryland $11.14, Delaware $11.31, New Mexico $11.43, Connecticut $11.47; most expensive Mississippi $15.51. An average retail bottle is around $14. Category bands: jug under $5, popular table $5-10, mid-premium $10-15, super-premium $15-20. The $56.78 average-US-bottle headline is DTC-only data (10-11% of off-premise volume) and does not describe a shelf price.',
  },
  // ── BACHELORETTE (registered 2026-08-15) ───────────────────────────────────
  // Spirits only. The sparkling line on the same playbook needed NO new source —
  // the champagne/sparkling pair registered for wedding and anniversary already
  // covers it, which is what a citation by genuine REUSE looks like: zero new
  // registry entries, and the band still moved.
  'spirits-budgetbar-2026': {
    org: 'Feast + West, "Budget Bar Setup: Stock Your Home Bar for $100 or Less" (fetched)',
    url: 'https://feastandwest.com/stock-your-bar-for-100-or-less/',
    fetched: '2026-08-15',
    claim: 'Named 750ml shelf prices (North Carolina, pre-tax): vodka SKYY $12.95, Finlandia $15.95, Tito\'s $25. Gin Seagram\'s $12.95, Beefeater $19.95, Bombay $19.95. Tequila blanco Jose Cuervo $20.95, El Jimador $21.95, Lunazul $21.95. Rum Bacardi $12.95, Captain Morgan $15.95, Sailor Jerry $21.95. The article states prices vary by state and exclude tax.',
  },
  'spirits-retail-2026': {
    org: '2026 vodka/gin retail price guides and bottle-price aggregators (listing — figures read from search results)',
    url: 'https://selector.kurlon.com/live/vodka-bottle-costs-price-ranges-and-budget-guide-2026-35499.html',
    fetched: '2026-08-15',
    claim: 'Vodka 750ml: most buyers pay $18-40, with basic store brands from ~$8 and premium/limited to $60. Tequila blanco $18-22. Popular-brand gin runs higher than both — Bombay Sapphire $30.99, St. George Terroir $36.60. National brands hold price floors; local shops discount and holidays lift prices.',
  },
  // ── ANNIVERSARY, third batch (registered 2026-08-15) ───────────────────────
  // Both picked by the channel-span test again. `p_bread` is the clearest case
  // the pass has produced: its band was too HIGH at the bottom and too LOW at
  // the top, covering only mid-bakery and missing BOTH channels the item names.
  'bread-retail-2026': {
    org: 'LatestCost, "Bread Cost Today: Price Insights for a Loaf 2026" (fetched)',
    url: 'https://latestcost.com/bread-cost-today-price-insights-loaf/',
    fetched: '2026-08-15',
    claim: 'Per loaf 2026: mass-market white averages $2.50 across a $1.00-4.50 range; basic grocery-chain loaves $1.50-2.50. Artisan loaves average $6.00 across $3.50-9.00; premium handmade with specialty flour and long fermentation $6.50-12.00.',
  },
  'bread-artisan-2026': {
    org: 'BakeProfit sourdough pricing guide and 2026 home-baker pricing guides (listing — figures read from search results)',
    url: 'https://bakeprofit.com/blog/pricing/how-to-price-sourdough',
    fetched: '2026-08-15',
    claim: 'Mid-size bakery loaves $3.50-5.50; premium artisan with long fermentation and specialty flour $6.50-12.00; a quality farmers-market sourdough is $8-14 in 2026. Corroborates the artisan half of the retail source above from the baker\'s side.',
  },
  'foamboard-print-2026': {
    org: '48HourPrint custom foam-board sign pricing (fetched)',
    url: 'https://www.48hourprint.com/foam-boards.html',
    fetched: '2026-08-15',
    claim: 'A single custom-printed 24x36 foam board lists at $73.08, discounted to $43.85 on a promotional coupon. SquareSigns advertises foam-board posters from $36.00 at the same size. Price moves on board thickness, size, and single- vs double-sided printing.',
  },
  'amazon-partysigns-2026': {
    org: 'Amazon party-banner and foam-board listings, browse-node price bands (listing — figures read from search results)',
    url: 'https://www.amazon.com/party-banners/s?k=party+banners',
    fetched: '2026-08-15',
    claim: 'Amazon foam-board backdrops and blank boards fall in published bands of up to $15, $15-20, and $20-40 by size; these are unprinted or pre-made rather than custom-printed. Party banners and number props sit at the low end of the same range.',
  },
  // ── ANNIVERSARY, second batch (registered 2026-08-15) ──────────────────────
  // Both items were flagged BEFORE researching them, by the channel-span test
  // the first batch produced: an item whose `where` names a discount channel
  // and a premium one in the same list is a candidate for a band that only
  // covers one of them. Both were, and both were too LOW at the top.
  'charcuterie-ica-2026': {
    org: 'International Charcuterie Association, "The Ultimate Charcuterie Board Price Guide" (fetched)',
    url: 'https://charcuterieassociation.com/charcuterie-board-price/',
    fetched: '2026-08-15',
    claim: 'Per pound 2026 — cheese: budget $5-15, crowd-pleasers $10-25, hard $10-30, soft $8-25, artisanal $20-40, blue $15-40. Meats: mortadella $8-20, salami $10-25, capicola $15-30, prosciutto $25-40. Accompaniments: fresh fruit $1-5, nuts $5-15, olives $5-15. Serving norm 2-4 oz meat and cheese per person plus 1-2 oz other. CATERED boards price per person or per board, not per pound: $15-50 per person; small (2-4) $40-60, medium (6-10) $80-120, large (12-20) $150-250.',
  },
  'charcuterie-grocery-2026': {
    org: 'US grocery specialty-cheese and cured-meat averages, via charcuterie pricing guides (listing — figures read from search results)',
    url: 'https://homebodyeats.com/charcuterie-board-pricing/',
    fetched: '2026-08-15',
    claim: 'US grocery averages: specialty cheese ~$15/lb, charcuterie meats ~$20/lb. A DIY medium board for 5-15 people runs $50-120 in ingredients. Ready-made boards from a cheese shop run $85 (small) to $285 (extra large), or ~$15 per person with a $120 minimum.',
  },
  'coffeeurn-rental-2026': {
    org: 'US party-rental catalogues (ABC Rentals, White Gables, Cheboygan Party Rental) and big-box retail listings for 40-cup urns (listing — figures read from search results)',
    url: 'https://whitegableshome.com/products/coffee-percolator-urn-40-cup-rental',
    fetched: '2026-08-15',
    claim: 'A 40-cup coffee urn RENTS for $21-22 per event. Buying the same urn outright runs $45-59 (Walmart commercial 40-cup $44.99-47.99; Zulay stainless 40-cup $58.74 at Home Depot). So the three channels this line names differ by ~5x on the same job.',
  },
  'coffee-percup-2026': {
    org: 'Low Key Coffee Snobs, "The Cost of Coffee at Home vs. the Coffee Shop" (fetched), with budget/mainstream per-cup figures from 2026 coffee-cost guides',
    url: 'https://www.lowkeycoffeesnobs.com/coffee-cost-calculations/',
    fetched: '2026-08-15',
    claim: 'Home-brewed cost per cup: budget store-brand pre-ground ~$0.10; mainstream specialty (Starbucks, Peet\'s) $0.20-0.30; premium subscription beans $0.75-1.25 (a 12 oz bag at ~$20 yields 16-17 cups at ~20g per brew). Cafe drip is $3-5 for comparison. NOTE an urn "cup" is 5 oz, not a 10-12 oz mug, so per-mug figures overstate the grounds needed for a 40-cup urn.',
  },
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
  // ── CORROBORATION FOR THE PROTEIN AND CATERING LINES (added 2026-08-16) ────
  //
  // `pricing` policy is corroborationRequired with minCorroboration 2, and these
  // three families each had exactly ONE registered source, so five cost citations
  // written against them were non-compliant and had to be withdrawn.
  //
  // USDA was the tempting shortcut and is the wrong one: it prices PORK CHOPS at
  // ~$4.33/lb and never states a chicken $/lb at all, so on a ribs or bone-in
  // chicken line it would be authority attached to a number it did not measure —
  // "a decoration WITH A GOVERNMENT SOURCE ATTACHED, the most convincing kind and
  // the worst", which is this corpus's own standing finding. These are independent
  // trade guides that price the SAME cut in the same channels.
  'ribs-retail-2026': {
    org: 'Eat Healthy 365 — "Average Price for Ribs (2026): A Complete Guide" (fetched)',
    url: 'https://eathealthy365.com/how-much-do-ribs-cost-a-detailed-price-breakdown/',
    fetched: '2026-08-16',
    claim: 'Per pound 2026 for raw pork ribs: baby back $5.00-8.00; untrimmed spareribs $3.50-5.50; St. Louis-style (trimmed spareribs) $4.50-7.00. Sale benchmarks: baby back under $4.50, spareribs under $3.00, St. Louis under $4.00 are good prices. Independently confirms the grocery tier that the Costco guide contrasts against.',
  },
  'chicken-retail-2026': {
    org: 'Cook Answers — "What Is the Price of Chicken Thighs? Your 2026 Cost Guide" (fetched)',
    url: 'https://cookanswers.com/what-is-the-price-of-chicken-thighs/',
    fetched: '2026-08-16',
    claim: 'Per pound 2026: bone-in skin-on chicken thighs $1.50-3.00; boneless skinless $3.00-5.80; fresh thighs overall $1.50-5.80 with most grocery options $1.90-4.50. Big-box and warehouse chains undercut supermarkets by $0.40-1.00/lb on family packs — an independent confirmation of both the bone-in floor and the warehouse-to-grocery spread.',
  },
  'catering-chefry-2026': {
    org: 'Chefry — "How Much Does Catering Cost? Per-Person Pricing by Event (2026)" (fetched)',
    url: 'https://www.chefry.io/blog/catering-cost-guide',
    fetched: '2026-08-16',
    claim: 'Per person 2026: drop-off $15-30 (trays, no staff); buffet $25-55 with setup and chafing dishes and optional light staffing; plated or full service $50-120 with servers, courses, setup and cleanup. Caterers typically add an 18-22% service charge on food, which is SEPARATE from gratuity — a $40 per-person quote can land 68% higher once both are applied.',
  },
  // ── ICE, AT LAST (registered 2026-08-16) ──────────────────────────────────
  //
  // 28 priced lines name ice and NOT ONE could be cost-cited, because the only
  // registered ice source (`reddy-ice-2026`) is a QUANTITY claim — lb per guest —
  // and reusing it for price was declined twice on exactly that ground. The gap
  // was recorded as "no published source" and never actually searched. It was
  // searchable: two independent 2026 guides publish per-retailer bag prices.
  //
  // The two agree on the SHAPE (warehouse cheapest, convenience dearest) and
  // differ on the floor — 10-12c/lb at Sam's against 15-23c at the low end of the
  // retailer survey — so the band below spans both rather than picking a winner.
  'ice-retail-2026': {
    org: 'Hip2Save — "Where to Buy Ice from Everywhere & Best Prices" (fetched; per-retailer survey)',
    url: 'https://hip2save.com/tips/where-to-buy-ice/',
    fetched: '2026-08-16',
    claim: 'Bagged ice per pound 2026 by retailer: BJs 20lb $4.49 (23c/lb); 7-Eleven 20lb $4.79 (23c); Giant 20lb $4.99 (25c); Walmart 5-10lb $2.33 (as low as 23c); Albertsons 10lb $2.99 (30c); Kroger 7lb crushed $2.19 (31c); Publix 16lb $4.99 (31c); Lowes 7lb $2.88 (41c); Safeway 16lb $7.29 (45c); bulk Ice2U 20lb $3.00 (15c). Grocery and gas-station bags cluster 23-31c/lb; small bags and hardware stores run higher.',
  },
  'ice-warehouse-2026': {
    org: 'Eat Healthy 365 — "How Much is a Bag of Ice at Sams Club? (2026 Price)" (fetched)',
    url: 'https://eathealthy365.com/sams-club-ice-prices-your-complete-2026-buying-guide/',
    fetched: '2026-08-16',
    claim: 'A 20lb bag of Members Mark ice runs $1.75-2.50 at Sams Club (most commonly about $2.00), which is 10-12c per pound; Costco is near-identical at $1.80-2.50 or about 11c. Walmart 10lb is $2.50 (25c/lb) and a 7lb gas-station bag is about $3.00 (43c/lb) — convenience ice is more than four times warehouse ice per pound.',
  },
  // ── BEER, WHICH WAS WRITTEN OFF TOO EARLY (registered 2026-08-16) ─────────
  //
  // The 2026-08-15 worklist recorded beer as ungroundable because "beer returns
  // 403 from both candidate sources". That was true of those two URLs and false
  // as a conclusion — it was a fetch failure recorded as an absence of evidence.
  // Two other 2026 retail guides publish per-unit figures and agree closely.
  //
  // Both are explicit that they give RANGES rather than confirmed year-end
  // figures, so confidence stays medium and `sufficientWhen` asks for a real
  // shelf check. On-premise and bar pricing is excluded on purpose, the same way
  // `selfsupplied-bar-2026` is corkage rather than retail.
  'beer-retail-2026': {
    org: 'LatestCost — "Average Cost of Beer 2026" (fetched; states its figures are ranges, not confirmed year-end prices)',
    url: 'https://latestcost.com/average-cost-of-beer/',
    fetched: '2026-08-16',
    claim: 'Per 12oz unit 2026: domestic lager $0.80-1.20; imported $1.20-2.50; craft $1.50-3.00. A domestic six-pack runs $6.00-10.00 depending on state (Ohio at the low end, California at the high end), and a 24-pack case is the best per-unit price though no case figure is given.',
  },
  'beer-budget-2026': {
    org: 'PorchDrinking — "Best Cheap Beer for 2026" (fetched; range estimates, varies by state and retailer)',
    url: 'https://porchdrinking.com/best-cheap-beer/',
    fetched: '2026-08-16',
    claim: 'Domestic lagers run about $20-22 for a 24-pack in many states in 2026; value brands go lower (Hamms and Genesee 30-packs about $15-20, Miller High Life often under $1 per 12oz in large packs). Mid-tier 12-packs: Yuengling $12-16, Narragansett $12-15, Blue Moon $15-19, Sierra Nevada Hazy Little Thing about $19-20 — so craft runs roughly 1.5-2x domestic at the same pack size.',
  },
  // ── HARD SELTZER (registered 2026-08-16) ──────────────────────────────────
  // The last drink family with no source. Several lines read "beer + hard
  // seltzer", so without this the whole band stayed uncitable even though beer
  // itself now has two sources.
  'seltzer-retail-2026': {
    org: 'Target product listing (White Claw variety 12pk, fetched) cross-checked against 2026 retail listings for White Claw and Truly',
    url: 'https://www.target.com/p/white-claw-hard-seltzer-variety-pack-12pk-12-fl-oz-slim-cans/-/A-51609879',
    fetched: '2026-08-16',
    claim: 'Hard seltzer 2026: a White Claw 12-pack of 12oz slim cans lists at $15.99 (regular $16.99), about 11c per fluid ounce or $1.33 a can; other 2026 retail listings put White Claw variety packs at $19.00-22.99 and Truly at $18.00-18.27 per 12-pack, roughly $1.50-1.60 a can. So seltzer prices close to craft beer per can and above domestic lager.',
  },
  // ── BROWN LIQUOR (registered 2026-08-16) ──────────────────────────────────
  // Both existing spirits sources cover vodka, gin, tequila and rum by name and
  // NEITHER carries whiskey, bourbon or cognac — so `Card Party p_brown` and the
  // grown-folks lines had no source for the one spirit they actually name.
  //
  // Honest about its own thinness: bourbon retail is unusually dispersed (the same
  // bottle ran $26.99-49.39 across the retailers checked) and allocated bottles
  // are a separate market entirely, so this bands the ORDINARY shelf and says so.
  'bourbon-entry-2026': {
    org: 'Bourbon Veach — "Whiskey Prices Per Bottle" (fetched)',
    url: 'https://bourbonveach.com/2026/04/20/whiskey-prices-per-bottle/',
    fetched: '2026-08-16',
    claim: 'Entry-level bourbon in 2026: good widely-available whiskey runs about $20 a 750ml bottle (Old Forester, Old Grand Dad named). Allocated bottles are a different market — Pappy Van Winkle 20yr MSRP $399.99 and 23yr $499.99 — and the article stresses that shelf price commonly diverges from MSRP on anything in demand.',
  },
  'bourbon-shelf-2026': {
    org: 'Cost Plus Liquors product listing, Buffalo Trace 750ml (fetched)',
    url: 'https://costplusliquors.com/products/buffalo-trace-bourbon-750ml',
    fetched: '2026-08-16',
    claim: 'A named mid-shelf bourbon, Buffalo Trace 750ml, lists at $49.39 regular and $37.99 on sale. Other 2026 retail listings for the same bottle run $26.99-43.99 depending on retailer and state, which is the dispersion to expect on brown liquor rather than a single national price.',
  },
  // ── SHELF TIERS: what "upper" and "lower shelf" actually cost ─────────────
  // Registered 2026-08-16. The two spirits sources give NAMED bottle prices but
  // no tier framing, so nothing told a host where a $13 bottle and a $50 bottle
  // sit relative to each other. This bands the tiers; the named-price sources
  // then confirm the bands empirically from opposite ends (SKYY and Bacardi at
  // $12.95 in the bottom band, Buffalo Trace $37.99-49.39 mid, Pappy $400+ top).
  //
  // Deliberately US-only. A UK guide with the same tier structure was found and
  // NOT used: its bands are in pounds (mid-shelf GBP 15-40) and folding a foreign
  // currency into a US band would be a decoration dressed as corroboration.
  'liquor-shelf-tiers-2026': {
    org: 'Kitchen Sterling — "The Difference Between Top and Bottom Shelf: Uncovering the Mysteries of Liquor Quality and Pricing" (fetched)',
    url: 'https://kitchensterling.com/whats-the-difference-between-top-and-bottom-shelf/',
    fetched: '2026-08-16',
    claim: 'Per 750ml bottle: BOTTOM SHELF (well/rail) $10-30, made with lower-cost ingredients and production shortcuts; TOP SHELF $50-200 or more, with longer aging and higher-grade inputs. Mid-shelf sits between and is where most named call brands land. The source is explicit that price correlates with quality but does not guarantee it, and that some budget bottles are genuinely good value — so the band is a spend guide, not a quality claim.',
  },
  // ── PREPARED / DELI SIDES, BOUGHT MADE (registered 2026-08-16) ────────────
  //
  // A correction to this corpus's own standing finding. The 2026-08-15 worklist
  // ruled home-cooked-by-finished-weight ungroundable because USDA prices raw
  // commodities and publishes nothing for "the ingredients for coleslaw per
  // finished pound". That holds for lines pricing INPUTS — `theCookout p_slaw`
  // is literally "Coleslaw ingredients" and a deli price does not ground flour.
  //
  // But it was applied too widely. Plenty of lines price THE DISH AS BOUGHT and
  // say so in `where`: Juneteenth p_mac is "Mac & cheese" from Grocery/caterer/
  // bakery, p_potatosalad is "Potato salad" from Grocery/caterer. Delis and
  // warehouse clubs sell exactly those, by the pound, and publish the price.
  //
  // So the rule is not "finished dishes cannot be grounded". It is: a line that
  // buys the dish can cite a prepared-food price; a line that buys the inputs
  // cannot. The two shapes sit side by side in the same playbook.
  'costco-deli-2026': {
    org: 'Tasting Table — "Costco Best New Deli Items And Prepared Foods In 2026 (So Far)" (fetched)',
    url: 'https://www.tastingtable.com/2213364/costco-best-new-deli-items-prepared-foods-2026-so-far/',
    fetched: '2026-08-16',
    claim: 'Costco prepared-food per pound 2026: BBQ chicken mac and cheese with bacon about $5/lb; pesto pasta salad with mozzarella about $7/lb; Italian sausage and pasta about $6/lb; braised beef with mashed potatoes $8-9/lb; beef short rib ragu, fajita kit and beef and broccoli about $8/lb. Warehouse prepared sides cluster $5-8 per pound.',
  },
  'costco-prepared-2026': {
    org: 'Tasting Table — "12 Best Costco Prepared Foods To Buy And 10 To Avoid" (fetched)',
    url: 'https://www.tastingtable.com/1944312/costco-prepared-foods-buy-avoid/',
    fetched: '2026-08-16',
    claim: 'Costco prepared foods per pound: beef chili $3.49/lb (about a 4lb tub); meatloaf with mashed potatoes $3.99/lb; chicken pot pie $3.99/lb; stuffed bell peppers $4.99/lb (under $1 a serving); tortellini pasta salad $5.49/lb; butter chicken $5.99/lb; gyro and burger kits $6.49/lb; rotisserie chicken $4.99 for about 3lb. Confirms the $3.50-6.50/lb band for warehouse prepared sides, below the $5-8 of the newer premium items.',
  },
  // ── RAW PRODUCE, AT THE RIGHT UNIT (registered 2026-08-16) ────────────────
  //
  // USDA ERS was the obvious government source and does NOT fit: it publishes
  // per-CUP-EQUIVALENT figures for 2023 and omits collard greens, red potatoes
  // and strawberries entirely, while the corpus prices produce per POUND.
  // Converting cup-equivalents to pounds would have been a derivation invented
  // to make a citation possible — the same unit mismatch that made the earlier
  // "ingredients for coleslaw per finished pound" attempt a decoration.
  //
  // The BLS Average Price series (APU) IS per pound, monthly, and current. This
  // is a government source used on the exact quantity it measures, which is the
  // distinction that matters — not whether the source is authoritative.
  // -- JUICE AND TEA, the two components that blocked the NA-drink family ------
  // Registered 2026-08-18. The non-alcoholic rows ("Soda, water, iced tea",
  // "Soft drinks, juice, water") could not be grounded because soda and bottled
  // water had sources and juice and tea did not. These close that gap.
  //
  // READ THE OJ SERIES CAREFULLY: APU0000713111 prices FROZEN CONCENTRATE per 16
  // fl oz of concentrate, not ready-to-drink juice. A 12oz can reconstitutes to
  // about 48oz, so $4.82/16oz is roughly $3.62 a can and about $0.60 per 8oz
  // glass. Quoting the headline number as a per-glass price would overstate it
  // roughly fourfold, which is exactly the kind of unit slip a citation is
  // supposed to prevent.
  // -- TABLE LINENS AND CLOTH NAPKINS (registered 2026-08-18) -----------------
  // The disposables sources stop at plates, cups and cutlery and say so: their
  // claim excludes "sets that bundle flutes, koozies, linens or table covers"
  // as a different product. That boundary is correct and it left every napkin
  // and linen row unsourceable. These two close it, and they are independent of
  // each other - a linen retailer's styling guide and an event-rental company's
  // published size-banded rate card.
  //
  // The rental rate is the honest basis for a HOST row even though a host may
  // own their napkins: an owned napkin still carries a laundering cost (the
  // second source puts professional cleaning at $11.50 a tablecloth), so the
  // per-use figure is what a per-event band is actually pricing.
  // -- BALLOONS AND BANNERS (registered 2026-08-18) ---------------------------
  // The decor family had no source at all. These three price its components so
  // a kit row can be summed the way the paper-goods rows already are.
  //
  // TIER MATTERS HERE AND IS STATED. The two balloon entries are fetched
  // retailer catalogue pages with per-kit prices. The banner entry is read from
  // search results because dollartree.com returned 503 and partycity.com 404 on
  // fetch - recorded as the weaker evidence it is, NOT dropped. The corpus has
  // this lesson already: beer was written off as ungroundable when two URLs
  // returned 403, which was a fetch failure recorded as an absence of evidence.
  //
  // CUSTOM PRINTED BACKDROPS ARE DELIBERATELY EXCLUDED. The same research turned
  // up personalised backdrops at $49-98 (Etsy, Zazzle, ubackdrop). That is a
  // different product from a party-store banner, and folding it in would put the
  // component above the whole kit band it is supposed to price.
  // -- SMOKED SAUSAGE (registered 2026-08-18) ---------------------------------
  // The boil and cookout rows band smoked sausage at $3-6/lb and had no source.
  // The registry's only sausage evidence was directional — costco-groundbeef-2026
  // says links "price below ground beef per lb" — which is a comparison, not a
  // price, and cannot ground a band on its own.
  //
  // These two are BUTCHER prices and sit at the upper half of the band. That is
  // stated rather than smoothed over: the floor of a $3-6 band is warehouse
  // mass-brand (below Costco's $3.29/lb bulk ground beef), and the ceiling is a
  // butcher ring. The two ends are different products at the same counter, which
  // is what the spread in these rows is actually made of.
  // -- WINGS, SALMON AND HAM (registered 2026-08-18) --------------------------
  // These three were the components blocking the rest of the protein family:
  // the chicken sources price thighs, drumsticks and boneless but NOT wings;
  // "beef, chicken or salmon" had no salmon; "chicken and baked ham" had no ham.
  //
  // HAM IS SEASONAL AND THE CLAIM SAYS SO. The retailer figures below are Easter
  // promotional pricing, when ham is a loss-leader. The USDA weekly retail report
  // is the honest anchor at $2.25/lb; quoting Kroger's $0.85 as the going rate
  // would price a holiday promotion as if it were a Tuesday.
  // -- CORN AND COLLARDS (registered 2026-08-18) ------------------------------
  // The two produce commodities that repeat most across the corpus: corn on the
  // cob in four rows, collard greens in three. bls-produce-2026 covers potatoes
  // and bananas only, and usda-produce-outlook-2026 is priced per CUP EQUIVALENT
  // rather than per ear or per pound, so neither could ground these.
  //
  // SEASON IS THE WHOLE STORY FOR CORN and the claims say so. A summer ear is
  // $0.37-0.77; the national range only reaches $1.25 off-peak. A December row
  // (Kwanzaa muhindi) is legitimately at the top of its band for that reason.
  // -- WATERMELON AND LEMONS (registered 2026-08-18) --------------------------
  // Two more single commodities that repeat: watermelon in the Juneteenth and
  // BBQ rows, lemons in the boil rows. Both are priced per pound or per fruit,
  // which is what those rows band, so neither needed the cup-equivalent
  // conversion that made usda-produce-outlook unusable for them.
  // -- SNACKS (registered 2026-08-18) -----------------------------------------
  // Registered even though they ground only one row today, because they are what
  // establishes that the snack bands run BELOW their commodity - the opposite
  // direction from the drinks bands. Recording the evidence is the point; a
  // future pass should not have to re-derive it.
  // -- BUNS (registered 2026-08-18) -------------------------------------------
  // The bread sources price LOAVES ($2.50 mass-market, $6.00 artisan) and the
  // bun rows band per BUN. A loaf and an 8-pack of buns are different products
  // that happen to sit at similar shelf prices, and substituting one for the
  // other is the same unit error as pricing pre-cut watermelon as whole, or
  // reading a cup-equivalent as a pound. Two retailer sources instead.
  // -- GROCERY BAKERY CAKE (registered 2026-08-18) ----------------------------
  // Second independent source for the cake rows. retail-sheetcake-2026 already
  // covers warehouse and supermarket SHEET cakes; this covers the round-cake and
  // whole-cake formats those rows also name, and corroborates the sheet figures
  // from a second publisher.
  //
  // CUSTOM AND CELEBRATION-BAKERY CAKES ARE EXCLUDED. The same research turns up
  // custom work at several hundred dollars; a grocery bakery round is a
  // different product, and the rows here band the grocery one.
  // -- SANDWICH AND BLOCK CHEESE (registered 2026-08-18) ----------------------
  // The registry's only cheese evidence was charcuterie-grocery-2026 at about
  // $15/lb for SPECIALTY cheese. That is the right figure for a cheese board and
  // the wrong one for a melting or sandwich cheese, and using it for the latter
  // would roughly treble the number. These two price the everyday tier.
  // -- SALAD VEG AND CONDIMENTS (registered 2026-08-18) -----------------------
  // These two unblocked a family that had been stuck across three batches: the
  // burger-topping kits and the garden-salad rows. Condiments alone were not
  // enough - the produce is roughly a third of a topping kit, not a rounding
  // error, so grounding on condiments and cheese alone would have put a citation
  // on a number a third of which was still a guess.
  //
  // BOTH SALAD ITEMS ARE RISING FAST and the claim records it: lettuce +32.1%
  // and tomatoes +19.5% year on year to June 2026. A band sourced against these
  // figures is more perishable than one sourced against, say, foil.
  // -- DIPS, BUTTER, FIRST AID AND OUTDOOR PROTECTION (2026-08-18) ------------
  // Four families in one pass. Two of them immediately exposed band mismatches
  // rather than grounding rows, which is recorded in the band-vs-evidence audit
  // instead of being smoothed over with a citation.
  // -- PRINTED SIGNAGE (registered 2026-08-18) --------------------------------
  // banner-retail-2026 covers the $1.25 party-store banner. This covers the
  // PRINTED tier - foam board, vinyl, corrugated yard signs - which is what the
  // conference, graduation and memory-display rows actually buy. Two tiers, two
  // sources, and the claims say which one a row is priced against.
  // -- LAWN GAME RENTAL (registered 2026-08-18) -------------------------------
  // Two providers, because a single rental company's rate card is a local price
  // and the delivery minimums differ enough to matter for a small backyard order.
  // -- BADGES, LANYARDS AND PA RENTAL (registered 2026-08-18) -----------------
  // The conference and retreat rows band per BADGE and per SYSTEM, so these are
  // per-unit and per-day figures rather than per-person event pricing.
  // -- FRAMES AND KEEPSAKE BOOKS (registered 2026-08-18) ----------------------
  // -- SHRIMP AND LIVE CRAWFISH (registered 2026-08-18) -----------------------
  // Crawfish is the most SEASONAL commodity in this corpus - Louisiana prices
  // move week to week through the season and there are public trackers for
  // exactly that reason. A band cited against it dates faster than almost
  // anything else here, and the claim says so.
  // -- FRY FISH (registered 2026-08-18) ---------------------------------------
  // The fish-fry row names whiting, catfish and porgies together, and the first
  // two differ by nearly 2x at retail - which is the whole width of its band.
  'fish-retail-2026': {
    org: 'Walmart frozen fish fillet listings with unit pricing, 2026 (listing - figures read from search results)',
    url: 'https://www.walmart.com/c/kp/fish-fillet',
    fetched: '2026-08-18',
    claim: 'Frozen fillets at retail 2026: Great Value wild-caught Pacific whiting 2lb $8.72 (27.3 cents an ounce, about $4.36/lb); Great Value skinless catfish 2lb $14.72 (46.0 cents an ounce, about $7.36/lb). Foodservice cases price far higher per pound than a consumer bag.',
  },
  'catfish-market-2026': {
    org: 'Selina Wamucii US catfish market prices, updated monthly (listing - figures read from search results)',
    url: 'https://www.selinawamucii.com/insights/prices/united-states-of-america/catfish/',
    fetched: '2026-08-18',
    claim: 'US catfish $2.47/kg ($1.12/lb) as of June 2026. That is the FARM-GATE or market figure, not a retail fillet price - the same fish is about $7.36/lb as a frozen consumer fillet, and the gap is processing and packaging rather than a bargain.',
  },
  'shrimp-market-2026': {
    org: 'Selina Wamucii US shrimp and prawn market prices, updated monthly (listing - figures read from search results)',
    url: 'https://www.selinawamucii.com/insights/prices/united-states-of-america/shrimps-prawns/',
    fetched: '2026-08-18',
    claim: 'US shrimp and prawns $8.46 per pound as of June 2026.',
  },
  'crawfish-sack-2026': {
    org: 'US live-crawfish retailers and price trackers, 2026 (listing - figures read from search results)',
    url: 'https://latestcost.com/crawfish-cost-per-pound/',
    fetched: '2026-08-18',
    claim: 'Live crawfish 2026, sold by the sack at 30-35lb: $3.00/lb field run (about $90 a sack), $3.25/lb sack-only, and $3.99/lb at 30+lb rising to $4.99/lb for smaller quantities. The Crawfish App average is $3.75/lb live and $6.19/lb BOILED - boiled is a prepared product and costs roughly two thirds more. Louisiana prices move week to week through the season, which is why public price trackers exist for this commodity.',
  },
  'frames-retail-2026': {
    org: 'US retail shadow-box and photo-frame listings, 2026 (listing - figures read from search results)',
    url: 'https://www.walmart.com/c/kp/memories-frame-box',
    fetched: '2026-08-18',
    claim: 'Frames 2026: a 5x7in shadow box with HD plexiglass about $8.92; an 8x8in shadow box about $12.99. A wooden photo-memories keepsake box is a different product at $47.99 (listed against a $59.99 comparable).',
  },
  'memorybook-retail-2026': {
    org: 'US personalised guest-book and memory-book listings, 2026 (listing - figures read from search results)',
    url: 'https://www.zazzle.com/memory+book+gifts',
    fetched: '2026-08-18',
    claim: 'Guest and memory books 2026: personalised notebooks $12.46-19.38; personalised planners about $32.52. Custom handbound memory books with presentation boxes price above this range.',
  },
  'badges-print-2026': {
    org: 'US event badge printers - per-badge pricing (listing - figures read from search results)',
    url: 'https://www.conferencebadge.com/cardboard-badges',
    fetched: '2026-08-18',
    claim: 'Event badges 2026: printed cardboard badges from $2.19 each; plastic ID name badges $4.37 each at 25-74 quantity; badge packages from $10.25 per pack of 25, i.e. about $0.41 a badge at the bulk end.',
  },
  'lanyards-retail-2026': {
    org: 'Event lanyard suppliers - per-unit pricing (listing - figures read from search results)',
    url: 'https://www.pcnametag.com/lanyards.html',
    fetched: '2026-08-18',
    claim: 'Lanyards 2026: blank lanyards from $0.21 each in bulk; a plain black lanyard added to a badge order is about $0.99 each.',
  },
  'pa-rental-2026': {
    org: 'US sound-system rental price guides, 2026 (listing - figures read from search results)',
    url: 'https://www.primal-sounds.com/blog/sound-system-rental-guide',
    fetched: '2026-08-18',
    claim: 'Sound system rental 2026: a basic two-speaker system with one mixer is about $200-500 for a half day; larger event configurations $800-2,000 a day with delivery and setup; hourly rental $40-120 an hour plus a one-time delivery and setup fee. Full-service event sound runs $500-5,000+ depending on size and crew.',
  },
  'pa-rental-local-2026': {
    org: 'Regional PA and speaker rental listings - per-day rates (listing - figures read from search results)',
    url: 'https://miamisoundrental.com/speaker-rental',
    fetched: '2026-08-18',
    claim: 'Local speaker rental 2026: from $60 per 24 hours at the budget end; a pair of JBL PRX715 powered speakers about $220 a day. Self-collected local rental undercuts full-service event sound substantially because there is no crew or setup fee.',
  },
  'lawngames-rental-2026': {
    org: 'US yard and lawn game rental providers - per-game day rates (listing - figures read from search results)',
    url: 'https://northsportrentals.com/product/cornhole-board-game-rentals/',
    fetched: '2026-08-18',
    claim: 'Cornhole rental 2026: $30 for the first day and $5 for each additional day. Additional games beyond a package (ladder toss, giant Jenga, giant Connect 4) are about $25 each.',
  },
  'lawngames-package-2026': {
    org: 'Wonderfly Games lawn-game rental minimums (listing - figures read from search results)',
    url: 'https://www.wonderflygames.com/lawn-games/',
    fetched: '2026-08-18',
    claim: 'Lawn-game rental order minimums 2026: $110 for pickup and $385 for delivery, with most customers meeting the delivery minimum by taking 3-4 individual games or a party-pack bundle. DELIVERY IS THE STEP CHANGE - a backyard host collecting two games pays the pickup tier, not the delivery one.',
  },
  'signage-print-2026': {
    org: 'Go Big Signs, "Custom Sign Cost Guide: How Much Do Custom Signs Cost in 2026" (listing - figures read from search results)',
    url: 'https://gobigsigns.com/blogs/display-guides/custom-sign-cost-guide',
    fetched: '2026-08-18',
    claim: 'Printed signage 2026. FOAM BOARD $20-50 per square foot: an 18x24in sign $15-30, a 4x8ft trade-show display $150-400 - indoor only, since UV yellows it within 3-6 months. VINYL BANNERS on 13oz or 18oz with hemmed edges and grommets $50-200: a 3x6ft full-colour banner $60-120, an 8x10ft large-format $150-400, lasting 1-2 years outdoors before fading. YARD SIGNS on 4mm UV-resistant corrugated plastic last about a year outdoors.',
  },
  'dips-retail-2026': {
    org: 'Walmart and H-E-B dip, hummus and salsa listings, 2026 (listing - figures read from search results)',
    url: 'https://www.walmart.com/browse/food/shop-all-hummus-dips-salsas/976759_976789_7056897_6173058',
    fetched: '2026-08-18',
    claim: 'Dips at retail 2026: H-E-B chile con queso 8oz $0.97; H-E-B roasted red pepper hummus 16oz $3.97 and roasted garlic hummus 16oz $6.67; H-E-B chef-prepared spinach dip 16oz $4.97; Freshness Guaranteed guacamole 8oz $3.02 and 15oz $5.27; Wholly homestyle guacamole 16oz $5.97; Sabra classic guacamole 14oz $6.58. Per 2oz serving that is roughly $0.12-0.83 depending on the dip.',
  },
  // -- PANTRY STAPLES AND FRYING OIL (registered 2026-08-18) ------------------
  // The staple carbohydrates and legumes that anchor the cookout, boil and
  // Karamu tables, plus the oil a fish fry actually consumes. Both are BLS or
  // per-gallon retail, which matches how those rows are banded.
  'bls-staples-2026': {
    org: 'US Bureau of Labor Statistics CPI Average Price Data via FRED — white long-grain rice (APU0000701312) and dried beans, any type (APU0000714233), with other June 2026 staples (listing - figures read from search results)',
    url: 'https://fred.stlouisfed.org/series/APU0000714233',
    fetched: '2026-08-18',
    claim: 'BLS US city average: white long-grain uncooked rice $1.09/lb (June 2026); dried beans, any type, all sizes $1.704/lb (February 2026). Other June 2026 staples for context: eggs $2.14 a dozen, ground beef $6.83/lb, chicken breast $4.18/lb, milk $4.32 a gallon. Organic heirloom dried beans are a premium tier at $4.00-6.50/lb and are not this series.',
  },
  'frying-oil-2026': {
    org: 'US cooking-oil price guides with per-gallon and per-ounce figures, 2026 (listing - figures read from search results)',
    url: 'https://latestcost.com/vegetable-oil-cost-pricing-united-states/',
    fetched: '2026-08-18',
    claim: 'Frying oil 2026 by the gallon: standard vegetable oil $6-14 retail and $5-9 in bulk; soybean oil $7-9. PEANUT oil is dearer - a 1-gallon jug of standard refined runs $15-19 (Great Value 1gal about $18.24, roughly $0.14/oz), with small bottles far worse per ounce (LouAna 24oz $14.95, about $0.62/oz) and cold-pressed premium above $0.60/oz. Bulk specialty oils are $25+ a gallon.',
  },
  'butter-bls-2026': {
    org: 'US Bureau of Labor Statistics CPI Average Price Data, butter (stick) per pound (series APU0000FS1101), via FRED, with USDA National Dairy Products Sales wholesale (listing - figures read from search results)',
    url: 'https://fred.stlouisfed.org/series/APU0000FS1101',
    fetched: '2026-08-18',
    claim: 'BLS average retail butter (stick) $4.314 per pound through February 2026, against $4.408 in December 2025. USDA wholesale Grade AA averaged $1.64 per pound for the week ending 2026-07-18 - the retail-to-wholesale gap is large for this commodity.',
  },
  // -- SAFETY EQUIPMENT (registered 2026-08-18, researched in parallel) -------
  // CLASS K IS NOT PRICED HERE and that is load-bearing. A 1-A:10-B:C household
  // extinguisher covers class B; a class K wet-chemical unit is a commercial
  // kitchen product at a materially higher price, and no figure for one was
  // found. Any row naming "B/K" is therefore grounded on its B half only, which
  // its claim states rather than implying the pair is covered.
  // -- CRAB-TABLE GOODS AND CULTURAL OBJECTS (2026-08-18, parallel research) --
  // The cultural entries deliberately cite COMMUNITY AND SPECIALIST retailers.
  // A kinara is not "a candle holder" and injera is not "flatbread"; pricing
  // either from a generic substitute would be wrong about the object as well as
  // the number.
  // -- GLASSWARE AND COCKTAIL GARNISH (2026-08-18, parallel research) ---------
  // -- PANTRY, PRODUCE AND APPETIZERS (2026-08-18, parallel research) ---------
  // Two cautions carried from the research and worth keeping in front of anyone
  // reading these:
  //
  //   1. PUBLISHER MARKUP IS SYSTEMATIC, NOT NOISE. The identical 13.7oz Ritz
  //      box was $3.99 at Target and $8.99 at a delivery grocer - 2.25x. The
  //      channel matters more than the figure.
  //   2. USDA AMS FEATURE PRICES ARE ADVERTISED, NOT SHELF. They are promotional
  //      by construction and sit below everyday shelf; sweet potatoes moved
  //      $0.78 to $1.05 in a single week.
  // -- PARTY FAVORS, SASHES AND GAME PACKS (2026-08-18, parallel research) ----
  // BLANK AND CUSTOM-PRINTED ARE KEPT APART throughout. Printing roughly doubles
  // to triples the per-unit cost at similar volume, and a row that buys blank
  // favors must not be priced from a personalised listing.
  // -- AV, LIGHTING AND WAREHOUSE TRAYS (2026-08-18, parallel research) -------
  // Two channel warnings carried from the research. Warehouse-versus-delivery
  // markup on the IDENTICAL SKU ran 24% on cookies and 36% on jerky. And a
  // "serves N" on a party platter is a retailer or journalist ESTIMATE, not a
  // countable unit - one fetched article documents a platter sold as feeding 20
  // that fed 12.
  // -- HOST HOME SETUP (2026-08-18, parallel research) ------------------------
  // The glove figures carry a 4x CHANNEL gap at the same count, and the
  // contractor-bag figures separate true 3-mil from consumer "contractor" bags
  // whose mil is not stated. Both distinctions are in the claims that use them.
  // -- MEETING SUPPLIES, GAMES AND REVEAL ITEMS (2026-08-18) -----------------
  // Split into its two publishers deliberately. Collapsing them into one entry
  // made a row citing "both" look single-sourced to the >=2 policy, which is
  // exactly the check that caught it — the evidence was always two publishers.
  // -- SWAG, HYDRATION AND FIRST-AID CONSUMABLES (2026-08-18) -----------------
  // PACKET IS NOT TABLET. The office channel sells pain relievers and antacids
  // as PACKETS OF TWO, the foodservice channel sells loose tablets, and the two
  // look identical in a listing. Every figure below states which unit it is.
  // -- PREPARED MEAT, BBQ, CATERING AND REGISTRATION KIT (2026-08-18) ---------
  // PREPARED IS NOT RAW, and this block exists because that distinction retired
  // a recorded mismatch. A carved-meat row banded at $6-16/lb looked wrong
  // against raw ham at $2.25/lb; against DELI-COUNTER cooked sliced meat at
  // $14.99/lb it is correct. The row was pricing a different product all along.
  // -- SINGLE-SERVE AND RTD BEVERAGE FORMATS (2026-08-18) ---------------------
  // THIS ENTRY RESOLVED FIVE RECORDED MISMATCHES. Seven "drinks band reads high"
  // findings rested on multipack arithmetic: soda at $0.25-0.60 a can from a
  // 12-pack, water at $0.13-0.25 a bottle from a 24-pack. A single 20oz bottle
  // bought on its own is $2.29-3.39 - two to three times the multipack unit -
  // and ready-to-drink juice is $0.69-0.88 a serving against $0.60 for
  // reconstituted concentrate. The bands were pricing a format nothing in the
  // registry covered. They were right; the comparison was wrong.
  // -- WEDDING AND PROPOSAL ITEMS (2026-08-18) -------------------------------
  // A PLAIN BAND AND AN ENGAGEMENT RING ARE AN ORDER OF MAGNITUDE APART and are
  // kept in separate claims. Blending them would put a centre stone into a row
  // that buys two metal bands.
  // -- SPICES, SEASONINGS AND CULTURAL DRINKS (2026-08-18) --------------------
  // THE SPICE BLOCK RETIRED A MISMATCH. The seasoning rows were flagged because
  // a 6oz Old Bay tin works out to $15.97/lb. At the sizes these rows buy - 24oz
  // containers and 5-7.5lb bulk - the same product is $4.30-7.33/lb. The bands
  // were right; the tin was the wrong evidence.
  //
  // TWO CAUTIONS ESTABLISHED HERE. Small containers carry a 1.9-3.1x per-pound
  // premium over bulk for the identical commodity. And CASE PRICING IS NOT
  // RELIABLY CHEAPER - one supplier's per-bottle case rate exceeded another's
  // single-unit rate for Old Bay, garlic powder and black pepper alike.
  // -- SNACK FORMATS AND CHAIN PIZZA (2026-08-18) ----------------------------
  // A PRIOR FINDING OF THIS SESSION WAS WRONG AND IS CORRECTED HERE. An earlier
  // agent concluded that no chain publishes a national pizza price and that
  // every figure available was a third-party aggregator's self-described
  // average. A second agent, told to accept only a primary source, found that
  // Domino's and Papa John's BOTH publish national promotional prices in their
  // own press releases, and Papa Murphy's publishes take-and-bake prices on its
  // own site. What survives is narrower and still true: no chain publishes an
  // A-LA-CARTE national menu price - a large pepperoni's everyday price is
  // store-set.
  'snacks-format-2026': {
    org: 'Target, FoodMaxx, WebstaurantStore and FoodServiceDirect snack listings (all fetched)',
    url: 'https://www.target.com/p/lay-39-s-classic-potato-chips-13oz/-/A-13335441',
    fetched: '2026-08-18',
    claim: 'Snack FORMAT changes the per-ounce cost several-fold. CHIPS: a 13oz party bag $4.99-5.19 ($0.38-0.40/oz, about $6.14-6.39/lb, close to the BLS all-chips average of $6.56/lb); a single 2.5oz impulse bag $2.79 ($1.12/oz, $17.86/lb) - 2.8x the party bag; a 10-count 1oz multipack $6.19 ($0.62/oz); foodservice cases $0.65-0.68/oz. PRETZELS cheapest at $0.25-0.27/oz. PARTY MIX $0.29-0.31/oz party size, $0.37-0.43 single-serve. POPCORN dearest per ounce at $0.51-0.75 because the bag is light for its volume - plan it by volume, not weight. NUTS $0.59-0.78/oz. JERKY $1.44-2.25/oz, and the SAME 8oz SKU differed 57% between two publishers.',
  },
  'pizza-chain-primary-2026': {
    org: "Domino's Pizza Inc. and Papa John's International official press releases, with Papa Murphy's own site (all fetched)",
    url: 'https://ir.papajohns.com/news-events/news-releases/detail/644/dont-settle-for-less-papa-johns-delivers-better-for-just-9-99',
    fetched: '2026-08-18',
    claim: 'Chain pizza 2026 from PRIMARY sources only. Dominos Mix and Match: any two or more menu items including a two-topping pizza at $6.99 each (company press release 2026-08-11, with an explicit "prices higher for some locations" disclaimer). Papa Johns create-your-own large $9.99 with up to seven toppings (investor-relations release 2025-12-01, participating locations). Papa Murphys take-and-bake large two-topping $10.99 ($14.99 Alaska) and Ultimate Pepperoni large $9.99 on its own site. THESE ARE NATIONALLY ADVERTISED DEAL PRICES, NOT MENU PRICES - no chain publishes an a-la-carte national price. Every aggregator figure was excluded.',
  },
  'frozen-pizza-2026': {
    org: 'Target and FoodMaxx frozen pizza listings (both fetched)',
    url: 'https://www.target.com/p/digiorno-wood-fired-pepperoni-frozen-pizza-15-7oz/-/A-94415304',
    fetched: '2026-08-18',
    claim: 'Frozen pizza 2026: a 15.7oz wood-fired pepperoni $6.49 ($0.41/oz) against a 24.7oz rising crust $7.29 ($0.30/oz) - 57% more food for 12% more money, so a thin frozen pie is the wrong unit for feeding a crowd. Two 24.7oz pies at $14.58 buy about 49oz against a $10.99 large take-and-bake, which wins on cost per fed guest.',
  },
  'buffet-equipment-2026': {
    org: 'Target, Ace Hardware and WebstaurantStore listings for slow cookers and warming trays (all fetched)',
    url: 'https://www.target.com/p/crock-pot-6qt-programmable-cook-38-carry-slow-cooker-black/-/A-13697382',
    fetched: '2026-08-18',
    claim: 'Buffet equipment PURCHASE 2026: a 6-quart programmable slow cooker with a locking transport lid is $54.99-74.99 across two brands ($9.17-12.50 a quart). A consumer electric warming tray is $64.99 (1500W, dry glass surface); a commercial countertop warmer is $79.99 but is a wet-well bain marie needing food pans sold separately, with the manufacturer disclaiming residential warranty - the two are NOT substitutes.',
  },
  'picks-toothpicks-2026': {
    org: 'Target and WebstaurantStore listings for toothpicks and cocktail picks (all fetched)',
    url: 'https://www.webstaurantstore.com/choice-2-1-2-unwrapped-round-wooden-toothpicks-box/500UWTPICK.html',
    fetched: '2026-08-18',
    claim: 'Picks 2026. TOOTHPICKS: a foodservice box of 1,000 is $6.49 ($0.0065 each), $4.49 at 2+ boxes; a decorative retail 250-count $3.79 ($0.0152 each) - 2.3-3.4x dearer and a frill-style pick rather than plain. COCKTAIL PICKS: disposable bamboo $0.09 each in a 100-count and $0.062 in a 1,200-count case; reusable stainless $13.99 for six ($2.33 each) as a one-time buy. Disposable and reusable are different cost structures and should not be blended.',
  },
  'seasoning-bulk-2026': {
    org: 'WebstaurantStore, Batavia Restaurant Supply and Win Depot listings for Old Bay and J.O. crab seasoning (all fetched)',
    url: 'https://www.webstaurantstore.com/old-bay-24-oz-seasoning/102OB3218.html',
    fetched: '2026-08-18',
    claim: 'Crab seasoning 2026, container size stated. OLD BAY 24oz: $10.99 ($7.33/lb), $13.95 ($9.30/lb) and $10.00 ($6.67/lb) at three suppliers; a 7.5lb jug $39.49 ($5.27/lb); a 6-per-case of 24oz $99.95 ($11.10/lb - DEARER per pound than a single unit). J.O. NO. 2: a 5lb foodservice container $21.49 ($4.30/lb); consumer bottles 16oz $8.10 ($8.10/lb) and 32oz $11.80 ($5.90/lb), an 88% premium for the small bottle. Old Bay spans $5.27-11.10/lb for the identical product.',
  },
  'spicerack-bulk-2026': {
    org: 'WebstaurantStore, FoodServiceDirect, All Bulk Foods and Oasis Supply listings for salt, pepper, garlic, paprika and blends (all fetched)',
    url: 'https://www.webstaurantstore.com/regal-garlic-powder-5-lb/10200064.html',
    fetched: '2026-08-18',
    claim: 'Spice-rack staples 2026, per pound with container size. SALT: Morton iodized 25lb $11.49-22.99 across three publishers ($0.46-0.92/lb, a 2x spread at identical size). BLACK PEPPER is dearest: 18oz $19.99 ($17.77/lb). GARLIC POWDER: 5lb $27.99 ($5.60/lb) against 21oz $14.99 ($11.42/lb) and a case at $17.52/lb - 3.1x for one commodity. PAPRIKA: 5lb $20.99 ($4.20/lb) against a case at $12.59/lb - 3.0x. CAJUN BLEND 5lb $22.99 ($4.60/lb). BBQ RUB 27oz $22.49 ($13.33/lb); marinade 30oz $14.49 ($7.73/lb).',
  },
  'vinegar-hotsauce-oil-2026': {
    org: 'WebstaurantStore and FoodServiceDirect listings for vinegar, hot sauce and oil (all fetched)',
    url: 'https://www.webstaurantstore.com/heinz-1-gallon-apple-cider-vinegar/999HNZ8270.html',
    fetched: '2026-08-18',
    claim: 'Liquids by the gallon 2026. APPLE CIDER VINEGAR: Woebers $5.99 a gallon ($0.047/fl oz) against Heinz $19.11-23.49 ($0.149-0.184) - a 4x BRAND spread at identical size. HOT SAUCE: Franks RedHot 1 gallon $19.49 ($0.152/fl oz), $14.00 in a 4-case ($0.109). COOKING OIL: a 32oz bottle $6.97 ($0.218/fl oz) against bulk 35lb fry oil at $0.08-0.09/oz - a 2.4-2.7x premium for the small bottle.',
  },
  'sorrel-caribbean-2026': {
    org: 'Caribbean Supercenter, Enerem African Foods and Pats Exotic Beverages - Caribbean, West African and Black-owned specialist retailers (all fetched except H-E-B, search-results)',
    url: 'https://caribbeansupercenter.com/grace-tropical-rhythms-sorrel-ginger-16-fl-oz/',
    fetched: '2026-08-18',
    claim: 'Sorrel and hibiscus 2026, and FORM CHANGES THE COST BY AN ORDER OF MAGNITUDE. READY-TO-DRINK: a 16oz bottle $1.89-2.78, about $0.95-1.39 an 8oz serving; a craft Black-owned bottling $5.00. DRIED FLOWER for brewing: 3.5oz $1.79 ($8.18/lb) and 8oz $5.50 ($11.00/lb) - a batch takes roughly 1-2oz a gallon, so one 8oz bag covers several gallons and works out to cents a serving. Never price a dried-flower line from a ready-to-drink bottle.',
  },
  'aguasfrescas-2026': {
    org: 'MexGrocer and MexMax Latin grocery listings, with Price Rite and The Fresh Grocer for powdered mixes (all fetched except two search-results figures)',
    url: 'https://www.mexgrocer.com/products/klass-horchata-drink-mix-makes-8-6-liters',
    fetched: '2026-08-18',
    claim: 'Powdered drink mixes 2026. HORCHATA and TAMARINDO: a 14.1oz Klass packet is $6.95 retail and makes 8.6 litres, about 36 8oz servings - roughly $0.19 a serving; case pricing works out to $5.32-5.83 a unit and is wholesale, not shelf. KOOL-AID: an unsweetened packet is $0.35-0.47 and makes 2 quarts once the host adds a cup of sugar, about $0.04-0.06 a serving BEFORE sugar; a 19oz sugar-sweetened canister is $3.84-4.79 for about 18 servings, $0.21-0.27 each. The packet and the canister are not interchangeable - one needs sugar and the other does not.',
  },
  'greencoffee-2026': {
    org: 'Coffee Bean Corral and Deans Beans green-coffee listings (both fetched)',
    url: 'https://www.coffeebeancorral.com/categories/Green-Coffee-Beans/African/Ethiopia.aspx',
    fetched: '2026-08-18',
    claim: 'GREEN (unroasted) Ethiopian coffee 2026: $8.85-12.75 a pound in 1lb quantities - organic Konga Yirgacheffe $9.25, Limu $8.85, Durato Bombe Sidamo $12.15, Worka Sakaro $12.75, and organic Yirgacheffe $9.85 at a second roaster. Green loses about 15-18% of its weight in roasting, so a pound of green yields about 0.83lb roasted and the per-roasted-pound cost runs above the green price.',
  },
  // -- KENTE, TIARAS AND PRIZES (2026-08-18) ---------------------------------
  // THREE ITEMS IN THIS RESEARCH WERE REFUSED RATHER THAN SUBSTITUTED, and that
  // refusal is the reason to trust what is here. Fandisha (ceremony popcorn) had
  // no US listing as a sold product - only generic popcorn kernels, which is a
  // substitute, so it is not priced. Ketema strewing grass likewise: only
  // florist ornamental grass had published prices, and it is reported under its
  // own name below rather than as ketema. Tena adam reached only one US
  // publisher. Each is a gap, not a number.
  // -- CONSUMER KRAFT, CANDLES, BADGES AND PRINT (2026-08-18) ----------------
  // THE KRAFT ENTRY RETIRED A MISMATCH. The table-cover rows were flagged
  // against 40lb BLEACHED WHITE butcher paper in 700-1,000ft foodservice rolls
  // at $0.054-0.073 a linear foot. A host does not buy those. Consumer
  // natural-brown kraft is $0.24-0.25 a linear foot - four times the
  // foodservice grade - which is what the bands were pricing.
  //
  // BASIS WEIGHT IS DELIBERATELY NOT CLAIMED: neither consumer page states one,
  // so these are "natural brown kraft, basis weight unstated" rather than 30lb.
  // -- RAW PROTEINS AND PRODUCE (2026-08-18) ---------------------------------
  // THIS RETIRED TWO MISMATCHES. The brisket and BBQ rows were flagged against
  // SMOKED BBQ BY THE POUND at $17.99-34.49 - restaurant output. A whole packer
  // is bought RAW at $3.00-5.99/lb and the host smokes it. Same animal, same
  // word, 3-7x apart, and the bands were pricing the raw cut.
  //
  // USDA AMS FIGURES ARE ADVERTISED FEATURE PRICES, not shelf prices, and run
  // systematically below shelf - onions are $0.87/lb advertised against $1.50/lb
  // at a shelf. Every AMS figure below is labelled as such.
  'brisket-raw-2026': {
    org: 'USDA AMS Weekly Grocery Store Beef Feature Activity (AMS_3228, 2026-08-14) with two BBQ industry price guides (all fetched)',
    url: 'https://www.ams.usda.gov/mnreports/AMS_3228.pdf',
    fetched: '2026-08-18',
    claim: 'RAW whole-packer brisket 2026, per pound of raw weight. USDA AMS advertised feature: $5.99/lb this week across 189 stores (Choice and ungraded alike), against $4.57 last week and $5.06 last year; brisket FLAT is dearer at $7.79-11.08. Warehouse and grocery everyday pricing runs below that: Choice $3.00-4.00 at the clubs, $3.50-5.00 at grocery; Prime $4.00-6.00; local butchers $5.00-7.00; online $9.00-12.00. FINISHED SMOKED BRISKET FROM A RESTAURANT IS A DIFFERENT PRODUCT at $14.50-40/lb, roughly 3-7x the raw packer.',
  },
  'produce-ams-shelf-2026': {
    org: 'USDA AMS FVWRETAIL (2026-08-14) with Target shelf listings (both fetched)',
    url: 'https://www.ams.usda.gov/mnreports/fvwretail.pdf',
    fetched: '2026-08-18',
    claim: 'Produce 2026, ADVERTISED against SHELF. ONIONS yellow: $0.87/lb advertised (365 ads) and a 3lb bag $3.19 ($1.06/lb), against a shelf 3lb bag at $4.49 ($1.50/lb) - the feature price runs well below shelf. GARLIC: $1.37 a sleeve advertised, with a 3-bulb bag at $1.99 shelf ($0.66 a head); the AMS report does not define bulbs per sleeve so no per-head conversion is safe from it. MUSHROOMS: cremini and white 8oz $1.76-1.77 advertised ($3.52-3.54/lb), shelf 8oz $1.89 ($3.78/lb). STRAWBERRIES: a 1lb package $3.10 advertised and 2lb $5.09 ($2.55/lb); BLS prices a 12oz dry pint at $2.404 (July 2026), about $3.21/lb equivalent.',
  },
  'pantry-canned-2026': {
    org: 'BLS CPI Average Price series via FRED CSV with Target shelf listings (both fetched)',
    url: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=APU0000714221',
    fetched: '2026-08-18',
    claim: 'Pantry staples 2026. CANNED CORN: BLS $1.284/lb of can contents (July 2026, series APU0000714221); a store-brand 15.25oz can $0.89 ($0.934/lb). DRIED BEANS: BLS $1.689/lb (APU0000714233); shelf 1lb packs $1.29-1.99 and a 4lb bag $3.99 ($1.00/lb). CANNED BEANS: store-brand 15.5oz $0.99-1.16 ($1.02-1.20/lb of contents), branded $1.58-1.79 ($1.63-1.85/lb). NOTE the BLS canned-bean series was DISCONTINUED in January 1986, so there is no current government anchor for canned beans.',
  },
  'brunch-prepared-2026': {
    org: 'Target, Instacart and two catering counters for quiche, tea sandwiches and lasagna (all fetched)',
    url: 'https://kenricks.com/market/assorted-triangle-tea-sandwich-tray/',
    fetched: '2026-08-18',
    claim: 'Prepared brunch items 2026. MINI QUICHE: a 12-count 6.25oz pack $5.99 ($0.50 a piece); a 72-count warehouse pack $23.50 on a delivery platform ($0.33 a piece, platform markup included). TEA SANDWICHES: a 40-triangle deli tray $39.99 serving 15-20 ($1.00 a piece) against a specialist tea caterer at $180.00 for 60 ($3.00 a piece) - a 3x spread that is real product differentiation, not noise. VEGETABLE LASAGNA: $5.40-10.59 a pound across brands ($12.99 for 26oz, $10.79 for 32oz, $6.29 for 9.5oz); NO fetched source stated a serving count, so no per-serving figure can be derived without inventing a portion.',
  },
  'kraft-consumer-2026': {
    org: 'Target (Wrapables) and Hobby Lobby (Pacon) consumer kraft roll listings (both fetched)',
    url: 'https://www.hobbylobby.com/art-supplies/project-supplies/classroom-supplies/natural-kraft-paper-roll/p/80771885',
    fetched: '2026-08-18',
    claim: 'CONSUMER natural-brown kraft paper 2026, basis weight unstated on both pages. A 48in x 25ft heavyweight roll $5.99 ($0.24 a linear foot, $0.060 a square foot); a 12in x 100ft roll $24.99 ($0.25 a linear foot, $0.250 a square foot). THE WIDTHS DIFFER 4x so the linear-foot agreement is coincidence - for covering a table the 48in roll is the relevant unit. A 40lb bleached-white foodservice roll at 30in is $0.054-0.073 a linear foot, about a quarter the consumer rate, and is sold in 700-1,000ft lengths.',
  },
  'newsprint-2026': {
    org: 'WebstaurantStore and U-Haul newsprint listings (both fetched)',
    url: 'https://www.webstaurantstore.com/lavex-18-x-1-440-30-lb-newsprint-packing-paper-roll/442NP1890.html',
    fetched: '2026-08-18',
    claim: 'Newsprint 2026. ROLLS: 18in x 1,440ft 30lb $35.49 ($0.0247 a linear foot); 24in x 1,200ft 30lb $30.99 ($0.0258 a foot). SHEETS: a 200-sheet box of 24x30in $19.99 (1,000 sq ft, $0.0200 a sq ft); a 100-sheet box $16.95 ($0.0339 a sq ft). Rolls and pre-cut sheet boxes are different form factors and should not be blended.',
  },
  'birthdaycandles-lighters-2026': {
    org: 'Target, Oasis Supply, Ace Hardware and Zippo listings (all fetched)',
    url: 'https://www.target.com/p/celebration-candles-24ct-favorite-day-8482/-/A-81917107',
    fetched: '2026-08-18',
    claim: 'Birthday candles and lighters 2026. CANDLES - thin striped wax, a distinct product from pillars, votives or LEDs: a 24-count retail pack $1.19 ($0.05 each); a 24-count wholesale pack $0.69 ($0.029 each). LIGHTERS: a disposable butane multi-purpose lighter $4.19-5.59; a refillable flex-neck lighter $26.95 shipped unfilled, a different class needing fuel separately.',
  },
  'namebadges-adhesive-2026': {
    org: 'Quill and Avery direct listings for adhesive name badges (both fetched)',
    url: 'https://www.avery.com/products/name-badges/5395',
    fetched: '2026-08-18',
    claim: 'Adhesive name badges 2026, 2-1/3 x 3-3/8in. A 400-count box is $57.19 at an office e-tailer (its own page states $0.14 each) and $42.99 direct from the manufacturer ($0.107 each). A 160-count box is $29.99 and $24.99 respectively ($0.187 and $0.156), but the smaller direct price is PROMOTIONAL against a $41.25 regular ($0.258 each). The 400-count is the cheaper unit and the more stable figure.',
  },
  'reeddiffuser-2026': {
    org: 'Target, P.F. Candle Co. direct and EarthHero reed diffuser listings (all fetched)',
    url: 'https://www.target.com/p/6-1fl-oz-reed-diffuser-threshold/-/A-1011935405',
    fetched: '2026-08-18',
    claim: 'Reed diffusers 2026 in two tiers about 5.7x apart per ounce: mass retail $10.00 for 6.1 fl oz ($1.64 a fluid ounce); specialty brand $32.99-33.00 for 3.5 fl oz ($9.43 an ounce, lasting 2-3 months with seven rattan reeds). Do not average the tiers.',
  },
  'print-booklets-2026': {
    org: 'Summit Printing published booklet price list, with PrintingCenterUSA as a corroborating band (both fetched)',
    url: 'https://www.summitprintingpro.com/multi-page/booklet-price-list.html',
    fetched: '2026-08-18',
    claim: 'Saddle-stitched booklets and programs 2026, from a PUBLISHED price list (most US printers are calculator-only). Half-page 5.5x8.5in, 8 pages: $227 for 50 ($4.54 each), $252 for 100 ($2.52), $356 for 200 ($1.78), $451 for 250 ($1.80). Full-page 8.5x11in, 8 pages: $241 for 50 ($4.82), $292 for 100 ($2.92), $532 for 250 ($2.13). A second printer states about $5 a booklet for 100 at 60 pages and a $2-25 range for one-offs, hedged with "about" on its own page.',
  },
  'print-binding-dividers-2026': {
    org: 'Gorham Printing published book-price charts, with Quill and Global Industrial for dividers (all fetched)',
    url: 'https://gorhamprinting.com/prices-book-printing/price-charts.html',
    fetched: '2026-08-18',
    claim: 'Bound documents 2026. SPIRAL-BOUND BOOKS, per book at 100 copies: 5.5x8.5in black-and-white $5.70 at 50 pages, $8.59 at 150, $13.32 at 300; 8.5x11in $6.94 at 50 pages and $20.86 at 300; colour interiors $12.09 at 50 pages. Premium coil adds $0.55 a book and wire-o about $0.15. NO PUBLISHER QUOTES BELOW 100 COPIES - every other US printer checked is calculator-only - so a 10-50 book run cannot be priced from published rates. TABBED DIVIDERS: an 8-tab insertable set $3.75-7.79 ($0.47-0.97 a tab).',
  },
  'tablenumbers-holders-2026': {
    org: 'WebstaurantStore, GoFoodService, Quill and Global Industrial (all fetched)',
    url: 'https://www.webstaurantstore.com/choice-1-to-25-plastic-table-number-set/176NUMC125.html',
    fetched: '2026-08-18',
    claim: 'Table numbers and badge holders 2026. PLASTIC TABLE NUMBER SETS: 1-25 $1.99-5.49, 1-50 $3.99-7.98, 1-100 $7.99-14.35 - about $0.08-0.22 a number. STAINLESS tents are an order of magnitude higher at $42.99-89.45 a set ($0.86-2.49 a number). RIGID BADGE HOLDERS: $14.75-37.49 per 50 ($0.295-0.75 each) across a proximity holder and a vinyl sleeve - different constructions, carry as a range. Easels are about $7.50 each in a 12-pack.',
  },
  // Split into cards and dominoes. Aggregated as one id, a row citing both read
  // as single-sourced to the >=2 policy — the fourth time that gate has caught
  // me collapsing publishers into one registry line.
  'playingcards-bulk-2026': {
    org: 'ClassicDecks card-specialist bulk listings and Quill office channel (both fetched)',
    url: 'https://classicdecks.com/collections/bulk',
    fetched: '2026-08-18',
    claim: 'Playing cards 2026. A 12-deck brick: Maverick $16.99 ($1.42 a deck), Bicycle $26.99 ($2.25), Bee $48.00 ($4.00); a 6-deck half-brick of Bicycle Prestige $59.99. The OFFICE CHANNEL is dearer: six 52-card decks $33.89 ($5.65 each), about 2.5x the card-specialist brick rate. Clipboards from the same channels: $3.00 each at a 12-unit minimum and $4.69 at an 8+ tier.',
  },
  'dominoes-education-2026': {
    org: 'Didax and Nasco Education double-six domino listings (both fetched)',
    url: 'https://www.nascoeducation.com/dominoes-double-six-pk-28-tb15635.html',
    fetched: '2026-08-18',
    claim: 'Double-six dominoes 2026: a 28-tile set $2.25 at one education supplier; a 168-tile pack of six sets $15.00 at another ($2.50 a set). The two agree closely at about $2.25-2.50 a standard set.',
  },
  'kente-specialist-2026': {
    org: 'Africa Imports and Bynelo, African-goods specialist retailers, with Sankofa Edition (Black-owned) for stoles (all fetched)',
    url: 'https://africaimports.com/kente-scarftable-runner-1/',
    fetched: '2026-08-18',
    claim: 'Kente 2026 from specialist retailers. TABLE RUNNERS: a 12x44in premium kente scarf/runner $7.90 retail ($4.95 wholesale, 16.67% off at 12+); a full-length 70-90in linen kente runner $46.00. These are different product classes - a short scarf against a table-length runner - and should not be averaged. STOLES: authentic handwoven kente graduation stoles $24.87-35.18 each from a Black-owned specialist.',
  },
  'tiaras-prizes-2026': {
    org: 'CB Flowers & Crafts, Oriental Trading and Carnival Savers (all fetched)',
    url: 'https://www.cbflowerscrafts.com/gold-jeweled-tiara-party-favor-pack-of-12-plastic-crowns/',
    fetched: '2026-08-18',
    claim: 'Tiaras and prizes 2026, sold standalone rather than bundled. TIARAS: a 12-pack of gold jewelled plastic crowns $8.30 ($0.69 each, 5.5in wide); sequin pastel 12-pack $14.38 ($1.20 each); foam princess 12-pack $5.78 ($0.48); a 48-piece bulk pack $30.58 ($0.64). PRIZES: a 100-piece mini toy assortment $17.98 on sale, $24.99 full ($0.18-0.25 a prize); a 572-piece carnival prize lot $84.95 (about $0.15 a prize).',
  },
  'florist-greenery-2026': {
    org: 'Blooms By The Box and FiftyFlowers wholesale florist listings (both fetched)',
    url: 'https://www.bloomsbythebox.com/greenery/assorted-fancy-grasses_7672/',
    fetched: '2026-08-18',
    claim: 'FLORIST ornamental grass foliage by the bunch 2026 - NOT fresh-cut lawn grass and NOT ketema strewing grass, for which no US retail price exists. Assorted fancy grasses $79.20 a box of 6 bunches at 10 stems each ($13.20 a bunch, $1.32 a stem); bulk fountain grass $179.99 for 5 bunches down to $404.99 for 20 ($20.25-36.00 a bunch at 5-8 stems each).',
  },
  'zawadi-blackowned-2026': {
    org: 'MahoganyBooks, Umoja Books, The Black Art Depot and Seven Symbols of Kwanzaa - all Black-owned retailers (all fetched)',
    url: 'https://www.mahoganybooks.com/9780593474235',
    fetched: '2026-08-18',
    claim: 'Zawadi gifts 2026 from Black-owned retailers, in TWO distinct classes. PER-GUEST gifts: heritage backlist and children titles $7.00-25.00 (Miseducation of the Negro $7.50, A Black History Reader $22.50, Introduction to Black Studies $31.95 at the top), Kwanzaa card sets $4.99-10.49, a kids activity book $10.99, small textiles $14.75-20.00. A new-release hardcover is $32.00. HOST PURCHASES are a separate class and much dearer: kinara sets $64.99-89.99, a unity cup $18.95, taper candles $24.99 - a symbol of the observance rather than a per-guest gift.',
  },
  'sweetpotatopie-benne-2026': {
    org: 'Sweet Teez Bakery (Black-owned, Boston), Not Just Cookies, Essentially Charleston and Lowcountry Olive Oil (all fetched)',
    url: 'https://www.sweetteezbakery.com/order/sweet-potato-pie',
    fetched: '2026-08-18',
    claim: 'Karamu desserts 2026. SWEET POTATO PIE: a 9in pie $30.00 and a 10in $29.99, cutting about 8 slices (~$3.75 a serving); minis $5.50 each ($66 a dozen) to $11.99 for a 6in. BENNE WAFERS: a 15oz gift tin $19.50-22.00 at two Charleston retailers reselling the same Olde Colony Bakery product, so that spread is retailer markup rather than two products; about $1.30-1.47 an ounce.',
  },
  'weddingrings-survey-2026': {
    org: 'The Knot 2026 Real Weddings Study (10,474 US couples) and Zola published ranges (both fetched)',
    url: 'https://www.theknot.com/content/average-wedding-cost',
    fetched: '2026-08-18',
    claim: 'Wedding jewellery 2026. PLAIN METAL BANDS, no stones: $150-700 per ring, with mens bands $400-1,000 and womens $600-1,800. WEDDING RINGS as a survey line: $3,000 (The Knot; the page does not state whether that is a pair). ENGAGEMENT RINGS WITH A CENTRE STONE are a different category entirely at a $4,600 survey average, or about $5,200 per an uncited industry figure - never to be blended with a band price.',
  },
  'proposal-items-2026': {
    org: 'The Box Sock and Soulmatebox slim ring-box listings (both fetched)',
    url: 'https://soulmatebox.com/',
    fetched: '2026-08-18',
    claim: 'Slim pocket proposal ring boxes 2026: $12.99 for super-slim black, cream, grey and blue models, $15.99 for a discreet slim black, $17.99 for a slim pocket grey. All priced each.',
  },
  // Two publishers, kept as two entries. A row citing "the petal research" as one
  // id reads as single-sourced to the >=2 policy — the third time that gate has
  // caught me collapsing publishers into a single registry line.
  'rosepetals-flyboy-2026': {
    org: 'Flyboy Naturals freeze-dried petal listings (fetched)',
    url: 'https://flyboynaturals.com/bridal-white-ivory-rose-petals-30-cups-preserved-freeze-dried-rose-petals-wedding-petals-from-flyboy-naturals/',
    fetched: '2026-08-18',
    claim: 'Flyboy Naturals 2026: bridal white/ivory freeze-dried petals, 30 cups (about 1,350 petals, ~45 a cup), $86.95; a one-cup sample $8.95; proposal pink $39.75 and blush ivory $42.25 with quantities not stated on the listing.',
  },
  'rosepetals-garden-2026': {
    org: 'Petal Garden real freeze-dried and silk petal listings (fetched)',
    url: 'https://store.petalgarden.com/products/rose-petals-real-bulk-budget-petals',
    fetched: '2026-08-18',
    claim: 'Petals 2026, quantity stated first. REAL freeze-dried: a one-cup sample $8.95; 5 cups $22.95; 30 cups $86.95 (about 1,350 petals, ~45 a cup); 100 cups budget $69.95. The seller guide puts coverage at half to one cup a guest and 2-4 cups a table. FAUX silk: $17.99-24.99 per 1,000-petal value pack, or $30.99 per 1,000 at a craft retailer. Faux is far cheaper per petal than real.',
  },
  'marquee-letters-2026': {
    org: 'TableclothsFactory and BacklitLEDsign for purchase; Lustre Event Rentals and ProLighting for rental (all fetched)',
    url: 'https://www.lustrerentals.com/marry-me-letter-rentals-in-los-angeles',
    fetched: '2026-08-18',
    claim: 'Marquee letters 2026, PRICED PER LETTER. PURCHASE: a 4ft pre-cut foam-board letter with battery LEDs $25.29; a metal industrial 4ft letter from $29.00 plus a separately sold transformer. RENTAL: $59-60 a character including delivery, setup and pickup, with weighted bases $10 each. A seven-character MARRY ME therefore runs about $177 to buy in foam or $413-420 to rent - both well above a single-sign price.',
  },
  'weddingstationery-2026': {
    org: 'Party City, Barnes & Noble and Oriental Trading listings for vow books and guest books (all fetched)',
    url: 'https://www.partycity.com/wedding-vow-books-2ct-992862.html',
    fetched: '2026-08-18',
    claim: 'Wedding keepsake stationery 2026. VOW BOOKS: $5.00 a 2-book set at a party retailer ($2.50 each) and $12.99 a set at a bookseller ($6.50 each). GUEST BOOK WITH PEN: $6.37 on clearance for a book-and-pen set, $16.99 personalised with a wood cover, $21.99-27.99 with a table sign; a book alone $5.57-14.99. A MARRIAGE LICENCE HOLDER could not be established - one fetched retailer at $35.00 and one marketplace listing of a different product form at $14.95 - so it is deliberately not priced here.',
  },
  'beverage-singleserve-2026': {
    org: 'Instacart storefront listings with Walgreens (Instacart fetched; Walgreens search-results after a 403)',
    url: 'https://www.instacart.com/products/16706881-coke-classic-soda-soft-drink-20-oza',
    fetched: '2026-08-18',
    claim: 'SINGLE-SERVE bought individually 2026: a 20oz Coca-Cola bottle is $2.29-3.39 depending on store ($0.17 a fluid ounce at one), against $2.99 at a pharmacy chain. For contrast a 12-pack of 12oz cans is $12.49, about $1.04 a can. A single bottle therefore costs two to three times the multipack unit and the two must never be interconverted.',
  },
  'juice-rtd-2026': {
    org: 'Instacart and Kroger listings for ready-to-drink juice (Instacart fetched; Kroger search-results after two timeouts)',
    url: 'https://www.instacart.com/products/16480535-tropicana-pure-premium-original-no-pulp-orange-juice-128-fl-oz',
    fetched: '2026-08-18',
    claim: 'READY-TO-DRINK juice 2026, which is NOT frozen concentrate. Tropicana 100% orange juice, 128oz gallon, $10.99-14.09 - about $0.69-0.88 per 8oz serving. A 52oz carton of Simply is $4.99-6.79 ($0.77-1.04 a serving). An orange juice DRINK such as SunnyD is a different product at $3.68-4.79 a gallon ($0.23-0.30 a serving). By comparison, BLS frozen concentrate reconstitutes to about $0.60 a glass, so ready-to-drink carries a real premium.',
  },
  'sparkling-na-2026': {
    org: 'Instacart, Target, Athletic Brewing direct and The Zero Proof (all fetched except Target, search-results after a 404)',
    url: 'https://athleticbrewing.com/collections/beer',
    fetched: '2026-08-18',
    claim: 'Sparkling and non-alcoholic 2026. SPARKLING WATER: LaCroix $4.19 a 6-pack ($0.70 a can) and $4.39 an 8-pack ($0.55); Topo Chico glass $20.79 a 12-pack ($1.73 a bottle). NA BEER: Athletic Brewing 6-packs $10.99 direct and $11.99 in store, i.e. $1.83-2.00 a can, holding at $1.83 in a 24-pack. CANNED MOCKTAILS are far dearer: a Ghia 4-pack is $19.50 ($4.88 an 8oz can) and premium canned cocktails $44-59 a 4-pack ($11.00-14.75 a can).',
  },
  'catering-coffee-2026': {
    org: 'Published menu figures for Dunkin, Panera and Starbucks 96oz coffee travellers, via menu aggregators (all fetched; the chains own catering pages could not be)',
    url: 'https://panerabreadmenus.us/catering',
    fetched: '2026-08-18',
    claim: 'Coffee for a crowd 2026: a 96 fl oz box or traveller is $22.99 at one chain (the only exact single-SKU figure), $22-31 and $20-25 as published ranges at two others. Each serves about 10-12 cups with cups, lids and condiments included, i.e. $1.67-2.08 a cup at 12 - materially above home-brewed coffee at $0.10-0.30 a cup. EVIDENCE CAVEAT: all three publishers are menu aggregators rather than the chains own ordering pages.',
  },
  'deli-prepared-meat-2026': {
    org: 'Schneiders Quality Meats (Waterloo, IL) deli counter and Corti Brothers (Sacramento, CA) catering menu (both fetched)',
    url: 'https://schneidersqualitymeats.com/store/product/deli-sliced-store-made-roast-beef',
    fetched: '2026-08-18',
    claim: 'PREPARED deli meat 2026: store-made cooked roast beef, deli-sliced, $14.99/lb. Meat trays serving 8-25 people run $89.99-119.99, i.e. $4.80-11.25 a head - those publish head counts but no weights, so no per-pound figure derives from them. This is cooked and sliced product, not raw meat: the same animal as a $2.25/lb spiral ham is a different purchase once a deli has cooked and cut it.',
  },
  'bbq-perpound-2026': {
    org: "Q Southern BBQ and Jim 'N Nick's Bar-B-Q published by-the-pound menus (both fetched)",
    url: 'https://qsouthernbbq.com/bbq-by-the-pound',
    fetched: '2026-08-18',
    claim: 'Smoked BBQ by the pound 2026, on COOKED weight: pulled pork $17.99-18.00 (the two publishers agree within a cent); brisket $22.00 against $34.49 - a divergence of more than half, and NOT a figure to average; turkey breast $19.99; sausage $15.99; pulled chicken $18.99. Ribs are sold per rack ($27-29.99), not per pound.',
  },
  'tacobar-catering-2026': {
    org: 'Senor Burrito Company and Tacos and Company published catering menus (both fetched)',
    url: 'https://senorburritocompany.com/catering',
    fetched: '2026-08-18',
    claim: 'Taco-bar catering 2026, per person. DROP-OFF: the two publishers agree tightly at $13.00 and $13.99 a head for two tacos with sides, rising to $16-17.99 for three. STAFFED IS A SEPARATE TIER: $25 a head for a live on-site cook with a server at one publisher, against a $1.00-a-head server upcharge at the other. Both exclude tax; delivery and setup are additional ($20 at one).',
  },
  'boxedlunch-restaurant-2026': {
    org: 'UC Berkeley Cal Dining and Indiana University Catering boxed-meal menus, with Numbeo US restaurant cost data (all fetched)',
    url: 'https://dining.berkeley.edu/wp-content/uploads/Berkeley-Box-menu_2026.pdf',
    fetched: '2026-08-18',
    claim: 'Prepared meals 2026. BOXED LUNCH drop-off: $18.95 a box (sandwich or salad, chips, drink, cookie) with a stated 20% delivery surcharge and $350 delivery minimum; a second caterer starts at $12 a box with a 10-box minimum. RESTAURANT: a three-course mid-range meal for two is $80 nationally (range $50-150), i.e. about $40 a head before drinks and tip. A NYC-only survey put a sit-down date for two at $122 before tax and tip - metro-specific and drinks-inclusive, not a national figure.',
  },
  // Split into PURCHASE and RENTAL. Collapsed into one entry, a row citing
  // "the registration research" looked single-sourced to the >=2 policy — the
  // second time that gate caught me representing four publishers as one.
  'registration-purchase-2026': {
    org: 'BarcodeFactory and Shopify Hardware Store listings for badge printers and scanners (both fetched)',
    url: 'https://www.barcodefactory.com/zebra/printers/zd621d',
    fetched: '2026-08-18',
    claim: 'Registration hardware PURCHASE 2026: a Zebra ZD621d direct-thermal badge printer $711.43 (203dpi) rising to $967.65 (300dpi with cutter); a DS2208 barcode scanner with cable and stand $208.40-209.00, or $178.20 bare without the cable it needs. EVIDENCE CAVEAT: the two printer publishers are both resellers quoting identical figures, which is one price level confirmed twice rather than two independent discoveries.',
  },
  'registration-rental-2026': {
    org: 'Meeting Tomorrow and JustAttend published event-registration rental figures (both fetched)',
    url: 'https://justattend.com/blog/rent-event-badge-printers-onsite-badge-printing',
    fetched: '2026-08-18',
    claim: 'Registration hardware RENTAL 2026: printers $50-200 a day depending on specification; a bundled printer, laptop-or-tablet and scanner about $410 an event, with delivery and collection $250 each per kiosk; equipment packages from $600. CONSUMABLES are separate - badge stock $199 per 500 or $110 per 250, ink about $120. Most event AV companies gate pricing behind a quote form and publish nothing.',
  },
  'shredding-service-2026': {
    org: 'Shred Nations and Viking Shred published pricing guides (both fetched)',
    url: 'https://www.shrednations.com/resources/cost-to-shred/',
    fetched: '2026-08-18',
    claim: 'Secure shredding 2026, on two bases that must not be mixed. PER POUND (drop-off): $0.99-1.50, the two publishers agreeing closely. PER VISIT OR PROJECT: on-site $100-175 and off-site $85-150 for roughly 1-10 boxes - a FLOOR price, so a three-box job and a nine-box job cost about the same and it must not be modelled per box. Ship-and-shred about $30 for a 30lb box. Neither publisher stated a box weight, so pounds do not convert to boxes here.',
  },
  'swagbags-blank-2026': {
    org: 'BagsInBulk and BagzDepot wholesale drawstring bag listings (both fetched)',
    url: 'https://bagsinbulk.com/collections/wholesale-drawstring-bags',
    fetched: '2026-08-18',
    claim: 'Blank drawstring bags 2026: 18in basic non-woven $1.10 a unit, dual-mesh-pocket $1.60, front-zippered $1.65; non-woven medium $1.98 and large $2.18 on sale; cotton canvas $2.18-3.78 depending on size. Non-woven polyester is the $1.10-2.18 band and cotton canvas the $2.18-3.78 band. Neither page published 25/50/100 break points.',
  },
  'promo-notebooks-2026': {
    org: 'Superior Promos and 4imprint promotional notebook listings (both fetched)',
    url: 'https://www.superiorpromos.com/pad-holders-portfolios-all/notebooks/journal-notebook',
    fetched: '2026-08-18',
    claim: 'Custom-printed notebooks 2026, per unit at the quantity: 75 units $5.86, 150 $4.88, 250 $4.24, 500 $3.69, 1,000 $3.21. SETUP IS SEPARATE at $40.00 per colour per location - at the 75-unit minimum that adds $0.53 a unit on top. A second supplier lists notebooks at $1.27-3.89 a unit against minimums of 50-100 with no setup stated. NO SUPPLIER QUOTED BELOW A 50-UNIT MINIMUM, so a 25-unit price cannot be extrapolated. Blank retail notebooks are a different channel at $1.61-4.49 each with no volume break evidenced.',
  },
  'waterbottles-blank-2026': {
    org: 'Bulk Tumblers and CDI International blank water-bottle listings (both fetched)',
    url: 'https://bulktumblers.com/collections/insulated-water-bottles',
    fetched: '2026-08-18',
    claim: 'Blank reusable water bottles 2026. STAINLESS: Polar Camel 20oz $12.00 single or $269.28 a case of 24 ($11.22 each); 32oz $12.50 single or $143.06 a case of 12 ($11.92); 40oz $14.25 or $159.89 a case of 12 ($13.32). A house-brand supplier lists vacuum-insulated 17-20oz at $6.13-7.89 a unit and non-insulated plastic 23-32oz at $2.84-3.61 - roughly half the branded line, and the two should not be blended. Custom-printed plastic bottles run $0.79-3.45 a unit at minimums of 100-300.',
  },
  'firstaid-consumables-2026': {
    org: 'WebstaurantStore and Quill listings for cough drops, pain relievers and antacids (both fetched)',
    url: 'https://www.webstaurantstore.com/search/cough-drops.html',
    fetched: '2026-08-18',
    claim: 'First-aid consumables 2026. COUGH DROPS: 125 a box $8.29-14.99 ($0.066-0.120 a drop), 50 a box $5.19-8.99; a retail 30-count bag $6.49 ($0.216 a drop). PAIN RELIEVER - NOTE THE UNIT: the office channel sells PACKETS OF TWO (50 packets = 100 tablets) at $12.99-28.59 a box, i.e. $0.058-0.202 a tablet, while the foodservice channel sells loose tablets at $8.79-26.49 per 100 ($0.088-0.265 a tablet). ANTACIDS likewise: $6.19 per 100 tablets ($0.06 each) foodservice against $19.99 per 125 two-tablet packets ($0.080 a tablet) in the office channel.',
  },
  'electrolytes-2026': {
    org: 'Quill and Liquid I.V. direct listings for electrolyte sticks, with Quill and Hydration Depot for ready-to-drink (all fetched)',
    url: 'https://www.liquid-iv.com/products/hydration-multiplier',
    fetched: '2026-08-18',
    claim: 'Electrolytes 2026. STICKS: Liquid I.V. direct is $24.99 a 16-stick pouch ($1.56 a stick, or $1.09 on subscription); the office channel lists 15-stick packs at $30.69-40.79 ($2.05-2.72 a stick). NOTE THE COUNT DIFFERS BY CHANNEL - 16 direct against 15 at Quill. Generic electrolyte packets are $46.99 per 50 ($0.94 each). READY-TO-DRINK: Gatorade 20oz is $2.67 a bottle in a 12-carton office pack and $1.86 a bottle in a 24-case that carries a 54-case pallet minimum - a channel gap, not a volume discount.',
  },
  'meetingsupplies-quill-2026': {
    org: 'Quill listings for easel pads, dry-erase markers, sticky notes and ballpoint pens (fetched)',
    url: 'https://www.quill.com/easel-pads/cbs/9345.html',
    fetched: '2026-08-18',
    claim: 'Session supplies at Quill 2026, per unit after dividing the pack: ruled 27x34in easel pad $17.50 (2 a box at $34.99), plain $29.50, grid $30.00, sticky wall pads $19.75-33.50. Dry-erase markers $1.00-1.29 each in 36-packs ($36.09-46.39). Sticky notes $0.56-1.17 a pad (12-packs $9.99-13.99, a 32-pack $17.89). Ballpoint pens $0.15-0.19 each in 60-packs ($8.89-11.19), retractables $0.36-1.14.',
  },
  'meetingsupplies-target-2026': {
    org: 'Target listings for easel pads, dry-erase markers, sticky notes and bulk pens (fetched)',
    url: 'https://www.target.com/s?searchTerm=dry+erase+markers',
    fetched: '2026-08-18',
    claim: 'Session supplies at Target 2026: a single Post-it mini easel pad $18.69, sticky anchor-chart pads $49.99-74.99. Dry-erase markers $0.62-1.12 each (a 21-count $12.99, a 12-count $8.99, a 4-pack $4.49). Sticky notes $0.63-0.97 a pad (a 6-pad pack $5.79, a 4-pad $3.19), a single 90-sheet pad $0.89. Bulk pens $0.10-0.17 each (a 10-pack $0.99, a 240-pack $39.99).',
  },
  'games-retail-2026': {
    org: 'Target and Discount School Supply board-game listings (both fetched)',
    url: 'https://www.target.com/s?searchTerm=party+board+games',
    fetched: '2026-08-18',
    claim: 'Party and board games 2026: mass-retail titles cluster $19.99-24.99 at full price, with travel-size and filler games $7.69-9.99. The education channel runs $19.99-35.99 a title, and its multi-title sets work out to $23.25-29.83 each - a separate channel from a consumer shelf price.',
  },
  'reveal-items-2026': {
    org: 'Party City and Target gender-reveal listings (both fetched)',
    url: 'https://www.partycity.com/products/gender-reveal-confetti-party-poppers-12ct',
    fetched: '2026-08-18',
    claim: 'Gender-reveal items 2026: confetti party poppers $15.00 for 12 ($1.25 each) and $19.28 for 12 ($1.61 each); a single large confetti cannon $4.99-10.00. A balloon box was found at ONE publisher only ($23.69, plus a 4-count baby-box set at $10.00) and colour powder cannons at none that could be fetched, so neither is registered here.',
  },
  'homesetup-retail-2026': {
    org: 'IKEA US and Target listings for entry trays, baskets, hooks, totes and buckets (all fetched)',
    url: 'https://www.ikea.com/us/en/p/baggmuck-shoe-tray-indoor-outdoor-gray-60329711/',
    fetched: '2026-08-18',
    claim: 'Host entry goods 2026. SHOE TRAY: $3.49-4.99 entry tier, $7-10.50 standard, $19-27 heavy rubber. STORAGE BASKET: $4-10 plastic or textile utility, $15-35 woven natural fibre. OVER-DOOR HOOKS: a 2-6 hook rail $9-25, a wall-mounted rack $23-35, a single over-door hook from $1.99. SCENTED CANDLE: an 8-10oz lidded jar (20-40hr) $5-10 at both publishers, premium 22oz $14-20. REUSABLE TOTE: $0.89-0.99 basic large woven poly, $1.99-5.00 heavier or XL. 5-GALLON BUCKET: $5-6 consumer plastic, $12.99 food-grade with lid, $18-33 commercial HDPE or steel.',
  },
  'cleanup-heavyduty-2026': {
    org: 'WebstaurantStore and Target listings for contractor bags and disposable gloves (both fetched)',
    url: 'https://www.webstaurantstore.com/lavex-industrial-contractor-trash-bag-45-gallon-3-mil-40-x-46-low-density-can-liner-case/5014046XXH.html',
    fetched: '2026-08-18',
    claim: 'Heavy-duty cleanup 2026. CONTRACTOR BAGS at a true 3 mil: 45gal 50-count case $35.49 ($0.71 a bag), $30.99 at 2+ cases ($0.62); 42gal 50-count $40.39 ($0.81); 55-60gal 32-count $36.79 ($1.15). Consumer flap-tie bags sold as "contractor" are cheaper per bag but DO NOT STATE THEIR MIL and are not the same product. DISPOSABLE GLOVES, 100 a box: foodservice poly and vinyl $1.19-2.99 a box ($0.012-0.030 a glove) against consumer retail vinyl and nitrile $9.19-12.99 ($0.092-0.130) - roughly 4x for the same count, so the channel must be chosen deliberately.',
  },
  'av-cables-2026': {
    org: 'Reviewed (USA Today Network), Tech Advisor and Harbor Freight listings for HDMI, adapters and cords (all fetched)',
    url: 'https://www.reviewed.com/televisions/best-right-now/the-best-hdmi-cables',
    fetched: '2026-08-18',
    claim: 'AV purchase prices 2026. HDMI cable: single 6ft $9.99-16.99; an AmazonBasics 2-pack $8.98 (about $4.49 a cable). USB-C to HDMI adapter $8.59-17.00 single. OUTDOOR EXTENSION CORD: gauge drives the price at fixed length - 25ft 16-gauge $13.93 against 25ft 12-gauge $24.99-33.99; 50ft 12-gauge $42.78-44.99. Power strips: 6-8 outlet $19.11-25.99, 12-outlet $28.99-44.95.',
  },
  'speakers-lights-2026': {
    org: 'The Gadgeteer, TechGearLab and Enbrighten listings for portable speakers and cafe string lights (all fetched)',
    url: 'https://www.techgearlab.com/topics/home/best-string-lights',
    fetched: '2026-08-18',
    claim: 'Portable Bluetooth speakers 2026: Anker Soundcore 2 $29.99, JBL Go 4 $49.95, JBL Flip 5 $79.95, Marshall Emberton III $129.99 - two publishers agree exactly on three of these. STRING LIGHTS are priced per STRAND, not per foot: consumer 48ft strands $37-70 (15-16 bulbs), a commercial-grade 48ft 24-bulb strand $119.99, a 98ft 30-bulb strand $90. Bulb count varies at the same length and is a separate field.',
  },
  'ledcandles-thermometer-2026': {
    org: 'Reviewed, Home of Strings, AntiFoodie and Smoking Meat Geeks (all fetched)',
    url: 'https://www.reviewed.com/home-outdoors/best-right-now/best-flameless-candles',
    fetched: '2026-08-18',
    claim: 'LED flameless candles 2026 divide sharply by tier: commodity multipacks are $30.00 for 8 ($3.75 each) or $22.99-25.99 for 3 ($7.66-8.66 each), while a premium moving-flame pillar is $33.99 EACH - an order of magnitude apart, and not to be merged. Instant-read thermometers: budget $13-14, mid $35-40 (ThermoPop 2), premium $94-100 (Thermapen ONE), with two publishers converging on all three tiers.',
  },
  'warehouse-trays-2026': {
    org: 'Chowhound and The Takeout on the Costco wing tray, with WarehouseRunner and Instacart on Kirkland pantry items (all fetched except WarehouseRunner, which 403d and is search-results)',
    url: 'https://www.chowhound.com/2083221/chicken-wings-costco-party-tray-super-bowl/',
    fetched: '2026-08-18',
    claim: 'Warehouse party food 2026. WING TRAY: 8 pounds, about 70-72 pieces, about $47 - roughly $5.88/lb and $0.65-0.67 a wing; this is the one tray with a genuine published piece count, and two publishers agree on weight and price while differing on count. Kirkland cookies 24-count $9.99 warehouse ($0.42 each) against $12.43 on a delivery marketplace ($0.52) - a 24% channel markup on the identical SKU. Kirkland mixed nuts 2.5lb $15.99 ($6.40/lb). Kirkland steak strips 12oz $11.89 warehouse ($15.85/lb) against $16.16 delivered ($21.55/lb) - a 36% spread.',
  },
  'deli-trays-2026': {
    org: 'Sporked survey of supermarket deli platters, with a Publix product listing (Sporked fetched; Publix search-results)',
    url: 'https://sporked.com/article/game-day-snack-platters/',
    fetched: '2026-08-18',
    claim: 'Supermarket deli platters 2026, only where the retailer publishes a serving count: Sprouts sandwich tray $59.99 serves 12-16 ($3.75-5.00 a head); Whole Foods brioche slider platter $50 for 24 sandwiches ($2.08 each); Albertsons fruit tray $50 serves 30 ($1.67 a head); Publix dip platter $19.99 serves 8 and $27.99 serves 20. Kroger and Trader Joe listings publish weight or nothing, so no per-person figure is derivable for them. A "serves N" is a retailer ESTIMATE - one fetched article records a platter sold as feeding 20 that fed 12.',
  },
  'favors-blank-2026': {
    org: 'Oriental Trading and Private Island Party bulk favor listings (both fetched)',
    url: 'https://www.orientaltrading.com/party-supplies/apparel-and-accessories/novelty-jewelry/novelty-sunglasses/party-favors/adults-a1-551148+3594+2586-1.fltr',
    fetched: '2026-08-18',
    claim: 'Blank bulk favors 2026, per dozen unless noted. SUNGLASSES: $7.99-19.99 a dozen at Oriental Trading ($0.67-1.67 a pair, most styles under $1.21) and $18.00-30.00 a dozen at Private Island ($1.50-2.50); a 48-piece assortment $39.98. KOOZIES blank: $7.77-18.98 a dozen ($0.65-1.58 each), or $82.95-95.95 per 100 ($0.83-0.96 each). CANVAS TOTES blank: 10x12in medium $16.98-18.68 a dozen ($1.24-1.56 each), a 50-piece assortment $61.99 ($1.24 each). PERSONALISED equivalents run $99.99-119.99 per 48 ($2.08-2.50 each) - roughly double the blank rate.',
  },
  'tees-custom-2026': {
    org: 'Rolled Up Tees screen-printing rate guide and ooShirts published pricing (both fetched)',
    url: 'https://rolleduptees.com/blog/how-much-does-screen-printing-cost',
    fetched: '2026-08-18',
    claim: 'Custom screen-printed t-shirts at party quantities, one colour one location: a shop rate guide quotes $12-18 a shirt at 12-24 pieces and $9-14 at 25-48; a discount online printer quotes about $6.00 a shirt at 12, $5.50 at 24 and $5.00 at 50. THE TWO DISAGREE BY 2-3x AT THE SAME QUANTITY - a house-blank online printer against a shop rate - so this is a RANGE, not a figure to average. Additional ink colours add $0.75-1.50.',
  },
  'sash-retail-2026': {
    org: 'The House of Bachelorette, Party City and Target sash listings (all fetched)',
    url: 'https://www.thehouseofbachelorette.com/collections/sash-sets',
    fetched: '2026-08-18',
    claim: 'Party sashes 2026: a single bride sash $4.00-12.99 across three publishers (Target $4.00-9.99, Party City sash-and-pin 2-piece $12.00); headband-or-veil-plus-sash sets $4.95-16.50 for one wearer; a set of 6 bridesmaid sashes $14.99 ($2.50 each); a groom-to-be satin sash $4.95 (single publisher only).',
  },
  'gamepacks-retail-2026': {
    org: 'The House of Bachelorette and Target party game-card listings (both fetched)',
    url: 'https://www.thehouseofbachelorette.com/collections/bachelorette-party-games',
    fetched: '2026-08-18',
    claim: 'Party game packs 2026, priced PER PACK: scratch-a-dare 12 cards $4.75; a 20-dare checkbook $3.75; full retail game packs $7.75-12.00; a 4-game kit $6.50. Target lists 50 bridal-shower game cards at $12.59, i.e. $0.25 a card. Small PRIZES to go with them could not be established - only one publisher had concrete prize-assortment figures.',
  },
  'bls-pasta-2026': {
    org: 'US Bureau of Labor Statistics CPI Average Price Data, spaghetti and macaroni per pound (series APU0000701322), read from the FRED CSV endpoint (the HTML pages return 403)',
    url: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=APU0000701322',
    fetched: '2026-08-18',
    claim: 'BLS US city average for spaghetti and macaroni: $1.381/lb in July 2026, $1.367 in June, $1.311 in December 2025. The series covers all long thin pasta except fettuccine and linguine, plus macaroni and shells, any packaging. White all-purpose flour (APU0000701111) was $0.543/lb in July 2026.',
  },
  'grits-retail-2026': {
    org: 'Target and a Louisiana grocer, both listing the same Quaker 24oz quick grits (both fetched)',
    url: 'https://www.target.com/p/quaker-original-quick-5-minute-grits-24oz/-/A-13331196',
    fetched: '2026-08-18',
    claim: 'Quaker original quick 5-minute grits, 24oz: $3.39 at Target ($0.14 an ounce, about 18 servings) and $3.44 at GJ Curbside - $2.26-2.29 a pound. No BLS average-price series exists for grits.',
  },
  'usda-feature-produce-2026': {
    org: 'USDA AMS Specialty Crops Market News, "Weekly Grocery Store Specialty Crops Feature Activity" (FVWRETAIL, 2026-08-14, ads 8/8-8/20), surveying 270+ retailers and 29,000+ stores; PDF extracted locally because WebFetch could not parse it',
    url: 'https://www.ams.usda.gov/mnreports/fvwretail.pdf',
    fetched: '2026-08-18',
    claim: 'ADVERTISED FEATURE prices, not shelf prices. Green round cabbage $0.70/lb nationally this week (1,511 ads) against $0.69 last week and $0.73 last year, with regional weighted averages $0.59-0.99; red cabbage is a separate higher line at $0.90/lb. Sweet potatoes $1.05/lb this week (108 ads, range $0.99-1.19) against $0.78 last week - a 35% swing in seven days. One grocer shelf-priced cabbage at $0.81/lb and sweet potatoes at $0.58/lb, so shelf and feature diverge in both directions.',
  },
  'appetizers-frozen-2026': {
    org: 'Target frozen party-appetizer listings with piece counts (fetched)',
    url: 'https://www.target.com/p/frozen-petite-quiche-collection-6-25oz-12ct-good-38-gather-8482/-/A-78649200',
    fetched: '2026-08-18',
    claim: 'Frozen party appetizers 2026 at Target: petite quiche 6.25oz/12ct $5.99 (about $0.50 a piece); spanakopita 8.5oz/12ct $5.99 (about $0.50 a piece); Italian-style beef, pork and chicken meatballs 26oz $6.99 ($0.27 an ounce, about $4.30/lb) with NO piece count published, so no per-piece figure is derivable for meatballs. A delivery marketplace listed 12-count mini quiche at $8.59 and 15-count at $14.99, i.e. $0.72-1.00 a piece with marketplace markup.',
  },
  'glassware-disposable-2026': {
    org: 'WebstaurantStore and Oriental Trading disposable champagne flute listings (both fetched)',
    url: 'https://www.webstaurantstore.com/visions-5-oz-clear-2-piece-plastic-champagne-flute-case/347FC2P5.html',
    fetched: '2026-08-18',
    claim: 'Disposable plastic flutes 2026. Foodservice: Visions 5oz two-piece flute $33.99 a case of 120 ($0.28 each), $32.29 at 2+ cases. Party retail: 100-count packs $60.99-82.99 ($0.61-0.83 each), 25-count packs $15.98-24.99 ($0.64-1.00 each). The channel moves the per-glass price about 3x.',
  },
  'glassware-rental-2026': {
    org: 'EventWorks, A to Z Event Rentals of PA and Big D Party Rentals stemware rate cards (all fetched)',
    url: 'https://atozeventrentalsofpa.com/glassware-rentals-in-pa/',
    fetched: '2026-08-18',
    claim: 'Rental stemware 2026, priced PER GLASS per event: basic champagne flute $0.59-0.75, water goblet $0.57-0.75, wine glass $0.57-0.75; premium and designer stemware $1.25-2.99 (Riedel and gold-rim $1.75-2.50, Bali $2.99). Washing and breakage fees are not included. Rental at $0.57-0.75 is roughly 2-3x the disposable foodservice unit cost.',
  },
  'garnish-produce-2026': {
    org: 'Target produce listings with USDA AMS specialty-crop retail report (Target fetched; the USDA PDF did not parse, so its figures are search-snippet grade)',
    url: 'https://www.target.com/p/lime-each/-/A-15026731',
    fetched: '2026-08-18',
    claim: 'Cocktail garnish produce 2026: a lime is $0.39 each at Target, against a USDA weekly retail report showing limes $0.69-0.79/lb (weighted average $0.75) and individually $0.12-0.69. Fresh mint is sold as a 0.5oz clamshell at $1.99-2.80, not as a loose bunch. Blueberries $3.99 a 1-pint (11.2oz) package; strawberries $2.99/lb, with a BLS dry-pint average of $2.404 per 12oz.',
  },
  'barsyrup-bitters-2026': {
    org: 'WebstaurantStore, LollicupStore and Target listings for Monin cane syrup and Angostura bitters (all fetched)',
    url: 'https://www.webstaurantstore.com/monin-750-ml-premium-pure-cane-syrup/544SYPAR000A.html',
    fetched: '2026-08-18',
    claim: 'Bar consumables 2026: Monin pure cane syrup 750ml $7.09-8.79, about 25 one-ounce servings a bottle, i.e. $0.28-0.35 an ounce. Angostura aromatic bitters 4 fl oz $10.49-12.99 retail ($8.40 a bottle in a 48-case); one bottle yields about 47 half-teaspoon dashes, so roughly $0.22-0.28 a dash.',
  },
  'bibs-foodservice-2026': {
    org: 'WebstaurantStore disposable crab and lobster bib listings (fetched)',
    url: 'https://www.webstaurantstore.com/277/disposable-bibs-and-kids-bibs.html',
    fetched: '2026-08-18',
    claim: 'Royal Paper PB24 disposable poly crab bib and PB25 lobster bib, 500 per box, $54.49 a box - $0.11 each at foodservice bulk.',
  },
  'bibs-consumer-2026': {
    org: "Cameron's Seafood consumer crab-bib listing (fetched)",
    url: 'https://www.cameronsseafood.com/products/crab-bibs-pack-of-5',
    fetched: '2026-08-18',
    claim: 'Adult poly crab bibs, pack of 5, $6.99 - about $1.40 each. A small consumer pack costs roughly 13x the 500-count foodservice rate per bib.',
  },
  'mallets-foodservice-2026': {
    org: 'WebstaurantStore plain wooden crab mallet listing (fetched)',
    url: 'https://www.webstaurantstore.com/choice-8-wooden-lobster-crab-mallet/176960093M.html',
    fetched: '2026-08-18',
    claim: 'Choice 8in plain wooden lobster/crab mallet: $2.39 each at single quantity, $1.78 each at 24 or 96 (24 minimum). Natural wood, uncustomised - screen-printed mallets are a separate higher tier.',
  },
  'mallets-seafood-2026': {
    org: 'J.O. Spices (Maryland crab-seasoning house) wooden mallet listing (fetched)',
    url: 'https://store.jospices.com/wooden-crab-mallet.aspx',
    fetched: '2026-08-18',
    claim: 'Plain wooden crab mallet $1.75 each; the same retailer sells engraved mallets as a separate category.',
  },
  'unitycup-indigo-2026': {
    org: 'Indigo Kulture, specialist African-goods retailer (fetched)',
    url: 'https://indigohq.org/products/unity-cup-kikombe-cha-umoja',
    fetched: '2026-08-18',
    claim: 'Kikombe cha umoja unity cup $25.00, Kenyan rosewood, about 5in tall and 2.5in diameter, handcrafted in Mali.',
  },
  'unitycup-kwanzaa-2026': {
    org: '7 Principles 365, specialist Kwanzaa retailer (fetched)',
    url: 'https://www.7principles365.com/product-page/kikombe-cha-umoja-the-unity-cup',
    fetched: '2026-08-18',
    claim: 'Kikombe cha umoja hand-carved wood unity cup $17.99, in Kwanzaa (5in x 3in), Kenyan (6in x 2.75in) and undecorated (5in x 2.5in) forms. The Black Art Depot separately listed a Kwanzaa unity cup at $18.95.',
  },
  'masa-retail-2026': {
    org: 'Target and Kroger Maseca corn masa flour listings (Target fetched; Kroger from search results)',
    url: 'https://www.target.com/p/maseca-corn-flour-4lbs/-/A-88744415',
    fetched: '2026-08-18',
    claim: 'Maseca gluten-free corn masa flour, 4lb bag, $4.29 at Target (stated $0.07 an ounce, about $1.07/lb); Kroger lists the same 4lb white corn masa and the 4lb tamal masa at $4.29. A Walmart figure was excluded because the site returned a CAPTCHA rather than a page.',
  },
  'injera-ethiopian-2026': {
    org: 'EthiopianSpices.com, Ethiopian specialist grocer (fetched)',
    url: 'https://ethiopianspices.com/products/injera',
    fetched: '2026-08-18',
    claim: 'Injera by the order of 10 rounds, about 14in each: teff-and-wheat $9.95 (about $1.00 a round); gluten-free 100% teff $14.95 (about $1.50 a round).',
  },
  'injera-market-2026': {
    org: 'Zala Market, Ethiopian and East African grocer (fetched)',
    url: 'https://zala-market.com/products/ethiopian-white-teff-injera-flatbread',
    fetched: '2026-08-18',
    claim: 'Ethiopian white pure-teff injera, five pieces, 40.74oz, $10.00 - about $2.00 a round. 100% teff carries a clear premium over the teff-and-wheat blend.',
  },
  'mumbo-capital-2026': {
    org: 'Capital City (DC Black-owned mambo sauce brand) via Target (fetched)',
    url: 'https://www.target.com/p/capital-city-mild-mambo-sauce-12oz/-/A-78613383',
    fetched: '2026-08-18',
    claim: 'Capital City mild mambo sauce, 12 fl oz, $8.49 - about $0.71 a fluid ounce. The brand direct price appeared at $6.99 plus shipping in search results.',
  },
  'mumbo-bradshaw-2026': {
    org: 'Bradshaw Sauce Co., DC-area sauce maker (fetched)',
    url: 'https://www.bradshawsauceco.com/shop/p/mumbo-sauce',
    fetched: '2026-08-18',
    claim: 'Mumbo sauce $8.00 a bottle. The page does not state the bottle size, so no per-ounce figure can be derived from it.',
  },
  'loroco-mexgrocer-2026': {
    org: 'MexGrocer.com, Latin specialty grocer (fetched)',
    url: 'https://www.mexgrocer.com/products/goya-loroco-flower',
    fetched: '2026-08-18',
    claim: 'Goya loroco flower, 32oz jar, $13.95 (loroco, onion or carrot, water, citric acid, salt).',
  },
  'loroco-importer-2026': {
    org: 'Amazonas Foods, Central American importer (fetched)',
    url: 'https://amazonasfoods.com/products/loroco-flower-in-brine',
    fetched: '2026-08-18',
    claim: 'Amazonas loroco in brine, 32oz jar, $6.39. The same 32oz format at $6.39 against Goya at $13.95 is a real importer-versus-retail spread, not a figure to average.',
  },
  'frankincense-liturgical-2026': {
    org: 'Ancient Faith Store, Orthodox church supply - the liturgical channel for etan (fetched)',
    url: 'https://store.ancientfaith.com/ethiopian-frankincense-pure-resin-incense-1-ounce/',
    fetched: '2026-08-18',
    claim: 'Ethiopian frankincense pure resin, 1 ounce, $6.50.',
  },
  'frankincense-spice-2026': {
    org: 'Sullivan Street Tea & Spice Company (fetched)',
    url: 'https://onsullivan.com/products/ethiopian-frankincense-resin',
    fetched: '2026-08-18',
    claim: 'Ethiopian frankincense resin $7.50 for a 3-ounce bag (about $2.50 an ounce), or $10.50 bundled with charcoal discs - so the discs are about $3.00. The 1-ounce liturgical package is $6.50/oz, so package SIZE moves the per-ounce price far more than brand does. An Ethiopian-community vendor (kibeb.com) returned 403 and could not be quoted.',
  },
  'extinguisher-retail-2026': {
    org: 'Walmart and Do it Best household fire-extinguisher listings, 2026 (listing - figures read from search results; homedepot.com and lowes.com both returned 403 on fetch, so their prices are unknown rather than absent)',
    url: 'https://www.walmart.com/ip/Kidde-FA110-Multi-Purpose-Fire-Extinguisher-1A10BC-1-Pack-red/13359469161',
    fetched: '2026-08-18',
    claim: 'Household fire extinguishers 2026, all 1-A:10-B:C rated: Kidde FA110 $41.49 single and $52.47 for a 2-pack; First Alert 1-A:10-B:C rechargeable $27.49. No price was found for a Class K wet-chemical extinguisher, which is a separate commercial-kitchen product.',
  },
  'grillgloves-retail-2026': {
    org: 'Walmart heat-resistant BBQ glove listings, with a second figure reported editorially for a Home Depot product (listing - figures read from search results)',
    url: 'https://www.walmart.com/c/kp/heat-resistant-bbq-gloves',
    fetched: '2026-08-18',
    claim: 'Heat-resistant grill gloves 2026, per pair: Expert Grill silicone-dotted $12.97; OZERO $14.99-28.48; Nexgrill (500F, at Home Depot) $19.98; Prepmen $24.49; Solo Stove high-heat (450F) $39.99. PROVENANCE NOTE: only Walmart is a first-party retailer here - the Nexgrill figure comes from an editorial article citing Home Depot, because homedepot.com returned 403 on fetch.',
  },
  'powerbank-retail-2026': {
    org: 'Best Buy and Walmart power-bank listings, 2026 (listing - figures read from search results)',
    url: 'https://www.bestbuy.com/product/anker-power-bank-compact-travel-ready-10000mah-battery-pack-with-poweriq-charging-technology-usb-c-input-and-output/JJ858R2Z2H/sku/10858110',
    fetched: '2026-08-18',
    claim: 'Portable chargers 2026 in the 10,000mAh class: Anker PowerCore 10K $22.99 (from $25.99); INIU 10000mAh 15W $22.99 (from $32.99), INIU slimmest $19.99, INIU 22.5W $22.29 (from $39.99). The lower figures are promotional prices as displayed, with list prices struck through alongside.',
  },
  'firstaid-retail-2026': {
    org: 'Walmart first-aid kit listings, 2026 (listing - figures read from search results)',
    url: 'https://www.walmart.com/browse/health-medicine/first-aid-kits/976760_2571007_9065854',
    fetched: '2026-08-18',
    claim: 'First-aid kits at Walmart 2026: a DMI 175-piece kit $13.99; Equate all-purpose 250-piece and Band-Aid 160-piece kits in the same tier; a Be Smart Get Prepared 10-person kit $39.99. A household party kit sits at the low end, a workplace or large-group kit at the high end.',
  },
  'outdoor-protect-2026': {
    org: 'Walmart sunscreen, insect repellent and citronella listings, 2026 (listing - figures read from search results)',
    url: 'https://www.walmart.com/c/kp/sunscreen-bug-repellent',
    fetched: '2026-08-18',
    claim: 'Outdoor protection 2026: Coppertone Complete SPF 50 spray 5.5oz $5.74, with sunscreen ranging to $17.95-44 for multipacks and premium brands; Cutter citronella candles $7.99-9.99; PIC citronella wrist bands 6-pack $4.79; Avon Skin-So-Soft Bug Guard Plus (a combined repellent and sunscreen) $18.99.',
  },
  'bls-saladveg-2026': {
    org: 'US Bureau of Labor Statistics CPI Average Price Data (romaine lettuce series APU0000FL2101) with USDA ERS food price outlook, via FRED and press coverage (listing - figures read from search results)',
    url: 'https://fred.stlouisfed.org/series/APU0000FL2101',
    fetched: '2026-08-18',
    claim: 'BLS US city average: romaine lettuce $3.560 per pound (February 2026); field-grown tomatoes $2.154 per pound. Lettuce was 32.1% higher over the year to June 2026 and tomatoes 19.5% higher; retail fresh vegetables overall were 9.9% higher year on year.',
  },
  'condiments-retail-2026': {
    org: 'Joe Vs Smart Shop / H-E-B condiment shelf listings, 2026 (listing - figures read from search results)',
    url: 'https://www.joevsmartshop.com/product-category/pantry/sauces-marinades-and-condiments/ketchup-mayonnaise-and-mustard/1224380.1226616.1238629',
    fetched: '2026-08-18',
    claim: 'Condiments at retail 2026: Hill Country Fare tomato ketchup 24oz $1.13; H-E-B tomato ketchup 32oz $2.48; H-E-B yellow mustard 14oz $0.77; Kraft real mayo 30oz $2.34 and H-E-B real mayonnaise 30oz $3.64. A full set of the three runs roughly $4-7. Single-serve packets price far higher per ounce and are excluded.',
  },
  'cheese-sliced-2026': {
    org: 'Walmart sliced and block cheese listings with unit pricing, 2026 (listing - figures read from search results)',
    url: 'https://www.walmart.com/ip/Kraft-Singles-American-Cheese-Slices-24-Ct-Pk/10452905',
    fetched: '2026-08-18',
    claim: 'Everyday cheese at Walmart 2026: Kraft Singles American 24-count 16oz $4.86 (30.4 cents an ounce, so about $4.86/lb); Great Value block cheddar $3.78/lb mild, $3.58 extra sharp 16oz, $3.74/lb sharp in an 8oz block. Block and processed slices sit at $3.58-4.86 a pound.',
  },
  'cheese-deli-2026': {
    org: 'ShopRite deli sliced American cheese listing (listing - figures read from search results; shoprite.com returned 403 on direct fetch)',
    url: 'https://www.shoprite.com/categories/slicing-cheese/american-cheese-id-519913',
    fetched: '2026-08-18',
    claim: 'Deli-counter sliced American cheese: Black Bear American $5.99/lb at ShopRite, cut to order. A deli counter prices above a packaged block or processed slice and below specialty cheese.',
  },
  'bakery-cake-retail-2026': {
    org: 'US grocery-bakery cake price guides with per-retailer figures, 2026 (listing - figures read from search results)',
    url: 'https://eathealthy365.com/how-much-does-a-cake-cost-at-walmart-a-full-breakdown/',
    fetched: '2026-08-18',
    claim: 'Grocery bakery cakes 2026: an 8-inch double-layer round at Walmart is about $20-30, and popular sizes (quarter sheet or 8-inch round) run $25-45. A supermarket birthday cake for a comparable serving count is $35-55, typically a pre-frozen base with shortening frosting. Costco is cheaper still - a 10-inch round $15.99 and a half sheet $24.99, with no price difference between a plain cake and a fully decorated one.',
  },
  'buns-kroger-2026': {
    org: 'Kroger hamburger and hot dog bun listings with unit pricing, 2026 (listing - figures read from search results)',
    url: 'https://www.kroger.com/q/hot+dog+bun+8+pack',
    fetched: '2026-08-18',
    claim: 'Kroger 8-count bun packs August 2026: Private Selection sweet Hawaiian hot dog buns 17oz $3.99 (from $5.49, $0.31/oz); Kroger CARBmaster Hawaiian hamburger buns 14oz $3.99 (from $5.49, $0.40/oz); Artesano potato hot dog buns 16oz $3.99. At 8 to a pack that is about $0.50 a bun on promotion and about $0.69 at the undiscounted price.',
  },
  'buns-walmart-2026': {
    org: 'Walmart bun listings with per-ounce unit pricing, 2026 (listing - figures read from search results)',
    url: 'https://www.walmart.com/browse/food/buns/976759_976779_5829009',
    fetched: '2026-08-18',
    claim: 'Walmart Loves hamburger buns 8-pack $4.64 (30.9 cents an ounce), about $0.58 a bun. Typical 8-packs run $3.99-4.64 across brands and styles - brioche, Hawaiian and potato buns price above plain white.',
  },
  'chips-bls-2026': {
    org: 'US Bureau of Labor Statistics CPI Average Price Data, potato chips per 16 ounces (series APU0000718311), via FRED (listing - figures read from search results)',
    url: 'https://fred.stlouisfed.org/series/APU0000718311',
    fetched: '2026-08-18',
    claim: 'BLS US city average for potato chips was $6.559 per 16 ounces in July 2026, i.e. about $6.56 a pound.',
  },
  'chips-retail-2026': {
    org: 'Walmart, Costco and supermarket snack listings with unit pricing, 2026 (listing - figures read from search results)',
    url: 'https://www.walmart.com/c/kp/potato-chips',
    fetched: '2026-08-18',
    claim: 'Snack unit pricing 2026: Great Value wavy potato chips party size 13oz $2.96 (22.8c/oz, about $3.64/lb); Lays Classic party size 13oz $4.77 (36.7c/oz, about $5.87/lb); Rold Gold pretzel sticks and tiny twists 16oz $3.98 each (24.9c/oz). Multipacks: Costco Boulder Canyon 36x1oz $20.49; Snack Factory Pretzel Crisps 24x1.5oz $18.79; a supermarket 18x1oz variety pack $6.99-10.89 depending on chain.',
  },
  'watermelon-market-2026': {
    org: 'Selina Wamucii US watermelon market prices, updated monthly (listing - figures read from search results)',
    url: 'https://www.selinawamucii.com/insights/prices/united-states-of-america/watermelon/',
    fetched: '2026-08-18',
    claim: 'US retail watermelon was about $0.53 per pound as of June 2026. Whole melons sold for about $4.75 each in January 2026 and $5.15 in February.',
  },
  'watermelon-retail-2026': {
    org: 'US watermelon retail price guide with per-retailer figures, 2026 (listing - figures read from search results)',
    url: 'https://latestcost.com/watermelon-cost-price-ranges-whole-watermelon/',
    fetched: '2026-08-18',
    claim: 'Watermelon by weight 2026 runs $0.30-0.80/lb with most shoppers paying $0.50-0.60. Albertsons lists seedless or seeded at $0.59/lb and organic seedless at $0.79/lb. Whole melons: an 8lb conventional $4.00, a 12-14lb $9.20, a 15-20lb organic $18.50. PRE-CUT is a different product and costs far more - $1.99 a quarter, $2.49 a slice pack, about $3.50 cubed.',
  },
  'lemons-bls-2026': {
    org: 'US Bureau of Labor Statistics CPI Average Price Data, lemons per pound, West census region urban (series APU0400711412), via FRED (listing - figures read from search results)',
    url: 'https://fred.stlouisfed.org/series/APU0400711412',
    fetched: '2026-08-18',
    claim: 'BLS average retail price for lemons was $2.091 per pound in May 2026.',
  },
  'lemons-retail-2026': {
    org: 'US lemon retail listings and price guide, 2026 (listing - figures read from search results)',
    url: 'https://selector.kurlon.com/live/lemon-costs-explained-for-us-shoppers-2026-44981.html',
    fetched: '2026-08-18',
    claim: 'Lemons at retail 2026: Walmart lists a fresh lemon at $0.64 each, and a 1lb bag of seedless lemons at $2.98/lb. Buying by the fruit is the cheaper unit for a recipe that calls for a count rather than a weight.',
  },
  'corn-farm-2026': {
    org: 'The Business Journal, "Fresno State Sweet Corn Returns at 37 Cents Per Ear" - reported farm-market price (listing - figures read from search results)',
    url: 'https://thebusinessjournal.com/fresno-state-sweet-corn-prices-2026/',
    fetched: '2026-08-18',
    claim: 'Fresno State Gibson Farm Market sold yellow sweet corn at 37 cents per ear in May 2026, down from 49 cents in 2025. A university farm market at harvest is the floor of the market, not the grocery shelf.',
  },
  'corn-retail-2026': {
    org: 'US sweet-corn retail pricing guides and Walmart per-ear listings, 2026 (listing - figures read from search results)',
    url: 'https://www.thepricer.org/how-much-does-one-cob-of-corn-cost/',
    fetched: '2026-08-18',
    claim: 'Corn on the cob at US retail 2026: Walmart lists single ears at about $0.50, with recent listings $0.68-0.77 an ear. The national average runs $0.50-1.25 per cob depending on type, season, region and source, and peak harvest from late July through August is the cheapest window.',
  },
  'collards-wholesale-2026': {
    org: 'Tridge global fresh collard greens price index (listing - figures read from search results)',
    url: 'https://dir.tridge.com/prices/fresh-collard-greens',
    fetched: '2026-08-18',
    claim: 'Global wholesale fresh collard greens ranged from $0.31 to $1.26 per pound over the four weeks to mid-August 2026.',
  },
  'collards-retail-2026': {
    org: 'US collard greens retail and wholesale listings, July 2026 (listing - figures read from search results)',
    url: 'https://www.foodomarket.com/en-us/products/fresh-fruits-and-vegetables/green-collard',
    fetched: '2026-08-18',
    claim: 'Collard greens 2026: NYC wholesale $2.16 per count as of 2026-07-07, with a 12-month case range of $19.95-26.95 and a typical week near $24.95. At retail, $2.28/lb at Giant Eagle and $4.00 a bunch at a university farm stand; frozen is dearer at $5.00 a pound.',
  },
  'wings-extension-2026': {
    org: 'Alabama Cooperative Extension System, "Chicken Wings Market Starts Strong in 2026" - land-grant extension market report (fetched)',
    url: 'https://www.aces.edu/blog/topics/farm-management/chicken-wings-market-starts-strong-in-2026/',
    fetched: '2026-08-18',
    claim: 'Chicken wings 2026: wholesale started the year below $1.00/lb and has risen to slightly above $1.10/lb as of early February. Southeast retail average for conventional fresh party wings is $2.49/lb, with IQF (frozen) slightly higher at $2.67/lb.',
  },
  'wings-retail-2026': {
    org: 'US chicken-wing retail pricing guide, 2026 (listing - figures read from search results)',
    url: 'https://latestcost.com/average-cost-chicken-wings-what-determines-pricing-how-much/',
    fetched: '2026-08-18',
    claim: 'Retail chicken wings 2026 run $2.50-5.00/lb. Frozen average $2.50-3.50/lb; fresh and organic reach $4.50/lb and above. Walmart frozen bulk is $2.67/lb for an 8lb bag against $3.21/lb for a 4lb bag - the bulk discount is real but small.',
  },
  'salmon-market-2026': {
    org: 'Selina Wamucii US salmon market prices, updated monthly (fetched)',
    url: 'https://www.selinawamucii.com/insights/prices/united-states-of-america/salmon/',
    fetched: '2026-08-18',
    claim: 'US salmon June 2026: retail estimated US$10.78/kg (US$4.89/lb), wholesale estimated US$10.91/kg (US$4.95/lb). ATLANTIC salmon specifically is far higher at US$29.21/kg (US$13.25/lb). Tracking began June 2026 so no month-over-month or year-over-year comparison exists yet.',
  },
  'salmon-retail-2026': {
    org: 'US salmon retail price guides, 2026 (listing - figures read from search results)',
    url: 'https://latestcost.com/salmon-cost-per-pound-price-u-s-shoppers/',
    fetched: '2026-08-18',
    claim: 'Farmed Atlantic salmon at grocery 2026: fresh fillet $8-12/lb (an alternative guide says $9-13); frozen store-brand fillet $5.50-7.50/lb. Regional discounts or surcharges move the per-pound price 5-15%, and price varies by cut - fillet against portion against whole.',
  },
  'ham-usda-2026': {
    org: 'USDA weekly retail report, quoted in 2026 Easter ham price coverage (listing - figures read from search results)',
    url: 'https://www.aol.com/articles/much-more-paying-ham-easter-185621001.html',
    fetched: '2026-08-18',
    claim: 'USDA retail report: the average price of a conventional bone-in spiral-sliced half ham across 30,425 US stores was $2.25/lb for the week of March 30, 2026. This is an Easter-week average, when ham is promoted heavily.',
  },
  'ham-retailer-2026': {
    org: 'US grocery ham price roundups, Easter 2026 (listing - figures read from search results)',
    url: 'https://thecouponproject.com/best-ham-prices-at-grocery-stores/',
    fetched: '2026-08-18',
    claim: 'Bone-in spiral ham by retailer, Easter 2026 PROMOTIONAL pricing: Kroger and Meijer store brand $0.85/lb; Albertsons Cooks and Wegmans (rewards) $1.19/lb; Aldi Appleton Farms $1.49/lb; Walmart Sugardale whole ham about $2.00/lb; Whole Foods bone-in half ham about $5.60/lb with a Prime discount. The $0.85 floor is a holiday loss-leader, not a year-round shelf price.',
  },
  'sausage-butcher-2026': {
    org: 'Wilson Beef Farms smoked kielbasa - fetched product page with an explicit per-pound price',
    url: 'https://www.wilsonbeeffarms.com/product/smoked-kielbasa/',
    fetched: '2026-08-18',
    claim: 'Smoked kielbasa from a working butcher is $5.89 per pound (page states "Price per pound $5.89"), local pickup, prices subject to change.',
  },
  'sausage-producer-2026': {
    org: 'US smoked-sausage producer listings, 2026 (listing - figures read from search results)',
    url: 'https://ramcountrymeats.colostate.edu/product/smoked-polish-kielbasa-sausage/',
    fetched: '2026-08-18',
    claim: 'Smoked kielbasa per pound 2026 across independent producers: RAM Country Meats $5.49, Wilson Beef Farms $5.89, Full Quiver Farm $11.25 at the artisanal end. Andouille is carried by specialty butchers but is rarely listed at a standardised per-pound price, and major grocery chains sell these by package weight rather than per pound.',
  },
  'balloon-kits-2026': {
    org: 'Shimmer & Confetti balloon garland collection - fetched catalogue with per-kit pricing',
    url: 'https://shimmerandconfetti.com/collections/balloon-garland',
    fetched: '2026-08-18',
    claim: 'DIY balloon garland and arch kits 2026: a 10-foot pastel kit is $20.99; a 155-piece premium white/silver/gold/gray arch and garland kit is $36.99 (from $64.99); a custom kit with 5, 11 and 18-inch balloons is $89.99 at the top of the range. Standard 16-foot kits carry roughly 150+ balloons.',
  },
  'balloon-bulk-2026': {
    org: 'TableclothsFactory balloon arch kits and garlands - fetched wholesale catalogue',
    url: 'https://tableclothsfactory.com/collections/balloon-arch-kits-garlands',
    fetched: '2026-08-18',
    claim: 'Wholesale balloon pricing 2026: latex garland kits of 94-120 balloons run about $12.09 each and hold that price across the catalogue; 100-128 balloon assortment kits $5.49-9.59; foil balloon bouquet sets $1.89-4.19 for 5-6 balloons; a 19ft heavy-duty arch STAND holding up to 400 balloons is $51.69. The stand is reusable equipment, not a per-event consumable.',
  },
  'banner-retail-2026': {
    org: 'Dollar Tree happy-birthday banner listings (listing - figures read from search results; dollartree.com returned 503 and partycity.com 404 on direct fetch)',
    url: 'https://www.dollartree.com/happy-birthday-letter-banner-1-ct/326583',
    fetched: '2026-08-18',
    claim: 'A party-store happy-birthday banner is $1.25 at Dollar Tree, including foil letter banners and 2-count banner packs, and shoppers assemble complete birthday decoration sets there for under $10. Generic (non-personalised) party backdrops run about $9.99-25.99. Custom printed backdrops are a separate tier at $49-98 and are excluded from this claim.',
  },
  'linen-rental-2026': {
    org: 'CV Linens, "How Much Does It Cost To Rent Tablecloths" (fetched)',
    url: 'https://www.cvlinens.com/blogs/styling-tips/how-much-does-it-cost-to-rent-tablecloths',
    fetched: '2026-08-18',
    claim: 'Tablecloth rental 2026: polyester approximately $5-15 per unit; satin or sequin $15-30 a piece; larger tablecloths $20-40 a piece depending on material and style. Buying instead: a basic tablecloth is about $10 and specialty items run $20-100 or more.',
  },
  'linen-rental-sizes-2026': {
    org: 'Reventals Event Rentals, "How Much Does It Cost to Rent Linens? Buying vs Renting" - published size-banded day rates (fetched)',
    url: 'https://www.reventals.com/blog/rent-buy-linens-event/',
    fetched: '2026-08-18',
    claim: 'Linen day rates 2026 by size. Round: 84-96in $8-17, 108-120in $13-22, 132in $20-23. Rectangular: 60x96-60x120in $7.50-12, 72x120-90x108in $11-13, 90x132-90x156in $19-25. NAPKINS $0.60-1.25 a day each. Buying comparison: satin tablecloths $16.78 each online against $50-100+ for silk or high-end satin, with professional cleaning at $11.50 per tablecloth - so an owned linen still carries a per-use cost.',
  },
  'bls-oj-2026': {
    org: 'Basket Report, republishing US Bureau of Labor Statistics CPI Average Price Data (series APU0000713111, orange juice frozen concentrate, cost per 16 ounces) (fetched)',
    url: 'https://basketreport.com/prices/oj/',
    fetched: '2026-08-18',
    claim: 'BLS US city average, July 2026 (released 2026-08-12): orange juice frozen concentrate $4.82 per 16 fl oz of concentrate, down 1.2% on the month and up 3.8% on the year. A 12oz can is about $3.62 and reconstitutes to roughly 48oz, i.e. about $0.60 per 8oz glass. This is the concentrate series, not ready-to-drink chilled juice.',
  },
  'icedtea-lemonade-2026': {
    org: 'US grocery gallon listings for ready-to-drink iced tea and lemonade, with a homemade-cost guide (listing - figures read from search results)',
    url: 'https://www.walmart.com/c/kp/lemonade-gallon',
    fetched: '2026-08-18',
    claim: 'Ready-to-drink by the gallon 2026: Turkey Hill lemonade tea $3.28, Milos famous sweet tea $3.94, Milos sweet tea and lemonade half-and-half $4.48. A gallon is sixteen 8oz cups, so that is $0.21-0.28 per cup. A separate homemade-lemonade guide puts a made-at-home gallon at $3.00-5.00, or $0.20-0.35 per cup, which corroborates the ready-to-drink band rather than undercutting it.',
  },
  'bls-produce-2026': {
    org: 'Basket Report, republishing US Bureau of Labor Statistics CPI Average Price Data (series APU0000712112 white potatoes, APU0000711211 bananas) (fetched)',
    url: 'https://basketreport.com/prices/potatoes/',
    fetched: '2026-08-16',
    claim: 'BLS average retail price per pound, July 2026 (released 2026-08-12): white potatoes $0.94/lb, up 2.1% on the month and down 3.7% on the year; bananas $0.65/lb, up 0.8% on the month and down 1.1% on the year. These are national city-average retail prices for the raw commodity, not a prepared or finished dish.',
  },
  'usda-produce-outlook-2026': {
    org: 'USDA ERS Food Price Outlook / Fruit and Vegetable Prices (fetched)',
    url: 'https://ers.usda.gov/data-products/fruit-and-vegetable-prices/highlights-and-interactive-charts',
    fetched: '2026-08-16',
    claim: 'USDA ERS 2026 outlook: fresh vegetable retail prices predicted to rise 6.8% (interval 4.3-9.5%) and fresh fruit 2.0% (interval 0.2-3.9%). Its price tables are per CUP EQUIVALENT for 2023 (sweet potatoes $0.58, watermelon $0.26, onions $0.42, baby carrots $0.40, fresh okra $2.60), NOT per pound — so it corroborates direction and magnitude for produce but cannot itself price a per-pound line.',
  },
  // ── MIXERS AND FOIL/WRAP (registered 2026-08-16) ──────────────────────────
  // Both families were recorded as unresearchable earlier today, and both were
  // simply behind the wrong retailer: Walmart and Amazon return bot-checks to a
  // fetcher, Target does not. "No source" meant "two hosts refused me" again.
  'mixers-retail-2026': {
    org: 'Target product listings, Canada Dry tonic water 1L and ginger ale 2L (fetched)',
    url: 'https://www.target.com/p/canada-dry-tonic-water-1-l-bottle/-/A-47100023',
    fetched: '2026-08-16',
    claim: 'Bar mixers at retail 2026: Canada Dry tonic water 1L $1.99; Canada Dry ginger ale 2L $2.99, listed at $0.04 per fluid ounce. Club soda sells in the same 1L and 2L formats at comparable shelf prices, so a mixer allowance of roughly $2-3 a bottle covers tonic, club soda and ginger ale alike.',
  },
  'foil-wrap-2026': {
    org: 'Target product listing, Reynolds Wrap aluminum foil, full size ladder with unit pricing (fetched)',
    url: 'https://www.target.com/p/reynolds-wrap-heavy-duty-aluminum-foil-130-sq-ft/-/A-47976048',
    fetched: '2026-08-16',
    claim: 'Aluminum foil at retail 2026, with Target unit pricing: standard 75 sq ft $5.99 ($0.08/sq ft); standard 200 sq ft $16.19 ($0.08); heavy duty 50 sq ft $5.99 ($0.12); heavy duty 130 sq ft $13.49 ($0.10); heavy duty wide 75 sq ft $10.19 ($0.14); non-stick 130 sq ft $15.19 ($0.12). So foil runs $0.08-0.14 per square foot and $6-16 a roll depending on size and grade.',
  },
  // ── THE PAPER-GOODS KIT, COMPONENT BY COMPONENT (2026-08-16) ──────────────
  //
  // These kits were the last big shape-blocked family: 8+ lines reading "Paper
  // goods (tablecloth, foil, leftover containers)" or "Foil pans + foil + serving
  // spoons". A kit band is a SUM, and a sum needs every addend priced - citing
  // foil alone would be the decoration this corpus declines by rule. Foil had
  // just been registered; the rest are here, all from listings that publish
  // per-unit pricing so a sum can be built rather than guessed.
  'disposable-kit-2026': {
    org: 'Target listings for disposable table covers, foil pans, food storage bags and chafing fuel, all with per-unit pricing (fetched)',
    url: 'https://www.target.com/s/disposable+plastic+tablecloth',
    fetched: '2026-08-16',
    claim: 'Kit components at retail 2026, with unit pricing: plastic table covers $1.00 each for a single 54x108 (multi-packs $21.99 per 32 to $29.99 per 12, decorative prints $2.50-3.50); disposable foil pans $1.18-4.45 each in small packs, or bulk at $22.99 per 50 8x8 and $33.99 per 30 9x13; gallon storage bags $0.09-0.26 per bag (Dealworthy 13ct $1.19, Hefty 38ct $4.99, Ziploc slider 28ct $6.69); Sterno canned chafing fuel $3.99 per 6.96oz can, $0.57 per fluid ounce.',
  },
  // ── CANDLES AND PROPANE (registered 2026-08-16) ───────────────────────────
  'candles-retail-2026': {
    org: 'Target listings for unscented pillar, votive and taper candles, with per-ounce unit pricing (fetched)',
    url: 'https://www.target.com/s/unscented+pillar+candles',
    fetched: '2026-08-16',
    claim: 'Unscented candles at retail 2026: 3x3 pillars $6.50 a 3-pack ($0.24/oz, 90hr burn); 3x6 pillars $6.00 a 2-pack ($0.15/oz, 130hr); votives $8.50 an 8-pack ($1.12/oz, 15hr each); tapers $7.00 a 12-pack ($0.30/oz, 6hr each). Decorative and artisan pillars run far higher (a 3-pack of 3x8 ivory at $51.99), so the band for ordinary event candles is the store-brand tier, not the decor tier.',
  },
  'propane-exchange-2026': {
    org: 'PropaneHQ, "Blue Rhino Propane Refill Cost in 2026" (fetched), with Target listings for small cylinders',
    url: 'https://propanehq.com/blue-rhino-propane-refill-cost/',
    fetched: '2026-08-16',
    claim: 'A 20lb propane tank EXCHANGE runs $20-25 on average in 2026, $18-22 at the low end and $26-35+ in premium locations (named: $15.99 at a farm store, $20.72 at H-E-B, $23.99 at Walgreens). A local refill is cheaper at $15-20. IMPORTANT for sizing: an exchanged 20lb tank holds only 15lb of propane, filled to 80% capacity - the company cut it from 17lb in 2008 - so an exchange buys less fuel than a refill of the same tank. Small camping cylinders are $5.99 for 16oz, $10.99 a 2-pack, $15.79 a 3-pack.',
  },
  // Second sources so candles and propane meet minCorroboration 2. Both were
  // caught by `researchPolicyCompliance` as single-source citations AFTER that
  // gate was widened to see costProvenance - the gate working on its author.
  'propane-ace-2026': {
    org: 'Ace Hardware product listing, Blue Rhino 20 lb steel LP tank exchange (fetched)',
    url: 'https://www.acehardware.com/departments/outdoor-living/grills-and-smokers/propane-cylinders-and-accessories/8679912',
    fetched: '2026-08-16',
    claim: 'A Blue Rhino 20 lb LP tank exchange lists at $23.99 at Ace Hardware, an independent point inside the $20-25 national average band and just under the $26-35 premium tier.',
  },
  'candles-event-2026': {
    org: 'Wedding Clever, "Wedding Candles: Types, Costs and Decorating Guide" (fetched)',
    url: 'https://www.weddingclever.com/wedding-candles',
    fetched: '2026-08-16',
    claim: 'Event candles by type 2026: tapers $12-28 a dozen (about $1.00-2.33 each); pillars $8-22 each for a 3x4; votives and tea lights $9-18 per 50-pack (about $0.18-0.36 each); floating $10-25 a dozen; LED or flameless $18-45 for a 6-pack (about $3.00-7.50 each). A couple spends $280-650 on candles across a wedding, and about $220-300 buying in bulk for 100 guests. Note this is the EVENT-DECOR tier and runs above the store-brand household tier.',
  },
  // ── CULTURAL RITUAL OBJECTS — INSIDER PASS (registered 2026-08-16) ────────
  // These lines price objects that belong to a living practice, not generic
  // homewares, so the sources are community and specialist retailers rather than
  // whatever a marketplace search returns first. A jebena is not "a clay pot".
  //
  // WHAT THE PASS FOUND, and it was not what I expected: the Ethiopian ceremony
  // objects were UNDERPRICED in the corpus, not over. Every source found — an
  // Ethiopian-owned shop, an importer selling artisan pots made in Ethiopia, and
  // the secondhand market — prices a jebena at or above the authored band's TOP.
  // The Ethiopian-owned shop is the most expensive of the three, which is worth
  // stating plainly because it kills the assumption I started with: that
  // specialty retail was a markup and a community shop would be the cheap channel.
  //
  // The Kwanzaa objects, by contrast, were priced about right.
  //
  // LIMIT, recorded rather than papered over: every price here is ONLINE retail.
  // An in-person Ethiopian market in the DMV (the roster names U Street's Little
  // Ethiopia) may price differently, and no online source establishes that. A
  // host who already owns the jebena — most Ethiopian households do — buys none
  // of this. That is a real insider fact the corpus should carry and does not.
  'sheromeda-jebena-2026': {
    org: 'Sheromeda.com, Ethiopian goods retailer — "Jebena, Traditional Ethiopian Coffee Pot" (fetched)',
    url: 'https://sheromeda.com/products/jebena-traditional-ethiopian-coffee-pot',
    fetched: '2026-08-16',
    claim: 'A hand-made 100% ground-clay buna jebena from an Ethiopian goods retailer lists at $79.99.',
  },
  'ancientcookware-jebena-2026': {
    org: 'Ancient Cookware, Ethiopian Collection — clay jebena, artisan-made in Ethiopia (fetched)',
    url: 'https://ancientcookware.com/ethiopian-collection/ethiopian-clay-jebena-coffee-pot-detail',
    fetched: '2026-08-16',
    claim: 'Clay jebena by size: small 7 oz $44.99, medium 12 oz $54.99, large 24 oz $64.99. Pots are hand-crafted by artisans in Ethiopia.',
  },
  // TWO retailers, so TWO ids. The first draft bundled them into one entry and
  // the corroboration gate correctly rejected the citation that leaned on it:
  // the pricing policy needs two INDEPENDENT sources, and one id is one source
  // however many shops its prose names.
  'shebelle-sini-2026': {
    org: 'Shebelle Market, Ethiopian grocery — Ethiopian coffee cup (sini) listings',
    url: 'https://shebellemarket.com/product-category/crockery/ethiopian-coffee-cup/',
    fetched: '2026-08-16',
    claim: 'Shebelle Market lists individual Ethiopian sini coffee cups at $9.99.',
  },
  'eight50-sini-2026': {
    org: 'Eight50 Coffee — Sini Cups, Ethiopian Traditional Coffee Cups (fetched)',
    url: 'https://eight50coffee.com/products/sini-cups-ethiopian-traditional-coffee-cups',
    fetched: '2026-08-16',
    claim: 'Eight50 Coffee lists traditional Ethiopian sini cups at $5.00. Thin-walled porcelain, about 50 ml, handleless by design so the cup sits in the hand during the ceremony.',
  },
  '7principles-mkeka-2026': {
    org: '7 Principles 365 — Mkeka (Mat), handwoven raffia, handcrafted in Uganda (fetched)',
    url: 'https://www.7principles365.com/product-page/mkeka-mat',
    fetched: '2026-08-16',
    claim: 'A handwoven raffia mkeka, 16 x 13 inches, handcrafted in Uganda, lists at $14.99 on sale from a regular price of $19.99.',
  },
  'blackartdepot-kwanzaa-2026': {
    org: 'BlackArtDepot, Black-owned retailer — Kwanzaa kinaras and candleholders collection (fetched)',
    url: 'https://www.blackartdepot.com/collections/kwanzaa-kinaras-and-kwanzaa-candleholders',
    fetched: '2026-08-16',
    claim: 'Kwanzaa 2026 from a Black-owned retailer: kinara CELEBRATION SETS (holder plus candles, sometimes a mat) run $64.99-89.99 — Arch $64.99, Ankh Third Eye $69.99, Akoma and Kente $79.99, Gye Nyame $84.99, Barlumba Unity Couple from $89.99. A Kwanzaa bamboo mat (mkeka) is $14.99 and a set of Kwanzaa taper candles is $24.99.',
  },
  'sevensymbols-kwanzaa-2026': {
    org: 'Seven Symbols of Kwanzaa, Kwanzaa specialist retailer — kinara and candle sets',
    url: 'https://sevensymbolsofkwanzaa.com/products',
    fetched: '2026-08-16',
    claim: 'Kwanzaa kinara sets with seven mishumaa saba span roughly $10-100: a 7-piece Kwanzaa candle set is $17.00 (from $20.29), a Kwanzaa Celebration Set $69.73, and a Traditional Kwanzaa Celebration Set $75.19 (from $110.15). Mishumaa saba are seven 10-inch smokeless tapers — three red, one black, three green.',
  },
  // ── CHARCOAL AND LIGHTER (registered 2026-08-16) ──────────────────────────
  // The last component blocking the grill-fuel lines. Those lines read
  // "Charcoal / propane + lighter", so propane alone could not carry them - a
  // band that is a sum needs every addend, and charcoal was the missing one.
  'charcoal-retail-2026': {
    org: 'Target listings for Kingsford charcoal briquettes and lighter fluid, with bag weights (fetched)',
    url: 'https://www.target.com/s/charcoal+briquettes+kingsford',
    fetched: '2026-08-16',
    claim: 'Charcoal at retail 2026: standard briquettes $11.19 for 16lb (about $0.70/lb), $7.99 for 8lb (about $1.00/lb), match-light $10.89 for 12lb (about $0.91/lb) and easy-light $5.99 for 4lb (about $1.50/lb) - so the smaller the bag the worse the per-pound price. All-natural lump runs far higher at $43.15 for 12lb (about $3.60/lb). Lighter fluid is $9.79 for 32oz and a refillable utility lighter $2.99.',
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

  // ── WAVE 6 (registered 2026-08-18) ──────────────────────────────────────
  'mixers-walmart-2026': {
    org: 'Walmart.com — Schweppes Tonic Water and Club Soda Mini Cans, 8-pack',
    url: 'https://www.walmart.com/c/kp/schweppes-tonic-water-mini-cans',
    fetched: '2026-08-18',
    claim: 'Schweppes tonic/club soda mini-can 8-pack $18.99. At ~7.5oz per mini can, ~$2.37/can, ~$1.27/4oz pour — pricier per-serving than large-format bottles because mini cans carry a convenience premium, corroborating that basic mixers span roughly $0.25-1.30 per 4oz serving depending on format.',
  },
  'dips-snackstation-2026': {
    org: 'Walmart.com — Sabra Roasted Red Pepper Hummus 17oz ($4.48), Tostitos Queso Dip 15oz (~$4.74), Wholly Guacamole Classic 15oz ($3.42-5.37); Costco Business Delivery — Wholly Guacamole Organic 3x15oz club pack ($12.99, ~$4.33/tub)',
    url: 'https://www.walmart.com/ip/Sabra-Roasted-Red-Pepper-Hummus-Family-Size-17-oz/21881801',
    corroboratingUrl: 'https://www.costcobusinessdelivery.com/p/-/wholly-guacamole-organic-mild-guacamole-15-oz-3-ct/100426470',
    fetched: '2026-08-18',
    claim: 'Party-size tubs of hummus, queso, and guacamole run roughly $0.50-0.65 per 2oz serving across two independent retailers (Walmart single tubs, Costco club-pack guac). Salsa and ranch pricing were NOT corroborated in this pass and are excluded from this figure.',
  },
  'grillgloves-mensjournal-2026': {
    org: "Men's Journal (reporting an Amazon listing) — RAPICCA Heat-Resistant Long-Sleeve Grill Gloves, 932°F rated",
    url: 'https://www.mensjournal.com/shopping/rapicca-heat-resistant-long-sleeve-grill-gloves-amazon-sale',
    fetched: '2026-08-18',
    claim: '932°F-rated neoprene grill gloves, one pair, sale price $18 (list ~$30). A second independent org confirming the existing grillgloves-retail-2026 Walmart figures ($12.97-39.99 per pair depending on brand).',
  },
  'extinguisher-homedepot-2026': {
    org: 'Home Depot — Kidde Home 5-B:C Class BC 2 lb. Fire Extinguisher (KD57-5BC)',
    url: 'https://www.homedepot.com/p/Kidde-Home-5-B-C-Class-BC-2-35-lb-Fire-Extinguisher-21028347/303196149',
    fetched: '2026-08-18',
    claim: 'Small 5-B:C rated fire extinguisher, $22.47. A second independent org confirming the existing extinguisher-retail-2026 Walmart/Do it Best figures ($27.49-52.47) — this smaller-rated unit sits below that range, so a 5-B:C unit is cheaper than a 10-B:C one.',
  },
  'ledcandles-walmart-2026': {
    org: 'Walmart.com — flameless LED tea-light and pillar-style candle multipacks',
    url: 'https://www.walmart.com/ip/12-Pack-Flameless-LED-Tea-Lights-Candles-Flickering-Warm-Yellow-100-Hours-Battery-Powered-Light-Ideal-Party-Wedding-Birthday-Gifts-Home-Decoration/1249292601',
    fetched: '2026-08-18',
    claim: 'Flameless LED candles, 12-pack: tea-light style $14.99 (~$1.25/unit); larger pillar-style with remote $23.99 (~$2/unit). A second independent org confirming ledcandles-thermometer-2026 — commodity multipack candles range roughly $1.25-8.66/unit depending on format (tea light vs pillar vs single-unit multipack).',
  },
  'firstaid-amazon-2026': {
    org: 'Amazon — Johnson & Johnson All-Purpose Portable Compact First Aid Kit, 140 pieces',
    url: 'https://www.amazon.com/Johnson-All-Purpose-Portable-Compact-Emergency/dp/B01M09COIF',
    fetched: '2026-08-18',
    claim: '140-piece compact first-aid kit, $11.50 (Subscribe & Save $10.92). A second independent org confirming the existing firstaid-retail-2026 Walmart figures ($13.99+ for a comparable-sized kit).',
  },
  'corn-kroger-2026': {
    org: 'Kroger.com — Fresh Sweet Corn on the Cob',
    url: 'https://www.kroger.com/p/fresh-sweet-corn-on-the-cob-each/0000000004590',
    corroboratingUrl: 'https://www.kroger.com/p/fresh-sweet-corn-on-the-cob-4-count/0003338370133',
    fetched: '2026-08-18',
    claim: 'Fresh sweet corn on the cob priced per ear: promotional "2 for $1.00" (~$0.50/ear) for singles, and a 4-count tray at $3.99 (~$1.00/ear) off a $4.99 regular price.',
  },
  'corn-walmart-2026': {
    org: 'Walmart.com — fresh sweet corn on the cob',
    url: 'https://www.walmart.com/c/kp/corn-ear',
    fetched: '2026-08-18',
    claim: 'Fresh sweet corn on the cob runs ~$0.38–$0.77 per ear individually, with a 4-count tray at $3.64 (~$0.91/ear). Fresh produce, so seasonal/regional — August is peak season and likely near the low end of this range.',
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
