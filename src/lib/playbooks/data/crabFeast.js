// Crab Feast — Event OS host playbook (data only).
//
// The Maryland / DMV (DC–Maryland–Virginia) crab feast: a long, messy
// summer afternoon around newspaper- or brown-paper-covered tables piled
// with STEAMED blue crabs heavily dusted with Old Bay (or J.O.) seasoning.
// Marylanders STEAM their crabs — over water, apple-cider vinegar, and beer
// in a big rack pot — they do not boil them, and the seasoning is the
// identity of the table. Crabs are bought live by the dozen or the bushel
// and by SIZE (mediums, larges, jumbos) from a crab house or seafood
// market. Everyone gets a wooden mallet and a crab knife, a roll of paper
// towels, and dishes of melted butter and vinegar; the classic sides are
// corn on the cob, steamed shrimp, hush puppies, coleslaw, and potato
// salad, washed down with cold beer (Natty Boh is the local can), soda,
// water, and a lot of ice. Then a real cleanup of shell and paper.
// Quantities are grounded in widely-recognized Maryland crab-feast norms
// (see `knowledge`), authored honestly and labeled `synthesized` until a
// foreground verification pass attaches citations. ESM default export.

const crabFeast = {
  type: 'Crab Feast',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A Maryland crab feast — steamed blue crabs dumped hot on a newspaper-covered table, dusted heavy with Old Bay, picked apart with mallets and crab knives over a long, loud summer afternoon. Corn on the cob, steamed shrimp, hush puppies, slaw and potato salad on the side; cold beer, soda, water and a cooler of ice. Marylanders steam their crabs (not boil) and the seasoning is the whole point. The playbook front-loads the one decision that sets everything — steam-them-yourself or order-them-steamed for pickup — then gets the crab count, the pot, the table, and the cleanup right.',
    typicalGuests: { low: 10, default: 18, high: 30 },
    typicalDurationHours: 4,
    leadTimeDays: 10,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 25, high: 60, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The first hot bushel hits the table and everyone grabs a mallet.',
    'Someone cracks a jumbo and it\'s perfect — the whole table reacts.',
    'The Old Bay smell and the cold Natty Boh and everybody is right here.',
    'The table is a mess of shells and paper and nobody wants it to end.',
    'A first-timer picks their first crab and looks up like they understand now.',
  ],

  decisions: [
    { id: 'steam_vs_order', label: 'Steam them yourself or order them steamed (pickup)?', options: ['Steam them myself', 'Order steamed for pickup', 'Buy live, steam in batches'], default: 'Order steamed for pickup', when: 'T-7d', blocks: ['food', 'logistics', 'rental'], why: 'The biggest lever. A crab house will steam and season the crabs so you just pick up hot bushels — easiest for a crowd. Steaming yourself is cheaper and the real tradition, but needs a big rack pot, propane/burner, and someone minding it. Either way Marylanders STEAM, never boil.' },
    { id: 'crab_size', label: 'Crab size & how many', options: ['Mediums (value)', 'Larges (the sweet spot)', 'Jumbos (showpiece)', 'Mixed mediums + larges'], default: 'Larges (the sweet spot)', when: 'T-7d', blocks: ['food'], why: 'Blue crabs are sold by size and by the dozen or bushel, priced live and seasonal. Mediums stretch the budget; larges are the crowd favorite; jumbos are a splurge. Plan ~6–12 crabs per adult picker — a bushel (~5–7 dozen) feeds roughly 8–12.' },
    { id: 'where_buy', label: 'Where to buy — crab house or market?', options: ['Local crab house', 'The Wharf / Maine Ave Fish Market (steam-on-the-barge)', 'Seafood market', 'Waterman / dock direct'], default: 'Local crab house', when: 'T-10d', blocks: ['food'], why: 'A crab house sells live or steamed by the dozen/bushel and knows the day\'s sizes and price. In DC, the Wharf / Maine Ave Fish Market (Jessie Taylor, Captain White\'s — the oldest open-air fish market in the country) sells live blue crabs by the bushel and will steam your order on the barge while you wait. A seafood market is convenient; off the dock is fresh and local if you have the connection. Call ahead — supply and price swing with the season and the catch.' },
    { id: 'sides', label: 'The sides', options: ['Corn + shrimp + slaw + potato salad', 'Corn + slaw only (keep it crab-forward)', 'Full spread (add hush puppies, mac salad, watermelon)'], default: 'Corn + shrimp + slaw + potato salad', when: 'T-5d', blocks: ['food'], why: 'Corn on the cob is the constant; steamed shrimp (also Old Bay) is the classic add; slaw and potato salad round the plate. Keep sides simple — the crabs are the meal and picking takes all afternoon.' },
    { id: 'drinks', label: 'Drinks', options: ['Beer + soda + water + tea', 'Add a non-alcoholic spread for kids/non-drinkers', 'Dry / family-friendly'], default: 'Beer + soda + water + tea', when: 'T-5d', blocks: ['beverage'], why: 'Cold beer is the crab-feast drink — Natty Boh (National Bohemian) is the DMV can. Add soda, water, and iced tea so everyone\'s covered, and plan a lot of ice.' },
  ],

  milestones: [
    { id: 'cf_setdate', name: 'Set date, headcount & the steam-vs-order call', offsetDays: 10, owner: 'host', category: 'planning', risk: { ifDelayed: 'Crab house books up or sizes sell out on a summer weekend', severity: 'med' } },
    { id: 'cf_source', name: 'Pick the crab house / market and check sizes + price', offsetDays: 10, owner: 'host', dependsOn: ['cf_setdate'], category: 'logistics', risk: { ifDelayed: 'No crabs / wrong size on the day; blue-crab price and supply swing seasonally', severity: 'high' } },
    { id: 'cf_invite', name: 'Invite guests & confirm adult pickers vs kids', offsetDays: 7, owner: 'host', dependsOn: ['cf_setdate'], category: 'guest', risk: { ifDelayed: 'Crab count off — pickers eat far more than kids', severity: 'med' } },
    { id: 'cf_reserve', name: 'Reserve / pre-order the crabs (and a pickup time if steamed)', offsetDays: 5, owner: 'host', dependsOn: ['cf_source', 'cf_invite'], category: 'logistics', risk: { ifDelayed: 'Crab house sells out of your size; hot pickup slot gone', severity: 'high' } },
    { id: 'cf_headcount', name: 'Lock headcount & final crab count', offsetDays: 3, owner: 'host', dependsOn: ['cf_invite'], category: 'guest', risk: { ifDelayed: 'Buy too few crabs (or a wasted bushel)', severity: 'med' } },
    { id: 'cf_shop', name: 'Buy seasoning, sides, drinks, table cover, tools & cleanup', offsetDays: 3, owner: 'host', dependsOn: ['cf_headcount'], category: 'shopping', risk: null },
    { id: 'cf_prep', name: 'Make slaw & potato salad, set the table tools & dishes', offsetDays: 1, owner: 'host', dependsOn: ['cf_shop'], category: 'food', risk: null },
    { id: 'cf_pickup_steam', name: 'Pick up steamed crabs OR steam your own', offsetDays: 0, owner: 'host', dependsOn: ['cf_reserve', 'cf_prep'], category: 'food', risk: { ifDelayed: 'Crabs go cold / table waits', severity: 'med' } },
    { id: 'cf_setup', name: 'Cover tables, lay out mallets/knives/butter/vinegar, ice the drinks', offsetDays: 0, owner: 'host', dependsOn: ['cf_prep'], category: 'setup', risk: { ifDelayed: 'Crabs land before the table is ready', severity: 'low' } },
    { id: 'event', name: 'The crab feast', offsetDays: 0, owner: 'host', dependsOn: ['cf_setup', 'cf_pickup_steam'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_source', milestoneId: 'cf_source', phase: 'logistics', label: 'Call a couple of crab houses/markets; ask the day\'s sizes, live vs steamed price per dozen/bushel, and whether to pre-order', when: 'T-10d' },
    { id: 't_invite', milestoneId: 'cf_invite', phase: 'guest', label: 'Invite guests; note who are serious crab pickers vs kids/light eaters (it drives the count)', when: 'T-7d' },
    { id: 't_reserve', milestoneId: 'cf_reserve', phase: 'logistics', label: 'Pre-order the crabs by size and count; if ordering steamed, lock a hot pickup time near the start', when: 'T-5d' },
    { id: 't_count', milestoneId: 'cf_headcount', phase: 'guest', label: 'Lock headcount; figure ~6–12 crabs per adult picker, ~half a bushel per 4–6 pickers, fewer for kids', when: 'T-3d' },
    { id: 't_shop', milestoneId: 'cf_shop', phase: 'shopping', label: 'Buy Old Bay/J.O., apple-cider vinegar, sides, beer/soda/water/tea, butter, paper table cover, mallets & knives, paper towels, cleanup', when: 'T-3d' },
    { id: 't_prep', milestoneId: 'cf_prep', phase: 'food', label: 'Make coleslaw & potato salad; set out mallets, crab knives, bibs, butter & vinegar dishes, the paper-towel rolls', when: 'T-1d' },
    { id: 't_corn', milestoneId: 'cf_setup', phase: 'food', label: 'Steam/boil the corn and (if doing your own) the shrimp; dust shrimp with Old Bay', when: 'T0 -1:00' },
    { id: 't_steam', milestoneId: 'cf_pickup_steam', phase: 'food', label: 'Pick up the hot steamed crabs at your slot, OR steam your own: water + apple-cider vinegar + beer below the rack, layer crabs, heavy Old Bay per layer, steam ~20–30 min until bright red', when: 'T0' },
    { id: 't_setup', milestoneId: 'cf_setup', phase: 'setup', label: 'Cover the tables in newspaper/brown paper, set tools and butter/vinegar, ice the drinks, stage a trash/recycle station and a shell bucket', when: 'T0 -0:30' },
    { id: 't_dump', milestoneId: 'event', phase: 'food', label: 'Dump the hot crabs down the middle of the table, dust with extra Old Bay, and let everyone dig in; refill sides, drinks, and paper towels', when: 'T0' },
    { id: 't_clean', milestoneId: 'event', phase: 'cleanup', label: 'Roll the shell and paper straight off the table into trash bags; bag/double-bag the shell, wash mallets & dishes, store leftovers (pick extra crab meat)', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_crabs', item: 'Live or steamed blue crabs (by size — mediums/larges/jumbos)', category: 'food', qtyPerGuest: 9, unit: 'crab', where: ['Local crab house', 'Seafood market', 'Waterman / dock'], unitCostRange: [2.5, 7], essential: true, buyAt: 'T0', note: 'THE meal. Sold by the dozen or bushel and by size; price is live, seasonal, and swings with the catch — call ahead. ~6–12 crabs per adult picker; a bushel is ~5–7 dozen and feeds ~8–12. Steamed-for-pickup costs more but saves the pot — Jessie Taylor or Captain White\'s at the DC Wharf will steam your bushel in ~25 min while you wait.', provenance: { tier: 'regional-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'Maryland crab-feast norm of ~6–12 crabs/adult picker and a bushel feeding ~8–12; per-crab cost varies widely by size and season.' }, alternatives: ['Steamed shrimp — far cheaper per lb, same Old Bay treatment', 'Snow crab clusters (frozen) — available year-round, no live crab sourcing'] },
    { id: 'p_oldbay', item: 'Old Bay (or J.O.) seasoning — buy extra', category: 'food', qtyPerGuest: 0.05, unit: 'lb', where: ['Grocery', 'Crab house', 'Restaurant supply'], unitCostRange: [4, 9], essential: true, buyAt: 'T-3d', note: 'The identity of the table. Heavy on every layer when steaming AND extra to dust on top and on the shrimp/corn. Buy more than you think — people re-season as they pick.' },
    { id: 'p_vinegar', item: 'Apple-cider vinegar (steam liquid + dipping)', category: 'food', qtyFlat: 1, unit: 'gal', where: ['Grocery'], unitCostRange: [3, 7], essential: true, buyAt: 'T-3d', note: 'Half the steam liquid (with water and/or beer) and also poured into dipping dishes. Vinegar softens the shells and cuts the richness.' },
    { id: 'p_butter', item: 'Butter (for melting) + dipping dishes', category: 'food', qtyPerGuest: 0.1, unit: 'lb', where: ['Grocery'], unitCostRange: [1, 2.5], essential: true, buyAt: 'T-1d', note: 'Melted butter is the dip alongside the vinegar — small bowls down the table.' },
    { id: 'p_corn', item: 'Corn on the cob', category: 'food', qtyPerGuest: 1.2, unit: 'ear', where: ['Grocery', 'Farm stand'], unitCostRange: [0.4, 0.9], essential: true, buyAt: 'T-1d', note: 'The constant side. Summer sweet corn, steamed or boiled, then hit with Old Bay and butter.', alternatives: ['Frozen corn on the cob — cheaper out of season, works fine in the pot'] },
    { id: 'p_shrimp', item: 'Steamed shrimp (Old Bay)', category: 'food', qtyPerGuest: 0.25, unit: 'lb', where: ['Seafood market', 'Crab house', 'Grocery'], unitCostRange: [8, 14], essential: false, buyAt: 'T0', note: 'The classic seafood add-on, steamed in Old Bay like the crabs — order with the crabs or steam your own.' },
    { id: 'p_sides', item: 'Coleslaw, potato salad, hush puppies', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Deli'], unitCostRange: [1.5, 4], essential: true, buyAt: 'T-3d', note: 'Cabbage/carrot for slaw, potatoes for salad; hush puppies optional. Make slaw and potato salad a day ahead so the crab day is simple.', alternatives: ['Deli coleslaw + potato salad — if time is short', 'Bag of chips — cheapest side if budget is very tight'] },
    { id: 'p_beer', item: 'Cold beer (Natty Boh / local lager)', category: 'beverage', qtyPerGuest: 3, unit: 'beer', where: ['Liquor store', 'Grocery', 'Beer distributor'], unitCostRange: [1, 2.5], essential: false, buyAt: 'T-3d', note: 'The crab-feast drink. National Bohemian ("Natty Boh") is the DMV can; a light lager is right with the seasoning. Skip for a dry feast.' },
    { id: 'p_softdrinks', item: 'Soda, water, iced tea', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Grocery', 'Costco/Sam\'s'], unitCostRange: [0.4, 1.2], essential: true, buyAt: 'T-3d', note: 'For kids and non-drinkers and to keep everyone hydrated through a long, salty afternoon.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~3 non-alcoholic drinks/guest over a 4h afternoon.' } },
    { id: 'p_ice', item: 'Ice (coolers + drinks)', category: 'beverage', qtyPerGuest: 2, unit: 'lb', where: ['Grocery', 'Gas station', 'Ice house'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY UNDER-BOUGHT. A hot afternoon and a lot of cans/bottles — ~2 lb/guest for drinks and coolers.' },
    { id: 'p_paper', item: 'Newspaper / brown kraft paper table cover', category: 'decor', qtyFlat: 1, unit: 'roll', where: ['Hardware store', 'Party store', 'Online'], unitCostRange: [8, 20], essential: true, buyAt: 'T-3d', note: 'The signature table. Cover every table thick — at the end you roll the whole mess (shell, paper, scraps) straight into the trash.' },
    { id: 'p_tools', item: 'Wooden mallets + crab knives', category: 'rental', qtyPerGuest: 1, unit: 'set', where: ['Crab house', 'Hardware store', 'Restaurant supply', 'Online'], unitCostRange: [1, 4], essential: true, buyAt: 'T-3d', note: 'A mallet and a crab knife per picker (and a few spares). Crab houses sell cheap mallets by the bag.' },
    { id: 'p_towels', item: 'Paper towels (rolls) + wet wipes', category: 'cleanup', qtyPerGuest: 0.5, unit: 'roll', where: ['Grocery', 'Costco/Sam\'s'], unitCostRange: [1, 2], essential: true, buyAt: 'T-3d', note: 'A roll stood up on every table is part of the setup — crab picking is gloriously messy. Wet wipes for hands.' },
    { id: 'p_bibs', item: 'Crab/seafood bibs (optional)', category: 'decor', qtyPerGuest: 1, unit: 'bib', where: ['Crab house', 'Party store', 'Online'], unitCostRange: [0.2, 0.6], essential: false, buyAt: 'T-3d', note: 'Fun, not required — keeps butter and Old Bay off shirts.' },
    { id: 'p_tableware', item: 'Disposable plates, bowls, cups, napkins', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Costco/Sam\'s', 'Party store'], unitCostRange: [0.3, 1], essential: true, buyAt: 'T-3d', note: 'Sturdy plates for sides; small bowls for butter/vinegar. Most picking happens right on the paper.' },
    { id: 'p_cleanup', item: 'Heavy trash bags (double-bag the shell) + shell bucket', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Hardware store'], unitCostRange: [8, 16], essential: true, buyAt: 'T-3d', note: 'COMMONLY UNDERESTIMATED. Crab shell is heavy, wet, and smells fast — contractor-grade bags, double-bagged, and a shell bucket on the table so scraps don\'t pile.' },
  ],

  rentalsGap: [
    { item: 'Large steam pot (40+ qt) with raised rack/insert', qtyFlat: 1, note: 'only if steaming your own — the rack keeps crabs above the liquid so they STEAM, not boil; borrow if you don\'t own one' },
    { item: 'Propane burner / outdoor cooker + full tank', qtyFlat: 1, note: 'only if steaming your own — a big pot of crabs is an outdoor, high-BTU job' },
    { item: 'Long folding tables', qtyPerGuest: 0.15, note: 'long communal tables are the crab feast — roughly one 8ft table per ~6–8 pickers' },
    { item: 'Coolers', qtyPerGuest: 0.1, note: 'one large cooler per ~10 guests for drinks + ice; a separate cooler keeps steamed crabs hot for pickup transport' },
    { item: 'Folding chairs', qtyPerGuest: 0.9, note: 'people sit and pick for hours — enough seats for everyone, borrow if short' },
  ],

  vendors: [
    { category: 'Crab house (steam & season crabs for pickup)', required: false, altToDIY: 'Buy live and steam your own in a rack pot', when: 'T-5d', costRange: [45, 90], costUnit: 'per dozen' },
    { category: 'Seafood / crab supplier (live by the bushel)', required: false, altToDIY: 'Seafood counter at the grocery', when: 'T-5d', costRange: [150, 400], costUnit: 'per bushel' },
    { category: 'Table & chair rental', required: false, altToDIY: 'Own or borrow folding tables/chairs', when: 'T-7d', costRange: [60, 180], costUnit: 'flat' },
    { category: 'Tent / canopy rental (shade over the table)', required: false, altToDIY: 'Own/borrow a pop-up canopy or use the deck', when: 'T-7d', costRange: [50, 150], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_supply', trigger: 'Crabs sell out, wrong size, or price spikes (seasonal/weather-driven catch)', severity: 'high', mitigation: 'Call crab houses early; pre-order by size and count at T-5d. Blue-crab supply and price swing with the season and the day\'s catch — stay flexible on size (larges vs mediums) and have a backup source.' },
    { id: 'r_count', trigger: 'Run out of crabs (or waste a bushel)', severity: 'med', mitigation: 'Lock headcount at T-3d and count by ADULT PICKERS, not heads — plan ~6–12 crabs/picker, fewer for kids. Order a touch over for the serious pickers; leftover crab meat keeps.' },
    { id: 'r_boil', trigger: 'Crabs come out boiled/waterlogged instead of steamed', severity: 'med', mitigation: 'Keep the liquid (water + vinegar + beer) BELOW the rack so the crabs steam in vapor, not submerged. Season heavy per layer and steam ~20–30 min until bright red; don\'t crowd the pot — work in batches.' },
    { id: 'r_cold', trigger: 'Steamed crabs go cold before the table is ready', severity: 'low', mitigation: 'Time pickup/steam to the START of the feast; transport hot in a cooler or insulated box; have the table covered and tools laid out BEFORE the crabs land.' },
    { id: 'r_shell', trigger: 'Shell trash overwhelms the cleanup / starts to smell', severity: 'med', mitigation: 'Keep a shell bucket on the table during; roll the paper-and-shell straight into heavy contractor bags; double-bag and get it out of the house/heat quickly (it sours fast in summer).' },
    { id: 'r_seafood', trigger: 'A guest has a shellfish allergy', severity: 'high', mitigation: 'Ask ahead. Have a clearly separate non-shellfish plate (corn, slaw, potato salad, a grilled item) and keep it away from the crab/shrimp steam and tools.' },
    { id: 'r_weather', trigger: 'Rain or brutal heat on an outdoor afternoon', severity: 'med', mitigation: 'It\'s a summer event — have a canopy/tent or covered deck for shade and rain, plenty of water, and a backup garage/covered patio.' },
  ],

  contingencies: [
    { id: 'c_supply', when: 'r_supply', plan: 'If your size/source is out: switch sizes (larges⇄mediums), split the order across two crab houses, or pivot to a steamed-shrimp-heavy spread and fewer crabs. Tell guests it\'s market-driven — Marylanders get it.' },
    { id: 'c_count', when: 'r_count', plan: 'Stretch with more shrimp, corn, and sides if crabs run low; if you over-bought, pick the extra meat for crab cakes/dip and send guests home with crabs.' },
    { id: 'c_boil', when: 'r_boil', plan: 'Lower the liquid below the rack and re-steam a fresh batch hotter and shorter; if crabs are waterlogged, pat dry and re-dust heavy with Old Bay.' },
    { id: 'c_shell', when: 'r_shell', plan: 'Stage a second shell bucket and extra bags; do an interim roll-and-bag mid-feast so the table resets clean, and move bagged shell straight outside/to the bin.' },
    { id: 'c_weather', when: 'r_weather', plan: 'Move under the canopy, deck cover, or garage; push the steam pot to a sheltered spot; keep the feast going — a little rain never stopped a crab feast.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-5d', what: 'Pre-order the crabs by size and count; lock a steamed pickup time if ordering steamed; reserve tables/canopy if renting' },
      { when: 'T-3d', what: 'Old Bay/J.O., apple-cider vinegar, sides, beer/soda/water/tea, paper table cover, mallets & knives, paper towels, tableware, trash bags & shell bucket' },
      { when: 'T-1d', what: 'Butter, corn, and any fresh side produce' },
      { when: 'T0', what: 'Pick up the hot steamed crabs and steamed shrimp; buy ice last' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Make coleslaw and potato salad; set out mallets, crab knives, bibs, and the butter/vinegar dishes' },
      { when: 'T0 -1:30', what: 'Steam/boil the corn and shrimp; melt butter; pour vinegar into dipping bowls; if steaming your own crabs, get the pot and liquid ready' },
    ],
    setup: [
      { when: 'T0 -0:30', what: 'Cover the tables thick in newspaper/brown paper, stand a paper-towel roll on each, lay out mallets/knives/butter/vinegar, ice the drinks in coolers' },
      { when: 'T0 -0:10', what: 'Stage the shell bucket(s) and a trash/recycle station within reach of the table; set sides out buffet-style' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep a shell bucket on the table; refill Old Bay, paper towels, drinks, and ice; do an interim roll-and-bag if the shell piles up' },
      { when: 'T0 +4:00', what: 'Roll the paper-and-shell straight off the table into heavy bags, double-bag and move it outside (it sours fast in heat); wash mallets/knives/dishes; pick and store any leftover crab meat; break down tables and coolers' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'This playbook is grounded in the Maryland / DMV (DC–Maryland–Virginia) crab-feast tradition — a regional summer foodway built around the Chesapeake blue crab. The specifics reflect widely-recognized insider practice: crabs bought live by the dozen or the bushel and by SIZE (mediums, larges, jumbos) from a crab house, seafood market, or off the dock, at a price that swings with the season and the catch; crabs STEAMED (the Maryland hallmark — Marylanders do not boil) over water, apple-cider vinegar, and often beer kept below a raised rack, seasoned HEAVY with Old Bay or J.O. on every layer; the table covered in newspaper or brown kraft paper with a wooden mallet, a crab knife, a stood-up roll of paper towels, and small dishes of melted butter and vinegar per picker; classic sides of corn on the cob, steamed (Old Bay) shrimp, hush puppies, coleslaw, and potato salad; cold beer (National Bohemian / "Natty Boh" is the local can) alongside soda, water, iced tea, and a lot of ice; and a real cleanup of heavy, fast-souring shell rolled straight off the paper into double-bagged trash. Quantities (~6–12 crabs per adult picker, a bushel of roughly 5–7 dozen feeding ~8–12, ~1.2 ears corn/guest, ~3 drinks/guest, ~2 lb ice/guest) are common Maryland crab-feast planning rules of thumb and scale with the count of serious PICKERS rather than raw heads. Per-crab cost is left wide because blue-crab pricing is genuinely volatile by size and season. Authored respectfully as established regional practice — celebratory, not caricatured — and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default crabFeast;
