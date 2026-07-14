// POP-1A vendor orchestration: deriveCommandCenterData (what the CommandCenter
// UI renders) must not run a second vendor engine — its health status/line and
// issue count are derived from the SAME canonical rollup eventPlan() uses, so a
// host can never see two different vendor readiness numbers across surfaces.
import { deriveCommandCenterData, vendorReadinessRollup } from '../../CommandCenter';
// POP-1A: CommandCenter's own vendor counts must agree with the canonical rollup —
// the scenario that previously diverged: a "Contracted"/"Deposit Paid" vendor is
// workstream-booked but NOT in the old "Confirmed/Booked" status filter.
test('CommandCenter vendor health + issues reconcile with the canonical rollup', () => {
  const event = {
    id: 'e', type: 'Wedding', date: '2026-09-01', venue: 'Hall',
    guests: [], timeline: [], budget: [],
    vendors: [
      { id: 'v1', category: 'Catering', name: 'A', status: 'Deposit Paid' },
      { id: 'v2', category: 'Venue', name: 'B', status: 'Confirmed' },
      { id: 'v3', category: 'Photography', name: 'C', status: 'Considering' },
    ],
  };
  const rollup = vendorReadinessRollup(event);
  const data = deriveCommandCenterData(event);
  const vHealth = data.health.find(h => h.label === 'Vendors');
  // the health number is the rollup's ready/total (single source). SSOT #1:
  // "confirmed" is reserved for fully-locked-in; the Deposit-Paid vendor here is
  // booked-not-confirmed, so it's disclosed as "· 1 to confirm" (booked=2: Deposit
  // Paid + Confirmed; confirmed=1: only the Confirmed one).
  expect(vHealth.note).toBe(`${rollup.booked} of ${rollup.total} booked · 1 to confirm`);
  // issues count = rollup needsAttention (+ no drift here)
  expect(data.vendorIssuesCount).toBe(rollup.needsAttention);
});
