// Two truthfulness fixes, 2026-07-14. Both are the same bug wearing different
// clothes: a surface asserting something the data does not support.
//
//   1. "Event Day" on the afternoon BEFORE the event (a units error, hidden by rounding)
//   2. "evidence attached" because the host typed a price (a value mistaken for a document)

import { daysUntil, isEventDay, isPastEvent } from '../dates';
import { inferPromisesFromVendor, deriveVendorMissingProof, promiseNeedsHost, promiseEvidenceSatisfied } from '../vendorAccountability/derive';
import { getVendorDayOfState, getVendorLifecycleStage } from '../vendorIntelligence';

// ── 1. The day-rounder ────────────────────────────────────────────────────
describe('daysUntil — the clock never moves the date', () => {
  const EVENT = '2026-08-04';

  // THE REGRESSION. Old code: Math.round((eventMidnight - Date.now()) / 86400000).
  // At 3pm on Aug 3 that is 9 hours → 0.375 → rounds to 0 → "Event Day".
  test('the afternoon before the event is still ONE day away, not zero', () => {
    const afternoonBefore = new Date('2026-08-03T15:00:00');
    expect(daysUntil(EVENT, afternoonBefore)).toBe(1);
    expect(isEventDay(EVENT, afternoonBefore)).toBe(false);
  });

  test('every hour of the day before answers 1 — dawn to midnight', () => {
    for (const h of [0, 6, 11, 12, 13, 18, 23]) {
      const t = new Date(`2026-08-03T${String(h).padStart(2, '0')}:30:00`);
      expect({ h, d: daysUntil(EVENT, t) }).toEqual({ h, d: 1 });
    }
  });

  test('every hour of the event day answers 0 — it is Event Day all day', () => {
    for (const h of [0, 9, 15, 23]) {
      const t = new Date(`2026-08-04T${String(h).padStart(2, '0')}:30:00`);
      expect(isEventDay(EVENT, t)).toBe(true);
      expect(isPastEvent(EVENT, t)).toBe(false);
    }
  });

  test('the event is not past until the next calendar day', () => {
    expect(isPastEvent(EVENT, new Date('2026-08-04T23:59:00'))).toBe(false);
    expect(isPastEvent(EVENT, new Date('2026-08-05T00:01:00'))).toBe(true);
    expect(daysUntil(EVENT, new Date('2026-08-05T09:00:00'))).toBe(-1);
  });

  test('missing / unparsable dates are null, never 0 (0 would read as Event Day)', () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil('')).toBeNull();
    expect(daysUntil('not-a-date')).toBeNull();
    expect(isEventDay(null)).toBe(false);
  });
});

describe('vendorIntelligence does not declare Event Day the day before', () => {
  // Pin it at the surface too, not just the helper — the helper being right is
  // worthless if the caller keeps its own copy of the arithmetic. That is exactly
  // how this bug survived: two private daysFrom()s, both wrong.
  const realNow = Date.now;
  afterEach(() => { Date.now = realNow; });

  const eventOn = (date) => ({ id: 'e1', date, vendors: [] });
  const vendor = { id: 'v1', name: 'Bay Crab Co', category: 'Catering', status: 'Booked' };

  // getVendorLifecycleStage is the surface that actually printed the word to the
  // host: `if (eventToday) return 'Event Day'`.
  test('3pm the day before: the stage is NOT Event Day', () => {
    Date.now = () => new Date('2026-08-03T15:00:00').getTime();
    expect(getVendorLifecycleStage(vendor, eventOn('2026-08-04'))).not.toBe('Event Day');
  });

  test('the event date itself: the stage IS Event Day, at 9am and at 9pm', () => {
    Date.now = () => new Date('2026-08-04T09:00:00').getTime();
    expect(getVendorLifecycleStage(vendor, eventOn('2026-08-04'))).toBe('Event Day');
    Date.now = () => new Date('2026-08-04T21:00:00').getTime();
    expect(getVendorLifecycleStage(vendor, eventOn('2026-08-04'))).toBe('Event Day');
  });

  test('the day before does not report the event as needing things "today"', () => {
    Date.now = () => new Date('2026-08-03T15:00:00').getTime();
    const dayOf = getVendorDayOfState(vendor, eventOn('2026-08-04'));
    expect(JSON.stringify(dayOf)).not.toContain('needed today');
  });
});

// ── 2. A price is not a contract ──────────────────────────────────────────
describe('inferred evidence — a typed value is not a document', () => {
  const event = { id: 'e1', date: '2026-12-31', vendors: [] };
  const find = (promises, key) => promises.find(p => p.promiseKey === key);

  test('THE REGRESSION: typing a cost does not attach a contract', () => {
    const vendor = { id: 'v1', name: 'Bay Crab Co', category: 'Catering', cost: 2400 };
    const terms = find(inferPromisesFromVendor(vendor, event), 'payment_terms');

    // The term is known — we do not pretend otherwise...
    expect(terms.status).toBe('confirmed');
    // ...but nothing is on file, and we say so.
    expect(terms.evidenceStatus).toBe('none');
    expect(promiseEvidenceSatisfied(terms)).toBe(false);
  });

  test("a vendor with only a price still shows up as missing proof", () => {
    const vendor = { id: 'v1', name: 'Bay Crab Co', category: 'Catering', cost: 2400 };
    const promises = inferPromisesFromVendor(vendor, event);
    const missing = deriveVendorMissingProof(vendor, event, promises).map(p => p.promiseKey);
    expect(missing).toContain('payment_terms');
  });

  // scope_confirmed lives in the 'other' playbook (evidenceKind: 'contract').
  test('a real contract file DOES attach evidence', () => {
    const vendor = { id: 'v1', name: 'Odd Job Co', category: 'Other', contractUrl: 'https://x/y.pdf' };
    const scope = find(inferPromisesFromVendor(vendor, event), 'scope_confirmed');
    expect(scope.evidenceStatus).toBe('attached');
  });

  test('a status dropdown is not a contract either', () => {
    const vendor = { id: 'v1', name: 'Odd Job Co', category: 'Other', status: 'Confirmed' };
    const scope = find(inferPromisesFromVendor(vendor, event), 'scope_confirmed');
    expect(scope.status).toBe('confirmed');       // scope IS agreed
    expect(scope.evidenceStatus).toBe('none');    // no document exists
  });

  test('for a COUNT promise the number IS the artifact', () => {
    const vendor = { id: 'v1', name: 'Bay Crab Co', category: 'Catering', guestCount: 120 };
    const count = find(inferPromisesFromVendor(vendor, event), 'final_guest_count');
    expect(count.evidenceKind).toBe('count');
    expect(count.evidenceStatus).toBe('attached');
  });

  test("the planner's explicit \"I have it on file\" still clears it", () => {
    const vendor = {
      id: 'v1', name: 'Bay Crab Co', category: 'Catering', cost: 2400,
      promiseEvidence: { payment_terms: 'attached' },
    };
    const terms = find(inferPromisesFromVendor(vendor, event), 'payment_terms');
    expect(terms.evidenceStatus).toBe('attached');
    expect(promiseNeedsHost(terms)).toBe(false);
  });
});

describe('every worry has a row that clears it', () => {
  // The trap this guards: the engine raises "evidence missing" while the surfaces
  // filter the row out (they used to drop anything status==='confirmed'), leaving
  // the host a complaint they cannot act on. Worse than the original lie.
  const event = { id: 'e1', date: '2026-12-31', vendors: [] };

  test('anything counted as missing proof is also listed as needing the host', () => {
    const vendor = { id: 'v1', name: 'Bay Crab Co', category: 'Catering', cost: 2400, status: 'Confirmed' };
    const promises = inferPromisesFromVendor(vendor, event);
    const missing = deriveVendorMissingProof(vendor, event, promises);
    const actionable = promises.filter(promiseNeedsHost);

    expect(missing.length).toBeGreaterThan(0);
    for (const p of missing) {
      expect(actionable.map(a => a.promiseKey)).toContain(p.promiseKey);
    }
  });
});
