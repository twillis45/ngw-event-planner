// Fish Fry — Event OS host playbook (data only).
//
// The African American Friday (and Saturday-night) fish-fry tradition: home
// gatherings and church/community fundraisers rooted in Black Southern foodways.
// Cornmeal-dredged fried whiting, catfish, or porgies on white bread with hot
// sauce and lemon, classic sides (spaghetti or grits, slaw, hush puppies,
// fries, potato salad), red drink + sweet tea, and an outdoor propane fryer
// out back. Optionally framed as a plates-for-sale fundraiser. Quantities are
// common US norms (see `knowledge`), authored honestly and labeled
// `synthesized` until verified. Hot-oil safety is treated as a real risk.
// ESM default export.

const fishFry = {
  type: 'Fish Fry',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A Friday fish fry in the African American tradition — cornmeal-fried whiting, catfish, or porgies on white bread with hot sauce and lemon, the classic sides (spaghetti or grits, slaw, hush puppies, fries, potato salad), red drink and sweet tea, fried hot and fresh on an outdoor propane fryer. Run it as a relaxed home gathering or as a plates-for-sale fundraiser. The playbook front-loads the fryer, the oil, and hot-oil safety so the cook can fry in peace and feed people right.',
    typicalGuests: { low: 15, default: 35, high: 75 },
    typicalDurationHours: 4,
    leadTimeDays: 14,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 8, high: 18, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The first batch comes out the fryer and the line forms before it hits the table.',
    'Hot fish on white bread with hot sauce — nobody is talking, just eating.',
    'The smell carries down the block and people know exactly what\'s happening.',
    'Someone\'s grandma\'s recipe is on the plate and everyone knows it.',
    'The fryer is still going and nobody has left yet.',
  ],

  decisions: [
    { id: 'framing', label: 'Home gathering or plates-for-sale fundraiser?', options: ['Home gathering', 'Plates-for-sale fundraiser', 'Church / community fundraiser'], default: 'Home gathering', when: 'T-14d', blocks: ['food', 'logistics', 'plate_packaging'], why: 'The biggest lever. A fundraiser adds a plate price, to-go containers, a cash/card box, a serving line, and a target plate count — a home gathering stays loose and family-style.' },
    { id: 'fish', label: 'The fish', options: ['Whiting', 'Catfish', 'Porgies', 'Whiting + catfish mix'], default: 'Whiting + catfish mix', when: 'T-10d', blocks: ['food'], why: 'Whiting is the affordable crowd favorite; catfish is the Deep-South classic; porgies fry up sweet. A mix lets people pick. All get a seasoned cornmeal dredge.' },
    { id: 'starch', label: 'The starch side — spaghetti or grits?', options: ['Spaghetti (red sauce)', 'Grits', 'Both', 'Fries only'], default: 'Spaghetti (red sauce)', when: 'T-10d', blocks: ['food'], why: 'Fried fish and spaghetti is the signature Black-Southern pairing; grits is the breakfast-fish tradition. Either way the white bread stays — it makes the fish sandwich.' },
    { id: 'drinks', label: 'Drinks', options: ['Sweet tea + red drink + soda + water', 'Add a grown section (beer/brown liquor)', 'Family-friendly / dry'], default: 'Sweet tea + red drink + soda + water', when: 'T-7d', blocks: ['beverage'], why: 'Sweet tea and red drink are the table. A grown section for the adults is optional; a fundraiser usually stays dry to keep it church-friendly.' },
    { id: 'cooklocation', label: 'Where the fryer goes', options: ['Backyard / driveway', 'Carport / open garage (door up)', 'Church lot / pavilion'], default: 'Backyard / driveway', when: 'T-7d', blocks: ['logistics'], why: 'The propane fryer lives OUTDOORS on level ground, well away from the house. This decision sets the safe spot before fry day.' },
  ],

  milestones: [
    { id: 'ff_setdate', name: 'Set date, headcount, framing (gathering vs fundraiser)', offsetDays: 14, owner: 'host', category: 'planning', risk: { ifDelayed: 'Plate count / target unknown', severity: 'low' } },
    { id: 'ff_spread_word', name: 'Spread the word / sell plates / take pre-orders', offsetDays: 10, owner: 'host', dependsOn: ['ff_setdate'], category: 'guest', risk: { ifDelayed: 'Under-sold plates or wrong fish quantity', severity: 'med' } },
    { id: 'ff_fryer_check', name: 'Check the fryer, propane, oil & safe fry spot', offsetDays: 7, owner: 'host', dependsOn: ['ff_setdate'], category: 'logistics', risk: { ifDelayed: 'Dead burner or empty tank on fry day', severity: 'high' } },
    { id: 'ff_headcount', name: 'Lock headcount / plate count', offsetDays: 3, owner: 'host', dependsOn: ['ff_spread_word'], category: 'guest', risk: { ifDelayed: 'Buy wrong amount of fish', severity: 'med' } },
    { id: 'ff_shop_nonperish', name: 'Buy oil, cornmeal, seasoning, drinks, containers, cleanup', offsetDays: 3, owner: 'host', dependsOn: ['ff_headcount'], category: 'shopping', risk: null },
    { id: 'ff_shop_fish', name: 'Buy the fish + fresh sides produce', offsetDays: 1, owner: 'host', dependsOn: ['ff_headcount'], category: 'shopping', risk: { ifDelayed: 'Sold-out fish; fish should be fresh, not sitting', severity: 'med' } },
    { id: 'ff_prep', name: 'Brine/season fish, make slaw + potato salad, set the dredge', offsetDays: 0, owner: 'host', dependsOn: ['ff_shop_fish'], category: 'food', risk: null },
    { id: 'ff_setup', name: 'Set fryer on level ground, heat oil, set serving line', offsetDays: 0, owner: 'host', dependsOn: ['ff_fryer_check', 'ff_prep'], category: 'setup', risk: { ifDelayed: 'First plates run late', severity: 'low' } },
    { id: 'event', name: 'The fish fry', offsetDays: 0, owner: 'host', dependsOn: ['ff_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_word', milestoneId: 'ff_spread_word', phase: 'guest', label: 'Put the word out; if selling plates, set price + take pre-orders and a target count', when: 'T-10d' },
    { id: 't_fryer', milestoneId: 'ff_fryer_check', phase: 'logistics', label: 'Test-fire the burner, weigh/shake the propane tank, pick the level fry spot away from the house, locate the fire extinguisher', when: 'T-7d' },
    { id: 't_count', milestoneId: 'ff_headcount', phase: 'guest', label: 'Lock the plate/head count; plan ~0.5 lb fish per person', when: 'T-3d' },
    { id: 't_nonperish', milestoneId: 'ff_shop_nonperish', phase: 'shopping', label: 'Oil (a lot), cornmeal, seasoning, hot sauce, lemons, white bread, drinks, to-go containers, foil, cleanup', when: 'T-3d' },
    { id: 't_fish', milestoneId: 'ff_shop_fish', phase: 'shopping', label: 'Buy fresh whiting/catfish/porgies + slaw cabbage, potatoes, sides produce', when: 'T-1d' },
    { id: 't_season', milestoneId: 'ff_prep', phase: 'food', label: 'Season/soak the fish; set up the seasoned-cornmeal dredge station; make slaw, potato salad, spaghetti sauce ahead', when: 'T-1d evening' },
    { id: 't_heatoil', milestoneId: 'ff_setup', phase: 'setup', label: 'Set fryer on level ground, fill oil to the line (never over), bring to ~350°F; NEVER leave it unattended', when: 'T0 -1:00' },
    { id: 't_fry', milestoneId: 'event', phase: 'food', label: 'Fry in small batches hot and fresh; hold on a sheet-pan rack; keep the line moving', when: 'T0' },
    { id: 't_cooloil', milestoneId: 'event', phase: 'cleanup', label: 'Cut the propane, let the oil cool FULLY before moving it, strain/store or dispose of oil, wrap leftovers, bag trash', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_fish', item: 'Fresh fish (whiting, catfish, porgies)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Seafood market', 'Grocery', 'Asian/ethnic market'], unitCostRange: [3, 7], essential: true, buyAt: 'T-1d', note: 'The whole point. ~0.5 lb/person whole or filleted. Whiting is the value pick; catfish the classic.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~0.5 lb fish/guest fish-fry serving heuristic.' }, alternatives: ['Tilapia — cheapest white fish at most groceries', 'Pollock or swai — budget-friendly, fries clean', 'Frozen fish fillets (bulk bag) — cheaper per lb if fresh sold out'] },
    { id: 'p_cornmeal', item: 'Cornmeal / fish fry breading + flour', category: 'food', qtyPerGuest: 0.15, unit: 'lb', where: ['Grocery'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-3d', note: 'Seasoned cornmeal dredge is the tradition. A self-rising cornmeal "fish fry" mix works too.' },
    { id: 'p_season', item: 'Seasoning (salt, pepper, garlic, paprika, Cajun/seasoned salt)', category: 'food', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 18], essential: true, buyAt: 'T-3d', note: 'Season the fish AND the cornmeal. Lawry\'s / Old Bay / Slap Ya Mama all show up at fish fries.' },
    { id: 'p_hotsauce', item: 'Hot sauce + fresh lemons', category: 'food', qtyPerGuest: 0.15, unit: 'serving', where: ['Grocery'], unitCostRange: [0.3, 0.8], essential: true, buyAt: 'T-3d', note: 'NON-NEGOTIABLE. Hot sauce (Louisiana/Crystal/Texas Pete) and a squeeze of lemon over the fish — every plate. In the DMV, mambo/mumbo sauce is the carryout dip for the fish and fries.' },
    { id: 'p_bread', item: 'White bread (loaves)', category: 'food', qtyPer: 10, qtyFlat: 1, unit: 'loaf', where: ['Grocery'], unitCostRange: [2, 4], essential: true, buyAt: 'T-1d', note: 'White bread makes the fish into a sandwich — soaks the grease, holds the hot sauce. A fish-fry constant.' },
    { id: 'p_starch', item: 'Spaghetti + red sauce OR grits', category: 'food', qtyPerGuest: 0.25, unit: 'lb', where: ['Grocery'], unitCostRange: [0.5, 1.2], essential: true, buyAt: 'T-3d', note: 'Fried fish + spaghetti is the signature pairing; grits the breakfast-fish version.', alternatives: ['Plain white rice — cheaper than spaghetti, quick to cook', 'Instant grits — budget option, especially for breakfast-style fish fry'] },
    { id: 'p_sides', item: 'Coleslaw, potato salad, hush puppy mix, fries', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery'], unitCostRange: [1.5, 3.5], essential: true, buyAt: 'T-1d', note: 'Cabbage/carrot for slaw, potatoes for salad + fries, cornmeal hush puppy batter (fry the puppies in the same oil between fish batches).', alternatives: ['Pre-made deli coleslaw — if short on time', 'Frozen fries — cheaper than fresh-cut, still crowd-pleasing'] },
    { id: 'p_oil', item: 'Frying oil (peanut or vegetable)', category: 'logistics', qtyPerGuest: 0.2, unit: 'qt', where: ['Costco/Sam\'s', 'Grocery', 'Restaurant supply'], unitCostRange: [3, 6], essential: true, buyAt: 'T-3d', note: 'LARGE quantity — a 30-qt pot takes 3-4 gal. Peanut oil fries clean and high; vegetable is the budget pick. Buy extra; do not run dry mid-fry.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'Outdoor fish-fryer oil volume scales with batches; ~0.2 qt/guest is a planning estimate, not a fill line.' } },
    { id: 'p_propane', item: 'Propane (full 20 lb tank + backup)', category: 'logistics', qtyFlat: 1, unit: 'tank', where: ['Hardware store', 'Gas station', 'Propane exchange'], unitCostRange: [18, 30], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a half tank dies mid-fry. Start full, keep a backup.' },
    { id: 'p_extinguisher', item: 'Fire extinguisher (Class B/K) + heavy gloves', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Hardware store', 'Amazon'], unitCostRange: [25, 60], essential: true, buyAt: 'T-3d', note: 'SAFETY: a grease fire is NOT put out with water. Class B/K extinguisher within arm\'s reach, plus a metal lid to smother. Long-handled tools + heat gloves.' },
    { id: 'p_drinks', item: 'Sweet tea, red drink, soda, water', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Grocery', 'Costco/Sam\'s'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-3d', note: 'Sweet tea + red drink (red punch/Big Red/hibiscus) anchor the table; soda + water round it out.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~3 drinks/guest over a 4h gathering.' } },
    { id: 'p_ice', item: 'Ice (drinks + coolers)', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest for cold drinks.' },
    { id: 'p_containers', item: 'To-go plate containers + foil (fundraiser/leftovers)', category: 'rental', qtyPerGuest: 1, unit: 'container', where: ['Restaurant supply', 'Costco/Sam\'s', 'Party store'], unitCostRange: [0.2, 0.6], essential: true, buyAt: 'T-3d', note: 'Hinged foam/3-compartment to-go boxes are the fundraiser plate; also handle leftovers at a home fry.' },
    { id: 'p_tableware', item: 'Disposable plates, cups, napkins, cutlery', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Costco/Sam\'s', 'Party store'], unitCostRange: [0.3, 1], essential: true, buyAt: 'T-3d' },
    { id: 'p_cleanup', item: 'Trash bags, paper towels, heavy foil, oil-disposal jug', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Hardware store'], unitCostRange: [10, 20], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a sealable jug for cooled used oil (don\'t pour grease down the drain) + foil to wrap plates.' },
  ],

  rentalsGap: [
    { item: 'Outdoor propane fryer (30 qt) + stand + thermometer', qtyFlat: 1, note: 'the heart of the setup — borrow if you don\'t own one; must have a working thermometer' },
    { item: 'Folding tables (frying station + serving line + drinks)', qtyFlat: 3, note: 'one for the fryer/dredge, one for the line, one for drinks' },
    { item: 'Sheet pans + wire racks', qtyFlat: 4, note: 'drain and hold fried fish hot without going soggy' },
    { item: 'Coolers', qtyPerGuest: 0.1, note: 'roughly one large cooler per ~10 guests for drinks + ice' },
    { item: 'Folding chairs', qtyPerGuest: 0.7, note: 'seating — borrow if short' },
  ],

  vendors: [
    { category: 'Fish / seafood supplier (bulk fresh fish)', required: false, altToDIY: 'Buy at the grocery seafood counter', when: 'T-7d', costRange: [3, 7], costUnit: 'per lb' },
    { category: 'Fryer + table rental', required: false, altToDIY: 'Own or borrow the fryer', when: 'T-7d', costRange: [40, 120], costUnit: 'flat' },
    { category: 'Tent / canopy rental (shade over the line)', required: false, altToDIY: 'Own/borrow a pop-up canopy', when: 'T-7d', costRange: [50, 150], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_hotoil', trigger: 'Hot-oil burn, overflow, or grease fire from the propane fryer', severity: 'high', mitigation: 'Set the fryer on LEVEL ground well away from the house, deck, and overhangs. Never overfill (oil rises when fish goes in). NEVER leave it unattended, and keep kids and pets back. Keep a Class B/K extinguisher and a metal lid within reach — water makes a grease fire worse. Use long tools and heat gloves; pat fish dry before it hits the oil.' },
    { id: 'r_fuel', trigger: 'Propane runs out / burner won\'t light mid-fry', severity: 'high', mitigation: 'Test-fire the burner at T-7d; start with a FULL tank and a backup on hand.' },
    { id: 'r_undersold', trigger: 'Fundraiser plates under-sell or no-show', severity: 'med', mitigation: 'Take pre-orders + pre-pay where possible; set a realistic target; plan to sell walk-up and to-go plates to clear extras.' },
    { id: 'r_fishqty', trigger: 'Run out of fish (or buy way too much)', severity: 'med', mitigation: 'Lock the count at T-3d; plan ~0.5 lb/person; buy fresh at T-1d so it isn\'t sitting.' },
    { id: 'r_soggy', trigger: 'Fish goes soggy / cold holding for a crowd', severity: 'low', mitigation: 'Fry in small batches, hold on wire racks (not stacked on paper), keep the line moving so fish goes out hot.' },
    { id: 'r_oildisposal', trigger: 'Hot oil moved too soon / poured down the drain', severity: 'med', mitigation: 'Let oil cool FULLY (hours) before moving; strain to reuse or seal in a jug for disposal — never the sink.' },
  ],

  contingencies: [
    { id: 'c_hotoil', when: 'r_hotoil', plan: 'If oil flares: cut the propane and smother with a metal lid or the Class B/K extinguisher — NEVER water. If overfilling, stop adding fish and let the level settle. If anyone is burned, cool with running water and seek care.' },
    { id: 'c_fuel', when: 'r_fuel', plan: 'Swap to the backup tank; gas stations and hardware stores do propane exchange. Keep fish on ice until the burner is back.' },
    { id: 'c_undersold', when: 'r_undersold', plan: 'Open up walk-up + to-go plates, post in the group chat, and box extras to sell or send home with folks.' },
    { id: 'c_oildisposal', when: 'r_oildisposal', plan: 'Leave the pot to cool overnight in a safe spot; strain through a coffee filter to reuse, or funnel into a sealed jug for trash/recycling drop-off.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Oil (large qty), cornmeal/breading, seasoning, hot sauce, lemons, starch, drinks, propane, extinguisher, to-go containers, tableware, cleanup kit' },
      { when: 'T-1d', what: 'Fresh fish + slaw/potato/sides produce + white bread' },
      { when: 'T0', what: 'Ice + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Season/soak the fish; make slaw, potato salad, and spaghetti sauce ahead; set up the seasoned-cornmeal dredge' },
      { when: 'T0 -2h', what: 'Cut fish to size, pat dry, stage the dredge station and hot-hold racks' },
    ],
    setup: [
      { when: 'T0 -1h', what: 'Place the fryer on LEVEL ground away from the house, fill oil to the line, locate the extinguisher + metal lid, heat oil to ~350°F' },
      { when: 'T0 -0:30', what: 'Set the serving line (fish, bread, sides, hot sauce, lemon), drinks table on ice, to-go containers stacked' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep the fryer attended at all times; box to-go plates; restock bread, hot sauce, and lemon on the line' },
      { when: 'T0 +4h', what: 'Cut the propane and let oil cool FULLY before moving; strain/store or jug used oil (never the drain); wrap leftovers; fold tables/chairs; bag trash' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'This playbook is grounded in the African American fish-fry tradition — a Black Southern foodway carried into home gatherings, church suppers, and community fundraisers, and shifted toward Friday in many cities. The specifics reflect widely-recognized insider practice: cornmeal-dredged whiting, catfish, or porgies served on white bread with hot sauce and lemon; spaghetti-or-grits, slaw, hush puppies, fries, and potato salad; sweet tea and red drink; and the outdoor propane fryer with a large quantity of peanut or vegetable oil. Quantities (~0.5 lb fish/guest, ~2 slices bread/guest, ~3 drinks/guest, and a large oil volume that scales with batches) are common US planning rules of thumb. Hot-oil and propane-fryer safety reflects widely-published fire-safety practice (level ground away from structures, never overfill, never leave unattended, keep children back, Class B/K extinguisher and a smothering lid, never water on a grease fire). Authored respectfully as established insider practice and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default fishFry;
