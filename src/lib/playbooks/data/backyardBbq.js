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
    { id: 'menu', label: 'Grill menu (proteins + sides)', options: ['Burgers + dogs', 'Chicken + ribs', 'Mixed grill', 'Seafood boil / cookout'], default: 'Burgers + dogs', when: 'T-10d', blocks: ['food', 'fuel'], why: 'Drives proteins, buns, fuel, and grill time. Burgers/dogs are the lowest-effort default.' },
    { id: 'potluck', label: 'Host-provided or potluck sides?', options: ['Host provides all', 'Potluck sides', 'Host grills, guests bring drinks'], default: 'Host grills, guests bring drinks', when: 'T-10d', blocks: ['food', 'beverage_purchases'], why: 'Biggest cost/effort lever — assigning sides/drinks cuts the host load roughly in half.' },
    { id: 'alcohol', label: 'Drinks', options: ['Beer + soda + water', 'BYOB', 'Full cooler bar', 'Dry / family-friendly'], default: 'Beer + soda + water', when: 'T-7d', blocks: ['beverage_purchases'], why: 'Drives cooler + ice volume and whether anyone needs a ride.' },
    { id: 'shade', label: 'Shade + seating plan (outdoor comfort)', options: ['Existing patio/shade', 'Pop-up canopy', 'Rent tent + tables', 'Park shelter'], default: 'Existing patio/shade', when: 'T-7d', why: 'Sun, bugs, and nowhere to sit end a cookout early — plan shade + seating up front.' },
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
    { id: 'p_protein', item: 'Grill proteins (burgers, dogs, chicken)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco', 'Butcher'], unitCostRange: [4, 10], essential: true, buyAt: 'T-1d', alternatives: ['Pork shoulder — cheaper, feeds a crowd smoked low & slow', 'Bone-in chicken thighs — budget-friendly, hard to overcook', 'Turkey burgers — leaner swap, same cook time'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~0.5 lb grilled protein/guest cookout heuristic.' } },
    { id: 'p_buns', item: 'Buns / bread', category: 'food', qtyPerGuest: 2, unit: 'buns', where: ['Grocery', 'Bakery'], unitCostRange: [0.3, 0.6], essential: true, buyAt: 'T-1d', alternatives: ['Sliced white bread — cheaper, works for dogs and burgers', 'Tortillas — versatile, cheaper per serving'] },
    { id: 'p_sides', item: 'Sides (salads, beans, corn, chips)', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery'], unitCostRange: [2, 4], essential: true, buyAt: 'T-1d', alternatives: ['Canned baked beans — near-zero prep, same crowd appeal', 'Bag of chips + store-bought dip — if time is short'] },
    { id: 'p_condiments', item: 'Condiments + toppings (ketchup, mustard, cheese, lettuce, onion)', category: 'food', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [15, 30], essential: true, buyAt: 'T-3d' },
    { id: 'p_dessert', item: 'Dessert (watermelon, cookies, s\'mores)', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery'], unitCostRange: [1, 3], essential: false, buyAt: 'T-1d', alternatives: ['Grocery sheet cake — feeds same crowd, no prep', 'Popsicles / ice cream bars — budget option, kids love them'] },
    { id: 'p_drinks', item: 'Drinks (beer, soda, water)', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Grocery', 'Costco', 'Liquor store'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~3 drinks/guest over a 4h outdoor afternoon.' } },
    { id: 'p_ice', item: 'Ice (coolers + drinks)', category: 'beverage', qtyPerGuest: 2, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~2 lb/guest for outdoor coolers (more than indoors — it melts).', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~2 lb ice/guest for outdoor cooler service (heat-adjusted).' } },
    { id: 'p_fuel', item: 'Charcoal / propane + lighter', category: 'logistics', qtyFlat: 1, unit: 'supply', where: ['Grocery', 'Hardware store', 'Gas station'], unitCostRange: [15, 30], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: check the propane tank or buy a bag of charcoal — out of fuel = no food.' },
    { id: 'p_thermometer', item: 'Instant-read food thermometer', category: 'logistics', qtyFlat: 1, unit: 'tool', where: ['Grocery', 'Hardware store', 'Amazon'], unitCostRange: [10, 20], essential: true, buyAt: 'T-3d', note: 'Board add: the high-severity food-safety risk says "grill to safe temps" but the one TOOL that prevents it was missing. Chicken 165°F, burgers 160°F.' },
    { id: 'p_comfort', item: 'Bug spray, sunscreen, citronella', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Pharmacy'], unitCostRange: [10, 25], essential: false, buyAt: 'T-3d', note: 'Outdoor comfort — sun + mosquitoes end a cookout early.' },
    { id: 'p_tableware', item: 'Disposable plates, cups, napkins, cutlery', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.3, 1], essential: true, buyAt: 'T-3d' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels, foil', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 15], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a recycling bag for cans/bottles + foil to wrap leftovers.' },
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
    { id: 'r_weather', trigger: 'Rain or extreme heat, no plan', severity: 'high', mitigation: 'Check the forecast at T-3d; secure a canopy/indoor fallback; move earlier/later to dodge peak heat.' },
    { id: 'r_fuel', trigger: 'Out of charcoal / empty propane tank', severity: 'high', mitigation: 'Check + buy fuel at T-3d; keep a spare bag/tank.' },
    { id: 'r_ice', trigger: 'Ice melts, drinks go warm', severity: 'med', mitigation: 'Buy ~2 lb ice/guest day-of (outdoor melts fast); keep a shaded backup cooler.' },
    { id: 'r_foodsafe', trigger: 'Food left out in the heat', severity: 'high', mitigation: 'Keep cold food on ice; don\'t leave perishables out >1h in 90°F+; grill to safe temps.' },
    { id: 'r_bugs', trigger: 'Mosquitoes / sun run guests off', severity: 'low', mitigation: 'Bug spray, citronella, shade, and water available.' },
  ],

  contingencies: [
    { id: 'c_rain', when: 'r_weather', plan: 'Pop the canopy or move to the garage/indoors; grill under cover; notify guests the morning of.' },
    { id: 'c_fuel', when: 'r_fuel', plan: 'Send someone for a bag of charcoal / a swap propane tank; gas stations carry both.' },
    { id: 'c_heat', when: 'r_foodsafe', plan: 'Stage cold dishes over ice trays; bring perishables out in waves rather than all at once.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Drinks, fuel, disposables, condiments, bug/sun supplies, cleanup kit' },
      { when: 'T-1d', what: 'Proteins, buns, produce, dessert' },
      { when: 'T0', what: 'Ice (lots) + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Marinate proteins; make cold sides; check fuel + grill' },
      { when: 'T0 -1h', what: 'Set up coolers + ice, shade, seating, drinks station' },
    ],
    setup: [
      { when: 'T0 -1h', what: 'Coolers + ice, canopy/shade, chairs, food + drinks tables' },
      { when: 'T0 -0:45', what: 'Light the grill; stage trash + recycling bins' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep cold food on ice; bag cans for recycling as you go' },
      { when: 'T0 +4h', what: 'Cool + scrape the grill, pack leftovers, bag trash/recycling, fold chairs/canopy' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Quantities reflect common US cookout rules of thumb (~0.5 lb grilled protein/guest, ~2 buns/guest, ~3 drinks/guest over 4h, ~2 lb ice/guest for outdoor coolers). Food-safety guidance (don\'t leave perishables out >1h above 90°F; grill to safe internal temps) reflects widely-published USDA-style practice. Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default backyardBbq;
