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
