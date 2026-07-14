// PICKERS SIZE THE SHELLFISH — not heads.
//
// The app asks the host how many people actually PICK crabs, stores it
// (event.crabPlan.crabEatingHeadcount), toasts "Sizing crabs to 10 pickers — kids
// and light eaters don't drive the count", and its own risk card (crabFeast.js
// r_count) says "count by ADULT PICKERS, not heads."
//
// Then playbookFoodPlan sized the crab line to the full guest count anyway — and
// the food plan is what BILLS (hostSpending reads it). Measured before the fix, on
// a 24-guest feast where the host said 10 pick:
//
//     crab line = 21 dozen (~252 crabs), $672–$3,948
//     crab card = ~10 pickers × 9 ≈ 90 crabs
//
// The biggest line item on the flagship event type, and the app contradicted itself
// on one screen — while claiming it had sized to pickers.

import { playbookFoodPlan } from '../playbooks';

const feast = (over = {}) => ({
  id: 'e-pick', type: 'Crab Feast', date: '2026-08-20',
  guestMode: 'count', guestCount: 24, guests: [], foodGot: {},
  ...over,
});

const crabLine = (ev) => (playbookFoodPlan(ev).list || []).find(i => /crab/i.test(i.id) || /crab/i.test(i.name || ''));

test('the crab line sizes to the PICKERS the host declared, not the head count', () => {
  const heads = crabLine(feast());                                            // no picker count set
  const pickers = crabLine(feast({ crabPlan: { crabEatingHeadcount: 10 } })); // host says 10 pick

  expect(heads).toBeTruthy();
  expect(pickers).toBeTruthy();

  // The whole point: declaring pickers must actually shrink the order.
  expect(pickers.qty).toBeLessThan(heads.qty);
  expect(pickers.high).toBeLessThan(heads.high);
});

test('a host who never declares pickers is unaffected — nothing changes for them', () => {
  const a = crabLine(feast());
  const b = crabLine(feast({ crabPlan: { lines: [] } }));   // a crabPlan with no picker count
  expect(b.qty).toBe(a.qty);
});

test('pickers cannot outnumber guests — the clamp is crabPlan\'s, not re-derived here', () => {
  // 24 guests, host fat-fingers 500 pickers. crabPlan clamps that to the real guest
  // count; the food plan INHERITS the clamped number rather than ordering for 500.
  const absurd = crabLine(feast({ crabPlan: { crabEatingHeadcount: 500 } }));
  const plain = crabLine(feast());
  const ten = crabLine(feast({ crabPlan: { crabEatingHeadcount: 10 } }));

  // nowhere near a 500-person order — it lands at the guest-count scale
  expect(absurd.qty).toBeLessThanOrEqual(plain.qty);
  expect(absurd.qty).toBeGreaterThan(ten.qty);   // still more than the 10-picker order

  // UPDATED 2026-07-14. This used to assert `absurd.qty < plain.qty`, and explained the
  // gap away: "the clamp lands on the RAW guest count (24), while the un-clamped plan
  // sizes to the attendance-band planning number (28 — plus-ones and walk-ins). Both are
  // honest; they answer different questions."
  //
  // They were not both honest. That gap WAS the bug — the food row and the crab plan
  // were reading different headcounts, and so printed different crab totals on one
  // screen. The crab line now reads the crab engine for BOTH the rate and the head
  // count, so the clamped case and the plain case land on the same 24 pickers and agree
  // exactly. The crab plan owns the crab number; the food row renders it.
  expect(absurd.qty).toBe(plain.qty);
});

test('NON-shellfish lines still size to the full guest count — this is a shellfish rule', () => {
  const withPickers = playbookFoodPlan(feast({ crabPlan: { crabEatingHeadcount: 10 } }));
  const without = playbookFoodPlan(feast());

  const nonShellfish = (fp) => (fp.list || []).filter(i =>
    !/crab|shrimp|prawn|lobster|crawfish|oyster|clam|mussel/i.test(String(i.id) + ' ' + String(i.name || '')));

  const a = nonShellfish(withPickers);
  const b = nonShellfish(without);
  expect(a.length).toBeGreaterThan(0);
  // corn, sides, drinks etc. feed everyone who shows up — pickers must not shrink them
  a.forEach((item, i) => expect(item.qty).toBe(b[i].qty));
});

test('the bushel recommendation sizes off the same basis as the line — no split brain', () => {
  // resolveBulkPurchase used proteinGuests, so the crab card could say "10 pickers"
  // while the BUSHEL maths still said 28 heads.
  const withPickers = crabLine(feast({ crabPlan: { crabEatingHeadcount: 10 } }));
  const without = crabLine(feast());
  if (withPickers.bulkRecommendation && without.bulkRecommendation) {
    expect(JSON.stringify(withPickers.bulkRecommendation))
      .not.toBe(JSON.stringify(without.bulkRecommendation));
  }
});
