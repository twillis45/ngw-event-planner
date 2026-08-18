// Birthday Party — Event OS host playbook (Sprint 55D, data only).
//
// A host-run birthday at home / a backyard / a rented party room. Front-loads
// the theme + headcount decisions, then a realistic day-of setup → party →
// reset. Quantities are common US host/party rules of thumb (see `knowledge`),
// authored honestly as established-consensus / trade-heuristic and labeled
// `synthesized` until a foreground verification pass attaches citations.
// ESM default export — no CJS in src/ (prod-bundle-safe).

const birthday = {
  type: 'Birthday',
  solveFamily: 'birthday',
  family: 'host_driven',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A host-run birthday party (kid or adult) at home, a backyard, or a small rented room. The host is planner, caterer, and cleanup — so the playbook front-loads theme/headcount and back-loads a tight setup + reset.',
    typicalGuests: { low: 12, default: 20, high: 40 },
    typicalDurationHours: 3,
    leadTimeDays: 21,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 15, high: 60, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The song starts and everyone turns to them at once.',
    'The candles are lit and the room goes quiet before the song.',
    'The toast from their best friend — the one they didn\'t expect.',
    'The moment they realize this many people came just for them.',
    'They blow out the candles and look genuinely surprised it all came together.',
  ],

  decisions: [
    { id: 'theme', label: 'Pick a theme / vibe (or "no theme")', ask: 'Is there a theme, or keep it casual?', options: ['Kids character/theme', 'Milestone (decade) theme', 'Cocktail / grown-up', 'Casual / no theme'], default: 'Casual / no theme', when: 'T-21d', blocks: ['decor', 'cake', 'favors'], weight: 'low', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Theme only steers the look of decor, cake, and invites — cosmetic, cheap, and swappable, so the app can safely default it.', tier: 'reasoned' }, why: 'Theme drives decor, cake design, favors, and invite look. Decide first so the rest is coherent.' },
    { id: 'headcount', label: 'Confirm guest count (and kids vs adults)', options: [], default: null, when: 'T-7d', blocks: ['food', 'cake', 'tableware'], weight: 'high', reversibility: 'costly', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'Every food, cake, and tableware amount scales off the count, so a wrong number mis-buys everything — and only the host knows who is really coming.', tier: 'reasoned' }, why: 'Every food/cake/tableware quantity scales from this. Kids vs adults changes food and drink mix.' },
    { id: 'food_style', label: 'Food style', options: ['Cook/grill yourself', 'Order pizza/trays', 'Drop-off catering', 'Potluck'], default: 'Order pizza/trays', when: 'T-10d', blocks: ['food', 'vendors'], costViaApproach: true, weight: 'med', reversibility: 'costly', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Food is the biggest effort-and-cost lever, but trays or drop-off is a safe default and the choice can change right up until you order.', tier: 'reasoned' }, why: 'The biggest effort/cost lever. Trays or drop-off removes the riskiest day-of cooking.' },
    { id: 'alcohol', label: 'Alcohol? (adult parties)', options: ['No alcohol', 'Beer + wine', 'Full bar / signature drink', 'BYOB'], default: 'No alcohol', when: 'T-10d', blocks: ['beverage_purchases'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'Whether to pour at all turns on a kid-vs-adult crowd and who drives home — a host call, though the drinks themselves are cheap to adjust at the store.', tier: 'reasoned' }, why: 'Drives beverage spend, glassware, and whether anyone needs a ride home.' },
    { id: 'dietary', label: 'Collect allergies & dietary needs', options: [], default: null, when: 'T-7d', blocks: ['food'], weight: 'high', reversibility: 'costly', emotionalWeight: 'med', difmCapable: 'needs-host', priorityBasis: { rationale: 'One unflagged nut or dairy allergy is a safety issue, not a courtesy — it must come from the guests before the menu locks.', tier: 'reasoned' }, why: 'Board add: the high-severity allergy risk needs a step that actually asks. Collect from the guest list before locking the menu — one unflagged nut/dairy allergy is a safety issue, not a courtesy.' },
    { id: 'cake', label: 'Cake: bake, order, or cupcakes?', options: ['Order a cake', 'Bake it', 'Cupcakes', 'Both cake + treats'], default: 'Order a cake', when: 'T-7d', dependsOn: ['theme', 'headcount'], weight: 'med', reversibility: 'costly', emotionalWeight: 'high', difmCapable: 'can-derive', deliversHeartMoment: true, priorityBasis: { rationale: 'The lit cake is the moment everyone sings around — the centerpiece of the party, and an ordered one has to be placed ahead so it cannot be left late.', tier: 'reasoned' }, why: 'Ordered cakes need ~3–5 days lead; size scales with headcount (~1 slice/guest).' },
  ],

  milestones: [
    { id: 'bd_setdate', name: 'Set date, headcount target, budget', offsetDays: 21, owner: 'host', category: 'planning', risk: null },
    { id: 'bd_invite', name: 'Send invites + ask RSVP / allergies', offsetDays: 18, owner: 'host', dependsOn: ['bd_setdate'], category: 'guest', risk: { ifDelayed: 'Low RSVP visibility → wrong food/cake quantities', severity: 'med' } },
    { id: 'bd_cake', name: 'Order the cake (or plan to bake)', offsetDays: 7, owner: 'host', dependsOn: ['bd_invite'], category: 'food', risk: { ifDelayed: 'Bakeries book up; rush fees or no cake', severity: 'med' } },
    { id: 'bd_rsvp_close', name: 'Lock final headcount', offsetDays: 3, owner: 'host', dependsOn: ['bd_invite'], category: 'guest', risk: { ifDelayed: 'Over/under-buy food by 20-30%', severity: 'high' } },
    { id: 'bd_shop_nonperish', name: 'Buy decor, drinks, paper goods, favors', offsetDays: 3, owner: 'host', dependsOn: ['bd_rsvp_close'], category: 'shopping', risk: null },
    { id: 'bd_shop_fresh', name: 'Buy/pick up food + cake', offsetDays: 1, owner: 'host', dependsOn: ['bd_rsvp_close', 'bd_cake'], category: 'shopping', risk: { ifDelayed: 'Sold-out items / no cake', severity: 'med' } },
    { id: 'bd_setup', name: 'Decorate, set up food + drinks station', offsetDays: 0, owner: 'host', dependsOn: ['bd_shop_nonperish', 'bd_shop_fresh'], category: 'setup', risk: null },
    { id: 'event', name: 'The party', offsetDays: 0, owner: 'host', dependsOn: ['bd_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'bd_invite', phase: 'guest', label: 'Send invites with date/time/place + RSVP-by + allergy ask', when: 'T-18d' },
    { id: 't_rsvp', milestoneId: 'bd_rsvp_close', phase: 'guest', label: 'Chase non-responders; lock the count', when: 'T-3d' },
    { id: 't_decor_shop', milestoneId: 'bd_shop_nonperish', phase: 'shopping', label: 'Decor, balloons, drinks, paper goods, favors run', when: 'T-3d' },
    { id: 't_food_shop', milestoneId: 'bd_shop_fresh', phase: 'shopping', label: 'Food + pick up the cake', when: 'T-1d' },
    { id: 't_decorate', milestoneId: 'bd_setup', phase: 'setup', label: 'Hang decor, blow up balloons, set the table + food station', when: 'T0 -3h' },
    { id: 't_chill', milestoneId: 'bd_setup', phase: 'beverage', label: 'Chill drinks; set up the drinks station + ice', when: 'T0 -2h' },
    { id: 't_cake', milestoneId: 'event', phase: 'food', label: 'Cake + candles moment; cut + serve', when: 'T0 +1:30' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Pack leftovers, hand out favors, bag trash + recycling, deflate/clear decor', when: 'T0 +3:00' },
  ],

  purchases: [
    { id: 'p_mains', item: 'Pizza or grill proteins (party trays)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco', 'Pizzeria', 'Butcher'], unitCostRange: [3, 8], essential: true, buyAt: 'T-1d', alternatives: ['Frozen pizza (Costco) — cheaper than ordering, feeds same crowd', 'Deli sub tray — easy, no cooking, often cheaper per head', 'Rotisserie chickens — quick pickup, budget protein option'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~0.5 lb main/guest for a casual party meal.', claim: '~0.5 lb of main food per guest is sufficient for a casual birthday party meal (pizza, trays, or grill)', sufficientWhen: '2+ hosting or catering guides for casual home parties confirm the 0.5 lb/guest range' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['warehouse-trays-2026', 'wings-extension-2026', 'usda-meat-2026'], lastVerified: '2026-08-18', claim: 'Party-tray protein priced per pound. A warehouse wing tray is 8 pounds for about $47, i.e. $5.88/lb and $0.65-0.67 a wing - two publishers agree on weight and price. Raw grill proteins are cheaper: wings $2.49-2.67/lb retail, chicken $3-5/lb. PIZZA IS NOT PRICED HERE: no chain publishes a national menu price and every figure found was a third-party aggregator\'s self-described average, so the pizza option is unsourced and the band rests on the tray and grill figures.', sufficientWhen: 'A warehouse tray price with its stated weight, against per-pound raw protein, confirms the band.' }, },
    { id: 'p_chips', item: 'Chips', category: 'food', qtyPerGuest: 0.15, unit: 'lb', where: ['Grocery'], unitCostRange: [3.5, 7], essential: true, buyAt: 'T-3d', alternatives: ['Bag of chips + store-bought dip — cheapest side option'], provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['chips-bls-2026', 'chips-retail-2026'], lastVerified: '2026-08-18', claim: 'Chips per pound. BLS all-chips average $6.56/lb; party-bag retail $3.64-5.87/lb. Row split from a combined chips/veggie-tray/salad band 2026-08-18 — the old $1-3/lb band never matched any chips product.', sufficientWhen: 'Confirmed — BLS and retail figures converge tightly.' } },
    { id: 'p_veggietray', item: 'Veggie tray', category: 'food', qtyFlat: 1, unit: 'tray (serves 12-30)', where: ['Grocery deli'], unitCostRange: [12, 42], essential: false, buyAt: 'T-1d', note: 'Serving count and price scale together — a smaller 40oz tray or a large 112oz platter.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['veggietray-publix-2026', 'veggietray-krogerwalmart-2026'], lastVerified: '2026-08-18', claim: 'Publix large platter (112oz) $41.99, explicitly serves 26-30. Kroger/Walmart 40oz trays run $11.97-12.99 without a stated headcount. Cited 2026-08-18, resolving the prior aggregator-only sourcing gap.', sufficientWhen: 'Confirmed — Publix states its own serving count directly.' } },
    { id: 'p_salad', item: 'Salad', category: 'food', qtyPerGuest: 0.25, unit: 'lb', where: ['Grocery'], unitCostRange: [1.3, 4.5], essential: false, buyAt: 'T-1d', note: 'A packaged deli-style tub, not a per-lb deli-counter price (not published online by any retailer).', alternatives: ['Pre-made pasta salad from deli — if running short on prep time'], provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['salad-kroger-2026', 'salad-walmart-2026'], lastVerified: '2026-08-18', claim: 'Packaged deli-style salad tubs: Kroger 48oz macaroni salad ~$1.33/lb; Walmart 14oz garden pasta salad ~$4.27/lb. Cited 2026-08-18. Deli-counter by-the-pound pricing (a closer match to how a party salad is often bought) is not published online by any retailer and remains unverified.', sufficientWhen: 'A deli-counter per-lb price would replace this packaged-tub proxy.' } },
    { id: 'p_cake', item: 'Cake or cupcakes', category: 'food', qtyFlat: 1, qtyPer: 15, unit: 'cake (serves ~15)', where: ['Bakery', 'Grocery'], unitCostRange: [20, 120], essential: true, buyAt: 'T-1d', note: 'Order 3–5 days ahead; ~1 slice/guest.', alternatives: ['Grocery sheet cake — add custom message, much cheaper', 'Costco half-sheet cake — feeds 30–48, lowest cost per slice'] , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['paperlust-weddingcake-2026', 'retail-sheetcake-2026'], lastVerified: '2026-08-15', claim: 'A cake for ~15 costs $20-120 by channel: a grocery-store bakery runs $1-5 per slice (quarter sheets from ~$24 serve 20-30, a Costco half sheet is $24.99 for ~48), a standard custom bakery $3-8 per slice.', sufficientWhen: 'Re-checked against bakery per-slice and warehouse sheet-cake pricing. Designer and fondant work at $8-20 per slice sits above this band. Commercial prices are stale after 45 days.' } },
    { id: 'p_softdrinks', item: 'Soft drinks, juice, water', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery', 'Costco'], unitCostRange: [1, 2], essential: true, buyAt: 'T-3d' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['beverage-singleserve-2026', 'juice-rtd-2026', 'soda-12pack-2026', 'bottledwater-case-2026'], lastVerified: '2026-08-18', claim: 'A per-drink cost across mixed FORMATS, and format is the whole story. Bought as multipacks the components are cheap: soda $0.25-0.60 a can from a 12-pack, water $0.13-0.25 a bottle from a 24-pack. Bought SINGLY - which is what a self-serve tub of bottles is - a 20oz soda is $2.29-3.39. Ready-to-drink juice sits between at $0.69-0.88 an 8oz serving from a $10.99-14.09 gallon, well above the $0.60 that reconstituted concentrate works out to. A table mixing bottles and poured servings lands in this band; an all-multipack table would sit below it.', sufficientWhen: 'A shopping list at the actual format mix - how many single bottles against how many poured from multipacks - divided per drink, confirms the band.' }, },
    { id: 'p_alcohol', item: 'Beer / wine (adult parties)', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Liquor store', 'Grocery'], unitCostRange: [3, 6], essential: false, buyAt: 'T-3d', dependsOnDecision: 'alcohol', note: 'Board-corrected up from 2: the host rule is ~2 drinks the first hour + 1/hour after ≈ 3-4 over a 3h adult party; 2 under-buys.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['beer-retail-2026', 'beer-budget-2026', 'wine-retail-2026', 'wine-statewide-2026'], lastVerified: '2026-08-16', claim: 'This band is a SUM of separately-priced drink families, not a single quoted item: domestic lager $0.80-1.20 per 12oz (about $20-22 a 24-pack), craft $1.50-3.00; everyday table wine $8-15 a bottle, mid-range $15-30. Each component is cited to its own registered source; the summed band is therefore low-confidence by construction.', sufficientWhen: 'Current shelf prices for one pack of each named component at the same store, summed to the per-serving band, confirm the range.' } },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest for drinks + coolers.', provenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['bar-provision-2026'], note: 'Grounded to bar-provision-2026: ~1.5 lb ice/guest is the source-stated ice provisioning rate.', claim: '~1.5 lb of ice per guest is sufficient for chilling and serving drinks at a 3-hour birthday party', sufficientWhen: '2+ hosting guides or caterer recommendations for indoor party beverage service confirm the 1.5 lb/guest range' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['ice-retail-2026', 'ice-warehouse-2026'], lastVerified: '2026-08-16', claim: 'Bagged ice 2026: warehouse clubs run 10-12c per pound (a 20lb bag is $1.75-2.50 at Sams Club, $1.80-2.50 at Costco); grocery and gas-station bags cluster 23-31c/lb (BJs and 7-Eleven 20lb about $4.49-4.79, Giant 20lb $4.99, Publix 16lb $4.99); small bags and hardware stores reach 41-45c/lb. Convenience ice is more than four times warehouse ice per pound.', sufficientWhen: 'Current shelf prices for one 20lb bag at a warehouse club and one at a grocery store confirm the per-pound spread.' } },
    { id: 'p_decor', item: 'Decorations (balloons, banner, theme kit)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Amazon', 'Target'], unitCostRange: [20, 60], essential: false, buyAt: 'T-3d' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['balloon-kits-2026', 'balloon-bulk-2026', 'banner-retail-2026', 'disposable-kit-2026'], lastVerified: '2026-08-18', claim: 'A SUM of separately-priced components, not one quoted item. Balloon garland kit $12.09 for 94-120 latex balloons wholesale, or $20.99-36.99 for a 10-16ft kit of 150-155 at a specialist retailer; a party-store banner $1.25, with generic non-personalised backdrops $9.99-25.99; disposable table covers $1.00 each for a 54x108 single. Summed, a decor kit lands about $14 at the bulk end and about $64 with a larger balloon kit and a backdrop, which brackets this band. Custom printed backdrops ($49-98) are a different product and are excluded. Low confidence by construction: the MIX is ours, only the components are priced.', sufficientWhen: 'Current shelf prices for one balloon garland kit, one banner and one table cover at the same retailer, summed, confirm the band.' }, },
    { id: 'p_candles', item: 'Birthday candles + lighter', category: 'decor', qtyFlat: 1, unit: 'set', where: ['Grocery', 'Party store'], unitCostRange: [2, 6], essential: true, buyAt: 'T-1d', note: 'COMMONLY FORGOTTEN.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['birthdaycandles-lighters-2026', 'candles-retail-2026'], lastVerified: '2026-08-18', claim: 'Birthday candles with a lighter. A 24-count pack of thin striped wax candles is $0.69 wholesale to $1.19 retail ($0.029-0.05 each) - a distinct product from pillars, votives or LEDs. A disposable butane utility lighter is $4.19-5.59. Together about $4.88-6.78, which brackets this band; a refillable lighter at $26.95 is a different class and would exceed it.', sufficientWhen: 'One candle multipack and one disposable utility lighter, summed, confirm the band.' }, },
    { id: 'p_favors', item: 'Party favors / goodie bags', category: 'decor', qtyPerGuest: 1, unit: 'favor', where: ['Party store', 'Amazon'], unitCostRange: [1, 5], essential: false, buyAt: 'T-3d' , costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['zola-favors-2026', 'theknot-realweddings-2025'], lastVerified: '2026-08-15', claim: 'A per-guest favor runs $1-5, with $3 the typical mid-range spend; 56 percent of couples keep favors at $5 or less per guest. Tiers as published: budget at or under $1, mid-range $2-3, premium $5 and up.', sufficientWhen: 'CONFIDENCE IS LOW ON PURPOSE: the surveys behind this price WEDDING favors, and these are shower, birthday and graduation favors. The product class is the same - a small per-guest keepsake - but the sample is not, so treat the band as transferred rather than measured. Replace it if a non-wedding favor survey is ever found.' } },
    { id: 'p_tableware', item: 'Plates, cups, napkins, cutlery', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Party store', 'Costco'], unitCostRange: [0.25, 2.5], essential: true, buyAt: 'T-3d' , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['disposables-bulk-2026', 'disposables-partyqty-2026'], lastVerified: '2026-08-15', claim: 'A per-guest place setting runs $0.25-2.50 depending entirely on channel: bulk restaurant supply puts plates at $0.08-0.15 each and foam at $0.09, a grocery shelf puts the same basic paper plate at $0.25-0.40, and premium plastic or compostable runs $0.15-0.35 per plate. A setting is 2-3 plates, 2-3 cups, cutlery and 2-3 napkins.', sufficientWhen: 'Re-checked against per-plate pricing and place-setting norms. A deep bulk buy lands near the floor and premium or compostable near the ceiling - the 12x spread is the CHANNEL, not uncertainty. Add 10-15% for spills and unexpected guests. Sets that bundle flutes, koozies, linens or table covers are a different product and are priced separately.' } },
    { id: 'p_paper', item: 'Paper goods (tablecloth, foil, leftover containers)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [10, 20], essential: true, buyAt: 'T-3d' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['disposable-kit-2026', 'foil-wrap-2026', 'disposables-bulk-2026', 'disposables-partyqty-2026'], lastVerified: '2026-08-16', claim: 'A SUM of separately-priced components, not one quoted item. Table covers $1.00 each for a 54x108 single (multi-packs $21.99 per 32); aluminum foil $0.08-0.14 per square foot ($5.99 for 75 sq ft standard, $13.49 for 130 sq ft heavy duty); foil pans $1.18-4.45 each in small packs or $22.99 per 50 in bulk; gallon storage bags $0.09-0.26 each; disposable plates and cutlery about 6 cents a plate in bulk and $0.25-0.40 at grocery. Every component is cited to its own registered source; the summed kit band is low-confidence by construction.', sufficientWhen: 'Current shelf prices for each named component at one retailer, summed to the kit, confirm the band.' } },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels, wipes', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [7, 18], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: extra trash + a recycling bag.' , costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['costco-cleaning-2026', 'trashbags-retail-2026'], lastVerified: '2026-08-15', claim: 'A cleanup kit runs $7-18 as the SUM of its parts: about a dozen trash and recycling bags at 10 cents each from a warehouse or 11-15 cents at grocery, two rolls of paper towels at about $1.97 warehouse, and a canister of wipes at about $4.27 or a dish-soap pack at $14.74 shared across events.', sufficientWhen: 'CONFIDENCE IS LOW ON PURPOSE: no source prices a cleanup kit, because nobody sells one. This band is a sum of individually-priced components, so treat it as an envelope rather than a quote. The spread is the CHANNEL - warehouse packs against a grocery shelf - and a host who already owns soap and towels lands well under the floor. Kits that also carry gloves, foil or to-go containers are a different bundle.' } },
  ],

  rentalsGap: [
    { item: 'Folding tables', qtyFlat: 2, note: 'food + gift table — borrow or rent if short' },
    { item: 'Chairs', qtyPerGuest: 0.6, note: 'not everyone sits at a casual party; ~60% seating' },
    { item: 'Coolers', qtyFlat: 2, note: 'drinks + ice; borrow if needed' },
  ],

  vendors: [
    { category: 'Venue / party room', required: false, altToDIY: 'Host at home or a free park shelter instead of a rented room', when: 'T-21d', costRange: [100, 400], costUnit: 'flat' },
    { category: 'Catering / food', required: false, altToDIY: 'Pizza or grocery trays instead of catering', when: 'T-10d', costRange: [10, 25], costUnit: 'per guest' },
    { category: 'Entertainment (clown, magician, DJ, bounce house)', required: false, altToDIY: 'A playlist + simple games', when: 'T-14d', costRange: [150, 400], costUnit: 'flat' },
    { category: 'Cake / bakery', required: false, altToDIY: 'Bake or buy a grocery cake', when: 'T-7d', costRange: [25, 90], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_headcount', trigger: 'Final headcount still not locked 3 days out', severity: 'high', mitigation: 'Chase RSVPs; buy fresh after the count locks; round up ~10%, not 30%.' },
    { id: 'r_cake', trigger: 'Cake ordered too late', severity: 'med', mitigation: 'Order 3–5 days ahead; have a grocery-cake backup.' },
    { id: 'r_ice', trigger: 'No ice / warm drinks', severity: 'low', mitigation: 'Buy ~1.5 lb ice/guest day-of; pre-chill drinks.' },
    { id: 'r_allergy', trigger: 'Kid food allergies not collected', severity: 'high', mitigation: 'Ask allergies with the invite; label nut-free options; keep a safe snack.' },
    { id: 'r_weather', trigger: 'Outdoor party, no rain plan', severity: 'med', mitigation: 'Confirm an indoor fallback or a tent/canopy 3 days out.' },
  ],

  contingencies: [
    { id: 'c_rain', when: 'r_weather', plan: 'Move indoors or set up a 10x10 canopy; notify guests the morning of.' },
    { id: 'c_cake', when: 'r_cake', plan: 'Grab a grocery sheet cake + candles same-day; nobody will know.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Decor, drinks, paper goods, favors, tableware, cleanup kit' },
      { when: 'T-1d', what: 'Food, cake pickup, candles' },
      { when: 'T0', what: 'Ice + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Prep make-ahead sides; assemble favors; charge speaker' },
      { when: 'T0 -3h', what: 'Decorate, blow up balloons, set food + drinks stations' },
    ],
    setup: [
      { when: 'T0 -2:55', what: 'Decor + tables + food station' },
      { when: 'T0 -2h', what: 'Chill drinks; build the drinks station + ice; stage trash/recycling' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Doors: greet people, drinks out, music on' },
      { when: 'T0 +30m', what: 'Food out while everyone’s still arriving' },
      { when: 'T0 +1:15', what: 'Cake, candles and the song — do it before anyone starts leaving' },
      { when: 'T0 +1:40', what: 'Gifts if there are gifts; someone writes down who gave what' },
      { when: 'T0 +2h', what: 'The hang — this is the actual party, don’t over-program it' },
      { when: 'T0 +3:30', what: 'Wind down: to-go plates, thank people as they go' },
    ],
    cleanup: [
      { when: 'during', what: 'Bus into a tub; keep a trash + recycling bag visible' },
      { when: 'T0 +3h', what: 'Leftovers to containers, favors out, bag trash/recycling, deflate/clear decor' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Quantities reflect common US host/party rules of thumb (~0.5 lb main/guest, ~1 cake slice/guest, ~2 drinks/guest for a 3h party, ~1.5 lb ice/guest). Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default birthday;
