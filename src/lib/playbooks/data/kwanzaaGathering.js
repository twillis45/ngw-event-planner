// Kwanzaa Gathering — Event OS host playbook (data only).
//
// Kwanzaa is a Pan-African cultural celebration created in 1966 by Dr. Maulana
// Karenga, observed Dec 26 – Jan 1. It is CULTURAL, not religious — celebrated
// across faiths — and honors African American and African heritage, family, and
// community through the Nguzo Saba (Seven Principles): Umoja (unity),
// Kujichagulia (self-determination), Ujima (collective work & responsibility),
// Ujamaa (cooperative economics), Nia (purpose), Kuumba (creativity), and Imani
// (faith). Each evening a candle is lit on the kinara and that day's principle
// is discussed. This playbook treats a home-hosted Kwanzaa gathering as what it
// is: a candle-lighting + principle discussion that, on Dec 31, becomes the
// Karamu — the big communal "feast of faith" (Karamu Ya Imani) drawing on
// Pan-African, African American, and Caribbean diaspora cooking. It centers the
// SEVEN symbols, the libation honoring ancestors, the red/black/green colors,
// and homemade/heritage/educational gifts (zawadi) over commercial ones.
// Families observe differently — single-night vs full week, host vs potluck,
// secular vs alongside faith. Authored dignity-first, insider-respectful, with
// no caricature. Labeled `synthesized`; NO fabricated sources. ESM default export.

const kwanzaaGathering = {
  type: 'Kwanzaa Gathering',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A home-hosted Kwanzaa gathering — the Pan-African cultural celebration (Dec 26–Jan 1; created 1966 by Dr. Maulana Karenga; cultural, not religious) honoring African American and African heritage through the Nguzo Saba, the Seven Principles. The evening centers on the candle-lighting ceremony: the kinara (candle holder) holds the mishumaa saba (seven candles — one black, three red, three green), set on the mkeka (mat) alongside mazao (crops/fruit), muhindi (an ear of corn per child), the kikombe cha umoja (unity cup), and zawadi (gifts, ideally handmade/heritage/educational). A candle is lit and that night\'s principle — Umoja, Kujichagulia, Ujima, Ujamaa, Nia, Kuumba, or Imani — is read and discussed, with a libation honoring the ancestors. On Dec 31 the gathering becomes the Karamu, the communal "feast of faith" drawing on Pan-African, African American, and Caribbean diaspora cooking. The playbook front-loads the program (who leads the principle), whether it\'s a single night or the Karamu feast, and the symbols, so the meaning leads and the host can still enjoy it.',
    typicalGuests: { low: 6, default: 14, high: 30 },
    typicalDurationHours: 3,
    leadTimeDays: 21,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 12, high: 40, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The kinara is lit and the principle is read and the room holds its breath.',
    'A child lights their first candle and says the principle by heart.',
    'The libation is poured and the names of the ancestors are spoken aloud.',
    'The table at Karamu — every family brought something and it shows.',
    'A gift (zawadi) that took real thought is opened by the one it was made for.',
  ],

  decisions: [
    { id: 'occasion', label: 'A single-night gathering or the Karamu feast (Dec 31)?', options: ['Single principle night (intimate candle-lighting + discussion + light food)', 'The Karamu feast on Dec 31 (the big communal meal)', 'Several nights through the week, building to Karamu', 'A first-Kwanzaa introduction for friends new to it'], default: 'The Karamu feast on Dec 31 (the big communal meal)', when: 'T-21d', blocks: ['food', 'program', 'rentals'], why: 'This is the biggest fork. A weeknight principle gathering is a candle-lighting, a reading, a discussion, and light food — low effort, deep meaning. The Karamu (Karamu Ya Imani, Dec 31) is the major communal feast and carries a full Pan-African/diaspora spread, a fuller program, and more guests. Decide which one you\'re hosting before anything else.' },
    { id: 'program', label: 'Who leads the principle discussion + the libation?', options: ['Host or an elder leads the reading + libation', 'Each guest takes one principle / one night', 'Children read the principle and light the candle', 'A guest cultural-bearer or community elder leads', 'Weave readings, a libation, music, and reflection together'], default: 'Host or an elder leads the reading + libation', when: 'T-18d', blocks: ['program'], why: 'The candle-lighting and the discussion of the night\'s Nguzo Saba principle are the heart of Kwanzaa — not the food. Naming who lights the candle, reads the principle, and pours the libation (traditionally an elder, often inviting children to take part) is what makes it Kwanzaa and not just a dinner. Decide it early and assign it.' },
    { id: 'symbols', label: 'The Seven Symbols (the mkeka setting)', options: ['Own/borrow a kinara + mkeka + unity cup (reuse yearly)', 'Buy a kinara set + candles + corn this year', 'Host arranges the symbols; guests bring mazao (fruit/crops)', 'Make/craft pieces (Kuumba — creativity) where you can'], default: 'Host arranges the symbols; guests bring mazao (fruit/crops)', when: 'T-14d', blocks: ['decor', 'symbol_purchases'], why: 'The Seven Symbols anchor the table: the mkeka (mat), the kinara (candle holder), the mishumaa saba (seven candles — 1 black, 3 red, 3 green), the muhindi (an ear of corn for each child in the home), the kikombe cha umoja (unity cup), the mazao (crops/fruit), and the zawadi (gifts). Confirm which you own and what to buy — the kinara, mat, and unity cup are reused every year.' },
    { id: 'gifts', label: 'Zawadi (gifts) approach', options: ['Handmade / crafted gifts (Kuumba)', 'Heritage + educational gifts — books, art, African-made goods', 'Children only — a book + a heritage symbol each', 'Source from Black-owned makers / businesses (Ujamaa)', 'No gifts this gathering — focus on the principles'], default: 'Heritage + educational gifts — books, art, African-made goods', when: 'T-14d', blocks: ['gifts'], why: 'Zawadi are traditionally meaningful, not commercial — handmade, heritage, or educational, especially for children (a book, a piece of art, a heritage symbol). This both honors Kuumba (creativity) and, when sourced from Black-owned makers, lives out Ujamaa (cooperative economics). Decide the approach so it isn\'t a last-minute commercial scramble.' },
    { id: 'food', label: 'The Karamu / gathering spread', options: ['Host cooks the spread', 'Potluck — each family brings a heritage dish', 'Host cooks the mains, guests bring sides + desserts', 'Source key dishes from Black-owned cooks/caterers (Ujamaa)'], default: 'Potluck — each family brings a heritage dish', when: 'T-14d', blocks: ['food', 'vendors'], why: 'Kwanzaa centers community and shared responsibility (Ujima), so a potluck where each family brings a dish that carries their heritage — Pan-African, African American Southern, Caribbean — is deeply fitting and cuts host load. For the Karamu especially, the table is meant to be communal and abundant.' },
  ],

  milestones: [
    { id: 'kw_setdate', name: 'Set the night(s), headcount, and single-night vs Karamu', offsetDays: 21, owner: 'host', category: 'planning', risk: { ifDelayed: 'Dec 26–Jan 1 is fixed and falls in a packed holiday week — late planning means scheduling clashes', severity: 'med' } },
    { id: 'kw_program', name: 'Plan the candle-lighting + principle program; assign who leads it', offsetDays: 18, owner: 'host', dependsOn: ['kw_setdate'], category: 'planning', risk: { ifDelayed: 'The reading/discussion gets skipped and the gathering loses its meaning', severity: 'high' } },
    { id: 'kw_symbols', name: 'Confirm the Seven Symbols — what you own vs need to buy', offsetDays: 14, owner: 'host', dependsOn: ['kw_setdate'], category: 'planning', risk: { ifDelayed: 'No kinara/candles on the night — the ceremony can\'t happen as intended', severity: 'high' } },
    { id: 'kw_gifts', name: 'Decide + start zawadi (handmade/heritage/educational)', offsetDays: 14, owner: 'host', dependsOn: ['kw_setdate'], category: 'planning', risk: { ifDelayed: 'Handmade/heritage gifts need lead time; rushed = commercial', severity: 'low' } },
    { id: 'kw_invite', name: 'Invite guests; assign potluck heritage dishes if shared', offsetDays: 14, owner: 'host', dependsOn: ['kw_setdate'], category: 'guest', risk: { ifDelayed: 'Low RSVPs, duplicate dishes, gaps in the spread', severity: 'low' } },
    { id: 'kw_rsvp', name: 'Confirm headcount + final menu/potluck assignments', offsetDays: 4, owner: 'host', dependsOn: ['kw_invite'], category: 'guest', risk: { ifDelayed: 'Wrong food quantity; gaps in the Karamu spread', severity: 'med' } },
    { id: 'kw_shop_nonperish', name: 'Buy candles, corn, decor, drinks, disposables, cleanup', offsetDays: 3, owner: 'host', dependsOn: ['kw_rsvp'], category: 'shopping', risk: { ifDelayed: 'Kinara candles (1 black/3 red/3 green) sell out late December', severity: 'med' } },
    { id: 'kw_shop_fresh', name: 'Buy proteins, produce, mazao (fruit/crops), bakery items', offsetDays: 1, owner: 'host', dependsOn: ['kw_rsvp'], category: 'shopping', risk: { ifDelayed: 'Sold-out fresh items in the holiday week', severity: 'med' } },
    { id: 'kw_setup', name: 'Cook/prep; set the mkeka, kinara + symbols; set the table', offsetDays: 0, owner: 'host', dependsOn: ['kw_shop_nonperish', 'kw_shop_fresh'], category: 'setup', risk: null },
    { id: 'event', name: 'The Kwanzaa gathering — candle-lighting, principle, libation, meal', offsetDays: 0, owner: 'host', dependsOn: ['kw_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_program_plan', milestoneId: 'kw_program', phase: 'planning', label: 'Choose the night\'s principle (or the order across nights); print/save the reading + a question or two for discussion; ask the elder/host/children who will light the candle and pour the libation', when: 'T-18d' },
    { id: 't_symbols_check', milestoneId: 'kw_symbols', phase: 'planning', label: 'Lay out the Seven Symbols you own (mkeka, kinara, unity cup); list what to buy — mishumaa saba candles, muhindi (corn), fresh mazao', when: 'T-14d' },
    { id: 't_gifts', milestoneId: 'kw_gifts', phase: 'planning', label: 'Plan zawadi — handmade, a heritage book/art, or sourced from Black-owned makers; start anything that needs making', when: 'T-14d' },
    { id: 't_invite', milestoneId: 'kw_invite', phase: 'guest', label: 'Send invites; note it\'s a Kwanzaa gathering and which principle/night; assign potluck heritage dishes if shared', when: 'T-14d' },
    { id: 't_music', milestoneId: 'kw_program', phase: 'planning', label: 'Gather music (African, African American, and diaspora traditions) and any drumming/dance for the Karamu; keep volume low during the reading', when: 'T-7d' },
    { id: 't_confirm', milestoneId: 'kw_rsvp', phase: 'guest', label: 'Confirm headcount; lock potluck assignments so the spread has no gaps', when: 'T-4d' },
    { id: 't_nonperish_shop', milestoneId: 'kw_shop_nonperish', phase: 'shopping', label: 'Mishumaa saba candles (1 black, 3 red, 3 green), muhindi (corn), red/black/green decor, drinks, disposables, cleanup kit', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'kw_shop_fresh', phase: 'shopping', label: 'Proteins, sides produce, mazao (fruit/crops for the table), bakery desserts, juice/cider for the libation + unity cup', when: 'T-1d' },
    { id: 't_prep', milestoneId: 'kw_setup', phase: 'food', label: 'Cook stews/one-pot dishes a day ahead (they hold and reheat well); make cold sides; arrange the mazao bowl', when: 'T-1d evening' },
    { id: 't_settable', milestoneId: 'kw_setup', phase: 'setup', label: 'Lay the mkeka; set the kinara with the mishumaa saba (black center, three red left, three green right); place muhindi (one ear per child), mazao, the unity cup, and the zawadi', when: 'T0 -1:30' },
    { id: 't_ceremony', milestoneId: 'event', phase: 'event', label: 'BEFORE the meal: gather everyone, pour the libation honoring the ancestors, pass the unity cup, light the candle(s), read the principle, and open it for discussion — the meaning leads, then the meal', when: 'T0 +0:20' },
    { id: 't_gifts_give', milestoneId: 'event', phase: 'event', label: 'Share the zawadi — especially with the children — tying each to a principle or to heritage', when: 'T0 +1:30' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Safely extinguish the candles, pack leftovers, bag trash + recycling, store the kinara/mkeka/unity cup for next year, return borrowed dishes', when: 'T0 +3:00' },
  ],

  purchases: [
    { id: 'p_candles', item: 'Mishumaa saba — seven Kwanzaa candles (1 black, 3 red, 3 green)', category: 'decor', qtyFlat: 7, unit: 'candles', where: ['Party store', 'African/cultural shop', 'Black-owned shop', 'Amazon'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', note: 'The candle set is non-negotiable for the ceremony: one black (Umoja, center), three red (left), three green (right). Buy early — Kwanzaa candle sets sell out in late December.', provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Mishumaa saba = 7 candles, 1 black / 3 red / 3 green, lit one per night.' } },
    { id: 'p_kinara', item: 'Kinara (candle holder) — if not owned', category: 'decor', qtyFlat: 1, unit: 'holder', where: ['African/cultural shop', 'Black-owned shop', 'Amazon', 'Handmade'], unitCostRange: [15, 50], essential: true, buyAt: 'T-3d', note: 'Reused every year — buy/borrow once. The kinara represents the ancestral roots from which the culture rises. Crafting one honors Kuumba.', provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Kinara holds the seven candles; a reusable, often heirloom, symbol.' } },
    { id: 'p_mkeka', item: 'Mkeka (mat — often kente/woven) — if not owned', category: 'decor', qtyFlat: 1, unit: 'mat', where: ['African/cultural shop', 'Black-owned shop', 'Amazon'], unitCostRange: [10, 40], essential: false, buyAt: 'T-3d', note: 'The foundation the other symbols rest on — tradition and history as the ground to build on. Reused yearly.', provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Mkeka is the mat symbolizing the foundation of tradition/history.' } },
    { id: 'p_muhindi', item: 'Muhindi — ears of corn (one per child in the home; at least one)', category: 'decor', qtyFlat: 2, unit: 'ears', where: ['Grocery', 'Farmers market'], unitCostRange: [0.5, 2], essential: true, buyAt: 'T-1d', note: 'One ear per child to represent the children and the future; if no children, at least one ear stands for the community\'s children. Decorative dried/Indian corn works and keeps.', provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Muhindi = ears of corn, one per child, symbolizing children/future.' } },
    { id: 'p_unitycup', item: 'Kikombe cha umoja — unity cup (if not owned)', category: 'decor', qtyFlat: 1, unit: 'cup', where: ['African/cultural shop', 'Black-owned shop', 'Home'], unitCostRange: [10, 35], essential: true, buyAt: 'T-3d', note: 'Used for the libation honoring the ancestors and passed for all to share — the unity of family and African people. A meaningful cup you own works; many keep an heirloom one.', provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Kikombe cha umoja = unity cup for the libation (tambiko) and shared toast.' } },
    { id: 'p_mazao', item: 'Fresh fruit & vegetables (the mazao / harvest display) — apples, oranges, bananas, gourds, nuts', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Farmers market'], unitCostRange: [0.5, 2], essential: true, buyAt: 'T-1d', note: 'Real produce for the mazao — a bowl/basket of fruit and crops symbolizing the harvest, collective work, and the rewards of community. Doubles as the centerpiece and a healthy snack.', provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Mazao = crops/fruit honoring the African "first fruits" harvest roots of Kwanzaa.' } },
    { id: 'p_libation', item: 'Libation + unity-cup pour (juice, cider, or wine)', category: 'beverage', qtyFlat: 1, unit: 'bottle', where: ['Grocery', 'Liquor store'], unitCostRange: [5, 15], essential: true, buyAt: 'T-1d', note: 'Poured from the unity cup to honor the ancestors (tambiko), then shared. Juice or cider keeps it all-ages; many families use a small pour of wine for the elder.', provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Tambiko = libation poured from the kikombe cha umoja to honor ancestors.' } },
    { id: 'p_mains', item: 'Karamu mains — chicken, fish, oxtail or jollof/jerk proteins (for gumbo, jollof rice, jerk chicken, oxtail, jambalaya)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Black-owned market', 'Caterer'], unitCostRange: [3, 8], essential: true, buyAt: 'T-1d', note: 'The Karamu spread blends Pan-African, African American Southern, and Caribbean cooking — buy the proteins for warming, communal, one-pot dishes that serve a crowd and hold well.', alternatives: ['Jollof rice with chicken — cheaper than oxtail, feeds large crowd easily', 'Bean stew (kidney or black-eyed peas) — budget-friendly, vegetarian option'], provenance: { tier: 'cultural-tradition', confidence: 'medium', verificationStatus: 'established-consensus', note: 'Karamu menus draw on diaspora one-pot/stew dishes; ~0.5 lb main protein/guest heuristic.' } },
    { id: 'p_blackeyedpeas', item: 'Black-eyed peas (good fortune)', category: 'food', qtyPerGuest: 0.3, unit: 'lb', where: ['Grocery'], unitCostRange: [0.5, 2], essential: true, buyAt: 'T-1d', note: 'A Karamu cornerstone — black-eyed peas symbolize good luck and tie the New Year\'s table to the feast.', provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Black-eyed peas widely documented as an essential Karamu/good-luck dish.' } },
    { id: 'p_greens', item: 'Collard greens (prosperity)', category: 'food', qtyPerGuest: 0.3, unit: 'lb', where: ['Grocery', 'Farmers market', 'Black-owned market'], unitCostRange: [1, 3], essential: true, buyAt: 'T-1d', note: 'Stewed greens symbolize good fortune/wealth — alongside black-eyed peas, the two most essential Karamu foods.', alternatives: ['Mustard or turnip greens — same symbolism, often cheaper', 'Kale — if collards unavailable, cooks similarly'], provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Collard greens widely documented as an essential Karamu dish.' } },
    { id: 'p_sides', item: 'Sides — rice & peas, candied yams, mac & cheese, cornbread, plantains', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Black-owned market'], unitCostRange: [1, 4], essential: true, buyAt: 'T-1d', note: 'The sides carry the diaspora table — Southern, Caribbean, and West African in one spread.', alternatives: ['Frozen plantains (Goya) — if fresh unavailable, thaw and pan-fry', 'Canned yams + brown sugar — budget candied yam shortcut'] },
    { id: 'p_dessert', item: 'Sweet potato pie or benne cakes (Karamu dessert)', category: 'food', qtyPer: 8, qtyFlat: 1, unit: 'pie', where: ['Grocery', 'Bakery', 'Black-owned bakery'], unitCostRange: [8, 22], essential: true, buyAt: 'T-1d', note: 'You buy dessert by the pie, not the slice — about one 9" sweet potato pie per ~8 guests. Sweet potato pie is the classic close (benne/sesame cakes are a Gullah-Geechee diaspora option); a Black-owned bakery is a meaningful (Ujamaa) source.', alternatives: ['Canned sweet potato pie filling + store-bought shell — budget version', 'Grocery sheet cake — if bakery is unavailable or budget is tight'] },
    { id: 'p_drinks', item: 'Sorrel / hibiscus drink, juice & water', category: 'beverage', qtyPerGuest: 3, unit: 'bottles', where: ['Grocery', 'Black-owned beverage maker'], unitCostRange: [0.5, 2], essential: true, buyAt: 'T-3d', note: 'Sorrel (hibiscus) is a beloved Caribbean holiday drink and a fitting all-ages option. Plan ~3 bottles/cans of drink per guest over a ~3h gathering — mix juice, sorrel, water, and tea.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'established-consensus', note: '~3 drinks/guest over a ~3h indoor gathering.' } },
    { id: 'p_decor', item: 'Red / black / green decor — tablecloth, candles, kente accents, banner', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'African/cultural shop', 'Black-owned shop', 'Amazon'], unitCostRange: [15, 50], essential: false, buyAt: 'T-3d', note: 'Red/black/green is the Pan-African color set — keep it tasteful and dignified; the symbols, not heavy decoration, lead the table.', provenance: { tier: 'cultural-tradition', confidence: 'high', verificationStatus: 'established-consensus', note: 'Red/black/green are the recognized Kwanzaa/Pan-African colors.' } },
    { id: 'p_zawadi', item: 'Zawadi — gifts (handmade, heritage books/art, educational, especially for children)', category: 'logistics', qtyPerGuest: 0.4, unit: 'gift', where: ['Handmade', 'Black-owned makers', 'Bookstore', 'African/cultural shop'], unitCostRange: [5, 30], essential: false, buyAt: 'T-3d', note: 'Traditionally meaningful, not commercial — a book, art, a heritage symbol, or something handmade (Kuumba); sourcing from Black-owned makers lives out Ujamaa.', provenance: { tier: 'cultural-tradition', confidence: 'medium', verificationStatus: 'established-consensus', note: 'Zawadi favor handmade/heritage/educational gifts, esp. for children.' } },
    { id: 'p_tableware', item: 'Plates, cups, napkins, cutlery (or set the good dishes)', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Party store', 'Home'], unitCostRange: [0.3, 1], essential: true, buyAt: 'T-3d', note: 'A sit-down Karamu often uses real dishes; disposables are fine for a larger or casual gathering.' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels, foil, to-go containers', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 18], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: recycling for bottles/cans + foil/containers so guests can take a plate of the Karamu home.' },
  ],

  rentalsGap: [
    { item: 'Folding chairs', qtyPerGuest: 0.6, note: 'seating for a sit-down gathering — make sure elders have comfortable seats near the kinara' },
    { item: 'Folding tables', qtyFlat: 2, note: 'one for the symbols/mkeka centerpiece, one for the food spread (more for a large Karamu)' },
    { item: 'Serving dishes / chafing setup', qtyFlat: 3, note: 'for a buffet-style Karamu — keep stews and sides warm for a crowd' },
    { item: 'Extra place settings / unity cup', qtyFlat: 1, note: 'a dedicated unity cup and enough settings for everyone to share at the table' },
  ],

  vendors: [
    { category: 'Black-owned caterer / heritage cook', required: false, altToDIY: 'Host cooks or potluck', when: 'T-14d', costRange: [12, 25], costUnit: 'per guest' },
    { category: 'Black-owned bakery (sweet potato pie / desserts)', required: false, altToDIY: 'Bake or buy grocery dessert', when: 'T-10d', costRange: [25, 80], costUnit: 'flat' },
    { category: 'African/cultural shop (kinara, mkeka, unity cup, candles)', required: false, altToDIY: 'Reuse owned symbols or craft them (Kuumba)', when: 'T-14d', costRange: [40, 150], costUnit: 'flat' },
    { category: 'Drummer / dancer / cultural performer (Karamu)', required: false, altToDIY: 'Host playlist of African + diaspora music', when: 'T-14d', costRange: [150, 500], costUnit: 'flat' },
    { category: 'Chair / table / serving rental', required: false, altToDIY: 'Borrow chairs, tables, serving dishes', when: 'T-10d', costRange: [50, 180], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_meaning_skipped', trigger: 'It runs as just a dinner and the candle-lighting / principle discussion never happens', severity: 'high', mitigation: 'Lock the program at T-18d and assign who lights the candle, reads the principle, and pours the libation; build the ceremony into the timeline right before the meal so it can\'t get lost.' },
    { id: 'r_symbols_missing', trigger: 'No kinara or the right candles on the night — the ceremony can\'t happen as intended', severity: 'high', mitigation: 'Confirm the Seven Symbols at T-14d and buy candles by T-3d (sets sell out late December); have a borrow/backup plan for the kinara and unity cup.' },
    { id: 'r_candle_safety', trigger: 'Seven open flames near children, fabric (mkeka), and a crowded table', severity: 'med', mitigation: 'Place the kinara on a stable, heat-safe surface away from edges and reach of small children; never leave lit candles unattended; extinguish before guests leave.' },
    { id: 'r_respect', trigger: 'Theming or "explaining" Kwanzaa drifts into caricature, or it\'s framed as religious', severity: 'med', mitigation: 'Keep it dignity-first: Kwanzaa is cultural, not religious, created by Dr. Maulana Karenga in 1966; center the principles, the ancestors, and heritage; keep red/black/green restrained — never costume or kitsch.' },
    { id: 'r_commercial_gifts', trigger: 'Zawadi default to last-minute commercial gifts, against the spirit of the day', severity: 'low', mitigation: 'Decide the gift approach at T-14d; favor handmade (Kuumba), heritage/educational, or Black-owned-sourced (Ujamaa) — especially for children.' },
    { id: 'r_food_gaps', trigger: 'Potluck overlaps or leaves gaps in the Karamu spread', severity: 'low', mitigation: 'Assign dishes by category at T-4d (a main, greens, black-eyed peas, a starch, a dessert) so the communal table is complete.' },
  ],

  contingencies: [
    { id: 'c_meaning', when: 'r_meaning_skipped', plan: 'If the program slips, lower the music and gather everyone for 5 minutes before the meal: pour the libation, light the candle(s), read the principle aloud, and ask one question — a brief, sincere ceremony is enough.' },
    { id: 'c_symbols', when: 'r_symbols_missing', plan: 'If the kinara or candles fall through, borrow from a relative/neighbor who observes, or improvise dignified stand-ins (any safe seven-candle arrangement in the 1 black / 3 red / 3 green order) and replace properly next year.' },
    { id: 'c_candle_safety', when: 'r_candle_safety', plan: 'Move the kinara to a clear, heat-safe spot out of children\'s reach; keep water/an extinguisher nearby; if the table is too crowded, light the candles on a side surface for the ceremony.' },
    { id: 'c_food_gaps', when: 'r_food_gaps', plan: 'Fill any gap with a quick store-bought side or dessert (a Black-owned bakery if open); the communal spirit matters more than a perfect menu.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-14d', what: 'Confirm/borrow the Seven Symbols; order or buy the kinara, mkeka, and unity cup if needed; book caterer/baker if going that route; start zawadi' },
      { when: 'T-3d', what: 'Mishumaa saba candles (1 black/3 red/3 green), red/black/green decor, drinks, disposables, cleanup + to-go kit' },
      { when: 'T-1d', what: 'Karamu mains, black-eyed peas, greens, sides, dessert, mazao (fruit/crops), muhindi (corn), juice/cider/wine for the libation' },
      { when: 'T0', what: 'Any last-minute fresh items + ice for drinks' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Cook stews/one-pot dishes ahead (they reheat well); make cold sides; arrange the mazao basket; chill drinks' },
      { when: 'T0 -3h', what: 'Reheat mains; finish sides; lay out the program/reading near the kinara' },
    ],
    setup: [
      { when: 'T0 -1:30', what: 'Lay the mkeka; set the kinara with the mishumaa saba (black candle center, three red to the left, three green to the right); place the muhindi (one ear per child), mazao bowl, the unity cup, and the zawadi' },
      { when: 'T0 -0:45', what: 'Set the food spread + serving dishes; fill the unity cup for the libation; cue the music low; set out trash + recycling bins' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep hot dishes warm and cold sides chilled; bag bottles/cans for recycling as you go' },
      { when: 'T0 +2:30', what: 'Set out to-go containers/foil so guests can take a plate of the Karamu home' },
      { when: 'T0 +3h', what: 'Safely extinguish all candles, pack leftovers, bag trash/recycling, store the kinara/mkeka/unity cup for next year, return borrowed dishes' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Kwanzaa is a Pan-African cultural celebration created in 1966 by Dr. Maulana Karenga (founder of the US Organization) in the aftermath of the Watts uprising, drawing on African "first fruits" (harvest) traditions to give African Americans a way to celebrate heritage, family, and community. It is observed Dec 26 – Jan 1 and is CULTURAL, not religious — people of all faiths observe it. Its core is the Nguzo Saba, the Seven Principles, one honored each day: Umoja (unity), Kujichagulia (self-determination), Ujima (collective work and responsibility), Ujamaa (cooperative economics), Nia (purpose), Kuumba (creativity), and Imani (faith). Each evening a candle is lit on the kinara and that day\'s principle is read and discussed; a libation (tambiko) is poured from the kikombe cha umoja (unity cup) to honor the ancestors and then shared. The celebration centers Seven Symbols: the mkeka (mat — foundation of tradition/history), the kinara (candle holder — ancestral roots), the mishumaa saba (seven candles — one black for Umoja in the center, three red to the left, three green to the right), the muhindi (ears of corn, one per child — the future), the kikombe cha umoja (unity cup), the mazao (crops/fruit — the harvest and collective work), and the zawadi (gifts — favoring handmade, heritage, and educational gifts, especially for children, over commercial ones). On Dec 31 the gathering becomes the Karamu (Karamu Ya Imani, "feast of faith"), a communal meal blending Pan-African, African American Southern, and Caribbean diaspora cooking — black-eyed peas and collard greens are widely held as essential, alongside dishes like gumbo, jollof rice, jerk chicken, jambalaya, candied yams, rice and peas, plantains, and sweet potato pie. Families observe differently — a single principle night or the full week, host-cooked or potluck, secular or alongside their faith. This playbook is intended as respectful, dignity-first insider practice that centers the principles and the ancestors, with no caricature or commercialization, and notes that Kwanzaa is cultural rather than religious. Quantities reflect common US gathering rules of thumb (~0.5 lb main protein/guest across a multi-dish spread, ~3 drinks/guest over a ~3h indoor gathering) and food-safety practice reflects widely-published USDA-style guidance. Authored as established-consensus / cultural-tradition / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default kwanzaaGathering;
