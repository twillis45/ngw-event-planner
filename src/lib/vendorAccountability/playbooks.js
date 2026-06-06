// ─── Vendor Category Playbooks ──────────────────────────────────────────────
// Sprint 61.A Phase A. The non-UI foundation that lets the app explain to a
// planner (and eventually the client) what each vendor type should normally
// provide — so the user does NOT have to know every vendor industry.
//
// Each playbook follows the same schema so derivation helpers can iterate
// over them uniformly. New categories should be added here, never in UI code.
//
// No Guesswork rule: a planner should be able to read a playbook field and
// understand WHY it matters without industry knowledge. `whyItMatters`
// strings are the operational explanation layer that powers the Education
// rail in Phase E.

/**
 * @typedef Promise
 * @prop {string}  key            stable id used by Promise Tracker
 * @prop {string}  label          short human label
 * @prop {number}  daysBefore     days before event when the promise is due
 * @prop {boolean} critical       affects safety/execution if missing
 * @prop {boolean} evidenceRequired
 * @prop {string=} evidenceKind   contract|invoice|message|photo|document|count
 * @prop {string=} ownerHint      planner|vendor|client|venue (suggested owner)
 */

/**
 * @typedef Playbook
 * @prop {string}   categoryKey            stable lowercase identifier
 * @prop {string}   displayName            user-facing name
 * @prop {string}   plainDescription       1–2 sentence non-expert summary
 * @prop {Promise[]} commonPromises
 * @prop {string[]} requiredConfirmations  promise keys that must be confirmed
 * @prop {string[]} evidenceNeeded         promise keys requiring documents
 * @prop {Array<{key:string, daysBefore:number}>} typicalDeadlines
 * @prop {string[]} dayOfReadinessChecks
 * @prop {string[]} commonRisks
 * @prop {string[]} questionsToAsk
 * @prop {string[]} briefSections
 * @prop {string[]} runOfShowDependencies
 * @prop {Record<string,string>} whyItMattersByField
 */

const COMMON_RISK_PRESETS = {
  delayedArrival:   'Late vendor arrival disrupts setup and downstream schedule.',
  countMismatch:    'Mismatched counts cause shortfall or waste.',
  paymentBlock:     'Unpaid balance can pause service on event day.',
  missingContact:   'No reliable day-of contact slows escalation.',
};

const ASKS = {
  arrivalTime:  'What time will your crew arrive, and what access do you need?',
  loadIn:       'What time can you load in, and through which entrance?',
  cleanup:      'Who is responsible for cleanup, and by when must it be complete?',
  finalCount:   'What is your final guest count cutoff, and how do you handle late changes?',
  shotList:     'How and when do you want the shot list, and who confirms it?',
  parking:      'Where will your team park, and is loading-zone access required?',
};

// ──────────────────────────────────────────────────────────────────────────
// 1. Venue
// ──────────────────────────────────────────────────────────────────────────
const VENUE = {
  categoryKey: 'venue',
  displayName: 'Venue',
  plainDescription:
    'The venue controls access, setup windows, and rules every other vendor depends on. Their confirmations unblock everyone else.',
  commonPromises: [
    { key: 'access_time',      label: 'Venue access / load-in time',  daysBefore: 14, critical: true,  evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'venue' },
    { key: 'event_window',     label: 'Event start & end time',        daysBefore: 30, critical: true,  evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'venue' },
    { key: 'capacity_confirmed', label: 'Final capacity confirmation', daysBefore: 14, critical: true,  evidenceRequired: false, ownerHint: 'venue' },
    { key: 'rooms_assigned',   label: 'Rooms / spaces assigned',       daysBefore: 14, critical: false, evidenceRequired: false, ownerHint: 'venue' },
    { key: 'parking_plan',     label: 'Parking & vendor load-in path', daysBefore: 7,  critical: false, evidenceRequired: false, ownerHint: 'venue' },
    { key: 'vendor_rules',     label: 'Vendor access rules',           daysBefore: 14, critical: true,  evidenceRequired: false, ownerHint: 'venue' },
    { key: 'day_of_contact',   label: 'Day-of venue contact name + phone', daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'venue' },
    { key: 'insurance_coi',    label: 'Insurance / COI requirements',  daysBefore: 30, critical: false, evidenceRequired: true,  evidenceKind: 'document', ownerHint: 'planner' },
    { key: 'noise_restrictions', label: 'Noise / curfew rules',        daysBefore: 14, critical: false, evidenceRequired: false, ownerHint: 'venue' },
    { key: 'cleanup',          label: 'Cleanup responsibility',        daysBefore: 14, critical: false, evidenceRequired: false, ownerHint: 'venue' },
  ],
  requiredConfirmations: ['access_time', 'event_window', 'capacity_confirmed', 'vendor_rules', 'day_of_contact'],
  evidenceNeeded:        ['access_time', 'event_window', 'insurance_coi'],
  typicalDeadlines: [
    { key: 'event_window',  daysBefore: 30 },
    { key: 'access_time',   daysBefore: 14 },
    { key: 'vendor_rules',  daysBefore: 14 },
    { key: 'day_of_contact', daysBefore: 7 },
  ],
  dayOfReadinessChecks: [
    'Venue contact phone reachable',
    'Access time matches first vendor arrival',
    'Vendor rules shared with all vendors',
  ],
  commonRisks: [
    'Vendor arrival before venue access (delivery blocked).',
    'Cleanup responsibility unclear (extra fees).',
    COMMON_RISK_PRESETS.missingContact,
  ],
  questionsToAsk: [
    'What is the earliest load-in time?',
    'Are there vendor parking or loading-zone restrictions?',
    'Who is the day-of venue contact and what is their direct number?',
    'What time must cleanup be complete?',
    'Are there noise or curfew rules we should warn vendors about?',
  ],
  briefSections: ['access_time', 'parking_plan', 'rooms_assigned', 'day_of_contact', 'vendor_rules', 'cleanup'],
  runOfShowDependencies: ['access_time', 'event_window', 'cleanup'],
  whyItMattersByField: {
    access_time:    'Venue access time controls every vendor delivery and setup window.',
    event_window:   'Start and end time anchor the schedule and the cleanup deadline.',
    vendor_rules:   'Vendor rules (security check-in, freight, restrictions) protect the load-in plan.',
    day_of_contact: 'A real day-of phone number prevents escalation chaos when a door is locked.',
    insurance_coi:  'Some venues hold vendors at the door without a current certificate of insurance.',
    cleanup:        'Unclear cleanup ownership is the #1 source of post-event invoice surprises.',
  },
};

// ──────────────────────────────────────────────────────────────────────────
// 2. Catering
// ──────────────────────────────────────────────────────────────────────────
const CATERING = {
  categoryKey: 'catering',
  displayName: 'Catering',
  plainDescription:
    'Caterers convert your guest count, menu, and timing into food and service. Their accuracy depends on what you confirm before event week.',
  commonPromises: [
    { key: 'final_guest_count',     label: 'Final guest count',         daysBefore: 7,  critical: true,  evidenceRequired: true,  evidenceKind: 'count',   ownerHint: 'planner' },
    { key: 'allergy_dietary',       label: 'Allergy / dietary list',    daysBefore: 7,  critical: true,  evidenceRequired: true,  evidenceKind: 'document', ownerHint: 'planner' },
    { key: 'final_menu',            label: 'Final menu',                daysBefore: 14, critical: true,  evidenceRequired: true,  evidenceKind: 'document', ownerHint: 'vendor'  },
    { key: 'service_style',         label: 'Service style (plated, buffet, family)', daysBefore: 21, critical: true,  evidenceRequired: false, ownerHint: 'planner' },
    { key: 'staff_count',           label: 'Staff count',               daysBefore: 7,  critical: false, evidenceRequired: false, ownerHint: 'vendor'  },
    { key: 'arrival_time',          label: 'Arrival time',              daysBefore: 3,  critical: true,  evidenceRequired: false, ownerHint: 'vendor'  },
    { key: 'kitchen_access',        label: 'Kitchen / load-in access',  daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'venue'   },
    { key: 'setup_location',        label: 'Setup location',            daysBefore: 7,  critical: false, evidenceRequired: false, ownerHint: 'planner' },
    { key: 'cleanup_responsibility', label: 'Cleanup responsibility',   daysBefore: 14, critical: false, evidenceRequired: false, ownerHint: 'vendor'  },
    { key: 'payment_terms',         label: 'Payment terms',             daysBefore: 30, critical: false, evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor'  },
    { key: 'tastings_complete',     label: 'Tasting(s) complete',       daysBefore: 45, critical: false, evidenceRequired: false, ownerHint: 'client'  },
  ],
  requiredConfirmations: ['final_guest_count', 'allergy_dietary', 'final_menu', 'service_style', 'arrival_time', 'kitchen_access'],
  evidenceNeeded:        ['final_guest_count', 'allergy_dietary', 'final_menu', 'payment_terms'],
  typicalDeadlines: [
    { key: 'final_menu',          daysBefore: 14 },
    { key: 'final_guest_count',   daysBefore: 7 },
    { key: 'allergy_dietary',     daysBefore: 7 },
    { key: 'arrival_time',        daysBefore: 3 },
  ],
  dayOfReadinessChecks: [
    'Final guest count locked',
    'Allergy list shared with kitchen',
    'Arrival time matches venue access',
    'Service style confirmed',
  ],
  commonRisks: [
    COMMON_RISK_PRESETS.countMismatch,
    'Allergy info missed leads to safety incidents.',
    'Late kitchen access shortens prep window.',
    COMMON_RISK_PRESETS.delayedArrival,
  ],
  questionsToAsk: [
    ASKS.finalCount,
    'How do you handle allergies and dietary needs — do you need names?',
    ASKS.arrivalTime,
    'Where does your team set up, and what kitchen access do you need?',
    ASKS.cleanup,
  ],
  briefSections: ['final_guest_count', 'final_menu', 'allergy_dietary', 'arrival_time', 'kitchen_access', 'service_style', 'staff_count', 'cleanup_responsibility'],
  runOfShowDependencies: ['arrival_time', 'kitchen_access', 'service_style'],
  whyItMattersByField: {
    final_guest_count: 'Caterers need final guest count so they can staff and prepare food correctly.',
    allergy_dietary:   'Allergies affect safety. The kitchen must know names + restrictions, not just totals.',
    final_menu:        'Menu locks the shopping list, prep schedule, and pricing — late changes cost money.',
    service_style:     'Service style drives staffing ratios and timing (plated vs. buffet uses very different headcount).',
    arrival_time:      'Arrival time controls setup, service readiness, and kitchen coordination.',
    kitchen_access:    'Kitchen access window is set by the venue; mismatched arrival creates a cold-food risk.',
    cleanup_responsibility: 'Unclear cleanup ownership is the #1 source of post-event invoice surprises.',
  },
};

// ──────────────────────────────────────────────────────────────────────────
// 3. Photographer / Video
// ──────────────────────────────────────────────────────────────────────────
const PHOTO_VIDEO = {
  categoryKey: 'photo_video',
  displayName: 'Photographer / Video',
  plainDescription:
    'Photo and video teams need timing and a shot list to capture the moments that matter. Missing context = missed shots that cannot be recreated.',
  commonPromises: [
    { key: 'arrival_time',     label: 'Arrival time',              daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor'  },
    { key: 'coverage_hours',   label: 'Coverage hours (start–end)', daysBefore: 14, critical: true,  evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor' },
    { key: 'shot_list',        label: 'Shot list / must-capture moments', daysBefore: 14, critical: true,  evidenceRequired: true,  evidenceKind: 'document', ownerHint: 'client' },
    { key: 'family_groupings', label: 'Family / group photo list', daysBefore: 14, critical: true,  evidenceRequired: true,  evidenceKind: 'document', ownerHint: 'client' },
    { key: 'timeline_share',   label: 'Day-of timeline shared',    daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'planner' },
    { key: 'day_of_contact',   label: 'Day-of contact for couple', daysBefore: 7,  critical: false, evidenceRequired: false, ownerHint: 'vendor'  },
    { key: 'parking',          label: 'Parking instructions',      daysBefore: 7,  critical: false, evidenceRequired: false, ownerHint: 'venue'   },
    { key: 'second_shooter',   label: 'Second shooter confirmed',  daysBefore: 21, critical: false, evidenceRequired: false, ownerHint: 'vendor'  },
    { key: 'deliverables_date', label: 'Final deliverables date',  daysBefore: 0,  critical: false, evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor' },
    { key: 'payment_terms',    label: 'Payment terms',             daysBefore: 30, critical: false, evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor' },
  ],
  requiredConfirmations: ['arrival_time', 'coverage_hours', 'shot_list', 'family_groupings', 'timeline_share'],
  evidenceNeeded:        ['coverage_hours', 'shot_list', 'family_groupings', 'payment_terms'],
  typicalDeadlines: [
    { key: 'coverage_hours',   daysBefore: 14 },
    { key: 'shot_list',        daysBefore: 14 },
    { key: 'family_groupings', daysBefore: 14 },
    { key: 'arrival_time',     daysBefore: 7 },
    { key: 'timeline_share',   daysBefore: 7 },
  ],
  dayOfReadinessChecks: [
    'Shot list received and acknowledged',
    'Coverage window covers ceremony + key reception moments',
    'Day-of contact in their phone',
  ],
  commonRisks: [
    'Coverage ends before key event moment (cake / send-off).',
    'Shot list incomplete — family photo groupings missed.',
    'Light changes faster than the timeline assumes.',
  ],
  questionsToAsk: [
    ASKS.arrivalTime,
    'What time does coverage end? Is the cake / send-off included?',
    ASKS.shotList,
    'Do you need a meal during coverage and when?',
    ASKS.parking,
    'Who is your day-of contact for the couple?',
  ],
  briefSections: ['arrival_time', 'coverage_hours', 'shot_list', 'family_groupings', 'timeline_share', 'parking', 'day_of_contact'],
  runOfShowDependencies: ['arrival_time', 'coverage_hours', 'timeline_share'],
  whyItMattersByField: {
    arrival_time:     'A late photographer misses getting-ready and first-look windows that cannot be recreated.',
    coverage_hours:   'Coverage hours determine whether key moments (cake, send-off) are captured.',
    shot_list:        'Photographers need a shot list so key family/group images are not missed.',
    family_groupings: 'Family groupings prevent "everyone wait, who is missing" delays during photos.',
    timeline_share:   'A shared day-of timeline lets the photographer pre-light and pre-position for each moment.',
  },
};

// ──────────────────────────────────────────────────────────────────────────
// 4. DJ / Entertainment
// ──────────────────────────────────────────────────────────────────────────
const DJ_ENT = {
  categoryKey: 'dj_entertainment',
  displayName: 'DJ / Entertainment',
  plainDescription:
    'DJs and live performers run the audience experience. They need ceremony and reception timing cues to handle announcements, transitions, and music selection.',
  commonPromises: [
    { key: 'arrival_time',        label: 'Arrival time',             daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'setup_time',          label: 'Setup window',             daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'ceremony_timing',     label: 'Ceremony timing & cues',   daysBefore: 14, critical: true,  evidenceRequired: false, ownerHint: 'planner' },
    { key: 'reception_timing',    label: 'Reception timeline',       daysBefore: 14, critical: true,  evidenceRequired: false, ownerHint: 'planner' },
    { key: 'announcement_script', label: 'Announcement script / wedding party names', daysBefore: 7, critical: true, evidenceRequired: true, evidenceKind: 'document', ownerHint: 'planner' },
    { key: 'song_list',           label: 'Special songs (entrance, first dance, parent dances)', daysBefore: 14, critical: true, evidenceRequired: true, evidenceKind: 'document', ownerHint: 'client' },
    { key: 'do_not_play',         label: 'Do-not-play list',         daysBefore: 14, critical: false, evidenceRequired: false, ownerHint: 'client' },
    { key: 'power_av',            label: 'Power / AV requirements',  daysBefore: 14, critical: true,  evidenceRequired: false, ownerHint: 'venue'  },
    { key: 'payment_terms',       label: 'Payment terms',            daysBefore: 30, critical: false, evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor' },
  ],
  requiredConfirmations: ['arrival_time', 'setup_time', 'ceremony_timing', 'reception_timing', 'announcement_script', 'song_list', 'power_av'],
  evidenceNeeded:        ['announcement_script', 'song_list', 'payment_terms'],
  typicalDeadlines: [
    { key: 'ceremony_timing',     daysBefore: 14 },
    { key: 'reception_timing',    daysBefore: 14 },
    { key: 'song_list',           daysBefore: 14 },
    { key: 'announcement_script', daysBefore: 7 },
  ],
  dayOfReadinessChecks: [
    'Ceremony timing & cues confirmed',
    'Wedding party name pronunciation list received',
    'Special songs locked in',
    'Power requirements confirmed with venue',
  ],
  commonRisks: [
    'No ceremony timing — DJ has to wing announcements.',
    'Mispronounced names hurt key moments (entrance, toasts).',
    'Power not confirmed with venue — gear can\'t set up.',
  ],
  questionsToAsk: [
    ASKS.arrivalTime,
    'What time can you set up, and how long do you need?',
    'How would you like the ceremony and reception cues delivered?',
    'What is your do-not-play / no-go policy?',
    'What power and AV do you need from the venue?',
  ],
  briefSections: ['arrival_time', 'setup_time', 'ceremony_timing', 'reception_timing', 'announcement_script', 'song_list', 'power_av'],
  runOfShowDependencies: ['arrival_time', 'setup_time', 'ceremony_timing', 'reception_timing'],
  whyItMattersByField: {
    ceremony_timing:     'DJs need timeline cues to handle ceremony, announcements, and transitions.',
    reception_timing:    'Reception timing controls when toasts, first dance, cake, and last call happen.',
    announcement_script: 'Mispronouncing the wedding party or toasters during entrance is hard to recover from.',
    song_list:           'Special songs anchor key moments — missing them is the most visible miss.',
    power_av:            'Power and AV are venue-controlled. Without confirmation, gear can\'t set up on time.',
  },
};

// ──────────────────────────────────────────────────────────────────────────
// 5. Florist / Decor
// ──────────────────────────────────────────────────────────────────────────
const FLORIST = {
  categoryKey: 'florist_decor',
  displayName: 'Florist / Decor',
  plainDescription:
    'Florists and decor teams need venue access, setup windows, and breakdown rules. Their delivery timing depends on venue access.',
  commonPromises: [
    { key: 'delivery_time',     label: 'Delivery time',         daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'setup_window',      label: 'Setup window (start–end)', daysBefore: 14, critical: true, evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'final_count',       label: 'Final arrangement count', daysBefore: 21, critical: true, evidenceRequired: true,  evidenceKind: 'document', ownerHint: 'planner' },
    { key: 'venue_access',      label: 'Venue access confirmed', daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'venue'  },
    { key: 'breakdown_plan',    label: 'Breakdown & take-home plan', daysBefore: 7, critical: false, evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'inspiration_share', label: 'Inspiration / mood board shared', daysBefore: 60, critical: false, evidenceRequired: true, evidenceKind: 'document', ownerHint: 'client' },
    { key: 'payment_terms',     label: 'Payment terms',           daysBefore: 30, critical: false, evidenceRequired: true, evidenceKind: 'contract', ownerHint: 'vendor' },
  ],
  requiredConfirmations: ['delivery_time', 'setup_window', 'final_count', 'venue_access'],
  evidenceNeeded:        ['final_count', 'inspiration_share', 'payment_terms'],
  typicalDeadlines: [
    { key: 'final_count',    daysBefore: 21 },
    { key: 'setup_window',   daysBefore: 14 },
    { key: 'delivery_time',  daysBefore: 7 },
    { key: 'venue_access',   daysBefore: 7 },
  ],
  dayOfReadinessChecks: [
    'Delivery time within venue access window',
    'Setup window does not collide with guest arrival',
    'Breakdown plan agreed (who takes what home)',
  ],
  commonRisks: [
    'Delivery before venue access — driver waiting, fees + cold flowers.',
    'Setup spills into guest-arrival window.',
    'No breakdown plan — arrangements left in venue overnight.',
  ],
  questionsToAsk: [
    'When will you deliver, and is the time within venue access?',
    'How long do you need to set up, and where?',
    'Who is breaking down the arrangements after the event?',
    'Do you confirm the final count from the planner or the client?',
  ],
  briefSections: ['delivery_time', 'setup_window', 'final_count', 'inspiration_share', 'breakdown_plan'],
  runOfShowDependencies: ['delivery_time', 'setup_window'],
  whyItMattersByField: {
    delivery_time:     'Delivery before venue access creates driver-waiting fees and cold-flower risk.',
    setup_window:      'Setup window must end before guests arrive — overrun is visible and stressful.',
    final_count:       'Arrangement counts drive purchase orders weeks ahead. Late changes mean substitutions.',
    venue_access:      'Florist delivery depends on the venue\'s load-in window — confirm both sides match.',
    breakdown_plan:    'Without a breakdown plan, arrangements get left or thrown away.',
  },
};

// ──────────────────────────────────────────────────────────────────────────
// 6. Rentals
// ──────────────────────────────────────────────────────────────────────────
const RENTALS = {
  categoryKey: 'rentals',
  displayName: 'Rentals',
  plainDescription:
    'Rental companies (tables, chairs, linens, tents, lighting) deliver heavy items on tight windows. Mismatched delivery timing creates cascading delays.',
  commonPromises: [
    { key: 'delivery_window',  label: 'Delivery window',        daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'pickup_window',    label: 'Pickup window',          daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'inventory_list',   label: 'Final inventory list',   daysBefore: 14, critical: true,  evidenceRequired: true,  evidenceKind: 'document', ownerHint: 'planner' },
    { key: 'venue_load_path',  label: 'Venue load path confirmed', daysBefore: 7, critical: true, evidenceRequired: false, ownerHint: 'venue'  },
    { key: 'setup_responsibility', label: 'Who sets up rentals', daysBefore: 14, critical: true,  evidenceRequired: false, ownerHint: 'planner' },
    { key: 'damage_policy',    label: 'Damage / loss policy',   daysBefore: 30, critical: false, evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor' },
    { key: 'payment_terms',    label: 'Payment terms',          daysBefore: 30, critical: false, evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor' },
  ],
  requiredConfirmations: ['delivery_window', 'pickup_window', 'inventory_list', 'venue_load_path', 'setup_responsibility'],
  evidenceNeeded:        ['inventory_list', 'damage_policy', 'payment_terms'],
  typicalDeadlines: [
    { key: 'inventory_list', daysBefore: 14 },
    { key: 'delivery_window', daysBefore: 7 },
    { key: 'venue_load_path', daysBefore: 7 },
  ],
  dayOfReadinessChecks: [
    'Delivery window inside venue access',
    'Setup responsibility assigned (vendor vs. planner team)',
    'Pickup window after event end + cleanup',
  ],
  commonRisks: [
    'Rental delivery collides with venue load-in.',
    'No setup ownership — who unloads and arranges?',
    'Pickup before cleanup is done — items missing.',
  ],
  questionsToAsk: [
    'When will you deliver, and is the window inside the venue access?',
    'Who sets up the rentals once they\'re on site?',
    'When is pickup, and what state should items be in?',
    'What is your damage / loss policy?',
  ],
  briefSections: ['delivery_window', 'pickup_window', 'inventory_list', 'setup_responsibility', 'damage_policy'],
  runOfShowDependencies: ['delivery_window', 'pickup_window', 'setup_responsibility'],
  whyItMattersByField: {
    delivery_window:       'Delivery window must fit inside venue access or the truck is turned away.',
    pickup_window:         'Pickup must come after cleanup — early pickup leaves items behind.',
    inventory_list:        'Final inventory drives the truck load and the invoice. Late additions cost rush fees.',
    setup_responsibility:  'Without a clear owner, rentals sit in boxes until someone notices.',
  },
};

// ──────────────────────────────────────────────────────────────────────────
// 7. Transportation
// ──────────────────────────────────────────────────────────────────────────
const TRANSPORTATION = {
  categoryKey: 'transportation',
  displayName: 'Transportation',
  plainDescription:
    'Transportation companies move people on a schedule. Mismatched counts, pickup times, or addresses ripple into late arrivals.',
  commonPromises: [
    { key: 'passenger_count',  label: 'Passenger count',        daysBefore: 7,  critical: true,  evidenceRequired: true,  evidenceKind: 'count', ownerHint: 'planner' },
    { key: 'pickup_schedule',  label: 'Pickup time(s) & address(es)', daysBefore: 7, critical: true, evidenceRequired: true, evidenceKind: 'document', ownerHint: 'planner' },
    { key: 'dropoff_locations', label: 'Drop-off addresses',    daysBefore: 7,  critical: true,  evidenceRequired: true,  evidenceKind: 'document', ownerHint: 'planner' },
    { key: 'vehicle_type',     label: 'Vehicle type & capacity', daysBefore: 14, critical: true,  evidenceRequired: false, ownerHint: 'vendor'  },
    { key: 'driver_contact',   label: 'Driver contact info',    daysBefore: 3,  critical: true,  evidenceRequired: false, ownerHint: 'vendor'  },
    { key: 'special_needs',    label: 'Special needs (mobility, child seat)', daysBefore: 14, critical: false, evidenceRequired: false, ownerHint: 'planner' },
    { key: 'payment_terms',    label: 'Payment terms',          daysBefore: 30, critical: false, evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor' },
  ],
  requiredConfirmations: ['passenger_count', 'pickup_schedule', 'dropoff_locations', 'vehicle_type', 'driver_contact'],
  evidenceNeeded:        ['passenger_count', 'pickup_schedule', 'dropoff_locations', 'payment_terms'],
  typicalDeadlines: [
    { key: 'vehicle_type',     daysBefore: 14 },
    { key: 'passenger_count',  daysBefore: 7 },
    { key: 'pickup_schedule',  daysBefore: 7 },
    { key: 'driver_contact',   daysBefore: 3 },
  ],
  dayOfReadinessChecks: [
    'Driver phone shared with planner',
    'Pickup times match guest readiness',
    'Vehicle capacity ≥ passenger count',
  ],
  commonRisks: [
    'Passenger count > vehicle capacity.',
    'Pickup time before guests are ready.',
    'No driver contact — late arrivals can\'t be tracked.',
  ],
  questionsToAsk: [
    'What is your final passenger count cutoff?',
    'When and where are pickups, and what address format do you need?',
    'What vehicle and capacity will be on site?',
    'Who is the day-of driver contact?',
  ],
  briefSections: ['passenger_count', 'pickup_schedule', 'dropoff_locations', 'vehicle_type', 'driver_contact'],
  runOfShowDependencies: ['pickup_schedule', 'driver_contact'],
  whyItMattersByField: {
    passenger_count:  'Vehicle capacity must match passenger count, or guests are stranded.',
    pickup_schedule:  'Pickup times need to align with guest readiness, not just the schedule.',
    driver_contact:   'A real driver phone number is the only way to handle no-shows or late starts.',
  },
};

// ──────────────────────────────────────────────────────────────────────────
// 8. Hair / Makeup
// ──────────────────────────────────────────────────────────────────────────
const HAIR_MAKEUP = {
  categoryKey: 'hair_makeup',
  displayName: 'Hair / Makeup',
  plainDescription:
    'Hair and makeup artists work on tight back-to-back timing. Their start time and headcount drive when the wedding party is ready.',
  commonPromises: [
    { key: 'arrival_time',    label: 'Arrival time',           daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'headcount',       label: 'Headcount (services)',   daysBefore: 14, critical: true,  evidenceRequired: true,  evidenceKind: 'count', ownerHint: 'planner' },
    { key: 'schedule',        label: 'Stylist schedule per person', daysBefore: 7, critical: true, evidenceRequired: true, evidenceKind: 'document', ownerHint: 'vendor' },
    { key: 'trial_done',      label: 'Trial completed',        daysBefore: 60, critical: false, evidenceRequired: false, ownerHint: 'client' },
    { key: 'finish_time',     label: 'Last person finished by', daysBefore: 7, critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'getting_ready_location', label: 'Getting-ready location', daysBefore: 14, critical: false, evidenceRequired: false, ownerHint: 'planner' },
    { key: 'payment_terms',   label: 'Payment terms',          daysBefore: 30, critical: false, evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor' },
  ],
  requiredConfirmations: ['arrival_time', 'headcount', 'schedule', 'finish_time'],
  evidenceNeeded:        ['headcount', 'schedule', 'payment_terms'],
  typicalDeadlines: [
    { key: 'headcount',     daysBefore: 14 },
    { key: 'schedule',      daysBefore: 7 },
    { key: 'arrival_time',  daysBefore: 7 },
  ],
  dayOfReadinessChecks: [
    'Arrival on time matches schedule',
    'Schedule per person communicated to wedding party',
    'Finish time leaves buffer before first photo',
  ],
  commonRisks: [
    'Last person finishes after first photo time.',
    'Headcount drift — extra service added day-of.',
    'No schedule per person — wedding party doesn\'t know when to be ready.',
  ],
  questionsToAsk: [
    ASKS.arrivalTime,
    'What is the schedule per person, and when does the last person finish?',
    'How does your team handle late guests in the schedule?',
  ],
  briefSections: ['arrival_time', 'headcount', 'schedule', 'getting_ready_location', 'finish_time'],
  runOfShowDependencies: ['arrival_time', 'finish_time'],
  whyItMattersByField: {
    arrival_time:  'A late HMU start cascades through every getting-ready window and first-look timing.',
    headcount:     'Headcount drives stylist count and total chair time. Add-ons day-of break the timeline.',
    schedule:      'Per-person schedule lets the wedding party show up at the right time, not all at once.',
    finish_time:   'Finish time must leave buffer for photos — late finish = late ceremony.',
  },
};

// ──────────────────────────────────────────────────────────────────────────
// 9. Officiant
// ──────────────────────────────────────────────────────────────────────────
const OFFICIANT = {
  categoryKey: 'officiant',
  displayName: 'Officiant',
  plainDescription:
    'The officiant runs the ceremony. The ceremony script, vows, and timing must be locked before rehearsal, not the morning of.',
  commonPromises: [
    { key: 'ceremony_script', label: 'Ceremony script / order', daysBefore: 30, critical: true, evidenceRequired: true,  evidenceKind: 'document', ownerHint: 'vendor' },
    { key: 'rehearsal_attendance', label: 'Rehearsal attendance', daysBefore: 7, critical: false, evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'arrival_time',    label: 'Arrival time',           daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'license_check',   label: 'Marriage license requirements confirmed', daysBefore: 60, critical: true, evidenceRequired: false, ownerHint: 'client' },
    { key: 'vows',            label: 'Vow format (traditional vs personal) decided', daysBefore: 30, critical: false, evidenceRequired: false, ownerHint: 'client' },
    { key: 'amplification',   label: 'Amplification / mic plan', daysBefore: 14, critical: true, evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'payment_terms',   label: 'Payment terms',          daysBefore: 30, critical: false, evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor' },
  ],
  requiredConfirmations: ['ceremony_script', 'arrival_time', 'license_check', 'amplification'],
  evidenceNeeded:        ['ceremony_script', 'payment_terms'],
  typicalDeadlines: [
    { key: 'license_check',    daysBefore: 60 },
    { key: 'ceremony_script',  daysBefore: 30 },
    { key: 'arrival_time',     daysBefore: 7 },
  ],
  dayOfReadinessChecks: [
    'Script printed and rehearsed',
    'License jurisdiction requirements verified',
    'Microphone confirmed with DJ/AV',
  ],
  commonRisks: [
    'License requirements (witnesses, residency) missed.',
    'No amplification — guests can\'t hear ceremony.',
    'Officiant late — ceremony delayed.',
  ],
  questionsToAsk: [
    'Can you share the ceremony script and order?',
    'Will you attend the rehearsal, and at what time?',
    'What are the marriage license requirements in this jurisdiction?',
    'Do you bring amplification or coordinate with the DJ/AV team?',
  ],
  briefSections: ['arrival_time', 'ceremony_script', 'license_check', 'vows', 'amplification'],
  runOfShowDependencies: ['arrival_time', 'amplification'],
  whyItMattersByField: {
    ceremony_script: 'A locked script prevents day-of edits and lets the DJ/AV pre-set cues.',
    license_check:   'Marriage license rules vary by jurisdiction — getting this wrong invalidates the ceremony.',
    amplification:   'Guests must hear vows. No mic plan = inaudible ceremony.',
  },
};

// ──────────────────────────────────────────────────────────────────────────
// 10. AV / Production
// ──────────────────────────────────────────────────────────────────────────
const AV_PRODUCTION = {
  categoryKey: 'av_production',
  displayName: 'AV / Production',
  plainDescription:
    'AV and production teams handle sound, lighting, projection, staging. Their setup window depends on venue access and their schedule depends on the run of show.',
  commonPromises: [
    { key: 'arrival_time',    label: 'Arrival time',           daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'setup_window',    label: 'Setup window',           daysBefore: 14, critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'power_plan',      label: 'Power plan confirmed with venue', daysBefore: 14, critical: true, evidenceRequired: false, ownerHint: 'venue' },
    { key: 'gear_list',       label: 'Gear list & layout',     daysBefore: 21, critical: true,  evidenceRequired: true,  evidenceKind: 'document', ownerHint: 'vendor' },
    { key: 'show_callbacks',  label: 'Cue sheet / show callbacks', daysBefore: 7, critical: true, evidenceRequired: true, evidenceKind: 'document', ownerHint: 'planner' },
    { key: 'on_site_tech',    label: 'On-site tech / operator', daysBefore: 14, critical: true, evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'breakdown_time',  label: 'Breakdown / strike time', daysBefore: 14, critical: false, evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'payment_terms',   label: 'Payment terms',          daysBefore: 30, critical: false, evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor' },
  ],
  requiredConfirmations: ['arrival_time', 'setup_window', 'power_plan', 'gear_list', 'show_callbacks', 'on_site_tech'],
  evidenceNeeded:        ['gear_list', 'show_callbacks', 'payment_terms'],
  typicalDeadlines: [
    { key: 'gear_list',     daysBefore: 21 },
    { key: 'setup_window',  daysBefore: 14 },
    { key: 'power_plan',    daysBefore: 14 },
    { key: 'show_callbacks', daysBefore: 7 },
    { key: 'arrival_time',  daysBefore: 7 },
  ],
  dayOfReadinessChecks: [
    'Power plan signed off with venue',
    'Cue sheet shared with DJ/officiant/host',
    'On-site tech identified and reachable',
  ],
  commonRisks: [
    'Power requirements exceed venue circuit (blown breaker).',
    'No cue sheet — show callbacks improvised.',
    'Strike runs past venue cleanup deadline.',
  ],
  questionsToAsk: [
    ASKS.arrivalTime,
    'What setup window do you need, and is it inside venue access?',
    'What power do you need from the venue?',
    'Who is the on-site tech, and can they call cues from a printed sheet?',
  ],
  briefSections: ['arrival_time', 'setup_window', 'power_plan', 'gear_list', 'show_callbacks', 'on_site_tech'],
  runOfShowDependencies: ['arrival_time', 'setup_window', 'show_callbacks', 'breakdown_time'],
  whyItMattersByField: {
    power_plan:    'Without a venue-signed power plan, gear blows a breaker mid-show.',
    show_callbacks: 'A printed cue sheet is the difference between a smooth ceremony and an improvised one.',
    on_site_tech:  'An on-site operator is the only person who can fix a mid-show problem.',
  },
};

// ──────────────────────────────────────────────────────────────────────────
// 11. Security
// ──────────────────────────────────────────────────────────────────────────
const SECURITY = {
  categoryKey: 'security',
  displayName: 'Security',
  plainDescription:
    'Security teams handle access control, crowd flow, and escalation. Their headcount and posts depend on event size, venue layout, and rules.',
  commonPromises: [
    { key: 'guard_count',     label: 'Guard count',            daysBefore: 14, critical: true,  evidenceRequired: true,  evidenceKind: 'count', ownerHint: 'planner' },
    { key: 'arrival_time',    label: 'Arrival time',           daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'post_assignments', label: 'Post assignments',      daysBefore: 7,  critical: true,  evidenceRequired: true,  evidenceKind: 'document', ownerHint: 'planner' },
    { key: 'access_list',     label: 'Access / VIP list',      daysBefore: 7,  critical: true,  evidenceRequired: true,  evidenceKind: 'document', ownerHint: 'planner' },
    { key: 'escalation_plan', label: 'Escalation plan',        daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'uniform',         label: 'Uniform / appearance code', daysBefore: 14, critical: false, evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'payment_terms',   label: 'Payment terms',          daysBefore: 30, critical: false, evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor' },
  ],
  requiredConfirmations: ['guard_count', 'arrival_time', 'post_assignments', 'access_list', 'escalation_plan'],
  evidenceNeeded:        ['guard_count', 'post_assignments', 'access_list', 'payment_terms'],
  typicalDeadlines: [
    { key: 'guard_count',      daysBefore: 14 },
    { key: 'post_assignments', daysBefore: 7 },
    { key: 'access_list',      daysBefore: 7 },
    { key: 'arrival_time',     daysBefore: 7 },
  ],
  dayOfReadinessChecks: [
    'Headcount matches venue requirement',
    'Access list distributed to all posts',
    'Escalation contact reachable',
  ],
  commonRisks: [
    'Headcount below venue requirement — gates left unstaffed.',
    'No access list — VIPs delayed at door.',
    'No escalation plan — incidents handled ad-hoc.',
  ],
  questionsToAsk: [
    'How many guards will be on site, and where will they be posted?',
    'How do you handle an access list and VIP arrivals?',
    'What is your escalation plan for incidents?',
  ],
  briefSections: ['guard_count', 'arrival_time', 'post_assignments', 'access_list', 'escalation_plan'],
  runOfShowDependencies: ['arrival_time'],
  whyItMattersByField: {
    guard_count:      'Headcount below venue requirement leaves gates unstaffed.',
    access_list:      'No access list means VIPs and family wait at the door while strangers are sorted.',
    escalation_plan:  'Without a written escalation plan, incidents are handled ad-hoc and unevenly.',
  },
};

// ──────────────────────────────────────────────────────────────────────────
// 12. Staffing
// ──────────────────────────────────────────────────────────────────────────
const STAFFING = {
  categoryKey: 'staffing',
  displayName: 'Staffing (servers, attendants, coordinators)',
  plainDescription:
    'Staffing agencies provide servers, attendants, parking valets, coat-check, and floor staff. Their headcount + roles drive service quality.',
  commonPromises: [
    { key: 'staff_count',     label: 'Staff count',            daysBefore: 14, critical: true,  evidenceRequired: true,  evidenceKind: 'count', ownerHint: 'planner' },
    { key: 'role_breakdown',  label: 'Role breakdown (servers, valets, coat-check)', daysBefore: 14, critical: true, evidenceRequired: true, evidenceKind: 'document', ownerHint: 'planner' },
    { key: 'arrival_time',    label: 'Arrival time',           daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'shift_schedule',  label: 'Shift schedule',         daysBefore: 7,  critical: true,  evidenceRequired: true,  evidenceKind: 'document', ownerHint: 'vendor' },
    { key: 'uniform',         label: 'Uniform / appearance code', daysBefore: 14, critical: false, evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'lead_contact',    label: 'On-site lead contact',   daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'payment_terms',   label: 'Payment terms',          daysBefore: 30, critical: false, evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor' },
  ],
  requiredConfirmations: ['staff_count', 'role_breakdown', 'arrival_time', 'shift_schedule', 'lead_contact'],
  evidenceNeeded:        ['staff_count', 'role_breakdown', 'shift_schedule', 'payment_terms'],
  typicalDeadlines: [
    { key: 'staff_count',    daysBefore: 14 },
    { key: 'role_breakdown', daysBefore: 14 },
    { key: 'arrival_time',   daysBefore: 7 },
    { key: 'shift_schedule', daysBefore: 7 },
  ],
  dayOfReadinessChecks: [
    'Staff count matches event size',
    'Role breakdown matches schedule',
    'Lead on site and reachable',
  ],
  commonRisks: [
    'Understaffed — guests wait at bar / coat-check.',
    'No lead contact — server questions escalate to planner.',
    'Late arrival — service starts behind.',
  ],
  questionsToAsk: [
    'How many staff are on the manifest, and what roles?',
    'When do they arrive and what is the shift schedule?',
    'Who is the on-site lead, and how do we reach them?',
  ],
  briefSections: ['staff_count', 'role_breakdown', 'arrival_time', 'shift_schedule', 'lead_contact'],
  runOfShowDependencies: ['arrival_time', 'shift_schedule'],
  whyItMattersByField: {
    staff_count:   'Understaffing creates long waits at the bar, coat-check, and food stations.',
    role_breakdown: 'Roles drive who-does-what at each station, not just headcount.',
    lead_contact:   'A real on-site lead absorbs questions that would otherwise reach the planner.',
  },
};

// ──────────────────────────────────────────────────────────────────────────
// 13. Other (fallback)
// ──────────────────────────────────────────────────────────────────────────
const OTHER = {
  categoryKey: 'other',
  displayName: 'Other',
  plainDescription:
    'A generic vendor playbook — use this when the vendor doesn\'t fit a specialized category. Confirmations focus on the universal basics.',
  commonPromises: [
    { key: 'arrival_time',     label: 'Arrival time',           daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'scope_confirmed',  label: 'Scope of services confirmed', daysBefore: 30, critical: true, evidenceRequired: true, evidenceKind: 'contract', ownerHint: 'vendor' },
    { key: 'day_of_contact',   label: 'Day-of contact',         daysBefore: 7,  critical: true,  evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'load_in_plan',     label: 'Load-in plan',           daysBefore: 7,  critical: false, evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'cleanup',          label: 'Cleanup responsibility', daysBefore: 14, critical: false, evidenceRequired: false, ownerHint: 'vendor' },
    { key: 'payment_terms',    label: 'Payment terms',          daysBefore: 30, critical: false, evidenceRequired: true,  evidenceKind: 'contract', ownerHint: 'vendor' },
  ],
  requiredConfirmations: ['arrival_time', 'scope_confirmed', 'day_of_contact'],
  evidenceNeeded:        ['scope_confirmed', 'payment_terms'],
  typicalDeadlines: [
    { key: 'scope_confirmed', daysBefore: 30 },
    { key: 'arrival_time',    daysBefore: 7 },
    { key: 'day_of_contact',  daysBefore: 7 },
  ],
  dayOfReadinessChecks: [
    'Scope and arrival time confirmed',
    'Day-of contact reachable',
  ],
  commonRisks: [
    'Scope creep with no contract update.',
    COMMON_RISK_PRESETS.missingContact,
  ],
  questionsToAsk: [
    ASKS.arrivalTime,
    'Can you confirm the full scope of services for the event?',
    'Who is the day-of contact?',
  ],
  briefSections: ['arrival_time', 'scope_confirmed', 'day_of_contact', 'cleanup'],
  runOfShowDependencies: ['arrival_time'],
  whyItMattersByField: {
    scope_confirmed: 'Without a confirmed scope, vendor expectations drift and surprise the invoice.',
    day_of_contact:  'A real contact unblocks the planner from being everyone\'s switchboard.',
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Registry + lookup
// ──────────────────────────────────────────────────────────────────────────
export const PLAYBOOKS = {
  venue:            VENUE,
  catering:         CATERING,
  photo_video:      PHOTO_VIDEO,
  dj_entertainment: DJ_ENT,
  florist_decor:    FLORIST,
  rentals:          RENTALS,
  transportation:   TRANSPORTATION,
  hair_makeup:      HAIR_MAKEUP,
  officiant:        OFFICIANT,
  av_production:    AV_PRODUCTION,
  security:         SECURITY,
  staffing:         STAFFING,
  other:            OTHER,
};

// Loose category-string → key normalization. Lets the helpers accept the
// `vendor.category` strings the existing app already writes ("Florals",
// "Catering", "DJ", etc.) without forcing a migration.
const CATEGORY_ALIASES = {
  venue:            ['venue', 'venues'],
  catering:         ['catering', 'caterer', 'caterers', 'food', 'banquet'],
  photo_video:      ['photo', 'photography', 'photographer', 'videographer', 'video', 'photo/video', 'photo + video', 'photo_video'],
  dj_entertainment: ['dj', 'entertainment', 'band', 'musician', 'music', 'live music', 'dj/entertainment', 'dj_entertainment'],
  florist_decor:    ['florist', 'florals', 'floral', 'flowers', 'decor', 'florist_decor'],
  rentals:          ['rentals', 'rental', 'tables & chairs', 'tent'],
  transportation:   ['transportation', 'transport', 'shuttle', 'limo', 'limousine'],
  hair_makeup:      ['hair_makeup', 'hair / makeup', 'hair/makeup', 'hair', 'makeup', 'beauty', 'hmu'],
  officiant:        ['officiant', 'celebrant', 'minister', 'pastor'],
  av_production:    ['av', 'av production', 'av/production', 'production', 'sound', 'lighting', 'av_production'],
  security:         ['security', 'guards'],
  staffing:         ['staffing', 'servers', 'valet', 'attendants', 'coordinator', 'coordinators'],
  other:            ['other', 'misc', 'miscellaneous'],
};

/**
 * Normalize a free-form vendor.category string to a playbook key.
 * Returns 'other' when no match.
 */
export function normalizeCategory(input) {
  if (!input || typeof input !== 'string') return 'other';
  const s = input.trim().toLowerCase();
  if (PLAYBOOKS[s]) return s;
  for (const [key, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some(a => a === s || s.includes(a))) return key;
  }
  return 'other';
}

/**
 * Public lookup.
 * @param {string} categoryOrKey
 * @returns {Playbook}
 */
export function getVendorPlaybook(categoryOrKey) {
  const key = normalizeCategory(categoryOrKey);
  return PLAYBOOKS[key] || PLAYBOOKS.other;
}

export const PLAYBOOK_KEYS = Object.keys(PLAYBOOKS);
