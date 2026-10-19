// ─── AN INVENTED COUNT MAY NOT ARGUE WITH THE CATERER ───────────────────────
//
// SPRINT 0.5 — the defect that falsifies part of Sprint 0's P0-2 classification.
//
// Sprint 0 inventoried every raw headcount reader, put
// `vendorAccountability/conflicts.js` in the "operational planning" bucket, and
// left it reading the raw field on the grounds that "protection belongs at the
// boundary (outward communication, committed money)". That rule was right. The
// classification was wrong: this file IS that boundary, and nobody traced it.
//
// MEASURED 2026-10-19 on an event whose count the APP supplied
// (`guestCountSource: 'playbook-typical'`, written by the creation seam when the
// host gives no number) against a CONTRACTED caterer set to the host's real 60:
//
//   severity:    high
//   explanation: "Caterer expects 60; guest tracker shows 40."
//   fix label:   "Match the guest tracker (40)"
//   fix patch:   { guestCount: 40 }          ← onto the vendor record
//   receipt:     "Caterer set to 40 — it matches your guest tracker now."
//
// So a number the app invented raises a high-severity alarm against a real
// arrangement, is offered as a one-tap write onto a contracted vendor, and the
// host is then told it is reconciled. Every step is the thing P0-2 existed to
// prevent, reached through a file P0-2 cleared.
//
// ── WHY THE max() IS RIGHT AND STAYS ───────────────────────────────────────
//
// The module takes `max(roster.length, guestEstimate)` for a stated reason,
// recorded above the line: a PARTIAL roster must not shadow the host's intended
// number — "a 7-of-75 roster read as 7, so a caterer set to the real 75 looked
// off by 68". That is correct and is not what this fixes. Only the estimate
// TERM is gated: when the app supplied the estimate there is no host intent to
// compare the caterer against, so there is nothing to reconcile.
import { deriveVendorPromiseConflicts } from '../vendorAccountability/conflicts';

const caterer = (over = {}) => ({
  id: 'v1', name: 'Shore Catering', category: 'Catering',
  status: 'Contracted', cost: 1200, guestCount: 60, ...over,
});
const ev = (over = {}) => ({
  id: 'ev-conflict', type: 'Cookout', date: '2027-06-12',
  guests: [], vendors: [caterer()],
  ...over,
});
const mismatches = (event) => {
  let out = [];
  try { out = deriveVendorPromiseConflicts(event, []) || []; } catch { out = []; }
  const list = Array.isArray(out) ? out : (out.conflicts || []);
  return list.filter((c) => c && c.kind === 'count_mismatch');
};

describe('the app’s own number does not argue with a real caterer', () => {
  test('an app-substituted estimate raises NO count conflict', () => {
    expect(mismatches(ev({ guestEstimate: 40, guestCountSource: 'playbook-typical' }))).toEqual([]);
  });

  test('and therefore offers no one-tap write of an invented number onto the vendor', () => {
    // The specific harm: the fix patched { guestCount: 40 } onto a CONTRACTED
    // caterer and told the host it was reconciled.
    const fixes = mismatches(ev({ guestEstimate: 40, guestCountSource: 'playbook-typical' }))
      .map((c) => c.proposedFix && c.proposedFix.set && c.proposedFix.set.patch);
    expect(fixes).toEqual([]);
  });
});

describe('every legitimate conflict still fires — this narrows nothing real', () => {
  test('a count the HOST gave still raises the mismatch', () => {
    const m = mismatches(ev({ guestEstimate: 40, guestCountSource: 'host' }));
    expect(m).toHaveLength(1);
    expect(m[0].severity).toBe('high');
    expect(m[0].explanation).toMatch(/Caterer expects 60; guest tracker shows 40/);
  });

  test('a legacy event that never recorded a source is not treated as invented', () => {
    // Same resolution guestCountFor uses everywhere: only a number we recorded
    // as OUR OWN substitution is doubted. Silence is not an accusation.
    expect(mismatches(ev({ guestEstimate: 40 }))).toHaveLength(1);
  });

  test('THE REASON THE max() EXISTS — a partial roster still cannot shadow the plan', () => {
    // The recorded case: a 7-of-75 roster must not make a caterer set to the
    // real 75 look "off by 68". The host's 75 wins over the 7 rows.
    const m = mismatches(ev({
      guestEstimate: 75, guestCountSource: 'host',
      guests: Array.from({ length: 7 }, (_, i) => ({ id: `g${i}`, name: `G${i}`, rsvp: 'Yes' })),
      vendors: [caterer({ guestCount: 75 })],
    }));
    // A caterer matching the host's plan is not a conflict.
    expect(m).toEqual([]);
  });

  test('a roster alone still raises a real mismatch', () => {
    // No estimate at all, so provenance gating cannot be what suppresses it.
    const m = mismatches(ev({
      guests: Array.from({ length: 12 }, (_, i) => ({ id: `g${i}`, name: `G${i}`, rsvp: 'Yes' })),
    }));
    expect(m).toHaveLength(1);
    expect(m[0].explanation).toMatch(/guest tracker shows 12/);
  });

  test('a caterer whose count the host deliberately confirmed stays quiet', () => {
    // The pre-existing acknowledgement path, re-proven untouched.
    const m = mismatches(ev({
      guestEstimate: 40, guestCountSource: 'host',
      vendors: [caterer({ guestCountConfirmed: true })],
    }));
    expect(m).toEqual([]);
  });
});
