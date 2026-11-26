// ─── ONE BUDGET QUESTION FOR BOTH SHELLS (owner, 11/26/2026: step 0 of bringing
// v4 into hostv2, "A with T2") ──────────────────────────────────────────────────
//
// hostv2 asked "Set your budget" from the estimator's band (Lean / Mid-range /
// All-out, the plan's own lines, the figure the ask lights); hostv4 asked the
// same question from cited shopping lines only. The same Thanksgiving for 14 got
// $200 / $300 / $400 in one and one choice of about $200 in the other. This is
// the one answer both read. It is hostv2's own composition, moved here unchanged:
//   · the band: estimateTotalRange, with the stay's comparable floor (through
//     the ladder's guard, budgetComparableTotal) when the host has a lodging basis;
//   · the tiers: low, the middle rounded to $100 ("Mid-range", never "Typical":
//     the host's 10/06/2026 ruling), high;
//   · the plan's own lines: hostSpending's expected, at the caller's regional
//     price factor (hostv2 resolves it; a shell without it passes none, neutral);
//   · the lit figure and the words: budgetProposalCta and budgetAskCopy;
//   · what it leaves out: notIncludedFor.
// `choices` is the list a choice screen shows: the tiers in amount order, each
// with its per-head, the lit one marked; when the lit figure is none of them
// (the plan costs more than the middle), it is a choice of its own, "Covers your
// plan", so the screen can offer exactly the figure its sentence names.
// PURE.
import { estimateTotalRange, notIncludedFor } from './budgetEstimator';
import { moneyDisclosure } from './budgetEstimator/moneyProvenance';
import { budgetAskCopy, budgetProposalCta } from './budgetCopy';
import { hostSpending } from './hostSpending';
import { timeOfDayFor } from './knownFacts';
import { spanNights } from './dates';
import { lodgingBasisFor, budgetComparableTotal } from './knowledge/lodgingBasisLadder';
import { perHeadRange, perHeadText } from './perHead';
import { formatCurrency } from './currency';
import { guestCountFor } from './guestCountFor';

/** The head count the budget is sized for: the canonical reader, the same order hostv2's guestNumber uses (locked, estimate, roster). */
export const budgetGuests = (e) => guestCountFor(e).count || 0;

const LABELS = { low: 'Lean', mid: 'Mid‑range', high: 'All-out' };

/**
 * @param {object} event
 * @param {{priceFactor?: number, itemFactors?: object}} [prices] the regional factors hostv2 resolves
 * @returns {null | { guests, est, mustMark, low, typical, high, expected, cta, ask, tiers, choices, notIncluded, stayFloor }}
 */
export function budgetChoices(event, prices) {
  const ev = event || {};
  const guests = budgetGuests(ev);
  let stayFloor = null;
  try { stayFloor = budgetComparableTotal(lodgingBasisFor(ev), spanNights(ev)); } catch (_e) { stayFloor = null; }
  let est = null;
  try {
    est = estimateTotalRange({ type: ev.type, guestCount: guests, date: ev.date, timeOfDay: timeOfDayFor(ev), isDestination: !!ev.isDestination, nights: spanNights(ev), lodgingFloor: stayFloor });
  } catch (_e) { est = null; }
  if (!est || !(est.highTotal > 0)) return null;
  let disclosure = null;
  try { disclosure = est.provenanceKeys ? moneyDisclosure(est.provenanceKeys) : null; } catch (_e) { disclosure = null; }
  const mustMark = !!(disclosure && disclosure.mustMark);
  const low = est.lowTotal;
  const high = est.highTotal;
  const typical = Math.round(((low + high) / 2) / 100) * 100;
  const p = prices || {};
  let expected = null;
  try { expected = hostSpending(ev, p.priceFactor == null ? 1 : p.priceFactor, p.itemFactors || {}).expected; } catch (_e) { expected = null; }
  const cta = budgetProposalCta(expected, typical);
  const ask = budgetAskCopy({ expected, typical, guests, type: ev.type, mustMark });
  const per = (n) => (guests > 0 ? perHeadText(perHeadRange(n, n, guests), formatCurrency) : '');
  const seen = new Set();
  const tiers = [['low', low], ['mid', typical], ['high', high]]
    .filter(([, n]) => n > 0 && !seen.has(n) && seen.add(n))
    .map(([key, amount]) => ({ key, label: LABELS[key], amount, perHead: per(amount) }));
  const choices = tiers.some((t) => t.amount === cta.lit) ? tiers.slice() : [...tiers, { key: 'covers', label: 'Covers your plan', amount: cta.lit, perHead: per(cta.lit) }];
  choices.sort((a, b) => a.amount - b.amount);
  choices.forEach((c) => { c.lit = c.amount === cta.lit; });
  let notIncluded = [];
  try { notIncluded = notIncludedFor(ev.type, { isDestination: !!ev.isDestination }) || []; } catch (_e) { notIncluded = []; }
  return { guests, est, mustMark, low, typical, high, expected, cta, ask, tiers, choices, notIncluded, stayFloor };
}
