// Corporate Team Retreat / Off-Site — Event OS host playbook (data only).
//
// A travel-led, multi-day team gathering: work/strategy sessions + team-building
// + shared meals, hosted away from the office. Registered under the canonical
// 'Team Retreat' type. This is NOT a per-guest groceries event — the weight is
// in DECISIONS (purpose, location, intensity), MILESTONES (a 90-day booking
// runway), VENDORS (venue/lodging/transport/caterer/facilitator/activity/AV),
// RISKS, and a BALANCED AGENDA (the daily flow lives in `schedules`).
//
// Lens: an internal-events / People-team leader + an experiential-events pro
// (Colja Dams) + a working-session facilitator. The #1 failure mode is
// over-scheduling — the agenda is deliberately built with downtime and tiered,
// inclusive activity choices. Authored honestly and labeled `synthesized`.
// ESM default export.

const teamRetreat = {
  type: 'Team Retreat',
  solveFamily: 'team_retreat',
  family: 'corporate',
  recordKind: 'client',
  version: '1.0.0',
  meta: {
    summary: 'A travel-led, multi-day corporate team retreat / off-site: work + strategy sessions, one or two team-building activities, shared meals, and real downtime — hosted away from the office. The playbook front-loads a 90-day booking runway (venue, lodging, transport) and a facilitator for the working sessions, then protects a BALANCED agenda because over-scheduling is the single most common way retreats fail. Purpose (align vs bond vs both) is set first and drives everything downstream.',
    typicalGuests: { low: 8, default: 25, high: 60 },
    typicalDurationHours: 56, // ~2.5 days on-site (multi-day, travel-led)
    leadTimeDays: 90,
    hostDifficulty: 'hard',
    perGuestCost: { low: 800, high: 2800, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The one working session that cracks something the team has been stuck on for months.',
    'Dinner the first night — no agenda, no slides, just the team at a table.',
    'The activity that puts two people in conversation who\'ve never really talked.',
    'Someone says the hard thing in the room and the team actually hears it.',
  ],

  decisions: [
    { id: 'purpose', label: 'Primary purpose of the retreat', options: ['Strategy / alignment', 'Team bonding / culture', 'Both (work + bond)', 'Onboarding / kickoff'], default: 'Both (work + bond)', when: 'T-90d', blocks: ['agenda', 'facilitator', 'activity', 'location'], why: 'The first and biggest lever. Purpose decides the work/bonding ratio, whether you need a facilitator, what success looks like, and how you justify the spend. Set it before anything is booked.' },
    { id: 'location', label: 'Location: local vs destination', options: ['Local (day-trip-able)', 'Regional (short flight/drive)', 'Destination (flights for most)'], default: 'Regional (short flight/drive)', when: 'T-90d', blocks: ['transport', 'lodging', 'budget'], why: 'Destination drives flights, room blocks, transfers, and most of the budget; local cuts cost and travel friction but offers less "away from it all". Choose against purpose and budget.' },
    { id: 'intensity', label: 'Agenda intensity', options: ['Light (lots of downtime)', 'Balanced (work + space)', 'Packed (back-to-back)'], default: 'Balanced (work + space)', when: 'T-75d', blocks: ['agenda'], why: 'Over-scheduling is the #1 retreat mistake — it drains the room and kills the conversations you came for. Default to balanced: protect free time and never stack sessions back-to-back-to-back.' },
    { id: 'activity', label: 'Team-building activity type', options: ['Low-key (cooking, art, tasting)', 'Active (hike, ropes, sport)', 'City / cultural', 'Mix with opt-out alternative'], default: 'Mix with opt-out alternative', when: 'T-60d', blocks: ['activity_vendor'], why: 'Not everyone has the same fitness level or comfort. Always offer a tiered/opt-out alternative (e.g. easy walk or craft class beside the hike) so no one is sidelined.' },
    { id: 'lodging', label: 'Lodging: shared vs private rooms', options: ['Private rooms for all', 'Shared rooms (cuts cost)', 'Opt-in shared / private default'], default: 'Private rooms for all', when: 'T-75d', blocks: ['lodging'], why: 'Shared rooms roughly halve lodging cost but are a real comfort/inclusion issue — privacy, sleep, neurodivergence, seniority. Private default is safest; if sharing, make it opt-in, never assigned.' },
  ],

  milestones: [
    { id: 'tr_purpose_budget', name: 'Lock purpose, headcount, budget, dates', offsetDays: 90, owner: 'organizer', category: 'planning', risk: { ifDelayed: 'Everything downstream slips; rates rise', severity: 'high' } },
    { id: 'tr_dates_conflicts', name: 'Confirm dates against team calendars / holidays', offsetDays: 85, owner: 'organizer', dependsOn: ['tr_purpose_budget'], category: 'planning', risk: { ifDelayed: 'Date conflicts, low attendance', severity: 'med' } },
    { id: 'tr_venue', name: 'Book venue / retreat center + room block', offsetDays: 75, owner: 'organizer', dependsOn: ['tr_dates_conflicts'], category: 'venue', risk: { ifDelayed: 'Preferred venue/room block gone; premium pricing', severity: 'high' } },
    { id: 'tr_facilitator', name: 'Engage facilitator + draft agenda intensity', offsetDays: 60, owner: 'organizer', dependsOn: ['tr_purpose_budget'], category: 'program', risk: { ifDelayed: 'Working sessions run unfacilitated and drift', severity: 'med' } },
    { id: 'tr_transport', name: 'Book flights / shuttles / ground transfers', offsetDays: 45, owner: 'organizer', dependsOn: ['tr_venue'], category: 'logistics', risk: { ifDelayed: 'Airfare spikes; transfer gaps on arrival', severity: 'high' } },
    { id: 'tr_activity_meals', name: 'Confirm activity vendor + caterer + group dinner', offsetDays: 45, owner: 'organizer', dependsOn: ['tr_venue'], category: 'program', risk: { ifDelayed: 'Activity/restaurant fully booked', severity: 'med' } },
    { id: 'tr_comms_dietary', name: 'Send pre-retreat comms: agenda, packing list, dietary/accessibility survey', offsetDays: 30, owner: 'organizer', dependsOn: ['tr_transport', 'tr_activity_meals'], category: 'guest', risk: { ifDelayed: 'Unmet dietary/accessibility needs; confused attendees', severity: 'high' } },
    { id: 'tr_agenda_final', name: 'Finalize agenda (with downtime) + session materials', offsetDays: 21, owner: 'facilitator', dependsOn: ['tr_facilitator', 'tr_comms_dietary'], category: 'program', risk: { ifDelayed: 'Over-packed or unprepared sessions', severity: 'med' } },
    { id: 'tr_reconfirm', name: 'Reconfirm venue, lodging, transport, caterer, vendors', offsetDays: 14, owner: 'organizer', dependsOn: ['tr_agenda_final'], category: 'logistics', risk: { ifDelayed: 'Day-one no-shows from a vendor', severity: 'high' } },
    { id: 'tr_final_comms', name: 'Final attendee comms: arrival times, contacts, day-1 plan', offsetDays: 7, owner: 'organizer', dependsOn: ['tr_reconfirm'], category: 'guest', risk: { ifDelayed: 'Attendees arrive without instructions', severity: 'med' } },
    { id: 'tr_onsite_prep', name: 'On-site setup: signage, AV check, welcome kits, point person', offsetDays: 1, owner: 'organizer', dependsOn: ['tr_final_comms'], category: 'setup', risk: { ifDelayed: 'Rocky first impression', severity: 'med' } },
    { id: 'event', name: 'The retreat', offsetDays: 0, owner: 'organizer', dependsOn: ['tr_onsite_prep'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_purpose', milestoneId: 'tr_purpose_budget', phase: 'planning', label: 'Write a one-line purpose + 2-3 success outcomes; agree budget and headcount', when: 'T-90d' },
    { id: 't_dates', milestoneId: 'tr_dates_conflicts', phase: 'planning', label: 'Poll the team / check calendars for holidays, PTO, deadlines, observances', when: 'T-85d' },
    { id: 't_venue', milestoneId: 'tr_venue', phase: 'venue', label: 'Tour/shortlist retreat centers; sign contract + hold room block', when: 'T-75d' },
    { id: 't_facilitator', milestoneId: 'tr_facilitator', phase: 'program', label: 'Brief facilitator on purpose; agree session goals and intensity', when: 'T-60d' },
    { id: 't_transport', milestoneId: 'tr_transport', phase: 'logistics', label: 'Book flights/shuttles; build an arrivals/departures grid; plan airport transfers', when: 'T-45d' },
    { id: 't_meals', milestoneId: 'tr_activity_meals', phase: 'program', label: 'Confirm caterer, group dinner reservation, and the team-building activity (+ opt-out alt)', when: 'T-45d' },
    { id: 't_survey', milestoneId: 'tr_comms_dietary', phase: 'guest', label: 'Send agenda preview, packing list, expense/per-diem rules, dietary + accessibility survey', when: 'T-30d' },
    { id: 't_agenda', milestoneId: 'tr_agenda_final', phase: 'program', label: 'Lock the daily flow with real downtime; prep slides/worksheets; assign session owners', when: 'T-21d' },
    { id: 't_reconfirm', milestoneId: 'tr_reconfirm', phase: 'logistics', label: 'Call every vendor to reconfirm dates, counts, dietary, timings, AV', when: 'T-14d' },
    { id: 't_final_comms', milestoneId: 'tr_final_comms', phase: 'guest', label: 'Send arrival instructions, on-site contact numbers, and the day-1 schedule', when: 'T-7d' },
    { id: 't_setup', milestoneId: 'tr_onsite_prep', phase: 'setup', label: 'Lay out name tags + welcome kits, test AV/Wi-Fi, set the room, name a day-of point person', when: 'T-1d' },
    { id: 't_followup', milestoneId: 'event', phase: 'followup', label: 'Within a week: send recap + decisions + owners, run a feedback survey so the work sticks', when: 'T0 +5d' },
  ],

  purchases: [
    { id: 'p_nametags', item: 'Name tags / lanyards', category: 'logistics', qtyPerGuest: 1, unit: 'badge', where: ['Office store', 'Amazon'], unitCostRange: [0.5, 2], essential: true, buyAt: 'T-3d' },
    { id: 'p_welcomekit', item: 'Welcome / swag kits (notebook, pen, water bottle, agenda card)', category: 'logistics', qtyPerGuest: 1, unit: 'kit', where: ['Swag vendor', 'Amazon'], unitCostRange: [15, 50], essential: false, buyAt: 'T-3d', note: 'Sets the tone on arrival; order early — custom swag has lead time.' },
    { id: 'p_session_supplies', item: 'Session supplies (flip charts, markers, sticky notes, printed worksheets)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Office store', 'Amazon'], unitCostRange: [40, 120], essential: true, buyAt: 'T-3d', note: 'The facilitator needs these for working sessions — easy to forget when travelling.' },
    { id: 'p_activity_supplies', item: 'Activity / team-building supplies (per chosen activity)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Activity vendor', 'Local store'], unitCostRange: [0, 200], essential: false, buyAt: 'T-1d', note: 'Often provided by the activity vendor — only buy if running it DIY.' },
    { id: 'p_snacks', item: 'Session snacks + coffee/tea + water (between catered meals)', category: 'food', qtyPerGuest: 6, unit: 'servings', where: ['Grocery', 'Venue F&B'], unitCostRange: [1, 4], essential: true, buyAt: 'T-1d', note: 'Keeps energy up across multi-day sessions; venue may supply — confirm.' , alternatives: ['Grocery granola bars plus fruit — cheapest snack option', 'Trail mix and nuts in bulk — budget per-serving, keeps energy up'] },
    { id: 'p_drinks', item: 'Sparkling water, soda & mocktail mixers', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Grocery', 'Venue bar'], unitCostRange: [1, 5], essential: false, buyAt: 'T-1d', note: 'INCLUSION: not everyone drinks — always stock equal non-alcoholic options, never make alcohol the only social glue.' },
    { id: 'p_firstaid', item: 'First-aid kit + basics (sunscreen, water for active days)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Pharmacy', 'Amazon'], unitCostRange: [15, 40], essential: true, buyAt: 'T-3d', note: 'Active team-building day-of safety; commonly forgotten.' },
  ],

  rentalsGap: [
    { item: 'Projector / large display + screen', qtyFlat: 1, note: 'Working sessions — confirm the venue has AV before renting' },
    { item: 'Wireless mic / speaker', qtyFlat: 1, note: 'For larger groups so the back of the room can hear' },
    { item: 'Whiteboards / easel pads', qtyPerGuest: 0.1, note: 'Roughly one board per breakout group of ~8' },
    { item: 'Power strips + chargers + extension cords', qtyFlat: 4, note: 'Laptops everywhere; venues never have enough outlets' },
    { item: 'Portable Wi-Fi hotspot (backup)', qtyFlat: 1, note: 'Insurance against venue Wi-Fi failing mid-session' },
  ],

  vendors: [
    { category: 'Venue / retreat center', required: true, altToDIY: 'No real DIY — a multi-day off-site needs meeting + lodging space', when: 'T-75d', costRange: [150, 600], costUnit: 'per guest per night' },
    { category: 'Lodging / room block', required: true, altToDIY: 'Often bundled with the retreat center', when: 'T-75d', costRange: [120, 450], costUnit: 'per guest per night' },
    { category: 'Transport (flights / shuttle / transfers)', required: true, altToDIY: 'Self-drive if local; otherwise group shuttle', when: 'T-45d', costRange: [50, 600], costUnit: 'per guest' },
    { category: 'Caterer / meals', required: true, altToDIY: 'Venue F&B or local restaurants', when: 'T-45d', costRange: [60, 180], costUnit: 'per guest per day' },
    { category: 'Facilitator (working sessions)', required: true, altToDIY: 'Strong internal facilitator if you have one', when: 'T-60d', costRange: [1500, 8000], costUnit: 'flat (per day)' },
    { category: 'Team-building activity provider', required: false, altToDIY: 'Self-run a hike, cooking, or game', when: 'T-45d', costRange: [40, 200], costUnit: 'per guest' },
    { category: 'AV / production', required: false, altToDIY: 'Venue AV or own gear for small groups', when: 'T-30d', costRange: [300, 3000], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_overschedule', trigger: 'Agenda packed back-to-back with no downtime', severity: 'high', mitigation: 'Default to a balanced agenda: cap working sessions, build in free afternoons/breaks, never stack three sessions in a row. Downtime is where bonding actually happens.' },
    { id: 'r_dateconflict', trigger: 'Dates clash with holidays, deadlines, or key people out', severity: 'med', mitigation: 'Check team calendars and observances at T-85d before booking anything non-refundable.' },
    { id: 'r_dietary', trigger: 'Dietary or accessibility needs unknown or unmet', severity: 'high', mitigation: 'Run a dietary + accessibility survey at T-30d; give every name and count to the caterer and venue; confirm step-free access and a quiet space.' },
    { id: 'r_inclusion', trigger: 'Activity excludes some by fitness or alcohol assumption', severity: 'med', mitigation: 'Always offer a tiered/opt-out alternative activity and equal non-alcoholic options; survey comfort levels in advance.' },
    { id: 'r_travel', trigger: 'Flight delays / transfer gaps / lost attendees on arrival', severity: 'med', mitigation: 'Build an arrivals grid, share on-site contact numbers, add buffer before day-1 sessions, and arrange clear airport transfers.' },
    { id: 'r_budget', trigger: 'Costs overrun — lodging and travel blow the budget', severity: 'high', mitigation: 'Lock budget at T-90d; track lodging (~35%) + F&B (20-30%) + transport against it; set clear per-diem/expense rules up front.' },
    { id: 'r_nofollowup', trigger: 'No follow-up — insights and decisions evaporate', severity: 'med', mitigation: 'Capture decisions + owners live; send a recap and feedback survey within a week so the work sticks.' },
  ],

  contingencies: [
    { id: 'c_overschedule', when: 'r_overschedule', plan: 'If the room is flagging, cut or shorten a session live and convert it to open downtime or an informal walk — protect energy over coverage.' },
    { id: 'c_dietary', when: 'r_dietary', plan: 'Keep a backup of clearly-labeled vegetarian/vegan/gluten-free/halal options at every meal; brief the caterer on a same-day add.' },
    { id: 'c_inclusion', when: 'r_inclusion', plan: 'Run the opt-out alternative in parallel (gentle walk, craft, or rest) so no one sits on the sidelines; never single anyone out.' },
    { id: 'c_travel', when: 'r_travel', plan: 'Hold day-1 to a relaxed welcome + dinner (no hard content) so late arrivals miss nothing critical; keep a transfer contact on call.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Name tags, welcome kits, session supplies, first-aid kit' },
      { when: 'T-1d', what: 'Snacks, coffee/tea, drinks (incl. non-alcoholic), any DIY activity supplies' },
    ],
    preparation: [
      { when: 'T-30d', what: 'Send agenda preview, packing list, per-diem/expense rules, dietary + accessibility survey' },
      { when: 'T-21d', what: 'Facilitator finalizes the balanced agenda; prep slides/worksheets; assign session owners' },
      { when: 'T-14d', what: 'Reconfirm venue, lodging, transport, caterer, and the activity vendor with final counts' },
      { when: 'T-7d', what: 'Final attendee comms: arrival times, on-site contacts, day-1 plan' },
    ],
    setup: [
      { when: 'T-1d', what: 'Lay out name tags + welcome kits, test AV/Wi-Fi, set the meeting room, name a day-of point person' },
      { when: 'T0 -2h', what: 'Stage coffee/snacks, charge devices, post signage and the printed agenda' },
    ],
    cleanup: [
      { when: 'T0 last day', what: 'Settle the venue/caterer bill, collect lost-and-found, coordinate departures and transfers' },
      { when: 'T0 +5d', what: 'Send recap with decisions + owners + photos and a feedback survey so the work sticks' },
    ],
    // Daily agenda flow — deliberately balanced (work + bonding + downtime).
    // Over-scheduling is the #1 retreat mistake; the gaps below are intentional.
    agenda: [
      { when: 'Day 1 afternoon', what: 'Arrivals + transfers; light welcome, room check-in, no hard content' },
      { when: 'Day 1 evening', what: 'Welcome group dinner (kickoff + purpose framing) — the one anchored social moment' },
      { when: 'Day 2 morning', what: 'Facilitated working / strategy session (the core work block)' },
      { when: 'Day 2 midday', what: 'Catered lunch + protected downtime (rest, informal conversation)' },
      { when: 'Day 2 afternoon', what: 'Team-building activity with a tiered / opt-out alternative for all abilities' },
      { when: 'Day 2 evening', what: 'Relaxed dinner; non-alcoholic options equal to alcoholic; optional, not mandatory' },
      { when: 'Day 3 morning', what: 'Shorter synthesis session: decisions, owners, next steps captured live' },
      { when: 'Day 3 midday', what: 'Close, group reflection, then departures / transfers' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Figures reflect widely-published 2025-2026 corporate-retreat planning consensus: a ~90-day booking runway (4-6 months for 50+ or peak destinations); roughly $800-$2,800 per guest before flights for a multi-day off-site, with lodging/venue the largest line (~35%), food & beverage ~20-30%, and ground transport a few percent. The governing design judgment — purpose set first, a facilitator for working sessions, tiered/opt-out and non-alcoholic-inclusive activities, and above all a BALANCED agenda with real downtime because over-scheduling is the most common failure — reflects internal-events / experiential-events / facilitation practice. Authored as synthesized trade consensus; no figures are venue-specific or fabricated, and no citations are attached until a foreground verification pass.',
    sources: [],
  },
};

export default teamRetreat;
