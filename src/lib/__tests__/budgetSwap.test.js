// Swap-to-save contract: only a truly discretionary row is offered, its
// removal must GENUINELY clear the overage (same hostSpending source), and
// essential word-families are protected — including 'Catering' (the \bcater\b
// boundary bug this suite exists to pin).
import { pickDroppableBudgetRow, BUDGET_ESSENTIAL_RE } from '../budgetSwap';

const ev = (over = {}) => ({
  id: 'e-swap', recordKind: 'host_event', type: 'Birthday Party', guestMode: 'count', guestCount: 20,
  totalBudget: 2000,
  // committed = rows + the food-plan estimate (hostSpending is the one source),
  // so fixtures leave real headroom for the engine's own food dollars.
  budget: [
    { category: 'Catering', budgeted: 800, actual: 800 },
    { category: 'Photo booth', budgeted: 1500, actual: 1500 },
  ],
  guests: [], vendors: [], timeline: [], ...over,
});

test('essential word families are protected — Catering, Caterer, Rentals', () => {
  expect(BUDGET_ESSENTIAL_RE.test('Catering')).toBe(true);
  expect(BUDGET_ESSENTIAL_RE.test('Caterer')).toBe(true);
  expect(BUDGET_ESSENTIAL_RE.test('Rentals')).toBe(true);
  expect(BUDGET_ESSENTIAL_RE.test('Photo booth')).toBe(false);
});

test('offers the discretionary row whose removal clears the overage', () => {
  const pick = pickDroppableBudgetRow(ev(), 1);
  expect(pick).toBeTruthy();
  expect(pick.row.category).toBe('Photo booth');
  expect(pick.drop).toBe(1500);
  expect(pick.clears).toBe(true);
});

test('never offers a drop that would not clear the overage', () => {
  const pick = pickDroppableBudgetRow(ev({ budget: [
    { category: 'Catering', budgeted: 800, actual: 800 },
    { category: 'DJ', budgeted: 1500, actual: 1500 },
    { category: 'Photo booth', budgeted: 50, actual: 50 },
  ] }), 1);
  // dropping the booth (50) can't clear it — only the DJ can
  expect(pick && pick.row.category).toBe('DJ');
});

test('null when nothing discretionary can clear it', () => {
  expect(pickDroppableBudgetRow(ev({ budget: [{ category: 'Catering', budgeted: 3000, actual: 3000 }] }), 1)).toBeNull();
});
