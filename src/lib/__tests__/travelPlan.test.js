// DESTINATION-2 — shared travel engine (lodging / air / ground).
// Doctrine under test: gated ONLY on event.isDestination (Phase 1's flag);
// headcount mode degrades (host info yes, guest rows never invented);
// transportProvided derives from the dest_transport decision answer in
// event.foodChoices (single source — Phase 1 put the call there), never from
// a duplicated boolean; ride math is host-mediated counting, no auto-matching;
// staleness is an injectable-clock window, never the real clock in tests.

import {
  buildTravelPlan,
  recentlyChanged,
  transportDecision,
  nextLodgingStatus,
  LODGING_STATUSES,
  rideStatusOf,
  nextRideStatus,
  rideFieldsFor,
  RIDE_STATUSES,
  arrivalClusters,
  CARE_UNIT_STATUSES,
  CARE_UNIT_STATUS_LABEL,
} from '../travelPlan';

const NOW = new Date('2026-08-01T12:00:00').getTime();
const HOUR = 3600000;

const ev = (over = {}) => ({
  id: 'e-dest',
  type: 'Birthday',
  date: '2026-09-12',
  isDestination: true,
  guestCount: 24,
  lodging: {
    hotelName: 'Harborview Inn',
    rate: 189,
    code: 'CHEN25',
    deadline: '2026-08-12',
    backupOptions: [{ name: 'Bayside Suites', note: '10 min farther, usually cheaper' }],
  },
  airportOptions: [
    { code: 'PWM', name: 'Portland Jetport', note: 'Closest — 25 min, fewer direct flights' },
    { code: 'BOS', name: 'Boston Logan', note: 'More directs, but a 2 hr drive' },
  ],
  groundTransport: { lastReturnNote: 'Last shuttle back leaves 11pm', pickupPoints: [{ name: 'Hotel lobby', note: 'On the hour' }] },
  ...over,
});

const guest = (id, name, travel = {}, over = {}) => ({ id, name, rsvp: 'Yes', travel, ...over });

// ── Relevance gate ─────────────────────────────────────────────────────────────

test('1 · not relevant when isDestination is falsy — even with travel fields entered', () => {
  expect(buildTravelPlan(ev({ isDestination: false })).relevant).toBe(false);
  expect(buildTravelPlan(ev({ isDestination: undefined })).relevant).toBe(false);
  expect(buildTravelPlan(null).relevant).toBe(false);
});

test('2 · relevant on any base type once the flag is set — the flag is the only gate', () => {
  expect(buildTravelPlan(ev({ type: 'Anniversary' }), { now: NOW }).relevant).toBe(true);
  expect(buildTravelPlan(ev({ type: 'Retirement Party' }), { now: NOW }).relevant).toBe(true);
});

// ── Headcount-only degradation ────────────────────────────────────────────────

test('3 · headcount mode: host-level info intact, roster arrays empty, no invented counts', () => {
  const p = buildTravelPlan(ev(), { now: NOW }); // guestCount only, no guests[]
  expect(p.relevant).toBe(true);
  expect(p.rosterMode).toBe(false);
  expect(p.lodging.hotelName).toBe('Harborview Inn');
  expect(p.lodging.rate).toBe(189);
  expect(p.lodging.code).toBe('CHEN25');
  expect(p.lodging.deadline).toBe('2026-08-12');
  expect(p.lodging.backupOptions).toHaveLength(1);
  expect(p.air.airportOptions.map((a) => a.code)).toEqual(['PWM', 'BOS']);
  expect(p.ground.lastReturnNote).toMatch(/11pm/);
  expect(p.ground.pickupPoints[0].name).toBe('Hotel lobby');
  // Degrade, never invent: empty rosters, and notBookedCount is null (unknown), not 0.
  expect(p.lodging.roster).toEqual([]);
  expect(p.lodging.notBookedCount).toBeNull();
  expect(p.air.roster).toEqual([]);
  expect(p.air.conflicts).toEqual([]);
  expect(p.ground.roster).toEqual([]);
  expect(p.ground.needRide).toEqual([]);
  expect(p.ground.unmatched).toBe(0);
});

// ── Lodging roster + notBookedCount ───────────────────────────────────────────

test('4 · notBookedCount counts only not_started travelers; declined guests are excluded', () => {
  const p = buildTravelPlan(ev({
    guests: [
      guest('g1', 'Ana', { lodging: { status: 'booked' } }),
      guest('g2', 'Ben', { lodging: { status: 'confirmed' } }),
      guest('g3', 'Cam', { lodging: { status: 'not_started' } }),
      guest('g4', 'Dee', {}), // no travel entry at all — still not started
      guest('g5', 'Eli', { lodging: { status: 'booked' } }, { rsvp: 'No' }), // declined — out entirely
    ],
  }), { now: NOW });
  expect(p.rosterMode).toBe(true);
  expect(p.lodging.roster).toHaveLength(4);
  expect(p.lodging.roster.find((r) => r.guestId === 'g5')).toBeUndefined();
  expect(p.lodging.notBookedCount).toBe(2); // Cam + Dee
  const ana = p.lodging.roster.find((r) => r.guestId === 'g1');
  expect(ana.status).toBe('booked');
});

test('5 · lodging status normalizes loose input and cycles not_started → booked → confirmed', () => {
  const p = buildTravelPlan(ev({
    guests: [guest('g1', 'Ana', { lodging: { status: 'Not Started' } })],
  }), { now: NOW });
  expect(p.lodging.roster[0].status).toBe('not_started');
  expect(LODGING_STATUSES).toEqual(['not_started', 'booked', 'confirmed']);
  expect(nextLodgingStatus('not_started')).toBe('booked');
  expect(nextLodgingStatus('booked')).toBe('confirmed');
  expect(nextLodgingStatus('confirmed')).toBe('not_started');
});

// ── Air conflicts ─────────────────────────────────────────────────────────────

test('6 · arriving after the event start is flagged arrives_late', () => {
  const p = buildTravelPlan(ev({
    guests: [
      guest('g1', 'Ana', { air: { airportCode: 'PWM', arriveDate: '2026-09-13', departDate: '2026-09-14' } }),
      guest('g2', 'Ben', { air: { airportCode: 'PWM', arriveDate: '2026-09-11', departDate: '2026-09-13' } }),
    ],
  }), { now: NOW });
  expect(p.air.conflicts).toHaveLength(1);
  expect(p.air.conflicts[0]).toMatchObject({ guestId: 'g1', type: 'arrives_late' });
  expect(p.air.conflicts[0].copy).toMatch(/after the event starts/);
});

test('7 · departing before the event end is flagged leaves_early (endDate honored, else same-day)', () => {
  // Multi-day: host set endDate — Ben leaves mid-event.
  const multi = buildTravelPlan(ev({
    endDate: '2026-09-14',
    guests: [guest('g2', 'Ben', { air: { arriveDate: '2026-09-11', departDate: '2026-09-13' } })],
  }), { now: NOW });
  expect(multi.air.conflicts).toHaveLength(1);
  expect(multi.air.conflicts[0]).toMatchObject({ guestId: 'g2', type: 'leaves_early' });
  // Single-day fallback: same guest is fine when the event ends 09-12.
  const single = buildTravelPlan(ev({
    guests: [guest('g2', 'Ben', { air: { arriveDate: '2026-09-11', departDate: '2026-09-12' } })],
  }), { now: NOW });
  expect(single.air.conflicts).toEqual([]);
});

test('8 · no conflict is ever claimed from unreadable dates or a dateless event', () => {
  const noDate = buildTravelPlan(ev({
    date: null,
    guests: [guest('g1', 'Ana', { air: { arriveDate: '2026-09-13' } })],
  }), { now: NOW });
  expect(noDate.air.conflicts).toEqual([]);
  const badDate = buildTravelPlan(ev({
    guests: [guest('g1', 'Ana', { air: { arriveDate: 'next thursday' } })],
  }), { now: NOW });
  expect(badDate.air.conflicts).toEqual([]);
  expect(badDate.air.roster[0].arriveDate).toBeNull();
  expect(badDate.air.roster[0].hasFlightInfo).toBe(false);
});

// ── Ground — host-mediated ride math ──────────────────────────────────────────

test('9 · unmatched = riders needing rides minus explicitly offered seats, never negative', () => {
  const base = {
    guests: [
      guest('g1', 'Ana', { ground: { needsRide: true } }),
      guest('g2', 'Ben', { ground: { needsRide: true } }),
      guest('g3', 'Cam', { ground: { needsRide: true } }),
      guest('g4', 'Dee', { ground: { rentingCar: true, canOfferRide: true, seats: 2 } }),
    ],
  };
  const p = buildTravelPlan(ev(base), { now: NOW });
  expect(p.ground.needRide.map((r) => r.guestId)).toEqual(['g1', 'g2', 'g3']);
  expect(p.ground.canOfferRide.map((r) => r.guestId)).toEqual(['g4']);
  expect(p.ground.offeredSeats).toBe(2);
  expect(p.ground.unmatched).toBe(1);
  // Plenty of seats → 0, never negative.
  const covered = buildTravelPlan(ev({
    guests: [
      guest('g1', 'Ana', { ground: { needsRide: true } }),
      guest('g4', 'Dee', { ground: { canOfferRide: true, seats: 5 } }),
    ],
  }), { now: NOW });
  expect(covered.ground.unmatched).toBe(0);
  // An offer with NO seat count contributes 0 seats — we never guess capacity.
  const noSeats = buildTravelPlan(ev({
    guests: [
      guest('g1', 'Ana', { ground: { needsRide: true } }),
      guest('g4', 'Dee', { ground: { canOfferRide: true } }),
    ],
  }), { now: NOW });
  expect(noSeats.ground.offeredSeats).toBe(0);
  expect(noSeats.ground.unmatched).toBe(1);
});

// ── Staleness window ──────────────────────────────────────────────────────────

test('10 · recentlyChanged: inside the 48h window flags, outside/missing/future does not', () => {
  expect(recentlyChanged({ updatedAt: NOW - 47 * HOUR }, NOW)).toBe(true);
  expect(recentlyChanged({ updatedAt: NOW - 49 * HOUR }, NOW)).toBe(false);
  expect(recentlyChanged({ updatedAt: NOW - 3 * HOUR }, NOW, 2)).toBe(false); // custom window
  expect(recentlyChanged({}, NOW)).toBe(false);
  expect(recentlyChanged(null, NOW)).toBe(false);
  expect(recentlyChanged({ updatedAt: NOW + HOUR }, NOW)).toBe(false); // future timestamps never flag
});

test('11 · roster rows carry recentlyChanged from the injected clock, per sub-object', () => {
  const p = buildTravelPlan(ev({
    guests: [
      guest('g1', 'Ana', {
        lodging: { status: 'booked', updatedAt: NOW - 2 * HOUR },
        air: { arriveDate: '2026-09-11', updatedAt: NOW - 90 * HOUR },
      }),
    ],
  }), { now: NOW });
  expect(p.lodging.roster[0].recentlyChanged).toBe(true);
  expect(p.air.roster[0].recentlyChanged).toBe(false);
  expect(p.ground.roster[0].recentlyChanged).toBe(false); // no ground entry — no flag
});

// ── Transport derivation — single source of truth ─────────────────────────────

test('12 · transportProvided derives from the dest_transport decision answer', () => {
  const yes = buildTravelPlan(ev({ foodChoices: { dest_transport: 'Yes, a shuttle or van' } }), { now: NOW });
  expect(yes.ground.transportProvided).toBe(true);
  expect(yes.ground.transportSource).toBe('decision');
  const no = buildTravelPlan(ev({ foodChoices: { dest_transport: 'No, guests self-manage' } }), { now: NOW });
  expect(no.ground.transportProvided).toBe(false);
  expect(no.ground.transportSource).toBe('decision');
});

test('13 · an unanswered decision never reads as an answer — "Not sure yet" and silence are null', () => {
  const unsure = buildTravelPlan(ev({ foodChoices: { dest_transport: 'Not sure yet' } }), { now: NOW });
  expect(unsure.ground.transportProvided).toBeNull();
  expect(unsure.ground.transportSource).toBe('decision');
  const silent = buildTravelPlan(ev(), { now: NOW }); // no foodChoices at all
  expect(silent.ground.transportProvided).toBeNull();
  expect(silent.ground.transportSource).toBeNull();
});

test('14 · legacy boolean field is only a fallback; the decision answer always wins', () => {
  // Fallback: no decision answered, explicit boolean on the field.
  const field = buildTravelPlan(ev({
    groundTransport: { providing: true, lastReturnNote: null, pickupPoints: [] },
  }), { now: NOW });
  expect(field.ground.transportProvided).toBe(true);
  expect(field.ground.transportSource).toBe('field');
  // Conflict: decision says no — decision wins over the stored boolean.
  const conflict = buildTravelPlan(ev({
    foodChoices: { dest_transport: 'No, guests self-manage' },
    groundTransport: { providing: true, lastReturnNote: null, pickupPoints: [] },
  }), { now: NOW });
  expect(conflict.ground.transportProvided).toBe(false);
  expect(conflict.ground.transportSource).toBe('decision');
  // Direct helper agrees.
  expect(transportDecision({ foodChoices: { dest_transport: 'Yes, a shuttle or van' } }).providing).toBe(true);
  expect(transportDecision({}).providing).toBeNull();
});

// ── Ride status — the 4-step cycle the ride board walks (slice 2) ─────────────

test('15 · rideStatusOf collapses the booleans deterministically — driver first, then rider, then renter', () => {
  expect(rideStatusOf(null)).toBe('not_set');
  expect(rideStatusOf({})).toBe('not_set');
  expect(rideStatusOf({ rentingCar: true })).toBe('renting');
  expect(rideStatusOf({ needsRide: true })).toBe('needs_ride');
  expect(rideStatusOf({ canOfferRide: true, seats: 3 })).toBe('offers_ride');
  // Mixed rows (a renter who also offers seats) read as the offer — the
  // information the host acts on.
  expect(rideStatusOf({ rentingCar: true, canOfferRide: true, seats: 2 })).toBe('offers_ride');
  expect(rideStatusOf({ needsRide: true, canOfferRide: true })).toBe('offers_ride');
});

test('16 · nextRideStatus cycles not set → renting → needs a ride → can offer → not set; junk restarts the cycle', () => {
  expect(nextRideStatus('not_set')).toBe('renting');
  expect(nextRideStatus('renting')).toBe('needs_ride');
  expect(nextRideStatus('needs_ride')).toBe('offers_ride');
  expect(nextRideStatus('offers_ride')).toBe('not_set');
  expect(nextRideStatus('banana')).toBe('renting'); // unknown reads as not_set
  RIDE_STATUSES.forEach((s) => expect(RIDE_STATUSES).toContain(nextRideStatus(s)));
});

test('17 · rideFieldsFor writes a mutually exclusive boolean set (seats untouched — they persist separately)', () => {
  expect(rideFieldsFor('renting')).toEqual({ rentingCar: true, needsRide: false, canOfferRide: false });
  expect(rideFieldsFor('needs_ride')).toEqual({ rentingCar: false, needsRide: true, canOfferRide: false });
  expect(rideFieldsFor('offers_ride')).toEqual({ rentingCar: false, needsRide: false, canOfferRide: true });
  expect(rideFieldsFor('not_set')).toEqual({ rentingCar: false, needsRide: false, canOfferRide: false });
  expect(rideFieldsFor('offers_ride')).not.toHaveProperty('seats');
});

test('18 · ground roster rows carry the collapsed status the ride board shows', () => {
  const p = buildTravelPlan(ev({
    guests: [
      guest('g1', 'Ana', { ground: { needsRide: true } }),
      guest('g2', 'Ben', {}),
      guest('g3', 'Cam', { ground: { rentingCar: true } }),
      guest('g4', 'Dee', { ground: { rentingCar: true, canOfferRide: true, seats: 2 } }),
    ],
  }), { now: NOW });
  expect(p.ground.roster.map((r) => r.status)).toEqual(['needs_ride', 'not_set', 'renting', 'offers_ride']);
});

// ── Arrival clusters (slice 3 — the arrivals board's grouping) ────────────────

test('19 · arrivalClusters groups by arrival day ascending, unknowns last as ONE cluster, roster order kept inside', () => {
  const p = buildTravelPlan(ev({
    guests: [
      guest('g1', 'Ana', { air: { arriveDate: '2026-09-12', arriveTime: '14:05' } }),
      guest('g2', 'Ben', {}),                                     // no flight info — the unknown cluster
      guest('g3', 'Cam', { air: { arriveDate: '2026-09-11' } }),  // earlier day sorts first
      guest('g4', 'Dee', { air: { arriveDate: '2026-09-12' } }),  // same day as Ana, after her
      guest('g5', 'Eli', { air: { arriveDate: 'soonish' } }),     // unreadable day is unknown, never a claimed day
    ],
  }), { now: NOW });
  const clusters = arrivalClusters(p.air.roster);
  expect(clusters.map((c) => c.day)).toEqual(['2026-09-11', '2026-09-12', null]);
  expect(clusters[0].rows.map((r) => r.name)).toEqual(['Cam']);
  expect(clusters[1].rows.map((r) => r.name)).toEqual(['Ana', 'Dee']);
  expect(clusters[2].rows.map((r) => r.name)).toEqual(['Ben', 'Eli']);
});

test('20 · arrivalClusters degrades on junk: empty/absent input → no clusters, never invented rows', () => {
  expect(arrivalClusters([])).toEqual([]);
  expect(arrivalClusters(null)).toEqual([]);
  expect(arrivalClusters(undefined)).toEqual([]);
  expect(arrivalClusters([null, undefined])).toEqual([]);
});

// ── Elder + caregiver lodging units (Destination Celebration deferral) ────────
// Doctrine: the pairing fields on the elder's lodging entry are the ONLY
// marker (nothing inferred about who is an elder); the caregiver name resolves
// from the roster by id, with the host's free-text name as fallback; unit
// status derives ONLY from the two guests' existing booking statuses (or the
// caregiver's rsvp / absence from the roster); no counts are added anywhere.

test('21 · no pairing entered → careUnits empty and roster caregiver fields null (absent degrades silently)', () => {
  const p = buildTravelPlan(ev({
    guests: [guest('g1', 'Ana', { lodging: { status: 'booked' } })],
  }), { now: NOW });
  expect(p.lodging.careUnits).toEqual([]);
  expect(p.lodging.roster[0]).toMatchObject({
    caregiverGuestId: null,
    caregiverName: null,
    needsAdjacentRoom: null,
  });
  // Headcount mode too: no roster, no pairings — never invented.
  expect(buildTravelPlan(ev(), { now: NOW }).lodging.careUnits).toEqual([]);
});

test('22 · roster row resolves the caregiver name from the roster by id', () => {
  const p = buildTravelPlan(ev({
    guests: [
      guest('g1', 'Grandma Rose', { lodging: { status: 'booked', caregiverGuestId: 'g2', needsAdjacentRoom: true } }),
      guest('g2', 'Maria', { lodging: { status: 'booked' } }),
    ],
  }), { now: NOW });
  const rose = p.lodging.roster.find((r) => r.guestId === 'g1');
  expect(rose.caregiverGuestId).toBe('g2');
  expect(rose.caregiverName).toBe('Maria');
  expect(rose.needsAdjacentRoom).toBe(true);
  // The unpaired guest carries no pairing echo.
  const maria = p.lodging.roster.find((r) => r.guestId === 'g2');
  expect(maria.caregiverGuestId).toBeNull();
  expect(maria.caregiverName).toBeNull();
});

test('23 · unit status: both_booked / caregiver_not_booked / elder_not_booked / neither_booked from real statuses only', () => {
  const pair = (elderStatus, cgStatus) => buildTravelPlan(ev({
    guests: [
      guest('g1', 'Rose', { lodging: { status: elderStatus, caregiverGuestId: 'g2' } }),
      guest('g2', 'Maria', { lodging: { status: cgStatus } }),
    ],
  }), { now: NOW }).lodging.careUnits[0];

  expect(pair('booked', 'confirmed')).toMatchObject({
    elderGuestId: 'g1', elderName: 'Rose', elderStatus: 'booked',
    caregiverGuestId: 'g2', caregiverName: 'Maria', caregiverOnRoster: true,
    caregiverStatus: 'confirmed', status: 'both_booked',
  });
  expect(pair('confirmed', 'not_started').status).toBe('caregiver_not_booked');
  expect(pair('not_started', 'booked').status).toBe('elder_not_booked');
  expect(pair('not_started', 'not_started').status).toBe('neither_booked');
  // A caregiver with NO lodging entry at all reads as not started — same as notBookedCount.
  const noEntry = buildTravelPlan(ev({
    guests: [
      guest('g1', 'Rose', { lodging: { status: 'booked', caregiverGuestId: 'g2' } }),
      guest('g2', 'Maria', {}),
    ],
  }), { now: NOW }).lodging.careUnits[0];
  expect(noEntry.status).toBe('caregiver_not_booked');
  expect(noEntry.caregiverStatus).toBe('not_started');
});

test('24 · needsAdjacentRoom is tri-state: true, false, or null when the host never said', () => {
  const unitFor = (lodgingSub) => buildTravelPlan(ev({
    guests: [
      guest('g1', 'Rose', { lodging: { ...lodgingSub, caregiverGuestId: 'g2' } }),
      guest('g2', 'Maria', {}),
    ],
  }), { now: NOW }).lodging.careUnits[0];
  expect(unitFor({ needsAdjacentRoom: true }).needsAdjacentRoom).toBe(true);
  expect(unitFor({ needsAdjacentRoom: false }).needsAdjacentRoom).toBe(false);
  expect(unitFor({}).needsAdjacentRoom).toBeNull();
  expect(unitFor({ needsAdjacentRoom: 'yes' }).needsAdjacentRoom).toBeNull(); // junk is not an answer
});

test('25 · caregiverName free-text fallback (aide not on the roster) → caregiver_unknown, status never guessed', () => {
  const p = buildTravelPlan(ev({
    guests: [
      guest('g1', 'Rose', { lodging: { status: 'booked', caregiverName: 'Nurse Patricia' } }),
    ],
  }), { now: NOW });
  expect(p.lodging.roster[0].caregiverName).toBe('Nurse Patricia');
  expect(p.lodging.roster[0].caregiverGuestId).toBeNull();
  expect(p.lodging.careUnits).toHaveLength(1);
  expect(p.lodging.careUnits[0]).toMatchObject({
    elderGuestId: 'g1',
    caregiverGuestId: null,
    caregiverName: 'Nurse Patricia',
    caregiverOnRoster: false,
    caregiverStatus: null, // unknowable — never claimed
    status: 'caregiver_unknown',
  });
});

test('26 · dangling caregiverGuestId (no such roster guest) → caregiver_unknown; name fallback still honored', () => {
  // Id points nowhere, no name: pairing surfaces with a null name — honest.
  const dangling = buildTravelPlan(ev({
    guests: [guest('g1', 'Rose', { lodging: { status: 'booked', caregiverGuestId: 'g-gone' } })],
  }), { now: NOW });
  expect(dangling.lodging.careUnits[0]).toMatchObject({
    caregiverGuestId: 'g-gone', caregiverName: null, caregiverOnRoster: false, status: 'caregiver_unknown',
  });
  // Id points nowhere but the host typed a name: the name wins as the label.
  const withName = buildTravelPlan(ev({
    guests: [guest('g1', 'Rose', { lodging: { status: 'booked', caregiverGuestId: 'g-gone', caregiverName: 'Patricia' } })],
  }), { now: NOW });
  expect(withName.lodging.careUnits[0].caregiverName).toBe('Patricia');
  expect(withName.lodging.careUnits[0].status).toBe('caregiver_unknown');
});

test('27 · a declined caregiver is surfaced as caregiver_declined, not silently dropped or counted as booked', () => {
  const p = buildTravelPlan(ev({
    guests: [
      guest('g1', 'Rose', { lodging: { status: 'booked', caregiverGuestId: 'g2' } }),
      guest('g2', 'Maria', { lodging: { status: 'booked' } }, { rsvp: 'No' }),
    ],
  }), { now: NOW });
  expect(p.lodging.careUnits[0]).toMatchObject({
    caregiverGuestId: 'g2',
    caregiverName: 'Maria', // declined guests still resolve by name — that's the point
    caregiverOnRoster: true,
    caregiverStatus: null,  // their booking status is moot; never shown as booked
    status: 'caregiver_declined',
  });
});

test('28 · a declined ELDER produces no unit (declined guests are out of the travel picture entirely)', () => {
  const p = buildTravelPlan(ev({
    guests: [
      guest('g1', 'Rose', { lodging: { status: 'booked', caregiverGuestId: 'g2' } }, { rsvp: 'No' }),
      guest('g2', 'Maria', { lodging: { status: 'booked' } }),
    ],
  }), { now: NOW });
  expect(p.lodging.careUnits).toEqual([]);
});

test('29 · a self-referencing caregiverGuestId is ignored, never echoed back as its own caregiver', () => {
  const selfOnly = buildTravelPlan(ev({
    guests: [guest('g1', 'Rose', { lodging: { status: 'booked', caregiverGuestId: 'g1' } })],
  }), { now: NOW });
  expect(selfOnly.lodging.careUnits).toEqual([]);
  expect(selfOnly.lodging.roster[0].caregiverGuestId).toBeNull();
  expect(selfOnly.lodging.roster[0].caregiverName).toBeNull();
  // Self id but a typed name: the name fallback still stands up a unit.
  const selfWithName = buildTravelPlan(ev({
    guests: [guest('g1', 'Rose', { lodging: { status: 'booked', caregiverGuestId: 'g1', caregiverName: 'Patricia' } })],
  }), { now: NOW });
  expect(selfWithName.lodging.careUnits[0]).toMatchObject({
    caregiverGuestId: null, caregiverName: 'Patricia', status: 'caregiver_unknown',
  });
});

test('30 · multiple units keep roster order; every status has a label; no unit counts are invented', () => {
  const p = buildTravelPlan(ev({
    guests: [
      guest('g1', 'Rose', { lodging: { status: 'booked', caregiverGuestId: 'g3' } }),
      guest('g2', 'Walt', { lodging: { status: 'not_started', caregiverName: 'An aide' } }),
      guest('g3', 'Maria', { lodging: { status: 'confirmed' } }),
    ],
  }), { now: NOW });
  expect(p.lodging.careUnits.map((u) => u.elderGuestId)).toEqual(['g1', 'g2']);
  expect(p.lodging.careUnits.map((u) => u.status)).toEqual(['both_booked', 'caregiver_unknown']);
  p.lodging.careUnits.forEach((u) => expect(CARE_UNIT_STATUSES).toContain(u.status));
  CARE_UNIT_STATUSES.forEach((s) => expect(typeof CARE_UNIT_STATUS_LABEL[s]).toBe('string'));
  // The lodging summary gained the list and NOTHING numeric about it.
  expect(Object.keys(p.lodging).filter((k) => /unit/i.test(k))).toEqual(['careUnits']);
});
