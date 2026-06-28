// Crawfish Boil — Event OS host playbook (data only).
//
// The Louisiana / Gulf-Coast crawfish boil: live crawfish bought by the sack,
// purged and rinsed, then boiled in a big propane pot with a heavy seasoning
// (Zatarain's or Louisiana Fish Fry crab/crawfish boil, cayenne, lemon, salt)
// alongside red potatoes, corn, smoked sausage or andouille, onions, garlic, and
// mushrooms. The boil is cut and the catch SOAKS to pull the seasoning in, then
// it all gets dumped on a paper-covered table — no plates — with cold beer, soda,
// water, and plenty of ice. A long, loose spring afternoon while the crawfish are
// running. Quantities follow common Louisiana boil norms (see `knowledge`),
// authored honestly and labeled `synthesized` until verified. Propane-burner,
// boiling-water, and live-crawfish handling are treated as real risks.
// ESM default export.

const crawfishBoil = {
  type: 'Crawfish Boil',
  vegMain: 'Loaded boiled potatoes, corn & mushroom platter',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A Louisiana crawfish boil in the backyard — live crawfish by the sack, purged and rinsed, boiled in a big propane pot with a heavy seasoning (Zatarain\'s or Louisiana Fish Fry, cayenne, lemon, salt) plus red potatoes, corn, smoked sausage, onions, garlic, and mushrooms, then cut and left to SOAK before it all gets dumped on a paper-covered table — no plates, just cold beer and napkins. The playbook front-loads the math (how many sacks, how big a pot, how much propane), the live-crawfish purge, the soak, and burner/boiling-water safety so the cook can run a long spring afternoon in peace.',
    typicalGuests: { low: 15, default: 25, high: 40 },
    typicalDurationHours: 5,
    leadTimeDays: 14,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 18, high: 38, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The pot gets cut and the catch dumps onto the table — everyone leans in at once.',
    'Someone bites into a perfectly seasoned tail and closes their eyes.',
    'The corn and potatoes are just as good as the crawfish and everyone acts surprised.',
    'A first-timer learns the pinch-and-pull and gets it right — the table cheers.',
    'Late afternoon, the table is a heap of shells, and nobody has moved in an hour.',
  ],

  decisions: [
    { id: 'sacks', label: 'How many sacks of live crawfish?', options: ['1 sack (~30-35 lb)', '2 sacks', '3 sacks', '4+ sacks'], default: '2 sacks', when: 'T-7d', blocks: ['food', 'logistics'], why: 'The whole event sizes off this. Plan ~3-5 lb LIVE crawfish per adult eater (heavy eaters 6-8+). A sack runs ~30-35 lb. 2 sacks (~60-70 lb) feeds roughly a 15-20 person crowd of real eaters. This also sets the pot size and how much propane you burn.' },
    { id: 'cookmethod', label: 'Boil it yourself or order it cooked?', options: ['Boil it yourself (propane pot)', 'Order live + boil yourself', 'Order it boiled by the pound (pickup)'], default: 'Boil it yourself (propane pot)', when: 'T-10d', blocks: ['food', 'logistics'], why: 'Boiling yourself is the tradition and the fun, but it needs the pot, the burner, the propane, and someone running it for hours. Ordering it already boiled by the pound from a seafood place is a real, common shortcut when you don\'t have the rig or the time.' },
    { id: 'potsize', label: 'Pot + burner size', options: ['60-80 qt pot + high-BTU jet burner (1-2 sacks)', '100+ qt pot + jet burner (3+ sacks)', 'Two pots running in shifts'], default: '60-80 qt pot + high-BTU jet burner (1-2 sacks)', when: 'T-7d', blocks: ['logistics'], why: 'You boil ~one sack per pot per batch. A 60-80 qt pot handles a sack at a time; bigger crowds run a 100+ qt pot or two pots in shifts. The burner must be a high-BTU outdoor jet burner — a backyard grill burner won\'t get a full pot to a rolling boil.' },
    { id: 'heat', label: 'Seasoning heat level', options: ['Mild (family / kids)', 'Medium (classic)', 'Hot (Louisiana hot)', 'Two batches — mild + hot'], default: 'Medium (classic)', when: 'T-7d', blocks: ['food'], why: 'The seasoning (Zatarain\'s or Louisiana Fish Fry crab/crawfish boil + cayenne + lemon + salt) carries the whole dish, and heat is personal. A mild-and-hot split keeps kids and tender mouths happy without dialing the whole pot down.' },
    { id: 'sides', label: 'What goes in the pot with the crawfish?', options: ['Red potatoes + corn + smoked sausage', 'Add onions, garlic, mushrooms', 'Add the works (lemons, artichoke, Brussels)'], default: 'Add onions, garlic, mushrooms', when: 'T-7d', blocks: ['food'], why: 'The classics — small red potatoes, corn on the cob, smoked sausage or andouille — boil right alongside. Onions, whole garlic, mushrooms, and halved lemons go in too. The fixings soak up as much seasoning as the crawfish, so most cooks add more than they think.' },
    { id: 'drinks', label: 'Drinks', options: ['Cold beer + soda + water', 'Add a non-alcoholic / kids spread', 'Beer + soda + water + ice tea'], default: 'Cold beer + soda + water', when: 'T-7d', blocks: ['beverage'], why: 'Cold beer is the crawfish-boil drink, with soda, water, and plenty of ice for everybody. It\'s a long afternoon outside in spring — over-buy ice and water, not just beer.' },
  ],

  milestones: [
    { id: 'cb_setdate', name: 'Set date (spring, while crawfish are running), headcount, sacks', offsetDays: 14, owner: 'host', category: 'planning', risk: { ifDelayed: 'Miss the season or mis-size the boil', severity: 'med' } },
    { id: 'cb_source', name: 'Find a live-crawfish source + reserve the sacks', offsetDays: 10, owner: 'host', dependsOn: ['cb_setdate'], category: 'food', risk: { ifDelayed: 'Sacks sell out; price/size swings with the catch', severity: 'high' } },
    { id: 'cb_rig_check', name: 'Check the pot, jet burner, propane & safe boil spot', offsetDays: 7, owner: 'host', dependsOn: ['cb_setdate'], category: 'logistics', risk: { ifDelayed: 'Dead burner or empty tank on boil day', severity: 'high' } },
    { id: 'cb_headcount', name: 'Lock headcount; confirm sack order', offsetDays: 3, owner: 'host', dependsOn: ['cb_source'], category: 'guest', risk: { ifDelayed: 'Order wrong amount of live crawfish', severity: 'med' } },
    { id: 'cb_shop_nonperish', name: 'Buy seasoning, fixings, drinks, ice plan, paper, cleanup', offsetDays: 3, owner: 'host', dependsOn: ['cb_headcount'], category: 'shopping', risk: null },
    { id: 'cb_pickup', name: 'Pick up the LIVE crawfish (day before or morning of)', offsetDays: 1, owner: 'host', dependsOn: ['cb_headcount'], category: 'food', risk: { ifDelayed: 'Crawfish die if held too long/too warm before the boil', severity: 'high' } },
    { id: 'cb_purge', name: 'Purge & rinse the live crawfish; cut fixings; mix seasoning', offsetDays: 0, owner: 'host', dependsOn: ['cb_pickup'], category: 'food', risk: { ifDelayed: 'Gritty crawfish; first pot runs late', severity: 'med' } },
    { id: 'cb_setup', name: 'Set burner on level ground, cover the table, fill & heat the pot', offsetDays: 0, owner: 'host', dependsOn: ['cb_rig_check', 'cb_purge'], category: 'setup', risk: { ifDelayed: 'First pot runs late', severity: 'low' } },
    { id: 'event', name: 'The crawfish boil', offsetDays: 0, owner: 'host', dependsOn: ['cb_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_source', milestoneId: 'cb_source', phase: 'food', label: 'Call seafood markets / crawfish suppliers; reserve sacks; ask price-per-pound, size, and whether they\'re running clean', when: 'T-10d' },
    { id: 't_rig', milestoneId: 'cb_rig_check', phase: 'logistics', label: 'Test-fire the jet burner, check the pot + basket + paddle, weigh/shake the propane tank, pick the LEVEL boil spot away from the house, kids, and traffic', when: 'T-7d' },
    { id: 't_count', milestoneId: 'cb_headcount', phase: 'guest', label: 'Lock the headcount; confirm sacks at ~3-5 lb live crawfish per adult eater (heavy eaters more)', when: 'T-3d' },
    { id: 't_nonperish', milestoneId: 'cb_shop_nonperish', phase: 'shopping', label: 'Boil seasoning (Zatarain\'s / Louisiana Fish Fry), cayenne, salt, lemons, potatoes, corn, sausage, onions, garlic, mushrooms, drinks, paper/newspaper, cleanup', when: 'T-3d' },
    { id: 't_pickup', milestoneId: 'cb_pickup', phase: 'food', label: 'Pick up the LIVE crawfish in the sack; keep cool, damp, and shaded — never sealed/airtight or submerged; boil same day if possible', when: 'T-1d / T0 morning' },
    { id: 't_purge', milestoneId: 'cb_purge', phase: 'food', label: 'Purge the live crawfish in a tub of clean water (cull the dead/crushed), rinse until water runs clear; cut potatoes/corn/sausage/onions; mix the seasoning', when: 'T0 -2:00' },
    { id: 't_heat', milestoneId: 'cb_setup', phase: 'setup', label: 'Set burner on level ground, fill pot ~½-⅔ with water + seasoning, cover table in paper, bring to a ROLLING boil; NEVER leave the pot unattended', when: 'T0 -1:00' },
    { id: 't_boil', milestoneId: 'event', phase: 'food', label: 'Boil potatoes/onions/garlic first, then corn + sausage, then crawfish for ~3-5 min; cut the heat and SOAK ~20-30 min for flavor; dump on the table', when: 'T0' },
    { id: 't_cool', milestoneId: 'event', phase: 'cleanup', label: 'Cut the propane, let the pot/water cool before moving; roll up the paper with the shells, bag it, ice down leftovers, break down the rig', when: 'T0 +5:00' },
  ],

  purchases: [
    { id: 'p_crawfish', item: 'Live crawfish (by the sack, ~30-35 lb/sack)', category: 'food', qtyPerGuest: 4, unit: 'lb', where: ['Seafood market', 'Crawfish supplier / dock', 'Grocery seafood counter (in season)'], unitCostRange: [3, 7], essential: true, buyAt: 'T-1d', note: 'The whole point. Plan ~3-5 lb LIVE per adult eater (heavy eaters 6-8+). A sack is ~30-35 lb. Buy in season (spring) and as close to boil day as possible — they must be ALIVE going into the pot.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~3-5 lb live crawfish/adult eater and ~30-35 lb/sack are common Louisiana boil planning norms.' }, alternatives: ['Shrimp — far cheaper per lb, same boil seasoning treatment', 'Frozen crawfish tails — if live unavailable, no shell-peeling required'] },
    { id: 'p_season', item: 'Crawfish/crab boil seasoning (Zatarain\'s / Louisiana Fish Fry) + cayenne + salt', category: 'food', qtyPerGuest: 0.2, unit: 'lb', where: ['Grocery', 'Seafood market'], unitCostRange: [1.5, 4], essential: true, buyAt: 'T-3d', note: 'The flavor. Powdered or liquid concentrate (or both) + extra cayenne to taste + a cup or so of salt per pot. Plan ~1 lb of boil seasoning per sack as a starting point; the soak does the rest.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~1 lb boil seasoning/sack is a common starting ratio; cooks adjust to taste.' } },
    { id: 'p_lemon', item: 'Lemons (halved into the pot)', category: 'food', qtyPerGuest: 0.25, unit: 'lemon', where: ['Grocery'], unitCostRange: [0.4, 0.8], essential: true, buyAt: 'T-1d', note: 'Halved and squeezed into the boil — brightens the seasoning. 4-6 per pot is typical.' },
    { id: 'p_potatoes', item: 'Small red potatoes', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery'], unitCostRange: [0.8, 1.5], essential: true, buyAt: 'T-1d', note: 'Go in first (longest cook). They drink up seasoning — a boil favorite. ~2 small potatoes/person.', alternatives: ['Yukon gold potatoes — similar texture, usually same price', 'Russet potatoes cut in chunks — cheapest option, absorbs seasoning well'] },
    { id: 'p_corn', item: 'Corn on the cob (halved ears)', category: 'food', qtyPerGuest: 1, unit: 'half-ear', where: ['Grocery'], unitCostRange: [0.3, 0.7], essential: true, buyAt: 'T-1d', note: 'Halved ears go in near the end. Frozen also helps cool the pot before the soak. ~1 half-ear/person and then some.', alternatives: ['Frozen corn on the cob — works fine in the boil, cheaper out of season'] },
    { id: 'p_sausage', item: 'Smoked sausage / andouille', category: 'food', qtyPerGuest: 0.25, unit: 'lb', where: ['Grocery', 'Butcher'], unitCostRange: [3, 6], essential: true, buyAt: 'T-1d', note: 'Cut into chunks; boils alongside and soaks up the seasoning. Andouille is the Louisiana classic.', alternatives: ['Kielbasa — widely available, cheaper than andouille', 'Turkey sausage — budget swap, still smoky'] },
    { id: 'p_aromatics', item: 'Onions, whole garlic heads, mushrooms', category: 'food', qtyPerGuest: 0.3, unit: 'lb', where: ['Grocery'], unitCostRange: [0.6, 1.4], essential: false, buyAt: 'T-1d', note: 'Quartered onions, halved garlic heads, and whole mushrooms in the pot. The mushrooms become a seasoned-soak favorite.' },
    { id: 'p_propane', item: 'Propane (full 20 lb tank + backup)', category: 'logistics', qtyFlat: 1, unit: 'tank', where: ['Hardware store', 'Gas station', 'Propane exchange'], unitCostRange: [18, 30], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a high-BTU jet burner drinks propane bringing a full pot to a rolling boil. Start FULL, keep a backup — a dead tank mid-boil ruins the timing.' },
    { id: 'p_paper', item: 'Newspaper / kraft butcher paper (table cover)', category: 'logistics', qtyFlat: 1, unit: 'roll', where: ['Grocery', 'Hardware store', 'Restaurant supply'], unitCostRange: [6, 15], essential: true, buyAt: 'T-3d', note: 'The boil gets DUMPED on a paper-covered table — no plates. A roll of kraft/butcher paper or stacks of newspaper. Cleanup is just rolling it up with the shells.' },
    { id: 'p_drinks', item: 'Cold beer, soda, water', category: 'beverage', qtyPerGuest: 4, unit: 'drinks', where: ['Grocery', 'Costco/Sam\'s'], unitCostRange: [0.7, 2], essential: true, buyAt: 'T-3d', note: 'Cold beer is the boil drink; soda + water for everyone. It\'s a long, hot afternoon — over-buy water.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~4 drinks/guest over a 5h spring afternoon outdoors.' } },
    { id: 'p_ice', item: 'Ice (drinks + coolers)', category: 'beverage', qtyPerGuest: 2.5, unit: 'lb', where: ['Grocery', 'Gas station', 'Ice house'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY UNDER-BOUGHT. A spring boil burns through ice — ~2.5 lb/guest for cold drinks (more on a hot day).' },
    { id: 'p_napkins', item: 'Paper towels, napkins, trash bags, gloves', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco/Sam\'s'], unitCostRange: [12, 25], essential: true, buyAt: 'T-3d', note: 'Crawfish is a hands-and-shells mess. Stacks of paper towels, plenty of napkins, heavy trash bags, and a roll of gloves for peeling-shy guests.' },
    { id: 'p_cups', item: 'Disposable cups, bowls (for shells / fixings)', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Party store'], unitCostRange: [0.2, 0.6], essential: false, buyAt: 'T-3d', note: 'No plates needed for the dump, but cups for drinks and a few bowls for shells/fixings help.' },
  ],

  rentalsGap: [
    { item: 'Crawfish boil pot (60-100+ qt) with basket + lid + paddle', qtyFlat: 1, note: 'the heart of the rig — borrow or rent if you don\'t own one; the basket lets you lift the whole boil out at once' },
    { item: 'High-BTU outdoor jet burner + stand', qtyFlat: 1, note: 'a backyard grill burner won\'t get a full pot to a rolling boil — needs a propane jet/banjo burner' },
    { item: 'Ice chests / coolers (drinks + holding crawfish)', qtyPerGuest: 0.12, note: 'roughly one large cooler per ~8 guests — plus one to keep the live crawfish cool and shaded' },
    { item: 'Folding tables (the dump table + drinks)', qtyFlat: 2, note: 'a sturdy table to cover in paper for the dump, plus one for drinks; the dump table takes a beating' },
    { item: 'Tubs for purging + a strainer/scoop', qtyFlat: 2, note: 'a big tub to purge/rinse the live crawfish and a long-handled scoop' },
    { item: 'Folding chairs', qtyPerGuest: 0.7, note: 'seating for a long afternoon — borrow if short' },
  ],

  vendors: [
    { category: 'Live crawfish supplier (by the sack)', required: true, altToDIY: 'Buy at a grocery seafood counter in season', when: 'T-10d', costRange: [3, 7], costUnit: 'per lb' },
    { category: 'Boiled-by-the-pound seafood place (skip the rig)', required: false, altToDIY: 'Boil it yourself on a propane pot', when: 'T-7d', costRange: [6, 12], costUnit: 'per lb' },
    { category: 'Pot + jet burner rental', required: false, altToDIY: 'Own or borrow the rig', when: 'T-7d', costRange: [40, 120], costUnit: 'flat' },
    { category: 'Tent / canopy rental (shade)', required: false, altToDIY: 'Own/borrow a pop-up canopy', when: 'T-7d', costRange: [50, 150], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_allergy', trigger: 'A guest with a shellfish allergy at a crawfish boil', severity: 'high', mitigation: 'Crawfish is a major shellfish allergen and a reaction can be anaphylaxis-grade. Ask guests ahead of time; cook a separate portion of potatoes, corn, and sausage BEFORE the crawfish go in and keep it well away from the boil and the dumped table (the shared paper-covered table is unavoidable cross-contact). Know the nearest ER; if anyone carries an epinephrine auto-injector, keep it on hand.' },
    { id: 'r_burner', trigger: 'Burn, scald, or boil-over from the propane burner and big pot of boiling water', severity: 'high', mitigation: 'Set the burner on LEVEL, stable ground well away from the house, deck, fences, and overhangs. Don\'t overfill — water rises hard when the sack and fixings go in. NEVER leave the pot unattended and keep kids and pets well back from the burner and the boiling water. Use the basket and long-handled tools, wear closed shoes and heat gloves, and have a clear path to set hot things down.' },
    { id: 'r_fuel', trigger: 'Propane runs out / jet burner won\'t light mid-boil', severity: 'high', mitigation: 'Test-fire the burner at T-7d; start with a FULL tank and keep a backup on hand — a high-BTU burner empties a tank fast.' },
    { id: 'r_deadcrawfish', trigger: 'Live crawfish die or arrive weak before the boil', severity: 'high', mitigation: 'Buy as close to boil day as possible; keep the sack cool, damp, and shaded — never sealed airtight, never submerged in standing water, never on hot pavement. Boil same day. Cull (throw out) any that are already dead or crushed before they go in the pot.' },
    { id: 'r_gritty', trigger: 'Gritty / muddy crawfish from skipping the purge', severity: 'med', mitigation: 'Purge and rinse in clean water until it runs clear before boiling, and cull the dead ones. (Skip aggressive salt purges, which can stress/kill them — a clean-water rinse is the common practical step.)' },
    { id: 'r_overcook', trigger: 'Overcooked, mushy, hard-to-peel crawfish', severity: 'med', mitigation: 'Boil the crawfish only ~3-5 minutes, then CUT the heat and let them SOAK ~20-30 minutes — the soak both seasons and finishes them gently. Dropping in frozen corn helps cool the pot for the soak.' },
    { id: 'r_supply', trigger: 'Sacks sell out or price/size swings with the catch', severity: 'med', mitigation: 'Reserve sacks early (T-10d) in spring while they\'re running; confirm at T-3d; have a boiled-by-the-pound fallback place in your pocket.' },
    { id: 'r_ice', trigger: 'Run out of ice on a long, warm spring afternoon', severity: 'low', mitigation: 'Over-buy ice (~2.5 lb/guest) and grab more day-of; keep drinks and the live sack in separate coolers.' },
  ],

  contingencies: [
    { id: 'c_burner', when: 'r_burner', plan: 'If the pot boils over or flares: cut the propane and step back — don\'t reach over a boiling-over pot. Lower the heat before adding the sack so it doesn\'t surge. If anyone is scalded, cool the burn under running water and seek care for anything serious.' },
    { id: 'c_fuel', when: 'r_fuel', plan: 'Swap to the backup tank; gas stations and hardware stores do propane exchange. Keep the live crawfish cool and shaded until the burner is back.' },
    { id: 'c_deadcrawfish', when: 'r_deadcrawfish', plan: 'Cull anything dead or crushed before boiling — never boil dead crawfish. If a lot have died, call the supplier (or the boiled-by-the-pound fallback) and adjust the count.' },
    { id: 'c_supply', when: 'r_supply', plan: 'If sacks fall through, switch to a boiled-by-the-pound order from a seafood place and lean harder on the fixings and sides to round out the table.' },
    { id: 'c_overcook', when: 'r_overcook', plan: 'If a batch went long, shorten the next boil and lengthen the soak instead; serve the over-soft batch first and adjust as you go.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-10d', what: 'Reserve the live crawfish sacks with a supplier (spring, while they\'re running)' },
      { when: 'T-3d', what: 'Boil seasoning + cayenne + salt, lemons, potatoes, corn, sausage, onions/garlic/mushrooms, drinks, paper/newspaper, propane (full + backup), napkins/cleanup' },
      { when: 'T-1d / T0 morning', what: 'Pick up the LIVE crawfish; grab last fresh fixings' },
      { when: 'T0', what: 'Ice (a lot) + any last-minute drinks' },
    ],
    preparation: [
      { when: 'T0 -2h', what: 'Purge and rinse the live crawfish in clean water until clear; cull the dead; cut potatoes/corn/sausage/onions; mix the seasoning' },
      { when: 'T0 -1h', what: 'Stage the basket, paddle, long tools, gloves, and the timing order (potatoes → corn/sausage → crawfish → soak)' },
    ],
    setup: [
      { when: 'T0 -1h', what: 'Place the burner on LEVEL ground away from the house and kids, fill the pot ~½-⅔ with water + seasoning, locate gloves and long tools, bring to a ROLLING boil' },
      { when: 'T0 -0:30', what: 'Cover the dump table in paper/newspaper, set the drinks coolers on ice, stack napkins/paper towels and shell bowls' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep the pot attended at all times; pull each boil into the basket; CUT the heat and let it soak before the dump; restock napkins, drinks, and ice' },
      { when: 'T0 +5h', what: 'Cut the propane and let the pot/water cool before moving; roll the paper up with the shells and bag it; ice down leftovers (they\'re great cold); break down the rig and bag trash' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'This playbook is grounded in the Louisiana / Gulf-Coast crawfish-boil tradition — a springtime, community-rooted way of eating that anchors backyards across South Louisiana and the wider Gulf Coast when the crawfish are running. The specifics reflect widely-recognized insider practice: live crawfish bought by the sack, purged and rinsed; a heavy seasoning (Zatarain\'s or Louisiana Fish Fry crab/crawfish boil, cayenne, lemon, salt) carried in a big propane pot; red potatoes, corn, smoked sausage or andouille, onions, garlic, and mushrooms boiled alongside; the short boil and the all-important SOAK; and the catch dumped on a paper-covered table — no plates — with cold beer, soda, water, and lots of ice over a long afternoon. Quantities (~3-5 lb live crawfish per adult eater, ~30-35 lb per sack, ~1 lb seasoning per sack, generous ice and water) are common Louisiana planning rules of thumb that real eaters and the catch both move around. Propane-burner and boiling-water safety reflect widely-published practice (level stable ground away from structures, don\'t overfill, never leave it unattended, keep children back), as does live-crawfish handling (keep cool/damp/shaded, never sealed or submerged, cull and never boil dead crawfish, purge and rinse before the pot). Authored respectfully as established Gulf-Coast home practice — not caricature — and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default crawfishBoil;
