import { hostSpending } from '../hostSpending';
import { budgetHeroCopy } from '../budgetCopy';

test('actual cents survive category ownership, sums, and the budget target', () => {
  const money = hostSpending({ totalBudget: 100.5, budget: [
    { id: 'a', category: 'Flowers', actual: 0.49 },
    { id: 'b', category: 'Printing', actual: 0.49 },
  ] });
  expect(money.total).toBe(100.5);
  expect(money.spent).toBe(0.98);
  expect(money.committed).toBe(0.98);
  expect(money.expected).toBe(0.98);
  expect(money.uncommitted).toBe(99.52);
});

test('vendor balances preserve the contract and payment cents', () => {
  const money = hostSpending({ totalBudget: 5000, vendors: [
    { id: 'v', category: 'Catering', status: 'Booked', cost: 4800.01, depositAmt: 0.5, depositPaid: true },
  ] });
  expect(money.expected).toBe(4800.01);
  expect(money.committed).toBe(4800.01);
  expect(money.spent).toBe(0.5);
  expect(money.vendorOwed).toBe(4799.51);
});

test('the money narrative states recorded cents without rounding them into another amount', () => {
  const copy = budgetHeroCopy({ totalBudget: 100.5, budget: [{ id: 'a', category: 'Flowers', actual: 50.25 }] });
  expect(copy.title).toContain('$50.25');
  expect(copy.line).toContain('$50.25 spent');
});
