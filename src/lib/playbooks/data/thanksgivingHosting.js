// Thanksgiving Hosting — Event OS host playbook (data only).
//
// Authored 2026-08-21 off the seasonal-demand study
// (docs/audits/2026-08-21_SEASONAL_DEMAND_AND_NICHE_RESEARCH.md, Q6.3):
// Thanksgiving is the most-hosted occasion in the US (66% of hosts per the
// HomePage News 2026 entertaining study), and the dominant documented pain is
// DISH TIMING — 56% of holiday cooks name "timing the meal and all of their
// dishes so it's all done and ready at the same time" as the single biggest
// headache (Ipsos/Samsung), with oven-space conflict the top named stressor.
// So the heart of this playbook is the run of show: the turkey back-planned
// from serve time, the ONE-OVEN rotation, and the rest window that frees the
// oven for the sides. The potluck/Friendsgiving model ships as a decision
// INSIDE this playbook (hosting_model), not a separate type, per the study's
// Q6.2 verdict — and Christmas dinner is explicitly NOT this type; a variant
// ships later product-side, so the wording here stays Thanksgiving-specific.
//
// LEAD-TIME JUDGMENTS (derived where the corpus has precedent, conservative
// where it does not — each one documented here):
//   • 21-day planning start matches Dinner Party and The Cookout's own leads.
//   • Turkey order at 21 days: no corpus precedent for a reserved protein;
//     retail guidance varies (fresh birds are ordered one to three weeks
//     ahead), so the conservative (earlier) end was chosen.
//   • 14-day dish assignment mirrors The Cookout's spread-assignment lead.
//   • Thaw start at five days: VERIFIED against USDA FSIS (fetched 2026-08-21,
//     `fsis-turkey-thaw`): refrigerator thawing runs 24 hours per 4-5 lb, so a
//     12-16 lb bird takes 3-4 days and a 16-20 lb bird 4-5 days. The five-day
//     start is the FSIS rate plus a day of margin for the default bird — the
//     number was already right, and now it is cited rather than judged.
//   • 3-day final headcount mirrors The Cookout's headcount lock.
// Quantities (~1.5 lb whole turkey per guest, pie per 6, ~1 drink/guest/hr)
// are established US holiday-cooking heuristics, labeled synthesized. No
// fabricated sources, no fabricated costProvenance. ESM default export.

const thanksgivingHosting = {
  type: 'Thanksgiving Hosting',
  vegMain: 'Stuffed acorn squash with wild rice',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',

  meta: {
    summary:
      'The most-hosted meal in America, and the hardest single cooking day most hosts ever run: one oven, six dishes, and a table that expects everything hot at the same minute. This playbook back-plans the whole day from serve time — the turkey goes in first, rests while the sides rotate through the freed oven, and the make-ahead dishes carry everything the oven cannot. The other big call is hosted-cooking versus potluck (a Friendsgiving runs on assigned dishes), and because family travels for this one, arrival windows and the guest room are part of the plan, not a surprise.',
    typicalGuests: { low: 6, default: 12, high: 24 },
    typicalDurationHours: 6,
    leadTimeDays: 21,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 12, high: 30, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'Everything lands on the table hot, at the same time, and the room goes quiet for a second before it gets loud.',
    'The person whose stuffing everyone asked for walks in carrying it.',
    'Someone says what they are thankful for and actually means it.',
    'The kids table erupts and nobody minds.',
    'Every guest leaves with a container of leftovers pressed into their hands.',
  ],

  decisions: [
    {
      id: 'hosting_model',
      label: 'Are you cooking the whole meal, or is it a potluck?',
      options: ['Host cooks the whole meal', 'Host cooks the turkey and core dishes, guests bring sides and desserts', 'Full potluck — Friendsgiving style, host assigns dishes', 'Ordered — a market or restaurant cooks, host reheats and serves'],
      default: 'Host cooks the turkey and core dishes, guests bring sides and desserts',
      when: 'T-21d',
      blocks: ['food'],
      costFactors: { 'Host cooks the whole meal': 1.3, 'Full potluck — Friendsgiving style, host assigns dishes': 0.5, 'Ordered — a market or restaurant cooks, host reheats and serves': 1.9 },
      costFactorProvenance: { tier: 'synthesized', confidence: 'low', verificationStatus: 'synthesized', note: 'Ratios mirror The Cookout\'s researched host-cooks-all / split / potluck spread; the ordered-dinner multiplier reflects prepared-holiday-dinner retail versus grocery ingredients and is a judgment.', claim: 'Cooking everything adds roughly 30% over the split model; a full potluck halves the host\'s food cost; a fully ordered dinner roughly doubles it', sufficientWhen: 'One prepared Thanksgiving dinner package price and an ingredient-cost basket at the same headcount confirm the potluck save and the ordered-dinner premium' },
      affects: ['p_turkey', 'p_stuffing', 'p_potatoes', 'p_sides_veg', 'p_pies'],
      weight: 'high', reversibility: 'costly', emotionalWeight: 'med', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'This one call sets the shopping list, the oven plan, and who is trusted with which dish — and dish assignments are personal, so unwinding them late is awkward. Only the host knows their people.', tier: 'reasoned' },
      why: 'The single biggest labor and cost lever of the day. Cooking everything yourself means the one-oven problem is entirely yours. The split model keeps the turkey, gravy, and stuffing under your control and hands the sides and pies to the people already known for them. A full potluck — how most Friendsgivings run — makes you a coordinator more than a cook: assign specific dishes, or you get three green bean casseroles and no potatoes.',
    },
    {
      id: 'turkey_method',
      label: 'How is the turkey cooked?',
      options: ['Roasted in the oven', 'Deep-fried outside', 'Smoked', 'Bought fully cooked'],
      default: 'Roasted in the oven',
      when: 'T-14d',
      blocks: ['oven_plan', 'menu'],
      weight: 'high', reversibility: 'reversible', emotionalWeight: 'med', difmCapable: 'can-derive',
      priorityBasis: { rationale: 'The turkey method decides whether the oven is occupied for the four biggest hours of the day — a fried or smoked bird frees the oven for every side, which dissolves most of the timing problem.', tier: 'reasoned' },
      why: 'This is really an oven decision. A roasted bird owns the oven for three to four hours, which is exactly when every side dish wants it. Frying or smoking moves the turkey outdoors and hands the oven to the sides — but a fryer carries real fire risk (thawed and dry bird only, away from the house, never left alone). A bought cooked bird is the honest answer for a first-time host who would rather run the day than sweat the bird.',
    },
    {
      id: 'serve_time',
      label: 'What time does dinner hit the table?',
      options: ['Early afternoon, around 1 or 2', 'Late afternoon, around 4 or 5', 'Evening, 6 or later'],
      default: 'Late afternoon, around 4 or 5',
      when: 'T-14d',
      blocks: ['run_of_show', 'oven_plan'],
      weight: 'high', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive',
      priorityBasis: { rationale: 'Every oven slot and the turkey\'s start time back-solve from the serve time — the schedule cannot be written until this is fixed, but it costs nothing to change early.', tier: 'reasoned' },
      why: 'The whole day is back-planned from this hour: when the turkey goes in, when it comes out to rest, which sides get the freed oven, when the potatoes go on. Pick it around your guests\' travel — an early dinner suits guests driving home the same night; a later one gives a morning cook more runway and out-of-town family time to arrive.',
    },
    {
      id: 'overnight_guests',
      label: 'Is anyone staying overnight?',
      options: ['No — everyone is local', 'One or two guests overnight', 'A full house for the weekend'],
      default: 'No — everyone is local',
      when: 'T-14d',
      blocks: ['guest_room', 'logistics'],
      weight: 'med', reversibility: 'reversible', emotionalWeight: 'med', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'Thanksgiving is the holiday families travel for, and a guest room found unmade at ten at night is a real failure — but only the host knows who is coming and staying.', tier: 'reasoned' },
      why: 'More people travel for Thanksgiving than for any other American holiday, and hosting often means housing. Deciding this early sets whether you are making up beds, planning a breakfast, and building the weekend — or just the one meal. It also shapes the day: overnight guests can arrive early and help; same-day travelers need an arrival window and a plan for the long drive home.',
    },
    {
      id: 'dietary_table',
      label: 'Who at the table has a dietary need to cook for?',
      options: ['Nobody — the traditional menu works for everyone', 'One or two needs — adjust dishes and label them', 'Several — plan a parallel plate that stands on its own'],
      default: 'One or two needs — adjust dishes and label them',
      when: 'T-10d',
      timingProvenance: { tier: 'researched', verificationStatus: 'researched', sources: ['withjoy-dietary'], claim: 'Collect dietary restrictions when the headcount is confirmed and consolidate the final list one to two weeks before the event — the T-10d ask sits inside the sourced collect-with-RSVPs-to-final-list window.', rationale: 'Dietary needs are collected over the RSVP window and consolidated ~1-2 weeks out per the sourced cadence; ten days leaves time to plan the fixes.' },
      blocks: ['menu'],
      weight: 'med', reversibility: 'reversible', emotionalWeight: 'med', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'Almost every Thanksgiving table now carries at least one dietary need, and the fixes are cheap when planned ten days out and impossible at four in the afternoon — but only the host knows their guests.', tier: 'reasoned' },
      why: 'Ask when you confirm the headcount, not at the table. The common fixes are small if planned: stuffing baked outside the bird and a batch made without sausage, gravy thickened without flour, a vegetable side that is genuinely vegan rather than technically meatless, and a dessert that is not all pie crust. A guest with celiac disease or a nut allergy needs real separation, not a scraped-off portion — plan their plate first, not last.',
    },
  ],

  milestones: [
    { id: 'tg_plan', name: 'Lock the date, headcount, and hosting model', offsetDays: 21, owner: 'host', category: 'planning', risk: { ifDelayed: 'Dish assignments and the turkey order both stall behind this', severity: 'high' } },
    { id: 'tg_turkey_order', name: 'Order or reserve the turkey', offsetDays: 21, owner: 'host', dependsOn: ['tg_plan'], category: 'food', risk: { ifDelayed: 'Fresh and specialty birds sell out; you take whatever the store has left', severity: 'med' } },
    { id: 'tg_menu', name: 'Lock the menu and assign every dish', offsetDays: 14, owner: 'host', dependsOn: ['tg_plan'], category: 'food', risk: { ifDelayed: 'Duplicate sides, missing staples, and no time to fix either', severity: 'med' } },
    { id: 'tg_ovenmap', name: 'Write the oven map back from serve time', offsetDays: 7, owner: 'host', dependsOn: ['tg_menu'], category: 'planning', risk: { ifDelayed: 'The one-oven conflict is discovered on the day, when nothing can move', severity: 'high' } },
    { id: 'tg_thaw', name: 'Start thawing the turkey in the refrigerator', offsetDays: 5, owner: 'host', dependsOn: ['tg_turkey_order'], category: 'food', risk: { ifDelayed: 'A still-frozen bird on the morning — the classic Thanksgiving disaster', severity: 'high' } },
    { id: 'tg_headcount', name: 'Confirm final headcount, dietary needs, and arrival windows', offsetDays: 3, owner: 'host', dependsOn: ['tg_menu'], category: 'guest', risk: { ifDelayed: 'Wrong quantities and a dietary need discovered at the table', severity: 'high' } },
    { id: 'tg_shop_main', name: 'The big grocery run', offsetDays: 3, owner: 'host', dependsOn: ['tg_headcount'], category: 'shopping', risk: { ifDelayed: 'Picked-over shelves the closer the holiday gets', severity: 'med' } },
    { id: 'tg_makeahead', name: 'Cook the make-ahead dishes', offsetDays: 1, owner: 'host', dependsOn: ['tg_shop_main'], category: 'food', risk: { ifDelayed: 'Every dish competes for the day-of oven at once', severity: 'high' } },
    { id: 'tg_house', name: 'Set the table, ready the guest room, stage serving dishes', offsetDays: 1, owner: 'host', dependsOn: ['tg_plan'], category: 'setup', risk: null },
    { id: 'event', name: 'Thanksgiving dinner', offsetDays: 0, owner: 'host', dependsOn: ['tg_makeahead', 'tg_house'], category: 'event', risk: null },

    // ── AFTER THE DAY ────────────────────────────────────────────────────────
    // NEGATIVE offsetDays = days AFTER the event. The engine already computes
    // dueDate as eventDate + (-offsetDays), so this needs no engine change --
    // but nothing in the corpus had ever used it, so this is the first.
    //
    // Every one of these is real host work that the plan previously abandoned
    // the moment the meal ended: the borrowed roasting pan that lives in your
    // cupboard until March, the aunt who never got told her pie was the hit of
    // the table, the carcass thrown out on a night when it is worth a gallon
    // of stock.
    { id: 'tg_leftovers_out', name: 'Get the leftovers into the right hands and the carcass into stock', offsetDays: -1, owner: 'host', dependsOn: ['event'], category: 'food', risk: { ifDelayed: 'Good food thrown out, and a carcass worth a gallon of stock in the trash', severity: 'low' } },
    { id: 'tg_return', name: 'Return every borrowed dish, pan, and chair', offsetDays: -3, owner: 'host', dependsOn: ['event'], category: 'cleanup', risk: { ifDelayed: 'Borrowed things become kept things, and the lender remembers', severity: 'med' } },
    { id: 'tg_thanks', name: 'Thank the people who cooked, drove, and stayed to wash up', offsetDays: -2, owner: 'host', dependsOn: ['event'], category: 'guest', risk: { ifDelayed: 'The people who made it work hear nothing, and help thins out next year', severity: 'med' } },
  ],

  tasks: [
    { id: 't_leftover_send', milestoneId: 'tg_leftovers_out', phase: 'food', label: 'Send the leftovers home in the containers you already bought — dark meat with white, a scoop of every side, and pie', when: 'T0 +1d' },
    { id: 't_stock', milestoneId: 'tg_leftovers_out', phase: 'food', label: 'Simmer the carcass with the vegetable ends into stock, or freeze it whole for a slower weekend', when: 'T0 +1d' },
    { id: 't_leftover_safety', milestoneId: 'tg_leftovers_out', phase: 'food', label: 'Anything still out from the meal goes now — cooked food keeps three to four days refrigerated, and the clock started at the table', when: 'T0 +1d' },
    { id: 't_return_dishes', milestoneId: 'tg_return', phase: 'cleanup', label: 'Wash and return every borrowed pan, platter, and folding chair — with what you owe written down while you still remember whose is whose', when: 'T0 +3d' },
    { id: 't_thanks_cooks', milestoneId: 'tg_thanks', phase: 'guest', label: 'Tell the people who brought a dish what happened to it — that the stuffing went first, that someone asked for the recipe', when: 'T0 +2d' },
    { id: 't_thanks_help', milestoneId: 'tg_thanks', phase: 'guest', label: 'Thank the ones who stayed to wash up and the ones who drove far, by name and not in a group text', when: 'T0 +2d' },
    { id: 't_model', milestoneId: 'tg_plan', phase: 'planning', label: 'Decide who cooks: the whole meal, a split with assigned dishes, or a full potluck', when: 'T-21d' },
    { id: 't_invite', milestoneId: 'tg_plan', phase: 'guest', label: 'Invite everyone with the date, the serve time, and the dietary and overnight ask', when: 'T-21d' },
    { id: 't_order_bird', milestoneId: 'tg_turkey_order', phase: 'food', label: 'Order the turkey — about a pound and a half per guest for a whole bird, and a size that actually fits your oven and roasting pan', when: 'T-21d', whenChoice: { id: 'hosting_model', in: ['Host cooks the whole meal', 'Host cooks the turkey and core dishes, guests bring sides and desserts'] } },
    { id: 't_order_dinner', milestoneId: 'tg_turkey_order', phase: 'food', label: 'Place the prepared-dinner order and get the pickup time and reheating instructions in writing', when: 'T-21d', whenChoice: { id: 'hosting_model', in: ['Ordered — a market or restaurant cooks, host reheats and serves'] } },
    { id: 't_assign', milestoneId: 'tg_menu', phase: 'food', label: 'Assign every dish by name — the stuffing, the potatoes, the cranberry, each pie — so nothing arrives twice and nothing is missing', when: 'T-14d', whenChoice: { id: 'hosting_model', in: ['Host cooks the turkey and core dishes, guests bring sides and desserts', 'Full potluck — Friendsgiving style, host assigns dishes'] } },
    { id: 't_menu_lock', milestoneId: 'tg_menu', phase: 'food', label: 'Write the full menu and mark which dishes can be made a day ahead — the more that cooks early, the calmer the day', when: 'T-14d' },
    { id: 't_dietary', milestoneId: 'tg_menu', phase: 'food', label: 'Collect dietary needs and decide the fix for each: a separate stuffing batch, flourless gravy, a real vegan side, a crustless dessert', when: 'T-10d' },
    { id: 't_serveware', milestoneId: 'tg_menu', phase: 'planning', label: 'Count serving dishes, the roasting pan, and the thermometer against the menu — and borrow what is missing now, not on the morning', when: 'T-10d' },
    { id: 't_ovenmap', milestoneId: 'tg_ovenmap', phase: 'planning', label: 'Write the oven map: back-plan from serve time, give the turkey its block, and slot each side into the oven the resting bird frees up', when: 'T-7d', whenChoice: { id: 'turkey_method', in: ['Roasted in the oven'] } },
    { id: 't_ovenmap_free', milestoneId: 'tg_ovenmap', phase: 'planning', label: 'Write the oven map for the sides — with the turkey cooking outside, the oven belongs to the dishes all day', when: 'T-7d', whenChoice: { id: 'turkey_method', in: ['Deep-fried outside', 'Smoked', 'Bought fully cooked'] } },
    { id: 't_fryer_safety', milestoneId: 'tg_ovenmap', phase: 'planning', label: 'Set the fryer site: level ground well away from the house and anything that burns, a full extinguisher within reach, and a fully thawed, dried bird — a partly frozen turkey in hot oil is how house fires start', when: 'T-7d', whenChoice: { id: 'turkey_method', in: ['Deep-fried outside'] } },
    { id: 't_thaw', milestoneId: 'tg_thaw', phase: 'food', label: 'Move the frozen turkey to the refrigerator — it thaws at roughly a day for every four to five pounds, so a big bird needs most of a week', when: 'T-5d', whenChoice: { id: 'hosting_model', in: ['Host cooks the whole meal', 'Host cooks the turkey and core dishes, guests bring sides and desserts'] } },
    { id: 't_headcount', milestoneId: 'tg_headcount', phase: 'guest', label: 'Confirm the final headcount and each traveler\'s arrival window, so the day is planned around when people actually walk in', when: 'T-3d' },
    { id: 't_shop', milestoneId: 'tg_shop_main', phase: 'shopping', label: 'The big grocery run: everything except last-day fresh items — and check the list against the menu line by line before leaving the store', when: 'T-3d' },
    { id: 't_guestroom', milestoneId: 'tg_house', phase: 'setup', label: 'Make up the guest room: fresh sheets, towels out, phone chargers, and the wifi password written down', when: 'T-2d', whenChoice: { id: 'overnight_guests', in: ['One or two guests overnight', 'A full house for the weekend'] } },
    { id: 't_makeahead', milestoneId: 'tg_makeahead', phase: 'food', label: 'Cook the make-ahead dishes: pies, cranberry sauce, casseroles to the ready-to-bake stage, and the gravy base from stock', when: 'T-1d' },
    { id: 't_table', milestoneId: 'tg_house', phase: 'setup', label: 'Set the table tonight — plates, serving spoons in each dish\'s spot, and a kids table if the count calls for one', when: 'T-1d' },
    { id: 't_fridge_stage', milestoneId: 'tg_makeahead', phase: 'food', label: 'Stage the refrigerator: tomorrow\'s dishes in front, drinks moved to a cooler, and room cleared for the leftovers to come', when: 'T-1d' },
    { id: 't_bird_in', milestoneId: 'event', phase: 'food', label: 'Turkey into the oven on schedule — from the oven map, not from memory', when: 'T0 -6h', whenChoice: { id: 'turkey_method', in: ['Roasted in the oven'] } },
    { id: 't_arrivals', milestoneId: 'event', phase: 'guest', label: 'Greet arrivals, take coats, pour the first drinks, and put early helpers to work on real jobs', when: 'T0 +0:10' },
    { id: 't_potluck_intake', milestoneId: 'event', phase: 'food', label: 'Land each arriving dish: label it, assign it oven or counter space from the map, and confirm its serving spoon', when: 'T0 +0:20', whenChoice: { id: 'hosting_model', in: ['Host cooks the turkey and core dishes, guests bring sides and desserts', 'Full potluck — Friendsgiving style, host assigns dishes'] } },
    { id: 't_rest_window', milestoneId: 'event', phase: 'food', label: 'Turkey out to rest under foil — the rest makes the carving, and the freed oven belongs to the sides now', when: 'T0 -1h', whenChoice: { id: 'turkey_method', in: ['Roasted in the oven'] } },
    { id: 't_serve', milestoneId: 'event', phase: 'food', label: 'Everything to the table at once: carve, sauce boats out, sides in their spots, and sit down yourself', when: 'T0 +1h' },
    { id: 't_leftovers', milestoneId: 'event', phase: 'cleanup', label: 'Pack leftovers into containers within two hours of serving — and send every guest home with a plate', when: 'T0 +3:30' },
  ],

  purchases: [
    { id: 'p_turkey', item: 'Turkey (whole bird, or breast for a small table)', category: 'food', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Butcher', 'Costco'], unitCostRange: [1, 4], essential: true, buyAt: 'T-5d', alternatives: ['Frozen store-brand bird — cheapest, needs the full thaw window', 'Bone-in breast — right answer under eight guests', 'Fully cooked bird from a market — costs more, erases the biggest risk'], note: 'About a pound and a half per guest for a whole bird covers dinner plus the leftovers everyone expects. Frozen sits at the floor of the range, fresh and heritage birds at the ceiling.', provenance: { tier: 'heuristic', confidence: 'low', verificationStatus: 'synthesized', sources: [], note: 'US holiday-cooking norm: 1 to 1.5 lb whole bird per guest with leftovers intended; range spans frozen store-brand to fresh/heritage retail.' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['afbf-thanksgiving-2025', 'turkey-shelf-2025'], lastVerified: '2026-08-21', claim: 'Turkey per pound: the AFBF 2025 volunteer-shopper survey puts a 16-lb FROZEN bird at $21.50 — $1.34/lb, down 16% year over year — which anchors this band\'s floor at grocery; November promotional shelf prices run lower still (Aldi $0.77/lb, Butterball $0.97-0.99/lb), so the $1 floor is the holiday-deal reality, not optimism. Fresh and heritage birds are unpriced by the survey (fresh wholesale is rising on avian influenza), so the $4 ceiling is retail judgment for the fresh/heritage tier, not a cited figure.', sufficientWhen: 'One fresh and one heritage per-pound shelf price confirm the ceiling the way the AFBF survey confirms the frozen floor.' } },
    { id: 'p_stuffing', item: 'Stuffing ingredients (bread, aromatics, stock, sausage or none)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery'], unitCostRange: [0.8, 2], essential: true, buyAt: 'T-3d', note: 'Bake it in a dish, not the bird — it cooks faster, safer, and frees the cavity. Make a second, meatless batch when the table needs one.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_potatoes', item: 'Potatoes, butter & cream (the mash)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco'], unitCostRange: [0.6, 1.5], essential: true, buyAt: 'T-3d', note: 'Half a pound of potatoes per guest mashes to a generous serving. They cook on the stovetop — one of the few dishes that never fights for the oven.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_gravy', item: 'Gravy makings (stock, flour or a gluten-free thickener, drippings plan)', category: 'food', qtyFlat: 1, unit: 'batch', where: ['Grocery'], unitCostRange: [5, 12], essential: true, buyAt: 'T-3d', note: 'Make the base from stock the day before; finish with drippings while the bird rests. A jarred backup hidden in the pantry has saved many hosts.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_cranberry', item: 'Cranberry sauce (fresh berries or the can both have partisans)', category: 'food', qtyFlat: 1, qtyPer: 8, unit: 'batch per 8 guests', where: ['Grocery'], unitCostRange: [3, 8], essential: true, buyAt: 'T-3d', note: 'Fresh sauce takes fifteen minutes and keeps for a week — a make-ahead freebie. Serve the can too if your family expects the can; this is not a fight worth having.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_sides_veg', item: 'Vegetable sides (green beans, sweet potatoes, brussels sprouts, a real vegan option)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Costco'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', note: 'Two or three vegetable sides for a table of twelve. At least one should be genuinely vegan — cooked without butter or stock — and labeled so nobody has to ask.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['afbf-thanksgiving-2025', 'usda-feature-produce-2026'], lastVerified: '2026-08-21', claim: 'Holiday vegetable sides per pound, from the AFBF 2025 survey: sweet potatoes $1.33/lb (3 lb for $4.00), frozen peas $2.03/lb, and a 1-lb veggie tray $1.36 — all inside this $1-3 band, with fresher and out-of-season produce toward the ceiling. USDA AMS advertised-feature sweet potatoes ran $0.99-1.19/lb in August 2026 — feature sits below shelf, and the two sources bracket the same $1-and-change reality.', sufficientWhen: 'One green-bean and one brussels-sprout shelf price per pound confirm the rest of the spread the survey items bracket.' } },
    { id: 'p_rolls', item: 'Dinner rolls & butter', category: 'food', qtyPerGuest: 1.5, unit: 'rolls', where: ['Grocery', 'Bakery'], unitCostRange: [0.3, 0.8], essential: true, buyAt: 'T-3d', note: 'They warm in the oven in ten minutes during the turkey\'s rest — the last thing in, the first thing gone.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_pies', item: 'Pies (pumpkin, apple, pecan — or assigned to the guest known for them)', category: 'food', qtyFlat: 1, qtyPer: 6, unit: 'pie per 6 guests', where: ['Bakery', 'Grocery', 'Guests bring'], unitCostRange: [6, 20], essential: true, buyAt: 'T-1d', note: 'A pie cuts to about eight slices, but Thanksgiving guests take slivers of two — one pie per six guests keeps every kind on the table.', provenance: { tier: 'heuristic', confidence: 'low', verificationStatus: 'synthesized', sources: [], note: 'One pie per six guests reflects the multiple-dessert grazing norm of a US holiday table; a single-dessert table stretches to one per eight.' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['afbf-thanksgiving-2025', 'sweetpotatopie-benne-2026'], lastVerified: '2026-08-21', claim: 'Per pie: a homemade pumpkin pie from AFBF 2025 survey components (two crusts $3.37, 30oz pie mix $4.16, half-pint whipping cream $1.87) lands near this band\'s $6 floor per pie. A specialty-bakery 9-inch pie at $30 sits ABOVE the $20 ceiling and is excluded — the ceiling is a grocery-bakery pie, between the two cited points.', sufficientWhen: 'One grocery-bakery pumpkin or apple pie shelf price confirms the ceiling directly.' } },
    { id: 'p_appetizers', item: 'Grazing snacks for the cooking hours (cheese, nuts, crudite)', category: 'food', qtyPerGuest: 3, unit: 'bites', where: ['Grocery', 'Costco'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-3d', note: 'Guests arrive hours before the meal. Light grazing keeps everyone out of the kitchen and still hungry at dinner — put it far from the stove.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_wine_cider', item: 'Wine + sparkling cider (a bottle each of red and white per table end, cider for kids and non-drinkers)', category: 'beverage', qtyFlat: 1, qtyPer: 4, unit: 'bottle per 4 guests', where: ['Wine shop', 'Grocery'], unitCostRange: [7, 20], essential: true, buyAt: 'T-3d', note: 'A long afternoon meal, not a party — plan lighter than a cocktail event, and make the zero-proof option a real one on the table, not a concession in the fridge.', provenance: { tier: 'heuristic', confidence: 'low', verificationStatus: 'synthesized', sources: [], note: 'One bottle per four guests reflects the roughly one-drink-per-guest-per-hour norm applied to a meal-centered afternoon with many non-drinkers and drivers.' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['wine-retail-2026', 'sparkling-cider-2026'], lastVerified: '2026-08-21', claim: 'Per bottle: everyday grocery-shelf table wine runs $8-15 in 2026, which fills this $7-20 band with mid-range wine at the ceiling. The sparkling cider on the same table is $4.29-8.49 a bottle — mostly BELOW the band\'s floor, so a cider-heavy table for kids and non-drinkers lands under this estimate, not over it.', sufficientWhen: 'One red, one white and one sparkling-cider shelf price at the same store confirm the blended band.' } },
    { id: 'p_coffee', item: 'Coffee, tea & dessert fixings (whipped cream, ice cream)', category: 'beverage', qtyFlat: 1, unit: 'service', where: ['Grocery'], unitCostRange: [8, 18], essential: true, buyAt: 'T-3d', note: 'Coffee with pie is non-negotiable for the older generation, and it helps the long-drive guests before the road.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_thermometer', item: 'Instant-read meat thermometer', category: 'logistics', qtyFlat: 1, unit: 'thermometer', where: ['Grocery', 'Amazon', 'Hardware store'], unitCostRange: [10, 25], essential: true, buyAt: 'T-7d', note: 'The only honest way to know the bird is done: 165 degrees in the thickest part of the thigh. The pop-up button is not a plan.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_roasting_kit', item: 'Roasting pan, rack, foil & twine (if not already owned)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Hardware store', 'Borrow'], unitCostRange: [10, 40], essential: true, buyAt: 'T-7d', note: 'A disposable foil pan buckles under a heavy bird — set it on a sheet pan if that is the pan you have.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_leftover_containers', item: 'Leftover containers to send home (and foil, bags, labels)', category: 'logistics', qtyPerGuest: 1, unit: 'containers', where: ['Grocery', 'Costco'], unitCostRange: [0.3, 0.8], essential: true, buyAt: 'T-3d', note: 'Sending plates home is half the point of cooking this much — and it is also the food-safety plan, because leftovers must be chilled within two hours.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_cleanup', item: 'Cleanup kit (trash bags, dish soap, paper towels, dishwasher detergent)', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [7, 15], essential: true, buyAt: 'T-3d', note: 'The greasiest dish day of the year. Never pour turkey fat down the drain — jar it and trash it.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['costco-cleaning-2026', 'trashbags-retail-2026'], lastVerified: '2026-08-21', claim: 'The corpus\'s identical-line cleanup-kit citation: a kit is the SUM of its parts — about a dozen trash and recycling bags at 10 cents each warehouse or 11-15 cents grocery, paper towels about $1.97 a roll warehouse, and a wipes canister about $4.27 or a dish-soap pack shared across events — which is the $7-15 envelope.', sufficientWhen: 'CONFIDENCE IS LOW ON PURPOSE: nobody sells a cleanup kit; the band is a component sum, and a host who already owns soap and towels lands under the floor.' } },
  ],

  rentalsGap: [
    { item: 'Extra chairs + a table leaf or folding table', qtyPerGuest: 1, note: 'Twelve guests need twelve real seats. Borrow chairs early — everyone you would borrow from is hosting too.' },
    { item: 'A kids table + chairs', qtyFlat: 1, note: 'A card table with its own tablecloth and a craft or coloring setup buys the adult table an hour of peace.' },
    { item: 'Second refrigerator space or a big cooler', qtyFlat: 1, note: 'The thawing bird, the make-ahead dishes, and the drinks will not all fit in one refrigerator. A cooler with ice takes the drinks.' },
    { item: 'Warming space: a slow cooker or two for holding sides', qtyFlat: 2, note: 'A slow cooker on warm holds mash or gravy off the stovetop — the cheapest fix for the one-oven crunch.' },
  ],

  vendors: [
    { category: 'Butcher / turkey order', required: false, altToDIY: 'A frozen supermarket bird, ordered by nobody, thawed on your own schedule — cheaper and it works, but start the thaw five days out', when: 'T-21d', costRange: [30, 120], costUnit: 'flat' },
    { category: 'Prepared holiday dinner (market or restaurant)', required: false, altToDIY: 'Cook it yourself for a third of the price — the prepared dinner buys back the whole cooking day, not just the bird', when: 'T-21d', costRange: [18, 40], costUnit: 'per guest' },
    { category: 'House cleaning (before or after)', required: false, altToDIY: 'A family reset the night before and the dishwasher run in shifts — the paid clean after a full house is a sanity purchase', when: 'T-7d', costRange: [100, 250], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_frozen', trigger: 'The turkey is still frozen on the morning', severity: 'critical', mitigation: 'Refrigerator thawing takes roughly a day per four to five pounds — a sixteen-pound bird needs four days, so start five days out. If the morning arrives and the bird is still icy, a cold-water thaw (submerged, water changed every half hour) rescues about a pound per half hour.' },
    { id: 'r_oven_crunch', trigger: 'Every dish needs the one oven at the same hour', severity: 'high', mitigation: 'Write the oven map a week out, back-planned from serve time. The turkey\'s rest window is the release valve — the bird rests under foil for at least forty-five minutes while the sides rotate through the freed oven. Stovetop and slow-cooker dishes never fight for it at all.' },
    { id: 'r_undercooked', trigger: 'The bird reads done on the clock but not on the thermometer', severity: 'high', mitigation: 'The thermometer is the only authority: 165 degrees in the thickest part of the thigh, not touching bone. If it is short, back in it goes and the sides hold — a late dinner is a story, an undercooked bird is a hospital.' },
    { id: 'r_timing_collapse', trigger: 'The serve time slips an hour and every dish drifts apart', severity: 'med', mitigation: 'Hold the schedule with the map, not memory. If the bird runs long, the mash holds in a slow cooker, the rolls wait, and the gravy finishes last. Tell the table the new time once, confidently, and put out more snacks.' },
    { id: 'r_dietary', trigger: 'A guest\'s dietary need surfaces at the table', severity: 'med', mitigation: 'Ask with the invitation and again at the headcount confirmation. Keep one stuffing batch meatless, thicken gravy without flour or set some aside before thickening, and label the dishes that are safe. The plainest fix: the person with the restriction gets their plate made first.' },
    { id: 'r_travel', trigger: 'Half the table is stuck in holiday traffic at serve time', severity: 'med', mitigation: 'Collect arrival windows three days out and plan dinner around the realistic one, not the optimistic one. Build slack: appetizers stretch, the bird rests happily under foil for an hour, and dinner an hour late with everyone present beats dinner on time with the family missing.' },
    { id: 'r_leftovers', trigger: 'Food sits out all afternoon while everyone digests', severity: 'med', mitigation: 'Two hours is the safety line for perishable food at room temperature. Pack leftovers when dessert goes out — it feels early and it is exactly right — and the send-home containers make it hospitality instead of cleanup.' },
    { id: 'r_fryer', trigger: 'A turkey fryer near the house, or a bird not fully thawed and dried going into hot oil', severity: 'critical', mitigation: 'Level ground, well away from the house, deck rails, and anything overhanging; a grease-rated extinguisher within reach, never water; the bird fully thawed and patted dry; the burner off while the bird is lowered; and one sober adult who never leaves the pot.' },
    { id: 'r_kitchen_crowd', trigger: 'Everyone gathers in the kitchen during the most dangerous hour', severity: 'low', mitigation: 'Put the drinks and the grazing table in another room on purpose. Give would-be helpers real jobs away from the stove: drinks, the kids table, the door.' },
  ],

  contingencies: [
    { id: 'c_frozen', when: 'r_frozen', plan: 'Cold-water thaw immediately: sink or cooler, fully submerged, water changed every thirty minutes. Push the serve time back once by the honest amount, and let the appetizers carry the gap. A spatchcocked bird also roasts in nearly half the time if you or a confident guest can break it down.' },
    { id: 'c_oven_crunch', when: 'r_oven_crunch', plan: 'Triage by what tolerates holding: mash and gravy to slow cookers, casseroles reheated during the rest window, rolls last. If a dish must be sacrificed, cut the one nobody named as theirs — the table remembers the stuffing, not the third vegetable.' },
    { id: 'c_undercooked', when: 'r_undercooked', plan: 'Carve off what is done — breast often finishes first — return the rest to a hot oven in pieces, and serve in two waves without apology. Pieces cook fast; a whole bird returned whole does not.' },
    { id: 'c_travel', when: 'r_travel', plan: 'Serve the guests who are present at a reasonable hour and hold generous plates warm for the travelers — a foil-covered plate over a pot of barely simmering water, or the oven at its lowest. The travelers get a fresh, hot plate and a seat saved, not a cold buffet.' },
    { id: 'c_dietary', when: 'r_dietary', plan: 'Build them a safe plate first from the dishes you know: plain vegetables before butter, the meatless stuffing, potatoes before gravy. Say quietly what is in each dish rather than making them interrogate the table.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-7d', what: 'Thermometer, roasting pan check, foil and twine — the equipment run, while stores still have them' },
      { when: 'T-3d', what: 'The big grocery run: everything but the last fresh items; leftover containers and the cleanup kit' },
      { when: 'T-1d', what: 'Fresh herbs, bakery rolls or pies, flowers for the table, and anything the line-by-line menu check turned up missing' },
    ],
    preparation: [
      { when: 'T-1d evening', what: 'Make-ahead cooking: pies, cranberry sauce, casseroles to ready-to-bake, gravy base from stock; set the table; stage the refrigerator' },
    ],
    cooking: [
      { when: 'T0 -6h', what: 'Turkey prepped and into the oven on the map\'s schedule; timer set for the first check' },
      { when: 'T0 -4:30', what: 'Baste and rotate the bird; casseroles out of the refrigerator to lose their chill; potatoes peeled into cold water' },
      { when: 'T0 -3h', what: 'Grazing table out and drinks iced — away from the kitchen on purpose; kids table stocked' },
      { when: 'T0 -2h', what: 'Potatoes on to boil; thermometer check on the bird against the map, and the serve-time call made now if it must slip' },
      { when: 'T0 -1h', what: 'Turkey out to rest under foil — the freed oven starts the side rotation: casseroles in, stuffing browning' },
      { when: 'T0 -0:30', what: 'Mash finished and held warm; gravy finished with the drippings; rolls in for their ten minutes' },
    ],
    program: [
      { when: 'T0 +10m', what: 'Arrivals: coats, first drinks, travelers landed and settled; helpers given real jobs away from the stove' },
      { when: 'T0 +20m', what: 'Arriving dishes landed, labeled, and slotted into the oven map; serving spoons matched to dishes' },
      { when: 'T0 +1h', what: 'Dinner: everything to the table at once — carve, sauce boats out, sides in their places, and sit down yourself' },
      { when: 'T0 +1:45', what: 'Seconds round; kids table check; the thankful-for moment if your table does one' },
      { when: 'T0 +2:30', what: 'Dessert and coffee: pies out with the whipped cream, the table cleared to make room' },
      { when: 'T0 +3:30', what: 'Leftovers packed into send-home containers — inside the two-hour safety window, dressed as hospitality' },
      { when: 'T0 +4:30', what: 'The long afternoon: games, the walk, the couch — and the long-drive guests nudged toward the road with coffee and their container' },
    ],
    cleanup: [
      { when: 'during', what: 'Wash as the day goes — the roasting rack soaks the moment the bird comes out; turkey fat into a jar, never the drain; dishwasher run in shifts' },
      { when: 'T0 +5:30', what: 'Final reset: last dishes in, counters cleared, trash out, tomorrow\'s turkey-sandwich supplies front and center in the refrigerator' },
    ],
  },

  // Day-of readiness — food safety and timing are the whole game on this day.
  dayOfChecklist: [
    { id: 'thaw', label: 'The turkey is fully thawed', detail: 'No ice in the cavity, legs move freely. If not, cold-water thaw starts now — submerged, water changed every thirty minutes — and the serve time moves once, honestly.', severity: 'high' },
    { id: 'ovenmap', label: 'The oven map is on the refrigerator', detail: 'Every dish has its slot and its temperature, back-planned from serve time. The day runs off the paper, not off memory under pressure.', severity: 'high' },
    { id: 'thermometer', label: 'Thermometer works and the target is known', detail: '165 degrees in the thickest part of the thigh, not touching bone. The pop-up button and the clock are both guesses; the thermometer is the answer.', severity: 'high' },
    { id: 'foodsafety', label: 'The two-hour rule has an owner', detail: 'Perishable food sits out no more than two hours. Leftovers pack when dessert goes out, and the send-home containers are already staged.', severity: 'high' },
    { id: 'fire', label: 'Kitchen fire basics checked', detail: 'Thanksgiving is the peak day of the year for US home cooking fires. Extinguisher reachable, stovetop never left unattended, handles turned in, and the fryer — if there is one — far from the house with a sober owner.', severity: 'high' },
    { id: 'dietary', label: 'Every dietary fix is cooked and labeled', detail: 'The meatless stuffing, the flourless gravy, the vegan side — done, labeled, and the guest who needs them knows without asking.', severity: 'med' },
    { id: 'seats', label: 'A real seat for every confirmed guest', detail: 'Chairs counted against the final headcount, the kids table set, and the table extended before anyone arrives — not while holding a hot bird.', severity: 'med' },
    { id: 'guestroom', label: 'The guest room is actually ready', detail: 'Beds made, towels out, chargers and the wifi password waiting — checked before the first traveler arrives, not at ten at night.', severity: 'low' },
    { id: 'arrivals', label: 'Arrival windows rechecked against the road', detail: 'A text to each traveling car mid-morning. The serve time flexes around the honest answer, and nobody eats while the family is still on the highway.', severity: 'low' },
  ],

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'partial',
    note: 'GROUNDING PASS 2026-08-21 (same day as authoring): food-safety practice is now CITED, not merely reflected — refrigerator thawing at 24 hours per 4-5 lb, the cold-water rescue at 30 minutes per pound, and the 165°F three-point thermometer check are verified against USDA FSIS (fsis-turkey-thaw); the two-hour rule and leftover handling against fsis-danger-zone/fsis-leftovers; fryer siting and thawed-bird rules against usfa-turkey-fryer, and grease-fire response against nfpa-cooking-tips. The five-day thaw start held up against the FSIS rate (3-4 days for a 12-16 lb bird, plus margin) — no lead time changed. Costs: turkey (frozen floor $1.34/lb), rolls, vegetable sides, pie components (AFBF 2025 survey, afbf-thanksgiving-2025), wine and sparkling cider, and the cleanup kit now carry cited costProvenance. Quantity heuristics (1.5 lb bird per guest, pie per six, bottle per four) remain synthesized — no fetched source states them, and the hosting-model cost ratios remain synthesized for the same reason. ORIGINAL AUTHORING NOTE: authored 2026-08-21 off the seasonal-demand study (Q6.3): Thanksgiving is the most-hosted US occasion (66% of hosts, HomePage News 2026 entertaining study) and its dominant documented pain is dish timing — 56% of holiday cooks name getting every dish done at the same moment as the single biggest headache, with oven-space conflict the top named stressor (Ipsos/Samsung). The playbook therefore centers the back-planned day: the turkey scheduled from serve time, a written one-oven map, and the rest window treated as the release valve that frees the oven for the sides. The potluck/Friendsgiving model is a decision inside this playbook rather than a separate type, and Christmas dinner is deliberately not covered here — its mechanics overlap, but this wording stays Thanksgiving-specific and a variant ships product-side later. Quantities (about 1.5 lb whole bird per guest with leftovers intended, half-pound side portions, one pie per six guests, one wine bottle per four guests for a meal-centered afternoon) are established US holiday-cooking heuristics labeled synthesized. Food-safety guidance (refrigerator thawing at roughly a day per four to five pounds, 165 degrees in the thigh, the two-hour rule for perishable food, cooking-fire and fryer precautions) reflects widely published USDA and NFPA-style consumer guidance, stated here as practice, not citation. Lead times: the 21-day planning start matches Dinner Party and The Cookout; the turkey order at 21 days and the five-day thaw start are conservative judgments documented in the file header; the three-day headcount lock mirrors The Cookout. No fabricated sources.',
    sources: ['fsis-turkey-thaw', 'fsis-danger-zone', 'fsis-temp-chart', 'fsis-leftovers', 'usfa-turkey-fryer', 'nfpa-cooking-tips', 'afbf-thanksgiving-2025'],
  },
};

export default thanksgivingHosting;
