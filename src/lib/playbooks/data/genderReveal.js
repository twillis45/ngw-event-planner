// Gender Reveal — Event OS host playbook (data only).
//
// A small-to-medium host-run celebration whose single hero moment is THE REVEAL —
// a cake cut, a balloon-box opening, a confetti pop, or a SAFE powder cannon. Snacks
// + drinks (mocktails for the parent-to-be), pink/blue decor, a guessing-board game,
// and a photo/video moment. The defining mechanic is that ONE outside party (the
// baker or balloon shop) holds the sealed sex result so the parents can be surprised
// alongside their guests.
//
// SAFETY STANCE: gender-reveal "stunts" have caused major wildfires and injuries
// (e.g. the 2017 Sawmill and 2020 El Dorado fires were both started by reveal
// devices). This playbook deliberately biases toward food-, balloon-, confetti-, and
// rated-powder-cannon reveals and treats fireworks, Tannerite/binary-explosive
// targets, homemade pyro, and hot/burning smoke devices as out-of-bounds, especially
// anywhere near dry brush.
//
// Quantities are common US host/party rules of thumb (see `knowledge`), authored
// honestly as established-consensus / trade-heuristic and labeled `synthesized`
// (no fabricated citations). ESM default export.

const genderReveal = {
  type: 'Gender Reveal',
  solveFamily: 'home_gathering',
  family: 'host_driven',
  recordKind: 'client',
  version: '1.0.0',
  meta: {
    summary:
      'A host-run gender reveal built around ONE hero moment — the reveal. An outside party (baker or balloon shop) holds the sealed sex result so the parents are surprised too. The playbook front-loads the secret-keeping handoff and a SAFE reveal method, then layers snacks + mocktails, pink/blue decor, a guessing-board game, and a planned photo/video capture.',
    typicalGuests: { low: 15, default: 22, high: 30 },
    typicalDurationHours: 2.5,
    leadTimeDays: 21,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 12, high: 40, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The reveal lands and the parents\' faces say everything before the room does.',
    'Everyone holds their breath for the same half-second right before.',
    'The grandparents\' reaction — caught on camera — is the real moment.',
    'Pink or blue fills the air and the whole room goes at the same time.',
  ],

  decisions: [
    { id: 'food_style', label: 'How is the food handled?', options: ['Host makes finger food', 'Catering / platters', 'Potluck', 'Order trays'], default: 'Host makes finger food', when: 'T-14d', blocks: ['food', 'vendors'], costFactors: { 'Catering / platters': 1.3, 'Potluck': 0.55, 'Order trays': 1.1 }, costFactorProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['catering-perperson-2026'], note: 'Grounded against 2026 US catering per-person data (full-service $75-150 vs drop-off $15-35 vs buffet-with-servers $45-85; the difference between drop-off and staffed is labor, not food). The service-level hierarchy follows directly; the per-menu percentages calibrate that structure.', claim: 'Catering or platters cost ~30% more than host-made finger food; potluck cuts cost by ~45%; ordered trays cost ~10% more', sufficientWhen: '≥2 caterer or platter quotes vs. host-made grocery cost confirm the relative cost factors for a gender reveal snack spread' }, affects: ['p_snacks'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'The reveal is the point, not the food — a casual snack spread the app can default and the host can swap freely.', tier: 'reasoned' }, why: 'Reveals are short and casual — finger food the host can make, or platters ordered in.' },
    {
      id: 'reveal_method',
      label: 'Reveal method (the hero moment)',
      options: [
        'Cake / cupcakes (cut to colored inside)',
        'Balloon box (release pink/blue balloons)',
        'Confetti / biodegradable popper',
        'Powder cannon (rated, non-pyro)',
      ],
      default: 'Cake / cupcakes (cut to colored inside)',
      when: 'T-21d',
      blocks: ['reveal_purchases', 'reveal_handoff', 'venue'],
      deliversHeartMoment: true,
      weight: 'high',
      reversibility: 'costly',
      emotionalWeight: 'high',
      difmCapable: 'needs-host',
      priorityBasis: { rationale: 'This is the one moment the whole party exists for — protect the reveal above every logistic.', tier: 'reasoned' },
      why: 'The whole party is built around this one moment. SAFE methods only — no fireworks, no Tannerite/explosive targets, no homemade pyro, no hot/burning smoke devices (these have caused wildfires and injuries).',
    },
    {
      id: 'secret_keeper',
      label: 'Who holds the sealed sex result',
      options: ['Baker', 'Balloon / party shop', 'Trusted friend (not attending the surprise)'],
      default: 'Baker',
      when: 'T-18d',
      blocks: ['reveal_handoff'],
      weight: 'high',
      reversibility: 'costly',
      emotionalWeight: 'high',
      difmCapable: 'needs-host',
      priorityBasis: { rationale: 'If the secret leaks the parents are no longer surprised — the handoff that keeps the reveal real, and only the family can choose who to trust.', tier: 'reasoned' },
      why: 'For the parents to be surprised too, the ultrasound tech\'s sealed envelope must go to an outside party who prepares the reveal — never opened by the hosts.',
    },
    {
      id: 'venue',
      label: 'Indoor or outdoor',
      options: ['Backyard / outdoor', 'Indoor (home or rented room)', 'Park / open space'],
      default: 'Backyard / outdoor',
      when: 'T-18d',
      blocks: ['rentals', 'reveal_purchases'],
      weight: 'med',
      reversibility: 'costly',
      emotionalWeight: 'low',
      difmCapable: 'needs-host',
      priorityBasis: { rationale: 'Where you reveal sets the safety and cleanup for confetti or powder, and the host knows their own space and fire conditions.', tier: 'reasoned' },
      why: 'Confetti and powder reveals are cleaner and safer outdoors with ventilation and distance; check fire conditions if the ground/brush is dry.',
    },
    {
      id: 'guestlist',
      label: 'Finalize guest list with the parents',
      options: [],
      default: null,
      when: 'T-14d',
      blocks: ['food', 'beverage_purchases', 'favors'],
      weight: 'high',
      reversibility: 'costly',
      emotionalWeight: 'med',
      difmCapable: 'needs-host',
      priorityBasis: { rationale: 'Every food and drink quantity scales off the count, and the guest list belongs to the parents-to-be.', tier: 'reasoned' },
      why: 'Every food/drink quantity scales from this; confirm with the parents-to-be first.',
    },
    {
      id: 'game',
      label: 'Guessing game / activity',
      options: ['Team Pink vs Team Blue guessing board', 'Guess-the-date + sex cards', 'Low-key mingling only'],
      default: 'Team Pink vs Team Blue guessing board',
      when: 'T-14d',
      blocks: ['game_supplies'],
      weight: 'low',
      reversibility: 'reversible',
      emotionalWeight: 'low',
      difmCapable: 'can-derive',
      priorityBasis: { rationale: 'The guessing game is a light warm-up before the reveal — cheap, swappable, and the lowest-stakes call.', tier: 'reasoned' },
      why: 'Drives the board/sticker/marker purchase and gives guests something to do before the reveal.',
    },
    {
      id: 'beverage',
      label: 'Drinks (mocktails for the parent-to-be)',
      options: ['Mocktails + soft drinks only', 'Mocktails + soft drinks + beer/wine', 'Pink/blue punch bar'],
      default: 'Mocktails + soft drinks + beer/wine',
      when: 'T-7d',
      blocks: ['beverage_purchases'],
      weight: 'low',
      reversibility: 'reversible',
      emotionalWeight: 'low',
      difmCapable: 'can-derive',
      priorityBasis: { rationale: 'A great zero-proof pour matters for the pregnant guest of honor, but drinks are cheap and easy to adjust at the store.', tier: 'reasoned' },
      why: 'The pregnant guest of honor needs a genuinely good zero-proof option; make the mocktail the centerpiece drink, not an afterthought.',
    },
  ],

  milestones: [
    { id: 'gr_setdate', name: 'Set date, guest list, budget, reveal method with the parents', offsetDays: 21, owner: 'host', category: 'planning', risk: null },
    { id: 'gr_handoff', name: 'Hand the sealed sex result to the baker / balloon shop', offsetDays: 18, owner: 'host', dependsOn: ['gr_setdate'], category: 'reveal', risk: { ifDelayed: 'No time to prep the reveal; secret may leak to the parents', severity: 'high' } },
    { id: 'gr_invite', name: 'Send invites + RSVP / dietary ask (note pink-or-blue dress code)', offsetDays: 14, owner: 'host', dependsOn: ['gr_setdate'], category: 'guest', risk: { ifDelayed: 'Low RSVP visibility → wrong quantities', severity: 'med' } },
    { id: 'gr_capture', name: 'Confirm photo/video for the reveal moment + plan the shot', offsetDays: 10, owner: 'host', dependsOn: ['gr_handoff'], category: 'reveal', risk: { ifDelayed: 'The one un-repeatable moment goes uncaptured', severity: 'high' } },
    { id: 'gr_rsvp_close', name: 'Lock final headcount', offsetDays: 4, owner: 'host', dependsOn: ['gr_invite'], category: 'guest', risk: { ifDelayed: 'Over/under-buy food + favors', severity: 'high' } },
    { id: 'gr_reveal_pickup_plan', name: 'Confirm reveal-item pickup window + safety of the chosen method', offsetDays: 3, owner: 'host', dependsOn: ['gr_handoff'], category: 'reveal', risk: { ifDelayed: 'Wrong-color or no reveal item; unsafe method un-checked', severity: 'high' } },
    { id: 'gr_shop_nonperish', name: 'Buy decor, favors, game board, mocktail mixers, paper goods', offsetDays: 3, owner: 'host', dependsOn: ['gr_rsvp_close'], category: 'shopping', risk: null },
    { id: 'gr_shop_fresh', name: 'Buy fresh snacks, pick up the cake/reveal item', offsetDays: 1, owner: 'host', dependsOn: ['gr_rsvp_close', 'gr_reveal_pickup_plan'], category: 'shopping', risk: { ifDelayed: 'Wilted food / unrefrigerated cake / no reveal item', severity: 'med' } },
    { id: 'gr_setup', name: 'Decorate (pink/blue), set snacks + drinks, stage the reveal spot', offsetDays: 0, owner: 'host', dependsOn: ['gr_shop_nonperish', 'gr_shop_fresh'], category: 'setup', risk: null },
    { id: 'event', name: 'The reveal', offsetDays: 0, owner: 'host', dependsOn: ['gr_setup', 'gr_capture'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_handoff', milestoneId: 'gr_handoff', phase: 'reveal', label: 'Give baker/shop the sealed envelope; confirm neutral exterior so parents are surprised', when: 'T-18d' },
    { id: 't_invite', milestoneId: 'gr_invite', phase: 'guest', label: 'Send invites with RSVP-by, dietary ask, and "wear pink or blue" note', when: 'T-14d' },
    { id: 't_capture', milestoneId: 'gr_capture', phase: 'reveal', label: 'Assign a photographer/videographer; frame the parents + reveal in one shot; charge devices', when: 'T-10d' },
    { id: 't_rsvp', milestoneId: 'gr_rsvp_close', phase: 'guest', label: 'Chase non-responders; lock the count', when: 'T-4d' },
    { id: 't_reveal_safety', milestoneId: 'gr_reveal_pickup_plan', phase: 'reveal', label: 'Re-confirm SAFE method (no pyro/explosives/hot smoke); check fire conditions if outdoor + dry', when: 'T-3d' },
    { id: 't_nonperish_shop', milestoneId: 'gr_shop_nonperish', phase: 'shopping', label: 'Decor, favors, guessing board, mocktail mixers, game + paper goods', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'gr_shop_fresh', phase: 'shopping', label: 'Fresh snacks; pick up cake/reveal item; keep cake refrigerated', when: 'T-1d' },
    { id: 't_prep', milestoneId: 'gr_setup', phase: 'food', label: 'Prep make-ahead bites; batch the mocktail; assemble favors', when: 'T-1d evening' },
    { id: 't_decorate', milestoneId: 'gr_setup', phase: 'setup', label: 'Pink/blue decor, snack + drink station, set up the guessing board, stage the reveal spot', when: 'T0 -2h' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Collect confetti/powder debris, pack leftovers + cake, save photos, bag trash + recycling', when: 'T0 +2:30' },
  ],

  purchases: [
    { id: 'p_reveal_cake', item: 'Reveal cake / cupcakes (neutral outside, colored inside)', category: 'food', qtyFlat: 1, qtyPer: 15, unit: 'cake (serves ~15)', where: ['Bakery', 'Grocery'], unitCostRange: [35, 75], essential: true, buyAt: 'T-1d', note: 'The baker holds the sealed result and colors the inside; pick up neutral so parents stay surprised. ~1 serving/guest.', alternatives: ['Grocery bakery cupcakes — cheaper, easier to serve', 'Confetti cupcakes colored inside — budget DIY if baker is unavailable'], provenance: { tier: 'trade-heuristic', confidence: 'high', verificationStatus: 'established-consensus', note: 'Cake/cupcake reveal is the most common SAFE method.', claim: 'A cake or cupcakes cut to reveal a colored inside is the most common safe gender reveal method', sufficientWhen: 'verified — established-consensus; the baker-as-secret-keeper + colored-inside cake is the widely recognized standard safe reveal method' } },
    { id: 'p_reveal_balloon', item: 'Reveal item — balloon box OR confetti poppers OR rated powder cannon', category: 'decor', qtyFlat: 2, unit: 'reveal item(s)', where: ['Party store', 'Balloon shop', 'Amazon'], unitCostRange: [15, 60], essential: true, buyAt: 'T-3d', note: 'SAFE methods only: opaque balloon box, biodegradable confetti popper, or a rated non-pyro powder cannon. NEVER fireworks, Tannerite/explosive targets, or hot/burning smoke. Buy 2 in case one fails.', provenance: { tier: 'trade-heuristic', confidence: 'high', verificationStatus: 'established-consensus', note: 'Balloon/confetti/rated-cannon reveals are the standard safe alternatives.', claim: 'Opaque balloon boxes, biodegradable confetti poppers, and rated non-pyro powder cannons are the recognized safe gender reveal alternatives to pyro or explosive devices', sufficientWhen: 'verified — established-consensus; cited by fire-safety authorities and event planning guides as safe alternatives to the devices responsible for wildfires and injuries' } },
    { id: 'p_snacks', item: 'Fruit & veggie cups with dips (mini sandwiches, charcuterie)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco', 'Caterer'], unitCostRange: [3, 8], essential: true, buyAt: 'T-1d', note: 'Snack-forward party, not a meal — ~6-8 bites/guest/hr.', alternatives: ['Costco party platters — cheaper per lb, minimal prep', 'Fruit + veggie tray + dip from deli — budget grazing option'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~5-8 appetizer bites/guest/hr when apps are the main food.', claim: '~5–8 appetizer bites per guest per hour is sufficient when snacks are the primary food at a gender reveal', sufficientWhen: 'verified — established-consensus for a snack-forward short party (~2.5h); consistent with US catering heuristics for apps-only events' } },
    { id: 'p_pinkblue_treats', item: 'Pink + blue themed sweets (cookies, candy, donuts)', category: 'food', qtyPerGuest: 2, unit: 'pieces', where: ['Grocery', 'Bakery', 'Party store'], unitCostRange: [0.5, 1.5], essential: false, buyAt: 'T-1d', note: 'Deliberately serve BOTH colors so the spread does not hint at the answer.', alternatives: ['Pink + blue M&Ms — cheapest themed candy option', 'Pink + blue cotton candy bags — festive, inexpensive per serving'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_mocktail', item: 'Mocktail / pink-or-blue punch mixers (for the parent-to-be)', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery'], unitCostRange: [0.75, 3], essential: true, buyAt: 'T-3d', note: 'Make the zero-proof option genuinely great — the pregnant guest of honor is the centerpiece.' , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['zeroproof-retail-2026', 'nabeer-retail-2026'], lastVerified: '2026-08-15', claim: 'A zero-proof drink runs $0.75-3.00 poured at home: a simple juice-and-soda mocktail sits at the floor, NA beer is $2.17-2.50 a can (Athletic $13 a six-pack, Budweiser AF $29.99 a twelve), and a drink built on an NA spirit costs about $1.60-2.20 in spirit alone since a $25-35 bottle pours roughly sixteen.', sufficientWhen: 'Re-checked against NA spirit, NA beer and canned-mocktail retail. BAR PRICING IS EXCLUDED AND MUST STAY EXCLUDED - zero-proof drinks run $13-17 at bars, which is hospitality pricing for a served drink and would inflate this band roughly tenfold. Premium canned mocktails at about $8 a serving also sit above it.' } },
    { id: 'p_softdrinks', item: 'Soft drinks / sparkling water', category: 'beverage', qtyPerGuest: 2, unit: 'cans', where: ['Grocery', 'Costco'], unitCostRange: [0.15, 1], essential: true, buyAt: 'T-3d' , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['soda-12pack-2026', 'bottledwater-case-2026'], lastVerified: '2026-08-15', claim: 'A canned soda or bottled water runs $0.15-1.00 a serving: soda is $0.25-0.60 a can (average $0.38, store brand lower, craft $0.50-1.17), and basic bottled water is $0.13-0.25 a bottle in a 24-to-48 pack.', sufficientWhen: 'Re-checked against 12-pack and case pricing. The band is CANS AND BOTTLES ONLY - a mocktail, zero-proof spirit or punch base costs several times this per drink and is priced separately. Regional spread is real: Northeast and South run high, Midwest and West Coast low on discount-chain competition, and promotions cut 10-25%.' } },
    { id: 'p_alcohol', item: 'Beer / wine (optional)', category: 'beverage', qtyPerGuest: 1.5, unit: 'drinks', where: ['Grocery', 'Liquor store'], unitCostRange: [1.5, 4], essential: false, buyAt: 'T-3d', dependsOnDecision: 'beverage', note: 'Skip or keep light — many guests will mirror the non-drinking guest of honor.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1 lb/guest (2 if hot/outdoor).', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1-2 lb ice/guest beverage-service heuristic.', claim: '~1 lb of ice per guest suffices indoors; ~2 lb in hot or outdoor conditions', sufficientWhen: 'verified — established-consensus beverage-service ice planning heuristic; scale by weather and whether beverages are pre-chilled or iced on-site' } },
    { id: 'p_decor', item: 'Pink + blue decor (balloons, "Boy or Girl?" banner, backdrop)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Amazon', 'Target'], unitCostRange: [25, 70], essential: false, buyAt: 'T-3d', note: 'Use BOTH colors evenly so decor gives nothing away.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_game_board', item: 'Team Pink vs Team Blue guessing board + stickers/markers', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Amazon', 'Party store', 'Etsy'], unitCostRange: [10, 30], essential: false, buyAt: 'T-3d', dependsOnDecision: 'game' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_favors', item: 'Favors (optional — pink/blue treats or "He or She?" trinkets)', category: 'decor', qtyPerGuest: 1, unit: 'favor', where: ['Party store', 'Amazon', 'Etsy'], unitCostRange: [1, 5], essential: false, buyAt: 'T-3d' , costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['zola-favors-2026', 'theknot-realweddings-2025'], lastVerified: '2026-08-15', claim: 'A per-guest favor runs $1-5, with $3 the typical mid-range spend; 56 percent of couples keep favors at $5 or less per guest. Tiers as published: budget at or under $1, mid-range $2-3, premium $5 and up.', sufficientWhen: 'CONFIDENCE IS LOW ON PURPOSE: the surveys behind this price WEDDING favors, and these are shower, birthday and graduation favors. The product class is the same - a small per-guest keepsake - but the sample is not, so treat the band as transferred rather than measured. Replace it if a non-wedding favor survey is ever found.' } },
    { id: 'p_tableware', item: 'Plates, cups, napkins, cutlery (pink + blue)', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Party store', 'Costco'], unitCostRange: [0.25, 2.5], essential: true, buyAt: 'T-3d' , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['disposables-bulk-2026', 'disposables-partyqty-2026'], lastVerified: '2026-08-15', claim: 'A per-guest place setting runs $0.25-2.50 depending entirely on channel: bulk restaurant supply puts plates at $0.08-0.15 each and foam at $0.09, a grocery shelf puts the same basic paper plate at $0.25-0.40, and premium plastic or compostable runs $0.15-0.35 per plate. A setting is 2-3 plates, 2-3 cups, cutlery and 2-3 napkins.', sufficientWhen: 'Re-checked against per-plate pricing and place-setting norms. A deep bulk buy lands near the floor and premium or compostable near the ceiling - the 12x spread is the CHANNEL, not uncertainty. Add 10-15% for spills and unexpected guests. Sets that bundle flutes, koozies, linens or table covers are a different product and are priced separately.' } },
    { id: 'p_paper', item: 'Paper goods (tablecloth, foil, leftover bags)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [6, 15], essential: true, buyAt: 'T-3d' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_cleanup', item: 'Cleanup kit — trash/recycling bags, paper towels; broom/leaf-bag for confetti or powder', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Hardware store'], unitCostRange: [7, 18], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: confetti and powder reveals leave a real mess — plan the sweep-up.' , costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['costco-cleaning-2026', 'trashbags-retail-2026'], lastVerified: '2026-08-15', claim: 'A cleanup kit runs $7-18 as the SUM of its parts: about a dozen trash and recycling bags at 10 cents each from a warehouse or 11-15 cents at grocery, two rolls of paper towels at about $1.97 warehouse, and a canister of wipes at about $4.27 or a dish-soap pack at $14.74 shared across events.', sufficientWhen: 'CONFIDENCE IS LOW ON PURPOSE: no source prices a cleanup kit, because nobody sells one. This band is a sum of individually-priced components, so treat it as an envelope rather than a quote. The spread is the CHANNEL - warehouse packs against a grocery shelf - and a host who already owns soap and towels lands well under the floor. Kits that also carry gloves, foil or to-go containers are a different bundle.' } },
    { id: 'p_fire_safety', item: 'Fire extinguisher / bucket of water on hand (if any outdoor reveal)', category: 'logistics', qtyFlat: 1, unit: 'unit', where: ['Hardware store', 'Already own'], unitCostRange: [0, 40], essential: false, buyAt: 'T-3d', note: 'Cheap insurance even for safe methods; keep nearby if outdoors.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
  ],

  rentalsGap: [
    { item: 'Folding tables', qtyFlat: 2, note: 'snack table + drink/reveal-cake table' },
    { item: 'Chairs', qtyPerGuest: 0.6, note: 'a reveal party is mingle-heavy; not 1:1 seating' },
    { item: 'Beverage dispenser', qtyFlat: 1, note: 'COMMONLY FORGOTTEN: a dispenser for the mocktail / pink-or-blue punch' },
    { item: 'Drop cloth / tarp', qtyFlat: 1, note: 'under the reveal spot to corral confetti or powder for easy cleanup' },
  ],

  vendors: [
    { category: 'Bakery (secret-keeper for a cake reveal)', required: false, altToDIY: 'A trusted friend bakes/colors the cake', when: 'T-18d', costRange: [35, 90], costUnit: 'flat' },
    { category: 'Balloon / party shop (secret-keeper for a balloon-box reveal)', required: false, altToDIY: 'Friend fills an opaque box/balloon from the sealed envelope', when: 'T-18d', costRange: [25, 80], costUnit: 'flat' },
    { category: 'Photographer / videographer', required: false, altToDIY: 'Assign a guest to film the reveal on a charged phone + tripod', when: 'T-10d', costRange: [150, 500], costUnit: 'flat' },
    { category: 'Catering / platter service', required: false, altToDIY: 'DIY snacks or grocery platters', when: 'T-7d', costRange: [10, 25], costUnit: 'per guest' },
  ],

  risks: [
    { id: 'r_reveal_stunt', trigger: 'Reveal uses fireworks, Tannerite/explosive targets, homemade pyro, or hot/burning smoke devices — especially near dry brush', severity: 'high', mitigation: 'Use only food-, balloon-, biodegradable-confetti-, or rated non-pyro powder-cannon reveals. No explosives or open flame. If outdoor, check fire conditions and keep water/extinguisher nearby; never reveal near dry grass or brush.' },
    { id: 'r_secret_leak', trigger: 'Hosts open the envelope or the wrong color is prepped', severity: 'high', mitigation: 'Hand the sealed result straight to the baker/shop; never open it; have them confirm color privately and pick up the item neutral.' },
    { id: 'r_capture_miss', trigger: 'The un-repeatable reveal moment is not captured on camera', severity: 'med', mitigation: 'Assign a dedicated shooter, frame parents + reveal in one shot, charge devices, do a quick test, and have a backup phone filming.' },
    { id: 'r_headcount', trigger: 'Final headcount still not locked 4 days out', severity: 'med', mitigation: 'Chase RSVPs with the parents; buy fresh food after the count locks.' },
    { id: 'r_smoke_health', trigger: 'Colored smoke device irritates asthmatic/allergic guests', severity: 'med', mitigation: 'Prefer confetti/powder over smoke; if any smoke is used keep it outdoors, downwind, and away from kids and sensitive guests.' },
    { id: 'r_powder_inhale', trigger: 'Powder cannon fired into faces / too close to guests', severity: 'low', mitigation: 'Aim up and away, keep guests back several feet, use only non-toxic rated powder.' },
  ],

  contingencies: [
    { id: 'c_reveal_swap', when: 'r_reveal_stunt', plan: 'If anyone proposes fireworks/explosives/hot smoke, swap immediately to the cake cut or balloon box — both are crowd-pleasers with near-zero fire risk.' },
    { id: 'c_backup_reveal', when: 'r_secret_leak', plan: 'Keep the second reveal item (or a sealed backup envelope with the baker) so a leaked or failed primary reveal can be re-run cleanly.' },
    { id: 'c_capture_backup', when: 'r_capture_miss', plan: 'A second guest films on a phone from a different angle; designate someone to immediately back up the footage after the reveal.' },
    { id: 'c_weather', when: 'r_headcount', plan: 'If an outdoor reveal, confirm an indoor or covered fallback 3 days out; confetti/cake reveals move indoors easily, powder does not.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Decor, favors, guessing board, mocktail mixers, soft drinks, reveal balloon/confetti, tableware, cleanup kit' },
      { when: 'T-1d', what: 'Fresh snacks; pick up the reveal cake (keep refrigerated)' },
      { when: 'T0', what: 'Ice + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Make-ahead bites, batch the mocktail, assemble favors, set up the guessing board' },
      { when: 'T0 -2h', what: 'Plate snacks, build the drink station, confirm the reveal item is the right color and ready' },
    ],
    setup: [
      { when: 'T0 -5h', what: 'Collect the reveal item and keep it out of sight and refrigerated if it’s cake' },
      { when: 'T0 -4h', what: 'Re-confirm the method is safe — no pyro, no explosives, no hot smoke' },
      { when: 'T0 -3h', what: 'Brief the one person who knows; check fire conditions if you’re outdoors' },
      { when: 'T0 -1:55', what: 'Pink/blue decor, snack + dessert table, drink station, guessing board' },
      { when: 'T0 -1h', what: 'Stage the reveal spot (drop cloth/tarp if confetti/powder), position the camera, ice the drinks' },
      { when: 'T0 -15m', what: 'Gather guests, brief the photographer, place the reveal item; if outdoor + dry, do a final fire-safety check' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Doors: guests in, drinks out, the guessing board where people see it' },
      { when: 'T0 +30m', what: 'Food and the guessing' },
      { when: 'T0 +1h', what: 'Gather everyone: phones up, photographer placed, kids and pets back' },
      { when: 'T0 +1:15', what: 'The reveal' },
      { when: 'T0 +1:30', what: 'Photos with both families' },
      { when: 'T0 +2:15', what: 'Cake' },
      { when: 'T0 +3h', what: 'Wind down, to-go plates' },
    ],
    cleanup: [
      { when: 'during', what: 'Bus plates/cups into a tub between rounds; keep a trash bag near the reveal spot' },
      { when: 'T0 +2:30', what: 'Sweep/bag confetti or powder debris, pack leftovers + cake, back up the reveal photos/video, bag trash + recycling' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Quantities reflect common US party rules of thumb (~6-8 finger bites/guest/hr, ~1-2 drinks/guest/hr, ~1 lb ice/guest, ~1 cake serving/guest). The core mechanic — handing the ultrasound tech\'s sealed result to a baker or balloon shop so the parents are surprised too — is standard practice. On SAFETY: this playbook deliberately biases toward food, balloon, biodegradable-confetti, and rated non-pyro powder-cannon reveals because gender-reveal stunts using fireworks, binary explosive targets (Tannerite), homemade pyro, or hot/burning smoke devices have caused fatalities, injuries, and major wildfires; such methods are treated as out-of-bounds, especially near dry brush, and an indoor/cake/balloon fallback is always favored. Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default genderReveal;
