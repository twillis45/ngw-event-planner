// Sprint 57J — Decision Confidence reader. Judgment Intelligence, NOT a new engine.
// Answers ONE question per decision: "do we have enough information to LOCK this?"
// — never "is it the perfect/correct/successful decision."
//
//   • PURE READER over EXISTING resolvers (guestCountResolved · getEventReadiness ·
//     summarizeCrew · seating g.table). No new readiness math, no engine, no
//     persisted field, no inference of missing state.
//   • Only the READY decisions are emitted (Guest Count, Seating, Vendors, Timeline,
//     Staffing). Budget-adequacy / Venue-lock / Menu-final are DEFERRED — their state
//     isn't persisted, so claiming "ready" would invent certainty (AP-005). They are
//     intentionally OMITTED, never shown as ready.
//   • pi.decisions flag default OFF ⇒ no items ⇒ byte-identical to production.
//   • Persona affects only WORDS (host/operator/planner), never which state a
//     decision resolves to (Pattern 014, One Truth).

import { audiencePersona } from './nextActionRenderer';
import { guestCountResolved } from './playbooks';
import { summarizeCrew } from './studioTeam';

export function decisionsOn() {
  // Host Activation v1: default ON (persona-gated downstream). QA off-switch:
  // ?pi-off=decisions / localStorage 'ngw-pi-decisions'='0' / REACT_APP_PI_DECISIONS='false'.
  try {
    if (typeof window !== 'undefined') {
      const q = window.location.search || '';
      if (/[?&]pi=decisions\b/.test(q)) return true;
      if (/[?&]pi-off=decisions\b/.test(q)) return false;
    }
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('ngw-pi-decisions');
      if (v === '1') return true;
      if (v === '0') return false;
    }
  } catch (e) { /* storage blocked */ }
  return !(typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_DECISIONS === 'false');
}
export function decisionsActive() { return decisionsOn(); }

// Decisions whose state has NO persisted/observable signal — never emitted, never
// claimed ready. Exported for the doc/tests so the deferral is explicit.
export const DEFERRED_DECISIONS = ['budgetApproval', 'venue', 'menu'];

// Persona copy for the two phrasings that change by audience: the "ready" line and
// the lock verb. Everything else (reasons, blockers) is factual and shared.
// Exported for tests/inventory. `operator` activates when organization→operator
// lands (Sprint 57I / PR #52); host + planner are live today.
export const COPY = {
  host:     { ready: 'You have enough to decide.', lock: 'Lock it' },
  operator: { ready: 'Ready for sign-off.',         lock: 'Confirm' },
  planner:  { ready: 'Decision ready.',             lock: 'Lock' },
};

// decisionConfidence(event, readiness) → [{ key, label, state, confidence, reason,
// blockers, primaryAction }]. `readiness` is the existing getEventReadiness(event)
// (passed in to keep this lib free of the CommandCenter module). States:
// ready_to_lock · gathering · blocked · overdue · locked · unknown.
export function decisionConfidence(event, readiness) {
  if (!event) return [];
  const persona = audiencePersona(event);
  const c = COPY[persona] || COPY.host;
  const r = readiness || {};
  const guests = Array.isArray(event.guests) ? event.guests : [];
  const items = [];

  // ── 1 · GUEST COUNT — reuse guestCountResolved() ────────────────────────────
  const gc = guestCountResolved(event);
  const yes = guests.filter((g) => g && g.rsvp === 'Yes').length;
  items.push({
    key: 'guestCount', label: 'Guest count',
    state: gc.resolved ? 'ready_to_lock' : 'gathering',
    confidence: gc.resolved ? c.ready : 'Still gathering responses.',
    reason: gc.resolved
      ? `${yes} confirmed — no responses outstanding.`
      : (gc.reason === 'pending-rsvps'
          ? `Waiting on ${gc.pending} RSVP${gc.pending === 1 ? '' : 's'}.`
          : 'No final count yet.'),
    blockers: [],
    primaryAction: gc.resolved ? c.lock : 'Chase RSVPs',
  });

  // ── 2 · SEATING — prereq: guest count resolved ──────────────────────────────
  if (guests.length > 0) {
    const conf = guests.filter((g) => g && g.rsvp === 'Yes');
    const unseated = conf.filter((g) => !g.table).length;
    let state, reason, action, blockers = [];
    if (!gc.resolved) {
      state = 'blocked'; reason = 'Seating depends on the final guest count.';
      blockers = ['guestCount']; action = 'Lock guest count first';
    } else if (conf.length === 0) {
      state = 'gathering'; reason = 'No confirmed guests to seat yet.'; action = 'Collect RSVPs';
    } else if (unseated === 0) {
      state = 'ready_to_lock'; reason = 'Every confirmed guest has a seat.'; action = c.lock;
    } else {
      state = 'gathering'; reason = `${unseated} confirmed guest${unseated === 1 ? '' : 's'} still unassigned.`; action = 'Assign seats';
    }
    items.push({
      key: 'seating', label: 'Seating', state,
      confidence: state === 'ready_to_lock' ? c.ready : '', reason, blockers, primaryAction: action,
    });
  }

  // ── 3 · VENDORS — reuse getEventReadiness().vendor (no new vendor logic) ─────
  if (r.vendor) {
    const s = r.vendor.status;
    // Only the states the existing readiness actually computes — no fabricated overdue.
    const state = s === 'ON_TRACK' ? 'ready_to_lock' : 'gathering';
    items.push({
      key: 'vendors', label: 'Vendors', state,
      confidence: state === 'ready_to_lock' ? c.ready : '',
      reason: r.vendor.note || '', blockers: [],
      primaryAction: state === 'ready_to_lock' ? c.lock : 'Confirm vendors',
    });
  }

  // ── 4 · TIMELINE — reuse getEventReadiness().timeline (overdue from note) ────
  if (r.timeline) {
    const s = r.timeline.status, note = r.timeline.note || '';
    const state = s === 'ON_TRACK' ? 'ready_to_lock' : /overdue/i.test(note) ? 'overdue' : 'gathering';
    items.push({
      key: 'timeline', label: 'Timeline', state,
      confidence: state === 'ready_to_lock' ? c.ready : '',
      reason: note, blockers: [],
      primaryAction: state === 'overdue' ? 'Catch up' : state === 'ready_to_lock' ? c.lock : 'Keep moving',
    });
  }

  // ── 5 · STAFFING — reuse summarizeCrew(); skip when unstaffed (host events) ──
  const crew = summarizeCrew(event);
  if (crew && crew.total > 0) {
    const state = crew.severity === 'none' ? 'ready_to_lock'
      : crew.needsConfirmation > 0 ? 'gathering' : 'gathering';
    items.push({
      key: 'staffing', label: 'Staffing', state,
      confidence: state === 'ready_to_lock' ? c.ready : '',
      reason: `${crew.confirmed} of ${crew.total} confirmed`
        + (crew.needsConfirmation ? `, ${crew.needsConfirmation} need confirmation` : '') + '.',
      blockers: [], primaryAction: state === 'ready_to_lock' ? c.lock : 'Confirm crew',
    });
  }

  // Budget-adequacy / Venue-lock / Menu-final are NOT emitted (DEFERRED_DECISIONS).
  return items;
}
