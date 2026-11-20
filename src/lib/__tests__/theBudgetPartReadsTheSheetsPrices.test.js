// ─── THE BUDGET PART READS THE SHEET'S PRICES (hero-clears sweep, 11/20/2026) ──
// The money sheet prices bought lines at the region's factor; the plan's Budget
// part priced them at the national baseline, so a host inside her number at
// local prices was told "Known costs are $N over your budget". The part now
// takes the same price context the sheet uses. e2e: theBudgetPartReadsTheLocalPrices.
import { deriveEventPhaseProgress } from '../phaseProgress';
import { hostSpending } from '../hostSpending';
import { playbookFoodPlan } from '../playbooks';

const now = new Date(2026, 10, 20, 12);
const ev0 = { id: 'hc-budget', type: 'Birthday', date: '2026-12-20', guestEstimate: 40, venue: 'Lakeside Hall', vendors: [], timeline: [], guests: [] };
const got = {};
((playbookFoodPlan(ev0) || {}).list || []).forEach((i) => { got[i.id] = true; });
const bought = { ...ev0, foodGot: got };
const national = hostSpending(bought).committed;
const local = hostSpending(bought, 0.6).committed;
const ev = { ...bought, totalBudget: Math.round((national + local) / 2) };
const budgetItem = (pp) => pp.items.find((i) => i.id === 'budget');

test('premise: local prices run below national for these lines', () => {
  expect(local).toBeLessThan(national);
});
test('at local prices inside the budget, the Budget part is handled', () => {
  const b = budgetItem(deriveEventPhaseProgress(ev, now, { priceFactor: 0.6, itemFactors: {} }));
  expect(b.handled).toBe(true);
  expect(b.cueLabel).toBeNull();
});
test('control: with no price context it reads the national baseline, as before', () => {
  const b = budgetItem(deriveEventPhaseProgress(ev, now));
  expect(b.handled).toBe(false);
  expect(b.cueLabel).toMatch(/over your budget/);
});
