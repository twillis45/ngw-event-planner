// Anniversary — Event OS playbook data.
//
// A milestone wedding-anniversary celebration. The host is honoring a couple
// (often themselves, often parents) so the playbook treats the slideshow / photo-
// memory moment as the emotional hero, and front-loads the two format-defining
// decisions (intimate dinner vs. larger party) that drive every quantity below.
// ESM default export — no CJS module.exports in src/ (prod-bundle ESM lesson).
// The reader (../index.js) consumes `purchases` first for the operational
// candidate; the rest is available as the engine grows.

const anniversary = {
  type: 'Anniversary',
  vegMain: 'Wild mushroom risotto',
  solveFamily: 'anniversary',
  family: 'host_driven',
  recordKind: 'client',
  version: '1.0.0',

  meta: {
    summary:
      'A milestone wedding-anniversary celebration honoring a couple — an intimate seated dinner or a larger heavy-apps party. A meal (or grazing) + wine/bar, a champagne toast, an anniversary cake, florals, and a slideshow/photo-memory moment that is the emotional hero of the night.',
    typicalGuests: { low: 10, default: 24, high: 40 },
    typicalDurationHours: 4,
    leadTimeDays: 35,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 35, high: 130, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The slideshow starts and someone in the back quietly reaches for their spouse\'s hand.',
    'The toast from the couple\'s kids — the one that makes the room cry.',
    'The champagne is poured, the room goes quiet, and everyone looks at them.',
    'The song from the wedding plays and they dance like it\'s that day again.',
    'An old photo appears on the screen and the couple sees it for the first time in years.',
  ],

  decisions: [
    { id: 'format', label: 'Intimate seated dinner or a larger party?', options: ['Intimate seated dinner (~10-16)', 'Heavy apps + drinks party (~20-40)', 'Restaurant private room', 'Backyard / at-home reception'], default: 'Heavy apps + drinks party (~20-40)', when: 'T-35d', blocks: ['menu', 'seating', 'rentals', 'beverage'], why: 'This is the root decision. A seated dinner means ~1:1 plated covers and a cook timeline; a party means stations of heavy apps the host can refill — it changes food math, seating, rentals, and how much active work lands on the host during the event.' },
    { id: 'venue', label: 'At home or a venue/restaurant?', options: ['Home / backyard', 'Restaurant private room', 'Rented hall / clubhouse', 'Relative’s home'], default: 'Home / backyard', when: 'T-35d', dependsOn: ['format'], blocks: ['rentals', 'vendors'], why: 'A restaurant absorbs catering, rentals, bar, and cleanup (and most of the budget); at-home shifts all of that onto the host and the purchase + rental lists below.' },
    { id: 'honor', label: 'Surprise the couple, or co-plan with them?', options: ['Surprise', 'Co-planned with the couple', 'Couple is self-hosting'], default: 'Co-planned with the couple', when: 'T-35d', why: 'A surprise changes the invite wording, the arrival choreography, and who you can ask for the guest list and photos — decide before invites go out.' },
    { id: 'guestlist', label: 'Confirm guest count + collect dietary/accessibility needs', options: [], default: null, when: 'T-28d', dependsOn: ['format'], blocks: ['menu', 'rentals'], why: 'Every food, drink, seat, and rental quantity derives from a real headcount. Anniversary lists skew older — collect mobility/seating and dietary needs with the invite.' },
    { id: 'menu', label: 'Lock the menu (or catering order)', options: ['Plated dinner', 'Buffet / family-style', 'Heavy passed + stationed apps', 'Dessert + toast reception'], default: 'Heavy passed + stationed apps', when: 'T-21d', dependsOn: ['guestlist', 'format'], blocks: ['purchasing'], why: 'The shopping list and any catering order derive from this. For a party format, "heavy apps" must actually be a meal’s worth of food (~10-12 pieces/guest), not a thin snack spread.' },
    { id: 'beverage', label: 'Bar strategy + the toast pour', options: ['Wine + beer + champagne toast', 'Full bar + signature cocktail', 'Wine + champagne toast only', 'Zero-proof / dry'], default: 'Wine + beer + champagne toast', when: 'T-21d', dependsOn: ['format'], blocks: ['purchasing'], why: 'Sets spend (often 25-40% of the budget) and glassware. The champagne toast is non-negotiable for an anniversary — budget ~1 bottle per 6-8 guests for one pour each.' },
    { id: 'slideshow', label: 'Slideshow / photo-memory moment (the emotional hero)', options: ['Looping slideshow on a TV', 'Projected slideshow + a scheduled toast moment', 'Printed photo timeline / display table', 'Short video montage'], default: 'Projected slideshow + a scheduled toast moment', when: 'T-21d', dependsOn: ['honor'], blocks: ['setup'], why: 'This is the moment guests remember. It needs photos gathered weeks ahead, a tested screen/projector, and a place in the run-of-show timed to the toast — not improvised day-of.' },
    { id: 'help', label: 'DIY, or bring in help?', options: ['Fully DIY', 'Caterer / drop-off', 'Bartender', 'Day-of cleaner', 'Server for a seated dinner'], default: 'Bartender', when: 'T-21d', dependsOn: ['format', 'venue'], blocks: ['vendors'], why: 'The honest tradeoff: at 24+ guests a host cannot cook, tend bar, run the slideshow, AND host. One hire (usually a bartender) is what lets the host be present for the toast.' },
  ],

  milestones: [
    { id: 'an_setdate', name: 'Set date, format, guest count + budget', offsetDays: 35, owner: 'host', category: 'planning', risk: null },
    { id: 'an_venue', name: 'Lock venue (book restaurant room / confirm home + rentals plan)', offsetDays: 30, owner: 'host', dependsOn: ['an_setdate'], category: 'logistics', risk: { ifDelayed: 'Milestone-anniversary dates book out; lose the date or pay rush', severity: 'high' } },
    { id: 'an_invite', name: 'Send invites + ask dietary/accessibility + RSVP-by', offsetDays: 28, owner: 'host', dependsOn: ['an_setdate'], category: 'guest', risk: { ifDelayed: 'Low RSVP visibility → wrong food/drink/seating counts', severity: 'med' } },
    { id: 'an_photos', name: 'Gather photos for the slideshow (ask family early)', offsetDays: 24, owner: 'host', dependsOn: ['an_setdate'], category: 'memory', risk: { ifDelayed: 'No time to collect/scan old photos → the emotional hero falls flat', severity: 'high' } },
    { id: 'an_menu', name: 'Lock menu + cake order + bar plan', offsetDays: 21, owner: 'host', dependsOn: ['an_invite'], category: 'food', risk: { ifDelayed: 'No shopping list / catering window / cake lead time', severity: 'high' } },
    { id: 'an_cake', name: 'Order the anniversary cake', offsetDays: 14, owner: 'host', dependsOn: ['an_menu'], category: 'food', risk: { ifDelayed: 'Bakeries need ~1-2 weeks for a custom milestone cake', severity: 'med' } },
    { id: 'an_slideshow', name: 'Build + test the slideshow (and the screen/projector)', offsetDays: 7, owner: 'host', dependsOn: ['an_photos'], category: 'memory', risk: { ifDelayed: 'Untested AV is the #1 day-of slideshow failure', severity: 'high' } },
    { id: 'an_rentals', name: 'Confirm rentals / serveware / seating capacity', offsetDays: 7, owner: 'host', dependsOn: ['an_venue', 'an_menu'], category: 'rental', risk: { ifDelayed: 'Not enough matching plates/glasses/chairs day-of', severity: 'med' } },
    { id: 'an_rsvp_close', name: 'Confirm final headcount (chase the maybes)', offsetDays: 3, owner: 'host', dependsOn: ['an_invite'], category: 'guest', risk: { ifDelayed: 'Over/under-buy food + drink by 20-30%', severity: 'high' } },
    { id: 'an_shop_pantry', name: 'Buy alcohol, non-perishables, decor, paper goods', offsetDays: 3, owner: 'host', dependsOn: ['an_menu'], category: 'shopping', risk: null },
    { id: 'an_shop_fresh', name: 'Buy fresh food, florals; pick up cake', offsetDays: 1, owner: 'host', dependsOn: ['an_menu', 'an_rsvp_close'], category: 'shopping', risk: { ifDelayed: 'Wilted florals / sold-out items / missed cake pickup', severity: 'med' } },
    { id: 'an_prep', name: 'Make-ahead food prep + stage the slideshow/AV', offsetDays: 1, owner: 'host', dependsOn: ['an_shop_fresh', 'an_slideshow'], category: 'food', risk: null },
    { id: 'an_setup', name: 'Set the space, chill drinks, set up screen + cake table', offsetDays: 0, owner: 'host', dependsOn: ['an_rentals', 'an_prep'], category: 'setup', risk: null },
    { id: 'event', name: 'The anniversary celebration', offsetDays: 0, owner: 'host', dependsOn: ['an_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'an_invite', phase: 'guest', label: 'Send invite with date, time, address, dietary/accessibility ask, RSVP-by (and "surprise — keep it quiet" if applicable)', when: 'T-28d' },
    { id: 't_photoask', milestoneId: 'an_photos', phase: 'memory', label: 'Ask family/friends to send favorite photos + a short memory; create a shared album/dropbox link', when: 'T-24d' },
    { id: 't_cakeorder', milestoneId: 'an_cake', phase: 'food', label: 'Order cake: flavor, size for headcount, milestone message / year, pickup time', when: 'T-14d' },
    { id: 't_buildshow', milestoneId: 'an_slideshow', phase: 'memory', label: 'Assemble photos into a slideshow (chronological), set to music; keep it ~4-6 min', when: 'T-7d' },
    { id: 't_testav', milestoneId: 'an_slideshow', phase: 'memory', label: 'Test on the ACTUAL screen/projector + speakers at the venue; check cables/adapters and a backup (phone/laptop)', when: 'T-7d' },
    { id: 't_rsvp_chase', milestoneId: 'an_rsvp_close', phase: 'guest', label: 'Chase non-responders; lock the final count + any dietary needs', when: 'T-3d' },
    { id: 't_pantry_shop', milestoneId: 'an_shop_pantry', phase: 'shopping', label: 'Alcohol, champagne for the toast, non-perishables, decor, paper/cleanup goods', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'an_shop_fresh', phase: 'shopping', label: 'Fresh food, florals, garnish; pick up the cake (or schedule its delivery)', when: 'T-1d' },
    { id: 't_prep', milestoneId: 'an_prep', phase: 'food', label: 'Make-ahead apps/dishes, prep platters, label serving dishes', when: 'T-1d evening' },
    { id: 't_runorder', milestoneId: 'an_prep', phase: 'memory', label: 'Write the run-of-show: arrival, eat/mingle, slideshow + toast, cake', when: 'T-1d evening' },
    { id: 't_setspace', milestoneId: 'an_setup', phase: 'setup', label: 'Set tables/stations, seating (~1:1 for dinner), florals, candles, cake table, photo display', when: 'T0 afternoon' },
    { id: 't_av', milestoneId: 'an_setup', phase: 'setup', label: 'Set up + re-test the screen/projector + speakers; queue the slideshow; dim-able lighting near the screen', when: 'T0 -2h' },
    { id: 't_chill', milestoneId: 'an_setup', phase: 'beverage', label: 'Chill whites + champagne 2-3h ahead; build the bar/drinks station + ice', when: 'T0 -3h' },
    { id: 't_clean_pre', milestoneId: 'an_setup', phase: 'cleanup', label: 'Pre-clean: empty dishwasher, clear sink, stage a bus tub + trash/recycling station', when: 'T0 -2h' },
    { id: 't_greet', milestoneId: 'event', phase: 'event', label: 'Greet guests; pour welcome drinks; let the looping slideshow play softly', when: 'T0 +0:00' },
    { id: 't_food', milestoneId: 'event', phase: 'food', label: 'Serve the meal / refill the app stations; keep the bar stocked', when: 'T0 +0:30' },
    { id: 't_toast', milestoneId: 'event', phase: 'memory', label: 'Gather everyone; pour champagne; run the slideshow; give the toast to the couple', when: 'T0 +1:45' },
    { id: 't_cake', milestoneId: 'event', phase: 'food', label: 'Cut + serve the anniversary cake right after the toast', when: 'T0 +2:15' },
    { id: 't_clear', milestoneId: 'event', phase: 'cleanup', label: "Clear into the staged bus tub (don't wash mid-party); keep trash/recycling moving", when: 'ongoing' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Post-party reset: leftovers into containers, run dishwasher, return rentals box, bottles to recycling', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_apps', item: 'Cheese & charcuterie spread (crudite, sliders, skewers, dips)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco', 'Caterer', 'Instacart'], unitCostRange: [5, 11], essential: true, buyAt: 'T-1d', note: 'For a PARTY format, heavy apps must be a meal: plan ~10-12 pieces/guest across stations.', alternatives: ['Costco deli platters — cheaper per lb, same grazing concept', 'Grocery store prepared foods bar — if budget is tight'], provenance: 'synthesized' },
    { id: 'p_protein', item: 'Beef, chicken or salmon (for a seated dinner — plus a veg main)', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Butcher', 'Grocery', 'Costco', 'Caterer'], unitCostRange: [7, 16], essential: false, buyAt: 'T-1d', note: '~0.4 lb cooked protein per seated guest. Skip if the format is apps-only.', alternatives: ['Roast chicken — cheaper than beef/salmon, crowd-pleasing', 'Pork tenderloin — budget beef alternative, elegant presentation', 'Pasta main — cheapest option, good for large seated groups'], provenance: 'synthesized' },
    { id: 'p_sides', item: 'Garden salad & roasted vegetables', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery', 'Farmers market'], unitCostRange: [2, 5], essential: true, buyAt: 'T-1d', alternatives: ['Costco prepared sides — saves time and often cheaper', 'Roasted root vegetables — budget-friendly, seasonal'], provenance: 'synthesized' },
    { id: 'p_bread', item: 'Bread / rolls / crackers', category: 'food', qtyFlat: 1, qtyPer: 4, unit: 'loaf/box per 4 guests', where: ['Bakery', 'Grocery'], unitCostRange: [4, 8], essential: false, buyAt: 'T-1d', alternatives: ['Store-brand dinner rolls — fraction of the cost of bakery rolls', 'Crackers from box — if bread is sold out, works fine for apps'], provenance: 'synthesized' },
    { id: 'p_cake', item: 'Anniversary cake (milestone message / year)', category: 'food', qtyFlat: 1, qtyPer: 20, unit: 'cake per ~20 guests', where: ['Bakery', 'Grocery bakery'], unitCostRange: [40, 120], essential: true, buyAt: 'T-1d', note: 'Order ~1-2 weeks ahead. A 2-tier serves ~25-40; an 8" serves ~15-24.', alternatives: ['Grocery bakery sheet cake — add custom message, far cheaper', 'Dessert platter (macarons, pastries) — if custom cake lead time was missed'], provenance: 'synthesized' },
    { id: 'p_champagne', item: 'Champagne / sparkling for the toast', category: 'beverage', qtyFlat: 1, qtyPer: 7, unit: 'bottle per ~7 guests', where: ['Wine shop', 'Total Wine', 'Grocery'], unitCostRange: [14, 35], essential: true, buyAt: 'T-3d', note: 'A 750ml bottle pours ~6-8 toast glasses; ~1 bottle per 6-8 guests for one pour each. The toast is the anniversary signature.', provenance: 'synthesized' },
    { id: 'p_wine', item: 'Wine (red + white) for the bar', category: 'beverage', qtyPerGuest: 0.5, unit: 'bottle', where: ['Wine shop', 'Total Wine', 'Grocery'], unitCostRange: [10, 22], essential: true, buyAt: 'T-3d', note: 'Rule of thumb: ~½ bottle per drinking guest for a 3-4h party (~1 drink/guest/hour).', provenance: 'synthesized' },
    { id: 'p_beer', item: 'Beer / seltzer', category: 'beverage', qtyPerGuest: 1.5, unit: 'cans', where: ['Grocery', 'Costco'], unitCostRange: [1, 2.5], essential: false, buyAt: 'T-3d', provenance: 'synthesized' },
    { id: 'p_nonalc', item: 'Sparkling water, mocktail, juice & soda', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery'], unitCostRange: [1, 2], essential: true, buyAt: 'T-3d', note: 'Anniversary lists skew older — always have a great zero-proof pour for the toast too.', provenance: 'synthesized' },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest for chilling + drinks.', provenance: 'synthesized' },
    { id: 'p_coffee', item: 'Coffee + tea service (for cake — a 40-cup urn per ~25 guests)', category: 'beverage', qtyFlat: 1, qtyPer: 25, unit: 'urn (~40 cups)', where: ['Grocery', 'Rental', 'Party store'], unitCostRange: [12, 30], essential: true, buyAt: 'T-3d', note: 'Board fix: a flat "service" under-specs the cake-and-coffee pour at the 40-guest high end — scale ~1 large urn per 25.', provenance: 'synthesized' },
    { id: 'p_flowers', item: 'Florals / centerpieces (anniversary palette — often the couple’s wedding colors)', category: 'decor', qtyFlat: 1, qtyPer: 6, unit: 'arrangement per 6 guests', where: ['Florist', "Trader Joe's", 'Farmers market'], unitCostRange: [15, 45], essential: false, buyAt: 'T-1d', provenance: 'synthesized' },
    { id: 'p_candles', item: 'Candles + ambient decor (unscented at tables)', category: 'decor', qtyFlat: 8, unit: 'candles', where: ['Grocery', 'Ikea', 'Amazon'], unitCostRange: [0.5, 3], essential: false, buyAt: 'T-3d', note: 'Unscented only near food. A dim-able lamp near the slideshow screen reads better than overhead light.', provenance: 'synthesized' },
    { id: 'p_signage', item: 'Anniversary signage + the photo-display / memory table props (frames, banner, year number)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Amazon', 'Party store', 'Print shop'], unitCostRange: [15, 45], essential: false, buyAt: 'T-3d', provenance: 'synthesized' },
    { id: 'p_napkins', item: 'Napkins (cloth or premium paper)', category: 'rental', qtyPerGuest: 2, unit: 'napkins', where: ['Have/borrow', 'Grocery'], unitCostRange: [0.2, 2], essential: true, buyAt: 'T-3d', provenance: 'synthesized' },
    { id: 'p_avgear', item: 'AV bits for the slideshow (HDMI cable, adapter, small speaker, extension cord)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Amazon', 'Best Buy', 'Have'], unitCostRange: [15, 50], essential: false, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: the right cable/adapter for the slideshow. Buy/borrow before the day, not during it.', provenance: 'synthesized' },
    { id: 'p_paper', item: 'Paper goods (plates/cups/cocktail napkins for an app party, leftover containers)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [12, 25], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: leftover + cake-to-go containers for sending food home.', provenance: 'synthesized' },
    { id: 'p_clean', item: 'Dish soap, sponges, trash + recycling bags', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 15], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: extra trash bags + a recycling bag for the bottles.', provenance: 'synthesized' },
  ],

  rentalsGap: [
    { item: 'Plates (dinner + cake/app)', qtyPerGuest: 2, note: '1 main + 1 cake/app plate, matching; cake alone needs 1/guest' },
    { item: 'Glassware (wine + water + a champagne flute for the toast)', qtyPerGuest: 3, note: 'wine + water + a flute; +a few spares for breakage' },
    { item: 'Flatware sets', qtyPerGuest: 1, note: '+ cake forks; +1 spare set per 4' },
    { item: 'Dining / seated chairs', qtyPerGuest: 1, note: 'For a DINNER format target ~1:1 seating; for a party, seating for ~60% plus lean rails' },
    { item: 'Serving platters + utensils + chafers', qtyFlat: 8, note: 'COMMONLY FORGOTTEN: a dish per app/dish + serving spoons/tongs; chafers if apps are hot' },
    { item: 'Folding tables (food/bar/cake/photo-display)', qtyFlat: 4, note: 'Dedicated cake table + a memory/photo-display table are part of the staging' },
  ],

  vendors: [
    { category: 'Catering', required: false, altToDIY: 'Drop-off or stationed catering removes the riskiest cook load at 24+ guests; a restaurant private room removes it entirely', when: 'T-21d', costRange: [20, 50], costUnit: 'per guest' },
    { category: 'Bar / Bartender', required: false, altToDIY: 'A bartender (~$200-350) lets the host be present for the toast instead of pouring all night', when: 'T-21d', costRange: [200, 400], costUnit: 'flat' },
    { category: 'Bakery (cake)', required: true, altToDIY: 'A grocery-bakery sheet cake is the budget path; a custom milestone cake needs ~1-2 weeks lead', when: 'T-14d', costRange: [40, 150], costUnit: 'flat' },
    { category: 'Florals', required: false, altToDIY: 'DIY grocery-store flowers vs a florist; couples often want their wedding palette', when: 'T-7d', costRange: [60, 200], costUnit: 'flat' },
    { category: 'Photographer', required: false, altToDIY: 'A 1-2h photographer (or an assigned guest with a real camera) captures a milestone you can’t re-shoot', when: 'T-14d', costRange: [200, 600], costUnit: 'flat' },
    { category: 'AV / Slideshow help', required: false, altToDIY: 'A friend who owns a projector + speaker, or a small AV rental, de-risks the emotional hero moment', when: 'T-7d', costRange: [50, 200], costUnit: 'flat' },
    { category: 'Cleaning', required: false, altToDIY: 'A post-party cleaner (~$120-200) is the highest-ROI spend for host sanity at a larger party', when: 'T-7d', costRange: [120, 220], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_slideshow', trigger: 'Slideshow built late or never tested on the real screen', severity: 'high', mitigation: 'Ask for photos at T-24d; build by T-7d; test on the actual screen/projector + speakers with a phone/laptop backup ready.' },
    { id: 'r_photos', trigger: 'Family never sends photos for the slideshow', severity: 'high', mitigation: 'Send a shared album link early with a hard "send by" date; chase the key people; have a fallback set from the couple’s own albums.' },
    { id: 'r_headcount', trigger: 'Final headcount not confirmed by T-3d', severity: 'high', mitigation: 'Chase the maybes; buy fresh + final alcohol AFTER the count locks; over-cater by ~10%, not 30%.' },
    { id: 'r_cake', trigger: 'Cake ordered too late / wrong size', severity: 'med', mitigation: 'Order at T-14d sized to headcount (2-tier ~25-40, 8" ~15-24); confirm pickup/delivery time the day before.' },
    { id: 'r_toast_low', trigger: 'Not enough champagne for everyone to toast', severity: 'med', mitigation: 'Budget ~1 bottle per 6-8 guests for one pour each; keep a zero-proof sparkling so non-drinkers can raise a glass too.' },
    { id: 'r_surprise', trigger: 'A surprise leaks, or the couple arrives off-cue', severity: 'med', mitigation: 'Limit who knows logistics; assign one person to manage the arrival and the "now" signal; have a graceful plan if it leaks (it becomes a co-host).' },
    { id: 'r_access', trigger: 'Older or mobility-limited guests can’t navigate the space', severity: 'med', mitigation: 'Ask accessibility needs on the invite; ensure seating, a clear path, parking, and audible toast/slideshow placement.' },
    { id: 'r_ice', trigger: 'No ice / warm drinks', severity: 'med', mitigation: 'Buy ~1.5 lb ice/guest day-of; pre-chill whites + champagne ~3h ahead.' },
    { id: 'r_cleanup', trigger: 'No cleanup plan → host trapped at the sink', severity: 'low', mitigation: 'Stage a bus tub + empty dishwasher pre-party; clear into the tub, don’t wash mid-party; consider a cleaner.' },
  ],

  contingencies: [
    { id: 'c_av', when: 'r_slideshow', plan: 'If the projector/screen fails, fall back to the slideshow on the largest available laptop/TV, or gather everyone close and play it on a phone. The toast carries the moment even if the screen doesn’t — never skip the toast over a tech issue.' },
    { id: 'c_nophotos', when: 'r_photos', plan: 'If photos never came in, pivot to a short spoken tribute + a printed photo or two on the cake table. A heartfelt toast beats a thin slideshow.' },
    { id: 'c_short', when: 'r_headcount', plan: 'If more guests arrive than expected, stretch with more bread/cheese/salad and slow the pacing; open the app stations first so the table never looks bare.' },
    { id: 'c_cake', when: 'r_cake', plan: 'If the cake is wrong/late/short, supplement with a sheet cake or a dessert platter from the nearest grocery bakery; the candles + toast moment matter more than the cake’s exact size.' },
    { id: 'c_toast', when: 'r_toast_low', plan: 'If champagne runs low at the toast, top with a sparkling-wine or a prosecco-spritz so every glass is full for the raise; the toast is the moment, not the vintage.' },
    { id: 'c_surprise', when: 'r_surprise', plan: 'If a surprise leaks, fold the couple in as gracious co-hosts and protect ONE genuine moment (the slideshow reveal or the toast) so there’s still a lump-in-the-throat beat.' },
    { id: 'c_access', when: 'r_access', plan: 'Keep a reserved seating zone near the toast/screen for elders and anyone with mobility needs; assign a family member to escort and check on them.' },
    { id: 'c_ice', when: 'r_ice', plan: 'Send someone for two bags of ice; in the meantime chill the most-poured bottles in a sink/cooler of ice water — it cools faster than the freezer.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Alcohol + champagne, non-perishables, decor, signage, AV bits, paper + cleanup goods' },
      { when: 'T-1d', what: 'Fresh food, florals, garnish; pick up the cake' },
      { when: 'T0', what: 'Ice + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-7d', what: 'Build + test the slideshow on the real screen/speakers; write the run-of-show' },
      { when: 'T-1d evening', what: 'Make-ahead apps/dishes, prep platters, label serving dishes' },
      { when: 'T0 -4h', what: 'Finish cooking/assembly; arrange the photo-display / memory table' },
      { when: 'T0 -1h', what: 'Bring food to serving temp; final slideshow + audio check' },
    ],
    setup: [
      { when: 'T0 -3h', what: 'Set tables/stations, seating, florals, candles, cake table; chill whites + champagne; build the bar + ice' },
      { when: 'T0 -2h', what: 'Set up + re-test the screen/projector + speakers; queue the slideshow; set dim-able lighting near the screen' },
      { when: 'T0 -2h', what: 'Empty dishwasher; stage a bus tub + trash/recycling station; place the memory/photo display' },
      { when: 'T0 -0:30', what: 'Light candles, start the looping slideshow softly, pour welcome drinks for early arrivals' },
    ],
    cleanup: [
      { when: 'during', what: 'Clear courses/plates into the staged bus tub; keep trash + recycling moving; do NOT wash mid-party' },
      { when: 'after the toast', what: 'Box leftover cake to send home; consolidate open bottles' },
      { when: 'T0 +4h', what: 'Leftovers into containers (send some home), run dishwasher, hand-wash delicates, bottles to recycling, pack the rentals/return box, AV gear away, linens to soak' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'This playbook is synthesized, not source-cited. The quantity heuristics it leans on are standard US hosting consensus — roughly 0.4 lb of protein per seated guest, about one drink per guest per hour (so ~½ bottle of wine per drinking guest over a 3-4 hour party), ~1.5 lb of ice per guest, a 750ml champagne bottle pouring 6-8 toast glasses (hence ~1 bottle per 6-8 guests for a single toast pour), and common cake yields (an 8" serving ~15-24 and a 2-tier ~25-40). These are planning rules of thumb that scale by guest count, not guarantees; real menus, regional pricing, dietary needs, and venue rules will shift them. The slideshow/photo-memory framing as the emotional hero, the surprise-vs-co-plan choreography, and the host-sanity vendor ROI claims are experience-based judgment, not measured facts. No external sources are cited; verify cake sizing, bar quantities, and any catering/restaurant minimums against your actual vendors before purchasing.',
    sources: [],
  },
};

export default anniversary;
