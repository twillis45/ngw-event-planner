// ─── budgetCopy — host-friendly budget hero copy (Slice BUD-1) ────────────────
// PURE strings derived from hostSpending(). The budget card must answer, in
// host language: what am I probably spending, how much room is left, what
// still needs a price, do I need to act. Estimate/system words ("estimated
// total", "variance", "projection") never lead — uncertainty lives in the
// SUPPORT line ("based on known costs", "about", "still unpriced").
//
// TRUTHFUL SEMANTICS (do not weaken):
//   spent      = budget rows' actual + food actually bought → the ONLY thing
//                the copy may call "spent".
//   committed  = spent + still-planned food → "known costs" / "spoken for".
//   Quotes and estimates are NEVER "paid" or "spent".
import { hostSpending } from './hostSpending';

export const NEAR_BUDGET_HEADROOM = 0.15; // <15% left = "getting close"

const fmt = (n) => '$' + Math.round(Math.abs(Number(n) || 0)).toLocaleString();

// Named vendors that still have no price — the "this can change" caveat.
export function unpricedVendorCount(event) {
  return ((event && event.vendors) || []).filter(v =>
    v && String(v.name || '').trim() && !(Number(v.cost) > 0)).length;
}

// Returns { state, title, line, caveat|null, numbers } — plain strings.
// States: unset | waiting | under | near | over
export function budgetHeroCopy(event, priceFactor) {
  const sp = hostSpending(event, priceFactor);
  const { total, spent, committed } = sp;
  const unpriced = unpricedVendorCount(event);
  const caveat = unpriced > 0
    ? `${unpriced} vendor${unpriced === 1 ? ' is' : 's are'} still unpriced, so this can change.`
    : null;

  // 1. No budget set — ask for the ceiling so overspend can be flagged early.
  if (!(total > 0)) {
    return {
      state: 'unset',
      title: 'Set a budget so overspend gets flagged early.',
      line: "Once food and vendors have prices, you'll see what's left.",
      caveat: null, numbers: sp,
    };
  }

  // 2. Budget set, nothing priced yet — waiting on real costs.
  if (committed <= 0) {
    return {
      state: 'waiting',
      title: "Your budget's set — prices still need to come in.",
      line: 'Add costs as vendors quote you so this stays useful.',
      caveat, numbers: sp,
    };
  }

  const delta = committed - total;

  // 5. Over — direct, not alarming; the action is in the line.
  if (delta > 0) {
    return {
      state: 'over',
      title: `Known costs are ${fmt(delta)} over your budget.`,
      line: `${fmt(committed)} spoken for against ${fmt(total)} — review costs before adding more commitments.`,
      caveat, numbers: sp,
    };
  }

  const left = -delta;

  // 4. Getting close — inside the headroom threshold.
  if (left < total * NEAR_BUDGET_HEADROOM) {
    return {
      state: 'near',
      title: "You're getting close to your budget.",
      line: `Known costs leave about ${fmt(left)}${spent > 0 ? ` · ${fmt(spent)} spent so far` : ''}.`,
      caveat, numbers: sp,
    };
  }

  // 3. Comfortably under — the exhale.
  return {
    state: 'under',
    title: `You've got about ${fmt(left)} left.`,
    line: `Based on ${fmt(committed)} in known costs against your ${fmt(total)} budget${spent > 0 ? ` · ${fmt(spent)} spent so far` : ''}.`,
    caveat, numbers: sp,
  };
}

// ─── WHEN THE PLAN'S OWN VENDORS COST MORE THAN THE ESTIMATE ────────────────
//
// `estimateTotalRange` has reported `requiredVendorFloor` and
// `belowRequiredVendors` since 2026-09-19 and NOTHING READ THEM. Measured then:
// Surprise Proposal's own roster requires a photographer and a ring — a $1,750
// floor — under a budget estimate of $100-300. Conference: $47,000 required
// against $20,000 estimated.
//
// THE CALL WAS "REFUSE OR FLOOR", AND IT IS NEITHER (decision 2026-09-23).
//
//   REFUSING the headline costs those hosts the one number they came for, and
//   the estimate is not wrong about what a typical event of that type costs —
//   it is silent about what THIS plan already commits to.
//
//   FLOORING it — raising the headline to the vendor floor — builds a host's
//   primary number out of 224 playbook vendor cost ranges that carry ZERO
//   provenance (moneyProvenance.js#vendor.playbookCostRange, registered at the
//   floor with empty sources). That is laundering an unsourced figure into the
//   most load-bearing position on the screen, which is the exact thing this
//   programme exists to stop.
//
// So the host gets BOTH numbers and is told which is which. That is strictly
// more information than either option, and it is the same answer this codebase
// reaches everywhere else: disclose rather than invent or withhold.
//
// The floor itself is an estimate too, and says so. It is never presented as a
// price — "start around" — because a range's bottom is the only honest reading
// of a band with no sources behind it.

/**
 * One host-voiced line when the estimate does not cover the vendors this plan
 * already requires, or null.
 *
 * Reads the estimate result — never re-derives the comparison, which
 * `totalEstimate` already made and reports as `belowRequiredVendors`.
 */
export function estimateShortfallNote(est) {
  if (!est || est.belowRequiredVendors !== true) return null;
  const floor = Math.round(Number(est.requiredVendorFloor));
  const high = Math.round(Number(est.highTotal));
  if (!(floor > 0) || !(high > 0) || floor <= high) return null;
  return `This range is what a typical event of this kind costs. Your own plan already calls for vendors that start around ${fmt(floor)} — more than the ${fmt(high)} top of it. Worth setting your number from the vendors, not the range.`;
}
