// Graduation Party — Event OS host playbook (Sprint 55D, data only).
//
// A host-run graduation open house: buffet/BBQ-forward, larger + more
// drop-in than a seated party, school-colors decor + a photo/memory display.
// Registered under canonical 'Graduation' (alias 'Graduation Party'). Modeled
// as host-hosted (home/backyard) — NO venue purchase row. Quantities are common
// US open-house rules of thumb (see `knowledge`), authored honestly and labeled
// `synthesized` until verified. ESM default export.

const graduation = {
  type: 'Graduation',
  solveFamily: 'graduation',
  family: 'host_driven',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A host-run graduation open house — buffet/BBQ forward, drop-in over a few hours, school-colors decor + a photo/memory display. Higher headcount + more churn than a seated party, so the playbook over-provisions food/drink buffer and plans a self-serve flow.',
    typicalGuests: { low: 20, default: 35, high: 75 },
    typicalDurationHours: 4,
    leadTimeDays: 21,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 12, high: 45, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The grad walks in and sees everyone who came — just for them.',
    'The toast from a parent that says what they\'ve been meaning to say for years.',
    'Someone pulls up the photo wall and the whole family gathers around it.',
    'The grad catches someone looking proud of them and doesn\'t quite know what to do.',
    'The handshake or hug from the person who pushed them hardest to get here.',
  ],

  decisions: [
    { id: 'format', label: 'Open house or set-time party?', options: ['Open house (drop-in)', 'Set-time party', 'Joint party (multiple grads)'], default: 'Open house (drop-in)', when: 'T-21d', blocks: ['food', 'tableware'], why: 'Open houses see more total heads with churn — plan self-serve food that holds, and over-provision.' },
    { id: 'headcount', label: 'Estimate peak + total headcount', options: [], default: null, when: 'T-10d', blocks: ['food', 'cake', 'tableware'], why: 'Open-house RSVPs are fuzzy — estimate both peak-at-once and total-through-the-day; quantities key off total + a buffer.' },
    { id: 'food_style', label: 'Food style', options: ['BBQ / grill', 'Buffet / trays', 'Drop-off catering', 'Taco/food bar'], default: 'Buffet / trays', when: 'T-14d', blocks: ['food', 'vendors'], why: 'Self-serve buffet or BBQ that holds beats plated for a drop-in crowd.' },
    { id: 'alcohol', label: 'Alcohol? (adults present, grad may be a minor)', options: ['No alcohol', 'Beer + wine for adults', 'Separate adult area', 'BYOB'], default: 'Beer + wine for adults', when: 'T-14d', blocks: ['beverage_purchases'], why: 'If the grad/guests are minors, keep alcohol controlled and adult-only; drives spend + liability.' },
    { id: 'display', label: 'Photo / memory display + yard sign', options: ['Photo board + yard sign', 'Slideshow', 'Memory table', 'None'], default: 'Photo board + yard sign', when: 'T-14d', blocks: ['decor'], why: 'The signature graduation touch — collect photos early; order custom signs with lead time.' },
  ],

  milestones: [
    { id: 'gr_setdate', name: 'Set date, headcount estimate, budget', offsetDays: 21, owner: 'host', category: 'planning', risk: null },
    { id: 'gr_invite', name: 'Send invites (note open-house window) + RSVP', offsetDays: 18, owner: 'host', dependsOn: ['gr_setdate'], category: 'guest', risk: { ifDelayed: 'No headcount basis for a drop-in crowd', severity: 'med' } },
    { id: 'gr_signs', name: 'Order custom signs / banner / photo prints', offsetDays: 10, owner: 'host', dependsOn: ['gr_invite'], category: 'decor', risk: { ifDelayed: 'Custom print lead times missed', severity: 'med' } },
    { id: 'gr_cake', name: 'Order cake / sheet cake', offsetDays: 5, owner: 'host', dependsOn: ['gr_invite'], category: 'food', risk: { ifDelayed: 'Rush fees or no cake', severity: 'med' } },
    { id: 'gr_rsvp_close', name: 'Finalize headcount estimate + buffer', offsetDays: 3, owner: 'host', dependsOn: ['gr_invite'], category: 'guest', risk: { ifDelayed: 'Under-buy for a drop-in crowd', severity: 'high' } },
    { id: 'gr_shop_nonperish', name: 'Buy decor, drinks, disposables, paper goods', offsetDays: 3, owner: 'host', dependsOn: ['gr_rsvp_close'], category: 'shopping', risk: null },
    { id: 'gr_shop_fresh', name: 'Buy food + pick up cake', offsetDays: 1, owner: 'host', dependsOn: ['gr_rsvp_close', 'gr_cake'], category: 'shopping', risk: { ifDelayed: 'Sold-out items / no cake', severity: 'med' } },
    { id: 'gr_setup', name: 'Set up buffet, drinks, photo display, seating', offsetDays: 0, owner: 'host', dependsOn: ['gr_shop_nonperish', 'gr_shop_fresh', 'gr_signs'], category: 'setup', risk: null },
    { id: 'event', name: 'The graduation party', offsetDays: 0, owner: 'host', dependsOn: ['gr_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'gr_invite', phase: 'guest', label: 'Send invites with the open-house window + RSVP-by', when: 'T-18d' },
    { id: 't_photos', milestoneId: 'gr_signs', phase: 'decor', label: 'Collect grad photos; order prints, banner, yard sign', when: 'T-10d' },
    { id: 't_rsvp', milestoneId: 'gr_rsvp_close', phase: 'guest', label: 'Estimate total heads + buffer; lock food quantities', when: 'T-3d' },
    { id: 't_nonperish_shop', milestoneId: 'gr_shop_nonperish', phase: 'shopping', label: 'Decor, drinks, disposables, paper goods', when: 'T-3d' },
    { id: 't_food_shop', milestoneId: 'gr_shop_fresh', phase: 'shopping', label: 'Food + cake pickup', when: 'T-1d' },
    { id: 't_setup', milestoneId: 'gr_setup', phase: 'setup', label: 'Set buffet flow, drinks station, photo display, seating + shade', when: 'T0 -3h' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Pack leftovers, collect cards/gifts, bag trash + recycling, take down display', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_food', item: 'BBQ or taco bar (buffet trays)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco', 'Caterer', 'Butcher'], unitCostRange: [4, 10], essential: true, buyAt: 'T-1d', note: 'Over-provision ~10-15% for a drop-in crowd.', alternatives: ['Costco deli trays — cheaper per head, no cooking required', 'Pizza order — easiest crowd-pleaser, especially for teen grads', 'Taco kit (grocery) — budget option, guests build their own'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~0.5 lb main/guest + a 10-15% drop-in buffer.' } },
    { id: 'p_sides', item: 'Chips, salads, fruit & dips', category: 'food', qtyPerGuest: 0.3, unit: 'lb', where: ['Grocery', 'Costco'], unitCostRange: [2, 5], essential: true, buyAt: 'T-3d', alternatives: ['Bag of chips + store-bought dip — cheapest side option', 'Pre-made pasta salad from deli — if running short on time'] },
    { id: 'p_cake', item: 'Sheet cake / cupcakes', category: 'food', qtyFlat: 1, qtyPer: 20, unit: 'sheet cake (serves ~20)', where: ['Bakery', 'Grocery', 'Costco'], unitCostRange: [40, 90], essential: true, buyAt: 'T-1d', note: 'Order 3–5 days ahead; sheet cakes scale cheaply for crowds.', alternatives: ['Costco half-sheet — lowest cost per slice, feeds 48, no lead time', 'Cupcakes from grocery bakery — easy to serve, no cutting required'] },
    { id: 'p_drinks', item: 'Soft drinks, water, lemonade', category: 'beverage', qtyPerGuest: 4, unit: 'drinks', where: ['Grocery', 'Costco'], unitCostRange: [1, 2], essential: true, buyAt: 'T-3d', note: 'Board-corrected up from 3: an outdoor open house with drop-in churn + summer heat runs ~1 drink/guest/hour.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1 drink/guest/hour ≈ 4/guest over a 4h outdoor open house.' } },
    { id: 'p_alcohol', item: 'Beer / wine (adults only)', category: 'beverage', qtyPerGuest: 1.5, unit: 'drinks', where: ['Liquor store', 'Grocery'], unitCostRange: [3, 6], essential: false, buyAt: 'T-3d', dependsOnDecision: 'alcohol' },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 2, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. Board-corrected to ~2 lb/guest — this is an OUTDOOR event (matches the BBQ playbook); ice melts faster in the heat.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~2 lb ice/guest for outdoor beverage service (heat-adjusted).' } },
    { id: 'p_decor', item: 'Decor (school colors, banner, balloons, table covers)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Amazon', 'Target'], unitCostRange: [30, 80], essential: false, buyAt: 'T-3d' },
    { id: 'p_signs', item: 'Custom yard sign + photo prints / banner', category: 'decor', qtyFlat: 1, unit: 'set', where: ['Print shop', 'Staples', 'Online'], unitCostRange: [20, 50], essential: false, buyAt: 'T-3d', dependsOnDecision: 'display', note: 'Order early — custom prints have lead time.' },
    { id: 'p_favors', item: 'Favors / giveaways', category: 'decor', qtyPerGuest: 1, unit: 'favor', where: ['Party store', 'Amazon'], unitCostRange: [2, 6], essential: false, buyAt: 'T-3d' },
    { id: 'p_tableware', item: 'Plates, cups, napkins, cutlery + table covers', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-3d' },
    { id: 'p_cups', item: 'Disposable cups (self-serve drinks)', category: 'logistics', qtyPerGuest: 4, unit: 'cup', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.05, 0.15], essential: true, buyAt: 'T-3d', note: 'Board add: at ~4 self-serve drinks/guest, CUPS run out first — people grab a fresh one each refill. Plate "sets" do not cover it.' },
    { id: 'p_paper', item: 'Paper goods (foil, serving utensils, leftover + card box)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [10, 20], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: serving spoons/tongs for the buffet + a card/gift box.' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels, wipes', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 15], essential: true, buyAt: 'T-3d' },
  ],

  rentalsGap: [
    { item: 'Folding tables', qtyFlat: 4, note: 'buffet + drinks + cake + gift/photo table' },
    { item: 'Chairs', qtyPerGuest: 0.6, note: 'drop-in crowd — not everyone sits; ~60% seating' },
    { item: 'Canopy / tent', qtyFlat: 1, note: 'shade/rain for an outdoor open house' },
    { item: 'Chafing dishes / drink dispensers', qtyFlat: 3, note: 'COMMONLY FORGOTTEN: keep buffet food warm + self-serve drinks' },
  ],

  vendors: [
    { category: 'Venue / hall', required: false, altToDIY: 'Host at home / backyard or a free community room', when: 'T-21d', costRange: [150, 600], costUnit: 'flat' },
    { category: 'Catering / BBQ', required: false, altToDIY: 'DIY buffet or grocery trays', when: 'T-14d', costRange: [10, 25], costUnit: 'per guest' },
    { category: 'Bakery', required: false, altToDIY: 'Costco/grocery sheet cake', when: 'T-5d', costRange: [40, 100], costUnit: 'flat' },
    { category: 'Rental (tent/tables/chairs)', required: false, altToDIY: 'Borrow + a pop-up canopy', when: 'T-10d', costRange: [100, 350], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_headcount', trigger: 'Drop-in crowd under-estimated', severity: 'high', mitigation: 'Estimate total-through-the-day, not peak; over-provision food/drink ~10-15%; plan a quick resupply run.' },
    { id: 'r_signs', trigger: 'Custom prints/signs ordered too late', severity: 'med', mitigation: 'Collect photos + order at T-10d; have a printable backup.' },
    { id: 'r_weather', trigger: 'Outdoor open house, no rain/shade plan', severity: 'med', mitigation: 'Confirm canopy/indoor fallback at T-3d.' },
    { id: 'r_alcohol_minors', trigger: 'Alcohol accessible to minors', severity: 'high', mitigation: 'Adults-only beverage area, monitored; default to limited/no alcohol if the grad and friends are minors.' },
    { id: 'r_flow', trigger: 'Buffet bottleneck / cold food', severity: 'low', mitigation: 'Double-sided buffet flow; chafing dishes to hold temperature; replenish in waves.' },
  ],

  contingencies: [
    { id: 'c_resupply', when: 'r_headcount', plan: 'Keep a frozen/pantry backup (extra trays, chips, drinks) and a nearby store run ready if the crowd swells.' },
    { id: 'c_signs', when: 'r_signs', plan: 'Print photo collages at a same-day pharmacy/print kiosk; use a chalkboard sign instead of custom.' },
    { id: 'c_rain', when: 'r_weather', plan: 'Pop the canopy or move the buffet indoors; keep the photo display out of the weather.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Decor, signs/prints, drinks, disposables, paper goods, cleanup kit' },
      { when: 'T-1d', what: 'Food + cake pickup' },
      { when: 'T0', what: 'Ice + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Prep cold sides; assemble the photo display; set buffet layout' },
      { when: 'T0 -3h', what: 'Heat/hold buffet items; set drinks + ice' },
    ],
    setup: [
      { when: 'T0 -3h', what: 'Buffet flow, drinks station, photo display + yard sign, seating + shade' },
      { when: 'T0 -1h', what: 'Chafing dishes on, ice the drinks, stage trash/recycling + card box' },
    ],
    cleanup: [
      { when: 'during', what: 'Replenish buffet in waves; collect cards/gifts to the card box' },
      { when: 'T0 +4h', what: 'Pack leftovers, take down the display, bag trash/recycling, return rentals' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Quantities reflect common US open-house/host rules of thumb (~0.5 lb main/guest + 10-15% drop-in buffer, sheet cake ~1 serving/guest, ~3 drinks/guest, ~1.5 lb ice/guest). Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default graduation;
