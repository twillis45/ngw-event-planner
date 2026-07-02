// Pupusa Gathering — Event OS host playbook (data only).
//
// A Salvadoran / Central American home gathering built around hand-made pupusas
// cooked on a comal (flat griddle). The comal is the heart of it: the masa
// shaping is communal — the abuela and the tías at the table, hands in the masa,
// everybody pressing and filling while the first batch hits the griddle. It is a
// home_gathering, no venue, the host's kitchen. Authored through a Salvadoran
// home-cook / pupusería-matriarch lens — the DMV (DC / Maryland / Virginia,
// especially Langley Park and Columbia Heights) holds the largest Salvadoran
// community in the US, and this is how a gathering there actually runs. Internal
// diversity respected: Salvadoran by default, but Honduran and Guatemalan cousins
// shape and fill differently (thicker, different fillings) — never one flat
// "Central American" caricature. Curtido (the fermented cabbage slaw) and salsa
// roja are NON-NEGOTIABLE, and curtido needs DAYS, so it is front-loaded.
// Quantities are real pupusa-party norms (see `knowledge`), labeled `synthesized`
// until a verification pass attaches citations. ESM default export.

const pupusaGathering = {
  type: 'Pupusa Gathering',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A Salvadoran / Central American home gathering centered on hand-made pupusas cooked on a comal. The masa shaping is communal and social — the tías and abuela at the table, everybody pressing and filling. Curtido and salsa roja are non-negotiable, and the curtido needs days to ferment, so the playbook front-loads it. Moderate difficulty: shaping takes practice and many hands, but the food itself is humble and forgiving.',
    typicalGuests: { low: 6, default: 12, high: 24 },
    typicalDurationHours: 4,
    leadTimeDays: 10,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 8, high: 18, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The abuela sits down to press masa and everyone else finds a seat at the table.',
    'The first pupusa comes off the comal and it goes to the right person without a word.',
    'The curtido is right — properly soured — and someone says so.',
    'Three generations at the table at the same time, shaping and filling together.',
    'The horchata is cold and sweet and someone asks for the recipe.',
  ],

  decisions: [
    { id: 'make_vs_order', label: 'Make from scratch, order, or hybrid?', options: ['Make all from scratch (comal day)', 'Order from a pupusería', 'Hybrid — host makes some, orders the rest'], default: 'Hybrid — host makes some, orders the rest', when: 'T-7d', blocks: ['food', 'griddle'], costFactors: { 'Make all from scratch (comal day)': 0.75, 'Order from a pupusería': 1.3 }, affects: ['p_masa', 'p_quesillo', 'p_chicharron', 'p_beans'], why: 'The single biggest effort lever. Scratch is the heart of it but slow on one comal; hybrid lets the shaping stay communal while a pupusería backstops volume so nobody is stuck at the griddle all night.' },
    { id: 'fillings', label: 'Fillings spread', options: ['Revueltas only (chicharrón + cheese + beans)', 'Revueltas + queso + frijol con queso', 'Full spread incl. loroco + ayote/squash', 'Veg-friendly (queso, frijol, loroco, ayote)'], default: 'Revueltas + queso + frijol con queso', when: 'T-7d', blocks: ['food'], costFactors: { 'Revueltas only (chicharrón + cheese + beans)': 0.85, 'Full spread incl. loroco + ayote/squash': 1.2, 'Veg-friendly (queso, frijol, loroco, ayote)': 0.9 }, affects: ['p_quesillo', 'p_chicharron', 'p_beans', 'p_loroco'], why: 'Drives masa, quesillo, beans, and chicharrón quantities. Revueltas is the classic; always keep a plain queso and a bean option so kids and non-pork eaters are covered.' },
    { id: 'curtido_ahead', label: 'Curtido — made ahead (it needs days)', options: ['Make 3+ days ahead (properly fermented)', 'Make 1–2 days ahead (lightly soured)', 'Buy jarred curtido'], default: 'Make 3+ days ahead (properly fermented)', when: 'T-4d', blocks: ['food'], costFactors: { 'Buy jarred curtido': 1.2 }, affects: ['p_curtido_veg'], why: 'Curtido is not a same-day side — it needs to sour. Decide early because the made-ahead option sets a hard task days before the gathering. No curtido = it is not really a pupusa table.' },
    { id: 'drinks', label: 'Drinks', options: ['Horchata + tamarindo (Salvadoran, morro seed)', 'Aguas frescas + sodas only', 'Add a grown section (Pilsener / Suprema / beer)', 'Coffee + sweet bread to close'], default: 'Horchata + tamarindo (Salvadoran, morro seed)', when: 'T-5d', blocks: ['beverage_purchases'], why: 'Salvadoran horchata is morro-seed based — different from Mexican rice horchata — and pairs with the masa. A grown section (Pilsener, Suprema) is optional; aguas frescas keep it all-ages.' },
  ],

  milestones: [
    { id: 'pup_setdate', name: 'Set date, headcount, scratch-vs-order, fillings', offsetDays: 10, owner: 'host', category: 'planning', risk: { ifDelayed: 'No time to source masa/quesillo or book a pupusería', severity: 'low' } },
    { id: 'pup_invite', name: 'Invite + line up shaping hands (tías/family)', offsetDays: 8, owner: 'host', dependsOn: ['pup_setdate'], category: 'guest', risk: { ifDelayed: 'Host stuck shaping alone — the comal backs up', severity: 'med' } },
    { id: 'pup_source', name: 'Source masa harina/fresh masa, quesillo, chicharrón, loroco; reserve pupusería if hybrid', offsetDays: 5, owner: 'host', dependsOn: ['pup_setdate'], category: 'shopping', risk: { ifDelayed: 'Quesillo / loroco sold out at the Latin market', severity: 'med' } },
    { id: 'pup_curtido', name: 'Make curtido so it can ferment', offsetDays: 4, owner: 'host', dependsOn: ['pup_source'], category: 'food', risk: { ifDelayed: 'Curtido too fresh / not soured — the table feels incomplete', severity: 'med' } },
    { id: 'pup_prep', name: 'Make salsa roja, refried beans, prep fillings; check comal + oil', offsetDays: 1, owner: 'host', dependsOn: ['pup_source'], category: 'food', risk: { ifDelayed: 'Cold-start the whole prep on the day — comal never catches up', severity: 'med' } },
    { id: 'pup_setup', name: 'Set up comal/griddle station, shaping table, toppings line', offsetDays: 0, owner: 'host', dependsOn: ['pup_curtido', 'pup_prep'], category: 'setup', risk: null },
    { id: 'event', name: 'The pupusa gathering', offsetDays: 0, owner: 'host', dependsOn: ['pup_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'pup_invite', phase: 'guest', label: 'Invite; ask 2–3 people to come early to shape (the tías-at-the-table part)', when: 'T-8d' },
    { id: 't_source', milestoneId: 'pup_source', phase: 'shopping', label: 'Latin market run: masa harina (instant/fresh masa), quesillo, chicharrón, refried beans, loroco/ayote; reserve pupusería order if hybrid', when: 'T-5d' },
    { id: 't_curtido', milestoneId: 'pup_curtido', phase: 'food', label: 'Make curtido (cabbage, carrot, onion, oregano, vinegar) — jar it and let it sour in the fridge', when: 'T-4d' },
    { id: 't_salsa_beans', milestoneId: 'pup_prep', phase: 'food', label: 'Make salsa roja + refried beans; mix revueltas filling; grate/portion quesillo; check the comal and have oil ready', when: 'T-1d' },
    { id: 't_setup', milestoneId: 'pup_setup', phase: 'setup', label: 'Heat the comal, set the shaping table (masa bowl, water dish, fillings), lay the toppings line (curtido + salsa)', when: 'T0 -0:45' },
    { id: 't_griddle', milestoneId: 'event', phase: 'food', label: 'Shape + griddle in batches — keep a steady rotation; pass the first ones hot off the comal', when: 'T0' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Cool + scrape the comal, jar leftover masa/fillings, pack pupusas, wash the griddle, bag trash', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_masa', item: 'Masa (instant corn masa harina or fresh masa)', category: 'food', qtyPerGuest: 0.7, unit: 'lb', where: ['Latin market', 'Grocery', 'Tortillería'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', note: '~3–4 pupusas/adult; ~0.15–0.2 lb masa each. Fresh masa from a tortillería shapes best if you can get it.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '3–4 pupusas/adult × ~0.15–0.2 lb masa/pupusa.' }, alternatives: ['Maseca instant masa (bag) — widely available, cheaper than fresh', 'Bob\'s Red Mill masa harina — if Maseca sold out, same result'] },
    { id: 'p_quesillo', item: 'Quesillo (Salvadoran melting cheese) or mozzarella blend', category: 'food', qtyPerGuest: 0.25, unit: 'lb', where: ['Latin market', 'Grocery'], unitCostRange: [4, 7], essential: true, buyAt: 'T-3d', note: 'Quesillo is the soul of queso + revueltas pupusas. Mozzarella/Oaxaca is the common DMV substitute.', alternatives: ['Whole-milk mozzarella — widely available substitute, melts similarly', 'Oaxacan cheese — closer to quesillo, often found at Latin markets'] },
    { id: 'p_chicharron', item: 'Chicharrón (ground pork) for revueltas', category: 'food', qtyPerGuest: 0.15, unit: 'lb', where: ['Latin market', 'Butcher'], unitCostRange: [4, 8], essential: false, buyAt: 'T-3d', note: 'Ground/cooked pork for revueltas. Skip for the veg-friendly spread.', alternatives: ['Ground pork + salt — DIY chicharron filling, much cheaper', 'Skip it — frijol con queso is the vegetarian option that everyone can eat'] },
    { id: 'p_beans', item: 'Refried beans (frijoles molidos) for frijol con queso', category: 'food', qtyPerGuest: 0.2, unit: 'lb', where: ['Latin market', 'Grocery'], unitCostRange: [1.5, 3], essential: true, buyAt: 'T-3d', note: 'Frijol con queso is the everyone-can-eat-it pupusa — always have it.', alternatives: ['Canned refried beans — if homemade unavailable, dress with cumin and lard', 'Dried pinto beans (cook from scratch) — cheapest option, takes 2 hours'] },
    { id: 'p_loroco', item: 'Loroco (and/or ayote/squash) for the spread', category: 'food', qtyFlat: 1, unit: 'jar/bunch', where: ['Latin market'], unitCostRange: [4, 9], essential: false, buyAt: 'T-3d', note: 'Loroco con queso is a signature Salvadoran filling — sold frozen/jarred at Latin markets. Ayote/squash is the milder cousin.' },
    { id: 'p_curtido_veg', item: 'Curtido ingredients (cabbage, carrots, onion, oregano, vinegar)', category: 'food', qtyFlat: 1, unit: 'batch', where: ['Grocery', 'Latin market'], unitCostRange: [6, 12], essential: true, buyAt: 'T-3d', note: 'NON-NEGOTIABLE. Buy at T-3d so you can jar it at T-4–3d and let it sour. A pupusa table without curtido is incomplete.' },
    { id: 'p_salsa', item: 'Salsa roja ingredients (tomatoes, onion, garlic, peppers)', category: 'food', qtyFlat: 1, unit: 'batch', where: ['Grocery', 'Latin market'], unitCostRange: [5, 10], essential: true, buyAt: 'T-1d', note: 'NON-NEGOTIABLE companion to curtido. A thin cooked tomato sauce, ladled over.' },
    { id: 'p_oil', item: 'Cooking oil + water bowl for shaping', category: 'logistics', qtyFlat: 1, unit: 'supply', where: ['Grocery'], unitCostRange: [4, 8], essential: true, buyAt: 'T-3d', note: 'Oiled/wet hands keep the masa from sticking; a light film on the comal. Commonly forgotten until you are mid-shape.' },
    { id: 'p_horchata', item: 'Horchata (morro seed) + tamarindo mix', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Latin market', 'Grocery'], unitCostRange: [0.75, 2], essential: true, buyAt: 'T-3d', note: 'Salvadoran horchata is morro-seed based — NOT Mexican rice horchata. Tamarindo alongside.' },
    { id: 'p_beer', item: 'Beer (Pilsener / Suprema) or sodas — grown/all-ages section', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Latin market', 'Liquor store', 'Grocery'], unitCostRange: [1, 3], essential: false, buyAt: 'T-3d', note: 'Salvadoran Pilsener/Suprema if you can find them; sodas (Kolashampan) keep it all-ages.' },
    { id: 'p_tableware', item: 'Plates, napkins, forks (sturdy — pupusas are hot + greasy)', category: 'rental', qtyPerGuest: 2, unit: 'set', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.2, 0.6], essential: true, buyAt: 'T-3d' },
    { id: 'p_cleanup', item: 'Trash bags, paper towels, foil + containers for leftovers', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [6, 12], essential: true, buyAt: 'T-3d', note: 'Foil/containers to send pupusas home — guests will ask. Paper towels for the greasy comal.' },
  ],

  rentalsGap: [
    { item: 'Comal / large flat griddle (electric or stovetop)', qtyFlat: 1, note: 'The heart of it. A second griddle roughly doubles output for 16+ guests — borrow one.' },
    { item: 'Tortilla press or flat plate (optional shaping aid)', qtyFlat: 1, note: 'Hands are traditional, but a press helps newer shapers keep pace.' },
    { item: 'Folding table for the shaping line', qtyFlat: 1, note: 'The communal table — masa bowl, water, fillings, room for several hands.' },
    { item: 'Large jars / containers for curtido', qtyPerGuest: 0.1, note: 'Curtido has to ferment ahead in the fridge — one large jar per ~10 guests.' },
  ],

  vendors: [
    { category: 'Pupusería (made-to-order or bulk pupusas)', required: false, altToDIY: 'Shape and griddle from scratch', when: 'T-5d', costRange: [2, 4], costUnit: 'per pupusa' },
    { category: 'Latin caterer (full pupusa spread + sides)', required: false, altToDIY: 'Host cooks the whole table', when: 'T-7d', costRange: [10, 18], costUnit: 'per guest' },
    { category: 'Griddle / comal rental', required: false, altToDIY: 'Borrow a second griddle from family', when: 'T-5d', costRange: [20, 50], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_curtido_time', trigger: 'Curtido made too late — not soured', severity: 'med', mitigation: 'Make it at T-4–3d so it can ferment; buy a backup jar of curtido as insurance.' },
    { id: 'r_comal_burn', trigger: 'Hot comal / griddle burns — grease pop, hot edge, kids near the station', severity: 'high', mitigation: 'Keep the comal pushed back and stable; use a dry towel/mitt, never wet; keep children away from the griddle edge; pat shaped pupusas dry so water does not spit oil; keep the handle turned in.' },
    { id: 'r_bottleneck', trigger: 'One comal, one cook — pupusas back up and guests wait', severity: 'med', mitigation: 'Recruit shaping hands; pre-portion fillings; run a second griddle; serve the curtido/salsa and drinks first so the wait feels social, not hungry.' },
    { id: 'r_supply', trigger: 'Quesillo / loroco / fresh masa sold out', severity: 'med', mitigation: 'Source at T-5d from a Latin market; mozzarella subs for quesillo; instant masa harina subs for fresh masa.' },
    { id: 'r_foodsafe', trigger: 'Pork/cheese fillings or cooked pupusas left out too long', severity: 'med', mitigation: 'Keep raw chicharrón and quesillo refrigerated until use; griddle pork-filled pupusas through; don\'t leave cooked pupusas at room temp more than ~2h.' },
  ],

  contingencies: [
    { id: 'c_curtido', when: 'r_curtido_time', plan: 'Serve the backup jarred curtido this time; salt-and-vinegar the fresh batch hard and let it sit on the counter an hour to fake-sour.' },
    { id: 'c_comal_burn', when: 'r_comal_burn', plan: 'Keep a clean towel and cold water at the station for minor burns; move the shaping table away from the hot edge; designate one adult on the comal so kids aren\'t reaching across it.' },
    { id: 'c_bottleneck', when: 'r_bottleneck', plan: 'Fire up a second griddle or pull in the hybrid pupusería order; put two people shaping ahead so the cook never waits on masa.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-5d', what: 'Latin market: masa, quesillo, chicharrón, beans, loroco/ayote; reserve pupusería order if hybrid' },
      { when: 'T-3d', what: 'Curtido + salsa veg, horchata/tamarindo, beer/sodas, oil, tableware, cleanup kit' },
      { when: 'T-1d', what: 'Any fresh masa from the tortillería + last produce' },
    ],
    preparation: [
      { when: 'T-4d', what: 'Make the curtido and jar it so it can ferment in the fridge' },
      { when: 'T-1d', what: 'Make salsa roja + refried beans; mix revueltas; portion quesillo; check the comal + oil' },
      { when: 'T0 -1h', what: 'Heat the comal; set the masa bowl, water dish, and fillings on the shaping table' },
    ],
    setup: [
      { when: 'T0 -0:45', what: 'Get the comal/griddle hot; lay out the shaping line (masa, water, oil, fillings)' },
      { when: 'T0 -0:30', what: 'Set the toppings line — curtido and salsa roja out, plates and napkins, drinks station; pull early shapers to the table' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep curtido/salsa replenished; jar refrigerated fillings between batches; pass pupusas hot so they don\'t stack and steam' },
      { when: 'T0 +4h', what: 'Cool + scrape the comal, jar leftover masa/fillings, pack pupusas to send home, wash the griddle, bag trash' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Authored through a Salvadoran home-cook / pupusería-matriarch lens — the DMV (DC / Maryland / Virginia, especially Langley Park and Columbia Heights) holds the largest Salvadoran community in the US, and this reflects how a gathering there actually runs: the comal as the heart, communal hand-shaping at the table, quesillo and chicharrón and frijol fillings, and Salvadoran morro-seed horchata (distinct from Mexican rice horchata). Two things are treated as non-negotiable: curtido, the fermented cabbage slaw, which needs DAYS to sour (made at T-4–3d, not on the day), and salsa roja alongside it. Quantities reflect real pupusa-party norms (~3–4 pupusas/adult; ~0.15–0.2 lb masa each). Internal diversity is respected — this is Salvadoran by default, but Honduran and Guatemalan cousins shape and fill differently, and the playbook is meant to honor the tradition without flattening it into one caricature. Authored honestly and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default pupusaGathering;
