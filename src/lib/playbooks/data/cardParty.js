// Card Party — Event OS host playbook (data only).
//
// The African American card-table social built around Spades and Bid Whist —
// games of African American origin (Bid Whist the elder, Spades its descendant),
// passed down at family reunions, cookouts, and after-dinner tables for
// generations. Both are PARTNER games: four to a table, partners seated across
// from each other, the table the center of gravity. The vibe is competitive-
// but-loving — talking trash is part of the love language, music sits low
// enough to hear the table, and the food grazes (wings, meatballs, deviled
// eggs, a charcuterie, a pot of chili or gumbo on the stove). Drinks lean grown
// (brown liquor + mixers, wine, beer, a signature punch, plenty of water), but
// it's a thinking game so the pour stays moderate. Quantities are common US
// home-hosting rules of thumb. This file is written with cultural care — insider
// practice, dignity-first, no caricature — and is labeled `synthesized` until
// citations are attached. ESM default export.

const cardParty = {
  type: 'Card Party',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',

  meta: {
    summary: 'A Spades and Bid Whist card-table social in the African American hosting tradition — four to a table, partners across from each other, talking-trash-but-loving. Grazing soul-food finger foods, a grown drink spread kept moderate (it is a thinking game), good light over every table, and music low enough to hear the smack talk. Best small to medium and sized in fours so every table stays full.',
    typicalGuests: { low: 8, default: 12, high: 24 },
    typicalDurationHours: 4,
    leadTimeDays: 10,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 14, high: 30, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The trash talk gets loud and everyone at every table can hear it.',
    'Someone calls a Boston and the whole room responds.',
    'The food hits the table and the game stops — just for a minute.',
    'The last hand goes long and nobody wants to leave.',
    'The right song comes on at the exact right moment between hands.',
  ],

  decisions: [
    { id: 'game_format', label: 'What are we playing?', options: ['Spades', 'Bid Whist', 'Both (some tables Spades, some Bid)', 'Tournament bracket (winners rotate up)'], default: 'Spades', when: 'T-10d', blocks: ['tables', 'cards', 'score'], why: 'Both are partner games seating exactly four per table, so format mostly drives the vibe and how you size tables — but it changes the kit. Bid Whist needs the two jokers (big and little) IN the deck; straight Spades usually pulls them. Decide house rules up front (talking across the table, renege calls, blind nil / Boston) so nobody relitigates them mid-hand. A bracket adds energy and a winners-rotate-up flow but needs a posted board and someone keeping it moving.' },
    { id: 'food_model', label: 'Who feeds the room?', options: ['Host provides the spread', 'Potluck (everybody brings a dish)', 'Host cooks one pot + guests fill in sides'], default: 'Host cooks one pot + guests fill in sides', when: 'T-10d', blocks: ['food'], why: 'A card party feeds itself for hours, so the food grazes rather than sits down. Host-provided is predictable but the priciest; full potluck is the tradition and the cheapest but needs a quick coordination text so you do not end up with four bags of chips and no protein. The middle path — host puts a pot on (chili, gumbo, or a wing tray) and guests bring sides and sweets — is the classic, low-stress move.' },
    { id: 'drinks', label: 'What is the drink spread? (it is a thinking game — keep it grown but moderate)', options: ['Beer + wine + soda only', 'Add a signature punch', 'Brown liquor + mixers + a punch', 'Full bar'], default: 'Brown liquor + mixers + a punch', when: 'T-10d', blocks: ['beverage_purchases'], why: 'The grown table leans brown liquor (bourbon, brown, cognac) with mixers, wine, and a cold beer — plus a signature punch that pours itself and water people actually drink. Plan ~1 drink/guest/hour as the ceiling, but a partner game rewards a clear head, so most tables sip slower than a party — buy to the ceiling, expect to use less. A full bar is rarely worth the bartending when a good punch carries the night.' },
  ],

  milestones: [
    { id: 'cp_invite', name: 'Invite sent + headcount started (count in fours)', offsetDays: 10, owner: 'host', category: 'planning', risk: { ifDelayed: 'Cannot size tables, food, or drinks; odd headcount leaves a table short a hand', severity: 'med' } },
    { id: 'cp_rules', name: 'Format + house rules set; kit confirmed', offsetDays: 7, owner: 'host', dependsOn: ['cp_invite'], category: 'planning', risk: { ifDelayed: 'Rules argued mid-hand; a deck short or no score pads stalls a table', severity: 'med' } },
    { id: 'cp_tables', name: 'Tables + chairs + lighting locked (one table per 4)', offsetDays: 5, owner: 'host', dependsOn: ['cp_invite'], category: 'setup', risk: { ifDelayed: 'Players crowd one table or play in bad light', severity: 'med' } },
    { id: 'cp_menu', name: 'Menu + drinks locked; potluck assignments out', offsetDays: 5, owner: 'host', dependsOn: ['cp_invite'], category: 'food', risk: { ifDelayed: 'Duplicate dishes / gaps in the spread', severity: 'low' } },
    { id: 'cp_shop', name: 'Shopping complete', offsetDays: 1, owner: 'host', dependsOn: ['cp_menu'], category: 'shopping', risk: { ifDelayed: 'Scramble day-of', severity: 'med' } },
    { id: 'cp_cook', name: 'The pot is on; spread prepped', offsetDays: 0, owner: 'host', dependsOn: ['cp_shop'], category: 'food', risk: { ifDelayed: 'Food not ready when the first table sits down', severity: 'med' } },
    { id: 'cp_space', name: 'Room set: tables squared up, light over each, food + bar stations, music low', offsetDays: 0, owner: 'host', dependsOn: ['cp_tables', 'cp_cook'], category: 'setup', risk: null },
    { id: 'event', name: 'Cards out — first hands dealt', offsetDays: 0, owner: 'host', dependsOn: ['cp_space'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'cp_invite', phase: 'guest', label: 'Send the invite with date, time, and "we are playing Spades/Bid" — ask for a firm RSVP and count heads in fours so every table stays full (line up a fifth/spare to fill a no-show seat)', when: 'T-10d' },
    { id: 't_rules', milestoneId: 'cp_rules', phase: 'plan', label: 'Set the format and post house rules: talking across the table (or not), renege calls, blind nil / Boston, and the cut. Pick Spades vs Bid per table and whether it is a bracket', when: 'T-7d' },
    { id: 't_kit', milestoneId: 'cp_rules', phase: 'plan', label: 'Confirm the kit: 2+ reliable, complete decks PER TABLE (one in play, one shuffling), jokers IN for Bid Whist / OUT for Spades, a score pad + pen per table', when: 'T-7d' },
    { id: 't_tables', milestoneId: 'cp_tables', phase: 'setup', label: 'Count card tables and chairs: one 34" square table + 4 chairs per group of four. Borrow or rent folding card tables if short; test bright, even light over every seat', when: 'T-5d' },
    { id: 't_menu', milestoneId: 'cp_menu', phase: 'food', label: 'Lock the grazing spread (one pot + finger foods + sweets); if potluck, assign categories by text so the proteins, sides, and desserts all get covered', when: 'T-5d' },
    { id: 't_shop', milestoneId: 'cp_shop', phase: 'shopping', label: 'Main shop: pot ingredients, wings/meatball fixings, deviled-egg + charcuterie makings, chips/dip, liquor/mixers/wine/beer, punch base, water, napkins, cups/plates, trash bags', when: 'T-1d' },
    { id: 't_prep', milestoneId: 'cp_shop', phase: 'food', label: 'Prep ahead: boil + fill deviled eggs, build the charcuterie, portion dips, season/marinate proteins, mix the punch base, start chilling all drinks', when: 'T-1d evening' },
    { id: 't_cook', milestoneId: 'cp_cook', phase: 'food', label: 'Put the pot on (chili/gumbo) low and slow; bake/fry the wings + meatballs so they hit warm as the first table sits down', when: 'T0 -3:00' },
    { id: 't_space', milestoneId: 'cp_space', phase: 'setup', label: 'Square up the tables with a real seat per player, bright even light over each, partners able to sit across; queue a low playlist (grown and groovy — under the table talk)', when: 'T0 -1:00' },
    { id: 't_station', milestoneId: 'cp_space', phase: 'setup', label: 'Set the food station and the bar AWAY from the tables: spread laid out, punch + water + ice out, cups/plates/napkins stacked; decks + score pad + pen on every table; trash + recycling visible', when: 'T0 -0:30' },
    { id: 't_refresh', milestoneId: 'event', phase: 'food', label: 'Snack refresh ~2 hours in: top up the spread, refill the pot bowl, restock the bar + ice + water, swap a full trash bag — keep the room fed without breaking the tables', when: 'T0 +2:00' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Wind down: clear cups/plates, bag trash + recycling, pack leftovers, gather every deck (count back to 52 / 54), fold and stack the card tables', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_pot', item: 'A pot of something (chili, gumbo, or red beans) — the anchor', category: 'food', qtyFlat: 1, qtyPer: 8, unit: 'pot', where: ['Grocery'], unitCostRange: [20, 45], essential: false, buyAt: 'T-1d', note: 'One pot on the stove feeds the room for hours and grows the longer it sits. ~1 pot per 8 guests; cornbread or rice on the side stretches it.', alternatives: ['Canned red beans + rice — cheapest version, add sausage to elevate', 'Store-bought chili + toppings bar — if cooking time is short'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'Home-cooking yield estimate for a stovetop pot meal served as grazing.' } },
    { id: 'p_wings', item: 'Wings + meatballs (the warm proteins)', category: 'food', qtyPerGuest: 4, unit: 'piece', where: ['Grocery', 'Costco'], unitCostRange: [0.6, 1.25], essential: true, buyAt: 'T-1d', note: '~4-5 wings/meatballs per guest across the night. Saucy by nature — keep them at the food station with plenty of napkins, not on the card tables.', alternatives: ['Costco frozen meatballs (bag) — cheapest warm protein option', 'Chicken drumsticks — cheaper per lb than wings, same saucy concept'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~6-8 appetizer bites/person/hour when food is grazing-only; protein is a share of that.' } },
    { id: 'p_deviled', item: 'Deviled eggs (the classic — half an egg per guest)', category: 'food', qtyPerGuest: 1, unit: 'half', where: ['Grocery'], unitCostRange: [0.25, 0.5], essential: false, buyAt: 'T-1d', note: 'A card-table staple. Plan ~1-2 halves/guest; they go fast. Make-ahead the day before.', alternatives: ['Hard-boiled eggs with salt — if short on time, simpler version'] },
    { id: 'p_board', item: 'Charcuterie / finger foods (cheese, cured meats, crackers, veggie cups, dips)', category: 'food', qtyPerGuest: 1, unit: 'portion', where: ['Grocery', 'Costco'], unitCostRange: [3, 6], essential: true, buyAt: 'T-1d', note: 'Dry, one-hand bites that keep fingers clean for cards; the dips stay at the station, off the table.', alternatives: ['Costco party platter — cheaper per person than building from scratch', 'Store-brand crackers + block cheese sliced — budget version of charcuterie'] },
    { id: 'p_chips', item: 'Chips, pretzels, party mix + dips/salsa', category: 'food', qtyPerGuest: 1, unit: 'snack serving', where: ['Grocery', 'Costco'], unitCostRange: [1, 2.5], essential: true, buyAt: 'T-1d', note: 'Cheap grazing filler that holds all night; ~6-8 finger-food bites/guest/hour total across the whole spread.', alternatives: ['Store-brand chips — same function at half the price', 'Popcorn (microwave bags) — cheapest snack filler option'] },
    { id: 'p_dessert', item: 'Sweets (pound cake, peach cobbler, cookies, banana pudding)', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery', 'Bakery', 'Home'], unitCostRange: [1.5, 3.5], essential: false, buyAt: 'T-1d', note: 'A sweet to close out the night; pound cake and banana pudding are the card-table classics. Often the easiest potluck ask.', alternatives: ['Store-bought pound cake — slice and plate, no baking required', 'Grocery bakery cookies by the dozen — cheapest dessert per serving'] },
    { id: 'p_brown', item: 'Brown liquor (bourbon / brown / cognac) + mixers', category: 'beverage', qtyFlat: 1, qtyPer: 8, unit: 'bottle + mixers', where: ['Liquor store'], unitCostRange: [25, 50], essential: false, buyAt: 'T-1d', note: 'The grown pour. ~1 bottle (750ml ≈ 16 drinks) per 8 guests with cola/ginger/club as mixers; lighter than a party because it is a thinking game.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~16 standard drinks per 750ml; ~1 drink/guest/hour ceiling, less in practice for a partner card game.' } },
    { id: 'p_wine_beer', item: 'Wine + beer', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery', 'Liquor store'], unitCostRange: [1.5, 3], essential: true, buyAt: 'T-1d', note: '~1 wine bottle per 4 guests + a case or two of beer; covers the table that is not on the brown. Not everyone drinks — do not buy a full ration per category.' },
    { id: 'p_punch', item: 'Signature punch (base juice, bubbly/ginger ale, fruit, optional spirit)', category: 'beverage', qtyFlat: 1, qtyPer: 10, unit: 'batch', where: ['Grocery', 'Liquor store'], unitCostRange: [15, 30], essential: false, buyAt: 'T-1d', note: 'One make-ahead punch pours itself all night and signals the occasion; make a spiked AND a non-spiked bowl so everyone is covered.' },
    { id: 'p_water', item: 'Water + sparkling water + soda (over-stock these)', category: 'beverage', qtyPerGuest: 3, unit: 'can/bottle', where: ['Grocery', 'Costco'], unitCostRange: [0.4, 1.25], essential: true, buyAt: 'T-1d', note: 'A thinking game runs on water and soda as much as liquor — over-stock; many guests stay non-alcoholic the whole night.' },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.3, 0.5], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest for a 4h night with mixed drinks + a punch bowl; buy day-of so it does not melt.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1-1.5 lb ice/guest; higher end for a longer night with a punch bowl and cocktails.' } },
    { id: 'p_cards', item: 'Reliable playing-card decks (2+ per table) + score pads + pens', category: 'logistics', qtyFlat: 2, qtyPer: 4, unit: 'deck', where: ['Big-box', 'Drugstore', 'Home'], unitCostRange: [2, 6], essential: true, buyAt: 'T-3d', note: 'The whole night depends on it: 2 complete decks PER TABLE (one in play, one being shuffled), full 54 with both jokers for Bid Whist. A worn or short deck is the #1 avoidable foul.', provenance: { tier: 'trade-heuristic', confidence: 'high', verificationStatus: 'established-consensus', note: 'Bid Whist uses a 54-card deck (52 + 2 distinct jokers); Spades typically a standard 52.' } },
    { id: 'p_napkins', item: 'Napkins + paper towels (saucy proteins) + hand wipes', category: 'logistics', qtyPerGuest: 8, unit: 'napkin', where: ['Grocery'], unitCostRange: [0.03, 0.08], essential: true, buyAt: 'T-1d', note: 'COMMONLY FORGOTTEN: wing sauce on the cards is the night-killer. Stock plenty at the food station AND a few napkins on each table.' },
    { id: 'p_cups_plates', item: 'Cups, small plates, snack bowls', category: 'logistics', qtyPerGuest: 4, unit: 'piece', where: ['Grocery', 'Party store'], unitCostRange: [0.1, 0.3], essential: true, buyAt: 'T-1d', note: 'Small plates keep crumbs off the table; cups for the bar + punch + water. Disposables cut cleanup over a long night.' },
    { id: 'p_trash', item: 'Trash + recycling bags', category: 'cleanup', qtyFlat: 1, qtyPer: 6, unit: 'roll/kit', where: ['Grocery'], unitCostRange: [3, 7], essential: true, buyAt: 'T-1d', note: 'COMMONLY FORGOTTEN: a 4h grazing night fills bags. Have 3-4 ready so you can swap mid-night without a hunt.' },
  ],

  rentalsGap: [
    { item: 'Card tables (34" square, seats 4) — one per group of four', qtyPerGuest: 0.25, note: 'The core of the room: one table per FOUR guests so every partnership has a full table. Borrow or rent folding card tables to top up your own. Round headcount up to the next four.' },
    { item: 'Chairs — a real seat per player', qtyPerGuest: 1, note: 'Four sturdy chairs per table; nobody plays a four-hour partner game perched on an arm. Borrow folding chairs rather than going short.' },
    { item: 'Bright, even light over every table', qtyPerGuest: 0.25, note: 'One good light source per table — cards have to read clearly from every seat. A clip lamp or floor lamp rescues a dim corner table.' },
    { item: 'A food / bar table (off the card tables)', qtyFlat: 2, note: 'One surface for the spread and one for the bar + punch, both away from play so the card tables stay clean playing surfaces.' },
    { item: 'Decks + score pads + pens', qtyPerGuest: 0.5, note: 'Two reliable decks and a score pad per table; the night stops without them.' },
  ],

  vendors: [
    { category: 'Soul-food catering / wing tray', required: false, altToDIY: 'A pot on the stove plus a tray of wings and a charcuterie does the whole job for a fraction of the cost.', when: 'T-3d', costRange: [80, 250], costUnit: 'flat' },
    { category: 'Card-table + chair rental', required: false, altToDIY: 'Borrow folding card tables and chairs from friends before paying to rent; rent only the shortfall for a bigger crowd.', when: 'T-5d', costRange: [8, 20], costUnit: 'per table' },
    { category: 'Bartender (only if full bar)', required: false, altToDIY: 'A make-ahead signature punch carries a card party without a bartender; skip unless you chose a full bar.', when: 'T-3d', costRange: [150, 350], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_foodsafe', trigger: 'Perishable grazing food (deviled eggs, a pot of chili/gumbo, saucy wings) sits out all night', severity: 'med', mitigation: 'Deviled eggs, mayo dishes, and proteins are perishable — don\'t leave them out more than 2 hours. Keep the pot hot (slow cooker) and cold dishes cold/on ice, refresh in waves, and refrigerate leftovers promptly.' },
    { id: 'r_odd', trigger: 'Headcount not a multiple of four — a table sits a hand short', severity: 'med', mitigation: 'Count RSVPs in fours; line up a flexible fifth/sixth to fill a no-show seat, or set a rotating "next up" so nobody sits out long.' },
    { id: 'r_deck', trigger: 'A deck is worn, marked, or short a card mid-hand', severity: 'med', mitigation: 'Two complete decks per table (one in play, one shuffling); count every deck to 52/54 before guests; keep a fresh sealed deck in reserve.' },
    { id: 'r_sauce', trigger: 'Saucy wings/meatballs grease up the cards', severity: 'med', mitigation: 'Keep saucy proteins at the food station, never on the card tables; napkins on every table and plenty at the spread; dry one-hand snacks for the table.' },
    { id: 'r_light', trigger: 'A table is too dim to read cards', severity: 'med', mitigation: 'Bright, even light over each table set at T-5d; test from all four seats; a clip/floor lamp for the dim corner.' },
    { id: 'r_loud', trigger: 'Music too loud to hear the table talk and the calls', severity: 'low', mitigation: 'Keep the playlist low — grown and groovy, under the trash talk; the table is the entertainment, not the speakers.' },
    { id: 'r_heated', trigger: 'A renege call or a partner spat gets heated', severity: 'low', mitigation: 'House rules posted up front (renege, talking across, Boston/nil) so a disputed call has a settled answer; keep it competitive-but-loving — laugh it off and re-deal.' },
    { id: 'r_drinks', trigger: 'Short on ice, water, or mixers late in a long night', severity: 'low', mitigation: 'Over-stock water/soda and ice; keep a backup bag of ice and a reserve mixer/case on hand.' },
  ],

  contingencies: [
    { id: 'c_odd', when: 'r_odd', plan: 'Run a "winners stay / next up rotates in" flow or a quick bracket so an odd number cycles through instead of one person sitting the whole night.' },
    { id: 'c_deck', when: 'r_deck', plan: 'Swap to the reserve deck immediately; re-deal the fouled hand; retire the bad deck for the night.' },
    { id: 'c_sauce', when: 'r_sauce', plan: 'Pause, blot and air-dry the cards or swap in the reserve deck; move the saucy tray further from the tables; refresh napkins.' },
    { id: 'c_light', when: 'r_light', plan: 'Move that table under a brighter fixture or add a lamp; swap a dim table with a well-lit one if a corner cannot be fixed.' },
    { id: 'c_heated', when: 'r_heated', plan: 'Call the posted house rule, re-deal if needed, change partners for the next hand, and let the punch and the next deal reset the room.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Cards + score pads + pens (count decks now), non-perishables: chips, party mix, soda/water, napkins, cups/plates, trash bags' },
      { when: 'T-1d', what: 'Main shop: pot ingredients, wings/meatballs, deviled-egg + charcuterie makings, dips, sweets, liquor/mixers/wine/beer, punch base' },
      { when: 'T0', what: 'Pick up ice last so it does not melt' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Boil + fill deviled eggs, build the charcuterie, portion dips, season/marinate proteins, mix the punch base, start chilling all drinks' },
      { when: 'T0 -3h', what: 'Pot on low and slow; bake/fry wings + meatballs to hit warm at start; plate the cold spread' },
    ],
    setup: [
      { when: 'T0 -1h', what: 'Square up the card tables (one per four), real seat per player, bright even light over each, partners able to sit across; queue a low grown-and-groovy playlist' },
      { when: 'T0 -0:30', what: 'Food station + bar set AWAY from the tables; punch + water + ice out; cups/plates/napkins stacked; 2 decks + score pad + pen on every table; trash/recycling visible' },
    ],
    cleanup: [
      { when: 'T0 +2:00', what: 'Snack refresh: top up the spread + pot bowl, restock the bar + ice + water, swap any full trash bag' },
      { when: 'T0 +4:00', what: 'Clear cups/plates, bag trash + recycling, pack leftovers, gather + count every deck back to 52/54, fold and stack the card tables' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'This playbook is grounded in the African American card-table tradition: Spades and Bid Whist are partner games of African American origin (Bid Whist the elder, descended through Whist; Spades its descendant), carried for generations through family reunions, cookouts, and after-dinner tables as a way to gather, bond across generations, and talk a little loving trash. The hosting specifics here — four to a table with partners seated across, sizing the room in fours so every table stays full, posted house rules (renege, talking across the table, blind nil / Boston, the cut), a complete and reliable deck (54 with both jokers for Bid Whist, 52 for Spades), light over every table, music low enough to hear the table, grazing soul-food finger foods anchored by a pot on the stove, and a grown-but-moderate drink spread led by brown liquor and a signature punch — reflect respectful insider practice, not stereotype. Quantities are common US home-hosting rules of thumb (~6-8 finger-food bites/guest/hour grazing; ~1 drink/guest/hour as a ceiling but lighter in practice for a thinking game; ~16 standard drinks per 750ml; ~1.5 lb ice/guest for a long night with a punch bowl). These are planning baselines, not guarantees — adjust for your crowd. Labeled synthesized; no fabricated sources.',
    sources: [],
  },
};

export default cardParty;
