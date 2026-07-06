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
