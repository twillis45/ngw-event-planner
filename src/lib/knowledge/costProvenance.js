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
