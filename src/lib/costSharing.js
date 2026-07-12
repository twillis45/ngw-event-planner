// ─── costSharing — DESTINATION-3: how the event's money is contributed ────────
//
// The budget module has always carried ONE implicit funding model: per-guest /
// self-pay (the host budgets, guests cover their own travel). Real multi-family
// celebrations — family reunions, destination milestone birthdays — often run
// on a second, equally legitimate model instead: an ONGOING POOL with
// sliding-scale contributions, in the tradition of susu / sou-sou rotating
// savings and standing family-reunion dues committees. Different tiers carry
// different amounts by capacity ("Working adults $50, Students $20, Elders
// covered"), and the pool exists for a stated reason ("so Grandma can come").
//
// This module makes that second model FIRST-CLASS at the engine level: a data
// shape on the event and one pure reader that summarizes it honestly. Same
// doctrine as crabPlan / travelPlan / vendorPlan — thin domain helper over
// host-entered state; no UI, no storage, no fetching, and NOTHING here is ever
// invented by the app:
//   - amounts appear in the summary only when the host typed them; empty or
//     unpriced tiers produce NO numbers anywhere (no defaults, no averages),
//   - we NEVER total the pool — that would require knowing how many people sit
//     in each tier, which the host hasn't told us,
//   - absent event.costSharing reads as self-pay: today's implicit assumption
//     made explicit, so existing events are byte-identical in meaning.
//
// DATA MODEL (all host-entered, at the event level):
//   event.costSharing = {
//     mode:    'self-pay' | 'pooled-dues',
//     reason:  string,   // why the pool exists, in the host's words
//     cadence: string,   // the host's own rhythm, e.g. 'monthly' or 'per paycheck'
//     tiers:   [{ label, amount, note }],
//       // label  — who this tier is for ("Working adults", "Students")
//       // amount — contribution per cadence; optional (unpriced tier is honest)
//       // note   — the tier's own why ("fixed income", "covered by the pool")
//   }
//
// INTEGRATION NOTE: this reader is deliberately NOT folded into hostSpending()
// — that function derives SPENDING (budget rows + food plan) and dues are
// FUNDING; and with per-tier headcounts unknown, no pool total exists to add.
// Surfaces render costSharingSummary() beside the budget, not inside it.

const str = (v) => (v == null ? null : String(v).trim() || null);

export const COST_SHARING_MODES = ['self-pay', 'pooled-dues'];

export const COST_SHARING_MODE_LABEL = {
  'self-pay': 'Everyone covers their own',
  'pooled-dues': 'Ongoing pool',
};

// Accepts the canonical keys plus obvious spelling variants ('pooled_dues',
// 'Pooled Dues'). Anything unrecognized resolves to self-pay — the safe,
// no-claims default — never to the pooled mode.
export function normalizeCostSharingMode(mode) {
  const m = String(mode || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  return COST_SHARING_MODES.includes(m) ? m : 'self-pay';
}

const fmtMoney = (n) => `$${Math.round(n).toLocaleString()}`;

/**
 * costSharingSummary(event) → {
 *   mode:            'self-pay' | 'pooled-dues',
 *   pooled:          boolean,
 *   reason:          string|null,     // host's words, passed through
 *   cadence:         string|null,     // host's words, passed through
 *   tiers:           [{ label, amount|null, note|null }],  // labeled tiers only
 *   tierCount:       number,
 *   pricedTierCount: number,          // tiers where the host entered an amount
 *   lowestDue:       number|null,     // min of ENTERED amounts (null when none)
 *   highestDue:      number|null,     // max of ENTERED amounts (null when none)
 *   headline:        string,          // honest one-liner; $ only from real entries
 * }
 *
 * Pure and total: any event (or junk input) returns a valid summary. Tiers
 * without a label are dropped (a tier the host can't name isn't a tier yet);
 * amounts must be finite and > 0 to count as entered.
 */
export function costSharingSummary(event) {
  const cs = (event && event.costSharing && typeof event.costSharing === 'object')
    ? event.costSharing : {};
  const mode = normalizeCostSharingMode(cs.mode);
  const pooled = mode === 'pooled-dues';

  const reason = pooled ? str(cs.reason) : null;
  const cadence = pooled ? str(cs.cadence) : null;

  const tiers = pooled
    ? (Array.isArray(cs.tiers) ? cs.tiers : [])
        .filter(Boolean)
        .map((t) => {
          const amt = Number(t.amount);
          return {
            label: str(t.label),
            amount: Number.isFinite(amt) && amt > 0 ? amt : null,
            note: str(t.note),
          };
        })
        .filter((t) => t.label)
    : [];

  const amounts = tiers.map((t) => t.amount).filter((a) => a != null);
  const lowestDue = amounts.length ? Math.min(...amounts) : null;
  const highestDue = amounts.length ? Math.max(...amounts) : null;

  // "One of each group" per-cadence figure — the sum of every tier's entered
  // amount, i.e. exactly ONE contributor from each named tier. This assumes NO
  // headcount (unlike a pool total, which we refuse to compute — see header), so
  // it's honest: "if one person from each group chips in, that's $X per cadence."
  // null until EVERY labeled tier is priced; a missing amount would make the sum
  // silently understate, so it doesn't appear while the setup is incomplete.
  const oneOfEachTotal = (tiers.length > 0 && amounts.length === tiers.length)
    ? amounts.reduce((s, a) => s + a, 0)
    : null;

  // Headline — assembled ONLY from what the host entered. No amounts entered →
  // no dollars in the copy; the missing setup is the load-bearing information.
  let headline;
  if (!pooled) {
    headline = 'Everyone covers their own costs.';
  } else if (tiers.length === 0) {
    headline = 'Ongoing pool — contribution tiers not set yet.';
  } else if (amounts.length === 0) {
    headline = `Ongoing pool — ${tiers.length} contribution tier${tiers.length === 1 ? '' : 's'}, amounts not set yet.`;
  } else {
    const range = lowestDue === highestDue
      ? fmtMoney(lowestDue)
      : `${fmtMoney(lowestDue)}–${fmtMoney(highestDue)}`;
    headline = `Ongoing pool — ${tiers.length} contribution tier${tiers.length === 1 ? '' : 's'}, ${range}${cadence ? ` ${cadence}` : ''}.`;
  }
  if (pooled && reason) headline += ` Why: ${reason}`;

  return {
    mode,
    pooled,
    reason,
    cadence,
    tiers,
    tierCount: tiers.length,
    pricedTierCount: amounts.length,
    lowestDue,
    highestDue,
    oneOfEachTotal,
    headline,
  };
}
