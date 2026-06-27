// ─── hostSpending — the ONE spending source for a host event ──────────────────
//
// The host Budget and the Food Plan used to disagree: the Budget hero summed only
// the manual budget rows' `actual`, while the Food Plan tracked its own estimate +
// bought-so-far. A host with a real food plan still saw "$0 of $1,200" because the
// food never flowed into the budget.
//
// hostSpending(event, priceFactor) is the single derivation every host budget
// surface reads, so the hero and the Budget tab can never disagree again. PURE —
// it derives from the event's REAL budget rows AND the SAME playbookFoodPlan the
// food panel renders (no parallel food math). When there is no food plan, the food
// terms are 0 and behavior is byte-identical to the old "sum of row.actual" rule.
//
// Returns { total, spent, committed, foodEstimate, foodBought, hasFood }:
//   • total       = event.totalBudget if set (>0), else sum of budget rows' budgeted.
//   • foodEstimate = midpoint of the food plan's foodLow/foodHigh (0 with no plan).
//   • foodBought   = $ of food items marked got — each item's locked $ if present,
//                    else its low/high midpoint. (Mirrors playbookFoodPlan's eff().)
//   • spent        = sum(budget rows' actual) + foodBought  (food you've BOUGHT is spent).
//   • committed    = spent + the not-yet-bought portion of foodEstimate (so the
//                    budget reflects PLANNED food even before it's purchased).
//
// Honest bounds: foodBought never exceeds foodEstimate's ceiling concern — it's the
// real checked-off total; committed never dips below spent (the un-bought remainder
// is clamped at ≥ 0).

import { playbookFoodPlan } from './playbooks';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const mid = (lo, hi) => {
  const l = num(lo);
  const h = num(hi);
  if (h <= 0 && l <= 0) return 0;
  if (h <= 0) return l;
  if (l <= 0) return h;
  return Math.round((l + h) / 2);
};

// foodBought — the $ of food the host has actually checked off (event.foodGot[id]).
// Walk the food plan's own `list` so we use the SAME per-item costs (locked $ when
// present, else the low/high midpoint) the plan itself bills with. Supplies are a
// separate line in the plan (group 'Supplies'); food spent excludes them, matching
// the food-total convention in playbookFoodPlan.
function foodBoughtFrom(event, plan) {
  if (!plan || !Array.isArray(plan.list)) return 0;
  const got = (event && event.foodGot && typeof event.foodGot === 'object') ? event.foodGot : {};
  let sum = 0;
  for (const it of plan.list) {
    if (!it || it.skipped) continue;
    if (it.group === 'Supplies') continue; // food line only — supplies are separate
    if (!got[it.id]) continue;
    sum += it.locked != null ? num(it.locked) : mid(it.low, it.high);
  }
  return Math.max(0, Math.round(sum));
}

export function hostSpending(event, priceFactor) {
  const ev = event || {};
  const rows = Array.isArray(ev.budget) ? ev.budget : [];
  const budgetedSum = rows.reduce((s, r) => s + num(r && r.budgeted), 0);
  const rowsActual = rows.reduce((s, r) => s + num(r && r.actual), 0);
  const total = num(ev.totalBudget) > 0 ? num(ev.totalBudget) : budgetedSum;

  // The SAME food plan the food panel renders — single source, no parallel math.
  let plan = null;
  try {
    plan = playbookFoodPlan(ev, { priceFactor: num(priceFactor) > 0 ? num(priceFactor) : 1 });
  } catch (_e) { plan = null; }

  const hasFood = !!(plan && (num(plan.foodLow) > 0 || num(plan.foodHigh) > 0));
  const foodEstimate = hasFood ? mid(plan.foodLow, plan.foodHigh) : 0;
  const foodBought = hasFood ? foodBoughtFrom(ev, plan) : 0;

  // Spent = manual actuals + food actually bought.
  const spent = Math.max(0, Math.round(rowsActual + foodBought));
  // Committed adds the food still PLANNED but not yet bought (never negative — if
  // you've bought more than the estimate, the remainder is just 0, not a credit).
  const foodRemaining = Math.max(0, foodEstimate - foodBought);
  const committed = Math.max(spent, Math.round(spent + foodRemaining));

  return { total: Math.round(total), spent, committed, foodEstimate, foodBought, hasFood };
}

export default hostSpending;
