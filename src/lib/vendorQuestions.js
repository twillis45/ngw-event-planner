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
