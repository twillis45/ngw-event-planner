import { hostSpending } from '../hostSpending';
import { SAMPLE_EVENTS_EXTRA } from '../../data/sampleEventsExtra';
import { budgetPaymentPatch } from '../vendorMoney';
import { deriveVendorPromiseConflicts } from '../vendorAccountability/conflicts';

const event = (overrides = {}) => ({
  id: 'money-truth', type: 'Unknown', totalBudget: 5000, budget: [], vendors: [], ...overrides,
});
const caterer = { id: 'v1', category: 'Catering', budgetCategory: 'Food', status: 'Contracted', cost: 3000, depositPaid: true, depositAmt: 500 };

test('a contract replaces its budget forecast; paying it moves spent without changing committed', () => {
  const ev = event({ budget: [{ id: 'b1', category: 'Food', budgeted: 3000, actual: 3000 }], vendors: [caterer] });
  const before = hostSpending(ev);
  const after = hostSpending({ ...ev, vendors: [{ ...caterer, balancePaid: true }] });
  expect(before.committed).toBe(3000);
  expect(before.spent).toBe(500);
  expect(after.committed).toBe(3000);
  expect(after.spent).toBe(3000);
  expect(before.moneyDiscrepancies).toHaveLength(1);
});

test('a budget allocation is expected, not a contract or a payment', () => {
  const m = hostSpending(event({ budget: [{ id: 'b', category: 'Flowers', budgeted: 500, actual: 100 }] }));
  expect(m.expected).toBe(500);
  expect(m.committed).toBe(100);
  expect(m.spent).toBe(100);
});

test('NGW estimates remain visible apart from spoken-for money', () => {
  const m = hostSpending(event({ type: 'Dinner Party', guestCount: 12, guestMode: 'count' }));
  expect(m.expected).toBeGreaterThan(0);
  expect(m.committed).toBe(0);
  expect(m.spent).toBe(0);
});

test('unknown categories never collapse together and explicit vendor budget links win', () => {
  const m = hostSpending(event({
    budget: [{ id: 'a', category: 'AV / Speeches', budgeted: 600, actual: 0 }, { id: 'b', category: 'Memory book', budgeted: 50, actual: 20 }],
    vendors: [{ ...caterer, category: 'Catering', budgetCategory: 'AV / Speeches', cost: 600, depositPaid: false }],
  }));
  expect(m.expected).toBe(650);
  expect(m.committed).toBe(620);
  expect(m.spent).toBe(20);
});

test('the audited sample has no false overrun and paying its caterer conserves commitments', () => {
  const ev = SAMPLE_EVENTS_EXTRA.find(e => /Margaret Adeyemi/.test(e.name));
  expect(ev).toBeTruthy();
  const before = hostSpending(ev);
  const after = hostSpending({ ...ev, vendors: ev.vendors.map(v => /Hearthstone/.test(v.name) ? { ...v, balancePaid: true } : v) });
  expect(before.committed).toBeLessThanOrEqual(before.total);
  expect(after.committed).toBe(before.committed);
  expect(after.spent - before.spent).toBe(3150);
  expect(before.committed).toBeGreaterThanOrEqual(before.spent);
});

test('logging a payment increments an existing manual actual without changing its allocation', () => {
  const ev = event({ budget: [{ id: 'b', category: 'Flowers', budgeted: 500, actual: 100 }] });
  const patch = budgetPaymentPatch(ev, 'b', '25.50');
  expect(patch.budget[0]).toEqual({ id: 'b', category: 'Flowers', budgeted: 500, actual: 125.5 });
  expect(ev.budget[0].actual).toBe(100);
  for (const amount of ['', 'no', -2, 0, Infinity]) expect(() => budgetPaymentPatch(ev, 'b', amount)).toThrow();
  expect(() => budgetPaymentPatch(ev, 'missing', 20)).toThrow();
});

test('a manual payment cannot compete with a contracted vendor payment record', () => {
  const ev = event({ budget: [{ id: 'b', category: 'Food', budgeted: 3000, actual: 0 }], vendors: [caterer] });
  expect(() => budgetPaymentPatch(ev, 'b', 20)).toThrow('Record this payment on the vendor.');
});

test('payment reconciliation uses the linked contract, never the category allocation', () => {
  const ev = event({ budget: [{ id: 'b', category: 'Food', budgeted: 3500, actual: 3000 }], vendors: [{ ...caterer, balancePaid: true }] });
  expect(deriveVendorPromiseConflicts(ev).filter(c => c.kind === 'payment_vs_budget')).toEqual([]);
  const conflicting = { ...ev, budget: [{ ...ev.budget[0], actual: 100 }] };
  const fix = deriveVendorPromiseConflicts(conflicting).find(c => c.kind === 'payment_vs_budget');
  expect(fix).toBeTruthy();
  expect(fix.proposedFix.confirm.event.budget[0].actual).toBe(3000);
});

test('an unpriced booking cannot erase an entered payment or allocation', () => {
  const m = hostSpending(event({ budget: [{ id: 'b', category: 'Food', budgeted: 1000, actual: 300 }], vendors: [{ ...caterer, cost: 0, depositPaid: false }] }));
  expect(m.expected).toBe(1000);
  expect(m.spent).toBe(300);
  expect(m.committed).toBe(300);
});

test('a real food receipt survives an allocation with no manual payment', () => {
  const m = hostSpending(event({ type: 'Dinner Party', guestCount: 12, guestMode: 'count',
    budget: [{ id: 'b', category: 'Food', budgeted: 1000, actual: 0 }],
    foodGot: { p_protein: true }, foodLocked: { p_protein: 120 }, foodReal: { p_protein: true },
  }));
  expect(m.foodBought).toBe(120);
  expect(m.spent).toBe(120);
  expect(m.committed).toBe(120);
});

test('recorded vendor payments survive a shopping status and alias categories do not add another estimate', () => {
  const paid = hostSpending(event({ vendors: [{ id: 'p', name: 'Photographer', category: 'Photography', status: 'Quoted', cost: 500, balancePaid: true }] }));
  expect(paid.spent).toBe(500);
  expect(paid.committed).toBe(500);
  const aliases = hostSpending(event({ type: 'Dinner Party', guestCount: 12, guestMode: 'count',
    foodChoices: { sourcing: 'caterer' }, vendors: [
      { id: 'a', category: 'Caterer', status: 'Booked', cost: 500 },
      { id: 'b', category: 'Catering', status: 'Booked', cost: 600 },
    ],
  }));
  const food = aliases.categories.filter(c => /cater/i.test(c.label));
  expect(food).toHaveLength(1);
  expect(food[0].expected).toBe(1100);
});

test('an event without budget rows can record its first payment using the existing budget model', () => {
  const ev = event();
  const patch = budgetPaymentPatch(ev, 'first-payment', '12.50', 'Flowers');
  expect(patch.budget).toEqual([{ id: 'first-payment', category: 'Flowers', budgeted: 0, actual: 12.5 }]);
  expect(hostSpending({ ...ev, ...patch }).spent).toBe(12.5);
  expect(() => budgetPaymentPatch(ev, 'empty', 12, '  ')).toThrow();
  expect(() => budgetPaymentPatch(event({ vendors: [caterer] }), 'duplicate', 20, 'Food')).toThrow('Record this payment on the vendor.');
});
