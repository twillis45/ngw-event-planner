// Holiday Party — Event OS playbook data.
//
// The most common hosted corporate/social party: a festive end-of-year
// gathering with heavy passed/stationed apps (or a buffet) + a FULL BAR,
// festive decor, music, ~20-50 guests, hosted at home or an office/venue.
// ESM default export — no CJS module.exports in src/ (prod-bundle ESM lesson).
// Quantities are grounded in US catering norms; alcohol-liability guidance is
// general, not legal advice (see knowledge.note). The reader (../index.js)
// consumes `purchases` first for the operational candidate.

const holidayParty = {
  type: 'Holiday Party',
  solveFamily: 'holiday_party',
  family: 'corporate',
  recordKind: 'client',
  version: '1.0.0',

  meta: {
    summary:
      'A festive end-of-year gathering built on heavy apps (or a buffet) and a full bar, not a seated meal. Guests graze and circulate for 3-4 hours over drinks, music, and a short host toast. The two decisions that shape everything are host-vs-catered food and how alcohol is served — the latter carries real social-host liability, so a deliberate over-serving + safe-rides plan is non-negotiable.',
    typicalGuests: { low: 20, default: 35, high: 50 },
    typicalDurationHours: 4,
    leadTimeDays: 35,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 35, high: 110, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The toast lands and the room actually gets quiet to hear it.',
    'The signature cocktail goes fast enough that people ask what\'s in it.',
    'Two people who barely knew each other leave the party mid-conversation.',
    'The music is right, the room is warm, and for one hour everyone is just here.',
  ],

  decisions: [
    { id: 'venue', label: 'Home, office, or rented venue?', options: ['Host at home', 'Office / workplace', 'Restaurant private room', 'Rented event space'], default: 'Host at home', when: 'T-35d', blocks: ['food_format', 'rentals', 'staffing'], why: 'Venue sets capacity, whether you bring in everything (home/office) or it comes with the room (restaurant/venue), and the entire rental + staffing footprint. Lock it first; the good rooms book out months ahead in December.' },
    { id: 'food_format', label: 'Host-cooked or catered? Passed apps, stations, or buffet?', options: ['Host-cooked heavy apps', 'Drop-off catering (you set up)', 'Full-service catering (passed + stationed)', 'Buffet'], default: 'Drop-off catering (you set up)', when: 'T-28d', dependsOn: ['venue'], blocks: ['menu', 'rentals', 'staffing', 'food_purchases'], why: 'The single biggest cost + labor decision. For 20-50 guests a full host-cooked spread is a brutal solo lift; drop-off catering is the 80/20 sweet spot. Passed apps feel upscale but need staff; a buffet or stations let guests self-serve and free the host.' },
    { id: 'alcohol_service', label: 'How is alcohol served — and who controls the pour?', options: ['Hosted full bar, bartender controls pour', 'Hosted full bar, self-serve', 'Beer + wine + one signature cocktail only', 'Drink tickets / cash bar', 'Zero-proof / dry'], default: 'Hosted full bar, bartender controls pour', when: 'T-28d', dependsOn: ['venue'], blocks: ['beverage_purchases', 'staffing', 'safe_rides'], why: 'This is the liability decision, not just a menu choice. A trained bartender who controls the pour, cuts off intoxicated guests, and ID-checks is the strongest mitigation against social-host liability — which can attach to a host whose over-served guest later causes harm. Self-serve maximizes consumption and removes that safeguard.' },
    { id: 'signature', label: 'Seasonal signature cocktail (batched)?', options: ['Mulled wine', 'Cranberry-prosecco spritz', 'Spiked hot cider', 'Pomegranate margarita', 'None — beer/wine/spirits only'], default: 'Cranberry-prosecco spritz', when: 'T-21d', dependsOn: ['alcohol_service'], blocks: ['beverage_purchases'], why: 'One batched seasonal cocktail makes the bar feel festive and intentional, controls cost vs. a full mixology bar, and speeds service. Batch it so no one is mixing to order all night.' },
    { id: 'corporate_layer', label: 'Is this corporate (name tags, toast, photos, inclusivity)?', options: ['Yes — corporate / mixed teams', 'No — social / friends'], default: 'Yes — corporate / mixed teams', when: 'T-28d', blocks: ['name_tags', 'toast', 'safe_rides'], why: 'Corporate parties need name tags for mixed teams/plus-ones, a brief host/leadership toast, inclusive (non-denominational) framing, AND a heightened duty of care — an employer can carry liability for an employee over-served at a company event, so the safe-rides plan is mandatory, not optional.' },
  ],

  milestones: [
    { id: 'hp_setdate', name: 'Lock date, headcount, budget + book venue', offsetDays: 35, owner: 'host', category: 'planning', risk: { ifDelayed: 'December venues + caterers book out; you lose your date or pay a premium', severity: 'high' } },
    { id: 'hp_invite', name: 'Send invites + collect RSVP, dietary, plus-ones', offsetDays: 28, owner: 'host', dependsOn: ['hp_setdate'], category: 'guest', risk: { ifDelayed: 'No reliable headcount → wrong food/bar quantities', severity: 'high' } },
    { id: 'hp_catering', name: 'Book caterer / lock the menu (heavy apps or buffet)', offsetDays: 28, owner: 'host', dependsOn: ['hp_setdate'], category: 'food', risk: { ifDelayed: 'Best caterers fully booked in December; menu drives every quantity', severity: 'high' } },
    { id: 'hp_bar', name: 'Book bartender + decide alcohol service model', offsetDays: 21, owner: 'host', dependsOn: ['hp_setdate'], category: 'food', risk: { ifDelayed: 'No trained pour control → over-serving + liability exposure', severity: 'high' } },
    { id: 'hp_rentals', name: 'Reserve rentals (glassware, plates, cocktail tables, linens, coat rack)', offsetDays: 14, owner: 'host', dependsOn: ['hp_catering'], category: 'rental', risk: { ifDelayed: 'Rental shortages peak in December; not enough glassware day-of', severity: 'med' } },
    { id: 'hp_decor_music', name: 'Buy/plan decor + build the playlist (or book DJ)', offsetDays: 14, owner: 'host', dependsOn: ['hp_setdate'], category: 'decor', risk: null },
    { id: 'hp_safe_rides', name: 'Set the safe-rides / over-serving plan + comms', offsetDays: 10, owner: 'host', dependsOn: ['hp_bar'], category: 'planning', risk: { ifDelayed: 'No plan when a guest is too impaired to drive', severity: 'high' } },
    { id: 'hp_rsvp_close', name: 'Confirm final headcount; give caterer/bar the final count', offsetDays: 5, owner: 'host', dependsOn: ['hp_invite'], category: 'guest', risk: { ifDelayed: 'Over/under-buy food + alcohol by 20-30%', severity: 'high' } },
    { id: 'hp_shop_nonperish', name: 'Buy alcohol, mixers, decor, paper goods, cleanup kit', offsetDays: 3, owner: 'host', dependsOn: ['hp_rsvp_close'], category: 'shopping', risk: null },
    { id: 'hp_shop_fresh', name: 'Buy/pick up fresh food, garnish, flowers; pick up rentals', offsetDays: 1, owner: 'host', dependsOn: ['hp_catering', 'hp_rsvp_close'], category: 'shopping', risk: { ifDelayed: 'Wilted garnish / unready food', severity: 'med' } },
    { id: 'hp_setup', name: 'Set up: stations, bar, decor, coat check, name tags, music', offsetDays: 0, owner: 'host', dependsOn: ['hp_rentals', 'hp_decor_music', 'hp_shop_fresh'], category: 'setup', risk: null },
    { id: 'event', name: 'The holiday party (incl. host toast)', offsetDays: 0, owner: 'host', dependsOn: ['hp_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'hp_invite', phase: 'guest', label: 'Send invite: date/time/venue, dress code, plus-one + dietary ask, soft RSVP-by date', when: 'T-28d' },
    { id: 't_menu_lock', milestoneId: 'hp_catering', phase: 'food', label: 'Lock the menu: ~10-12 bites/guest across hot + cold + a veg + a sweet (or ~0.5 lb/guest buffet)', when: 'T-28d' },
    { id: 't_bar_model', milestoneId: 'hp_bar', phase: 'beverage', label: 'Confirm bartender + service model; brief them to control the pour and ID/cut-off', when: 'T-21d' },
    { id: 't_playlist', milestoneId: 'hp_decor_music', phase: 'setup', label: 'Build a 4-hour festive playlist (arrival → peak → wind-down) or brief the DJ', when: 'T-14d' },
    { id: 't_decor_plan', milestoneId: 'hp_decor_music', phase: 'decor', label: 'Plan decor: lighting/string lights, greenery, candles, table accents, a photo moment', when: 'T-14d' },
    { id: 't_rides_plan', milestoneId: 'hp_safe_rides', phase: 'planning', label: 'Write the safe-rides plan: rideshare codes, designated-driver asks, who watches for over-serving, who can crash', when: 'T-10d' },
    { id: 't_toast', milestoneId: 'hp_safe_rides', phase: 'planning', label: 'Draft a 2-3 minute host/leadership toast; pick the moment (~60-75 min in, before food fades)', when: 'T-7d' },
    { id: 't_rsvp_chase', milestoneId: 'hp_rsvp_close', phase: 'guest', label: 'Chase non-responders; give caterer + bartender the final guaranteed count', when: 'T-5d' },
    { id: 't_nametags', milestoneId: 'hp_setup', phase: 'setup', label: 'Pre-print/stage name tags + markers at the entry table (corporate)', when: 'T-1d' },
    { id: 't_shop_alc', milestoneId: 'hp_shop_nonperish', phase: 'shopping', label: 'Alcohol + mixers + ice plan + non-alc + paper goods + cleanup kit (non-perishable)', when: 'T-3d' },
    { id: 't_shop_fresh', milestoneId: 'hp_shop_fresh', phase: 'shopping', label: 'Fresh food/garnish/flowers; pick up rentals; buy ice last (~1.5 lb/guest)', when: 'T-1d' },
    { id: 't_setup_stations', milestoneId: 'hp_setup', phase: 'setup', label: 'Set food stations + bar; stage glassware, garnish caddy, water station, trash/recycling', when: 'T0 -3h' },
    { id: 't_setup_decor', milestoneId: 'hp_setup', phase: 'setup', label: 'Hang decor + lighting, set candles, stage the photo moment, start the playlist low', when: 'T0 -2h' },
    { id: 't_coat_entry', milestoneId: 'hp_setup', phase: 'setup', label: 'Set the entry: coat rack/check, name-tag table, welcome drink staged', when: 'T0 -1h' },
    { id: 't_welcome', milestoneId: 'event', phase: 'event', label: 'Greet at the door, hand a welcome drink, point to coats + name tags', when: 'T0 +0:00' },
    { id: 't_replenish', milestoneId: 'event', phase: 'food', label: 'Keep apps + bar + water replenished; assign a helper to watch food + over-serving', when: 'ongoing' },
    { id: 't_make_toast', milestoneId: 'event', phase: 'event', label: 'Lower music, make the host/leadership toast, raise a glass', when: 'T0 +1:15' },
    { id: 't_wind_down', milestoneId: 'event', phase: 'event', label: 'Wind-down: coffee/dessert out, slow the music, surface rideshare/DD plan to anyone impaired', when: 'T0 +3:30' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Post-party reset: bottles to recycling, rentals stacked for return, leftovers + trash out', when: 'T0 +4:30' },
  ],

  purchases: [
    { id: 'p_apps_hot', item: 'Hot heavy apps (meatballs, sliders, stuffed mushrooms, mini quiche)', category: 'food', qtyPerGuest: 5, unit: 'bites', where: ['Caterer', 'Costco', 'Grocery', 'Instacart'], unitCostRange: [0.8, 2.5], essential: true, buyAt: 'T-1d', alternatives: ['Frozen Trader Joe\'s or Costco apps — cheaper, bake day-of', 'Grocery deli meatball tray — budget hot protein option'], note: 'Heavy-apps party = ~10-12 bites/guest total across hot + cold over the evening; hot items are the satisfying core.', provenance: 'US catering norm: 6-10 hors d’oeuvres/guest when apps replace a meal; heavier over a 3-4h evening.' },
    { id: 'p_apps_cold', item: 'Cold/stationed apps (charcuterie, cheese, crudité, shrimp, dips)', category: 'food', qtyPerGuest: 5, unit: 'bites', where: ['Caterer', 'Grocery', 'Costco'], unitCostRange: [0.7, 2.5], essential: true, buyAt: 'T-1d', note: 'A stationed grazing board self-serves and holds at room temp — lowest-labor way to hit the bite count.' },
    { id: 'p_buffet_alt', item: 'Buffet entrées (if buffet format instead of passed apps)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Caterer', 'Costco'], unitCostRange: [6, 16], essential: false, buyAt: 'T-1d', note: 'Buffet alternative to the bite model: plan ~0.5 lb of food/guest. Use EITHER the bite apps OR this, not both.' },
    { id: 'p_veg_option', item: 'Vegetarian / dietary-safe option (clearly labeled)', category: 'food', qtyPerGuest: 2, unit: 'bites', where: ['Caterer', 'Grocery'], unitCostRange: [0.8, 2.5], essential: true, buyAt: 'T-1d', note: 'Always label a clear veg/GF option; corporate crowds always include restrictions.' },
    { id: 'p_dessert', item: 'Festive dessert bites (cookies, mini tarts, bark)', category: 'food', qtyPerGuest: 2, unit: 'bites', where: ['Bakery', 'Grocery', 'Caterer'], unitCostRange: [0.6, 2], essential: true, buyAt: 'T-1d', alternatives: ['Grocery bakery cookie platter — cheaper, no prep', 'Store-bought holiday bark or candy — lowest cost option'] },
    { id: 'p_beer', item: 'Beer (mix of light + seasonal/IPA)', category: 'beverage', qtyPerGuest: 1.6, unit: 'cans/bottles', where: ['Total Wine', 'Costco', 'Grocery'], unitCostRange: [1.2, 2.5], essential: true, buyAt: 'T-3d', note: 'Plan ~1 drink/guest/hour; typical mix ≈ 40% beer / 30% wine / 30% spirits. Buy on consignment (return unopened) where allowed.', provenance: 'US bar-stocking norm: 40/30/30 beer/wine/spirits split.' },
    { id: 'p_wine', item: 'Wine (red + white + a sparkling for the toast)', category: 'beverage', qtyFlat: 1, qtyPer: 4, unit: 'bottle per 4 guests', where: ['Wine shop', 'Total Wine', 'Grocery'], unitCostRange: [10, 22], essential: true, buyAt: 'T-3d', note: 'Board fix: was 1 bottle/2.5 guests (~40% over-buy). At ~1 drink/guest/hour × 30% wine over 4h ≈ 1.2 wine drinks/guest = 1 bottle (5 glasses) per ~4 guests; add sparkling for the toast.', provenance: 'US norm: 5 oz pour, 5 glasses/bottle.' },
    { id: 'p_spirits', item: 'Spirits for the bar (vodka, whiskey, rum/tequila, gin)', category: 'beverage', qtyFlat: 1, qtyPer: 7, unit: 'bottle (750ml) per 7 guests', where: ['Liquor store', 'Total Wine'], unitCostRange: [18, 35], essential: true, buyAt: 'T-3d', note: 'Full bar: ~1 bottle of spirits per 6-8 guests for a 4h party; one 750ml ≈ 16 pours.', provenance: 'US full-bar norm: 1 spirit bottle / 6-8 guests; 1.5 oz pour.' },
    { id: 'p_signature', item: 'Seasonal signature cocktail base + mixers + garnish (batched)', category: 'beverage', qtyFlat: 1, qtyPer: 12, unit: 'batch (serves ~12)', where: ['Liquor store', 'Grocery'], unitCostRange: [35, 65], essential: false, buyAt: 'T-3d', note: 'Batch ahead so no one mixes to order. One festive option (e.g. cranberry-prosecco spritz, mulled wine) covers the “signature” feel.' },
    { id: 'p_mixers', item: 'Mixers + bar consumables (tonic, soda, juice, citrus, simple syrup, bitters)', category: 'beverage', qtyPerGuest: 2, unit: 'servings', where: ['Grocery', 'Costco'], unitCostRange: [0.5, 1.2], essential: true, buyAt: 'T-3d' },
    { id: 'p_nonalc', item: 'Non-alcoholic options (sparkling water, mocktail base, soda, cider)', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Grocery', 'Costco'], unitCostRange: [0.6, 1.5], essential: true, buyAt: 'T-3d', note: 'A genuinely good zero-proof option is a liability mitigation, not an afterthought — designated drivers, non-drinkers, pregnant guests.' },
    { id: 'p_water', item: 'Still + sparkling water (station, all night)', category: 'beverage', qtyPerGuest: 4, unit: 'cups', where: ['Grocery', 'Costco'], unitCostRange: [0.2, 0.6], essential: true, buyAt: 'T-3d', note: 'A prominent, easy water station slows alcohol consumption and keeps guests hydrated — buy generously.' },
    { id: 'p_ice', item: 'Ice (chilling + drinks)', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station', 'Ice supplier'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest for a full bar + chilling tubs; buy day-of so it doesn’t melt.', provenance: 'US event norm: ~1-1.5 lb ice/guest.' },
    { id: 'p_coffee', item: 'Coffee + tea service (wind-down)', category: 'beverage', qtyFlat: 1, unit: 'service', where: ['Grocery', 'Caterer'], unitCostRange: [10, 25], essential: true, buyAt: 'T-3d', note: 'Coffee at wind-down helps guests sober up before driving — part of the safe-rides plan.' },
    { id: 'p_decor', item: 'Festive decor (string/ambient lights, greenery, table accents, photo backdrop)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Amazon', 'Target', 'Party store', 'Trader Joe’s'], unitCostRange: [60, 200], essential: false, buyAt: 'T-3d', note: 'Lighting does the most work — warm string lights + candles + greenery read “festive” faster than themed props.' },
    { id: 'p_candles', item: 'Candles (LED/flameless safest in a crowd; or unscented pillars)', category: 'decor', qtyFlat: 8, unit: 'candles', where: ['Ikea', 'Amazon', 'Grocery'], unitCostRange: [0.5, 4], essential: false, buyAt: 'T-3d', note: 'Flameless is safer with drinks + crowds; unscented near food.' },
    { id: 'p_flowers', item: 'Seasonal florals / centerpieces', category: 'decor', qtyFlat: 1, qtyPer: 12, unit: 'arrangement per 12 guests', where: ['Florist', 'Trader Joe’s', 'Costco'], unitCostRange: [15, 50], essential: false, buyAt: 'T-1d' },
    { id: 'p_nametags', item: 'Name tags + markers (corporate)', category: 'logistics', qtyPerGuest: 1.2, unit: 'tags', where: ['Amazon', 'Office supply'], unitCostRange: [0.1, 0.3], essential: false, buyAt: 'T-3d', note: 'For mixed teams + plus-ones; pre-print known names, leave blanks for guests.' },
    { id: 'p_serveware', item: 'Disposable/serve goods (cocktail napkins, small plates, picks, cups, skewers)', category: 'logistics', qtyPerGuest: 4, unit: 'pieces', where: ['Costco', 'Party store', 'Amazon'], unitCostRange: [0.1, 0.4], essential: true, buyAt: 'T-3d', note: 'Grazing crowds churn through cocktail napkins + small plates fast — buy 3-4x the headcount.' },
    { id: 'p_cleanup', item: 'Cleanup kit (trash + recycling bags, dish soap, paper towels, leftover containers)', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Costco'], unitCostRange: [12, 25], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: an extra recycling bag for bottles/cans + containers to send leftovers home.' },
  ],

  rentalsGap: [
    { item: 'Wine + rocks + highball glasses', qtyPerGuest: 2.5, note: 'Grazing/full-bar crowds set glasses down and grab fresh ones; plan ~2.5/guest. Rent or use quality disposables.' },
    { item: 'Small/appetizer plates', qtyPerGuest: 2, note: 'Self-serve stations churn plates; 2/guest minimum.' },
    { item: 'Cocktail (high-top) tables', qtyFlat: 1, qtyPer: 8, note: 'A standing party needs perching surfaces — ~1 high-top per 8 guests.' },
    { item: 'Bar / station tables + linens', qtyFlat: 4, note: 'Bar, 2 food stations, dessert/coffee — plus skirted linens.' },
    { item: 'Coat rack + hangers', qtyPerGuest: 1, note: 'Winter party = everyone has a coat; 1 hanger/guest + a labeled rack near the entry.' },
    { item: 'Chafing dishes / warmers + sterno', qtyFlat: 3, note: 'COMMONLY FORGOTTEN: hot apps go cold fast without warmers — ~3 for a 35-guest spread.' },
  ],

  vendors: [
    { category: 'Catering', required: false, altToDIY: 'Drop-off catering (you set up + replenish) is the 80/20 vs. full host-cooked for 20-50 guests; full-service adds passed service + staff', when: 'T-28d', costRange: [18, 45], costUnit: 'per guest' },
    { category: 'Bartender / Bar service', required: false, altToDIY: 'A trained bartender ($150-400) is the single strongest over-serving + liability safeguard — they control the pour, ID-check, and cut off. Self-serve removes that.', when: 'T-21d', costRange: [150, 400], costUnit: 'flat' },
    { category: 'DJ / Music', required: false, altToDIY: 'A curated 4-hour playlist on a good speaker covers most parties; a DJ ($400-800) adds energy + an MC for the toast at larger/corporate events', when: 'T-21d', costRange: [400, 800], costUnit: 'flat' },
    { category: 'Rentals', required: false, altToDIY: 'Borrow/buy for small home parties; rent glassware, high-tops, linens, warmers, and a coat rack once you cross ~25 guests', when: 'T-14d', costRange: [150, 600], costUnit: 'flat' },
    { category: 'Cleaning', required: false, altToDIY: 'A post-party cleaner ($120-250) is high-ROI for host sanity after a 35-guest party', when: 'T-7d', costRange: [120, 250], costUnit: 'flat' },
    { category: 'Event insurance / liability rider', required: false, altToDIY: 'A one-day event liability policy or host-liquor-liability rider (often $75-200) is worth pricing when serving a full bar, especially corporate', when: 'T-14d', costRange: [75, 200], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_overserve', trigger: 'Self-serve full bar + no one watching → guests over-served', severity: 'critical', mitigation: 'Use a bartender who controls the pour, ID-checks, and cuts people off; close the bar ~30-45 min before end; serve food all night and a prominent water station; assign a sober helper to watch the room. Over-serving is the root of the night’s worst outcomes.' },
    { id: 'r_saferides', trigger: 'An impaired guest is about to drive home', severity: 'critical', mitigation: 'Pre-stage a safe-rides plan: rideshare credit/codes, a designated-driver ask in the invite, a couch/guest-room offer, and quietly hold/hand keys. Never let an impaired guest drive — social-host (and at corporate events, employer) liability can attach to harm they cause.' },
    { id: 'r_headcount', trigger: 'Final headcount not confirmed by T-5d', severity: 'high', mitigation: 'Chase RSVPs; give the caterer + bartender a guaranteed count; over-cater food ~10%, alcohol on consignment so unopened bottles return.' },
    { id: 'r_underbar', trigger: 'Bar runs dry mid-party', severity: 'high', mitigation: 'Stock to ~1 drink/guest/hour with a buffer; buy returnable where allowed; keep a backup case of wine + the batched signature to stretch; never let it run fully dry.' },
    { id: 'r_coldfood', trigger: 'Hot apps go cold / stations run empty', severity: 'med', mitigation: 'Use chafers/warmers + sterno; stagger replenishment from the kitchen instead of putting everything out at once; assign a food-watch helper.' },
    { id: 'r_venue_late', trigger: 'Venue or caterer booked too late for December', severity: 'high', mitigation: 'Lock venue + caterer at T-35/T-28; December is peak — confirm in writing with deposits and a final-count date.' },
    { id: 'r_coats', trigger: 'No coat plan → pile of coats on a bed, lost/mixed up', severity: 'low', mitigation: 'Set a labeled coat rack with hangers near the entry; for corporate, a coat-check helper for the first hour.' },
    { id: 'r_dietary', trigger: 'No labeled veg/allergy-safe option', severity: 'med', mitigation: 'Collect dietary at RSVP; clearly label a veg + a GF option at every station.' },
  ],

  contingencies: [
    { id: 'c_overserve', when: 'r_overserve', plan: 'Quietly slow or stop that guest’s service, switch them to water/coffee + food, and have the bartender (or you) make the cut-off call calmly. Better an awkward moment than an accident.' },
    { id: 'c_saferides', when: 'r_saferides', plan: 'Order them a rideshare on your account, pair them with a sober guest, or offer the couch. Hold their keys if needed. Have the rideshare app + the “you’re crashing here” offer ready before the party, not improvised at midnight.' },
    { id: 'c_headcount', when: 'r_headcount', plan: 'If more show than expected, stretch with extra cheese/charcuterie + bread and slow the pacing; if fewer, the consignment alcohol returns and leftovers go home in the containers you bought.' },
    { id: 'c_underbar', when: 'r_underbar', plan: 'Switch to the batched signature cocktail + a punch to stretch the spirits, push beer/wine, and send someone on a quick run. Pace it so the bar never goes fully dry.' },
    { id: 'c_coldfood', when: 'r_coldfood', plan: 'Pull cold-holding grazing items forward (charcuterie, crudité, dips) while the next hot batch warms; light a fresh sterno; never serve a half-empty station — consolidate.' },
    { id: 'c_venue_late', when: 'r_venue_late', plan: 'Pivot to a home/office host with drop-off catering if venues are gone; a great host-run party beats a mediocre last-minute room.' },
    { id: 'c_coats', when: 'r_coats', plan: 'If the rack overflows, open a designated bedroom/closet with a helper tracking it; hand out tags for anything valuable.' },
    { id: 'c_dietary', when: 'r_dietary', plan: 'The labeled veg + GF station is the universal safe plate; if an unknown restriction surfaces, point them there and add plain fruit/nuts/crudité.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Alcohol, mixers, non-alc, decor, candles, name tags, paper/serve goods, cleanup kit, coffee/tea' },
      { when: 'T-1d', what: 'Fresh food/garnish, flowers; pick up rentals; pre-stage name tags' },
      { when: 'T0', what: 'Ice (~1.5 lb/guest) + any last-minute fresh garnish' },
    ],
    preparation: [
      { when: 'T-1d evening', what: 'Batch the signature cocktail, prep garnish caddy, assemble cold boards, label dietary signage' },
      { when: 'T0 -4h', what: 'Set up chafers; portion/plate cold stations; chill beer/wine/sparkling' },
      { when: 'T0 -1h', what: 'Warm hot apps; fill water + coffee stations; final bar mise en place' },
    ],
    setup: [
      { when: 'T0 -3h', what: 'Set food stations + bar tables; stage glassware, ice tubs, garnish, trash/recycling bins' },
      { when: 'T0 -2h', what: 'Hang lights + decor, set candles, stage the photo moment, start the playlist low' },
      { when: 'T0 -1h', what: 'Set the entry: coat rack + hangers, name-tag table, welcome-drink tray; brief the bartender on pour control + cut-off' },
    ],
    cleanup: [
      { when: 'during', what: 'Bus empties into trash/recycling; keep stations consolidated and tidy; do not deep-clean mid-party' },
      { when: 'T0 +3:30', what: 'Close the bar ~30-45 min before end; coffee/dessert out; surface rideshare/DD plan to anyone impaired' },
      { when: 'T0 +4:30', what: 'Bottles/cans to recycling, rentals scraped + stacked for return, leftovers into containers (send home), trash out, linens to laundry' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Quantities (≈10-12 bites or ≈0.5 lb food/guest; ≈1 drink/guest/hour; a ~40/30/30 beer/wine/spirits split; ~1 spirit bottle per 6-8 guests; ~1.5 lb ice/guest; 5 oz wine / 12 oz beer / 1.5 oz spirit pours) reflect established US catering and bar-stocking heuristics and are synthesized here without per-claim citations. On alcohol: this playbook takes the position that a host serving a full bar carries real responsibility. Social-host liability laws vary widely by state and can hold a host accountable for harm caused by an over-served (or underage) guest, and at corporate events an employer may carry additional exposure — so the strongest, most consistently recommended mitigations (a trained bartender controlling the pour and ID/cut-off, food + a prominent water station all night, closing the bar before the end, and a concrete safe-rides plan: rideshare, designated drivers, holding keys, offering a place to stay) are treated as required, not optional. This is operational guidance, not legal advice; confirm your state’s laws and consider a one-day event-liability or host-liquor rider when serving alcohol.',
    sources: [],
  },
};

export default holidayParty;
