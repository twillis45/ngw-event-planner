// Retirement Party — Event Boss host playbook data.
//
// A celebration honoring someone's career: heavy appetizers OR a buffet/dinner
// plus a real bar, a toast and a speeches/tribute moment, a memory/photo
// display, a card/gift collection, and (very often) a surprise — the honoree
// walks in to a room already full. The guest list skews older and blends
// coworkers with family, so accessibility, seating, and audibility of the
// speeches are first-class concerns, not afterthoughts. ESM default export to
// match the rest of src/lib/playbooks/data/* (no CJS in src/). The reader
// (../index.js) consumes `purchases` first for the operational candidate.
//
// Quantities are grounded in standard US catering and party-planning heuristics
// (buffet ~0.5 lb protein/guest or ~10-12 appetizer bites/guest; ~1 drink/
// guest/hour; ice ~1.5 lb/guest; ~1 champagne bottle per 6-8 for a toast). Per
// the authoring brief these are synthesized from trade consensus and NOT
// individually cited: knowledge.sources stays [] and verificationStatus is
// 'synthesized'.

const retirementParty = {
  type: 'Retirement Party',
  solveFamily: 'retirement_party',
  family: 'host_driven',
  recordKind: 'client',
  version: '1.0.0',

  meta: {
    summary:
      "A career send-off honoring the retiree — heavy appetizers or a buffet/dinner, a real bar, and a speeches/tribute moment as the emotional centerpiece, often staged as a surprise. The host's real job is to engineer one great tribute moment (speeches + a memory/photo display + a card to sign) and make food, drinks, seating, and flow effortless around an older, mixed crowd of coworkers and family.",
    typicalGuests: { low: 25, default: 40, high: 50 },
    typicalDurationHours: 3,
    leadTimeDays: 35,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 20, high: 70, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The honoree walks in and the room is already full — they didn\'t expect that many people.',
    'The tribute speech from the person they mentored — the one they didn\'t know was coming.',
    'The slideshow hits a photo from thirty years ago and the whole room goes quiet.',
    'Someone says the thing everyone in the room has been thinking for years.',
    'They hold the card, read the signatures, and take a moment before looking up.',
  ],

  decisions: [
    { id: 'venue', label: 'At home, a restaurant, or the workplace?', options: ['Host home', 'Restaurant private room', 'Workplace / office common area', 'Banquet hall / event venue', 'Backyard / outdoor'], default: 'Restaurant private room', when: 'T-35d', blocks: ['rentals', 'staffing', 'catering', 'accessibility'], why: 'Drives whether you rent tables/AV and hire staff (home/office) or the venue covers it (restaurant/hall). It also fixes accessibility — an older crowd needs parking, a no-stairs entrance, and a restroom near the room. Caps the realistic guest count.' },
    { id: 'surprise', label: 'Surprise or announced?', options: ['Full surprise', 'Soft surprise (honoree knows, not the details)', 'Announced celebration'], default: 'Soft surprise (honoree knows, not the details)', when: 'T-30d', blocks: ['runofshow', 'invite'], why: 'A surprise changes everything: invite wording ("SHHH — surprise"), a separate arrival time and choreography, and a co-conspirator to get the honoree to the venue. A soft surprise spares older honorees the shock while keeping the wow.' },
    { id: 'format', label: 'Heavy appetizers or a buffet / seated dinner?', options: ['Heavy passed + stationed apps', 'Buffet (mains + sides)', 'Seated plated dinner', 'Restaurant set menu', 'Dessert + cake reception only'], default: 'Buffet (mains + sides)', when: 'T-30d', dependsOn: ['venue'], blocks: ['menu', 'rentals', 'seating'], why: 'A career send-off usually overlaps a meal hour, so plan ~1-1.25 servings/guest. Locking buffet vs heavy-apps sets the shopping list (~0.5 lb protein/guest for a buffet, or ~10-12 bites/guest for apps) and how many seats you need.' },
    { id: 'bar', label: 'Bar strategy + the honoree\'s favorite drink', options: ['Beer + wine + honoree\'s favorite', 'Full open bar', 'Beer + wine only', 'Beer/wine + a signature cocktail', 'Limited / cash bar'], default: 'Beer + wine + honoree\'s favorite', when: 'T-25d', blocks: ['beverage_purchases', 'glassware'], why: 'Stocking the honoree\'s actual favorite drink (their go-to scotch, a particular wine, a regional beer) is the cheapest way to make the bar feel like THEM. It also fixes spirit/mixer quantities and whether a bartender is worth it.' },
    { id: 'tribute', label: 'Speeches / tribute format', options: ['3-5 pre-assigned speakers', 'MC + open mic (capped)', 'Slideshow/video + a few toasts', 'Roast-style (lighthearted)', 'Single heartfelt toast + card'], default: '3-5 pre-assigned speakers', when: 'T-14d', blocks: ['runofshow', 'av'], why: 'The tribute is the hero beat. Pre-assigning 3-5 speakers (boss, peer, family, a surprise mentor) at ~2-3 min each keeps it warm and on-time. Decide here whether you need a mic and a screen for a slideshow.' },
    { id: 'invite', label: 'Invite + RSVP + dietary/allergy + accessibility ask', options: ['Paper invite', 'Digital (Paperless Post / Evite)', 'Email (for coworkers)', 'Phone + email combo'], default: 'Digital (Paperless Post / Evite)', when: 'T-30d', blocks: ['headcount', 'accessibility'], why: 'Headcount is the master variable — every food, drink, and seat quantity scales off it. Collect allergies AND mobility/hearing needs here, before menu and room layout lock; an older guest list makes this non-optional.' },
    { id: 'help', label: 'DIY, or bring in help?', options: ['Fully DIY', 'Hire a bartender', 'Drop-off / buffet catering', 'Bartender + cleaner', 'Day-of helper for refills + plating'], default: 'Drop-off / buffet catering', when: 'T-20d', blocks: ['vendors'], why: 'For 40-50 mostly-older guests one host cannot run a buffet, tend bar, AND run the program. Drop-off catering or a bartender (~$250) is what lets the host actually orchestrate the surprise and the speeches.' },
  ],

  milestones: [
    { id: 'rp_setdate', name: 'Lock date, honoree, guest count, budget, surprise-or-not', offsetDays: 35, owner: 'host', category: 'planning', risk: null },
    { id: 'rp_venue', name: 'Confirm venue (home / book restaurant or hall) + check accessibility', offsetDays: 32, owner: 'host', dependsOn: ['rp_setdate'], category: 'logistics', risk: { ifDelayed: 'Private rooms / halls book out 4-6 weeks ahead; a no-stairs accessible room is harder to find late', severity: 'high' } },
    { id: 'rp_invite', name: 'Send invites + ask dietary/allergy + accessibility + RSVP-by (mark SURPRISE)', offsetDays: 28, owner: 'host', dependsOn: ['rp_setdate'], category: 'guest', risk: { ifDelayed: 'No headcount → cannot size food, bar, seating, or rentals; surprise can leak', severity: 'high' } },
    { id: 'rp_memory', name: 'Start the memory collection: ask guests for photos, notes, and well-wishes', offsetDays: 28, owner: 'host', dependsOn: ['rp_setdate'], category: 'program', risk: { ifDelayed: 'Slideshow/photo display + signed card need 3-4 weeks to gather; this is the heart of the event', severity: 'med' } },
    { id: 'rp_menu', name: 'Lock the menu (buffet ~0.5 lb protein/guest OR ~10-12 bites/guest; veg + GF)', offsetDays: 21, owner: 'host', dependsOn: ['rp_invite'], category: 'food', risk: { ifDelayed: 'No shopping list or catering order possible', severity: 'high' } },
    { id: 'rp_bar', name: 'Finalize bar + source the honoree\'s favorite drink', offsetDays: 18, owner: 'host', dependsOn: ['rp_menu'], category: 'beverage', risk: { ifDelayed: 'A specific scotch / wine / regional beer may need to be special-ordered', severity: 'med' } },
    { id: 'rp_vendors', name: 'Book bartender / caterer / photographer if using', offsetDays: 18, owner: 'host', dependsOn: ['rp_setdate'], category: 'logistics', risk: { ifDelayed: 'Good bartenders/photographers book out; weekend rates spike', severity: 'med' } },
    { id: 'rp_rentals', name: 'Confirm seating, tables, AV (mic + screen), and rental gap', offsetDays: 14, owner: 'host', dependsOn: ['rp_venue', 'rp_tribute_plan'], category: 'rental', risk: { ifDelayed: 'Not enough chairs for an older crowd, or no working mic for the speeches', severity: 'high' } },
    { id: 'rp_tribute_plan', name: 'Confirm speakers + order; build the slideshow; line up any surprise guest', offsetDays: 14, owner: 'host', dependsOn: ['rp_memory'], category: 'program', risk: { ifDelayed: 'Rambling, unscripted speeches; slideshow not finished; surprise guest travel not booked', severity: 'med' } },
    { id: 'rp_rsvp_close', name: 'Confirm final headcount + dietary/accessibility list (chase the maybes)', offsetDays: 4, owner: 'host', dependsOn: ['rp_invite'], category: 'guest', risk: { ifDelayed: 'Over/under-buy food, drinks, and seating by 20-30%', severity: 'high' } },
    { id: 'rp_shop_pantry', name: 'Buy alcohol, non-perishables, decor, memory-display materials, card', offsetDays: 3, owner: 'host', dependsOn: ['rp_bar', 'rp_rsvp_close'], category: 'shopping', risk: null },
    { id: 'rp_prep', name: 'Print photos / finalize slideshow, prep make-ahead food, assemble displays', offsetDays: 1, owner: 'host', dependsOn: ['rp_menu', 'rp_tribute_plan'], category: 'program', risk: { ifDelayed: 'Host trapped finishing the slideshow instead of running the room', severity: 'med' } },
    { id: 'rp_shop_fresh', name: 'Buy fresh produce, deli/proteins, flowers, cake, ice', offsetDays: 1, owner: 'host', dependsOn: ['rp_menu', 'rp_rsvp_close'], category: 'shopping', risk: { ifDelayed: 'Wilted florals / warm bar / no cake', severity: 'med' } },
    { id: 'rp_setup', name: 'Set the room (accessible seating + buffet + bar), stage memory display, test the mic', offsetDays: 0, owner: 'host', dependsOn: ['rp_rentals', 'rp_prep'], category: 'setup', risk: { ifDelayed: 'Guests arrive before the surprise is staged; mic untested when speeches start', severity: 'high' } },
    { id: 'event', name: 'The retirement party', offsetDays: 0, owner: 'host', dependsOn: ['rp_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'rp_invite', phase: 'guest', label: 'Send invite: date, time, address, dress, "no gifts / cards welcome", dietary + accessibility ask, RSVP-by; mark SURPRISE + a guests-arrive-by time', when: 'T-28d' },
    { id: 't_memory_collect', milestoneId: 'rp_memory', phase: 'program', label: 'Set up a shared photo/notes drop (link or email) and ask coworkers + family for photos, stories, and well-wishes', when: 'T-28d' },
    { id: 't_menu_lock', milestoneId: 'rp_menu', phase: 'food', label: 'Lock buffet (~0.5 lb protein/guest, 2-3 sides) or heavy apps (~10-12 bites/guest); always include a veg + GF option', when: 'T-21d' },
    { id: 't_fav_drink', milestoneId: 'rp_bar', phase: 'beverage', label: "Source the honoree's actual favorite drink; special-order if it's a specific scotch/wine/regional beer", when: 'T-18d' },
    { id: 't_book_vendors', milestoneId: 'rp_vendors', phase: 'logistics', label: 'Book bartender / caterer / photographer; confirm arrival window + insurance + a power outlet for AV', when: 'T-18d' },
    { id: 't_slideshow', milestoneId: 'rp_tribute_plan', phase: 'program', label: 'Build the career slideshow/video from collected photos; keep it ~4-6 min set to music', when: 'T-14d' },
    { id: 't_speakers', milestoneId: 'rp_tribute_plan', phase: 'program', label: 'Confirm 3-5 speakers, set order (MC → peer → family → surprise guest → honoree), brief each to ~2-3 min', when: 'T-14d' },
    { id: 't_surprise_guest', milestoneId: 'rp_tribute_plan', phase: 'program', label: 'If using a surprise guest/mentor, book their travel and a quiet hold spot so they appear at the right beat', when: 'T-14d' },
    { id: 't_av_check', milestoneId: 'rp_rentals', phase: 'logistics', label: 'Confirm a working mic + speaker and a screen/TV for the slideshow; reserve extra chairs for an older crowd', when: 'T-14d' },
    { id: 't_rsvp_chase', milestoneId: 'rp_rsvp_close', phase: 'guest', label: 'Chase non-responders; lock final headcount + the dietary/accessibility list', when: 'T-4d' },
    { id: 't_pantry_shop', milestoneId: 'rp_shop_pantry', phase: 'shopping', label: 'Alcohol + favorite drink + mixers + paper goods + decor + memory-display frames/board + the big signing card (non-perishables)', when: 'T-3d' },
    { id: 't_print_photos', milestoneId: 'rp_prep', phase: 'program', label: 'Print photos for the memory wall; finalize + export the slideshow to the device that plays day-of; charge it', when: 'T-1d' },
    { id: 't_prep_food', milestoneId: 'rp_prep', phase: 'food', label: 'Make-ahead food (anything reheatable), prep buffet pans, assemble cold items', when: 'T-1d evening' },
    { id: 't_fresh_shop', milestoneId: 'rp_shop_fresh', phase: 'shopping', label: 'Deli/proteins, produce, cake, flowers, ice (24h out)', when: 'T-1d' },
    { id: 't_chill', milestoneId: 'rp_setup', phase: 'beverage', label: 'Chill wine, beer, and the favorite drink; build the ice/bar tubs', when: 'T0 -4h' },
    { id: 't_room', milestoneId: 'rp_setup', phase: 'setup', label: 'Set accessible seating (plenty of chairs, clear walkways), buffet table ≤36", and the bar; reserve front seats near the speakers', when: 'T0 -3h' },
    { id: 't_memory_stage', milestoneId: 'rp_setup', phase: 'setup', label: 'Stage the memory/photo display, the signing card + pens, and the slideshow screen at a visible spot', when: 'T0 -2h' },
    { id: 't_mic_test', milestoneId: 'rp_setup', phase: 'setup', label: 'Test the mic + speaker and cue the slideshow; set music volume so the speeches will be heard', when: 'T0 -1h' },
    { id: 't_clean_pre', milestoneId: 'rp_setup', phase: 'cleanup', label: 'Pre-clean: empty dishwasher, stage a bus tub + trash/recycling for bottles', when: 'T0 -2h' },
    { id: 't_arrival', milestoneId: 'event', phase: 'program', label: 'SURPRISE choreography: guests in + quiet by the arrive-by time; co-conspirator brings the honoree in on cue', when: 'T0 -10m' },
    { id: 't_serve', milestoneId: 'event', phase: 'food', label: 'Open the buffet/apps once the honoree has greeted people; keep stations stocked and the bar flowing', when: 'T0 +0:20' },
    { id: 't_tribute', milestoneId: 'event', phase: 'program', label: 'Gather the room, pour the toast, run the slideshow + speeches in order — THE TRIBUTE', when: 'T0 +1:15' },
    { id: 't_card', milestoneId: 'event', phase: 'program', label: 'Make sure everyone signs the card / leaves a note before they drift off; hand it to the honoree at the end', when: 'ongoing' },
    { id: 't_clear', milestoneId: 'event', phase: 'cleanup', label: 'Bus empties/plates into the staged tub continuously; do NOT wash mid-party', when: 'ongoing' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Post-party reset: leftovers boxed, bottles to recycling, send the honoree home with the card, photos, and gifts', when: 'T0 +3:30' },
  ],

  purchases: [
    { id: 'p_buffet_protein', item: 'Buffet mains / protein (carved meats, chicken, a vegetarian main)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Caterer', 'Costco', 'Grocery', 'Butcher'], unitCostRange: [4, 10], essential: true, buyAt: 'T-1d', note: 'For a buffet at a meal hour. If going heavy-apps instead, swap this for ~10-12 bites/guest.', provenance: { tier: 'heuristic', confidence: 'med', verificationStatus: 'synthesized', note: 'Standard buffet heuristic: ~0.5 lb cooked protein per adult guest when a meal is expected; plan ~1-1.25 servings/guest overall.' }, alternatives: ['Roast chicken — cheaper than carved beef or salmon', 'Costco deli trays — budget option, no cooking required', 'Pasta buffet main — cheapest per head, crowd-pleasing'] },
    { id: 'p_sides', item: 'Buffet sides (salads, potatoes/grain, rolls, a hot veg)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Caterer', 'Grocery', 'Costco'], unitCostRange: [2, 5], essential: true, buyAt: 'T-1d', note: '2-3 sides for 25-40 guests; 3+ for 50. Sides stretch the protein and cover the vegetarians.', alternatives: ['Costco pre-made sides — cheaper, still presentable', 'Grocery deli salads — if cooking time is short'] },
    { id: 'p_apps', item: 'Passed/stationed appetizers (cheese + charcuterie, dips, easy bites)', category: 'food', qtyPerGuest: 4, unit: 'bites', where: ['Grocery', 'Costco', 'Caterer', 'Trader Joe\'s'], unitCostRange: [0.6, 1.8], essential: true, buyAt: 'T-1d', note: 'Cocktail-hour bites BEFORE the buffet opens so early arrivals (and the surprise window) have something to graze.', provenance: { tier: 'heuristic', confidence: 'med', verificationStatus: 'synthesized', note: 'A few starter bites/guest cover the pre-meal window; a full heavy-apps format would target ~10-12 bites/guest.' }, alternatives: ['Costco/Trader Joe\'s frozen apps — budget, bake day-of', 'Cheese + cracker tray from deli — no prep, cheaper per bite'] },
    { id: 'p_cake', item: 'Retirement cake or dessert table ("Happy Retirement" / years-of-service)', category: 'food', qtyPerGuest: 1, unit: 'slice', where: ['Bakery', 'Grocery', 'Costco'], unitCostRange: [1.5, 4], essential: true, buyAt: 'T-1d', note: 'A named cake is the expected centerpiece of the cut-and-toast moment; order it personalized 1 week ahead.', alternatives: ['Costco half-sheet cake — add custom message, cheapest per slice', 'Grocery bakery sheet cake — cheaper than custom bakery, personalize day-of'] },
    { id: 'p_champagne', item: 'Champagne / sparkling wine for the toast', category: 'beverage', qtyFlat: 1, qtyPer: 7, unit: 'bottle per ~7 guests', where: ['Wine shop', 'Total Wine', 'Costco'], unitCostRange: [12, 30], essential: true, buyAt: 'T-3d', note: 'Toast pour is a half-glass, so ~1 bottle per 6-8 guests covers everyone. Buy a couple extra; a sparkling-cider option lets non-drinkers toast too.', provenance: { tier: 'heuristic', confidence: 'high', verificationStatus: 'synthesized', note: 'Champagne-toast heuristic: a 750ml bottle pours ~6-8 toast portions (half-glass each); plan ~1 bottle per 6-8 guests.' } },
    { id: 'p_wine', item: 'Still wine (mix of white/red — lean to what the crowd drinks)', category: 'beverage', qtyPerGuest: 0.4, unit: 'bottle', where: ['Wine shop', 'Total Wine', 'Grocery'], unitCostRange: [10, 22], essential: true, buyAt: 'T-3d', note: 'Wine + beer carry most of the ~1 drink/guest/hour load. An older daytime crowd often skews wine-heavy.', provenance: { tier: 'heuristic', confidence: 'med', verificationStatus: 'synthesized', note: 'Industry rule: ~1 drink/guest/hour; a 750ml bottle pours ~5 glasses, so ~0.4 bottle/guest over a 3h event with beer also present.' } },
    { id: 'p_beer', item: 'Beer + hard seltzer (cans/bottles, on ice)', category: 'beverage', qtyPerGuest: 1.5, unit: 'cans', where: ['Grocery', 'Costco', 'Liquor store'], unitCostRange: [1.2, 2.5], essential: true, buyAt: 'T-3d', provenance: { tier: 'heuristic', confidence: 'med', verificationStatus: 'synthesized', note: 'Plan ~1 drink/guest/hour; beer/seltzer is the easy self-serve share of the mix over a 3h event.' } },
    { id: 'p_fav_drink', item: "The honoree's favorite drink (their go-to spirit / wine / regional beer)", category: 'beverage', qtyFlat: 2, unit: 'bottles', where: ['Liquor store', 'Wine shop'], unitCostRange: [20, 70], essential: true, buyAt: 'T-3d', note: 'The signature personal touch — stock what THEY actually drink, plus mixers/garnish if it\'s a cocktail. Toast with it.' },
    { id: 'p_nonalc', item: 'Zero-proof: sparkling cider, sodas, iced tea, sparkling + flat water, juice', category: 'beverage', qtyPerGuest: 2.5, unit: 'drinks', where: ['Grocery', 'Costco'], unitCostRange: [0.6, 1.5], essential: true, buyAt: 'T-3d', note: 'An older, mixed daytime crowd drinks a LOT of non-alcoholic — over-provision water, iced tea, and a toast-able sparkling cider.' },
    { id: 'p_coffee', item: 'Coffee + tea service (with cream, sugar, decaf)', category: 'beverage', qtyPerGuest: 1, unit: 'cups', where: ['Grocery', 'Costco'], unitCostRange: [0.3, 0.8], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: an older crowd expects coffee, especially with cake — set up a self-serve coffee/tea station.' },
    { id: 'p_ice', item: 'Ice (for chilling + drinks)', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest covers chilling bottles AND drink ice; add 15-20% for melt.', provenance: { tier: 'heuristic', confidence: 'med', verificationStatus: 'synthesized', note: 'Party-planning heuristic: ~1-2 lb ice/guest; 1.5 lb for chilling plus drink service.' } },
    { id: 'p_memory_display', item: 'Memory/photo display: prints, frames or a foam board, easel, timeline of career', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Drugstore photo', 'Amazon', 'Craft store', 'Office store'], unitCostRange: [25, 80], essential: true, buyAt: 'T-3d', note: 'The heart of the room. A photo wall / "memory lane" timeline is the #1 conversation-starter at a retirement party.' },
    { id: 'p_card', item: 'Oversized signing card / guest book / memory book + pens', category: 'decor', qtyFlat: 1, unit: 'set', where: ['Card shop', 'Amazon', 'Etsy', 'Office store'], unitCostRange: [10, 35], essential: true, buyAt: 'T-3d', note: 'A jumbo card or memory book everyone signs becomes the keepsake the retiree takes home — set it out early with pens.' },
    { id: 'p_decor', item: 'Retirement decor (banner, balloons, "Happy Retirement" sign, table centerpieces, candles)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Amazon', 'Etsy'], unitCostRange: [25, 70], essential: false, buyAt: 'T-3d', note: 'One strong banner + a few centerpieces beats scattered clutter; lean to the honoree\'s career/hobby theme.' },
    { id: 'p_flowers', item: 'Flowers (a centerpiece + a bouquet to present to the honoree)', category: 'decor', qtyFlat: 1, qtyPer: 15, unit: 'arrangement per ~15 guests', where: ['Florist', 'Trader Joe\'s', 'Grocery'], unitCostRange: [15, 45], essential: false, buyAt: 'T-1d', note: 'A bouquet handed to the retiree during the toast is a warm, photo-worthy beat.' },
    { id: 'p_serveware', item: 'Buffet serveware: chafing dishes / warmers, serving spoons, tongs, platters', category: 'rental', qtyFlat: 6, unit: 'pieces', where: ['Party store', 'Rental co', 'Amazon', 'Have/borrow'], unitCostRange: [3, 12], essential: true, buyAt: 'T-3d', note: 'A buffet needs warmers + serving utensils; without them the hot food goes cold and the line jams.' },
    { id: 'p_tableware', item: 'Plates, cutlery, napkins, cups (sturdier disposable for a buffet)', category: 'logistics', qtyPerGuest: 6, unit: 'pieces', where: ['Costco', 'Party store', 'Grocery'], unitCostRange: [0.1, 0.5], essential: true, buyAt: 'T-3d', note: 'COMMONLY UNDER-BOUGHT: buffet + cake + drinks means each guest cycles through several plates, forks, and napkins.' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, dish soap, sponges, bottle bin, leftover containers', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [10, 20], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a bar + buffet produces a lot of empties and leftovers — stage a recycling bin and to-go containers.' },
  ],

  rentalsGap: [
    { item: 'Chairs (ample seating for an older crowd)', qtyPerGuest: 1, note: 'At a buffet people still want to SIT to eat and to watch the speeches — provide a seat per guest plus a few extras, not standing-only.' },
    { item: 'Tables (dining/cocktail) + a buffet table + a cake/display table', qtyFlat: 1, qtyPer: 8, note: 'Round/banquet tables for seating ~8 each, plus dedicated buffet, bar, cake, and memory-display surfaces.' },
    { item: 'Microphone + speaker (PA)', qtyFlat: 1, note: 'NON-NEGOTIABLE for speeches in front of 40-50 people — an older audience must be able to HEAR the tribute.' },
    { item: 'Screen / TV + a way to play the slideshow', qtyFlat: 1, note: 'For the career slideshow/video; confirm the cable/cast and a power outlet at the venue ahead of time.' },
    { item: 'Chafing dishes / food warmers', qtyFlat: 4, note: 'Keep buffet mains and sides hot across a 2-3h service window.' },
    { item: 'Ice tubs / beverage coolers', qtyFlat: 2, note: 'One for beer/seltzer, one for chilling wine + champagne — separate from drink ice.' },
    { item: 'Linens (table + buffet skirting)', qtyFlat: 1, qtyPer: 8, note: 'COMMONLY FORGOTTEN: linens dress the room and hide the folding-table look on the buffet and display tables.' },
  ],

  vendors: [
    { category: 'Catering / Buffet', required: false, altToDIY: 'Drop-off buffet catering for 40-50 removes the biggest cook load; DIY warehouse-store trays are the cheaper path', when: 'T-21d', costRange: [15, 40], costUnit: 'per guest' },
    { category: 'Bar / Bartender', required: false, altToDIY: 'A bartender (~$250-400) frees the host to run the surprise + the speeches; self-serve beer/wine on ice is the free alt', when: 'T-18d', costRange: [250, 450], costUnit: 'flat' },
    { category: 'Photographer', required: false, altToDIY: 'A 1-2h photographer captures the surprise reaction + group + honoree portraits; a designated phone-photographer friend is the free alt', when: 'T-14d', costRange: [200, 600], costUnit: 'flat' },
    { category: 'Venue / Private Room', required: false, altToDIY: 'A restaurant private room or hall covers tables, staff, and cleanup but costs a room/F&B minimum; home/office is free but more host work', when: 'T-32d', costRange: [200, 1500], costUnit: 'flat' },
    { category: 'AV / Slideshow Tech', required: false, altToDIY: 'Some venues rent a mic + screen (~$75-200); a borrowed Bluetooth speaker + a wheeled-in TV is the DIY alt', when: 'T-14d', costRange: [75, 250], costUnit: 'flat' },
    { category: 'Cleaning', required: false, altToDIY: 'A post-party cleaner (~$120-180) is high-ROI host sanity after a bar + buffet at home', when: 'T-7d', costRange: [120, 180], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_headcount', trigger: 'Final headcount not confirmed by T-4d', severity: 'high', mitigation: 'Chase the maybes; buy fresh AFTER headcount locks; over-provision drinks ~10%, food ~10-15%, not 30%.' },
    { id: 'r_surprise_leak', trigger: 'The surprise leaks, or the honoree arrives before guests are set', severity: 'med', mitigation: 'Mark every invite SURPRISE with a guests-arrive-by time 15-30 min early; pick one co-conspirator to control the honoree\'s arrival; have a lookout text "she\'s here".' },
    { id: 'r_speeches', trigger: 'Speeches run long / no mic / open-mic rambles / audience can\'t hear', severity: 'high', mitigation: 'Pre-assign 3-5 speakers at ~2-3 min, ALWAYS have a tested mic + speaker, seat the older crowd up front, lower the music before the toast.' },
    { id: 'r_slideshow_fail', trigger: 'Slideshow/video won\'t play day-of (wrong cable, dead device, no internet)', severity: 'med', mitigation: 'Export the slideshow to a local file, test it on the actual screen at setup, charge the device, and have a phone backup of the same file.' },
    { id: 'r_accessibility', trigger: 'Too few chairs, stairs-only entrance, or a buffet hard for older guests to navigate', severity: 'high', mitigation: 'Confirm a no-stairs accessible room + parking at booking; seat-per-guest plus extras; keep walkways clear; station a helper at the buffet to plate for anyone who needs it.' },
    { id: 'r_underfood', trigger: 'Under-counting servings — it overlaps a meal and guests expect to eat', severity: 'med', mitigation: 'Plan ~1-1.25 servings/guest (buffet ~0.5 lb protein/guest); keep cocktail-hour apps out before the buffet so no one is hungry during the wait.' },
    { id: 'r_ice', trigger: 'No ice / warm bar', severity: 'med', mitigation: 'Buy ~1.5 lb ice/guest day-of; keep chilling ice separate from drink ice; pre-chill bottles 3-4h ahead.' },
    { id: 'r_no_card', trigger: 'People leave before signing the card / the honoree never gets the keepsakes', severity: 'low', mitigation: 'Put the card + pens by the entrance/bar early, assign someone to nudge signatures, and gather card + photos + gifts before the end to hand over.' },
    { id: 'r_overserved', trigger: 'A guest gets visibly over-served', severity: 'med', mitigation: 'Keep substantial food and coffee flowing, push the zero-proof options, slow pours late, and have rideshare/numbers ready.' },
  ],

  contingencies: [
    { id: 'c_surprise_leak', when: 'r_surprise_leak', plan: 'If it leaks, pivot gracefully to a "we all knew, and we still got you" warm welcome — the honoree feeling celebrated matters more than the gotcha. If they\'re arriving early, delay them with a fake errand and have the co-conspirator stall 10 minutes.' },
    { id: 'c_speeches', when: 'r_speeches', plan: 'The MC steps in, thanks everyone warmly in 60 seconds, raises the glass, and moves on. If the mic dies, gather the room TIGHT and quiet, seat the hard-of-hearing up front, and have speakers project. A short, audible tribute always beats a long, half-heard one.' },
    { id: 'c_slideshow_fail', when: 'r_slideshow_fail', plan: 'Fall back to the phone backup of the same file, or skip straight to the live speeches — the printed memory wall carries the visual tribute on its own. Never let a tech glitch stall the program; the people in the room are the point.' },
    { id: 'c_accessibility', when: 'r_accessibility', plan: 'Pull extra chairs from anywhere, clear a wide center aisle, and station a helper to carry plates from the buffet and to walk anyone who needs it to a front-row seat for the speeches. Reserve the seats with the best sightline for the oldest guests.' },
    { id: 'c_underfood', when: 'r_underfood', plan: 'Open all the appetizer stations, send someone for a couple of pizzas or warehouse-store trays to cut and add to the buffet, and slow the pacing. A steady refill reads as generous, not short.' },
    { id: 'c_ice', when: 'r_ice', plan: 'Nearest gas-station/grocery ice run; in a pinch, freezer ice + frozen fruit chills drinks while you wait. Never let the bar go warm.' },
    { id: 'c_no_card', when: 'r_no_card', plan: 'Walk the card around to anyone heading out, collect any cards/gifts into one bag, and present the whole bundle — card, slideshow link, bouquet — to the honoree before they leave so they go home held.' },
    { id: 'c_overserved', when: 'r_overserved', plan: 'Quietly switch them to coffee or a zero-proof option, get water + food in hand, and pre-arrange a ride. Calm host discretion protects both the guest and the mood.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Alcohol, the honoree\'s favorite drink, beer/seltzer, coffee/tea, non-alcoholic, paper goods, decor, memory-display materials, the signing card, cleanup kit' },
      { when: 'T-1d', what: 'Buffet proteins + sides, produce, cake, flowers, cold apps' },
      { when: 'T0', what: 'Ice (1.5 lb/guest) + any last fresh items' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Print photos and finalize/export the slideshow to the play device; charge it; assemble the memory-wall layout' },
      { when: 'T-1d evening', what: 'Make-ahead food (reheatable mains, assembled cold items), prep buffet pans, build any cheese/charcuterie base' },
      { when: 'T0 -4h', what: 'Chill all wine/beer/favorite-drink; reheat or stage anything that warms fast for the buffet' },
      { when: 'T0 -1h', what: 'Final plating; fill the chafing dishes; light candles; cue the slideshow' },
    ],
    setup: [
      { when: 'T0 -4h', what: 'Start chilling bottles; set up the ice tubs (chilling vs drink ice, separate)' },
      { when: 'T0 -3h', what: 'Set the room: ample accessible seating, clear walkways, buffet table (≤36" reach), bar, cake/display tables; reserve front-row seats near the speakers' },
      { when: 'T0 -2h', what: 'Stage the memory/photo display, the signing card + pens, and the slideshow screen; place coffee/tea station, decor, centerpieces' },
      { when: 'T0 -1h', what: 'Test the mic + speaker and the slideshow on the actual screen; set music volume; pre-clean — empty dishwasher, stage bus tub + recycling bin' },
      { when: 'T0 -30m', what: 'SURPRISE prep: get guests in and quiet, brief the co-conspirator and the lookout, position the surprise guest out of sight, first appetizers out' },
    ],
    cleanup: [
      { when: 'during', what: 'Bus empties/plates into the staged tub continuously; keep the recycling bin and to-go containers visible; do NOT wash mid-party' },
      { when: 'after the toast', what: 'Clear used flutes/cake plates; refresh the buffet, napkins, and coffee station for the back half of the party' },
      { when: 'T0 +3:30', what: 'Leftovers boxed, bottles + cans to recycling, glassware staged for rental return or wash, linens to soak; send the honoree home with the card, photos, flowers, and gifts' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Quantities here are synthesized from standard US catering and party-planning heuristics rather than a single authoritative source: a meal-hour buffet target of roughly 0.5 lb cooked protein per guest plus 2-3 sides (or, for a heavy-appetizers format, ~10-12 hors d\'oeuvre bites per guest); about one drink per guest per hour split across beer, wine, and the honoree\'s favorite drink; a champagne toast pour of a half-glass, where one 750ml bottle yields ~6-8 toast portions, so plan ~1 bottle per 6-8 guests; and roughly 1.5 lb of ice per guest for chilling plus drinks. Because a retirement guest list skews older and mixes coworkers with family, the playbook treats audibility of the speeches (a real mic), ample real seating, a no-stairs accessible room, a reachable buffet, and a heavy non-alcoholic/coffee pour as first-class requirements, not nice-to-haves. These are planning midpoints, not guarantees — actual consumption and needs vary with crowd, time of day, region, and duration, so the playbook rounds up on food and drinks and treats headcount confirmation as the master variable. The surprise choreography, the tribute run-of-show, and the ROI/coaching framing are authored judgment. Per the authoring brief, no citations are claimed; verificationStatus is "synthesized" and sources is intentionally empty.',
    sources: [],
  },
};

export default retirementParty;
