// Client Dinner — Event OS host playbook (data only).
//
// Authored 2026-08-21 to replace the Dinner Party borrow the floor installed
// (see `BORROWED_PLAYBOOK` in ../index.js). The borrow's sentence — "a hosted
// table with a menu and a seating plan" — is true about the SHAPE and wrong
// about the WORK. A client dinner is a business event wearing a dinner's
// clothes, and everything that makes it hard is absent from a dinner party:
//
//   • it has a purpose and an outcome someone is accountable for;
//   • the guest list is a decision with politics in it;
//   • someone owns the check, and an expense policy governs it;
//   • dietary and alcohol handling carry professional risk, not just courtesy;
//   • seating is strategic, not social;
//   • there is a conversation plan;
//   • and the follow-up afterwards is the actual point of the evening.
//
// The host is NOT cooking. The restaurant cooks. So `purchases` is deliberately
// tiny (a gift, cards, place cards, an optional bottle) and the weight sits in
// decisions, tasks, risks and the follow-up tail.
//
// The 2026-08-21 coverage audit's silence census is answered here where it
// honestly applies: NOISE (a room you cannot hold a conversation in is the
// single most common way this evening fails), ACCESSIBILITY (a client you are
// courting should never be the one asking about the stairs), and the
// load-in/permit rows are correctly ABSENT — a restaurant booking has neither.
//
// Lead times are derived from the corpus rather than guessed: T-21d matches
// Dinner Party's own planning lead and Board Meeting's runway floor; the T-10d
// dietary lock mirrors Dinner Party's "before the menu locks" rule; the T-2d
// reconfirm mirrors Board Meeting's T-3d quorum chase, pulled in one day
// because a restaurant reservation is chased later than a boardroom quorum.
//
// "offsetDays" are POSITIVE = days before the dinner. Authored honestly against
// widely-published corporate-hospitality and account-management practice and
// labeled `synthesized`. No fabricated sources. ESM default export.

const clientDinner = {
  type: 'Client Dinner',
  solveFamily: 'client_dinner',
  family: 'corporate',
  recordKind: 'client',
  version: '1.0.0',
  meta: {
    summary: 'A business dinner hosted for a client or prospect. It looks like a dinner party and runs like a meeting: there is an outcome someone is accountable for, a guest list with politics in it, a per-head spend cap and an expense policy, dietary and alcohol handling that carry professional risk, seating chosen for the conversation rather than the mood, a set of talking points, and a follow-up the next morning that is the real point of the evening. The restaurant cooks — the host runs the room.',
    typicalGuests: { low: 4, default: 8, high: 16 },
    typicalDurationHours: 3,
    leadTimeDays: 21,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 75, high: 300, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The client relaxes about twenty minutes in and starts telling you what is actually going on.',
    'The right two people end up seated beside each other and the conversation you needed happens on its own.',
    'The one ask lands naturally, in the middle of the meal, and nobody has to make a pitch.',
    'The check is settled without ever reaching the table.',
    'The follow-up you send the next morning names something only someone who was listening would remember.',
  ],

  decisions: [
    { id: 'objective', label: 'What is this dinner for?', options: ['Open a new relationship', 'Advance a live deal', 'Thank an existing client', 'Renewal or expansion conversation', 'Repair a problem'], default: 'Advance a live deal', when: 'T-21d', blocks: ['guest_list', 'talking_points', 'followup'], weight: 'high', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'Every other call — who is invited, who sits where, what gets raised, and what counts as a good night — back-solves from this one, and only the account owner knows which it is.', tier: 'reasoned' }, why: 'A client dinner without a named outcome is an expensive meal. The objective decides the guest list, the talking points, where the ask sits in the evening, and what the follow-up says. Write it as one sentence you would be willing to read out to your own manager.' },
    { id: 'guest_list', label: 'Who is at the table, on both sides?', options: ['Client team only', 'Client team plus our executive sponsor', 'Client team plus our delivery team', 'Client team plus a reference customer', 'One-to-one'], default: 'Client team plus our executive sponsor', when: 'T-18d', dependsOn: ['objective'], blocks: ['venue_type', 'seating'], weight: 'high', reversibility: 'costly', emotionalWeight: 'med', difmCapable: 'needs-host', priorityBasis: { rationale: 'This is the political call in the evening — who from the client is senior enough, who from your side outranks whom, and who must not be in the room. It is awkward to walk back once invitations are out.', tier: 'reasoned' }, why: 'The guest list is the decision with politics in it. Bringing an executive sponsor signals the account matters; bringing four of your people to two of theirs makes the table feel like an ambush. Match seniority on both sides and keep your side no larger than theirs.' },
    { id: 'venue_type', label: 'Where do you sit?', options: ['Private dining room', 'Reserved section of a restaurant', "Chef's table or tasting menu", 'Main dining room table', 'Company dining room or office'], default: 'Private dining room', when: 'T-21d', dependsOn: ['guest_list'], blocks: ['reservation', 'av', 'noise'], weight: 'high', reversibility: 'costly', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'A private room is the difference between a conversation and shouting across a table, and the good ones are gone weeks ahead — so this is booked early and it is expensive to change.', tier: 'reasoned' }, why: 'Whether the evening works is mostly a question of whether the room lets people talk. A private dining room is the safe default: no neighboring table, no music you cannot control, and a door that closes if the conversation gets specific. Private rooms usually carry a food-and-beverage minimum — ask for it in writing.',
      optionNotes: {
        'Private dining room': 'Quiet, discreet, a door that closes · usually carries an F&B minimum',
        'Reserved section of a restaurant': 'Cheaper than a private room · you do not control the noise',
        "Chef's table or tasting menu": 'Memorable · long and fixed, so the schedule runs you',
        'Main dining room table': 'Easiest to book · the worst room for a real conversation',
        'Company dining room or office': 'Total control and no bill at the table · reads as work, not hospitality',
      },
      defaultWhy: 'A private dining room is the default because a conversation you cannot hear is the most common way this evening is wasted. Change it if the guest list is small enough that a good corner table will do.' },
    { id: 'check_owner', label: 'Who owns the check?', options: ['Host pays, card on file with the restaurant', 'Host pays, one card at the table', 'Split by company policy', 'Client pays'], default: 'Host pays, card on file with the restaurant', when: 'T-14d', dependsOn: ['objective'], blocks: ['budget_cap', 'expense_report'], weight: 'high', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'A check arriving at the table is the one avoidable moment that makes a hosted dinner feel transactional, and the expense rules that govern it are set by the company, not the evening.', tier: 'reasoned' }, why: 'Settle payment before anyone sits down. A card left on file with the restaurant — gratuity agreed in advance — means the bill never appears. This also forces the honest conversation about the spend cap and about your client\'s own gift and hospitality policy, which in regulated industries and in government-adjacent accounts may cap or bar what you can spend on them.' },
    { id: 'alcohol', label: 'How is alcohol handled at the table?', options: ['Wine with dinner only', 'One round, then wine', 'Full bar', 'No alcohol'], default: 'Wine with dinner only', when: 'T-14d', dependsOn: ['check_owner'], blocks: ['beverage_purchases', 'budget_cap'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'med', difmCapable: 'can-derive', priorityBasis: { rationale: 'Alcohol is the largest swing in the per-head cost and the largest professional risk at the table, but wine with dinner is a safe, adjustable default the app can propose.', tier: 'reasoned' }, why: 'This carries real professional risk in both directions. Over-serving a client — or a member of your own team — is the failure nobody plans for and everybody remembers. Set the level in advance, make sure the zero-proof option is a real one rather than soda water, and never let the host be the person ordering the last round.' },
    { id: 'program', label: 'Is there a program, or just conversation?', options: ['Conversation only', 'A short thank-you or toast', 'A five-minute update or demo', 'A formal presentation'], default: 'A short thank-you or toast', when: 'T-10d', dependsOn: ['objective'], blocks: ['av', 'run_of_show'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Anything beyond a toast needs a screen, power, and a room that supports it — which has to be arranged with the restaurant, not discovered on the night.', tier: 'reasoned' }, why: 'Most client dinners are better with no program at all. If there is one, keep it under five minutes and put it before the main course, while people are still sharp. A formal presentation over dinner turns hospitality back into a sales meeting and needs a screen, power, and a private room to be tolerable.' },
  ],

  milestones: [
    { id: 'cd_objective', name: 'Name the outcome and who owns it', offsetDays: 21, owner: 'host', category: 'planning', risk: { ifDelayed: 'The evening becomes an expensive meal with no follow-up', severity: 'high' } },
    { id: 'cd_guestlist', name: 'Build and confirm the guest list on both sides', offsetDays: 18, owner: 'host', dependsOn: ['cd_objective'], category: 'guest', risk: { ifDelayed: 'Client diaries fill; the decision-maker cannot come', severity: 'high' } },
    { id: 'cd_reserve', name: 'Book the room and confirm it is quiet enough to talk in', offsetDays: 18, owner: 'host', dependsOn: ['cd_guestlist'], category: 'venue', risk: { ifDelayed: 'Private rooms gone; you end up in the main dining room', severity: 'high' } },
    { id: 'cd_budget', name: 'Set the per-head cap and arrange the check', offsetDays: 14, owner: 'host', dependsOn: ['cd_reserve'], category: 'planning', risk: { ifDelayed: 'Spend blows the expense policy and the report bounces', severity: 'med' } },
    { id: 'cd_dietary', name: 'Collect dietary needs and send them to the restaurant', offsetDays: 10, owner: 'host', dependsOn: ['cd_guestlist'], category: 'food', risk: { ifDelayed: 'A guest is served something they cannot eat, in front of their own team', severity: 'high' } },
    { id: 'cd_prep', name: 'Write the talking points and brief your own side', offsetDays: 5, owner: 'host', dependsOn: ['cd_objective'], category: 'planning', risk: { ifDelayed: 'Your team improvises; the ask never gets made', severity: 'high' } },
    { id: 'cd_confirm', name: 'Reconfirm the reservation, headcount and logistics', offsetDays: 2, owner: 'host', dependsOn: ['cd_reserve', 'cd_dietary'], category: 'venue', risk: { ifDelayed: 'The restaurant holds the wrong table or the wrong count', severity: 'med' } },
    { id: 'cd_setup', name: 'Arrive early, check the room, settle the payment arrangement', offsetDays: 0, owner: 'host', dependsOn: ['cd_confirm'], category: 'setup', risk: { ifDelayed: 'You greet your client while still sorting the table', severity: 'med' } },
    { id: 'event', name: 'The dinner', offsetDays: 0, owner: 'host', dependsOn: ['cd_setup'], category: 'event', risk: null },
    { id: 'cd_followup', name: 'Follow up, file the expense, log the outcome', offsetDays: 0, owner: 'host', dependsOn: ['event'], category: 'planning', risk: { ifDelayed: 'The dinner produces goodwill and nothing else', severity: 'high' } },
  ],

  tasks: [
    { id: 't_objective', milestoneId: 'cd_objective', phase: 'planning', label: 'Write the one outcome this dinner is for, in a sentence, and name who owns it', when: 'T-21d' },
    { id: 't_guestlist', milestoneId: 'cd_guestlist', phase: 'guest', label: 'Build the guest list for both sides and ask the client to confirm who they are bringing', when: 'T-18d' },
    { id: 't_invite', milestoneId: 'cd_guestlist', phase: 'guest', label: 'Send the invitation with date, time, restaurant, dress, and the dietary and accessibility ask', when: 'T-18d' },
    { id: 't_reserve', milestoneId: 'cd_reserve', phase: 'venue', label: 'Book the private dining room and get the food-and-beverage minimum and cancellation terms in writing', when: 'T-18d', whenChoice: { id: 'venue_type', in: ['Private dining room', 'Reserved section of a restaurant', "Chef's table or tasting menu"] } },
    { id: 't_reserve_table', milestoneId: 'cd_reserve', phase: 'venue', label: 'Book the table and ask for the quietest corner the restaurant has, away from the bar and the kitchen door', when: 'T-18d', whenChoice: { id: 'venue_type', in: ['Main dining room table'] } },
    // NOISE — silent in 35 of 39 playbooks per the 2026-08-21 census, and the
    // single most common way a client dinner is wasted: a room you cannot talk in.
    { id: 't_noise', milestoneId: 'cd_reserve', phase: 'venue', label: 'Ask the restaurant what else is booked in the room that night and whether the music can be turned down', when: 'T-14d' },
    // ACCESSIBILITY — silent in 32 of 39. A guest you are courting should never
    // be the person who has to ask about the stairs.
    { id: 't_access', milestoneId: 'cd_reserve', phase: 'venue', label: 'Confirm step-free entry, an accessible restroom, and a seat that works for anyone with mobility or hearing needs', when: 'T-14d' },
    { id: 't_budget', milestoneId: 'cd_budget', phase: 'planning', label: 'Set a per-head spend cap and check it against your expense policy before the menu is chosen', when: 'T-14d' },
    { id: 't_policy', milestoneId: 'cd_budget', phase: 'planning', label: "Check the client's own gift and hospitality policy — some accounts cap or bar what you may spend on them", when: 'T-14d' },
    { id: 't_check', milestoneId: 'cd_budget', phase: 'planning', label: 'Leave a card on file with the restaurant and agree the gratuity now, so no check reaches the table', when: 'T-14d', whenChoice: { id: 'check_owner', in: ['Host pays, card on file with the restaurant'] } },
    { id: 't_dietary', milestoneId: 'cd_dietary', phase: 'guest', label: 'Ask every guest for allergies, dietary needs and whether they drink, and send the list to the restaurant in writing', when: 'T-10d' },
    { id: 't_menu', milestoneId: 'cd_dietary', phase: 'food', label: 'Agree the set menu or the ordering approach with the restaurant, inside the per-head cap', when: 'T-10d' },
    { id: 't_nonalc', milestoneId: 'cd_dietary', phase: 'beverage', label: 'Confirm the restaurant has a real zero-proof list, so a guest who is not drinking is not handed soda water', when: 'T-10d' },
    { id: 't_talkingpoints', milestoneId: 'cd_prep', phase: 'planning', label: 'Write the talking points: what to raise, what to leave alone, and the one ask', when: 'T-5d' },
    { id: 't_brief', milestoneId: 'cd_prep', phase: 'planning', label: 'Brief your own attendees on the objective, the talking points, and who leads which topic', when: 'T-5d' },
    { id: 't_av', milestoneId: 'cd_prep', phase: 'setup', label: 'Confirm a screen and power in the room, and test the laptop connection before guests arrive', when: 'T-5d', whenChoice: { id: 'program', in: ['A five-minute update or demo', 'A formal presentation'] } },
    { id: 't_gift', milestoneId: 'cd_prep', phase: 'guest', label: 'Buy and wrap the client gift, and check the value against both companies’ gift policies', when: 'T-3d' },
    { id: 't_seating', milestoneId: 'cd_prep', phase: 'guest', label: 'Draw the seating plan so the decision-maker sits beside the person who needs that conversation', when: 'T-3d' },
    { id: 't_confirm', milestoneId: 'cd_confirm', phase: 'venue', label: 'Reconfirm the reservation, the headcount, the dietary list and the arrival time with the restaurant', when: 'T-2d' },
    { id: 't_logistics', milestoneId: 'cd_confirm', phase: 'guest', label: 'Send guests the address, the parking or valet detail, and a phone number to reach you on the night', when: 'T-2d' },
    { id: 't_arrive', milestoneId: 'cd_setup', phase: 'setup', label: 'Arrive thirty minutes early, walk the room, check the table and place cards, and confirm the payment arrangement with the manager', when: 'T0' },
    { id: 't_rides', milestoneId: 'event', phase: 'event', label: 'Arrange rides home for anyone who has been drinking before the evening winds down', when: 'T0' },
    { id: 't_notes', milestoneId: 'cd_followup', phase: 'planning', label: 'Write down what you learned and what you promised, before you leave the restaurant', when: 'T0' },
    { id: 't_thanks', milestoneId: 'cd_followup', phase: 'planning', label: 'Send the thank-you note and every follow-up you promised at the table, within one business day', when: 'T0 +1d' },
    { id: 't_expense', milestoneId: 'cd_followup', phase: 'planning', label: 'File the expense report with the itemized receipt and the full attendee list', when: 'T0 +2d' },
    { id: 't_crm', milestoneId: 'cd_followup', phase: 'planning', label: 'Log the outcome and the agreed next step against the account, so the evening turns into a decision', when: 'T0 +2d' },
  ],

  // The restaurant cooks — so this list is only what the HOST actually buys.
  purchases: [
    { id: 'p_gift', item: 'Client gift', category: 'logistics', qtyFlat: 1, unit: 'gift', where: ['Specialty / local', 'Bookstore', 'Wine shop'], unitCostRange: [25, 150], essential: false, buyAt: 'T-3d', note: 'Check the value against both companies’ gift policies before you buy — a gift that has to be declined is worse than no gift.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_notecards', item: 'Handwritten thank-you cards and stamps', category: 'logistics', qtyFlat: 1, unit: 'set', where: ['Stationer', 'Office supply'], unitCostRange: [10, 30], essential: false, buyAt: 'T-3d', note: 'The follow-up is the point of the evening; a written note is the part of it nobody else sends.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_placecards', item: 'Place cards', category: 'logistics', qtyPerGuest: 1, unit: 'card', where: ['Office supply', 'Stationer'], unitCostRange: [0.5, 2], essential: false, buyAt: 'T-1d', note: 'Seating at a client dinner is strategic. Place cards are how the plan survives contact with the room.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_wine', item: 'A bottle brought for the table (corkage confirmed first)', category: 'beverage', qtyFlat: 1, unit: 'bottle', where: ['Wine shop'], unitCostRange: [25, 90], essential: false, buyAt: 'T-3d', dependsOnDecision: 'alcohol', note: 'Only if the restaurant allows it. Confirm the corkage fee first — it can exceed the bottle.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
  ],

  rentalsGap: [
    { item: 'Private dining room with a door that closes', qtyFlat: 1, note: 'The room IS the venue. A conversation the neighboring table can hear is not the conversation you booked.' },
    { item: 'Screen and power in the room', qtyFlat: 1, note: 'Only if there is a program. Most restaurants do not have one — ask before you promise a demo.' },
  ],

  vendors: [
    { category: 'Restaurant / private dining room', required: true, altToDIY: 'The company dining room, if you have one and can staff it', when: 'T-18d', proofRequired: ['reservation confirmation', 'food-and-beverage minimum in writing', 'cancellation terms'], costRange: [75, 300], costUnit: 'per guest' },
    { category: 'Car service / transport', required: false, altToDIY: 'Guests self-drive or take a rideshare', when: 'T-3d', costRange: [50, 300], costUnit: 'flat' },
    { category: 'Gift sourcing', required: false, altToDIY: 'Buy it yourself; a chosen gift beats a corporate catalog', when: 'T-7d', costRange: [25, 150], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_nooutcome', trigger: 'The dinner has no named objective, so nothing happens afterwards', severity: 'high', mitigation: 'Write the outcome as one sentence at three weeks out, brief your own side on it at five days, and capture what was promised before you leave the restaurant.' },
    { id: 'r_dietary', trigger: 'A guest is served something they cannot eat, in front of their own team', severity: 'high', mitigation: 'Collect allergies and dietary needs with the invitation, send them to the restaurant in writing at ten days out, and reconfirm at two days out. Never rely on a guest raising it at the table.' },
    { id: 'r_noise', trigger: 'The room is too loud to hold the conversation the dinner exists for', severity: 'high', mitigation: 'Book a private room where you can; ask what else is booked in it, ask for the music to be turned down, and avoid tables near the bar or the kitchen door.' },
    { id: 'r_check', trigger: 'The check arrives at the table, or the spend blows the expense policy', severity: 'med', mitigation: 'Set a per-head cap before the menu is chosen, leave a card on file with agreed gratuity, and check the client’s own hospitality policy — some accounts cap or bar what you may spend.' },
    { id: 'r_overserve', trigger: 'Someone at the table — yours or theirs — is over-served', severity: 'high', mitigation: 'Decide the alcohol level in advance, make sure the zero-proof option is a real one, never let the host order the last round, and arrange rides home before the evening winds down.' },
    { id: 'r_guestlist', trigger: 'Your side outnumbers or outranks theirs and the table feels like an ambush', severity: 'med', mitigation: 'Match seniority on both sides and keep your headcount no larger than theirs; confirm their attendees before you finalize yours.' },
    { id: 'r_seating', trigger: 'Seating left to chance and the two people who needed to talk never do', severity: 'med', mitigation: 'Draw the seating plan at three days out around the conversation you need, and use place cards so it survives the room.' },
    { id: 'r_confidential', trigger: 'A specific commercial conversation happens where it can be overheard', severity: 'med', mitigation: 'A private room with a door is the control. In an open dining room, keep numbers and names off the table and move the specifics to the follow-up call.' },
    { id: 'r_nofollowup', trigger: 'Nothing you promised at the table is sent afterwards', severity: 'high', mitigation: 'Write down every promise before you leave, send the follow-ups within one business day, and log the agreed next step against the account.' },
  ],

  contingencies: [
    { id: 'c_noshow', when: 'r_guestlist', plan: 'If the client’s senior attendee drops out on the day, ask whether they would rather move the dinner than send a deputy — a rescheduled dinner with the decision-maker beats a pleasant one without them. If it proceeds, quietly drop one of your own attendees so the table stays balanced.' },
    { id: 'c_noise', when: 'r_noise', plan: 'Ask the manager to move you the moment you know the table will not work — before drinks arrive, not after the mains. Most restaurants will accommodate a hosted party that asks early and asks once.' },
    { id: 'c_dietary', when: 'r_dietary', plan: 'Speak to the server yourself, away from the table, and have the kitchen send a replacement plate without announcing the problem. Never make the guest negotiate their own meal in front of their colleagues.' },
    { id: 'c_overserve', when: 'r_overserve', plan: 'Slow the table by ordering coffee and dessert, stop the wine service quietly with the server, and put the affected person in a car yourself. Do not raise it at the table and do not raise it afterwards.' },
    { id: 'c_check', when: 'r_check', plan: 'If a check does reach the table, take it without comment and settle it away from the group. Reconcile the overage against the policy the next morning with a written explanation, not a quiet adjustment.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Client gift, thank-you cards and stamps, and the bottle for the table if corkage is allowed' },
      { when: 'T-1d', what: 'Place cards, written to the final seating plan' },
    ],
    preparation: [
      { when: 'T-14d', what: 'Per-head cap agreed, card left on file, room noise and accessibility confirmed' },
      { when: 'T-10d', what: 'Dietary list to the restaurant in writing; set menu or ordering approach agreed' },
      { when: 'T-5d', what: 'Talking points written; your own side briefed; screen and power confirmed if there is a program' },
      { when: 'T-2d', what: 'Reservation, headcount, dietary list and arrival time reconfirmed; logistics sent to guests' },
    ],
    setup: [
      { when: 'T0 -4h', what: 'Reconfirm the table, the headcount and the dietary list with the restaurant one last time' },
      { when: 'T0 -3h', what: 'Re-read the talking points and the guest list; check your own attendees are still coming' },
      { when: 'T0 -45m', what: 'Leave with margin — arriving after your client is the one mistake with no recovery' },
      { when: 'T0 -30m', what: 'Walk the room, check the table and the noise, place the place cards' },
      { when: 'T0 -15m', what: 'Confirm the payment arrangement and the gratuity with the manager; agree the pacing of the courses' },
      { when: 'T0 -5m', what: 'Your own team in position, phones away, first drinks ordered for arrivals' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Greet at the door, not at the table; drinks in hands before anyone sits' },
      { when: 'T0 +15m', what: 'Seated to the plan; the short thank-you if there is one' },
      { when: 'T0 +30m', what: 'First course; conversation stays personal — nobody opens with business' },
      { when: 'T0 +1:15', what: 'Main course, and the window where the real conversation happens' },
      { when: 'T0 +1:45', what: 'The one ask, made once, in the middle of the meal rather than at the end' },
      { when: 'T0 +2:15', what: 'Dessert and coffee; agree the next step out loud so everyone hears it' },
      { when: 'T0 +2:45', what: 'Close the evening yourself; cars arranged for anyone who has been drinking' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep the check away from the table; note every promise as it is made' },
      { when: 'T0 +1h', what: 'Write up what you learned and what you promised, while it is still exact' },
      { when: 'T0 +1d', what: 'Thank-you note and every promised follow-up sent' },
      { when: 'T0 +2d', what: 'Expense report filed with the itemized receipt and the attendee list; outcome logged against the account' },
    ],
  },

  // Day-of readiness. Authored for a RESTAURANT-hosted business dinner: no
  // cooking, no fire, no weather, no load-in — so those items are correctly
  // absent. What is here is what actually carries risk on this particular night.
  dayOfChecklist: [
    { id: 'dietary', label: 'Dietary and allergy list confirmed', detail: 'The restaurant has the written list and the server knows which plate is which. Nobody should have to negotiate their own meal at the table.', severity: 'high' },
    { id: 'check', label: 'The check is arranged', detail: 'Card on file, gratuity agreed with the manager, and nothing reaching the table. Confirm it before your first guest walks in.', severity: 'high' },
    { id: 'room', label: 'The room works for the conversation', detail: 'Quiet enough to talk, music down, no table pushed against the bar or the kitchen door. Ask to move now, not after the mains.', severity: 'high' },
    { id: 'access', label: 'Access checked', detail: 'Step-free entry, an accessible restroom, and a seat that works for anyone with mobility or hearing needs — checked by you, not asked for by your guest.', severity: 'med' },
    { id: 'seating', label: 'Seating plan set', detail: 'Place cards down to the plan, so the decision-maker sits beside the person who needs that conversation.', severity: 'med' },
    { id: 'brief', label: 'Your own side briefed', detail: 'Everyone knows the objective, who leads which topic, and that only one person makes the ask.', severity: 'med' },
    { id: 'rides', label: 'Rides home planned', detail: 'Know how everyone who has been drinking is getting home before the evening winds down, on your side and theirs.', severity: 'med' },
    { id: 'capture', label: 'A way to capture what you promise', detail: 'Phone or notebook to hand. Every commitment made at the table gets written down before you leave the restaurant.', severity: 'low' },
  ],

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Authored 2026-08-21 to replace the Dinner Party borrow, which matched the shape of the evening and none of its work. The operating model here is corporate hospitality and account management rather than home entertaining: a named outcome with an accountable owner, a guest list balanced for seniority on both sides, a private room booked for acoustics rather than atmosphere, a per-head cap reconciled against an expense policy before the menu is chosen, dietary needs collected with the invitation and sent to the restaurant in writing, seating drawn around the conversation the dinner exists for, one ask made once in the middle of the meal, and a follow-up inside one business day that is the actual deliverable. Lead times are derived from the corpus rather than invented: the 21 days out planning start matches Dinner Party and sits inside Board Meeting’s 30-day runway; the 10 days out dietary lock mirrors Dinner Party’s rule that allergies are collected before the menu locks; the 2 days out reconfirm is Board Meeting’s 3 days out quorum chase pulled in one day, because a restaurant reservation is confirmed later than a boardroom quorum. Where a lead was genuinely uncertain the conservative (earlier) figure was chosen — the 18 days out room booking assumes private dining rooms in a busy city book two to three weeks ahead, which is the safe end of a range that varies widely by market. Three of the coverage audit’s universal blind spots are answered where they honestly apply: NOISE (a room you cannot talk in is the most common way this evening is wasted), ACCESSIBILITY (checked by the host, never asked for by the guest), and over-serving with rides home. Load-in, permits and licensing are deliberately ABSENT — a restaurant booking carries none of them, and inventing them to score against a census would be the same failure as inventing a source. Client gift-policy and hospitality-policy limits are raised as a real constraint because in regulated, public-sector and government-adjacent accounts they are enforceable rules rather than etiquette. Authored as established-consensus trade practice and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default clientDinner;
