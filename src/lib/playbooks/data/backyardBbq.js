// Backyard BBQ / Get-Together — Event OS host playbook (Sprint 55D, data only).
//
// A casual backyard cookout / get-together: grill-forward, drinks in coolers,
// disposable tableware, outdoor comfort. Registered under the canonical
// 'Get-Together' type (BBQ / cookout / backyard all resolve there). NO venue —
// it's the host's yard. Quantities are common US cookout rules of thumb (see
// `knowledge`), authored honestly and labeled `synthesized` until verified.
// ESM default export.

const backyardBbq = {
  type: 'Get-Together',
  vegMain: 'Grilled portobello caps + veggie skewers',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A casual backyard BBQ / get-together. Grill-forward, drinks-in-coolers, disposable tableware, outdoor comfort. Lowest-formality host event — the playbook keeps decisions light and front-loads fuel + ice + shade so the host can actually hang out.',
    typicalGuests: { low: 8, default: 16, high: 30 },
    typicalDurationHours: 4,
    leadTimeDays: 14,
    hostDifficulty: 'easy',
    perGuestCost: { low: 12, high: 40, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The grill is going, music is right, and everyone is exactly where they should be.',
    'Kids running in the yard while the adults finally get to sit and catch up.',
    'Someone flips a burger and the whole yard smells like summer.',
    'The cooler opens and there\'s exactly the right beer for everyone.',
  ],

  decisions: [
    { id: 'food_style', weight: 'high', reversibility: 'costly', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Sets whether the host is chained to the grill all day or a paid pitmaster runs it — the biggest effort-and-money lever, though the app can safely default to host-grilled.', tier: 'reasoned' }, label: 'Who handles the food?', options: ['Host grills everything', 'Hire a BBQ caterer / pitmaster', 'Potluck — guests bring sides'], default: 'Host grills everything', when: 'T-14d', blocks: ['food', 'vendors'], costFactors: { 'Hire a BBQ caterer / pitmaster': 1.4, 'Potluck — guests bring sides': 0.75 }, costFactorProvenance: { researchIntent: 'vendor-capability', tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['catering-perperson-2026'], note: 'Grounded to catering-perperson-2026: hired pitmaster vs host-grilling vs potluck are the labor-driven service-tier ratios the source establishes.', claim: 'Hiring a BBQ pitmaster adds ~40% to total event cost and a potluck-sides arrangement reduces it ~25% vs. the host grilling everything', sufficientWhen: '2+ regional BBQ catering quotes compared against host-grill grocery costs confirm the ~40% and ~25% adjustment ratios' }, affects: ['p_protein', 'p_sides'], why: 'The biggest effort lever — for 25+ guests or all-day smoking, a pitmaster is what lets the host actually host instead of standing at the grill all day.' },
    { id: 'menu', weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Sets the proteins, buns, and fuel, but nothing here cannot be swapped right up to the day-before grocery run — burgers and dogs are a safe default.', tier: 'reasoned' }, label: 'Grill menu (proteins + sides)', options: ['Burgers + dogs', 'Chicken + ribs', 'Mixed grill', 'Seafood boil / cookout'], default: 'Burgers + dogs', when: 'T-10d', dependsOn: ['food_style'], standsDownWhen: { id: 'food_style', in: ['Hire a BBQ caterer / pitmaster'] }, blocks: ['food', 'fuel'], costFactors: { 'Chicken + ribs': 1.15, 'Mixed grill': 1.2, 'Seafood boil / cookout': 1.4 }, costFactorProvenance: { tier: 'synthesized', confidence: 'medium', verificationStatus: 'synthesized', note: 'Cost factor heuristics need verification against actual pricing (usda-meat-2026 covers beef/chicken/pork but not the seafood-boil clause, so this stays synthesized).', claim: 'Chicken+ribs costs ~15% more than burgers/dogs per guest, a mixed grill ~20% more, and a seafood boil ~40% more at current protein prices', sufficientWhen: 'current retail protein prices at grocery/Costco confirm the cost-per-lb spread between burger/dog, chicken+ribs, mixed grill, and seafood formats' }, affects: ['p_protein'], why: 'Drives proteins, buns, fuel, and grill time. Burgers/dogs are the lowest-effort default.' },
    { id: 'potluck', weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Assigning sides and drinks roughly halves the host load, but it is a loose ask that is easy to rearrange — a modest, reversible call.', tier: 'reasoned' }, label: 'Host-provided or potluck sides?', options: ['Host provides all', 'Potluck sides', 'Host grills, guests bring drinks'], default: 'Host grills, guests bring drinks', when: 'T-10d', standsDownWhen: { id: 'food_style', in: ['Hire a BBQ caterer / pitmaster', 'Potluck — guests bring sides'] }, blocks: ['food', 'beverage_purchases'], costViaApproach: true, why: 'Biggest cost/effort lever — assigning sides/drinks cuts the host load roughly in half.' },
    { id: 'alcohol', weight: 'low', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Sets cooler and ice volume and whether anyone needs a ride home, but it is a cheap store run — beer, soda, and water is always a safe default.', tier: 'reasoned' }, label: 'Drinks', options: ['Beer + soda + water', 'BYOB', 'Full cooler bar', 'Dry / family-friendly'], default: 'Beer + soda + water', when: 'T-7d', blocks: ['beverage_purchases'], why: 'Drives cooler + ice volume and whether anyone needs a ride.' },
    { id: 'shade', weight: 'med', reversibility: 'costly', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'Shade and seating are what keep an outdoor cookout from ending early in the sun, and a tent has to be rented ahead — the host has to say what their own yard already has.', tier: 'reasoned' }, label: 'Shade + seating plan (outdoor comfort)', options: ['Existing patio/shade', 'Pop-up canopy', 'Rent tent + tables', 'Park shelter'], default: 'Existing patio/shade', when: 'T-7d', why: 'Sun, bugs, and nowhere to sit end a cookout early — plan shade + seating up front.' },
  ],

  milestones: [
    { id: 'bbq_setdate', name: 'Set date, headcount, menu', offsetDays: 14, owner: 'host', category: 'planning', risk: { ifDelayed: 'Weather window unknown', severity: 'low' } },
    { id: 'bbq_invite', name: 'Invite + assign potluck/drinks', offsetDays: 10, owner: 'host', dependsOn: ['bbq_setdate'], category: 'guest', risk: { ifDelayed: 'Duplicate sides, missing drinks', severity: 'low' } },
    { id: 'bbq_rsvp', name: 'Loose headcount + weather check', offsetDays: 3, owner: 'host', dependsOn: ['bbq_invite'], category: 'guest', risk: { ifDelayed: 'Wrong protein quantity; no rain plan', severity: 'med' } },
    { id: 'bbq_shop_nonperish', name: 'Buy drinks, fuel, disposables, bug/sun supplies', offsetDays: 3, owner: 'host', dependsOn: ['bbq_rsvp'], category: 'shopping', risk: null },
    { id: 'bbq_shop_fresh', name: 'Buy proteins, buns, produce, condiments', offsetDays: 1, owner: 'host', dependsOn: ['bbq_rsvp'], category: 'shopping', risk: { ifDelayed: 'Sold-out proteins', severity: 'med' } },
    { id: 'bbq_setup', name: 'Set up grill, coolers, shade, seating', offsetDays: 0, owner: 'host', dependsOn: ['bbq_shop_nonperish', 'bbq_shop_fresh'], category: 'setup', risk: null },
    { id: 'event', name: 'The cookout', offsetDays: 0, owner: 'host', dependsOn: ['bbq_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'bbq_invite', phase: 'guest', label: 'Group text invite; assign sides/drinks if potluck', when: 'T-10d' },
    { id: 't_weather', milestoneId: 'bbq_rsvp', phase: 'guest', label: 'Check the forecast; confirm shade/rain plan; loose headcount', when: 'T-3d' },
    { id: 't_nonperish_shop', milestoneId: 'bbq_shop_nonperish', phase: 'shopping', label: 'Drinks, charcoal/propane, disposables, bug spray, sunscreen', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'bbq_shop_fresh', phase: 'shopping', label: 'Proteins, buns, produce, condiments', when: 'T-1d' },
    { id: 't_prep', milestoneId: 'bbq_setup', phase: 'food', label: 'Marinate proteins; prep cold sides; check fuel level', when: 'T-1d evening' },
    { id: 't_grill', milestoneId: 'event', phase: 'food', label: 'Fire up the grill ~45 min before; cook in batches', when: 'T0 -0:45' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Cool + scrape the grill, pack leftovers, bag trash + recycling, fold chairs/canopy', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_protein', item: 'Burgers, hot dogs & chicken', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco', 'Butcher'], unitCostRange: [4, 10], sourcingPrices: { butcher: [4, 7], costco: [3, 6], grocery: [4, 8] }, essential: true, buyAt: 'T-1d', alternatives: ['Pork shoulder — cheaper, feeds a crowd smoked low & slow', 'Bone-in chicken thighs — budget-friendly, hard to overcook', 'Turkey burgers — leaner swap, same cook time'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'cited', lastVerified: '2026-06', note: 'Blended burger/dog/chicken $/lb by channel: Costco ground beef ~$3.29 bulk / $6.80 packs, chicken ~$1–2.5; grocery ground beef $5.86–7.66.', sources: ['https://www.beyondforest.org/post/costco-meat-prices-list-2025', 'https://www.thekitchn.com/costco-kirkland-90-10-ground-beef-review-23776246', 'https://www.eatlikenoone.com/chicken-prices-at-costco.htm'], claim: 'Ground beef costs $3.29/lb bulk at Costco ($6.80/lb packs) and $5.86–7.66/lb at grocery; chicken runs $1–2.5/lb at Costco as of 2026-06', sufficientWhen: 'verified — Costco and grocery channel prices as of 2026-06 confirm the $/lb ranges by channel', sourceHint: 'Costco channel pricing for ground beef (bulk and pack) and chicken; grocery store shelf prices for ground beef' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['costco-groundbeef-2026', 'usda-meat-2026'], lastVerified: '2026-08-16', claim: 'Ground beef runs about $3.29/lb in bulk at Costco or $6.80/lb in packs, against $5.86-7.66/lb at grocery; US all-fresh beef averages about $9.64/lb in 2026. Hot dogs and links run lower per pound.', sufficientWhen: 'Current per-pound prices for ground beef at one warehouse club and one grocery store confirm the range.' } },
    { id: 'p_buns', item: 'Buns / bread', category: 'food', qtyPerGuest: 2, unit: 'buns', where: ['Grocery', 'Bakery'], unitCostRange: [0.3, 0.6], essential: true, buyAt: 'T-1d', alternatives: ['Sliced white bread — cheaper, works for dogs and burgers', 'Tortillas — versatile, cheaper per serving'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['buns-kroger-2026', 'buns-walmart-2026'], lastVerified: '2026-08-18', claim: 'Buns 2026, priced per bun from 8-count packs. Kroger: Private Selection sweet Hawaiian hot dog buns $3.99/8ct (about $0.50 each on promotion, $0.69 undiscounted); CARBmaster hamburger buns $3.99/8ct; Artesano potato hot dog buns $3.99/8ct. Walmart: Loves hamburger buns $4.64/8ct (about $0.58 each). Plain white buns sit at the floor of this range; brioche, Hawaiian and potato styles price above it.', sufficientWhen: 'One current 8-count bun-pack price at each of two retailers, divided per bun, confirms the band.' }, },
    { id: 'p_sides', item: 'Salads, beans, corn & chips', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery'], unitCostRange: [2, 4], essential: true, buyAt: 'T-1d', alternatives: ['Canned baked beans — near-zero prep, same crowd appeal', 'Bag of chips + store-bought dip — if time is short'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_condiments', item: 'Condiments + toppings (ketchup, mustard, cheese, lettuce, onion)', category: 'food', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [15, 30], essential: true, buyAt: 'T-3d' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['condiments-retail-2026', 'cheese-sliced-2026', 'cheese-deli-2026', 'bls-saladveg-2026'], lastVerified: '2026-08-18', claim: 'A SUM of separately-priced components, not one quoted item. CONDIMENTS: ketchup 24oz $1.13 to 32oz $2.48, mustard 14oz $0.77, mayo 30oz $2.34-3.64 - roughly $4-7 for the set. CHEESE: block cheddar $3.58-3.78/lb, processed slices $4.86/lb, deli-cut American $5.99/lb. PRODUCE: romaine lettuce $3.560/lb and field tomatoes $2.154/lb per BLS. Summed for a party-sized table that is roughly $18-31, which brackets this band. PICKLES ARE NOT SEPARATELY PRICED - about a tenth of the kit and the one component still unsourced. Low confidence by construction: the mix is ours.', sufficientWhen: 'Shelf prices for the three condiments, a pound of sliced cheese and the salad produce, summed at the quantities actually bought, confirm the band.' }, },
    { id: 'p_dessert', item: 'Watermelon, cookies & s\'mores', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery'], unitCostRange: [1, 3], essential: false, buyAt: 'T-1d', alternatives: ['Grocery sheet cake — feeds same crowd, no prep', 'Popsicles / ice cream bars — budget option, kids love them'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['watermelon-market-2026', 'warehouse-trays-2026', 'watermelon-retail-2026'], lastVerified: '2026-08-18', claim: 'Dessert per serving. WATERMELON is $0.53/lb, with a by-weight range of $0.30-0.80, so a generous wedge is well under a dollar. COOKIES are $0.42 each from a warehouse 24-count. S\'MORES COMPONENTS ARE NOT SEPARATELY PRICED - marshmallow figures could not be established from two publishers - so the s\'mores line rests on the other two rather than its own evidence, which is why confidence is low.', sufficientWhen: 'A per-pound melon price and a per-cookie price, plus a marshmallow and graham cracker price from two publishers, would confirm the band.' }, },
    { id: 'p_drinks', item: 'Beer, soda & water', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Grocery', 'Costco', 'Liquor store'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~3 drinks/guest over a 4h outdoor afternoon.', claim: '~3 drinks per guest covers a 4-hour outdoor afternoon cookout without over-buying', sufficientWhen: 'hosting or event-planning guides for outdoor summer events confirm the ~3 drinks/guest range for a 4-hour afternoon gathering' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['beer-retail-2026', 'beer-budget-2026', 'soda-12pack-2026', 'bottledwater-case-2026'], lastVerified: '2026-08-16', claim: 'This band is a SUM of separately-priced drink families, not a single quoted item: domestic lager $0.80-1.20 per 12oz (about $20-22 a 24-pack), craft $1.50-3.00; soda $0.25-0.60 a can ($3.00-6.50 a 12-pack); bottled water about $0.17-0.38 a bottle ($4-9 a 24-pack). Each component is cited to its own registered source; the summed band is therefore low-confidence by construction.', sufficientWhen: 'Current shelf prices for one pack of each named component at the same store, summed to the per-serving band, confirm the range.' } },
    { id: 'p_ice', item: 'Ice (coolers + drinks)', category: 'beverage', qtyPerGuest: 2, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~2 lb/guest for outdoor coolers (more than indoors — it melts).', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~2 lb ice/guest for outdoor cooler service (heat-adjusted).', claim: '~2 lb of ice per guest is needed for outdoor cooler service due to faster melt in summer heat vs. indoor events', sufficientWhen: '2+ outdoor-event or cooler-planning references confirm the 2 lb/guest rate for summer outdoor conditions' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['ice-retail-2026', 'ice-warehouse-2026'], lastVerified: '2026-08-16', claim: 'Bagged ice 2026: warehouse clubs run 10-12c per pound (a 20lb bag is $1.75-2.50 at Sams Club, $1.80-2.50 at Costco); grocery and gas-station bags cluster 23-31c/lb (BJs and 7-Eleven 20lb about $4.49-4.79, Giant 20lb $4.99, Publix 16lb $4.99); small bags and hardware stores reach 41-45c/lb. Convenience ice is more than four times warehouse ice per pound.', sufficientWhen: 'Current shelf prices for one 20lb bag at a warehouse club and one at a grocery store confirm the per-pound spread.' } },
    { id: 'p_fuel', item: 'Charcoal / propane + lighter', category: 'logistics', qtyFlat: 1, unit: 'supply', where: ['Grocery', 'Hardware store', 'Gas station'], unitCostRange: [15, 30], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: check the propane tank or buy a bag of charcoal — out of fuel = no food.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['charcoal-retail-2026', 'propane-exchange-2026', 'propane-ace-2026'], lastVerified: '2026-08-16', claim: 'A SUM of the fuel options this line names, not one quoted item. Charcoal briquettes $0.70-1.00 per pound in 8-16lb bags (match-light about $0.91, easy-light $1.50, all-natural lump about $3.60); lighter fluid $9.79 for 32oz and a utility lighter $2.99. Propane, if that is the grill: a 20lb exchange runs $20-25 (Ace lists $23.99) or $15-20 to refill, and an exchanged tank holds only 15lb of gas. Low-confidence by construction because the band spans two different fuels.', sufficientWhen: 'Current shelf prices for one charcoal bag and one propane exchange at the same retailer confirm the two ends of the band.' } },
    { id: 'p_thermometer', item: 'Instant-read food thermometer', category: 'logistics', qtyFlat: 1, unit: 'tool', where: ['Grocery', 'Hardware store', 'Amazon'], unitCostRange: [10, 20], essential: true, buyAt: 'T-3d', note: 'Board add: the high-severity food-safety risk says "grill to safe temps" but the one TOOL that prevents it was missing. Chicken 165°F, burgers 160°F.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['ledcandles-thermometer-2026', 'costco-cleaning-2026'], lastVerified: '2026-08-18', claim: 'An instant-read thermometer, priced at the budget tier. Two publishers converge: budget units $13-14, mid-range $35-40 (ThermoPop 2), premium $94-100 (Thermapen ONE). This band buys the budget tier with room toward mid; the premium tier is a different purchase and sits well above it.', sufficientWhen: 'One budget and one mid-tier thermometer price confirm where this band lands.' }, },
    { id: 'p_comfort', item: 'Bug spray, sunscreen, citronella', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Pharmacy'], unitCostRange: [10, 25], essential: false, buyAt: 'T-3d', note: 'Outdoor comfort — sun + mosquitoes end a cookout early.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['outdoor-protect-2026', 'firstaid-retail-2026'], lastVerified: '2026-08-18', claim: 'A SUM of separately-priced components. Basic sunscreen $5.74 a can (premium to $17.95+); insect repellent, or a combined repellent-sunscreen at $18.99; citronella candles $7.99-9.99 and wrist bands $4.79 a 6-pack. Summed for a backyard that is roughly $14-28, which brackets this band. Low confidence by construction: the mix is ours, only the components are priced.', sufficientWhen: 'Shelf prices for one sunscreen, one repellent and one citronella candle, summed, confirm the band.' }, },
    { id: 'p_tableware', item: 'Disposable plates, cups, napkins, cutlery', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.25, 2.5], essential: true, buyAt: 'T-3d' , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['disposables-bulk-2026', 'disposables-partyqty-2026'], lastVerified: '2026-08-15', claim: 'A per-guest place setting runs $0.25-2.50 depending entirely on channel: bulk restaurant supply puts plates at $0.08-0.15 each and foam at $0.09, a grocery shelf puts the same basic paper plate at $0.25-0.40, and premium plastic or compostable runs $0.15-0.35 per plate. A setting is 2-3 plates, 2-3 cups, cutlery and 2-3 napkins.', sufficientWhen: 'Re-checked against per-plate pricing and place-setting norms. A deep bulk buy lands near the floor and premium or compostable near the ceiling - the 12x spread is the CHANNEL, not uncertainty. Add 10-15% for spills and unexpected guests. Sets that bundle flutes, koozies, linens or table covers are a different product and are priced separately.' } },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels, foil', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [7, 18], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a recycling bag for cans/bottles + foil to wrap leftovers.' , costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['costco-cleaning-2026', 'trashbags-retail-2026'], lastVerified: '2026-08-15', claim: 'A cleanup kit runs $7-18 as the SUM of its parts: about a dozen trash and recycling bags at 10 cents each from a warehouse or 11-15 cents at grocery, two rolls of paper towels at about $1.97 warehouse, and a canister of wipes at about $4.27 or a dish-soap pack at $14.74 shared across events.', sufficientWhen: 'CONFIDENCE IS LOW ON PURPOSE: no source prices a cleanup kit, because nobody sells one. This band is a sum of individually-priced components, so treat it as an envelope rather than a quote. The spread is the CHANNEL - warehouse packs against a grocery shelf - and a host who already owns soap and towels lands well under the floor. Kits that also carry gloves, foil or to-go containers are a different bundle.' } },
  ],

  rentalsGap: [
    { item: 'Coolers', qtyPerGuest: 0.15, note: 'roughly one large cooler per ~7 guests for drinks + ice' },
    { item: 'Folding chairs', qtyPerGuest: 0.8, note: 'outdoor seating — borrow if short' },
    { item: 'Pop-up canopy (10x10)', qtyFlat: 1, note: 'shade/rain — the difference between a 2h and a 5h cookout' },
    { item: 'Folding tables', qtyFlat: 2, note: 'food + drinks station' },
  ],

  vendors: [
    { category: 'Tent / canopy rental', required: false, altToDIY: 'Own/borrow a pop-up canopy', when: 'T-7d', costRange: [50, 150], costUnit: 'flat' },
    { category: 'Chair / table rental', required: false, altToDIY: 'Borrow folding chairs from friends', when: 'T-7d', costRange: [40, 120], costUnit: 'flat' },
    { category: 'Caterer / BBQ pitmaster', required: false, altToDIY: 'Host grills it', when: 'T-10d', costRange: [12, 25], costUnit: 'per guest' },
  ],

  risks: [
    { id: 'r_weather', trigger: 'Rain or extreme heat, no plan', severity: 'high', mitigation: 'Check the forecast at 3 days out; secure a canopy/indoor fallback; move earlier/later to dodge peak heat.' },
    { id: 'r_fuel', trigger: 'Out of charcoal / empty propane tank', severity: 'high', mitigation: 'Check + buy fuel at 3 days out; keep a spare bag/tank.' },
    { id: 'r_grillfire', trigger: 'Grill flare-up or grease fire', severity: 'high', mitigation: 'NFPA/USFA rules: grill outdoors only, well away from the house, deck rails, and eaves — never a porch or balcony — with a 3-foot kid-and-pet zone, and never left alone while lit. A dirty grill is the top fire factor, so scrape the grease. If a grease fire starts: lid on, burner off, never water; any doubt — everyone away and 911. Cool coals go in a lidded metal can.' },
    { id: 'r_ice', trigger: 'Ice melts, drinks go warm', severity: 'med', mitigation: 'Buy ~2 lb ice/guest day-of (outdoor melts fast); keep a shaded backup cooler.' },
    { id: 'r_foodsafe', trigger: 'Food left out in the heat', severity: 'high', mitigation: 'Keep cold food on ice; don\'t leave perishables out >1h in 90°F+; grill to safe temps.' },
    { id: 'r_bugs', trigger: 'Mosquitoes / sun run guests off', severity: 'low', mitigation: 'Bug spray, citronella, shade, and water available.' },
  ],

  contingencies: [
    { id: 'c_rain', when: 'r_weather', plan: 'Pop the canopy or move to the garage/indoors; grill under cover; notify guests the morning of.' },
    { id: 'c_fuel', when: 'r_fuel', plan: 'Send someone for a bag of charcoal / a swap propane tank; gas stations carry both.' },
    { id: 'c_heat', when: 'r_foodsafe', plan: 'Stage cold dishes over ice trays; bring perishables out in waves rather than all at once.' },
  ],

  // Day-of "Before the big day" readiness/safety walkthrough — authored for an
  // OUTDOOR, grill-forward cookout. severity drives ordering (critical→low). The
  // host taps each as confirmed; state persists in event.safetyChecked[id].
  dayOfChecklist: [
    { id: 'weather', label: 'Rain / heat plan', detail: 'Where does everyone go if the weather turns? Canopy up or garage/indoor fallback ready before guests arrive.', severity: 'high' },
    { id: 'food', label: 'Food safety', detail: 'Cold food on ice, hot food held, nothing perishable out more than ~1h in the heat. Grill to safe temps — chicken 165°F, burgers 160°F.', severity: 'high' },
    { id: 'grill', label: 'Grill / fire safety', detail: 'Fuel checked, extinguisher or a hose within reach, grill on a stable surface away from the house — and never left unattended.', severity: 'high' },
    { id: 'power', label: 'Power & outlets', detail: "Music, lights, and warmers planned to the right circuits — don't run everything off one outdoor outlet.", severity: 'med' },
    { id: 'trash', label: 'Trash + recycling station', detail: 'Bags staged, a separate recycling bag for cans/bottles, and a spot to swap a full bag mid-party.', severity: 'med' },
    { id: 'alcohol', label: 'Alcohol plan', detail: 'A loose cutoff and a ride-home plan so everyone gets home safe.', severity: 'med' },
    { id: 'emergency', label: 'Emergency basics', detail: 'First-aid kit on hand; know the nearest ER; phones charged.', severity: 'low' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Drinks, fuel, disposables, condiments, bug/sun supplies, cleanup kit' },
      { when: 'T-1d', what: 'Proteins, buns, produce, dessert' },
      { when: 'T0', what: 'Ice (lots) + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Marinate proteins; make cold sides; check fuel + grill' },
    ],
    setup: [
      { when: 'T0 -5h', what: 'Pull proteins from the fridge to temper; light the coals late but check you have enough fuel' },
      { when: 'T0 -4h', what: 'Drinks into the cooler now so they’re cold by the time people arrive' },
      { when: 'T0 -3h', what: 'Check the forecast and make the rain call while there’s still time to move things' },
      { when: 'T0 -1h', what: 'Set up coolers + ice, canopy/shade, chairs, food + drinks tables' },
      { when: 'T0 -0:45', what: 'Light the grill; stage trash + recycling bins' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Doors: drinks on ice, music on, greet people at the gate' },
      { when: 'T0 +30m', what: 'Grill starts serving — first plates to whoever’s been waiting' },
      { when: 'T0 +1:15', what: 'Everything out: sides, condiments, second rounds' },
      { when: 'T0 +2h', what: 'The hang — yard games, music, let it run itself' },
      { when: 'T0 +3h', what: 'Dessert and the last call on the grill' },
      { when: 'T0 +4:05', what: 'Wind down, to-go plates, coals out' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep cold food on ice; bag cans for recycling as you go' },
      { when: 'T0 +4h', what: 'Cool + scrape the grill, pack leftovers, bag trash/recycling, fold chairs/canopy' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Quantities reflect common US cookout rules of thumb (~0.5 lb grilled protein/guest, ~2 buns/guest, ~3 drinks/guest over 4h, ~2 lb ice/guest for outdoor coolers). Food-safety guidance (perishables out ≤1h above 90°F; chicken 165°F, burgers 160°F; raw/cooked separation; cooler practice) was VERIFIED against primary USDA FSIS/FDA text on 2026-07-28 — see sources — so those specific claims are cited; the quantity rules of thumb remain synthesized. No fabricated sources.',
    sources: ['fsis-danger-zone', 'fsis-temp-chart', 'fsis-grilling', 'fda-outdoors', 'fsis-leftovers', 'fsis-cooking-groups'],
  },
};

export default backyardBbq;
