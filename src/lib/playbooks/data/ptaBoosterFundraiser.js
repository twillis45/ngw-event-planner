// PTA / Booster Fundraiser — Event OS host playbook (data only).
//
// Authored 2026-08-21 (W1.4) off the seasonal-demand study
// (docs/audits/2026-08-21_SEASONAL_DEMAND_AND_NICHE_RESEARCH.md, Q3/Q4): the
// strongest absent-type demand after the Q4 hosting pair — school-year
// fundraisers (fall festivals, auction nights, spirit nights, concession
// seasons) run by parent volunteers on a recurring annual cadence, with a
// national institutional ecosystem behind them. Free PDF kits kill the paid
// template but not the app playbook — sequencing, readiness, and volunteer
// coordination are exactly what a static checklist cannot do.
//
// WHY THIS IS NOT A FUNDRAISER / GALA RE-SKIN (review-board duplicate-surface
// ruling): the Gala playbook is a professional revenue machine — a contracted
// ballroom, a production partner, a benefit auctioneer, donor data landing in
// a CRM, tax receipts with fair-market-value math. This playbook is the
// SMALL-COMMITTEE, SCHOOL-CONTEXT variant, and everything in it follows from
// four facts a gala never faces:
//
//   • THE VENUE IS A SCHOOL. The room comes through a facility-use request to
//     the school or district — with real lead time, because districts book
//     the calendar far out — plus a custodial arrangement, the insurance
//     certificate the district requires, and an administrator's sign-off on
//     how money is handled on campus. The bar question does not exist: the
//     default on school grounds is no alcohol, full stop.
//   • THE WHOLE CREW IS PARENT VOLUNTEERS. Nobody is contracted and nobody
//     volunteers for six hours — the sign-up goes out with the class lists,
//     the schedule is built in 90-minute shifts, and where the district
//     requires it, volunteers clear a background check before the night.
//   • THE MONEY IS SCHOOL-SCALE AND SCHOOL-GOVERNED. One treasurer touches
//     every dollar (the same rule that keeps a family reunion's peace), cash
//     is counted with two people present, and the deposit goes in within days
//     because school and PTA money policies say so — not because a board
//     asks. A raffle is run ONLY after the permit check: many states regulate
//     school raffles as gaming, so the check is named as a task and the rule
//     is never asserted.
//   • THE CROWD IS MOSTLY KIDS. That produces a pickup-and-dismissal plan, a
//     lost-child point person, allergy-aware concessions with signage, and a
//     close-of-night that hands every child back to the right adult.
//
// LEAD-TIME JUDGMENTS: the 120-day runway is set between Reunion (T-75d) and
// Conference (T-180d) — far shorter than the Gala's T-270d because nothing is
// contracted at scale, but anchored early because the facility-use request is
// the one genuinely slow thing: district calendars are built around the school
// year and popular Friday nights go first. Sponsor asks open at T-75d so local
// businesses hear the ask before their small seasonal budgets are spent; the
// volunteer sign-up rides the class lists at T-45d; presale opens at T-30d.
// Where a lead was uncertain the CONSERVATIVE (earlier) figure was taken —
// most notably the raffle-permit check at T-60d, because state processing
// times vary widely and an unlicensed drawing is not a small problem.
//
// Quantities and cost bands are synthesized from widely-published US school-
// fundraising practice and labeled honestly — no sources were fetched in this
// pass, so per the corroboration ratchet nothing here claims a cited price.
// No fabricated sources. ESM default export.

const ptaBoosterFundraiser = {
  type: 'PTA / Booster Fundraiser',
  vegMain: 'Cheese pizza slices plus a fruit-and-veggie tray at the stand',
  solveFamily: 'gala',
  family: 'host_driven',
  recordKind: 'client',
  version: '1.0.0',

  meta: {
    summary:
      'A school-year fundraiser run entirely by parent volunteers — a fall festival on the blacktop, an auction or bingo night in the cafeteria, a spirit night at a local business, or a concession season at the games. The venue comes through a facility-use request to the school or district, the crew is a sign-up sheet worked in 90-minute shifts, and the money is school-governed: one treasurer, two people on every count, and the deposit in within days. The crowd is mostly kids, so the plan carries a pickup plan, allergy-aware concessions, and a lost-child point person. A raffle runs only after the permit check — many states regulate school raffles. Success is the goal met, the sponsors thanked on the banner, and every child handed back to the right adult.',
    typicalGuests: { low: 100, default: 250, high: 600 },
    typicalDurationHours: 3,
    leadTimeDays: 120,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 2, high: 8, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The principal reads out the total over the PA on Monday morning and the whole school cheers.',
    'A kid drags their parents to the game booth their own class built.',
    'The sponsor banner goes up and a local shop owner takes a photo of their name on it.',
    'The volunteer shift board fills to the last slot two days before the night.',
    'The two counters look up from the cash table at the same time with the same number.',
  ],

  decisions: [
    {
      id: 'event_format',
      label: 'What kind of fundraiser is this?',
      options: ['Fall festival or carnival on school grounds', 'Auction or bingo night in the cafeteria', 'Spirit night at a local business', 'Concession season at the games'],
      default: 'Fall festival or carnival on school grounds',
      when: 'T-120d',
      blocks: ['facility', 'volunteers', 'concessions', 'presale'],
      weight: 'high', reversibility: 'costly', emotionalWeight: 'med', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'The format decides the facility request, the volunteer headcount, and what the night can raise — a festival needs the grounds and forty shifts, a spirit night needs neither — and only the committee knows what its school and its parents will turn out for.', tier: 'reasoned' },
      why: 'A festival raises the most and costs the most volunteer hours — game booths, a concession stand, and the whole blacktop reserved through the district. An auction or bingo night trades the crowd for bigger per-family giving in one room. A spirit night at a local restaurant is the lightest lift of all: the business runs the night and donates a share, and your whole job is turnout. A concession season is not one night but a stand worked at every home game — steady money, and a shift schedule that has to survive a whole season.',
      optionNotes: {
        'Fall festival or carnival on school grounds': 'Biggest night, biggest volunteer bill · the grounds must be requested early',
        'Auction or bingo night in the cafeteria': 'One room, bigger per-family giving · check whether bingo needs its own permit',
        'Spirit night at a local business': 'The business does the work · the share is smaller, and turnout is everything',
        'Concession season at the games': 'Steady money all season · the shift schedule is the whole job',
      },
      defaultWhy: 'The festival is the default because it is the format the demand research found parents searching for most, and it exercises every part of the plan. Change it if your volunteer bench is thin — a spirit night raises real money on almost none.',
    },
    {
      id: 'fundraising_goal',
      label: 'What is the goal, and what does it fund?',
      options: ['Under $2,500', '$2,500 to $10,000', '$10,000 to $25,000', 'Over $25,000'],
      default: '$2,500 to $10,000',
      when: 'T-120d',
      blocks: ['sponsors', 'presale', 'budget'],
      weight: 'high', reversibility: 'reversible', emotionalWeight: 'med', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'Every ask all season uses the same sentence — what the money funds — and the goal sets whether sponsor asks and a presale are worth the labor; only the PTA or booster board can set the number.', tier: 'reasoned' },
      why: 'Name the thing the money buys in one sentence — new playground equipment, the band trip, field-day supplies — because that sentence is what families give to, not the event. The goal also sizes the plan: under $2,500 rarely justifies a raffle permit or a sponsor campaign, while a five-figure goal means presale, sponsors, and the festival format all pull together. Say the goal out loud to families from the first flyer, and report against it afterward.',
    },
    {
      id: 'presale',
      label: 'Tickets and wristbands — presale, at the door, or both?',
      options: ['Presale through the class lists, plus at the door', 'Presale only', 'At the door only'],
      default: 'Presale through the class lists, plus at the door',
      when: 'T-45d',
      blocks: ['gate', 'cash_plan'],
      weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive',
      priorityBasis: { rationale: 'Presale money arrives before the night and tells you the real crowd size while there is still time to adjust food and shifts — but the split between presale and door is adjustable to the last week, so the default is safe to start from.', tier: 'reasoned' },
      why: 'Presale through the class lists does two jobs at once: the money is banked before the weather can touch it, and the count tells you how much food to buy and how many shifts to fill. At-door sales catch the families who decide that afternoon — keep the door price a little higher so presale stays worth it. Presale-only works for a seated auction night with a fixed room; a festival should never turn a family away at the gate.',
    },
    {
      id: 'raffle',
      label: 'Is there a raffle this year?',
      options: ['Yes, once the permit check clears', 'No raffle this year'],
      default: 'No raffle this year',
      when: 'T-60d',
      blocks: ['permit', 'drawing'],
      weight: 'med', reversibility: 'costly', emotionalWeight: 'low', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'A raffle is regulated gaming for school groups in many states, and the permit check has to clear before a single ticket is printed — deciding late strands the prize solicitation, and running unlicensed is a legal problem, so the safe default is no until the check is done.', tier: 'reasoned' },
      why: 'A raffle is popular and simple on the night, but many states regulate raffles run by school groups as charitable gaming — a permit, a registration, or printed drawing rules may be required, and the rules differ by state. The answer here is a check, not an assumption: ask the district office and your state charitable-gaming authority what applies before printing tickets. If the check clears, the raffle earns its place; if it is murky or slow, a game-booth prize wall raises money with none of the paperwork.',
    },
    {
      id: 'concessions',
      label: 'Who runs the food — your volunteers or food trucks?',
      options: ['Volunteer-run concession stand', 'Food trucks with a share back to the school', 'Both — trucks for meals, the stand for treats'],
      default: 'Volunteer-run concession stand',
      when: 'T-45d',
      blocks: ['food', 'beverage', 'volunteers'],
      costFactors: { 'Volunteer-run concession stand': 1, 'Food trucks with a share back to the school': 0.3, 'Both — trucks for meals, the stand for treats': 0.6 },
      affects: ['p_concession_food', 'p_drinks'],
      weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive',
      priorityBasis: { rationale: 'The stand keeps every food dollar but costs shifts and a shopping run; trucks cost nothing up front and give back a share — the swing is real money and real volunteer hours, but either model can be swapped until the trucks are booked.', tier: 'reasoned' },
      why: 'A volunteer-run stand keeps the whole margin — pizza slices, drinks, and bake-sale treats sell at school events at several times their cost — but it eats shifts and needs an allergy-aware setup with ingredients labeled. Food trucks bring their own permits, their own staff, and a share back to the school, at the price of a smaller cut. The split model is the festival favorite: trucks handle dinner, the stand sells the cheap high-margin treats, and your shift bill stays manageable.',
    },
  ],

  milestones: [
    { id: 'pb_kickoff', name: 'Set the goal, pick the format, and recruit the committee', offsetDays: 120, owner: 'host', category: 'planning', risk: { ifDelayed: 'No goal to sell against, and the facility request cannot go in without a date and format', severity: 'high' } },
    { id: 'pb_facility', name: 'Submit the facility-use request to the school or district', offsetDays: 120, owner: 'host', dependsOn: ['pb_kickoff'], category: 'venue', risk: { ifDelayed: 'District calendars fill around the school year; the good Friday nights go first', severity: 'high' } },
    { id: 'pb_approvals', name: 'Clear the district paperwork: insurance, money handling, background checks', offsetDays: 90, owner: 'host', dependsOn: ['pb_facility'], category: 'compliance', risk: { ifDelayed: 'An approval that takes weeks lands after the night, and the event cannot legally run on campus', severity: 'high' } },
    { id: 'pb_sponsors', name: 'Ask local businesses to sponsor', offsetDays: 75, owner: 'committee', dependsOn: ['pb_kickoff'], category: 'revenue', risk: { ifDelayed: 'Small local sponsor budgets are spent by other schools that asked earlier', severity: 'med' } },
    { id: 'pb_raffle', name: 'Settle the raffle question and any permit it needs', offsetDays: 60, owner: 'host', dependsOn: ['pb_approvals'], category: 'compliance', risk: { ifDelayed: 'Permit processing outruns the calendar and the raffle has to be pulled late', severity: 'high' } },
    { id: 'pb_food', name: 'Plan the concession stand or book the food trucks', offsetDays: 45, owner: 'committee', dependsOn: ['pb_kickoff'], category: 'food', risk: { ifDelayed: 'Good trucks book out their weekends; a late stand plan means a panicked shopping run', severity: 'med' } },
    { id: 'pb_volunteers', name: 'Send the volunteer sign-up with the class lists', offsetDays: 45, owner: 'committee', dependsOn: ['pb_kickoff'], category: 'planning', risk: { ifDelayed: 'The sign-up that goes out late fills late — or never', severity: 'high' } },
    { id: 'pb_presale', name: 'Open presale for tickets and wristbands', offsetDays: 30, owner: 'committee', dependsOn: ['pb_volunteers'], category: 'revenue', risk: { ifDelayed: 'The night rides entirely on door sales and the weather', severity: 'med' } },
    { id: 'pb_shifts', name: 'Fill the shift schedule and confirm every volunteer', offsetDays: 14, owner: 'committee', dependsOn: ['pb_volunteers'], category: 'planning', risk: { ifDelayed: 'Empty shifts surface on the night, when nobody can fix them', severity: 'high' } },
    { id: 'pb_cash', name: 'Set the money plan: float, cash boxes, counters, deposit', offsetDays: 7, owner: 'host', dependsOn: ['pb_approvals'], category: 'revenue', risk: { ifDelayed: 'The gate opens with no change to make and no counting plan for the close', severity: 'high' } },
    { id: 'pb_setup', name: 'Set up the site with the custodian and brief the crew', offsetDays: 0, owner: 'host', dependsOn: ['pb_shifts', 'pb_cash'], category: 'setup', risk: { ifDelayed: 'Doors open on a half-built site with volunteers still asking where things go', severity: 'med' } },
    { id: 'event', name: 'The fundraiser', offsetDays: 0, owner: 'host', dependsOn: ['pb_setup'], category: 'event', risk: null },
    { id: 'pb_wrap', name: 'Count, deposit, thank, and report the total', offsetDays: 0, owner: 'host', dependsOn: ['event'], category: 'revenue', risk: { ifDelayed: 'The deposit misses the policy window and the sponsors never hear their thank-you', severity: 'high' } },
  ],

  tasks: [
    { id: 't_goal', milestoneId: 'pb_kickoff', phase: 'planning', label: 'Set the fundraising goal, the expense budget the night can spend against it, and the one sentence that says what the money funds', when: 'T-120d' },
    { id: 't_committee', milestoneId: 'pb_kickoff', phase: 'planning', label: 'Recruit the committee and name who owns volunteers, sponsors, food, and the money', when: 'T-120d' },
    { id: 't_treasurer', milestoneId: 'pb_kickoff', phase: 'planning', label: 'Name the one treasurer who touches every dollar in and out, and keeps the ledger visible to the whole committee', when: 'T-118d' },
    { id: 't_facility', milestoneId: 'pb_facility', phase: 'venue', label: 'Submit the facility-use request to the school or district — the school is the venue, and its calendar fills first', when: 'T-120d' },
    { id: 't_custodian', milestoneId: 'pb_facility', phase: 'venue', label: 'Arrange custodial coverage for the night and get the after-hours fee into the budget', when: 'T-100d' },
    { id: 't_insurance', milestoneId: 'pb_approvals', phase: 'compliance', label: 'Ask the district what insurance certificate the event needs and get it filed before the deadline', when: 'T-90d' },
    { id: 't_money_signoff', milestoneId: 'pb_approvals', phase: 'compliance', label: 'Walk the money plan past the principal or district office and follow their rules for cash and deposits on campus', when: 'T-90d' },
    { id: 't_background', milestoneId: 'pb_approvals', phase: 'compliance', label: 'Check whether the district requires volunteer background checks, and start them now if it does — they take weeks', when: 'T-90d' },
    { id: 't_sponsor_ask', milestoneId: 'pb_sponsors', phase: 'revenue', label: 'Ask local businesses to sponsor, with a one-page ask that names the goal and what their name goes on', when: 'T-75d' },
    { id: 't_sponsor_banner', milestoneId: 'pb_sponsors', phase: 'revenue', label: 'Order the sponsor thank-you banner once the sponsor list settles, and proof every business name against what they gave you', when: 'T-21d' },
    { id: 't_raffle_check', milestoneId: 'pb_raffle', phase: 'compliance', label: 'Ask the district office and your state charitable-gaming authority whether a school raffle needs a permit or registration here', when: 'T-60d', whenChoice: { id: 'raffle', in: ['Yes, once the permit check clears'] } },
    { id: 't_raffle_permit', milestoneId: 'pb_raffle', phase: 'compliance', label: 'File the raffle permit or registration the check turned up, and note any drawing rules that must be printed on the ticket', when: 'T-55d', whenChoice: { id: 'raffle', in: ['Yes, once the permit check clears'] } },
    { id: 't_raffle_prizes', milestoneId: 'pb_raffle', phase: 'revenue', label: 'Solicit raffle prizes from local businesses and log the donor for each one', when: 'T-45d', whenChoice: { id: 'raffle', in: ['Yes, once the permit check clears'] } },
    { id: 't_trucks', milestoneId: 'pb_food', phase: 'food', label: 'Book the food trucks, agree the share back to the school in writing, and collect their permits for the district file', when: 'T-45d', whenChoice: { id: 'concessions', in: ['Food trucks with a share back to the school', 'Both — trucks for meals, the stand for treats'] } },
    { id: 't_stand_menu', milestoneId: 'pb_food', phase: 'food', label: 'Plan the stand menu around cheap, high-margin, kid-friendly items, and price everything in whole dollars so the line moves', when: 'T-45d', whenChoice: { id: 'concessions', in: ['Volunteer-run concession stand', 'Both — trucks for meals, the stand for treats'] } },
    { id: 't_allergy', milestoneId: 'pb_food', phase: 'food', label: 'Plan the allergy signage: label ingredients at the stand, keep one clearly nut-free option, and brief the stand crew on it', when: 'T-30d', whenChoice: { id: 'concessions', in: ['Volunteer-run concession stand', 'Both — trucks for meals, the stand for treats'] } },
    { id: 't_signup', milestoneId: 'pb_volunteers', phase: 'planning', label: 'Send the volunteer sign-up home with the class lists — the helper list fills from wherever parents already are', when: 'T-45d' },
    { id: 't_shifts_design', milestoneId: 'pb_volunteers', phase: 'planning', label: 'Build the schedule in 90-minute shifts — nobody signs up for six hours, and short shifts fill', when: 'T-42d' },
    { id: 't_presale_open', milestoneId: 'pb_presale', phase: 'revenue', label: 'Open presale for tickets and wristbands through the class lists, so families can pay ahead and the door price stays a little higher', when: 'T-30d', whenChoice: { id: 'presale', in: ['Presale through the class lists, plus at the door', 'Presale only'] } },
    { id: 't_presale_pace', milestoneId: 'pb_presale', phase: 'revenue', label: 'Check presale numbers weekly against the goal, and size the food buy and the shift count to the real number', when: 'T-21d', whenChoice: { id: 'presale', in: ['Presale through the class lists, plus at the door', 'Presale only'] } },
    { id: 't_shifts_fill', milestoneId: 'pb_shifts', phase: 'planning', label: 'Chase the empty shifts by name — a personal ask fills what a reminder email never does', when: 'T-14d' },
    { id: 't_roles', milestoneId: 'pb_shifts', phase: 'planning', label: 'Name the night roles: gate, stand lead, floater, lost-child point person, and one person whose only job is problems', when: 'T-14d' },
    { id: 't_pickup_plan', milestoneId: 'pb_shifts', phase: 'planning', label: 'Write the pickup plan for close of night: a point person at the collection spot, the doors in use, and who sweeps the building', when: 'T-10d' },
    { id: 't_float', milestoneId: 'pb_cash', phase: 'revenue', label: 'Get the float from the bank in small bills and coin, split across the cash boxes, so the gate can make change without holding up payments', when: 'T-2d' },
    { id: 't_counters', milestoneId: 'pb_cash', phase: 'revenue', label: 'Name the two people who count the cash together at close — never one person alone with the money', when: 'T-7d' },
    { id: 't_shop', milestoneId: 'pb_cash', phase: 'shopping', label: 'Buy the stand food, drinks, wristbands, prizes, and supplies to the presale-informed count', when: 'T-3d', whenChoice: { id: 'concessions', in: ['Volunteer-run concession stand', 'Both — trucks for meals, the stand for treats'] } },
    { id: 't_setup_site', milestoneId: 'pb_setup', phase: 'setup', label: 'Set up with the custodian: booths and tables placed, power where the stand needs it, and the areas off-limits to the crowd roped', when: 'T0' },
    { id: 't_gate_setup', milestoneId: 'pb_setup', phase: 'setup', label: 'Build the gate table: wristbands, the presale list, a cash box with its float, and clear pricing on a sign', when: 'T0' },
    { id: 't_brief', milestoneId: 'pb_setup', phase: 'setup', label: 'Brief the whole crew at once: shifts, the lost-child point person, the allergy plan, and where the first-aid kit lives', when: 'T0' },
    { id: 't_gate_open', milestoneId: 'event', phase: 'event', label: 'Open the gate on time and keep the line moving — whole-dollar prices and a stocked cash box do most of the work', when: 'T0' },
    { id: 't_drawing', milestoneId: 'event', phase: 'event', label: 'Run the raffle drawing exactly as the permit and printed rules say, announced loudly enough that winners hear it', when: 'T0', whenChoice: { id: 'raffle', in: ['Yes, once the permit check clears'] } },
    { id: 't_pickup', milestoneId: 'event', phase: 'event', label: 'Run the pickup plan at close: kids matched to their adults at the named spot, and the building swept before lockup', when: 'T0' },
    { id: 't_count', milestoneId: 'pb_wrap', phase: 'revenue', label: 'Count the cash with both counters present, both signing the total, before anyone leaves the building', when: 'T0' },
    { id: 't_deposit', milestoneId: 'pb_wrap', phase: 'revenue', label: 'Make the deposit within the window your school or PTA money policy sets — days, not weeks', when: 'T0 +1d' },
    { id: 't_thanks', milestoneId: 'pb_wrap', phase: 'revenue', label: 'Thank the sponsors, the volunteers, and the custodian by name, and send sponsors a photo of their name on the banner', when: 'T0 +3d' },
    { id: 't_report', milestoneId: 'pb_wrap', phase: 'planning', label: 'Report the total against the goal to families and the school, and write down what to change before next year', when: 'T0 +7d' },
  ],

  purchases: [
    { id: 'p_wristbands', item: 'Admission wristbands or ticket rolls', category: 'logistics', qtyPerGuest: 1.1, unit: 'wristband', where: ['Amazon', 'Party store', 'Office supply'], unitCostRange: [0.03, 0.12], essential: true, buyAt: 'T-14d', note: 'A tenth extra covers re-issues and the volunteers. A different color for adults and kids makes the gate faster.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_raffle_tickets', item: 'Raffle ticket roll (double stub)', category: 'logistics', qtyFlat: 1, unit: 'roll', where: ['Party store', 'Office supply', 'Amazon'], unitCostRange: [8, 20], essential: false, buyAt: 'T-14d', dependsOnDecision: 'raffle', note: 'Only after the permit check clears. If the state requires drawing rules printed on the ticket, that changes the order — check first, print second.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_concession_food', item: 'Stand food (pizza order, popcorn, bake-sale trays, candy)', category: 'food', qtyPerGuest: 1.5, unit: 'servings', where: ['Costco', 'Grocery', 'Local pizza shop'], unitCostRange: [0.75, 2], essential: true, buyAt: 'T-3d', dependsOnDecision: 'concessions', note: 'Cheap, high-margin, kid-friendly. Size the pizza order to presale, staged in two waves so the last hour is not sold out. Label ingredients and keep one clearly nut-free option.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_drinks', item: 'Bottled water, juice boxes, and soda for the stand', category: 'beverage', qtyPerGuest: 1.5, unit: 'drinks', where: ['Costco', 'Grocery'], unitCostRange: [0.25, 0.6], essential: true, buyAt: 'T-3d', dependsOnDecision: 'concessions', note: 'Water and juice boxes outsell soda at a kid-heavy event. No alcohol — school grounds, full stop.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_prizes', item: 'Game-booth prize wall (small toys, novelty prizes)', category: 'logistics', qtyPerGuest: 2, unit: 'prizes', where: ['Oriental Trading', 'Dollar store', 'Amazon'], unitCostRange: [0.1, 0.5], essential: false, buyAt: 'T-14d', dependsOnDecision: 'event_format', note: 'Bulk novelty prizes are pennies apiece; a tiered wall — many small, a few big — keeps kids playing. Order two weeks out so shipping is not a gamble.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_cashboxes', item: 'Cash boxes and the float (small bills and coin)', category: 'logistics', qtyFlat: 1, unit: 'set', where: ['Office supply', 'Bank'], unitCostRange: [40, 120], essential: true, buyAt: 'T-2d', note: 'One lockable box per selling station, each with a logged starting float from the bank. The float comes back — the box cost is the real spend.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_signage', item: 'Signage: pricing, wayfinding, and the sponsor thank-you banner', category: 'decor', qtyFlat: 1, unit: 'sign package', where: ['Print shop', 'Office supply'], unitCostRange: [75, 300], essential: true, buyAt: 'T-14d', note: 'The banner is a promise you sold — proof every sponsor name against what they gave you. Whole-dollar pricing signs keep every line moving.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_allergy_labels', item: 'Allergy labels, tent cards, and markers for the stand', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Office supply', 'Amazon'], unitCostRange: [10, 25], essential: true, buyAt: 'T-7d', note: 'Every item at the stand gets an ingredient label; the nut-free option gets its own clearly marked spot away from the rest.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_volunteer_id', item: 'Volunteer vests, badges, or lanyards', category: 'logistics', qtyFlat: 1, unit: 'set', where: ['Amazon', 'Party store'], unitCostRange: [20, 60], essential: true, buyAt: 'T-14d', note: 'A kid who needs help has to be able to spot a volunteer in a crowd. Reused every year, so buy once and label the bin.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_firstaid', item: 'First-aid kit for the gate table', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Pharmacy', 'Amazon'], unitCostRange: [15, 40], essential: true, buyAt: 'T-7d', note: 'Scrapes are guaranteed at a kid-heavy night. Ask whether the school nurse or office kit is available too, and know where the AED lives.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_cleanup', item: 'Cleanup kit (trash bags, gloves, wipes, tape)', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Hardware'], unitCostRange: [15, 40], essential: true, buyAt: 'T-3d', note: 'The site goes back to the custodian cleaner than it was found — that is what gets next year’s facility request approved without a fight.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
  ],

  rentalsGap: [
    { item: 'Folding tables for the gate, the stand, and the booths', qtyFlat: 8, note: 'The school usually lends cafeteria tables — ask in the facility request rather than renting.' },
    { item: 'Pop-up canopies for outdoor booths', qtyFlat: 3, note: 'Shade for the stand and the gate; borrow from the parent pool before renting.' },
    { item: 'PA system or a megaphone', qtyFlat: 1, note: 'Announcements, the drawing, and the pickup call at close all need to be heard over a crowd. The school’s own PA may cover it.' },
    { item: 'Extension cords and power strips, taped down', qtyFlat: 1, note: 'The stand, the PA, and any inflatable all want power — walk the run with the custodian and tape every cord a kid could trip on.' },
    { item: 'Bounce house or inflatable (vendor-delivered)', qtyFlat: 1, note: 'Only through a vendor who carries insurance the district will accept, staffed every minute it is up.' },
  ],

  vendors: [
    { category: 'School custodial staff (after-hours coverage)', required: true, altToDIY: 'None on district property — the custodial arrangement is part of the facility approval', when: 'T-100d', costRange: [50, 400], costUnit: 'flat' },
    { category: 'Food trucks (share back to the school)', required: false, altToDIY: 'The volunteer-run stand — more margin, more shifts', when: 'T-45d', costRange: [0, 100], costUnit: 'flat' },
    { category: 'Bounce house / inflatable with district-acceptable insurance', required: false, altToDIY: 'Skip it — game booths built by each class cost nearly nothing and kids love them', when: 'T-45d', costRange: [150, 450], costUnit: 'flat' },
    { category: 'DJ or PA rental', required: false, altToDIY: 'The school PA plus a parent’s playlist — fine for a festival, thin for an auction night', when: 'T-30d', costRange: [150, 500], costUnit: 'flat' },
    { category: 'Face painter or balloon artist', required: false, altToDIY: 'A talented parent volunteer and a supply kit', when: 'T-30d', costRange: [100, 300], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_facility', trigger: 'The facility-use request goes in late and the date or the grounds are gone', severity: 'high', mitigation: 'Submit the request the week the committee forms — district calendars are built around the school year and popular Friday nights go first. Ask for the rooms, the grounds, and the custodial coverage in the same request.' },
    { id: 'r_permit', trigger: 'The raffle runs without the permit or registration the state requires', severity: 'high', mitigation: 'The permit check is a named task that happens before a single ticket is printed: ask the district office and the state charitable-gaming authority what applies. If the answer is slow or murky, cancel the raffle and run a prize wall instead — an unlicensed drawing is a legal problem, not a paperwork one.' },
    { id: 'r_volunteers', trigger: 'The shift schedule has holes on the night, or volunteers simply do not show', severity: 'high', mitigation: 'Build 90-minute shifts, send the sign-up with the class lists, chase empty slots by name at two weeks out, and keep two floaters unassigned on the night to plug no-shows.' },
    { id: 'r_background', trigger: 'A district background-check requirement surfaces after the shift schedule is built', severity: 'med', mitigation: 'Ask the district at three months out whether volunteer checks are required and how long they take — the answer is a check, not an assumption. Start them with the sign-up so nobody is turned away at the door of their own shift.' },
    { id: 'r_cash', trigger: 'Cash goes missing, or the count at close does not match anyone’s memory of the night', severity: 'high', mitigation: 'One treasurer owns the money plan, every box starts with a logged float, nobody handles cash alone, and two named counters count together at close with both signing the total. Empty full boxes to the locked box mid-event rather than letting cash pile at the gate.' },
    { id: 'r_deposit', trigger: 'The deposit slips past the window the school or PTA money policy sets', severity: 'med', mitigation: 'The deposit is a named task with a date — within days, per policy — and the treasurer owns it. A late deposit reads as a problem even when nothing is wrong.' },
    { id: 'r_lost_child', trigger: 'A child is separated from their adults in a big evening crowd', severity: 'high', mitigation: 'Name a lost-child point person and a meeting spot, brief every volunteer on both at the pre-open huddle, and put the vested volunteers where kids can find them. At close, the pickup plan matches every child to their adult before the building is swept.' },
    { id: 'r_allergy', trigger: 'A child with a food allergy reacts to something from the stand', severity: 'high', mitigation: 'Label ingredients on everything the stand sells, keep one clearly nut-free option served away from the rest, brief the stand crew, and know where the first-aid kit and the school’s emergency plan live before doors.' },
    { id: 'r_weather', trigger: 'Rain lands on an outdoor festival date', severity: 'med', mitigation: 'Ask for the gym or cafeteria as a rain backup in the original facility request — adding it later is a second approval. Make the call the morning of, and push it through the class lists so families hear before they drive.' },
    { id: 'r_turnout', trigger: 'Presale runs soft and the night is heading for a quiet gate', severity: 'med', mitigation: 'Check presale weekly against the goal; if it lags at two weeks out, push through the channels parents actually read — the class lists and the school newsletter — and ask teachers to plug it. Size the food buy to the real number, not the hoped-for one.' },
    { id: 'r_sponsor_thanks', trigger: 'A sponsor’s name is missing or misspelled on the banner they paid for', severity: 'med', mitigation: 'Proof the banner against what each sponsor actually gave you before it prints, walk the site against the sponsor list at setup, and send every sponsor a photo of their name up. The thank-you is what brings the check back next year.' },
  ],

  contingencies: [
    { id: 'c_permit', when: 'r_permit', plan: 'Pull the raffle and refund any presold tickets rather than run it — then move the prizes to a game-booth prize wall or a silent-bid table, which need no gaming permit and still raise money on the night.' },
    { id: 'c_volunteers', when: 'r_volunteers', plan: 'Collapse to the spine: gate, stand, and the lost-child point person stay staffed; close a game booth or two rather than run them unattended. The two floaters plug the worst holes first.' },
    { id: 'c_cash', when: 'r_cash', plan: 'Stop, secure every box in the locked room, and recount with both counters from the logged floats. If the gap survives the recount, the treasurer reports it to the principal and the PTA board the same night — a same-night report is a discrepancy; a late one is a scandal.' },
    { id: 'c_lost_child', when: 'r_lost_child', plan: 'The point person holds the meeting spot while vested volunteers sweep in a ring from where the child was last seen; the PA calls the child’s first name only. If the child is not found fast, the school’s own emergency plan and the call to police come immediately — not after another lap.' },
    { id: 'c_weather', when: 'r_weather', plan: 'Move to the gym or cafeteria on the morning call: gate at the main doors, stand to the serving window, booths along the walls. A smaller indoor festival with dry families beats a soaked blacktop.' },
    { id: 'c_turnout', when: 'r_turnout', plan: 'Cut the food order to presale plus a modest door estimate, hold receipts so unopened cases go back, and put the energy into the last-week push — a spirit-night-style final flyer through the class lists costs nothing.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-14d', what: 'Order wristbands, prizes, signage and the sponsor banner — shipping and print lead times are real' },
      { when: 'T-3d', what: 'Buy the stand food, drinks, allergy labels, and the cleanup kit to the presale-informed count' },
      { when: 'T-2d', what: 'Bank run: the float in small bills and coin, split and logged per cash box' },
      { when: 'T0', what: 'Ice for the drink tubs, and the pizza order confirmed for its delivery window' },
    ],
    preparation: [
      { when: 'T-14d', what: 'Shifts chased by name; night roles named — gate, stand lead, floaters, lost-child point person' },
      { when: 'T-10d', what: 'Pickup plan written: the collection spot, the doors in use, who sweeps the building' },
      { when: 'T-7d', what: 'Counters named; allergy labels prepped; first-aid kit staged with the gate box' },
      { when: 'T-1d', what: 'Presale list printed for the gate; floats logged; signage and banner loaded for the morning' },
    ],
    setup: [
      { when: 'T0 -4h', what: 'Meet the custodian, walk the site, place tables and booths, rope off the areas the crowd stays out of' },
      { when: 'T0 -3h', what: 'Power run taped down; stand built with the allergy labels out and the nut-free option set apart' },
      { when: 'T0 -2h', what: 'Gate table built: wristbands, presale list, cash box with its float, whole-dollar pricing sign up' },
      { when: 'T0 -1h', what: 'Sponsor banner hung and checked against the sponsor list; prize wall stocked; PA tested' },
      { when: 'T0 -0:30', what: 'All-crew huddle: shifts, the lost-child point person and meeting spot, the allergy plan, where first aid lives' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Gate opens: wristbands on, presale list checked, the line kept moving' },
      { when: 'T0 +30m', what: 'Full swing: booths running, stand serving, floaters plugging holes' },
      { when: 'T0 +1h', what: 'Dinner peak at the stand and the trucks; second food wave staged' },
      { when: 'T0 +1:30', what: 'Announcements on the PA: the goal, the total so far, and the sponsors thanked by name' },
      { when: 'T0 +2h', what: 'The big moment: the raffle drawing run by its printed rules, or the final-hour prize push' },
      { when: 'T0 +2:30', what: 'Last call at the stand; markdowns on what should not go home with the committee' },
      { when: 'T0 +2:50', what: 'Closing announcement: thank-yous, the pickup spot named, booths begin to close' },
    ],
    cleanup: [
      { when: 'during', what: 'Floaters keep bins from overflowing and cash boxes emptied to the locked room; the lost-child point person stays findable all night' },
      { when: 'T0 +3h', what: 'Pickup plan runs: kids matched to their adults at the spot, booths struck, borrowed tables back where the custodian wants them' },
      { when: 'T0 +3:30', what: 'The count: both counters, door closed, floats subtracted, both signatures on the total — then the site walked with the custodian' },
      { when: 'T0 +1d', what: 'Deposit made within the policy window; receipts to the treasurer’s ledger' },
      { when: 'T0 +3d', what: 'Sponsors, volunteers, and the custodian thanked by name; sponsors get the banner photo' },
      { when: 'T0 +7d', what: 'Total reported against the goal to families and the school; the what-to-change list written for next year' },
    ],
  },

  // Day-of readiness, authored for a volunteer-run school night: the money, the
  // kids, and the paperwork are the three things that cannot be improvised.
  dayOfChecklist: [
    { id: 'money', label: 'The money plan is running', detail: 'Every cash box started with a logged float, nobody handling cash alone, full boxes emptied to the locked room mid-event, and the two counters both know they close the night.', severity: 'critical' },
    { id: 'lost_child', label: 'The lost-child point person is live', detail: 'Named, briefed, findable in a vest, with the meeting spot known to every volunteer at the huddle — before the first family walks in.', severity: 'critical' },
    { id: 'paperwork', label: 'The approvals are in hand', detail: 'Facility-use approval, the insurance certificate the district required, the raffle permit if one runs tonight, and food-truck permits in the file — present, not assumed.', severity: 'high' },
    { id: 'allergy', label: 'Allergy signage is out', detail: 'Ingredients labeled on everything the stand sells, the nut-free option set apart and marked, and the stand crew briefed on what to say when a parent asks.', severity: 'high' },
    { id: 'shifts', label: 'Every shift has a name on it', detail: 'The 90-minute schedule is full, two floaters are held unassigned for no-shows, and each volunteer knows who takes over from them.', severity: 'high' },
    { id: 'gate', label: 'The gate is ready to move a line', detail: 'Wristbands sorted, the presale list printed, the float in the box, and whole-dollar prices on a sign families can read from ten feet.', severity: 'high' },
    { id: 'firstaid', label: 'First aid is staged and known', detail: 'The kit at the gate table, the school’s own kit and AED located, and the nearest phone to the office known to the crew.', severity: 'med' },
    { id: 'pickup', label: 'The pickup plan has an owner', detail: 'The collection spot, the doors in use, and the building sweep are assigned — close of night hands every child back to the right adult.', severity: 'med' },
    { id: 'sponsors', label: 'The sponsor banner is up and correct', detail: 'Hung where families pass it, every name checked against the sponsor list, and a photo taken for the thank-you notes.', severity: 'med' },
    { id: 'site', label: 'The site goes back better than found', detail: 'The cleanup kit staged, the custodian’s expectations known, and the final walk scheduled — next year’s approval is earned tonight.', severity: 'med' },
  ],

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Authored 2026-08-21 (W1.4) off the seasonal-demand study (Q3/Q4): PTA/booster school fundraisers were the strongest absent-type host demand after the Q4 hosting pair — a recurring, committee-run event class with a national institutional ecosystem and 4-6 month planning arcs, where free PDF kits cover the checklist but not the sequencing, readiness, or volunteer coordination. The duplicate-surface rule governs this file: it exists only because it is the small-committee, school-context variant of a fundraiser, not a gala re-skin. Everything distinct follows from four facts a gala never faces: the venue is a school (facility-use request with district lead time, custodial arrangement, district-required insurance, administrator sign-off on cash handling, and the no-alcohol default on school grounds), the crew is parent volunteers (sign-ups through the class lists, 90-minute shifts, background checks where districts require them — named as a check, never asserted), the money is school-governed (one treasurer — the same vocabulary as the Reunion committee content — two-person counts, and a deposit window set by school or PTA policy), and the crowd is mostly kids (pickup plan, lost-child point person, allergy-aware concessions with labeled ingredients). The raffle is decision-gated behind a permit check because many US states regulate raffles run by school groups as charitable gaming and the rules differ by state; the playbook names the check and never asserts the rule, since the app holds no jurisdiction data. Lead times are corpus-anchored: the 120-day runway sits between Reunion (75 days) and Conference (180 days) — nothing is contracted at gala scale, but the facility request is genuinely slow because district calendars are built around the school year; the conservative (earlier) figure was taken wherever a lead was uncertain, most notably the 60-day raffle-permit check. Concession quantities, margin characterizations, wristband and prize bands, and the float practice reflect widely-published US school-fundraising and concession norms stated as practice; no sources were fetched in this pass, so per the corroboration ratchet every price band stays synthesized and no row claims a cited cost. No fabricated sources.',
    sources: [],
  },
};

export default ptaBoosterFundraiser;
