// Ethiopian Coffee Ceremony (Buna) — Event OS host playbook (data only).
//
// The hosted Ethiopian/Eritrean coffee ritual (buna): washing and hand-roasting
// green coffee beans over a brazier, grinding, brewing in a clay jebena, and
// pouring from height into small handle-less cups (cini/sini) across THREE rounds
// — Abol (first, strongest), Tona (second), Baraka (third, the "blessing"). The
// space is set with fresh-cut grass (ketema) and burning incense (etan), with
// popcorn (fandisha), bread (himbasha), and an optional full injera-and-wat meal
// alongside. A sacred hospitality ritual — never a novelty. Authored with
// internal-diversity awareness (Ethiopian and Eritrean traditions differ;
// Orthodox fasting / vegan "ye-tsom" days matter) and grounded in the large
// Ethiopian/Eritrean community of the DC metro (U Street, Alexandria). Quantities
// are common norms (see `knowledge`), authored honestly and labeled `synthesized`.
// ESM default export.

const ethiopianCoffeeCeremony = {
  type: 'Ethiopian Coffee Ceremony',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A hosted Ethiopian/Eritrean coffee ceremony (buna): wash + hand-roast green beans over a brazier, grind, brew in a clay jebena, and pour from height into small handle-less cups across three rounds — Abol, Tona, Baraka. The space is set with fresh grass (ketema) and incense (etan); popcorn (fandisha) and an optional injera-and-wat meal (always with a vegan/fasting option) are served alongside. A real ritual and a real cook — the playbook front-loads sourcing (a jebena, green beans, frankincense, injera from an Ethiopian market) and treats the three rounds as the unhurried heart of the gathering.',
    typicalGuests: { low: 4, default: 8, high: 14 },
    typicalDurationHours: 3,
    leadTimeDays: 10,
    hostDifficulty: 'moderate-high',
    perGuestCost: { low: 14, high: 45, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The roasting smoke rises and every guest leans forward to breathe it in.',
    'Abol is poured from height and the cups fill perfectly — the room goes still.',
    'By the third round (Baraka), the conversation has gone somewhere real.',
    'A guest holds the small cup with both hands and doesn\'t put it down.',
    'The incense and the coffee smell braid together and the room feels like somewhere.',
  ],

  decisions: [
    { id: 'scope', label: 'Ceremony only, or ceremony + full meal?', options: ['Ceremony + snacks only', 'Ceremony + full injera-and-wat meal'], default: 'Ceremony + full injera-and-wat meal', when: 'T-7d', blocks: ['food', 'beverage_purchases'], why: 'The biggest effort + cost lever. Ceremony-only (coffee + popcorn + bread) is gracious on its own; adding the wat spread roughly doubles the cook.' },
    { id: 'injera_source', label: 'Make injera or buy it?', options: ['Buy from an Ethiopian market/restaurant', 'Make from teff at home'], default: 'Buy from an Ethiopian market/restaurant', when: 'T-7d', blocks: ['food'], why: 'Buying injera is normal and smart — teff sourdough ferments for days and is hard to get right. DC-area markets and restaurants sell it fresh; let them carry it.' },
    { id: 'fasting_spread', label: 'Vegan / Orthodox-fasting spread?', options: ['Always include a full vegan (ye-tsom) spread', 'Vegan dishes only (fasting day)', 'Meat + vegan both'], default: 'Always include a full vegan (ye-tsom) spread', when: 'T-7d', blocks: ['food'], why: 'Vegan fasting food (shiro, misir, gomen) is central, not a side accommodation — Orthodox guests may be fasting (Wed/Fri, Lent). Always offer it; check whether the date is a fasting day.' },
    { id: 'roast_location', label: 'Roast indoors or outdoors (smoke)?', options: ['Roast outdoors / by an open door', 'Roast indoors with strong ventilation', 'Stovetop roast under a vent hood'], default: 'Roast outdoors / by an open door', when: 'T-3d', blocks: ['logistics'], why: 'Pan-roasting green beans makes real smoke (that aromatic smoke is part of the ritual — you fan it toward guests). Plan ventilation so smoke detectors stay quiet and the room stays comfortable.' },
  ],

  milestones: [
    { id: 'buna_setdate', name: 'Set date + headcount; check if it is an Orthodox fasting day', offsetDays: 10, owner: 'host', category: 'planning', risk: { ifDelayed: 'Fasting-day menu mismatch; wrong portions', severity: 'low' } },
    { id: 'buna_invite', name: 'Invite guests; explain it runs ~2–3h across three rounds', offsetDays: 8, owner: 'host', dependsOn: ['buna_setdate'], category: 'guest', risk: { ifDelayed: 'Guests leave before Baraka, the blessing round', severity: 'med' } },
    { id: 'buna_source_equipment', name: 'Source the jebena, cini cups, brazier, mortar/grinder', offsetDays: 7, owner: 'host', dependsOn: ['buna_setdate'], category: 'shopping', risk: { ifDelayed: 'No jebena = no ceremony', severity: 'high' } },
    { id: 'buna_source_pantry', name: 'Buy green coffee, frankincense, berbere, niter kibbeh, teff/injera order', offsetDays: 5, owner: 'host', dependsOn: ['buna_source_equipment'], category: 'shopping', risk: { ifDelayed: 'Specialty items only at Ethiopian markets — limited hours', severity: 'med' } },
    { id: 'buna_cook', name: 'Cook the wat stews (doro/key/sega + shiro/misir/gomen)', offsetDays: 1, owner: 'host', dependsOn: ['buna_source_pantry'], category: 'food', risk: { ifDelayed: 'Wats deepen overnight; rushing flattens the berbere', severity: 'med' } },
    { id: 'buna_freshpickup', name: 'Pick up fresh injera + cut fresh grass (ketema)', offsetDays: 0, owner: 'host', dependsOn: ['buna_source_pantry'], category: 'shopping', risk: { ifDelayed: 'Injera dries out; ketema wilts', severity: 'low' } },
    { id: 'buna_setup', name: 'Strew grass, set the ceremony tray, ready the brazier + incense', offsetDays: 0, owner: 'host', dependsOn: ['buna_cook', 'buna_freshpickup'], category: 'setup', risk: null },
    { id: 'event', name: 'The coffee ceremony', offsetDays: 0, owner: 'host', dependsOn: ['buna_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_fasting_check', milestoneId: 'buna_setdate', phase: 'planning', label: 'Check the church calendar — is the date a fasting (ye-tsom) day? It shapes the whole menu', when: 'T-10d' },
    { id: 't_invite', milestoneId: 'buna_invite', phase: 'guest', label: 'Invite guests; gently note the ceremony is unhurried and runs across three rounds — plan to stay for Baraka', when: 'T-8d' },
    { id: 't_equipment', milestoneId: 'buna_source_equipment', phase: 'shopping', label: 'Source/borrow a jebena, small cini cups, a brazier or stovetop pan, mortar (mukecha) or grinder', when: 'T-7d' },
    { id: 't_pantry', milestoneId: 'buna_source_pantry', phase: 'shopping', label: 'Green coffee beans, frankincense, berbere, niter kibbeh, wat ingredients; order/reserve injera at an Ethiopian market', when: 'T-5d' },
    { id: 't_cook', milestoneId: 'buna_cook', phase: 'food', label: 'Cook the wats a day ahead — doro wat (chicken + berbere + hard-boiled egg) and a vegan shiro/misir/gomen spread; they deepen overnight', when: 'T-1d' },
    { id: 't_freshpickup', milestoneId: 'buna_freshpickup', phase: 'shopping', label: 'Pick up fresh injera; cut/gather fresh grass (ketema); pop popcorn (fandisha)', when: 'T0 morning' },
    { id: 't_setup', milestoneId: 'buna_setup', phase: 'setup', label: 'Strew grass, set the low ceremony table/tray, lay out cini cups, ready charcoal + incense', when: 'T0 -1h' },
    { id: 't_ceremony', milestoneId: 'event', phase: 'event', label: 'Wash + roast beans (pass the pan so guests smell the smoke), grind, brew in the jebena, pour from height; serve Abol, then Tona, then Baraka', when: 'T0' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Cool the brazier + jebena fully, hand-wash the clay pot + cups, sweep the grass, air out incense smoke, pack leftovers', when: 'T0 +3h' },
  ],

  purchases: [
    { id: 'p_greencoffee', item: 'Green coffee beans — Ethiopian, unroasted (roasted live at the ceremony)', category: 'beverage', qtyPerGuest: 0.06, unit: 'lb', where: ['Ethiopian market', 'Specialty coffee roaster', 'Online'], unitCostRange: [6, 14], essential: true, buyAt: 'T-3d', note: 'Roasted fresh during the ceremony — buy them GREEN. ~1 lb covers a 12–14 guest ceremony across three rounds.', provenance: { tier: 'culture-bearer', confidence: 'medium', verificationStatus: 'synthesized', note: 'Green-bean roast is the defining first act of buna; quantity reflects ~1.5–2 cups coffee/guest across rounds from one roast.' } },
    { id: 'p_jebena', item: 'Jebena (traditional clay brewing pot)', category: 'rental', qtyFlat: 1, unit: 'pot', where: ['Ethiopian market', 'Online'], unitCostRange: [20, 45], essential: true, buyAt: 'T-3d', note: 'The heart of the ceremony. Borrow from family if you can — many households have one. Season a new clay jebena before first use.', provenance: { tier: 'culture-bearer', confidence: 'high', verificationStatus: 'synthesized', note: 'No jebena, no ceremony — it is the defining vessel.' } },
    { id: 'p_cini', item: 'Cini / sini cups (small handle-less coffee cups)', category: 'rental', qtyFlat: 2, qtyPer: 1, unit: 'cups', where: ['Ethiopian market', 'Online'], unitCostRange: [1.5, 4], essential: true, buyAt: 'T-3d', note: 'Small handle-less cups, often on a decorated tray (rekebot). Buy a couple extra for spares.' },
    { id: 'p_frankincense', item: 'Frankincense / incense (etan) + charcoal disc or censer', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Ethiopian market', 'Spice shop', 'Online'], unitCostRange: [6, 15], essential: true, buyAt: 'T-3d', note: 'Burned throughout to cleanse and welcome — central to the atmosphere, not optional dressing.' },
    { id: 'p_grass', item: 'Fresh-cut grass / greenery (ketema)', category: 'decor', qtyFlat: 1, unit: 'bundle', where: ['Yard / garden', 'Florist', 'Ethiopian market'], unitCostRange: [0, 12], essential: true, buyAt: 'T0', note: 'Strewn on the floor or table to connect the space to nature; cut fresh the morning of so it stays fragrant.' },
    { id: 'p_injera', item: 'Injera (teff sourdough flatbread)', category: 'food', qtyPerGuest: 3, unit: 'rounds', where: ['Ethiopian market', 'Ethiopian restaurant'], unitCostRange: [1, 2.5], essential: true, buyAt: 'T0', note: 'Buying is normal and smart. ~2–3 rounds per eater — it is the plate AND the utensil (eaten by hand). DC-area markets/restaurants sell it fresh.', alternatives: ['Gluten-free injera (teff only) — if guests have wheat sensitivity', 'Small plates as backup — if injera is unavailable; loses the authenticity'], provenance: { tier: 'matriarch', confidence: 'medium', verificationStatus: 'synthesized', note: 'Injera as plate-and-utensil; ~2–3 rounds/eater is a common serving norm.' } },
    { id: 'p_meatwat', item: 'Doro wat & key sega wat — chicken or beef, eggs, onion', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery', 'Halal butcher', 'Ethiopian market'], unitCostRange: [3, 7], essential: false, buyAt: 'T-1d', note: 'Doro wat = chicken in berbere with a hard-boiled egg, the festive centerpiece. ~0.4 lb wat per eater. Skip entirely on a fasting day.', alternatives: ['Chicken thighs instead of whole chicken — cheaper, same stew result', 'Beef stew chunks instead of whole cuts — budget swap, same berbere flavor'], provenance: { tier: 'matriarch', confidence: 'medium', verificationStatus: 'synthesized', note: '~0.4 lb wat/eater common serving heuristic.' } },
    { id: 'p_veganwat', item: 'Shiro, red lentils & collards (ye-tsom / Orthodox fasting wat — misir, gomen)', category: 'food', qtyPerGuest: 0.4, unit: 'lb', where: ['Grocery', 'Ethiopian market'], unitCostRange: [2, 5], essential: true, buyAt: 'T-1d', note: 'ALWAYS include. Shiro (chickpea), misir (red lentil), gomen (greens) — cooked in oil, not niter kibbeh, to keep them truly fasting-safe.', alternatives: ['Canned lentils (green/brown) — if red lentils unavailable, similar texture', 'Split peas — cheaper substitute for shiro, mild flavor'], provenance: { tier: 'culture-bearer', confidence: 'medium', verificationStatus: 'synthesized', note: 'Vegan ye-tsom spread is central; true fasting dishes use oil not spiced butter.' } },
    { id: 'p_spices', item: 'Berbere + niter kibbeh (spiced clarified butter)', category: 'food', qtyFlat: 1, unit: 'kit', where: ['Ethiopian market', 'Spice shop'], unitCostRange: [10, 22], essential: true, buyAt: 'T-3d', note: 'The flavor backbone. Keep niter kibbeh OUT of the fasting dishes (use plain oil there).' },
    { id: 'p_fandisha', item: 'Popcorn (fandisha) + bread (himbasha)', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery', 'Ethiopian market'], unitCostRange: [0.5, 2], essential: true, buyAt: 'T-1d', note: 'Popcorn and lightly sweet himbasha are served alongside the coffee — a small snack with each round.', alternatives: ['Plain microwave popcorn — if himbasha unavailable', 'Flatbread or pita — if himbasha is inaccessible, close enough for serving'] },
    { id: 'p_sugar', item: 'Sugar (and optional rue/tena adam, salt, or spices for the cup)', category: 'beverage', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Ethiopian market'], unitCostRange: [3, 8], essential: false, buyAt: 'T-3d', note: 'Coffee is often taken with sugar; some add tena adam (rue) or take it with salt — offer the choice.' },
    { id: 'p_charcoal', item: 'Charcoal / lump fuel for the brazier', category: 'logistics', qtyFlat: 1, unit: 'bag', where: ['Grocery', 'Hardware store'], unitCostRange: [8, 18], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: the roast and brew run on live coals — out of fuel = no ceremony.' },
    { id: 'p_cleanup', item: 'Trash bags, paper towels, dish soap, leftover containers', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 15], essential: true, buyAt: 'T-3d' },
  ],

  rentalsGap: [
    { item: 'Jebena (clay brewing pot)', qtyFlat: 1, note: 'borrow from family if possible — the one irreplaceable item' },
    { item: 'Brazier / charcoal stove (or a sturdy stovetop pan)', qtyFlat: 1, note: 'for roasting beans and brewing over live coals' },
    { item: 'Roasting pan (flat iron/steel)', qtyFlat: 1, note: 'the pan you pass around so guests smell the roasting smoke' },
    { item: 'Mortar + pestle (mukecha/zenezena) or a coffee grinder', qtyFlat: 1, note: 'to grind the just-roasted beans coarse' },
    { item: 'Cini cups + serving tray (rekebot)', qtyPerGuest: 1.2, note: 'small handle-less cups; a few spares' },
    { item: 'Low stool / floor cushions', qtyPerGuest: 1, note: 'the ceremony is unhurried and low to the ground' },
  ],

  vendors: [
    { category: 'Ethiopian caterer (wat + injera platter)', required: false, altToDIY: 'Host cooks the wats; buy injera', when: 'T-7d', costRange: [15, 30], costUnit: 'per guest' },
    { category: 'Buna / ceremony culture-bearer to lead', required: false, altToDIY: 'Host (or an elder in the family) leads it; traditionally a woman', when: 'T-7d', costRange: [75, 250], costUnit: 'flat' },
    { category: 'Ethiopian market — injera + specialty pantry', required: false, altToDIY: 'Substitute online specialty suppliers (slower, pricier)', when: 'T-5d', costRange: [30, 90], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_openflame', trigger: 'Open-flame brazier / live charcoal near guests, rugs, or children', severity: 'high', mitigation: 'Set the brazier on a stable heatproof surface away from foot traffic; keep it attended; have a lid, water, or extinguisher within reach; never leave coals unattended.' },
    { id: 'r_burn', trigger: 'Hot jebena, roasting pan, or coals cause burns', severity: 'high', mitigation: 'Use a cloth/holder for the jebena handle and neck; pour from height carefully; keep a clear zone around the hot pan; let everything cool fully before washing.' },
    { id: 'r_smoke', trigger: 'Indoor bean-roast + incense smoke triggers detectors or overwhelms the room', severity: 'med', mitigation: 'Roast outdoors or by an open door; run a vent hood/fan; crack windows; warn guests with respiratory sensitivity; keep incense modest.' },
    { id: 'r_fasting', trigger: 'No vegan/fasting option, or niter kibbeh hidden in "vegan" dishes on a fasting day', severity: 'med', mitigation: 'Always cook a full ye-tsom spread (shiro/misir/gomen) in plain oil; label dishes; confirm whether the date is a fasting day before finalizing the menu.' },
    { id: 'r_rush', trigger: 'Ceremony rushed; guests leave before the third (Baraka) round', severity: 'med', mitigation: 'Set expectations at invite that it runs ~2–3h; do not hurry the rounds — Baraka is the blessing and staying is the point.' },
    { id: 'r_jebena', trigger: 'No jebena, or a new clay pot cracks/leaks unseasoned', severity: 'high', mitigation: 'Source/borrow the jebena at T-7d; season a new clay pot before the day; keep a backup brewing vessel.' },
  ],

  contingencies: [
    { id: 'c_openflame', when: 'r_openflame', plan: 'If open flame is unsafe indoors (small kids, no ventilation), move the roast + brew to a stovetop or outdoors and bring the finished jebena to the table to pour.' },
    { id: 'c_smoke', when: 'r_smoke', plan: 'If smoke builds up, pause, open doors/windows, run fans, and finish the roast outside or by the door; temporarily silence (do not remove) a nearby detector and restore it after.' },
    { id: 'c_fasting', when: 'r_fasting', plan: 'If the date turns out to be a fasting day, drop the meat wats entirely and serve the vegan ye-tsom spread as the full meal — it stands on its own.' },
    { id: 'c_jebena', when: 'r_jebena', plan: 'If the jebena is unavailable or cracks, brew in any clean heat-safe pot and decant — the rounds and the ritual still hold; borrow a jebena for next time.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-7d', what: 'Source/borrow the jebena, cini cups, brazier, mortar/grinder' },
      { when: 'T-3d', what: 'Green coffee, frankincense, berbere, niter kibbeh, charcoal, sugar, cleanup kit; reserve injera' },
      { when: 'T-1d', what: 'Wat ingredients (meat + vegan), popcorn, himbasha' },
      { when: 'T0', what: 'Pick up fresh injera; cut fresh grass (ketema)' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Cook the wats — doro wat and the vegan shiro/misir/gomen spread; they deepen overnight' },
      { when: 'T0 morning', what: 'Pop the popcorn; gather and trim the fresh grass; wash the green beans' },
    ],
    setup: [
      { when: 'T0 -1h', what: 'Strew grass, set the low ceremony tray with cini cups, arrange floor cushions/stools' },
      { when: 'T0 -0:30', what: 'Light the charcoal brazier (let it ash over); ready the roasting pan, mortar/grinder, and incense on a heatproof surface' },
    ],
    cleanup: [
      { when: 'during', what: 'Refill the jebena with fresh water between rounds; keep coals attended; tidy cups as you go' },
      { when: 'T0 +3h', what: 'Cool the brazier + jebena fully, hand-wash the clay pot + cups, sweep the grass, air out the room, pack leftovers' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'The Ethiopian and Eritrean coffee ceremony (buna) is a sacred hospitality ritual — not a novelty. It is traditionally led by a woman, who washes and hand-roasts green beans over a brazier, passes the smoking pan so guests can smell it, grinds the beans, brews in a clay jebena, and pours from height into small handle-less cini cups across three rounds: Abol (first, strongest), Tona (second), and Baraka (the third, the blessing). Staying for all three is the whole point; the gathering is meant to be unhurried (~2–3 hours), with fresh grass (ketema) strewn underfoot and frankincense (etan) burning. Popcorn (fandisha), bread (himbasha), and an optional injera-and-wat meal accompany it — and a full vegan "ye-tsom" spread (shiro, misir, gomen, cooked in oil rather than spiced niter kibbeh) is central, because Orthodox guests may be fasting on Wednesdays, Fridays, and during Lent. Ethiopian and Eritrean traditions overlap but differ in detail; this playbook is grounded in the large Ethiopian/Eritrean community of the Washington DC metro (U Street and Alexandria), where injera, berbere, green beans, and jebenas are readily sourced from local markets and restaurants — buying injera is normal and smart. Quantities (~1.5–2 cups coffee/guest across rounds, ~2–3 injera/eater, ~0.4 lb wat/eater) reflect common serving norms, authored honestly and labeled synthesized; no sources are fabricated, and citations are left for a foreground verification pass with named culture-bearers.',
    sources: [],
  },
};

export default ethiopianCoffeeCeremony;
