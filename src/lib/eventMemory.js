// Sprint 58G — Event Memory v1. NOT a new store or engine: a pure READER that
// aggregates the per-event signals already captured (decisionMemory[] reasons +
// event.outcomes vendor outcomes) ACROSS the events already loaded (allEvents),
// into the one thing that compounds — the planner's PRIVATE vendor track record.
//   • Reuses decisionMemory readers + vendorOutcome (no duplicated logic).
//   • PRIVATE per studio — never a public rating, never cross-studio reputation.
//   • Gated by the same pi.memory flag (default OFF ⇒ no surfacing).
//   • The only new persisted field is `event.lessons` (one short optional string).

import { memoryOn, getDecisions, vendorOutcome } from './decisionMemory';

export { memoryOn };

// Cross-event vendor identity (v1 key): a normalized name. A Vendor-Bank-id link is
// the real fix and belongs to Vendor Intelligence (58J), not Event Memory.
export function vendorKey(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const OUTCOME_KEYS = ['on_time', 'late', 'no_show', 'great', 'poor'];

// vendorMemoryFor(allEvents, vendorName, excludeEventId) → private aggregate, or null.
// Counts an event only when this vendor was actually committed (Confirmed/Booked) —
// a track record is of vendors USED, not merely considered. excludeEventId lets the
// surface read "past history" relative to the event being planned.
export function vendorMemoryFor(allEvents, vendorName, excludeEventId) {
  const key = vendorKey(vendorName);
  if (!key) return null;
  const events = Array.isArray(allEvents) ? allEvents : [];
  let timesUsed = 0;
  const tally = { on_time: 0, late: 0, no_show: 0, great: 0, poor: 0 };
  const reasons = [];
  for (const ev of events) {
    if (!ev || (excludeEventId && ev.id === excludeEventId)) continue;
    const used = (ev.vendors || []).find(
      (v) => vendorKey(v.name) === key && (v.status === 'Confirmed' || v.status === 'Booked'),
    );
    if (!used) continue;
    timesUsed += 1;
    const out = vendorOutcome(ev, used.id);
    if (out && tally[out] != null) tally[out] += 1;
    const recs = getDecisions(ev).filter(
      (d) => d.decisionType === 'vendor_selection' && (d.subjectId === used.id || vendorKey(d.subjectLabel) === key),
    );
    const r = recs.length ? recs[recs.length - 1].rationale : '';
    if (r) reasons.push(r);
  }
  if (timesUsed === 0) return null;
  return { name: vendorName, key, timesUsed, rehired: timesUsed >= 2, reasons, ...tally };
}

// One-line PRIVATE summary for the vendor pick. e.g. "Used 3× · 2 on-time, 1 late · rehired".
export function summarizeVendorMemory(m) {
  if (!m || m.timesUsed < 1) return '';
  const parts = [`Used ${m.timesUsed}×`];
  const oc = [];
  if (m.on_time) oc.push(`${m.on_time} on-time`);
  if (m.late) oc.push(`${m.late} late`);
  if (m.no_show) oc.push(`${m.no_show} no-show`);
  if (m.great) oc.push(`${m.great} great`);
  if (m.poor) oc.push(`${m.poor} poor`);
  if (oc.length) parts.push(oc.join(', '));
  if (m.rehired) parts.push('rehired');
  return parts.join(' · ');
}

// (Removed P5: the `eventMemory(allEvents)` cross-event aggregator was imagined for a
// future Vendor Intelligence surface and had no consumer — the live v1 surface uses
// vendorMemoryFor/summarizeVendorMemory below. Deleted rather than preserved.)

// ── Event Lesson Memory (one short optional string, captured at completion) ──────
// No AI generation, no summarization, no mandatory form — just a sentence the
// planner chooses to leave. Rides the event blob (persists via the 58E-B fix).
export function setLesson(event, text) {
  const t = String(text || '').trim().slice(0, 200);
  if (!event) return event;
  return { ...event, lessons: t };
}
export function getLesson(event) { return (event && typeof event.lessons === 'string') ? event.lessons : ''; }
