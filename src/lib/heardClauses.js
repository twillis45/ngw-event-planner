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
import { heardAccessNeeds } from './accessNeeds';
import { heardMustHaves, heardStayStyle } from './lodgingIntel';

// ── THIS FILE IS THE COMPOSITION ROOT (Sprint 0.5 Decision 2) ──────────────
//
// `unusedClauses` is the differential MECHANISM and a good one. It is not the
// public entry point, because its correctness used to depend on the caller
// remembering a second argument:
//
//   unusedClauses(text, { alsoDerives: [...the three seam readers] })
//
// Forget it and the host is told her sentence was not understood — silently,
// and looking like data, in the one list that exists to be trusted about
// exactly that. Sprint 0 wrote the requirement into a doc comment. A doc
// comment is not enforcement; that is the whole lesson of P0-2, where a
// provenance field was written at every site and read by almost nothing.
//
// So the readers live HERE and are supplied, not requested. There is no second
// argument to forget.
//
// WHY THE ROOT CAN BE THIS FILE, measured not assumed: the guest invite path
// (InviteV2.jsx, inviteShared.js) imports neither this module nor the parser,
// so composing the readers here adds nothing to the chunk a guest downloads —
// the boundary `guestPayloadGate.spec.mjs` protects. And the parser is not made
// to import the planning engine, which Sprint 0.5 forbids: the dependency
// points down from the root, never up into the parser.
//
// NO REGISTRY, DELIBERATELY. A register-on-import registry would move
// correctness from "did you pass the argument" to "was the module loaded
// first" — the same bug in a hat you cannot see.
//
// ADDING A FUTURE SEAM CONSUMER is one line in this array. That is the whole
// extension point, and it is the reason the list is here rather than inlined at
// a call site: a new reader added to the creation seam and not to this list is
// a new false alarm, and this is the one place a reviewer has to look.
const SEAM_READERS = [heardAccessNeeds, heardMustHaves, heardStayStyle];

/**
 * clausesNotUsed(text) → the clauses NOTHING in creation read.
 *
 * The canonical entry point. Takes the host's sentence and nothing else,
 * because everything else is this module's job to know.
 */
export function clausesNotUsed(text) {
  const t = String(text == null ? '' : text).trim();
  if (!t) return [];
  try { return unusedClauses(t, { alsoDerives: SEAM_READERS }) || []; } catch { return []; }
}

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
 * Takes the event and nothing else. The seam readers are this module's to
 * supply — see the composition-root note at the top. Sprint 0 required the
 * caller to pass them and said so in a doc comment here; Sprint 0.5 removed
 * the argument instead, because the failure was silent and looked like data.
 */
export function heardNotUsedFor(event) {
  const text = String((event && event.createdFromText) || '').trim();
  if (!text) return [];
  return clausesNotUsed(text).filter((c) => !clauseIsAcknowledged(event, c));
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
