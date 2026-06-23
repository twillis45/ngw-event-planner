// Housewarming — Event OS playbook data.
//
// ESM default export (no CJS module.exports in src/ — see the prod-bundle ESM
// lesson). Authored to the canonical playbook schema; the reader (../index.js)
// consumes `purchases` first for the operational candidate, with the rest
// available as the engine grows.
//
// A housewarming is a low-key, at-home party to show off a new home. It is NOT a
// catered meal — it's a grazing/snack spread + open drinks. The playbook keeps
// the host's load light, front-loads the few real decisions, and grounds every
// quantity in US hosting rules of thumb (~6-8 app bites/guest/hour, ~1 drink/
// guest/hour, ~1-1.5 lb ice/guest). The home is the centerpiece, so decor stays
// minimal and a house-tour flow + a gift landing spot are first-class concerns.

const housewarming = {
  type: 'Housewarming',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',

  meta: {
    summary:
      'A casual, at-home party to show off a new place. The draw is the home itself, not a meal — so the playbook centers an easy grazing spread, open drinks, a coat/shoe/entry plan, a natural house-tour flow, a spot for gifts, and a cleanup that one host can do alone the next morning.',
    typicalGuests: { low: 15, default: 22, high: 30 },
    typicalDurationHours: 3,
    leadTimeDays: 14,
    hostDifficulty: 'easy',
    perGuestCost: { low: 8, high: 22, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The first guests walk in and the host watches them take in the space.',
    'Someone says "you really made it feel like you" — and they\'re right.',
    'The house tour ends in the kitchen and nobody leaves that room.',
    'A gift gets unwrapped that is exactly right for the new place.',
  ],

  decisions: [
    { id: 'window', label: 'Open-house window or fixed start?', options: ['Open house (drop in 2-5pm)', 'Fixed start, afternoon', 'Fixed start, evening', 'Brunch / daytime'], default: 'Open house (drop in 2-5pm)', when: 'T-7d', blocks: ['invite', 'food_volume'], why: 'An open-house window keeps a new-home crowd light at any one moment and lets a single host greet, tour, and refill without a rush — but it spreads food consumption out, so volumes are estimated on peak overlap, not the full guest list.' },
    { id: 'food_style', label: 'Food style', options: ['Grazing board + passed snacks', 'Grazing board only', 'Light apps + one warm bite', 'Order-in finger food'], default: 'Grazing board + passed snacks', when: 'T-7d', blocks: ['purchases', 'rentals'], why: 'Sets the bite count and whether the host cooks at all. A housewarming is snacks, not dinner — a grazing board plus a couple of room-temp passed items reads generous while keeping the host out of the kitchen.' },
    { id: 'drinks', label: 'Drink plan', options: ['Beer + wine + soda', 'Beer + wine + soda + one signature cocktail', 'BYOB + host provides mixers/soda', 'Zero-proof / dry'], default: 'Beer + wine + soda + one signature cocktail', when: 'T-7d', blocks: ['purchases'], why: 'Drives the biggest line item and the glassware/ice math. One batched signature cocktail feels special without a bartender; a self-serve beer-wine-soda station carries the rest.' },
    { id: 'entry', label: 'Shoes-off house, or shoes-on?', options: ['Shoes off (provide a tray + basket)', 'Shoes on', "Host's call at the door"], default: 'Shoes off (provide a tray + basket)', when: 'T-7d', blocks: ['setup'], why: 'New-home hosts often want shoes off to protect new floors. Decide early so the entry plan (shoe tray, coat space, a friendly sign) is ready and no guest is caught off guard at the door.' },
    { id: 'gifts', label: 'Gifts: welcome them, or "no gifts"?', options: ['No gifts (say so on the invite)', 'Welcome — set a gift table', 'House fund / registry link'], default: 'Welcome — set a gift table', when: 'T-7d', blocks: ['setup'], why: 'Guests will bring housewarming gifts unless told not to. Either say "no gifts, just come" on the invite or set an obvious gift-landing spot near the door so nobody is left holding a plant and a bottle.' },
  ],

  milestones: [
    { id: 'hw_setdate', name: 'Set date + window + rough headcount', offsetDays: 14, owner: 'host', category: 'planning', risk: null },
    { id: 'hw_invite', name: 'Send invites (note open-house window, shoes-off, gift stance)', offsetDays: 12, owner: 'host', dependsOn: ['hw_setdate'], category: 'guest', risk: { ifDelayed: 'Thin RSVP read → wrong food/drink volumes', severity: 'med' } },
    { id: 'hw_plan', name: 'Lock food style + drink plan', offsetDays: 7, owner: 'host', dependsOn: ['hw_invite'], category: 'planning', risk: { ifDelayed: 'No shopping list possible', severity: 'med' } },
    { id: 'hw_rsvp', name: 'Read the RSVPs / estimate peak overlap', offsetDays: 3, owner: 'host', dependsOn: ['hw_invite'], category: 'guest', risk: { ifDelayed: 'Over- or under-buy snacks and drinks', severity: 'med' } },
    { id: 'hw_shop_dry', name: 'Buy drinks, paper goods, non-perishables, decor', offsetDays: 3, owner: 'host', dependsOn: ['hw_plan'], category: 'shopping', risk: null },
    { id: 'hw_shop_fresh', name: 'Buy fresh grazing items + flowers', offsetDays: 1, owner: 'host', dependsOn: ['hw_plan', 'hw_rsvp'], category: 'shopping', risk: { ifDelayed: 'Wilted produce / picked-over cheese counter', severity: 'low' } },
    { id: 'hw_prep', name: 'Build the board + prep passed bites (make-ahead)', offsetDays: 1, owner: 'host', dependsOn: ['hw_shop_fresh'], category: 'food', risk: null },
    { id: 'hw_setup', name: 'Stage entry, drinks station, board, gift spot, tour path', offsetDays: 0, owner: 'host', dependsOn: ['hw_prep'], category: 'setup', risk: null },
    { id: 'event', name: 'The housewarming', offsetDays: 0, owner: 'host', dependsOn: ['hw_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'hw_invite', phase: 'guest', label: 'Send invite: address, parking note, open-house window, shoes-off heads-up, and your gift stance ("no gifts, just come" or "we have a spot for them")', when: 'T-12d' },
    { id: 't_buffer', milestoneId: 'hw_rsvp', phase: 'guest', label: 'Estimate peak overlap (assume ~50-60% of an open-house list is present at once) and plan food/drink to that, not the full list', when: 'T-3d' },
    { id: 't_dry_shop', milestoneId: 'hw_shop_dry', phase: 'shopping', label: 'Drinks, soda, water, paper goods, napkins, trash bags, decor, candles, non-perishable snacks', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'hw_shop_fresh', phase: 'shopping', label: 'Cheese, charcuterie, fruit, veg, dips, fresh herbs/garnish, flowers (buy ~24h out)', when: 'T-1d' },
    { id: 't_board', milestoneId: 'hw_prep', phase: 'food', label: 'Pre-build the grazing board on a tray (cover + fridge), portion dips, prep any passed bites that hold cold', when: 'T-1d evening' },
    { id: 't_clean_pre', milestoneId: 'hw_setup', phase: 'cleanup', label: 'Pre-clean: empty dishwasher, clear sink, stage a trash + recycling station and a tub for used glasses', when: 'T0 -3h' },
    { id: 't_entry', milestoneId: 'hw_setup', phase: 'setup', label: 'Set the entry: shoe tray + basket, coat space (hooks or a cleared bed), a small friendly sign, and a clear gift-landing spot', when: 'T0 -2h' },
    { id: 't_station', milestoneId: 'hw_setup', phase: 'beverage', label: 'Build the self-serve drinks station: beer/wine/soda, ice tub, cups/glasses, opener, signature-cocktail batch in a pitcher', when: 'T0 -2h' },
    { id: 't_board_out', milestoneId: 'hw_setup', phase: 'food', label: 'Set the board out, scatter a couple of snack bowls along the tour path, light unscented candles', when: 'T0 -1h' },
    { id: 't_greet', milestoneId: 'event', phase: 'event', label: 'Greet at the door, take coats, point to drinks + gift spot, offer a quick tour to each cluster as they arrive', when: 'T0 +0:00' },
    { id: 't_refill', milestoneId: 'event', phase: 'food', label: 'Quietly top up the board, refill ice, and clear stray cups into the staged tub through the party', when: 'ongoing' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Quick reset: leftovers covered, glasses to the dishwasher, bottles to recycling, trash out — finish the rest in the morning', when: 'T0 +3:30' },
  ],

  purchases: [
    { id: 'p_cheese', item: 'Cheese (3-4 varieties for the board)', category: 'food', qtyPerGuest: 0.15, unit: 'lb', where: ['Grocery', 'Cheese shop', 'Costco'], unitCostRange: [6, 14], essential: true, buyAt: 'T-1d', note: 'Anchor of the grazing board. ~2-3 oz/guest across the spread.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'Grazing-board portion rule of thumb; volume sized to peak overlap, not the full open-house list.' }, alternatives: ['One good cheese + store-brand crackers — halves the cost', 'Pre-made cheese plate (Trader Joe\'s) — convenient budget option'] },
    { id: 'p_charc', item: 'Charcuterie / cured meats', category: 'food', qtyPerGuest: 0.1, unit: 'lb', where: ['Grocery', 'Deli', 'Costco'], unitCostRange: [5, 12], essential: false, buyAt: 'T-1d', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~1.5-2 oz/guest on a snack board.' } },
    { id: 'p_crackers', item: 'Crackers + sliced baguette / crostini', category: 'food', qtyPerGuest: 0.2, unit: 'lb', where: ['Grocery', 'Bakery'], unitCostRange: [2, 5], essential: true, buyAt: 'T-3d', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'Vehicle for cheese/dips; crackers keep, so buy early.' } },
    { id: 'p_fruit', item: 'Fruit (grapes, berries, dried fruit) + olives/pickles', category: 'food', qtyPerGuest: 0.2, unit: 'lb', where: ['Grocery', 'Farmers market'], unitCostRange: [2, 4], essential: true, buyAt: 'T-1d', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'Color + fresh contrast on the board; low effort.' } },
    { id: 'p_veg', item: 'Crudité veg with hummus & ranch', category: 'food', qtyPerGuest: 0.2, unit: 'lb', where: ['Grocery'], unitCostRange: [1, 3], essential: true, buyAt: 'T-1d', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'The easy, healthy, allergy-friendly portion of the spread.' } },
    { id: 'p_passed', item: 'Nuts, chips & salsa (popcorn, a warm dip)', category: 'food', qtyPerGuest: 2, unit: 'bites', where: ['Grocery', 'Trader Joe\'s'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-3d', note: 'Targets the ~6-8 bites/guest/hour rule across the whole spread; scatter bowls along the tour path.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'US hosting rule of thumb: ~6-8 app bites/guest/hour for an apps-only party; the board + these bowls together hit that.' }, alternatives: ['Chips + salsa from store — cheapest warm snack option', 'Microwave popcorn (bulk) — if budget is tight'] },
    { id: 'p_sweet', item: 'Something sweet (cookies, brownies, a small cake)', category: 'food', qtyPerGuest: 1, unit: 'piece', where: ['Bakery', 'Grocery'], unitCostRange: [1, 3], essential: false, buyAt: 'T-1d', provenance: { tier: 'host-coaching', confidence: 'low', verificationStatus: 'synthesized', note: 'A small sweet closes the spread; optional for a casual drop-in.' }, alternatives: ['Grocery bakery cookies — cheaper than specialty', 'Brownies from box mix — budget DIY, tastes homemade'] },
    { id: 'p_beer', item: 'Beer (mix of light + craft)', category: 'beverage', qtyPerGuest: 1.5, unit: 'cans/bottles', where: ['Grocery', 'Liquor store', 'Total Wine'], unitCostRange: [1.5, 3], essential: true, buyAt: 'T-3d', note: '~1 drink/guest/hour split across beer/wine/soda; size to peak overlap.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'US rule of thumb ~1 alcoholic drink/guest/hour; allocate ~50% to beer for a casual crowd.' } },
    { id: 'p_wine', item: 'Wine (red + white + a sparkling)', category: 'beverage', qtyPerGuest: 0.4, unit: 'bottle', where: ['Wine shop', 'Total Wine', 'Grocery'], unitCostRange: [10, 20], essential: true, buyAt: 'T-3d', note: 'Rule of thumb: ~1 bottle per 2 guests over a 2-3h window; round up.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'Standard ~5 glasses/bottle; ½-bottle-per-drinker scaled down for a short, mixed-drink event.' } },
    { id: 'p_cocktail', item: 'Signature cocktail spirits + mixers + garnish (one batch)', category: 'beverage', qtyFlat: 1, qtyPer: 12, unit: 'batch per 12 guests', where: ['Liquor store'], unitCostRange: [30, 55], essential: false, buyAt: 'T-3d', note: 'Batch in a pitcher so it pours itself — no bartender needed.', provenance: { tier: 'host-coaching', confidence: 'low', verificationStatus: 'synthesized', note: 'Optional; tied to the drinks decision.' } },
    { id: 'p_soda', item: 'Soda, sparkling water + juice (non-alcoholic)', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery', 'Costco'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-3d', note: 'Always have great zero-proof options — drivers, kids, non-drinkers.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'Plan ~2-3 non-alcoholic drinks/guest when alcohol is also served.' } },
    { id: 'p_water', item: 'Still water / cups for the sink station', category: 'beverage', qtyFlat: 1, unit: 'service', where: ['Home', 'Grocery'], unitCostRange: [0, 4], essential: true, buyAt: 'T-1d', provenance: { tier: 'host-coaching', confidence: 'low', verificationStatus: 'synthesized', note: 'A water pitcher + cups by the sink keeps people hydrated and out of your cabinets.' } },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1.25, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1-1.5 lb/guest for chilling drinks + cups; buy day-of.', provenance: { tier: 'trade-heuristic', confidence: 'high', verificationStatus: 'synthesized', note: 'US hosting rule of thumb: ~1-1.5 lb ice/guest, higher in warm weather or if chilling bottles in coolers.' } },
    { id: 'p_cups', item: 'Cups, plates, cocktail napkins, small forks/picks', category: 'logistics', qtyPerGuest: 3, unit: 'sets', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.3, 0.8], essential: true, buyAt: 'T-3d', note: 'Plan ~2-3 cups/guest — people set drinks down and lose them. Compostable if you can.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'Self-serve crowds churn through ~2-3 cups each; a marker for naming cups cuts waste.' } },
    { id: 'p_flowers', item: 'Fresh flowers (entry + board area)', category: 'decor', qtyFlat: 2, unit: 'small arrangements', where: ['Florist', 'Trader Joe\'s', 'Farmers market'], unitCostRange: [8, 20], essential: false, buyAt: 'T-1d', note: 'The home is the decor — flowers + clean surfaces beat any theme.', provenance: { tier: 'host-coaching', confidence: 'low', verificationStatus: 'synthesized', note: 'Light, home-forward decor; deliberately not a heavy theme.' } },
    { id: 'p_candles', item: 'Unscented candles + one welcoming entry scent (optional)', category: 'decor', qtyFlat: 6, unit: 'candles', where: ['Grocery', 'Ikea', 'Amazon'], unitCostRange: [0.5, 3], essential: false, buyAt: 'T-3d', note: 'Unscented near food; a single scent at the entry only.', provenance: { tier: 'host-coaching', confidence: 'low', verificationStatus: 'synthesized', note: 'Ambiance, not theme.' } },
    { id: 'p_entrykit', item: 'Entry kit: shoe tray + basket, coat hooks/rack, a small "welcome / shoes off" sign', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Have/borrow', 'Amazon', 'Ikea'], unitCostRange: [0, 25], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: where 25 pairs of shoes and coats go in a new home.', provenance: { tier: 'host-coaching', confidence: 'low', verificationStatus: 'synthesized', note: 'New-home entry logistics are the housewarming-specific failure mode.' } },
    { id: 'p_cleanup', item: 'Trash + recycling bags, dish soap, sponges, paper towels, stain spray', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [8, 16], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: extra recycling bags for bottles/cans + stain spray for new-floor spills.', provenance: { tier: 'host-coaching', confidence: 'low', verificationStatus: 'synthesized', note: 'New floors/carpet raise the stakes on spill response.' } },
  ],

  rentalsGap: [
    { item: 'Folding chairs / floor cushions', qtyPerGuest: 0.4, note: 'A drop-in crowd stands and mingles; provide a seat for roughly 40% — borrow rather than rent.' },
    { item: 'Serving boards / platters + small bowls', qtyFlat: 5, note: 'COMMONLY FORGOTTEN: a big board, 2-3 platters, and snack/dip bowls for the scattered bites.' },
    { item: 'Beverage tub / cooler + ice scoop', qtyFlat: 2, note: 'Self-serve drinks station + a backup tub for bottles; an ice scoop keeps hands out of the ice.' },
    { item: 'Drink dispenser / pitcher for the signature cocktail', qtyFlat: 1, note: 'Lets the cocktail pour itself; borrow if you do not own one.' },
  ],

  vendors: [
    { category: 'Cleaning', required: false, altToDIY: 'A next-morning cleaner (~$100-160) is the highest-ROI spend so the host enjoys their own first party in the new place', when: 'T-7d', costRange: [100, 160], costUnit: 'flat' },
    { category: 'Catering / Order-in', required: false, altToDIY: 'A platter from a deli or a grazing-box order removes all cooking; vs a DIY board for a fraction of the cost', when: 'T-5d', costRange: [8, 18], costUnit: 'per guest' },
    { category: 'Bartender', required: false, altToDIY: 'Rarely needed — a batched signature cocktail + self-serve beer/wine covers it; only worth it for 30+ and a more formal vibe', when: 'T-7d', costRange: [150, 250], costUnit: 'flat' },
    { category: 'Florals', required: false, altToDIY: 'Grocery-store flowers ($16-40 total) read just as warm as a florist for a casual home party', when: 'T-2d', costRange: [16, 60], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_entry', trigger: 'No coat/shoe/entry plan — 25 pairs of shoes pile at a new front door', severity: 'med', mitigation: 'Decide shoes-on/off at T-7d; stage a shoe tray + basket, a cleared coat space, and a small sign before anyone arrives.' },
    { id: 'r_ice', trigger: 'No ice / warm drinks', severity: 'med', mitigation: 'Buy ~1-1.5 lb ice/guest the day of; keep a backup bag in the freezer and bottles pre-chilled.' },
    { id: 'r_overlap', trigger: 'Everyone arrives at once instead of spreading across the window', severity: 'med', mitigation: 'Size food/drink to peak overlap (~50-60% of the list) and keep a non-perishable backup (extra crackers, nuts, frozen apps) ready to deploy.' },
    { id: 'r_gifts', trigger: 'Guests bring gifts with nowhere to put them / host stance unclear', severity: 'low', mitigation: 'State the gift stance on the invite; if welcoming gifts, set an obvious landing table near the door.' },
    { id: 'r_spill', trigger: 'Spill on new floors / carpet', severity: 'med', mitigation: 'Stain spray + paper towels staged in advance; act fast, blot don\'t rub; coasters out on wood surfaces.' },
    { id: 'r_runlow', trigger: 'Snacks or drinks run low mid-party', severity: 'low', mitigation: 'Keep a non-perishable reserve and a short nearby-store run as backup; switch to the batched cocktail/punch to stretch alcohol.' },
    { id: 'r_tour', trigger: 'House tour becomes an awkward herd through private rooms', severity: 'low', mitigation: 'Pre-decide the tour path, close doors to off-limits rooms, and tour small clusters as they arrive rather than one big group.' },
  ],

  contingencies: [
    { id: 'c_entry', when: 'r_entry', plan: 'Pull out a spare basket/bin and a towel for wet shoes; turn a chair into a coat rack. A calm "shoes off, anywhere here is fine" at the door fixes it instantly.' },
    { id: 'c_ice', when: 'r_ice', plan: 'Send the nearest guest or partner on a quick ice run; in the meantime, prioritize ice for the drinks tub over cups. Bagged ice from a gas station is always close.' },
    { id: 'c_overlap', when: 'r_overlap', plan: 'Open the non-perishable reserve (extra crackers, nuts, chips), slow refills so the board never looks empty, and bring out the sweet bite to extend the spread.' },
    { id: 'c_gifts', when: 'r_gifts', plan: 'Clear a console or a chair into an instant gift spot and thank each giver out loud so others see where things go. Log who-brought-what later for thank-yous.' },
    { id: 'c_spill', when: 'r_spill', plan: 'Blot with paper towels, hit it with stain spray, lay a cloth over it, and move on without a fuss — your calm keeps the room relaxed. Deep-clean tomorrow.' },
    { id: 'c_runlow', when: 'r_runlow', plan: 'Switch to the batched cocktail or a quick punch to stretch the bar, refill snack bowls from the pantry reserve, and if needed do one fast store run.' },
    { id: 'c_tour', when: 'r_tour', plan: 'Tour the next small cluster instead of the whole room; keep it to the public rooms and the one feature you are proud of, then funnel everyone back to the drinks.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Drinks, soda, water, ice substitutes, paper goods, napkins, cups, decor, candles, cleanup kit, entry kit, non-perishable snacks' },
      { when: 'T-1d', what: 'Cheese, charcuterie, fruit, crudité, dips, baguette, sweet, flowers' },
      { when: 'T0', what: 'Ice + any last-minute fresh garnish or a backup snack bag' },
    ],
    preparation: [
      { when: 'T-1d evening', what: 'Pre-build the grazing board on a tray (cover + fridge), portion dips into bowls, prep any cold passed bites, batch the signature cocktail' },
      { when: 'T0 -3h', what: 'Pull the board to come to room temp ~45 min before; slice baguette; fill snack bowls' },
      { when: 'T0 -1h', what: 'Final wipe of bathrooms + kitchen, take out current trash, set the playlist' },
    ],
    setup: [
      { when: 'T0 -3h', what: 'Pre-clean: empty dishwasher, clear sink, stage trash + recycling station and a used-glass tub' },
      { when: 'T0 -2h', what: 'Set the entry: shoe tray + basket, coat space, welcome/shoes-off sign, and the gift-landing spot near the door' },
      { when: 'T0 -2h', what: 'Build the self-serve drinks station: beer/wine/soda, ice tub, cups/glasses, opener, cocktail pitcher; pre-chill bottles' },
      { when: 'T0 -1h', what: 'Set the board out, scatter snack bowls along the tour path, light unscented candles, decide and clear the house-tour route' },
    ],
    cleanup: [
      { when: 'during', what: 'Quietly clear stray cups into the staged tub, top up the board + ice, blot any spills immediately — do NOT do a full wash mid-party' },
      { when: 'T0 +3:30', what: 'Leftovers covered, glasses to the dishwasher, bottles/cans to recycling, trash out, gift spot tidied' },
      { when: 'T+1 morning', what: 'Finish dishes, wipe surfaces, run a vacuum, return borrowed chairs/platters, send thank-yous for gifts' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Food, drink, and ice quantities are grounded in widely published US hosting rules of thumb (~6-8 appetizer bites per guest per hour for an apps-only party, ~1 alcoholic drink per guest per hour, ~1-1.5 lb of ice per guest, ~1 bottle of wine per 2 guests over a couple of hours), then adjusted down for an open-house format where only a fraction of the guest list is present at any one moment. These are planning heuristics, not measured data for this specific home or crowd, so they are labeled synthesized rather than cited; treat them as defensible starting points and scale to your actual peak overlap, the season, and how your particular guests drink and graze. The housewarming-specific guidance (entry/shoe/coat plan, gift-landing spot, house-tour flow, light home-forward decor, new-floor spill readiness, easy one-host next-morning cleanup) is professional host practice rather than a sourced statistic.',
    sources: [],
  },
};

export default housewarming;
