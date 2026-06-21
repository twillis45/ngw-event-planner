// Game Night — Event OS host playbook (data only).
//
// A relaxed at-home gathering built around board / card / party games with easy
// grazing snacks and a light drink spread. Low-stress: the games are the
// entertainment, the food stays low-mess so hands stay clean for cards, and the
// night runs ~3 hours. Quantities are common US home-hosting rules of thumb,
// VERIFIED by the NGW event-domain review board (lighter pour for a thinking
// game; hand wipes + a food tray + a scorepad; rules-read before guests).
// Labeled `synthesized` until citations are attached. ESM default export.

const gameNight = {
  type: 'Game Night',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',

  meta: {
    summary: 'A relaxed at-home gathering around board, card, and party games with easy grazing snacks and a light drink spread. Low-stress to host: the games are the entertainment, the food stays low-mess so hands stay clean for cards, and the night runs about three hours.',
    typicalGuests: { low: 6, default: 8, high: 12 },
    typicalDurationHours: 3,
    leadTimeDays: 7,
    hostDifficulty: 'easy',
    perGuestCost: { low: 8, high: 18, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The headliner game clicks and everyone forgets what time it is.',
    'Someone makes a play nobody expected and the table erupts.',
    'The room gets so loud with laughter that someone checks if the neighbors can hear.',
    'The last game goes long because nobody wants to be the one to call it.',
  ],

  decisions: [
    { id: 'game_type', label: 'What kind of games?', options: ['Board games', 'Card games', 'Party games', 'Mixed (fillers + one headliner)'], default: 'Mixed (fillers + one headliner)', when: 'T-7d', blocks: ['games', 'rental'], why: 'Game type drives table/seating layout and how many players each game seats. A mix keeps a range of group sizes engaged; party games need open floor more than table space, board games need a big flat surface. Pre-pick one short 5-10 min FILLER for lulls and late arrivals.' },
    { id: 'food_model', label: 'Who provides the food?', options: ['Host provides snacks', 'Potluck (guests bring a dish)'], default: 'Host provides snacks', when: 'T-7d', blocks: ['food'], why: 'Host-provided is simple and predictable but costs more; potluck cuts host cost/effort but needs a quick coordination note so you do not end up with five bags of chips and no dip.' },
    { id: 'drinks', label: 'What is the drink spread? (game night skews light — people need to think)', options: ['Beer/wine/soda only', 'Add one batch cocktail', 'Add one batch mocktail', 'Full bar'], default: 'Add one batch cocktail', when: 'T-7d', blocks: ['beverage_purchases'], why: 'One pre-made batch drink feels special without bartending all night; beer/wine/soda covers everyone else. Plan ~3 drinks/guest (lighter than a party) — a full bar is rarely worth it for a casual game night.' },
  ],

  milestones: [
    { id: 'gn_invite', name: 'Invite sent + headcount started', offsetDays: 7, owner: 'host', category: 'planning', risk: { ifDelayed: 'Cannot size food/drinks/seats', severity: 'low' } },
    { id: 'gn_games', name: 'Game lineup chosen + every box checked', offsetDays: 3, owner: 'host', dependsOn: ['gn_invite'], category: 'planning', risk: { ifDelayed: 'Missing pieces / unread rules stall the night', severity: 'med' } },
    { id: 'gn_menu', name: 'Menu + drinks locked', offsetDays: 3, owner: 'host', dependsOn: ['gn_invite'], category: 'food', risk: { ifDelayed: 'Last-minute messy food fouls the cards', severity: 'low' } },
    { id: 'gn_shop', name: 'Shopping complete', offsetDays: 1, owner: 'host', dependsOn: ['gn_menu'], category: 'shopping', risk: { ifDelayed: 'Scramble day-of', severity: 'med' } },
    { id: 'gn_space', name: 'Space set: clean table, seats, lighting, food station', offsetDays: 0, owner: 'host', dependsOn: ['gn_games', 'gn_shop'], category: 'setup', risk: null },
    { id: 'event', name: 'Doors open', offsetDays: 0, owner: 'host', dependsOn: ['gn_space'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'gn_invite', phase: 'guest', label: 'Send the invite with date, time, and a one-line "what we are playing"; ask for a rough RSVP to size food/seats', when: 'T-7d' },
    { id: 't_pick_games', milestoneId: 'gn_games', phase: 'plan', label: 'Pick 3-4 games spanning quick fillers to one longer headliner; add a 5-10 min filler for lulls', when: 'T-3d' },
    { id: 't_check_games', milestoneId: 'gn_games', phase: 'plan', label: 'Open every game box to confirm all pieces/cards/dice; READ or queue the rules of any NEW game so you can teach it in 5 min', when: 'T-3d' },
    { id: 't_menu', milestoneId: 'gn_menu', phase: 'food', label: 'Lock low-mess, one-hand finger foods that will not grease up the cards; coordinate categories if potluck', when: 'T-3d' },
    { id: 't_shop', milestoneId: 'gn_shop', phase: 'shopping', label: 'Main shop: snacks, drinks, ice, napkins/hand wipes, cups/plates, trash bags', when: 'T-1d' },
    { id: 't_prep', milestoneId: 'gn_shop', phase: 'food', label: 'Pre-portion dips, assemble the snack/charcuterie board, start chilling all drinks', when: 'T-1d evening' },
    { id: 't_space', milestoneId: 'gn_space', phase: 'setup', label: 'Clear + wipe the main table; a seat per guest; bright over-table lighting; queue a low playlist', when: 'T0 -1:00' },
    { id: 't_station', milestoneId: 'gn_space', phase: 'setup', label: 'Set the snack + drink station (and a food tray) AWAY from the game table; ice out; napkins/hand wipes + scorepad + pen on the table; trash + recycling spot visible', when: 'T0 -0:30' },
    { id: 't_refresh', milestoneId: 'event', phase: 'food', label: 'Mid-night refresh: top up bowls, restock drinks + ice, swap a full trash bag', when: 'T0 +1:30' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Clear cups/plates, bag trash + recycling, consolidate leftovers; reshelve every game (pieces back in the box)', when: 'T0 +3:00' },
  ],

  purchases: [
    { id: 'p_snacks', item: 'Low-mess dry snacks (chips, crackers, pretzels, popcorn)', category: 'food', qtyPerGuest: 1, unit: 'snack serving', where: ['Grocery', 'Costco'], unitCostRange: [1, 2.5], essential: true, buyAt: 'T-1d', note: 'Dry, one-hand snacks keep fingers clean for cards. ~6-8 finger-food bites/guest/hour across all snacks when grazing is the meal.', alternatives: ['Store-brand chips + pretzels — same function at half the cost', 'Microwave popcorn (bulk box) — cheapest snack filler option'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~6-8 appetizer bites/person/hour when food is grazing-only.' } },
    { id: 'p_dips', item: 'Dips + salsa (hummus, guac, queso, ranch) — at the station, not the table', category: 'food', qtyPerGuest: 1, unit: 'small serving', where: ['Grocery'], unitCostRange: [1, 2], essential: true, buyAt: 'T-1d', note: 'Shallow bowls at the snack station, off the game surface.', alternatives: ['Store-brand salsa + sour cream — cheapest dip combo', 'Canned queso (Tostitos) — no prep, budget alternative to fresh queso'] },
    { id: 'p_board', item: 'Charcuterie / pre-cut finger foods (cheese, cured meats, olives, veggie cups)', category: 'food', qtyPerGuest: 1, unit: 'portion', where: ['Grocery', 'Costco'], unitCostRange: [3, 6], essential: false, buyAt: 'T-1d', note: 'Pre-cut so no plates/knives at the table; makes the spread feel intentional.', alternatives: ['Store-brand crackers + one block cheese sliced — cheaper by half', 'Grocery charcuterie pack — pre-assembled, less expensive'] },
    { id: 'p_dessert', item: 'Dessert (cookies, brownies, bite-size sweets)', category: 'food', qtyPerGuest: 2, unit: 'piece', where: ['Grocery', 'Bakery'], unitCostRange: [0.75, 1.5], essential: false, buyAt: 'T-1d', note: 'Finger-size sweets travel between hands of cards; ~2 pieces/guest is plenty.', alternatives: ['Store-brand cookies (Oreos, Chips Ahoy) — cheapest per serving', 'Grocery bakery cookies — fresh, cheaper than specialty bakery'] },
    { id: 'p_beer_wine', item: 'Beer + wine (light pour — ~3 drinks/guest total)', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery', 'Liquor store'], unitCostRange: [1.5, 3], essential: false, buyAt: 'T-1d', note: '~1 drink/guest/hour over ~3h, BUT game nights skew lighter — people need to think. ~3 drinks/guest total across beer/wine/batch; not everyone drinks, so do not buy a full ration per category. ~1 wine bottle per 4 guests.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: 'Board-corrected DOWN to ~3 drinks/guest for a focused game night vs ~4 for a party.' } },
    { id: 'p_soda', item: 'Soda, sparkling water, non-alcoholic (over-stock these)', category: 'beverage', qtyPerGuest: 3, unit: 'can/serving', where: ['Grocery', 'Costco'], unitCostRange: [0.5, 1.25], essential: true, buyAt: 'T-1d', note: 'Always over-stock non-alcoholic — many guests drink only these all night.' },
    { id: 'p_batch', item: 'One batch cocktail OR mocktail (punch base, mixer, garnish)', category: 'beverage', qtyFlat: 1, qtyPer: 8, unit: 'batch', where: ['Grocery', 'Liquor store'], unitCostRange: [15, 30], essential: false, buyAt: 'T-1d', note: 'One make-ahead batch = no bartending all night. Make a mocktail version if part of the group does not drink.' },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.3, 0.5], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1 lb/guest covers cups + cooling cans for a 3h indoor night; buy day-of.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1 lb ice/guest indoor baseline (1.5 lb for heat / 4h+).' } },
    { id: 'p_napkins', item: 'Cocktail napkins + hand wipes (keep within reach of the table)', category: 'logistics', qtyPerGuest: 6, unit: 'napkin', where: ['Grocery'], unitCostRange: [0.03, 0.08], essential: true, buyAt: 'T-1d', note: 'COMMONLY FORGOTTEN: greasy fingers on cards/components is the #1 game-night regret — stock plenty of napkins AND a tub of hand wipes on the table.' },
    { id: 'p_cups_plates', item: 'Disposable cups, small plates, snack bowls', category: 'logistics', qtyPerGuest: 3, unit: 'piece', where: ['Grocery', 'Party store'], unitCostRange: [0.1, 0.3], essential: true, buyAt: 'T-1d', note: 'Small plates/bowls contain crumbs; disposables cut cleanup.' },
    { id: 'p_scorepad', item: 'Scorepad + pens (and a new filler game, optional)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Home', 'Game store', 'Big-box'], unitCostRange: [3, 30], essential: false, buyAt: 'T-3d', note: 'Pen + scratch paper for scoring; optional new crowd-friendly game bought early enough to read the rules first.' },
    { id: 'p_trash', item: 'Trash + recycling bags, paper towels', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [3, 7], essential: true, buyAt: 'T-1d', note: 'COMMONLY FORGOTTEN: have 2-3 ready so you can swap a full bag mid-night.' },
  ],

  rentalsGap: [
    { item: 'Game library (3-4 games + one short filler)', qtyFlat: 4, note: 'span quick fillers to one longer headliner; lean on guests to bring a favorite if your shelf is thin.' },
    { item: 'Table big enough for the chosen game', qtyFlat: 1, note: 'board games need a large flat surface; a folding/card table extends seating if the dining table is small.' },
    { item: 'Food tray / side table (off the game surface)', qtyFlat: 1, note: 'a place to set snacks so the main table stays a clean play surface.' },
    { item: 'Seating for every player', qtyPerGuest: 1, note: 'a real seat per expected guest at the table; borrow folding chairs rather than letting people perch.' },
    { item: 'Bright over-table lighting', qtyFlat: 1, note: 'even light over the playing surface so cards/boards read clearly; a clip or floor lamp fills a dim room.' },
  ],

  vendors: [
    { category: 'Snack catering / grazing board', required: false, altToDIY: 'Assemble your own board from the grocery store for a fraction of the cost.', when: 'T-3d', costRange: [40, 120], costUnit: 'flat' },
    { category: 'Pizza / takeout delivery', required: false, altToDIY: 'Make-ahead finger foods cover the night; a couple of pizzas mid-game are an easy upgrade.', when: 'T0', costRange: [25, 60], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_greasy', trigger: 'Messy, greasy, or saucy snacks at the game table', severity: 'med', mitigation: 'Dry, one-hand finger foods only; keep dips/messy items at a separate station with napkins + hand wipes.' },
    { id: 'r_rules', trigger: 'A new game stalls the night while everyone reads the rulebook', severity: 'med', mitigation: 'Read/queue the rules of any NEW game before guests arrive; be able to teach it in ~5 min; keep a known crowd-pleaser ready.' },
    { id: 'r_pieces', trigger: 'A game is missing cards/dice/pieces, found after guests arrive', severity: 'med', mitigation: 'Open + check every box at T-3d; have at least one backup game.' },
    { id: 'r_seats', trigger: 'More players than seats at the table', severity: 'med', mitigation: 'Confirm headcount; set a real seat per guest at setup; keep folding chairs nearby.' },
    { id: 'r_light', trigger: 'Room too dim to read cards/boards', severity: 'low', mitigation: 'Add bright, even over-table lighting before doors; test it from each seat.' },
    { id: 'r_drinks', trigger: 'Short on drinks or ice late', severity: 'low', mitigation: 'Over-stock non-alcoholic + ice; keep a backup case + a spare bag of ice.' },
  ],

  contingencies: [
    { id: 'c_rules', when: 'r_rules', plan: 'Drop the unread game; pull the pre-picked short filler/crowd-pleaser to reset the energy and teach as you play.' },
    { id: 'c_pieces', when: 'r_pieces', plan: 'Swap to the backup game; improvise missing bits (coins for tokens, phone timer for a sand timer).' },
    { id: 'c_more_guests', when: 'r_seats', plan: 'Switch to a party/card game that scales to large groups, split into two tables, stretch snacks with a quick pizza order.' },
    { id: 'c_spill', when: 'r_greasy', plan: 'Keep paper towels within reach; pause, blot, air-dry cards; move the snack station further from the table.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Any new game + non-perishables (chips, crackers, soda, napkins/hand wipes, cups, trash bags, scorepad)' },
      { when: 'T-1d', what: 'Main shop: perishable snacks, charcuterie, dessert, beer/wine, batch-drink ingredients' },
      { when: 'T0', what: 'Pick up ice last so it does not melt' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Pre-portion dips, assemble the snack/charcuterie board, start chilling all drinks' },
      { when: 'T0 -2h', what: 'Plate snacks, mix the batch drink, final fridge check' },
    ],
    setup: [
      { when: 'T0 -1h', what: 'Clear + wipe the main table; a seat per guest; bright over-table lighting; low playlist' },
      { when: 'T0 -0:30', what: 'Snack + drink station (and food tray) AWAY from the table; ice out; napkins/hand wipes + scorepad + pen on the table; trash/recycling spot; first game laid out' },
    ],
    cleanup: [
      { when: 'T0 +1:30', what: 'Mid-night: refresh snack bowls, restock drinks + ice, swap any full trash bag' },
      { when: 'T0 +3h', what: 'Clear cups/plates, bag trash + recycling, consolidate leftovers, reshelve every game (pieces back in the box)' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Quantities reflect common US home-hosting rules of thumb, reviewed and corrected by the NGW event-domain board: ~6-8 finger-food bites/guest/hour when grazing is the meal; alcohol trimmed to ~3 drinks/guest total (a focused game night skews lighter than a party); ~1 lb ice/guest for a ~3h indoor night; ~2 dessert bites/guest. The board added the fixes the original draft only flagged: hand wipes + a food tray off the game surface, a scorepad + pen, and reading a new game\'s rules before guests so a rulebook read never stalls the night (with a short filler game pre-picked for lulls). Planning baselines, not guarantees — adjust up for a hungrier/thirstier crowd. Labeled synthesized; no fabricated sources.',
    sources: [],
  },
};

export default gameNight;
