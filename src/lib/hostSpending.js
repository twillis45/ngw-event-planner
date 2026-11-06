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
// desired (`total`) is the host's budget. `expected` is a forecast, resolved per
// category: contract, else host allocation, else NGW estimate. `committed` counts
// contracts and purchases, not allocations or unbought estimates. `spent` reads
// vendor payments for contracted categories and manual actuals elsewhere.
// `categories` exposes that ownership; differing manual/vendor payments are
// disclosed in `moneyDiscrepancies`, never silently added or reconciled.

import { budgetTotal } from './budgetFor';
import { roundCurrency } from './currency';
import { guestCountIsConfirmed } from './guestCountFor';
import { playbookFoodPlan, playbookCapacity } from './playbooks';
import { buildCrabPlan } from './crabPlan';
import { vendorOutstanding, moneyCategories } from './vendorMoney';
import { lodgingCommitted } from './lodgingIntel';
import { foodSpanNote } from './foodSpan';

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
  return { total: Math.max(0, roundCurrency(total)), firm: Math.max(0, roundCurrency(firm)) };
}

// `itemFactors` (added 2026-08-16) carries the backend's PER-ITEM regional
// factors alongside the basket mean. Optional and additive: every existing
// two-argument caller keeps today's behavior exactly, because an absent map means
// every line takes the mean, which is what they already got.
export function hostSpending(event, priceFactor, itemFactors) {
  const ev = event || {};

  // THE RULE MOVED OUT, NOT AWAY (2026-09-18). This line carried the most honest
  // of three rules in the tree for "what is the budget", and five other readers
  // had each picked a different one — see lib/budgetFor.js for the measured
  // damage. It lives there now, named, and this file reads it like everyone
  // else. Byte-identical: budgetFor returns null where this returned 0, and
  // `total` has always been a number here.
  const total = num(budgetTotal(ev));

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
  //
  // ── AND "REAL" MEANS THE HOST'S, NOT MERELY PRESENT (2026-10-18, P0-2) ────
  // This gate asked whether a number EXISTS. The creation seam writes one even
  // when the host gave none — a playbook typical, recorded as
  // `guestCountSource: 'playbook-typical'` (HostShellV2:8155). So an event the
  // host never put a headcount on still carried `guestEstimate: 40`, sailed
  // through `num(ev.guestEstimate) > 0`, and turned the app's own guess into
  // budget money — the precise thing the paragraph above forbids.
  //
  // `guestCountIsConfirmed` is the existing twin of `startTimeIsConfirmed` and
  // is the repo's answer to this question; it was simply never adopted here. A
  // locked `guestCount` and a hand-entered roster both resolve to the host by
  // construction, so neither is affected — only the substituted estimate is.
  // The `guestCountResolved(ev).resolved` branch that used to be OR'd in here
  // is GONE, deliberately. It answers a different question — "are the RSVPs
  // settled?" — and resolves an estimate-only event to true (playbooks:566,
  // "we won't block a host who already gave a number"), so it routed straight
  // around this gate. Everything it legitimately admitted is already admitted:
  // a locked `guestCount` and a hand-entered roster are both the host by
  // construction inside `guestCountFor`, and it cannot be true when no count
  // exists at all (playbooks:551 returns resolved:false for n <= 0).
  //
  // CONSERVATIVE FOR LEGACY, BY DESIGN: `fromHost` is false only when the
  // source was explicitly recorded as 'playbook-typical'. An older event with
  // no provenance recorded still counts as the host's, so this withholds money
  // only where we KNOW the number is ours.
  const hasRealCount = guestCountIsConfirmed(ev);
  // ── THE BUDGET FOLLOWS THE LIST (2026-09-22) ──────────────────────────────
  // `foodSpanNote` withholds the shopping list entirely when it KNOWS there is
  // no kitchen — a room block, a hotel — and the food sheet has honoured that
  // since the kitchen gate landed. This file did not. Measured on the Santa Fe
  // 80th (10 guests, Jun 17-21, room block answered): foodEstimate $280 and
  // suppliesEstimate $53 were identical whether the host had a whole house or a
  // hotel room, so the budget carried $333 of groceries for a kitchen the app
  // itself had just finished saying does not exist. Every OTHER item change the
  // host makes already flows through here correctly — measured: skipping a food
  // line moves $280 -> $105, skipping a supply $53 -> $48, locking a price
  // $280 -> $115 — so the withheld list was the one thing the budget could not
  // see.
  //
  // WHAT IS NOT DONE HERE, DELIBERATELY: no restaurant figure replaces it.
  // People still eat on a hotel trip, and it very likely costs MORE than the
  // groceries being removed — but all 226 cost citations in the corpus price
  // GROCERY lines, and a restaurant band for these ten people is a number
  // nobody researched. Inventing one, or quietly leaving the grocery one in
  // place and calling it "food", are the same error wearing different clothes.
  //
  // So the term is withdrawn AND the hole is REPORTED rather than papered over
  // — `foodUnpriced` below. That matters more than usual here: dropping $333
  // makes `uncommitted` LARGER, and a host reading more headroom than they have
  // is worse off than one reading the wrong basis. The flag is what lets the
  // surface say so. Same "report, don't resolve" contract as
  // `belowRequiredVendors` and `belowLodgingFloor` in totalEstimate.js.
  const foodSpan = (() => { try { return foodSpanNote(ev); } catch (_e) { return null; } })();
  const foodListApplies = foodSpan ? foodSpan.listApplies : null;   // true | false | null
  const listWithheld = foodListApplies === false;

  const hasFood = hasRealCount && !listWithheld && !!(plan && (num(plan.foodLow) > 0 || num(plan.foodHigh) > 0));
  const foodEstimate = hasFood ? mid(plan.foodLow, plan.foodHigh) : 0;
  // Money the host ALREADY checked off is real money and survives the gate —
  // answering "room block" after a shop does not un-buy the shopping. Only the
  // forward-looking estimate is withdrawn.
  const _fb = (hasRealCount && plan) ? foodBoughtFrom(ev, plan) : { total: 0, firm: 0 };
  const foodBought = _fb.total;
  const foodBoughtFirm = _fb.firm;                       // real receipts only
  const foodBoughtEstimated = Math.max(0, foodBought - foodBoughtFirm); // bought but still an estimate

  // SUPPLIES WIRING (2026-07-07, "seating & supplies is not wiring into budget"):
  // the spread's Supplies group and the Seating & supplies (capacity) list are
  // both REAL planned money the host checks off — they now flow into spent/
  // committed exactly like food, from their own single sources (the plan's
  // supplies* fields and playbookCapacity's cost/bought totals). Same real-count
  // gate: a guessed headcount never becomes budget money.
  // Supplies ride the SAME gate, because they ride the same list: the withheld
  // sheet takes the Supplies group down with Food and Drinks (driven: all three
  // section headers are gone). Budgeting for plates the host cannot see or check
  // off is the defect this whole change is about. If supplies should one day
  // survive a no-kitchen stay, that is a change to the GATE — and the budget
  // follows it from here for free, which is the point of reading one accessor.
  const suppliesEstimate = hasRealCount && plan && !listWithheld ? mid(plan.suppliesLow, plan.suppliesHigh) : 0;

  // ── THE EIGHTH TERM, AND THE ONLY ONE THAT IS NOT PART OF `committed` ──────
  //
  // Optional spend: what the playbook prices and the shopping list deliberately
  // leaves off — centerpiece flowers, balloons and a banner, party favors,
  // candles. Measured 2026-09-26 across 45 playbooks at 40 guests: 98 lines,
  // $3,280, invisible to every one of this file's seven terms. A host who buys
  // it has spent money the number they plan against never heard of.
  //
  // IT IS NOT ADDED TO `committed`, AND THAT IS THE POINT. Folding it in would
  // tell a host they have committed to party favors they may never buy — the
  // same invention this file's neighbours spent a day removing. A review board
  // ruled it a reported figure with its own row, never a component of the
  // headline and never in the hero, and that is what this is: `committed`,
  // `spent`, `committedEstimated` and `uncommitted` are all byte-identical with
  // this field present.
  //
  // Priced and gated inside playbookFoodPlan beside the essential rows it sits
  // next to (one formula, one set of decision/region gates), so this file adds
  // no math of its own — it carries the number the list already knows.
  const optionalLow = plan && !listWithheld ? Math.max(0, num(plan.optionalLow)) : 0;
  const optionalHigh = plan && !listWithheld ? Math.max(0, num(plan.optionalHigh)) : 0;
  const optionalEstimate = mid(optionalLow, optionalHigh);
  const optionalLines = plan && !listWithheld ? Math.max(0, num(plan.optionalLines)) : 0;
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

  // Outstanding vendor balances are disclosed, not added over category totals.
  const vendorOwed = (() => { try { return Math.max(0, roundCurrency(vendorOutstanding(ev))); } catch (_e) { return 0; } })();

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

  // C1: source precedence is per category, not an addition of overlapping totals.
  // Vendor payments own contract categories; contradictory manual records remain visible.
  const drinkPlan = plan ? { list: (plan.list || []).filter(i => i.cat === 'beverage') } : null;
  const drinks = hasFood && drinkPlan ? Math.min(foodEstimate, drinkPlan.list.filter(i => !i.skipped)
    .reduce((s, i) => s + (i.locked != null ? num(i.locked) : mid(i.low, i.high)), 0)) : 0;
  const drinkBought = hasRealCount ? foodBoughtFrom(ev, drinkPlan) : { total: 0, firm: 0 };
  const categories = moneyCategories(ev, [
    { label: 'Catering', expected: foodEstimate - drinks, spent: foodBought - drinkBought.total, spentEstimated: foodBoughtEstimated - (drinkBought.total - drinkBought.firm) },
    { label: 'Bar / Beverage', expected: drinks, spent: drinkBought.total, spentEstimated: drinkBought.total - drinkBought.firm },
    { label: 'Supplies', expected: suppliesEstimate, spent: suppliesBought, spentEstimated: suppliesBought },
    { label: 'Rentals', expected: capacityEstimate, spent: capacityBought, spentEstimated: capacityBought },
    { label: 'Crab order', expected: crabEstimate, spent: crabBought },
    { label: 'Lodging', expected: lodgingCommitted_, spent: 0 },
  ]).filter(c => c.expected > 0 || c.spent > 0);
  // A chosen, priced stay is a commitment, unlike a generated shopping estimate.
  categories.forEach(c => { if (['Lodging', 'Crab order'].includes(c.label) && c.source === 'estimate') c.committed = c.expected; });
  const sum = key => roundCurrency(categories.reduce((s, c) => s + num(c[key]), 0));
  const spent = sum('spent');
  const committed = sum('committed');
  const expected = sum('expected');
  const spentEstimated = sum('spentEstimated');
  const spentFirm = Math.max(0, roundCurrency(spent - spentEstimated));
  const committedEstimated = spentEstimated;
  const moneyDiscrepancies = categories.filter(c => c.discrepancy);
  // Headroom against actual commitments, not a forecast of the final bill.
  const uncommitted = total > 0 ? roundCurrency(total - committed) : null;

  // ── ONE HEADLINE NUMBER, TWO PRICE BASES (measured 2026-09-18) ────────────
  // `committed` sums components priced on DIFFERENT bases and said nothing
  // about it. Measured on a 150-guest Cookout across regional factors
  // 0.90 / 1.00 / 1.12:
  //
  //     foodEstimate      5080 -> 5648 -> 6323     moves
  //     suppliesEstimate   808 ->  898 -> 1003     moves
  //     capacityEstimate  1453 -> 1453 -> 1453     FLAT
  //
  // Capacity is 18.2% of `committed` on that event, priced at national
  // baseline while the food beside it is priced regionally.
  //
  // THE FIX IS NOT TO MULTIPLY CAPACITY BY THE SAME FACTOR. That factor is a
  // BLS Average Price food-commodity basket (backend/app/routers/food_prices.py
  // fetches a grocery basket and takes the mean of per-item regional ratios).
  // Chair, table and glassware rentals are not groceries; a grocery CPI ratio
  // does not predict rental pricing, and applying it would be inventing a
  // relationship nobody measured — which is the exact failure this file's
  // neighbours spent the day removing.
  //
  // What was actually missing is the DISCLOSURE. A surface can now say which
  // parts of the number are regional and which are national, instead of
  // presenting a mixed figure as uniformly priced. `vendorEstimator`'s
  // METRO_MARKETS is a services index and is the right basis for durables if
  // this is ever genuinely adjusted — noted rather than guessed at here.
  const pf = num(priceFactor) > 0 ? num(priceFactor) : 1;
  const nationalAtPlay = [capacityEstimate, vendorOwed, lodgingCommitted_, crabEstimate]
    .some((n) => num(n) > 0);
  const priceBasis = {
    factor: pf,
    // Priced through the regional food factor.
    adjusted: ['food', 'supplies'],
    // Priced at national baseline, or host-entered and therefore not ours to adjust.
    nationalBaseline: ['capacity', 'vendorOwed', 'lodging', 'crab'],
    // True only when the mixing is actually VISIBLE: a factor that is 1 mixes
    // nothing, and a component worth $0 cannot skew a total.
    mixed: pf !== 1 && nationalAtPlay,
  };

  // REPORTED, NOT RESOLVED. `foodUnpriced` is true only when there is a real
  // food cost this budget is deliberately NOT estimating: the host has a
  // countable guest list and a plan that WOULD have priced food, and the
  // no-kitchen gate withdrew it. It is false when the list applies (the estimate
  // is there), and false when there was never a food figure to withdraw — a
  // surface must be able to tell "we declined to price this" apart from
  // "nothing here to price", because only the first one owes the host a sentence.
  const foodUnpriced = listWithheld && hasRealCount
    && !!(plan && (num(plan.foodLow) > 0 || num(plan.foodHigh) > 0));

  return { expected, categories, moneyDiscrepancies, optionalLow, optionalHigh, optionalEstimate, optionalLines, priceBasis, total: roundCurrency(total), spent, spentFirm, spentEstimated, committed, committedEstimated, uncommitted, vendorOwed, lodgingCommitted: lodgingCommitted_, foodEstimate, foodBought, foodBoughtFirm, foodBoughtEstimated, hasFood, foodListApplies, foodUnpriced, suppliesEstimate, suppliesBought, capacityEstimate, capacityBought, hasCapacity: !!(cap && cap.hasCost), crabEstimate, crabBought };
}

export default hostSpending;
