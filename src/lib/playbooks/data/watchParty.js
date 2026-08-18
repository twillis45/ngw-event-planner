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
    { id: 'menu', label: 'Game-day food style', options: ['Wings + chips/dip', 'Chili bar', 'Pizza + finger food', 'Potluck snacks'], default: 'Wings + chips/dip', when: 'T-7d', dependsOn: ['potluck'], blocks: ['food'], costViaApproach: true, weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'The food style drives the shopping list and the cook timeline, but wings-and-chips is a safe default and swappable until you shop.', tier: 'reasoned' }, why: 'Drives the shopping list and the cook timeline. Wings + chips is the classic low-effort default; chili can be made ahead; pizza offloads the cooking entirely.' },
    { id: 'potluck', label: 'Host-provided or potluck?', options: ['Host provides all', 'Potluck snacks', 'Host feeds, guests bring drinks'], default: 'Host feeds, guests bring drinks', when: 'T-7d', blocks: ['food', 'beverage_purchases'], costViaApproach: true, weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Host-provides vs potluck is the biggest cost-and-effort lever, but it only reassigns who brings what and defaults to host-feeds-guests-bring-drinks.', tier: 'reasoned' }, why: 'Biggest cost/effort lever — assigning snacks/drinks roughly halves the host load and the bill.' },
    { id: 'alcohol', label: 'Drinks', options: ['Beer + soda + water', 'BYOB', 'Full cooler bar', 'Dry / family-friendly'], default: 'Beer + soda + water', when: 'T-5d', blocks: ['beverage_purchases'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'The drink plan sets cooler and ice volume and whether anyone needs a ride home — a host read on the crowd, though cheap to adjust.', tier: 'reasoned' }, why: 'Drives cooler + ice volume over a ~3.5h game and whether anyone needs a ride home.' },
    { id: 'screen', label: 'Screen + seating plan', options: ['Living-room TV', 'Add a second screen', 'Projector + screen', 'Bar / out to watch'], default: 'Living-room TV', when: 'T-5d', blocks: ['rental'], weight: 'high', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'If the game is not on a screen everyone can see, there is no watch party — the one make-or-break call, though the TV setup is easy to arrange.', tier: 'reasoned' }, why: 'Sightlines and enough seats are what make or break a watch party — confirm the stream/channel works and everyone can see the screen before kickoff.' },
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
    { id: 'p_wings', item: 'Chicken wings', category: 'food', qtyPerGuest: 1, unit: 'lb', where: ['Grocery', 'Costco', 'Butcher'], unitCostRange: [3, 6], essential: true, buyAt: 'T-1d', note: 'Game day runs big — plan ~1 lb (about 8–12 pieces) per guest; wings sell out the day before a big game.', provenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['webstaurant-protein-2026'], note: 'Grounded to webstaurant-protein-2026: ~1 lb bone-in wings/guest is within the source-stated protein portions (BBQ ~1 lb; bone-in runs higher).', claim: 'A Super Bowl watch party requires ~10–12 wings per guest (≈1 lb) for an all-afternoon graze', sufficientWhen: '≥2 Super Bowl party guides or game-day catering references confirm the ~10–12 wings/guest (~1 lb) planning rule' }, alternatives: ['Chicken drumsticks — cheaper per lb than wings, same saucy concept', 'Frozen wings (Costco bag) — cheaper, bake at home'], costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['wings-extension-2026', 'wings-retail-2026', 'chicken-retail-2026'], lastVerified: '2026-08-18', claim: 'Chicken wings 2026, from a land-grant extension market report and a retail guide. Southeast retail average for conventional fresh party wings $2.49/lb, IQF frozen $2.67/lb; the broader retail range is $2.50-5.00/lb, with frozen $2.50-3.50 and fresh or organic $4.50 and above. Wholesale is $1.10/lb, which is why a party-sized bulk buy sits near the band\'s floor while a fresh tray at a supermarket sits at its ceiling.', sufficientWhen: 'One fresh party-wing shelf price and one frozen bulk-bag unit price at the same store confirm the band.' }, },
    { id: 'p_chips', item: 'Chips + dips (queso, guac, salsa, French onion)', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery', 'Costco'], unitCostRange: [1.5, 3], essential: true, buyAt: 'T-3d', note: 'Chips keep; buy refrigerated dips fresh the day before.', alternatives: ['Store-brand chips + salsa — same function at lower cost', 'Popcorn (bulk microwave) — cheapest snack option'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['snacks-format-2026', 'dips-retail-2026', 'cheese-sliced-2026'], lastVerified: '2026-08-18', claim: 'Chips and dips per serving. Chips from a party bag are $0.38-0.40 an ounce ($6.14-6.39 a pound, close to the BLS all-chips average). The DIPS are the larger share: queso 8oz $0.97, hummus 16oz $3.97-6.67, guacamole 15oz $5.27 and 14oz $6.58, prepared dips 16oz about $4.97. A generous serving with two or three dips out lands in this band; a chips-only table would sit below it.', sufficientWhen: 'A party chip bag and two dip tubs, divided by the servings actually poured, confirm the band.' }, },
    { id: 'p_chili', item: 'Chili (meat, beans, tomatoes, toppings)', category: 'food', qtyPerGuest: 0.5, unit: 'serving', where: ['Grocery'], unitCostRange: [2, 4], essential: false, buyAt: 'T-1d', note: 'Make-ahead crowd-pleaser; ~1 cup per guest, better the next day.', alternatives: ['Canned chili (Amy\'s or Stagg) + toppings bar — no-cook option', 'Bean chili (no meat) — cheaper, still crowd-pleasing'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['costco-groundbeef-2026', 'bls-staples-2026', 'bls-saladveg-2026'], lastVerified: '2026-08-18', claim: 'A pot dish priced per serving. Ground beef is $3.29/lb in Costco bulk against $5.86-7.66/lb at grocery; dried beans $1.704/lb per BLS; tomatoes $2.154/lb. A pot stretching beef with beans and tomatoes lands at this band\'s floor, a meat-forward one at its ceiling.', sufficientWhen: 'Per-pound beef, beans and tomato prices at the pot\'s actual ratio confirm the band.' }, },
    { id: 'p_pizza_sliders', item: 'Pizza / sliders (handheld mains)', category: 'food', qtyPer: 4, qtyFlat: 1, unit: 'pizza', where: ['Grocery', 'Pizza shop', 'Costco'], unitCostRange: [10, 18], essential: true, buyAt: 'T0', note: 'Roughly 2–3 large pizzas per 10 guests; order delivery for kickoff if not baking.', alternatives: ['Frozen pizza (Costco/DiGiorno) — cheaper than delivery', 'Slider rolls + deli meat — budget handheld option'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['pizza-chain-primary-2026', 'frozen-pizza-2026', 'buns-walmart-2026'], lastVerified: '2026-08-18', claim: 'Handheld mains per pizza, from PRIMARY chain sources. Dominos publishes a Mix and Match at $6.99 each for two or more items including a two-topping pizza; Papa Johns publishes a create-your-own large at $9.99; Papa Murphys take-and-bake large is $10.99 ($9.99 on its pepperoni promotion). Frozen: a 24.7oz rising crust is $7.29. THESE ARE ADVERTISED DEAL PRICES, NOT MENU PRICES - every chain disclaims that franchise prices vary, and none publishes an a-la-carte national figure, so this band\'s ceiling covers a non-promotional or specialty pie.', sufficientWhen: 'A local store\'s own online price for a large pizza, against the published national deal, confirms how far a given market sits above the band\'s floor.' }, },
    { id: 'p_dessert', item: 'Brownies, cookies & snack mix', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery', 'Bakery'], unitCostRange: [1, 3], essential: false, buyAt: 'T-1d', alternatives: ['Store-brand cookies — cheapest dessert option', 'Brownies from box mix — budget bake, tastes homemade'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['warehouse-trays-2026', 'snacks-format-2026', 'bakery-cake-retail-2026'], lastVerified: '2026-08-18', claim: 'Sweets and snack mix per serving. Warehouse cookies are $9.99 for 24 ($0.42 each) rising to $12.43 on a delivery marketplace; bakery brownies price with the grocery-bakery tier. SNACK MIX is $0.29-0.31 an ounce in party size and $0.37-0.43 single-serve. A cookie plus a scoop of mix lands in this band.', sufficientWhen: 'A cookie box divided per piece and a party mix bag divided per serving confirm the band.' }, },
    { id: 'p_drinks', item: 'Beer + soda + water', category: 'beverage', qtyPerGuest: 4, unit: 'drinks', where: ['Grocery', 'Costco', 'Liquor store'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', note: 'A ~3.5h game means grazing/sipping the whole time — plan ~1 drink/guest/hour plus a buffer.', provenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['bar-provision-2026'], note: 'Grounded to bar-provision-2026: ~1 drink/guest/hour (~3–4 over a 3–4h window) is the source-stated party drink rate.', claim: 'A 3–4 hour game yields ~3–4 total drinks/guest at ~1 drink/guest/hour, split across beer, soda, and water', sufficientWhen: 'Standard US bartending or event-planning guide confirms the ~1 drink/guest/hour rule applied to a 3–4h watch-party window' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['beer-retail-2026', 'beer-budget-2026', 'soda-12pack-2026', 'bottledwater-case-2026'], lastVerified: '2026-08-16', claim: 'This band is a SUM of separately-priced drink families, not a single quoted item: domestic lager $0.80-1.20 per 12oz (about $20-22 a 24-pack), craft $1.50-3.00; soda $0.25-0.60 a can ($3.00-6.50 a 12-pack); bottled water about $0.17-0.38 a bottle ($4-9 a 24-pack). Each component is cited to its own registered source; the summed band is therefore low-confidence by construction.', sufficientWhen: 'Current shelf prices for one pack of each named component at the same store, summed to the per-serving band, confirm the range.' } },
    { id: 'p_ice', item: 'Ice (coolers + drinks)', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest to chill drinks indoors; top up at halftime.', provenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['bar-provision-2026'], note: 'Grounded to bar-provision-2026: ~1.5 lb ice/guest is within the source-stated ice provisioning rate.', claim: 'Indoor watch-party drink chilling requires ~1.5 lb ice/guest, on the lower end of the ~1–2 lb standard party range', sufficientWhen: 'Standard US event-planning or catering guide confirms the ~1–2 lb/guest ice range and that indoor events land at the lower end' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['ice-retail-2026', 'ice-warehouse-2026'], lastVerified: '2026-08-16', claim: 'Bagged ice 2026: warehouse clubs run 10-12c per pound (a 20lb bag is $1.75-2.50 at Sams Club, $1.80-2.50 at Costco); grocery and gas-station bags cluster 23-31c/lb (BJs and 7-Eleven 20lb about $4.49-4.79, Giant 20lb $4.99, Publix 16lb $4.99); small bags and hardware stores reach 41-45c/lb. Convenience ice is more than four times warehouse ice per pound.', sufficientWhen: 'Current shelf prices for one 20lb bag at a warehouse club and one at a grocery store confirm the per-pound spread.' } },
    { id: 'p_tableware', item: 'Paper plates, napkins, cups, cutlery', category: 'logistics', qtyPerGuest: 2, unit: 'set', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.25, 2.5], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: people grab a fresh plate/cup every visit to the food table — buy ~2 sets/guest, plus small plates for dips.' , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['disposables-bulk-2026', 'disposables-partyqty-2026'], lastVerified: '2026-08-15', claim: 'A per-guest place setting runs $0.25-2.50 depending entirely on channel: bulk restaurant supply puts plates at $0.08-0.15 each and foam at $0.09, a grocery shelf puts the same basic paper plate at $0.25-0.40, and premium plastic or compostable runs $0.15-0.35 per plate. A setting is 2-3 plates, 2-3 cups, cutlery and 2-3 napkins.', sufficientWhen: 'Re-checked against per-plate pricing and place-setting norms. A deep bulk buy lands near the floor and premium or compostable near the ceiling - the 12x spread is the CHANNEL, not uncertainty. Add 10-15% for spills and unexpected guests. Sets that bundle flutes, koozies, linens or table covers are a different product and are priced separately.' } },
    { id: 'p_serveware', item: 'Serving setup (warming trays, slow cooker, toothpicks, foil)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Party store'], unitCostRange: [10, 30], essential: false, buyAt: 'T-3d', note: 'A slow cooker keeps chili/dip hot all game so the host can sit down.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [7, 18], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: trash fills fast on game day — extra bags + a separate recycling bag for cans/bottles, swapped at halftime.' , costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['costco-cleaning-2026', 'trashbags-retail-2026'], lastVerified: '2026-08-15', claim: 'A cleanup kit runs $7-18 as the SUM of its parts: about a dozen trash and recycling bags at 10 cents each from a warehouse or 11-15 cents at grocery, two rolls of paper towels at about $1.97 warehouse, and a canister of wipes at about $4.27 or a dish-soap pack at $14.74 shared across events.', sufficientWhen: 'CONFIDENCE IS LOW ON PURPOSE: no source prices a cleanup kit, because nobody sells one. This band is a sum of individually-priced components, so treat it as an envelope rather than a quote. The spread is the CHANNEL - warehouse packs against a grocery shelf - and a host who already owns soap and towels lands well under the floor. Kits that also carry gloves, foil or to-go containers are a different bundle.' } },
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
    { id: 'r_stream', trigger: 'Game not on / stream or channel fails', severity: 'high', mitigation: 'Test the exact channel/stream at 3 days out; know the backup (antenna, alternate app, or a nearby bar) before guests arrive.' },
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
      { when: 'T0 -4h', what: 'Confirm the stream or channel works — actually load it, don’t assume' },
      { when: 'T0 -3h', what: 'Drinks on ice; seating arranged so everyone can see the screen' },
      { when: 'T0 -1h', what: 'Coolers + ice, food + drinks table, extra seating toward the screen' },
      { when: 'T0 -0:30', what: 'Food OUT and ready; slow cooker on; trash + recycling bins set; stream/channel confirmed' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Doors: TV on the pre-game, drinks on ice, seats claimed' },
      { when: 'T0 +45m', what: 'Kickoff — food already out so nobody’s in the kitchen' },
      { when: 'T0 +1:45', what: 'Halftime: hot food refresh, refill drinks, bathroom rotation' },
      { when: 'T0 +2:15', what: 'Second half' },
      { when: 'T0 +3:30', what: 'The finish — let the room have it' },
      { when: 'T0 +4:05', what: 'Wind down: to-go plates, rides checked for anyone who’s been drinking' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep hot food refreshed at the breaks and cold drinks on ice; watch anyone who’s drinking through a long game' },
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
