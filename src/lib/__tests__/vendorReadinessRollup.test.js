// POP-1 Phase 1 (approved slice, docs/POP1_PHASE1_FOUNDATION_AUDIT.md §6):
// proves HostHome/eventPlan() and the Vendors tab's top-line count read the
// SAME vendor-readiness numbers, using the same booked-status vocabulary as
// hostStatusWord() in src/plan/VendorPlanningWorkspace.jsx — the exact
// contradiction this slice fixes. Regression tests, not unit tests of a new
// engine: eventPlan()'s nextActions ranking must be byte-identical to before.

import { eventPlan, getEventAttention, vendorReadinessRollup } from '../../CommandCenter';

const future = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// Mirrors the flagship validation event (30-Year Army Retirement/VFW): 9 vendor
// categories, one at "Deposit Paid" (a status the OLD getEventAttention formula
// wrongly excluded from "Booked"), the rest "Considering".
const flagshipVendors = (over = []) => ([
  { id: 'v1', category: 'Venue',      status: 'Deposit Paid' },
  { id: 'v2', category: 'Catering',   status: 'Considering' },
  { id: 'v3', category: 'Photography',status: 'Considering' },
  { id: 'v4', category: 'DJ',         status: 'Considering' },
  { id: 'v5', category: 'Florals',    status: 'Considering' },
  { id: 'v6', category: 'Cake',       status: 'Considering' },
  { id: 'v7', category: 'Mobile Bar', status: 'Considering' },
  { id: 'v8', category: 'AV / Tech',  status: 'Considering' },
  { id: 'v9', category: 'Rentals',    status: 'Considering' },
  ...over,
]);

const baseEvent = (vendors) => ({
  id: 'e-flagship',
  name: '30-Year United States Army Retirement Celebration at the VFW',
  type: 'Retirement Party',
  recordKind: 'host_event',
  date: future(92),
  guests: [],
  guestEstimate: '120',
  vendors,
  budget: [],
  timeline: [],
});

describe('vendorReadinessRollup', () => {
  test('counts Deposit Paid / Contracted as booked, matching hostStatusWord', () => {
    const event = baseEvent(flagshipVendors());
    expect(vendorReadinessRollup(event)).toEqual({ total: 9, booked: 1, confirmed: 0, toConfirm: 1, needsAttention: 8 });
  });

  test('Confirmed / Booked / Contracted all count as booked', () => {
    const event = baseEvent([
      { id: 'v1', status: 'Confirmed' },
      { id: 'v2', status: 'Booked' },
      { id: 'v3', status: 'Contracted' },
      { id: 'v4', status: 'Considering' },
      { id: 'v5', status: 'Quoted' },
    ]);
    expect(vendorReadinessRollup(event)).toEqual({ total: 5, booked: 3, confirmed: 2, toConfirm: 1, needsAttention: 2 });
  });

  test('handles an event with no vendors', () => {
    const event = baseEvent([]);
    expect(vendorReadinessRollup(event)).toEqual({ total: 0, booked: 0, confirmed: 0, toConfirm: 0, needsAttention: 0 });
  });

  test('handles a null/undefined event defensively', () => {
    expect(vendorReadinessRollup(null)).toEqual({ total: 0, booked: 0, confirmed: 0, toConfirm: 0, needsAttention: 0 });
    expect(vendorReadinessRollup(undefined)).toEqual({ total: 0, booked: 0, confirmed: 0, toConfirm: 0, needsAttention: 0 });
  });
});

describe('cross-surface agreement: eventPlan() vs getEventAttention() vs the Vendors tab rollup', () => {
  test('eventPlan().vendorReadiness matches vendorReadinessRollup() directly (single source)', () => {
    const event = baseEvent(flagshipVendors());
    const plan = eventPlan(event);
    expect(plan.vendorReadiness).toEqual(vendorReadinessRollup(event));
  });

  test('getEventAttention().vendorIssues agrees with vendorReadinessRollup().needsAttention on the flagship event', () => {
    const event = baseEvent(flagshipVendors());
    const attention = getEventAttention(event);
    const rollup = vendorReadinessRollup(event);
    expect(attention.vendorIssues).toBe(rollup.needsAttention);
    expect(attention.vendorIssues).toBe(8); // pinned to the flagship's known-correct count
  });

  test('regression: before this fix, a Deposit Paid vendor would have made getEventAttention and the rollup disagree (9 vs 8) — they must not', () => {
    const event = baseEvent(flagshipVendors());
    const attention = getEventAttention(event);
    const rollup = vendorReadinessRollup(event);
    // The old (pre-fix) formula only recognized 'Confirmed'/'Booked' as booked,
    // so it would have counted the 'Deposit Paid' venue as an issue too (9).
    const oldFormulaCount = event.vendors.filter(v => v.status !== 'Confirmed' && v.status !== 'Booked').length;
    expect(oldFormulaCount).toBe(9); // proves the bug was real
    expect(attention.vendorIssues).toBe(rollup.needsAttention); // proves it's fixed
    expect(attention.vendorIssues).not.toBe(oldFormulaCount);
  });

  test('eventPlan() nextActions/progress/handled shape is unchanged by adding vendorReadiness (additive only)', () => {
    const event = baseEvent(flagshipVendors());
    const plan = eventPlan(event);
    expect(Array.isArray(plan.nextActions)).toBe(true);
    expect(plan.progress).toEqual(expect.objectContaining({ done: expect.any(Number), total: expect.any(Number) }));
    expect(Array.isArray(plan.handled)).toBe(true);
    expect(plan.vendorReadiness).toBeDefined();
  });

  test('a null event still returns a well-formed vendorReadiness on eventPlan()', () => {
    expect(eventPlan(null).vendorReadiness).toEqual({ total: 0, booked: 0, confirmed: 0, toConfirm: 0, needsAttention: 0 });
    expect(eventPlan(undefined).vendorReadiness).toEqual({ total: 0, booked: 0, confirmed: 0, toConfirm: 0, needsAttention: 0 });
  });
});
