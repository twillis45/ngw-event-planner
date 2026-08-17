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
//   • vendorOwed   = what is still OWED to committed vendors (lib/vendorMoney). C1:
//                    this file had NO vendor term at all, so the hero could say
//                    "you've got about $39,700 left" with $18,400 owed. Only the
//                    OUTSTANDING balance is folded in — vendor money already paid is
//                    deliberately NOT added to `spent`, because a host who also logs
//                    that payment as a budget row would be charged for it twice.
//                    Outstanding money cannot already be in a row's `actual`.
//   • committed    = spent + the not-yet-bought portion of foodEstimate + vendorOwed
//                    (so the budget reflects PLANNED food and OWED vendor money
//                    before either is paid).
//   • uncommitted  = total - committed. The headroom, derived here so no reader
//                    composes it wrongly. READ THIS BEFORE DOING BUDGET MATH:
//                    foodEstimate / suppliesEstimate / capacityEstimate /
//                    crabEstimate / vendorOwed are all COMPONENTS OF `committed`,
//                    not additions to it — subtracting any of them from `total`
//                    alongside `committed` double-counts. null when no budget is
//                    set (≠ 0); negative when the plan commits past the budget.
//
// Honest bounds: foodBought never exceeds foodEstimate's ceiling concern — it's the
// real checked-off total; committed never dips below spent (the un-bought remainder
// is clamped at ≥ 0).

import { playbookFoodPlan, playbookCapacity, guestCountResolved } from './playbooks';
import { buildCrabPlan } from './crabPlan';
import { vendorOutstanding } from './vendorMoney';
import { lodgingCommitted } from './lodgingIntel';

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

// `itemFactors` (added 2026-08-16) carries the backend's PER-ITEM regional
// factors alongside the basket mean. Optional and additive: every existing
// two-argument caller keeps today's behavior exactly, because an absent map means
// every line takes the mean, which is what they already got.
export function hostSpending(event, priceFactor, itemFactors) {
  const ev = event || {};
  const rows = Array.isArray(ev.budget) ? ev.budget : [];
  const budgetedSum = rows.reduce((s, r) => s + num(r && r.budgeted), 0);
  const rowsActual = rows.reduce((s, r) => s + num(r && r.actual), 0);
  const total = num(ev.totalBudget) > 0 ? num(ev.totalBudget) : budgetedSum;

  // The SAME food plan the food panel renders — single source, no parallel math.
  let plan = null;
  try {
    plan = playbookFoodPlan(ev, {
      priceFactor: num(priceFactor) > 0 ? num(priceFactor) : 1,
      itemFactors: (itemFactors && typeof itemFactors === 'object') ? itemFactors : undefined,
    });
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

  // ── C1 — VENDOR MONEY. The term this file never had. ────────────────────────
  //
  // Until now the string "vendor" did not appear anywhere in this file, and this
  // is the host-facing "budget single source". So the hero could print
  //
  //     ALL SET — you've got about $39,700 left.
  //
  // on an event with ~$18,400 owed to vendors. Perversely, budgetCopy's
  // `unpricedVendorCount` only flags vendors with NO cost — so a precisely-priced
  // vendor contributed nothing here AND suppressed the caveat: the more carefully
  // a host priced their vendors, the more invisible that money became.
  //
  // App.js:2241 has always said every "owed to vendors" figure should route
  // through vendorBalance. The PLANNER views did. No HOST view could — the helpers
  // were trapped inside App.js, unreachable from any lib. They now live in
  // lib/vendorMoney (which also fixes 'Booked'/'Paid' vendors silently dropping
  // out of the ledger entirely).
  //
  // WHAT IS ADDED, AND WHY ONLY THIS:
  // Only the OUTSTANDING balance enters `committed`. Vendor money already PAID is
  // deliberately NOT added to `spent`, because a host who logs that payment as a
  // budget row actual would then be charged for it twice. Outstanding money cannot
  // already be in rowsActual (that is money that has left the account), so this
  // term can never double-count. It is exposed separately as well, so a surface can
  // disclose it instead of silently folding it in.
  const vendorOwed = (() => { try { return Math.max(0, Math.round(vendorOutstanding(ev))); } catch (_e) { return 0; } })();

  // ── THE RENTAL HOUSE (review board 2026-07-28) ─────────────────────────────
  // The board's grep: `lodgingOptions` was read by NOTHING. A host could pick a
  // $6,400 house and the budget stayed at zero while a toast told her "the plan
  // reads it now." A rental is usually the single largest line in a destination
  // event — its absence here was the biggest hole in this function.
  //
  // Same class as vendorOwed: a COMMITMENT, not spend. Only the CHOSEN option,
  // only when it carries a real all-in price (sticker + fees). A chosen house
  // with no price contributes 0 rather than a guess — the shortlist already says
  // out loud when it couldn't weigh a cost, and inventing one here would
  // contradict that to the penny.
  const lodgingCommitted_ = (() => { try { return Math.max(0, lodgingCommitted(ev)); } catch (_e) { return 0; } })();

  // Spent = manual actuals + everything actually bought/checked off.
  const spent = Math.max(0, Math.round(rowsActual + foodBought + suppliesBought + capacityBought + crabBought));
  // Committed adds what's still PLANNED but not yet bought (each term clamped —
  // over-buying an estimate never becomes a credit) — and what is still OWED.
  const foodRemaining = Math.max(0, foodEstimate - foodBought);
  const suppliesRemaining = Math.max(0, suppliesEstimate - suppliesBought);
  const capacityRemaining = Math.max(0, capacityEstimate - capacityBought);
  const crabRemaining = Math.max(0, crabEstimate - crabBought);
  const committed = Math.max(spent, Math.round(spent + foodRemaining + suppliesRemaining + capacityRemaining + crabRemaining + vendorOwed + lodgingCommitted_));

  // spentEstimated: how much of `spent` is still an estimate, NOT a firm number.
  // Food's estimated portion is granular (foodBoughtEstimated). But supplies and
  // capacity bought-money are BOTH midpoint estimates (mid(...Low, ...High) above,
  // and crab is the host's own entered price = firm). Counting supplies/capacity
  // as firm made the hero understate the estimated portion — the Budget honesty
  // doctrine line. They stay estimated until a real number replaces them, so they
  // belong in spentEstimated too. (crabBought stays firm — real entered prices.)
  const spentEstimated = Math.max(0, Math.round(foodBoughtEstimated + suppliesBought + capacityBought));
  const spentFirm = Math.max(0, spent - spentEstimated);
  // committedEstimated — how much of the "spoken for" headline is still a GUESS.
  // Added in the app-wide estimate-honesty pass (2026-07-29, host ruling: "be
  // consistent with information to host so they understand what is an estimate";
  // UX_08: "Never display an estimate without the marker").
  // `committed` is the biggest, boldest number the host reads, and it is a
  // MIXTURE: real money already spent, plus every not-yet-bought term, which are
  // all estimates. It rendered bare in three places, so a plan whose food and
  // supplies are entirely guessed looked exactly as firm as one paid in full.
  // Derived HERE for the same reason `uncommitted` is: a reader holding
  // committed + foodEstimate cannot compose this correctly (foodRemaining is
  // clamped against foodBought), and two readers composing it would drift.
  //   • the estimated part of what's already spent (spentEstimated), PLUS
  //   • every remaining term that is a plan-priced guess.
  // vendorOwed and lodgingCommitted_ are deliberately EXCLUDED: a vendor balance
  // is a contracted figure and a chosen stay is a real listed price. Neither is
  // this app guessing.
  const committedEstimated = Math.max(0, Math.min(
    committed,
    Math.round(spentEstimated + foodRemaining + suppliesRemaining + capacityRemaining + crabRemaining)
  ));
  // `uncommitted` — the headroom, DERIVED HERE so no reader has to compose it.
  //
  // Why this field exists: `committed` ALREADY CONTAINS foodEstimate, suppliesEstimate,
  // capacityEstimate, crabEstimate and vendorOwed (see the header + line ~167). A reader
  // holding both `committed` and `foodEstimate` cannot tell that from the shape alone, so
  // the obvious-looking `total - committed - foodEstimate` double-counts food. That is not
  // hypothetical: the B3 orchestrator did exactly that on a live run (2200 - 1100 - 853 =
  // "$247 of headroom" when the true figure was $1,100) — it understated a host's headroom
  // by the whole food estimate. The component fields are all real and all sourced; the
  // RELATIONSHIP between them was the trap. Deriving it once, here, removes the trap for
  // every reader — and for the tool layer specifically, a number the model must COMPUTE is
  // ungrounded by construction (B1: no number originates in the tool layer or the model).
  //
  // Honest null: with no budget set (`total` 0) there is no headroom to state — null, not 0,
  // because "no budget" and "no room left" are different facts. Can go negative when the
  // plan commits past the budget; that overage is the truth and is NOT clamped.
  const uncommitted = total > 0 ? Math.round(total - committed) : null;
  return { total: Math.round(total), spent, spentFirm, spentEstimated, committed, committedEstimated, uncommitted, vendorOwed, lodgingCommitted: lodgingCommitted_, foodEstimate, foodBought, foodBoughtFirm, foodBoughtEstimated, hasFood, suppliesEstimate, suppliesBought, capacityEstimate, capacityBought, hasCapacity: !!(cap && cap.hasCost), crabEstimate, crabBought };
}

export default hostSpending;
