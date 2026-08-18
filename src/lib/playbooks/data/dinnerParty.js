// Dinner Party — Event OS playbook data (Sprint 55C-1).
//
// Moved into src/ from engine-audit/playbooks/dinner-party.playbook.json so the
// runtime reads it from the production bundle (no import across the repo's
// non-shipped tooling dir). ESM default export — no CJS module.exports in src/
// (see the prod-bundle ESM lesson). The shape is the authored playbook verbatim;
// the reader (../index.js) consumes `purchases` first for the operational
// candidate, with the rest available as the engine grows.

const dinnerParty = {
  type: 'Dinner Party',
  vegMain: 'Mushroom & lentil wellington',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary:
      'An intimate, host-cooked seated dinner. The host IS the planner, caterer, and cleanup crew — so the playbook front-loads decisions and back-loads a realistic day-of cooking + reset schedule.',
    typicalGuests: { low: 6, default: 8, high: 12 },
    typicalDurationHours: 4,
    leadTimeDays: 21,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 30, high: 120, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'Everyone seated, candles lit, first course on the table — the room settles.',
    'The moment a dish lands and the table goes quiet.',
    'The conversation that goes long past dessert.',
    'A guest pushes back from the table and says "that was the best thing I\'ve eaten in years."',
  ],

  decisions: [
    { id: 'format', label: 'Seated dinner or buffet / family-style?', options: ['Plated 3-course', 'Family-style', 'Buffet', 'Grazing + small plates'], default: 'Family-style', when: 'T-21d', blocks: ['menu', 'rentals', 'seating'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Plated versus family-style versus buffet sets your plate counts, the table layout, and how much cooking lands on you mid-party — but it stays easy to change early.', tier: 'reasoned' }, why: 'Drives plate/serveware counts, table layout, and how much active cooking lands on the host during the party.' },
    { id: 'menu', label: 'Lock the menu (incl. a vegetarian main)', options: [], default: null, when: 'T-14d', dependsOn: ['format', 'dietary'], blocks: ['shopping_list', 'cook_schedule'], deliversHeartMoment: true, weight: 'high', reversibility: 'reversible', emotionalWeight: 'high', difmCapable: 'needs-host', priorityBasis: { rationale: 'This is the meal itself — every quantity and the cook timeline derive from it, and the dish landing quiet at the table is the whole reason people came.', tier: 'reasoned' }, why: 'Every quantity, the shopping list, and the cook timeline derive from this. A dinner party with no locked menu at a week out is the #1 host failure mode.' },
    { id: 'dietary', label: 'Collect dietary restrictions + allergies with the invite', options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Nut allergy', 'Dairy-free', 'Shellfish', 'Halal', 'Kosher', 'Pescatarian', 'Alcohol-free'], default: null, when: 'T-14d', blocks: ['menu'], weight: 'high', reversibility: 'costly', emotionalWeight: 'med', difmCapable: 'needs-host', priorityBasis: { rationale: 'One unflagged severe allergy can send a guest to the ER, so allergies must be collected before the menu locks — and only the guests can answer.', tier: 'reasoned' }, why: 'One unflagged severe allergy can send a guest to the ER. Must be collected BEFORE the menu locks, never after.' },
    { id: 'alcohol', label: 'Alcohol strategy', options: ['Host provides full bar', 'Wine + one cocktail', 'Wine + beer only', 'BYOB', 'Zero-proof / dry'], default: 'Wine + one signature cocktail', when: 'T-14d', blocks: ['beverage_purchases'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Alcohol is often a quarter to a third of a dinner-party budget and sets glassware counts, but a wine-plus-one-cocktail default is safe and easy to adjust at the store.', tier: 'reasoned' }, why: 'Determines spend (often 25-40% of a dinner-party budget), glassware counts, and whether a bartender is worth it.' },
    { id: 'seating', label: 'Open seating or place cards?', options: ['Open', 'Place cards', 'Host-assigned'], default: 'Host-assigned for 8+', when: 'T-2d', dependsOn: ['format'], weight: 'low', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'For eight or more, assigned seats just spare everyone the awkward shuffle — a low-stakes call the host can set the night before.', tier: 'reasoned' }, why: 'For 8+ guests, assigned seating prevents the awkward shuffle and lets the host seat the right energy together.' },
    { id: 'help', label: 'DIY, or bring in help?', options: ['Fully DIY', 'Hire a cleaner for after', 'Hire a bartender', 'Drop-off catering for 1 course', 'Private chef'], default: 'Fully DIY', when: 'T-10d', blocks: ['vendors'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'A cleaner or a bartender is the honest tradeoff that lets you enjoy your own party — worth deciding, and easy to add or drop.', tier: 'reasoned' }, why: 'The honest tradeoff: a $150 post-party cleaner or a $200 bartender is what lets the host actually enjoy their own party.' },
  ],

  milestones: [
    { id: 'dp_setdate', name: 'Set date + guest count + budget', offsetDays: 21, owner: 'host', category: 'planning', risk: null },
    { id: 'dp_invite', name: 'Send invites + ask dietary/allergy + RSVP', offsetDays: 18, owner: 'host', dependsOn: ['dp_setdate'], category: 'guest', risk: { ifDelayed: 'Low RSVP visibility → wrong food quantities', severity: 'med' } },
    { id: 'dp_menu', name: 'Lock the menu (with a veg main + allergy swaps)', offsetDays: 14, owner: 'host', dependsOn: ['dp_invite'], category: 'food', risk: { ifDelayed: 'No shopping list / cook plan possible', severity: 'high' } },
    { id: 'dp_rentals', name: 'Confirm serveware / glassware / seating capacity (rent or borrow gap)', offsetDays: 7, owner: 'host', dependsOn: ['dp_menu'], category: 'rental', risk: { ifDelayed: 'Not enough matching plates/chairs day-of', severity: 'med' } },
    { id: 'dp_rsvp_close', name: 'Confirm final headcount (chase the maybes)', offsetDays: 3, owner: 'host', dependsOn: ['dp_invite'], category: 'guest', risk: { ifDelayed: 'Over/under-buy food by 20-30%', severity: 'high' } },
    { id: 'dp_shop_pantry', name: 'Buy pantry, alcohol, non-perishables', offsetDays: 3, owner: 'host', dependsOn: ['dp_menu'], category: 'shopping', risk: null },
    { id: 'dp_shop_fresh', name: 'Buy fresh produce, proteins, bread, flowers', offsetDays: 1, owner: 'host', dependsOn: ['dp_menu', 'dp_rsvp_close'], category: 'shopping', risk: { ifDelayed: 'Sold-out proteins / wilted produce', severity: 'med' } },
    { id: 'dp_prep_ahead', name: 'Make-ahead prep (sauces, braises, dessert, mise en place)', offsetDays: 1, owner: 'host', dependsOn: ['dp_shop_fresh'], category: 'food', risk: null },
    { id: 'dp_setup', name: 'Set the table, chill drinks, stage the space', offsetDays: 0, owner: 'host', dependsOn: ['dp_rentals', 'dp_prep_ahead'], category: 'setup', risk: null },
    { id: 'event', name: 'The dinner party', offsetDays: 0, owner: 'host', dependsOn: ['dp_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'dp_invite', phase: 'guest', label: 'Text/email invite with date, time, address, dietary-ask, and a soft RSVP-by date', when: 'T-18d' },
    { id: 't_rsvp_chase', milestoneId: 'dp_rsvp_close', phase: 'guest', label: 'Chase non-responders; lock the seated count', when: 'T-3d' },
    { id: 't_pantry_shop', milestoneId: 'dp_shop_pantry', phase: 'shopping', label: 'Pantry + alcohol + paper goods run (non-perishables, can buy early)', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'dp_shop_fresh', phase: 'shopping', label: 'Produce, proteins, bread, dairy, flowers (buy 24-36h out, not sooner)', when: 'T-1d' },
    { id: 't_braise', milestoneId: 'dp_prep_ahead', phase: 'food', label: "Cook anything that's better reheated (braises, stews, sauces, soups)", when: 'T-1d evening' },
    { id: 't_dessert', milestoneId: 'dp_prep_ahead', phase: 'food', label: 'Make dessert ahead (tart/cake/set custard chill overnight)', when: 'T-1d evening' },
    { id: 't_mise', milestoneId: 'dp_prep_ahead', phase: 'food', label: 'Mise en place: chop, marinate, portion, label containers', when: 'T-1d evening' },
    { id: 't_table', milestoneId: 'dp_setup', phase: 'setup', label: 'Set the table: linens, plates, glasses, flatware, napkins, place cards, centerpiece, candles', when: 'T0 afternoon' },
    { id: 't_chill', milestoneId: 'dp_setup', phase: 'beverage', label: 'Chill white wine + sparkling 2-3h before; set up the bar/drinks station + ice', when: 'T0 -3h' },
    { id: 't_clean_pre', milestoneId: 'dp_setup', phase: 'cleanup', label: 'Pre-clean: empty dishwasher, clear sink, set up a bus tub / trash + recycling station', when: 'T0 -2h' },
    { id: 't_appetizer', milestoneId: 'event', phase: 'food', label: 'Plate/serve appetizer as guests arrive (room-temp friendly)', when: 'T0 +0:15' },
    { id: 't_main', milestoneId: 'event', phase: 'food', label: 'Reheat + plate mains; rest proteins; dress salad last-minute', when: 'T0 +1:00' },
    { id: 't_clear', milestoneId: 'event', phase: 'cleanup', label: "Clear courses into the staged bus tub (don't wash mid-party)", when: 'ongoing' },
    { id: 't_coffee', milestoneId: 'event', phase: 'beverage', label: 'Coffee/tea + dessert + digestifs', when: 'T0 +2:30' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Post-party reset: leftovers into containers, run dishwasher, hand-wash delicates, trash out, linens to soak', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_protein', item: 'Beef short rib (or salmon / mushroom wellington for veg)', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Butcher', 'Grocery', 'Costco', 'Instacart'], unitCostRange: [8, 18], essential: true, buyAt: 'T-1d', alternatives: ['Roast chicken thighs — much cheaper, still impressive plated', 'Pork tenderloin — budget alternative to beef, elegant presentation', 'Pasta main with good sauce — cheapest option, guests love it'], substitutes: ['roast chicken (cheaper)', 'pasta course (cheapest)'] , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['usda-meat-2026', 'costco-groundbeef-2026'], lastVerified: '2026-08-15', claim: 'A dinner-party centre cut runs $8-18/lb: all-fresh beef averages about $9.64/lb (a 2026 record, up 13 percent year on year) and premium cuts reach $13.56-14.24/lb for strip and ribeye, with short rib and salmon sitting in the same upper band.', sufficientWhen: 'CONFIRMATION, not a correction - the authored band already matched the evidence. Re-priced against USDA and BLS retail meat data. Meat moved 13 percent year on year, so this wants a seasonal re-check rather than only the 45-day pricing window. The vegetarian alternative this line names is not priced by these sources and sits below the band.' } },
    { id: 'p_starch', item: 'Roast potatoes (or rice / risotto)', category: 'food', qtyPerGuest: 0.3, unit: 'lb', where: ['Grocery'], unitCostRange: [1, 3], essential: true, buyAt: 'T-1d', alternatives: ['White rice or egg noodles — cheapest starch option', 'Roasted potatoes — budget-friendly, no special technique needed'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['bls-staples-2026', 'bls-produce-2026', 'butter-bls-2026'], lastVerified: '2026-08-18', claim: 'A starch side priced per pound. BLS puts white long-grain rice at $1.09/lb and white potatoes at $0.94/lb. Risotto rice carries a premium over long-grain, and butter or stock added to either lifts the finished cost above the raw commodity - butter is $4.314/lb - which is where the band\'s ceiling comes from. The floor is plain rice or potatoes.', sufficientWhen: 'Per-pound prices for rice and potatoes, plus the butter or stock actually added, confirm the band.' }, },
    { id: 'p_veg', item: 'Roasted vegetables & salad greens', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery', 'Farmers market'], unitCostRange: [2, 5], essential: true, buyAt: 'T-1d', alternatives: ['Frozen roasted vegetables — cheaper, quick to prepare', 'Bagged salad mix — if time-pressed, still looks nice in a bowl'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['bls-saladveg-2026', 'usda-produce-outlook-2026', 'bls-produce-2026'], lastVerified: '2026-08-18', claim: 'Salad and roasted vegetables, priced per pound. BLS puts romaine lettuce at $3.560/lb (February 2026) and field-grown tomatoes at $2.154/lb; USDA\'s outlook has fresh vegetable retail prices rising 6.8% across 2026, and retail fresh vegetables were 9.9% higher year on year in June. Roasting vegetables - onions, carrots, squash - prices below salad greens, which is why the band\'s floor sits under the lettuce figure and its ceiling above it. NOTE this band is more perishable than most: lettuce was up 32.1% and tomatoes 19.5% over the year.', sufficientWhen: 'Current per-pound prices for romaine and for one roasting vegetable, at the ratio actually served, confirm the band.' }, },
    { id: 'p_appetizer', item: 'Cheese & charcuterie board (dips, crackers)', category: 'food', qtyPerGuest: 0.25, unit: 'lb', where: ['Grocery', 'Cheese shop'], unitCostRange: [4, 20], essential: true, buyAt: 'T-3d', alternatives: ['Store-brand crackers + one good cheese — cheaper by half', 'Hummus + pita + olives — budget Mediterranean grazing option'] , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['charcuterie-ica-2026', 'charcuterie-grocery-2026'], lastVerified: '2026-08-15', claim: 'A cheese and charcuterie board runs $4-20/lb: crackers and fresh fruit sit at $1-5/lb, budget cheese at $5-15, and the crowd-pleaser cheeses and cured meats that carry the board at $10-25. US grocery averages are ~$15/lb specialty cheese and ~$20/lb charcuterie meats.', sufficientWhen: 'Re-checked against per-pound cheese and cured-meat pricing. A catered or ready-made board is priced per person or per board ($15-50 per person), not per pound, so that channel is out of band by construction.' } },
    { id: 'p_bread', item: 'Bread / rolls', category: 'food', qtyFlat: 1, qtyPer: 4, unit: 'loaf per 4 guests', where: ['Bakery', 'Grocery'], unitCostRange: [2, 12], essential: false, buyAt: 'T-1d', alternatives: ['Store-brand dinner rolls — fraction of bakery cost', 'Frozen par-baked rolls — bake day-of, cheaper than bakery'] , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['bread-retail-2026', 'bread-artisan-2026'], lastVerified: '2026-08-15', claim: 'A loaf runs $2-12 across channels: basic grocery-chain loaves are $1.50-2.50 (mass-market average $2.50), mid-size bakery loaves $3.50-5.50, and premium artisan with specialty flour $6.50-12.', sufficientWhen: 'Re-checked against retail and baker-side loaf pricing. A farmers-market sourdough at $8-14 sits at and just above the top of this band.' } },
    { id: 'p_dessert', item: 'Bakery tart or cake (or ice cream & cookies)', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Bakery', 'Grocery'], unitCostRange: [3, 7], essential: true, buyAt: 'T-1d', alternatives: ['Grocery bakery tart or cake — no baking required', 'Ice cream + store-bought cookies — simple, crowd-pleasing budget option'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['warehouse-trays-2026', 'retail-sheetcake-2026', 'bakery-cake-retail-2026'], lastVerified: '2026-08-18', claim: 'Dessert per serving from bought items. Warehouse cookies are $9.99 for 24 ($0.42 each), $12.43 on a delivery marketplace ($0.52). A sheet cake feeding 48 at $24.99 is about $0.52 a serving; a grocery bakery round is $15.99-30. Pound cake, cobbler and pudding by the portion price above bought cookies, which is the ceiling here.', sufficientWhen: 'A cookie box divided per piece and a cake divided per serving confirm both ends.' }, },
    { id: 'p_wine', item: 'Wine', category: 'beverage', qtyPerGuest: 0.5, unit: 'bottle (½ bottle/guest rule)', where: ['Wine shop', 'Total Wine', 'Grocery'], unitCostRange: [8, 25], essential: true, buyAt: 'T-3d', note: 'Rule of thumb: ½ bottle per drinking guest for a 3-4h dinner; round up.' , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['wine-retail-2026', 'wine-statewide-2026'], lastVerified: '2026-08-15', claim: 'A retail bottle runs $8-25: the everyday grocery shelf is $8-15, mid-range wine-shop bottles $15-30, and state averages cluster near $14 (from $10.97 in Massachusetts to $15.51 in Mississippi).', sufficientWhen: 'Re-checked against retail tier bands and state averages. Premium bottles at $30-100+ sit above this line and restaurant pricing is a different market entirely. NOTE the widely-quoted $56.78 US average is DIRECT-TO-CONSUMER data covering 10-11% of off-premise volume - it is not a shelf price and must not be used to set this band.' } },
    { id: 'p_cocktail', item: 'Signature cocktail spirits + mixers + garnish', category: 'beverage', qtyFlat: 1, unit: 'batch (serves ~10)', where: ['Liquor store'], unitCostRange: [40, 70], essential: false, buyAt: 'T-3d', dependsOnDecision: 'alcohol' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['spirits-retail-2026', 'liquor-shelf-tiers-2026', 'mixers-retail-2026', 'lemons-retail-2026'], lastVerified: '2026-08-18', claim: 'A SUM of separately-priced components for one batch, not a quoted price. SPIRITS: a 750ml bottle is $18-40 for most buyers, from about $8 for basic store brands to $60 premium; tequila blanco $18-22, popular gin higher (Bombay Sapphire $30.99). MIXERS: tonic 1L $1.99, ginger ale 2L $2.99 at $0.04 an ounce, club soda comparable - roughly $2-3 a bottle. GARNISH: lemons $0.64 each, limes and herbs alongside. One mid-shelf bottle plus two or three mixers plus citrus lands in this band; a bottom-shelf bottle sits below it and a premium one above.', sufficientWhen: 'Current shelf prices for one 750ml mid-shelf bottle, two mixer bottles and the citrus, summed, confirm the batch cost.' }, },
    { id: 'p_nonalc', item: 'Sparkling water, mocktail & juice', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery'], unitCostRange: [0.75, 3], essential: true, buyAt: 'T-3d', note: 'Always have a great zero-proof option — designated drivers, non-drinkers, pregnant guests.' , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['zeroproof-retail-2026', 'nabeer-retail-2026'], lastVerified: '2026-08-15', claim: 'A zero-proof drink runs $0.75-3.00 poured at home: a simple juice-and-soda mocktail sits at the floor, NA beer is $2.17-2.50 a can (Athletic $13 a six-pack, Budweiser AF $29.99 a twelve), and a drink built on an NA spirit costs about $1.60-2.20 in spirit alone since a $25-35 bottle pours roughly sixteen.', sufficientWhen: 'Re-checked against NA spirit, NA beer and canned-mocktail retail. BAR PRICING IS EXCLUDED AND MUST STAY EXCLUDED - zero-proof drinks run $13-17 at bars, which is hospitality pricing for a served drink and would inflate this band roughly tenfold. Premium canned mocktails at about $8 a serving also sit above it.' } },
    { id: 'p_water', item: 'Table water service (pitcher / carafe, still & sparkling)', category: 'beverage', qtyFlat: 1, qtyPer: 6, unit: 'pitcher', where: ['Grocery', 'Home'], unitCostRange: [3, 8], essential: true, buyAt: 'T-1d', note: 'Board add: a seated dinner needs poured table water — ~1 pitcher/carafe per 6 guests, refilled through the meal.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['bottledwater-case-2026', 'sparkling-na-2026'], lastVerified: '2026-08-18', claim: 'A water station priced per cup or pitcher. Bottled water is $0.13-0.25 a bottle in a 24-pack, rising to $0.50-1.00 for premium; sparkling water is $0.55-0.70 a can in a 6- or 8-pack and $1.73 for glass-bottle. A still-water station sits at the floor and a sparkling one at the ceiling.', sufficientWhen: 'One 24-pack of still and one multipack of sparkling, divided per serving, confirm the band.' }, },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest for chilling + drinks.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['ice-retail-2026', 'ice-warehouse-2026'], lastVerified: '2026-08-16', claim: 'Bagged ice 2026: warehouse clubs run 10-12c per pound (a 20lb bag is $1.75-2.50 at Sams Club, $1.80-2.50 at Costco); grocery and gas-station bags cluster 23-31c/lb (BJs and 7-Eleven 20lb about $4.49-4.79, Giant 20lb $4.99, Publix 16lb $4.99); small bags and hardware stores reach 41-45c/lb. Convenience ice is more than four times warehouse ice per pound.', sufficientWhen: 'Current shelf prices for one 20lb bag at a warehouse club and one at a grocery store confirm the per-pound spread.' } },
    { id: 'p_coffee', item: 'Coffee + tea + cream/sugar', category: 'beverage', qtyFlat: 1, unit: 'service', where: ['Grocery'], unitCostRange: [6, 12], essential: true, buyAt: 'T-3d' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['coffee-percup-2026', 'coffeeurn-rental-2026'], lastVerified: '2026-08-16', claim: 'Home-brewed coffee runs about $0.10 a cup for budget store-brand ground; a 40-cup urn rents for $21-22 per event or costs $45-59 to buy outright.', sufficientWhen: 'A current price check on one store-brand ground coffee and one local urn rental confirms the per-cup and per-urn figures.' } },
    { id: 'p_flowers', item: 'Centerpiece flowers', category: 'decor', qtyFlat: 1, qtyPer: 6, unit: 'arrangement per 6 guests', where: ['Florist', "Trader Joe's", 'Farmers market'], unitCostRange: [20, 100], essential: false, buyAt: 'T-1d' , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['paperlust-centerpieces-2026', 'traderjoes-flowers-2026'], lastVerified: '2026-08-15', claim: 'An arrangement runs $20-100: a DIY simple centerpiece is $20-50 and a DIY elevated one $50-100, built from supermarket bunches at $4-13 each; a florist-made standard arrangement starts around $75-150.', sufficientWhen: 'Re-checked against centerpiece and supermarket-floral pricing. Same band wherever the channel list pairs a florist with a supermarket. Florist premium ($150-300) and luxury installations sit above it; excludes vessel rental ($8-25/piece) and delivery fees.' } },
    { id: 'p_candles', item: 'Candles (taper/tealight, unscented at the table)', category: 'decor', qtyFlat: 6, unit: 'candles', where: ['Grocery', 'Ikea', 'Amazon'], unitCostRange: [0.5, 3], essential: false, buyAt: 'T-3d', note: 'Unscented only at the table — scented competes with the food.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['candles-retail-2026', 'candles-event-2026'], lastVerified: '2026-08-16', claim: 'Candles at retail 2026, household tier: 3x6 unscented pillars $6.00 a 2-pack ($0.15/oz, 130hr burn), 3x3 pillars $6.50 a 3-pack, tapers $7.00 a 12-pack, votives $8.50 an 8-pack. At the EVENT-DECOR tier an independent 2026 guide puts tapers at $12-28 a dozen, 3x4 pillars $8-22 each and votives or tea lights $9-18 per 50-pack, with a whole-event candle spend of $220-650. Household store-brand is the floor; decor candles are several times that.', sufficientWhen: 'Current shelf prices for one taper pack and one pillar pack at a national retailer confirm the range.' } },
    { id: 'p_napkins', item: 'Cloth or premium paper napkins', category: 'rental', qtyPerGuest: 1.5, unit: 'napkins', where: ['Have/borrow', 'Grocery'], unitCostRange: [0.3, 2], essential: true, buyAt: 'T-3d' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['linen-rental-sizes-2026', 'linen-rental-2026', 'disposables-partyqty-2026'], lastVerified: '2026-08-18', claim: 'Cloth and premium paper napkins 2026, each component cited. CLOTH: event-rental day rates put napkins at $0.60-1.25 each, and an owned napkin still carries a per-use laundering cost (the same rate card puts professional cleaning at $11.50 a tablecloth). PREMIUM PAPER: bulk party-supply pricing puts basic paper plates near 6 cents each with napkins bought in the same bulk order, so the paper end of this row sits well under a dime. The band\'s floor is bulk paper and its ceiling is rented or premium cloth - the 10x spread is the MATERIAL, not uncertainty.', sufficientWhen: 'A current rental quote for cloth napkins and one bulk shelf price for premium paper napkins, at the sizes actually used, confirm both ends of the band.' }, },
    { id: 'p_paper', item: 'Paper goods (cocktail napkins, parchment, foil, food storage containers for leftovers)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [10, 20], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: leftover containers for sending food home.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['foil-wrap-2026', 'disposable-kit-2026', 'disposables-partyqty-2026'], lastVerified: '2026-08-18', claim: 'A SUM of separately-priced components. Aluminium foil $0.08-0.14 a square foot ($5.99 for 75 sq ft standard, $13.49 for 130 heavy duty); parchment about $0.08-0.09 a square foot; cocktail napkins and food storage bags $0.09-0.26 each from the bulk party tier; disposable table covers $1.00 each. Summed for a dinner party that brackets this band.', sufficientWhen: 'Shelf prices for foil, parchment, napkins and bags, summed, confirm the band.' }, },
    { id: 'p_dish', item: 'Dish soap, sponges, trash + recycling bags', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 15], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: extra trash bags + a recycling bag for bottles.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['costco-cleaning-2026', 'trashbags-retail-2026'], lastVerified: '2026-08-16', claim: 'Cleanup supplies at warehouse pricing: 13-gallon trash bags about 10 cents each (200 for $20.42), paper towels about $1.97 a roll, dish soap with two refills $14.74, 24 sponges $12.47; the same bags run 11-15 cents each at grocery and big-box.', sufficientWhen: 'Current shelf prices for trash bags and paper towels at one warehouse club and one grocery store confirm the per-unit figures.' } },
  ],

  // Capacity requirements (brought into src from the canonical
  // dinner-party.playbook.json — Sprint 55H-B3A). Authored REQUIREMENTS only,
  // scaled by guest count; never a deficit.
  rentalsGap: [
    { item: 'Dinner plates', qtyPerGuest: 2, note: '1 dinner + 1 dessert/app, matching', altToBuy: 'borrow or rent if short' },
    { item: 'Wine + water glasses', qtyPerGuest: 2.5, note: 'wine + water + a few spares for breakage' },
    { item: 'Flatware sets', qtyPerGuest: 1, note: '+1 spare set per 4' },
    { item: 'Dining chairs', qtyPerGuest: 1, note: 'the real capacity constraint — borrow folding chairs if short' },
    { item: 'Serving platters + utensils', qtyFlat: 6, note: 'COMMONLY FORGOTTEN: a dish each for protein/starch/veg/salad/app/bread + serving spoons/tongs (board: 4 was thin for a multi-course dinner).' },
  ],

  // Day-of run-of-show schedules (brought into src from the canonical
  // dinner-party.playbook.json so the runtime can surface them — Sprint 55H-B1).
  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Pantry, alcohol, paper goods, candles, non-perishables, dish/cleanup kit' },
      { when: 'T-1d', what: 'Proteins, produce, bread, dairy, dessert ingredients, flowers' },
      { when: 'T0', what: 'Ice + any last-minute fresh herbs/garnish' },
    ],
    cooking: [
      { when: 'T-1d evening', what: 'Braises/sauces/soup, dessert, full mise en place, marinate proteins' },
      { when: 'T0 -4h', what: 'Slow-cook/roast items; prep salad components (dress later)' },
      { when: 'T0 -1h', what: 'Reheat make-ahead; bring proteins to room temp' },
      { when: 'guests arrive', what: 'Plate appetizer; finish/plate mains; dress salad' },
    ],
    setup: [
      { when: 'T0 -3h', what: 'Set the table: linens, plates, glasses, flatware, place cards, centerpiece, candles' },
      { when: 'T0 -2:55', what: 'Chill whites/sparkling; build the drinks station + ice tub' },
      { when: 'T0 -2h', what: 'Empty dishwasher, stage bus tub + trash/recycling, light candles 15 min before' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Doors: coats taken, first drink in every hand within a minute' },
      { when: 'T0 +30m', what: 'Passed bites while the last guests land' },
      { when: 'T0 +1h', what: 'Seated: first course out, wine poured' },
      { when: 'T0 +1:45', what: 'Main course; keep the table’s glasses filled' },
      { when: 'T0 +2:45', what: 'Dessert' },
      { when: 'T0 +3:15', what: 'Coffee and the move back to the sofa' },
      { when: 'T0 +4:05', what: 'Wind down; the dishes wait until they’ve gone' },
    ],
    cleanup: [
      { when: 'during', what: 'Clear courses into the staged bus tub; do NOT wash mid-party' },
      { when: 'T0 +4h', what: 'Leftovers into containers (send some home), run dishwasher, hand-wash delicates, bottles to recycling, linens to soak' },
    ],
  },

  // Optional vendor upgrades (brought into src from the canonical
  // dinner-party.playbook.json — Sprint 55K parity backfill). All optional;
  // the host-run DIY path is the default.
  vendors: [
    { category: 'Catering', required: false, altToDIY: 'Drop-off catering for one course (e.g. the main or dessert) removes the riskiest cook step', when: 'T-10d', proofRequired: ['headcount confirmed', 'delivery window'], costRange: [15, 40], costUnit: 'per guest' },
    { category: 'Bar / Beverage', required: false, altToDIY: 'A bartender for 8-12 guests (~$150-250) lets the host stay out of the kitchen-bar shuffle', when: 'T-10d', proofRequired: ['insurance if serving alcohol'], costRange: [150, 300], costUnit: 'flat' },
    { category: 'Cleaning', required: false, altToDIY: 'Post-party cleaner (~$100-180) is the highest-ROI spend for host sanity', when: 'T-7d', costRange: [100, 180], costUnit: 'flat' },
    { category: 'Florals', required: false, altToDIY: 'DIY grocery-store flowers vs a $40-60 florist arrangement', when: 'T-3d', costRange: [40, 80], costUnit: 'flat' },
  ],

  // Risks (canonical dinner-party.playbook.json — Sprint 55K parity backfill).
  risks: [
    { id: 'r_dietary', trigger: 'Menu locked before allergies collected', severity: 'critical', mitigation: 'Collect dietary/allergy with the invite; confirm again at RSVP close; always plate one safe vegetarian main.' },
    { id: 'r_headcount', trigger: 'Final headcount still not confirmed 3 days out', severity: 'high', mitigation: 'Chase the maybes; buy fresh AFTER headcount locks; over-cater proteins by ~10%, not 30%.' },
    { id: 'r_overcook', trigger: 'Too many à-la-minute dishes', severity: 'high', mitigation: 'Design the menu so ≥2 of 3 courses are make-ahead; the host should plate, not cook, once guests arrive.' },
    { id: 'r_ice', trigger: 'No ice / warm drinks', severity: 'med', mitigation: 'Buy ~1.5 lb ice/guest day-of; pre-chill whites 3h ahead.' },
    { id: 'r_capacity', trigger: 'More RSVPs than chairs/place settings', severity: 'med', mitigation: 'Confirm seating + serveware capacity at a week out; secure a borrow/rent source before invites over-fill.' },
    { id: 'r_cleanup', trigger: 'No cleanup plan → host trapped at the sink', severity: 'low', mitigation: "Stage a bus tub + empty dishwasher pre-party; clear into the tub, don't wash mid-party; consider a cleaner." },
  ],

  // Contingencies (canonical dinner-party.eos.json — Sprint 55K parity backfill).
  contingencies: [
    { id: 'c_dishflop', trigger: "A dish burns / breaks / doesn't set", plan: "Keep a rescue course in the pantry — good dried pasta + a jar of quality sauce + parmesan is a respectable plate in 15 minutes. Don't announce the failure; just serve the pivot.", severity: 'high' },
    { id: 'c_plusone', trigger: 'A guest brings an uninvited +1', plan: 'You already set 1–2 buffer place settings and bought ~10% extra; stretch the meal with more bread, salad, and sides. A gracious host never lets the guest feel the math.', severity: 'med' },
    { id: 'c_behind', trigger: "You're running 30+ minutes behind", plan: 'Pour another round and serve the most complex course family-style instead of plated, or cut it entirely. Guests remember the mood, never the missing course.', severity: 'med' },
    { id: 'c_shortfood', trigger: 'Not enough food', plan: "Open with bread + cheese, stretch with a fast pasta or a big salad, and slow the pacing. Calm reframes 'short' as 'relaxed'.", severity: 'med' },
    { id: 'c_oven', trigger: 'Oven or a key appliance fails', plan: 'Pivot to stovetop / grill / no-cook (charcuterie + salad + pasta). Know in advance which dish is your appliance-independent fallback.', severity: 'high' },
    { id: 'c_unknownallergy', trigger: "A guest reveals a restriction you didn't know about", plan: 'The plated vegetarian main + a side of plain protein/grain is your universal safe plate. This is exactly why one safe veg main is non-negotiable.', severity: 'critical' },
    { id: 'c_winelow', trigger: 'Wine/drinks running low', plan: 'The ½-bottle-per-drinker rule should prevent this; if it happens, the nearest store run or the BYOB ask covers it. Never let it run fully dry — switch to a punch/spritz to stretch.', severity: 'low' },
    { id: 'c_spill', trigger: 'Spill or breakage', plan: 'Club soda + the spare place setting you kept aside. Reset and move on without a fuss — your calm sets the table’s mood.', severity: 'low' },
  ],

  // Day-of "Before the big day" readiness walkthrough — authored for an INDOOR,
  // seated dinner. No grill/fire, no weather/canopy, no outdoor-power risk: an
  // honest, lighter set. severity drives ordering; state persists in
  // event.safetyChecked[id].
  dayOfChecklist: [
    { id: 'food', label: 'Food safety', detail: 'Cold dishes kept cold, hot dishes held warm, nothing perishable sitting out more than ~2 hours. Cook proteins to safe internal temps.', severity: 'high' },
    { id: 'allergies', label: 'Allergy / dietary check', detail: "Confirm every guest's allergy or dietary need is covered, and you know which dish is which before you serve. Keep one safe vegetarian plate ready.", severity: 'high' },
    { id: 'kitchen', label: 'Kitchen + stove safety', detail: 'Pot handles turned in, nothing flammable near burners, oven timers set so nothing burns while you host.', severity: 'med' },
    { id: 'cleanup', label: 'Cleanup ready', detail: 'Dish soap, towels, an empty dishwasher and a bus tub staged so the kitchen never traps you mid-evening.', severity: 'low' },
    { id: 'emergency', label: 'Emergency basics', detail: 'First-aid kit on hand; know the nearest ER; phones charged.', severity: 'low' },
  ],

  // Knowledge / provenance (source-verified — see canonical
  // dinner-party.knowledge.json for the full cited principles + sources).
  knowledge: {
    governanceVersion: '1.1.0',
    verificationStatus: 'cited',
    note: 'Source-verified in the 2026-06-13 foreground pass: quantities + food-safety/culinary practices are established-consensus / trade-heuristic and cited; coaching / ROI claims are labeled synthesized. Full cited principles and sources live in engine-audit/playbooks/dinner-party.knowledge.json.',
    sources: ['fsis-danger-zone', 'fsis-temp-chart', 'fsis-leftovers'],
  },
};

export default dinnerParty;
