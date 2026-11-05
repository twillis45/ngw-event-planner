// Owner acceptance run, 11/5/2026 (issue #100, D-9): logging a $62.48 grocery
// payment raised the expected total from $293 to $355.48 (counted on top of the
// food estimate), and filing it under the food category instead dropped the
// rest of the estimate. Both were RED on moneyCategories as it stood.
import { moneyCategories, budgetPaymentPatch } from '../vendorMoney';

const estimates = [{ label: 'Catering', expected: 100, spent: 0 }, { label: 'Bar / Beverage', expected: 148, spent: 0 }];
const total = (cats, k) => Math.round(cats.reduce((s, c) => s + c[k], 0) * 100) / 100;

test('a payment filed under Food is spent against the food estimate, not added to it', () => {
  const ev = { budget: [] };
  const edit = budgetPaymentPatch(ev, 'budget-x', 62.48, 'Food');
  const cats = moneyCategories({ ...ev, ...edit }, estimates);
  const food = cats.find(c => /food|catering/i.test(c.label));
  expect(food.spent).toBe(62.48);
  expect(food.expected).toBe(100);           // the plan still expects the whole food estimate
  expect(total(cats, 'expected')).toBe(248);  // was 310.48 with a separate line, 210.48 when merged
});

test('a payment larger than the estimate raises expected to what was really spent', () => {
  const cats = moneyCategories({ budget: [{ id: 'b', category: 'Food', budgeted: 0, actual: 140 }] }, estimates);
  expect(cats.find(c => /food|catering/i.test(c.label)).expected).toBe(140);
});

test('a budget line the host set still owns the expected amount', () => {
  const cats = moneyCategories({ budget: [{ id: 'b', category: 'Food', budgeted: 80, actual: 20 }] }, estimates);
  expect(cats.find(c => /food|catering/i.test(c.label)).expected).toBe(80);
});
