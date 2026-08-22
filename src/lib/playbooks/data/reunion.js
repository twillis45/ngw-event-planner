// NGW Event Boss — Host Playbook: Reunion
// Big casual, outdoor-leaning gathering (family or class reunion).
// Synthesized from US norms; no fabricated citations (sources: [], verificationStatus: 'synthesized').
//
// ENRICHMENT 2026-08-21 (W1.3, template-line program spec): the original file
// covered only the LOCAL-PICNIC reunion. The travel-heavy, committee-run,
// cost-split, multi-day family reunion — the underserved host the audit named —
// now lives here too, as five GATED families: committee (planning-team),
// multi-day (reunion-span + the weekend agenda), travel/lodging (weekend tasks;
// the lodging DECISION itself stays the generic dest_lodging modifier so
// lodgingIntel keeps its one source of truth — this file deliberately authors
// no 'lodging'/'room_block' id, which would F10-suppress it), shared payments
// (cost-share), and photography/shirts (group-photo hired path, reunion-shirts).
// EVERY new task/purchase/agenda row is whenChoice-gated and every new decision
// defaults to the local-picnic answer, so a bare local single-day reunion's
// checklist, purchases, risks, and run-of-show are UNCHANGED (red-proved by
// before/after probe at authoring). Cost-share vocabulary matches the app's
// budget language ("chip in", "cost split" — budgetContext.js). Quantities and
// the shirt price band are synthesized — no fetched sources, no fabricated
// citations, per the corroboration ratchet.

const reunion = {
  type: 'Reunion',
  vegMain: 'Grilled veggie skewers + portobello burgers',
  solveFamily: 'reunion',
  family: 'host_driven',
  recordKind: 'client',
  version: '1.0.0',

  meta: {
    summary:
      'A big, casual, multi-household reunion — family or class — usually outdoors at a park pavilion or a backyard, running a long afternoon. Food is either a coordinated potluck (dishes assigned by household/last-name so you do not end up with ten potato salads) or a BBQ the host cooks or caters. The work that makes it feel handled: a clean headcount across households, name tags + a sign-in/contact-update sheet, a scheduled group photo with a named photographer, kids running between activities, enough shade and seating, a real bathroom plan, a rain plan, and trash that keeps up with a big crowd.',
    typicalGuests: { low: 30, default: 50, high: 80 },
    typicalDurationHours: 5,
    leadTimeDays: 75,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 12, high: 35, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The group photo — everyone in the frame, nobody missing for once.',
    'Two cousins who haven\'t spoken in years end up in conversation all afternoon.',
    'Someone brings the dish from the old recipe and it tastes exactly like it used to.',
    'The kids meet each other for the first time and disappear into the yard together.',
    'A story gets told that the younger generation has never heard — and should have.',
  ],

  decisions: [
    {
      id: 'food-model',
      label: 'How is food handled?',
      options: ['Potluck (assigned by household)', 'Host-cooked BBQ', 'BBQ catered / food truck'],
      default: 'Potluck (assigned by household)',
      when: 'T-60d',
      blocks: ['food-purchases', 'catering-vendor', 'potluck-signup'],
      weight: 'high',
      reversibility: 'costly',
      emotionalWeight: 'low',
      difmCapable: 'can-derive',
      priorityBasis: { rationale: 'The food model drives the entire shopping list and rental list and everything downstream stalls behind it, and once a catering deposit is paid it is costly to undo — but a coordinated potluck is a safe default the app can start from.', tier: 'reasoned' },
      why:
        'Potluck is the cheapest and most traditional for a big multi-household reunion, but it only works if dishes are assigned by category and household so the table is balanced and hot/cold/dessert all show up. Host-cooked BBQ gives you control but puts ~0.5 lb of protein per guest and all the grilling on you. Catering or a food truck buys back the day for ~$15-30/guest. Decide early because it drives the entire shopping list and the rental list.',
    },
    {
      id: 'potluck-coordination',
      label: 'If potluck — how do you assign dishes?',
      options: ['By category (apps/sides/mains/dessert/drinks)', 'By last-name letter', 'Free-for-all'],
      default: 'By category (apps/sides/mains/dessert/drinks)',
      when: 'T-45d',
      dependsOn: ['food-model'],
      // Coherence (audit F1): this ask only exists while the food IS a potluck —
      // a catered or host-cooked reunion must never be asked how to assign dishes.
      whenChoice: { id: 'food-model', in: ['Potluck (assigned by household)'] },
      blocks: ['potluck-signup'],
      weight: 'med',
      reversibility: 'reversible',
      emotionalWeight: 'low',
      difmCapable: 'can-derive',
      priorityBasis: { rationale: 'How dishes are assigned is what keeps the table balanced instead of four pasta salads and no hot entree, but it is a coordination method that adjusts freely and the by-category default is the safe, groundable choice.', tier: 'reasoned' },
      why:
        'A free-for-all is how you get four pasta salads and no hot entree. Assign categories on a shared sign-up (a simple sheet or SignUpGenius), or split by last-name letter (A-H mains, I-P sides, Q-Z dessert) so each household knows its lane. The host always covers the staples nobody volunteers for: ice, drinks, paper goods, and the grill protein if any.',
    },
    {
      id: 'venue-setting',
      label: 'Indoor or outdoor (and the weather call)?',
      options: ['Outdoor park pavilion', 'Backyard', 'Indoor hall / community room', 'Outdoor with indoor backup'],
      default: 'Outdoor park pavilion',
      when: 'T-60d',
      blocks: ['rain-plan', 'shade-rental', 'restroom-plan'],
      weight: 'high',
      reversibility: 'locked',
      emotionalWeight: 'low',
      difmCapable: 'needs-host',
      priorityBasis: { rationale: 'The venue makes weather the single biggest risk and drives shade, restrooms, and the rain plan, and popular pavilions book well ahead so a reserved date is effectively locked — securing a real space is something only the host can do.', tier: 'reasoned' },
      why:
        'Outdoor is the reunion default and the cheapest, but it makes weather your single biggest risk and forces decisions about shade, restrooms, and trash that an indoor hall solves for you. A reserved park pavilion (often $100-500/day) gives you a roof, tables, and usually grills and parking. If you go outdoor, you need a real rain plan committed by the week before — a backup indoor space or a tent on hold, not a hope.',
    },
    {
      id: 'group-photo',
      label: 'Group photo — who shoots it and when?',
      options: ['Assign a family member + set a time', 'Hire a photographer for 1 hour', 'Skip / candids only'],
      default: 'Assign a family member + set a time',
      when: 'T-14d',
      blocks: ['photo-slot'],
      weight: 'med',
      reversibility: 'reversible',
      emotionalWeight: 'high',
      difmCapable: 'can-derive',
      deliversHeartMoment: true,
      priorityBasis: { rationale: 'The whole-group photo is the one artifact people actually keep from a reunion, yet it is the thing most reunions forget to schedule and lose when the family drifts off — so putting a named shooter and a fixed time on the run-of-show is what protects the moment.', tier: 'reasoned' },
      why:
        'The one artifact people actually keep from a reunion is the whole-group photo, and it is the thing most reunions forget to schedule — so half the family has wandered off before anyone calls it. Pick a named person to shoot it and put it on the run-of-show at a fixed time (early-to-mid afternoon, before anyone leaves and while the light is good). A paid photographer for one hour is worth it for a milestone reunion.',
    },
    {
      id: 'kids-plan',
      label: 'What do the kids do?',
      options: ['Lawn games + open play', 'Hired entertainer / bounce house', 'No dedicated kids plan'],
      default: 'Lawn games + open play',
      when: 'T-30d',
      blocks: ['kids-purchases'],
      weight: 'low',
      reversibility: 'reversible',
      emotionalWeight: 'low',
      difmCapable: 'can-derive',
      priorityBasis: { rationale: 'Unoccupied kids become every parent\'s problem at once, but a bin of lawn games and open grass covers most of it cheaply and swaps easily — a low-stakes call with a safe default.', tier: 'reasoned' },
      why:
        'A reunion is all-ages and multi-household, so unoccupied kids become every parent’s problem at once. A bin of lawn games (cornhole, frisbee, bubbles, a few balls) and an open grassy area covers most of it cheaply. A bounce house or hired entertainer is a splurge that buys the adults a calm hour.',
    },
    {
      id: 'planning-team',
      label: 'Who is planning this — just you, or a committee?',
      options: ['Just me', 'A cousins committee (3-6 people)'],
      default: 'Just me',
      when: 'T-75d',
      blocks: ['committee-lanes'],
      weight: 'med',
      reversibility: 'reversible',
      emotionalWeight: 'med',
      difmCapable: 'needs-host',
      priorityBasis: { rationale: 'A multi-household reunion is too much work and too much family politics for one person past a few households, but only the host knows whether there are relatives willing to own a lane — and a solo host with a small local crowd is a perfectly safe default.', tier: 'reasoned' },
      why:
        'Past a few households, a reunion is a committee-sized job: food, where everyone stays, the program, and the money each want an owner, and a shared load is also how the family politics stay manageable — nobody argues with a plan four branches built together. One relative per branch of the family, three to six people total, works well. Solo is fine for a smaller local crowd; the app assumes solo until you say otherwise.',
    },
    {
      id: 'reunion-span',
      label: 'One day, or a full reunion weekend?',
      options: ['One day', 'A full weekend (2-3 days)'],
      default: 'One day',
      when: 'T-75d',
      blocks: ['weekend-program', 'stay-plan'],
      weight: 'high',
      reversibility: 'costly',
      emotionalWeight: 'med',
      difmCapable: 'needs-host',
      priorityBasis: { rationale: 'The span decides the venue days, whether anyone needs a bed, and how much program there is to plan — everything travel-shaped hangs off it, and once out-of-town family books flights around a weekend it is effectively locked. Only the host knows how far the family is coming.', tier: 'reasoned' },
      why:
        'When family flies or drives in from out of town, a single afternoon is not worth the trip — the common shape is a weekend: an easy arrival evening, the big reunion day, and a goodbye breakfast before everyone hits the road. A weekend changes almost everything downstream: the venue is needed across days, people need beds, arrivals need collecting, and each day wants its own simple plan. Set the end date on the event too, so the day-by-day tools know the real span.',
    },
    {
      id: 'cost-share',
      label: 'How are the costs covered?',
      options: ['I cover it as the host', 'Each family chips in a set amount', 'Everyone pays their own way'],
      default: 'I cover it as the host',
      when: 'T-56d',
      blocks: ['cost-collection'],
      weight: 'med',
      reversibility: 'reversible',
      emotionalWeight: 'med',
      difmCapable: 'needs-host',
      priorityBasis: { rationale: 'Money is the fastest way a reunion turns sour, and the fix is structural, not personal: a stated amount, a real deadline, and one treasurer. But whether the family chips in at all is a family-culture call only the host can make.', tier: 'reasoned' },
      why:
        'A potluck covers the food, but the pavilion, the meat, the shirts, and the paper goods still cost real money — and at reunion scale most families split it with a set chip-in per household, announced with the invitation so nobody is surprised. Whatever the model, the rule that keeps the peace is the same: one treasurer touches the money, the amount and what it covers are stated plainly, and the ledger is visible to anyone who asks.',
    },
    {
      id: 'reunion-shirts',
      label: 'Matching reunion T-shirts this year?',
      options: ['Yes — matching shirts', 'No shirts this year'],
      default: 'No shirts this year',
      when: 'T-45d',
      blocks: ['shirt-order'],
      weight: 'low',
      reversibility: 'costly',
      emotionalWeight: 'med',
      difmCapable: 'needs-host',
      priorityBasis: { rationale: 'Shirts are the reunion signature and the group photo is better for them, but they carry the longest hard deadline on the list — sizes collected by household, then one bulk order weeks ahead that cannot be topped up in time. A no costs nothing; a late yes fails.', tier: 'reasoned' },
      why:
        'The matching shirt is a reunion signature — it makes the group photo, doubles as the year\'s keepsake, and marks who belongs to the family at a public park. The catch is lead time: sizes have to come in by household with the RSVPs, and bulk printers need two to three weeks, so the order goes in about a month out and a reorder never arrives in time. Skipping shirts is a fine call; deciding late is the only wrong one.',
    },
  ],

  milestones: [
    {
      id: 'set-date-venue',
      name: 'Lock date and venue / pavilion',
      offsetDays: 75,
      owner: 'host',
      category: 'planning',
      risk: { ifDelayed: 'Popular pavilions and good-weather weekends book out months ahead; a late start narrows you to leftover dates.', severity: 'high' },
    },
    {
      id: 'build-guest-list',
      name: 'Build the household guest list and contacts',
      offsetDays: 70,
      owner: 'host',
      dependsOn: ['set-date-venue'],
      category: 'planning',
      risk: { ifDelayed: 'Missing households means an inaccurate headcount and people who feel forgotten.', severity: 'medium' },
    },
    {
      id: 'send-save-the-dates',
      name: 'Send save-the-dates / invitations',
      offsetDays: 56,
      owner: 'host',
      dependsOn: ['build-guest-list'],
      category: 'comms',
      risk: { ifDelayed: 'People commit to other summer plans; out-of-town family can’t arrange travel.', severity: 'high' },
    },
    {
      id: 'choose-food-model',
      name: 'Confirm food model (potluck vs BBQ vs catered)',
      offsetDays: 55,
      owner: 'host',
      dependsOn: ['send-save-the-dates'],
      category: 'food',
      risk: { ifDelayed: 'Everything downstream — shopping, rentals, catering deposits — stalls behind this one call.', severity: 'high' },
    },
    {
      id: 'open-potluck-signup',
      name: 'Open the potluck sign-up (by category / household)',
      offsetDays: 42,
      owner: 'host',
      dependsOn: ['choose-food-model'],
      category: 'food',
      risk: { ifDelayed: 'Late sign-up means duplicate dishes and gaps in the menu.', severity: 'medium' },
    },
    {
      id: 'book-vendors',
      name: 'Book caterer / rentals / any entertainment',
      offsetDays: 40,
      owner: 'host',
      dependsOn: ['choose-food-model'],
      category: 'vendor',
      risk: { ifDelayed: 'Summer caterers, tent rentals, and bounce houses sell out their weekends.', severity: 'medium' },
    },
    {
      id: 'collect-rsvps',
      name: 'Collect RSVPs and lock a headcount',
      offsetDays: 21,
      owner: 'host',
      dependsOn: ['send-save-the-dates'],
      category: 'planning',
      risk: { ifDelayed: 'No firm headcount = guessing on food, ice, seating, and rentals.', severity: 'high' },
    },
    {
      id: 'finalize-runofshow',
      name: 'Finalize run-of-show (photo time, meal time, games)',
      offsetDays: 14,
      owner: 'host',
      dependsOn: ['collect-rsvps'],
      category: 'planning',
      risk: { ifDelayed: 'The group photo and meal drift; volunteers don’t know their jobs.', severity: 'medium' },
    },
    {
      id: 'confirm-weather-plan',
      name: 'Confirm weather/rain plan and shade',
      offsetDays: 7,
      owner: 'host',
      dependsOn: ['finalize-runofshow'],
      category: 'logistics',
      risk: { ifDelayed: 'A surprise forecast with no backup turns the whole day into a scramble.', severity: 'high' },
    },
    {
      id: 'shop-nonperishables',
      name: 'Buy non-perishables, paper goods, supplies',
      offsetDays: 3,
      owner: 'host',
      dependsOn: ['collect-rsvps'],
      category: 'food',
      risk: { ifDelayed: 'Last-day-only shopping risks stockouts on bulk drinks and paper goods.', severity: 'low' },
    },
    {
      id: 'shop-perishables-ice',
      name: 'Buy perishables, protein, and ice',
      offsetDays: 1,
      owner: 'host',
      dependsOn: ['shop-nonperishables'],
      category: 'food',
      risk: { ifDelayed: 'Ice and fresh protein must be day-before/day-of; too early and it’s warm or spoiled.', severity: 'medium' },
    },
    {
      id: 'setup-day',
      name: 'Setup: tables, shade, drinks, name tags, trash',
      offsetDays: 0,
      owner: 'host',
      dependsOn: ['shop-perishables-ice', 'confirm-weather-plan'],
      category: 'logistics',
      risk: { ifDelayed: 'Late setup means guests arriving to a half-built site and a stressed host.', severity: 'medium' },
    },

    // ── AFTER THE DAY ────────────────────────────────────────────────────────
    // NEGATIVE offsetDays = days AFTER the reunion. The engine computes dueDate
    // as eventDate + (-offsetDays), so no engine change is needed.
    //
    // A reunion has more tail than any other gathering in the corpus, because
    // it is the one event whose whole point was the people. Four things are
    // real work after everyone drives home: the group photo everyone is already
    // asking for; the borrowed and rented things; the money between households;
    // and the roster — addresses, phone numbers, and who is carrying the next
    // one — all of which are accurate this week and stale by Christmas.
    {
      id: 'share-group-photo',
      name: 'Get the group photo out to every household',
      offsetDays: -3,
      owner: 'host',
      dependsOn: ['setup-day'],
      category: 'photo',
      risk: { ifDelayed: 'This is the one thing everyone is waiting for; a photo that lands three months late gets looked at once instead of framed.', severity: 'medium' },
    },
    {
      id: 'return-borrowed',
      name: 'Return the borrowed and rented things',
      offsetDays: -2,
      owner: 'host',
      dependsOn: ['setup-day'],
      category: 'logistics',
      risk: { ifDelayed: 'Rental companies bill late days as full days, and a cousin\'s canopy that lives in your garage until Thanksgiving gets remembered.', severity: 'medium' },
    },
    {
      id: 'settle-shared-cost',
      name: 'Total the real cost and settle up between households',
      offsetDays: -7,
      owner: 'host',
      dependsOn: ['setup-day'],
      category: 'budget',
      risk: { ifDelayed: 'Whoever fronted the pavilion fee and the meat is quietly out several hundred dollars, and family money left unsettled is how a committee loses volunteers.', severity: 'high' },
    },
    {
      id: 'carry-the-next-one',
      name: 'Update the family contact list and name who carries the next reunion',
      offsetDays: -14,
      owner: 'host',
      dependsOn: ['setup-day'],
      category: 'planning',
      risk: { ifDelayed: 'Enthusiasm is highest in the two weeks after; ask in March and the next reunion has no date, no committee, and no one who feels responsible.', severity: 'medium' },
    },
  ],

  tasks: [
    { id: 't-venue-call', milestoneId: 'set-date-venue', phase: 'planning', label: 'Call the park / reserve the pavilion and confirm what it includes (tables, grills, power, parking)', when: 'T-75d' },
    { id: 't-permit-check', milestoneId: 'set-date-venue', phase: 'planning', label: 'Check whether a reservation permit, alcohol rule, or amplified-sound rule applies', when: 'T-72d' },
    { id: 't-list-households', milestoneId: 'build-guest-list', phase: 'planning', label: 'List every household and a contact for each; flag out-of-town travelers', when: 'T-70d' },
    { id: 't-recruit-volunteers', milestoneId: 'build-guest-list', phase: 'planning', label: 'Recruit 3-5 volunteers (setup, grill, registration table, kids, cleanup)', when: 'T-66d' },
    { id: 't-send-invite', milestoneId: 'send-save-the-dates', phase: 'planning', label: 'Send save-the-date / invite with date, place, time, and what to bring', when: 'T-56d' },
    { id: 't-decide-food', milestoneId: 'choose-food-model', phase: 'planning', label: 'Decide potluck vs host-cooked BBQ vs catered and tell guests', when: 'T-55d' },
    { id: 't-signup-categories', milestoneId: 'open-potluck-signup', phase: 'planning', label: 'Set up the dish sign-up by category (or last-name letter) and share the link', when: 'T-42d', whenChoice: { id: 'food-model', in: ['Potluck (assigned by household)'] } },
    { id: 't-host-staples', milestoneId: 'open-potluck-signup', phase: 'planning', label: 'Claim the host staples nobody signs up for: ice, drinks, paper goods, condiments', when: 'T-40d', whenChoice: { id: 'food-model', in: ['Potluck (assigned by household)'] } },
    { id: 't-book-catering', milestoneId: 'book-vendors', phase: 'planning', label: 'If catering/food truck: book and pay deposit, confirm headcount window', when: 'T-40d' },
    { id: 't-book-rentals', milestoneId: 'book-vendors', phase: 'planning', label: 'Reserve any tents, extra tables/chairs, or a bounce house', when: 'T-38d' },
    { id: 't-restroom-plan', milestoneId: 'book-vendors', phase: 'planning', label: 'Confirm restrooms — park facilities or order a portable unit for a remote site', when: 'T-36d' },
    { id: 't-chase-rsvps', milestoneId: 'collect-rsvps', phase: 'planning', label: 'Chase non-responders by household; lock an adult/kid headcount', when: 'T-21d' },
    { id: 't-photographer', milestoneId: 'finalize-runofshow', phase: 'planning', label: 'Name the group-photo shooter and put the photo on the schedule at a fixed time', when: 'T-14d' },
    { id: 't-runofshow', milestoneId: 'finalize-runofshow', phase: 'planning', label: 'Write the run-of-show: arrival, photo, meal, games, cleanup — assign each to a volunteer', when: 'T-13d' },
    { id: 't-nametags', milestoneId: 'finalize-runofshow', phase: 'planning', label: 'Prep name tags, markers, and a sign-in / contact-update sheet for the registration table', when: 'T-12d' },
    { id: 't-weather-check', milestoneId: 'confirm-weather-plan', phase: 'planning', label: 'Check the 7-day forecast; confirm the rain backup (indoor space or tent on hold)', when: 'T-7d', whenChoice: { id: 'venue-setting', in: ['Outdoor park pavilion', 'Backyard', 'Outdoor with indoor backup'] } },
    { id: 't-shop-dry', milestoneId: 'shop-nonperishables', phase: 'purchasing', label: 'Buy drinks, water, paper goods, trash bags, sunscreen, bug spray, games', when: 'T-3d' },
    { id: 't-shop-fresh', milestoneId: 'shop-perishables-ice', phase: 'purchasing', label: 'Buy protein, perishables, and ice (day before or morning of)', when: 'T-1d' },
    { id: 't-load-coolers', milestoneId: 'setup-day', phase: 'setup', label: 'Ice the coolers, set up drink stations, light the grill', when: 'T0' },
    { id: 't-set-tables', milestoneId: 'setup-day', phase: 'setup', label: 'Set tables, shade canopies, seating; stage the food/serving table', when: 'T0' },
    { id: 't-reg-table', milestoneId: 'setup-day', phase: 'setup', label: 'Set up the registration table: name tags, sign-in sheet, marker', when: 'T0' },
    { id: 't-trash-stations', milestoneId: 'setup-day', phase: 'setup', label: 'Place trash + recycling bins at multiple points with spare bags', when: 'T0' },
    { id: 't-call-photo', milestoneId: 'setup-day', phase: 'execution', label: 'At the set time, call everyone in for the group photo before anyone leaves', when: 'T0' },
    { id: 't-cleanup-sweep', milestoneId: 'setup-day', phase: 'cleanup', label: 'Bag trash, collect rentals/coolers, walk the site for left items and litter', when: 'T0+5h' },

    // ── W1.3 enrichment — every row below is whenChoice-gated so the bare
    // local single-day reunion's checklist is byte-identical to before. ──

    // COMMITTEE (planning-team → 'A cousins committee (3-6 people)')
    { id: 't-committee-recruit', milestoneId: 'set-date-venue', phase: 'planning', label: 'Ask one relative from each branch of the family to join the reunion committee — three to six people is the sweet spot', when: 'T-74d', whenChoice: { id: 'planning-team', in: ['A cousins committee (3-6 people)'] } },
    { id: 't-committee-lanes', milestoneId: 'build-guest-list', phase: 'planning', label: 'Split the committee into lanes — food, where everyone stays, the program, and the money — with one named owner per lane', when: 'T-70d', whenChoice: { id: 'planning-team', in: ['A cousins committee (3-6 people)'] } },
    { id: 't-committee-cadence', milestoneId: 'build-guest-list', phase: 'planning', label: 'Set a short committee check-in call every other week and a group thread for everything in between', when: 'T-68d', whenChoice: { id: 'planning-team', in: ['A cousins committee (3-6 people)'] } },
    { id: 't-committee-money', milestoneId: 'build-guest-list', phase: 'planning', label: 'Agree the money rule up front: one treasurer handles every dollar in and out, keeps the ledger, and shares the running total with the whole committee', when: 'T-66d', whenChoice: { id: 'planning-team', in: ['A cousins committee (3-6 people)'] } },

    // MULTI-DAY + TRAVEL/LODGING (reunion-span → 'A full weekend (2-3 days)').
    // The lodging DECISION is the generic dest_lodging modifier (room block /
    // guaranteed block / self-book / host-arranged rental) — these tasks are the
    // reunion-shaped work around it, including the family-hosted spread the
    // generic options don't cover.
    { id: 't-weekend-venue', milestoneId: 'set-date-venue', phase: 'planning', label: 'Confirm a gathering spot for every day — the main-day pavilion, plus somewhere easy for the arrival evening and the goodbye morning', when: 'T-70d', whenChoice: { id: 'reunion-span', in: ['A full weekend (2-3 days)'] } },
    { id: 't-weekend-arc', milestoneId: 'book-vendors', phase: 'planning', label: 'Sketch the weekend arc — an easy arrival evening, the big reunion day, and a goodbye breakfast before everyone hits the road', when: 'T-40d', whenChoice: { id: 'reunion-span', in: ['A full weekend (2-3 days)'] } },
    { id: 't-family-host-map', milestoneId: 'book-vendors', phase: 'planning', label: 'Map who is hosting whom — guest rooms and air mattresses claimed by name before anyone lands, with the overflow pointed at the group hotel options', when: 'T-30d', whenChoice: { id: 'reunion-span', in: ['A full weekend (2-3 days)'] } },
    { id: 't-arrival-windows', milestoneId: 'collect-rsvps', phase: 'planning', label: 'Collect each household\'s arrival window — who gets in the night before, who lands the morning of the big day', when: 'T-21d', whenChoice: { id: 'reunion-span', in: ['A full weekend (2-3 days)'] } },
    { id: 't-airport-runs', milestoneId: 'collect-rsvps', phase: 'planning', label: 'Match every non-driver to a ride — who picks up whom, with phone numbers swapped before travel day', when: 'T-14d', whenChoice: { id: 'reunion-span', in: ['A full weekend (2-3 days)'] }, whenMode: { not: ['drive'] } },
    { id: 't-perday-ros', milestoneId: 'finalize-runofshow', phase: 'planning', label: 'Write a run-of-show for each day — even the easy arrival evening gets a where-and-when, so nobody is calling around for the plan', when: 'T-13d', whenChoice: { id: 'reunion-span', in: ['A full weekend (2-3 days)'] } },
    { id: 't-memory-moment', milestoneId: 'finalize-runofshow', phase: 'planning', label: 'Plan the main day\'s memory moment — an elder walks the family tree, a word for those lost this year — kept simple and open to everyone', when: 'T-12d', whenChoice: { id: 'reunion-span', in: ['A full weekend (2-3 days)'] } },

    // SHARED PAYMENTS (cost-share → 'Each family chips in a set amount')
    { id: 't-costshare-amount', milestoneId: 'send-save-the-dates', phase: 'planning', label: 'Set the per-family amount and say plainly what it covers — the pavilion, the meat, shirts, paper goods — in the invitation itself', when: 'T-56d', whenChoice: { id: 'cost-share', in: ['Each family chips in a set amount'] } },
    { id: 't-costshare-deadline', milestoneId: 'collect-rsvps', phase: 'planning', label: 'Give the chip-in a real deadline about three weeks out, and send one kind reminder to the households that miss it', when: 'T-21d', whenChoice: { id: 'cost-share', in: ['Each family chips in a set amount'] } },
    { id: 't-costshare-ledger', milestoneId: 'finalize-runofshow', phase: 'planning', label: 'Keep the treasurer\'s ledger current — every household\'s payment in, every receipt out, visible to anyone who asks', when: 'T-14d', whenChoice: { id: 'cost-share', in: ['Each family chips in a set amount'] } },
    { id: 't-costshare-settle', milestoneId: 'setup-day', phase: 'cleanup', label: 'Settle up within the week — the treasurer reimburses everyone who fronted receipts, then shares the final tally with the family', when: 'T0+1d', whenChoice: { id: 'cost-share', in: ['Each family chips in a set amount'] } },

    // PHOTOGRAPHY (group-photo → 'Hire a photographer for 1 hour')
    { id: 't-book-photographer', milestoneId: 'book-vendors', phase: 'planning', label: 'Book the photographer for a one-hour window that covers the group photo and the start of the meal', when: 'T-21d', whenChoice: { id: 'group-photo', in: ['Hire a photographer for 1 hour'] } },
    { id: 't-shot-list', milestoneId: 'finalize-runofshow', phase: 'planning', label: 'Send the photographer the shot list — the whole group, each family branch, the elders, the four-generations frame', when: 'T-7d', whenChoice: { id: 'group-photo', in: ['Hire a photographer for 1 hour'] } },

    // SHIRTS (reunion-shirts → 'Yes — matching shirts')
    { id: 't-shirt-sizes', milestoneId: 'send-save-the-dates', phase: 'planning', label: 'Collect shirt sizes by household as RSVPs come in — adult and kid counts per size', when: 'T-42d', whenChoice: { id: 'reunion-shirts', in: ['Yes — matching shirts'] } },
    { id: 't-shirt-order', milestoneId: 'book-vendors', phase: 'planning', label: 'Place the shirt order — bulk printers need two to three weeks, and a reorder never arrives in time', when: 'T-28d', whenChoice: { id: 'reunion-shirts', in: ['Yes — matching shirts'] } },
    { id: 't-shirt-handout', milestoneId: 'setup-day', phase: 'setup', label: 'Hand out shirts at the registration table, checked off by household', when: 'T0', whenChoice: { id: 'reunion-shirts', in: ['Yes — matching shirts'] } },

    // ── AFTER THE DAY — negative-offset milestones, see the block above ──
    { id: 't-photo-send', milestoneId: 'share-group-photo', phase: 'photo', label: 'Send the full-resolution group photo to one contact in every household — the file itself, not a link that expires, because half the family will want it printed', when: 'T0 +3d' },
    { id: 't-photo-album', milestoneId: 'share-group-photo', phase: 'photo', label: 'Open one shared album and ask everyone to drop their phone photos in this week, while the day is still on the camera roll', when: 'T0 +3d' },
    { id: 't-photo-mail', milestoneId: 'share-group-photo', phase: 'photo', label: 'Print the group photo for the elders and anyone who does not use a phone for pictures, and mail it', when: 'T0 +3d' },
    { id: 't-return-rentals', milestoneId: 'return-borrowed', phase: 'cleanup', label: 'Return the tents, tables, chairs, and any bounce house by the time on the rental contract — late days bill as full days', when: 'T0 +2d' },
    { id: 't-return-family', milestoneId: 'return-borrowed', phase: 'cleanup', label: 'Get every borrowed cooler, canopy, roaster, and folding chair back to the household it came from, matched against the list you made loading in', when: 'T0 +2d' },
    { id: 't-settle-receipts', milestoneId: 'settle-shared-cost', phase: 'budget', label: 'Collect every receipt — pavilion fee, meat, ice, paper goods, shirts, rentals — and total what the day actually cost against what came in', when: 'T0 +7d' },
    { id: 't-settle-reimburse', milestoneId: 'settle-shared-cost', phase: 'budget', label: 'Pay back everyone who fronted money, by name and in full, before anyone has to ask', when: 'T0 +7d' },
    { id: 't-settle-share', milestoneId: 'settle-shared-cost', phase: 'budget', label: 'Send the family the plain final tally — what came in, what went out, and what is left in the pot for next time', when: 'T0 +7d' },
    { id: 't-update-roster', milestoneId: 'carry-the-next-one', phase: 'guest', label: 'Type the sign-in sheet into the family contact list while the handwriting is fresh — new addresses, new phone numbers, new babies, and who moved', when: 'T0 +14d' },
    { id: 't-next-date', milestoneId: 'carry-the-next-one', phase: 'planning', label: 'Ask the family for the next reunion year and month now, while everyone is still saying "we should do this more often"', when: 'T0 +14d' },
    { id: 't-next-committee', milestoneId: 'carry-the-next-one', phase: 'planning', label: 'Name who is carrying the next one — a host or a committee, out loud and in writing — so it is not one person\'s job by default again', when: 'T0 +14d' },
  ],

  purchases: [
    { id: 'p_protein', item: 'Burgers, hot dogs & chicken', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Costco', 'Sam’s Club', 'grocery'], unitCostRange: [3.5, 7], essential: true, buyAt: 'T-1d', note: 'Only if host-cooked BBQ; ~0.5 lb/guest raw weight. Skip for full potluck or catered.', provenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['webstaurant-protein-2026'], note: 'Grounded to webstaurant-protein-2026: ~0.5 lb raw protein/guest is the source-stated cookout one-main portion.', claim: '~0.5 lb of raw protein per adult guest is the standard US cookout planning figure for a BBQ', sufficientWhen: 'US grilling and cookout planning guides from ≥2 sources confirm the ~0.5 lb/guest raw protein norm' } , alternatives: ['Costco rotisserie chickens — budget pickup option', 'Turkey burgers — leaner swap, same grill time', 'Hot dogs only — cheapest option for a tight reunion budget'], costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['costco-groundbeef-2026', 'chicken-retail-2026', 'costco-chicken-2026', 'usda-meat-2026'], lastVerified: '2026-08-18', claim: 'A SUM of separately-priced proteins, not one quoted item. Ground beef $3.29/lb in Costco bulk against $5.86-7.66/lb at grocery and a USDA all-fresh beef average of $9.64/lb; chicken $1-2.50/lb at Costco and $3-5/lb at grocery, with bone-in thighs $1.50-3.00; hot dogs and links price below ground beef per pound. The band\'s floor is warehouse chicken and its ceiling is grocery ground beef, which is exactly the mix this row buys.', sufficientWhen: 'Current per-pound prices for ground beef, hot dogs and chicken at one warehouse club and one grocery store confirm both ends of the band.' }, },
    { id: 'p_buns', item: 'Buns / rolls', category: 'food', qtyPerGuest: 1.5, unit: 'count', where: ['Costco', 'grocery'], unitCostRange: [0.3, 0.6], essential: false, buyAt: 'T-1d' , alternatives: ['Sliced white bread — cheaper standby', 'Tortillas — versatile, cheaper per serving'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['buns-kroger-2026', 'buns-walmart-2026'], lastVerified: '2026-08-18', claim: 'Buns 2026, priced per bun from 8-count packs. Kroger: Private Selection sweet Hawaiian hot dog buns $3.99/8ct (about $0.50 each on promotion, $0.69 undiscounted); CARBmaster hamburger buns $3.99/8ct; Artesano potato hot dog buns $3.99/8ct. Walmart: Loves hamburger buns $4.64/8ct (about $0.58 each). Plain white buns sit at the floor of this range; brioche, Hawaiian and potato styles price above it.', sufficientWhen: 'One current 8-count bun-pack price at each of two retailers, divided per bun, confirms the band.' }, },
    { id: 'p_condiments', item: 'Condiments + serving staples (ketchup, mustard, etc.)', category: 'food', qtyFlat: 1, unit: 'set', where: ['Costco', 'grocery'], unitCostRange: [25, 45], essential: true, buyAt: 'T-3d', note: 'Host covers these regardless of food model.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['condiments-retail-2026', 'cheese-sliced-2026', 'bls-saladveg-2026'], lastVerified: '2026-08-18', claim: 'A SUM of separately-priced components. CONDIMENTS: ketchup $1.13-2.48, mustard $0.77, mayo $2.34-3.64 - roughly $4-7 for the set. CHEESE: block $3.58-3.78/lb, slices $4.86/lb, deli-cut $5.99/lb. PRODUCE: romaine $3.560/lb and tomatoes $2.154/lb per BLS. Summed at party quantities that brackets this band; pickles and sauces are the smaller unsourced share.', sufficientWhen: 'Shelf prices for the condiment set, sliced cheese and salad produce at party quantity, summed, confirm the band.' }, },
    { id: 'p_soda-water', item: 'Soda + bottled water', category: 'beverage', qtyPerGuest: 3, unit: 'count', where: ['Costco', 'Sam’s Club', 'grocery'], unitCostRange: [0.4, 0.9], essential: true, buyAt: 'T-3d', note: '~3-4 drinks/guest over a long afternoon; mostly soda/water. Water ~1.5/guest of this.', provenance: { tier: 'norm', confidence: 'medium', verificationStatus: 'synthesized', note: '2 drinks first hour + 1/hour after is a standard beverage-planning rule.', claim: '~2 drinks in the first hour then ~1/hour after is the standard US beverage-planning rule, yielding ~3-4 drinks/guest over a 5-hour outdoor reunion', sufficientWhen: 'US beverage-planning guides from ≥2 sources confirm the 2-then-1/hr consumption model for outdoor daytime events' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['soda-12pack-2026', 'bottledwater-case-2026'], lastVerified: '2026-08-16', claim: 'A 12-pack of soda runs $3.00-6.50 (about $0.25-0.60 a can) and a 24-pack of 16.9oz bottled water runs $4-7 on sale or $6-9 at everyday pricing, which is roughly $0.17-0.38 a bottle.', sufficientWhen: 'Current shelf prices for one 12-pack of soda and one 24-pack of water at a national grocer confirm the per-serving range.' } },
    { id: 'p_beer-wine', item: 'Beer / wine (where allowed)', category: 'beverage', qtyPerGuest: 1, unit: 'count', where: ['Costco', 'grocery', 'liquor store'], unitCostRange: [1.2, 3], essential: false, buyAt: 'T-3d', note: 'Only some guests drink alcohol; check the park’s alcohol policy first.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['beer-retail-2026', 'beer-budget-2026', 'wine-retail-2026', 'wine-statewide-2026'], lastVerified: '2026-08-16', claim: 'This band is a SUM of separately-priced drink families, not a single quoted item: domestic lager $0.80-1.20 per 12oz (about $20-22 a 24-pack), craft $1.50-3.00; everyday table wine $8-15 a bottle, mid-range $15-30. Each component is cited to its own registered source; the summed band is therefore low-confidence by construction.', sufficientWhen: 'Current shelf prices for one pack of each named component at the same store, summed to the per-serving band, confirm the range.' } },
    { id: 'p_ice', item: 'Ice', category: 'beverage', qtyPerGuest: 2, unit: 'lb', where: ['gas station', 'grocery', 'Costco'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: '~2 lb/guest outdoors (drink-chilling + melt buffer); buy morning-of so it doesn’t melt.', provenance: { tier: 'norm', confidence: 'medium', verificationStatus: 'synthesized', note: 'Outdoor/warm-weather ice planning is ~1.75-2.25 lb/guest.', claim: 'Outdoor warm-weather gatherings require ~1.75-2.25 lb of ice per guest to keep drinks cold and account for melt', sufficientWhen: 'US outdoor event planning guides from ≥2 sources confirm the ~2 lb/guest ice estimate for warm-weather gatherings' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['ice-retail-2026', 'ice-warehouse-2026'], lastVerified: '2026-08-16', claim: 'Bagged ice 2026: warehouse clubs run 10-12c per pound (a 20lb bag is $1.75-2.50 at Sams Club, $1.80-2.50 at Costco); grocery and gas-station bags cluster 23-31c/lb (BJs and 7-Eleven 20lb about $4.49-4.79, Giant 20lb $4.99, Publix 16lb $4.99); small bags and hardware stores reach 41-45c/lb. Convenience ice is more than four times warehouse ice per pound.', sufficientWhen: 'Current shelf prices for one 20lb bag at a warehouse club and one at a grocery store confirm the per-pound spread.' } },
    { id: 'p_paper', item: 'Plates, cups, napkins, utensils', category: 'cleanup', qtyPerGuest: 3, unit: 'set', where: ['Costco', 'dollar store', 'grocery'], unitCostRange: [0.25, 2.5], essential: true, buyAt: 'T-3d', note: '~3 of each per guest accounts for refills over a long event.' , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['disposables-bulk-2026', 'disposables-partyqty-2026'], lastVerified: '2026-08-15', claim: 'A per-guest place setting runs $0.25-2.50 depending entirely on channel: bulk restaurant supply puts plates at $0.08-0.15 each and foam at $0.09, a grocery shelf puts the same basic paper plate at $0.25-0.40, and premium plastic or compostable runs $0.15-0.35 per plate. A setting is 2-3 plates, 2-3 cups, cutlery and 2-3 napkins.', sufficientWhen: 'Re-checked against per-plate pricing and place-setting norms. A deep bulk buy lands near the floor and premium or compostable near the ceiling - the 12x spread is the CHANNEL, not uncertainty. Add 10-15% for spills and unexpected guests. Sets that bundle flutes, koozies, linens or table covers are a different product and are priced separately.' } },
    { id: 'p_trashbags', item: 'Heavy-duty trash + recycling bags', category: 'cleanup', qtyFlat: 1, qtyPer: 'per 12 guests', unit: 'bag', where: ['grocery', 'hardware'], unitCostRange: [0.3, 0.6], essential: true, buyAt: 'T-3d', note: 'A big crowd outgrows park bins fast; bring your own and stage spares.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['costco-cleaning-2026', 'trashbags-retail-2026'], lastVerified: '2026-08-16', claim: 'Cleanup supplies at warehouse pricing: 13-gallon trash bags about 10 cents each (200 for $20.42), paper towels about $1.97 a roll, dish soap with two refills $14.74, 24 sponges $12.47; the same bags run 11-15 cents each at grocery and big-box.', sufficientWhen: 'Current shelf prices for trash bags and paper towels at one warehouse club and one grocery store confirm the per-unit figures.' } },
    { id: 'p_nametags', item: 'Name tags + markers', category: 'logistics', qtyPerGuest: 1, unit: 'count', where: ['office store', 'dollar store', 'Amazon'], unitCostRange: [0.05, 0.15], essential: true, buyAt: 'T-3d', note: 'Multi-household crowd — name tags make introductions actually happen.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['namebadges-adhesive-2026', 'meetingsupplies-target-2026'], lastVerified: '2026-08-18', claim: 'Name tags per tag, at the BULK box that a reunion buys. A 400-count box of adhesive badges is $42.99 direct from the manufacturer ($0.107 each) and $57.19 at an office e-tailer ($0.143). The smaller 160-count boxes are dearer per badge at $0.156-0.187, so the 400-count is what keeps this row inside its band. Markers divide across the whole roster.', sufficientWhen: 'A 400-count badge box divided per badge confirms the band; a 160-count box would exceed it.' }, },
    { id: 'p_signin', item: 'Sign-in / contact-update sheet + clipboard', category: 'logistics', qtyFlat: 1, unit: 'set', where: ['office store', 'Amazon'], unitCostRange: [5, 12], essential: true, buyAt: 'T-3d', note: 'Captures updated addresses/emails for the next reunion.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['playingcards-bulk-2026', 'meetingsupplies-quill-2026', 'print-booklets-2026'], lastVerified: '2026-08-18', claim: 'A sign-in set. A bulk clipboard is $3.00 each at a 12-unit minimum and $4.69 at an 8+ tier; the sheet itself prints with the document tier and a pen is $0.10-0.19. One clipboard with sheets and a pen lands in this band; the clipboard is effectively the whole cost.', sufficientWhen: 'A bulk clipboard price plus printing for the roster confirms the band.' }, },
    { id: 'p_sunblock', item: 'Sunscreen + bug spray (shared)', category: 'logistics', qtyFlat: 2, unit: 'count', where: ['grocery', 'pharmacy'], unitCostRange: [6, 12], essential: false, buyAt: 'T-3d', note: 'Outdoor all-ages crowd; someone always forgets theirs.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['outdoor-protect-2026', 'firstaid-retail-2026'], lastVerified: '2026-08-18', claim: 'Sun and insect protection, priced per component. Coppertone Complete SPF 50 spray 5.5oz $5.74, with premium and multipack sunscreen running $17.95 and above; Cutter citronella candles $7.99-9.99; PIC citronella wrist bands 6-pack $4.79; a combined repellent-and-sunscreen (Avon Bug Guard Plus) $18.99. A basic sunscreen plus a repellent lands at the floor of this band and a premium pair at its ceiling.', sufficientWhen: 'One sunscreen and one repellent shelf price at the same store confirm the band.' }, },
    { id: 'p_games', item: 'Lawn games + kids supplies (cornhole, bubbles, balls)', category: 'decor', qtyFlat: 1, unit: 'set', where: ['Walmart', 'Target', 'Amazon'], unitCostRange: [30, 90], essential: false, buyAt: 'T-3d', note: 'Keeps all ages occupied; reusable for future reunions.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['lawngames-rental-2026', 'lawngames-package-2026'], lastVerified: '2026-08-18', claim: 'Lawn games for a family reunion, priced as rental. Cornhole is $30 for the first day and $5 each additional day; further games (ladder toss, giant Jenga, giant Connect 4) are about $25 each, so two or three games land inside this band. ORDER MINIMUMS ARE THE TRAP: pickup orders start at $110 and DELIVERY at $385, so a host collecting two games pays the per-game rate while one having them delivered jumps well above this band. Bubbles and balls are bought, not rented, and are the smaller share.', sufficientWhen: 'A per-game pickup rate for the games actually wanted, against the same provider\'s delivery minimum, confirms which side of the band an order lands on.' }, },
    { id: 'p_tablecover', item: 'Disposable tablecloths', category: 'decor', qtyFlat: 1, qtyPer: 'per table', unit: 'count', where: ['dollar store', 'party store'], unitCostRange: [1, 3], essential: false, buyAt: 'T-3d', note: 'Cheap way to make picnic tables look intentional and speed cleanup.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['disposable-kit-2026', 'disposables-partyqty-2026'], lastVerified: '2026-08-16', claim: 'Disposable plastic table covers 2026: $1.00 each for a single 54x108 store-brand cover; multi-packs run $21.99 per 32 (about $0.69 each) to $29.99 per 12; decorative prints $2.50-3.50 each.', sufficientWhen: 'A current shelf price for one store-brand table cover and one multi-pack confirms the per-cover range.' } },
    { id: 'p_firstaid', item: 'Basic first-aid kit', category: 'logistics', qtyFlat: 1, unit: 'count', where: ['pharmacy', 'Amazon'], unitCostRange: [10, 25], essential: false, buyAt: 'T-3d', note: 'All-ages outdoor event — scrapes and bug bites are guaranteed.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['firstaid-retail-2026', 'costco-cleaning-2026'], lastVerified: '2026-08-18', claim: 'A household first-aid kit. Walmart lists a DMI 175-piece kit at $13.99, with Equate 250-piece and Band-Aid 160-piece kits in the same tier; a Be Smart Get Prepared 10-PERSON kit is $39.99 and sits above this band - that is a workplace or large-group product. This row prices the household kit a host keeps on hand.', sufficientWhen: 'One shelf price for a household-sized kit confirms the band.' }, },
    // W1.3: gated on the shirts decision — a bare reunion buys no shirts.
    { id: 'p_shirts', item: 'Reunion T-shirts (custom printed, sizes by household)', category: 'logistics', qtyPerGuest: 1, unit: 'count', where: ['online custom printer', 'local print shop'], unitCostRange: [6, 15], essential: false, buyAt: 'T-28d', whenChoice: { id: 'reunion-shirts', in: ['Yes — matching shirts'] }, note: 'Bulk screen printing gets cheaper per shirt as the count rises; collect sizes with the RSVPs and order once, about a month out — reorders never arrive in time.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'US bulk custom-tee band stated from general market knowledge; no source was fetched for this row, so it stays synthesized per the corroboration ratchet — one source would not earn a cited price either.' } },
  ],

  rentalsGap: [
    { item: 'Pop-up shade canopy / tent', qtyFlat: 2, note: 'For sun and as a rain hedge; one over food, one over seating. Scale up past ~60 guests.' },
    { item: 'Folding tables', qtyPerGuest: 0.12, note: 'Beyond what the pavilion provides; roughly one 8-ft table per 8 guests.' },
    { item: 'Folding chairs', qtyPerGuest: 0.6, note: 'Not everyone sits at once, but provide for ~60% of the crowd.' },
    { item: 'Coolers / drink tubs', qtyFlat: 3, note: 'Separate tubs for water, soda, and alcohol keeps lines short.' },
    { item: 'Portable restroom unit', qtyFlat: 1, note: 'Only for a remote site without park facilities; 1 unit per ~50 guests for a few hours.' },
  ],

  vendors: [
    { category: 'BBQ caterer / food truck', required: false, altToDIY: true, when: 'T-40d', costRange: [15, 30], costUnit: 'per guest' },
    { category: 'Photographer (1 hour for group + candids)', required: false, altToDIY: true, when: 'T-21d', costRange: [150, 400], costUnit: 'flat' },
    { category: 'Bounce house / kids entertainer', required: false, altToDIY: true, when: 'T-38d', costRange: [120, 300], costUnit: 'flat' },
    { category: 'Tent / table / chair rental', required: false, altToDIY: true, when: 'T-38d', costRange: [150, 500], costUnit: 'flat' },
    { category: 'Portable restroom rental', required: false, altToDIY: false, when: 'T-36d', costRange: [120, 250], costUnit: 'per unit' },
  ],

  risks: [
    { id: 'r-rain', trigger: 'Rain or storms on an outdoor date', severity: 'high', mitigation: 'Commit a rain backup by a week out: a reserved indoor space or tents on hold; do not rely on hope.' },
    { id: 'r-heat', trigger: 'Hot day with too little shade or water', severity: 'medium', mitigation: 'Two shade canopies, extra water, ~2 lb ice/guest, and a shaded seating zone for elders and kids.' },
    { id: 'r-headcount', trigger: 'Soft RSVPs across households — real count unknown', severity: 'high', mitigation: 'Chase by household at 3 weeks out; plan food/ice/seating to the high end of the confirmed range.' },
    { id: 'r-potluck-gaps', trigger: 'Duplicate dishes / no hot entree from an uncoordinated potluck', severity: 'medium', mitigation: 'Assign by category or last-name letter on a sign-up; host backstops mains and staples.' },
    { id: 'r-lost-child', trigger: 'A child wanders off in a big multi-household crowd', severity: 'high', mitigation: 'Before the day: pick a clearly visible meeting spot with the kids, teach little ones to stay put and ask a person WITH CHILDREN for help, and sticker a phone number on the small ones. If a child goes missing: any water gets checked FIRST, and the call to police is IMMEDIATE — NCMEC is explicit that there is no waiting period (then 1-800-THE-LOST).' },
    { id: 'r-rental-cancel', trigger: 'The rental house falls through before the reunion', severity: 'high', mitigation: 'Platform reality (Airbnb/Vrbo policy pages): a host CAN cancel — penalties don’t stop it — and rebooking help plus a full refund is the remedy, so book through the platform’s own checkout, never off-platform. On arrival, photograph and report anything materially wrong WITHIN 72 HOURS (Airbnb’s hard window). Storm-season bookings have NO weather safety net from the platform — that’s event insurance. Pay deposits by credit card (the dispute clock runs 60 days from the statement — CFPB).' },
    // MSU Extension guidance (INCIDENT_SOURCES 'msu-family-gatherings', fetched 2026-07-28) — the family-dynamics risk every reunion carries.
    { id: 'r-family-tension', trigger: 'Old family tension flares mid-gathering', severity: 'medium', mitigation: 'Michigan State Extension’s advice: expect people not to change — make distance, not arguments; move rooms or seats instead of engaging, deliberately ignore baiting remarks, and watch the alcohol. A walk beats a showdown.' },
    { id: 'r-no-photo', trigger: 'Group photo never happens — people drift off', severity: 'medium', mitigation: 'Named shooter + a fixed early-to-mid-afternoon photo time announced at arrival.' },
    { id: 'r-trash', trigger: 'Park bins overflow under a big crowd', severity: 'low', mitigation: 'Bring heavy-duty bags, stage multiple labeled stations, and assign a cleanup crew.' },
    { id: 'r-restroom', trigger: 'No usable restrooms at a remote site', severity: 'medium', mitigation: 'Confirm park facilities at booking or order a portable unit by 36 days out.' },
  ],

  contingencies: [
    { id: 'c-rain', when: 'r-rain', plan: 'Move to the reserved indoor backup or raise tents; relocate food and the group photo under cover; text the household chain the new plan the morning of.' },
    { id: 'c-heat', when: 'r-heat', plan: 'Add a shade canopy, set out a water-and-ice station front and center, and shift games to the cooler late afternoon.' },
    { id: 'c-headcount', when: 'r-headcount', plan: 'Cook/buy to the high end and keep receipts; surplus drinks, ice, and paper goods store or return easily.' },
    { id: 'c-potluck-gaps', when: 'r-potluck-gaps', plan: 'Host keeps a backup tray of grillable protein and a side ready to fill any hole in the spread.' },
    { id: 'c-no-photo', when: 'r-no-photo', plan: 'Designate a backup shooter and pull the photo earlier if guests start leaving; a phone on a tripod with a timer works.' },
    { id: 'c-trash', when: 'r-trash', plan: 'Pull and re-bag full bins mid-event; haul out anything the park bins can’t hold rather than leaving it.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', do: 'Buy non-perishables: drinks, water, paper goods, trash bags, name tags, sign-in sheet, games, sunscreen.' },
      { when: 'T-1d', do: 'Buy perishables and protein; pre-chill drinks overnight.' },
      { when: 'T0', do: 'Buy ice the morning of (~2 lb/guest) so it doesn’t melt before the event.' },
    ],
    preparation: [
      { when: 'T-14d', do: 'Finalize run-of-show, name the photographer, and assign volunteer jobs.' },
      { when: 'T-7d', do: 'Confirm the weather/rain plan and shade; reconfirm any vendors and rentals.' },
      { when: 'T-1d', do: 'Prep name tags and sign-in sheet; pre-make any host dishes; load the car.' },
    ],
    setup: [
      { when: 'T0 -5h', what: 'Collect the rentals, the ice and anything the host staples list still needs' },
      { when: 'T0 -4h', what: 'Start the slow-cooked food; drinks into coolers' },
      { when: 'T0 -3h', what: 'Confirm the pavilion is ours and unlocked; check the forecast and make the rain call' },
      { when: 'T0-120m', do: 'Arrive early; claim and clean the pavilion/site; place shade canopies and tables.' },
      { when: 'T0-90m', do: 'Ice coolers, build drink stations, light the grill, lay out serving table.' },
      { when: 'T0-60m', do: 'Set the registration table (name tags, sign-in, marker) and place trash/recycling stations.' },
      { when: 'T0-30m', do: 'Stage games and kids area; do a final walk-through; brief volunteers on their jobs.' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Registration table opens: name tags, sign-in, contact updates' },
      { when: 'T0 +45m', what: 'The group photo — do it early while everyone’s here and clean' },
      { when: 'T0 +1:15', what: 'Blessing, then the meal; elders and small kids first' },
      { when: 'T0 +2h', what: 'The programme: welcome, oldest and youngest present, anyone we lost this year' },
      { when: 'T0 +2:30', what: 'Games and the spades table; kids’ activities running in parallel' },
      { when: 'T0 +3:30', what: 'Dessert and the last of the visiting' },
      { when: 'T0 +4:05', what: 'Send-off: to-go plates, confirm the next reunion’s host' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep cold food on ice and the drink station stocked; keep an eye on kids near water, grills and the parking area' },
      { when: 'T0+4h', do: 'Start consolidating food, send leftovers home in guests’ own containers.' },
      { when: 'T0+4.5h', do: 'Bag all trash and recycling; collect coolers, rentals, and shared supplies.' },
      { when: 'T0+5h', do: 'Walk the entire site for litter and left-behind items; return the space cleaner than found.' },
      { when: 'T0+1d', do: 'Return rentals; share the group photo and updated contact list with all households.' },
    ],
    // ── W1.3: the weekend agenda — the arc the reunion research documents
    // (arrival evening / the big day / farewell morning, same shape as
    // itinerary.js's researched reunionArc). Every row is whenChoice-gated on
    // the span decision, so a one-day reunion's run-of-show never grows Day
    // tokens; programmeDays groups these per day once the host answers
    // "A full weekend". Day 1 here is the arrival day; the T0-anchored beats
    // above describe the big reunion day itself.
    agenda: [
      { when: 'Day 1 evening', what: 'Meet and greet — everyone lands at different hours, so keep it a drop-in supper with no program', whenChoice: { id: 'reunion-span', in: ['A full weekend (2-3 days)'] } },
      { when: 'Day 2 morning', what: 'Setup crew to the pavilion — tables, shade, the registration table — while the late sleepers surface', whenChoice: { id: 'reunion-span', in: ['A full weekend (2-3 days)'] } },
      { when: 'Day 2 afternoon', what: 'The reunion proper — registration, the group photo, the meal, and the program', whenChoice: { id: 'reunion-span', in: ['A full weekend (2-3 days)'] } },
      { when: 'Day 2 evening', what: 'The long visit — games, the spades table, stories running late', whenChoice: { id: 'reunion-span', in: ['A full weekend (2-3 days)'] } },
      { when: 'Day 3 morning', what: 'Farewell breakfast and goodbyes — leftovers sent home and the group photo promised to every household', whenChoice: { id: 'reunion-span', in: ['A full weekend (2-3 days)'] } },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note:
      'This playbook is synthesized from widely-published US reunion and large-cookout planning norms, not from primary measured data, so the figures are planning estimates rather than guarantees. The food and beverage quantities (~0.5 lb protein/guest, ~3-4 drinks/guest over a long afternoon, ~2 lb ice/guest outdoors) reflect common rules of thumb and will swing with weather, crowd, time of day, and how much guests actually drink; the cost ranges are rough US averages that vary a lot by region, season, and whether you buy in bulk. The structure deliberately leans toward the outdoor, multi-household potluck case because that is the most common and most error-prone reunion shape; an indoor or fully-catered reunion will use fewer of the rental and weather provisions. Treat the per-guest ratios as a starting scale-by and adjust to your actual headcount and venue. Food-safety claims were verified against primary USDA FSIS/FDA text on 2026-07-28 (see sources); all other figures remain synthesized rules of thumb — no fabricated citations. ENRICHED 2026-08-21 (W1.3): the committee, weekend/multi-day, travel-around-lodging, shared-payments, and shirts/photography families were added as decision-gated content — four new decisions whose defaults are the local-picnic answers, seventeen gated tasks, a gated shirt purchase, and a gated weekend agenda. The weekend arc (arrival evening, the big day, farewell morning) follows the documented reunion-weekend shape already registered by the guest itinerary\'s researched arc; committee sizing (one per family branch, three to six people), the per-family chip-in norm, the one-treasurer rule, and the two-to-three-week bulk shirt lead are US reunion-planning consensus stated as practice and labeled synthesized — no fetched sources were added in this pass.',
    sources: ['fsis-cooking-groups', 'fsis-danger-zone'],
  },
};

export default reunion;
