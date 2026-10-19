// ─── WHAT SHE SAID THAT THE PLAN DOES NOT HOLD ──────────────────────────────
//
// `unusedClauses` already answers "which parts of her sentence did we not
// use?", and answers it well — by differential re-parsing, so it structurally
// cannot claim a fact was missed when it was read. This file does NOT replace
// it, re-implement it, or keep a second list beside it. Sprint 0's instruction
// is explicit: *do not build a parallel dropped-clause system.* It adds the
// two things that mechanism has never had.
//
// ── 1 · THE LIST DID NOT SURVIVE CREATION ──────────────────────────────────
//
// Measured 2026-10-18: `unusedClauses` has exactly ONE render site
// (HostShellV2:9504), inside the creation flow, computed live from the text in
// the box. The text is not stored, so the moment the event is created the list
// is gone for good.
//
// The brief's framing was that a dropped clause "endlessly resurfaces". The
// opposite is true, and it is worse: it is shown ONCE, at the moment the host
// is least able to act on it — she is still typing the thing into existence —
// and then never again. "Worth keeping in mind yourself" is the app's last
// word on the subject.
//
// ── 2 · THERE WAS NO WAY TO ANSWER IT ──────────────────────────────────────
//
// A host who reads "she uses a walker — the plan won't know about it" has
// exactly one option: remember it herself. She cannot tell the app she has
// handled it, and she cannot tell it the clause mattered. There is no
// resolution, so there is nothing for a resolution model to preserve.
//
// ── THE MODEL, AND WHY IT STORES TEXT RATHER THAN CLAUSES ──────────────────
//
// What persists is the SENTENCE (`createdFromText`), not the list derived from
// it. The list is recomputed on every read. That one choice is what keeps this
// from becoming the parallel system:
//
//   · CANONICAL WRITE needs no migration. The day a consumer starts reading
//     "2 excursions", the differential stops reporting it — everywhere, on
//     every existing event, with nothing to backfill. A stored list would have
//     frozen the clause as dropped forever and needed a migration to unfreeze.
//   · ACKNOWLEDGED is one entry in a status map, keyed by the clause, in the
//     same shape `riskStatus` already uses (`surfaceRegistry.js:80`). Not a new
//     idiom.
//   · The two are distinguishable: "the app now understands this" and "I know,
//     I'll handle it myself" are different answers and stay different.
//
// Acknowledgement is deliberately NOT deletion. The clause stays recoverable
// in `clauseStatus`, because a host who dismissed something by accident should
// not have to retype her sentence to get it back.
//
// PURE: no I/O, no UI, no storage. The caller persists.
import { unusedClauses } from './smartParseEvent';

/** The status map's own name, so callers never hand-type the field. */
export const CLAUSE_STATUS_FIELD = 'clauseStatus';

/**
 * A stable key for a clause. Lowercased and stripped of punctuation and
 * spacing so that re-reading the same sentence produces the same key, and a
 * host who acknowledged "she uses a walker" is not re-asked about
 * "She uses a walker." on the next render.
 */
export const clauseKey = (clause) => String(clause || '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Has the host already said she has this one? */
export function clauseIsAcknowledged(event, clause) {
  const map = (event && event[CLAUSE_STATUS_FIELD] && typeof event[CLAUSE_STATUS_FIELD] === 'object')
    ? event[CLAUSE_STATUS_FIELD] : {};
  return map[clauseKey(clause)] === 'acknowledged';
}

/**
 * heardNotUsedFor(event, opts) → the clauses still owed an answer.
 *
 * Recomputed from the stored sentence every time, minus the ones she has
 * answered. Empty — not an error — for any event created before the sentence
 * was kept, which is every event that exists today.
 *
 * `opts.alsoDerives` is passed straight through to `unusedClauses`, and the
 * caller MUST supply the same seam consumers creation used. Omitting them does
 * not break anything; it just restores the false alarms the injection removes
 * (a clause consumed by `heardAccessNeeds` or `heardMustHaves` reads as
 * dropped). Stated here because the failure is silent and looks like data.
 */
export function heardNotUsedFor(event, opts = {}) {
  const text = String((event && event.createdFromText) || '').trim();
  if (!text) return [];
  let dropped = [];
  try { dropped = unusedClauses(text, opts) || []; } catch { return []; }
  return dropped.filter((c) => !clauseIsAcknowledged(event, c));
}

/**
 * The patch that records "I know about this one."
 *
 * Returns a PATCH, not a mutated event — every other write in this engine
 * works that way and the caller owns persistence. Merges rather than replaces,
 * so acknowledging a second clause does not forget the first.
 */
export function acknowledgeClausePatch(event, clause) {
  const key = clauseKey(clause);
  if (!key) return null;
  const prev = (event && event[CLAUSE_STATUS_FIELD] && typeof event[CLAUSE_STATUS_FIELD] === 'object')
    ? event[CLAUSE_STATUS_FIELD] : {};
  return { [CLAUSE_STATUS_FIELD]: { ...prev, [key]: 'acknowledged' } };
}

/** The undo. An accidental dismissal must not cost her the sentence. */
export function unacknowledgeClausePatch(event, clause) {
  const key = clauseKey(clause);
  if (!key) return null;
  const prev = (event && event[CLAUSE_STATUS_FIELD] && typeof event[CLAUSE_STATUS_FIELD] === 'object')
    ? event[CLAUSE_STATUS_FIELD] : {};
  const next = { ...prev };
  delete next[key];
  return { [CLAUSE_STATUS_FIELD]: next };
}
