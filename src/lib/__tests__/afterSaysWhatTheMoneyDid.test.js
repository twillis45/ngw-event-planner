// ─── AFTER SAYS WHAT THE MONEY DID, ON THE EXPECTED BASIS (audit 2 lane C P0-3) ─
//
// The day after, "Landed inside the $600 you planned" showed on an event with
// no spend recorded at all, and Wanda read "$1,590 · Landed inside $5,000"
// against $5,263 expected. Owner ruling D-03 (11/22/2026): over/under is
// judged on EXPECTED cost (expectedHeadroom). So After:
//   · never says "inside" without recorded spend;
//   · never says inside (or shows green) while expected OR recorded spend is
//     over the budget.
import { afterSpendVerdict, planHeadroomLine } from '../budgetCopy';

const m = (planned, expected, committed, spent) => ({ planned, expected, committed, spent });

test('no spend recorded: never "Landed inside"', () => {
  const v = afterSpendVerdict(m(600, 0, 0, 0));
  expect(v.state).toBe('unrecorded');
  expect(v.line).not.toMatch(/inside/i);
  expect(planHeadroomLine(m(600, 0, 0, 0), true)).not.toMatch(/under/i);
});

test('Wanda: $5,263 expected against $5,000 is over, whatever was paid', () => {
  const v = afterSpendVerdict(m(5000, 5263, 1590, 1590));
  expect(v.state).toBe('over');
  expect(v.line).toMatch(/\$263 over the \$5,000/);
  expect(v.line).not.toMatch(/inside/i);
  expect(planHeadroomLine(m(5000, 5263, 1590, 1590), true)).toMatch(/over/);
});

test('recorded spend over the budget is over', () => {
  const v = afterSpendVerdict(m(1000, 900, 1200, 1200));
  expect(v.state).toBe('over');
  expect(v.line).toMatch(/\$200 over the \$1,000/);
});

test('spend recorded, expected and recorded both inside: inside', () => {
  const v = afterSpendVerdict(m(45000, 30000, 16200, 5000));
  expect(v.state).toBe('inside');
  expect(v.line).toMatch(/inside the \$45,000/);
});

test('no budget: no verdict', () => {
  expect(afterSpendVerdict(m(0, 500, 500, 500))).toBeNull();
});
