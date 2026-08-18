// ─── Decision Intelligence (XIP-1 Bundle B) ────────────────────────────────────
// Resolves which playbook decisions are relevant to a given role/phase/situation.
// Decisions are projection-filtered — never duplicated. The canonical decision array
// lives in the playbook; this returns references, not copies.

import { ROLES, PHASES } from './experienceContext';
import { taskLeadDays } from '../taskLead';

// Blocks → roles that care about them
const BLOCK_ROLE_MAP = {
  food:       ['host', 'caterer', 'coordinator', 'planner'],
  logistics:  ['coordinator', 'venue', 'operations', 'planner'],
  vendor:     ['planner', 'coordinator', 'corporate'],
  budget:     ['planner', 'corporate', 'host'],
  compliance: ['corporate', 'planner'],
  staffing:   ['operations', 'coordinator', 'planner'],
  guests:     ['host', 'planner', 'coordinator', 'family'],
  timeline:   ['coordinator', 'photographer', 'operations', 'planner'],
};

// Parse a decision's authored timing → positive days-before-event ('T-7d' → 7,
// 'T0' → 0, unknown → null).
// 2026-07-15: this file kept a SECOND private /T-(\d+)d/ regex after lib/taskLead.js
// became the one lead reader — same `when` field, same vocabulary. It now delegates:
// taskLeadDays returns the lead as ≤0 days relative to the event, while this module's
// daysOut convention is positive days-before, so the sign flips here. (taskLeadDays
// is a strict superset of the old regex — it also honors a numeric leadDays and the
// prose week labels, should a decision ever carry them.)
function parseDaysOut(when) {
  const lead = taskLeadDays({ when });
  return lead == null ? null : -lead;
}

// Does the decision's timing fall within the current phase's window?
function timingMatchesPhase(daysOut, phase) {
  if (daysOut === null) return true;  // undated = always potentially relevant
  const info = PHASES[phase];
  if (!info) return true;
  return daysOut >= info.daysOutMin && daysOut <= info.daysOutMax;
}

// ─── Priority-tier boost (DECISION_SCHEMA_SPEC §4.A / §6) ───────────────────────
// The decision schema's four nullable priority fields give the scorer an importance
// axis it never had (weight, reversibility, emotionalWeight). This term is:
//   • ADDITIVE — layered on top of the role/phase/situation base score, never replacing it.
//   • BOUNDED (< 1) — a strict TIE-BREAKER. It can re-rank decisions that already tie on
//     the base signals, but it can NEVER leapfrog a decision with a stronger timing/role/
//     situation match (whose base is at least 1 point higher). So a low-priority decision
//     that matches the phase still outranks a high-priority decision that does not.
//   • NEUTRAL when absent — an unmodelled field maps to 0, so a decision carrying none of
//     the fields scores EXACTLY as it did before this term existed (regression-safe).
// It is applied only to already-relevant decisions (base > 0) — see scoreDecision — so the
// SET of resolved decisions is unchanged; only the ORDER among relevant ties can shift.
const WEIGHT_SCORE          = { low: 0, med: 1, high: 2 };  // how consequential the pick is
const EMOTIONAL_WEIGHT_SCORE = { low: 0, med: 1, high: 2 }; // emotional stakes
const REVERSIBILITY_URGENCY  = { reversible: 0, costly: 1, locked: 2 }; // can't-undo → urgency
const PRIORITY_RAW_MAX = 6;    // 2 (weight) + 2 (emotional) + 2 (reversibility)
const PRIORITY_TIEBREAK = 0.9; // < 1 so the whole term can never overtake one base point

function priorityBoost(decision) {
  const raw =
    (WEIGHT_SCORE[decision.weight] || 0) +
    (EMOTIONAL_WEIGHT_SCORE[decision.emotionalWeight] || 0) +
    (REVERSIBILITY_URGENCY[decision.reversibility] || 0);
  if (!raw) return 0;  // no priority fields modelled → neutral
  return PRIORITY_TIEBREAK * (raw / PRIORITY_RAW_MAX);
}

// Score a single decision for the given role/phase/situations
export function scoreDecision(decision, role, phase, situations) {
  let score = 0;
  const blocks = decision.blocks || [];
  const daysOut = parseDaysOut(decision.when);

  // Phase timing match (strongest signal)
  if (timingMatchesPhase(daysOut, phase)) score += 3;

  // Role relevance via blocks
  const roleBlocks = ROLES[role]?.decisionBlocks;
  if (roleBlocks === null) {
    score += 2;  // null = planner / coordinator sees all
  } else {
    for (const block of blocks) {
      if ((roleBlocks || []).includes(block)) { score += 2; break; }
      if (BLOCK_ROLE_MAP[block]?.includes(role)) { score += 1; break; }
    }
  }

  // Situation urgency — conflicts push decisions to the top
  for (const sit of (situations || [])) {
    if (sit === 'budget-exceeded' && blocks.includes('budget')) score += 4;
    if (sit === 'vendor-late' && (blocks.includes('logistics') || blocks.includes('vendor'))) score += 4;
    if (sit === 'attendance-spike' && blocks.includes('food')) score += 3;
    if (sit === 'food-delay' && blocks.includes('food')) score += 4;
    if (sit === 'weather-alert' && blocks.includes('logistics')) score += 3;
    if (sit === 'permit-issue' && blocks.includes('compliance')) score += 4;
  }

  // Priority tier — additive, bounded tie-breaker. Applied ONLY to already-relevant
  // decisions so the resolved SET (score > 0 filter) is untouched; absent → +0.
  if (score > 0) score += priorityBoost(decision);

  return score;
}

// Primary export: returns decisions relevant to the context, sorted by relevance.
// Returns an array of decision references (no copies).
export function resolveDecisions(playbook, context) {
  const decisions = playbook.decisions || [];
  if (!decisions.length) return [];

  const { role, phase, situations = [] } = context;

  const scored = decisions
    .map((d) => ({ decision: d, score: scoreDecision(d, role, phase, situations) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => s.decision);
}

// ── WHEN NOTHING IS DUE, SAY WHAT IS COMING ────────────────────────────────────
// Coverage pass, 2026-08-17. Measured through this resolver, not the raw data:
// with role 'host', an EMPTY decision board occurs in every single phase —
// planning 9/39 playbooks, research 7, booking 5, purchasing 6, preparation 9.
// A host asking "what now?" six weeks out got silence for nine event types.
//
// The fix is deliberately NOT to widen `resolveDecisions`. That function means
// "due now", and padding it with calls whose window has not opened would make
// the composer's own label — "Resolve N pending decisions" — false, trading a
// coverage gap for an honesty one. The two states stay separate: this returns
// what is COMING, and the caller labels it as such.
//
// Ordered by proximity (the soonest window first), because "what opens next" is
// the only useful answer to "nothing yet".
export function nextDecisionsToOpen(playbook, context, limit = 3) {
  const decisions = (playbook && playbook.decisions) || [];
  if (!decisions.length) return [];

  // Only decisions the phase filter is holding back — anything already scoring
  // belongs to resolveDecisions, and returning it here would double-render it.
  const { role, phase, situations = [] } = context || {};
  const held = decisions.filter((d) => scoreDecision(d, role, phase, situations) === 0);

  // AHEAD ONLY. A held decision sits outside the phase window on one of two
  // sides, and they mean opposite things: below the phase floor it has not
  // opened yet, above the ceiling its window has already CLOSED. Calling a
  // missed call "coming" would be the same lie in the other direction, so the
  // past side is excluded here and left to the overdue path that owns it.
  const info = PHASES[phase];
  const floor = info ? info.daysOutMin : null;

  return held
    .map((d) => ({ d, daysOut: parseDaysOut(d.when) }))
    .filter((x) => x.daysOut !== null && (floor === null || x.daysOut < floor))
    .sort((a, b) => b.daysOut - a.daysOut)   // largest days-out = opens soonest
    .slice(0, limit)
    .map((x) => x.d);
}

// Returns the single most blocking decision given active situations.
// Used for the Adaptive Feed "Most Important Decision" slot.
export function rankDecisions(decisions, situations = []) {
  if (!decisions.length) return null;

  // Situation-blocked decisions already float to top via scoring.
  // The first item in a scored list is the most important.
  return decisions[0];
}

// Returns which decisions are still unresolved (no default selected, or blocking tasks).
export function unresolvedDecisions(playbook, context) {
  const resolved = resolveDecisions(playbook, context);
  // A decision is "unresolved" if it has no eventState override and affects downstream tasks.
  // Without real event state, every resolved decision with affects[] is pending.
  return resolved.filter((d) => d.affects && d.affects.length > 0);
}
