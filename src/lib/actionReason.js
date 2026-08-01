// ─── REASONING CONTINUITY v1 — the one place an action's "why" is decided ─────
//
// THE PROBLEM (DOM-verified 2026-07-31). The hero explains itself: a decision hero
// carries the evidence envelope (`data-why`, `data-confidence`), an execution hero
// carries a `.because` line. Every row BELOW it renders:
//
//   <button class="ef-row"><span class="t">Set your budget</span>
//     <span class="ef-r"><span class="ef-g">→</span></span></button>
//
// Title and arrow. Nothing else. Yet `a.consequence`, `a.dueInDays`, `a.gateHolder`
// and `a.unlocks` are all in scope at that line and none are read. The reasoning
// does not disappear — it is simply never asked for.
//
// WHAT THIS IS NOT. Not a generator. There is no model in this path and no string
// is invented. Every reason is a projection of a field an engine or a playbook
// already authored. When nothing is populated the answer is null and the row stays
// bare — which is the honest default and, deliberately, makes the PRESENCE of a
// reason meaningful.
//
// PURE: no React, no I/O, no event mutation.
import { isSolemnEvent } from './solemn';

// Ordered by what a host has most at stake. First match wins and the ladder stops —
// one row never carries two reasons.
export const REASON_PRIORITY = ['blocking', 'money', 'time', 'risk', 'consequence', 'dependency'];

export const MAX_REASON_CHARS = 40;

// Confidence is about the SIGNAL, not about the event's outcome:
//   authored — a human wrote this text (consequence, ifDelayed)
//   derived  — computed from a real field (unlocks, daysLeft)
// Nothing here is ever 'grounded'; that word belongs to cited research and this
// module cites nothing.
const AUTHORED = 'authored';
const DERIVED = 'derived';

// Words that carry no information on their own. A reason made only of these adds
// nothing to a title and is dropped.
const tokens = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const STOP = new Set(['the', 'a', 'an', 'your', 'you', 'and', 'or', 'to', 'of', 'for', 'in', 'on', 'it', 'is', 'this', 'that']);

// Does the candidate say anything the title does not? Same doctrine as heroRecord's
// dedup — structural token overlap, never a hand-maintained phrase list.
function addsBeyondTitle(text, title) {
  const t = new Set(tokens(title));
  return tokens(text).some((w) => w.length > 2 && !STOP.has(w) && !t.has(w));
}

// ── BACKWARD-LOOKING TIME LANGUAGE ───────────────────────────────────────────
// The board's own `because` field is a FILING line — "Was due 14 days ago." — and
// it arrives on the action as `consequence`. Suppressing only the `time` branch on
// a solemn event was not enough: this text walked straight through the consequence
// branch and put "Was due 1 day ago" on a repast row (caught in the live DOM,
// 2026-07-31, not by any unit test). On a repast nobody was late; somebody died.
// The standing ruling is that backward-looking blame never renders on a solemn
// event, whatever field carries it.
const BACKWARD_RE = /\bwas due\b|\bpast (its|their) (easy )?window\b|\boverdue\b|\bdays? ago\b|\bmonths? ago\b|\bbehind\b|\blate\b/i;

// Trim to the cap. A truncated clause that cannot stand alone is WORSE than
// nothing — "With your headcount in" is not a reason, it is a fragment. So this
// no longer salvages a mid-thought cut: text only survives if it already fits, or
// if a real clause boundary yields something self-contained. Otherwise: null.
function fit(text) {
  const s = String(text || '').trim().replace(/\s+/g, ' ').replace(/[.,;:]+$/, '');
  if (!s) return null;
  if (s.length <= MAX_REASON_CHARS) return s;
  // A clause boundary inside the cap can stand alone only if it ends a real
  // thought. Two boundary kinds, both idiomatic in this codebase's voice:
  //   em/en dash — "Who's coming is the first domino — it sizes the budget..."
  //   comma/semicolon/colon — "Popular dates go first, so this one moves fast."
  // The head must NOT open with a subordinator ("With your headcount in, ..."),
  // because that fragment is dependent and reads as a cut-off thought — which is
  // exactly what shipped to the live DOM before this rule existed.
  const m = s.slice(0, MAX_REASON_CHARS + 1).match(/^(.*?)\s*[—–,;:]\s/);
  if (m) {
    const head = m[1].trim().replace(/[.,;:]+$/, '');
    // Two families of dependent opener, both caught live before this rule:
    //   subordinators — "With your headcount in, ..."   (fragment)
    //   interrogatives — "How you're feeding everyone — ..."  (noun phrase, no
    //     main verb; reads as a cut-off thought on the row)
    // `who` is deliberately NOT banned: "Who's coming is the first domino" is a
    // complete clause. The bias is toward silence — a bare row beats a fragment.
    const dependent = /^(with|when|while|after|before|once|since|if|until|as|because|though|although)\b/i.test(head)
      || /^(how|what|where|why|whether|which)\b/i.test(head);
    if (head.length >= 16 && !dependent) return head;
  }
  return null;   // no honest short form -> the row stays bare
}

const plural = (n, one, many) => `${n} ${Math.abs(n) === 1 ? one : many}`;

/**
 * getActionReason(action, opts) -> { type, text, source, confidence } | null
 *
 * opts:
 *   event        — for solemn suppression
 *   moneyRows    — moneyDatesFor(event).rows, matched by key/vendorId when present
 *
 * Returns null when no authored or derived signal exists. Null is a valid,
 * expected answer and the caller must render nothing.
 */
export function getActionReason(action, opts = {}) {
  if (!action) return null;
  const { event = null, moneyRows = null } = opts;
  const title = String(action.title || '');
  const solemn = (() => { try { return event ? isSolemnEvent(event) : false; } catch { return false; } })();

  const emit = (type, raw, source, confidence) => {
    // SOLEMN SUPPRESSION IS FIELD-BLIND (2026-07-31). It is applied HERE, at the
    // single exit, rather than per-branch — because the branch guard was not
    // enough: the board's `because` ("Was due 1 day ago.") arrives as
    // `consequence` and rendered on a repast row in the live DOM. Whatever field
    // carries backward-looking blame, it does not reach a solemn event.
    if (solemn && BACKWARD_RE.test(String(raw || ''))) return null;
    const text = fit(raw);
    if (!text) return null;
    if (!addsBeyondTitle(text, title)) return null;   // never restate the title
    return { type, text, source, confidence };
  };

  // 1 — BLOCKING. The strongest thing NGW can say: finishing this frees other work.
  if (action.gateHolder === true) {
    const n = Number.isFinite(action.unlocks) ? action.unlocks : 0;
    const r = emit('blocking', n > 0 ? `unblocks ${plural(n, 'more step', 'more steps')}` : 'other steps wait on this', 'gateHolder', DERIVED);
    if (r) return r;
  } else if (Number.isFinite(action.unlocks) && action.unlocks > 0) {
    const r = emit('blocking', `${plural(action.unlocks, 'step waits', 'steps wait')} on this`, 'unlocks', DERIVED);
    if (r) return r;
  }

  // 2 — MONEY. Only from a real dated obligation; never from an estimate.
  if (Array.isArray(moneyRows) && moneyRows.length) {
    const key = action.route && (action.route.moneyKey || action.route.vendorId);
    const row = moneyRows.find((m) => m && !m.passed && (m.key === key || (key && m.vendorId === key)));
    if (row && Number.isFinite(row.daysLeft)) {
      const r = emit('money', row.daysLeft <= 0 ? 'payment due now' : `payment due in ${plural(row.daysLeft, 'day', 'days')}`, 'moneyDates', DERIVED);
      if (r) return r;
    }
  }

  // 3 — TIME. Suppressed on a solemn event: "past its window" is shame grammar
  // measured from a deadline the family never agreed to (standing board ruling).
  if (!solemn && Number.isFinite(action.dueInDays)) {
    const d = action.dueInDays;
    let raw = null;
    if (d < 0) raw = 'past its window';
    else if (d === 0) raw = 'due today';
    else if (d === 1) raw = 'due tomorrow';
    else if (d <= 7) raw = `due in ${plural(d, 'day', 'days')}`;
    if (raw) { const r = emit('time', raw, 'dueInDays', DERIVED); if (r) return r; }
  }

  // 4 — RISK. `risk.ifDelayed` is authored on 278 playbook blocks and, as of
  // 2026-07-31, reaches NO action object — verified by exit-code-checked grep across
  // CommandCenter, surfaceRegistry, playbooks/index and phaseProgress. This branch is
  // therefore a CONSUMER WAITING FOR ITS PRODUCER. It is written now so that carrying
  // the field later is a one-line engine change with nothing to add here; it returns
  // null until then, and the coverage report names it as an unrealised source rather
  // than letting it look supported.
  const ifDelayed = action.ifDelayed || (action.risk && action.risk.ifDelayed) || null;
  if (ifDelayed) { const r = emit('risk', ifDelayed, 'risk.ifDelayed', AUTHORED); if (r) return r; }

  // 5 — CONSEQUENCE. The authored "because" the hero already shows. First clause only.
  if (action.consequence) {
    const first = (String(action.consequence).match(/^[^.!?]{8,}?[.!?]/) || [String(action.consequence)])[0];
    const r = emit('consequence', first, 'consequence', AUTHORED);
    if (r) return r;
  }

  // 6 — DEPENDENCY. Same status as risk: 383 authored `dependsOn` edges in the
  // playbooks, none carried to an action today. Consumer written, producer pending.
  const deps = Array.isArray(action.dependsOn) ? action.dependsOn.filter(Boolean) : [];
  if (deps.length) {
    const r = emit('dependency', deps.length === 1 ? 'waits on one earlier step' : `waits on ${deps.length} earlier steps`, 'dependsOn', DERIVED);
    if (r) return r;
  }

  return null;
}

/**
 * reasonCoverage(actions, opts) -> a report, not a score.
 * Names WHICH sources fired and which produced nothing, so a low number is
 * actionable instead of merely discouraging.
 */
export function reasonCoverage(actions, opts = {}) {
  const list = Array.isArray(actions) ? actions.filter(Boolean) : [];
  const byType = {}; const bySource = {}; const missing = [];
  let withReason = 0;
  for (const a of list) {
    const r = getActionReason(a, opts);
    if (r) {
      withReason += 1;
      byType[r.type] = (byType[r.type] || 0) + 1;
      bySource[r.source] = (bySource[r.source] || 0) + 1;
    } else {
      missing.push({
        id: a.id != null ? String(a.id) : null,
        title: a.title != null ? String(a.title) : null,
        // Why nothing fired — the actionable half of the report.
        hasConsequence: !!a.consequence,
        hasDueInDays: Number.isFinite(a.dueInDays),
        hasGateHolder: a.gateHolder === true,
        hasIfDelayed: !!(a.ifDelayed || (a.risk && a.risk.ifDelayed)),
        hasDependsOn: Array.isArray(a.dependsOn) && a.dependsOn.length > 0,
      });
    }
  }
  return {
    analyzed: list.length,
    withReason,
    coveragePct: list.length ? Math.round((withReason / list.length) * 100) : 0,
    byType, bySource,
    missing,
    // A source is "unrealised" when no action carried its field at all.
    unrealisedSources: ['risk.ifDelayed', 'dependsOn'].filter((s) => !bySource[s]),
  };
}
