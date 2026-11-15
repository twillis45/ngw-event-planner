// Friendsgiving — Event OS host playbook (data only).
//
// Authored 11/15/2026 by owner decision: Friendsgiving becomes its OWN type.
// It used to be one answer inside Thanksgiving Hosting (hosting_model), per the
// 8/21/2026 seasonal-demand study (Q6.2). The owner ruled that the two events
// differ in more than that one answer, and the differences are what this file
// is: who the guests are (friends, not traveling family), when it falls (most
// often a weekend near Thanksgiving, not the Thursday), who cooks (a potluck by
// default, with the host on the main), how drinks and money are handled
// (bring-a-bottle, splitting costs), and where it happens (often not the
// host's own home). Thanksgiving Hosting is unchanged and keeps the family
// dinner, the one-oven map, and the guest room.
//
// RESEARCH (fetched 11/15/2026; full list in knowledge.note):
//   • Food Network: the host makes the turkey and gravy, because nobody wants
//     to transport a hot bird; assign each guest a dish category.
//     → hosting_model default, main_dish default, the assign task.
//   • Evite: invite three weeks out with a "What to Bring" list; buy drinks a
//     week out; the weekend before Thanksgiving is a common pick.
//     → leadTimeDays 21, the invite task, the drinks decision at T-7d.
//   • FARE: ingredient labels on every dish; allergic guests serve first;
//     a separate container and spoon. → the labels purchase, day-of checklist.
//   • USDA FSIS (registered earlier): 40-140°F danger zone, two hours out
//     (one above 90°F), reheat to 165°F, the Cooking for Groups guide for
//     dishes made at home and carried in. → transport and holding tasks.
//   • Costs: AFBF 2025, Wells Fargo 2025 (about $8-9.50 a person for the
//     classic grocery basket), Chime/Talker 2025 ($21.88 a plate).
//
// LEAD-TIME JUDGMENTS (documented, conservative where no source states one):
//   • 21-day start = Evite's three-week invite.
//   • 14-day dish assignment mirrors Thanksgiving Hosting and The Cookout.
//   • Turkey bought by T-7d and thawed from T-5d: FSIS refrigerator thawing
//     runs about a day per 4-5 lb; the default 10-15 guest bird is 12-19 lb,
//     so 3-5 days — the Thanksgiving Hosting rule, cited, not re-judged.
//   • 4-day dish confirmation: a judgment — close enough that plans are real,
//     early enough to fill a gap with one grocery run.
// Quantities are US holiday heuristics labeled synthesized. No fabricated
// sources, no fabricated costProvenance. ESM default export.

// The four hosting models, named once so every whenChoice reads the same strings.
const HOST_MAIN = 'Potluck — host makes the main, friends each bring an assigned dish';
const ALL_ASSIGNED = 'Full potluck — even the main is assigned to a friend';
const HOST_COOKS = 'Host cooks most of it — friends bring drinks and dessert';
const ORDERED = 'Ordered in — a restaurant or caterer cooks, the group splits the bill';
// The host buys and roasts the main only in these two.
const HOST_BUYS_MAIN = [HOST_MAIN, HOST_COOKS];

const TURKEY = 'Roast turkey';
const BREAST = 'A turkey breast or a smaller bird';
const OTHER_MAIN = 'Something else — ham, roast chicken, or a big vegetarian main';
const NO_MAIN = 'No single main — a table of shareable dishes';
const BIRD = [TURKEY, BREAST];

const friendsgiving = {
  type: 'Friendsgiving',
  vegMain: 'A big roasted-vegetable and wild rice dish that stands on its own as a main',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',

  meta: {
    summary:
      'Thanksgiving with the people you chose: most often a weekend near the holiday, and most often a potluck. The host makes the main, usually the turkey, and every friend brings a dish they were assigned by name, so the table has potatoes, stuffing, a green vegetable, a real vegan dish and dessert instead of three bags of rolls. The plan keeps the things a potluck gets wrong: dishes that arrive cold or sit out too long, an allergy nobody labeled, oven traffic when five people need to reheat at once, and the money conversation nobody wants to start.',
    typicalGuests: { low: 6, default: 10, high: 25 },
    typicalDurationHours: 5,
    leadTimeDays: 21,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 8, high: 22, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The table fills up dish by dish as people arrive, and it turns out to be a feast.',
    'Someone brings the dish their family makes every year, and tells the story behind it.',
    'The friend with the allergy fills a plate first without asking a single question.',
    'Somebody raises a glass to the people around the table, and means it.',
    'Everyone leaves carrying a container, and nobody has to take their dish home full.',
  ],

  decisions: [
    {
      id: 'hosting_model',
      label: 'Who cooks what?',
      options: [HOST_MAIN, ALL_ASSIGNED, HOST_COOKS, ORDERED],
      default: HOST_MAIN,
      defaultWhy: 'The host making the main and everyone else bringing an assigned dish is the default because it is how Food Network tells hosts to run it: the host keeps the turkey and gravy because nobody wants to carry a hot bird across town, and each friend owns one dish category. Change it if a friend is known for their turkey, if you would rather cook it all, or if the group would rather order in.',
      when: 'T-21d',
      timingProvenance: { tier: 'researched', verificationStatus: 'researched', sources: ['evite-friendsgiving'], claim: 'Invite three weeks ahead with a "What to Bring" list on the invitation — so who cooks what is settled three weeks out, when the invite goes out.', rationale: 'The What to Bring list rides on the invitation, so the model has to be decided before it is sent.' },
      blocks: ['food'],
      // NO costFactors, on purpose: the cost effect is WHICH LINES APPEAR. The
      // host's main and gravy show only when the host buys the main, the potluck
      // sides line ("Guests bring") only under a potluck, the grocery sides line
      // only when the host cooks, and "Ordered in" is the caterer path
      // (CATERER_OPTION_RE). A multiplier on top would scale lines that are not
      // there — the Watch Party `major_event` pattern, noted in playbookContract.
      weight: 'high', reversibility: 'costly', emotionalWeight: 'med', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'This one call sets the shopping list, the What to Bring list on the invite, and who is trusted with which dish. Assignments are personal, so changing them late is awkward, and only the host knows their friends.', tier: 'reasoned' },
      why: 'The biggest lever on the day. When the host makes the main, the host controls the dish that is hardest to carry and hardest to get right, and everyone else brings one thing. Assigning even the main makes the host a coordinator. Cooking most of it yourself makes it your dinner party with help on dessert. Ordering in costs the most but buys back the whole cooking day, and the group splits the bill.',
    },
    {
      id: 'main_dish',
      label: 'What is the main?',
      options: [TURKEY, BREAST, OTHER_MAIN, NO_MAIN],
      default: TURKEY,
      defaultWhy: 'A roast turkey is the default because it is what the meal is named for and what most tables expect. A breast or a smaller bird is the right call under eight guests; plenty of Friendsgivings skip the bird entirely. Change it if your table is small, if a friend is bringing the main, or if nobody wants turkey.',
      when: 'T-14d',
      blocks: ['menu', 'oven_plan'],
      weight: 'med', reversibility: 'reversible', emotionalWeight: 'med', difmCapable: 'can-derive',
      priorityBasis: { rationale: 'The main decides the oven for most of the afternoon and the one food-safety job that needs a thermometer; it can change cheaply two weeks out and not on the day.', tier: 'reasoned' },
      why: 'This is really an oven and a timing decision. A whole bird owns the oven for hours and needs days to thaw. A breast cooks in about half the time and suits a small table. A ham or roast chicken is easier; a big vegetarian main means the whole table can eat the centerpiece. With no single main, the potluck is the meal, and the host\'s job is coordination.',
    },
    {
      id: 'drinks',
      label: 'How are drinks handled?',
      options: ['Friends bring a bottle; host covers ice, water, and something zero-proof', 'Host covers all the drinks', 'One or two friends own the drinks'],
      default: 'Friends bring a bottle; host covers ice, water, and something zero-proof',
      defaultWhy: 'Bring-a-bottle is the default because a potluck already splits the food, and drinks split the same way. The host still owns the things nobody thinks to bring: ice, water, and a real non-alcoholic option for drivers and non-drinkers. Change it if you would rather stock the bar yourself, or if one friend loves running the drinks.',
      when: 'T-7d',
      timingProvenance: { tier: 'researched', verificationStatus: 'researched', sources: ['evite-friendsgiving'], claim: 'Buy drinks (wine, beer, cider) one week ahead.', rationale: 'The drinks plan is settled the week the drinks are bought.' },
      blocks: ['beverage'],
      costFactors: { 'Host covers all the drinks': 3, 'One or two friends own the drinks': 0.5 },
      costFactorProvenance: { tier: 'synthesized', confidence: 'low', verificationStatus: 'synthesized', note: 'Base is the host covering ice, water and one zero-proof option. Covering all the drinks roughly triples it; handing the drinks to friends leaves the host only the ice.', claim: 'Covering every drink costs about three times the bring-a-bottle basics; handing drinks to friends halves the host\'s drink spend', sufficientWhen: 'A per-guest drinks spend for a holiday dinner confirms the multiple; Chime/Talker reports $110 on drinks against $175 on food for a family Thanksgiving, which is a different, larger event' },
      affects: ['p_drinks'],
      weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive',
      priorityBasis: { rationale: 'Drinks are the easiest thing to split and the easiest to forget the basics of; a week out is when they get bought.', tier: 'reasoned' },
      why: 'A long dinner with friends is a drinking evening for some and a driving evening for others. Whatever the plan, the host should own ice, water, and something good without alcohol that sits on the table, not in the back of the fridge. If someone is driving home late, that is the host\'s business too.',
    },
    {
      id: 'serve_time',
      label: 'What time do you eat?',
      options: ['Afternoon, around 3 or 4', 'Evening, around 6 or 7'],
      default: 'Evening, around 6 or 7',
      defaultWhy: 'Evening is the default because friends are not driving home from a family visit and most have a weekend day free to cook their dish. Change it to afternoon if people have kids, long drives, or a second gathering that night.',
      when: 'T-14d',
      blocks: ['run_of_show'],
      weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive',
      priorityBasis: { rationale: 'The turkey start, the arrival window and when friends should leave home with hot dishes all back-solve from the serve time; it is free to change early.', tier: 'reasoned' },
      why: 'Everything back-plans from this hour: when the bird goes in, when friends should arrive with their dishes, and when the oven has to be free for their reheating. Tell guests both times: when to arrive and when you eat.',
    },
    {
      id: 'dietary_table',
      label: 'Who has an allergy or dietary need to plan around?',
      options: ['Nobody at this table', 'One or two needs — label dishes and plan a safe plate', 'Several — plan dishes everyone can eat'],
      default: 'One or two needs — label dishes and plan a safe plate',
      when: 'T-14d',
      timingProvenance: { tier: 'researched', verificationStatus: 'researched', sources: ['withjoy-dietary'], claim: 'Collect dietary restrictions with the RSVPs and consolidate the final list one to two weeks before the event.', rationale: 'Dietary needs ride on the RSVP; two weeks out the dish assignments can still route around them.' },
      blocks: ['menu'],
      noCostEffect: true,
      weight: 'high', reversibility: 'costly', emotionalWeight: 'med', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'In a potluck, a dozen people cook and only the host knows who is allergic. The fix is cheap when the cooks know two weeks out and impossible at the table.', tier: 'reasoned' },
      why: 'At a potluck the host is not the cook, so the allergy has to travel to every cook. Ask on the invitation, then tell each friend what to avoid in their dish. FARE\'s advice for shared holiday meals: a label on every dish naming what is in it, keep the packaging or a photo of the ingredient list, and let the guest with the allergy serve first, from their own container with its own spoon.',
    },
    {
      id: 'cost_split',
      label: 'How is money handled?',
      options: ['The potluck is the split — no money changes hands', 'Split shared costs evenly afterward', 'Everyone chips in a set amount up front'],
      default: 'The potluck is the split — no money changes hands',
      defaultWhy: 'When everyone brings a dish, the cooking is the contribution, so nothing else changes hands by default. If the host is buying the turkey and the drinks for fifteen, splitting the shared costs is fair and common, and it is much easier to say on the invitation than after the dishes are done.',
      when: 'T-21d',
      blocks: ['budget'],
      noCostEffect: true,
      weight: 'low', reversibility: 'reversible', emotionalWeight: 'med', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'Money is the conversation friends avoid; deciding it once, before the invite, is what keeps it from going sour afterward. Only the host knows the group.', tier: 'reasoned' },
      why: 'Splitting is generational: in a 2025 survey for Chime, one in three baby boomers said the host should pay for everything, while 33% of Gen Z said it should be split evenly. Say the plan on the invitation. If you split afterward, keep receipts for the shared things (turkey, drinks, plates) and send one request within two days.',
    },
  ],

  milestones: [
    { id: 'fg_plan', name: 'Pick the date, the guest list, and who cooks what', offsetDays: 21, owner: 'host', category: 'planning', risk: { ifDelayed: 'Friends fill the weekend with family plans, and the What to Bring list cannot go out', severity: 'high' } },
    { id: 'fg_invite', name: 'Send the invitation with the What to Bring list and the allergy question', offsetDays: 21, owner: 'host', dependsOn: ['fg_plan'], category: 'guest', risk: { ifDelayed: 'Fewer yeses, and the dishes get decided by whoever answers last', severity: 'high' } },
    { id: 'fg_assign', name: 'Assign every dish by name', offsetDays: 14, owner: 'host', dependsOn: ['fg_invite'], category: 'food', risk: { ifDelayed: 'Three mac and cheeses, no green vegetable, and nothing a vegan friend can eat', severity: 'med' } },
    { id: 'fg_main', name: 'Buy or reserve the main', offsetDays: 7, owner: 'host', dependsOn: ['fg_plan'], category: 'food', risk: { ifDelayed: 'A frozen bird bought too late cannot thaw in time', severity: 'high' } },
    { id: 'fg_drinks', name: 'Settle the drinks and buy the basics', offsetDays: 7, owner: 'host', dependsOn: ['fg_plan'], category: 'shopping', risk: { ifDelayed: 'Plenty of wine, no ice, and nothing for the drivers', severity: 'low' } },
    { id: 'fg_thaw', name: 'Start thawing the turkey in the refrigerator', offsetDays: 5, owner: 'host', dependsOn: ['fg_main'], category: 'food', risk: { ifDelayed: 'A turkey still frozen on the morning', severity: 'high' } },
    { id: 'fg_confirm', name: 'Confirm the headcount, every dish, and every allergy', offsetDays: 4, owner: 'host', dependsOn: ['fg_assign'], category: 'guest', risk: { ifDelayed: 'A missing dish or an unlabeled allergen discovered at the table', severity: 'high' } },
    { id: 'fg_shop', name: 'Shop for the main, the basics, and the gaps', offsetDays: 2, owner: 'host', dependsOn: ['fg_confirm'], category: 'shopping', risk: { ifDelayed: 'Picked-over shelves the week of Thanksgiving', severity: 'med' } },
    { id: 'fg_setup', name: 'Set up the table, the buffet, the labels, and the cooler', offsetDays: 1, owner: 'host', dependsOn: ['fg_confirm'], category: 'setup', risk: null },
    { id: 'event', name: 'Friendsgiving', offsetDays: 0, owner: 'host', dependsOn: ['fg_setup'], category: 'event', risk: null },

    // ── AFTER THE DAY (negative offsetDays = days after the event) ────────────
    { id: 'fg_leftovers', name: 'Get the leftovers into the right hands', offsetDays: -1, owner: 'host', dependsOn: ['event'], category: 'food', risk: { ifDelayed: 'Good food thrown out', severity: 'low' } },
    { id: 'fg_settle', name: 'Settle any shared costs', offsetDays: -2, owner: 'host', dependsOn: ['event'], category: 'planning', risk: { ifDelayed: 'A small debt turns into an awkward one', severity: 'low' } },
    { id: 'fg_return', name: 'Return every dish and container to its owner', offsetDays: -3, owner: 'host', dependsOn: ['event'], category: 'cleanup', risk: { ifDelayed: 'Someone\'s good casserole dish lives in your cupboard until spring', severity: 'low' } },
  ],

  tasks: [
    { id: 't_model', milestoneId: 'fg_plan', phase: 'planning', label: 'Decide who cooks what: you make the main and friends bring dishes, everything assigned, you cook most of it, or the group orders in', when: 'T-21d' },
    { id: 't_money', milestoneId: 'fg_plan', phase: 'planning', label: 'Decide how money works, so you can say it on the invitation instead of after dinner', when: 'T-21d' },
    { id: 't_invite', milestoneId: 'fg_invite', phase: 'guest', label: 'Send the invitation with the date, the arrive and eat times, a What to Bring list, and the question: any allergies or dietary needs?', when: 'T-21d' },
    { id: 't_assign', milestoneId: 'fg_assign', phase: 'food', label: 'Assign each friend a dish by name: potatoes, stuffing, a green vegetable, a real vegan dish, cranberry, rolls, dessert. Nothing twice, nothing missing', when: 'T-14d', whenChoice: { id: 'hosting_model', in: [HOST_MAIN, ALL_ASSIGNED] } },
    { id: 't_assign_main', milestoneId: 'fg_assign', phase: 'food', label: 'Ask one friend to own the main, and agree on its size and when it arrives', when: 'T-14d', whenChoice: { id: 'hosting_model', in: [ALL_ASSIGNED] } },
    { id: 't_assign_light', milestoneId: 'fg_assign', phase: 'food', label: 'Ask friends to bring the drinks and the desserts, and say who brings which', when: 'T-14d', whenChoice: { id: 'hosting_model', in: [HOST_COOKS] } },
    { id: 't_order', milestoneId: 'fg_assign', phase: 'food', label: 'Choose the restaurant or caterer, book it for the headcount, and get the per-person price in writing so the split is simple', when: 'T-14d', whenChoice: { id: 'hosting_model', in: [ORDERED] } },
    { id: 't_allergy_route', milestoneId: 'fg_assign', phase: 'food', label: 'Tell each cook what to keep out of their dish, by name: "no nuts in the stuffing, please — Jordan is allergic"', when: 'T-14d', whenChoice: { id: 'dietary_table', in: ['One or two needs — label dishes and plan a safe plate', 'Several — plan dishes everyone can eat'] } },
    { id: 't_buy_bird', milestoneId: 'fg_main', phase: 'food', label: 'Buy the turkey: about a pound and a quarter per guest for a whole bird, and a size that fits your oven', when: 'T-7d', whenChoice: [{ id: 'hosting_model', in: HOST_BUYS_MAIN }, { id: 'main_dish', in: BIRD }] },
    { id: 't_buy_main', milestoneId: 'fg_main', phase: 'food', label: 'Buy or order the main, and check it fits your oven alongside a friend\'s dish that needs reheating', when: 'T-7d', whenChoice: [{ id: 'hosting_model', in: HOST_BUYS_MAIN }, { id: 'main_dish', in: [OTHER_MAIN] }] },
    { id: 't_drinks', milestoneId: 'fg_drinks', phase: 'shopping', label: 'Buy ice, water, and one good zero-proof drink; tell friends what to bring to drink', when: 'T-7d' },
    { id: 't_thaw', milestoneId: 'fg_thaw', phase: 'food', label: 'Move the frozen turkey to the refrigerator: it thaws at about a day for every four to five pounds', when: 'T-5d', whenChoice: [{ id: 'hosting_model', in: HOST_BUYS_MAIN }, { id: 'main_dish', in: BIRD }] },
    { id: 't_confirm', milestoneId: 'fg_confirm', phase: 'guest', label: 'Confirm the headcount and every dish: who is bringing what, whether it arrives hot or cold, and whether it needs the oven', when: 'T-4d' },
    { id: 't_fill_gaps', milestoneId: 'fg_confirm', phase: 'food', label: 'Fill any gap now with one grocery run, not on the day', when: 'T-4d' },
    { id: 't_transport_note', milestoneId: 'fg_confirm', phase: 'guest', label: 'Send the cooks one note: hot dishes leave home hot and wrapped in towels, cold dishes travel in a cooler, and tell me if yours needs the oven', when: 'T-3d', whenChoice: { id: 'hosting_model', in: [HOST_MAIN, ALL_ASSIGNED, HOST_COOKS] } },
    { id: 't_shop', milestoneId: 'fg_shop', phase: 'shopping', label: 'Shop for the main, the basics, and any gap, then check the list against the dish assignments', when: 'T-2d' },
    { id: 't_oven_slots', milestoneId: 'fg_setup', phase: 'planning', label: 'Write the oven and stovetop slots for the friends who need to reheat, so five dishes do not land at once', when: 'T-1d', whenChoice: { id: 'hosting_model', in: [HOST_MAIN, ALL_ASSIGNED, HOST_COOKS] } },
    { id: 't_buffet', milestoneId: 'fg_setup', phase: 'setup', label: 'Set the buffet: a spot and a spoon for every dish, labels and a marker, the allergy-safe dishes at the front', when: 'T-1d' },
    { id: 't_cooler', milestoneId: 'fg_setup', phase: 'setup', label: 'Clear refrigerator space for cold dishes and fill a cooler with ice for drinks', when: 'T-1d' },
    { id: 't_bird_in', milestoneId: 'event', phase: 'food', label: 'Turkey into the oven on schedule, back-planned from dinner, an hour after friends arrive', when: 'T0 -4h', whenChoice: [{ id: 'hosting_model', in: HOST_BUYS_MAIN }, { id: 'main_dish', in: [TURKEY] }] },
    { id: 't_arrivals', milestoneId: 'event', phase: 'guest', label: 'Land each dish as it arrives: label it with what is in it, give it its spot, oven, refrigerator or table, and its spoon', when: 'T0 +0:10' },
    { id: 't_safe_first', milestoneId: 'event', phase: 'food', label: 'Let the friend with the allergy fill a plate first, from the labeled dishes', when: 'T0 +1h', whenChoice: { id: 'dietary_table', in: ['One or two needs — label dishes and plan a safe plate', 'Several — plan dishes everyone can eat'] } },
    { id: 't_serve', milestoneId: 'event', phase: 'food', label: 'Dinner: everything to the buffet at once, and sit down yourself', when: 'T0 +1h' },
    { id: 't_two_hours', milestoneId: 'event', phase: 'food', label: 'Two hours after serving, perishable food goes in the refrigerator or home with someone', when: 'T0 +3h' },
    { id: 't_leftover_send', milestoneId: 'fg_leftovers', phase: 'food', label: 'Send leftovers home in containers, and give each cook first claim on their own dish', when: 'T0 +1d' },
    { id: 't_settle', milestoneId: 'fg_settle', phase: 'planning', label: 'Add up the shared receipts and send one request to each friend, with the receipts attached', when: 'T0 +2d', whenChoice: { id: 'cost_split', in: ['Split shared costs evenly afterward'] } },
    { id: 't_thanks', milestoneId: 'fg_settle', phase: 'guest', label: 'Thank each cook by name, and tell them which dish disappeared first', when: 'T0 +2d' },
    { id: 't_return_dishes', milestoneId: 'fg_return', phase: 'cleanup', label: 'Wash and return every dish, lid, and spoon to its owner', when: 'T0 +3d' },
  ],

  purchases: [
    { id: 'p_turkey', item: 'Turkey (whole bird, or a breast for a small table)', category: 'food', qtyPerGuest: 1.25, unit: 'lb', where: ['Grocery', 'Butcher', 'Costco'], unitCostRange: [1, 4], essential: true, buyAt: 'T-7d', whenChoice: [{ id: 'hosting_model', in: HOST_BUYS_MAIN }, { id: 'main_dish', in: BIRD }], alternatives: ['Frozen store-brand bird: cheapest, needs the full thaw', 'Bone-in breast: the right answer under eight guests', 'A fully cooked bird from a market: costs more, removes the biggest risk'], note: 'About a pound and a quarter per guest: less than a family Thanksgiving because a potluck table carries more dishes. Frozen birds sit at the floor of the range, fresh and heritage at the ceiling.', provenance: { tier: 'heuristic', confidence: 'low', verificationStatus: 'synthesized', sources: [], note: 'US holiday heuristic of 1 to 1.5 lb whole bird per guest; the lower middle chosen because the potluck spread is wider than a family table.' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['afbf-thanksgiving-2025', 'turkey-shelf-2025'], lastVerified: '2026-11-15', claim: 'AFBF 2025 survey: a 16-lb frozen turkey at $21.50, $1.34 a pound, anchors the floor at grocery, and November promotional shelf prices run lower still (Aldi $0.77 a pound, Butterball $0.97-0.99). Fresh and heritage birds are unpriced by both, so the $4 ceiling is retail judgment.', sufficientWhen: 'One fresh and one heritage per-pound shelf price confirm the ceiling.' } },
    { id: 'p_gravy', item: 'Gravy makings (stock, a thickener, and a jar as backup)', category: 'food', qtyFlat: 1, unit: 'batch', where: ['Grocery'], unitCostRange: [5, 12], essential: true, buyAt: 'T-2d', whenChoice: [{ id: 'hosting_model', in: HOST_BUYS_MAIN }, { id: 'main_dish', in: BIRD }], note: 'Gravy stays with whoever cooks the bird: the drippings are in that pan.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_main_alt', item: 'The main (ham, roast chicken, or a big vegetarian main)', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Butcher', 'Costco'], unitCostRange: [3, 8], essential: true, buyAt: 'T-2d', whenChoice: [{ id: 'hosting_model', in: HOST_BUYS_MAIN }, { id: 'main_dish', in: [OTHER_MAIN] }], note: 'Half a pound per guest for a boneless main beside a full potluck spread.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_sides', item: 'Sides friends bring (potatoes, stuffing, a green vegetable, cranberry, a real vegan dish)', category: 'food', qtyPerGuest: 0.75, unit: 'lb', where: ['Guests bring', 'Grocery'], unitCostRange: [1, 3], essential: true, buyAt: 'T-2d', whenChoice: { id: 'hosting_model', in: [HOST_MAIN, ALL_ASSIGNED] }, note: 'Assigned to friends by name; this line is what it costs if you end up covering one. At least one dish should be truly vegan and labeled.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['afbf-thanksgiving-2025', 'usda-feature-produce-2026'], lastVerified: '2026-11-15', claim: 'AFBF 2025: sweet potatoes $1.33 a pound, frozen peas $2.03 a pound, a 1-lb veggie tray $1.36; USDA AMS advertised-feature sweet potatoes ran $0.99-1.19 a pound in August 2026. Both sit inside this $1-3 band.', sufficientWhen: 'One green-bean and one potato shelf price per pound confirm the band.' } },
    { id: 'p_sides_host', item: 'Sides you cook (potatoes, stuffing, a green vegetable, cranberry, a real vegan dish)', category: 'food', qtyPerGuest: 0.75, unit: 'lb', where: ['Grocery', 'Costco'], unitCostRange: [1, 3], essential: true, buyAt: 'T-2d', whenChoice: { id: 'hosting_model', in: [HOST_COOKS] }, note: 'Two or three sides for a table of ten, and one that is genuinely vegan, labeled so nobody has to ask.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['afbf-thanksgiving-2025', 'usda-feature-produce-2026'], lastVerified: '2026-11-15', claim: 'AFBF 2025: sweet potatoes $1.33 a pound, frozen peas $2.03 a pound, a 1-lb veggie tray $1.36; USDA AMS advertised-feature sweet potatoes ran $0.99-1.19 a pound in August 2026. Both sit inside this $1-3 band.', sufficientWhen: 'One green-bean and one potato shelf price per pound confirm the band.' } },
    { id: 'p_rolls', item: 'Dinner rolls & butter', category: 'food', qtyPerGuest: 1.5, unit: 'rolls', where: ['Grocery', 'Bakery', 'Guests bring'], unitCostRange: [0.3, 0.8], essential: true, buyAt: 'T-2d', note: 'The easiest assignment for the friend who does not cook.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_desserts', item: 'Desserts (pies or whatever the friends who bake are known for)', category: 'food', qtyFlat: 1, qtyPer: 6, unit: 'dessert per 6 guests', where: ['Guests bring', 'Bakery', 'Grocery'], unitCostRange: [6, 20], essential: true, buyAt: 'T-1d', note: 'One per six guests keeps more than one kind on the table.', provenance: { tier: 'heuristic', confidence: 'low', verificationStatus: 'synthesized', sources: [], note: 'One pie per six guests: the Thanksgiving Hosting heuristic for a table that tastes two desserts.' } },
    { id: 'p_apps', item: 'Snacks while dishes arrive (cheese, crackers, crudités)', category: 'food', qtyPerGuest: 3, unit: 'bites', where: ['Grocery', 'Costco', 'Guests bring'], unitCostRange: [0.5, 1.5], essential: true, buyAt: 'T-2d', note: 'Dishes arrive over an hour; something to eat keeps people out of the kitchen while the oven is busy.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_drinks', item: 'Drinks the host covers (sparkling water, cider, one zero-proof option)', category: 'beverage', qtyFlat: 1, qtyPer: 4, unit: 'bottle per 4 guests', where: ['Grocery', 'Wine shop'], unitCostRange: [4, 12], essential: true, buyAt: 'T-7d', note: 'Under bring-a-bottle the host still owns the non-alcoholic side of the table, and it should be good enough to want.', provenance: { tier: 'heuristic', confidence: 'low', verificationStatus: 'synthesized', sources: [], note: 'One bottle per four guests for the shared non-alcoholic drinks of a meal-centered evening.' } },
    { id: 'p_ice', item: 'Bagged ice for the drinks cooler', category: 'beverage', qtyPerGuest: 1, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.5], essential: true, buyAt: 'T0', note: 'Drinks go in the cooler so the refrigerator stays free for the cold dishes friends carry in.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_labels', item: 'Dish labels and a marker (what it is, who made it, the big allergens)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Office supply', 'Amazon'], unitCostRange: [3, 8], essential: true, buyAt: 'T-2d', note: 'FARE advises an ingredient label on every dish at a shared holiday meal. A folded index card works.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_serveware', item: 'Plates, cups, napkins, and spare serving spoons', category: 'logistics', qtyPerGuest: 1, unit: 'set', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.4, 1.2], essential: true, buyAt: 'T-2d', note: 'Friends forget the spoon for their dish more often than the dish. Keep a few spare.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_thermometer', item: 'Instant-read meat thermometer', category: 'logistics', qtyFlat: 1, unit: 'thermometer', where: ['Grocery', 'Amazon', 'Hardware store'], unitCostRange: [10, 25], essential: true, buyAt: 'T-7d', whenChoice: [{ id: 'hosting_model', in: HOST_BUYS_MAIN }, { id: 'main_dish', in: [TURKEY, BREAST, OTHER_MAIN] }], note: '165 degrees in the thickest part of the thigh, not touching bone. The clock is a guess.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_containers', item: 'Leftover containers to send home', category: 'logistics', qtyPerGuest: 1, unit: 'containers', where: ['Grocery', 'Costco'], unitCostRange: [0.3, 0.8], essential: true, buyAt: 'T-2d', note: 'Friends keep their own dish; the containers carry everyone else\'s leftovers, and they are the plan for the two-hour rule.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_cleanup', item: 'Cleanup kit (trash bags, dish soap, paper towels)', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [7, 15], essential: true, buyAt: 'T-2d', note: 'More dishes to wash than you cooked: every friend\'s pan comes back to the sink.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['costco-cleaning-2026', 'trashbags-retail-2026'], lastVerified: '2026-11-15', claim: 'A cleanup kit is the sum of its parts: about a dozen trash bags at 10-15 cents each, paper towels about $1.97 a roll, and dish soap shared across events, which is the $7-15 range.', sufficientWhen: 'CONFIDENCE IS LOW ON PURPOSE: nobody sells a cleanup kit, and a host who owns soap and towels lands under the floor.' } },
  ],

  rentalsGap: [
    { item: 'Extra chairs, or a plan for eating on the couch', qtyPerGuest: 1, note: 'Friendsgiving often runs past the dining table. Decide early whether everyone sits down or it is a buffet with laps.' },
    { item: 'A folding table for the buffet', qtyFlat: 1, note: 'A potluck needs counter space for a dozen dishes at once.' },
    { item: 'A cooler for the drinks', qtyFlat: 1, note: 'Keeps the refrigerator free for the cold dishes friends bring.' },
    { item: 'A slow cooker or two for keeping dishes hot', qtyFlat: 2, note: 'For HOLDING a hot dish at 140 degrees or above. Reheat on the stove or in the oven first: USDA does not recommend reheating in a slow cooker.' },
  ],

  vendors: [
    { category: 'Prepared holiday dinner (market or restaurant)', required: false, altToDIY: 'A potluck: each friend brings one dish, for a fraction of the cost', when: 'T-14d', costRange: [18, 40], costUnit: 'per guest' },
    { category: 'Restaurant reservation or private room', required: false, altToDIY: 'Host at someone\'s home: the restaurant buys a night without dishes, at restaurant prices', when: 'T-21d', costRange: [30, 75], costUnit: 'per guest' },
  ],

  risks: [
    { id: 'r_duplicates', trigger: 'Three people bring the same dish and nobody brings a vegetable', severity: 'med', mitigation: 'Assign dishes by name two weeks out and keep the list where everyone can see it. Confirm four days out, and fill any gap yourself with one grocery run.' },
    { id: 'r_no_show', trigger: 'A friend cancels the day before, and their dish was the stuffing', severity: 'med', mitigation: 'Know which dishes the meal cannot do without (the main, a starch, a vegetable) and keep a boxed backup for one of them in the pantry. Ask the friend to send the dish with someone else if they can.' },
    { id: 'r_transport', trigger: 'Hot dishes arrive lukewarm and cold ones arrive warm after the drive', severity: 'high', mitigation: 'Food between 40 and 140 degrees is in the danger zone. Hot dishes leave home hot, wrapped in towels or an insulated bag; cold ones travel in a cooler with ice. Anything that needs reheating goes to 165 degrees on the stove or in the oven before it goes back out.' },
    { id: 'r_oven_traffic', trigger: 'Five friends need the oven at the same time', severity: 'med', mitigation: 'Ask in the confirmation who needs the oven, write the slots the day before, and use the turkey\'s rest to reheat. Stovetop dishes and slow cookers on warm take pressure off the oven.' },
    { id: 'r_allergen', trigger: 'An unlabeled dish has an allergen a guest cannot eat', severity: 'high', mitigation: 'Ask with the invitation, tell each cook what to keep out, and label every dish as it lands. FARE: let the guest with the allergy serve first, from their own container with its own spoon.' },
    { id: 'r_frozen', trigger: 'The turkey is still frozen on the morning', severity: 'high', mitigation: 'Refrigerator thawing takes about a day per four to five pounds; start five days out. If it is still icy, a cold-water thaw (submerged, water changed every 30 minutes) moves about a pound every half hour, and dinner moves once, honestly.' },
    { id: 'r_sitting_out', trigger: 'The buffet stays out all evening', severity: 'med', mitigation: 'Two hours is the limit for perishable food at room temperature. Pack leftovers when dessert goes out.' },
    { id: 'r_money', trigger: 'The host spent $200 and nobody mentions it', severity: 'low', mitigation: 'Decide the money plan before the invitation and say it there. If you split afterward, send one request with the receipts within two days.' },
    { id: 'r_driving', trigger: 'A long evening of drinking and friends driving home', severity: 'med', mitigation: 'Put a good non-alcoholic drink on the table, slow the bar after dessert, and know who is driving. A couch, a ride share, or a ride with someone sober is the host\'s problem to solve before anyone leaves.' },
  ],

  contingencies: [
    { id: 'c_no_show', when: 'r_no_show', plan: 'Cover the missing dish from the pantry backup, or move a friend who has not shopped yet onto it. Nobody at the table counts the dishes; they notice a meal without a vegetable.' },
    { id: 'c_transport', when: 'r_transport', plan: 'A cold dish that arrived warm goes straight into the refrigerator. A hot dish that cooled gets reheated to 165 degrees before it is served, and the oven slot plan absorbs it.' },
    { id: 'c_frozen', when: 'r_frozen', plan: 'Cold-water thaw now, or roast it in parts (breast first) so it cooks faster. Tell everyone the new time once and put out more snacks.' },
  ],

  schedules: {
    preparation: [
    ],
    cooking: [
      // T0 is when friends ARRIVE; dinner is an hour later (T0 +1h). The bird is
      // timed to dinner, so its 45-minute rest ends at the carving, not an hour
      // and three quarters before it (the first draft rested it from T0 -0:45).
      { when: 'T0 -4h', what: 'Turkey into the oven, back-planned from dinner an hour after arrivals', whenChoice: [{ id: 'hosting_model', in: HOST_BUYS_MAIN }, { id: 'main_dish', in: [TURKEY] }] },
      { when: 'T0 -2:30', what: 'Baste and check the main; snacks and drinks set out away from the stove; cold dishes stay in the refrigerator' },
      { when: 'T0 -1:30', what: 'Buffet set with labels and spoons; refrigerator space cleared; drinks cooler iced' },
      { when: 'T0 -0:15', what: 'Thermometer check on the main: 165 degrees in the thigh, or dinner moves now, once' },
    ],
    program: [
      { when: 'T0 +10m', what: 'Friends arrive with their dishes: label each one, give it its place, oven, refrigerator or buffet, and its spoon' },
      { when: 'T0 +15m', what: 'Main out to rest under foil for 45 minutes; the oven opens for friends\' reheating slots', whenChoice: { id: 'main_dish', in: [TURKEY, BREAST, OTHER_MAIN] } },
      { when: 'T0 +30m', what: 'Drinks and snacks while the last dishes heat through' },
      { when: 'T0 +1h', what: 'Dinner: everything to the buffet at once; the friend with the allergy fills a plate first' },
      { when: 'T0 +1:30', what: 'A toast or the thankful-for round, if this table does one' },
      { when: 'T0 +2h', what: 'Dessert and coffee' },
      { when: 'T0 +3h', what: 'Leftovers packed inside the two-hour window and sent home in containers' },
      { when: 'T0 +4h', what: 'The long tail: games, music, and a check on who is driving home' },
    ],
    cleanup: [
      { when: 'during', what: 'Wash as you go; set aside each friend\'s dish, lid and spoon together so it goes home with them' },
      { when: 'T0 +5h', what: 'Final reset: last dishes in, trash out, borrowed dishes lined up by owner' },
    ],
  },

  dayOfChecklist: [
    { id: 'thaw', label: 'The turkey is fully thawed', detail: 'No ice in the cavity and the legs move freely. If not, the cold-water thaw starts now.', severity: 'high', whenChoice: [{ id: 'hosting_model', in: HOST_BUYS_MAIN }, { id: 'main_dish', in: BIRD }] },
    { id: 'thermometer', label: 'The thermometer works and the target is known', detail: '165 degrees in the thickest part of the thigh, not touching bone.', severity: 'high', whenChoice: [{ id: 'hosting_model', in: HOST_BUYS_MAIN }, { id: 'main_dish', in: [TURKEY, BREAST, OTHER_MAIN] }] },
    { id: 'every_dish', label: 'Every dish has a cook, and every cook has said yes this week', detail: 'The list matches the table: a main, a starch, a vegetable, a vegan dish, dessert.', severity: 'high' },
    { id: 'labels', label: 'Labels and a marker are at the buffet', detail: 'Each dish gets a name and its big allergens as it lands, so nobody has to ask.', severity: 'high' },
    { id: 'hot_cold', label: 'Hot stays hot, cold stays cold', detail: 'Refrigerator space for cold dishes, the oven or a slow cooker for hot ones. Food between 40 and 140 degrees is in the danger zone.', severity: 'high' },
    { id: 'two_hours', label: 'The two-hour rule has an owner', detail: 'Leftovers pack when dessert goes out, and the containers are already out.', severity: 'med' },
    { id: 'zero_proof', label: 'A good zero-proof drink is on the table', detail: 'Not in the back of the fridge. Drivers and non-drinkers notice.', severity: 'low' },
    { id: 'seats', label: 'A seat, or a lap and a tray, for everyone', detail: 'Chairs counted against the final headcount before people arrive with hot dishes.', severity: 'low' },
  ],

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'partial',
    note: 'AUTHORED 11/15/2026 by owner decision (Friendsgiving split out of Thanksgiving Hosting). RESEARCH, all read 11/15/2026: (1) PREVALENCE, commercial surveys and directional only: Empower (2,200 US adults, September 3-4, 2025) reports Friendsgiving "emerging as a new tradition for nearly 40% of Americans" (46% of Millennials), https://www.empower.com/the-currency/life/table-stakes-thanksgiving-research; a Napa Cellars survey reported by The Manual (November 9, 2026, no sample size published) puts strict potluck at 41.6% of hosts and food-plus-BYOB at 23.2%, https://www.themanual.com/food-and-drink/friendsgiving-2026-trend/. Neither is a registered source; both are context for the defaults, not grounding. (2) PRACTICE, registered: Food Network (foodnetwork-friendsgiving) for the host making the turkey and gravy, dish categories, and timing; Evite (evite-friendsgiving) for the three-week invite with a What to Bring list, drinks a week out, and the weekend before Thanksgiving. (3) SAFETY, registered: FSIS danger zone 40-140°F, two hours out or one above 90°F, reheat to 165°F (fsis-danger-zone, fsis-leftovers), dishes cooked at home and carried in (fsis-cooking-groups), refrigerator thawing (fsis-turkey-thaw), safe minimum temperatures (fsis-temp-chart); the USDA Thanksgiving guide and potluck blog could not be fetched (HTTP 403) and are NOT cited. (4) ALLERGENS, registered: the FDA nine (fda-allergens) and FARE\'s shared-meal practice (fare-teal-thanksgiving). (5) COST, registered: AFBF 2025 shelf prices (afbf-thanksgiving-2025); Wells Fargo 2025, about $80-95 for a 10-person dinner (wellsfargo-thanksgiving-2025); Chime/Talker 2025, $21.88 a plate, eight guests per host, and the generational split on who pays (chime-talker-thanksgiving-2025). The perGuestCost band of $8-22 runs from the Wells Fargo grocery basket to the Chime per-plate figure. NOT FOUND: a survey of typical Friendsgiving guest count (the default of 10 is a judgment beside Chime\'s eight per Thanksgiving host) and a survey of which weekend it is held. Quantities (1.25 lb bird per guest, 0.75 lb sides, one dessert per six) are labeled synthesized; hosting-model and drinks cost ratios are synthesized. No fabricated sources.',
    sources: ['foodnetwork-friendsgiving', 'evite-friendsgiving', 'fare-teal-thanksgiving', 'fda-allergens', 'fsis-danger-zone', 'fsis-leftovers', 'fsis-cooking-groups', 'fsis-turkey-thaw', 'fsis-temp-chart', 'afbf-thanksgiving-2025', 'wellsfargo-thanksgiving-2025', 'chime-talker-thanksgiving-2025'],
  },
};

export default friendsgiving;
