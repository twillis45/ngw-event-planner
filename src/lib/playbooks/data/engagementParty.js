// Engagement Party — Event Boss host playbook data.
//
// A celebratory cocktail-and-appetizers party for a newly-engaged couple:
// heavy passed/stationed hors d'oeuvres (NOT a seated meal), a real bar with a
// signature couple's cocktail, a champagne toast as the hero beat, light
// florals, a welcome/photo moment, music, and a guest book. ESM default export
// to match the rest of src/lib/playbooks/data/* (no CJS in src/). The reader
// (../index.js) consumes `purchases` first for the operational candidate.
//
// Quantities are grounded in standard US catering heuristics (cocktail-party
// appetizer counts, ~1 drink/guest/hour, champagne-toast pours, ice per guest).
// Per the authoring brief these are synthesized from trade consensus and NOT
// individually cited: knowledge.sources stays [] and verificationStatus is
// 'synthesized'.

const engagementParty = {
  type: 'Engagement Party',
  vegMain: 'Stuffed mushroom & spinach phyllo bites',
  solveFamily: 'engagement_party',
  family: 'host_driven',
  recordKind: 'client',
  version: '1.0.0',

  meta: {
    summary:
      "A celebratory cocktail party for the newly-engaged couple — heavy passed and stationed appetizers (no seated meal), a real bar with a signature couple's cocktail, and a champagne toast as the emotional centerpiece. The host's whole job is to engineer one great toast moment and keep food, drinks, and flow effortless around it.",
    typicalGuests: { low: 20, default: 30, high: 40 },
    typicalDurationHours: 3,
    leadTimeDays: 35,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 25, high: 90, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The champagne is poured, the room gets quiet, and the toast lands perfectly.',
    'The couple holds up their glasses and the room surrounds them.',
    'Someone says the thing in the toast that the couple didn\'t know anyone noticed.',
    'The two families meet for the first time and actually get along.',
  ],

  decisions: [
    { id: 'venue', label: 'At home or a venue / restaurant?', options: ['Host home', 'Backyard / outdoor', 'Restaurant private room', 'Event venue / bar buyout', 'Rooftop / brewery'], default: 'Host home', when: 'T-35d', blocks: ['rentals', 'staffing', 'catering'], why: 'Drives whether you rent glassware/bar gear and hire staff (home) or whether the venue covers it (restaurant). It also caps the realistic guest count.' },
    { id: 'format', label: 'Confirm cocktail format (passed + stationed apps, no seated meal)', options: ['Fully passed hors d\'oeuvres', 'Passed + grazing/cheese station', 'Stationed only (self-serve)', 'Light bites + dessert table'], default: 'Passed + grazing/cheese station', when: 'T-30d', dependsOn: ['venue'], blocks: ['menu', 'rentals'], why: 'A cocktail party lives or dies on the bite count and flow. Locking "apps, not a meal" sets ~10-12 bites/guest and prevents the host from accidentally cooking a dinner.' },
    { id: 'bar', label: 'Bar strategy + the signature couple\'s cocktail', options: ['Beer + wine + signature cocktail', 'Full open bar', 'Beer + wine only', 'Signature cocktails only + zero-proof', 'Cash/limited bar'], default: 'Beer + wine + signature cocktail', when: 'T-25d', blocks: ['beverage_purchases', 'glassware'], why: 'A named "his & hers" or couple\'s signature drink is the cheapest way to make the bar feel personal. It also fixes spirit/mixer quantities and whether a bartender is worth it.' },
    { id: 'toast', label: 'Who toasts, and in what order?', options: ['Host/parent opens → couple closes', 'Best friend / sibling toast', 'Open-mic (1-2 short)', 'Couple-only thank-you'], default: 'Host opens → couple closes', when: 'T-10d', blocks: ['runofshow'], why: 'The toast is the hero beat. Pre-assigning 1-2 speakers (not an open mic free-for-all) keeps it to ~5 minutes, on-message, and dry-eye-optional.' },
    { id: 'invite', label: 'Invite + RSVP + dietary/allergy ask', options: ['Paper invite', 'Digital (Paperless Post / Evite)', 'Group text', 'Phone + text combo'], default: 'Digital (Paperless Post / Evite)', when: 'T-30d', blocks: ['headcount'], why: 'Headcount is the master variable — every food, drink, and rental quantity scales off it. Collect allergies here, before the menu locks.' },
    { id: 'help', label: 'DIY, or bring in help?', options: ['Fully DIY', 'Hire a bartender', 'Drop-off / passed-app catering', 'Bartender + cleaner', 'Day-of helper for refills'], default: 'Hire a bartender', when: 'T-20d', blocks: ['vendors'], why: 'For 30-40 guests one host cannot pass apps, tend bar, AND host. A bartender (~$200) or a teen to clear and refill is what lets the couple\'s family actually be present for the toast.' },
  ],

  milestones: [
    { id: 'ep_setdate', name: 'Lock date, guest count, budget, and vibe', offsetDays: 35, owner: 'host', category: 'planning', risk: null },
    { id: 'ep_venue', name: 'Confirm venue (home or book restaurant/venue)', offsetDays: 32, owner: 'host', dependsOn: ['ep_setdate'], category: 'logistics', risk: { ifDelayed: 'Popular dates/private rooms book out 4-6 weeks ahead', severity: 'high' } },
    { id: 'ep_invite', name: 'Send invites + ask dietary/allergy + RSVP-by date', offsetDays: 28, owner: 'host', dependsOn: ['ep_setdate'], category: 'guest', risk: { ifDelayed: 'No headcount → cannot size food, bar, or rentals', severity: 'high' } },
    { id: 'ep_menu', name: 'Lock the appetizer menu (~10-12 bites/guest, a veg + GF option)', offsetDays: 21, owner: 'host', dependsOn: ['ep_invite'], category: 'food', risk: { ifDelayed: 'No shopping list or catering order possible', severity: 'high' } },
    { id: 'ep_bar', name: 'Finalize bar + the signature cocktail recipe (test it)', offsetDays: 18, owner: 'host', dependsOn: ['ep_menu'], category: 'beverage', risk: { ifDelayed: 'Wrong spirit/mixer quantities; untested drink flops day-of', severity: 'med' } },
    { id: 'ep_rentals', name: 'Confirm glassware / bar / seating capacity (rent or borrow gap)', offsetDays: 14, owner: 'host', dependsOn: ['ep_bar', 'ep_venue'], category: 'rental', risk: { ifDelayed: 'Not enough matching glasses or a real bar surface day-of', severity: 'med' } },
    { id: 'ep_vendors', name: 'Book bartender / caterer / photographer if using', offsetDays: 14, owner: 'host', dependsOn: ['ep_setdate'], category: 'logistics', risk: { ifDelayed: 'Good bartenders/photographers book out; weekend rates spike', severity: 'med' } },
    { id: 'ep_toast', name: 'Confirm toast speakers + order; brief them (≤2 min each)', offsetDays: 10, owner: 'host', dependsOn: ['ep_invite'], category: 'program', risk: { ifDelayed: 'Rambling open-mic toast kills the energy', severity: 'med' } },
    { id: 'ep_rsvp_close', name: 'Confirm final headcount (chase the maybes)', offsetDays: 4, owner: 'host', dependsOn: ['ep_invite'], category: 'guest', risk: { ifDelayed: 'Over/under-buy food and drinks by 20-30%', severity: 'high' } },
    { id: 'ep_shop_pantry', name: 'Buy alcohol, champagne, non-perishables, decor, guest book', offsetDays: 3, owner: 'host', dependsOn: ['ep_bar', 'ep_rsvp_close'], category: 'shopping', risk: null },
    { id: 'ep_prep', name: 'Make-ahead apps, batch the signature cocktail, prep garnishes', offsetDays: 1, owner: 'host', dependsOn: ['ep_menu'], category: 'food', risk: { ifDelayed: 'Host trapped in the kitchen instead of greeting guests', severity: 'med' } },
    { id: 'ep_shop_fresh', name: 'Buy fresh produce, cheese/charcuterie, flowers, citrus, ice', offsetDays: 1, owner: 'host', dependsOn: ['ep_menu', 'ep_rsvp_close'], category: 'shopping', risk: { ifDelayed: 'Wilted florals / warm bar', severity: 'med' } },
    { id: 'ep_setup', name: 'Build the bar + stations, chill champagne, stage photo + guest book', offsetDays: 0, owner: 'host', dependsOn: ['ep_rentals', 'ep_prep'], category: 'setup', risk: null },
    { id: 'event', name: 'The engagement party', offsetDays: 0, owner: 'host', dependsOn: ['ep_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'ep_invite', phase: 'guest', label: 'Send invite: date, time, address, dress, "no gifts / cards welcome", dietary-ask, RSVP-by', when: 'T-28d' },
    { id: 't_menu_lock', milestoneId: 'ep_menu', phase: 'food', label: 'Lock 6-8 appetizer types (mix hot/cold, 1 veg + 1 GF), targeting ~10-12 bites/guest', when: 'T-21d' },
    { id: 't_signature', milestoneId: 'ep_bar', phase: 'beverage', label: 'Test the signature cocktail at scale; write the batch recipe + a printed bar card', when: 'T-18d' },
    { id: 't_book_bartender', milestoneId: 'ep_vendors', phase: 'logistics', label: 'Book bartender / caterer / photographer; confirm arrival window + insurance', when: 'T-14d' },
    { id: 't_toast_brief', milestoneId: 'ep_toast', phase: 'program', label: 'Confirm 1-2 toasters, set order, brief them to ≤2 min, line up champagne-pour timing', when: 'T-10d' },
    { id: 't_rsvp_chase', milestoneId: 'ep_rsvp_close', phase: 'guest', label: 'Chase non-responders; lock the final headcount', when: 'T-4d' },
    { id: 't_pantry_shop', milestoneId: 'ep_shop_pantry', phase: 'shopping', label: 'Alcohol + champagne + mixers + paper goods + decor + guest book run (non-perishables)', when: 'T-3d' },
    { id: 't_prep_apps', milestoneId: 'ep_prep', phase: 'food', label: 'Make-ahead apps (dips, skewers, anything reheatable); batch the signature cocktail base', when: 'T-1d evening' },
    { id: 't_fresh_shop', milestoneId: 'ep_shop_fresh', phase: 'shopping', label: 'Cheese/charcuterie, produce, citrus, fresh garnishes, flowers, ice (24h out)', when: 'T-1d' },
    { id: 't_chill', milestoneId: 'ep_setup', phase: 'beverage', label: 'Chill champagne (4+ bottles), white/rosé, beer 3-4h before; build the ice/bar tub', when: 'T0 -4h' },
    { id: 't_bar_build', milestoneId: 'ep_setup', phase: 'setup', label: 'Build the bar: glassware, signature-cocktail station, bar card, garnishes, napkins, zero-proof', when: 'T0 -3h' },
    { id: 't_photo_book', milestoneId: 'ep_setup', phase: 'setup', label: 'Stage the welcome/photo moment (sign + florals) and the guest book + pens at the entry', when: 'T0 -2h' },
    { id: 't_music', milestoneId: 'ep_setup', phase: 'setup', label: 'Set the playlist + a speaker; test volume so the toast can still be heard', when: 'T0 -1h' },
    { id: 't_clean_pre', milestoneId: 'ep_setup', phase: 'cleanup', label: 'Pre-clean: empty dishwasher, stage a bus tub + trash/recycling for bottles and toothpicks', when: 'T0 -2h' },
    { id: 't_pass', milestoneId: 'event', phase: 'food', label: 'Start passing/refilling apps as guests arrive; keep stations stocked', when: 'T0 +0:15' },
    { id: 't_toast_pour', milestoneId: 'event', phase: 'program', label: 'Pre-pour champagne, gather the room, cue speakers — THE TOAST', when: 'T0 +1:15' },
    { id: 't_photo', milestoneId: 'event', phase: 'program', label: 'Group photo of the couple right after the toast (peak-energy moment)', when: 'T0 +1:30' },
    { id: 't_clear', milestoneId: 'event', phase: 'cleanup', label: 'Bus empties/plates into the staged tub continuously; do NOT wash mid-party', when: 'ongoing' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Post-party reset: leftovers boxed, bottles to recycling, glassware staged for return/wash', when: 'T0 +3:30' },
  ],

  purchases: [
    { id: 'p_apps_hot', item: 'Meatballs & sliders (bacon-wrapped, spanakopita)', category: 'food', qtyPerGuest: 5, unit: 'bites', where: ['Grocery', 'Costco', 'Caterer', 'Trader Joe\'s'], unitCostRange: [0.6, 1.5], essential: true, buyAt: 'T-3d', note: '~half of the ~10-12 bites/guest target. Freezer apps are a legitimate shortcut at 30+ guests.', provenance: 'Cocktail-party heuristic: ~8-12 hors d\'oeuvre bites/guest over a 2-3h evening event (no seated meal).' , alternatives: ['Frozen Trader Joes or Costco apps — cheaper, bake day-of', 'Grocery deli meatball tray — budget hot protein option'] },
    { id: 'p_apps_cold', item: 'Crostini & deviled eggs (shrimp, caprese skewers)', category: 'food', qtyPerGuest: 4, unit: 'bites', where: ['Grocery', 'Caterer'], unitCostRange: [0.6, 1.8], essential: true, buyAt: 'T-1d', provenance: 'Other half of the ~10-12 bites/guest cocktail-party target; cold bites are make-ahead friendly.' , alternatives: ['Costco charcuterie kit — pre-assembled, cheaper per lb', 'Grocery deli platter — budget cold app option'] },
    { id: 'p_grazing', item: 'Cheese + charcuterie + crackers grazing station', category: 'food', qtyPerGuest: 0.2, unit: 'lb', where: ['Grocery', 'Cheese shop', 'Costco'], unitCostRange: [4, 9], essential: true, buyAt: 'T-1d', note: 'A self-serve anchor station takes pressure off passed apps and looks abundant.' , alternatives: ['Store-brand crackers with one good cheese — cheaper by half', 'Hummus plus pita plus olives — budget Mediterranean grazing option'] },
    { id: 'p_dessert', item: 'Mini desserts & cake pops (fruit, sweet bites)', category: 'food', qtyPerGuest: 2, unit: 'bites', where: ['Bakery', 'Grocery'], unitCostRange: [0.8, 2.5], essential: false, buyAt: 'T-1d', note: 'Optional but expected at an engagement party — even a simple "Cheers to the couple" cake.' , alternatives: ['Grocery bakery cookies by the dozen — cheapest per serving', 'Cake pops from grocery bakery — easy to serve, no cutting needed'] },
    { id: 'p_champagne', item: 'Champagne / sparkling wine for the toast', category: 'beverage', qtyFlat: 1, qtyPer: 7, unit: 'bottle per ~7 guests', where: ['Wine shop', 'Total Wine', 'Costco'], unitCostRange: [12, 30], essential: true, buyAt: 'T-3d', note: 'Toast pour is a half-glass, so ~1 bottle per 6-8 guests covers everyone. Buy a couple extra for the bar.', provenance: 'Champagne-toast heuristic: a 750ml bottle pours ~7-10 toast portions (half-glass each); plan ~1 bottle per 6-8 guests.' },
    { id: 'p_wine', item: 'Still wine (white/rosé heavy, some red)', category: 'beverage', qtyPerGuest: 0.4, unit: 'bottle', where: ['Wine shop', 'Total Wine', 'Grocery'], unitCostRange: [10, 22], essential: true, buyAt: 'T-3d', note: 'Wine + beer carry most of the ~1 drink/guest/hour load; lean lighter/chilled for a cocktail party.' },
    { id: 'p_beer', item: 'Beer + hard seltzer (cans/bottles, on ice)', category: 'beverage', qtyPerGuest: 1.5, unit: 'cans', where: ['Grocery', 'Costco', 'Liquor store'], unitCostRange: [1.2, 2.5], essential: true, buyAt: 'T-3d', provenance: 'Plan ~1 drink/guest/hour; beer/seltzer is the easy self-serve share of the mix.' },
    { id: 'p_signature', item: 'Signature couple\'s cocktail: spirits + mixers + garnish', category: 'beverage', qtyFlat: 1, qtyPer: 10, unit: 'batch per ~10 guests', where: ['Liquor store'], unitCostRange: [35, 65], essential: true, buyAt: 'T-3d', note: 'Batch it ahead (minus the bubbles/ice) so it pours in seconds. One named drink reads as personal and intentional.' },
    { id: 'p_nonalc', item: 'Zero-proof: mocktail, sparkling water, juice, sodas', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery'], unitCostRange: [0.8, 2], essential: true, buyAt: 'T-3d', note: 'A real non-alcoholic option (a "virgin" version of the signature drink) is non-negotiable for non-drinkers and DDs.' },
    { id: 'p_ice', item: 'Ice (for chilling + drinks)', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest for a cocktail party covers chilling bottles AND drink ice; add 15-20% for melt.', provenance: 'Party-planning heuristic: ~1-2 lb ice/guest; 1.5 lb for an evening cocktail event serving + chilling.' },
    { id: 'p_garnish', item: 'Garnishes + citrus + cocktail extras (limes, herbs, sugar rims, bitters)', category: 'food', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [12, 25], essential: true, buyAt: 'T-1d', note: 'COMMONLY FORGOTTEN: the signature cocktail needs fresh garnish to land.' },
    { id: 'p_flowers', item: 'Light florals (entry arrangement + a few bud vases / bar flowers)', category: 'decor', qtyFlat: 1, qtyPer: 12, unit: 'arrangement per ~12 guests', where: ['Florist', 'Trader Joe\'s', 'Farmers market'], unitCostRange: [15, 45], essential: false, buyAt: 'T-1d', note: 'Keep it light — a cocktail party is about flow, not a wedding-scale install.' },
    { id: 'p_decor', item: 'Celebration decor (balloons, "she said yes" / couple sign, candles, string lights)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Amazon', 'Etsy'], unitCostRange: [25, 70], essential: false, buyAt: 'T-3d', note: 'Anchors the welcome/photo moment; one strong sign beats scattered clutter.' },
    { id: 'p_guestbook', item: 'Guest book / sign-in (book, advice cards, or a signable print) + pens', category: 'decor', qtyFlat: 1, unit: 'set', where: ['Etsy', 'Amazon', 'Bookstore'], unitCostRange: [15, 40], essential: true, buyAt: 'T-3d', note: 'A keepsake the couple actually wants — advice/well-wishes cards beat a blank book for getting people to write.' },
    { id: 'p_glassware', item: 'Disposable or rental glassware (champagne flutes + wine + rocks)', category: 'rental', qtyPerGuest: 3, unit: 'glasses', where: ['Party store', 'Rental co', 'Have/borrow'], unitCostRange: [0.3, 2], essential: true, buyAt: 'T-3d', note: 'Flute for the toast + wine + cocktail glass; clear plastic flutes are an acceptable cocktail-party shortcut.' },
    { id: 'p_napkins', item: 'Cocktail napkins + small plates + picks/skewers + cups', category: 'logistics', qtyPerGuest: 4, unit: 'pieces', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.1, 0.4], essential: true, buyAt: 'T-3d', note: 'COMMONLY UNDER-BOUGHT: passed apps churn through cocktail napkins and picks fast.' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, dish soap, sponges, bottle bin', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [10, 18], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a bar party produces a LOT of empty bottles/cans — set up a dedicated recycling bin.' },
  ],

  rentalsGap: [
    { item: 'Champagne flutes', qtyPerGuest: 1.1, note: 'One per guest for the toast + a few spares; the toast fails if there aren\'t enough flutes pre-poured.' },
    { item: 'Wine + cocktail glasses', qtyPerGuest: 2, note: 'Wine glass + rocks/cocktail glass; people set drinks down and grab fresh — over-provision.' },
    { item: 'Bar surface / drink station table', qtyFlat: 1, note: 'A real defined bar (folding table + linen) controls the flow; without it the kitchen becomes a bottleneck.' },
    { item: 'Cocktail / high-top tables', qtyFlat: 1, qtyPer: 10, note: 'A few stand-up perches per ~10 guests — a cocktail party is standing, not seated.' },
    { item: 'Serving platters + tongs/picks for stations', qtyFlat: 6, note: 'COMMONLY FORGOTTEN: platters for the grazing + passed apps, plus tongs/serving spoons.' },
    { item: 'Ice tub / beverage cooler', qtyFlat: 2, note: 'One for beer/seltzer, one for chilling wine + champagne — separate from drink ice.' },
  ],

  vendors: [
    { category: 'Bar / Bartender', required: false, altToDIY: 'A bartender for 30-40 guests (~$200-350) frees the host to greet, host, and be present for the toast', when: 'T-14d', costRange: [200, 400], costUnit: 'flat' },
    { category: 'Catering / Passed Apps', required: false, altToDIY: 'Drop-off or passed-app catering removes the riskiest cook load; DIY freezer apps are the cheaper path', when: 'T-21d', costRange: [18, 45], costUnit: 'per guest' },
    { category: 'Photographer', required: false, altToDIY: 'A 1-2h photographer captures the toast + couple portraits; a designated phone-photographer friend is the free alt', when: 'T-14d', costRange: [200, 600], costUnit: 'flat' },
    { category: 'Florals', required: false, altToDIY: 'A $40-60 florist entry piece vs DIY grocery-store bud vases', when: 'T-7d', costRange: [40, 120], costUnit: 'flat' },
    { category: 'Cleaning', required: false, altToDIY: 'A post-party cleaner (~$120-180) is the highest-ROI host-sanity spend after a bar party', when: 'T-7d', costRange: [120, 180], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_headcount', trigger: 'Final headcount not confirmed by T-4d', severity: 'high', mitigation: 'Chase the maybes; buy fresh AFTER headcount locks; over-provision drinks ~10%, not 30%.' },
    { id: 'r_underfood', trigger: 'Under-counting bites — guests treat it like dinner', severity: 'high', mitigation: 'Plan ~10-12 bites/guest and a grazing station; alcohol increases food appetite — round up, never down.' },
    { id: 'r_toast_flop', trigger: 'Toast runs long / open-mic rambles / no one can hear', severity: 'med', mitigation: 'Pre-assign 1-2 speakers at ≤2 min, pre-pour champagne, lower the music, gather the room before starting.' },
    { id: 'r_bar_bottleneck', trigger: 'One bar/one host can\'t keep up → a line forms', severity: 'med', mitigation: 'Batch the signature cocktail, self-serve beer/wine on ice, and hire or assign a dedicated pourer.' },
    { id: 'r_ice', trigger: 'No ice / warm bar', severity: 'med', mitigation: 'Buy ~1.5 lb ice/guest day-of; keep chilling ice separate from drink ice; pre-chill bottles 3-4h ahead.' },
    { id: 'r_champagne_short', trigger: 'Not enough flutes or champagne for everyone to toast', severity: 'med', mitigation: 'Provision ~1 flute/guest and ~1 bottle per 6-8; a guest with an empty hand during the toast is a visible miss.' },
    { id: 'r_overserved', trigger: 'A guest gets visibly over-served', severity: 'med', mitigation: 'Keep substantial food flowing, push the zero-proof option, slow pours late, and have rideshare/numbers ready.' },
    { id: 'r_weather', trigger: 'Outdoor party + bad weather', severity: 'med', mitigation: 'Confirm a rain plan / indoor fallback or tent at T-7d; cocktail format makes a smaller footprint easier to move inside.' },
  ],

  contingencies: [
    { id: 'c_underfood', when: 'r_underfood', plan: 'Open the grazing station fully, send someone for more frozen apps + a few pizzas to cut and pass, and slow the pacing. Abundance is a vibe — a steady refill reads as generous, not short.' },
    { id: 'c_toast_flop', when: 'r_toast_flop', plan: 'The host steps in, thanks everyone in 30 seconds, raises the glass to the couple, and moves the moment along. A short, warm toast always beats a long one — cut, don\'t extend.' },
    { id: 'c_bar_bottleneck', when: 'r_bar_bottleneck', plan: 'Move beer/wine/seltzer to a self-serve ice tub away from the cocktail station so the line splits; pre-batch and pre-garnish the next round so pouring is instant.' },
    { id: 'c_ice', when: 'r_ice', plan: 'Nearest gas-station/grocery ice run; in a pinch, freezer ice + frozen fruit chills drinks while you wait. Never let the bar go warm — it\'s the fastest way to flatten the party.' },
    { id: 'c_champagne_short', when: 'r_champagne_short', plan: 'Pour smaller toast portions to stretch, top up with sparkling wine or a spritz, and make sure every hand has SOMETHING fizzy before you start — even a zero-proof bubbly counts.' },
    { id: 'c_overserved', when: 'r_overserved', plan: 'Quietly switch them to the zero-proof signature, get water + food in hand, and pre-arrange a ride. The host\'s calm discretion protects both the guest and the mood.' },
    { id: 'c_weather', when: 'r_weather', plan: 'Execute the pre-agreed indoor/tent fallback; consolidate the bar and grazing station into one room and let people cluster — a tighter cocktail party often feels MORE festive, not less.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Alcohol, champagne, signature spirits/mixers, beer/seltzer, paper goods, decor, guest book, cleanup kit' },
      { when: 'T-1d', what: 'Cheese/charcuterie, produce, citrus + garnishes, flowers, cold apps' },
      { when: 'T0', what: 'Ice (1.5 lb/guest) + any last fresh herbs/garnish' },
    ],
    preparation: [
      { when: 'T-1d evening', what: 'Make-ahead hot apps, assemble cold bites, batch the signature cocktail base, prep garnish trays, build the cheese board base' },
      { when: 'T0 -4h', what: 'Chill all champagne/wine/beer; finish-bake or stage anything that reheats fast' },
      { when: 'T0 -1h', what: 'Final garnish prep; plate the grazing station; arrange passed-app trays for batch baking' },
    ],
    setup: [
      { when: 'T0 -4h', what: 'Start chilling bottles; set up the ice tubs (chilling vs drink ice, separate)' },
      { when: 'T0 -3h', what: 'Build the bar: glassware, signature-cocktail station, printed bar card, garnishes, zero-proof, cocktail napkins' },
      { when: 'T0 -2h', what: 'Stage the welcome/photo moment (sign + florals) and the guest book + pens at the entry; place high-tops + flowers' },
      { when: 'T0 -1h', what: 'Set the playlist + speaker and test volume; pre-clean — empty dishwasher, stage bus tub + recycling bin' },
      { when: 'T0 -10m', what: 'Pre-pour a tray of welcome drinks; light candles; first batch of hot apps in the oven' },
    ],
    cleanup: [
      { when: 'during', what: 'Bus empties/plates into the staged tub continuously; keep the recycling bin visible for bottles/cans; do NOT wash mid-party' },
      { when: 'after toast', what: 'Clear used flutes; refresh the grazing station + napkins for the back half of the party' },
      { when: 'T0 +3:30', what: 'Leftovers boxed, bottles + cans to recycling, glassware staged for rental return or wash, linens to soak, trash out' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Quantities here are synthesized from standard US catering and party-planning heuristics rather than a single authoritative source: a cocktail-party (no seated meal) target of roughly 10-12 hors d\'oeuvre bites per guest over a 2-3 hour evening; about one drink per guest per hour split across beer, wine, and a signature cocktail; a champagne toast pour of a half-glass, where one 750ml bottle yields ~7-10 toast portions, so plan ~1 bottle per 6-8 guests; and roughly 1.5 lb of ice per guest for chilling plus drinks. These are planning midpoints, not guarantees — actual consumption varies with crowd, weather, duration, and how much the bar is pushed, so the playbook deliberately rounds up on drinks and food and treats headcount confirmation as the master variable. Coaching, ROI, and run-of-show framing are authored judgment. Per the authoring brief, no citations are claimed; verificationStatus is "synthesized" and sources is intentionally empty.',
    sources: [],
  },
};

export default engagementParty;
