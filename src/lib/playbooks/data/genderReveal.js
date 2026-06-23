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
      why: 'The whole party is built around this one moment. SAFE methods only — no fireworks, no Tannerite/explosive targets, no homemade pyro, no hot/burning smoke devices (these have caused wildfires and injuries).',
    },
    {
      id: 'secret_keeper',
      label: 'Who holds the sealed sex result',
      options: ['Baker', 'Balloon / party shop', 'Trusted friend (not attending the surprise)'],
      default: 'Baker',
      when: 'T-18d',
      blocks: ['reveal_handoff'],
      why: 'For the parents to be surprised too, the ultrasound tech\'s sealed envelope must go to an outside party who prepares the reveal — never opened by the hosts.',
    },
    {
      id: 'venue',
      label: 'Indoor or outdoor',
      options: ['Backyard / outdoor', 'Indoor (home or rented room)', 'Park / open space'],
      default: 'Backyard / outdoor',
      when: 'T-18d',
      blocks: ['rentals', 'reveal_purchases'],
      why: 'Confetti and powder reveals are cleaner and safer outdoors with ventilation and distance; check fire conditions if the ground/brush is dry.',
    },
    {
      id: 'guestlist',
      label: 'Finalize guest list with the parents',
      options: [],
      default: null,
      when: 'T-14d',
      blocks: ['food', 'beverage_purchases', 'favors'],
      why: 'Every food/drink quantity scales from this; confirm with the parents-to-be first.',
    },
    {
      id: 'game',
      label: 'Guessing game / activity',
      options: ['Team Pink vs Team Blue guessing board', 'Guess-the-date + sex cards', 'Low-key mingling only'],
      default: 'Team Pink vs Team Blue guessing board',
      when: 'T-14d',
      blocks: ['game_supplies'],
      why: 'Drives the board/sticker/marker purchase and gives guests something to do before the reveal.',
    },
    {
      id: 'beverage',
      label: 'Drinks (mocktails for the parent-to-be)',
      options: ['Mocktails + soft drinks only', 'Mocktails + soft drinks + beer/wine', 'Pink/blue punch bar'],
      default: 'Mocktails + soft drinks + beer/wine',
      when: 'T-7d',
      blocks: ['beverage_purchases'],
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
    { id: 'p_reveal_cake', item: 'Reveal cake / cupcakes (neutral outside, colored inside)', category: 'food', qtyFlat: 1, qtyPer: 15, unit: 'cake (serves ~15)', where: ['Bakery', 'Grocery'], unitCostRange: [35, 75], essential: true, buyAt: 'T-1d', note: 'The baker holds the sealed result and colors the inside; pick up neutral so parents stay surprised. ~1 serving/guest.', alternatives: ['Grocery bakery cupcakes — cheaper, easier to serve', 'Confetti cupcakes colored inside — budget DIY if baker is unavailable'], provenance: { tier: 'trade-heuristic', confidence: 'high', verificationStatus: 'established-consensus', note: 'Cake/cupcake reveal is the most common SAFE method.' } },
    { id: 'p_reveal_balloon', item: 'Reveal item — balloon box OR confetti poppers OR rated powder cannon', category: 'decor', qtyFlat: 2, unit: 'reveal item(s)', where: ['Party store', 'Balloon shop', 'Amazon'], unitCostRange: [15, 60], essential: true, buyAt: 'T-3d', note: 'SAFE methods only: opaque balloon box, biodegradable confetti popper, or a rated non-pyro powder cannon. NEVER fireworks, Tannerite/explosive targets, or hot/burning smoke. Buy 2 in case one fails.', provenance: { tier: 'trade-heuristic', confidence: 'high', verificationStatus: 'established-consensus', note: 'Balloon/confetti/rated-cannon reveals are the standard safe alternatives.' } },
    { id: 'p_snacks', item: 'Fruit & veggie cups with dips (mini sandwiches, charcuterie)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco', 'Caterer'], unitCostRange: [3, 8], essential: true, buyAt: 'T-1d', note: 'Snack-forward party, not a meal — ~6-8 bites/guest/hr.', alternatives: ['Costco party platters — cheaper per lb, minimal prep', 'Fruit + veggie tray + dip from deli — budget grazing option'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~5-8 appetizer bites/guest/hr when apps are the main food.' } },
    { id: 'p_pinkblue_treats', item: 'Pink + blue themed sweets (cookies, candy, donuts)', category: 'food', qtyPerGuest: 2, unit: 'pieces', where: ['Grocery', 'Bakery', 'Party store'], unitCostRange: [0.5, 1.5], essential: false, buyAt: 'T-1d', note: 'Deliberately serve BOTH colors so the spread does not hint at the answer.', alternatives: ['Pink + blue M&Ms — cheapest themed candy option', 'Pink + blue cotton candy bags — festive, inexpensive per serving'] },
    { id: 'p_mocktail', item: 'Mocktail / pink-or-blue punch mixers (for the parent-to-be)', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', note: 'Make the zero-proof option genuinely great — the pregnant guest of honor is the centerpiece.' },
    { id: 'p_softdrinks', item: 'Soft drinks / sparkling water', category: 'beverage', qtyPerGuest: 2, unit: 'cans', where: ['Grocery', 'Costco'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-3d' },
    { id: 'p_alcohol', item: 'Beer / wine (optional)', category: 'beverage', qtyPerGuest: 1.5, unit: 'drinks', where: ['Grocery', 'Liquor store'], unitCostRange: [1.5, 4], essential: false, buyAt: 'T-3d', dependsOnDecision: 'beverage', note: 'Skip or keep light — many guests will mirror the non-drinking guest of honor.' },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1 lb/guest (2 if hot/outdoor).', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1-2 lb ice/guest beverage-service heuristic.' } },
    { id: 'p_decor', item: 'Pink + blue decor (balloons, "Boy or Girl?" banner, backdrop)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Amazon', 'Target'], unitCostRange: [25, 70], essential: false, buyAt: 'T-3d', note: 'Use BOTH colors evenly so decor gives nothing away.' },
    { id: 'p_game_board', item: 'Team Pink vs Team Blue guessing board + stickers/markers', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Amazon', 'Party store', 'Etsy'], unitCostRange: [10, 30], essential: false, buyAt: 'T-3d', dependsOnDecision: 'game' },
    { id: 'p_favors', item: 'Favors (optional — pink/blue treats or "He or She?" trinkets)', category: 'decor', qtyPerGuest: 1, unit: 'favor', where: ['Party store', 'Amazon', 'Etsy'], unitCostRange: [2, 6], essential: false, buyAt: 'T-3d' },
    { id: 'p_tableware', item: 'Plates, cups, napkins, cutlery (pink + blue)', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Party store', 'Costco'], unitCostRange: [0.4, 1.5], essential: true, buyAt: 'T-3d' },
    { id: 'p_paper', item: 'Paper goods (tablecloth, foil, leftover bags)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [6, 15], essential: true, buyAt: 'T-3d' },
    { id: 'p_cleanup', item: 'Cleanup kit — trash/recycling bags, paper towels; broom/leaf-bag for confetti or powder', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Hardware store'], unitCostRange: [8, 16], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: confetti and powder reveals leave a real mess — plan the sweep-up.' },
    { id: 'p_fire_safety', item: 'Fire extinguisher / bucket of water on hand (if any outdoor reveal)', category: 'logistics', qtyFlat: 1, unit: 'unit', where: ['Hardware store', 'Already own'], unitCostRange: [0, 40], essential: false, buyAt: 'T-3d', note: 'Cheap insurance even for safe methods; keep nearby if outdoors.' },
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
    { id: 'r_headcount', trigger: 'Final headcount not locked by T-4d', severity: 'med', mitigation: 'Chase RSVPs with the parents; buy fresh food after the count locks.' },
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
      { when: 'T0 -2h', what: 'Pink/blue decor, snack + dessert table, drink station, guessing board' },
      { when: 'T0 -1h', what: 'Stage the reveal spot (drop cloth/tarp if confetti/powder), position the camera, ice the drinks' },
      { when: 'T0 -15m', what: 'Gather guests, brief the photographer, place the reveal item; if outdoor + dry, do a final fire-safety check' },
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
