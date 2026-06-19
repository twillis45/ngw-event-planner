// Surprise Proposal — Event OS host playbook (data only).
//
// Planning the MOMENT one partner proposes to the other. This is not a catered
// party — it is logistics + secrecy + an irreplaceable moment. The weight is in
// DECISIONS (public vs private, who-knows, hidden photographer, celebration
// style), MILESTONES (ring lead-time, scout the spot, lock the photographer,
// the cover story), VENDORS (the hidden photographer is the #1 service — you
// cannot re-shoot a real "yes"), and RISKS (the biggest is the surprise
// LEAKING). Purchases are intentionally minimal — décor, not catering.
//
// recordKind:'client' — the planner is helping the PROPOSER, not the couple at
// large; the partner being proposed to must never see this. Quantities are
// proposal-planning rules of thumb (see `knowledge`), authored honestly and
// labeled `synthesized` until verified. ESM default export.

const surpriseProposal = {
  type: 'Surprise Proposal',
  solveFamily: 'proposal',
  family: 'host_driven',
  recordKind: 'client',
  version: '1.0.0',
  meta: {
    summary: 'Planning the moment one partner proposes to the other. The product is a single irreplaceable moment — a meaningful location, the right light, a hidden photographer to capture it, and a celebration after the "yes". The whole job is logistics + secrecy: the ring has real lead time, the spot has to be scouted, the people have to be coordinated, and above all the surprise cannot leak. Catering is almost nothing; the moment is everything.',
    typicalGuests: { low: 1, default: 2, high: 30 },
    typicalDurationHours: 4,
    leadTimeDays: 45,
    hostDifficulty: 'hard',
    perGuestCost: { low: 0, high: 80, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  decisions: [
    { id: 'public_private', label: 'Public moment or private/intimate?', options: ['Private (just the two of you)', 'Public with a hidden audience', 'Family + friends gathered after', 'Destination / trip proposal'], default: 'Private (just the two of you)', when: 'T-40d', blocks: ['location', 'permit', 'decor', 'celebration'], why: 'The single biggest fork. Public/destination drives permits, crowd control, travel, and a bigger circle of secret-keepers; private keeps it controllable and easier to keep secret.' },
    { id: 'who_knows', label: 'Who is in on it? (secret-keepers)', options: ['Nobody — solo', 'Photographer only', '2-3 trusted people', "Both families coordinated"], default: '2-3 trusted people', when: 'T-40d', blocks: ['celebration', 'ring'], why: 'Every extra person is another way the surprise leaks. Keep the circle as small as the plan allows; only loop in people who are doing a job (ring size, the cover story, the reveal).' },
    { id: 'photographer_hidden', label: 'Photographer hidden or known to your partner?', options: ['Hidden (true surprise)', 'Posing as a "free mini-shoot"', 'Known — partner expects photos'], default: 'Hidden (true surprise)', when: 'T-30d', blocks: ['photographer'], why: 'Capturing the real reaction requires the partner not to know. A common cover is the photographer posing as a stranger or as a "free social-content mini-shoot" so the dressed-up, on-location setup feels natural.' },
    { id: 'ring_path', label: 'Ring: in-stock, custom, or family ring?', options: ['In-stock / quick', 'Custom (longer lead time)', 'Family heirloom (resize)', 'Propose first, ring later'], default: 'In-stock / quick', when: 'T-45d', blocks: ['ring'], why: 'This sets the whole timeline. Custom rings commonly run 4-6 weeks; resizing an heirloom also takes time. The ring is the one thing that can blow the date if you start late.' },
    { id: 'celebration_style', label: 'Celebration after the "yes"', options: ['Just the two of you (dinner reservation)', 'Surprise reveal with family/friends', 'Champagne toast on-site', 'Save the big party for later'], default: 'Surprise reveal with family/friends', when: 'T-21d', blocks: ['celebration'], why: 'The moment is over in 60 seconds — plan what happens next so the night does not deflate. A nearby dinner reservation or a family/friends reveal turns the moment into an evening.' },
  ],

  milestones: [
    { id: 'pr_ring_size', name: 'Get ring size + style (ask partner\'s circle)', offsetDays: 45, owner: 'host', category: 'planning', risk: { ifDelayed: 'Ring ordered wrong size; resize delays pickup', severity: 'high' } },
    { id: 'pr_ring_order', name: 'Finance + order the ring', offsetDays: 42, owner: 'host', dependsOn: ['pr_ring_size'], category: 'planning', risk: { ifDelayed: 'Ring not ready by the date — the one thing that can move the proposal', severity: 'high' } },
    { id: 'pr_location', name: 'Choose the meaningful location + time of day', offsetDays: 35, owner: 'host', category: 'planning', risk: { ifDelayed: 'Best light/low-crowd window missed; no time to scout', severity: 'med' } },
    { id: 'pr_photographer', name: 'Book the hidden photographer/videographer', offsetDays: 30, owner: 'host', dependsOn: ['pr_location'], category: 'vendor', risk: { ifDelayed: 'No one to capture the moment — it can never be re-shot', severity: 'high' } },
    { id: 'pr_permit', name: 'Check permits if public (photo + décor)', offsetDays: 25, owner: 'host', dependsOn: ['pr_location'], category: 'logistics', risk: { ifDelayed: 'Setup shut down by park/venue on the day', severity: 'med' } },
    { id: 'pr_coverstory', name: 'Build + lock the cover story (with partner\'s people)', offsetDays: 21, owner: 'host', dependsOn: ['pr_location'], category: 'planning', risk: { ifDelayed: 'Partner suspicious or won\'t be dressed/in the right place', severity: 'high' } },
    { id: 'pr_celebration', name: 'Set the celebration (reservation / family reveal)', offsetDays: 14, owner: 'host', dependsOn: ['pr_coverstory'], category: 'planning', risk: { ifDelayed: 'No reservation; family can\'t make it; night deflates', severity: 'med' } },
    { id: 'pr_scout', name: 'Scout the spot + walk it with the photographer', offsetDays: 7, owner: 'host', dependsOn: ['pr_photographer'], category: 'logistics', risk: { ifDelayed: 'Bad positioning; surprised by crowds/gates/closures', severity: 'med' } },
    { id: 'pr_ringpickup', name: 'Pick up the ring; confirm fit + insurance', offsetDays: 5, owner: 'host', dependsOn: ['pr_ring_order'], category: 'planning', risk: { ifDelayed: 'No ring in hand for the date', severity: 'high' } },
    { id: 'pr_decor', name: 'Gather décor (flowers, LED candles, sign); brief ring-bearer', offsetDays: 2, owner: 'host', dependsOn: ['pr_celebration'], category: 'setup', risk: { ifDelayed: 'No décor; helper not briefed', severity: 'low' } },
    { id: 'pr_backup', name: 'Confirm forecast + backup location/time', offsetDays: 1, owner: 'host', dependsOn: ['pr_scout'], category: 'logistics', risk: { ifDelayed: 'Rain/crowds with no fallback', severity: 'med' } },
    { id: 'event', name: 'The proposal', offsetDays: 0, owner: 'host', dependsOn: ['pr_ringpickup', 'pr_decor', 'pr_backup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_ringsize', milestoneId: 'pr_ring_size', phase: 'planning', label: 'Discreetly get ring size — borrow a ring off the right finger, or ask a sibling/best friend; size up if unsure', when: 'T-45d' },
    { id: 't_finance', milestoneId: 'pr_ring_order', phase: 'planning', label: 'Set ring budget + financing; factor tax + insurance; order (custom 4-6 wk)', when: 'T-42d' },
    { id: 't_location', milestoneId: 'pr_location', phase: 'planning', label: 'Pick a spot that means something to you both; choose golden hour (sunset/sunrise) on a low-crowd weekday', when: 'T-35d' },
    { id: 't_book_photog', milestoneId: 'pr_photographer', phase: 'vendor', label: 'Book a proposal photographer (3-8 wk out); share the spot, the timing, and the cover story', when: 'T-30d' },
    { id: 't_permit', milestoneId: 'pr_permit', phase: 'logistics', label: 'Call the park/venue office — props/flowers/candles/signs and even photography often need a permit; ask about open flame (use LED)', when: 'T-25d' },
    { id: 't_cover', milestoneId: 'pr_coverstory', phase: 'planning', label: 'Write a simple, believable reason to be there + dressed up ("free mini-shoot", reservation, friend\'s thing); rehearse it', when: 'T-21d' },
    { id: 't_celebration', milestoneId: 'pr_celebration', phase: 'planning', label: 'Book the dinner reservation and/or stage family + friends at a nearby spot for the post-yes reveal', when: 'T-14d' },
    { id: 't_scout', milestoneId: 'pr_scout', phase: 'logistics', label: 'Walk the spot with the photographer; mark where partner stands/faces, where the photographer hides, gates/parking/closing times', when: 'T-7d' },
    { id: 't_pickup', milestoneId: 'pr_ringpickup', phase: 'planning', label: 'Pick up the ring; verify fit; add it to insurance/rider; have a secure pocket plan for the day', when: 'T-5d' },
    { id: 't_decor', milestoneId: 'pr_decor', phase: 'setup', label: 'Buy flowers + LED candles + a "Marry Me" sign; brief the ring-bearer / helper on exact cue + handoff', when: 'T-2d' },
    { id: 't_backup', milestoneId: 'pr_backup', phase: 'logistics', label: 'Check the forecast; confirm a Plan B location/time you are equally happy with; brief everyone on the trigger to switch', when: 'T-1d' },
    { id: 't_moment', milestoneId: 'event', phase: 'logistics', label: 'Ring in pocket; arrive early; photographer in position; deliver the cover story; pause, turn, ask', when: 'T0' },
    { id: 't_reveal', milestoneId: 'event', phase: 'logistics', label: 'After the yes: champagne toast, photographer joins for portraits, then the dinner / family reveal', when: 'T0 +0:30' },
  ],

  purchases: [
    { id: 'p_flowers', item: 'Flowers / bouquet', category: 'decor', qtyFlat: 1, unit: 'bouquet', where: ['Florist', 'Grocery', 'Trader Joe\'s'], unitCostRange: [20, 80], essential: false, buyAt: 'T-1d', note: 'Doubles as a prop and a cover ("just picked these up"). Fresh same-day.' },
    { id: 'p_candles', item: 'LED / battery candles + lanterns', category: 'decor', qtyFlat: 12, unit: 'candles', where: ['Amazon', 'Target', 'Party store'], unitCostRange: [1, 3], essential: false, buyAt: 'T-3d', note: 'Many parks/venues ban open flame — LED reads the same on camera and won\'t get the setup shut down.' },
    { id: 'p_sign', item: '"Marry Me" sign / marquee letters', category: 'decor', qtyFlat: 1, unit: 'sign', where: ['Etsy', 'Amazon', 'Party store'], unitCostRange: [15, 60], essential: false, buyAt: 'T-3d', note: 'A sign carries the moment without words and reads instantly in photos.' },
    { id: 'p_petals', item: 'Real rose petals / faux-petal alternative', category: 'decor', qtyFlat: 1, unit: 'bag', where: ['Florist', 'Amazon'], unitCostRange: [8, 20], essential: false, buyAt: 'T-1d', note: 'CHECK THE RULES: many parks ban confetti/glitter/faux petals; some allow real petals only.' },
    { id: 'p_ringbox', item: 'Ring box (slim / pocket-friendly)', category: 'logistics', qtyFlat: 1, unit: 'box', where: ['Jeweler', 'Amazon'], unitCostRange: [10, 30], essential: true, buyAt: 'T-3d', note: 'COMMONLY OVERLOOKED: a bulky box prints through a pocket and tips off the surprise — a slim box hides better.' },
    { id: 'p_champagne', item: 'Champagne / sparkling + cups for the toast', category: 'beverage', qtyPerGuest: 1, unit: 'glass', where: ['Liquor store', 'Grocery'], unitCostRange: [3, 10], essential: false, buyAt: 'T-1d', note: 'The first toast after the yes. Scale to whoever is gathered after. No alcohol in many public parks — toast at the celebration instead.' },
    { id: 'p_keepsake', item: 'Keepsake (note, vows, small gift)', category: 'decor', qtyFlat: 1, unit: 'item', where: ['Stationery', 'Home'], unitCostRange: [0, 30], essential: false, buyAt: 'T-3d', note: 'Optional — a handwritten note or first-night keepsake for the partner.' },
  ],

  rentalsGap: [
    { item: 'Standing marquee "Marry Me" letters', qtyFlat: 1, note: 'Rent vs buy for a big public reveal; needs setup time + (often) a permit.' },
    { item: 'Picnic / styled setup (blanket, low table, cushions)', qtyFlat: 1, note: 'For a styled picnic proposal; a stylist or rental kit, not owned gear.' },
    { item: 'Portable battery / lantern power', qtyFlat: 1, note: 'If a musician or lit sign needs power and the spot has none.' },
  ],

  vendors: [
    { category: 'Proposal photographer (hidden)', required: true, altToDIY: 'Hide a friend with a good phone/camera — but you only get one real take', when: 'T-30d', costRange: [250, 800], costUnit: 'flat' },
    { category: 'Videographer', required: false, altToDIY: 'Second hidden phone on a small tripod', when: 'T-30d', costRange: [300, 900], costUnit: 'flat' },
    { category: 'Jeweler (ring + resize + insurance)', required: true, altToDIY: 'Family heirloom — still needs sizing + appraisal', when: 'T-42d', costRange: [1500, 8000], costUnit: 'flat' },
    { category: 'Proposal planner / stylist', required: false, altToDIY: 'DIY the décor + coordination yourself', when: 'T-30d', costRange: [500, 3000], costUnit: 'flat' },
    { category: 'Florist', required: false, altToDIY: 'Grocery-store bouquet', when: 'T-7d', costRange: [40, 200], costUnit: 'flat' },
    { category: 'Restaurant (private table / room)', required: false, altToDIY: 'Cook at home / picnic', when: 'T-14d', costRange: [80, 400], costUnit: 'flat' },
    { category: 'Musician (live serenade)', required: false, altToDIY: 'A playlist on a portable speaker', when: 'T-21d', costRange: [150, 600], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_leak', trigger: 'The surprise leaks (someone talks, partner gets suspicious, plans visible on a shared device/calendar)', severity: 'high', mitigation: 'Keep the circle to 2-3 people doing a job; use a private device/incognito; vague cover-story language in texts; loop people in late and only as needed.' },
    { id: 'r_ring', trigger: 'Ring not ready / wrong size by the date', severity: 'high', mitigation: 'Confirm size early (ask the circle); order at T-42d; custom runs 4-6 wk; pick up at T-5d and verify fit; size up if unsure (easier to size down).' },
    { id: 'r_nophoto', trigger: 'No one captures the moment (photographer cancels / no-shows / mis-positioned)', severity: 'high', mitigation: 'Book early, confirm 48h out, scout positioning together at T-7d; have a backup shooter or a pre-set hidden phone on a tripod. You cannot re-shoot a real "yes".' },
    { id: 'r_weather', trigger: 'Rain / extreme weather or a crowded "secret" spot', severity: 'med', mitigation: 'Confirm forecast at T-1d; pre-pick a Plan B location/time you love equally; choose a low-crowd weekday window; have an indoor fallback.' },
    { id: 'r_permit', trigger: 'Park/venue blocks the setup (props, flowers, candles, sign — or even photography — need a permit)', severity: 'med', mitigation: 'Call the office at T-25d; get the permit; use LED not open flame; bring a no-setup fallback (handheld sign + bouquet) that needs no permit.' },
    { id: 'r_coverstory', trigger: 'Cover story falls apart — partner won\'t come, is underdressed, or is in a bad mood', severity: 'med', mitigation: 'Keep it simple, low-pressure, slightly exciting; rehearse it; recruit the partner\'s person to nudge timing/outfit; keep the date flexible if it goes sideways.' },
    { id: 'r_logistics', trigger: 'Gates locked, lot closed, ring-bearer misses the cue, ring falls out of pocket', severity: 'low', mitigation: 'Scout closing/parking times at T-7d; brief the helper on the exact cue + handoff; slim secure ring box; arrive early.' },
  ],

  contingencies: [
    { id: 'c_leak', when: 'r_leak', plan: 'If suspicion rises, lean into a decoy plan (a normal date night) and move the real proposal; never confirm or deny — let the surprise survive.' },
    { id: 'c_nophoto', when: 'r_nophoto', plan: 'Activate the backup shooter or pre-positioned hidden phone; if all else fails, do a tasteful immediate re-enactment for portraits while the emotion is still real.' },
    { id: 'c_weather', when: 'r_weather', plan: 'Switch to the pre-chosen Plan B (covered/indoor spot or a new time); notify the photographer + any helpers via the agreed trigger message.' },
    { id: 'c_permit', when: 'r_permit', plan: 'Drop the staged décor; go handheld (bouquet + a sign you hold); a lone photographer usually needs no permit — the moment still lands.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-42d', what: 'Order the ring (custom 4-6 wk); set financing + insurance' },
      { when: 'T-5d', what: 'Pick up the ring; verify fit + insurance rider' },
      { when: 'T-3d', what: 'LED candles, "Marry Me" sign, slim ring box, keepsake' },
      { when: 'T-1d', what: 'Fresh flowers, petals (if allowed), champagne for the toast' },
    ],
    preparation: [
      { when: 'T-7d', what: 'Scout + walk the spot with the photographer; mark positions, gates, parking, closing times' },
      { when: 'T-2d', what: 'Brief the ring-bearer/helper on the cue + handoff; stage décor; finalize the cover story' },
      { when: 'T-1d', what: 'Confirm forecast + Plan B; confirm photographer 48h out; confirm reservation / family reveal' },
    ],
    setup: [
      { when: 'T0 -2h', what: 'Photographer + helpers arrive; stage any décor (sign, LED candles, petals) discreetly' },
      { when: 'T0 -0:30', what: 'Photographer takes hidden position; ring in the slim box in a secure pocket; cover story in motion' },
    ],
    cleanup: [
      { when: 'T0 +0:15', what: 'Pack down décor immediately (especially in a permitted public spot); collect candles/sign/petals' },
      { when: 'T0 +0:30', what: 'Champagne toast + portraits, then move to dinner / the family + friends reveal' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'This playbook reflects widely-published proposal-planning practice: get the ring size early via the partner\'s circle and order ~6 weeks out (custom rings commonly 4-6 weeks); book a proposal photographer roughly 3-8 weeks ahead and scout the location together so they can stay hidden; choose a meaningful spot at golden hour (sunset/sunrise) on a low-crowd weekday; keep the secret circle to 2-3 people doing real jobs; build a simple, believable cover story so the partner shows up dressed and unsuspecting; check that public parks/venues permit props, flowers, candles, and signs (open flame is often banned — LED reads the same on camera) and that even photography can require a permit; and plan the celebration after the yes (a nearby dinner reservation, a champagne toast, and/or a family-and-friends reveal). Cost ranges (ring, photographer, planner) are illustrative US figures and vary widely. Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default surpriseProposal;
