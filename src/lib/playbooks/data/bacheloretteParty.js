// Bachelorette Party — Event OS host playbook (data only).
//
// A maid-of-honor-run bachelorette party for the bride-to-be. This playbook
// models the HOSTED portion — a suite / Airbnb / at-home pre-game (apps +
// grazing + a batch cocktail or bubbly) that rolls into a dinner reservation
// or a night-out / club plan with shared transport, then a "get the bride
// home safe" close. ~6–15 guests, organized by the maid of honor (planner,
// banker, and safety lead). The playbook is alcohol-forward, so it treats
// over-serving and rides as FIRST-CLASS RISKS: ~1 drink/guest/hr is paired
// with a water-for-every-drink rule, a buddy system, a pre-booked rideshare /
// party-bus plan, and a designated sober point person. Money is split
// transparently (the group covers the bride's share) with the per-person cost
// agreed up front. Quantities are common US host/party rules of thumb (see
// `knowledge`), authored honestly as established-consensus / trade-heuristic
// and labeled `synthesized` until a foreground verification pass attaches
// citations. ESM default export — no CJS in src/ (prod-bundle-safe). No
// fabricated sources.

const bacheloretteParty = {
  type: 'Bachelorette Party',
  solveFamily: 'bachelorette',
  family: 'host_driven',
  recordKind: 'client',
  version: '1.0.0',
  meta: {
    summary: 'A maid-of-honor-run bachelorette for the bride-to-be — a hosted suite / Airbnb / at-home pre-game (apps + grazing + a batch cocktail or bubbly) that rolls into a dinner reservation or a night-out / club plan with shared transport, then a "get the bride home safe" close. ~6–15 guests. Because it is alcohol-forward, the playbook front-loads the cost-split + itinerary + transport and treats over-serving and safe rides as real, named risks: ~1 drink/guest/hr paired with water-for-every-drink, a buddy system, a pre-booked rideshare/party-bus plan, and a sober point person.',
    typicalGuests: { low: 6, default: 10, high: 15 },
    typicalDurationHours: 6,
    leadTimeDays: 30,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 60, high: 220, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The bride walks in and doesn\'t know what\'s coming — then she sees everyone.',
    'The toast from the maid of honor that makes the bride ugly-cry in the best way.',
    'The whole group on the dance floor at the same time, no one sitting it out.',
    'The quiet ride home where the bride says it was exactly what she needed.',
  ],

  decisions: [
    { id: 'format', label: 'Night out vs. weekend trip', options: ['One big night out (local)', 'Overnight (Airbnb / hotel suite)', 'Full weekend trip'], default: 'One big night out (local)', when: 'T-30d', blocks: ['lodging', 'transport', 'itinerary', 'beverage_purchases'], why: 'This is the spine decision: it sets lodging, how many nights of transport you book, how big the cost-split is, and whether the pre-game is at home or in a rented suite.' },
    { id: 'costsplit', label: 'Budget + cost-split model (who pays for what; cover the bride)', options: ['Even split, group covers the bride', 'Even split, bride pays her own', 'Tiered (each pays own + chips in for bride)', 'Host fronts, collect via app'], default: 'Even split, group covers the bride', when: 'T-30d', blocks: ['lodging', 'transport', 'itinerary'], why: 'Bachelorette costs spiral and money is the #1 friction. Agree the per-person number and the "do we cover the bride" rule UP FRONT, in writing, before anyone books — traditionally the group splits the bride\'s share, travel excepted.' },
    { id: 'vibe', label: 'Bride\'s vibe / non-negotiables', options: ['Bar/club crawl', 'Dinner + drinks', 'Boat/pool day + night out', 'Low-key / spa + wine'], default: 'Dinner + drinks', when: 'T-30d', blocks: ['itinerary', 'reservations'], why: 'Confirm with the bride (privately) what she actually wants and any hard nos — this drives the reservation, the games, and the energy of the night.' },
    { id: 'dinner', label: 'Dinner reservation vs. club/bar plan', options: ['Sit-down dinner reservation', 'Dinner then club', 'Bar crawl (no formal dinner)', 'Private chef at the Airbnb'], default: 'Dinner then club', when: 'T-21d', blocks: ['reservations', 'transport'], why: 'Large-group reservations book out weeks ahead and most venues require a card/deposit; the choice also sets how many transport legs you pre-book.' },
    { id: 'drinkers', label: 'Drinking mix + dietary/no-alcohol needs', options: ['Mostly drinking', 'Mixed', 'Several non-drinkers / pregnant / sober'], default: 'Mixed', when: 'T-14d', blocks: ['beverage_purchases'], why: 'Sets the batch-cocktail size AND guarantees a great zero-proof option, plenty of water, and food — never leave a non-drinker (or the designated sober lead) without an equally good pour.' },
  ],

  milestones: [
    { id: 'bp_setdate', name: 'Lock date, guest list, budget + cost-split with the bride', offsetDays: 30, owner: 'host', category: 'planning', risk: null },
    { id: 'bp_book', name: 'Book lodging (if overnight) + dinner reservation + transport', offsetDays: 21, owner: 'host', dependsOn: ['bp_setdate'], category: 'logistics', risk: { ifDelayed: 'Large-group reservations and party-bus/rideshare windows sell out; suite gone', severity: 'high' } },
    { id: 'bp_invite', name: 'Send the itinerary + cost-split + RSVP / dietary + collect deposits', offsetDays: 18, owner: 'host', dependsOn: ['bp_setdate'], category: 'guest', risk: { ifDelayed: 'No money collected → host eats the cost; wrong headcount', severity: 'high' } },
    { id: 'bp_safety', name: 'Lock the safe-rides + buddy plan and name a sober point person', offsetDays: 7, owner: 'host', dependsOn: ['bp_book'], category: 'safety', risk: { ifDelayed: 'No plan to get the bride + group home safely after drinking', severity: 'high' } },
    { id: 'bp_rsvp_close', name: 'Lock final headcount + confirm reservation / transport counts', offsetDays: 4, owner: 'host', dependsOn: ['bp_invite'], category: 'guest', risk: { ifDelayed: 'Over/under-buy; reservation party size wrong', severity: 'med' } },
    { id: 'bp_shop_nonperish', name: 'Buy decor, sash/banner, favors, games, liquor, mixers, paper goods', offsetDays: 3, owner: 'host', dependsOn: ['bp_rsvp_close'], category: 'shopping', risk: null },
    { id: 'bp_shop_fresh', name: 'Buy apps/grazing, garnishes, bubbly, juice, lots of water', offsetDays: 1, owner: 'host', dependsOn: ['bp_rsvp_close'], category: 'shopping', risk: { ifDelayed: 'No food to slow the drinking / wilted grazing board', severity: 'med' } },
    { id: 'bp_setup', name: 'Set the suite: grazing board, batch cocktail, sash/decor, games, water station', offsetDays: 0, owner: 'host', dependsOn: ['bp_shop_nonperish', 'bp_shop_fresh'], category: 'setup', risk: null },
    { id: 'event', name: 'The bachelorette (pre-game → dinner/night out → safe ride home)', offsetDays: 0, owner: 'host', dependsOn: ['bp_setup', 'bp_safety'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_costsplit', milestoneId: 'bp_setdate', phase: 'planning', label: 'Agree the per-person number + "we cover the bride" rule in writing', when: 'T-30d' },
    { id: 't_book', milestoneId: 'bp_book', phase: 'logistics', label: 'Book lodging, dinner reservation (deposit/card), party bus or pre-stage rideshare', when: 'T-21d' },
    { id: 't_invite', milestoneId: 'bp_invite', phase: 'guest', label: 'Send itinerary + cost-split + RSVP-by + dietary/no-alcohol ask; collect deposits via app', when: 'T-18d' },
    { id: 't_safety', milestoneId: 'bp_safety', phase: 'safety', label: 'Name a sober point person, set a buddy system + meetup spot, pre-load rideshare, share live location, save the Airbnb/hotel address in everyone\'s phone', when: 'T-7d' },
    { id: 't_rsvp', milestoneId: 'bp_rsvp_close', phase: 'guest', label: 'Chase non-responders; confirm reservation party size + transport seat count', when: 'T-4d' },
    { id: 't_nonperish_shop', milestoneId: 'bp_shop_nonperish', phase: 'shopping', label: 'Sash/banner/decor, favors + matching items, games, liquor, mixers, paper goods', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'bp_shop_fresh', phase: 'shopping', label: 'Apps/grazing, garnishes, bubbly, juice, electrolytes, and LOTS of water', when: 'T-1d' },
    { id: 't_setup', milestoneId: 'bp_setup', phase: 'setup', label: 'Build grazing board, batch the cocktail, hang sash/decor, set games + a visible water station', when: 'T0 -3h' },
    { id: 't_close', milestoneId: 'event', phase: 'cleanup', label: 'Account for every guest, ride the bride home first/safe, pack favors + gifts, water + trash sweep, settle the tab/split', when: 'T0 +6:00' },
  ],

  purchases: [
    { id: 'p_apps', item: 'Cheese & cured meats board (dips, crackers, fruit, veg)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco', 'Caterer'], unitCostRange: [5, 12], essential: true, buyAt: 'T-1d', note: 'Food is a SAFETY tool — a real grazing board for the pre-game keeps people eating while they drink and slows the night down.', alternatives: ['Costco deli platter — cheaper per lb, same grazing function', 'Trader Joe\'s appetizer section — budget-friendly, pre-made bites', 'Hummus + veggie tray + crackers — cheapest spread option'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~0.5 lb grazing/guest for a pre-dinner pre-game board.' } },
    { id: 'p_spirits', item: 'Liquor for the batch cocktail (vodka/tequila/gin) + a bottle for shots', category: 'beverage', qtyPerGuest: 0.18, unit: 'bottle (750ml)', where: ['Liquor store', 'Costco', 'Total Wine'], unitCostRange: [15, 30], essential: false, buyAt: 'T-3d', note: 'For the at-home pre-game only — plan ~1 drink/guest/hr for the ~2 pre-game hours. ~1 750ml bottle (≈16 drinks) per 5–6 guests. Pace, do not over-buy; the night out has its own bar tab.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: 'US party heuristic: ~1 drink/guest/hr (2 in the first hour); ~16 cocktails per 750ml bottle.' } },
    { id: 'p_bubbly', item: 'Sparkling wine / prosecco for the toast + mimosas', category: 'beverage', qtyPerGuest: 0.25, unit: 'bottle (750ml)', where: ['Grocery', 'Liquor store', 'Costco'], unitCostRange: [10, 18], essential: false, buyAt: 'T-3d', note: '~1 bottle per 4 guests covers a welcome toast and a light pour; the bride\'s glass is the centerpiece.' },
    { id: 'p_mixers', item: 'Mixers + garnishes (juice, soda, citrus, simple syrup) for the batch cocktail', category: 'beverage', qtyPerGuest: 0.5, unit: 'L', where: ['Grocery', 'Costco'], unitCostRange: [1.5, 4], essential: false, buyAt: 'T-1d', note: 'Doubles as the base for the zero-proof version of the signature drink.' },
    { id: 'p_water', item: 'Water + electrolyte drinks (bottled water, sparkling, Liquid I.V. / Gatorade)', category: 'beverage', qtyPerGuest: 4, unit: 'bottles/servings', where: ['Grocery', 'Costco'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-1d', note: 'SAFETY-ESSENTIAL: one water per drink, plus electrolytes for the morning. Set a visible water station — this is the single most effective over-serving mitigation.' },
    { id: 'p_zeroproof', item: 'Zero-proof / mocktail base + N/A bubbly for non-drinkers & the sober lead', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', note: 'Make the mocktail as good as the cocktail — the designated sober point person and any non-drinkers/pregnant guests should never feel left out.' },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest for the batch cocktail, chilling bubbly, and the water station.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1.5 lb ice/guest beverage-service heuristic.' } },
    { id: 'p_sash', item: 'Bride sash + bachelorette banner + photo-wall decor', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Amazon', 'Party store', 'Etsy', 'Target'], unitCostRange: [20, 60], essential: true, buyAt: 'T-3d', note: 'The bride sash is the signature item — plus a "Bride" banner and a small backdrop for photos.' },
    { id: 'p_decor', item: 'Theme decor (balloons, confetti, table accents, tiaras)', category: 'decor', qtyFlat: 1, qtyPer: 8, unit: 'kit per 8 guests', where: ['Party store', 'Amazon', 'Target'], unitCostRange: [25, 70], essential: false, buyAt: 'T-3d' },
    { id: 'p_favors', item: 'Party favors / matching items (matching tees, sunnies, koozies, totes, hangover kits)', category: 'decor', qtyPerGuest: 1, unit: 'set', where: ['Etsy', 'Amazon', 'Party store'], unitCostRange: [6, 22], essential: false, buyAt: 'T-3d', note: 'Matching tees/sunnies make the group photos AND make the crew easy to spot/keep together out at night (a low-key safety bonus).' },
    { id: 'p_games', item: 'Bachelorette games + dares/prompt cards + small prizes', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Amazon', 'Etsy', 'Party store'], unitCostRange: [12, 35], essential: false, buyAt: 'T-3d', dependsOnDecision: 'vibe' },
    { id: 'p_tableware', item: 'Cups, shot glasses, flutes, plates, napkins, cutlery', category: 'rental', qtyPerGuest: 2, unit: 'set', where: ['Grocery', 'Party store', 'Costco'], unitCostRange: [0.4, 2], essential: true, buyAt: 'T-3d', note: 'Include flutes for the toast and cups clearly distinct from the water cups.' },
    { id: 'p_paper', item: 'Paper goods (tablecloths, foil, ziplocks, gift/leftover bags, trash bags)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [8, 20], essential: true, buyAt: 'T-3d' },
    { id: 'p_safetykit', item: 'Safety + recovery kit (portable phone chargers, OTC pain reliever, antacids, band-aids, snacks, sealed water for the ride home)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Pharmacy', 'Grocery', 'Amazon'], unitCostRange: [15, 40], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a charged phone is a safety device. Keep chargers, water, and snacks in the bride\'s bag and the sober lead\'s bag.' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels, wipes (Airbnb-reset friendly)', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 14], essential: true, buyAt: 'T-3d', note: 'Leave the suite clean to protect the deposit — assign the reset before anyone leaves.' },
  ],

  rentalsGap: [
    { item: 'Party bus / large rideshare (XL) for the night-out legs', qtyFlat: 1, note: 'COMMONLY UNDER-PLANNED: pre-book the round trip so no one is stranded or tempted to drive — this IS the safe-rides plan for the group.' },
    { item: 'Drink dispenser / large pitcher for the batch cocktail', qtyFlat: 1, note: 'Plus a SECOND dispenser dedicated to water/zero-proof so it is always visible and full.' },
    { item: 'Cooler / ice bucket', qtyFlat: 1, note: 'Chill bubbly + water; double-duty as the ride-home water stash.' },
    { item: 'Bluetooth speaker', qtyFlat: 1, note: 'For the pre-game playlist (often on-hand, not a true rental).' },
  ],

  vendors: [
    { category: 'Lodging (Airbnb / hotel suite)', required: false, altToDIY: 'Host the pre-game at someone\'s home', when: 'T-21d', costRange: [40, 150], costUnit: 'per guest' },
    { category: 'Restaurant (large-group dinner reservation)', required: false, altToDIY: 'Private chef at the Airbnb or DIY dinner', when: 'T-21d', costRange: [35, 90], costUnit: 'per guest' },
    { category: 'Transport (party bus / pre-booked rideshare)', required: true, altToDIY: 'Pre-stage rideshare with a named ride captain (still NOT optional — someone sober must own getting everyone home)', when: 'T-14d', costRange: [150, 700], costUnit: 'flat' },
    { category: 'Bartender / mixologist (optional, for the suite)', required: false, altToDIY: 'MoH batches the cocktail in advance', when: 'T-14d', costRange: [200, 450], costUnit: 'flat' },
    { category: 'Private chef / catering (if no dinner out)', required: false, altToDIY: 'DIY grazing + delivery', when: 'T-14d', costRange: [40, 110], costUnit: 'per guest' },
  ],

  risks: [
    { id: 'r_overserve', trigger: 'The bride (or a guest) is over-served and the night becomes unsafe', severity: 'high', mitigation: 'Pace to ~1 drink/guest/hr (2 in the first hour); enforce water-for-every-drink at a visible station; keep food out the whole pre-game; the sober point person watches the bride and calls last-call early if needed. Over-serving is the #1 thing that turns a fun night dangerous.' },
    { id: 'r_riders', trigger: 'No safe, sober way to get the bride + group home after drinking', severity: 'high', mitigation: 'Pre-book the party bus or pre-load rideshare for every leg; name a designated sober "ride captain"; run a buddy system (no one leaves alone) with a meetup spot; share live locations; save the lodging address in every phone. NO ONE who has been drinking drives — this is non-negotiable.' },
    { id: 'r_separated', trigger: 'Someone gets separated from the group at a crowded bar/club', severity: 'high', mitigation: 'Buddy pairs assigned at the start, an agreed meetup spot + time, a group thread, and a head-count by name before each move and before leaving — account for every guest, every transition.' },
    { id: 'r_money', trigger: 'Cost-split unclear / deposits not collected → host eats the cost or guests feel blindsided', severity: 'high', mitigation: 'Publish the per-person number and the "cover the bride" rule before anyone books; collect deposits via a payment app at invite; track who has paid. Travel is typically the one cost guests cover for themselves.' },
    { id: 'r_reservation', trigger: 'Dinner reservation or transport falls through / party size wrong', severity: 'med', mitigation: 'Book early with a card on file, reconfirm 48h out with the final count, and hold a backup restaurant + a rideshare fallback.' },
    { id: 'r_bridevibe', trigger: 'Plan drifts from what the bride actually wants', severity: 'med', mitigation: 'Confirm the vibe + hard-nos with the bride privately up front; she should feel celebrated, not managed — keep one surprise small and safe.' },
  ],

  contingencies: [
    { id: 'c_overserve', when: 'r_overserve', plan: 'If the bride or a guest is too drunk, the sober lead pivots them to water + food, gets them back to the suite early with a buddy, and the night continues without them — caring for one guest never means leaving them alone.' },
    { id: 'c_riders', when: 'r_riders', plan: 'If the party bus is late or surge pricing spikes, the ride captain holds the group together at the agreed spot, books the next available XL/rideshare, and the bride goes in the first car home with a buddy.' },
    { id: 'c_separated', when: 'r_separated', plan: 'If someone is missing, stop the group at the meetup spot, call + text + check live location, and no one moves on until everyone is accounted for by name.' },
    { id: 'c_money', when: 'r_money', plan: 'If deposits stall, the host re-sends the split with a hard pay-by date and reduces scope (cut the party bus to rideshare, simpler dinner) rather than fronting the whole cost.' },
    { id: 'c_reservation', when: 'r_reservation', plan: 'If the reservation drops, fall back to the backup restaurant or a private-chef/delivery night at the Airbnb and shift transport accordingly.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Sash/banner/decor, favors + matching items, games, liquor, mixers, tableware, safety kit, cleanup kit' },
      { when: 'T-1d', what: 'Apps/grazing, garnishes, bubbly, juice, electrolytes, and lots of water' },
      { when: 'T0', what: 'Ice + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-7d', what: 'Lock the safe-rides + buddy plan; name the sober point person; pre-load rideshare and save the address in phones' },
      { when: 'T-1d', what: 'Batch the cocktail base, assemble the grazing board components, charge the portable chargers, pack the bride + ride-captain bags' },
      { when: 'T0 -3h', what: 'Build the board, finish the batch cocktail, chill bubbly + water, set games' },
    ],
    setup: [
      { when: 'T0 -3h', what: 'Hang the sash/banner/photo-wall, set the grazing table + bar, place the batch-cocktail dispenser' },
      { when: 'T0 -2h', what: 'Set the VISIBLE water/zero-proof station (full + iced), stage the safety kit, confirm the transport pickup time, post the itinerary + meetup spot for the group' },
    ],
    cleanup: [
      { when: 'during', what: 'Sober lead runs a buddy-pair head-count by name before every move; keep water + snacks flowing; bus dishes into a tub' },
      { when: 'T0 +6h', what: 'Account for every guest, ride the bride home first and safe with a buddy, pack favors/gifts, water + trash sweep to protect the deposit, settle the tab/split' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'This playbook is deliberately alcohol-aware. Quantities reflect common US host/party rules of thumb: ~0.5 lb grazing/guest for a pre-dinner board, a beverage plan of ~1 drink/guest/hr (about 2 in the first hour) for the roughly two-hour at-home pre-game only (~16 cocktails per 750ml bottle, so ~1 bottle per 5–6 guests), ~1 bottle of sparkling per 4 guests for the toast, and ~1.5 lb ice/guest — with the explicit understanding that the night-out venue carries its own bar tab and the host should pace, not over-buy. The safety stance is the point of this file: over-serving and getting the bride and group home safely are modeled as first-class, high-severity risks, not afterthoughts. The playbook pairs every drink with water (a visible water station is the single most effective over-serving control), keeps food out the whole pre-game, names a designated sober "ride captain," requires a buddy system with a meetup spot and a head-count-by-name before every move, and treats pre-booked transport (party bus or pre-staged rideshare) as required — no one who has been drinking drives, and no one is left alone. Money guidance — agree the per-person number and the "the group covers the bride" rule in writing before anyone books, collect deposits up front, travel excepted — reflects widely-published US bachelorette convention and is included because cost friction is the most common way these plans go sideways. Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default bacheloretteParty;
