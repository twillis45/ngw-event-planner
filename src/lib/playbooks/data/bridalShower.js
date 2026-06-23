// Bridal Shower — Event OS host playbook (data only).
//
// A host-run bridal shower for the bride — a daytime, seated celebration
// (brunch / afternoon tea), with a coffee + mimosa/punch bar, shower games +
// prizes, favors, and gift opening. ~15–30 guests, usually at home or a
// restaurant private room. The host (typically maid of honor / a close
// friend or relative) is planner, host, and cleanup, so the playbook
// front-loads the guest list + registry + menu and back-loads a calm
// setup → shower → gift-log → reset. Quantities are common US host/shower
// rules of thumb (see `knowledge`), authored honestly as
// established-consensus / trade-heuristic and labeled `synthesized` until a
// foreground verification pass attaches citations. ESM default export — no
// CJS in src/ (prod-bundle-safe). No fabricated sources.

const bridalShower = {
  type: 'Bridal Shower',
  solveFamily: 'home_gathering',
  family: 'host_driven',
  recordKind: 'client',
  version: '1.0.0',
  meta: {
    summary: 'A host-run bridal shower for the bride — daytime and seated (brunch or afternoon tea), with a coffee + mimosa/punch bar, a sweet, shower games + prizes, favors, and a gift-opening moment. The host (often the maid of honor) is planner, host, and cleanup, so the playbook front-loads guest list + registry + menu and back-loads a calm setup → shower → gift-log → reset.',
    typicalGuests: { low: 15, default: 22, high: 30 },
    typicalDurationHours: 3,
    leadTimeDays: 35,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 20, high: 65, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The bride opens the gift that makes the room go quiet in the best way.',
    'Her grandmother\'s toast — short, sincere, and everyone cries.',
    'The advice cards are read out loud and she keeps the funniest ones forever.',
    'The moment she looks around the room and realizes who showed up for her.',
  ],

  decisions: [
    { id: 'style', label: 'Shower style', options: ['Brunch', 'Afternoon tea / sweets', 'Garden luncheon', 'Cocktail-hour shower'], default: 'Brunch', when: 'T-14d', blocks: ['menu', 'beverage_purchases'], why: 'Sets the menu, time of day, and whether the bar skews mimosa/coffee (brunch) or punch/tea (afternoon).' },
    { id: 'guestlist', label: 'Confirm guest list with the bride (and her mother / future MIL)', options: [], default: null, when: 'T-14d', blocks: ['food', 'favors', 'seating', 'tableware'], why: 'Every quantity and the seat count scale from this — and the bride must approve who is invited (no shower guest should be off the wedding list).' },
    { id: 'registry', label: 'Confirm registry to share on the invite', options: ['Store registry', 'Honeymoon fund', 'Cash / gift card', 'No gifts (presence only)'], default: 'Store registry', when: 'T-14d', why: 'Guests ask immediately; include it on the invite to reduce back-and-forth and steer the gift haul.' },
    { id: 'dietary', label: 'Collect dietary restrictions from RSVPs', options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Nut allergy', 'No alcohol'], default: 'Vegetarian', when: 'T-14d', blocks: ['menu'], why: 'A seated daytime crowd skews varied; always offer a great zero-proof punch alongside mimosas.' },
    { id: 'games', label: 'Games / activities', options: ['Classic shower games + prizes', 'Advice-for-the-bride cards', 'Low-key mingling only'], default: 'Classic shower games + prizes', when: 'T-14d', blocks: ['activity_supplies'], why: 'Drives prize + supply purchases and the run of show around the gift opening.' },
  ],

  milestones: [
    { id: 'br_setdate', name: 'Set date, guest list, budget with the bride', offsetDays: 35, owner: 'host', category: 'planning', risk: null },
    { id: 'br_invite', name: 'Send invites + registry + RSVP / dietary ask', offsetDays: 21, owner: 'host', dependsOn: ['br_setdate'], category: 'guest', risk: { ifDelayed: 'Low RSVP visibility → wrong quantities and seat count', severity: 'med' } },
    { id: 'br_menu', name: 'Lock the menu + bar (brunch + a sweet + mimosa/punch)', offsetDays: 14, owner: 'host', dependsOn: ['br_invite', 'br_setdate'], category: 'food', risk: { ifDelayed: 'No shopping list possible', severity: 'med' } },
    { id: 'br_rsvp_close', name: 'Lock final headcount + seating', offsetDays: 4, owner: 'host', dependsOn: ['br_invite'], category: 'guest', risk: { ifDelayed: 'Over/under-buy food + favors; not enough seats', severity: 'high' } },
    { id: 'br_shop_nonperish', name: 'Buy decor, favors, prizes, bubbly, mixers, paper goods', offsetDays: 3, owner: 'host', dependsOn: ['br_rsvp_close'], category: 'shopping', risk: null },
    { id: 'br_shop_fresh', name: 'Buy fresh food, cake/desserts, juice, flowers', offsetDays: 1, owner: 'host', dependsOn: ['br_menu', 'br_rsvp_close'], category: 'shopping', risk: { ifDelayed: 'Wilted produce / no cake', severity: 'med' } },
    { id: 'br_setup', name: 'Decorate, set the table + food + bar + gift area', offsetDays: 0, owner: 'host', dependsOn: ['br_shop_nonperish', 'br_shop_fresh'], category: 'setup', risk: null },
    { id: 'event', name: 'The shower', offsetDays: 0, owner: 'host', dependsOn: ['br_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'br_invite', phase: 'guest', label: 'Send invites with registry, RSVP-by, dietary ask', when: 'T-21d' },
    { id: 't_rsvp', milestoneId: 'br_rsvp_close', phase: 'guest', label: 'Chase non-responders; lock the count and seat plan', when: 'T-4d' },
    { id: 't_giftlog', milestoneId: 'br_setup', phase: 'planning', label: 'Set up the gift log (who-gave-what) for thank-you notes', when: 'T-1d' },
    { id: 't_nonperish_shop', milestoneId: 'br_shop_nonperish', phase: 'shopping', label: 'Decor, favors, prizes, bubbly, mixers, games, paper goods', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'br_shop_fresh', phase: 'shopping', label: 'Fresh food, cake/desserts, juice, flowers', when: 'T-1d' },
    { id: 't_prep', milestoneId: 'br_setup', phase: 'food', label: 'Make-ahead bites + dessert; assemble favors; set games', when: 'T-1d evening' },
    { id: 't_decorate', milestoneId: 'br_setup', phase: 'setup', label: 'Decorate, set the table, food + coffee/mimosa bar, gift area', when: 'T0 -3h' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Finalize gift list for thank-yous, pack leftovers + gifts, favors out, bag trash + recycling', when: 'T0 +3:00' },
  ],

  purchases: [
    { id: 'p_food', item: 'Quiche, fruit & tea sandwiches (brunch spread, salads)', category: 'food', qtyPerGuest: 0.6, unit: 'lb', where: ['Grocery', 'Costco', 'Caterer'], unitCostRange: [4, 10], essential: true, buyAt: 'T-1d', alternatives: ['Costco deli platter — cheaper per lb, same grazing function', 'Bagels + cream cheese + lox — budget brunch option, easy to scale', 'Grocery store salad bar by the pound — flexible, no-prep option'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~0.5–0.6 lb grazing/guest for a seated daytime brunch shower.' } },
    { id: 'p_cake', item: 'Cake / cupcakes / dessert table', category: 'food', qtyFlat: 1, qtyPer: 15, unit: 'cake (serves ~15)', where: ['Bakery', 'Grocery'], unitCostRange: [35, 80], essential: true, buyAt: 'T-1d', note: 'Order ahead; ~1 serving/guest. The cake is the centerpiece dessert at a shower.', alternatives: ['Grocery bakery sheet cake — add custom message, far cheaper', 'Cupcake tower (grocery bakery) — easy to serve, no cutting'] },
    { id: 'p_bubbly', item: 'Sparkling wine / prosecco for mimosas', category: 'beverage', qtyPerGuest: 0.22, unit: 'bottle (750ml)', where: ['Grocery', 'Liquor store', 'Costco'], unitCostRange: [10, 18], essential: false, buyAt: 'T-3d', note: 'Plan ~1 bottle per 4–5 guests for a mimosa bar (each bottle pours ~5–6 mimosas cut with juice).', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: 'Mimosa-bar heuristic: ~1 bottle bubbly per 4–5 guests when cut with juice.' } },
    { id: 'p_juice', item: 'Juice for mimosas (orange + a second flavor)', category: 'beverage', qtyPerGuest: 0.25, unit: 'gal', where: ['Grocery', 'Costco'], unitCostRange: [3, 6], essential: false, buyAt: 'T-1d', note: 'Pairs with bubbly; doubles as the kids/no-alcohol pour.' },
    { id: 'p_punch', item: 'Non-alcoholic punch / mocktail base + garnishes', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', note: 'Always offer a great zero-proof punch for non-drinkers — make it as pretty as the mimosa bar.' },
    { id: 'p_coffee', item: 'Coffee + tea + cream/sugar (a 40-cup urn per ~25 guests)', category: 'beverage', qtyFlat: 1, qtyPer: 25, unit: 'urn (~40 cups)', where: ['Grocery', 'Rental', 'Party store'], unitCostRange: [12, 30], essential: true, buyAt: 'T-3d', note: 'Coffee/tea is the workhorse drink at a daytime shower — scale ~1 large urn per 25 guests, do not spec a single flat "service".' },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest (mimosa bar + punch + chilling bubbly).', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1.5 lb ice/guest beverage-service heuristic.' } },
    { id: 'p_decor', item: 'Decorations (theme, florals backdrop, balloons, banner)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Amazon', 'Target'], unitCostRange: [35, 90], essential: false, buyAt: 'T-3d' },
    { id: 'p_flowers', item: 'Centerpiece flowers + a few bud vases', category: 'decor', qtyFlat: 1, qtyPer: 8, unit: 'arrangement per 8 guests', where: ['Florist', "Trader Joe's", 'Grocery'], unitCostRange: [15, 45], essential: false, buyAt: 'T-1d', note: 'Florals carry a bridal shower; one statement arrangement on the gift/cake table goes a long way.' },
    { id: 'p_favors', item: 'Favors (small thank-you gifts for guests)', category: 'decor', qtyPerGuest: 1, unit: 'favor', where: ['Party store', 'Amazon', 'Etsy'], unitCostRange: [3, 10], essential: false, buyAt: 'T-3d' },
    { id: 'p_games', item: 'Shower game printouts/supplies + prizes', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Amazon', 'Party store', 'Etsy'], unitCostRange: [15, 45], essential: false, buyAt: 'T-3d', note: 'Buy a few small wrapped prizes (candles, soaps, wine) for game winners.', dependsOnDecision: 'games' },
    { id: 'p_giftlog', item: 'Gift-log notebook + pen (or a printed who-gave-what sheet)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Amazon', 'Target', 'On hand'], unitCostRange: [3, 10], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: the single thing the bride needs after the shower — an accurate gift→giver list for thank-you notes.' },
    { id: 'p_tableware', item: 'Plates, cups, champagne flutes, napkins, cutlery + linens', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Party store', 'Costco'], unitCostRange: [0.5, 2.5], essential: true, buyAt: 'T-3d', note: 'Include flutes for the mimosa bar (disposable plastic or a small rental set).' },
    { id: 'p_paper', item: 'Paper goods (tablecloths, foil, leftover + gift-haul bags)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [8, 20], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a bag/bin to carry the gift haul home for the bride.' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels, wipes', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 14], essential: true, buyAt: 'T-3d' },
  ],

  rentalsGap: [
    { item: 'Folding tables', qtyFlat: 3, note: 'food + bar + gift/cake table' },
    { item: 'Chairs', qtyPerGuest: 1, note: 'a bridal shower is seated — plan 1:1 plus the bride' },
    { item: 'Serving platters + drink dispensers', qtyFlat: 3, note: 'COMMONLY FORGOTTEN: a beverage dispenser each for punch and juice at the mimosa bar' },
    { item: 'Champagne flutes', qtyPerGuest: 1, note: 'for the mimosa bar if not using disposables' },
  ],

  vendors: [
    { category: 'Venue / restaurant private room', required: false, altToDIY: 'Host at home or a free community room', when: 'T-35d', costRange: [150, 600], costUnit: 'flat' },
    { category: 'Catering', required: false, altToDIY: 'DIY brunch / grocery platters', when: 'T-14d', costRange: [15, 35], costUnit: 'per guest' },
    { category: 'Bakery', required: false, altToDIY: 'Grocery cake / homemade', when: 'T-7d', costRange: [35, 100], costUnit: 'flat' },
    { category: 'Florals', required: false, altToDIY: 'Grocery-store flowers', when: 'T-3d', costRange: [40, 120], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_headcount', trigger: 'Final headcount not locked by T-4d', severity: 'high', mitigation: 'Chase RSVPs with the bride / co-hosts; buy fresh food and confirm seats after the count locks.' },
    { id: 'r_giftlog', trigger: 'No gift-tracking plan during the opening', severity: 'high', mitigation: 'Assign one person to log each gift → giver as it is opened; the bride needs this list for thank-you notes.' },
    { id: 'r_guestlist', trigger: 'Shower guest not on the wedding guest list', severity: 'med', mitigation: 'Vet the shower list against the wedding list with the bride before invites go out — never invite to the shower someone not invited to the wedding.' },
    { id: 'r_bar', trigger: 'Bubbly/juice under-bought for the mimosa bar', severity: 'med', mitigation: 'Plan ~1 bottle per 4–5 guests; keep 1–2 backup bottles chilled and a full no-alcohol punch so no one is left out.' },
    { id: 'r_overrun', trigger: 'Gift opening runs long and guests disengage', severity: 'low', mitigation: 'Cap games to 1–2 short rounds; play soft music and pass favors during the opening to keep energy up.' },
  ],

  contingencies: [
    { id: 'c_headcount', when: 'r_headcount', plan: 'If RSVPs stall, confirm with co-hosts and plan to the high end of the range; hold one extra table + chairs in reserve.' },
    { id: 'c_giftlog', when: 'r_giftlog', plan: 'If no one is assigned, the host designates a logger at the start and keeps a notebook taped to the gift table as a backup.' },
    { id: 'c_bar', when: 'r_bar', plan: 'If bubbly runs low, stretch with a sparkling-cider option and pivot guests to the punch; lead with the zero-proof bar.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Decor, favors, prizes, bubbly, mixers, games, gift log, tableware, cleanup kit' },
      { when: 'T-1d', what: 'Fresh food, cake/desserts, juice, flowers' },
      { when: 'T0', what: 'Ice + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Make-ahead bites + dessert; assemble favors; set up games; prep the gift log' },
      { when: 'T0 -3h', what: 'Plate food, build the coffee/mimosa bar, chill bubbly + juice' },
    ],
    setup: [
      { when: 'T0 -3h', what: 'Decorate, set the table, food + dessert/cake table, gift-opening area with a chair for the bride' },
      { when: 'T0 -2h', what: 'Coffee/tea urn + mimosa bar + punch dispensers, ice; stage trash/recycling; place the gift log on the gift table' },
    ],
    cleanup: [
      { when: 'during', what: 'Log each gift → giver as the bride opens it; bus dishes into a tub' },
      { when: 'T0 +3h', what: 'Finalize the gift list, leftovers to containers, favors handed out, gift haul packed for the bride, bag trash/recycling' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Quantities reflect common US bridal-shower / host rules of thumb: ~0.5–0.6 lb grazing/guest for a seated daytime brunch, ~1 dessert serving/guest, ~2 drinks/guest for the non-alcoholic punch, ~1 coffee/tea urn per 25 guests, and a mimosa-bar plan of ~1 bottle of sparkling wine per 4–5 guests cut with juice (~5–6 mimosas/bottle), plus ~1.5 lb ice/guest. Seating is planned ~1:1 because a bridal shower is a seated celebration with a gift-opening segment. The gift-log (who-gave-what) is treated as essential because it is the artifact the bride relies on for thank-you notes. Etiquette guidance — vetting the shower list against the wedding list, registry on the invite, and always offering a strong zero-proof option — reflects widely-published US hosting convention. Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default bridalShower;
