// C2 — A PRESENCE PREDICATE MAY NOT SATISFY AN ACT.
//
// taskEngine's own header promises it "returns true ONLY when we can prove from
// event facts that the task is handled." Two families broke that promise, and they
// are the two where being wrong costs the host the most.
//
// MONEY: there was no money signal in taskEngine at all, so tasks telling the host
// to PAY fell through to the /cater/ and /vendor/ branches and were satisfied by
// hasNamedVendor — marked done because a vendor had a NAME. And effectiveDone() is
// what every "what's left" surface reads, and the host checklist DROPS those rows —
// so the task didn't merely turn green, it disappeared. The app hid the bill.
//
// INVITATIONS: "Send the invitations" was satisfied by hasGuests — a number typed at
// intake. Typing "40" marked the invitations sent. Nothing had been sent.

import { taskSatisfied, effectiveDone } from '../taskEngine';

const t = (text) => ({ id: 'x', task: text });

const owed = (over = {}) => ({
  id: 'e-c2', type: 'Retirement Party', date: '2026-09-01',
  guestCount: 40, guests: [], timeline: [], budget: [],
  vendors: [{
    id: 'v1', name: 'Fired Up BBQ', category: 'Catering', status: 'Contracted',
    cost: 7800, depositAmt: 2000, depositPaid: true, balancePaid: false,
  }],
  ...over,
});

// ── MONEY ────────────────────────────────────────────────────────────────────
// These are REAL seeded tasks from App.js, not invented ones.

test('"Confirm all vendors — check balance due status" is NOT done just because a vendor is named', () => {
  const ev = owed();                       // $5,800 still owed
  expect(taskSatisfied(ev, t('Confirm all vendors — check balance due status'))).toBe(false);
  expect(effectiveDone(ev, t('Confirm all vendors — check balance due status'))).toBe(false);
});

test('"Pay the caterer balance once headcount is final" is NOT done while money is owed', () => {
  expect(taskSatisfied(owed(), t('Pay the caterer balance once headcount is final'))).toBe(false);
});

test('"Negotiate vendor payment plans where possible" is NOT done off a vendor name', () => {
  expect(taskSatisfied(owed(), t('Negotiate vendor payment plans where possible'))).toBe(false);
});

test('a money task IS satisfied when the money is actually settled — proven by money, not a name', () => {
  const paid = owed({
    vendors: [{ id: 'v1', name: 'Fired Up BBQ', category: 'Catering', status: 'Confirmed',
                cost: 7800, depositAmt: 2000, depositPaid: true, balancePaid: true }],
  });
  expect(taskSatisfied(paid, t('Pay the caterer balance once headcount is final'))).toBe(true);
  expect(taskSatisfied(paid, t('Confirm all vendors — check balance due status'))).toBe(true);
});

test('a DEPOSIT task is proven by the deposit, not by the full balance', () => {
  const depositPaidOnly = owed();          // deposit paid, balance outstanding
  expect(taskSatisfied(depositPaidOnly, t('Sign the contract and pay the deposit'))).toBe(true);

  const nothingPaid = owed({
    vendors: [{ id: 'v1', name: 'Fired Up BBQ', status: 'Contracted', cost: 7800, depositAmt: 2000, depositPaid: false }],
  });
  expect(taskSatisfied(nothingPaid, t('Sign the contract and pay the deposit'))).toBe(false);
});

test('a money task with no committed vendor to prove it against is never assumed done', () => {
  const noVendors = owed({ vendors: [] });
  expect(taskSatisfied(noVendors, t('Pay the final balances'))).toBe(false);
});

// ── INVITATIONS ──────────────────────────────────────────────────────────────

test('"Send the invitations" is NOT done because the host typed a headcount', () => {
  const justACount = { id: 'e', guestEstimate: 40, guests: [], vendors: [], timeline: [] };
  expect(taskSatisfied(justACount, t('Send the invitations'))).toBe(false);
  expect(taskSatisfied(justACount, t('Chase the RSVPs'))).toBe(false);
});

test('invitations ARE proven sent once somebody has answered — including a maybe', () => {
  const someoneReplied = {
    id: 'e', guests: [{ id: 'g1', rsvp: 'Maybe' }, { id: 'g2', rsvp: 'Pending' }],
    vendors: [], timeline: [],
  };
  expect(taskSatisfied(someoneReplied, t('Send the invitations'))).toBe(true);
});

test('an imported roster where NOBODY has replied does not prove the invitations went out', () => {
  const imported = {
    id: 'e', guests: Array.from({ length: 80 }, (_, i) => ({ id: 'g' + i, rsvp: 'Pending' })),
    vendors: [], timeline: [],
  };
  expect(taskSatisfied(imported, t('Send the invitations'))).toBe(false);
});

test('setting the guest COUNT is still proven by a count — the two questions are different', () => {
  const counted = { id: 'e', guestCount: 40, guests: [], vendors: [], timeline: [] };
  expect(taskSatisfied(counted, t('Confirm the final headcount'))).toBe(true);
  // …but that same count still cannot claim the invitations were sent.
  expect(taskSatisfied(counted, t('Send the invitations'))).toBe(false);
});
