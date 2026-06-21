// Conference / Summit — Event OS host playbook (data only).
//
// A multi-day professional conference / summit: vendor-heavy, multi-track,
// large general session + breakout tracks + an expo floor. Registered under
// the canonical 'Conference' type (corporate family). The host here is the
// MEETINGS-OPERATIONS lead (PCMA/MPI lens) running a producer-grade show, not
// a home host. The weight is in DECISIONS, a long MILESTONE runway (venue +
// date book a year+ out), a RICH vendor section (venue/AV/catering/registration/
// speakers), and RISKS (the keynote-stage failure is the worst outcome).
//
// F&B is via the venue/BEO (Banquet Event Order), so per-guest groceries are
// intentionally MINIMAL — only the things the host actually buys/prints
// (badges, lanyards, signage, swag, programs). Catering quantities live in
// vendors + schedules as BEO guidance (e.g. ~1 gal coffee/20 over a morning,
// refresh breaks every 90 min). Authored honestly and labeled `synthesized`
// (PCMA/MPI/BizBash trade consensus) until a verification pass attaches
// citations. ESM default export.

const conference = {
  type: 'Conference',
  solveFamily: 'corporate',
  family: 'corporate',
  recordKind: 'client',
  version: '1.0.0',
  meta: {
    summary: 'A multi-day professional conference / summit. Vendor-led: most spend is venue + AV/production + F&B (via BEOs). General session + breakout tracks + an expo floor, registration/check-in desk, badges/wayfinding, a hotel room block + shuttles, and a producer-grade run-of-show. The playbook front-loads the venue + date (books a year+ out) and keynote-speaker acquisition, then drives the long runway down to show-call and rehearsal.',
    typicalGuests: { low: 50, default: 200, high: 1000 },
    typicalDurationHours: 24,
    leadTimeDays: 180,
    hostDifficulty: 'high',
    perGuestCost: { low: 150, high: 800, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The keynote lands and the room is genuinely still — no phones, no side conversations.',
    'A speaker says the thing that shifts how someone thinks about their work.',
    'Two strangers meet in the hallway between sessions and end up starting something.',
    'The closing moment — people leave with more than they came with.',
  ],

  decisions: [
    { id: 'format', label: 'In-person, hybrid, or virtual?', options: ['In-person only', 'Hybrid (in-person + streamed)', 'Virtual only'], default: 'In-person only', when: 'T-180d', blocks: ['vendors', 'av_production', 'registration'], why: 'The single biggest scope lever. Hybrid roughly doubles the AV/production line (capture, streaming, a virtual platform, a remote-moderator workflow) and changes registration + sponsor packages.' },
    { id: 'tracks', label: 'Single-track or multi-track agenda?', options: ['Single track (one room)', 'Two tracks', 'Multi-track (3+ breakouts)'], default: 'Multi-track (3+ breakouts)', when: 'T-150d', blocks: ['agenda', 'venue_rooms', 'av_production'], why: 'Drives how many breakout rooms you contract, how many AV kits + techs you need, and the room-set / turnover plan. Multi-track multiplies AV and signage.' },
    { id: 'ticketing', label: 'Ticketed (paid) or free registration?', options: ['Paid / ticketed', 'Free (sponsor-funded)', 'Invite-only / comped'], default: 'Paid / ticketed', when: 'T-150d', blocks: ['registration', 'budget_model'], why: 'Sets the registration platform, payment/ticketing flow, refund policy, and the no-show buffer you build into the F&B guarantee.' },
    { id: 'sponsor_model', label: 'Sponsor / exhibitor model', options: ['Tiered sponsorships (Gold/Silver/Bronze)', 'Expo booths only', 'Sponsorships + expo floor', 'No sponsors'], default: 'Sponsorships + expo floor', when: 'T-150d', blocks: ['expo_floor', 'budget_model', 'signage'], why: 'Often the largest revenue line for a conference. Sets the prospectus, the expo floor plan, booth inventory, and what each tier gets (logo placement, stage time, badge scans).' },
    { id: 'room_block', label: 'Hotel room block + shuttle plan', options: ['Headquarter hotel block + shuttles', 'Multiple hotel blocks', 'Venue-attached hotel (no shuttle)', 'No block (attendees self-book)'], default: 'Headquarter hotel block + shuttles', when: 'T-150d', blocks: ['transport', 'attrition_clause'], why: 'A room block carries an attrition clause — unsold rooms can bill back to you. Drives shuttle routing/timing and the comp-room math in your contract.' },
  ],

  milestones: [
    { id: 'conf_venue', name: 'Book venue + lock dates (RFP, site visit, contract)', offsetDays: 180, owner: 'host', category: 'planning', risk: { ifDelayed: 'Preferred dates/venue gone; forced into worse space, higher rate, or a city move', severity: 'high' } },
    { id: 'conf_budget_theme', name: 'Set budget, theme, and program framework', offsetDays: 165, owner: 'host', dependsOn: ['conf_venue'], category: 'planning', risk: { ifDelayed: 'Sponsor prospectus + speaker outreach stall waiting on the theme', severity: 'med' } },
    { id: 'conf_keynotes', name: 'Secure keynote / general-session speakers', offsetDays: 150, owner: 'host', dependsOn: ['conf_budget_theme'], category: 'program', risk: { ifDelayed: 'Top-tier keynotes book out months ahead; you lose the marquee name that sells tickets', severity: 'high' } },
    { id: 'conf_sponsors', name: 'Launch sponsor/exhibitor prospectus + sales', offsetDays: 150, owner: 'host', dependsOn: ['conf_budget_theme'], category: 'sponsorship', risk: { ifDelayed: 'Sponsor revenue (often the biggest line) comes in short; budget gap', severity: 'high' } },
    { id: 'conf_registration', name: 'Stand up registration platform + open ticket sales', offsetDays: 120, owner: 'host', dependsOn: ['conf_budget_theme'], category: 'registration', risk: { ifDelayed: 'Late open compresses the sales window; early-bird momentum lost', severity: 'high' } },
    { id: 'conf_agenda', name: 'Build agenda + breakout tracks; recruit session speakers', offsetDays: 120, owner: 'host', dependsOn: ['conf_keynotes'], category: 'program', risk: { ifDelayed: 'Marketing has nothing concrete to sell; track rooms can\'t be set', severity: 'med' } },
    { id: 'conf_av', name: 'Contract AV / production partner; design stage + room sets', offsetDays: 90, owner: 'producer', dependsOn: ['conf_venue', 'conf_tracks'], category: 'production', risk: { ifDelayed: 'Best AV crews booked; rushed stage design; weak general-session experience', severity: 'high' } },
    { id: 'conf_roomblock', name: 'Confirm hotel room block + shuttle contract', offsetDays: 90, owner: 'host', dependsOn: ['conf_venue'], category: 'logistics', risk: { ifDelayed: 'Block sells out or attrition terms unmanaged; attendees stranded for rooms', severity: 'med' } },
    { id: 'conf_marketing', name: 'Marketing push + speaker promotion + early-bird deadline', offsetDays: 60, owner: 'host', dependsOn: ['conf_agenda', 'conf_registration'], category: 'marketing', risk: { ifDelayed: 'Registration curve flat; revenue + headcount fall short', severity: 'high' } },
    { id: 'conf_beo', name: 'Finalize F&B / BEOs (breaks, lunches, reception)', offsetDays: 45, owner: 'host', dependsOn: ['conf_venue', 'conf_registration'], category: 'catering', risk: { ifDelayed: 'Menu/room sets locked late; venue can\'t guarantee headcount pricing', severity: 'med' } },
    { id: 'conf_print', name: 'Order badges, lanyards, signage, swag, printed programs', offsetDays: 30, owner: 'host', dependsOn: ['conf_agenda', 'conf_sponsors'], category: 'production', risk: { ifDelayed: 'Print lead times missed; no badges/signage at the door', severity: 'high' } },
    { id: 'conf_app_comms', name: 'Launch attendee app + know-before-you-go comms', offsetDays: 14, owner: 'host', dependsOn: ['conf_agenda'], category: 'comms', risk: { ifDelayed: 'Attendees arrive without schedule/wayfinding; help desk swamped', severity: 'med' } },
    { id: 'conf_guarantee', name: 'Submit final headcount guarantee to venue/caterer', offsetDays: 7, owner: 'host', dependsOn: ['conf_beo', 'conf_registration'], category: 'catering', risk: { ifDelayed: 'You pay on a wrong number — over-cater (waste) or under-cater (shortfall)', severity: 'high' } },
    { id: 'conf_rehearsal', name: 'Speaker rehearsals + full tech check / dry run on stage', offsetDays: 1, owner: 'producer', dependsOn: ['conf_av', 'conf_print'], category: 'production', risk: { ifDelayed: 'Cues unrehearsed; the general-session/keynote failure mode goes uncaught', severity: 'high' } },
    { id: 'event', name: 'Conference days (show-call the run-of-show)', offsetDays: 0, owner: 'producer', dependsOn: ['conf_rehearsal', 'conf_guarantee', 'conf_app_comms'], category: 'event', risk: { ifDelayed: 'n/a', severity: 'low' } },
  ],

  tasks: [
    { id: 't_rfp', milestoneId: 'conf_venue', phase: 'planning', label: 'Issue venue RFP, run site visits, negotiate + sign contract (watch attrition + F&B minimums)', when: 'T-180d' },
    { id: 't_keynote', milestoneId: 'conf_keynotes', phase: 'program', label: 'Shortlist + contract keynotes via bureau/direct; lock fees, travel, AV rider', when: 'T-150d' },
    { id: 't_prospectus', milestoneId: 'conf_sponsors', phase: 'sponsorship', label: 'Build tiered prospectus + expo floor plan; open sponsor/exhibitor sales', when: 'T-150d' },
    { id: 't_reg_open', milestoneId: 'conf_registration', phase: 'registration', label: 'Configure registration platform, ticket types, payment + refund policy; open early-bird', when: 'T-120d' },
    { id: 't_tracks', milestoneId: 'conf_agenda', phase: 'program', label: 'Build multi-track agenda; recruit session speakers; assign rooms + room sets', when: 'T-120d' },
    { id: 't_av_design', milestoneId: 'conf_av', phase: 'production', label: 'Contract AV/production; design general-session stage, screens, and per-track kits', when: 'T-90d' },
    { id: 't_beo', milestoneId: 'conf_beo', phase: 'catering', label: 'Finalize BEOs: breaks (coffee/tea refresh every ~90 min), plated/buffet lunches, reception bar', when: 'T-45d' },
    { id: 't_print_order', milestoneId: 'conf_print', phase: 'production', label: 'Order badges + lanyards, directional + wayfinding signage, sponsor signage, swag, programs', when: 'T-30d' },
    { id: 't_app', milestoneId: 'conf_app_comms', phase: 'comms', label: 'Publish attendee app/agenda; send know-before-you-go (parking, check-in, wifi, map)', when: 'T-14d' },
    { id: 't_guarantee', milestoneId: 'conf_guarantee', phase: 'catering', label: 'Lock final headcount guarantee + set counts per room/function to the venue', when: 'T-7d' },
    { id: 't_rehearse', milestoneId: 'conf_rehearsal', phase: 'production', label: 'Walk every speaker on stage; mic/slide/clicker check; producer dry-runs the show cues', when: 'T-1d' },
    { id: 't_showcall', milestoneId: 'event', phase: 'event', label: 'Open registration desk; show-call general session; manage track turnovers, breaks, expo, reception', when: 'T0' },
    { id: 't_survey', milestoneId: 'event', phase: 'cleanup', label: 'Send post-event survey; reconcile vendor invoices + sponsor deliverables; debrief', when: 'T0 +2d' },
  ],

  purchases: [
    { id: 'p_badges', item: 'Attendee badges + lanyards', category: 'logistics', qtyPerGuest: 1, unit: 'badge', where: ['Registration vendor', 'Print shop', 'Amazon'], unitCostRange: [1.5, 5], essential: true, buyAt: 'T-3d', note: 'Order ~10% over final count for walk-ins, reprints, staff, and VIP/speaker ribbons.' },
    { id: 'p_signage', item: 'Directional + wayfinding signage (foam board, banners, room cards)', category: 'decor', qtyFlat: 1, unit: 'sign package', where: ['Sign/print shop'], unitCostRange: [800, 4000], essential: true, buyAt: 'T-3d', note: 'Scales with venue size + track count: arrivals, registration, each breakout room, expo, restrooms.' },
    { id: 'p_programs', item: 'Printed programs / pocket agenda', category: 'logistics', qtyPerGuest: 1, unit: 'program', where: ['Print shop'], unitCostRange: [1, 4], essential: false, buyAt: 'T-3d', note: 'Often replaced by the attendee app; print a short pocket card or signage if going app-only.' },
    { id: 'p_swag', item: 'Swag bags + contents (notebook, pen, water bottle)', category: 'logistics', qtyPerGuest: 1, unit: 'bag', where: ['Promo vendor', 'Sponsor-supplied'], unitCostRange: [5, 25], essential: false, buyAt: 'T-3d', note: 'Frequently sponsor-funded or sponsor-branded; confirm who pays + who fills the bags.' },
    { id: 'p_reg_supplies', item: 'Registration desk kit (printers, scanners, badge stock, signage, supplies)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Registration vendor', 'Office supply'], unitCostRange: [300, 1500], essential: true, buyAt: 'T-1d', note: 'On-site badge printing, scanners, power strips, extension cords, gaff tape, sharpies, scissors.' },
    { id: 'p_water_stage', item: 'Speaker/stage hospitality (bottled water, throat lozenges, stage snacks)', category: 'beverage', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Venue F&B'], unitCostRange: [40, 150], essential: false, buyAt: 'T-1d', note: 'Green-room + stage water for speakers; most attendee F&B is on the BEO, not bought.' },
    { id: 'p_signage_blanks', item: 'Blank tent cards, name plates, easels, table numbers', category: 'decor', qtyFlat: 1, unit: 'set', where: ['Office supply', 'Party store'], unitCostRange: [50, 250], essential: false, buyAt: 'T-1d', note: 'Head-table / panel name tents and breakout room reserved-seat cards.' },
  ],

  rentalsGap: [
    { item: 'General-session staging + lectern', qtyFlat: 1, note: 'Stage deck, riser, lectern, confidence monitor — usually on the AV/production contract.' },
    { item: 'Breakout room AV kits (projector/screen, mics, switcher)', qtyPerGuest: 0.005, note: 'Roughly one kit per breakout room; multiply by track/room count, not headcount.' },
    { item: 'Pipe-and-drape + expo booths', qtyFlat: 1, note: 'Booth inventory + drape for the expo floor; sized to sponsor/exhibitor count.' },
    { item: 'Registration counters + back-wall signage', qtyFlat: 1, note: 'Counters scale with peak arrival rate — plan ~1 check-in line per 150 attendees.' },
  ],

  vendors: [
    { category: 'Venue / convention center', required: true, altToDIY: 'No DIY — the venue is the show; book first, a year+ out', when: 'T-180d', costRange: [20000, 500000], costUnit: 'flat' },
    { category: 'AV / production (stage, screens, audio, lighting, show-calling)', required: true, altToDIY: 'House AV for tiny single-track only; a real general session needs a production partner', when: 'T-90d', costRange: [15000, 300000], costUnit: 'flat' },
    { category: 'Catering / F&B (via venue BEOs — breaks, lunches, reception)', required: true, altToDIY: 'Almost always the in-house/exclusive caterer; outside catering is usually contractually barred', when: 'T-45d', costRange: [60, 250], costUnit: 'per guest' },
    { category: 'Registration / ticketing platform (+ on-site check-in, badge print)', required: true, altToDIY: 'A spreadsheet + manual badges only works under ~75 people', when: 'T-120d', costRange: [2000, 40000], costUnit: 'flat' },
    { category: 'Keynote / featured speakers (fees + travel + AV rider)', required: true, altToDIY: 'Internal/volunteer speakers cut fees but lose the marquee draw', when: 'T-150d', costRange: [5000, 100000], costUnit: 'flat' },
    { category: 'Photographer / videographer (+ session capture for hybrid)', required: false, altToDIY: 'Staff phones for socials; hire for usable keynote + sponsor assets', when: 'T-60d', costRange: [1500, 15000], costUnit: 'flat' },
    { category: 'Security / event staffing (door, bag check, overnight, medical)', required: true, altToDIY: 'Small events lean on venue security; larger need contracted guards + medic', when: 'T-45d', costRange: [2000, 30000], costUnit: 'flat' },
    { category: 'Decorator / staging / scenic + signage production', required: false, altToDIY: 'Skip scenic for utilitarian events; needed for branded general-session look', when: 'T-60d', costRange: [3000, 50000], costUnit: 'flat' },
    { category: 'Transport / shuttles (airport + hotel-to-venue)', required: false, altToDIY: 'Skip if the venue has an attached/walkable hotel; required for spread-out blocks', when: 'T-90d', costRange: [2000, 25000], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_keynote_fail', trigger: 'General-session / keynote AV failure (audio drops, screens dark, no playback) in front of the full room', severity: 'high', mitigation: 'Contract a real production partner; full tech rehearsal at T-1d; redundant audio + backup laptop/clicker; a show-caller on comms; backup speaker content offline.' },
    { id: 'r_speaker_drop', trigger: 'A keynote or major speaker cancels close to the date', severity: 'high', mitigation: 'Signed contracts with cancellation terms; keep a warm backup/moderator; build a panel or pre-recorded fallback for the slot.' },
    { id: 'r_reg_short', trigger: 'Registration / sponsor revenue tracking well below target', severity: 'high', mitigation: 'Open early-bird at T-120d; weekly pacing against goal; reforecast budget at T-60d; trim scope (rooms, scenic, catering tier) if short.' },
    { id: 'r_attrition', trigger: 'Hotel room block under-fills and attrition clause bills back', severity: 'med', mitigation: 'Right-size the block; negotiate a generous attrition % + cutoff; promote the block in every comm; release unsold rooms before the penalty date.' },
    { id: 'r_count_wrong', trigger: 'Final F&B guarantee submitted on a wrong/stale number', severity: 'high', mitigation: 'Reconcile registration vs. guarantee at T-7d; build a no-show buffer; know the venue\'s overset % so you can flex up day-of.' },
    { id: 'r_safety', trigger: 'Medical, security, or evacuation incident with no plan', severity: 'high', mitigation: 'Written emergency + evac plan with venue; on-site medic/first aid; security staffing; accessibility (ADA seating, captioning, ramps) confirmed pre-show.' },
    { id: 'r_print_late', trigger: 'Badges / signage miss their print lead time', severity: 'med', mitigation: 'Order at T-30d; keep on-site badge printing as the fallback; finalize the sign list against the room/track map early.' },
  ],

  contingencies: [
    { id: 'c_keynote_fail', when: 'r_keynote_fail', plan: 'Cut to redundant audio + backup laptop; show-caller fills with the producer\'s offline deck; if total failure, hold the room with the emcee and reset during a moved-up break.' },
    { id: 'c_speaker_drop', when: 'r_speaker_drop', plan: 'Promote the backup/moderator into the slot, convert to a panel, or run pre-recorded content; update the app/agenda push immediately.' },
    { id: 'c_reg_short', when: 'r_reg_short', plan: 'Trigger a flash promo + targeted outreach; reforecast budget; downgrade the catering tier and release contracted rooms/scenic to protect margin.' },
    { id: 'c_count_wrong', when: 'r_count_wrong', plan: 'Work the venue overset buffer for day-of flex-up; for over-count, redirect surplus break F&B to the next function rather than re-ordering.' },
    { id: 'c_safety', when: 'r_safety', plan: 'Execute the venue emergency plan; medic + security to the incident; the show-caller pauses/holds the room and communicates via app + PA.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-30d', what: 'Order badges + lanyards, signage/wayfinding package, swag, printed programs (mind print lead times)' },
      { when: 'T-3d', what: 'Pick up signage + badges; assemble swag bags; stage the registration desk kit' },
      { when: 'T-1d', what: 'Registration supplies (printers, scanners, power), stage/speaker water, name tents' },
    ],
    preparation: [
      { when: 'T-45d', what: 'Finalize BEOs: break refreshes (~1 gal coffee/20 over a morning, refresh ~every 90 min), lunches, reception bar' },
      { when: 'T-14d', what: 'Publish attendee app + agenda; send know-before-you-go; confirm shuttle schedule' },
      { when: 'T-7d', what: 'Submit final headcount guarantee + per-function counts; confirm room sets + turnovers with venue' },
    ],
    setup: [
      { when: 'T-1d', what: 'Load-in AV; build general-session stage + screens; set breakout rooms; build registration desk + expo floor; place signage' },
      { when: 'T-1d PM', what: 'Speaker rehearsals + full tech check / dry run; producer walks the run-of-show cues end to end' },
      { when: 'T0 -2h', what: 'Open registration/check-in desk; sound check; verify break stations + first F&B; brief staff + volunteers' },
    ],
    cleanup: [
      { when: 'during', what: 'Run the run-of-show: show-call general session, manage track turnovers, breaks, expo, and reception each day' },
      { when: 'T0 +0h', what: 'Tear down AV + expo; return rentals; collect lost-and-found; reconcile on-site badge/registration data' },
      { when: 'T0 +2d', what: 'Send post-event survey; reconcile vendor invoices; verify sponsor deliverables; debrief + capture lessons for next year' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'This is a vendor-led event: the overwhelming majority of spend is venue + AV/production + F&B (via BEOs), so per-guest groceries are intentionally minimal and limited to what the host actually buys/prints (badges, lanyards, signage, swag, programs). The runway, ratios, and sequencing reflect PCMA/MPI meetings-operations consensus and BizBash-style trade practice: venue + dates book a year+ out (modeled here at a ~180-day default lead), keynotes book early, registration opens with early-bird at ~T-120d, BEOs finalize ~T-45d with the final headcount guarantee at ~T-7d, and break F&B plans around ~1 gallon of coffee per ~20 attendees over a morning with refreshes roughly every 90 minutes. The worst failure mode is a general-session/keynote AV failure, which a real production partner plus a T-1d full tech rehearsal exists to prevent. Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default conference;
