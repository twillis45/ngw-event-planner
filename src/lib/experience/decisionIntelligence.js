// ─── Decision Intelligence (XIP-1 Bundle B) ────────────────────────────────────
// Resolves which playbook decisions are relevant to a given role/phase/situation.
// Decisions are projection-filtered — never duplicated. The canonical decision array
// lives in the playbook; this returns references, not copies.

import { ROLES, PHASES } from './experienceContext';

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

// Parse 'T-7d' → 7, 'T0' → 0, unknown → null
function parseDaysOut(when) {
  if (!when) return null;
  const m = String(when).match(/T-(\d+)d/i);
  if (m) return parseInt(m[1], 10);
  if (/T0/i.test(String(when))) return 0;
  return null;
}

// Does the decision's timing fall within the current phase's window?
function timingMatchesPhase(daysOut, phase) {
  if (daysOut === null) return true;  // undated = always potentially relevant
  const info = PHASES[phase];
  if (!info) return true;
  return daysOut >= info.daysOutMin && daysOut <= info.daysOutMax;
}

// Score a single decision for the given role/phase/situations
function scoreDecision(decision, role, phase, situations) {
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
