// Low Country Boil (Frogmore Stew) — Event OS host playbook (data only).
//
// The coastal Carolina/Georgia one-pot gathering rooted in the Gullah-Geechee
// Sea Islands: shrimp, smoked sausage, corn, and small red potatoes boiled
// together in a single big propane pot with Old Bay / crab-boil seasoning,
// drained in a basket, and dumped steaming down the middle of a
// newspaper-covered table to be eaten with fingers — cocktail sauce, melted
// butter, hot sauce, and lemon on the side; cold beer, sweet tea, water, and
// plenty of ice. ~12-30 guests, a relaxed backyard or beachside afternoon.
// The whole craft is the STAGED TIMING (potatoes first, then sausage, then
// corn, shrimp last so they don't go rubbery) and propane / boiling-water
// safety. Quantities reflect common Lowcountry-boil norms (see `knowledge`),
// authored honestly and labeled `synthesized` until verified. ESM default export.

const lowCountryBoil = {
  type: 'Low Country Boil',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A Low Country Boil — Frogmore Stew — the coastal Carolina/Georgia one-pot feast from the Gullah-Geechee Sea Islands. Shrimp, smoked sausage, sweet corn, and small red potatoes boil together in one big propane pot under Old Bay / crab-boil seasoning, then get drained and dumped steaming down a newspaper-covered table to eat with your fingers. Cocktail sauce, melted butter, hot sauce, and lemon on the side; cold beer, sweet tea, and iced water to wash it down. The playbook front-loads the pot, the propane, and the staged timing — potatoes first, shrimp LAST — so nothing overcooks and the afternoon stays easy.',
    typicalGuests: { low: 12, default: 20, high: 30 },
    typicalDurationHours: 4,
    leadTimeDays: 10,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 12, high: 22, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The pot gets drained and the whole feast dumps steaming down the center of the table.',
    'Everyone reaches in at the same time — no plates, no ceremony, just the food.',
    'The shrimp hit right and someone says "these are perfect" and means it.',
    'Late afternoon, the table is a beautiful mess and nobody has moved to clean it yet.',
  ],

  decisions: [
    { id: 'headcount', label: 'Headcount & quantities', options: ['12 (small)', '20 (default)', '30 (full table)'], default: '20 (default)', when: 'T-10d', blocks: ['food', 'logistics'], why: 'Everything scales off the count. Plan ~0.5 lb shrimp + ~0.5 lb sausage + 1-2 small red potatoes + 1-1.5 ears of corn per adult, then size the pot(s) and propane to match.' },
    { id: 'seasoning', label: 'Seasoning level', options: ['Mild (family-friendly)', 'Classic Old Bay', 'Spicy (extra crab boil + cayenne)'], default: 'Classic Old Bay', when: 'T-7d', blocks: ['food'], why: 'Old Bay or a liquid/dry crab boil is the heart of the flavor. Keep it classic for a mixed crowd; bump the heat for spice-lovers and serve hot sauce on the side so everyone tunes their own plate.' },
    { id: 'addins', label: 'Add-ins beyond the classic four', options: ['Just the classic (shrimp/sausage/corn/potato)', 'Add blue crab', 'Add crawfish (in season)', 'Add clams or mussels'], default: 'Just the classic (shrimp/sausage/corn/potato)', when: 'T-7d', blocks: ['food'], why: 'The classic four feed a crowd cleanly and affordably. Blue crab, crawfish, or shellfish make it a feast — but they add cost, mess, and timing complexity, so add them on purpose, not by accident.' },
    { id: 'cook', label: 'Boil it yourself or bring it in', options: ['DIY one-pot boil', 'DIY with a buddy on the burner', 'Hire a Lowcountry-boil caterer'], default: 'DIY one-pot boil', when: 'T-7d', blocks: ['food', 'logistics'], why: 'The DIY one-pot boil IS the event — gathering around the burner is half the fun. A caterer is the move only for a big crowd or if no one wants to mind the pot.' },
    { id: 'drinks', label: 'Drinks', options: ['Beer + sweet tea + water', 'Add a batch cocktail / wine', 'Family-friendly / dry'], default: 'Beer + sweet tea + water', when: 'T-5d', blocks: ['beverage'], why: 'Cold beer, sweet tea, and iced water are the coastal default. A batch cocktail or wine rounds it out; keep it dry for a family afternoon. Either way, ice is the thing people forget.' },
  ],

  milestones: [
    { id: 'lcb_setdate', name: 'Set date, headcount & location (backyard/beach)', offsetDays: 10, owner: 'host', category: 'planning', risk: { ifDelayed: 'Quantities and pot size unknown', severity: 'low' } },
    { id: 'lcb_invite', name: 'Invite guests / get a rough RSVP', offsetDays: 8, owner: 'host', dependsOn: ['lcb_setdate'], category: 'guest', risk: { ifDelayed: 'Buy the wrong amount of shrimp', severity: 'med' } },
    { id: 'lcb_gear_check', name: 'Check the pot, burner, propane & safe boil spot', offsetDays: 7, owner: 'host', dependsOn: ['lcb_setdate'], category: 'logistics', risk: { ifDelayed: 'Dead burner or empty tank on the day', severity: 'high' } },
    { id: 'lcb_headcount', name: 'Lock headcount', offsetDays: 3, owner: 'host', dependsOn: ['lcb_invite'], category: 'guest', risk: { ifDelayed: 'Over- or under-buy the seafood', severity: 'med' } },
    { id: 'lcb_shop_nonperish', name: 'Buy seasoning, sausage, potatoes, corn, drinks, table cover, cleanup', offsetDays: 3, owner: 'host', dependsOn: ['lcb_headcount'], category: 'shopping', risk: null },
    { id: 'lcb_shop_shrimp', name: 'Buy the fresh shrimp (and any crab/crawfish)', offsetDays: 1, owner: 'host', dependsOn: ['lcb_headcount'], category: 'shopping', risk: { ifDelayed: 'Shrimp should be fresh, not sitting; markets sell out', severity: 'med' } },
    { id: 'lcb_prep', name: 'Prep — scrub potatoes, shuck corn, slice sausage, mix sauces, ice down drinks', offsetDays: 0, owner: 'host', dependsOn: ['lcb_shop_shrimp'], category: 'food', risk: null },
    { id: 'lcb_setup', name: 'Set burner on level ground, cover the table, heat the seasoned water', offsetDays: 0, owner: 'host', dependsOn: ['lcb_gear_check', 'lcb_prep'], category: 'setup', risk: { ifDelayed: 'Boil runs late, table not ready for the dump', severity: 'low' } },
    { id: 'event', name: 'The boil — staged drop, drain, dump & eat', offsetDays: 0, owner: 'host', dependsOn: ['lcb_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'lcb_invite', phase: 'guest', label: 'Invite folks; get a rough head count so you can size shrimp and the pot', when: 'T-8d' },
    { id: 't_gear', milestoneId: 'lcb_gear_check', phase: 'logistics', label: 'Test-fire the burner, weigh/shake the propane tank, pick a level spot away from the house, find the boil basket and a long paddle', when: 'T-7d' },
    { id: 't_count', milestoneId: 'lcb_headcount', phase: 'guest', label: 'Lock the count; plan ~0.5 lb shrimp + ~0.5 lb sausage + 1-2 red potatoes + 1-1.5 ears corn per adult', when: 'T-3d' },
    { id: 't_nonperish', milestoneId: 'lcb_shop_nonperish', phase: 'shopping', label: 'Old Bay/crab boil, smoked sausage, small red potatoes, corn, butter, lemons, cocktail sauce, hot sauce, drinks, ice, newspaper/kraft paper, cleanup', when: 'T-3d' },
    { id: 't_shrimp', milestoneId: 'lcb_shop_shrimp', phase: 'shopping', label: 'Buy fresh head-on or shell-on shrimp (and crab/crawfish/clams if doing add-ins) the day before', when: 'T-1d' },
    { id: 't_prep', milestoneId: 'lcb_prep', phase: 'food', label: 'Scrub potatoes, shuck and halve corn, slice sausage into rounds, mix cocktail sauce, melt butter, set out hot sauce + lemon; ice down the drinks', when: 'T0 -3:00' },
    { id: 't_heat', milestoneId: 'lcb_setup', phase: 'setup', label: 'Set burner on LEVEL ground away from the house, fill the pot no more than ~2/3, add Old Bay/crab boil, bring to a rolling boil; cover the table with newspaper/kraft paper', when: 'T0 -1:00' },
    { id: 't_boil', milestoneId: 'event', phase: 'food', label: 'Staged drop: potatoes ~15 min, add sausage ~5 min, add corn ~3 min, then SHRIMP LAST ~3 min until just pink; lift the basket to drain, dump down the middle of the table', when: 'T0' },
    { id: 't_cool', milestoneId: 'event', phase: 'cleanup', label: 'Cut the propane, let the pot and water cool FULLY before moving, roll up the paper with the shells inside, wrap leftovers, bag trash', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_shrimp', item: 'Fresh shrimp (shell-on / head-on)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Seafood market', 'Grocery seafood counter', 'Dockside / shrimp boat'], unitCostRange: [7, 13], essential: true, buyAt: 'T-1d', note: 'The star. ~0.5 lb/adult, shell-on for flavor. Buy fresh and local if you can — wild-caught Carolina/Georgia shrimp is the soul of the dish. Goes in LAST.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~0.5 lb shrimp/guest Lowcountry-boil serving heuristic.' }, alternatives: ['Frozen shell-on shrimp (Costco/Sam\'s) — cheaper than fresh, works fine in the boil', 'Crawfish — if shrimp is expensive, same boil technique'] },
    { id: 'p_sausage', item: 'Smoked sausage (kielbasa / andouille)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Butcher'], unitCostRange: [3, 6], essential: true, buyAt: 'T-3d', note: 'Cut into 1-2 inch rounds. Smoky sausage seasons the whole pot; andouille adds heat. Goes in after the potatoes.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~0.5 lb smoked sausage/guest planning estimate.' }, alternatives: ['Kielbasa — widely available, cheaper than andouille', 'Turkey sausage — budget swap if pork is sold out'] },
    { id: 'p_potatoes', item: 'Small red potatoes (new potatoes)', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery'], unitCostRange: [0.6, 1.2], essential: true, buyAt: 'T-3d', note: '1-2 small whole reds per person, scrubbed but unpeeled. They take longest — they go in FIRST for ~15 minutes.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '1-2 small red potatoes/guest Lowcountry-boil norm.' }, alternatives: ['Yukon gold potatoes — similar size and texture, same price', 'Russet chunks — cheapest option, absorbs seasoning well'] },
    { id: 'p_corn', item: 'Sweet corn on the cob', category: 'food', qtyPerGuest: 1.5, unit: 'ears', where: ['Grocery', 'Farm stand'], unitCostRange: [0.4, 0.8], essential: true, buyAt: 'T-3d', note: '1-1.5 ears/person, shucked and snapped or halved. Goes in near the end, just ~3 minutes before the shrimp.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '1-1.5 ears corn/guest Lowcountry-boil norm.' }, alternatives: ['Frozen corn on the cob — cheaper out of season, still works in the pot'] },
    { id: 'p_seasoning', item: 'Old Bay / crab boil seasoning (dry + liquid)', category: 'food', qtyPerGuest: 0.1, unit: 'serving', where: ['Grocery'], unitCostRange: [0.4, 1], essential: true, buyAt: 'T-3d', note: 'NON-NEGOTIABLE. Old Bay plus a dry or liquid crab boil (Zatarain\'s) makes the water. Season generously — the water should taste strong; the food soaks it up.' },
    { id: 'p_butter', item: 'Butter + lemons + cocktail sauce + hot sauce', category: 'food', qtyPerGuest: 0.2, unit: 'serving', where: ['Grocery'], unitCostRange: [0.6, 1.5], essential: true, buyAt: 'T-3d', note: 'The dipping table: melted butter for the corn and shrimp, cocktail sauce, hot sauce, and fresh-cut lemon wedges. Set them out before the dump.' },
    { id: 'p_addins', item: 'Add-ins — blue crab / crawfish / clams (optional)', category: 'food', qtyPerGuest: 0.3, unit: 'lb', where: ['Seafood market', 'Dockside'], unitCostRange: [4, 10], essential: false, buyAt: 'T-1d', note: 'Optional feast upgrade. Crab/crawfish go in with or before the corn; clams open fast near the end. Adds cost and mess — decide on purpose.' },
    { id: 'p_propane', item: 'Propane (full 20 lb tank + backup)', category: 'logistics', qtyFlat: 1, unit: 'tank', where: ['Hardware store', 'Gas station', 'Propane exchange'], unitCostRange: [18, 30], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a half tank dies mid-boil. Start full; a big pot of water takes real heat to roll. Keep a backup.' },
    { id: 'p_safety', item: 'Heat gloves + fire extinguisher (Class B) + first-aid', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Hardware store', 'Amazon'], unitCostRange: [25, 55], essential: true, buyAt: 'T-3d', note: 'SAFETY: heavy gloves for lifting the scalding basket, a Class B extinguisher for the burner, and a first-aid kit for steam/water burns.' },
    { id: 'p_drinks', item: 'Beer, sweet tea, soda, water', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Grocery', 'Costco/Sam\'s'], unitCostRange: [1, 2.5], essential: true, buyAt: 'T-3d', note: 'Cold beer and sweet tea anchor a coastal afternoon; water and soda round it out.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~3 drinks/guest over a 4h gathering.' } },
    { id: 'p_ice', item: 'Ice (drinks + coolers)', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest to keep beer and tea cold all afternoon.' },
    { id: 'p_paper', item: 'Newspaper / brown kraft paper for the table', category: 'decor', qtyPerGuest: 1, unit: 'ft', where: ['Hardware store', 'Party store', 'Recycling bin'], unitCostRange: [0.1, 0.5], essential: true, buyAt: 'T-3d', note: 'The signature move: cover the table, dump the boil down the middle, eat with fingers, roll it all up at the end. Kraft paper is the clean version of the classic newspaper.' },
    { id: 'p_tableware', item: 'Paper towels, napkins, small bowls, shell buckets', category: 'rental', qtyPerGuest: 2, unit: 'set', where: ['Grocery', 'Costco/Sam\'s', 'Party store'], unitCostRange: [0.3, 0.8], essential: true, buyAt: 'T-3d', note: 'Mostly a fingers-and-paper-towels affair, but set out small bowls for sauces/butter and buckets for shells and corn cobs.' },
    { id: 'p_cleanup', item: 'Heavy trash bags, paper towels, foil for leftovers', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Hardware store'], unitCostRange: [8, 16], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: heavy bags hold the wet shell-filled paper without tearing. Foil to wrap leftovers.' },
  ],

  rentalsGap: [
    { item: 'Big stockpot (40-60 qt) with strainer basket + propane burner stand', qtyFlat: 1, note: 'the heart of the setup — basket lets you lift everything out at once; borrow if you don\'t own one' },
    { item: 'Long-handled paddle / spoon', qtyFlat: 1, note: 'to stir the pot safely without reaching over scalding water' },
    { item: 'Folding tables (the dump table + a drinks/prep table)', qtyFlat: 2, note: 'one sturdy table for the boil dump, one for drinks and sauces' },
    { item: 'Coolers', qtyPerGuest: 0.1, note: 'roughly one large cooler per ~10 guests for beer, tea, and ice' },
    { item: 'Folding chairs', qtyPerGuest: 0.7, note: 'seating around the table — though much of a boil is eaten standing' },
  ],

  vendors: [
    { category: 'Lowcountry-boil caterer (full boil for a crowd)', required: false, altToDIY: 'Do the one-pot boil yourself — it is the event', when: 'T-7d', costRange: [15, 30], costUnit: 'per person' },
    { category: 'Fresh / local shrimp supplier (dockside or market)', required: false, altToDIY: 'Buy at the grocery seafood counter', when: 'T-3d', costRange: [7, 13], costUnit: 'per lb' },
    { category: 'Pot + burner rental', required: false, altToDIY: 'Own or borrow the pot and burner', when: 'T-7d', costRange: [30, 80], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_allergy', trigger: 'A guest with a shellfish allergy (shrimp + any clams/crab/crawfish add-ins)', severity: 'high', mitigation: 'Shrimp and clams are major shellfish allergens and a reaction can be anaphylaxis-grade. Ask guests ahead; pull a separate portion of sausage, corn, and potatoes from the pot BEFORE the shrimp go in and keep it away from the dumped communal table (shared cross-contact is unavoidable once it\'s on the paper). Know the nearest ER; keep any guest\'s epinephrine auto-injector on hand.' },
    { id: 'r_burner', trigger: 'Propane burner tips, flares, or runs out / boiling-water scald or burn', severity: 'high', mitigation: 'Set the burner on LEVEL, stable ground well away from the house, deck, and overhangs, and keep kids and pets back. Fill the pot no more than ~2/3 so it doesn\'t boil over onto the flame. NEVER leave the burner unattended. Use heavy heat gloves and a long paddle; lift the heavy scalding basket with two hands (or two people). Keep a Class B extinguisher within reach and start with a FULL propane tank plus a backup.' },
    { id: 'r_overcook', trigger: 'Shrimp overcook and go rubbery (wrong drop order/timing)', severity: 'med', mitigation: 'Stage the drop strictly by cook time: POTATOES first (~15 min), then SAUSAGE (~5 min), then CORN (~3 min), then SHRIMP LAST and only ~2-3 min until just pink. Kill the heat the moment the shrimp turn pink and pull the basket immediately — they keep cooking in the hot water.' },
    { id: 'r_shrimpqty', trigger: 'Run out of shrimp (or buy way too much)', severity: 'med', mitigation: 'Lock the count at T-3d; plan ~0.5 lb shrimp/adult; buy fresh at T-1d so it isn\'t sitting, and call ahead so the market doesn\'t sell out.' },
    { id: 'r_bland', trigger: 'Bland boil — under-seasoned water', severity: 'low', mitigation: 'Season the water aggressively with Old Bay + crab boil so it tastes strong on its own; the potatoes and shrimp soak it up. Let everything steep a couple of minutes after the heat is off, and serve hot sauce/lemon on the side to adjust.' },
    { id: 'r_weather', trigger: 'Rain or wind on an outdoor backyard/beach boil', severity: 'low', mitigation: 'Have a canopy or covered spot for the burner (never enclose it — propane needs ventilation), and a rain date or indoor fallback for the eating table.' },
  ],

  contingencies: [
    { id: 'c_burner', when: 'r_burner', plan: 'If the burner flares or the pot boils over: cut the propane first. For a flare or grease-style flame use the Class B extinguisher — never water. If anyone is scalded, cool the burn under running water and seek care. If the tank runs low mid-boil, swap to the backup — gas stations and hardware stores do propane exchange.' },
    { id: 'c_overcook', when: 'r_overcook', plan: 'If shrimp start to overcook, kill the heat and lift the basket out of the water immediately rather than letting them sit. If a batch turns rubbery, serve it with extra butter and sauce and adjust timing for the next pot.' },
    { id: 'c_shrimpqty', when: 'r_shrimpqty', plan: 'Short on shrimp: stretch the pot with extra sausage, corn, and potatoes (cheap and filling) and add more bread on the side. Too much: it keeps a day or two and a cold boil makes a great next-day shrimp salad.' },
    { id: 'c_weather', when: 'r_weather', plan: 'Move the burner under an open canopy or carport (door up, well ventilated — never indoors) and bring the eating table under cover; if it is truly washed out, fall back to the rain date.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Old Bay/crab boil, smoked sausage, red potatoes, corn, butter, lemons, cocktail/hot sauce, drinks, propane, safety kit, newspaper/kraft paper, tableware, cleanup kit' },
      { when: 'T-1d', what: 'Fresh shrimp (and crab/crawfish/clams if doing add-ins)' },
      { when: 'T0', what: 'Ice + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-3h', what: 'Scrub potatoes, shuck and snap/halve corn, slice sausage into rounds; mix cocktail sauce, melt butter, cut lemon wedges, set out hot sauce' },
      { when: 'T-1h', what: 'Ice down the beer/tea/water; pat shrimp dry and stage everything by cook order at the burner' },
    ],
    setup: [
      { when: 'T0 -1h', what: 'Place the burner on LEVEL ground away from the house, fill the pot no more than ~2/3, add Old Bay/crab boil, bring to a rolling boil; locate gloves, paddle, and extinguisher' },
      { when: 'T0 -0:20', what: 'Cover the table with newspaper/kraft paper; set out butter, sauces, lemon, paper towels, and shell buckets' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep the burner attended at all times; restock butter, sauce, and lemon on the table; clear shells into buckets' },
      { when: 'T0 +4h', what: 'Cut the propane and let the pot and water cool FULLY before moving; roll up the paper with shells and cobs inside; wrap leftovers; fold tables/chairs; bag trash' },
    ],
  },

  // Day-of "Before the big day" readiness/safety walkthrough — authored for an
  // OUTDOOR propane-pot boil: scalding water/burner + shellfish allergy lead.
  // severity drives ordering; state persists in event.safetyChecked[id].
  dayOfChecklist: [
    { id: 'burner', label: 'Burner + boiling-water safety', detail: 'Burner on LEVEL, stable ground away from the house and overhangs; pot filled no more than ~2/3 so it never boils over the flame. Never leave it unattended. Heat gloves + a long paddle; lift the heavy scalding basket with two hands. Class B extinguisher within reach; full tank + a backup.', severity: 'high' },
    { id: 'allergy', label: 'Shellfish allergy check', detail: 'Shrimp + any crab/clam add-ins are major allergens — a reaction can be anaphylaxis-grade. Ask guests ahead; pull a shellfish-free portion of sausage/corn/potatoes BEFORE the shrimp go in. Know the nearest ER; keep any guest’s epinephrine on hand.', severity: 'high' },
    { id: 'child', label: 'Keep kids + pets back', detail: 'A clear zone around the burner and the scalding pot — assign someone to hold the perimeter.', severity: 'high' },
    { id: 'food', label: 'Food safety', detail: 'Keep shrimp on ice until they drop; serve the boil hot off the table; cold sides on ice, nothing perishable out too long.', severity: 'med' },
    { id: 'weather', label: 'Wind / rain plan', detail: 'A canopy or carport for the burner — open and well ventilated, never enclosed (propane needs air) — and a cover for the eating table.', severity: 'low' },
    { id: 'cooldown', label: 'Pot cool-down + cleanup', detail: 'Let the pot and water cool FULLY before moving; roll the paper up with shells inside; bags and shell buckets staged.', severity: 'low' },
    { id: 'emergency', label: 'Emergency basics', detail: 'First-aid kit (burn care) on hand; know the nearest ER; phones charged.', severity: 'low' },
  ],

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'This playbook is grounded in the Low Country Boil — Frogmore Stew — a one-pot seafood gathering of the coastal Carolina and Georgia Lowcountry, named for the community of Frogmore on St. Helena Island near Beaufort and tied to the foodways of the Gullah-Geechee people, descendants of enslaved Africans of the Sea Islands who shaped the region\'s seafood and rice cooking. The specifics reflect widely-recognized practice: shrimp, smoked sausage, sweet corn, and small red potatoes boiled together under Old Bay or crab-boil seasoning, drained and dumped on a paper-covered table to eat with fingers, with cocktail sauce, butter, hot sauce, and lemon, alongside cold beer, sweet tea, water, and ice. Quantities (~0.5 lb shrimp and ~0.5 lb sausage, 1-2 small red potatoes, and 1-1.5 ears of corn per adult) are common Lowcountry-boil planning rules of thumb, and the staged drop order (potatoes ~15 min, sausage ~5 min, corn ~3 min, shrimp LAST ~2-3 min so they do not turn rubbery) reflects standard recipe sequencing. Propane-burner and boiling-water safety reflects widely-published practice (level stable ground away from structures, do not overfill, never leave unattended, keep children back, heat gloves, a Class B extinguisher, and a full tank with a backup). It is authored respectfully and as established insider practice, honoring its Gullah-Geechee and Lowcountry roots without caricature, and is labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default lowCountryBoil;
