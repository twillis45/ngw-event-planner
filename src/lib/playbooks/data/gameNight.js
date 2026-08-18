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
    { id: 'game_type', label: 'What kind of games?', options: ['Board games', 'Card games', 'Party games', 'Mixed (fillers + one headliner)'], default: 'Mixed (fillers + one headliner)', when: 'T-7d', blocks: ['games', 'rental'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'The games are the whole entertainment and set the table layout, but the mix is easy to change and defaults to fillers-plus-a-headliner.', tier: 'reasoned' }, why: 'Game type drives table/seating layout and how many players each game seats. A mix keeps a range of group sizes engaged; party games need open floor more than table space, board games need a big flat surface. Pre-pick one short 5-10 min FILLER for lulls and late arrivals.' },
    { id: 'food_model', label: 'Who provides the food?', options: ['Host provides snacks', 'Potluck (guests bring a dish)'], default: 'Host provides snacks', when: 'T-7d', blocks: ['food'], costFactors: { 'Potluck (guests bring a dish)': 0.5 }, costFactorProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['catering-perperson-2026'], note: 'Grounded to catering-perperson-2026: potluck vs host-provided is the potluck-vs-DIY labor-tier ratio the source establishes.', claim: 'A potluck model reduces the host\'s food cost by ~50% vs. host-provided snacks for game night', sufficientWhen: 'Comparison of typical host-provided snack spend vs. potluck coordination confirms the ~0.5 cost factor' }, affects: ['p_snacks', 'p_dips', 'p_board'], weight: 'low', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Host-provides vs potluck only shifts who buys the low-mess snacks — cheap, coordinated by a quick text, and safe to default to host-provided.', tier: 'reasoned' }, why: 'Host-provided is simple and predictable but costs more; potluck cuts host cost/effort but needs a quick coordination note so you do not end up with five bags of chips and no dip.' },
    { id: 'drinks', label: 'What is the drink spread? (game night skews light — people need to think)', options: ['Beer/wine/soda only', 'Add one batch cocktail', 'Add one batch mocktail', 'Full bar'], default: 'Add one batch cocktail', when: 'T-7d', blocks: ['beverage_purchases'], weight: 'low', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'A thinking game runs light on alcohol, so one batch drink plus beer, wine, and soda is a cheap, safe default.', tier: 'reasoned' }, why: 'One pre-made batch drink feels special without bartending all night; beer/wine/soda covers everyone else. Plan ~3 drinks/guest (lighter than a party) — a full bar is rarely worth it for a casual game night.' },
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
    { id: 'p_snacks', item: 'Chips, crackers, pretzels & popcorn (low-mess dry snacks)', category: 'food', qtyPerGuest: 1, unit: 'snack serving', where: ['Grocery', 'Costco'], unitCostRange: [1, 2.5], essential: true, buyAt: 'T-1d', note: 'Dry, one-hand snacks keep fingers clean for cards. ~6-8 finger-food bites/guest/hour across all snacks when grazing is the meal.', alternatives: ['Store-brand chips + pretzels — same function at half the cost', 'Microwave popcorn (bulk box) — cheapest snack filler option'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~6-8 appetizer bites/person/hour when food is grazing-only.', claim: '~6–8 dry finger-food bites per person per hour is sufficient when grazing snacks are the entire food offering', sufficientWhen: 'verified — board consensus confirmed this baseline for a focused game night; established-consensus for grazing-only party food' } },
    { id: 'p_dips', item: 'Dips + salsa (hummus, guac, queso, ranch) — at the station, not the table', category: 'food', qtyPerGuest: 1, unit: 'small serving', where: ['Grocery'], unitCostRange: [1, 2], essential: true, buyAt: 'T-1d', note: 'Shallow bowls at the snack station, off the game surface.', alternatives: ['Store-brand salsa + sour cream — cheapest dip combo', 'Canned queso (Tostitos) — no prep, budget alternative to fresh queso'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_board', item: 'Charcuterie / pre-cut finger foods (cheese, cured meats, olives, veggie cups)', category: 'food', qtyPerGuest: 1, unit: 'portion', where: ['Grocery', 'Costco'], unitCostRange: [3, 6], essential: false, buyAt: 'T-1d', note: 'Pre-cut so no plates/knives at the table; makes the spread feel intentional.', alternatives: ['Store-brand crackers + one block cheese sliced — cheaper by half', 'Grocery charcuterie pack — pre-assembled, less expensive'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['charcuterie-grocery-2026', 'charcuterie-ica-2026'], lastVerified: '2026-08-18', claim: 'Charcuterie priced per portion. US grocery averages put specialty cheese near $15/lb and charcuterie meats near $20/lb; a DIY medium board for 5-15 people runs $50-120 in ingredients, which is roughly $3-8 a head at the larger end of that headcount. A ready-made board from a cheese shop is about $15 per person with a $120 minimum and sits well ABOVE this band - this row prices the DIY board, not the shop one.', sufficientWhen: 'A current per-pound price for one specialty cheese and one cured meat, built into a board for a stated headcount, confirms the per-portion figure.' }, },
    { id: 'p_dessert', item: 'Cookies, brownies & bite-size sweets', category: 'food', qtyPerGuest: 2, unit: 'piece', where: ['Grocery', 'Bakery'], unitCostRange: [0.75, 1.5], essential: false, buyAt: 'T-1d', note: 'Finger-size sweets travel between hands of cards; ~2 pieces/guest is plenty.', alternatives: ['Store-brand cookies (Oreos, Chips Ahoy) — cheapest per serving', 'Grocery bakery cookies — fresh, cheaper than specialty bakery'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_beer_wine', item: 'Beer + wine (light pour — ~3 drinks/guest total)', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery', 'Liquor store'], unitCostRange: [1.5, 3], essential: false, buyAt: 'T-1d', note: '~1 drink/guest/hour over ~3h, BUT game nights skew lighter — people need to think. ~3 drinks/guest total across beer/wine/batch; not everyone drinks, so do not buy a full ration per category. ~1 wine bottle per 4 guests.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: 'Board-corrected DOWN to ~3 drinks/guest for a focused game night vs ~4 for a party.', claim: '~3 total drinks per guest is appropriate for a game night because guests need to think and consumption skews lighter than a social party', sufficientWhen: 'verified — board corrected down from ~4 drinks/guest; established-consensus that game/thinking events run lighter than standard party norms' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['beer-retail-2026', 'beer-budget-2026', 'wine-retail-2026', 'wine-statewide-2026'], lastVerified: '2026-08-16', claim: 'This band is a SUM of separately-priced drink families, not a single quoted item: domestic lager $0.80-1.20 per 12oz (about $20-22 a 24-pack), craft $1.50-3.00; everyday table wine $8-15 a bottle, mid-range $15-30. Each component is cited to its own registered source; the summed band is therefore low-confidence by construction.', sufficientWhen: 'Current shelf prices for one pack of each named component at the same store, summed to the per-serving band, confirm the range.' } },
    { id: 'p_soda', item: 'Soda, sparkling water, non-alcoholic (over-stock these)', category: 'beverage', qtyPerGuest: 3, unit: 'can/serving', where: ['Grocery', 'Costco'], unitCostRange: [0.15, 1], essential: true, buyAt: 'T-1d', note: 'Always over-stock non-alcoholic — many guests drink only these all night.' , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['soda-12pack-2026', 'bottledwater-case-2026'], lastVerified: '2026-08-15', claim: 'A canned soda or bottled water runs $0.15-1.00 a serving: soda is $0.25-0.60 a can (average $0.38, store brand lower, craft $0.50-1.17), and basic bottled water is $0.13-0.25 a bottle in a 24-to-48 pack.', sufficientWhen: 'Re-checked against 12-pack and case pricing. The band is CANS AND BOTTLES ONLY - a mocktail, zero-proof spirit or punch base costs several times this per drink and is priced separately. Regional spread is real: Northeast and South run high, Midwest and West Coast low on discount-chain competition, and promotions cut 10-25%.' } },
    { id: 'p_batch', item: 'One batch cocktail OR mocktail (punch base, mixer, garnish)', category: 'beverage', qtyFlat: 1, qtyPer: 8, unit: 'batch', where: ['Grocery', 'Liquor store'], unitCostRange: [15, 30], essential: false, buyAt: 'T-1d', note: 'One make-ahead batch = no bartending all night. Make a mocktail version if part of the group does not drink.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['spirits-budgetbar-2026', 'mixers-retail-2026', 'zeroproof-retail-2026', 'lemons-retail-2026'], lastVerified: '2026-08-18', claim: 'A SUM of separately-priced components for one batch, at the BUDGET end. Basic store-brand spirits start near $8 a 750ml against $18-40 for most buyers; mixers are $1.99-2.99 a bottle (tonic 1L, ginger ale 2L at $0.04 an ounce); citrus garnish is $0.64 a lemon. This row offers a MOCKTAIL as an equal option, and a zero-proof batch replaces the spirit with a non-alcoholic one at about $25 a bottle - which is why the band\'s ceiling is not much below a spirited batch even though its floor is lower.', sufficientWhen: 'One budget 750ml price and one NA-spirit price, each plus mixers and citrus, confirm both ends of the band.' }, },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.3, 0.5], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1 lb/guest covers cups + cooling cans for a 3h indoor night; buy day-of.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1 lb ice/guest indoor baseline (1.5 lb for heat / 4h+).', claim: '~1 lb of ice per guest is sufficient for a ~3h indoor game night; scale to 1.5 lb in warm conditions or for 4h+ events', sufficientWhen: 'verified — established-consensus for indoor event ice planning; the 1 vs. 1.5 lb threshold is consistent with US hosting rules of thumb' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['ice-retail-2026', 'ice-warehouse-2026'], lastVerified: '2026-08-16', claim: 'Bagged ice 2026: warehouse clubs run 10-12c per pound (a 20lb bag is $1.75-2.50 at Sams Club, $1.80-2.50 at Costco); grocery and gas-station bags cluster 23-31c/lb (BJs and 7-Eleven 20lb about $4.49-4.79, Giant 20lb $4.99, Publix 16lb $4.99); small bags and hardware stores reach 41-45c/lb. Convenience ice is more than four times warehouse ice per pound.', sufficientWhen: 'Current shelf prices for one 20lb bag at a warehouse club and one at a grocery store confirm the per-pound spread.' } },
    { id: 'p_napkins', item: 'Cocktail napkins + hand wipes (keep within reach of the table)', category: 'logistics', qtyPerGuest: 6, unit: 'napkin', where: ['Grocery'], unitCostRange: [0.03, 0.08], essential: true, buyAt: 'T-1d', note: 'COMMONLY FORGOTTEN: greasy fingers on cards/components is the #1 game-night regret — stock plenty of napkins AND a tub of hand wipes on the table.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_cups_plates', item: 'Disposable cups, small plates, snack bowls', category: 'logistics', qtyPerGuest: 3, unit: 'piece', where: ['Grocery', 'Party store'], unitCostRange: [0.1, 0.3], essential: true, buyAt: 'T-1d', note: 'Small plates/bowls contain crumbs; disposables cut cleanup.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['disposables-bulk-2026', 'disposables-partyqty-2026'], lastVerified: '2026-08-16', claim: 'Disposable tableware runs about 6 cents a plate in bulk packs (roughly $18 per 300) and $0.25-0.40 a plate at a grocery store, with bulk restaurant supply at $0.08-0.15; cups, cutlery and napkins bought in bulk alongside them save $100-200 across a party.', sufficientWhen: 'Current shelf prices for one bulk plate pack and the same item at a grocery store confirm the per-piece spread.' } },
    { id: 'p_scorepad', item: 'Scorepad + pens (and a new filler game, optional)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Home', 'Game store', 'Big-box'], unitCostRange: [3, 30], essential: false, buyAt: 'T-3d', note: 'Pen + scratch paper for scoring; optional new crowd-friendly game bought early enough to read the rules first.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_trash', item: 'Trash + recycling bags, paper towels', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [3, 7], essential: true, buyAt: 'T-1d', note: 'COMMONLY FORGOTTEN: have 2-3 ready so you can swap a full bag mid-night.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['costco-cleaning-2026', 'trashbags-retail-2026'], lastVerified: '2026-08-16', claim: 'Cleanup supplies at warehouse pricing: 13-gallon trash bags about 10 cents each (200 for $20.42), paper towels about $1.97 a roll, dish soap with two refills $14.74, 24 sponges $12.47; the same bags run 11-15 cents each at grocery and big-box.', sufficientWhen: 'Current shelf prices for trash bags and paper towels at one warehouse club and one grocery store confirm the per-unit figures.' } },
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
    { id: 'r_pieces', trigger: 'A game is missing cards/dice/pieces, found after guests arrive', severity: 'med', mitigation: 'Open + check every box at 3 days out; have at least one backup game.' },
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
      { when: 'T0 -4h', what: 'Pull the games and open every box — count pieces, cards and dice now, not at the table' },
      { when: 'T0 -3h', what: 'Snacks portioned into bowls; drinks chilled and kept off the playing surface' },
      { when: 'T0 -1h', what: 'Clear + wipe the main table; a seat per guest; bright over-table lighting; low playlist' },
      { when: 'T0 -0:30', what: 'Snack + drink station (and food tray) AWAY from the table; ice out; napkins/hand wipes + scorepad + pen on the table; trash/recycling spot; first game laid out' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Doors: snacks out, drinks poured, table cleared' },
      { when: 'T0 +20m', what: 'A quick filler game while the last people arrive' },
      { when: 'T0 +45m', what: 'Teach the headliner — rules read aloud once, properly' },
      { when: 'T0 +1h', what: 'The headline game' },
      { when: 'T0 +2:15', what: 'Break: hot food, refill drinks, stretch' },
      { when: 'T0 +2:45', what: 'Second game — shorter, lighter' },
      { when: 'T0 +4h', what: 'Wind down; boxes checked for pieces before anyone goes' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep snacks topped up and drinks off the board; return pieces to their boxes between games' },
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
