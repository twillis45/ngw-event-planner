// Wedding — Event OS host playbook (data only).
//
// A full-service, vendor-led wedding. Unlike home-hosted playbooks, almost none
// of the spend or effort is per-guest groceries — it lives in DECISIONS,
// MILESTONES (a 12-month → week-of timeline), VENDORS, and RISKS. The lens is
// large-scale / celebrity wedding planning practice (Mindy Weiss, Bryan
// Rafanelli, Preston Bailey): book the venue + date FIRST, then lock the vendors
// that book out a year (photographer, caterer, planner, band), gate everything on
// budget + guest count, drive the day from a tight run-of-show, and protect the
// date with a rain plan, a final-headcount lock, and an emergency kit.
//
// `purchases` is intentionally MINIMAL (favors, welcome bags, day-of emergency
// kit, signage, guest book) — the real intelligence is in vendors/decisions/
// milestones/risks. US norms ground the bar (~1 drink/guest/hr, ~7 over a 5h
// reception), the champagne toast (~1 bottle per 6–8 guests), and the run-of-show.
// Authored as synthesized trade practice — no fabricated citations. ESM default
// export.

const wedding = {
  type: 'Wedding',
  solveFamily: 'wedding',
  family: 'full_service',
  recordKind: 'client',
  version: '1.0.0',
  meta: {
    summary: 'A full-service, vendor-led wedding. The weight is in decisions, a back-from-the-date timeline, and the vendor team — not per-guest groceries. Book venue + date first, lock the year-out vendors (photographer, caterer, planner, band) next, gate on budget + guest count, then drive the day from a tight run-of-show with a rain plan and a final-headcount lock.',
    typicalGuests: { low: 50, default: 120, high: 250 },
    typicalDurationHours: 8,
    leadTimeDays: 365,
    hostDifficulty: 'high',
    perGuestCost: { low: 150, high: 500, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The first look — just the two of them, before anyone else arrives.',
    'The vows — no one else in the room.',
    'The first dance when only they exist.',
    'The moment they walk back down the aisle and it\'s done and it\'s real.',
    'Late in the reception, the dance floor is full and they stop and look at each other.',
  ],

  decisions: [
    { id: 'budget', label: 'Total budget + who pays', options: ['Under $25k', '$25k–$50k', '$50k–$100k', '$100k+'], default: '$25k–$50k', when: 'T-365d', blocks: ['venue', 'guestcount', 'vendor_team', 'catering_style'], why: 'The first gate. Budget sets the guest-count ceiling and which vendors are reachable — every later decision back-solves from this number.' },
    { id: 'guestcount', label: 'Guest-count target (the budget gate)', options: ['Intimate (≤50)', 'Mid (50–120)', 'Large (120–250)', 'Grand (250+)'], default: 'Mid (50–120)', when: 'T-365d', dependsOn: ['budget'], blocks: ['venue', 'catering_style', 'bar'], why: 'Headcount × per-head is the single biggest cost lever. Set the target BEFORE touring venues — a venue that fits 80 won\'t fit 200, and per-head catering/bar scale directly off it.' },
    { id: 'venue', label: 'Venue + date (book FIRST)', options: ['Full-service venue (in-house catering)', 'Raw / blank-canvas venue (bring everything)', 'Hotel / resort', 'Private estate / backyard', 'Destination'], default: 'Full-service venue (in-house catering)', when: 'T-365d', blocks: ['vendor_team', 'catering_style', 'rain_plan'], why: 'The venue and date are booked first because they\'re the hardest to get and they anchor every other vendor\'s availability. A full-service venue folds in catering/rentals; a blank-canvas venue means you source it all.' },
    { id: 'vision', label: 'Style + formality (the design brief)', options: ['Black-tie / formal', 'Garden / romantic', 'Modern / minimal', 'Rustic / barn', 'Cultural / traditional'], default: 'Garden / romantic', when: 'T-330d', dependsOn: ['venue'], blocks: ['vendor_team'], why: 'The design language that briefs the florist, stationery, attire, and rentals so the whole event reads as one idea instead of a pile of pretty things.' },
    { id: 'vendor_team', label: 'The vendor team (lock the year-out ones)', options: ['Planner-led (full)', 'Month-of coordinator', 'Venue coordinator only', 'DIY / family'], default: 'Month-of coordinator', when: 'T-300d', dependsOn: ['budget', 'venue'], blocks: [], why: 'Photographer, caterer, planner, and band/DJ book out ~a year — reserve them right after the date. A planner is the force-multiplier; at minimum a month-of coordinator runs the day so the couple doesn\'t.' },
    { id: 'ceremony', label: 'Ceremony type + officiant', options: ['Religious / house of worship', 'Civil', 'Symbolic / personal', 'Cultural / traditional'], default: 'Symbolic / personal', when: 'T-300d', dependsOn: ['venue'], blocks: ['run_of_show'], why: 'Drives officiant booking, any required premarital steps, ceremony length (20–30 min civil, 45–60 religious), and whether ceremony + reception share a site.' },
    { id: 'catering_style', label: 'Catering style', options: ['Plated / seated', 'Buffet', 'Family-style', 'Stations / heavy passed'], default: 'Plated / seated', when: 'T-240d', dependsOn: ['guestcount', 'budget'], blocks: ['rentals'], why: 'Sets per-head cost, staffing, rental counts, and reception pacing — plated runs ~90 min of service, buffet ~45. Tasting and final menu follow.' },
    { id: 'bar', label: 'Bar service', options: ['Open bar (full)', 'Beer + wine + signature', 'Cash bar', 'Dry'], default: 'Beer + wine + signature', when: 'T-180d', dependsOn: ['budget'], blocks: ['bar_purchases'], why: 'Often the second-largest line after catering. Drives alcohol volume (~1 drink/guest/hr, ~7 over a 5h reception) and whether you supply alcohol or the venue does.' },
    { id: 'music', label: 'Music — band or DJ', options: ['Live band', 'DJ', 'Band ceremony + DJ reception', 'Acoustic / DIY playlist'], default: 'DJ', when: 'T-240d', dependsOn: ['budget'], blocks: ['run_of_show'], why: 'Drives the dance-floor energy and the run-of-show cues (entrances, first dance, toasts). Bands book a year out and cost multiples of a DJ.' },
  ],

  milestones: [
    { id: 'w_budget', name: 'Set budget, guest-count target, vision', offsetDays: 365, owner: 'couple', category: 'planning', risk: { ifDelayed: 'Touring venues blind; overspending before the gate is set', severity: 'high' } },
    { id: 'w_venue', name: 'Book venue + lock the date', offsetDays: 365, owner: 'couple', dependsOn: ['w_budget'], category: 'venue', risk: { ifDelayed: 'Preferred date/venue gone — peak dates book 12–18 mo out', severity: 'high' } },
    { id: 'w_keyvendors', name: 'Book the year-out vendors (planner, photographer, caterer, band)', offsetDays: 300, owner: 'couple', dependsOn: ['w_venue'], category: 'vendor', risk: { ifDelayed: 'Top photographers/caterers/bands fully booked for the date', severity: 'high' } },
    { id: 'w_attire', name: 'Order attire (dress + alterations lead time)', offsetDays: 240, owner: 'couple', dependsOn: ['w_venue'], category: 'planning', risk: { ifDelayed: 'Dress won\'t arrive with time for alterations (~6–8 mo)', severity: 'med' } },
    { id: 'w_design', name: 'Lock design: florist, rentals, stationery, cake', offsetDays: 180, owner: 'planner', dependsOn: ['w_keyvendors'], category: 'vendor', risk: { ifDelayed: 'Florist/baker booked; invitations slip past mail window', severity: 'med' } },
    { id: 'w_invites', name: 'Send invitations + open RSVP', offsetDays: 90, owner: 'couple', dependsOn: ['w_design'], category: 'guest', risk: { ifDelayed: 'RSVPs land too late to give caterer a real count', severity: 'high' } },
    { id: 'w_details', name: 'Tasting, hair/makeup trial, timeline, seating draft', offsetDays: 60, owner: 'planner', dependsOn: ['w_invites'], category: 'planning', risk: { ifDelayed: 'No run-of-show; vendors arrive without a plan', severity: 'med' } },
    { id: 'w_finalcount', name: 'Final headcount + final vendor payments', offsetDays: 14, owner: 'couple', dependsOn: ['w_details'], category: 'vendor', risk: { ifDelayed: 'Locked into wrong count; vendors unpaid = day-of disputes', severity: 'high' } },
    { id: 'w_runofshow', name: 'Distribute run-of-show; confirm all vendor arrivals + rain plan', offsetDays: 7, owner: 'planner', dependsOn: ['w_finalcount'], category: 'planning', risk: { ifDelayed: 'Vendors uncoordinated; no weather fallback decided', severity: 'high' } },
    { id: 'w_rehearsal', name: 'Rehearsal + welcome bags + emergency kit packed', offsetDays: 1, owner: 'planner', dependsOn: ['w_runofshow'], category: 'setup', risk: { ifDelayed: 'Processional chaos; nothing staged for the morning', severity: 'med' } },
    { id: 'event', name: 'The wedding day', offsetDays: 0, owner: 'planner', dependsOn: ['w_rehearsal'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_budget', milestoneId: 'w_budget', phase: 'planning', label: 'Agree total budget + who pays; set guest-count target; write the vision brief', when: 'T-365d' },
    { id: 't_venue', milestoneId: 'w_venue', phase: 'venue', label: 'Tour, compare, sign venue contract + deposit; lock the date', when: 'T-365d' },
    { id: 't_keyvendors', milestoneId: 'w_keyvendors', phase: 'vendor', label: 'Sign planner, photographer, caterer, band/DJ (these book a year out)', when: 'T-300d' },
    { id: 't_attire', milestoneId: 'w_attire', phase: 'planning', label: 'Order dress/attire; schedule alterations runway', when: 'T-240d' },
    { id: 't_design', milestoneId: 'w_design', phase: 'vendor', label: 'Book florist, rentals, baker, officiant; order stationery; build registry + website', when: 'T-180d' },
    { id: 't_invites', milestoneId: 'w_invites', phase: 'guest', label: 'Mail invitations 6–8 wks out; track RSVPs + meal choices', when: 'T-90d' },
    { id: 't_details', milestoneId: 'w_details', phase: 'planning', label: 'Menu tasting, hair/makeup trial, build run-of-show, draft seating chart', when: 'T-60d' },
    { id: 't_finalcount', milestoneId: 'w_finalcount', phase: 'vendor', label: 'Give caterer FINAL headcount; pay remaining vendor balances; prep tip envelopes', when: 'T-14d' },
    { id: 't_runofshow', milestoneId: 'w_runofshow', phase: 'planning', label: 'Send run-of-show to every vendor; confirm arrival times; DECIDE the rain plan', when: 'T-7d' },
    { id: 't_rehearsal', milestoneId: 'w_rehearsal', phase: 'setup', label: 'Rehearsal + dinner; pack emergency kit; stage welcome bags, favors, signage, seating cards', when: 'T-1d' },
    { id: 't_dayof', milestoneId: 'event', phase: 'event', label: 'Hair/makeup → first look → ceremony → cocktail → reception → toasts → first dance → cake → send-off', when: 'T0' },
  ],

  purchases: [
    { id: 'p_favors', item: 'Guest favors', category: 'decor', qtyPerGuest: 1, unit: 'favor', where: ['Etsy', 'Party store', 'Specialty / local'], unitCostRange: [2, 8], essential: false, buyAt: 'T-3d', note: 'Order well ahead if custom; the T-3d window is for pickup/assembly, not first purchase.' },
    { id: 'p_welcomebags', item: 'Welcome bags (out-of-town guests)', category: 'logistics', qtyFlat: 1, qtyPer: 4, unit: 'bag', where: ['Amazon', 'Party store', 'Grocery'], unitCostRange: [8, 20], essential: false, buyAt: 'T-3d', note: 'One per hotel room for traveling guests — water, snacks, a map/itinerary card. Assemble the day before.' },
    { id: 'p_emergencykit', item: 'Day-of emergency kit', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Pharmacy', 'Amazon', 'Grocery'], unitCostRange: [40, 80], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN. Sewing kit, safety pins, fashion tape, stain remover, pain reliever, bobby pins, hairspray, blotting papers, deodorant, breath mints, Band-Aids, phone charger, scissors, extra earring backs. Pack at rehearsal.' },
    { id: 'p_signage', item: 'Signage (welcome sign, seating chart, directional)', category: 'decor', qtyFlat: 4, unit: 'sign', where: ['Etsy', 'Print shop', 'Sign maker'], unitCostRange: [25, 120], essential: false, buyAt: 'T-3d', note: 'Welcome sign, seating chart, bar/menu, and directional signs — proofread names against the FINAL list.' },
    { id: 'p_guestbook', item: 'Guest book + pens', category: 'decor', qtyFlat: 1, unit: 'set', where: ['Etsy', 'Bookstore', 'Party store'], unitCostRange: [15, 50], essential: false, buyAt: 'T-3d' },
    { id: 'p_toast_champagne', item: 'Toast champagne / sparkling (if self-supplied)', category: 'beverage', qtyPerGuest: 0.14, unit: 'bottle', where: ['Liquor store', 'Costco', 'Warehouse'], unitCostRange: [12, 35], essential: false, buyAt: 'T-3d', note: '~1 bottle per 6–8 guests for a half-glass toast. Many full-service venues/caterers supply this — only buy if your bar is self-supplied.' },
    { id: 'p_bar_alcohol', item: 'Reception alcohol (if self-supplied bar)', category: 'beverage', qtyPerGuest: 7, unit: 'drinks', where: ['Liquor store', 'Costco', 'Warehouse'], unitCostRange: [2, 6], essential: false, buyAt: 'T-3d', note: 'Only if you supply the bar. US norm ~1 drink/guest/hr (≈2 first hour, 1 each after) → ~7 drinks/guest over a 5h reception. Split ~50% beer/wine, ~30% spirits, ~20% non-alcoholic. Confirm corkage/licensing with the venue.' },
  ],

  rentalsGap: [
    { item: 'Tables + chairs', qtyPerGuest: 1, note: 'Blank-canvas venues bring everything; full-service venues usually include these.' },
    { item: 'Place settings (china, glassware, flatware, linens)', qtyPerGuest: 1, note: 'Plated dinner = multiple glasses/forks per guest; the caterer or rental house specs the count.' },
    { item: 'Tent + flooring (rain plan / outdoor)', qtyFlat: 1, note: 'The outdoor rain insurance — reserve early; same-week tent rentals are scarce and pricey.' },
    { item: 'Dance floor + lighting', qtyFlat: 1, note: 'Sized to ~40% of guests dancing at once; uplighting sets the room mood.' },
    { item: 'Restroom trailer + generator (raw venue)', qtyFlat: 1, note: 'Estate/backyard weddings with no facilities — easy to forget until the count is high.' },
  ],

  vendors: [
    { category: 'Venue', required: true, altToDIY: 'Private estate or family property (then you source everything a venue includes)', when: 'T-365d', costRange: [3000, 30000], costUnit: 'flat' },
    { category: 'Caterer', required: true, altToDIY: 'Restaurant drop-off + rented staff (rarely works at scale)', when: 'T-300d', costRange: [70, 250], costUnit: 'per guest' },
    { category: 'Photographer', required: true, altToDIY: 'Talented friend (high regret risk — it\'s the lasting record)', when: 'T-300d', costRange: [2500, 8000], costUnit: 'flat' },
    { category: 'Videographer', required: false, altToDIY: 'Skip, or phone/guest footage', when: 'T-300d', costRange: [1500, 6000], costUnit: 'flat' },
    { category: 'Wedding planner / coordinator', required: false, altToDIY: 'Couple + family run it (high day-of load on the people meant to enjoy it)', when: 'T-300d', costRange: [1200, 12000], costUnit: 'flat' },
    { category: 'Florist', required: true, altToDIY: 'DIY/wholesale flowers (heavy day-before labor)', when: 'T-180d', costRange: [2000, 10000], costUnit: 'flat' },
    { category: 'Band or DJ', required: true, altToDIY: 'Curated playlist + rented PA (no one to read the room or run cues)', when: 'T-240d', costRange: [1200, 12000], costUnit: 'flat' },
    { category: 'Officiant', required: true, altToDIY: 'Ordained friend (still must meet local legal requirements)', when: 'T-300d', costRange: [300, 1200], costUnit: 'flat' },
    { category: 'Baker / cake', required: false, altToDIY: 'Grocery/warehouse cake or dessert table', when: 'T-180d', costRange: [4, 12], costUnit: 'per guest' },
    { category: 'Hair + makeup artist', required: false, altToDIY: 'DIY or salon appointment (no on-site touch-ups)', when: 'T-180d', costRange: [150, 500], costUnit: 'per person' },
    { category: 'Transportation (shuttle / limo)', required: false, altToDIY: 'Guests self-drive / rideshare', when: 'T-90d', costRange: [400, 2000], costUnit: 'flat' },
    { category: 'Rentals (tables, linens, tent, lighting)', required: false, altToDIY: 'Bundled into a full-service venue', when: 'T-180d', costRange: [2000, 15000], costUnit: 'flat' },
    { category: 'Stationery (invitations + day-of paper)', required: false, altToDIY: 'DIY templates + online printing', when: 'T-180d', costRange: [500, 3000], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_weather', trigger: 'Outdoor ceremony/reception with no rain plan', severity: 'high', mitigation: 'Decide the rain plan at booking (tent on hold or indoor backup); make the call ~24–48h out and notify all vendors + guests.' },
    { id: 'r_count', trigger: 'Final headcount wrong or late to the caterer', severity: 'high', mitigation: 'Lock RSVPs, chase non-responders, and give the caterer the FINAL count at T-14d — most contracts bill off it and won\'t go down after.' },
    { id: 'r_vendor_payment', trigger: 'Outstanding vendor balances on the day', severity: 'high', mitigation: 'Pay all final balances by T-14d; pre-stage labeled tip envelopes and assign one person to hand them out so the couple never touches money.' },
    { id: 'r_vendor_noshow', trigger: 'A key vendor cancels, is double-booked, or no-shows', severity: 'high', mitigation: 'Sign contracts (not verbal holds), confirm arrival times at T-7d, keep a backup officiant/DJ contact, and verify vendor COI where the venue requires it.' },
    { id: 'r_timeline', trigger: 'No run-of-show / hair + makeup runs long', severity: 'med', mitigation: 'Build an hour-by-hour timeline at T-60d, pad hair/makeup (start early, ~45 min/face + bride buffer), and have the coordinator hold the schedule on the day.' },
    { id: 'r_seating', trigger: 'Seating chart unresolved as RSVPs trickle in', severity: 'med', mitigation: 'Draft seating at T-60d, finalize after the headcount lock, and proofread escort cards + signage against the final list.' },
    { id: 'r_permits', trigger: 'Missing alcohol license, permits, or venue COI for an off-site bar', severity: 'med', mitigation: 'Confirm who holds the liquor license and any insurance/permits at booking; a self-supplied bar may need licensed bartenders + a permit.' },
  ],

  contingencies: [
    { id: 'c_rain', when: 'r_weather', plan: 'Trigger the pre-decided tent/indoor backup; reset ceremony chairs under cover; the coordinator notifies vendors + posts the change to guests the morning of.' },
    { id: 'c_count', when: 'r_count', plan: 'If late RSVPs land, give the caterer the highest defensible count by the deadline and add a handful of meals rather than risk a shortfall; never let the number drop below contract minimum.' },
    { id: 'c_vendor', when: 'r_vendor_noshow', plan: 'Coordinator works the backup list immediately; venue or planner network usually has a same-day officiant/DJ; reassign a non-critical vendor\'s role if needed to cover the gap.' },
    { id: 'c_timeline', when: 'r_timeline', plan: 'Coordinator compresses the cocktail hour or trims open-dancing buffer to reabsorb a late start; toasts and cake can flex by 10–15 min without guests noticing.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-180d', what: 'Pay design-vendor deposits (florist, baker, rentals, stationery); order attire if not already' },
      { when: 'T-14d', what: 'Final vendor balances paid; tip envelopes prepped; favors/welcome-bag/signage materials in hand' },
      { when: 'T-3d', what: 'Buy/assemble favors, welcome bags, emergency kit, signage, guest book; toast champagne + bar alcohol IF self-supplied' },
    ],
    preparation: [
      { when: 'T-60d', what: 'Menu tasting, hair/makeup trial, build the run-of-show, draft the seating chart' },
      { when: 'T-7d', what: 'Distribute run-of-show to every vendor; confirm arrival windows; DECIDE the rain plan' },
      { when: 'T-1d', what: 'Rehearsal + dinner; pack the emergency kit; assemble welcome bags; brief the wedding party' },
    ],
    setup: [
      { when: 'T-1d', what: 'Drop welcome bags at the hotel; deliver décor/signage/seating cards to the venue; stage the emergency kit' },
      { when: 'T0 -6h', what: 'Hair + makeup begins (start early; ~45 min/face + bride buffer); vendors load in; florist + rentals dress the room' },
      { when: 'T0 -2h', what: 'Final venue walk-through; place escort cards, favors, signage, guest book; sound check; first look + portraits' },
    ],
    cleanup: [
      { when: 'during', what: 'Coordinator distributes tip envelopes; collects gifts/cards to a secured spot; tracks rental counts' },
      { when: 'T0 +1d', what: 'Vendors strike + load out; rentals returned/collected; gifts and personal items retrieved; final balances/tips reconciled' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'A wedding is full-service and vendor-led, so most of the spend and intelligence is in the vendor team, not per-guest purchases — this playbook deliberately keeps `purchases` minimal (favors, welcome bags, emergency kit, signage, guest book, and self-supplied bar only) and puts the depth in decisions, the back-from-the-date timeline, vendors, and risks. The booking order (venue + date first, then the year-out vendors — photographer, caterer, planner, band — then design vendors at ~6 months) reflects widely-published wedding-planning practice: peak venues book 12–18 months out and top photographers/caterers/bands book ~a year out. The budget × guest-count gate, the T-14d final-headcount + final-payment lock, the run-of-show order (ceremony → cocktail → reception → toasts → first dance → cake → send-off), and the rain plan are standard planner discipline. Bar math uses common US norms: ~1 drink/guest/hr (about 2 the first hour, 1 each hour after), ~7 drinks/guest over a 5-hour reception, and ~1 bottle of champagne per 6–8 guests for a half-glass toast. Quantities are heuristics, not venue-specific; per-guest cost is a broad national range. Authored as synthesized trade practice and labeled accordingly until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default wedding;
