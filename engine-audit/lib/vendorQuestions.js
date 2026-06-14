// demo/src/lib/vendorQuestions.js
// Sprint 53 · Vendor type required-question templates
//
// Each vendor category gets a checklist of "what must be true before this
// vendor is ready for event day". Templates come from the Sprint 53 brief.
//
// Evaluation philosophy: we have very few category-specific fields on the
// vendor model today, so most questions resolve to status: 'unknown'
// (== 'Not tracked yet'). That's honest. We surface what we DO have:
//   - arrivalTime → "Arrival/setup time confirmed?"
//   - payDueDate → "Final payment due date known?"
//   - event.catererCount vs confirmed guest count → "Final guest count confirmed?"
//   - event.ros / event.timeline length → "Timeline received?"
//
// A question returns:
//   { key, question, status, consequence?, actionTitle?, ctaCopy? }
//   status: 'answered' | 'unknown' | 'missing'
//
// 'missing' = we know this should be answered AND we have signal it isn't
// 'unknown' = we have no field for it; planner must answer manually
// 'answered' = derived from vendor/event data
//
// 'unknown' renders as "Not tracked yet" in the UI. 'missing' renders red.

// ── Category normalization ───────────────────────────────────────────────────
// vendor.category strings vary in seed data ("Catering", "Photography", "DJ",
// "Florals", "Venue", "Rentals", "Videography"). Map to the brief's canonical
// 6 question template keys.
const CATEGORY_MAP = {
  catering: 'caterer',
  caterer: 'caterer',
  food: 'caterer',
  'food & beverage': 'caterer',
  'bar / beverage': 'bar',
  bar: 'bar',
  bartender: 'bar',
  bartending: 'bar',
  beverage: 'bar',
  alcohol: 'bar',
  liquor: 'bar',
  spirits: 'bar',
  mixology: 'bar',
  'mobile bar': 'bar',
  photography: 'photographer',
  photographer: 'photographer',
  videography: 'photographer', // photo+video share most questions; brief groups them
  videographer: 'photographer',
  'photo + video': 'photographer',
  florist: 'florist',
  florals: 'florist',
  flowers: 'florist',
  decor: 'florist',
  'florist / decor': 'florist',
  dj: 'entertainment',
  band: 'entertainment',
  entertainment: 'entertainment',
  music: 'entertainment',
  'dj / band': 'entertainment',
  venue: 'venue',
  rentals: 'rentals',
  rental: 'rentals',
  furniture: 'rentals',
  linens: 'rentals',
  tent: 'rentals',
  tents: 'rentals',
  structures: 'rentals',
  officiant: 'officiant',
  celebrant: 'officiant',
  minister: 'officiant',
  pastor: 'officiant',
  transportation: 'transportation',
  transport: 'transportation',
  shuttle: 'transportation',
  limo: 'transportation',
  limousine: 'transportation',
  'hair & makeup': 'hairMakeup',
  'hair / makeup': 'hairMakeup',
  hair: 'hairMakeup',
  makeup: 'hairMakeup',
  beauty: 'hairMakeup',
  hmu: 'hairMakeup',
  'av / tech': 'av',
  'audio visual': 'av',
  audiovisual: 'av',
  production: 'av',
  lighting: 'av',
  security: 'security',
  guard: 'security',
  guards: 'security',
  staffing: 'staffing',
  staff: 'staffing',
  servers: 'staffing',
  server: 'staffing',
  waitstaff: 'staffing',
  valet: 'staffing',
  attendants: 'staffing',
  cake: 'cake',
  bakery: 'cake',
  desserts: 'cake',
  'cake / desserts': 'cake',
  pastry: 'cake',
  'photo booth': 'photoBooth',
  photobooth: 'photoBooth',
  booth: 'photoBooth',
  coordinator: 'coordinator',
  'day-of coordinator': 'coordinator',
  'day of coordinator': 'coordinator',
  planner: 'coordinator',
  childcare: 'childcare',
  'child care': 'childcare',
  nanny: 'childcare',
  babysitting: 'childcare',
  // ── Edge-case / specialty vendors ──
  'calligraphy / stationery': 'stationery',
  calligraphy: 'stationery',
  stationery: 'stationery',
  'place cards': 'stationery',
  signage: 'stationery',
  'dance floor / staging': 'staging',
  'dance floor': 'staging',
  dancefloor: 'staging',
  staging: 'staging',
  stage: 'staging',
  riser: 'staging',
  'restroom trailers': 'restroom',
  'restroom trailer': 'restroom',
  restroom: 'restroom',
  restrooms: 'restroom',
  'send-off / sparklers': 'sendoff',
  sparkler: 'sendoff',
  sparklers: 'sendoff',
  'send-off': 'sendoff',
  sendoff: 'sendoff',
  pyro: 'sendoff',
  fireworks: 'sendoff',
  'live painter': 'livepainter',
  'live painting': 'livepainter',
  painter: 'livepainter',
  'generator / power': 'power',
  generator: 'power',
  generators: 'power',
  genset: 'power',
  draping: 'draping',
  drape: 'draping',
  'pipe and drape': 'draping',
  'pipe & drape': 'draping',
  'coffee / specialty cart': 'cart',
  'coffee cart': 'cart',
  coffee: 'cart',
  espresso: 'cart',
  'specialty cart': 'cart',
  'food truck': 'foodtruck',
  foodtruck: 'foodtruck',
  'food trucks': 'foodtruck',
  'lodging / concierge': 'concierge',
  concierge: 'concierge',
  lodging: 'concierge',
  'room block': 'concierge',
  'animals / petting zoo': 'animals',
  animals: 'animals',
  'petting zoo': 'animals',
  'content creator': 'content',
  content: 'content',
  'social media': 'content',
};

function categoryKey(vendor) {
  if (!vendor || !vendor.category) return null;
  const lc = vendor.category.toLowerCase().trim();
  if (CATEGORY_MAP[lc]) return CATEGORY_MAP[lc];
  // Substring fallback
  for (const k of Object.keys(CATEGORY_MAP)) {
    if (lc.includes(k)) return CATEGORY_MAP[k];
  }
  return null;
}

// ── Common question builders ────────────────────────────────────────────────
function arrivalQuestion(vendor) {
  const set = !!(vendor.arrivalTime || vendor.arrival_time);
  return {
    key: 'arrival',
    question: 'Arrival/setup time confirmed?',
    status: set ? 'answered' : 'missing',
    value: set ? (vendor.arrivalTime || vendor.arrival_time) : 'Not set',
    consequence: set ? undefined : 'Timeline readiness cannot be trusted without arrival times.',
    actionTitle: set ? undefined : `Set arrival time for ${vendor.name || 'this vendor'}.`,
    ctaCopy: set ? undefined : 'Set arrival time',
  };
}
function finalPaymentQuestion(vendor) {
  const has = !!vendor.payDueDate;
  return {
    key: 'finalPayment',
    question: 'Final payment due date known?',
    status: has ? 'answered' : 'missing',
    value: has ? vendor.payDueDate : 'Not set',
    consequence: has ? undefined : 'Cashflow planning is blind without a final payment date.',
  };
}

// ── Category templates ──────────────────────────────────────────────────────
const TEMPLATES = {
  caterer(vendor, event) {
    const confirmedGuests = event && event.guests ? event.guests.filter(g => g.rsvp === 'Yes').length : 0;
    const hasCatererCount = event && event.catererCount !== undefined && event.catererCount !== null;
    const countMatches = hasCatererCount && event.catererCount === confirmedGuests;
    return [
      {
        key: 'finalGuestCount',
        question: 'Final guest count confirmed?',
        status: !hasCatererCount ? 'missing' : (countMatches ? 'answered' : 'missing'),
        value: hasCatererCount ? `Caterer holds ${event.catererCount} · ${confirmedGuests} confirmed` : 'Not set',
        consequence: !countMatches && hasCatererCount ? 'Guest count and meal count are out of sync. This cascades into seating and timeline.' : (!hasCatererCount ? 'Without a held count, meal prep is blind.' : undefined),
        actionTitle: !countMatches && hasCatererCount ? `Update caterer to ${confirmedGuests} guests.` : undefined,
        ctaCopy: !countMatches && hasCatererCount ? 'Update count' : undefined,
      },
      { key: 'mealCount', question: 'Meal count confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'dietary', question: 'Dietary restrictions confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'Allergy and dietary risks need explicit confirmation.' },
      { key: 'vendorMeals', question: 'Vendor meals confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'serviceStyle', question: 'Service style confirmed?', status: vendor.serviceStyle ? 'answered' : 'unknown', value: vendor.serviceStyle || 'Not tracked yet' },
      arrivalQuestion(vendor),
      { key: 'kitchen', question: 'Kitchen access confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'utilities', question: 'Power/water needs confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'staff', question: 'Staff count confirmed?', status: 'unknown', value: 'Not tracked yet' },
      finalPaymentQuestion(vendor),
    ];
  },

  photographer(vendor, event) {
    const hasTimeline = !!(event && ((event.timeline && event.timeline.length) || (event.ros && event.ros.length)));
    return [
      { key: 'shotList', question: 'Shot list received?', status: 'unknown', value: 'Not tracked yet', consequence: 'Without a shot list, key moments get missed.' },
      { key: 'familyList', question: 'Family photo list received?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'timeline', question: 'Timeline received?', status: hasTimeline ? 'answered' : 'missing', value: hasTimeline ? 'Run-of-show available' : 'Not yet built', consequence: hasTimeline ? undefined : 'Photographer cannot plan coverage without the timeline.' },
      { key: 'gettingReady', question: 'Getting-ready location confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'ceremonyRestrictions', question: 'Ceremony restrictions confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'mealBreak', question: 'Meal break confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'parking', question: 'Parking/load-in confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'deliverables', question: 'Deliverables confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'usageRights', question: 'Usage rights confirmed?', status: 'unknown', value: 'Not tracked yet' },
      finalPaymentQuestion(vendor),
    ];
  },

  florist(vendor, event) {
    return [
      arrivalQuestion(vendor),
      { key: 'setupLocation', question: 'Setup location confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'strikeResponsibility', question: 'Strike responsibility confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'Unclear strike responsibility leaves rentals stranded after end-of-night.' },
      { key: 'centerpieceCount', question: 'Centerpiece count confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'personalFlowers', question: 'Bouquet/boutonnière count confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'archDecor', question: 'Ceremony arch/decor confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'venueRestrictions', question: 'Venue decor restrictions confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'candleRules', question: 'Candle/flame rules confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'rentalReturn', question: 'Rental return plan confirmed?', status: 'unknown', value: 'Not tracked yet' },
      finalPaymentQuestion(vendor),
    ];
  },

  entertainment(vendor, event) {
    return [
      arrivalQuestion(vendor),
      { key: 'soundcheck', question: 'Soundcheck confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'power', question: 'Power needs confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'No confirmed power = no music day-of.' },
      { key: 'ceremonyAudio', question: 'Ceremony audio confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'receptionAudio', question: 'Reception audio confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'playlist', question: 'Playlist received?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'doNotPlay', question: 'Do-not-play list received?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'mc', question: 'MC responsibilities confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'soundRestrictions', question: 'Venue sound restrictions confirmed?', status: 'unknown', value: 'Not tracked yet' },
      finalPaymentQuestion(vendor),
    ];
  },

  venue(vendor, event) {
    return [
      { key: 'access', question: 'Access time confirmed?', status: vendor.arrivalTime ? 'answered' : 'missing', value: vendor.arrivalTime || 'Not set', consequence: vendor.arrivalTime ? undefined : 'Without an access time, all other vendor arrivals are guesses.' },
      { key: 'loadIn', question: 'Load-in rules confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'parking', question: 'Parking confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'floorplan', question: 'Floorplan received?', status: 'unknown', value: 'Not tracked yet', consequence: 'No floorplan = no seating chart, no rentals layout.' },
      { key: 'insurance', question: 'Insurance requirements confirmed?', status: vendor.insuranceStatus ? 'answered' : 'unknown', value: vendor.insuranceStatus || 'Not tracked yet' },
      { key: 'vendorRestrictions', question: 'Vendor restrictions confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'endTime', question: 'End time confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'Hard stop needs to be reflected in the run of show.' },
      { key: 'noise', question: 'Noise rules confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'security', question: 'Security requirements confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'cleanup', question: 'Cleanup/strike rules confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'venuePoc', question: 'Venue point of contact confirmed?', status: vendor.contactName ? 'answered' : 'missing', value: vendor.contactName || 'Not set' },
    ];
  },

  bar(vendor, event) {
    const confirmedGuests = event && event.guests ? event.guests.filter(g => g.rsvp === 'Yes').length : 0;
    return [
      { key: 'liquorLicense', question: 'Liquor license / permit on file?', status: 'unknown', value: 'Not tracked yet', consequence: 'No permit on file is the fastest way to get the bar shut down on the day.' },
      { key: 'liquorLiability', question: 'Host liquor liability insurance confirmed?', status: vendor.insuranceStatus ? 'answered' : 'unknown', value: vendor.insuranceStatus || 'Not tracked yet', consequence: vendor.insuranceStatus ? undefined : 'A liability gap leaves the client legally exposed for over-service.' },
      { key: 'barType', question: 'Bar type confirmed (open / cash / limited / dry)?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'alcoholSupply', question: 'Who supplies the alcohol confirmed (vendor vs client + corkage)?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'finalGuestCount', question: 'Final guest count confirmed?', status: confirmedGuests > 0 ? 'answered' : 'missing', value: confirmedGuests > 0 ? `${confirmedGuests} confirmed` : 'Not set', consequence: 'Drink quantities and bartender count both key off the final guest count.' },
      { key: 'bartenderCount', question: 'Bartender count confirmed (≈1 per 50–75 guests)?', status: 'unknown', value: 'Not tracked yet', consequence: 'Too few bartenders and the bar line becomes the event.' },
      { key: 'beverageMenu', question: 'Beverage menu confirmed (signature cocktails, beer & wine)?', status: 'unknown', value: 'Not tracked yet' },
      arrivalQuestion(vendor),
      { key: 'lastCall', question: 'Last call / service end time confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'Last call must match the venue end time or the room clears with drinks still pouring.' },
      { key: 'glassware', question: 'Glassware / ice / mixers — who provides confirmed?', status: 'unknown', value: 'Not tracked yet' },
      finalPaymentQuestion(vendor),
    ];
  },

  rentals(vendor, event) {
    return [
      { key: 'deliveryWindow', question: 'Delivery window confirmed?', status: vendor.arrivalTime ? 'answered' : 'missing', value: vendor.arrivalTime || 'Not set', consequence: vendor.arrivalTime ? undefined : 'Delivery after setup needs blocks the entire day.' },
      { key: 'pickupWindow', question: 'Pickup window confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'itemCount', question: 'Item count confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'Quantity mismatch surfaces as a fire on event day.' },
      { key: 'floorplan', question: 'Floorplan mapping confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'setupResponsibility', question: 'Setup responsibility confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'damagePolicy', question: 'Damage policy confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'weatherBackup', question: 'Weather backup confirmed?', status: 'unknown', value: 'Not tracked yet' },
      finalPaymentQuestion(vendor),
      { key: 'strikeRules', question: 'Strike rules confirmed?', status: 'unknown', value: 'Not tracked yet' },
    ];
  },

  officiant(vendor, event) {
    return [
      { key: 'ceremonyScript', question: 'Ceremony script / vows finalized?', status: 'unknown', value: 'Not tracked yet', consequence: 'A late script means no rehearsal and surprises at the altar.' },
      { key: 'rehearsal', question: 'Rehearsal attendance confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'marriageLicense', question: 'Marriage license / paperwork plan confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'No signed license means the marriage is not legal — non-negotiable.' },
      { key: 'pronunciations', question: 'Names / pronunciations confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'ceremonyTiming', question: 'Ceremony start time & length confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'soundMic', question: 'Sound / microphone plan confirmed?', status: 'unknown', value: 'Not tracked yet' },
      arrivalQuestion(vendor),
      finalPaymentQuestion(vendor),
    ];
  },

  transportation(vendor, event) {
    return [
      { key: 'vehicleCount', question: 'Vehicle count & capacity confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'Too little capacity strands guests between venues.' },
      { key: 'schedule', question: 'Pickup / drop-off schedule confirmed?', status: vendor.arrivalTime ? 'answered' : 'missing', value: vendor.arrivalTime || vendor.arrival_time || 'Not set' },
      { key: 'route', question: 'Route & travel time confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'driverContact', question: 'Driver day-of contact confirmed?', status: vendor.contactName ? 'answered' : 'unknown', value: vendor.contactName || 'Not tracked yet' },
      { key: 'gratuity', question: 'Gratuity / payment terms confirmed?', status: 'unknown', value: 'Not tracked yet' },
      finalPaymentQuestion(vendor),
    ];
  },

  hairMakeup(vendor, event) {
    return [
      { key: 'trial', question: 'Trial / preview complete?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'serviceCount', question: 'Number of services confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'Service count drives the day-of timeline and start time.' },
      { key: 'schedule', question: 'Per-person schedule / timing confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'location', question: 'On-site vs salon location confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'allergies', question: 'Product / allergy notes confirmed?', status: 'unknown', value: 'Not tracked yet' },
      arrivalQuestion(vendor),
      finalPaymentQuestion(vendor),
    ];
  },

  av(vendor, event) {
    const hasTimeline = !!(event && ((event.timeline && event.timeline.length) || (event.ros && event.ros.length)));
    return [
      { key: 'equipmentList', question: 'Equipment list confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'power', question: 'Power / electrical needs confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'Unconfirmed power = dead mics and dark screens day-of.' },
      { key: 'soundcheck', question: 'Soundcheck / tech rehearsal confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'presentation', question: 'Slides / presentation received?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'streaming', question: 'Streaming / recording plan confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'timeline', question: 'Run-of-show received?', status: hasTimeline ? 'answered' : 'unknown', value: hasTimeline ? 'Schedule available' : 'Not tracked yet' },
      arrivalQuestion(vendor),
      finalPaymentQuestion(vendor),
    ];
  },

  security(vendor, event) {
    return [
      { key: 'guardCount', question: 'Guard count confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'Understaffed security leaves entrances and crowds uncovered.' },
      { key: 'coverage', question: 'Coverage hours confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'accessControl', question: 'Access-control / guest-list plan confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'emergency', question: 'Emergency / evacuation protocol confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'licensing', question: 'Licensing / insurance on file?', status: vendor.insuranceStatus ? 'answered' : 'unknown', value: vendor.insuranceStatus || 'Not tracked yet' },
      arrivalQuestion(vendor),
      finalPaymentQuestion(vendor),
    ];
  },

  staffing(vendor, event) {
    return [
      { key: 'staffCount', question: 'Staff count confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'Too few staff and service slows to a crawl at peak.' },
      { key: 'roles', question: 'Roles / responsibilities confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'dressCode', question: 'Uniform / dress code confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'shiftTimes', question: 'Arrival / shift times confirmed?', status: vendor.arrivalTime ? 'answered' : 'missing', value: vendor.arrivalTime || vendor.arrival_time || 'Not set' },
      { key: 'pointOfContact', question: 'Lead / point of contact confirmed?', status: vendor.contactName ? 'answered' : 'unknown', value: vendor.contactName || 'Not tracked yet' },
      { key: 'meals', question: 'Staff meal / break plan confirmed?', status: 'unknown', value: 'Not tracked yet' },
      finalPaymentQuestion(vendor),
    ];
  },

  cake(vendor, event) {
    const confirmedGuests = event && event.guests ? event.guests.filter(g => g.rsvp === 'Yes').length : 0;
    return [
      { key: 'design', question: 'Flavor & design finalized?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'servings', question: 'Serving count confirmed?', status: confirmedGuests > 0 ? 'answered' : 'unknown', value: confirmedGuests > 0 ? `${confirmedGuests} guests` : 'Not tracked yet', consequence: 'Servings must track the final guest count or you run short.' },
      { key: 'delivery', question: 'Delivery vs pickup confirmed?', status: vendor.arrivalTime ? 'answered' : 'missing', value: vendor.arrivalTime || vendor.arrival_time || 'Not set' },
      { key: 'setup', question: 'Cake table / setup needs confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'allergens', question: 'Dietary / allergen notes confirmed?', status: 'unknown', value: 'Not tracked yet' },
      finalPaymentQuestion(vendor),
    ];
  },

  photoBooth(vendor, event) {
    return [
      { key: 'boothType', question: 'Booth type & space / footprint confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'power', question: 'Power / outlet access confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'No power means no booth.' },
      { key: 'propsBackdrop', question: 'Props / backdrop confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'output', question: 'Prints / digital sharing confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'attendant', question: 'On-site attendant confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'hours', question: 'Run hours confirmed?', status: 'unknown', value: 'Not tracked yet' },
      arrivalQuestion(vendor),
      finalPaymentQuestion(vendor),
    ];
  },

  coordinator(vendor, event) {
    const hasTimeline = !!(event && ((event.timeline && event.timeline.length) || (event.ros && event.ros.length)));
    return [
      { key: 'timeline', question: 'Day-of timeline owned & shared?', status: hasTimeline ? 'answered' : 'missing', value: hasTimeline ? 'Schedule available' : 'Not yet built', consequence: hasTimeline ? undefined : 'A coordinator without the timeline cannot run the day.' },
      { key: 'contactSheet', question: 'Vendor contact sheet assembled?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'walkthrough', question: 'Venue walkthrough complete?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'pointOfContact', question: 'Day-of point of contact confirmed?', status: vendor.contactName ? 'answered' : 'missing', value: vendor.contactName || 'Not set' },
      { key: 'emergencyKit', question: 'Emergency / day-of kit prepared?', status: 'unknown', value: 'Not tracked yet' },
      arrivalQuestion(vendor),
      finalPaymentQuestion(vendor),
    ];
  },

  childcare(vendor, event) {
    return [
      { key: 'ratio', question: 'Caregiver-to-child ratio confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'An unsafe ratio is a liability and a safety risk.' },
      { key: 'ageRange', question: 'Age range & headcount confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'activities', question: 'Activities / supplies confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'location', question: 'Room / space confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'medical', question: 'Allergy / medical info collected?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'licensing', question: 'Licensing / insurance on file?', status: vendor.insuranceStatus ? 'answered' : 'unknown', value: vendor.insuranceStatus || 'Not tracked yet' },
      arrivalQuestion(vendor),
    ];
  },

  // ── Edge-case / specialty vendors ────────────────────────────────────────
  stationery(vendor, event) {
    return [
      { key: 'proofs', question: 'Proofs / wording approved?', status: 'unknown', value: 'Not tracked yet', consequence: 'Misprints on names or dates cannot be undone after the run.' },
      { key: 'quantities', question: 'Quantities confirmed (invites, place cards, signage)?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'materials', question: 'Materials / who supplies confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'deadline', question: 'Print / lettering deadline confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'delivery', question: 'Delivery / install plan confirmed?', status: vendor.arrivalTime ? 'answered' : 'unknown', value: vendor.arrivalTime || 'Not tracked yet' },
      finalPaymentQuestion(vendor),
    ];
  },

  staging(vendor, event) {
    return [
      { key: 'size', question: 'Floor / stage size & layout confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'install', question: 'Install / strike window confirmed?', status: vendor.arrivalTime ? 'answered' : 'missing', value: vendor.arrivalTime || 'Not set', consequence: 'Install must fit inside the venue access window.' },
      { key: 'subfloor', question: 'Subfloor / leveling needs confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'power', question: 'Power / lighting integration confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'delivery', question: 'Delivery & pickup confirmed?', status: 'unknown', value: 'Not tracked yet' },
      finalPaymentQuestion(vendor),
    ];
  },

  restroom(vendor, event) {
    return [
      { key: 'capacity', question: 'Unit count & capacity vs guest count confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'Too few units creates long lines and sanitation issues.' },
      { key: 'hookups', question: 'Water / power / waste hookups confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'A trailer without hookups cannot operate.' },
      { key: 'placement', question: 'Placement & access path confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'servicing', question: 'Servicing / attendant plan confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'delivery', question: 'Delivery & pickup window confirmed?', status: vendor.arrivalTime ? 'answered' : 'missing', value: vendor.arrivalTime || 'Not set' },
      finalPaymentQuestion(vendor),
    ];
  },

  sendoff(vendor, event) {
    return [
      { key: 'permits', question: 'Permits / fire-marshal approval on file?', status: 'unknown', value: 'Not tracked yet', consequence: 'No permit means no send-off — and possible fines or shutdown.' },
      { key: 'venueApproval', question: 'Venue approval confirmed (open flame / pyro)?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'quantities', question: 'Quantities & type confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'timing', question: 'Send-off timing in the schedule confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'safety', question: 'Safety / spotters / extinguisher plan confirmed?', status: 'unknown', value: 'Not tracked yet' },
      arrivalQuestion(vendor),
    ];
  },

  livepainter(vendor, event) {
    return [
      { key: 'canvasSize', question: 'Canvas / medium & final size confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'space', question: 'Setup space & footprint confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'lighting', question: 'Lighting / power for the easel confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'timing', question: 'Paint window in the timeline confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'deliverable', question: 'Drying / take-home handoff confirmed?', status: 'unknown', value: 'Not tracked yet' },
      arrivalQuestion(vendor),
      finalPaymentQuestion(vendor),
    ];
  },

  power(vendor, event) {
    return [
      { key: 'load', question: 'Total load / wattage requirement confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'An undersized generator browns out the whole event.' },
      { key: 'fuel', question: 'Fuel / runtime confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'placement', question: 'Placement & noise / distance confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'distribution', question: 'Cable runs / distribution confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'delivery', question: 'Delivery & pickup window confirmed?', status: vendor.arrivalTime ? 'answered' : 'missing', value: vendor.arrivalTime || 'Not set' },
      finalPaymentQuestion(vendor),
    ];
  },

  draping(vendor, event) {
    return [
      { key: 'coverage', question: 'Coverage area & design confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'install', question: 'Install / strike window confirmed?', status: vendor.arrivalTime ? 'answered' : 'missing', value: vendor.arrivalTime || 'Not set' },
      { key: 'fireRating', question: 'Fabric fire rating confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'Venues require flame-rated drape — unrated fabric gets pulled.' },
      { key: 'attachment', question: 'Attachment / rigging rules confirmed with venue?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'delivery', question: 'Delivery & pickup confirmed?', status: 'unknown', value: 'Not tracked yet' },
      finalPaymentQuestion(vendor),
    ];
  },

  cart(vendor, event) {
    const confirmedGuests = event && event.guests ? event.guests.filter(g => g.rsvp === 'Yes').length : 0;
    return [
      { key: 'menu', question: 'Menu / offerings confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'utilities', question: 'Power / water needs confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'A cart without power or water cannot serve.' },
      { key: 'servings', question: 'Serving count vs guest count confirmed?', status: confirmedGuests > 0 ? 'answered' : 'unknown', value: confirmedGuests > 0 ? `${confirmedGuests} guests` : 'Not tracked yet' },
      { key: 'staffing', question: 'Staffing / attendant confirmed?', status: 'unknown', value: 'Not tracked yet' },
      arrivalQuestion(vendor),
      finalPaymentQuestion(vendor),
    ];
  },

  foodtruck(vendor, event) {
    const confirmedGuests = event && event.guests ? event.guests.filter(g => g.rsvp === 'Yes').length : 0;
    return [
      { key: 'menu', question: 'Menu & service style confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'permits', question: 'Permits / health-dept license on file?', status: 'unknown', value: 'Not tracked yet', consequence: 'No permit means the truck can be turned away on the day.' },
      { key: 'placement', question: 'Placement, power & footprint confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'serviceWindow', question: 'Service window vs guest count confirmed?', status: confirmedGuests > 0 ? 'answered' : 'unknown', value: confirmedGuests > 0 ? `${confirmedGuests} guests` : 'Not tracked yet', consequence: 'A single window slows service for a large count.' },
      arrivalQuestion(vendor),
      finalPaymentQuestion(vendor),
    ];
  },

  concierge(vendor, event) {
    return [
      { key: 'roomBlock', question: 'Room block / lodging confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'welcomeBags', question: 'Welcome bags / amenities confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'transport', question: 'Guest transport coordination confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'guestComms', question: 'Guest communications / itinerary confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'deadlines', question: 'Booking cutoff / deadlines confirmed?', status: 'unknown', value: 'Not tracked yet', consequence: 'Missed room-block cutoffs strand out-of-town guests.' },
      finalPaymentQuestion(vendor),
    ];
  },

  animals(vendor, event) {
    return [
      { key: 'permits', question: 'Permits / insurance / liability on file?', status: vendor.insuranceStatus ? 'answered' : 'unknown', value: vendor.insuranceStatus || 'Not tracked yet', consequence: 'Live animals carry liability the venue must approve.' },
      { key: 'venueApproval', question: 'Venue approval for animals confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'space', question: 'Space / containment & handler count confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'welfare', question: 'Animal welfare / shade / water plan confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'cleanup', question: 'Cleanup responsibility confirmed?', status: 'unknown', value: 'Not tracked yet' },
      arrivalQuestion(vendor),
    ];
  },

  content(vendor, event) {
    return [
      { key: 'deliverables', question: 'Deliverables confirmed (reels, posts, raw clips)?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'postTimeline', question: 'Posting / turnaround timeline confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'usageRights', question: 'Usage rights / tagging confirmed?', status: 'unknown', value: 'Not tracked yet' },
      { key: 'coverage', question: 'Coverage hours confirmed?', status: 'unknown', value: 'Not tracked yet' },
      arrivalQuestion(vendor),
      finalPaymentQuestion(vendor),
    ];
  },
};

// ── Public API ──────────────────────────────────────────────────────────────
export function getVendorRequiredQuestions(vendor, event) {
  const key = categoryKey(vendor);
  if (!key || !TEMPLATES[key]) {
    // Generic fallback for uncategorized vendors
    return [
      arrivalQuestion(vendor),
      finalPaymentQuestion(vendor),
      {
        key: 'scope',
        question: 'Scope of work confirmed?',
        status: vendor.status === 'Confirmed' || vendor.status === 'Booked' ? 'answered' : 'unknown',
        value: vendor.category || 'Not categorized',
      },
    ];
  }
  return TEMPLATES[key](vendor, event);
}

export function getVendorCategoryKey(vendor) {
  return categoryKey(vendor);
}
