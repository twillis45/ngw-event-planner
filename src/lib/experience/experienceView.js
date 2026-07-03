// ─── Experience View (XIP-1 — the master projection function) ─────────────────
// experienceView() is the universal renderer contract.
// Every screen can consume it. One function; many experiences.
//
// Canonical rule: knowledge is NEVER owned here. Everything is projection.
// experienceView() is pure: same inputs → same output; never mutates playbook or context.

import { createContext } from './experienceContext';
import { composeExperience, buildAdaptiveFeed } from './experienceComposer';

// ── Headline builder ───────────────────────────────────────────────────────────
function buildHeadline(context, composed) {
  const { role, phase, situations = [] } = context;
  if (situations.length) {
    const topSit = situations[0].replace(/-/g, ' ');
    return `Attention needed: ${topSit}`;
  }
  const phaseLabels = {
    planning: 'Planning your event',
    research: 'Researching options',
    booking: 'Booking vendors',
    purchasing: 'Shopping & purchasing',
    preparation: 'Getting ready',
    setup: 'Setting up',
    execution: "It's happening",
    monitoring: 'Keeping watch',
    cleanup: 'Wrapping up',
    closeout: 'Closing out',
    learning: 'Looking back',
  };
  return phaseLabels[phase] || 'Your event';
}

// ── The master projection function ─────────────────────────────────────────────
// experienceView(playbook, context) → experience
//
// Inputs:
//   playbook  — canonical playbook object (never mutated)
//   context   — frozen context from createContext()
//
// Output: a frozen experience descriptor. Every field is a projection,
// never an owned copy of knowledge data.
export function experienceView(playbook, context) {
  if (!playbook || !context) return null;

  const composed = composeExperience(playbook, context);
  if (!composed) return null;

  const feed = buildAdaptiveFeed(composed);
  const headline = buildHeadline(context, composed);

  return Object.freeze({
    // Identity
    role:       context.role,
    phase:      context.phase,
    workspace:  context.workspace,
    situations: context.situations,
    asOf:       context.asOf,

    // Narrative
    headline,

    // Structured experience (what the screen renders)
    sectionOrder:    composed.sectionOrder,
    feed,
    warnings:        composed.warnings,
    decisions:       composed.decisions,
    topDecision:     composed.topDecision,
    tasks:           composed.tasks,
    shopping:        composed.shopping,
    risks:           composed.risks,
    milestones:      composed.milestones,
    contingencies:   composed.contingencies,
    actions:         composed.actions,
    recommendations: composed.recommendations,

    // Provenance + purity proof
    meta: Object.freeze({
      knowledgeSource:       playbook.type,
      scope:                 context.scope,
      generatedAt:           context.asOf,
      role:                  context.role,
      phase:                 context.phase,
      purity:                true,          // projection only — knowledge never owned here
      composedFromCanonical: true,
    }),
  });
}

// ── Simulation (Bundle K) ──────────────────────────────────────────────────────
// Simulate a different context without mutating the runtime.
// "What would the coordinator see?" — pass { role: 'coordinator' } as overrides.
// "What if weather shifts?" — pass { situations: ['weather-alert'] } as overrides.
// Pure function. Runtime state is never touched.
export function simulateExperience(playbook, baseContext, overrides = {}) {
  const simulatedContext = createContext({
    role:        overrides.role        ?? baseContext.role,
    phase:       overrides.phase       ?? baseContext.phase,
    situations:  overrides.situations  ?? baseContext.situations,
    workspace:   overrides.workspace   ?? baseContext.workspace,
    permissions: overrides.permissions ?? baseContext.permissions,
    objectives:  overrides.objectives  ?? baseContext.objectives,
    eventState:  overrides.eventState  ? { ...baseContext.eventState, ...overrides.eventState } : baseContext.eventState,
    scope:       overrides.scope       ?? baseContext.scope,
    asOf:        overrides.asOf        ?? baseContext.asOf,
  });
  return experienceView(playbook, simulatedContext);
}

// ── Comparison helper ──────────────────────────────────────────────────────────
// Returns two experiences side by side for simulation comparison.
// diffExperience(playbook, contextA, contextB) → { a, b, delta }
export function diffExperience(playbook, contextA, contextB) {
  const a = experienceView(playbook, contextA);
  const b = experienceView(playbook, contextB);
  if (!a || !b) return { a, b, delta: null };

  const delta = {
    roleChanged:       a.role !== b.role,
    phaseChanged:      a.phase !== b.phase,
    situationsChanged: JSON.stringify(a.situations) !== JSON.stringify(b.situations),
    sectionOrderDiff:  a.sectionOrder.filter((s) => !b.sectionOrder.includes(s)),
    feedLengthDiff:    b.feed.length - a.feed.length,
    warningsDiff:      b.warnings.length - a.warnings.length,
    decisionsDiff:     b.decisions.length - a.decisions.length,
    shoppingDiff:      b.shopping.length - a.shopping.length,
  };

  return { a, b, delta };
}
