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
