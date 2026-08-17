// Corporate Board Meeting — Event OS host playbook (data only).
//
// A small, formal, HIGH-STAKES governance meeting run by an internal
// coordinator (EA / chief of staff / board secretary) for leadership. The
// host is NOT cooking — the weight is in the AGENDA + board packet,
// QUORUM/RSVPs, a reliable HYBRID/AV setup, confidentiality/NDA + secure
// document handling, MINUTES + action-item tracking, and light catering.
// Lens: internal-events / EA-ops leader + a PCMA/MPI meetings-operations pro.
// "offsetDays" are POSITIVE = days before the meeting. Authored honestly
// against widely-published governance/meetings practice and labeled
// `synthesized` until a foreground verification pass attaches citations.
// ESM default export.

const boardMeeting = {
  type: 'Board Meeting',
  solveFamily: 'board',
  family: 'corporate',
  recordKind: 'client',
  version: '1.0.0',
  meta: {
    summary: 'A small, formal, high-stakes corporate board meeting run by an internal coordinator (EA / chief of staff / board secretary) for leadership. Success is governance, not hospitality: a distributed agenda + board packet, confirmed quorum, a hybrid/AV setup that does not fail, secure document handling, and clean minutes with tracked action items. Catering is light — coffee/breakfast or a working lunch, never a party.',
    typicalGuests: { low: 5, default: 10, high: 20 },
    typicalDurationHours: 3,
    leadTimeDays: 30,
    hostDifficulty: 'hard',
    perGuestCost: { low: 25, high: 75, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The agenda lands on time and every member is actually prepared.',
    'The vote is clean — quorum confirmed, motion carried, minutes will be accurate.',
    'The one hard item gets decided, not deferred again.',
    'The meeting ends early because everything was handled before anyone walked in.',
  ],

  decisions: [
    { id: 'format', label: 'Meeting format', options: ['In-person', 'Hybrid (in-person + remote)', 'Fully virtual'], default: 'Hybrid (in-person + remote)', when: 'T-30d', blocks: ['av', 'catering', 'access'], weight: 'high', reversibility: 'costly', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Every downstream booking — the room, the AV, the catering, the badges — hangs on this call, and hybrid is the setup most likely to fail live, so decide it early enough to test.', tier: 'reasoned' }, why: 'Drives the entire logistics chain — room + AV + catering + parking/badges vs. a video platform + secure remote distribution. Hybrid is the modern default and also the #1 day-of failure point, so it must be decided early enough to test.' },
    { id: 'materials_format', label: 'Board materials format', options: ['Secure board portal (digital)', 'Printed packets (numbered, collected)', 'Hybrid: portal + a few printed'], default: 'Secure board portal (digital)', when: 'T-21d', blocks: ['packet', 'confidentiality'], weight: 'high', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'This sets the whole confidentiality workflow for legal governance material — access control, an audit trail, and whether printed copies get numbered and collected.', tier: 'reasoned' }, why: 'Confidential governance material. A secure portal gives access control + audit trail; printed packets must be numbered and collected. This choice sets the whole document-handling and confidentiality workflow.' },
    { id: 'minutes_owner', label: 'Who takes the minutes', options: ['Board secretary', 'Corporate counsel / paralegal', 'EA / chief of staff', 'Professional minute-taker'], default: 'Board secretary', when: 'T-21d', blocks: ['minutes'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'The minutes are the legal record, so naming who writes them — someone free of voting or facilitation duties — is a real call, and only the org knows who is available.', tier: 'reasoned' }, why: 'Minutes are the legal record and may surface in litigation or books-and-records demands. The note-taker must be designated in advance, free of voting/facilitation duties, and briefed on what to capture (motions, votes, action items) vs. omit.' },
    { id: 'catering_level', label: 'Catering level', options: ['Coffee + water only', 'Continental breakfast', 'Working lunch (boxed/buffet)', 'None — directors on their own'], default: 'Coffee + water only', when: 'T-14d', dependsOn: ['format'], blocks: ['catering'], weight: 'low', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Coffee or a working lunch is the lowest-stakes call here — tie it to the meeting length and keep it functional, never festive.', tier: 'reasoned' }, why: 'Keep it functional, not festive. Tie the level to the meeting length and time of day — coffee for a short morning session, a working lunch only if it runs across midday. Over-catering reads wrong for governance.' },
  ],

  milestones: [
    { id: 'bm_schedule', name: 'Confirm date, format, attendees, room/platform', offsetDays: 30, owner: 'coordinator', category: 'planning', risk: { ifDelayed: 'Director calendars fill; no quorum-viable date', severity: 'high' } },
    { id: 'bm_agenda', name: 'Draft agenda with chair; solicit reports from presenters', offsetDays: 21, owner: 'coordinator', dependsOn: ['bm_schedule'], category: 'planning', risk: { ifDelayed: 'Late or missing reports force a thin packet', severity: 'high' } },
    { id: 'bm_logistics', name: 'Book AV/hybrid platform, catering, parking/badges, confidentiality controls', offsetDays: 14, owner: 'coordinator', dependsOn: ['bm_schedule'], category: 'logistics', risk: { ifDelayed: 'No AV tech or visitor access on the day', severity: 'high' } },
    { id: 'bm_packet', name: 'Assemble + distribute board packet (agenda, prior minutes, reports)', offsetDays: 7, owner: 'coordinator', dependsOn: ['bm_agenda'], category: 'documents', risk: { ifDelayed: 'Directors arrive unprepared; decisions slip a quarter', severity: 'high' } },
    { id: 'bm_quorum', name: 'Confirm RSVPs + quorum; send roll-call/dial-in details', offsetDays: 3, owner: 'coordinator', dependsOn: ['bm_packet'], category: 'guest', risk: { ifDelayed: 'No quorum = no binding votes; meeting void', severity: 'high' } },
    { id: 'bm_avtest', name: 'Test the hybrid/AV setup end-to-end (video, screen-share, dial-in)', offsetDays: 1, owner: 'coordinator', dependsOn: ['bm_logistics'], category: 'setup', risk: { ifDelayed: 'AV fails live — the #1 day-of failure', severity: 'high' } },
    { id: 'bm_setup', name: 'Set room: seating, name cards, screens, catering, minute-taker station', offsetDays: 0, owner: 'coordinator', dependsOn: ['bm_avtest', 'bm_packet'], category: 'setup', risk: { ifDelayed: 'Late start; flustered open', severity: 'med' } },
    { id: 'event', name: 'The board meeting', offsetDays: 0, owner: 'coordinator', dependsOn: ['bm_setup'], category: 'event', risk: null },
    { id: 'bm_followup', name: 'Distribute draft minutes + action-item tracker; collect/secure materials', offsetDays: 0, owner: 'coordinator', dependsOn: ['event'], category: 'documents', risk: { ifDelayed: 'Action items stall; minutes go stale before approval', severity: 'med' } },
  ],

  tasks: [
    { id: 't_agenda', milestoneId: 'bm_agenda', phase: 'planning', label: 'Build the agenda with the chair; request reports/decks from each presenter with a hard due date', when: 'T-21d' },
    { id: 't_priorminutes', milestoneId: 'bm_packet', phase: 'documents', label: 'Pull prior-meeting minutes for approval; flag open action items from last time', when: 'T-10d' },
    { id: 't_av_book', milestoneId: 'bm_logistics', phase: 'logistics', label: 'Book AV tech / video platform; confirm screen, dial-in, and a tech-support contact for the day', when: 'T-14d' },
    { id: 't_access', milestoneId: 'bm_logistics', phase: 'logistics', label: 'Arrange parking, visitor badges, and a building/reception access list for external directors', when: 'T-14d' },
    { id: 't_nda', milestoneId: 'bm_logistics', phase: 'documents', label: 'Confirm NDAs/confidentiality on file; set portal permissions or number the printed packets', when: 'T-14d' },
    { id: 't_packet', milestoneId: 'bm_packet', phase: 'documents', label: 'Assemble + distribute the full board packet via the secure portal ~1 week out', when: 'T-7d' },
    { id: 't_quorum', milestoneId: 'bm_quorum', phase: 'guest', label: 'Chase RSVPs, confirm quorum math, send roll-call + dial-in details and any pre-reads', when: 'T-3d' },
    { id: 't_avtest', milestoneId: 'bm_avtest', phase: 'setup', label: 'Dry-run the hybrid setup: join remote, share a slide, test mic/camera/dial-in, check screen visibility for remote directors', when: 'T-1d' },
    { id: 't_setup', milestoneId: 'bm_setup', phase: 'setup', label: 'Set seating + name cards, power/AV at each seat, screens on, catering staged, minute-taker positioned', when: 'T0 -1h' },
    { id: 't_minutes', milestoneId: 'event', phase: 'documents', label: 'Take minutes: record quorum, motions, votes (roll call for remote), and every action item with an owner', when: 'T0' },
    { id: 't_followup', milestoneId: 'bm_followup', phase: 'documents', label: 'Circulate draft minutes + action-item tracker within 48h; collect/shred printed packets or revoke portal access', when: 'T0 +1d' },
  ],

  purchases: [
    { id: 'p_coffee', item: 'Coffee, tea, water service', category: 'beverage', qtyPerGuest: 2, unit: 'servings', where: ['Caterer', 'Office pantry', 'Cafe'], unitCostRange: [2, 5], essential: true, buyAt: 'T-1d', note: 'Baseline hospitality for any in-person session — keep it functional.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['coffee-percup-2026', 'coffeeurn-rental-2026'], lastVerified: '2026-08-16', claim: 'Home-brewed coffee runs about $0.10 a cup for budget store-brand ground; a 40-cup urn rents for $21-22 per event or costs $45-59 to buy outright.', sufficientWhen: 'A current price check on one store-brand ground coffee and one local urn rental confirms the per-cup and per-urn figures.' } },
    { id: 'p_breakfast', item: 'Continental breakfast / working-lunch catering', category: 'food', qtyPerGuest: 1, unit: 'meal', where: ['Caterer', 'Corporate catering', 'Deli'], unitCostRange: [12, 35], essential: false, buyAt: 'T-1d', note: 'Only if the meeting spans a meal — boxed or buffet, governance-appropriate, not a party.' , alternatives: ['Office pantry coffee plus pre-ordered deli sandwich boxes — budget swap', 'Grocery pastry tray — cheaper than corporate catering'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['catering-perperson-2026', 'catering-chefry-2026'], lastVerified: '2026-08-16', claim: 'Per person 2026, drop-off catering (trays, no staff) runs $15-35 in one survey and $15-30 in another, with staffed buffet starting around $25-45. A $12-35 continental breakfast or working lunch sits at and just below the drop-off tier, which is the service level a boardroom meal uses. Caterers typically add an 18-22 percent service charge separate from gratuity.', sufficientWhen: 'Two current drop-off catering quotes per person for a continental breakfast confirm the band.' } },
    { id: 'p_print', item: 'Printed board packets (numbered) + tabbed binders', category: 'logistics', qtyPerGuest: 1, unit: 'packet', where: ['Print shop', 'Office'], unitCostRange: [5, 15], essential: false, buyAt: 'T-1d', note: 'Only if materials_format includes print. Number each copy for confidentiality and collect them after.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_namecards', item: 'Name cards / table tents + agenda printouts', category: 'logistics', qtyPerGuest: 1, unit: 'set', where: ['Office', 'Print shop'], unitCostRange: [0.5, 2], essential: true, buyAt: 'T-1d', note: 'Helps the minute-taker attribute remarks correctly and keeps roll call clean.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_avsupplies', item: 'AV consumables (HDMI/USB-C adapters, spare batteries, clicker, extension cords)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Office', 'Electronics store', 'Amazon'], unitCostRange: [20, 60], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: the adapter that connects a presenter laptop to the room screen is the classic last-minute scramble.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_notepads', item: 'Notepads, pens, sticky flags for directors', category: 'logistics', qtyPerGuest: 1, unit: 'set', where: ['Office supply'], unitCostRange: [1, 3], essential: false, buyAt: 'T-3d' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_cleanup', item: 'Catering cleanup + secure shredding/disposal supplies', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Office', 'Facilities'], unitCostRange: [5, 15], essential: true, buyAt: 'T-3d', note: 'Confidential printed materials must be shredded, not tossed.' , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
  ],

  rentalsGap: [
    { item: 'Conference room with reliable video conferencing + room display', qtyFlat: 1, note: 'The room IS the venue — must support hybrid: camera, mics that pick up the whole table, a screen remote directors can read.' },
    { item: 'Speakerphone / conference mic array', qtyFlat: 1, note: 'Remote directors must hear and be heard by everyone at once — table-pickup mics, not a single laptop.' },
    { item: 'Backup hotspot / secondary internet', qtyFlat: 1, note: 'A failover for the video feed if house wifi drops mid-meeting.' },
    { item: 'Lockable storage / secure bin for collected packets', qtyFlat: 1, note: 'For confidential printed materials before shredding.' },
  ],

  vendors: [
    { category: 'AV technician / hybrid meeting support', required: true, altToDIY: 'Coordinator runs it solo IF the room AV is simple and pre-tested', when: 'T-14d', costRange: [300, 1200], costUnit: 'flat' },
    { category: 'Corporate catering (coffee / breakfast / working lunch)', required: false, altToDIY: 'Office pantry coffee + pre-ordered deli boxes', when: 'T-14d', costRange: [15, 40], costUnit: 'per guest' },
    { category: 'Secure board portal / document platform', required: false, altToDIY: 'Encrypted shared drive with strict permissions + MFA', when: 'T-21d', costRange: [0, 500], costUnit: 'flat' },
    { category: 'Professional minute-taker / court reporter', required: false, altToDIY: 'Board secretary or counsel takes minutes', when: 'T-14d', costRange: [200, 800], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_av', trigger: 'Hybrid/AV fails — remote directors cannot see, hear, or be heard', severity: 'high', mitigation: 'Dry-run end-to-end the day before; have an AV/tech-support contact on call; keep a dial-in fallback and a backup hotspot.' },
    { id: 'r_quorum', trigger: 'Not enough directors attend to meet quorum', severity: 'high', mitigation: 'Confirm RSVPs at 3 days out against the quorum threshold; offer remote join; if short, reschedule or limit to non-binding discussion.' },
    { id: 'r_packet', trigger: 'Board packet late or incomplete — directors arrive unprepared', severity: 'high', mitigation: 'Hard report deadlines at 10 days out; distribute the full packet ~1 week out; send a reminder pre-read at 3 days out.' },
    { id: 'r_confidential', trigger: 'Confidential materials leaked or left behind', severity: 'high', mitigation: 'Use a permissioned portal with MFA; number printed copies and collect/shred them; confirm NDAs are on file before distribution.' },
    { id: 'r_minutes', trigger: 'No designated minute-taker / votes and action items not captured', severity: 'med', mitigation: 'Assign the minute-taker at 3 weeks out, free of facilitation duties; use roll-call voting so remote votes are recorded by name.' },
    { id: 'r_access', trigger: 'External directors stuck at security/parking, meeting starts late', severity: 'med', mitigation: 'Pre-clear a visitor access list, badges, and parking at 2 weeks out; send directions + a day-of contact with the dial-in details.' },
  ],

  contingencies: [
    { id: 'c_av', when: 'r_av', plan: 'Switch remote directors to the audio dial-in bridge and email the deck so they can follow along; bring in the on-call tech; if the in-room screen dies, share to personal laptops.' },
    { id: 'c_quorum', when: 'r_quorum', plan: 'Add absent directors by phone/video to reach quorum; if still short, proceed as an informational session and defer all binding votes to a reconvened or written-consent action.' },
    { id: 'c_packet', when: 'r_packet', plan: 'Distribute whatever is ready immediately, mark missing items "to follow," and walk the late report live; never delay distribution waiting on one straggler.' },
    { id: 'c_confidential', when: 'r_confidential', plan: 'Revoke portal access immediately, account for every numbered printed copy, and notify counsel if anything is unaccounted for.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'AV consumables kit (adapters, clicker, cords), notepads/pens, cleanup + shredding supplies' },
      { when: 'T-1d', what: 'Coffee/catering confirmation, printed packets (if any), name cards + agenda printouts' },
      { when: 'T0', what: 'Day-of catering delivery + any last-minute printouts' },
    ],
    preparation: [
      { when: 'T-7d', what: 'Assemble + distribute the board packet via the secure portal' },
      { when: 'T-3d', what: 'Confirm quorum/RSVPs; send roll-call + dial-in details and pre-reads' },
      { when: 'T-1d', what: 'End-to-end AV/hybrid dry run; confirm catering, parking, and badges' },
    ],
    setup: [
      { when: 'T0 -4h', what: 'Confirm quorum by reply; chase anyone who hasn’t answered' },
      { when: 'T0 -3h', what: 'Print or repost the packet; test the video bridge and the screen-share end to end' },
      { when: 'T0 -1h', what: 'Set seating + name cards, power/AV at each seat, screens on, minute-taker station ready' },
      { when: 'T0 -30m', what: 'Stage catering, open the video bridge, admit remote directors, verify screen-share is visible to them' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Call to order; confirm quorum and note it' },
      { when: 'T0 +10m', what: 'Approve the prior minutes; flag open action items' },
      { when: 'T0 +25m', what: 'Reports: each presenter to their allotted minutes' },
      { when: 'T0 +1:15', what: 'Main business — the item this meeting exists for' },
      { when: 'T0 +2h', what: 'Votes taken and recorded, with abstentions named' },
      { when: 'T0 +2:30', what: 'New business and the date of the next meeting' },
      { when: 'T0 +2:45', what: 'Adjourn; minutes drafted while it’s fresh' },
    ],
    cleanup: [
      { when: 'during', what: 'Minute-taker logs motions, votes (roll call), and action items live; coordinator monitors the remote feed' },
      { when: 'T0 +1h', what: 'Collect + secure/shred printed packets, revoke portal access as needed, clear catering' },
      { when: 'T0 +1d', what: 'Distribute draft minutes + action-item tracker within 48h for review and next-meeting approval' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Timelines and practices reflect widely-published corporate governance and meetings-operations guidance: agendas drafted with the chair ~3 weeks out, board packets assembled and distributed roughly one week before the meeting (commonly 7-10 days), quorum confirmed against the bylaw threshold before any binding vote, roll-call voting for hybrid/remote participation, a designated minute-taker free of facilitation duties, confidentiality enforced via permissioned portals with MFA or numbered-and-collected printed copies, and draft minutes circulated within ~48 hours. The hybrid/AV setup is treated as the highest-severity day-of failure point and is given a mandatory the day before end-to-end test. Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default boardMeeting;
