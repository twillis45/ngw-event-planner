// Juneteenth Cookout / Celebration — Event OS host playbook (data only).
//
// Juneteenth (June 19) marks the day in 1865 when Union troops reached
// Galveston, Texas and enforced the Emancipation Proclamation — freeing the
// last enslaved Black Americans more than two years after it was issued. It
// became a U.S. federal holiday in 2021. This playbook treats a home-hosted
// Juneteenth gathering as what it is: a COOKOUT that is also a freedom
// commemoration. It honors the documented insider traditions — the cookout
// spread (BBQ + the sides), the SYMBOLIC RED foods and drinks (resilience and
// the bloodshed/sacrifice of the enslaved; red as a sacred color in West
// African Yoruba/Kongo heritage), and a MEANING/PROGRAM moment so the day is
// remembered, not just enjoyed. Authored to be authentic and dignity-first,
// no caricature. Quantities are common US cookout rules of thumb. Labeled
// `synthesized`; NO fabricated sources. ESM default export.

const juneteenthCookout = {
  type: 'Juneteenth Cookout',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A home-hosted Juneteenth celebration — a Black American freedom holiday (June 19, 1865; federal holiday since 2021). It is a full summer cookout (BBQ ribs, chicken, links + the sides — mac & cheese, baked beans, collard greens, potato salad, cornbread) carried by the Juneteenth layer: symbolic RED foods and drinks (red velvet cake, watermelon, hibiscus/strawberry "red drink") that honor resilience and sacrifice, Pan-African red/black/green touches, music celebrating Black artists, and a moment of meaning — a reading of the history, a reflection, or a kids\' education element. The playbook front-loads the meaning/program choice and the heat/ice/shade logistics so the host can honor the day and still enjoy it.',
    typicalGuests: { low: 12, default: 25, high: 50 },
    typicalDurationHours: 5,
    leadTimeDays: 21,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 15, high: 45, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The reading — everyone pauses, hears the history, and feels why we gather.',
    'The kids hear the story for the first time.',
    'The elders get served first.',
    'The red drink is poured, someone makes the toast, and the table goes quiet.',
    'The music is all Black artists and somebody calls out the song that hits.',
  ],

  decisions: [
    { id: 'meaning', label: 'How will you honor the history? (the heart of Juneteenth)', options: ['Read the history aloud / Emancipation Proclamation moment', 'A toast + moment of reflection before the meal', 'Kids\' education element (story, books, activity)', 'Music celebrating Black artists across eras', 'Source the spread from Black-owned businesses', 'Several of these woven together'], default: 'A toast + moment of reflection before the meal', when: 'T-14d', blocks: ['program', 'sourcing'], why: 'Juneteenth is a freedom commemoration, not only a party. Deciding HOW you honor it — a reading, a reflection, a kids\' element, the music, or where the food comes from — is what makes the day Juneteenth and not just a cookout. Pick at least one and name who leads it.' },
    { id: 'sourcing', label: 'Where does the spread come from?', options: ['Black-owned restaurants / caterers / bakers where you can', 'Host cooks the mains, supports a Black-owned bakery for the cake', 'Host cooks everything', 'Potluck — guests bring a dish that means something to them'], default: 'Host cooks the mains, supports a Black-owned bakery for the cake', when: 'T-14d', blocks: ['food', 'vendors'], why: 'Supporting Black-owned businesses is a recognized way to honor the day, and it lifts host load. The red velvet cake / red drink from a Black-owned bakery is an easy, meaningful default.' },
    { id: 'menu', label: 'The cookout spread (mains + sides)', options: ['Ribs + chicken + links + the sides', 'Smoked brisket + chicken + the sides', 'Mixed grill + seafood + the sides', 'Lighter spread: chicken + sides + plenty of red foods'], default: 'Ribs + chicken + links + the sides', when: 'T-14d', blocks: ['food', 'fuel'], why: 'Drives proteins, fuel, and grill/smoke time. The sides carry the table: mac & cheese, baked beans, collard greens, potato salad, cornbread.' },
    { id: 'red_table', label: 'The red foods + "red drink" (the symbolic layer)', options: ['Red drink + watermelon + red velvet cake', 'Hibiscus/sorrel "red drink" from scratch + watermelon + red dessert', 'Big Red / strawberry soda + watermelon + red velvet', 'Full red table: red drink, watermelon, red velvet, red beans, strawberries'], default: 'Red drink + watermelon + red velvet cake', when: 'T-14d', blocks: ['food', 'beverage_purchases'], why: 'Red foods and drinks are central to Juneteenth — red symbolizes resilience and the blood/sacrifice of the enslaved, and red is a sacred color in West African heritage. At least one red drink + watermelon + a red dessert should be on the table.' },
    { id: 'drinks', label: 'Drinks plan (heat-aware)', options: ['Red drink + soda + water + iced tea', 'Add a "grown" section (beer/wine/cocktail)', 'Family-friendly / dry', 'Potluck — guests bring drinks'], default: 'Add a "grown" section (beer/wine/cocktail)', when: 'T-10d', blocks: ['beverage_purchases'], why: 'June heat drives high consumption. Lead with the red drink + water + iced tea for everyone; a separate "grown" section keeps it family-welcoming.' },
    { id: 'shade', label: 'Shade + seating + heat plan (June, outdoor)', options: ['Existing patio/shade', 'Pop-up canopies + fans', 'Rent tent + tables + chairs', 'Park shelter / community space'], default: 'Pop-up canopies + fans', when: 'T-10d', blocks: ['rentals'], why: 'A mid-June afternoon cookout lives or dies on shade, seating, and water. Plan it up front so elders, kids, and the food all stay out of the sun.' },
  ],

  milestones: [
    { id: 'jt_setdate', name: 'Set date, headcount, menu, and how you\'ll honor the day', offsetDays: 21, owner: 'host', category: 'planning', risk: { ifDelayed: 'June 19 is fixed — late planning means rushed program + sold-out caterers/bakeries', severity: 'med' } },
    { id: 'jt_program', name: 'Plan the meaning/program element + line up who leads it', offsetDays: 18, owner: 'host', dependsOn: ['jt_setdate'], category: 'planning', risk: { ifDelayed: 'The reflection/reading gets skipped and the day loses its meaning', severity: 'high' } },
    { id: 'jt_source', name: 'Book Black-owned caterer/baker or confirm host-cooks plan', offsetDays: 16, owner: 'host', dependsOn: ['jt_setdate'], category: 'planning', risk: { ifDelayed: 'Black-owned bakeries/caterers book out for the holiday', severity: 'med' } },
    { id: 'jt_invite', name: 'Invite guests; assign potluck dishes/drinks if shared', offsetDays: 14, owner: 'host', dependsOn: ['jt_setdate'], category: 'guest', risk: { ifDelayed: 'Low RSVPs, duplicate dishes', severity: 'low' } },
    { id: 'jt_playlist', name: 'Build the music (Black artists across eras) + gather the readings', offsetDays: 7, owner: 'host', dependsOn: ['jt_program'], category: 'planning', risk: null },
    { id: 'jt_rsvp', name: 'Confirm headcount + check the June forecast', offsetDays: 4, owner: 'host', dependsOn: ['jt_invite'], category: 'guest', risk: { ifDelayed: 'Wrong protein quantity; no heat/rain plan', severity: 'med' } },
    { id: 'jt_shop_nonperish', name: 'Buy drinks, fuel, decor, disposables, heat/shade supplies', offsetDays: 3, owner: 'host', dependsOn: ['jt_rsvp'], category: 'shopping', risk: null },
    { id: 'jt_shop_fresh', name: 'Buy proteins, produce, watermelon, cake / red-drink ingredients', offsetDays: 1, owner: 'host', dependsOn: ['jt_rsvp'], category: 'shopping', risk: { ifDelayed: 'Sold-out ribs/watermelon near the holiday', severity: 'med' } },
    { id: 'jt_setup', name: 'Smoke/prep, set up shade, tables, decor, drink station', offsetDays: 0, owner: 'host', dependsOn: ['jt_shop_nonperish', 'jt_shop_fresh'], category: 'setup', risk: null },
    { id: 'event', name: 'The Juneteenth cookout', offsetDays: 0, owner: 'host', dependsOn: ['jt_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_program_plan', milestoneId: 'jt_program', phase: 'planning', label: 'Lock the MEANING MOMENT and who leads it: print the words of General Order No. 3 (or a short reflection / a kids\' history element), pick the person, and decide the libation. A named moment with an owner — not a maybe.', when: 'T-18d' },
    { id: 't_local', milestoneId: 'jt_program', phase: 'planning', label: 'Make it LOCAL, not anonymous: add your region’s own Black food + music tradition. DMV: go-go (Chuck Brown, Rare Essence, EU) + half-smokes + mumbo sauce (Capital City Mambo Sauce); Louisiana: zydeco + crawfish; Lowcountry: Gullah-Geechee red rice. Pick one local dish + a local playlist anchor.', when: 'T-12d' },
    { id: 't_source', milestoneId: 'jt_source', phase: 'planning', label: 'Find + book a Black-owned bakery/caterer (red velvet cake, red drink, mains) or confirm the cook-it-yourself plan — but keep the potato salad and one or two sides HAND-MADE at home; that’s the dish that says whose house this is', when: 'T-16d' },
    { id: 't_invite', milestoneId: 'jt_invite', phase: 'guest', label: 'Send invites; note it\'s a Juneteenth gathering; assign potluck dishes/drinks if shared', when: 'T-14d' },
    { id: 't_playlist', milestoneId: 'jt_playlist', phase: 'planning', label: 'Build a playlist celebrating Black artists (blues, soul, funk, hip-hop, gospel, contemporary); collect the reading/quotes', when: 'T-7d' },
    { id: 't_weather', milestoneId: 'jt_rsvp', phase: 'guest', label: 'Confirm headcount; check the forecast; LOCK the day-of plan with NAMES: who runs for ice (~2 lb/guest, more in 90°+ heat), who stakes AND weights the canopies (a June storm gusts hard), and the RAIN TRIGGER — at what forecast % you move under cover, and WHO makes that call.', when: 'T-4d' },
    { id: 't_nonperish_shop', milestoneId: 'jt_shop_nonperish', phase: 'shopping', label: 'Drinks, charcoal/wood/propane, red-black-green decor, disposables, sunscreen, bug spray, cleanup kit', when: 'T-3d' },
    { id: 't_reddrink', milestoneId: 'jt_shop_nonperish', phase: 'food', label: 'If making hibiscus/sorrel "red drink" from scratch, buy dried hibiscus + steep/sweeten ahead so it can chill', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'jt_shop_fresh', phase: 'shopping', label: 'Ribs, chicken, links, sides produce, watermelon, strawberries; pick up the cake', when: 'T-1d' },
    { id: 't_prep', milestoneId: 'jt_setup', phase: 'food', label: 'Rub/marinate proteins overnight; make cold sides + potato salad; chill the red drink + watermelon', when: 'T-1d evening' },
    { id: 't_smoke', milestoneId: 'event', phase: 'food', label: 'Start the smoke/grill early (ribs take hours); cook in batches; keep mains warm', when: 'T0 -4:00' },
    { id: 't_foodsafe', milestoneId: 'event', phase: 'event', label: 'FOOD SAFETY (name a cooler captain): keep potato salad, mac, deviled sides on ice; in 85°+ heat nothing perishable sits out past 2 hours — set a discard time. Separate platters + utensils for raw vs cooked meat; chicken to 165°F.', when: 'T0 -0:15' },
    { id: 't_elders', milestoneId: 'event', phase: 'event', label: 'Make the ELDERS’ plates FIRST — covered, walked over to shaded seats with a real glass of red drink, before the line opens. No grandmother stands in June heat in a line; give the kids the job of carrying them.', when: 'T0 +0:25' },
    { id: 't_moment', milestoneId: 'event', phase: 'event', label: 'THE MEANING MOMENT (before the first plates, ~5pm so it lands before the food coma): pause the music; the host or the eldest reads General Order No. 3 (Galveston, June 19, 1865) and names that freedom came two and a half years after the Emancipation Proclamation; pour a libation — a little red drink on the ground, or say the names of family no longer here; toast, then bless the food. One minute, a real voice — a named moment, not a maybe.', when: 'T0 +0:30' },
    { id: 't_togo', milestoneId: 'event', phase: 'event', label: 'Set out to-go containers / foil so everyone fixes a plate to take home — and make TWO EXTRA: one for a neighbor who’s alone, one for someone who couldn’t come. On Juneteenth the plate gets shared down the street.', when: 'T0 +3:30' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Cool + scrape the grill/smoker, pack leftovers, bag trash + recycling, fold chairs/canopies, take down decor', when: 'T0 +5:00' },
  ],

  purchases: [
    { id: 'p_ribs', item: 'Pork ribs (racks)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Butcher', 'Black-owned butcher/market', 'Costco'], unitCostRange: [4, 8], essential: true, buyAt: 'T-1d', whenChoice: { id: 'menu', in: ['Ribs + chicken + links + the sides', 'Mixed grill + seafood + the sides'] }, note: 'A Juneteenth/cookout centerpiece — plan ~1/2 rack of ribs per rib-eater; cuts smoke at ~30-40% weight loss.', alternatives: ['Pork shoulder — cheaper, feeds same crowd slow-smoked', 'Bone-in chicken thighs — budget swap, hard to overcook'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1/2 lb bone-in protein/guest across a multi-protein cookout spread.' } },
    { id: 'p_chicken', item: 'BBQ chicken (bone-in pieces)', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery', 'Butcher', 'Costco'], unitCostRange: [2, 5], essential: true, buyAt: 'T-1d', alternatives: ['Chicken drumsticks — lowest cost per lb, kid-friendly', 'Whole chicken cut up — cheaper per lb than quarters'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: 'Cookouts run multiple proteins; ~2 bone-in pieces/guest who chooses chicken.' } },
    { id: 'p_links', item: 'Smoked sausage / hot links', category: 'food', qtyPerGuest: 0.25, unit: 'lb', where: ['Grocery', 'Butcher', 'Black-owned market'], unitCostRange: [3, 6], essential: true, buyAt: 'T-1d', whenChoice: { id: 'menu', in: ['Ribs + chicken + links + the sides'] }, note: 'Hot links are a Texas Juneteenth staple — the holiday traces to Galveston. In the DMV, half-smokes (the DC sausage) bring the local touch alongside the links.' },
    { id: 'p_halfsmokes', item: 'Half-smokes (the DC sausage — split & griddled)', category: 'food', qtyPerGuest: 0.25, unit: 'lb', where: ['Grocery', 'Black-owned market', "Ben's Chili Bowl"], unitCostRange: [3, 6], essential: true, buyAt: 'T-1d', whenRegion: ['DMV'], note: 'The DMV local tell — half-smokes (coarse half-beef/half-pork) split and griddled with chili, mustard, onions. On the plate alongside the Texas hot links, it makes this unmistakably DMV Juneteenth.', provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Half-smokes are the documented DC sausage (Ben\'s Chili Bowl).' } },
    { id: 'p_mumbo', item: 'Mumbo / mambo sauce (DC carryout sauce)', category: 'food', qtyFlat: 2, unit: 'bottle', where: ['Grocery', 'Capital City Mambo Sauce (Black-owned)'], unitCostRange: [5, 9], essential: false, buyAt: 'T-3d', whenRegion: ['DMV'], note: 'DC\'s sweet-tangy-red carryout sauce on a side table for the chicken + fries — ideally Capital City Mambo Sauce (locally bottled, Black-owned).' },
    { id: 'p_brisket', item: 'Smoked brisket (whole packer)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Butcher', 'Black-owned butcher/market', 'Costco', 'Grocery'], unitCostRange: [5, 10], essential: true, buyAt: 'T-1d', whenChoice: { id: 'menu', in: ['Smoked brisket + chicken + the sides'] }, note: 'Low-and-slow brisket — ~1/2 lb raw/guest (loses ~40% on the smoke). Start it the night before.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1/2 lb raw protein/guest across a multi-protein cookout spread.' } },
    { id: 'p_seafood', item: 'Shrimp / fish for the grill', category: 'food', qtyPerGuest: 0.35, unit: 'lb', where: ['Seafood market', 'Black-owned seafood market', 'Grocery', 'Costco'], unitCostRange: [6, 14], essential: true, buyAt: 'T-1d', whenChoice: { id: 'menu', in: ['Mixed grill + seafood + the sides'] }, note: 'A coastal / Gullah-Geechee touch — shrimp skewers or whole fish on the grill. Buy fresh, day-of.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~1/3 lb seafood/guest as part of a mixed-grill spread.' } },
    { id: 'p_mac', item: 'Mac & cheese (the side that anchors the table)', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery', 'Black-owned caterer/bakery'], unitCostRange: [2, 4], essential: true, buyAt: 'T-1d', alternatives: ['Store-bought baked mac pan (Costco) — if short on time', 'Stovetop mac — faster, not the same; last resort'] },
    { id: 'p_beans', item: 'Baked beans / red beans', category: 'food', qtyPerGuest: 0.35, unit: 'lb', where: ['Grocery'], unitCostRange: [1, 3], essential: true, buyAt: 'T-1d', note: 'Red beans nod to the red-food symbolism while feeding a crowd cheaply.' },
    { id: 'p_greens', item: 'Collard greens', category: 'food', qtyPerGuest: 0.3, unit: 'lb', where: ['Grocery', 'Farmers market', 'Black-owned market'], unitCostRange: [1, 3], essential: true, buyAt: 'T-1d', note: 'A soul-food cornerstone of the spread.', alternatives: ['Mustard greens — milder, same cook method and price', 'Turnip greens — often cheaper, earthy flavor'] },
    { id: 'p_potatosalad', item: 'Potato salad', category: 'food', qtyPerGuest: 0.3, unit: 'lb', where: ['Grocery', 'Black-owned caterer'], unitCostRange: [1, 3], essential: true, buyAt: 'T-1d', alternatives: ['Deli potato salad — if the trusted cook is unavailable', 'Macaroni salad — similar cold starch role, easier to make large'] },
    { id: 'p_cornbread', item: 'Cornbread', category: 'food', qtyPerGuest: 1, unit: 'piece', where: ['Grocery', 'Bakery', 'Black-owned bakery'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-1d', alternatives: ['Jiffy cornbread mix — quick bake, same crowd appeal', 'Dinner rolls — if cornbread is sold out or time is short'] },
    { id: 'p_redvelvet', item: 'Red velvet cake (the symbolic red dessert)', category: 'food', qtyPer: 13, qtyFlat: 1, unit: 'cake', where: ['Black-owned bakery', 'Bakery', 'Grocery'], unitCostRange: [25, 55], essential: true, buyAt: 'T-1d', note: 'You buy cake by the cake, not the slice — about one 9" round per 12–15 guests, or a single sheet cake serves ~40. Red velvet carries the resilience/sacrifice symbolism — a natural buy from a Black-owned bakery to honor the day.', alternatives: ['One sheet cake (serves ~40) instead of rounds', 'Strawberry cake — still red, budget alternative if red velvet unavailable', 'Grocery red velvet sheet cake — cheaper, still symbolic'], provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Red velvet is a widely-documented Juneteenth red dessert.' } },
    { id: 'p_watermelon', item: 'Watermelon (red, symbolic + cooling)', category: 'food', qtyPerGuest: 0.6, unit: 'lb', where: ['Grocery', 'Farmers market'], unitCostRange: [0.3, 0.7], essential: true, buyAt: 'T-1d', note: 'Watermelon, native to Africa, is a symbolic red food and a heat-day favorite — served with dignity, it is a Juneteenth tradition, not a stereotype.', provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Documented as an early and enduring Juneteenth red food.' } },
    { id: 'p_strawberries', item: 'Strawberries (red garnish / fruit)', category: 'food', qtyPerGuest: 0.15, unit: 'lb', where: ['Grocery', 'Farmers market'], unitCostRange: [1, 3], essential: false, buyAt: 'T-1d' },
    { id: 'p_reddrink', item: 'Red drink (hibiscus/sorrel, strawberry soda, or punch)', category: 'beverage', qtyPerGuest: 3, unit: 'servings', where: ['Grocery', 'Black-owned beverage maker', 'Make from scratch'], unitCostRange: [0.5, 2], essential: true, buyAt: 'T-3d', note: 'The red drink is essential to Juneteenth — hibiscus/sorrel ties directly to West African roots. Lead with it for all ages.', provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Red drink (hibiscus/sorrel, strawberry, Big Red, punch) is a core Juneteenth tradition.' } },
    { id: 'p_water_tea', item: 'Water + iced tea / lemonade (heat hydration)', category: 'beverage', qtyPerGuest: 3, unit: 'servings', where: ['Grocery', 'Costco'], unitCostRange: [0.2, 0.8], essential: true, buyAt: 'T-3d', note: 'June heat — keep water and unsweet/sweet tea flowing for elders and kids.' },
    { id: 'p_grown', item: 'Grown-folks drinks (beer, wine, or a batch cocktail)', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery', 'Liquor store', 'Black-owned spirits/wine brand'], unitCostRange: [1.5, 4], essential: false, buyAt: 'T-3d', note: 'Keep separate from the family drinks so the cookout stays welcoming to all ages.' },
    { id: 'p_ice', item: 'Ice (coolers + drinks, heat-adjusted)', category: 'beverage', qtyPerGuest: 2, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~2 lb/guest for outdoor June coolers — it melts fast in the heat.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~2 lb ice/guest for outdoor cooler service in summer heat.' } },
    { id: 'p_fuel', item: 'Charcoal / smoking wood / propane + lighter', category: 'logistics', qtyFlat: 1, unit: 'supply', where: ['Grocery', 'Hardware store', 'Gas station'], unitCostRange: [20, 45], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: ribs need hours of fuel — check the tank or buy enough charcoal/wood. Out of fuel = no mains.' },
    { id: 'p_decor', item: 'Red / black / green (Pan-African) decor — tablecloths, ribbon, flags, banner', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Amazon', 'Black-owned decor shop'], unitCostRange: [20, 60], essential: false, buyAt: 'T-3d', note: 'Red-black-green tastefully — table runners, a Juneteenth/Pan-African banner. Restraint reads as dignity, not decoration overload.', provenance: { tier: 'cultural-tradition', confidence: 'medium', verificationStatus: 'established-consensus', note: 'Red/black/green is the Pan-African color set commonly used for Juneteenth.' } },
    { id: 'p_heat', item: 'Sunscreen, bug spray, citronella, extra fans', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Pharmacy', 'Hardware store'], unitCostRange: [15, 40], essential: true, buyAt: 'T-3d', note: 'June afternoon — sun + mosquitoes + heat. Shade and airflow keep elders and kids comfortable.' },
    { id: 'p_tableware', item: 'Disposable plates, cups, napkins, cutlery', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.3, 1], essential: true, buyAt: 'T-3d' },
    { id: 'p_togo', item: 'To-go containers / foil for guests\' plates', category: 'logistics', qtyPerGuest: 1, unit: 'container', where: ['Grocery', 'Restaurant supply', 'Costco'], unitCostRange: [0.2, 0.6], essential: true, buyAt: 'T-3d', note: 'Sending everyone home with a plate is a cookout tradition — have containers ready.' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels, foil', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 18], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a recycling bag for cans/bottles + foil to wrap leftovers and to-go plates.' },
  ],

  rentalsGap: [
    { item: 'Coolers', qtyPerGuest: 0.12, note: 'roughly one large cooler per ~8 guests — separate the "red drink"/family cooler from the "grown" cooler' },
    { item: 'Folding chairs', qtyPerGuest: 0.9, note: 'seating for a 5-hour day — make sure elders have shaded chairs' },
    { item: 'Pop-up canopies (10x10)', qtyPerGuest: 0.04, note: 'shade is non-negotiable in June — roughly one canopy per ~25 guests plus one over the food' },
    { item: 'Folding tables', qtyFlat: 4, note: 'food spread, drinks station, dessert/red-table, and a spot for the program/readings' },
  ],

  vendors: [
    { category: 'Black-owned caterer / BBQ pitmaster', required: false, altToDIY: 'Host smokes the mains', when: 'T-16d', costRange: [15, 30], costUnit: 'per guest' },
    { category: 'Black-owned bakery (red velvet cake / desserts)', required: false, altToDIY: 'Bake or buy grocery cake', when: 'T-14d', costRange: [30, 90], costUnit: 'flat' },
    { category: 'Tent / canopy rental', required: false, altToDIY: 'Own/borrow pop-up canopies', when: 'T-10d', costRange: [80, 250], costUnit: 'flat' },
    { category: 'Chair / table rental', required: false, altToDIY: 'Borrow folding chairs/tables', when: 'T-10d', costRange: [60, 180], costUnit: 'flat' },
    { category: 'DJ / live musician (Black artists)', required: false, altToDIY: 'Host playlist on a speaker', when: 'T-14d', costRange: [200, 600], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_meaning_skipped', trigger: 'The day runs as just a party and the freedom history is never marked', severity: 'high', mitigation: 'Lock the meaning moment at T-18d and assign someone to lead it; build the reflection into the timeline right before the meal so it can\'t get lost.' },
    { id: 'r_heat', trigger: 'Mid-June heat with no shade, water, or rain plan', severity: 'high', mitigation: 'Confirm shade + fans + water at T-4d; shade the food and the elders; have a canopy/indoor fallback for rain or extreme heat.' },
    { id: 'r_fuel', trigger: 'Out of charcoal/wood or empty propane — ribs need hours', severity: 'high', mitigation: 'Check + buy fuel at T-3d; keep a spare bag/tank; start the smoke early.' },
    { id: 'r_foodsafe', trigger: 'Perishables (potato salad, mac, meats) sit out in the heat, or raw meat cross-contaminates cooked', severity: 'high', mitigation: 'Keep cold sides on ice; don\'t leave perishables out >1h above 90°F; grill chicken to 165°F; restock the buffet in waves. Use separate platters/utensils for raw vs cooked meat; never reuse raw-meat marinade as sauce unless boiled first.' },
    { id: 'r_sourcing', trigger: 'Black-owned caterer/bakery booked out near the holiday', severity: 'med', mitigation: 'Book by T-16d; have a host-cooks or grocery-cake fallback identified.' },
    { id: 'r_ice', trigger: 'Ice melts, red drink and grown section go warm', severity: 'med', mitigation: 'Buy ~2 lb ice/guest day-of; keep a shaded backup cooler.' },
    { id: 'r_caricature', trigger: 'Decor or theming drifts into caricature / stereotype', severity: 'med', mitigation: 'Keep red-black-green restrained and dignified; center heritage, history, and quality food — never costume or kitsch.' },
  ],

  contingencies: [
    { id: 'c_meaning', when: 'r_meaning_skipped', plan: 'If the program slips, pause the music, gather everyone for 3-5 minutes before dessert, read the short Juneteenth history or a reflection, then continue — a brief, sincere moment is enough.' },
    { id: 'c_heat', when: 'r_heat', plan: 'Pop extra canopies, run fans, move chairs/elders into shade, push water/red drink hard; if storms or extreme heat hit, shift the spread to the garage/indoors.' },
    { id: 'c_fuel', when: 'r_fuel', plan: 'Send someone for charcoal/wood or a swap propane tank; finish ribs in the oven if the fire dies.' },
    { id: 'c_foodsafe', when: 'r_foodsafe', plan: 'Stage cold dishes over ice trays and bring perishables out in waves rather than all at once; refrigerate anything sitting too long.' },
    { id: 'c_sourcing', when: 'r_sourcing', plan: 'Fall back to host-cooked mains + a grocery red velvet cake; you can still support a Black-owned business with the red drink or a side.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-14d', what: 'Book Black-owned caterer/bakery if going that route; reserve canopies/tables if renting' },
      { when: 'T-3d', what: 'Drinks (red drink, water, tea, grown section), fuel/wood, decor, disposables, to-go containers, heat/bug supplies, cleanup kit; start scratch hibiscus "red drink"' },
      { when: 'T-1d', what: 'Ribs, chicken, links, sides produce, watermelon, strawberries; pick up the cake' },
      { when: 'T0', what: 'Ice (lots) + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Rub/marinate proteins; make cold sides + potato salad; chill the red drink + watermelon; check fuel + smoker' },
      { when: 'T0 -4h', what: 'Start the smoke/grill for ribs; stage the program/readings near the food' },
    ],
    setup: [
      { when: 'T0 -2h', what: 'Raise canopies/shade, set out tables (food, drinks, red-table/dessert, program), arrange chairs in shade' },
      { when: 'T0 -1h', what: 'Coolers + ice (family vs grown), drink station with red drink front and center, red-black-green decor, music on' },
      { when: 'T0 -0:30', what: 'Set out warm mains + sides in waves, dessert/red-table staged, to-go containers nearby, trash + recycling bins out' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep cold sides on ice; restock buffet in waves; bag cans for recycling as you go' },
      { when: 'T0 +3:30', what: 'Put out to-go containers/foil so guests can fix a plate to take home' },
      { when: 'T0 +5h', what: 'Cool + scrape the grill/smoker, pack leftovers, bag trash/recycling, fold chairs/canopies, take down decor' },
    ],
  },

  // Day-of "Before the big day" readiness/safety walkthrough — authored for an
  // OUTDOOR Juneteenth cookout: grill-forward, kids, alcohol, June heat.
  // severity drives ordering; state persists in event.safetyChecked[id].
  dayOfChecklist: [
    { id: 'weather', label: 'Heat / rain plan', detail: 'Shade and a rain fallback ready — a June cookout in full sun needs canopies, water, and a backup if the weather turns.', severity: 'high' },
    { id: 'food', label: 'Food safety', detail: 'Cold sides on ice, hot food held, nothing perishable out more than ~1h in the heat. Grill every protein to a safe temp.', severity: 'high' },
    { id: 'grill', label: 'Grill / fire safety', detail: 'Fuel checked, extinguisher or hose within reach, grill stable and clear of the house — never left unattended.', severity: 'high' },
    { id: 'child', label: 'Child safety', detail: 'A watcher for the grill and any water play; kids kept clear of the hot pit and coolers.', severity: 'high' },
    { id: 'power', label: 'Power & outlets', detail: "Speakers, lights, and warmers spread across circuits — don't overload one outdoor outlet.", severity: 'med' },
    { id: 'trash', label: 'Trash + recycling station', detail: 'Heavy-duty bags staged, a recycling bag for cans/bottles, and foil/containers for the to-go plates.', severity: 'med' },
    { id: 'alcohol', label: 'Alcohol plan', detail: 'A loose cutoff, water out alongside, and a ride-home plan so everyone gets home safe.', severity: 'med' },
    { id: 'emergency', label: 'Emergency basics', detail: 'First-aid kit on hand; know the nearest ER; phones charged.', severity: 'low' },
  ],

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Juneteenth (June 19) commemorates the 1865 arrival of Union troops in Galveston, Texas enforcing the Emancipation Proclamation and freeing the last enslaved Black Americans — it became a U.S. federal holiday in 2021. This playbook honors that freedom/history meaning: it front-loads a meaning/program element (a reading of the history, a moment of reflection, a kids\' education element, music celebrating Black artists, or sourcing from Black-owned businesses) so the day is remembered, not just enjoyed. It centers the documented RED-food symbolism — red drink (hibiscus/sorrel, strawberry, Big Red, punch), watermelon, red velvet cake, red beans — where red signifies resilience and the bloodshed/sacrifice of the enslaved, and reflects red as a sacred color in West African (Yoruba/Kongo) heritage carried to Texas. The full cookout spread (ribs, chicken, hot links, mac & cheese, baked beans, collard greens, potato salad, cornbread) reflects widely-celebrated Juneteenth and soul-food tradition. This is intended as respectful insider practice, dignity-first, with no caricature or stereotype. Cookout quantities reflect common US rules of thumb (~0.6-0.75 lb total protein/guest across a multi-protein spread, ~1 drink/guest/hour in heat, ~2 lb ice/guest outdoor) and food-safety guidance reflects widely-published USDA-style practice. Authored as established-consensus / cultural-tradition / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default juneteenthCookout;
