// Vow Renewal — Event OS playbook data.
//
// A couple re-affirming their vows: a real ceremony moment (officiant-led or
// self-led readings/vows, a small processional, rings or a keepsake exchange,
// seating for the ceremony) followed by a reception (a meal or heavy apps, a
// bar, a champagne toast, a cake). Less formal and far less expensive than a
// first wedding, but the CEREMONY is the emotional hero — the playbook front-
// loads the two format-defining decisions (ceremony style + meal format) that
// drive every quantity below, and treats the arch/backdrop, florals,
// photographer, and guest book as the keepsake layer of a day you can't reshoot.
// ESM default export — no CJS module.exports in src/ (prod-bundle ESM lesson).
// The reader (../index.js) consumes `purchases` first for the operational
// candidate; the rest is available as the engine grows.

const vowRenewal = {
  type: 'Vow Renewal',
  vegMain: 'Wild mushroom risotto',
  solveFamily: 'vow_renewal',
  family: 'full_service',
  recordKind: 'client',
  version: '1.0.0',

  meta: {
    summary:
      'A couple re-affirming their vows — a small ceremony (officiant-led or self-led vows/readings, a short processional, a ring or keepsake exchange, seating for guests) followed by a reception (a meal or heavy apps, a bar, a champagne toast, a cake). Florals + a focal arch/backdrop, music for the processional and the party, a photographer, and a guest book carry the keepsake layer. ~20-60 guests at home, a venue, or a destination.',
    typicalGuests: { low: 20, default: 40, high: 60 },
    typicalDurationHours: 4,
    leadTimeDays: 60,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 45, high: 160, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The vows — written again, said again, meant more this time.',
    'The couple exchanges a look during the ceremony that says everything the vows couldn\'t.',
    'The champagne toast and someone who knew them at their wedding raises a glass.',
    'The cake gets cut and it feels like the beginning all over again.',
  ],

  decisions: [
    { id: 'ceremony_style', label: 'Officiant-led or self-led ceremony?', options: ['Officiant / celebrant leads', 'Self-led — couple exchanges vows themselves', 'A friend/family member officiates', 'Faith leader / clergy'], default: 'Self-led — couple exchanges vows themselves', when: 'T-60d', blocks: ['ceremony', 'run_of_show', 'vendors'], why: 'This is a root decision. A vow renewal has no legal weight, so it is fully scriptable — but SOMEONE has to lead it. An officiant or celebrant brings a tested script and presence; self-led or a friend-officiant means the couple writes the vows, picks the readings, and rehearses the order so it does not stall. It sets the script, the run-of-show, and whether you hire anyone.' },
    { id: 'meal_format', label: 'Seated meal or heavy apps reception?', options: ['Seated / plated meal', 'Buffet / family-style', 'Heavy passed + stationed apps', 'Dessert + toast reception only'], default: 'Heavy passed + stationed apps', when: 'T-60d', blocks: ['menu', 'purchasing', 'rentals', 'seating'], why: 'The reception format drives the food math, rentals, and seating. A seated meal means ~1:1 covers (~0.4 lb protein/guest) and a service timeline; heavy apps mean stations the host refills (~10-12 pieces/guest). Decide before invites so guests know whether it is a full meal or a celebration toast.' },
    { id: 'venue', label: 'At home, a venue, or a destination?', options: ['Home / backyard', 'Rented venue / hall / restaurant room', 'Destination (travel for the couple + guests)', "Relative's home or garden"], default: 'Home / backyard', when: 'T-60d', dependsOn: ['meal_format'], blocks: ['rentals', 'vendors', 'logistics'], why: 'A venue or restaurant absorbs catering, rentals, bar, and cleanup (and most of the budget); a destination adds travel, lodging, and a longer lead time; at-home shifts catering, rentals, the ceremony setup, and cleanup onto the host and the lists below.' },
    { id: 'guestlist', label: 'Confirm guest count + collect dietary/accessibility/travel needs', options: [], default: null, when: 'T-49d', dependsOn: ['meal_format', 'venue'], blocks: ['menu', 'rentals', 'logistics'], why: 'Every food, drink, seat, rental, and ceremony-chair quantity derives from a real headcount. Renewals often include older guests and out-of-town family — collect mobility/seating, dietary, and travel needs with the invite.' },
    { id: 'ceremony', label: 'Lock the ceremony moment (vows, readings, rings/keepsake, processional)', options: ['Written vows + a reading + ring/keepsake exchange', 'Spoken-from-the-heart vows only', 'Vows + a unity ritual (candle, sand, handfasting)', 'Reaffirmation script led by the officiant'], default: 'Written vows + a reading + ring/keepsake exchange', when: 'T-35d', dependsOn: ['ceremony_style'], blocks: ['run_of_show', 'setup'], why: 'This is the emotional hero. It needs the vows written, any readings + reader assigned, the rings or keepsake (new bands, an upgraded ring, a renewed-vows certificate) in hand, and a short processional order rehearsed — not improvised at the front of the room.' },
    { id: 'menu', label: 'Lock the menu (or catering order) + cake', options: ['Plated meal', 'Buffet / family-style', 'Heavy passed + stationed apps', 'Dessert + toast reception'], default: 'Heavy passed + stationed apps', when: 'T-28d', dependsOn: ['guestlist', 'meal_format'], blocks: ['purchasing'], why: 'The shopping list and any catering order derive from this. For an apps format, "heavy apps" must be a meal\'s worth of food (~10-12 pieces/guest), not a thin spread. The cake is the reception centerpiece — order it sized to the headcount.' },
    { id: 'beverage', label: 'Bar strategy + the toast pour', options: ['Wine + beer + champagne toast', 'Full bar + signature cocktail', 'Wine + champagne toast only', 'Zero-proof / dry'], default: 'Wine + beer + champagne toast', when: 'T-28d', dependsOn: ['meal_format'], blocks: ['purchasing'], why: 'Sets spend and glassware. The champagne toast right after the vows is the signature beat — budget ~1 bottle per 6-8 guests for one pour each, and keep a zero-proof sparkling so everyone can raise a glass.' },
    { id: 'help', label: 'DIY, or bring in help?', options: ['Fully DIY', 'Officiant / celebrant', 'Caterer / drop-off', 'Bartender', 'Photographer', 'Day-of coordinator / cleaner'], default: 'Photographer', when: 'T-28d', dependsOn: ['ceremony_style', 'meal_format', 'venue'], blocks: ['vendors'], why: 'The honest tradeoff: a couple cannot run their own ceremony, cook, tend bar, AND be present for the moment. The two highest-ROI hires are a photographer (a day you cannot reshoot) and one of an officiant / bartender / coordinator so the couple can actually be in the ceremony.' },
  ],

  milestones: [
    { id: 'vr_setdate', name: 'Set date, ceremony style, meal format, guest count + budget', offsetDays: 60, owner: 'host', category: 'planning', risk: null },
    { id: 'vr_venue', name: 'Lock venue (book room / confirm home + rentals plan; book travel if destination)', offsetDays: 56, owner: 'host', dependsOn: ['vr_setdate'], category: 'logistics', risk: { ifDelayed: 'Popular dates and destination lodging book out; lose the date or pay rush', severity: 'high' } },
    { id: 'vr_officiant', name: 'Book officiant / celebrant (or confirm who leads it)', offsetDays: 49, owner: 'host', dependsOn: ['vr_setdate'], category: 'ceremony', risk: { ifDelayed: 'Good officiants book out; a self-led ceremony with no rehearsed lead stalls at the front of the room', severity: 'high' } },
    { id: 'vr_invite', name: 'Send invites + ask dietary/accessibility/travel + RSVP-by', offsetDays: 49, owner: 'host', dependsOn: ['vr_setdate'], category: 'guest', risk: { ifDelayed: 'Low RSVP visibility → wrong food/drink/seating/ceremony-chair counts', severity: 'med' } },
    { id: 'vr_photographer', name: 'Book photographer (and confirm coverage window)', offsetDays: 45, owner: 'host', dependsOn: ['vr_setdate'], category: 'memory', risk: { ifDelayed: 'A renewal is a day you cannot reshoot; good photographers book out weeks ahead', severity: 'high' } },
    { id: 'vr_vows', name: 'Write the vows + choose readings/reader + secure rings/keepsake', offsetDays: 35, owner: 'host', dependsOn: ['vr_officiant'], category: 'ceremony', risk: { ifDelayed: 'Unwritten vows at the front of the room is the #1 renewal failure', severity: 'high' } },
    { id: 'vr_menu', name: 'Lock menu + cake order + bar plan', offsetDays: 28, owner: 'host', dependsOn: ['vr_invite'], category: 'food', risk: { ifDelayed: 'No shopping list / catering window / cake lead time', severity: 'high' } },
    { id: 'vr_florals', name: 'Order florals + the focal arch/backdrop; confirm music plan', offsetDays: 21, owner: 'host', dependsOn: ['vr_venue'], category: 'decor', risk: { ifDelayed: 'No arch/backdrop = the ceremony has no focal point; florists need lead time', severity: 'med' } },
    { id: 'vr_cake', name: 'Order the cake', offsetDays: 14, owner: 'host', dependsOn: ['vr_menu'], category: 'food', risk: { ifDelayed: 'Bakeries need ~1-2 weeks for a custom cake', severity: 'med' } },
    { id: 'vr_rentals', name: 'Confirm rentals: ceremony chairs, serveware, glassware, tables, arch', offsetDays: 10, owner: 'host', dependsOn: ['vr_venue', 'vr_menu'], category: 'rental', risk: { ifDelayed: 'No ceremony seating / not enough matching plates+glasses day-of', severity: 'med' } },
    { id: 'vr_rehearse', name: 'Rehearse the ceremony (processional, vows order, ring/keepsake handoff, toast cue)', offsetDays: 7, owner: 'host', dependsOn: ['vr_vows'], category: 'ceremony', risk: { ifDelayed: 'An unrehearsed processional + vows order stalls and undercuts the hero moment', severity: 'high' } },
    { id: 'vr_rsvp_close', name: 'Confirm final headcount (chase the maybes)', offsetDays: 4, owner: 'host', dependsOn: ['vr_invite'], category: 'guest', risk: { ifDelayed: 'Over/under-buy food + drink + ceremony chairs by 20-30%', severity: 'high' } },
    { id: 'vr_shop_pantry', name: 'Buy alcohol, non-perishables, decor, paper goods, guest book', offsetDays: 3, owner: 'host', dependsOn: ['vr_menu'], category: 'shopping', risk: null },
    { id: 'vr_shop_fresh', name: 'Buy fresh food, florals; pick up cake', offsetDays: 1, owner: 'host', dependsOn: ['vr_menu', 'vr_rsvp_close'], category: 'shopping', risk: { ifDelayed: 'Wilted florals / sold-out items / missed cake pickup', severity: 'med' } },
    { id: 'vr_prep', name: 'Make-ahead food prep; assemble arch/backdrop; stage ceremony + guest book', offsetDays: 1, owner: 'host', dependsOn: ['vr_shop_fresh'], category: 'food', risk: null },
    { id: 'vr_setup', name: 'Set the ceremony seating + arch, set the reception, chill drinks, place guest book', offsetDays: 0, owner: 'host', dependsOn: ['vr_rentals', 'vr_prep'], category: 'setup', risk: null },
    { id: 'event', name: 'The vow renewal — ceremony then reception', offsetDays: 0, owner: 'host', dependsOn: ['vr_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_officiant', milestoneId: 'vr_officiant', phase: 'ceremony', label: 'Book the officiant/celebrant (or confirm the friend/family member who will lead) and share the renewal vision', when: 'T-49d' },
    { id: 't_invite', milestoneId: 'vr_invite', phase: 'guest', label: 'Send invite with date, time, ceremony+reception location(s), dietary/accessibility/travel ask, RSVP-by', when: 'T-49d' },
    { id: 't_photog', milestoneId: 'vr_photographer', phase: 'memory', label: 'Book photographer; agree the coverage window (ceremony + toast + cake) and a shot list', when: 'T-45d' },
    { id: 't_writevows', milestoneId: 'vr_vows', phase: 'ceremony', label: 'Each partner writes their vows; choose any reading(s) + assign a reader; finalize the ceremony order with the officiant', when: 'T-35d' },
    { id: 't_rings', milestoneId: 'vr_vows', phase: 'ceremony', label: 'Secure the rings/keepsake (new bands, upgraded ring, renewed-vows certificate) and decide the exchange wording', when: 'T-35d' },
    { id: 't_cakeorder', milestoneId: 'vr_cake', phase: 'food', label: 'Order cake: flavor, size for headcount, message, pickup time', when: 'T-14d' },
    { id: 't_florals', milestoneId: 'vr_florals', phase: 'decor', label: 'Order florals + the focal arch/backdrop; confirm processional + reception music (playlist or a player/DJ)', when: 'T-21d' },
    { id: 't_rehearse', milestoneId: 'vr_rehearse', phase: 'ceremony', label: 'Walk the processional, the vows order, the ring/keepsake handoff, and the cue into the champagne toast', when: 'T-7d' },
    { id: 't_rsvp_chase', milestoneId: 'vr_rsvp_close', phase: 'guest', label: 'Chase non-responders; lock the final count + any dietary/mobility needs', when: 'T-4d' },
    { id: 't_pantry_shop', milestoneId: 'vr_shop_pantry', phase: 'shopping', label: 'Alcohol, champagne for the toast, non-perishables, decor, paper/cleanup goods, the guest book + pen', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'vr_shop_fresh', phase: 'shopping', label: 'Fresh food, florals, garnish; pick up the cake (or schedule delivery)', when: 'T-1d' },
    { id: 't_prep', milestoneId: 'vr_prep', phase: 'food', label: 'Make-ahead food, prep platters, label serving dishes; assemble the arch/backdrop and test it stands', when: 'T-1d evening' },
    { id: 't_runorder', milestoneId: 'vr_prep', phase: 'ceremony', label: 'Write the run-of-show: seat guests, processional, vows + readings, ring/keepsake, pronouncement, toast, eat, cake', when: 'T-1d evening' },
    { id: 't_setceremony', milestoneId: 'vr_setup', phase: 'setup', label: 'Set ceremony chairs (~1:1) in rows with an aisle, place the arch/backdrop + florals, mark the processional path', when: 'T0 afternoon' },
    { id: 't_setreception', milestoneId: 'vr_setup', phase: 'setup', label: 'Set reception tables/stations, seating, cake table, the guest-book table with pen, and signage', when: 'T0 afternoon' },
    { id: 't_chill', milestoneId: 'vr_setup', phase: 'beverage', label: 'Chill whites + champagne 2-3h ahead; build the bar/drinks station + ice', when: 'T0 -3h' },
    { id: 't_music', milestoneId: 'vr_setup', phase: 'setup', label: 'Set up + test the processional + reception music and a speaker; queue the entrance track', when: 'T0 -2h' },
    { id: 't_clean_pre', milestoneId: 'vr_setup', phase: 'cleanup', label: 'Pre-clean: empty dishwasher, clear sink, stage a bus tub + trash/recycling station', when: 'T0 -2h' },
    { id: 't_seat', milestoneId: 'event', phase: 'ceremony', label: 'Seat guests; reserve a front zone for elders/mobility; cue the processional music', when: 'T0 +0:00' },
    { id: 't_vows', milestoneId: 'event', phase: 'ceremony', label: 'Run the ceremony: processional, welcome, readings, vows, ring/keepsake exchange, pronouncement', when: 'T0 +0:10' },
    { id: 't_toast', milestoneId: 'event', phase: 'ceremony', label: 'Pour champagne; give/receive the toast to the couple right after the vows', when: 'T0 +0:35' },
    { id: 't_food', milestoneId: 'event', phase: 'food', label: 'Move to the reception: serve the meal / open the app stations; keep the bar stocked', when: 'T0 +0:50' },
    { id: 't_guestbook', milestoneId: 'event', phase: 'memory', label: 'Point arriving + seated guests to the guest book; make sure everyone signs', when: 'ongoing' },
    { id: 't_cake', milestoneId: 'event', phase: 'food', label: 'Cut + serve the cake; do a photo of the cut', when: 'T0 +2:15' },
    { id: 't_clear', milestoneId: 'event', phase: 'cleanup', label: "Clear into the staged bus tub (don't wash mid-party); keep trash/recycling moving", when: 'ongoing' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Post-event reset: leftovers into containers, run dishwasher, break down the arch, return rentals box, bottles to recycling', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_apps', item: 'Cheese & charcuterie spread (crudite, sliders, skewers, dips)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco', 'Caterer', 'Instacart'], unitCostRange: [5, 11], essential: true, buyAt: 'T-1d', note: 'For an APPS format, heavy apps must be a meal: plan ~10-12 pieces/guest across stations.', provenance: { tier: 'consensus', confidence: 'med', verificationStatus: 'synthesized', note: 'US catering rule of thumb: ~6+ app pieces/guest at a cocktail hour, more when apps replace a meal.' } , alternatives: ['Costco deli platters — cheaper per lb, same grazing concept', 'Frozen apps from Trader Joes — budget option, bake day-of'] },
    { id: 'p_protein', item: 'Beef, chicken or salmon (for a seated meal — plus a veg main)', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Butcher', 'Grocery', 'Costco', 'Caterer'], unitCostRange: [7, 16], essential: false, buyAt: 'T-1d', note: '~0.4 lb (6-8 oz) cooked protein per seated guest. Skip if the format is apps-only.', provenance: { tier: 'consensus', confidence: 'med', verificationStatus: 'synthesized', note: 'US wedding-catering consensus: 6-8 oz entree protein per guest.' } , alternatives: ['Roast chicken — much cheaper than beef or salmon, crowd-pleasing', 'Pork tenderloin — budget alternative to beef, elegant presentation'] },
    { id: 'p_sides', item: 'Garden salad & roasted vegetables', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery', 'Farmers market'], unitCostRange: [2, 5], essential: true, buyAt: 'T-1d', provenance: { tier: 'consensus', confidence: 'med', verificationStatus: 'synthesized', note: '4-6 oz per side per guest is the standard catering portion.' } , alternatives: ['Costco prepared sides — saves time and often cheaper', 'Roasted vegetables seasonal — budget-friendly, minimal prep'] },
    { id: 'p_bread', item: 'Bread / rolls / crackers', category: 'food', qtyFlat: 1, qtyPer: 4, unit: 'loaf/box per 4 guests', where: ['Bakery', 'Grocery'], unitCostRange: [4, 8], essential: false, buyAt: 'T-1d', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Planning heuristic; varies with menu.' } , alternatives: ['Store-brand dinner rolls — fraction of bakery cost', 'Crackers only — works fine for apps-format event'] },
    { id: 'p_cake', item: 'Vow-renewal cake (message / years married)', category: 'food', qtyFlat: 1, qtyPer: 25, unit: 'cake per ~25 guests', where: ['Bakery', 'Grocery bakery'], unitCostRange: [45, 140], essential: true, buyAt: 'T-1d', note: 'Order ~1-2 weeks ahead. An 8" serves ~15-24; a 2-tier serves ~25-40.', provenance: { tier: 'consensus', confidence: 'med', verificationStatus: 'synthesized', note: 'Standard cake-yield guidance.' } , alternatives: ['Grocery bakery sheet cake — add custom message, far cheaper', 'Dessert platter pastries — if custom cake lead time was missed'] },
    { id: 'p_champagne', item: 'Champagne / sparkling for the toast', category: 'beverage', qtyFlat: 1, qtyPer: 7, unit: 'bottle per ~7 guests', where: ['Wine shop', 'Total Wine', 'Grocery'], unitCostRange: [14, 35], essential: true, buyAt: 'T-3d', note: 'A 750ml bottle pours ~6-8 toast glasses; ~1 bottle per 6-8 guests for one pour each. The toast after the vows is the signature beat.', provenance: { tier: 'consensus', confidence: 'high', verificationStatus: 'synthesized', note: 'Widely cited: ~1 bottle per 6-8 guests for a single toast pour.' } },
    { id: 'p_wine', item: 'Wine (red + white) for the bar', category: 'beverage', qtyPerGuest: 0.5, unit: 'bottle', where: ['Wine shop', 'Total Wine', 'Grocery'], unitCostRange: [10, 22], essential: true, buyAt: 'T-3d', note: '~½ bottle per drinking guest for a 3-4h reception (~1 drink/guest/hour).', provenance: { tier: 'consensus', confidence: 'med', verificationStatus: 'synthesized', note: '~1 drink/guest/hour is the standard bar-stocking heuristic.' } },
    { id: 'p_beer', item: 'Beer / seltzer', category: 'beverage', qtyPerGuest: 1.5, unit: 'cans', where: ['Grocery', 'Costco'], unitCostRange: [1, 2.5], essential: false, buyAt: 'T-3d', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Split of total drink demand; varies by crowd.' } },
    { id: 'p_nonalc', item: 'Sparkling water, mocktail, juice & soda', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery'], unitCostRange: [1, 2], essential: true, buyAt: 'T-3d', note: 'Renewal guest lists skew older — keep a great zero-proof sparkling so non-drinkers can raise a glass at the toast.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Planning heuristic for non-alcoholic demand.' } },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest for chilling + drinks (more in heat).', provenance: { tier: 'consensus', confidence: 'high', verificationStatus: 'synthesized', note: 'Widely cited wedding/event rule: ~1.5 lb ice/guest baseline.' } },
    { id: 'p_coffee', item: 'Coffee + tea service (for cake — a 40-cup urn per ~25 guests)', category: 'beverage', qtyFlat: 1, qtyPer: 25, unit: 'urn (~40 cups)', where: ['Grocery', 'Rental', 'Party store'], unitCostRange: [12, 30], essential: false, buyAt: 'T-3d', note: 'Scale ~1 large urn per 25 for the cake-and-coffee pour at the high end.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Urn yield estimate; optional.' } },
    { id: 'p_flowers', item: 'Florals / centerpieces + ceremony florals', category: 'decor', qtyFlat: 1, qtyPer: 6, unit: 'arrangement per 6 guests', where: ['Florist', "Trader Joe's", 'Farmers market'], unitCostRange: [15, 45], essential: false, buyAt: 'T-1d', note: 'Couples often want their original wedding palette; reserve some stems for the arch/backdrop and the cake table.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Centerpiece coverage heuristic.' } },
    { id: 'p_arch', item: 'Focal arch / backdrop (the ceremony focal point)', category: 'decor', qtyFlat: 1, unit: 'arch/backdrop', where: ['Amazon', 'Party store', 'Rental', 'DIY'], unitCostRange: [40, 250], essential: true, buyAt: 'T-3d', note: 'The ceremony needs a focal point for the vows + photos. A simple rentable or DIY arch dressed with the florals reads beautifully.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Cost varies widely between DIY, buy, and rental.' } },
    { id: 'p_guestbook', item: 'Guest book + pen (the keepsake the couple keeps)', category: 'decor', qtyFlat: 1, unit: 'book + pen', where: ['Amazon', 'Bookstore', 'Party store'], unitCostRange: [12, 40], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a pen that works and a clear spot for it. Renewals are about the long arc — the signed book is a keepsake.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Standard keepsake item.' } },
    { id: 'p_candles', item: 'Candles + ambient decor (unscented near food)', category: 'decor', qtyFlat: 10, unit: 'candles', where: ['Grocery', 'Ikea', 'Amazon'], unitCostRange: [0.5, 3], essential: false, buyAt: 'T-3d', note: 'Unscented only near food. Battery candles are smart for an outdoor/destination setup.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Ambiance estimate.' } },
    { id: 'p_signage', item: 'Signage + ceremony program cards (order of service)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Amazon', 'Party store', 'Print shop'], unitCostRange: [15, 45], essential: false, buyAt: 'T-3d', note: 'A printed order-of-service helps guests follow a self-led ceremony.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Optional print item.' } },
    { id: 'p_napkins', item: 'Napkins (cloth or premium paper)', category: 'rental', qtyPerGuest: 2, unit: 'napkins', where: ['Have/borrow', 'Grocery'], unitCostRange: [0.2, 2], essential: true, buyAt: 'T-3d', provenance: { tier: 'estimate', confidence: 'med', verificationStatus: 'synthesized', note: '~2/guest covers meal + cake.' } },
    { id: 'p_music', item: 'Music kit (Bluetooth speaker + a charged backup, processional playlist queued)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Amazon', 'Have', 'Best Buy'], unitCostRange: [20, 120], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a tested speaker + an offline/queued processional track so the entrance music does not fail.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'DIY-music heuristic; a DJ replaces this.' } },
    { id: 'p_paper', item: 'Paper goods (plates/cups/cocktail napkins for an app reception, leftover containers)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [12, 25], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: leftover + cake-to-go containers for sending food home.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Standard paper-goods kit.' } },
    { id: 'p_clean', item: 'Dish soap, sponges, trash + recycling bags', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 15], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: extra trash bags + a recycling bag for the bottles.', provenance: { tier: 'estimate', confidence: 'med', verificationStatus: 'synthesized', note: 'Standard cleanup kit.' } },
  ],

  rentalsGap: [
    { item: 'Ceremony chairs (rows with an aisle)', qtyPerGuest: 1, note: 'Target ~1:1 seating for the ceremony; reserve a front zone for elders/mobility' },
    { item: 'Plates (meal + cake/app)', qtyPerGuest: 2, note: '1 main + 1 cake/app plate, matching; cake alone needs 1/guest' },
    { item: 'Glassware (wine + water + a champagne flute for the toast)', qtyPerGuest: 3, note: 'wine + water + a flute; + a few spares for breakage' },
    { item: 'Flatware sets', qtyPerGuest: 1, note: '+ cake forks; +1 spare set per 4' },
    { item: 'Reception / dining chairs', qtyPerGuest: 1, note: 'For a MEAL format target ~1:1; for an apps reception, seating for ~60% plus lean rails' },
    { item: 'Serving platters + utensils + chafers', qtyFlat: 8, note: 'COMMONLY FORGOTTEN: a dish per app/dish + serving spoons/tongs; chafers if apps are hot' },
    { item: 'Folding tables (food/bar/cake/guest-book)', qtyFlat: 4, note: 'Dedicated cake table + a guest-book table are part of the staging' },
    { item: 'Focal arch / backdrop frame', qtyFlat: 1, note: 'If renting rather than buying — the ceremony focal point for the vows + photos' },
  ],

  vendors: [
    { category: 'Officiant / Celebrant', required: false, altToDIY: 'A friend/family member can officiate, or the couple can self-lead — but someone must own and rehearse the script', when: 'T-49d', costRange: [150, 500], costUnit: 'flat' },
    { category: 'Photographer', required: false, altToDIY: 'A 1-2h photographer (or an assigned guest with a real camera) captures a day you cannot reshoot', when: 'T-45d', costRange: [250, 900], costUnit: 'flat' },
    { category: 'Catering', required: false, altToDIY: 'Drop-off or stationed catering removes the riskiest cook load at 40+ guests; a restaurant room removes it entirely', when: 'T-28d', costRange: [20, 55], costUnit: 'per guest' },
    { category: 'Bar / Bartender', required: false, altToDIY: 'A bartender (~$200-400) lets the couple be present for the ceremony and toast instead of pouring all night', when: 'T-28d', costRange: [200, 400], costUnit: 'flat' },
    { category: 'Bakery (cake)', required: true, altToDIY: 'A grocery-bakery cake is the budget path; a custom cake needs ~1-2 weeks lead', when: 'T-14d', costRange: [45, 160], costUnit: 'flat' },
    { category: 'Florals + arch/backdrop', required: false, altToDIY: 'DIY grocery-store flowers + a rented or DIY arch vs a florist install; couples often want their original wedding palette', when: 'T-21d', costRange: [80, 400], costUnit: 'flat' },
    { category: 'Music / DJ', required: false, altToDIY: 'A tested Bluetooth speaker + a queued processional playlist replaces a DJ for a small renewal', when: 'T-21d', costRange: [150, 700], costUnit: 'flat' },
    { category: 'Day-of coordinator / Cleaning', required: false, altToDIY: 'A coordinator or post-event cleaner lets the couple stay in the moment; highest-ROI host-sanity spend at a larger renewal', when: 'T-14d', costRange: [120, 500], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_vows', trigger: 'Vows unwritten or the ceremony order never set/rehearsed', severity: 'high', mitigation: 'Write vows by T-35d; finalize the order with the officiant; rehearse the processional + vows + ring handoff at T-7d.' },
    { id: 'r_officiant', trigger: 'No officiant booked, or the self-led plan has no rehearsed lead', severity: 'high', mitigation: 'Book the officiant or confirm the friend-officiant by T-49d; if self-led, one partner owns the script and the order is rehearsed.' },
    { id: 'r_photographer', trigger: 'No photographer for a day you cannot reshoot', severity: 'high', mitigation: 'Book at T-45d with an agreed coverage window (ceremony + toast + cake) and a short shot list; assign a backup guest with a real camera.' },
    { id: 'r_headcount', trigger: 'Final headcount not confirmed by T-4d', severity: 'high', mitigation: 'Chase the maybes; buy fresh + final alcohol AFTER the count locks; over-cater by ~10%, not 30%; size ceremony chairs to the count.' },
    { id: 'r_arch', trigger: 'No focal arch/backdrop → the ceremony has no anchor for the vows or photos', severity: 'med', mitigation: 'Order/rent/DIY the arch by T-3d; dress it with the florals; test it stands and is anchored against wind if outdoors.' },
    { id: 'r_cake', trigger: 'Cake ordered too late / wrong size', severity: 'med', mitigation: 'Order at T-14d sized to headcount (8" ~15-24, 2-tier ~25-40); confirm pickup/delivery time the day before.' },
    { id: 'r_toast_low', trigger: 'Not enough champagne for everyone to toast', severity: 'med', mitigation: 'Budget ~1 bottle per 6-8 guests for one pour each; keep a zero-proof sparkling so non-drinkers can raise a glass too.' },
    { id: 'r_weather', trigger: 'Outdoor/destination ceremony hit by weather', severity: 'med', mitigation: 'Have a covered/indoor backup, a tent option, and a go/no-go call time; for a destination, build a buffer day.' },
    { id: 'r_access', trigger: 'Older or mobility-limited guests cannot navigate ceremony seating', severity: 'med', mitigation: 'Ask accessibility needs on the invite; reserve a front seating zone, a clear path, parking, and audible vows placement.' },
    { id: 'r_music', trigger: 'Processional/reception music fails (no speaker, dead phone, streaming drops)', severity: 'med', mitigation: 'Use a tested speaker with a charged backup and an OFFLINE/downloaded processional track; assign one person to run it.' },
    { id: 'r_ice', trigger: 'No ice / warm drinks', severity: 'med', mitigation: 'Buy ~1.5 lb ice/guest day-of; pre-chill whites + champagne ~3h ahead.' },
    { id: 'r_cleanup', trigger: 'No cleanup plan → couple trapped at the sink', severity: 'low', mitigation: 'Stage a bus tub + empty dishwasher pre-event; clear into the tub, do not wash mid-party; consider a cleaner.' },
  ],

  contingencies: [
    { id: 'c_vows', when: 'r_vows', plan: 'If vows are not ready at go-time, fall back to a short reaffirmation script the officiant leads (a "do you still…/I do" call-and-response) — it carries the moment honestly. Never skip the vows over nerves; the officiant can prompt.' },
    { id: 'c_officiant', when: 'r_officiant', plan: 'If the officiant cancels, a confident friend or family member can lead from the written order; in a pinch, the couple alone reads vows to each other with a designated person cuing the start.' },
    { id: 'c_photographer', when: 'r_photographer', plan: 'If the photographer falls through, assign two guests with good phones/cameras to cover the ceremony from two angles and the toast + cake cut; collect everything into a shared album afterward.' },
    { id: 'c_short', when: 'r_headcount', plan: 'If more guests arrive than expected, stretch with more bread/cheese/salad and slow the pacing; open the app stations first so the table never looks bare; pull extra ceremony chairs from the reception.' },
    { id: 'c_arch', when: 'r_arch', plan: 'If the arch fails or never came together, anchor the ceremony on a dressed table, a draped doorway, a tree, or a clustered florals backdrop — guests look at the couple, not the structure.' },
    { id: 'c_cake', when: 'r_cake', plan: 'If the cake is wrong/late/short, supplement with a sheet cake or dessert platter from the nearest grocery bakery; the cut + toast moment matters more than the exact tier count.' },
    { id: 'c_toast', when: 'r_toast_low', plan: 'If champagne runs low at the toast, top with a sparkling-wine or prosecco-spritz so every glass is full for the raise; the toast is the moment, not the vintage.' },
    { id: 'c_weather', when: 'r_weather', plan: 'If weather turns, move the ceremony under the tent/indoors and keep it short; a 10-minute vows-and-toast indoors beats a rained-out outdoor plan. Make the go/no-go call early, not at the aisle.' },
    { id: 'c_access', when: 'r_access', plan: 'Keep a reserved front seating zone near the vows for elders and anyone with mobility needs; assign a family member to escort and check on them.' },
    { id: 'c_music', when: 'r_music', plan: 'If the speaker/stream fails, switch to the charged backup and the downloaded track; worst case, a guest hums or someone plays it from a phone held to a cup — the entrance still happens.' },
    { id: 'c_ice', when: 'r_ice', plan: 'Send someone for two bags of ice; in the meantime chill the most-poured bottles in a sink/cooler of ice water — it cools faster than the freezer.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Alcohol + champagne, non-perishables, decor, the arch/backdrop, guest book + pen, music kit, signage, paper + cleanup goods' },
      { when: 'T-1d', what: 'Fresh food, florals, garnish; pick up the cake' },
      { when: 'T0', what: 'Ice + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-7d', what: 'Rehearse the ceremony (processional, vows order, ring/keepsake handoff, toast cue); confirm the officiant + reader' },
      { when: 'T-1d evening', what: 'Make-ahead food, prep platters, label serving dishes; assemble + test the arch/backdrop; write the run-of-show' },
      { when: 'T0 -4h', what: 'Finish cooking/assembly; dress the arch with florals; lay out the guest-book table and program cards' },
      { when: 'T0 -1h', what: 'Bring food to serving temp; final music + speaker check; brief the reader/officiant on the cue order' },
    ],
    setup: [
      { when: 'T0 -3h', what: 'Set ceremony chairs in rows with an aisle, place + anchor the arch/backdrop, mark the processional path; chill whites + champagne; build the bar + ice' },
      { when: 'T0 -2h', what: 'Set reception tables/stations, seating, cake table, guest-book table with a working pen; set up + test the processional + reception music' },
      { when: 'T0 -2h', what: 'Empty dishwasher; stage a bus tub + trash/recycling station; place florals + candles' },
      { when: 'T0 -0:30', what: 'Final touches; queue the processional track; pour welcome drinks for early arrivals and start seating guests' },
    ],
    cleanup: [
      { when: 'during', what: 'Clear courses/plates into the staged bus tub; keep trash + recycling moving; do NOT wash mid-party' },
      { when: 'after the cake', what: 'Box leftover cake to send home; consolidate open bottles; collect the signed guest book somewhere safe' },
      { when: 'T0 +4h', what: 'Leftovers into containers (send some home), run dishwasher, hand-wash delicates, bottles to recycling, break down + return the arch and rentals, music gear away, linens to soak' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'This playbook is synthesized, not source-cited. The quantity heuristics it leans on are standard US hosting and wedding-catering consensus — roughly 0.4 lb (6-8 oz) of protein per seated guest, about one drink per guest per hour (so ~½ bottle of wine per drinking guest over a 3-4 hour reception), ~1.5 lb of ice per guest, a 750ml champagne bottle pouring 6-8 toast glasses (hence ~1 bottle per 6-8 guests for a single toast pour), ~10-12 app pieces/guest when apps replace a meal, and common cake yields (an 8" serving ~15-24 and a 2-tier ~25-40). These are planning rules of thumb that scale by guest count, not guarantees; real menus, regional pricing, dietary needs, season/weather, destination logistics, and venue rules will shift them, and the per-guest cost band ($45-160) is intentionally wide because a renewal can be a backyard apps party or a venue dinner. A vow renewal has no legal force, so the ceremony is fully scriptable — the framing of the ceremony (officiant-vs-self-led, the rehearsed processional/vows/ring handoff) and the photographer + guest book as the keepsake layer is experience-based judgment, not measured fact. No external sources are cited; verify cake sizing, bar quantities, officiant/photographer availability, and any catering/venue minimums against your actual vendors before purchasing.',
    sources: [],
  },
};

export default vowRenewal;
