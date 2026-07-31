// ─── THE ONE SELECTED ACTION — canonical identity for the hero zone ───────────
//
// WHY THIS FILE EXISTS (PR #70, driven on Game Night 2026-07-31).
//
// One screen carried three different answers to "what is this card about":
//
//   the ask    "Decide the menu."                                  (title prose)
//   the record "Chips, crackers, pretzels & popcorn — 13 snack
//               servings tomorrow"                                 (the action)
//   the panel  We'll cook it · A caterer handles it · Potluck,
//              with "We'll cook it" already chosen                 (a settled
//                                                                   food decision)
//
// Every one of those was derived independently from queue[0], by a different
// rule, in a different scope. None of them was wrong on its own terms; the
// screen was wrong because nothing made them be about the same thing.
//
// THE RULE THIS FILE ENFORCES: an action is a decision only when it SAYS it is.
// Identity comes from what the action declares — its id namespace or its own
// `decisionId` — never from title prose ("this title contains the word food")
// and never from a ROW POINTER. `route.foodFocus` is the id of an unbought line
// in the shopping list; it says "scroll to this row", not "this is the food
// sourcing decision". Reading it as a decision association is what put a
// completed provider pick under a snack-quantity item.
//
// PURE: no React, no event mutation. The shell injects the resolvers, so the
// identity rules are the same ones the gates run.
import { normalizeAsk, questionFrom } from './askVoice';
import { evidenceFromDecisionRow } from './decisionEvidence';

export const DECISION_SOURCE = { BOARD: 'board', PHASE: 'phase', BLOCKER: 'blocker' };

// A DECLARED decision identity, or null. The whole point is the list of things
// it will NOT look at: titles, categories, domains, route row-pointers.
export function decisionIdentityFor(action) {
  if (!action) return null;
  const id = String(action.id || '');
  if (/^decision:/.test(id)) {
    const rec = id.slice('decision:'.length);
    return rec ? { decisionId: rec, source: DECISION_SOURCE.BOARD } : null;
  }
  if (id === 'phase:food') return { decisionId: 'phase:food', source: DECISION_SOURCE.PHASE };
  if (/^blocker:/.test(id)) return { decisionId: id, source: DECISION_SOURCE.BLOCKER };
  // An action may also carry the association explicitly — the field CommandCenter's
  // _topActionId already treats as the canonical decision record.
  const declared = action.decisionId != null ? action.decisionId
    : (action.route && action.route.decisionId != null ? action.route.decisionId : null);
  const rec = declared == null ? '' : String(declared).trim();
  if (rec) return { decisionId: rec, source: DECISION_SOURCE.BOARD };
  // A BUNDLE is a container, and its subject is its first child — a structural
  // declaration the bundle actually carries. (The old rule read the bundle's
  // TITLE for the word "decision" and then rendered a globally-ranked
  // callsOrdered[0] that the bundle need not even contain.)
  if (action.kind === 'bundle' && Array.isArray(action.items) && action.items.length) {
    return decisionIdentityFor(action.items[0]);
  }
  return null;
}

// Is this NormalizedDecision an ACTIVE question, or an answer the host already gave?
// A settled decision is a record, not an ask — it can never be promoted into the
// hero's one loud slot, and it can never supply the panel for another action.
export function isSettledDecision(nd) {
  return !!(nd && nd.selected != null && Array.isArray(nd.options)
    && nd.options.some(o => o && o.value === nd.selected));
}

// resolveSelection(action, resolvers) → the ONE payload the hero, the panel and
// the CTA all read. Resolvers are injected so this stays pure:
//   decisionND(identity) → NormalizedDecision | null   (the options + settle)
//   boardRow(identity)   → decision board row | null   (authored ask, assurance, status)
//   actionAsk(action)    → string | null               (the wording ladder, identity-free)
export function resolveSelection(action, resolvers = {}) {
  if (!action) return null;
  const { decisionND, boardRow, actionAsk } = resolvers;
  const identity = decisionIdentityFor(action);
  const call = (fn, arg) => { try { return typeof fn === 'function' ? fn(arg) : null; } catch { return null; } };

  const row = identity ? (call(boardRow, identity) || null) : null;
  const ndRaw = identity ? (call(decisionND, identity) || null) : null;
  // A decision with no renderable options has no panel to attach. Identity stands
  // down rather than leaving half a decision on screen.
  const hasOptions = !!(ndRaw && Array.isArray(ndRaw.options) && ndRaw.options.length);
  const settled = hasOptions && isSettledDecision(ndRaw);
  const active = hasOptions && !settled;
  const nd = active ? ndRaw : null;

  // ── IDENTITY FIRST, WORDING SECOND ──────────────────────────────────────────
  // The ladder below may only answer "how should this be phrased". It may never
  // answer "which decision is this" — a title-derived fallback can change the
  // words on screen and must leave decisionId, options and route untouched.
  const fallback = normalizeAsk(call(actionAsk, action));
  const ask = active
    ? (normalizeAsk(row && row.ask) || (row && questionFrom(row.label)) || fallback || 'Your next step.')
    : (fallback || 'Your next step.');

  return {
    actionId: action.id != null ? String(action.id) : null,
    actionType: String(action.category || action.kind || action.domain || 'action'),
    // null whenever there is no active decision — the panel's render gate.
    decisionId: active ? String(ndRaw.id != null ? ndRaw.id : identity.decisionId) : null,
    decisionType: active ? identity.source : null,
    title: action.title != null ? String(action.title) : null,
    ask,
    explanation: active
      ? ((ndRaw.proposed && ndRaw.proposed.why) || ndRaw.why || null)
      : (action.consequence != null ? action.consequence : null),
    options: active ? ndRaw.options : [],
    selectedOption: hasOptions && ndRaw.selected != null ? ndRaw.selected : null,
    // 'none'    — the action declares no decision at all (an execution item)
    // 'settled' — it declares one, and the host already answered it
    // 'open'    — a real, active call to make
    completionState: !identity || !hasOptions ? 'none' : (settled ? 'settled' : 'open'),
    route: action.route || null,
    source: identity ? identity.source : null,
    // ── WHY THIS? (2026-07-31) ──────────────────────────────────────────────
    // The board's evidence envelope, carried to the render boundary. Preference
    // order is deliberate: the ACTION's own envelope first (it survived the
    // registry seam and belongs to this exact recommendation), then one built
    // from the resolved board row when the action has none — a lone
    // `decision:*` hero resolves its row here and nowhere upstream.
    // Null when neither exists, which is the honest answer for an execution
    // item: a shopping line has no decision evidence to show.
    evidence: action.evidence || (row ? evidenceFromDecisionRow(row) : null),
    // The renderable decision, or null. One object, so the panel cannot look
    // anything up for itself.
    decision: nd,
    row,
  };
}
