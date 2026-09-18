// ─── budgetFor — the ONE answer to "is there a budget, and what is it?" ──────
//
// THE LIVE DEFECT THIS WAS BUILT FOR (measured 2026-09-18, money-engine audit).
// SIX readers each decided for themselves whether a budget was set, on three
// different rules, and the shipped demo wedding — budget ROWS totalling $18,900,
// no `totalBudget` field — made all three disagree at once:
//
//   assembleRevealEngines:407  rows sum > 0 OR totalBudget > 0   -> card SHOWN
//   assembleRevealEngines:518  totalBudget only                  -> prints "$0"
//   hostSpending:93            totalBudget > 0 ? it : rows sum   -> $18,900
//   phaseProgress:361          totalBudget only                  -> cue "Set your budget"
//   taskEngine:41              totalBudget > 0 OR any row > 0     -> that task DONE
//   HostShellV2:6332 / :19057  totalBudget only                  -> renders the ASK
//   budgetSwap:19              totalBudget only                  -> ceiling "derived"
//
// What a host actually saw on one screen: the money bar reading "$3,113 of
// $18,900 left", the editor two hundred lines below asking them to set a budget,
// the hero cue saying "Set your budget", the checklist marking that exact task
// done, and the Reveal card announcing "$0 allocated across 6 categories. Budget
// is set and live."
//
// THE READERS WERE NOT ALL WRONG — THEY WERE ANSWERING TWO DIFFERENT QUESTIONS
// and neither had a name, so each site picked one by accident:
//
//   1. "Is there a number to plan against?"  hostSpending, the Reveal, the
//      checklist and the readiness ledger need this. A host who filled in six
//      budget rows HAS a number, whatever field it lives in.
//   2. "Did the host give us an OVERALL figure?"  The budget editor needs this —
//      it is the thing the editor writes — and budgetSwap needs it to know
//      whether the ceiling is FIXED or moves when a row is dropped.
//
// Both are legitimate. This file names them, and names the BASIS so a surface can
// say which fact it is standing on rather than implying one it does not have.
//
// THE RULE for the planning number is hostSpending's, unchanged and now shared:
// an explicit total wins; otherwise the rows' budgeted sum stands in. That is the
// most honest of the three rules already in the tree — it neither ignores real
// rows nor invents a ceiling out of nothing.
//
// PURE: no I/O, no clock, no storage. Same shape as venueFor.js, and for the same
// reason — the venue verdict had eight copies before it got one accessor.

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Everything a surface needs to speak honestly about the budget.
 *
 *   total        the number to plan against, or null when there is none.
 *                NULL, NOT ZERO — "no budget" and "a budget of $0" are
 *                different facts and a reader must be able to tell them apart.
 *   basis        'host-total' | 'rows' | null — WHERE that number came from.
 *   isSet        there is a number to plan against (question 1).
 *   hostSetTotal the host gave an overall figure (question 2).
 *   rowsSum      the budgeted rows' sum, 0 when there are none.
 *   rowCount     how many rows carry a budgeted figure — for copy that counts
 *                categories, so no surface re-walks the array to say "across N".
 */
export function budgetFor(event) {
  const ev = event || {};
  const rows = Array.isArray(ev.budget) ? ev.budget : [];
  const rowsSum = rows.reduce((s, r) => s + num(r && r.budgeted), 0);
  const rowCount = rows.filter((r) => num(r && r.budgeted) > 0).length;
  const hostTotal = num(ev.totalBudget);
  const hostSetTotal = hostTotal > 0;
  const total = hostSetTotal ? hostTotal : (rowsSum > 0 ? rowsSum : null);
  return {
    total,
    basis: hostSetTotal ? 'host-total' : (rowsSum > 0 ? 'rows' : null),
    isSet: total != null,
    hostSetTotal,
    rowsSum,
    rowCount,
  };
}

/** The number to plan against, or null. Never 0-for-missing. */
export const budgetTotal = (event) => budgetFor(event).total;

/** Is there a number to plan against at all? (Question 1.) */
export const budgetIsSet = (event) => budgetFor(event).isSet;

/** Where the number came from: 'host-total' | 'rows' | null. */
export const budgetBasis = (event) => budgetFor(event).basis;

/**
 * Did the host give us an OVERALL figure? (Question 2.)
 *
 * The budget editor's own question — it is what that control writes. A surface
 * asking this must NOT then speak as though no budget exists: when this is false
 * and `isSet` is true, the honest line names the rows.
 */
export const hostSetOverallBudget = (event) => budgetFor(event).hostSetTotal;
