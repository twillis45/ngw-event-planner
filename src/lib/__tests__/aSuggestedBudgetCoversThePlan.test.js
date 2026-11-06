// Issue #100 (owner acceptance run, 11/5/2026, data inconsistencies). For ten at
// a game night the budget ask led with "$200 — Use $200" while the same sheet's
// money section said "$293 expected in total" from the plan's own estimates. One
// tap put the host $93 over budget before she had bought anything, and nothing
// on the ask said so. Same ruling as estimateShortfallNote: show both numbers,
// say which is which, never quietly floor the band.
import { planCostsAboveNote } from '../budgetCopy';

test('the plan expecting more than the suggestion is said, with a covering figure', () => {
  const n = planCostsAboveNote(293, 200);
  expect(n).not.toBe(null);
  expect(n.text).toMatch(/\$293/);
  expect(n.text).toMatch(/\$200/);
  expect(n.cover).toBe(300);
});

test('a suggestion that covers the plan says nothing', () => {
  expect(planCostsAboveNote(180, 200)).toBe(null);
  expect(planCostsAboveNote(200, 200)).toBe(null);
});

test('no plan costs yet, or no suggestion: nothing to compare', () => {
  expect(planCostsAboveNote(0, 200)).toBe(null);
  expect(planCostsAboveNote(undefined, 200)).toBe(null);
  expect(planCostsAboveNote(293, 0)).toBe(null);
});

test('the covering figure rounds up the way the tiers do, never below the plan', () => {
  expect(planCostsAboveNote(1234, 1000).cover).toBe(1300);
  expect(planCostsAboveNote(301, 300).cover).toBe(400);
});
