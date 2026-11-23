// Group Trip — Event OS host playbook (data only).
//
// Authored 11/19/2026 (plan item G61) by owner ruling 11/16/2026: "yes, after
// launch, researched and sourced like Friendsgiving (no made-up checklists or
// budget bands)." In a 40-host trip test, 10 hosts had no occasion to pick: a
// girls' trip, a golf weekend, a friends' trip. "Girls trip" used to resolve to
// Wellness Retreat, which has no playbook of its own and borrowed Team
// Retreat's (a corporate offsite); the others resolved to nothing at all.
//
// ONE PLAYBOOK, SEVERAL NAMES. A girls' trip, a guys' trip, a golf weekend and
// a friends' trip run on the same spine: a firm yes and a deposit before
// anything is booked, the place to stay, who pays for what, and who sleeps
// where. Golf is a decision (`golf`), not a separate type, so its tee-time
// steps appear only when the group is playing.
//
// BACHELOR AND BACHELORETTE TRIPS STAY WHERE THEY ARE. Both have their own
// authored playbooks, their taxonomy rules run first, and the parse corpus pins
// "Bachelorette weekend trip to Nashville" to Bachelorette Party
// (fixtures/parseCorpus.mjs). They are trips organized around one honoree
// (Kayak: on a bachelor(ette) trip the honoree decides), which this plan is not.
//
// IT IS A DESTINATION, MULTI-DAY OCCASION and owns none of that machinery.
// Lodging is the destination toolkit's `dest_lodging` and the stay cockpit;
// "Your days" and "Who pays for what" are the same Pass-gated tools every
// destination event gets (passGate.js lockingReasons, unchanged). So this file
// authors no `lodging` decision: one would suppress `dest_lodging` (F10) and
// make a group trip behave unlike every other destination event.
//
// RESEARCH (all fetched and read 11/19/2026; full list in knowledge.note):
//   • Golf the High Sierra (golfthehighsierra-group-golf-2026): headcount and
//     deposits 4-6 months out, lodging 3-4, tee times 2-3, trip details 4-6
//     weeks, confirmations and balances 1-2 weeks. → every golf date, and the
//     commit / details / confirm dates for the whole trip.
//   • GolfN (golfn-golf-trip-guide-2026): a group over 8 plans further ahead;
//     an even number of players; a deposit as early as possible.
//   • AvantStay (avantstay-group-checklist-2026): homes book 6-12 months out,
//     three months out is slim pickings; deposits within 48 hours of locking
//     dates; balance 30 days before check-in; the three split rules; house
//     norms a week before check-in.
//   • SmarterTravel (smartertravel-group-trip-2025): agree what is shared and
//     when you settle up before the trip; a few tentpole events, the rest free.
//   • Kayak (kayak-group-travel-2018): everyone books their own flight; draw
//     lots for rooms; reserve group dinners.
//   • Reused, already registered: Airbnb cancellation tiers and party policy,
//     the CFPB credit-card dispute window; new: the FTC rental-scam page.
//
// WHAT IS DELIBERATELY NOT HERE, for lack of a source: a per-person cost band
// (meta.perGuestCost), purchases, vendor cost ranges, a typical trip length
// (typicalDurationHours), a schedule past the arrival day, and a day-of
// checklist. The
// engine already falls back honestly on each: the budget to the family band
// it discloses as an estimate, the stay to the lodging cockpit's own rate data,
// the days to "Your days". A missing number beats a made-up one.
//
// ESM default export. No fabricated sources.

const GOLF = 'Yes — tee times for the group';
const NO_GOLF = 'No golf on this trip';
const PLAYING = { id: 'golf', in: [GOLF] };

const DEPOSIT_FIRST = 'Everyone pays a deposit before anything is booked';
const ONE_PAYER = 'One person books, and everyone pays them back';
const POOL = 'Everyone pays into a shared pool up front';

const OWN_TRAVEL = 'Everyone books their own flight or drive';

const groupTrip = {
  type: 'Group Trip',
  // What the time she types means (lib/eventAnchor, cause 5): when guests arrive.
  timeAnchor: { means: 'arrival' },
  solveFamily: 'bachelorette',
  family: 'travel_led',
  recordKind: 'client',
  version: '1.0.0',

  meta: {
    summary:
      'A trip with friends: a girls\' trip, a guys\' trip, a golf weekend. This plan runs the order the guides agree on: a firm yes and a deposit from everyone before anything is booked, then the place to stay, then tee times if you are playing, then the details everyone needs. It keeps the money in writing (what is shared, how the house is split, when you settle up) and leaves where everyone stays to the stay planner.',
    // Group size is a planning default, not a claim: the golf guides plan for
    // "groups of 4 to 56" (Golf the High Sierra) and treat more than 8 as the
    // point where planning gets harder (GolfN). 8 is the owner's own test
    // sentence ("Girls trip to Nashville … for 8"), a judgment, not a survey.
    typicalGuests: { low: 4, default: 8, high: 16 },
    // 120 days = the near edge of Golf the High Sierra's first step ("Lock
    // headcount, collect deposits" 4-6 months out), and a month before
    // AvantStay's "three months out" warning. See STANDARD_LEAD_PROVENANCE.
    leadTimeDays: 120,
    hostDifficulty: 'moderate',
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The group chat finally turns into a booked trip.',
    'Everyone walks into the place for the first time.',
    'The one dinner the whole group sits down to together.',
  ],

  decisions: [
    {
      id: 'money_plan',
      label: 'How does the money work?',
      options: [DEPOSIT_FIRST, ONE_PAYER, POOL],
      default: DEPOSIT_FIRST,
      defaultWhy: 'A deposit before anything is booked is the default, as group-trip guides agree: Golf the High Sierra says "Collect deposits before you book anything," and AvantStay says to collect them within 48 hours of locking the dates. Change it if one person is fronting the cost or the group would rather pay into one pool.',
      when: 'T-120d',
      timingProvenance: { tier: 'researched', verificationStatus: 'researched', sources: ['golfthehighsierra-group-golf-2026', 'avantstay-group-checklist-2026'], claim: 'Lock the headcount and collect deposits 4-6 months out, before booking (Golf the High Sierra); collect deposits within 48 hours of locking the dates (AvantStay).', rationale: 'The deposit is what turns a yes into a headcount, and the place cannot be booked until the headcount is real.' },
      blocks: ['budget'],
      noCostEffect: true,
      weight: 'high', reversibility: 'costly', emotionalWeight: 'med', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'Every booking after this one spends money someone has to be paid back for. Only the organizer knows the group.', tier: 'reasoned' },
      why: 'A deposit is what makes a yes real. SmarterTravel: before the trip, agree which expenses are shared and which are each person\'s own, and whether you settle up daily or at the end; put it in writing.',
    },
    {
      id: 'split_rule',
      label: 'How is the place to stay split?',
      options: ['Evenly — everyone pays the same share', 'By the nights each person stays', 'By room — a private room pays more'],
      default: 'Evenly — everyone pays the same share',
      defaultWhy: 'An even split is the default; as AvantStay puts it, "Equal splits work when everyone stays the full trip and gets similar value." Split by nights if arrival days differ, or by room if some get a private room.',
      when: 'T-120d',
      timingProvenance: { tier: 'researched', verificationStatus: 'researched', sources: ['avantstay-group-checklist-2026'], claim: 'Divide the total by the confirmed attendees and share the per-person number in writing when deposits are collected, within 48 hours of locking the dates.', rationale: 'The deposit is a share of the total, so the rule for the share is settled when the deposit is asked for.' },
      blocks: ['budget'],
      noCostEffect: true,
      weight: 'med', reversibility: 'costly', emotionalWeight: 'med', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'Changing the split after people have paid means refunding some and chasing others.', tier: 'reasoned' },
      why: 'Three fair rules, from AvantStay: even when everyone stays the whole trip, by the night when arrivals differ, by the room when some rooms are private. Pick one and share the per-person number in writing.',
    },
    {
      id: 'travel_booking',
      label: 'Who books the travel?',
      options: [OWN_TRAVEL, 'One person books travel for the group'],
      default: OWN_TRAVEL,
      defaultWhy: 'Everyone booking their own flight or drive is the default, per Kayak\'s group-travel rules: "it should be each individual\'s responsibility to book their own flight." Change it if one person is booking for everyone.',
      when: 'T-120d',
      timingProvenance: { tier: 'researched', verificationStatus: 'researched', sources: ['smartertravel-group-trip-2025', 'kayak-group-travel-2018'], claim: 'Before the trip, agree which expenses are shared and which are individual (SmarterTravel); each person books their own flight (Kayak).', rationale: 'Travel is the biggest individual expense, so it is settled with the money plan.' },
      noCostEffect: true,
      weight: 'low', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive',
      priorityBasis: { rationale: 'Whoever books travel carries the money for it, so it is part of the money plan.', tier: 'reasoned' },
      why: 'When one person books everyone\'s flights, they carry everyone\'s money and change fees; booking your own keeps travel out of the shared pot.',
    },
    {
      id: 'golf',
      label: 'Are you playing golf?',
      options: [GOLF, NO_GOLF],
      default: NO_GOLF,
      defaultWhy: 'No golf is the default because most group trips are not golf trips. On a golf weekend, answer yes and the plan adds the tee-time steps.',
      when: 'T-120d',
      timingProvenance: { tier: 'researched', verificationStatus: 'researched', sources: ['golfthehighsierra-group-golf-2026', 'golfn-golf-trip-guide-2026'], claim: 'A golf group locks its headcount 4-6 months out (Golf the High Sierra), and a group over 8 plans further ahead (GolfN).', rationale: 'The headcount and the tee-time block depend on who is playing, so it is known when the headcount is.' },
      noCostEffect: true,
      weight: 'high', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'A golf group books a block of tee times after the place to stay; a group that is not playing skips those steps entirely.', tier: 'reasoned' },
      why: 'Golf changes the order of the trip: Golf the High Sierra books the stay first, then tee times, and builds each day around the round. A big group needs a block of tee times, which GolfN calls "more difficult" to get.',
    },
  ],

  milestones: [
    // 4-6 months out: "Lock headcount, collect deposits, choose destination and
    // date range" (Golf the High Sierra); deposits within 48 hours of locking
    // dates (AvantStay). 120 = the 4-month edge.
    { id: 'gt_commit', name: 'Get the dates, a firm yes, and a deposit from everyone', facts: ['deposits-paid'], offsetDays: 120, owner: 'host', category: 'planning', risk: { ifDelayed: 'The best places are taken, and "probably" never turns into a headcount', severity: 'high' } },
    // 3-4 months out: "Book lodging first" (Golf the High Sierra); "Wait until
    // three months out and you'll face slim pickings" (AvantStay). 105 days is
    // inside the 3-4 month window and ahead of three months.
    { id: 'gt_stay', name: 'Book the place to stay', offsetDays: 105, owner: 'host', dependsOn: ['gt_commit'], category: 'logistics', risk: { ifDelayed: 'Few places left that sleep the whole group', severity: 'high' } },
    // 2-3 months out: "Finalize tee times" (Golf the High Sierra); a group over
    // 8 plans further ahead (GolfN), so the early edge: 90.
    { id: 'gt_golf', name: 'Book the tee times', offsetDays: 90, owner: 'host', dependsOn: ['gt_stay'], category: 'logistics', whenChoice: PLAYING, risk: { ifDelayed: 'No block of tee times left for a group this size', severity: 'high' } },
    // 4-6 weeks out: "Send trip details to all attendees. Confirm final
    // headcount" (Golf the High Sierra). 35 = five weeks.
    { id: 'gt_details', name: 'Send everyone the trip details and confirm the headcount', offsetDays: 35, owner: 'host', dependsOn: ['gt_stay'], category: 'guest', risk: { ifDelayed: 'People arrive not knowing the address, the plan, or what they owe', severity: 'med' } },
    // "the balance due 30 days before check-in" (AvantStay).
    { id: 'gt_balance', name: 'Collect the rest of each person\'s share', offsetDays: 30, owner: 'host', dependsOn: ['gt_commit'], category: 'planning', risk: { ifDelayed: 'The organizer is still owed money on the drive home', severity: 'med' } },
    // 1-2 weeks out: "Confirm all reservations, share tee time sheet, collect
    // remaining balances" (Golf the High Sierra). 10 = inside the window.
    { id: 'gt_confirm', name: 'Confirm every reservation', offsetDays: 10, owner: 'host', dependsOn: ['gt_details'], category: 'logistics', risk: { ifDelayed: 'A dinner or a tee time that was never confirmed', severity: 'med' } },
    // House norms "one week before check-in" (AvantStay).
    { id: 'gt_norms', name: 'Send the house norms', offsetDays: 7, owner: 'host', dependsOn: ['gt_details'], category: 'guest', risk: null },
    { id: 'event', name: 'The trip', offsetDays: 0, owner: 'host', dependsOn: ['gt_confirm', 'gt_norms'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_dates', target: 'date-options', facts: ['dates-polled'], milestoneId: 'gt_commit', phase: 'planning', label: 'Offer two or three date ranges and give everyone three days to answer', when: 'T-120d' },
    { id: 't_commit', target: 'guests', facts: ['deposits-paid'], milestoneId: 'gt_commit', phase: 'guest', label: 'Ask each person for a firm yes. "Probably" and "I\'ll try" are not a yes until the deposit is paid', when: 'T-120d' },
    { id: 't_money', target: 'money', facts: ['nothing-owed'], milestoneId: 'gt_commit', phase: 'planning', label: 'Put the money plan in writing before anyone books: what is shared, what each person pays on their own, how the place is split, and when you settle up', when: 'T-120d' },
    { id: 't_deposit', target: 'money', facts: [], milestoneId: 'gt_commit', phase: 'planning', label: 'Collect each person\'s deposit within 48 hours of locking the dates, and tell everyone their share of the total in writing', when: 'T-120d', whenChoice: { id: 'money_plan', in: [DEPOSIT_FIRST, POOL] } },
    { id: 't_book_stay', target: 'where-staying', facts: ['nothing-owed'], milestoneId: 'gt_stay', phase: 'logistics', label: 'Book the place: check its cancellation policy before you pay, and pay by credit card through the booking site, never by wire transfer, gift card, or a payment app', when: 'T-105d' },
    { id: 't_check_listing', target: 'where-staying', facts: ['nothing-owed'], milestoneId: 'gt_stay', phase: 'logistics', label: 'Before you pay, search the listing\'s address with the owner\'s name. If other ads show the same address under a different name, it is probably a scam', when: 'T-105d' },
    { id: 't_send_travel', target: 'airports', facts: [], milestoneId: 'gt_stay', phase: 'guest', label: 'Send everyone the dates and the town so each person books their own flight or drive', when: 'T-105d', whenChoice: { id: 'travel_booking', in: [OWN_TRAVEL] } },
    { id: 't_tee_times', target: 'vendors', facts: [], milestoneId: 'gt_golf', phase: 'logistics', label: 'Book the tee times as a block for the whole group, near where you are staying. An even number of players is easiest to pair', when: 'T-90d', whenChoice: PLAYING },
    { id: 't_first_round', target: 'none', facts: [], milestoneId: 'gt_golf', phase: 'planning', label: 'Skip an early round on the first day unless everyone arrives the night before, and plan five to five and a half hours a round for 12 or more players', when: 'T-90d', whenChoice: PLAYING },
    { id: 't_details', target: 'trip-details', facts: ['trip-details-sent'], milestoneId: 'gt_details', phase: 'guest', label: 'Send everyone the trip details: the dates, the address, the few things everyone does together, and what each person owes', when: 'T-35d' },
    { id: 't_rooms', target: 'rooms', facts: ['rooms-planned'], milestoneId: 'gt_details', phase: 'planning', label: 'Settle who sleeps where: draw lots for the best rooms, and keep the early risers apart from the night owls', when: 'T-35d' },
    { id: 't_dinners', target: 'vendors', facts: [], milestoneId: 'gt_details', phase: 'logistics', label: 'Reserve the group dinners. A table for the whole group needs a booking', when: 'T-35d' },
    { id: 't_balance', target: 'cost-split', facts: [], milestoneId: 'gt_balance', phase: 'planning', label: 'Collect the rest of each person\'s share', when: 'T-30d', whenChoice: { id: 'money_plan', in: [DEPOSIT_FIRST] } },
    { id: 't_confirm', target: 'reconfirm', facts: [], milestoneId: 'gt_confirm', phase: 'logistics', label: 'Confirm every reservation: the place to stay, the dinners, and anything else that is booked', when: 'T-10d' },
    { id: 't_tee_sheet', target: 'none', facts: [], milestoneId: 'gt_confirm', phase: 'guest', label: 'Share the tee sheet with the group and collect what is still owed for golf', when: 'T-10d', whenChoice: PLAYING },
    { id: 't_norms', target: 'updates', facts: [], milestoneId: 'gt_norms', phase: 'guest', label: 'Send a short list of house norms, including the booking site\'s rule against parties at a rental', when: 'T-7d' },
  ],

  purchases: [],
  rentalsGap: [],
  vendors: [],

  risks: [
    { id: 'r_soft_yes', target: 'vendors-tab', trigger: 'Someone who said "probably" drops out after the place is booked', severity: 'high', mitigation: 'Count only the people who have paid a deposit. Golf the High Sierra: "Get a hard commitment from everyone" before booking anything.' },
    { id: 'r_scam', target: 'vendors-tab', trigger: 'The rental listing is a scam', severity: 'high', mitigation: 'The FTC: anyone who says you can only pay by wire transfer, gift card, payment app, or cryptocurrency is a scammer. Search the address with the owner\'s name and check the rental company\'s own site. Pay by credit card, which the CFPB notes can be disputed in writing within 60 days of the statement.' },
    { id: 'r_cancel', target: 'none', trigger: 'Plans change after the place is paid for', severity: 'med', mitigation: 'Read the listing\'s cancellation policy before booking; on Airbnb it is shown on the listing, from Flexible to Strict. A group booking months out should favor a flexible one.' },
    { id: 'r_extras', target: 'none', trigger: 'Small shared costs pile up and nobody settles them', severity: 'low', mitigation: 'Decide before the trip whether you settle up each day or at the end (SmarterTravel), keep the receipts, and send one final bill for the extras afterward (GolfN).' },
    { id: 'r_party', target: 'vendors-tab', trigger: 'The rental is treated as a party house', severity: 'med', mitigation: 'Airbnb bans disruptive gatherings regardless of size, and enforcement can run to removing the account. Put it in the house norms.' },
    { id: 'r_slow_round', target: 'none', trigger: 'A big group\'s round runs long and the next plan slips', severity: 'low', whenChoice: PLAYING, mitigation: 'Golf the High Sierra: "20 players do not finish in 4 hours. Plan for 5.5."' },
  ],

  contingencies: [],

  // THE ARRIVAL DAY. T0 is check-in. Every beat's CONTENT cites a registered
  // source (named on each line); the minute offsets only put the beats in the
  // order those sources give and are sequencing, not a sourced duration. The
  // days after this one are the host's, in "Your days" (destination toolkit).
  schedules: {
    preparation: [
      // AvantStay: "Identify clusters landing within 90 minutes of each other to coordinate shared transportation."
      { when: 'T0 -4h', what: 'Send the arrival plan: who lands when, and which people land within about 90 minutes of each other and can share a ride' },
      // AvantStay: "Designate one early arrival to handle key pickup, then share access codes with late arrivals for self check-in."
      { when: 'T0 -3h', what: 'One early arrival picks up the keys and sends the door code to everyone arriving later' },
      // AvantStay: "Shared grocery runs work when someone tracks the list and collects cash upfront."
      { when: 'T0 -1:30', what: 'Shared grocery run: one person holds the list and collects the cash up front' },
    ],
    program: [
      // AvantStay: "Stagger check-in if arrivals span six-plus hours."
      { when: 'T0', what: 'Check in. If arrivals span six hours or more, people check in as they land instead of waiting for the whole group' },
      // airbnb-rebooking: material problems must be reported within 72 hours, with evidence.
      { when: 'T0 +15m', what: 'Walk the whole place before anyone unpacks, and photograph anything wrong or missing' },
      { when: 'T0 +30m', what: 'Report anything wrong to the booking site now, with the photos: problems have to be reported within 72 hours' },
      // Kayak: draw lots for rooms. SmarterTravel: early risers apart from night owls.
      { when: 'T0 +45m', what: 'Rooms as drawn, with the early risers apart from the night owls' },
      // AvantStay: house norms. airbnb-disturbance: no parties, regardless of size.
      { when: 'T0 +1h', what: 'House norms, said once out loud: quiet hours, who has the keys, and no parties at the rental' },
      // Kayak: a meet-up plan and location sharing for anyone who wanders off.
      { when: 'T0 +2h', what: 'Turn on location sharing, and agree where to meet if anyone splits off' },
      // Kayak: reserve dinner for a big group; phones away at the table.
      { when: 'T0 +3h', what: 'The group dinner you reserved: the whole table, phones away' },
    ],
    cleanup: [
      // SmarterTravel: settle up daily or at the end, as agreed. GolfN: a final bill for the extras.
      { when: 'during', what: 'Log each shared cost as it happens, with who paid, so settling up is one message, daily or at the end as you agreed' },
    ],
  },

  dayOfChecklist: [],

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'partial',
    note: 'AUTHORED 11/19/2026 (G61) by owner ruling 11/16/2026 ("researched and sourced like Friendsgiving, no made-up checklists or budget bands"). RESEARCH, all read 11/19/2026. (1) PRACTICE AND TIMING, registered in TIMING_SOURCES: Golf the High Sierra (golfthehighsierra-group-golf-2026, a golf tour operator, May 2026) for the order and timing of a group golf trip — headcount and deposits 4-6 months out, lodging 3-4, tee times 2-3, trip details 4-6 weeks, confirmations and balances 1-2 weeks, 5-5.5 hours a round for 12-20 players, no early first-day round; GolfN (golfn-golf-trip-guide-2026, June 2026) for a group over 8 planning further ahead, an even number of players, an early deposit, a final bill for extras; AvantStay (avantstay-group-checklist-2026, a group-rental company, November 2026) for homes booking 6-12 months out and three months being late, a three-day date survey, deposits within 48 hours of locking dates, the balance 30 days before check-in, the three split rules, and house norms a week ahead; SmarterTravel (smartertravel-group-trip-2025, editorial) for agreeing what is shared and when to settle before the trip, tentpole events, and rooming; Kayak (kayak-group-travel-2018) for each person booking their own flight, drawing lots for rooms, and reserving group dinners. (2) BOOKING RISK: the FTC rental-scam page (ftc-travel-scams-2025, new) and, already registered, Airbnb cancellation tiers (airbnb-cancel-tiers), Airbnb\'s 72-hour reporting rule (airbnb-rebooking), Airbnb\'s party policy (airbnb-disturbance) and the CFPB card-dispute window (cfpb-fcba). FETCH FAILURES, NOT CITED: Fodor\'s group-trip guide (HTTP 403) and NerdWallet\'s group-trip money article (no article body returned). LEFT OUT FOR LACK OF A SOURCE: a per-person trip cost band (no survey of group-trip spending per person was found that a host could plan against; the engine falls back to its disclosed family estimate), a per-person share of a rental (the stay planner carries its own nightly-rate data; no source gives a per-person split figure), purchases and vendor cost ranges, a typical trip length, a bathroom-per-guest ratio (AvantStay says one per four to five guests; the already-registered multigen-rental-fit says two to three, and the two disagree), a flight-booking window (the registered CheapAir and Frommers figures live in travelLeadTime.js, outside the grounding registries this file may cite), a schedule past the arrival day, and a day-of checklist. THE ARRIVAL DAY (schedules) is authored because every type must cover its day (dayModelAudit, duringCues): each beat\'s content cites AvantStay, Kayak, SmarterTravel, GolfN, airbnb-rebooking or airbnb-disturbance; its minute offsets are sequencing only, not a sourced duration. The typical group of 8 is a judgment, not a survey.',
    sources: ['golfthehighsierra-group-golf-2026', 'golfn-golf-trip-guide-2026', 'avantstay-group-checklist-2026', 'smartertravel-group-trip-2025', 'kayak-group-travel-2018', 'ftc-travel-scams-2025', 'airbnb-cancel-tiers', 'airbnb-rebooking', 'airbnb-disturbance', 'cfpb-fcba'],
  },
};

export default groupTrip;
