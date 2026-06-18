// Sprint 58C — Decision Memory v1. The cheapest moat brick (per the 58B audit):
// when a meaningful planning decision happens, capture WHY — persisted onto the
// event itself (`event.decisionMemory[]`), so it rides the existing save path
// (localStorage 'ngw-events' + Supabase events.data) with no new table/migration.
//
//   • REAL persistence, event-scoped, minimal, explainable.
//   • NOT a new engine — it's a data array + tiny pure helpers + a read surface.
//   • Compatible with later Event Memory / Vendor Bank write-back (the records are
//     queryable across events once events load).
//   • The CAPTURE UI + READ surface are gated by pi.memory (default OFF ⇒ no prompts,
//     no records, production identity). When ON, records persist for real.

// pi.memory flag (default OFF). ?pi=memory / localStorage 'ngw-pi-memory' /
// REACT_APP_PI_MEMORY='true'.
export function memoryOn() {
  try {
    if (typeof window !== 'undefined' && /[?&]pi=memory\b/.test(window.location.search || '')) return true;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('ngw-pi-memory') === '1') return true;
  } catch (e) { /* storage blocked */ }
  return typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_MEMORY === 'true';
}

// The v1 decision types (kept deliberately small).
export const DECISION_TYPES = ['vendor_selection', 'budget_reallocation', 'planner_override'];

// Human label per type (for the read surface).
export const DECISION_TYPE_LABEL = {
  vendor_selection: 'Vendor selection',
  budget_reallocation: 'Budget change',
  planner_override: 'Override',
};

let _seq = 0; // monotonic within a session; combined with time-free id (Date.now is unavailable in some contexts)
function rid() { _seq += 1; return 'dm-' + _seq.toString(36) + '-' + Math.floor(_seq * 2654435761 % 1e9).toString(36); }

// makeRecord(fields, now) → a complete Decision Memory record. `now` is injected
// (ISO string) so callers stamp the real time and the lib stays pure/testable.
// Minimal schema: id · eventId · decisionType · subjectId? · subjectLabel ·
// decision · rationale · createdAt · createdBy?  (+ optional alternativesConsidered,
// confidence). No field is added unless the first usable version needs it.
export function makeRecord(fields, now) {
  const f = fields || {};
  const rec = {
    id: rid(),
    eventId: f.eventId || null,
    decisionType: DECISION_TYPES.includes(f.decisionType) ? f.decisionType : 'planner_override',
    subjectLabel: String(f.subjectLabel || '').slice(0, 120),
    decision: String(f.decision || '').slice(0, 200),
    rationale: String(f.rationale || '').trim().slice(0, 600),
    createdAt: now || null,
  };
  if (f.subjectId) rec.subjectId = f.subjectId;
  if (f.createdBy) rec.createdBy = f.createdBy;
  if (f.alternativesConsidered) rec.alternativesConsidered = String(f.alternativesConsidered).slice(0, 200);
  if (f.confidence) rec.confidence = f.confidence;
  return rec;
}

// appendDecision(event, record) → a NEW event with the record appended (immutable).
// A record with no rationale is NOT stored (we capture reasoning, not noise).
export function appendDecision(event, record) {
  if (!event || !record || !record.rationale) return event;
  return { ...event, decisionMemory: [...(event.decisionMemory || []), record] };
}

// Readers for the read surface + engine expression.
export function getDecisions(event) {
  return (event && Array.isArray(event.decisionMemory)) ? event.decisionMemory : [];
}
export function decisionsForSubject(event, subjectId) {
  if (!subjectId) return [];
  return getDecisions(event).filter((d) => d.subjectId === subjectId);
}
// The most recent captured rationale for a subject (engine expression: surface it back).
export function latestRationaleForSubject(event, subjectId) {
  const list = decisionsForSubject(event, subjectId);
  return list.length ? list[list.length - 1].rationale : '';
}

// ── Sprint 58E — Outcome Capture v1: complete Decision → Reason → OUTCOME. ──────
// Principle (58D): DERIVE what's already observable (budget variance, timeline
// slip) from existing event fields; CAPTURE only the small signals that aren't
// (vendor execution, overall). Captured outcomes persist in `event.outcomes`
// (rides the same save path); derived outcomes are computed live (recomputable,
// no persistence). No new engine/table/workflow.

// Small structured signals — never surveys/essays.
export const OUTCOME_SIGNALS = {
  vendor_selection: ['on_time', 'late', 'no_show', 'great', 'poor'],
  budget_reallocation: ['within', 'exceeded', 'underspent'],
  planner_override: ['held', 'slipped', 'missed'],
  overall: ['great', 'ok', 'rough'],
};
export const OUTCOME_LABEL = {
  on_time: 'On time', late: 'Ran late', no_show: 'No-show', great: 'Great', poor: 'Poor',
  within: 'Within budget', exceeded: 'Over budget', underspent: 'Underspent',
  held: 'Held', slipped: 'Slipped', missed: 'Missed', ok: 'OK', rough: 'Rough',
};
const POSITIVE = new Set(['on_time', 'great', 'within', 'held']);
const NEGATIVE = new Set(['late', 'no_show', 'poor', 'exceeded', 'missed']);
export function outcomeTone(status) { return POSITIVE.has(status) ? 'good' : NEGATIVE.has(status) ? 'bad' : 'neutral'; }

// An event is "complete" once its date has passed or it's archived — the natural
// moment to record how it went.
export function isEventComplete(event) {
  if (!event) return false;
  if (event.archived) return true;
  if (!event.date) return false;
  const d = new Date(event.date + 'T23:59:59');
  return !Number.isNaN(d.getTime()) && d < new Date();
}

// DERIVED — budget variance for a reallocated category (actual vs budgeted). Null
// until there is actual spend to judge (we don't guess an outcome with no data).
function deriveBudgetOutcome(event, record) {
  const row = (event.budget || []).find(r => r.id === record.subjectId);
  if (!row) return null;
  const actual = Number(row.actual || 0), budgeted = Number(row.budgeted || 0);
  if (actual <= 0 || budgeted <= 0) return null;
  if (actual > budgeted) return 'exceeded';
  if (actual < budgeted * 0.9) return 'underspent';
  return 'within';
}
// DERIVED — did a deferred item land? done ⇒ held; past its date & not done ⇒ missed.
function deriveTimelineOutcome(event, record) {
  const t = (event.timeline || []).find(x => x.id === record.subjectId);
  if (!t) return null;
  if (t.done) return 'held';
  const due = t.snoozedUntil || event.date;
  if (due) { const d = new Date(due + 'T23:59:59'); if (!Number.isNaN(d.getTime()) && d < new Date()) return 'missed'; }
  return null; // still pending — no outcome yet
}

// outcomeFor(event, record) → { status, label, source, tone } | null.
// Prefers a CAPTURED outcome (vendor execution / a stored record.outcome), else
// DERIVES (budget / timeline). Pure — safe to call on every render.
export function outcomeFor(event, record) {
  if (!event || !record) return null;
  let status = null, source = 'derived';
  const captured = (event.outcomes && event.outcomes.vendors && record.subjectId && event.outcomes.vendors[record.subjectId])
    || (record.outcome && record.outcome.status);
  if (captured) { status = captured; source = 'captured'; }
  else if (record.decisionType === 'budget_reallocation') status = deriveBudgetOutcome(event, record);
  else if (record.decisionType === 'planner_override') status = deriveTimelineOutcome(event, record);
  if (!status) return null;
  return { status, label: OUTCOME_LABEL[status] || status, source, tone: outcomeTone(status) };
}

// ── Capture writers (immutable; persist via the existing setEvent → save path) ──
export function getEventOutcomes(event) { return (event && event.outcomes) || {}; }
export function setOverallOutcome(event, status, now) {
  return { ...event, outcomes: { ...(event.outcomes || {}), overall: status, capturedAt: now || (event.outcomes && event.outcomes.capturedAt) || null } };
}
export function setVendorOutcome(event, vendorId, status, now) {
  if (!vendorId) return event;
  const o = event.outcomes || {};
  return { ...event, outcomes: { ...o, capturedAt: now || o.capturedAt || null, vendors: { ...(o.vendors || {}), [vendorId]: status } } };
}
export function vendorOutcome(event, vendorId) {
  const v = event && event.outcomes && event.outcomes.vendors;
  return (v && v[vendorId]) || null;
}
