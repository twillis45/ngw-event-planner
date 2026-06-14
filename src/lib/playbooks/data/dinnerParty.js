// Dinner Party — Event OS playbook data (Sprint 55C-1).
//
// Moved into src/ from engine-audit/playbooks/dinner-party.playbook.json so the
// runtime reads it from the production bundle (no import across the repo's
// non-shipped tooling dir). ESM default export — no CJS module.exports in src/
// (see the prod-bundle ESM lesson). The shape is the authored playbook verbatim;
// the reader (../index.js) consumes `purchases` first for the operational
// candidate, with the rest available as the engine grows.

const dinnerParty = {
  type: 'Dinner Party',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary:
      'An intimate, host-cooked seated dinner. The host IS the planner, caterer, and cleanup crew — so the playbook front-loads decisions and back-loads a realistic day-of cooking + reset schedule.',
    typicalGuests: { low: 6, default: 8, high: 12 },
    typicalDurationHours: 4,
    leadTimeDays: 21,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 30, high: 120, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  decisions: [
    { id: 'format', label: 'Seated dinner or buffet / family-style?', options: ['Plated 3-course', 'Family-style', 'Buffet', 'Grazing + small plates'], default: 'Family-style', when: 'T-21d', blocks: ['menu', 'rentals', 'seating'], why: 'Drives plate/serveware counts, table layout, and how much active cooking lands on the host during the party.' },
    { id: 'menu', label: 'Lock the menu (incl. a vegetarian main)', options: [], default: null, when: 'T-14d', dependsOn: ['format', 'dietary'], blocks: ['shopping_list', 'cook_schedule'], why: 'Every quantity, the shopping list, and the cook timeline derive from this. A dinner party with no locked menu at T-7 is the #1 host failure mode.' },
    { id: 'dietary', label: 'Collect dietary restrictions + allergies with the invite', options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Nut allergy', 'Dairy-free', 'Shellfish', 'Halal', 'Kosher', 'Pescatarian', 'Alcohol-free'], default: null, when: 'T-14d', blocks: ['menu'], why: 'One unflagged severe allergy can send a guest to the ER. Must be collected BEFORE the menu locks, never after.' },
    { id: 'alcohol', label: 'Alcohol strategy', options: ['Host provides full bar', 'Wine + one cocktail', 'Wine + beer only', 'BYOB', 'Zero-proof / dry'], default: 'Wine + one signature cocktail', when: 'T-14d', blocks: ['beverage_purchases'], why: 'Determines spend (often 25-40% of a dinner-party budget), glassware counts, and whether a bartender is worth it.' },
    { id: 'seating', label: 'Open seating or place cards?', options: ['Open', 'Place cards', 'Host-assigned'], default: 'Host-assigned for 8+', when: 'T-2d', dependsOn: ['format'], why: 'For 8+ guests, assigned seating prevents the awkward shuffle and lets the host seat the right energy together.' },
    { id: 'help', label: 'DIY, or bring in help?', options: ['Fully DIY', 'Hire a cleaner for after', 'Hire a bartender', 'Drop-off catering for 1 course', 'Private chef'], default: 'Fully DIY', when: 'T-10d', blocks: ['vendors'], why: 'The honest tradeoff: a $150 post-party cleaner or a $200 bartender is what lets the host actually enjoy their own party.' },
  ],

  milestones: [
    { id: 'dp_setdate', name: 'Set date + guest count + budget', offsetDays: 21, owner: 'host', category: 'planning', risk: null },
    { id: 'dp_invite', name: 'Send invites + ask dietary/allergy + RSVP', offsetDays: 18, owner: 'host', dependsOn: ['dp_setdate'], category: 'guest', risk: { ifDelayed: 'Low RSVP visibility → wrong food quantities', severity: 'med' } },
    { id: 'dp_menu', name: 'Lock the menu (with a veg main + allergy swaps)', offsetDays: 14, owner: 'host', dependsOn: ['dp_invite'], category: 'food', risk: { ifDelayed: 'No shopping list / cook plan possible', severity: 'high' } },
    { id: 'dp_rentals', name: 'Confirm serveware / glassware / seating capacity (rent or borrow gap)', offsetDays: 7, owner: 'host', dependsOn: ['dp_menu'], category: 'rental', risk: { ifDelayed: 'Not enough matching plates/chairs day-of', severity: 'med' } },
    { id: 'dp_rsvp_close', name: 'Confirm final headcount (chase the maybes)', offsetDays: 3, owner: 'host', dependsOn: ['dp_invite'], category: 'guest', risk: { ifDelayed: 'Over/under-buy food by 20-30%', severity: 'high' } },
    { id: 'dp_shop_pantry', name: 'Buy pantry, alcohol, non-perishables', offsetDays: 3, owner: 'host', dependsOn: ['dp_menu'], category: 'shopping', risk: null },
    { id: 'dp_shop_fresh', name: 'Buy fresh produce, proteins, bread, flowers', offsetDays: 1, owner: 'host', dependsOn: ['dp_menu', 'dp_rsvp_close'], category: 'shopping', risk: { ifDelayed: 'Sold-out proteins / wilted produce', severity: 'med' } },
    { id: 'dp_prep_ahead', name: 'Make-ahead prep (sauces, braises, dessert, mise en place)', offsetDays: 1, owner: 'host', dependsOn: ['dp_shop_fresh'], category: 'food', risk: null },
    { id: 'dp_setup', name: 'Set the table, chill drinks, stage the space', offsetDays: 0, owner: 'host', dependsOn: ['dp_rentals', 'dp_prep_ahead'], category: 'setup', risk: null },
    { id: 'event', name: 'The dinner party', offsetDays: 0, owner: 'host', dependsOn: ['dp_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'dp_invite', phase: 'guest', label: 'Text/email invite with date, time, address, dietary-ask, and a soft RSVP-by date', when: 'T-18d' },
    { id: 't_rsvp_chase', milestoneId: 'dp_rsvp_close', phase: 'guest', label: 'Chase non-responders; lock the seated count', when: 'T-3d' },
    { id: 't_pantry_shop', milestoneId: 'dp_shop_pantry', phase: 'shopping', label: 'Pantry + alcohol + paper goods run (non-perishables, can buy early)', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'dp_shop_fresh', phase: 'shopping', label: 'Produce, proteins, bread, dairy, flowers (buy 24-36h out, not sooner)', when: 'T-1d' },
    { id: 't_braise', milestoneId: 'dp_prep_ahead', phase: 'food', label: "Cook anything that's better reheated (braises, stews, sauces, soups)", when: 'T-1d evening' },
    { id: 't_dessert', milestoneId: 'dp_prep_ahead', phase: 'food', label: 'Make dessert ahead (tart/cake/set custard chill overnight)', when: 'T-1d evening' },
    { id: 't_mise', milestoneId: 'dp_prep_ahead', phase: 'food', label: 'Mise en place: chop, marinate, portion, label containers', when: 'T-1d evening' },
    { id: 't_table', milestoneId: 'dp_setup', phase: 'setup', label: 'Set the table: linens, plates, glasses, flatware, napkins, place cards, centerpiece, candles', when: 'T0 afternoon' },
    { id: 't_chill', milestoneId: 'dp_setup', phase: 'beverage', label: 'Chill white wine + sparkling 2-3h before; set up the bar/drinks station + ice', when: 'T0 -3h' },
    { id: 't_clean_pre', milestoneId: 'dp_setup', phase: 'cleanup', label: 'Pre-clean: empty dishwasher, clear sink, set up a bus tub / trash + recycling station', when: 'T0 -2h' },
    { id: 't_appetizer', milestoneId: 'event', phase: 'food', label: 'Plate/serve appetizer as guests arrive (room-temp friendly)', when: 'T0 +0:15' },
    { id: 't_main', milestoneId: 'event', phase: 'food', label: 'Reheat + plate mains; rest proteins; dress salad last-minute', when: 'T0 +1:00' },
    { id: 't_clear', milestoneId: 'event', phase: 'cleanup', label: "Clear courses into the staged bus tub (don't wash mid-party)", when: 'ongoing' },
    { id: 't_coffee', milestoneId: 'event', phase: 'beverage', label: 'Coffee/tea + dessert + digestifs', when: 'T0 +2:30' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Post-party reset: leftovers into containers, run dishwasher, hand-wash delicates, trash out, linens to soak', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_protein', item: 'Main protein (e.g. beef short rib / salmon / mushroom wellington for veg)', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Butcher', 'Grocery', 'Costco', 'Instacart'], unitCostRange: [8, 18], essential: true, buyAt: 'T-1d', substitutes: ['roast chicken (cheaper)', 'pasta course (cheapest)'] },
    { id: 'p_starch', item: 'Starch side (potato/grain/risotto)', category: 'food', qtyPerGuest: 0.3, unit: 'lb', where: ['Grocery'], unitCostRange: [1, 3], essential: true, buyAt: 'T-1d' },
    { id: 'p_veg', item: 'Vegetable side + salad greens', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery', 'Farmers market'], unitCostRange: [2, 5], essential: true, buyAt: 'T-1d' },
    { id: 'p_appetizer', item: 'Appetizer / grazing (cheese, charcuterie, dips, crackers)', category: 'food', qtyPerGuest: 0.25, unit: 'lb', where: ['Grocery', 'Cheese shop'], unitCostRange: [4, 9], essential: true, buyAt: 'T-3d' },
    { id: 'p_bread', item: 'Bread / rolls', category: 'food', qtyFlat: 1, qtyPer: 4, unit: 'loaf per 4 guests', where: ['Bakery', 'Grocery'], unitCostRange: [4, 8], essential: false, buyAt: 'T-1d' },
    { id: 'p_dessert', item: 'Dessert (or ingredients)', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Bakery', 'Grocery'], unitCostRange: [3, 7], essential: true, buyAt: 'T-1d' },
    { id: 'p_wine', item: 'Wine', category: 'beverage', qtyPerGuest: 0.5, unit: 'bottle (½ bottle/guest rule)', where: ['Wine shop', 'Total Wine', 'Grocery'], unitCostRange: [12, 25], essential: true, buyAt: 'T-3d', note: 'Rule of thumb: ½ bottle per drinking guest for a 3-4h dinner; round up.' },
    { id: 'p_cocktail', item: 'Signature cocktail spirits + mixers + garnish', category: 'beverage', qtyFlat: 1, unit: 'batch (serves ~10)', where: ['Liquor store'], unitCostRange: [40, 70], essential: false, buyAt: 'T-3d', dependsOnDecision: 'alcohol' },
    { id: 'p_nonalc', item: 'Non-alcoholic options (sparkling water, mocktail, juice)', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery'], unitCostRange: [1, 2], essential: true, buyAt: 'T-3d', note: 'Always have a great zero-proof option — designated drivers, non-drinkers, pregnant guests.' },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest for chilling + drinks.' },
    { id: 'p_coffee', item: 'Coffee + tea + cream/sugar', category: 'beverage', qtyFlat: 1, unit: 'service', where: ['Grocery'], unitCostRange: [6, 12], essential: true, buyAt: 'T-3d' },
    { id: 'p_flowers', item: 'Centerpiece flowers', category: 'decor', qtyFlat: 1, qtyPer: 6, unit: 'arrangement per 6 guests', where: ['Florist', "Trader Joe's", 'Farmers market'], unitCostRange: [15, 45], essential: false, buyAt: 'T-1d' },
    { id: 'p_candles', item: 'Candles (taper/tealight, unscented at the table)', category: 'decor', qtyFlat: 6, unit: 'candles', where: ['Grocery', 'Ikea', 'Amazon'], unitCostRange: [0.5, 3], essential: false, buyAt: 'T-3d', note: 'Unscented only at the table — scented competes with the food.' },
    { id: 'p_napkins', item: 'Cloth or premium paper napkins', category: 'rental', qtyPerGuest: 1.5, unit: 'napkins', where: ['Have/borrow', 'Grocery'], unitCostRange: [0.3, 2], essential: true, buyAt: 'T-3d' },
    { id: 'p_paper', item: 'Paper goods (cocktail napkins, parchment, foil, food storage containers for leftovers)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [10, 20], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: leftover containers for sending food home.' },
    { id: 'p_dish', item: 'Dish soap, sponges, trash + recycling bags', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 15], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: extra trash bags + a recycling bag for bottles.' },
  ],

  // Day-of run-of-show schedules (brought into src from the canonical
  // dinner-party.playbook.json so the runtime can surface them — Sprint 55H-B1).
  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Pantry, alcohol, paper goods, candles, non-perishables, dish/cleanup kit' },
      { when: 'T-1d', what: 'Proteins, produce, bread, dairy, dessert ingredients, flowers' },
      { when: 'T0', what: 'Ice + any last-minute fresh herbs/garnish' },
    ],
    cooking: [
      { when: 'T-1d evening', what: 'Braises/sauces/soup, dessert, full mise en place, marinate proteins' },
      { when: 'T0 -4h', what: 'Slow-cook/roast items; prep salad components (dress later)' },
      { when: 'T0 -1h', what: 'Reheat make-ahead; bring proteins to room temp' },
      { when: 'guests arrive', what: 'Plate appetizer; finish/plate mains; dress salad' },
    ],
    setup: [
      { when: 'T0 -3h', what: 'Set the table: linens, plates, glasses, flatware, place cards, centerpiece, candles' },
      { when: 'T0 -3h', what: 'Chill whites/sparkling; build the drinks station + ice tub' },
      { when: 'T0 -2h', what: 'Empty dishwasher, stage bus tub + trash/recycling, light candles 15 min before' },
    ],
    cleanup: [
      { when: 'during', what: 'Clear courses into the staged bus tub; do NOT wash mid-party' },
      { when: 'T0 +4h', what: 'Leftovers into containers (send some home), run dishwasher, hand-wash delicates, bottles to recycling, linens to soak' },
    ],
  },
};

export default dinnerParty;
