// ─── HOW A PER-UNIT RATE IS WRITTEN ──────────────────────────────────────────
//
// "$4–$8/lb" is a different KIND of number from "$180" and cannot be formatted
// by the same function. A line total is a sum a host will compare against a
// budget, and whole dollars are right for it. A per-unit rate is the price of
// one small thing — a napkin, a cup, a pound of ice — and most of the corpus's
// rates are under a dollar, where whole dollars destroy the number entirely.
//
// WHAT THIS FIXES. hostv2's food sheet rendered the rate through its generic
// `fmt` (round to whole dollars). Counted across the whole corpus on
// 2026-09-23 — 440 lines carry a per-unit band:
//
//   84   had at least one bound round to $0
//   22   collapsed entirely: ice read "$0–$0/lb", cocktail napkins
//        "$0–$0/napkin" — the sheet told a host the line was free
//  142   had a sub-dollar low bound, so every one of them printed either
//        "$0" or "$1" — a number the plan never authored
//  186   were distorted by more than 5% on at least one bound
//
// The data was never wrong: `playbookFoodPlan` stores these to the cent
// (`Math.round(x * 100) / 100`). Only the display threw the cents away.
//
// WHY IT IS A MODULE, when hostv2 is the only live caller. The rule below is
// not new — the legacy CRA shell worked it out in its own food sheet ("60I"),
// inline at the call site, and hostv2 was built beside it and reached for the
// generic helper instead. That is this programme's recurring defect: a fact
// owned by one accessor and re-derived by the consumer next to it. Written
// inline again here it would be the third copy and the next shell's fourth.
//
// (The CRA copy computes a `perUnit` string that nothing renders — dead since
// before the A1 freeze. It is left where it is: `src/App.js` is a frozen donor
// scheduled for deletion post-Sprint-2, and dead code there is not a security
// or data-loss fix. It is named here so the next reader does not mistake it
// for a second live definition that drifted.)
//
// NOTHING HERE ROUNDS TOWARD A NICER NUMBER. The only transformation is how
// many digits are shown, and a rate too small to survive two decimals is said
// to be too small rather than shown as free.

const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : null);

/**
 * ONE rate, as a host should read it.
 *
 * ≥ $10  whole dollars — the cents are noise next to the magnitude, and this
 *        is where the plan's own bands are authored roundly anyway.
 * < $10  the number as it actually is: an integer stays an integer ("$4", not
 *        "$4.00"), anything else keeps its cents ("$0.20", "$3.75").
 *
 * Returns null for anything that is not a positive rate. A rate of exactly $0
 * is not a cheap line, it is a missing one, and a caller that gets null can say
 * nothing instead of saying "free".
 */
export function perUnitRate(n) {
  const v = num(n);
  if (v === null || v <= 0) return null;
  // Below a cent, two decimals would print "$0.00" — the same lie in a longer
  // form. Say it is under a cent instead.
  if (v < 0.01) return '<$0.01';
  if (v >= 10) return '$' + Math.round(v).toLocaleString('en-US');
  return Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`;
}

/**
 * The band, with its unit: "$0.20–$0.40/lb".
 *
 * A band whose two bounds are equal is written once ("$4/lb") — "$4–$4" reads
 * as a range that happens to be flat rather than as a single known rate.
 *
 * Returns null when either bound is unusable or the unit is missing. The unit
 * is not optional: "$0.20–$0.40" with nothing after it invites a host to read
 * it as the cost of the LINE, which for 30 lb of ice is off by thirty times.
 */
export function perUnitBand(low, high, unitBase) {
  const unit = String(unitBase || '').trim();
  if (!unit) return null;
  const lo = perUnitRate(low);
  if (!lo) return null;
  const h = num(high);
  const hi = h !== null && h > 0 ? perUnitRate(h) : null;
  if (!hi || hi === lo) return `${lo}/${unit}`;
  return `${lo}–${hi}/${unit}`;
}
