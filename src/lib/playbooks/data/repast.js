// Repast (homegoing repast) — Event OS host playbook (data only).
//
// A repast is the gathering with food that follows a funeral, burial, or
// memorial service — the meal where family and friends come back together to
// be fed, to rest, and to remember. This is a grief-and-community-care event,
// NOT a party. The deepest truth of the tradition — rooted in African American
// homegoing practice and in repast committees / church mothers across many
// communities — is that OTHERS feed the grieving family. The food is usually
// brought by the church, a repast committee, neighbors, or friends; the
// bereaved family should not be cooking. The "host" of this playbook is very
// often NOT the grieving family but a friend or committee member carrying the
// coordination so the family doesn't have to. Every choice here is meant to
// REMOVE burden, never to add tasks. Language is gentle, dignified, and quiet.
// Quantities are common repast rules of thumb, authored honestly and labeled
// `synthesized` until verified. ESM default export.

const repast = {
  type: 'Repast',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A repast — the gathering with food after a funeral or memorial service. A time for family and friends to be fed, to rest, and to share memories. The tradition is that the community feeds the grieving family, so the family should not be cooking. This playbook is built for a friend or committee member who is carrying the details so the family can simply grieve. It keeps decisions few and gentle, and leans on the people who want to help.',
    typicalGuests: { low: 20, default: 50, high: 120 },
    typicalDurationHours: 3,
    leadTimeDays: 5,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 8, high: 25, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  decisions: [
    { id: 'place', label: 'Where the repast is held', options: ['Church fellowship hall', 'A family home', 'A restaurant or banquet room', 'The funeral home'], default: 'Church fellowship hall', when: 'T-5d', blocks: ['setup', 'rentals'], why: 'A fellowship hall is the most common and gentlest choice — kitchen, tables, and a community already used to caring for one another. A home feels close; a restaurant removes all setup and cleanup from a tired family.' },
    { id: 'food_source', label: 'Who provides the food', options: ['Let the church / repast committee bring it', 'Friends and neighbors sign up to bring dishes', 'Have it catered', 'A restaurant serves it'], default: 'Let the church / repast committee bring it', when: 'T-5d', blocks: ['food', 'food_purchases'], why: 'This is the heart of a repast: the family does not cook — the community feeds them. If a committee or church offers, accept it gratefully. Catering or a restaurant is a kind option when no committee is in place, so no one is in a kitchen on a hard day.' },
    { id: 'headcount', label: 'A gentle headcount estimate', options: ['Close family + a few (~20)', 'Family, friends, congregation (~50)', 'A large homegoing (~120+)'], default: 'Family, friends, congregation (~50)', when: 'T-4d', blocks: ['food', 'rentals'], why: 'No one needs an exact count on a day like this — an honest estimate is enough. It only needs to be close so there is plenty of food and a seat for every elder.' },
    { id: 'memory', label: 'A way to remember together', options: ['Guest book + a memory table (photos)', 'Open time for sharing memories', 'A quiet room to step away', 'Keep it simple — just the meal'], default: 'Guest book + a memory table (photos)', when: 'T-3d', why: 'A guest book and a few photographs give people a tender place to land. A quiet corner lets anyone who is overwhelmed step away. None of this is required — presence is the gift.' },
  ],

  milestones: [
    { id: 'rp_place', name: 'Confirm the place and the time after the service', offsetDays: 5, owner: 'coordinator', category: 'planning', risk: { ifDelayed: 'No room reserved; family left without a place to gather', severity: 'high' } },
    { id: 'rp_food', name: 'Accept the community\'s help and coordinate who brings what', offsetDays: 4, owner: 'coordinator', dependsOn: ['rp_place'], category: 'planning', risk: { ifDelayed: 'Gaps or duplicates in the food; the family pressured to cook', severity: 'high' } },
    { id: 'rp_spread', name: 'Share the place and time with those attending', offsetDays: 3, owner: 'coordinator', dependsOn: ['rp_place'], category: 'guest', risk: { ifDelayed: 'People unsure where to go after the burial', severity: 'med' } },
    { id: 'rp_memory', name: 'Gather the gentle pieces — guest book, a few photos, a quiet space', offsetDays: 2, owner: 'coordinator', dependsOn: ['rp_place'], category: 'planning', risk: null },
    { id: 'rp_supplies', name: 'Pick up serving supplies, drinks, and to-go containers', offsetDays: 1, owner: 'coordinator', dependsOn: ['rp_food'], category: 'shopping', risk: { ifDelayed: 'Nothing to serve or send plates home with', severity: 'med' } },
    { id: 'rp_setup', name: 'Set the hall before everyone arrives from the service', offsetDays: 0, owner: 'coordinator', dependsOn: ['rp_supplies'], category: 'setup', risk: { ifDelayed: 'Family arrives to an unready room', severity: 'med' } },
    { id: 'event', name: 'The repast', offsetDays: 0, owner: 'coordinator', dependsOn: ['rp_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_place', milestoneId: 'rp_place', phase: 'planning', label: 'Reserve the fellowship hall (or restaurant); set the time to begin right after the burial', when: 'T-5d' },
    { id: 't_accept', milestoneId: 'rp_food', phase: 'planning', label: 'Let the church / committee carry the meal; quietly track who is bringing what so the family never has to ask', when: 'T-4d' },
    { id: 't_spread', milestoneId: 'rp_spread', phase: 'guest', label: 'Share the repast place and time — on the program, at the service, and by word of mouth', when: 'T-3d' },
    { id: 't_memory', milestoneId: 'rp_memory', phase: 'planning', label: 'Set out a guest book and a few photographs; ready a quiet corner for anyone who needs a moment', when: 'T-2d' },
    { id: 't_supplies', milestoneId: 'rp_supplies', phase: 'shopping', label: 'Pick up serving ware, drinks, ice, and to-go containers for the family and elders', when: 'T-1d' },
    { id: 't_setup', milestoneId: 'rp_setup', phase: 'setup', label: 'Arrive early; set tables, warming, drinks, and seating so the room is ready and calm', when: 'T0 -1:30' },
    { id: 't_plates', milestoneId: 'event', phase: 'food', label: 'Make up to-go plates for the immediate family and the elders before the food goes', when: 'T0 +1:30' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Quietly pack leftovers for the family, wash and return dishes, leave the hall as you found it', when: 'T0 +3:00' },
  ],

  purchases: [
    { id: 'p_protein', item: 'Comforting main dishes — fried or baked chicken, baked ham', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Brought by the community', 'Grocery', 'Caterer', 'Restaurant'], unitCostRange: [3, 7], essential: true, buyAt: 'T-1d', note: 'Usually brought by the church or committee — not cooked by the family. ~0.5 lb protein/guest is a gentle plenty.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~0.5 lb protein/guest repast heuristic.' } },
    { id: 'p_sides', item: 'Familiar sides — greens, mac and cheese, potato salad, green beans', category: 'food', qtyPerGuest: 0.75, unit: 'lb', where: ['Brought by the community', 'Grocery', 'Caterer'], unitCostRange: [2, 4], essential: true, buyAt: 'T-1d', note: 'The dishes that say home. Most often these arrive from many hands.' },
    { id: 'p_bread', item: 'Dinner rolls / cornbread', category: 'food', qtyPerGuest: 2, unit: 'pieces', where: ['Brought by the community', 'Grocery', 'Bakery'], unitCostRange: [0.3, 0.6], essential: true, buyAt: 'T-1d' },
    { id: 'p_dessert', item: 'Sheet cake, pound cake, pies, banana pudding', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Brought by the community', 'Grocery', 'Bakery'], unitCostRange: [1, 3], essential: false, buyAt: 'T-1d', note: 'Often the most personal gift — someone\'s family recipe carried in.' },
    { id: 'p_drinks', item: 'Sweet tea, lemonade, water, coffee', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery', 'Costco'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-1d', note: 'A repast is not a bar — gentle, familiar drinks. Coffee for the elders.' },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0' },
    { id: 'p_serveware', item: 'Sturdy plates, cups, napkins, cutlery', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.3, 1], essential: true, buyAt: 'T-1d' },
    { id: 'p_togo', item: 'To-go containers and foil — for the family and elders', category: 'logistics', qtyFlat: 1, qtyPer: 2, unit: 'containers', where: ['Grocery', 'Restaurant supply', 'Costco'], unitCostRange: [0.2, 0.5], essential: true, buyAt: 'T-1d', note: 'EASY TO OVERLOOK and deeply kind: send the immediate family and the elders home with plates so no one cooks for days.' },
    { id: 'p_serving', item: 'Serving utensils, foil pans, warming trays / Sterno', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Restaurant supply', 'Party store'], unitCostRange: [15, 40], essential: true, buyAt: 'T-1d', note: 'Keeps the brought dishes warm and serves them with dignity.' },
    { id: 'p_guestbook', item: 'Guest book and a pen', category: 'decor', qtyFlat: 1, unit: 'item', where: ['Grocery', 'Stationery store', 'Funeral home'], unitCostRange: [8, 20], essential: false, buyAt: 'T-1d', note: 'A keepsake of who came to stand with the family.' },
    { id: 'p_table', item: 'Simple table linens, a small photo display, a few flowers or a candle', category: 'decor', qtyFlat: 1, unit: 'set', where: ['Grocery', 'Florist', 'Home'], unitCostRange: [10, 30], essential: false, buyAt: 'T-1d', note: 'Quiet and tender — never festive. A photo or two and something soft on the tables.' },
    { id: 'p_cleanup', item: 'Trash bags, paper towels, dish soap, storage containers for leftovers', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 15], essential: true, buyAt: 'T-1d', note: 'So the family never lifts a finger to clean up, and the leftovers go home with them.' },
  ],

  rentalsGap: [
    { item: 'Round or banquet tables', qtyPerGuest: 0.12, note: 'roughly one 8-seat table per ~8 guests; a fellowship hall usually has these' },
    { item: 'Folding chairs', qtyPerGuest: 1, note: 'a seat for everyone — and make sure the elders are seated first' },
    { item: 'Warming trays / chafing dishes', qtyFlat: 4, note: 'to keep the brought dishes warm through the gathering' },
    { item: 'Coffee urn', qtyFlat: 1, note: 'coffee is a quiet comfort, especially for the elders' },
  ],

  vendors: [
    { category: 'Caterer (soul food / home-style)', required: false, altToDIY: 'Let the church or repast committee bring the food', when: 'T-4d', costRange: [10, 20], costUnit: 'per guest' },
    { category: 'Restaurant repast / luncheon room', required: false, altToDIY: 'Use the church fellowship hall', when: 'T-4d', costRange: [12, 25], costUnit: 'per guest' },
    { category: 'Repast committee / church kitchen', required: false, altToDIY: 'Friends and neighbors sign up to bring dishes', when: 'T-5d', costRange: [0, 0], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_family_cooking', trigger: 'The grieving family is being asked to cook or coordinate the meal', severity: 'high', mitigation: 'This is the one thing to protect against. A friend or committee carries the food and the details; the family is fed, not feeding. Accept every offer of help.' },
    { id: 'r_noplace', trigger: 'No room reserved for after the burial', severity: 'high', mitigation: 'Confirm the fellowship hall, restaurant, or home at T-5d so people have somewhere to go straight from the service.' },
    { id: 'r_food_gap', trigger: 'Too little food, or many duplicate dishes', severity: 'med', mitigation: 'One coordinator quietly tracks who is bringing what at T-4d, filling gaps so there is plenty and nothing is missing.' },
    { id: 'r_elders', trigger: 'Elders or the immediate family left standing, unfed, or without a plate to take home', severity: 'med', mitigation: 'Seat the elders and family first; serve them first; make up their to-go plates before the food runs low.' },
    { id: 'r_overwhelm', trigger: 'Someone is overcome with grief and has nowhere to step away', severity: 'low', mitigation: 'Keep a quiet room or a calm corner available, with water and tissues, so anyone can take a moment.' },
  ],

  contingencies: [
    { id: 'c_family_cooking', when: 'r_family_cooking', plan: 'If the family has started cooking, gently take it over — bring in committee dishes or a catering tray so they can step back and rest.' },
    { id: 'c_noplace', when: 'r_noplace', plan: 'If a hall falls through, move to a family home or call a restaurant with a back room; word can spread at the service.' },
    { id: 'c_food_gap', when: 'r_food_gap', plan: 'If the food looks short, send someone for trays of chicken and sides; grocery delis and many restaurants can fill in within the hour.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-1d', what: 'Serving ware, drinks, to-go containers, warming supplies, guest book, cleanup kit; confirm the brought dishes' },
      { when: 'T0', what: 'Ice and any last fresh items on the way to the hall' },
    ],
    preparation: [
      { when: 'T-2d', what: 'Set out the guest book and a few photographs; ready a quiet corner' },
      { when: 'T-1d', what: 'Confirm with everyone bringing a dish; gather serving utensils and linens' },
    ],
    setup: [
      { when: 'T0 -1:30', what: 'Arrive early; set tables and chairs, seat for every elder, drinks and coffee station' },
      { when: 'T0 -0:45', what: 'Lay out warming trays for the brought dishes; set the memory table and guest book; ready the to-go containers' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep dishes warm and refilled; make up to-go plates for the family and elders before the food runs low' },
      { when: 'T0 +3:00', what: 'Pack all leftovers for the family, wash and return borrowed dishes, leave the hall clean — the family lifts nothing' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'A repast is the gathering with food held after a funeral, burial, or memorial service. At the center of the tradition — held tenderly in African American homegoing practice and carried by repast committees, church mothers, and neighbors across many communities — is one truth: the community feeds the grieving family. Others cook, others serve, others clean up, so the bereaved can simply be present and be cared for. This is not a celebration in the festive sense; it is nourishment, fellowship, and a return toward daily life surrounded by people who loved the one who passed. The familiar food (fried and baked chicken, greens, mac and cheese, potato salad, rolls, cake) is comfort, not display. Quantities reflect common repast rules of thumb (~0.5 lb protein/guest, generous sides, to-go plates for family and elders) and are authored as established-consensus / trade-heuristic, labeled synthesized until a foreground verification pass attaches citations. Written with a grief-aware lens, meant to remove burden from a hurting family. No fabricated sources.',
    sources: [],
  },
};

export default repast;
