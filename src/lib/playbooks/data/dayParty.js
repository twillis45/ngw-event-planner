// Day Party — Event OS host playbook (data only).
//
// The African American afternoon "grown folks" social: a curated DJ or serious
// playlist is the HERO (old-school R&B, hip-hop, Afrobeats, line dances), a real
// bar (signature cocktail + a batched punch + beer/wine + plenty of water), light
// passed bites or grazing (people came to VIBE, not to sit down to a heavy meal),
// a dress-code/aesthetic moment (grown-and-sexy, all-white), and a daytime outdoor
// setting (rooftop / backyard / patio) with shade, seating, a decor moment and a
// photo wall. It ENDS at a civilized hour — it's a DAY party.
//
// Cultural grounding is the bar: the table-setting spirit of B. Smith, Carla Hall,
// Marcus Samuelsson, Sunny Anderson and Tabitha Brown — generous, intentional,
// dignity-first hosting — meets the modern day-party / brunch-culture scene
// (R&B-only day parties, AfroCode / Everyday Afrique rooftops, line-dance floors).
// Registered under the canonical 'home_gathering' solve family. Quantities reflect
// common US bar/ice/catering rules of thumb (see `knowledge`), authored honestly
// and labeled `synthesized` until a verification pass attaches citations.
// ESM default export.

const dayParty = {
  type: 'Day Party',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',

  meta: {
    summary:
      'The grown-folks afternoon day party — curated DJ/playlist as the hero, a real signature-cocktail-and-punch bar, light passed bites over a heavy meal, a dress-code/aesthetic moment, and a daytime outdoor vibe (rooftop / backyard / patio) with shade, seating and a photo wall. The playbook front-loads the music, the bar (drinks + ice), shade/seating and a civilized end time so the host can actually be in the room.',
    typicalGuests: { low: 20, default: 35, high: 50 },
    typicalDurationHours: 5,
    leadTimeDays: 30,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 25, high: 70, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The DJ drops the right song and the floor fills without anyone asking.',
    'The whole crowd is on the same line dance at the same time.',
    'The photo wall is actually beautiful and everyone stops to take their moment.',
    'Midafternoon, it hits — the drinks are right, the music is right, the people are right.',
    'It ends at a civilized hour and everyone is still talking about it on the way home.',
  ],

  decisions: [
    { id: 'music', label: 'DJ or a serious curated playlist?', options: ['Hire a DJ', 'Curated playlist + good speakers', 'DJ for peak hours + playlist on either side'], default: 'Hire a DJ', when: 'T-28d', blocks: ['music_setup', 'vendors'], why: 'The music IS the party. A DJ reads the room and keeps the floor moving (old-school R&B → hip-hop → Afrobeats → line dances); in the DMV, a Go-Go set or band moves the rooftop better than anything. A deep playlist + real speakers is the budget version — never a phone on a tabletop speaker.' },
    { id: 'dresscode', label: 'Dress code / aesthetic', options: ['Grown-and-sexy', 'All-white', 'Summer linen / resort', 'Color theme (one bold color)', 'Come as you are'], default: 'Grown-and-sexy', when: 'T-21d', blocks: ['decor'], why: 'A day party has a LOOK. The dress code sets the photos, the decor palette and the energy before anyone arrives — put it on the invite.' },
    { id: 'food', label: 'Food level (people came to vibe, not to eat heavy)', options: ['Light passed bites + grazing table', 'Food truck', 'Light bites only', 'Caterer drop-off small plates'], default: 'Light passed bites + grazing table', when: 'T-21d', blocks: ['food', 'vendors'], why: 'This is NOT a sit-down dinner. Light, hand-held, all-afternoon food keeps people on their feet and dancing. A food truck is the easy crowd-pleaser at 35+ guests.' },
    { id: 'bar', label: 'Bar setup', options: ['Signature cocktail + batched punch + beer/wine + water', 'Self-serve punch + beer/wine', 'Hired bartender', 'BYOB + host provides mixers/ice'], default: 'Signature cocktail + batched punch + beer/wine + water', when: 'T-21d', blocks: ['beverage_purchases', 'vendors'], why: 'A real bar separates a day party from a hangout. One signature cocktail + a big batched punch lets you serve a crowd without a line; beer/wine and plenty of WATER cover the rest. Drives the single biggest cost + ice lever.' },
    { id: 'venue', label: 'Where (daytime outdoor)', options: ['Backyard', 'Rooftop', 'Patio / deck', 'Rented outdoor space'], default: 'Backyard', when: 'T-28d', blocks: ['decor', 'logistics'], why: 'Daytime outdoor is the whole point. Drives shade, seating, power for the DJ, bathroom access, and whether you need a noise permit.' },
  ],

  milestones: [
    { id: 'dp_setdate', name: 'Set date, headcount, vibe (dress code + venue)', offsetDays: 30, owner: 'host', category: 'planning', risk: { ifDelayed: 'Best DJs and food trucks book out for summer weekends', severity: 'med' } },
    { id: 'dp_bookdj', name: 'Book DJ + lock food (truck / caterer) + bartender', offsetDays: 28, owner: 'host', dependsOn: ['dp_setdate'], category: 'vendor', risk: { ifDelayed: 'No DJ = no party; food trucks gone for the date', severity: 'high' } },
    { id: 'dp_permit', name: 'Check noise ordinance / permit + give neighbors a heads-up', offsetDays: 21, owner: 'host', dependsOn: ['dp_setdate'], category: 'logistics', risk: { ifDelayed: 'Noise complaint shuts the music down mid-party', severity: 'high' } },
    { id: 'dp_invite', name: 'Send invite with dress code + start AND end time', offsetDays: 21, owner: 'host', dependsOn: ['dp_setdate'], category: 'guest', risk: { ifDelayed: 'Low RSVP; wrong bar/food counts', severity: 'med' } },
    { id: 'dp_rsvp', name: 'Confirm headcount + weather check + safe-ride plan', offsetDays: 5, owner: 'host', dependsOn: ['dp_invite'], category: 'guest', risk: { ifDelayed: 'Over/under-buy the bar; no rain plan; nobody planned a ride home', severity: 'med' } },
    { id: 'dp_shop_nonperish', name: 'Buy liquor, mixers, beer/wine, water, disposables, decor, photo-wall', offsetDays: 3, owner: 'host', dependsOn: ['dp_rsvp'], category: 'shopping', risk: null },
    { id: 'dp_shop_fresh', name: 'Buy fresh garnish, fruit for punch, light-bite ingredients', offsetDays: 1, owner: 'host', dependsOn: ['dp_rsvp'], category: 'shopping', risk: { ifDelayed: 'Wilted garnish; no fruit for the punch', severity: 'low' } },
    { id: 'dp_batch', name: 'Batch the punch + prep bites + chill everything', offsetDays: 1, owner: 'host', dependsOn: ['dp_shop_fresh'], category: 'food', risk: { ifDelayed: 'Punch not chilled; scrambling during the party', severity: 'med' } },
    { id: 'dp_setup', name: 'Set up bar, DJ/power, shade, seating, decor + photo wall, ice', offsetDays: 0, owner: 'host', dependsOn: ['dp_shop_nonperish', 'dp_batch'], category: 'setup', risk: null },
    { id: 'event', name: 'The day party', offsetDays: 0, owner: 'host', dependsOn: ['dp_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_bookdj', milestoneId: 'dp_bookdj', phase: 'vendor', label: 'Book the DJ; share the vibe + a few must-play / do-not-play notes; confirm they bring speakers or you rent a PA', when: 'T-28d' },
    { id: 't_food', milestoneId: 'dp_bookdj', phase: 'vendor', label: 'Lock food: confirm food truck/caterer window, or plan the passed bites + grazing table yourself', when: 'T-28d' },
    { id: 't_permit', milestoneId: 'dp_permit', phase: 'logistics', label: 'Check city noise ordinance / daytime decibel + permit rules; tell the neighbors the date and end time (invite one or two)', when: 'T-21d' },
    { id: 't_invite', milestoneId: 'dp_invite', phase: 'guest', label: 'Send the invite — dress code, start AND end time, address, "21+ / grown folks" if applicable', when: 'T-21d' },
    { id: 't_rsvp', milestoneId: 'dp_rsvp', phase: 'guest', label: 'Confirm headcount; check the forecast + shade/rain plan; remind guests to line up a ride / rideshare', when: 'T-5d' },
    { id: 't_nonperish_shop', milestoneId: 'dp_shop_nonperish', phase: 'shopping', label: 'Liquor, punch base, mixers, beer/wine, lots of water, cups, disposables, decor, photo-wall backdrop', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'dp_shop_fresh', phase: 'shopping', label: 'Fresh garnish (citrus, mint, berries), punch fruit, ingredients for bites', when: 'T-1d' },
    { id: 't_batch', milestoneId: 'dp_batch', phase: 'food', label: 'Batch the punch (dilute ~10% water), prep cold bites, chill all drinks overnight, build the playlist as a backup', when: 'T-1d evening' },
    { id: 't_setup', milestoneId: 'dp_setup', phase: 'setup', label: 'Bar + drink station, DJ power + speakers, shade/canopy, seating pods, decor + photo wall, ice in coolers and tubs', when: 'T0 -2:00' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Last call ~30 min before end; cut the music down at the posted hour; pack leftovers, bag trash + recycling, return rentals, take down photo wall', when: 'T0 +5:00' },
  ],

  purchases: [
    { id: 'p_liquor', item: 'Spirits for signature cocktail + punch (rum / vodka / tequila / bourbon)', category: 'beverage', qtyPerGuest: 0.06, unit: 'bottle (750ml)', where: ['Liquor store', 'Costco', 'Total Wine'], unitCostRange: [15, 30], essential: true, buyAt: 'T-3d', note: 'Roughly one 750ml bottle yields ~16 cocktails; ~0.06 bottle/guest covers a signature drink + punch over a 5h afternoon.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1 bottle of spirits per ~16 mixed drinks; 5h day-party pacing ~1 drink/guest/hr split across bar + punch.' } },
    { id: 'p_punchbase', item: 'Punch base (juices, sparkling, lemonade, fruit)', category: 'beverage', qtyPerGuest: 0.6, unit: 'L', where: ['Grocery', 'Costco'], unitCostRange: [1.5, 3], essential: true, buyAt: 'T-3d', note: 'The batched punch is the workhorse — serve a crowd with no bar line. Dilute the batch ~10% with water so it is not syrupy.' },
    { id: 'p_mixers', item: 'Mixers (club soda, tonic, ginger beer, citrus)', category: 'beverage', qtyPerGuest: 1, unit: 'serving', where: ['Grocery', 'Costco'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-3d' },
    { id: 'p_beerwine', item: 'Beer + wine', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Liquor store', 'Costco', 'Grocery'], unitCostRange: [1.5, 4], essential: true, buyAt: 'T-3d', note: 'For guests who would rather sip — a standard mix runs roughly 40% wine, 35% beer, 25% spirits.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~5 drinks/guest over a 4-5h event (2 first hour, 1/hr after); 40/35/25 wine/beer/spirits split is a common catering rule.' } },
    { id: 'p_water', item: 'Water (bottled + dispenser) + non-alcoholic option', category: 'beverage', qtyPerGuest: 3, unit: 'servings', where: ['Grocery', 'Costco'], unitCostRange: [0.3, 0.8], essential: true, buyAt: 'T-3d', note: 'COMMONLY UNDER-BOUGHT: a daytime outdoor crowd dehydrates fast. Plenty of water + a real mocktail keeps everyone upright and is the backbone of not over-serving.' },
    { id: 'p_ice', item: 'Ice (bar, coolers, punch)', category: 'beverage', qtyPerGuest: 2, unit: 'lb', where: ['Grocery', 'Gas station', 'Ice supplier'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5-2 lb/guest, on the high end because it is outdoors in the heat and you are chilling drinks AND a punch.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1.5-2 lb ice/guest for an outdoor warm-weather event; double standard estimates outdoors.' } },
    { id: 'p_bites', item: 'Charcuterie, wings & sliders (skewers, fruit)', category: 'food', qtyPerGuest: 5, unit: 'pieces', where: ['Grocery', 'Costco', 'Caterer'], unitCostRange: [1, 3], essential: true, buyAt: 'T-1d', note: 'Hand-held, all-afternoon food. ~5-6 bites/guest for a no-meal day party; a grazing table holds the room without table service. In the DMV, mambo/mumbo-sauce wings are the recognized bite.', alternatives: ['Costco party platters — cheaper per bite, minimal prep', 'Frozen appetizers (Trader Joe\'s) — budget option, bake day-of', 'Fruit + veggie tray + dip — cheapest grazing option if budget is tight'] },
    { id: 'p_garnish', item: 'Fresh garnish + punch fruit (citrus, mint, berries)', category: 'food', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Farmers market'], unitCostRange: [15, 30], essential: true, buyAt: 'T-1d', alternatives: ['Frozen fruit — cheaper for the punch bowl, works fine once thawed'] },
    { id: 'p_cups', item: 'Cups, plates, napkins, cocktail picks, cutlery (disposable)', category: 'rental', qtyPerGuest: 3, unit: 'set', where: ['Party store', 'Costco', 'Grocery'], unitCostRange: [0.2, 0.7], essential: true, buyAt: 'T-3d', note: 'Day parties go through cups — people set one down and grab a fresh one. Buy 3x.' },
    { id: 'p_decor', item: 'Decor + photo-wall backdrop (balloons, greenery, signage, theme palette)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Amazon', 'Florist'], unitCostRange: [60, 200], essential: false, buyAt: 'T-3d', note: 'The vibe/decor moment + a photo wall in the dress-code palette is what turns a backyard into a day party — and gives the room its photos.' },
    { id: 'p_speakers', item: 'Speaker / PA rental (if no DJ or DJ does not bring sound)', category: 'logistics', qtyFlat: 1, unit: 'system', where: ['AV rental', 'Music store', 'Amazon'], unitCostRange: [80, 250], essential: false, buyAt: 'T-3d', note: 'If you went the playlist route, real speakers are non-negotiable — never a phone on a Bluetooth puck. Confirm power/outlets outside.' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels, foil/containers for leftovers', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [10, 18], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a recycling bag for all the cans/bottles + containers for leftover food and punch.' },
  ],

  rentalsGap: [
    { item: 'Pop-up canopy / tent (10x10 or larger)', qtyFlat: 1, note: 'Shade is non-negotiable for a daytime outdoor party — the difference between a 2h and a 5h party.' },
    { item: 'Folding chairs + seating-pod arrangement', qtyPerGuest: 0.5, note: 'Day parties are stand-and-mingle; seat for about half the guests in small pods, not rows.' },
    { item: 'Cocktail / high-top tables', qtyPerGuest: 0.1, note: 'Roughly one high-top per ~10 guests to hold drinks while standing.' },
    { item: 'Coolers / drink tubs', qtyPerGuest: 0.1, note: 'About one large cooler or tub per ~10 guests for beer/wine/water on ice.' },
    { item: 'Bar / drink-station table + punch dispenser', qtyFlat: 1, note: 'A dedicated bar table with the signature cocktail + the batched punch dispenser keeps the line down.' },
    { item: 'Bluetooth/PA speakers or DJ sound system', qtyFlat: 1, note: 'The hero. Loud and clear enough to fill an outdoor space without distorting.' },
  ],

  vendors: [
    { category: 'DJ', required: false, altToDIY: 'A serious curated playlist + rented PA speakers', when: 'T-28d', costRange: [400, 1200], costUnit: 'flat' },
    { category: 'Food truck', required: false, altToDIY: 'Passed bites + a grazing table you assemble', when: 'T-28d', costRange: [15, 30], costUnit: 'per guest' },
    { category: 'Caterer (small plates / drop-off)', required: false, altToDIY: 'DIY grazing board + store-bought apps', when: 'T-21d', costRange: [18, 40], costUnit: 'per guest' },
    { category: 'Bartender', required: false, altToDIY: 'Self-serve signature cocktail + batched punch', when: 'T-14d', costRange: [200, 500], costUnit: 'flat' },
    { category: 'Tent / canopy + furniture rental', required: false, altToDIY: 'Own/borrow canopies + chairs', when: 'T-14d', costRange: [150, 500], costUnit: 'flat' },
    { category: 'Photographer / content creator', required: false, altToDIY: 'A friend with a good phone + the photo wall', when: 'T-14d', costRange: [200, 600], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_music', trigger: 'DJ cancels or playlist/speakers fail', severity: 'high', mitigation: 'Confirm the DJ the week of; ALWAYS have a backup playlist downloaded on a phone + a charged speaker as insurance. The music cannot go quiet.' },
    { id: 'r_noise', trigger: 'Noise complaint / neighbors / no permit — police shut the music down', severity: 'high', mitigation: 'Check the daytime noise ordinance + permit rules at T-21d; give neighbors a heads-up (or invite them); point speakers away from homes; keep it to the posted daytime hours.' },
    { id: 'r_overserve', trigger: 'Guests over-served; someone drives impaired', severity: 'high', mitigation: 'Pace the bar (1 drink/guest/hr), keep WATER and a real mocktail front-and-center, serve food the whole time, do a last call ~30 min before end, and pre-arrange rideshare / designated drivers; never let an over-served guest drive.' },
    { id: 'r_weather', trigger: 'Rain or extreme heat with no shade plan', severity: 'high', mitigation: 'Check the forecast at T-5d; secure canopies + a covered/indoor fallback; provide shade + water; shift earlier to dodge peak heat.' },
    { id: 'r_ice', trigger: 'Ice runs out, drinks + punch go warm', severity: 'med', mitigation: 'Buy ~2 lb/guest day-of (outdoor melts fast); keep a shaded backup cooler; know the nearest store/ice supplier for a mid-party run.' },
    { id: 'r_runslate', trigger: 'A day party runs into the night and loses its civilized end', severity: 'med', mitigation: 'Put the END time on the invite; do a last call; fade the music down at the posted hour. It is a DAY party — protect the wind-down.' },
    { id: 'r_food', trigger: 'Light food left out too long in the heat', severity: 'med', mitigation: 'Keep cold bites on ice; refresh the grazing table in waves; do not leave perishables out >1-2h in the heat.' },
  ],

  contingencies: [
    { id: 'c_music', when: 'r_music', plan: 'Switch to the downloaded backup playlist through the charged speaker; if a DJ no-shows, a trusted friend runs the playlist and reads the room.' },
    { id: 'c_noise', when: 'r_noise', plan: 'Turn amplified sound down, angle it inward/away from homes, and if asked, move the party into its quieter wind-down phase early rather than fight it.' },
    { id: 'c_overserve', when: 'r_overserve', plan: 'Cut the bar for anyone over-served, put food and water in their hands, and book/split a rideshare or set them up to stay — keys do not leave with an impaired guest.' },
    { id: 'c_weather', when: 'r_weather', plan: 'Pop the canopies or move under cover / indoors; keep the bar + speaker running; message guests the morning of with the rain plan.' },
    { id: 'c_ice', when: 'r_ice', plan: 'Send someone for 40-60 lb of ice; gas stations and grocery stores carry it; consolidate drinks into fewer, shaded coolers.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Spirits, punch base, mixers, beer/wine, lots of water, cups + disposables, decor + photo wall, cleanup kit, speaker rental if needed' },
      { when: 'T-1d', what: 'Fresh garnish + punch fruit, light-bite ingredients' },
      { when: 'T0', what: 'Ice (lots — ~2 lb/guest) + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Batch the punch (dilute ~10% water), prep cold bites, chill all drinks overnight, download the backup playlist' },
      { when: 'T0 -3h', what: 'Final garnish prep; stage food on the grazing table; charge the backup speaker' },
    ],
    setup: [
      { when: 'T0 -2h', what: 'Build the bar + punch dispenser, set DJ power + speakers, raise canopies/shade, arrange seating pods + high-tops' },
      { when: 'T0 -1h', what: 'Hang decor + the photo wall in the theme palette, fill coolers/tubs with ice, lay out cups + water station, soundcheck' },
    ],
    cleanup: [
      { when: 'during', what: 'Refresh the grazing table in waves; keep cold bites on ice; bag cans/bottles for recycling as you go; keep water flowing' },
      { when: 'T0 +4.5h', what: 'Last call ~30 min before end; fade the music down at the posted hour' },
      { when: 'T0 +5h', what: 'Pack leftovers + punch, bag trash + recycling, return rentals, take down the photo wall + decor, settle safe rides for any over-served guest' },
    ],
  },

  // Day-of "Before the big day" readiness/safety walkthrough — authored for an
  // OUTDOOR day party: alcohol + DJ/music + heat, NOT grill-centric (no fuel/
  // fire item). severity drives ordering; state persists in
  // event.safetyChecked[id].
  dayOfChecklist: [
    { id: 'alcohol', label: 'Alcohol plan', detail: 'Pace the bar, keep water + a mocktail front-and-center, do a last call ~30 min before end, and pre-arrange rideshares / DDs. No keys leave with an over-served guest.', severity: 'high' },
    { id: 'weather', label: 'Heat / rain plan', detail: 'Canopies up, shade and water out, and a covered/indoor fallback ready if the weather turns.', severity: 'high' },
    { id: 'noise', label: 'Noise + neighbors', detail: 'Speakers pointed away from homes, daytime hours respected, and neighbors given a heads-up so the music never gets shut down.', severity: 'med' },
    { id: 'food', label: 'Food safety', detail: 'Cold bites on ice, the grazing table refreshed in waves, nothing perishable out more than ~1-2h in the heat.', severity: 'med' },
    { id: 'power', label: 'Power & outlets', detail: "DJ rig, speakers, and lights planned to the right circuits with a charged backup speaker — the music can't go quiet.", severity: 'med' },
    { id: 'trash', label: 'Trash + recycling station', detail: 'Bags staged, a recycling bag for the cans/bottles a bar night produces, and a plan to swap bags mid-party.', severity: 'low' },
    { id: 'emergency', label: 'Emergency basics', detail: 'First-aid kit on hand; know the nearest ER; phones charged.', severity: 'low' },
  ],

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'This playbook is grounded in the lived tradition of the African American afternoon day party — the grown-and-sexy, DJ-led, all-white / linen, line-dance-and-Afrobeats social documented across the modern brunch-and-day-party scene (R&B-only day parties, rooftop Afro-dance collectives) — and in the generous, intentional, dignity-first hosting standard of figures like B. Smith, Carla Hall, Marcus Samuelsson, Sunny Anderson and Tabitha Brown. It is written from the inside as respectful practice, not caricature: the music is the hero, the bar is real, the food is light because people came to vibe, and the day ends at a civilized hour. Quantities reflect common US event rules of thumb (~1 drink/guest/hr over a 4-5h event with a 40/35/25 wine/beer/spirits mix, ~1 bottle of spirits per ~16 cocktails, ~1.5-2 lb ice/guest outdoors, ~5-6 light bites/guest, plenty of water). Safety guidance (pace the bar, keep water and food out, last call, pre-arranged rides; check the daytime noise ordinance / permit and give neighbors notice) reflects widely-published responsible-hosting and municipal practice. Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default dayParty;
