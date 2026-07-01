// ── INTEL-QA-1 Stage 1D-B — Closeout Intelligence ────────────────────────────
//
// Pure detection helpers: which past events have an accepted R1 evaluation
// but have not yet received an actual outcome (the host hasn't entered the
// final guest count in PostEventRecap).
//
// Design constraints:
//   • No Stage 2 scoring — no grade/accuracy/score/scoreEvaluation
//   • actual is write-once (attachActual) — we only CHECK presence, never set it
//   • No R1 behaviour changes — this is read-only over intelEvaluations
//   • No PII — counts and structural checks only
//   • Production-safe — no dev/QA gates needed (read-only module)
//
// Usage:
//   import { needsActual, pendingCloseouts, closeoutStats } from './closeoutIntel';
//   const needsNudge = needsActual(event);
//   const pending = pendingCloseouts(myEvents);
// ─────────────────────────────────────────────────────────────────────────────

// R1 id prefix — matches evalId('R1', eventId) = 'R1:<eventId>'
const R1_PREFIX = 'R1:';

// Returns true if the event has at least one R1 evaluation record that has
// reached the 'accepted' lifecycle state.
export function hasAcceptedR1(event) {
  const evals = event?.intelEvaluations;
  if (!Array.isArray(evals) || !evals.length) return false;
  return evals.some(
    (r) =>
      r &&
      typeof r.id === 'string' &&
      r.id.startsWith(R1_PREFIX) &&
      Array.isArray(r.lifecycle) &&
      r.lifecycle.some((h) => h && h.state === 'accepted'),
  );
}

// Returns true if the event's R1 evaluation record already has a valid actual
// outcome attached (write-once; checks presence only, never sets).
export function hasActualAttached(event) {
  const evals = event?.intelEvaluations;
  if (!Array.isArray(evals) || !evals.length) return false;
  return evals.some(
    (r) =>
      r &&
      typeof r.id === 'string' &&
      r.id.startsWith(R1_PREFIX) &&
      r.actual != null &&
      typeof r.actual === 'object' &&
      typeof r.actual.value === 'number' &&
      isFinite(r.actual.value),
  );
}

// Returns true when the event has an accepted R1 recommendation but no actual
// outcome attached yet. This is the closeout gap we need to prompt the host for.
export function needsActual(event) {
  return hasAcceptedR1(event) && !hasActualAttached(event);
}

// Returns true when the event date is in the past relative to asOf (or now).
// Safe on bad/missing date strings — returns false.
export function isPastEvent(event, asOf) {
  const dateStr = event?.date;
  if (!dateStr) return false;
  try {
    const ref = asOf ? new Date(asOf) : new Date();
    const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
    return !isNaN(d.getTime()) && d < ref;
  } catch {
    return false;
  }
}

// Returns true when all three conditions for a closeout prompt are met:
//   1. Event date has passed
//   2. Event had a planned guest count (so there's a meaningful comparison)
//   3. An accepted R1 recommendation has no actual outcome yet
export function needsCloseout(event, asOf) {
  if (!isPastEvent(event, asOf)) return false;
  const planned = Number(event?.guestCount) || Number(event?.guestEstimate) || 0;
  if (!planned) return false;
  return needsActual(event);
}

// Returns the subset of events that need a closeout prompt, sorted most-recently-past
// first (so the host sees the event they remember most clearly at the top).
export function pendingCloseouts(events, asOf) {
  const arr = Array.isArray(events) ? events : [];
  return arr
    .filter((e) => e && needsCloseout(e, asOf))
    .sort((a, b) => {
      const da = new Date(String(a.date).slice(0, 10));
      const db = new Date(String(b.date).slice(0, 10));
      return db - da;
    });
}

// Returns counts for the admin Intelligence tab:
//   pendingActuals  — past events with accepted R1 and no actual
//   totalPastWithR1 — all past events that have an accepted R1
//   actualsAttached — totalPastWithR1 minus pendingActuals
export function closeoutStats(events, asOf) {
  const arr = Array.isArray(events) ? events : [];
  const pastWithR1 = arr.filter((e) => e && isPastEvent(e, asOf) && hasAcceptedR1(e));
  const pending = pastWithR1.filter((e) => !hasActualAttached(e));
  return {
    pendingActuals: pending.length,
    totalPastWithR1: pastWithR1.length,
    actualsAttached: pastWithR1.length - pending.length,
  };
}
