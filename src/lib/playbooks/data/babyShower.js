// Baby Shower — Event OS host playbook (Sprint 55D, data only).
//
// A host-run baby shower (home, a backyard, or a small rented room). Brunch/
// finger-food forward, frequently alcohol-free, games + favors. Quantities are
// common US host/shower rules of thumb (see `knowledge`), authored honestly as
// established-consensus / trade-heuristic and labeled `synthesized` until a
// foreground verification pass attaches citations. ESM default export.

const babyShower = {
  type: 'Baby Shower',
  solveFamily: 'baby_shower',
  family: 'host_driven',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A host-run baby shower — daytime, finger-food/brunch forward, often alcohol-free, with games + favors. Host is planner, caterer, and cleanup, so the playbook front-loads guest list + menu and back-loads a calm setup → shower → reset.',
    typicalGuests: { low: 15, default: 25, high: 40 },
    typicalDurationHours: 3,
    leadTimeDays: 28,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 15, high: 50, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The guest of honor opens the gift that makes her cry in the best way.',
    'Everyone leans in to feel the baby kick — the room holds its breath.',
    'The advice cards are read out loud and the whole room laughs at the honest ones.',
    'The moment she realizes how many people showed up just to celebrate this baby.',
  ],

  decisions: [
    { id: 'food_style', label: 'How is the food handled?', options: ['Host makes a brunch spread', 'Drop-off catering', 'Potluck', 'Order platters'], default: 'Host makes a brunch spread', when: 'T-21d', blocks: ['food', 'vendors'], why: 'A daytime shower is grazing food — easy to host-make, or a drop-off if the guest list is big.' },
    { id: 'style', label: 'Shower style', options: ['Brunch', 'Afternoon tea / sweets', 'Lunch buffet', 'Co-ed "sip & see"'], default: 'Brunch', when: 'T-28d', blocks: ['menu', 'beverage_purchases'], why: 'Sets the menu, time of day, and whether it skews sweet or savory.' },
    { id: 'guestlist', label: 'Finalize guest list with the parent(s)', options: [], default: null, when: 'T-21d', blocks: ['food', 'favors', 'tableware'], why: 'Every quantity scales from this; confirm with the guest of honor first.' },
    { id: 'registry', label: 'Confirm registry / gift theme to share on the invite', options: ['Store registry', 'Books for baby', 'Diapers & wipes', 'No gifts'], default: 'Store registry', when: 'T-21d', why: 'Guests ask immediately; include it on the invite to reduce back-and-forth.' },
    { id: 'dietary', label: 'Collect dietary restrictions + the parent\'s pregnancy-safe needs', options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Nut allergy', 'No alcohol', 'Pregnancy-safe (no raw/soft cheese/high-mercury)'], default: 'Pregnancy-safe (no raw/soft cheese/high-mercury)', when: 'T-14d', blocks: ['menu'], why: 'The guest of honor is pregnant — avoid raw fish, soft cheeses, deli meats, high-mercury items; always offer mocktails.' },
    { id: 'games', label: 'Games / activities', options: ['Classic shower games', 'Advice cards + a craft', 'Low-key mingling only'], default: 'Advice cards + a craft', when: 'T-14d', blocks: ['activity_supplies'], why: 'Drives prize + supply purchases and the run of show.' },
  ],

  milestones: [
    { id: 'bs_setdate', name: 'Set date, guest list, budget with the parent(s)', offsetDays: 28, owner: 'host', category: 'planning', risk: null },
    { id: 'bs_invite', name: 'Send invites + registry + RSVP / dietary ask', offsetDays: 21, owner: 'host', dependsOn: ['bs_setdate'], category: 'guest', risk: { ifDelayed: 'Low RSVP visibility → wrong quantities', severity: 'med' } },
    { id: 'bs_menu', name: 'Lock the menu (pregnancy-safe + a sweet)', offsetDays: 14, owner: 'host', dependsOn: ['bs_invite', 'bs_setdate'], category: 'food', risk: { ifDelayed: 'No shopping list possible', severity: 'med' } },
    { id: 'bs_rsvp_close', name: 'Lock final headcount', offsetDays: 4, owner: 'host', dependsOn: ['bs_invite'], category: 'guest', risk: { ifDelayed: 'Over/under-buy food + favors', severity: 'high' } },
    { id: 'bs_shop_nonperish', name: 'Buy decor, favors, mocktail mixers, paper goods', offsetDays: 3, owner: 'host', dependsOn: ['bs_rsvp_close'], category: 'shopping', risk: null },
    { id: 'bs_shop_fresh', name: 'Buy fresh food, cake/desserts, flowers', offsetDays: 1, owner: 'host', dependsOn: ['bs_menu', 'bs_rsvp_close'], category: 'shopping', risk: { ifDelayed: 'Wilted produce / no cake', severity: 'med' } },
    { id: 'bs_setup', name: 'Decorate, set the table + food + drinks', offsetDays: 0, owner: 'host', dependsOn: ['bs_shop_nonperish', 'bs_shop_fresh'], category: 'setup', risk: null },
    { id: 'event', name: 'The shower', offsetDays: 0, owner: 'host', dependsOn: ['bs_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'bs_invite', phase: 'guest', label: 'Send invites with registry, RSVP-by, dietary ask', when: 'T-21d' },
    { id: 't_rsvp', milestoneId: 'bs_rsvp_close', phase: 'guest', label: 'Chase non-responders; lock the count', when: 'T-4d' },
    { id: 't_nonperish_shop', milestoneId: 'bs_shop_nonperish', phase: 'shopping', label: 'Decor, favors, mocktail mixers, games, paper goods', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'bs_shop_fresh', phase: 'shopping', label: 'Fresh food, cake/desserts, flowers', when: 'T-1d' },
    { id: 't_prep', milestoneId: 'bs_setup', phase: 'food', label: 'Make-ahead bites + dessert; assemble favors; set games', when: 'T-1d evening' },
    { id: 't_decorate', milestoneId: 'bs_setup', phase: 'setup', label: 'Decorate, set the table, food + mocktail station', when: 'T0 -3h' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Gift list for thank-yous, pack leftovers, favors out, bag trash + recycling', when: 'T0 +3:00' },
  ],

  purchases: [
    { id: 'p_food', item: 'Quiche, fruit & sandwiches (brunch spread)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco', 'Caterer'], unitCostRange: [4, 9], essential: true, buyAt: 'T-1d', alternatives: ['Costco party platters — cheaper per head, low prep', 'Deli sandwich tray — budget swap if quiche ingredients unavailable', 'Bagels + cream cheese spread — cheaper brunch option'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~0.5 lb grazing/guest for a daytime shower.' } },
    { id: 'p_cake', item: 'Cake / cupcakes / dessert table', category: 'food', qtyFlat: 1, qtyPer: 15, unit: 'cake (serves ~15)', where: ['Bakery', 'Grocery'], unitCostRange: [30, 70], essential: true, buyAt: 'T-1d', note: 'Order ahead; ~1 serving/guest.', alternatives: ['Grocery bakery sheet cake — add custom message, much cheaper', 'Cupcakes from grocery — easier to serve, no cutting required'] },
    { id: 'p_mocktail', item: 'Mocktails / punch / non-alcoholic drinks', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', note: 'Showers are often dry — make the zero-proof option great for the pregnant guest of honor.' },
    { id: 'p_coffee', item: 'Coffee + tea + cream/sugar (a 40-cup urn per ~25 guests)', category: 'beverage', qtyFlat: 1, qtyPer: 25, unit: 'urn (~40 cups)', where: ['Grocery', 'Rental', 'Party store'], unitCostRange: [12, 30], essential: true, buyAt: 'T-3d', note: 'Board-corrected: coffee is the #1 drink at a daytime shower — a single flat "service" under-spec\'s 25-40 guests. Scale ~1 large urn per 25.' },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1.5 lb ice/guest beverage-service heuristic.' } },
    { id: 'p_decor', item: 'Decorations (theme, balloons, backdrop)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Amazon', 'Target'], unitCostRange: [30, 80], essential: false, buyAt: 'T-3d' },
    { id: 'p_flowers', item: 'Centerpiece flowers', category: 'decor', qtyFlat: 1, qtyPer: 8, unit: 'arrangement per 8 guests', where: ['Florist', "Trader Joe's", 'Grocery'], unitCostRange: [15, 40], essential: false, buyAt: 'T-1d' },
    { id: 'p_favors', item: 'Favors (small thank-you gifts)', category: 'decor', qtyPerGuest: 1, unit: 'favor', where: ['Party store', 'Amazon', 'Etsy'], unitCostRange: [3, 8], essential: false, buyAt: 'T-3d' },
    { id: 'p_games', item: 'Game / activity supplies + prizes', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Amazon', 'Party store'], unitCostRange: [15, 40], essential: false, buyAt: 'T-3d', dependsOnDecision: 'games' },
    { id: 'p_tableware', item: 'Plates, cups, napkins, cutlery + linens', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Party store', 'Costco'], unitCostRange: [0.5, 2], essential: true, buyAt: 'T-3d' },
    { id: 'p_paper', item: 'Paper goods (tablecloth, foil, leftover + gift-haul bags)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [8, 18], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a bag/bin to carry the gift haul home.' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels, wipes', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 12], essential: true, buyAt: 'T-3d' },
  ],

  rentalsGap: [
    { item: 'Folding tables', qtyFlat: 2, note: 'food + gift table' },
    { item: 'Chairs', qtyPerGuest: 0.9, note: 'showers are seated — near 1:1' },
    { item: 'Serving platters + drink dispenser', qtyFlat: 3, note: 'COMMONLY FORGOTTEN: a beverage dispenser for punch/mocktails' },
  ],

  vendors: [
    { category: 'Venue / party room', required: false, altToDIY: 'Host at home or a free community room', when: 'T-28d', costRange: [100, 400], costUnit: 'flat' },
    { category: 'Catering', required: false, altToDIY: 'DIY finger foods or grocery platters', when: 'T-14d', costRange: [12, 30], costUnit: 'per guest' },
    { category: 'Bakery', required: false, altToDIY: 'Grocery cake / homemade', when: 'T-7d', costRange: [30, 90], costUnit: 'flat' },
    { category: 'Florals', required: false, altToDIY: 'Grocery-store flowers', when: 'T-3d', costRange: [30, 80], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_dietary', trigger: 'Menu not screened for pregnancy-safe foods', severity: 'high', mitigation: 'Avoid raw fish, soft/unpasteurized cheese, deli meats, high-mercury fish; label items; offer mocktails.' },
    { id: 'r_headcount', trigger: 'Final headcount not locked by T-4d', severity: 'high', mitigation: 'Chase RSVPs with the parent(s); buy fresh after the count locks.' },
    { id: 'r_gifts', trigger: 'No gift-tracking plan', severity: 'med', mitigation: 'Assign someone to log gifts as opened for thank-you notes.' },
    { id: 'r_overwhelm', trigger: 'Guest of honor over-scheduled with games', severity: 'low', mitigation: 'Keep it to 1–2 short games; protect rest time for a pregnant guest of honor.' },
  ],

  contingencies: [
    { id: 'c_food', when: 'r_dietary', plan: 'Swap any flagged item for a pregnancy-safe alternative (cooked, pasteurized); keep a labeled safe plate near the guest of honor.' },
    { id: 'c_weather', when: 'r_headcount', plan: 'If a daytime outdoor shower, confirm an indoor fallback 3 days out.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Decor, favors, mocktail mixers, games, paper goods, tableware, cleanup kit' },
      { when: 'T-1d', what: 'Fresh food, cake/desserts, flowers' },
      { when: 'T0', what: 'Ice + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Make-ahead bites + dessert; assemble favors; set up games' },
      { when: 'T0 -3h', what: 'Plate food, set mocktail station' },
    ],
    setup: [
      { when: 'T0 -3h', what: 'Decorate, set table, food + dessert table' },
      { when: 'T0 -2h', what: 'Mocktail + coffee station, ice; stage trash/recycling' },
    ],
    cleanup: [
      { when: 'during', what: 'Log gifts as opened; bus into a tub' },
      { when: 'T0 +3h', what: 'Leftovers to containers, favors out, gift haul packed, bag trash/recycling' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Quantities reflect common US shower/host rules of thumb (~0.5 lb grazing/guest, ~1 dessert/guest, ~2 drinks/guest, ~1.5 lb ice/guest). The pregnancy-safe food guidance reflects widely-published food-safety practice (avoid raw fish, soft/unpasteurized cheese, deli meats, high-mercury fish). Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default babyShower;
