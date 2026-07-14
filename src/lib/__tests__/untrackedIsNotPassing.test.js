// SSOT #1 / R2 — UNTRACKED IS NOT PASSING.
//
// The second root cause of the claim-truthfulness bug class (distinct from
// booked-licenses-confirmed). A check that never RAN was being scored as a check
// that PASSED:
//
//   • getVendorReadiness counted `notTracked` and then never consulted it — the
//     fallthrough said "All checks passing — ready for event day" regardless.
//   • The cockpit's LockInTracker and its KPI chip did
//     `.filter(g => g.status !== 'not_tracked')` and THEN computed
//     `allDone = done === total`, so an untracked gate did not count as
//     incomplete — it vanished from the denominator, and partial coverage became
//     arithmetically 100%: a green "All set" / "5/5 sorted" beside an amber
//     "$5,800 due" chip.
//
// This is the DEFAULT path, not an edge case: the final-payment gate is
// 'not_tracked' whenever payDueDate is empty (vendorIntelligence.js:933), and
// empty is what every vendor the app scaffolds starts with.

import { getVendorReadiness, getVendorPlanningState, getVendorChallengeSummary } from '../vendorIntelligence';

const future = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// A Contracted vendor with real money outstanding and NO payDueDate — the exact
// shape the app's own vendor scaffold produces.
const owedVendor = (over = {}) => ({
  id: 'v1', name: 'Fired Up BBQ', category: 'Catering', status: 'Contracted',
  cost: 7800, depositAmt: 2000, depositPaid: true, balancePaid: false,
  payDueDate: '',            // ← the default. Makes the final-payment gate untracked.
  contractSigned: true, arrivalTime: '14:00',
  ...over,
});

test('the final-payment gate really is untracked when payDueDate is empty (the default)', () => {
  const event = { id: 'e', date: future(10), vendors: [owedVendor()] };
  const rows = getVendorPlanningState(owedVendor(), event);
  const balance = rows.find(r => r.key === 'balance');
  expect(balance).toBeTruthy();
  expect(balance.status).toBe('not_tracked');   // $5,800 owed, and nobody is watching it
});

// THE $5,800 CASE. The financial axis used to return level 'safe' with the note
// "Deposit paid; balance pending." — the note named the outstanding money while
// the level scored it a passing check, and that green fed "All checks passing".
// The honest question is not "has some money moved?" but "is the rest being
// TRACKED?" With no payDueDate on file (the default), nobody is watching it.
test('an outstanding balance that nobody is watching is NOT a passing check', () => {
  const v = owedVendor();                                  // $5,800 owed, no payDueDate
  const event = { id: 'e', date: future(10), vendors: [v] };
  const axes = getVendorChallengeSummary(v, event);

  expect(axes.financial.level).not.toBe('safe');           // was 'safe' — the bug
  expect(axes.financial.level).toBe('not_tracked');
  expect(axes.financial.note).toMatch(/5,800/);            // names the money
  expect(axes.financial.note).toMatch(/no due date/);
});

test('the same balance WITH a due date on file is genuinely being watched', () => {
  const v = owedVendor({ payDueDate: future(60) });
  const event = { id: 'e', date: future(90), vendors: [v] };
  const axes = getVendorChallengeSummary(v, event);
  // Money is owed but scheduled and visible — not an unknown.
  expect(axes.financial.level).toBe('safe');
});

test('a vendor with untracked checks never reports "All checks passing"', () => {
  const v = owedVendor();
  const event = { id: 'e', date: future(10), vendors: [v] };
  const r = getVendorReadiness(v, event);

  expect(r.counts.notTracked).toBeGreaterThan(0);
  expect(r.summary).not.toMatch(/All checks passing/);
  expect(r.level).not.toBe('safe');       // an unknown is never scored as a pass
});

test('"All checks passing" is reachable — but only when every check actually ran', () => {
  const clean = owedVendor({
    status: 'Confirmed',
    balancePaid: true,          // money settled → the final-payment gate is 'done', not untracked
    payDueDate: future(5),
    coiStatus: 'received', coiVerified: true, coiExpiryDate: future(200),
  });
  const event = { id: 'e', date: future(10), vendors: [clean] };
  const r = getVendorReadiness(clean, event);

  // If anything remains untracked for this vendor, we must still not claim all-clear.
  if (r.counts.notTracked > 0) {
    expect(r.summary).not.toMatch(/All checks passing/);
  } else {
    expect(r.level).toBe('safe');
    expect(r.summary).toMatch(/All checks passing/);
  }
});
