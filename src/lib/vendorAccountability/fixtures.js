// ─── Test Fixtures for Vendor Accountability Phase A ───────────────────────
// Sprint 61.A. Eight scenarios that exercise every helper. Each fixture
// returns { event, vendor, promises, expected } so the QA script can
// assert behavior.

import { deriveVendorExpectedPromises } from './derive.js';
import { makePromise } from './promiseModel.js';

const EVENT_DATE = (() => {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
})();

const YESTERDAY = (() => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
})();

const TWO_DAYS = (() => {
  const d = new Date(); d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
})();

function eventShell(extras = {}) {
  return {
    id: 'ev-fixture',
    name: 'Fixture Wedding',
    date: EVENT_DATE,
    type: 'Wedding',
    venueAccessTime: '11:00',
    guestEstimate: '120',
    guests: [],
    budget: [],
    vendors: [],
    ros: [],
    ...extras,
  };
}

function withPromise(promises, key, patch) {
  return promises.map(p => p.promiseKey === key ? { ...p, ...patch } : p);
}

// ──────────────────────────────────────────────────────────────────────────
// Fixture 1: Catering — final menu promised yesterday, evidence missing
// ──────────────────────────────────────────────────────────────────────────
function f1_cateringOverdueMenu() {
  const v = { id: 'v-cat', name: 'Fork & Flower Catering', category: 'Catering', arrivalTime: '13:00', guestCount: 120 };
  const e = eventShell({ vendors: [v] });
  let promises = deriveVendorExpectedPromises(v, e);
  promises = withPromise(promises, 'final_menu', {
    status: 'promised',
    promisedBy: '2026-05-01',
    dueDate: YESTERDAY,
    evidenceStatus: 'none',
  });
  return {
    name: 'Catering overdue menu',
    event: e,
    vendor: v,
    promises,
    expected: {
      // Promised + due date passed + no evidence = missed_promise per
      // the strict criteria from the spec.
      tier: 'missed_promise',
      missingProofIncludes: ['final_menu'],
      nextActionContains: ['final menu', 'menu'],
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Fixture 2: Venue — load-in conflict with florist delivery
// ──────────────────────────────────────────────────────────────────────────
function f2_venueLoadInConflict() {
  const venue   = { id: 'v-ven', name: 'Bluebell Venue', category: 'Venue', arrivalTime: '11:00' };
  const florist = { id: 'v-flo', name: 'Petal & Stem',   category: 'Florist', deliveryTime: '09:30' };
  const e = eventShell({ vendors: [venue, florist], venueAccessTime: '11:00' });
  return {
    name: 'Florist delivery before venue access',
    event: e,
    vendor: florist,
    promises: deriveVendorExpectedPromises(florist, e),
    expected: {
      conflictKinds: ['delivery_window_conflict'],
      affectedVendorId: florist.id,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Fixture 3: Photographer — no shot list, no timeline
// ──────────────────────────────────────────────────────────────────────────
function f3_photoNoShotList() {
  const v = { id: 'v-pho', name: 'Lena Kim Photography', category: 'Photography', arrivalTime: '13:00' };
  const e = eventShell({ vendors: [v] });
  return {
    name: 'Photographer missing shot list + timeline',
    event: e,
    vendor: v,
    promises: deriveVendorExpectedPromises(v, e),
    expected: {
      tier: 'needs_follow_up',
      followUpKeysInclude: ['shot_list', 'timeline_share'],
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Fixture 4: DJ — no ceremony timing
// ──────────────────────────────────────────────────────────────────────────
function f4_djNoCeremonyTiming() {
  const v = { id: 'v-dj', name: 'Sound Wave DJ', category: 'DJ', arrivalTime: '15:00' };
  const ros = [
    { id: 'r1', segment: 'Ceremony', time: '', owner: '' },
    { id: 'r2', segment: 'Reception', time: '18:00', owner: '' },
  ];
  const e = eventShell({ vendors: [v], ros });
  return {
    name: 'DJ ceremony timing missing',
    event: e,
    vendor: v,
    promises: deriveVendorExpectedPromises(v, e),
    expected: {
      conflictKinds: ['timeline_clash'],
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Fixture 5: Rentals — delivery window not confirmed
// ──────────────────────────────────────────────────────────────────────────
function f5_rentalsNoDelivery() {
  const v = { id: 'v-ren', name: 'Big Top Rentals', category: 'Rentals' };
  const e = eventShell({ vendors: [v] });
  let promises = deriveVendorExpectedPromises(v, e);
  promises = withPromise(promises, 'delivery_window', { status: 'not_requested' });
  return {
    name: 'Rentals delivery not confirmed',
    event: e,
    vendor: v,
    promises,
    expected: {
      tier: 'needs_follow_up',
      briefMissingIncludes: ['delivery_window'],
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Fixture 6: Florist — setup time conflicts with venue access (also F2-ish)
// ──────────────────────────────────────────────────────────────────────────
function f6_floristSetupConflict() {
  const venue = { id: 'v-ven6', name: 'Sunset Hall', category: 'Venue', arrivalTime: '14:00' };
  const florist = { id: 'v-flo6', name: 'Bloom Co', category: 'Florist', deliveryTime: '10:00' };
  const e = eventShell({ vendors: [venue, florist], venueAccessTime: '14:00' });
  return {
    name: 'Florist setup before venue access',
    event: e,
    vendor: florist,
    promises: deriveVendorExpectedPromises(florist, e),
    expected: {
      conflictKinds: ['delivery_window_conflict'],
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Fixture 7: Transportation — passenger count missing
// ──────────────────────────────────────────────────────────────────────────
function f7_transportNoCount() {
  const v = { id: 'v-tr', name: 'City Shuttle', category: 'Transportation' };
  const e = eventShell({ vendors: [v] });
  return {
    name: 'Transportation missing passenger count',
    event: e,
    vendor: v,
    promises: deriveVendorExpectedPromises(v, e),
    expected: {
      tier: 'needs_follow_up',
      followUpKeysInclude: ['passenger_count'],
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Fixture 8: All confirmed — happy path
// ──────────────────────────────────────────────────────────────────────────
function f8_allConfirmed() {
  const v = { id: 'v-ok', name: 'Smooth Operator DJ', category: 'DJ', arrivalTime: '15:00' };
  const e = eventShell({ vendors: [v], ros: [
    { id: 'r1', segment: 'Ceremony',  time: '17:00' },
    { id: 'r2', segment: 'Reception', time: '18:00' },
  ]});
  let promises = deriveVendorExpectedPromises(v, e);
  // Confirm everything + attach evidence where required
  promises = promises.map(p => ({
    ...p,
    status: 'confirmed',
    evidenceStatus: p.evidenceRequired ? 'attached' : 'not_required',
    completedAt: null,
  }));
  return {
    name: 'All confirmed — happy path',
    event: e,
    vendor: v,
    promises,
    expected: {
      tier: 'on_track',
      followUpDraftReason: 'Routine check-in',
      briefPercentageAtLeast: 100,
    },
  };
}

export const FIXTURES = [
  f1_cateringOverdueMenu(),
  f2_venueLoadInConflict(),
  f3_photoNoShotList(),
  f4_djNoCeremonyTiming(),
  f5_rentalsNoDelivery(),
  f6_floristSetupConflict(),
  f7_transportNoCount(),
  f8_allConfirmed(),
];
