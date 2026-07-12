// ─── travelPlan — DESTINATION-2: shared lodging / air / ground travel engine ──
//
// Phase 1 (DESTINATION-1) made event.isDestination a generic, type-independent
// modifier: destination decisions/tasks/vendor categories layer additively on
// any base playbook (playbooks/index.js), and buildVendorPlan reads the same
// flag. This is Phase 2's engine: ONE reader that turns host-entered travel
// fields plus per-guest travel entries into the lodging grid, the arrivals/
// departures grid, and the ground-transport picture. Thin domain helper over
// host/guest-entered state — same pattern as crabPlan/vendorPlan; no separate
// engine, no UI, no storage, no fetching.
//
// DATA MODEL (all host-entered at the event level, guest-entered per guest —
// nothing here is ever invented by the app):
//   event.isDestination                 — Phase 1 flag; gates everything
//   event.lodging       = { hotelName, rate, code, deadline,
//                           backupOptions: [{ name, note }] }   // 0–2 alternates (UI-enforced cap)
//   event.airportOptions = [{ code, name, note }]               // 1–3; note = the honest tradeoff
//   event.groundTransport = { lastReturnNote, pickupPoints: [{ name, note }] }
//     — NOTE: "is the host providing transport?" is NOT stored here. Phase 1
//       already owns that call as the dest_transport decision (playbooks/
//       index.js DESTINATION_DECISIONS), answered into event.foodChoices
//       ['dest_transport'] like every other decision. Single source of truth:
//       this engine DERIVES transportProvided from that answer (see
//       transportDecision below) instead of keeping a second copy.
//   event.guests[i].travel = {
//     lodging: { status, checkIn, checkOut, roommate, accessibility, updatedAt,
//                caregiverGuestId,     // pairing: this guest needs to room with
//                                      //   (or near) that roster guest
//                caregiverName,        // free-text fallback when the caregiver
//                                      //   isn't on the roster (a hired aide, a
//                                      //   companion who isn't invited)
//                needsAdjacentRoom },  // true = adjacent room, false = same
//                                      //   room, absent = host didn't say
//       — "elder + caregiver unit": the pairing fields are the ONLY marker.
//         The engine never infers who is an elder; the host naming a caregiver
//         IS the unit. See lodging.careUnits below.
//     air:     { airportCode, arriveDate, arriveTime, departDate, departTime, updatedAt },
//     ground:  { rentingCar, needsRide, canOfferRide, seats, updatedAt },
//   }
//
// HARD RULES (same doctrine as crabPlan / vendorPlan):
//   - relevant:false unless event.isDestination — the flag is the ONLY gate
//     (never event type), matching Phase 1's architecture exactly.
//   - headcount-only events (no guest roster) still get the host-level info;
//     roster arrays come back EMPTY and roster-derived counts come back null —
//     degrade, never invent guest rows.
//   - an unanswered dest_transport decision never silently reads as its
//     default ("Not sure yet") being a real answer — mirroring the Decisions
//     board's isLocked() doctrine, transportProvided is null until the host
//     actually answered (or explicitly set the legacy boolean field).
//   - ride matching is HOST-MEDIATED: we count riders vs offered seats and
//     surface the gap; we never auto-assign who rides with whom.
//   - time is injectable (opts.now), same seam as playbookChecklist's asOf —
//     buildTravelPlan itself stays pure/testable; the clock is only a
//     fallback default, resolved once at entry.

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v) => (v == null ? null : String(v).trim() || null);

// ── Lodging booking status — the 3-step cycle the UI walks ────────────────────
export const LODGING_STATUSES = ['not_started', 'booked', 'confirmed'];
export const LODGING_STATUS_LABEL = {
  not_started: 'Not started',
  booked: 'Booked',
  confirmed: 'Confirmed',
};
export function normalizeLodgingStatus(status) {
  const s = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return LODGING_STATUSES.includes(s) ? s : 'not_started';
}
// The UI's tap-to-cycle helper: not_started → booked → confirmed → not_started.
export function nextLodgingStatus(status) {
  const i = LODGING_STATUSES.indexOf(normalizeLodgingStatus(status));
  return LODGING_STATUSES[(i + 1) % LODGING_STATUSES.length];
}

// ── Care units — elder + caregiver lodging pairings ───────────────────────────
// A unit exists ONLY when the host wrote a pairing onto a guest's lodging entry
// (caregiverGuestId or caregiverName). Its status is derived purely from the
// two guests' existing lodging booking statuses — never from anything else.
// "booked" here means booked OR confirmed, matching notBookedCount's read.
// When the caregiver isn't a resolvable roster guest we cannot know their
// booking status, so the unit says exactly that instead of guessing.
export const CARE_UNIT_STATUSES = [
  'both_booked',          // both guests' rooms are booked or confirmed
  'caregiver_not_booked', // the paired guest is booked; the caregiver isn't
  'elder_not_booked',     // the caregiver is booked; the paired guest isn't
  'neither_booked',       // neither has booked yet
  'caregiver_declined',   // the named caregiver declined the invite — real problem, surfaced
  'caregiver_unknown',    // caregiver isn't on the roster (name-only or dangling id) — status unknowable
];
export const CARE_UNIT_STATUS_LABEL = {
  both_booked: 'Both booked',
  caregiver_not_booked: 'Caregiver not booked yet',
  elder_not_booked: 'Guest not booked yet — caregiver is',
  neither_booked: 'Neither booked yet',
  caregiver_declined: 'Caregiver declined the invite',
  caregiver_unknown: 'Caregiver not on the guest list — booking unknown',
};

// ── Ride status — the 4-step cycle the ride board walks ──────────────────────
// The data model stores three booleans per guest (rentingCar / needsRide /
// canOfferRide — a future guest-entered write could set more than one); the
// UI's tap-to-cycle walks ONE plain-language status. rideStatusOf collapses
// the booleans deterministically — a driver with seats to give matters most,
// then the person who needs one, then the self-covered renter. rideFieldsFor
// writes the set back mutually exclusive: restating the plan replaces it.
export const RIDE_STATUSES = ['not_set', 'renting', 'needs_ride', 'offers_ride'];
export const RIDE_STATUS_LABEL = {
  not_set: 'Not set',
  renting: 'Renting a car',
  needs_ride: 'Needs a ride',
  offers_ride: 'Can offer a ride',
};
export function rideStatusOf(sub) {
  if (!sub || typeof sub !== 'object') return 'not_set';
  if (sub.canOfferRide === true) return 'offers_ride';
  if (sub.needsRide === true) return 'needs_ride';
  if (sub.rentingCar === true) return 'renting';
  return 'not_set';
}
// The UI's tap-to-cycle: not set → renting a car → needs a ride → can offer
// a ride → not set. Honest order — the two self-covered answers come before
// the two that create host work, so a mistap never silently claims a need.
export function nextRideStatus(status) {
  const i = RIDE_STATUSES.indexOf(RIDE_STATUSES.includes(status) ? status : 'not_set');
  return RIDE_STATUSES[(i + 1) % RIDE_STATUSES.length];
}
// The exclusive boolean set for a status. seats persist SEPARATELY on the
// sub-object (a driver who cycles away and back keeps their count) — the
// engine only COUNTS seats while canOfferRide is true.
export function rideFieldsFor(status) {
  return {
    rentingCar: status === 'renting',
    needsRide: status === 'needs_ride',
    canOfferRide: status === 'offers_ride',
  };
}

// ── Staleness — "this row just changed" ───────────────────────────────────────
// Every guest.travel sub-object carries updatedAt (ms epoch, written by the UI
// when the guest/host edits it). A row is "recently changed" when its updatedAt
// falls inside the window looking BACK from nowMs. Missing/invalid updatedAt is
// never flagged — absence of data is not recency.
export function recentlyChanged(subObject, nowMs, windowHours = 48) {
  if (!subObject || typeof subObject !== 'object') return false;
  const at = Number(subObject.updatedAt);
  if (!Number.isFinite(at) || at <= 0) return false;
  const now = Number(nowMs);
  if (!Number.isFinite(now)) return false;
  const age = now - at;
  return age >= 0 && age <= windowHours * 3600000;
}

// ── Transport decision — single source of truth ───────────────────────────────
// Phase 1's dest_transport decision (answered into event.foodChoices, like
// every playbook decision) owns "is the host providing group transport?".
//   providing: true  — answered "Yes, a shuttle or van"
//              false — answered "No, guests self-manage"
//              null  — unanswered, or answered "Not sure yet" (honest unknown)
//   source: 'decision' | 'field' | null — 'field' only as a legacy fallback
//   when no decision answer exists but event.groundTransport.providing was
//   explicitly set as a boolean (the decision always wins when answered).
export function transportDecision(event) {
  const ev = event || {};
  const picks = (ev.foodChoices && typeof ev.foodChoices === 'object') ? ev.foodChoices : {};
  const pick = str(picks.dest_transport);
  if (pick) {
    if (/^yes/i.test(pick)) return { providing: true, source: 'decision', pick };
    if (/self-?manage|^no\b/i.test(pick)) return { providing: false, source: 'decision', pick };
    return { providing: null, source: 'decision', pick }; // "Not sure yet" — a real non-answer
  }
  const gt = ev.groundTransport;
  if (gt && typeof gt === 'object' && typeof gt.providing === 'boolean') {
    return { providing: gt.providing, source: 'field', pick: null };
  }
  return { providing: null, source: null, pick: null };
}

// ── Date helpers — local-midnight model, same as lib/dates.js ─────────────────
// Grids compare whole DAYS. A usable value is anything starting YYYY-MM-DD;
// two ISO days compare correctly as strings, so no Date parsing (and no TZ
// drift) is needed. Unusable values return null — a conflict is never claimed
// from a date we can't read.
const isoDay = (v) => {
  const s = String(v || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

// ── The engine ────────────────────────────────────────────────────────────────
/**
 * buildTravelPlan(event, opts = {}) → {
 *   relevant, rosterMode,
 *   lodging: { hotelName, rate, code, deadline, backupOptions, roster,
 *              notBookedCount, careUnits },
 *   air:     { airportOptions, roster, conflicts },
 *   ground:  { transportProvided, transportSource, transportPick,
 *              lastReturnNote, pickupPoints, roster,
 *              needRide, canOfferRide, offeredSeats, unmatched },
 * }
 *
 * opts.now — ms epoch used for the recentlyChanged flags on roster rows;
 * injectable for tests (falls back to the real clock once, at entry — the
 * same pattern as playbooks' daysToEvent(eventDate, asOf)).
 *
 * Roster rows cover every roster guest who hasn't declined (rsvp 'No' is out;
 * Yes / Maybe / Pending stay — a pending guest may already be booking travel).
 * Guests with no travel entry still get a row with null fields: on a
 * destination grid, "hasn't told us yet" is the load-bearing information.
 */
export function buildTravelPlan(event, opts = {}) {
  const ev = event || {};
  if (!ev.isDestination) return { relevant: false };

  const now = Number.isFinite(Number(opts.now)) ? Number(opts.now) : Date.now();
  const windowHours = num(opts.staleWindowHours) > 0 ? num(opts.staleWindowHours) : 48;

  // Roster mode = a real guest list exists. This is data display, not RSVP
  // pressure, so it does NOT gate on guestMode 'count' (guestMode.js doctrine:
  // suppression hides pressure, never data).
  const allGuests = Array.isArray(ev.guests) ? ev.guests.filter(Boolean) : [];
  const rosterMode = allGuests.length > 0;
  const travelers = allGuests.filter((g) => !/^n/i.test(String(g.rsvp || '')));

  const travelOf = (g) => (g.travel && typeof g.travel === 'object') ? g.travel : {};

  // ── Lodging ─────────────────────────────────────────────────────────────────
  const lo = (ev.lodging && typeof ev.lodging === 'object') ? ev.lodging : {};
  const lodgingSubOf = (g) =>
    (travelOf(g).lodging && typeof travelOf(g).lodging === 'object') ? travelOf(g).lodging : null;
  // Ids compared leniently (string vs number ids both occur in seeds) but only
  // when both sides exist — null never matches null.
  const sameId = (a, b) => a != null && b != null && String(a) === String(b);
  // The caregiver pairing as the host entered it, or null when none was.
  // Resolution runs against the FULL roster (a declined caregiver still
  // resolves — that outcome is load-bearing). A self-referencing id is
  // ignored, never echoed back as its own caregiver.
  const caregiverPairingOf = (g) => {
    const sub = lodgingSubOf(g);
    if (!sub) return null;
    const rawId = sub.caregiverGuestId;
    const id = rawId != null && String(rawId).trim() !== '' && !sameId(rawId, g.id) ? rawId : null;
    const nameFallback = str(sub.caregiverName);
    if (id == null && !nameFallback) return null;
    const caregiver = id != null ? (allGuests.find((o) => sameId(o.id, id)) || null) : null;
    return {
      caregiverGuestId: id,
      caregiver, // the resolved roster guest object, or null
      caregiverName: caregiver ? (str(caregiver.name) || 'A guest') : nameFallback,
      needsAdjacentRoom: typeof sub.needsAdjacentRoom === 'boolean' ? sub.needsAdjacentRoom : null,
    };
  };
  const lodgingRoster = travelers.map((g) => {
    const sub = lodgingSubOf(g);
    const pairing = caregiverPairingOf(g);
    return {
      guestId: g.id != null ? g.id : null,
      name: str(g.name) || 'A guest',
      rsvp: str(g.rsvp),
      status: normalizeLodgingStatus(sub && sub.status),
      checkIn: sub ? isoDay(sub.checkIn) : null,
      checkOut: sub ? isoDay(sub.checkOut) : null,
      roommate: sub ? str(sub.roommate) : null,
      accessibility: sub ? str(sub.accessibility) : null,
      // Caregiver pairing, resolved: name comes from the roster when the id
      // matches a guest, else the host's free-text fallback, else null.
      caregiverGuestId: pairing ? pairing.caregiverGuestId : null,
      caregiverName: pairing ? pairing.caregiverName : null,
      needsAdjacentRoom: pairing ? pairing.needsAdjacentRoom : null,
      updatedAt: sub && Number.isFinite(Number(sub.updatedAt)) ? Number(sub.updatedAt) : null,
      recentlyChanged: recentlyChanged(sub, now, windowHours),
    };
  });
  // Elder + caregiver units — one per traveler carrying a pairing, roster
  // order. Status derives ONLY from the two existing booking statuses (or the
  // caregiver's rsvp / absence from the roster). No counts, no readiness
  // score — the list itself is the surface.
  const bookedish = (s) => s === 'booked' || s === 'confirmed';
  const careUnits = travelers.flatMap((g) => {
    const pairing = caregiverPairingOf(g);
    if (!pairing) return [];
    const elderStatus = normalizeLodgingStatus(lodgingSubOf(g) && lodgingSubOf(g).status);
    const cg = pairing.caregiver;
    const caregiverOnRoster = !!cg;
    let caregiverStatus = null;
    let status;
    if (!caregiverOnRoster) {
      status = 'caregiver_unknown';
    } else if (/^n/i.test(String(cg.rsvp || ''))) {
      status = 'caregiver_declined';
    } else {
      caregiverStatus = normalizeLodgingStatus(lodgingSubOf(cg) && lodgingSubOf(cg).status);
      status = bookedish(elderStatus)
        ? (bookedish(caregiverStatus) ? 'both_booked' : 'caregiver_not_booked')
        : (bookedish(caregiverStatus) ? 'elder_not_booked' : 'neither_booked');
    }
    return [{
      elderGuestId: g.id != null ? g.id : null,
      elderName: str(g.name) || 'A guest',
      elderStatus,
      caregiverGuestId: pairing.caregiverGuestId,
      caregiverName: pairing.caregiverName,
      caregiverOnRoster,
      caregiverStatus, // null unless the caregiver is a non-declined roster guest
      needsAdjacentRoom: pairing.needsAdjacentRoom, // true | false | null (host didn't say)
      status,
    }];
  });
  const lodging = {
    hotelName: str(lo.hotelName),
    rate: num(lo.rate) > 0 ? num(lo.rate) : null,
    code: str(lo.code),
    deadline: isoDay(lo.deadline),
    backupOptions: (Array.isArray(lo.backupOptions) ? lo.backupOptions : [])
      .filter(Boolean)
      .map((b) => ({ name: str(b.name), note: str(b.note) }))
      .filter((b) => b.name),
    roster: lodgingRoster,
    // How many travelers haven't booked yet (booked OR confirmed counts as
    // booked). null in headcount mode — we can't know, so we don't claim 0.
    notBookedCount: rosterMode
      ? lodgingRoster.filter((r) => r.status === 'not_started').length
      : null,
    // Elder + caregiver pairings the host entered — empty when none exist
    // (and always empty in headcount mode: no roster, no pairings to read).
    careUnits,
  };

  // ── Air — arrivals/departures grid + honest conflicts ──────────────────────
  // Event window: start = event.date; end = event.endDate when the host set a
  // multi-day end, else the same day (endDate is not a Phase 1 field — this is
  // a graceful read, never a requirement).
  const startDay = isoDay(ev.date);
  const endDay = isoDay(ev.endDate) || startDay;
  const airRoster = travelers.map((g) => {
    const sub = (travelOf(g).air && typeof travelOf(g).air === 'object') ? travelOf(g).air : null;
    const arriveDate = sub ? isoDay(sub.arriveDate) : null;
    const departDate = sub ? isoDay(sub.departDate) : null;
    return {
      guestId: g.id != null ? g.id : null,
      name: str(g.name) || 'A guest',
      rsvp: str(g.rsvp),
      airportCode: sub ? str(sub.airportCode) : null,
      arriveDate,
      arriveTime: sub ? str(sub.arriveTime) : null,
      departDate,
      departTime: sub ? str(sub.departTime) : null,
      hasFlightInfo: !!(arriveDate || departDate),
      updatedAt: sub && Number.isFinite(Number(sub.updatedAt)) ? Number(sub.updatedAt) : null,
      recentlyChanged: recentlyChanged(sub, now, windowHours),
    };
  });
  // A conflict is only ever claimed from dates we can actually read, against
  // the event's real date. ISO days compare as strings.
  const conflicts = [];
  if (startDay) {
    for (const r of airRoster) {
      if (r.arriveDate && r.arriveDate > startDay) {
        conflicts.push({
          guestId: r.guestId, name: r.name, type: 'arrives_late',
          copy: `${r.name} lands ${r.arriveDate} — after the event starts (${startDay}).`,
        });
      }
      if (r.departDate && endDay && r.departDate < endDay) {
        conflicts.push({
          guestId: r.guestId, name: r.name, type: 'leaves_early',
          copy: `${r.name} flies out ${r.departDate} — before the event ends (${endDay}).`,
        });
      }
    }
  }
  const air = {
    airportOptions: (Array.isArray(ev.airportOptions) ? ev.airportOptions : [])
      .filter(Boolean)
      .map((a) => ({ code: str(a.code), name: str(a.name), note: str(a.note) }))
      .filter((a) => a.code || a.name),
    roster: airRoster,
    conflicts,
  };

  // ── Ground — host-mediated ride math, never auto-matching ───────────────────
  const gt = (ev.groundTransport && typeof ev.groundTransport === 'object') ? ev.groundTransport : {};
  const td = transportDecision(ev);
  const groundRoster = travelers.map((g) => {
    const sub = (travelOf(g).ground && typeof travelOf(g).ground === 'object') ? travelOf(g).ground : null;
    return {
      guestId: g.id != null ? g.id : null,
      name: str(g.name) || 'A guest',
      rsvp: str(g.rsvp),
      rentingCar: sub ? sub.rentingCar === true : false,
      needsRide: sub ? sub.needsRide === true : false,
      canOfferRide: sub ? sub.canOfferRide === true : false,
      status: rideStatusOf(sub), // the collapsed single status the ride board shows

      seats: sub && num(sub.seats) > 0 ? Math.round(num(sub.seats)) : 0,
      updatedAt: sub && Number.isFinite(Number(sub.updatedAt)) ? Number(sub.updatedAt) : null,
      recentlyChanged: recentlyChanged(sub, now, windowHours),
    };
  });
  const needRide = groundRoster.filter((r) => r.needsRide);
  const canOfferRide = groundRoster.filter((r) => r.canOfferRide);
  // Seats only count when explicitly entered — an offer without a seat count
  // contributes 0 (the UI's prompt to fill it in, not our guess).
  const offeredSeats = canOfferRide.reduce((s, r) => s + r.seats, 0);
  // The gap the HOST closes by introducing riders to drivers (or booking a
  // shuttle) — a count, never an assignment. Computed regardless of the
  // shuttle decision so the number stays honest while transport is unsettled;
  // the UI reads transportProvided to decide how loudly to show it.
  const unmatched = Math.max(0, needRide.length - offeredSeats);
  const ground = {
    transportProvided: td.providing,   // true | false | null — see transportDecision
    transportSource: td.source,        // 'decision' | 'field' | null
    transportPick: td.pick,            // the literal decision answer, for copy
    lastReturnNote: str(gt.lastReturnNote),
    pickupPoints: (Array.isArray(gt.pickupPoints) ? gt.pickupPoints : [])
      .filter(Boolean)
      .map((p) => ({ name: str(p.name), note: str(p.note) }))
      .filter((p) => p.name),
    roster: groundRoster,
    needRide,
    canOfferRide,
    offeredSeats,
    unmatched,
  };

  return { relevant: true, rosterMode, lodging, air, ground };
}

// ── Arrival clusters — the arrivals board's day-by-day grouping ───────────────
// DESTINATION-2 slice 3. Pure view helper over air.roster (buildTravelPlan's
// rows, already normalized): rows grouped by arriveDate, days ascending, with
// every row that has no readable arrival day gathered into ONE trailing
// { day: null } cluster — on a destination board, "hasn't told us yet" is a
// real group, not noise. Rows keep their roster order inside each cluster.
export function arrivalClusters(airRoster) {
  const rows = Array.isArray(airRoster) ? airRoster.filter(Boolean) : [];
  const byDay = new Map();
  const unknown = [];
  for (const r of rows) {
    const day = isoDay(r.arriveDate);
    if (!day) { unknown.push(r); continue; }
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(r);
  }
  const out = [...byDay.keys()].sort().map((day) => ({ day, rows: byDay.get(day) }));
  if (unknown.length) out.push({ day: null, rows: unknown });
  return out;
}
