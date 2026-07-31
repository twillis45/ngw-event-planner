// ─── AN ESTIMATE ALWAYS SAYS SO (app-wide pass, 2026-07-29) ────────────────
//
// Host ruling: "be consistent with information to host so they understand what
// is an estimate." UX_08 states the standard outright: "Never display an
// estimate without the marker."
//
// The offender was `committed` — the "spoken for" headline. It is a MIXTURE:
// money genuinely spent, PLUS every not-yet-bought term, and those are all
// plan-priced guesses. It rendered bare in three places and fed two derived
// headroom lines, so a plan whose food and supplies were entirely estimated
// read exactly as firm as one paid in full.
//
// This gate holds the ENGINE half of the fix: the estimated share of the
// headline is a real, derived, single-sourced number. The shell can then say so
// without composing it (the same reason `uncommitted` is derived in there).
const { hostSpending } = require('../hostSpending');

const base = (over) => ({
  id: 'ev-est-test',
  type: 'The Cookout',
  date: '2027-08-22',
  venue: 'Backyard',
  guestMode: 'count',
  guestEstimate: 30,
  totalBudget: 4000,
  budget: [],
  vendors: [],
  guests: [],
  ...over,
});

describe('the estimated share of "spoken for" is derived, not guessed at by readers', () => {
  it('reports a committedEstimated that is a real slice of committed', () => {
    const s = hostSpending(base());
    expect(s).toBeTruthy();
    expect(typeof s.committedEstimated).toBe('number');
    expect(s.committedEstimated).toBeGreaterThanOrEqual(0);
    // Never exceeds the number it is a share OF — the bug this clamp prevents
    // would print "more estimated than spoken for".
    expect(s.committedEstimated).toBeLessThanOrEqual(s.committed);
  });

  it('a plan-priced event with nothing bought is mostly estimate', () => {
    const s = hostSpending(base());
    // A fresh cookout: the food/supplies/capacity terms are all still guesses.
    if (s.committed > 0) {
      expect(s.committedEstimated).toBeGreaterThan(0);
    }
  });

  it('never counts vendor balances or a chosen stay as an estimate', () => {
    // Those are contracted / real listed figures — the app is not guessing at
    // them, so they must not inflate the "still an estimate" claim.
    const withVendor = base({
      vendors: [{ id: 'v1', name: 'Hearthstone', status: 'Booked', cost: 2000, depositAmt: 500, depositPaid: true, balancePaid: false }],
    });
    const a = hostSpending(base());
    const b = hostSpending(withVendor);
    expect(b.vendorOwed).toBeGreaterThan(0);
    // The vendor's outstanding balance raised `committed`…
    expect(b.committed).toBeGreaterThan(a.committed);
    // …but not the estimated share of it.
    expect(b.committedEstimated).toBe(a.committedEstimated);
  });

  it('includes the already-spent estimated portion, so the share is never understated', () => {
    const s = hostSpending(base());
    expect(s.committedEstimated).toBeGreaterThanOrEqual(s.spentEstimated);
  });
});
