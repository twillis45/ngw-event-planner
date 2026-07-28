// ─── Place Intelligence (LOCATION-VENUE-1) ────────────────────────────────────
// ONE Place Core, two questions:
//   Location Intelligence — "what does this place change about the event plan?"
//   Venue Intelligence    — "what must be confirmed with this venue before event day?"
// (Intelligence Engine Doctrine §10 — never two competing place engines.)
//
// Deterministic rules over EXISTING event fields only — no maps, no geocoding,
// no invented parking/backup/access/venue-rule facts. Every section is one of
// handled / needs / risk / na, and na (not-applicable) is SUPPRESSED work,
// never a failure: at-home events aren't punished for venue-only fields,
// vendorless events aren't punished for load-in gaps.
//
// This helper is the single source for the Event Details "Location check"
// card. It does not compute readiness scores — whole-event readiness stays
// with wholeEventReadinessScore (PROGRESS doctrine). Counts, not percentages.

import { rainPlanStatus, RAIN_PLAN_TARGET, isLikelyOutdoor } from './weather';
import { venueFor } from './venueFor';

export const PLACE_STATES = {
  HANDLED: 'handled',
  NEEDS: 'needs',
  RISK: 'risk',
  NA: 'na',
};

// Deep-link targets — every CTA this engine emits lands on a real anchor in
// the Event Details tab (same id-wrapper pattern as rain-plan / event-date).
// Renaming an anchor in App.js without updating this map breaks the deep
// link, which the placeIntelligence tests pin.
export const PLACE_TARGETS = {
  venue:   { tab: 'Event Details', focusField: 'event-venue' },
  parking: { tab: 'Event Details', focusField: 'parking-notes' },
  loadIn:  { tab: 'Event Details', focusField: 'loadin-notes' },
  rain:    RAIN_PLAN_TARGET, // one rain target, shared with lib/weather.js
  contact: { tab: 'Event Details', focusField: 'venue-contact' },
  rules:   { tab: 'Event Details', focusField: 'house-rules' },
};

const has = (v) => !!String(v || '').trim();

export function derivePlaceIntelligence(event = {}) {
  // ONE venue reader (venueFor) — kind rule, at-home carve-out, and the
  // CITY-LEAK gate all live there now instead of a local copy.
  const vf = venueFor(event);
  const kind = vf.kind;
  const atHome = vf.isHome;
  const venueResolved = vf.isSet;
  const hasAddress = !!vf.address;
  const outdoors = kind === 'outdoor'
    || event.indoorOutdoor === 'outdoor'
    || event.indoorOutdoor === 'both'
    || (!event.indoorOutdoor && isLikelyOutdoor(vf.name, event.notes || ''));
  const indoorOnly = event.indoorOutdoor === 'indoor';
  const hasVendors = (event.vendors || []).some((v) => v && has(v.name));
  const rain = rainPlanStatus(event);

  const sections = [];
  const add = (key, label, state, detail, actionLabel) => {
    sections.push({
      key, label, state, detail,
      action: (state === PLACE_STATES.NEEDS || state === PLACE_STATES.RISK) && actionLabel
        ? { id: `place-${key}`, label: actionLabel, route: PLACE_TARGETS[key] }
        : null,
    });
  };

  // 1 · Venue / location — the foundation everything else hangs on.
  if (!venueResolved) {
    add('venue', 'Venue / location', PLACE_STATES.NEEDS,
      'Add it so guest directions and vendor plans stay accurate.',
      atHome ? 'Add your city' : 'Add the location');
  } else {
    add('venue', 'Venue / location', PLACE_STATES.HANDLED, `Set: ${vf.displayLine || vf.name}`);
  }

  // 2 · Guest arrival — guests need an exact address, not just a name.
  if (!venueResolved) {
    add('arrival', 'Guest arrival', PLACE_STATES.NEEDS,
      'Guests need to know where to go — start with the location above.', null);
  } else if (hasAddress) {
    add('arrival', 'Guest arrival', PLACE_STATES.HANDLED, 'Address entered — guests can be sent exact directions.');
  } else {
    sections.push({
      key: 'arrival', label: 'Guest arrival', state: PLACE_STATES.NEEDS,
      detail: atHome
        ? 'Add your street address so guests know exactly where to go.'
        : 'Add the address so guest directions are exact.',
      action: { id: 'place-arrival', label: 'Add the address', route: PLACE_TARGETS.venue },
    });
  }

  // 3 · Parking / access — host-authored notes only; never invented.
  if (has(event.parkingNotes)) {
    add('parking', 'Parking & access', PLACE_STATES.HANDLED, 'Parking notes saved.');
  } else {
    add('parking', 'Parking & access',
      outdoors ? PLACE_STATES.RISK : PLACE_STATES.NEEDS,
      atHome
        ? 'Where do guests park — street, driveway, a lot nearby?'
        : 'Confirm parking with the venue so guests aren’t guessing.',
      'Add parking notes');
  }

  // 4 · Rain backup — indoor-only venues genuinely don't need one (na, not
  // failure). Everyone else: a saved plan is handled; outdoors without one
  // is a real risk; unknown gets an honest nudge, not a warning.
  if (indoorOnly && !atHome) {
    add('rain', 'Rain backup', PLACE_STATES.NA, 'Indoor venue — a rain backup isn’t required.');
  } else if (rain.hasPlan) {
    add('rain', 'Rain backup', PLACE_STATES.HANDLED, 'Rain plan saved.');
  } else if (outdoors) {
    add('rain', 'Rain backup', PLACE_STATES.RISK,
      atHome
        ? 'Pick the indoor or covered spot everything moves to if weather turns.'
        : 'Confirm the venue’s indoor backup space before weather becomes a problem.',
      'Add rain backup');
  } else {
    add('rain', 'Rain backup', PLACE_STATES.NEEDS,
      'If any part of the day is outside, note the backup spot.', 'Add rain backup');
  }

  // 5 · Vendor setup / load-in — only exists when vendors exist.
  if (!hasVendors) {
    add('loadIn', 'Vendor setup', PLACE_STATES.NA, 'No vendors yet — load-in instructions aren’t needed.');
  } else if (has(event.loadInNotes)) {
    add('loadIn', 'Vendor setup', PLACE_STATES.HANDLED, 'Load-in notes saved — vendors can see where and when to set up.');
  } else {
    add('loadIn', 'Vendor setup', PLACE_STATES.NEEDS,
      'Vendors will look here for arrival and load-in instructions.', 'Add load-in notes');
  }

  // 6 · Venue contact — venue events only; at-home hosts ARE the contact.
  if (atHome) {
    add('contact', 'Venue contact', PLACE_STATES.NA, 'You’re the point of contact at home.');
  } else if (has(event.venueContact) || has(event.venuePhone)) {
    add('contact', 'Venue contact', PLACE_STATES.HANDLED, 'Day-of contact entered.');
  } else {
    add('contact', 'Venue contact', PLACE_STATES.NEEDS,
      'Confirm with the venue who your day-of contact is.', 'Add venue contact');
  }

  // 7 · Rules / restrictions — venue events only; a home has no venue rules
  // to confirm (house notes stay optional, never a gap).
  if (atHome) {
    add('rules', 'Venue rules', PLACE_STATES.NA, 'Your house, your rules.');
  } else if (has(event.houseRules)) {
    add('rules', 'Venue rules', PLACE_STATES.HANDLED, 'Rules noted.');
  } else {
    add('rules', 'Venue rules', PLACE_STATES.NEEDS,
      'Ask the venue about end time, decor limits, and outside-vendor rules.', 'Add venue rules');
  }

  const open = sections.filter((x) => x.state === PLACE_STATES.NEEDS || x.state === PLACE_STATES.RISK);
  const missingItems = open.map((x) => x.label);
  const risks = sections.filter((x) => x.state === PLACE_STATES.RISK).map((x) => x.detail);
  const actions = open.map((x) => x.action).filter(Boolean);

  // Honest, non-specific extras (kept from the prior gaps card — nudges to
  // check, never asserted facts).
  const notes = [];
  const bigGuests = Number(event.guestCount) >= 50 || Number(event.guestEstimate) >= 50;
  if (outdoors && (bigGuests || kind === 'outdoor')) {
    notes.push('Public or large outdoor events often need a city or park permit — check with your city.');
  }
  if (event.coiNeeded === 'required' && hasVendors) {
    notes.push('COI required — collect certificates from your vendors.');
  }

  // Status headline — count/status language, never a percentage.
  let status, headline;
  if (!venueResolved) {
    status = 'missing';
    headline = 'Location is missing. Add it so guest directions and vendor plans stay accurate.';
  } else if (open.length > 0) {
    status = 'attention';
    const list = missingItems.slice(0, 3).map((l) => l.toLowerCase());
    const lead = atHome ? 'You’re hosting at home.' : 'Your venue is set.';
    headline = `${lead} Confirm ${list.join(', ')}${missingItems.length > 3 ? ', and more' : ''}.`;
  } else {
    status = 'handled';
    headline = atHome ? 'Home logistics look handled.' : 'Venue details look handled.';
  }

  return {
    kind, atHome, outdoors, status, headline,
    summary: open.length > 0
      ? `${open.length} location detail${open.length === 1 ? '' : 's'} need${open.length === 1 ? 's' : ''} attention`
      : 'Location looks handled',
    sections, missingItems, risks, actions, notes,
  };
}
