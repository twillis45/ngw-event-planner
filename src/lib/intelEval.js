// INTEL-QA-1 Stage 1 — Intelligence Evaluation (capture only).
//
// Every recommendation any reader makes becomes ONE evaluation record. This module is the pure,
// append-only, immutable-history store for those records. It CAPTURES what was recommended, what the
// default was, what the host decided, and (later) what actually happened — so a FUTURE stage can
// score whether the recommendation beat the default. It does NOT score, calibrate, predict, or feed
// anything back. It changes no reader, no memory, no confidence, no plan.
//
// Design: docs/architecture/INTELLIGENCE_VALIDATION_PLATFORM.md (§3 the object, §4.a the lifecycle).
//
// Honesty: unknown stays unknown. `actual` is write-once from real reconciliation — never estimated,
// never backfilled. `evaluation`/`utility` are reserved-empty until later stages. No PII — records
// hold counts/ratios/grades/because strings only, never a guest datum.

const isObj = (x) => x != null && typeof x === 'object' && !Array.isArray(x);
const num = (x) => (typeof x === 'number' && isFinite(x) ? x : null);

export const EVAL_VERSION = 1;

// The lifecycle is PURE HISTORY — an append-only list of {state, at}. No derived fields.
export const LIFECYCLE_STATES = ['created', 'presented', 'accepted', 'rejected', 'reverted', 'overridden', 'expired', 'evaluated'];

// Decision cost (addition B) — NOT user-facing; lets a later stage separate accuracy on Critical
// decisions from the blended average. Attendance drives food/budget/seating, so it is High.
export const DECISION_COST = { CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

// Reserved utility schema (addition C) — future usefulness signals; null until a later stage fills them.
const emptyUtility = () => ({ unexpected: null, useful: null, savedTime: null, reducedStress: null, avoidedCost: null, avoidedProblem: null });

// Reserved evaluation block — Stage 2 scoring fills this; empty + honest until then.
const emptyEvaluation = () => ({ status: 'pending', baselineBetter: null, delta: null, notes: null, grade: null });

// Stable id — ONE record per (reader, event). Re-showing updates lifecycle, never forks the record.
export const evalId = (readerId, eventId) => `${readerId}:${eventId}`;

// Create the immutable snapshot at show-time. `recommendation` + `baseline` + `counterfactual`
// defaults are frozen here and must never be recomputed from live values later (they must survive
// reader/confidence/grounding changes — that is the whole point).
export function createEvaluation({ eventId, readerId, at, recommendation, baseline, counterfactual, metadata }) {
  const rec = isObj(recommendation) ? recommendation : {};
  const cf = isObj(counterfactual) ? counterfactual : {};
  return {
    id: evalId(readerId, eventId),
    version: EVAL_VERSION,
    eventId, readerId,
    timestamp: at || null,
    metadata: { ...(isObj(metadata) ? metadata : {}) },      // readerVersion/layer/domain/source/decisionCost
    recommendation: { ...rec },                              // frozen: from/to/ratio/because/confidence/stability/gate/observations/applied
    baseline: isObj(baseline) ? { ...baseline } : { value: null, source: 'playbook' }, // today's DEFAULT (not result)
    counterfactual: {                                        // addition A — the four numbers for future comparison
      default: cf.default ?? null,                           // playbook default
      reader: cf.reader ?? null,                             // reader suggestion
      host: cf.host ?? null,                                 // host's decision (set on action)
      actual: null,                                          // observed outcome (reconciliation, write-once)
    },
    lifecycle: [{ state: 'created', at: at || null }],       // append-only pure history
    actual: null,                                            // {value, capturedAt, source} — write ONCE, real only
    evaluation: emptyEvaluation(),                           // reserved (Stage 2)
    utility: emptyUtility(),                                 // reserved (addition C)
  };
}

// Append a lifecycle state (idempotent per state — a state is recorded once, at first occurrence).
// Immutable: returns a NEW record; never rewrites or removes prior history.
export function appendLifecycle(record, state, at) {
  if (!isObj(record)) return record;
  if (!LIFECYCLE_STATES.includes(state)) return record;
  const history = Array.isArray(record.lifecycle) ? record.lifecycle : [];
  if (history.some((h) => h && h.state === state)) return record; // already recorded ⇒ idempotent no-op
  return { ...record, lifecycle: [...history, { state, at: at || null }] };
}

// Record the host's decision value (the number actually in effect) into the counterfactual. Not a
// derived field — it is the recorded decision (reader value if applied, default if reverted, or the
// host's own number if overridden).
export function recordDecision(record, hostValue) {
  if (!isObj(record)) return record;
  return { ...record, counterfactual: { ...record.counterfactual, host: hostValue ?? record.counterfactual?.host ?? null } };
}

// Attach the REAL observed outcome at reconciliation. WRITE-ONCE: if an actual already exists it is
// returned unchanged (never overwrite reality); unknown stays unknown until a real value arrives.
export function attachActual(record, value, at) {
  if (!isObj(record)) return record;
  if (isObj(record.actual)) return record;                 // already set ⇒ immutable
  const v = num(value);
  if (v == null) return record;                            // no real value ⇒ leave unknown, never estimate
  return {
    ...record,
    actual: { value: v, capturedAt: at || null, source: 'reconciliation' },
    counterfactual: { ...record.counterfactual, actual: v },
  };
}

// ── list operations on event.intelEvaluations (append-only, idempotent) ──────────────────────────
// Insert a record if its id isn't present; if present, return the list UNCHANGED (never overwrite the
// frozen snapshot). Returns a new array only when it actually inserts.
export function upsertEvaluation(list, record) {
  const arr = Array.isArray(list) ? list : [];
  if (!isObj(record) || !record.id) return arr;
  if (arr.some((r) => r && r.id === record.id)) return arr;  // idempotent — snapshot already frozen
  return [...arr, record];
}

// Apply a pure transform to the record with `id` (for lifecycle/decision/actual updates). Returns the
// SAME array reference if nothing changed (so callers can skip a no-op persist).
export function updateEvaluation(list, id, fn) {
  const arr = Array.isArray(list) ? list : [];
  const i = arr.findIndex((r) => r && r.id === id);
  if (i < 0) return arr;
  const next = fn(arr[i]);
  if (next === arr[i]) return arr;                          // no-op ⇒ same ref
  const copy = arr.slice();
  copy[i] = next;
  return copy;
}

export const hasEvaluation = (list, id) => (Array.isArray(list) ? list.some((r) => r && r.id === id) : false);

// Observatory counts (deliverable 9) — totals only, NO scoring, NO percentages. `completed` = an
// actual has been attached (evaluable); `pending` = awaiting reconciliation.
export function evaluationStats(events) {
  const evs = Array.isArray(events) ? events : [];
  let total = 0, completed = 0;
  const byReader = {};
  for (const e of evs) {
    const list = (e && Array.isArray(e.intelEvaluations)) ? e.intelEvaluations : [];
    for (const r of list) {
      if (!isObj(r)) continue;
      total += 1;
      const done = isObj(r.actual);
      if (done) completed += 1;
      const rk = r.readerId || 'unknown';
      byReader[rk] = byReader[rk] || { total: 0, completed: 0 };
      byReader[rk].total += 1;
      if (done) byReader[rk].completed += 1;
    }
  }
  return { total, completed, pending: total - completed, byReader };
}
