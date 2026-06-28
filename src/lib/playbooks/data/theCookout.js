// The Cookout — Event OS host playbook (data only).
//
// THE COOKOUT: the communal African American backyard cookout/function — a
// cultural institution, not just a barbecue. Grill-forward proteins run by a
// named GRILL MASTER, a full SPREAD of soul-food sides, desserts, a red drink
// for everybody plus a section for grown folks, music that is not optional,
// the spades table, shade and seating for every age including the elders, a
// long all-day timeline, and to-go plates because everybody makes a plate to
// take home. NO venue — it's the host's yard/family space.
//
// Authored in the celebratory, insider-grounded lens of Carla Hall, Marcus
// Samuelsson, Kardea Brown, Sunny Anderson, Tabitha Brown, and the B. Smith
// standard of gracious Black hosting. Quantities are grounded in common US
// cookout + soul-food norms (see `knowledge`) and labeled `synthesized` until
// a verification pass attaches citations. No fabricated sources. ESM default
// export.

const theCookout = {
  type: 'The Cookout',
  vegMain: 'Grilled portobello burgers + veggie skewers',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',

  meta: {
    summary:
      'The Cookout — the communal African American backyard function. A grill master works ribs/chicken/burgers/dogs/links while a full spread of sides (baked mac & cheese, potato salad, baked beans, collard greens, cornbread, slaw) and desserts (banana pudding, pound cake, peach cobbler) carry the table. A red drink for everybody, a grown-folks section, music that is essential, the spades table, and shade + seating for every age including the elders. It runs all day and everybody makes a plate to take home. This playbook front-loads protein, the spread, ice, seating, and to-go containers so the host can actually be present.',
    typicalGuests: { low: 20, default: 40, high: 80 },
    typicalDurationHours: 7,
    leadTimeDays: 21,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 15, high: 35, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The grill master pulls the ribs and the whole yard smells right.',
    'The spades table gets loud and the whole cookout hears it.',
    'The elders find their shade and their plates and settle in — you did your job.',
    'Somebody\'s playlist drops a song that gets everyone up at the same time.',
    'To-go plates go out at the end and nobody leaves without one.',
  ],

  decisions: [
    {
      id: 'grill_master',
      label: 'Who is running the grill?',
      options: ['Host grills', 'Designated grill master (uncle / family pitmaster)', 'Hire a pitmaster / caterer'],
      default: 'Designated grill master (uncle / family pitmaster)',
      when: 'T-14d',
      blocks: ['food', 'fuel'],
      why: 'The grill master is a real, named role — the person trusted with the meat. Naming them early sets who buys fuel, who fires up the pit, and frees the host to host. At scale (40+) one person on the grill all day is a lot; confirm a backup.',
    },
    {
      id: 'cooking_model',
      label: 'Host cooks the spread, or potluck?',
      options: ['Host cooks everything', 'Potluck — assign dishes', 'Host does meat + key sides, family brings the rest'],
      default: 'Host does meat + key sides, family brings the rest',
      when: 'T-14d',
      blocks: ['food'],
      why: 'The single biggest effort lever. The cookout runs on a coordinated spread — and on trust: people bring the dish they are KNOWN for, and the potato salad is claimed by the one person everybody trusts to make it. Assign on purpose so you get one great version of each side, not three mediocre potato salads and no greens.',
    },
    {
      id: 'drinks',
      label: 'Drinks — family + grown folks',
      options: ['Red drink + soda + water (family-friendly)', 'Add a grown-folks section (brown liquor + mixers, beer)', 'Full bar + punch'],
      default: 'Add a grown-folks section (brown liquor + mixers, beer)',
      when: 'T-10d',
      blocks: ['beverage'],
      why: 'A cookout needs a red drink (Kool-Aid / punch), soda, and plenty of water for everybody — kids and elders included — AND a clearly separate grown-folks section (brown liquor + mixers, beer). Keeping them separate keeps it family-safe and lets the adults have theirs.',
    },
    {
      id: 'music',
      label: 'Music — DJ or playlist',
      options: ['Curated playlist + good speaker', 'Hire a DJ', 'Designate a family DJ on the aux'],
      default: 'Curated playlist + good speaker',
      when: 'T-10d',
      blocks: ['logistics'],
      why: 'Music is not optional — it is half of what makes it a cookout. Old-school R&B and soul (Frankie Beverly & Maze is practically required), the line dances (Electric Slide, Cupid Shuffle, Cha Cha Slide), and grown-folks slow jams. In the DMV (DC/Maryland/Virginia), a Go-Go set or a live band — Chuck Brown, "the pocket," call-and-response — is the homegrown heartbeat and reads the cookout better than a DJ. Decide whether you are renting a DJ/band or building a real playlist now, and protect the aux.',
    },
    {
      id: 'shade_seating',
      label: 'Shade + seating for every age',
      options: ['Existing patio/yard shade', 'Pop-up canopies + chairs', 'Rent tent + tables + chairs', 'Reserve a park shelter'],
      default: 'Pop-up canopies + chairs',
      when: 'T-10d',
      blocks: ['rental'],
      why: 'Everybody from the babies to the elders needs somewhere to sit in the shade. Comfortable seating for the elders is a point of respect, not an afterthought — and the spades table needs its own setup.',
    },
  ],

  milestones: [
    { id: 'co_setdate', name: 'Set date, headcount, name the grill master', offsetDays: 21, owner: 'host', category: 'planning', risk: { ifDelayed: 'No grill master locked; weather window unknown', severity: 'med' } },
    { id: 'co_spread', name: 'Plan the spread + assign dishes (who brings what)', offsetDays: 14, owner: 'host', dependsOn: ['co_setdate'], category: 'planning', risk: { ifDelayed: 'Duplicate sides, missing greens/mac, untrusted potato salad', severity: 'med' } },
    { id: 'co_invite', name: 'Spread the word + confirm dish assignments + drinks plan', offsetDays: 12, owner: 'host', dependsOn: ['co_spread'], category: 'guest', risk: { ifDelayed: 'Wrong headcount, gaps in the spread', severity: 'med' } },
    { id: 'co_rentals', name: 'Lock shade, seating, tables, DJ/playlist', offsetDays: 10, owner: 'host', dependsOn: ['co_invite'], category: 'logistics', risk: { ifDelayed: 'No shade for elders, no music', severity: 'med' } },
    { id: 'co_headcount', name: 'Firm headcount + weather check', offsetDays: 3, owner: 'host', dependsOn: ['co_invite'], category: 'guest', risk: { ifDelayed: 'Wrong protein quantity; no rain plan', severity: 'high' } },
    { id: 'co_shop_nonperish', name: 'Buy drinks, fuel, ice plan, disposables, to-go containers, cleanup', offsetDays: 3, owner: 'host', dependsOn: ['co_headcount'], category: 'shopping', risk: null },
    { id: 'co_shop_meat', name: 'Buy proteins + spread groceries', offsetDays: 2, owner: 'grill master', dependsOn: ['co_headcount'], category: 'shopping', risk: { ifDelayed: 'Sold-out ribs/chicken; no time to season', severity: 'high' } },
    { id: 'co_prep', name: 'Season meat overnight; cook the spread', offsetDays: 1, owner: 'host', dependsOn: ['co_shop_meat'], category: 'food', risk: { ifDelayed: 'Meat under-seasoned; sides not ready by go-time', severity: 'high' } },
    { id: 'co_setup', name: 'Set up grill, coolers + ice, canopies, seating, spades + music', offsetDays: 0, owner: 'host', dependsOn: ['co_shop_nonperish', 'co_prep'], category: 'setup', risk: null },
    { id: 'event', name: 'The Cookout', offsetDays: 0, owner: 'host', dependsOn: ['co_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_grillmaster', milestoneId: 'co_setdate', phase: 'planning', label: 'Name the grill master out loud; confirm they are in and have a backup', when: 'T-21d' },
    { id: 't_spread', milestoneId: 'co_spread', phase: 'planning', label: 'Map the spread: meat + mac & cheese, potato salad, baked beans, greens, cornbread, slaw, desserts — assign each to the person known for it', when: 'T-14d' },
    { id: 't_invite', milestoneId: 'co_invite', phase: 'guest', label: 'Spread the word (group text / flyer); lock who is bringing what; confirm the potato salad is claimed by the trusted hands', when: 'T-12d' },
    { id: 't_music', milestoneId: 'co_rentals', phase: 'logistics', label: 'Book the DJ or build the playlist (old-school R&B, line dances, grown-folks slow jams); test the speaker', when: 'T-10d' },
    { id: 't_seating', milestoneId: 'co_rentals', phase: 'logistics', label: 'Confirm canopies, chairs, tables; reserve a shaded, comfortable spot for the elders and a dedicated spades table', when: 'T-10d' },
    { id: 't_weather', milestoneId: 'co_headcount', phase: 'guest', label: 'Check the forecast; firm the headcount; confirm shade/rain plan', when: 'T-3d' },
    { id: 't_nonperish_shop', milestoneId: 'co_shop_nonperish', phase: 'shopping', label: 'Drinks (red drink mix, soda, water, grown-folks section), fuel, disposables, foil pans, to-go containers, trash bags', when: 'T-3d' },
    { id: 't_meat_shop', milestoneId: 'co_shop_meat', phase: 'shopping', label: 'Grill master buys ribs, chicken, burgers, dogs, links + the spread groceries', when: 'T-2d' },
    { id: 't_season', milestoneId: 'co_prep', phase: 'food', label: 'Season / marinate the meat overnight; start slow-cooked items (greens, beans, ribs prep)', when: 'T-1d evening' },
    { id: 't_cook_spread', milestoneId: 'co_prep', phase: 'food', label: 'Cook the make-ahead spread: baked mac & cheese, potato salad, beans, greens, desserts', when: 'T-1d / T0 morning' },
    { id: 't_setup', milestoneId: 'co_setup', phase: 'setup', label: 'Set up canopies + seating, coolers + ice, food + drink tables, spades table, music; light the pit early', when: 'T0 -2:00' },
    { id: 't_grill', milestoneId: 'event', phase: 'food', label: 'Grill master fires the pit and works batches all afternoon; elders served first; bless the food before the plates go', when: 'T0' },
    { id: 't_togo', milestoneId: 'event', phase: 'food', label: 'Set out foil pans + to-go containers so everybody can make a plate to take home', when: 'T0 +4:00' },
    { id: 't_cleanup', milestoneId: 'event', phase: 'cleanup', label: 'Cool + scrape the grill, pack leftovers into to-go pans, bag trash + recycling, fold canopies/chairs', when: 'T0 +7:00' },
  ],

  purchases: [
    { id: 'p_ribs', item: 'Ribs (racks)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco', 'Butcher'], unitCostRange: [4, 8], essential: true, buyAt: 'T-1d', note: 'The centerpiece for the grill master. Bone-in runs heavy — plan ~half a rack of appetite per serious eater.', alternatives: ['Pork shoulder — cheaper, same smoke time, easy to pull for sandwiches', 'Bone-in chicken thighs — budget-friendly swap, still dark & smoky'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'Bone-in BBQ ~1 lb/person; cookouts spread protein across several meats so each meat type is portioned down.' } },
    { id: 'p_chicken', item: 'Chicken (legs/thighs/quarters)', category: 'food', qtyPerGuest: 0.45, unit: 'lb', where: ['Grocery', 'Costco', 'Butcher'], unitCostRange: [2, 5], essential: true, buyAt: 'T-1d', note: 'Barbecued/grilled chicken is a cookout staple — dark meat holds up on the grill.', alternatives: ['Whole chicken halved — cheaper per lb than quarters', 'Chicken drumsticks — lowest cost per lb, kid-friendly'] },
    { id: 'p_burgers_dogs', item: 'Burgers, hot dogs + links (sausage)', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery', 'Costco'], unitCostRange: [3, 6], essential: true, buyAt: 'T-1d', note: 'Burgers, dogs, and links round out the grill and feed the kids and the early plates. In the DMV, throw half-smokes (the DC sausage, Ben\'s Chili Bowl style) on the grill.', alternatives: ['Turkey dogs — budget swap, same grill time', 'Plant-based patties — if sold out of beef, widely available'] },
    { id: 'p_buns', item: 'Burger + hot dog buns / bread', category: 'food', qtyPerGuest: 2.5, unit: 'buns', where: ['Grocery', 'Bakery'], unitCostRange: [0.3, 0.6], essential: true, buyAt: 'T-1d', alternatives: ['Sliced white bread — cheaper standby for dogs and links', 'Hawaiian rolls — slightly pricier but crowd-pleaser upgrade'] },
    { id: 'p_mac', item: 'Baked mac & cheese ingredients (or pans)', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery'], unitCostRange: [2, 4], essential: true, buyAt: 'T-2d', note: 'Baked, not stovetop — this is a flagship side, not a filler.', alternatives: ['Store-bought baked mac pan (Costco/Walmart) — if time is short', 'Stovetop mac & cheese — faster but not the same; last resort only'] },
    { id: 'p_potato_salad', item: 'Potato salad ingredients', category: 'food', qtyPerGuest: 0.35, unit: 'lb', where: ['Grocery'], unitCostRange: [1.5, 3], essential: true, buyAt: 'T-2d', note: 'Claimed by the trusted hands — assign it to the one person whose potato salad everybody actually eats.', alternatives: ['Deli potato salad — if the trusted hands aren\'t available', 'Macaroni salad — similar cold starch role, easier to make in bulk'] },
    { id: 'p_beans', item: 'Baked beans ingredients', category: 'food', qtyPerGuest: 0.3, unit: 'lb', where: ['Grocery'], unitCostRange: [1, 2.5], essential: true, buyAt: 'T-2d', alternatives: ['Canned baked beans (Bush\'s) — near-zero prep, dress them up with bacon + brown sugar', 'Black-eyed peas — budget swap, takes same pot time'] },
    { id: 'p_greens', item: 'Collard greens (+ smoked turkey/ham hock)', category: 'food', qtyPerGuest: 0.3, unit: 'lb', where: ['Grocery'], unitCostRange: [1.5, 3.5], essential: true, buyAt: 'T-2d', note: 'Slow-cooked greens — start them early. Pork or smoked turkey per the family.', alternatives: ['Mustard greens — milder flavor, same cook method', 'Turnip greens — often cheaper, earthy taste'] },
    { id: 'p_cornbread', item: 'Cornbread', category: 'food', qtyPerGuest: 1, unit: 'piece', where: ['Grocery', 'Bakery'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-1d', alternatives: ['Store-bought cornbread mix (Jiffy) — quick bake, feeds same crowd', 'Dinner rolls — if cornbread is sold out'] },
    { id: 'p_slaw', item: 'Coleslaw ingredients', category: 'food', qtyPerGuest: 0.25, unit: 'lb', where: ['Grocery'], unitCostRange: [1, 2], essential: false, buyAt: 'T-2d', alternatives: ['Deli coleslaw tub — if short on time', 'Broccoli slaw kit — cheaper bag, slightly different flavor'] },
    { id: 'p_dessert', item: 'Banana pudding, pound cake & peach cobbler (red velvet)', category: 'food', qtyPerGuest: 1.5, unit: 'serving', where: ['Grocery', 'Bakery', 'Homemade'], unitCostRange: [1.5, 4], essential: true, buyAt: 'T-1d', note: 'Banana pudding is practically mandatory; plan more than one dessert — people take dessert to go too.', alternatives: ['Sheet cake from grocery bakery — cheap per slice, easy to serve', 'Sweet potato pie — if peach cobbler ingredients are out of season'] },
    { id: 'p_condiments', item: 'Condiments, BBQ sauce, hot sauce, cheese, lettuce, onion, pickles', category: 'food', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [25, 50], essential: true, buyAt: 'T-3d', note: 'In the DMV, mambo/mumbo sauce for the wings is the signature party plate.' },
    { id: 'p_seasoning', item: 'Dry rub / seasoning + marinade', category: 'food', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [10, 25], essential: true, buyAt: 'T-3d', note: 'Season the meat the night before — flavor is the grill master\'s reputation.' },
    { id: 'p_red_drink', item: 'Red drink / Kool-Aid / punch + sugar', category: 'beverage', qtyPerGuest: 4, unit: 'cups', where: ['Grocery'], unitCostRange: [0.15, 0.4], essential: true, buyAt: 'T-3d', note: 'The red drink is a cookout institution. Make a big batch — kids and elders drink it all day.' },
    { id: 'p_soda_water', item: 'Soda + bottled water', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Grocery', 'Costco'], unitCostRange: [0.4, 1], essential: true, buyAt: 'T-3d', note: 'Plenty of water for the heat — non-negotiable for an all-day outdoor function.' },
    { id: 'p_grown_folks', item: 'Grown-folks section: brown liquor + mixers, beer', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Liquor store', 'Costco'], unitCostRange: [2, 5], essential: false, buyAt: 'T-3d', note: 'A clearly separate section for the adults — keep it away from the kids\' drink table. ~1 drink/guest/hr is the planning rule.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~1 alcoholic drink/guest/hr is the common party-planning rule; scaled for an all-day cookout with a family-friendly majority.' } },
    { id: 'p_ice', item: 'Ice (coolers + drinks + red drink)', category: 'beverage', qtyPerGuest: 2, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY UNDER-BOUGHT. ~2 lb/guest for an all-day outdoor function — it melts fast in the heat. Buy more than you think.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~2 lb ice/guest is the common outdoor/hot-day floor; an all-day cookout sits at the top of that range.' } },
    { id: 'p_fuel', item: 'Charcoal / wood / propane + lighter fluid', category: 'logistics', qtyFlat: 1, unit: 'supply', where: ['Grocery', 'Hardware store', 'Gas station'], unitCostRange: [20, 50], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a long cook burns through fuel — buy extra charcoal/wood or a backup propane tank.' },
    { id: 'p_foil_pans', item: 'Foil pans + foil + serving spoons', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco', 'Dollar store'], unitCostRange: [15, 35], essential: true, buyAt: 'T-3d', note: 'Foil pans hold the spread warm and double as leftovers/to-go vessels.' },
    { id: 'p_togo', item: 'To-go containers + foil + zip bags (everybody makes a plate)', category: 'logistics', qtyPerGuest: 1.5, unit: 'container', where: ['Grocery', 'Costco', 'Dollar store'], unitCostRange: [0.2, 0.6], essential: true, buyAt: 'T-3d', note: 'A real cultural practice: everybody makes a plate to take home. Plan to-go containers per guest — running out is a faux pas.' },
    { id: 'p_tableware', item: 'Disposable plates, cups, napkins, cutlery (sturdy)', category: 'rental', qtyPerGuest: 3, unit: 'set', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.3, 1], essential: true, buyAt: 'T-3d', note: 'Heavy soul-food plates need sturdy plates — go double-walled, not flimsy. Multiple per guest for an all-day event.' },
    { id: 'p_comfort', item: 'Bug spray, citronella, sunscreen, paper towels', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Pharmacy'], unitCostRange: [15, 35], essential: false, buyAt: 'T-3d', note: 'All-day outdoors — sun and mosquitoes run people off. Keep the elders comfortable.' },
    { id: 'p_cards', item: 'Cards + dominoes (spades table)', category: 'logistics', qtyFlat: 2, unit: 'set', where: ['Grocery', 'Dollar store', 'Amazon'], unitCostRange: [2, 6], essential: false, buyAt: 'T-3d', note: 'The spades table is a fixture — set out a couple of decks and a dominoes set.' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, gloves, sanitizing wipes', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [12, 25], essential: true, buyAt: 'T-3d', note: 'A real all-day cookout makes real trash — extra heavy-duty bags + a recycling bag for cans/bottles.' },
  ],

  rentalsGap: [
    { item: 'Pop-up canopies (10x10)', qtyPerGuest: 0.03, note: 'roughly one canopy per ~30 guests — shade for the food, the elders, and the spades table' },
    { item: 'Folding chairs', qtyPerGuest: 0.9, note: 'seating for every age; reserve the comfortable shaded chairs for the elders' },
    { item: 'Folding tables (6ft)', qtyPerGuest: 0.08, note: 'food line, drink station, dessert table, spades table — roughly one per ~12 guests' },
    { item: 'Large coolers / ice chests', qtyPerGuest: 0.1, note: 'one big cooler per ~10 guests; keep grown-folks drinks in a separate cooler' },
    { item: 'Large speaker / PA', qtyFlat: 1, note: 'music carries the whole function — one good speaker minimum if not hiring a DJ' },
    { item: 'Extra grill / smoker capacity', qtyFlat: 1, note: 'a single grill bottlenecks at 40+ — a second grill or a smoker keeps the meat flowing' },
  ],

  vendors: [
    { category: 'Pitmaster / BBQ caterer', required: false, altToDIY: 'Designated family grill master cooks it', when: 'T-14d', costRange: [12, 25], costUnit: 'per guest' },
    { category: 'DJ', required: false, altToDIY: 'Curated playlist + a good speaker, family on the aux', when: 'T-14d', costRange: [300, 800], costUnit: 'flat' },
    { category: 'Tent / canopy + table / chair rental', required: false, altToDIY: 'Own/borrow pop-up canopies and folding chairs', when: 'T-10d', costRange: [150, 500], costUnit: 'flat' },
    { category: 'Soul-food caterer (sides / desserts)', required: false, altToDIY: 'Potluck spread — family brings the dishes they are known for', when: 'T-14d', costRange: [8, 18], costUnit: 'per guest' },
    { category: 'Bounce house / kids entertainment', required: false, altToDIY: 'Yard games, water balloons, designated kids\' area', when: 'T-10d', costRange: [120, 300], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_weather', trigger: 'Rain or extreme heat with no plan', severity: 'high', mitigation: 'Check the forecast at T-3d; secure canopies + an indoor/garage fallback; start earlier to dodge peak heat; keep water and shade flowing.' },
    { id: 'r_grillmaster', trigger: 'Grill master flakes or is overwhelmed running it solo all day', severity: 'high', mitigation: 'Lock the grill master at T-21d with a named backup; line up a second grill/smoker at 40+ so one person isn\'t the bottleneck.' },
    { id: 'r_spread_gaps', trigger: 'Duplicate sides, missing greens/mac, or an untrusted potato salad', severity: 'med', mitigation: 'Assign the spread on purpose at T-14d — one person per dish, the trusted hands on the potato salad; confirm assignments at T-3d.' },
    { id: 'r_fuel', trigger: 'Run out of charcoal/wood/propane mid-cook', severity: 'high', mitigation: 'Buy extra fuel at T-3d; keep a spare bag/tank on hand for the long cook.' },
    { id: 'r_ice', trigger: 'Ice runs out; drinks and red drink go warm', severity: 'med', mitigation: 'Buy ~2 lb/guest day-of (all-day heat melts it fast); know the nearest store for a midday ice run.' },
    { id: 'r_foodsafe', trigger: 'Perishable sides sit out in the heat too long, or raw meat cross-contaminates cooked', severity: 'high', mitigation: 'Keep cold sides on ice; don\'t leave mayo-based dishes (potato salad, slaw) out >1h above 90°F; grill meat to safe temps (chicken 165°F). Use SEPARATE platters and utensils for raw vs cooked meat — never put cooked meat back on the raw-marinade plate.' },
    { id: 'r_togo_shortfall', trigger: 'Run out of to-go containers — guests can\'t make a plate', severity: 'low', mitigation: 'Buy ~1.5 to-go containers/guest; keep foil and zip bags as backup so everybody leaves with a plate.' },
  ],

  contingencies: [
    { id: 'c_rain', when: 'r_weather', plan: 'Pop the canopies or move the spread to the garage/indoors; grill under cover; notify the family the morning of — the function still happens.' },
    { id: 'c_grillmaster', when: 'r_grillmaster', plan: 'Tap the named backup; pre-cook ribs (oven/smoker) and finish on the grill to take pressure off; recruit a second set of hands on the pit.' },
    { id: 'c_fuel', when: 'r_fuel', plan: 'Send someone for charcoal/a swap propane tank — gas stations carry both; keep the pit covered to hold heat in the meantime.' },
    { id: 'c_ice', when: 'r_ice', plan: 'Midday ice run; consolidate coolers; prioritize ice for the red drink, water, and the grown-folks cooler.' },
    { id: 'c_foodsafe', when: 'r_foodsafe', plan: 'Stage cold sides over ice trays and bring them out in waves; pull mayo-based dishes back to the cooler between servings.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Drinks (red drink mix, soda, water, grown-folks section), fuel, condiments/seasoning, foil pans, to-go containers, tableware, cleanup kit, cards' },
      { when: 'T-2d', what: 'Spread groceries: mac & cheese, potato salad, beans, greens, slaw' },
      { when: 'T-1d', what: 'Proteins (ribs, chicken, burgers, dogs, links), buns, cornbread, desserts' },
      { when: 'T0', what: 'Ice — lots of it — and any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-1d evening', what: 'Season/marinate the meat overnight; start slow-cooked greens and beans; make banana pudding and desserts' },
      { when: 'T0 morning', what: 'Bake the mac & cheese; finish potato salad and slaw; brew the red drink; pre-cook ribs if needed' },
    ],
    setup: [
      { when: 'T0 -2:00', what: 'Light the pit early; set up canopies + shaded elder seating; coolers + ice (separate grown-folks cooler); food line, drink station, dessert table; spades table; speaker/music' },
      { when: 'T0 -0:30', what: 'Lay out foil pans warm, sturdy plates, sturdy cutlery; stage trash + recycling bins; cue the playlist' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep cold sides on ice; bag cans for recycling as you go; refill ice and the red drink; set out to-go containers as people start making plates' },
      { when: 'T0 +7:00', what: 'Cool + scrape the grill, pack leftovers into to-go pans, send everybody home with a plate, bag trash/recycling, fold canopies/chairs/tables, return rentals' },
    ],
  },

  // Day-of "Before the big day" readiness/safety walkthrough — authored for a
  // big, all-day OUTDOOR cookout: grill-forward, alcohol, kids, long heat.
  // severity drives ordering; state persists in event.safetyChecked[id].
  dayOfChecklist: [
    { id: 'weather', label: 'Heat / rain plan', detail: 'Shade and a rain fallback set before guests arrive — an all-day cookout in full sun runs people off without canopies and a backup.', severity: 'high' },
    { id: 'food', label: 'Food safety', detail: 'Cold sides on ice, hot food held, nothing perishable out more than ~1h in the heat. Grill all meats to safe temps before they leave the grill.', severity: 'high' },
    { id: 'grill', label: 'Grill / fire safety', detail: 'Fuel checked, extinguisher or hose within reach, grill stable and clear of the house — and the pit never left unattended.', severity: 'high' },
    { id: 'child', label: 'Child safety', detail: 'A watcher assigned for the grill and any pool/water, and kids kept clear of the hot pit and coolers of ice.', severity: 'high' },
    { id: 'power', label: 'Power & outlets', detail: "Speakers, lights, and warmers spread across circuits — don't run the whole function off one outdoor outlet.", severity: 'med' },
    { id: 'trash', label: 'Trash + recycling station', detail: 'Heavy-duty bags staged, a recycling bag for cans/bottles, and a plan to swap bags as the day fills them.', severity: 'med' },
    { id: 'alcohol', label: 'Alcohol plan', detail: 'A loose cutoff, water out alongside, and a ride-home plan so the grown-folks section gets home safe.', severity: 'med' },
    { id: 'emergency', label: 'Emergency basics', detail: 'First-aid kit on hand; know the nearest ER; phones charged.', severity: 'low' },
  ],

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note:
      'This playbook celebrates The Cookout — the communal African American backyard function — as a cultural institution: the named grill master, the coordinated soul-food spread, the red drink and grown-folks section, essential music and the line dances, the spades table, shade and respect for the elders, and the to-go plate everybody takes home. It is authored in the gracious, insider lens associated with Black home cooks and hosts (Carla Hall, Marcus Samuelsson, Kardea Brown, Sunny Anderson, Tabitha Brown, and the B. Smith hosting standard) and is meant as respectful insider practice, not stereotype or caricature. Quantities are grounded in common US cookout and soul-food norms — protein spread across several meats (~0.6–0.75 lb total protein/guest because these plates are full), multiple sides per guest, ~1 drink/guest/hr with a family-friendly majority, and ~2 lb ice/guest for an all-day outdoor event — and food-safety guidance reflects widely published USDA-style practice. All figures are authored as trade-heuristic / established-consensus and labeled synthesized until a verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default theCookout;
