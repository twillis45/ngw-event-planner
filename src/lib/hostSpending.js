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

import { playbookFoodPlan, playbookCapacity, guestCountResolved } from './playbooks';
import { buildCrabPlan } from './crabPlan';

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
// Returns { total, firm }: `total` is every checked-off food line's cost (locked
// $ when present, else the low/high midpoint) — unchanged. `firm` is the portion
// backed by a REAL receipt the host typed (event.foodReal) or a host-added line
// (cost committed at add time); the rest is estimated. This lets the spend readout
// say "$X spent · ~$Y still estimated" instead of presenting an estimate as firm.
function foodBoughtFrom(event, plan) {
  if (!plan || !Array.isArray(plan.list)) return { total: 0, firm: 0 };
  const got = (event && event.foodGot && typeof event.foodGot === 'object') ? event.foodGot : {};
  const real = (event && event.foodReal && typeof event.foodReal === 'object') ? event.foodReal : {};
  let total = 0, firm = 0;
  for (const it of plan.list) {
    if (!it || it.skipped) continue;
    if (it.group === 'Supplies') continue; // food line only — supplies are separate
    if (it.excludeFromFoodTotal) continue; // CRAB-BUDGET-1: real $ tracked separately (crabBought)
    if (!got[it.id]) continue;
    const c = it.locked != null ? num(it.locked) : mid(it.low, it.high);
    total += c;
    if (it.added || (it.locked != null && real[it.id])) firm += c;
  }
  return { total: Math.max(0, Math.round(total)), firm: Math.max(0, Math.round(firm)) };
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

  // ENGINE RULE: never create a food budget without a real guest count. The food plan
  // sizes to a guessed "typical" headcount when none is set (guestCountOf falls back to
  // ~8) — that guess is fine for a labeled preview, but it must NOT become budget money.
  // So the budget's food contribution is 0 until the host has a real count (an entered
  // number, a roster, or a resolved RSVP count).
  const hasRealCount = num(ev.guestCount) > 0 || num(ev.guestEstimate) > 0
    || (Array.isArray(ev.guests) && ev.guests.length > 0)
    || (() => { try { return !!guestCountResolved(ev).resolved; } catch { return false; } })();
  const hasFood = hasRealCount && !!(plan && (num(plan.foodLow) > 0 || num(plan.foodHigh) > 0));
  const foodEstimate = hasFood ? mid(plan.foodLow, plan.foodHigh) : 0;
  const _fb = hasFood ? foodBoughtFrom(ev, plan) : { total: 0, firm: 0 };
  const foodBought = _fb.total;
  const foodBoughtFirm = _fb.firm;                       // real receipts only
  const foodBoughtEstimated = Math.max(0, foodBought - foodBoughtFirm); // bought but still an estimate

  // SUPPLIES WIRING (2026-07-07, "seating & supplies is not wiring into budget"):
  // the spread's Supplies group and the Seating & supplies (capacity) list are
  // both REAL planned money the host checks off — they now flow into spent/
  // committed exactly like food, from their own single sources (the plan's
  // supplies* fields and playbookCapacity's cost/bought totals). Same real-count
  // gate: a guessed headcount never becomes budget money.
  const suppliesEstimate = hasRealCount && plan ? mid(plan.suppliesLow, plan.suppliesHigh) : 0;
  const suppliesBought = hasRealCount && plan ? mid(plan.suppliesSpentLow, plan.suppliesSpentHigh) : 0;
  let cap = null;
  try { cap = hasRealCount ? playbookCapacity(ev) : null; } catch (_e) { cap = null; }
  const capacityEstimate = cap ? mid(cap.costLow, cap.costHigh) : 0;
  const capacityBought = cap ? mid(cap.boughtLow, cap.boughtHigh) : 0;

  // CRAB-PRICING-1: the host's explicit crab order (event.crabPlan) is real
  // planned money — from THEIR entered prices only, never a market estimate.
  // Bought-marked lines are spent; priced-but-unbought lines are committed.
  // No crabPlan → both terms 0 (byte-identical to before).
  let crabEstimate = 0; let crabBought = 0;
  try {
    if (ev.crabPlan) {
      const crab = buildCrabPlan(ev);
      if (crab && crab.relevant) {
        crabEstimate = num(crab.totalEstimatedCost);
        crabBought = num(crab.boughtCost);
      }
    }
  } catch (_e) { /* honest zero */ }

  // Spent = manual actuals + everything actually bought/checked off.
  const spent = Math.max(0, Math.round(rowsActual + foodBought + suppliesBought + capacityBought + crabBought));
  // Committed adds what's still PLANNED but not yet bought (each term clamped —
  // over-buying an estimate never becomes a credit).
  const foodRemaining = Math.max(0, foodEstimate - foodBought);
  const suppliesRemaining = Math.max(0, suppliesEstimate - suppliesBought);
  const capacityRemaining = Math.max(0, capacityEstimate - capacityBought);
  const crabRemaining = Math.max(0, crabEstimate - crabBought);
  const committed = Math.max(spent, Math.round(spent + foodRemaining + suppliesRemaining + capacityRemaining + crabRemaining));

  // spentEstimated: how much of `spent` is still an estimate (bought-but-unpriced
  // food). Supplies/capacity are midpoint-costed too, so they're estimated until a
  // real number replaces them; food is the part the check-off flow makes granular.
  const spentEstimated = Math.max(0, Math.round(foodBoughtEstimated));
  const spentFirm = Math.max(0, spent - spentEstimated);
  return { total: Math.round(total), spent, spentFirm, spentEstimated, committed, foodEstimate, foodBought, foodBoughtFirm, foodBoughtEstimated, hasFood, suppliesEstimate, suppliesBought, capacityEstimate, capacityBought, hasCapacity: !!(cap && cap.hasCost), crabEstimate, crabBought };
}

export default hostSpending;
