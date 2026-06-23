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
    { id: 'theme', label: 'Pick a theme / vibe (or "no theme")', options: ['Kids character/theme', 'Milestone (decade) theme', 'Cocktail / grown-up', 'Casual / no theme'], default: 'Casual / no theme', when: 'T-21d', blocks: ['decor', 'cake', 'favors'], why: 'Theme drives decor, cake design, favors, and invite look. Decide first so the rest is coherent.' },
    { id: 'headcount', label: 'Confirm guest count (and kids vs adults)', options: [], default: null, when: 'T-7d', blocks: ['food', 'cake', 'tableware'], why: 'Every food/cake/tableware quantity scales from this. Kids vs adults changes food and drink mix.' },
    { id: 'food_style', label: 'Food style', options: ['Cook/grill yourself', 'Order pizza/trays', 'Drop-off catering', 'Potluck'], default: 'Order pizza/trays', when: 'T-10d', blocks: ['food', 'vendors'], why: 'The biggest effort/cost lever. Trays or drop-off removes the riskiest day-of cooking.' },
    { id: 'alcohol', label: 'Alcohol? (adult parties)', options: ['No alcohol', 'Beer + wine', 'Full bar / signature drink', 'BYOB'], default: 'No alcohol', when: 'T-10d', blocks: ['beverage_purchases'], why: 'Drives beverage spend, glassware, and whether anyone needs a ride home.' },
    { id: 'dietary', label: 'Collect allergies & dietary needs', options: [], default: null, when: 'T-7d', blocks: ['food'], why: 'Board add: the high-severity allergy risk needs a step that actually asks. Collect from the guest list before locking the menu — one unflagged nut/dairy allergy is a safety issue, not a courtesy.' },
    { id: 'cake', label: 'Cake: bake, order, or cupcakes?', options: ['Order a cake', 'Bake it', 'Cupcakes', 'Both cake + treats'], default: 'Order a cake', when: 'T-7d', dependsOn: ['theme', 'headcount'], why: 'Ordered cakes need ~3–5 days lead; size scales with headcount (~1 slice/guest).' },
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
    { id: 'p_mains', item: 'Pizza or grill proteins (party trays)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco', 'Pizzeria', 'Butcher'], unitCostRange: [3, 8], essential: true, buyAt: 'T-1d', alternatives: ['Frozen pizza (Costco) — cheaper than ordering, feeds same crowd', 'Deli sub tray — easy, no cooking, often cheaper per head', 'Rotisserie chickens — quick pickup, budget protein option'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~0.5 lb main/guest for a casual party meal.' } },
    { id: 'p_sides', item: 'Chips, veggie tray & salad', category: 'food', qtyPerGuest: 0.3, unit: 'lb', where: ['Grocery'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', alternatives: ['Bag of chips + store-bought dip — cheapest side option', 'Pre-made pasta salad from deli — if running short on prep time'] },
    { id: 'p_cake', item: 'Cake or cupcakes', category: 'food', qtyFlat: 1, qtyPer: 15, unit: 'cake (serves ~15)', where: ['Bakery', 'Grocery'], unitCostRange: [25, 60], essential: true, buyAt: 'T-1d', note: 'Order 3–5 days ahead; ~1 slice/guest.', alternatives: ['Grocery sheet cake — add custom message, much cheaper', 'Costco half-sheet cake — feeds 30–48, lowest cost per slice'] },
    { id: 'p_softdrinks', item: 'Soft drinks, juice, water', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery', 'Costco'], unitCostRange: [1, 2], essential: true, buyAt: 'T-3d' },
    { id: 'p_alcohol', item: 'Beer / wine (adult parties)', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Liquor store', 'Grocery'], unitCostRange: [3, 6], essential: false, buyAt: 'T-3d', dependsOnDecision: 'alcohol', note: 'Board-corrected up from 2: the host rule is ~2 drinks the first hour + 1/hour after ≈ 3-4 over a 3h adult party; 2 under-buys.' },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest for drinks + coolers.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1.5 lb ice/guest beverage-service heuristic.' } },
    { id: 'p_decor', item: 'Decorations (balloons, banner, theme kit)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Amazon', 'Target'], unitCostRange: [20, 60], essential: false, buyAt: 'T-3d' },
    { id: 'p_candles', item: 'Birthday candles + lighter', category: 'decor', qtyFlat: 1, unit: 'set', where: ['Grocery', 'Party store'], unitCostRange: [2, 6], essential: true, buyAt: 'T-1d', note: 'COMMONLY FORGOTTEN.' },
    { id: 'p_favors', item: 'Party favors / goodie bags', category: 'decor', qtyPerGuest: 1, unit: 'favor', where: ['Party store', 'Amazon'], unitCostRange: [2, 6], essential: false, buyAt: 'T-3d' },
    { id: 'p_tableware', item: 'Plates, cups, napkins, cutlery', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Party store', 'Costco'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-3d' },
    { id: 'p_paper', item: 'Paper goods (tablecloth, foil, leftover containers)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [10, 20], essential: true, buyAt: 'T-3d' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels, wipes', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 12], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: extra trash + a recycling bag.' },
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
    { id: 'r_headcount', trigger: 'Final headcount not locked by T-3d', severity: 'high', mitigation: 'Chase RSVPs; buy fresh after the count locks; round up ~10%, not 30%.' },
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
      { when: 'T0 -3h', what: 'Decor + tables + food station' },
      { when: 'T0 -2h', what: 'Chill drinks; build the drinks station + ice; stage trash/recycling' },
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
