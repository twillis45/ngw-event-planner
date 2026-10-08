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
// Arrived below the export on 2026-10-07 and broke `import/first`, which CRA
// escalates to a BUILD error — main and the Pages deploy were red for three
// commits. Imports stay together, above the first statement.
import { isOwnEvidence } from './knowledge/lodgingBasisLadder';

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
  // 2026-10-06: was "what a TYPICAL event of this kind costs", which claims the
  // band was measured from real events. It was not — PER_HEAD_BY_FAMILY is
  // authored, tier 'estimate', confidence 'low'. Same correction as the budget
  // ask's "Typical" -> "Mid-range": say what the number IS.
  return `This range is a planning band for an event of this kind. Your own plan already calls for vendors that start around ${fmt(floor)} — more than the ${fmt(high)} top of it. Worth setting your number from the vendors, not the range.`;
}

// ─── THE ROOMS ARE ON TOP OF THIS, AND THE HOST HAS THE NUMBER ──────────────
//
// `belowLodgingFloor` has been on the estimate result since 2026-09-22 with
// ZERO UI readers, asserted seven times in test and shown to nobody. This is
// its reader. Two things had to be settled first, and both changed the
// sentence.
//
// 1. THE FLAG'S OWN FRAMING RESTS ON A STRUCK PREMISE. It was written as "the
//    stay alone exceeds everything the estimate allows for". The 2026-10-06
//    board struck the claim that the travel_led band covers lodging, and
//    `TRAVEL_LOGISTICS_NOT_INCLUDED` — shipped, tested, host-facing — names
//    "Lodging beyond the group block" as EXCLUDED. A stay exceeding a
//    party-only band is therefore not a contradiction; the rooms were never
//    in it. So this does not cry contradiction.
//
//    What IS true, and sharper: the headline is not the host's total outlay.
//    The exclusions fold already says lodging is out, as a CATEGORY. The host
//    is simultaneously looking at a real price for it, from their own
//    shortlist, and nothing ever put the two in the same sentence.
//
// 2. IT MINTS NO NEW BAND. Stating "plan on $8,000-$15,000 all in" would be
//    re-authoring a host-facing figure, which `totalEstimate.js` refuses to do
//    for this exact field and for `requiredVendorFloor` beside it. Both
//    numbers are named and the relationship between them is stated; the
//    addition is left to the host, who can do it and whose money it is.
//
// There is deliberately no call to action. The sibling note closes with "worth
// setting your number from the vendors" because those vendors belong IN the
// budget. These rooms do not, so telling the host to raise their party budget
// would be advice the engine's own exclusion list contradicts.
//
// The stay figure is the host's OWN evidence — a price a page showed for a
// place they picked or shortlisted (ladder rungs 1-2). It reaches here through
// `budgetComparableTotal`, which refuses rungs 3 and 4 by construction: a
// regional asking band and a federal per-ROOM ceiling may never speak in a
// whole-event sentence. That guard is the 2026-09-27 board's first finding.

/**
 * One host-voiced line placing the stay beside the party range, or null.
 *
 * @param est   the `estimateTotalRange` result — the comparison is READ from
 *              `belowLodgingFloor`, never re-derived here.
 * @param stay  the lodging basis (ladder rung 1 or 2) for its name and rung.
 */
export function stayOnTopOfTheRangeNote(est, stay) {
  if (!est) return null;
  const floor = Math.round(Number(est.lodgingFloor));
  const high = Math.round(Number(est.highTotal));
  if (!(floor > 0) || !(high > 0)) return null;

  // ── IT REFUSES ON ITS OWN, NOT ON THE CALLER'S GOOD MANNERS ─────────────
  // Found by red-proofing rather than by reasoning: with the ladder's
  // `budgetComparableTotal` guard removed, this function happily rendered
  // "The least expensive place on your shortlist showed $167 for the stay" —
  // where $167 was a rung-3 Inside Airbnb PER-NIGHT asking figure for a host
  // with no shortlist at all. False twice over, in one sentence: not her
  // shortlist, and not a stay.
  //
  // The cause was this function trusting its caller. `rung` fell through to
  // the else branch for ANY value, so 'listings' and 'federal' both claimed
  // "your shortlist". The board's own words for why that is not good enough:
  // by construction rather than by a caller's good manners. So the sentence
  // now requires the host's OWN evidence to exist and say so, and a basis it
  // cannot vouch for gets silence.
  if (!isOwnEvidence(stay)) return null;
  const rung = stay.rung;
  const name = stay.name ? String(stay.name).trim() : '';
  const whose = rung === 'picked'
    ? (name ? `${name}, the place you chose,` : 'The place you chose')
    : (name ? `${name}, the least expensive place on your shortlist,` : 'The least expensive place on your shortlist');
  // THE FLAG'S CLAUSE. This is the one case the stored boolean exists to mark,
  // and it is a different magnitude of fact: the rooms outrun the entire party
  // band on their own.
  const outruns = est.belowLodgingFloor === true
    ? ` On its own that is more than the ${fmt(high)} top of this range.`
    : '';

  // "not the stay" OVERSHOT ITS OWN SOURCE, and a review bench caught it. The
  // shipped exclusion line is "Lodging beyond the group block" — qualified,
  // and it concedes that a group block IS covered. A whole-house shortlist is
  // not a group block, so the conclusion held for this case while the sentence
  // asserted something broader than the constant it leans on. It now mirrors
  // the constant's own wording instead of rounding it off.
  return `The rooms are on top of this. ${whose} showed ${fmt(floor)} for the stay, and this range covers the party — lodging beyond a group block, the flights and travel insurance all sit outside it.${outruns}`;
}
