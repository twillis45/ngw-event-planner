// Super Bowl / Sports Watch Party — Event OS host playbook (data only).
//
// An at-home gathering to watch a big game: TV-forward, grazing food that is
// READY BEFORE KICKOFF, drinks in coolers, disposable tableware, couch + screen
// comfort. NO venue — it's the host's living room. The whole job is timing:
// get the food out before kickoff, refresh it at halftime, and keep the trash
// and drinks flowing without anyone missing a play. Quantities are common US
// game-day hosting rules of thumb (see `knowledge`), authored honestly and
// labeled `synthesized` until verified. ESM default export.

const watchParty = {
  type: 'Watch Party',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'An at-home watch party for a big game (Super Bowl / playoff). TV-forward, graze-all-game food, coolers of beer + soda, disposable tableware, couch comfort. The whole challenge is timing — food READY before kickoff, a halftime refresh, and a trash flow that never makes anyone miss a play.',
    typicalGuests: { low: 6, default: 12, high: 25 },
    typicalDurationHours: 4,
    leadTimeDays: 10,
    hostDifficulty: 'easy',
    perGuestCost: { low: 12, high: 35, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The food is ready before kickoff and everyone is actually settled in when it starts.',
    'A big play happens and the whole room erupts at the same second.',
    'Halftime hits and nobody leaves the couch — the food is still going and so is the conversation.',
    'The final play lands and everyone who picked the right team never lets it go.',
  ],

  decisions: [
    { id: 'menu', label: 'Game-day food style', options: ['Wings + chips/dip', 'Chili bar', 'Pizza + finger food', 'Potluck snacks'], default: 'Wings + chips/dip', when: 'T-7d', blocks: ['food'], why: 'Drives the shopping list and the cook timeline. Wings + chips is the classic low-effort default; chili can be made ahead; pizza offloads the cooking entirely.' },
    { id: 'potluck', label: 'Host-provided or potluck?', options: ['Host provides all', 'Potluck snacks', 'Host feeds, guests bring drinks'], default: 'Host feeds, guests bring drinks', when: 'T-7d', blocks: ['food', 'beverage_purchases'], why: 'Biggest cost/effort lever — assigning snacks/drinks roughly halves the host load and the bill.' },
    { id: 'alcohol', label: 'Drinks', options: ['Beer + soda + water', 'BYOB', 'Full cooler bar', 'Dry / family-friendly'], default: 'Beer + soda + water', when: 'T-5d', blocks: ['beverage_purchases'], why: 'Drives cooler + ice volume over a ~3.5h game and whether anyone needs a ride home.' },
    { id: 'screen', label: 'Screen + seating plan', options: ['Living-room TV', 'Add a second screen', 'Projector + screen', 'Bar / out to watch'], default: 'Living-room TV', when: 'T-5d', blocks: ['rental'], why: 'Sightlines and enough seats are what make or break a watch party — confirm the stream/channel works and everyone can see the screen before kickoff.' },
  ],

  milestones: [
    { id: 'wp_setdate', name: 'Lock the date, headcount, menu', offsetDays: 10, owner: 'host', category: 'planning', risk: { ifDelayed: 'Scramble the week of the game', severity: 'low' } },
    { id: 'wp_invite', name: 'Invite + assign snacks/drinks', offsetDays: 7, owner: 'host', dependsOn: ['wp_setdate'], category: 'guest', risk: { ifDelayed: 'Duplicate dips, missing drinks', severity: 'low' } },
    { id: 'wp_rsvp', name: 'Confirm headcount + check the stream/channel', offsetDays: 3, owner: 'host', dependsOn: ['wp_invite'], category: 'guest', risk: { ifDelayed: 'Wrong food quantity; game not on the screen', severity: 'med' } },
    { id: 'wp_shop_nonperish', name: 'Buy drinks, chips, disposables, cleanup supplies', offsetDays: 3, owner: 'host', dependsOn: ['wp_rsvp'], category: 'shopping', risk: null },
    { id: 'wp_shop_fresh', name: 'Buy wings, chili/pizza fixings, dips, fresh items', offsetDays: 1, owner: 'host', dependsOn: ['wp_rsvp'], category: 'shopping', risk: { ifDelayed: 'Sold-out wings the day before the game', severity: 'med' } },
    { id: 'wp_setup', name: 'Cook food, set screen + coolers + seating', offsetDays: 0, owner: 'host', dependsOn: ['wp_shop_nonperish', 'wp_shop_fresh'], category: 'setup', risk: { ifDelayed: 'Food not ready at kickoff', severity: 'high' } },
    { id: 'event', name: 'Kickoff', offsetDays: 0, owner: 'host', dependsOn: ['wp_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'wp_invite', phase: 'guest', label: 'Group text invite; assign snacks/drinks if potluck', when: 'T-7d' },
    { id: 't_stream', milestoneId: 'wp_rsvp', phase: 'guest', label: 'Confirm headcount; verify the game channel/stream works on the TV', when: 'T-3d' },
    { id: 't_nonperish_shop', milestoneId: 'wp_shop_nonperish', phase: 'shopping', label: 'Beer, soda, water, chips, dips, disposables, cleanup kit', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'wp_shop_fresh', phase: 'shopping', label: 'Wings, chili meat/beans or pizza, fresh dips, cheese, produce', when: 'T-1d' },
    { id: 't_prep', milestoneId: 'wp_setup', phase: 'food', label: 'Make chili / prep dips ahead; thaw wings; clear the fridge for drinks', when: 'T-1d evening' },
    { id: 't_cook', milestoneId: 'event', phase: 'food', label: 'Cook wings + hot food so everything is OUT and READY ~30 min before kickoff', when: 'T0 -1:30' },
    { id: 't_halftime', milestoneId: 'event', phase: 'food', label: 'Halftime refresh: restock food, swap empties for fresh trash bag, top up ice', when: 'T0 +2:00' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Pack leftovers, bag trash + recycling (cans/bottles), wipe surfaces, run the dishwasher', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_wings', item: 'Chicken wings', category: 'food', qtyPerGuest: 1, unit: 'lb', where: ['Grocery', 'Costco', 'Butcher'], unitCostRange: [3, 6], essential: true, buyAt: 'T-1d', note: 'Game day runs big — plan ~1 lb (about 8–12 pieces) per guest; wings sell out the day before a big game.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: 'Super Bowl heuristic ~10–12 wings/guest (≈1 lb) for an all-afternoon graze.' }, alternatives: ['Chicken drumsticks — cheaper per lb than wings, same saucy concept', 'Frozen wings (Costco bag) — cheaper, bake at home'] },
    { id: 'p_chips', item: 'Chips + dips (queso, guac, salsa, French onion)', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery', 'Costco'], unitCostRange: [1.5, 3], essential: true, buyAt: 'T-3d', note: 'Chips keep; buy refrigerated dips fresh at T-1d.', alternatives: ['Store-brand chips + salsa — same function at lower cost', 'Popcorn (bulk microwave) — cheapest snack option'] },
    { id: 'p_chili', item: 'Chili (meat, beans, tomatoes, toppings)', category: 'food', qtyPerGuest: 0.5, unit: 'serving', where: ['Grocery'], unitCostRange: [2, 4], essential: false, buyAt: 'T-1d', note: 'Make-ahead crowd-pleaser; ~1 cup per guest, better the next day.', alternatives: ['Canned chili (Amy\'s or Stagg) + toppings bar — no-cook option', 'Bean chili (no meat) — cheaper, still crowd-pleasing'] },
    { id: 'p_pizza_sliders', item: 'Pizza / sliders (handheld mains)', category: 'food', qtyPer: 4, qtyFlat: 1, unit: 'pizza', where: ['Grocery', 'Pizza shop', 'Costco'], unitCostRange: [10, 18], essential: true, buyAt: 'T0', note: 'Roughly 2–3 large pizzas per 10 guests; order delivery for kickoff if not baking.', alternatives: ['Frozen pizza (Costco/DiGiorno) — cheaper than delivery', 'Slider rolls + deli meat — budget handheld option'] },
    { id: 'p_dessert', item: 'Brownies, cookies & snack mix', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery', 'Bakery'], unitCostRange: [1, 3], essential: false, buyAt: 'T-1d', alternatives: ['Store-brand cookies — cheapest dessert option', 'Brownies from box mix — budget bake, tastes homemade'] },
    { id: 'p_drinks', item: 'Beer + soda + water', category: 'beverage', qtyPerGuest: 4, unit: 'drinks', where: ['Grocery', 'Costco', 'Liquor store'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', note: 'A ~3.5h game means grazing/sipping the whole time — plan ~1 drink/guest/hour plus a buffer.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1 drink/guest/hour over a 3–4h game ≈ 3–4 drinks/guest; mix beer/soda/water.' } },
    { id: 'p_ice', item: 'Ice (coolers + drinks)', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest to chill drinks indoors; top up at halftime.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1–2 lb ice/guest standard party rule; lower end for indoor cooling.' } },
    { id: 'p_tableware', item: 'Paper plates, napkins, cups, cutlery', category: 'logistics', qtyPerGuest: 2, unit: 'set', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.3, 0.8], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: people grab a fresh plate/cup every visit to the food table — buy ~2 sets/guest, plus small plates for dips.' },
    { id: 'p_serveware', item: 'Serving setup (warming trays, slow cooker, toothpicks, foil)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Party store'], unitCostRange: [10, 30], essential: false, buyAt: 'T-3d', note: 'A slow cooker keeps chili/dip hot all game so the host can sit down.' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 15], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: trash fills fast on game day — extra bags + a separate recycling bag for cans/bottles, swapped at halftime.' },
  ],

  rentalsGap: [
    { item: 'Coolers (drinks + ice)', qtyPerGuest: 0.1, note: 'roughly one cooler per ~10 guests so the fridge stays free for food' },
    { item: 'Folding / extra chairs', qtyPerGuest: 0.5, note: 'couches fill fast — borrow extra seating so everyone can see the screen' },
    { item: 'Second screen / projector', qtyFlat: 1, note: 'optional — a second TV or projector for a big crowd or split rooms' },
    { item: 'Folding table', qtyFlat: 1, note: 'a dedicated food + drinks station off the coffee table' },
  ],

  vendors: [
    { category: 'Pizza / wing delivery', required: false, altToDIY: 'Bake wings + pizza at home', when: 'T-1d (pre-order)', costRange: [8, 15], costUnit: 'per guest' },
    { category: 'Party platter / catering', required: false, altToDIY: 'Host makes the spread', when: 'T-3d', costRange: [10, 20], costUnit: 'per guest' },
    { category: 'Chair / table rental', required: false, altToDIY: 'Borrow folding chairs from friends', when: 'T-7d', costRange: [30, 100], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_kickoff', trigger: 'Food not ready when the game starts', severity: 'high', mitigation: 'Back-time the cook so everything is OUT ~30 min before kickoff; use the slow cooker for hot dishes; pre-order pizza for delivery at kickoff.' },
    { id: 'r_stream', trigger: 'Game not on / stream or channel fails', severity: 'high', mitigation: 'Test the exact channel/stream at T-3d; know the backup (antenna, alternate app, or a nearby bar) before guests arrive.' },
    { id: 'r_drinks', trigger: 'Run out of drinks or ice mid-game', severity: 'med', mitigation: 'Buy a buffer (~4 drinks + ~1.5 lb ice/guest); top up ice at halftime; ask a guest to do a beer run.' },
    { id: 'r_seating', trigger: 'Not enough seats / bad sightlines', severity: 'med', mitigation: 'Borrow extra chairs; arrange seating toward the screen before anyone arrives.' },
    { id: 'r_trash', trigger: 'Trash/recycling overflows, surfaces get sticky', severity: 'low', mitigation: 'Put out a clearly-marked recycling bag for cans; swap trash bags at halftime; keep paper towels at the food table.' },
  ],

  contingencies: [
    { id: 'c_kickoff', when: 'r_kickoff', plan: 'If the cook is running late, put out chips/dips immediately and let hot food trickle out; pizza delivery covers the gap.' },
    { id: 'c_stream', when: 'r_stream', plan: 'Switch to the backup app/antenna; if all else fails, the group decamps to a nearby sports bar.' },
    { id: 'c_drinks', when: 'r_drinks', plan: 'Send a guest on a quick beer/ice run; stretch the bar with soda + water until they\'re back.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Beer, soda, water, chips, shelf dips, disposables, cleanup kit' },
      { when: 'T-1d', what: 'Wings, chili fixings, fresh dips, cheese, produce, dessert' },
      { when: 'T0', what: 'Ice (and pizza delivery / fresh pickup)' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Make chili + dips ahead; thaw wings; clear fridge space for drinks' },
      { when: 'T0 -1:30', what: 'Cook wings + hot food, back-timed to be ready before kickoff' },
    ],
    setup: [
      { when: 'T0 -1h', what: 'Coolers + ice, food + drinks table, extra seating toward the screen' },
      { when: 'T0 -0:30', what: 'Food OUT and ready; slow cooker on; trash + recycling bins set; stream/channel confirmed' },
    ],
    cleanup: [
      { when: 'halftime', what: 'Restock food, swap trash bag, bag cans for recycling, top up ice' },
      { when: 'T0 +4h', what: 'Pack leftovers, bag trash/recycling, wipe surfaces, run the dishwasher' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Quantities reflect common US game-day hosting rules of thumb: Super Bowl portions run large (~1 lb / about 10–12 wings per guest grazing all afternoon), ~1 drink per guest per hour over a ~3.5h game (≈3–4 drinks/guest, split across beer/soda/water), ~1.5 lb ice per guest for indoor drink-chilling (the lower end of the 1–2 lb party rule), roughly 2–3 large pizzas per 10 guests, and ~2 disposable plate/cup sets per guest since people refresh every trip to the food table. The defining constraint of a watch party is timing — food ready ~30 min before kickoff and a halftime refresh — not headcount. Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default watchParty;
