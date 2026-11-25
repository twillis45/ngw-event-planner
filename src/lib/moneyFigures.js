// ─── THE MONEY NUMBERS AND WHAT EACH IS CALLED (six root causes, cause 3) ────
//
// Thanksgiving walkthrough P1-6 (11/23/2026): Your money's star read
// "Expected left to spend $77" on a $400 budget with $323 expected and $0
// spent. $77 is the ROOM in her budget (budget − expected); what she still has
// to spend is $323 (expected − spent). The bar's "$400 of $400 left" was a
// third figure (budget − spoken for). Each number now has one formula and one
// name, here; every money surface reads them.
import { roundCurrency } from './currency';

const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

/**
 * moneyFigures(money) — money is lib/hostSpending's { planned, expected,
 * committed, spent }. Returns:
 *   expected    — everything the plan is expected to cost
 *   committed   — spoken for (booked, bought, pledged)
 *   spent       — actually paid
 *   leftToSpend — expected − spent (what she still has to pay out), ≥ 0
 *   headroom    — budget − expected (null without a budget); < 0 is over
 *   unpledged   — budget − committed (null without a budget)
 */
export function moneyFigures(money) {
  const m = money || {};
  const planned = num(m.planned);
  const expected = num(m.expected);
  const committed = num(m.committed);
  const spent = num(m.spent);
  return {
    planned, expected, committed, spent,
    leftToSpend: roundCurrency(Math.max(0, expected - spent)),
    headroom: planned > 0 ? roundCurrency(planned - expected) : null,
    unpledged: planned > 0 ? roundCurrency(planned - committed) : null,
  };
}

/**
 * The words for each figure. Nothing is called "left to spend" (cohesion audit
 * #5, 11/24/2026, owner-approved): on one card "$4,380 left to spend" sat
 * beside "$3,410 of $5,000 not yet spoken for", and both read as what is left
 * of the budget. expected − spent is what she still has to pay out, so it says
 * that. (The key keeps its name; the words are the host's.)
 */
export const MONEY_LABELS = Object.freeze({
  leftToSpend: 'Still to pay',
  headroomUnder: 'Room left in your budget',
  headroomOver: 'Expected over by',
  unpledged: 'not yet spoken for',
});
export function headroomLabel(figures) {
  return figures && figures.headroom != null && figures.headroom < 0 ? MONEY_LABELS.headroomOver : MONEY_LABELS.headroomUnder;
}
