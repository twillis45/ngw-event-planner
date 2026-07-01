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

// ── Stage 1A: admin audit (visibility only — NO scoring, NO grades, NO calibration) ─────────────
const CANON_ORDER = Object.fromEntries(LIFECYCLE_STATES.map((s, i) => [s, i]));

// Validate ONE record's data integrity. Returns an array of {code, level, message} — empty if clean.
// `eventPassed` lets us flag an accepted recommendation whose event is over but still has no actual.
export function validateEvaluation(record, opts) {
  const o = isObj(opts) ? opts : {};
  const issues = [];
  if (!isObj(record)) return [{ code: 'malformed', level: 'error', message: 'Record is not an object' }];
  if (!record.id) issues.push({ code: 'malformed', level: 'error', message: 'Missing record id' });
  if (record.version !== EVAL_VERSION) issues.push({ code: 'version_unknown', level: 'warn', message: `Record version ${record.version == null ? 'missing' : record.version} (expected ${EVAL_VERSION})` });
  if (!isObj(record.recommendation)) issues.push({ code: 'missing_snapshot', level: 'error', message: 'Missing frozen recommendation snapshot' });
  if (!isObj(record.baseline) || num(record.baseline.value) == null) issues.push({ code: 'missing_baseline', level: 'warn', message: 'Missing baseline (default) value' });
  // lifecycle order — canonical indices must be non-decreasing
  const states = Array.isArray(record.lifecycle) ? record.lifecycle.map((h) => h && h.state) : [];
  let prev = -1, ordered = true;
  for (const s of states) { const i = CANON_ORDER[s]; if (i == null) continue; if (i < prev) { ordered = false; break; } prev = i; }
  if (!ordered) issues.push({ code: 'lifecycle_order', level: 'warn', message: 'Lifecycle transitions are out of canonical order' });
  // actual integrity
  if (record.actual != null && (!isObj(record.actual) || num(record.actual.value) == null)) issues.push({ code: 'actual_malformed', level: 'error', message: 'Attached actual is malformed (no numeric value)' });
  // accepted + event over + no actual = a real capture gap (not just pending)
  const accepted = states.includes('accepted');
  const hasActual = isObj(record.actual) && num(record.actual.value) != null;
  if (accepted && o.eventPassed && !hasActual) issues.push({ code: 'missing_actual', level: 'warn', message: 'Event has passed but no actual outcome was attached' });
  return issues;
}

// The full admin dataset — KPIs, lifecycle funnel, a records table, and integrity warnings — over
// this browser's book. Pure. Honest: "eligible" is UNAVAILABLE (only shown recs are persisted); no
// stage is scored. Never throws on malformed input.
export function evaluationAudit(events, asOf) {
  const evs = Array.isArray(events) ? events : [];
  const now = asOf ? new Date(asOf) : safeNow();
  const T = { records: 0, shown: 0, accepted: 0, reverted: 0, overridden: 0, actualsAttached: 0, evaluationReady: 0, malformed: 0, duplicateWarnings: 0 };
  let scannedEvents = 0, eventsWithEvaluations = 0;
  const records = [], integrity = [];

  for (const e of evs) {
    if (!isObj(e)) continue;
    scannedEvents += 1;
    const list = Array.isArray(e.intelEvaluations) ? e.intelEvaluations : [];
    if (!list.length) continue;
    eventsWithEvaluations += 1;
    const eventPassed = (() => { try { const d = new Date(String(e.date).slice(0, 10)); return !isNaN(d) && d < now; } catch { return false; } })();
    const label = `${(e.type || 'Event')} · ${String(e.id || '?').slice(0, 6)}`;
    const seen = new Set();

    for (const r of list) {
      T.records += 1;
      const issues = validateEvaluation(r, { eventPassed });
      const fatal = issues.find((i) => i.code === 'malformed');
      if (fatal) { T.malformed += 1; integrity.push({ eventId: e.id, recId: (isObj(r) && r.id) || null, ...fatal }); continue; }
      if (r.id) { if (seen.has(r.id)) { T.duplicateWarnings += 1; integrity.push({ eventId: e.id, recId: r.id, code: 'duplicate_id', level: 'error', message: `Duplicate record id ${r.id} within one event` }); } seen.add(r.id); }
      for (const iss of issues) integrity.push({ eventId: e.id, recId: r.id || null, ...iss });

      const states = Array.isArray(r.lifecycle) ? r.lifecycle.map((h) => h && h.state) : [];
      if (states.includes('presented') || states.includes('created')) T.shown += 1;
      if (states.includes('accepted')) T.accepted += 1;
      if (states.includes('reverted')) T.reverted += 1;
      if (states.includes('overridden')) T.overridden += 1;
      const hasActual = isObj(r.actual) && num(r.actual.value) != null;
      if (hasActual) T.actualsAttached += 1;
      const baselinePresent = isObj(r.baseline) && num(r.baseline.value) != null;
      const ready = hasActual && baselinePresent && isObj(r.recommendation);
      if (ready) T.evaluationReady += 1;

      const decision = states.includes('reverted') ? 'Reverted' : states.includes('overridden') ? 'Overridden' : states.includes('accepted') ? 'Accepted' : 'Pending';
      const at = (s) => { const h = (Array.isArray(r.lifecycle) ? r.lifecycle : []).find((x) => x && x.state === s); return h ? h.at : null; };
      records.push({
        eventId: e.id, eventLabel: label,
        recommendationType: (isObj(r.metadata) && r.metadata.domain) || (isObj(r.recommendation) && r.recommendation.domain) || 'unknown',
        reader: r.readerId || 'unknown', source: (isObj(r.metadata) && r.metadata.source) || null,
        confidence: (isObj(r.recommendation) && r.recommendation.confidence) || null,
        snapshot: isObj(r.recommendation) ? { from: r.recommendation.from, to: r.recommendation.to, because: r.recommendation.because } : null,
        baselinePresent, decision, actualAttached: hasActual, evaluationReady: ready,
        version: r.version ?? null, engine: (isObj(r.metadata) && r.metadata.readerVersion) || null,
        createdAt: r.timestamp || at('created'), presentedAt: at('presented'),
        decidedAt: at('reverted') || at('overridden') || at('accepted') || null,
      });
    }
  }

  const funnel = [
    { stage: 'eligible', value: null, available: false, note: 'Not persisted — only shown recommendations are captured' },
    { stage: 'created', value: T.records, available: true },
    { stage: 'presented', value: T.shown, available: true },
    { stage: 'accepted', value: T.accepted, available: true },
    { stage: 'reverted', value: T.reverted, available: true },
    { stage: 'overridden', value: T.overridden, available: true },
    { stage: 'actual attached', value: T.actualsAttached, available: true },
    { stage: 'evaluation ready', value: T.evaluationReady, available: true },
  ];
  return { scannedEvents, eventsWithEvaluations, totals: T, funnel, records, integrity };
}

function safeNow() { try { return new Date(); } catch { return new Date(0); } }

// ── Stage 1B: conversion / transaction monitoring (visibility only — NO scoring) ─────────────────
// Correlates intelligence moments with LOCAL, measurable outcomes (a recommendation's lifecycle +
// whether the event qualified/reconciled). It does NOT fabricate paid/CTA/signup conversion: those
// are behavioral events that live in PostHog (write-only in-app) and are returned in `unavailable`
// with the exact join that's missing. `conversion` here means the recommendation LIFECYCLE outcome
// (accepted/reverted/reconciled), never a purchase — labeled as such in the UI.
export function conversionAudit(events, asOf) {
  const evs = Array.isArray(events) ? events : [];
  const audit = evaluationAudit(events, asOf); // reuses the validated record scan
  const T = audit.totals;
  const rate = (n, d) => (d > 0 ? Math.round((n / d) * 100) : null);

  // Qualified events = a local activation proxy (date + a real headcount) — same rule as funnelContent.
  let qualified = 0;
  for (const e of evs) {
    if (!isObj(e)) continue;
    const gc = Number(e.guestCount) || Number(e.guestEstimate) || (Array.isArray(e.guests) ? e.guests.length : 0);
    if (e.date && gc > 0) qualified += 1;
  }

  // The LOCAL transaction funnel around intelligence moments (this browser's book).
  const funnel = [
    { stage: 'Qualified events', value: qualified, pct: null, available: true },
    { stage: 'Events with a recommendation', value: audit.eventsWithEvaluations, pct: rate(audit.eventsWithEvaluations, qualified), available: true },
    { stage: 'Recommendations shown', value: T.shown, pct: null, available: true },
    { stage: 'Accepted', value: T.accepted, pct: rate(T.accepted, T.shown), available: true },
    { stage: 'Reverted', value: T.reverted, pct: rate(T.reverted, T.shown), available: true },
    { stage: 'Overridden', value: T.overridden, pct: rate(T.overridden, T.shown), available: true },
    { stage: 'Outcome reconciled', value: T.actualsAttached, pct: rate(T.actualsAttached, T.shown), available: true },
  ];

  const rates = {
    shownToAccepted: { label: 'Shown → accepted', num: T.accepted, den: T.shown, pct: rate(T.accepted, T.shown), available: true },
    shownToReverted: { label: 'Shown → reverted', num: T.reverted, den: T.shown, pct: rate(T.reverted, T.shown), available: true },
    overriddenRate: { label: 'Shown → overridden', num: T.overridden, den: T.shown, pct: rate(T.overridden, T.shown), available: true },
    eventToShown: { label: 'Qualified event → recommendation shown', num: audit.eventsWithEvaluations, den: qualified, pct: rate(audit.eventsWithEvaluations, qualified), available: true },
    shownToReconciled: { label: 'Shown → outcome reconciled', num: T.actualsAttached, den: T.shown, pct: rate(T.actualsAttached, T.shown), available: true },
  };

  // Slice acceptance by the record's frozen dimensions.
  const group = (keyFn) => {
    const m = {};
    for (const r of audit.records) {
      const k = keyFn(r) || 'unknown';
      m[k] = m[k] || { key: k, shown: 0, accepted: 0, reverted: 0 };
      m[k].shown += 1;
      if (r.decision === 'Accepted') m[k].accepted += 1;
      if (r.decision === 'Reverted') m[k].reverted += 1;
    }
    return Object.values(m).map((g) => ({ ...g, acceptRate: rate(g.accepted, g.shown) })).sort((a, b) => b.shown - a.shown);
  };
  const byDimension = {
    byType: group((r) => r.recommendationType),
    byConfidence: group((r) => r.confidence),
    byReader: group((r) => r.reader),
    byEngine: group((r) => `${r.reader} v${r.engine ?? '?'}`),
  };

  // HONEST gaps — behavioral conversion that cannot be computed in-app (PostHog write-only / no event).
  const unavailable = [
    { metric: 'Recommendation shown → CTA click rate', reason: 'CTA clicks are not joined to a recommendation locally; behavioral funnels live in PostHog (write-only in-app).', needs: 'PostHog funnel intel_rec_shown → <cta_event>, or a new intel_rec_cta_clicked event on the record.' },
    { metric: 'Recommendation accepted → CTA click rate', reason: 'No local accepted→CTA join.', needs: 'PostHog funnel intel_attendance_applied → <cta_event>.' },
    { metric: 'Recommendation accepted → signup / event-created rate', reason: 'Signup has NO analytics event today; cross-session isn’t readable from this browser.', needs: 'A new sign_up event + PostHog funnel intel_rec_shown → sign_up / event_created (event_created already fires).' },
    { metric: 'Recommendation exposure → paid conversion', reason: 'No paid/subscription analytics event exists; paid state is server/Stripe only.', needs: 'A new subscription_started/paid event + PostHog funnel intel_rec_shown → paid.' },
    { metric: 'Recommendation shown → repeat session / event', reason: 'Sessions are PostHog-only; second_event_created fires to PostHog, not readable in-app.', needs: 'PostHog funnel intel_rec_shown → second_event_created / returning session.' },
    { metric: 'Recommendation reverted → drop-off rate', reason: 'Drop-off is a behavioral/session metric; the revert COUNT is local but “what the host did after reverting” is not.', needs: 'PostHog funnel intel_attendance_reverted → no_return / session_end.' },
  ];

  return {
    present: T.records > 0,
    qualifiedEvents: qualified,
    funnel, rates, byDimension, unavailable,
    note: 'Local acceptance & reconciliation only (this browser). “Conversion” = the recommendation’s lifecycle outcome, NOT a purchase. Paid/CTA/signup conversion is behavioral (PostHog) and shown as unavailable.',
  };
}

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
