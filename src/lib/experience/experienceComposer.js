// ─── Experience Composer (XIP-1 Bundles F, G, H, J) ──────────────────────────
// Assembles sections, cards, actions, warnings, feed, and recommendations
// from canonical playbook data + context. Pure projection — never owns knowledge.

import { ROLES, PHASES, SITUATION_TYPES } from './experienceContext';
import { resolveDecisions, rankDecisions } from './decisionIntelligence';

// ── Adaptive UI Rules (Bundle J) ─────────────────────────────────────────────
// Returns the ordered workspace section list for a given role+phase+situation combination.
export function adaptiveUIRules(role, phase, situations = []) {
  const roleBase = [...(ROLES[role]?.workspaceOrder || ['tasks', 'timeline', 'food'])];

  // Phase boosts certain surfaces to the front
  const phaseBoost = {
    planning:    ['decisions', 'budget'],
    research:    ['vendors', 'pricing'],
    booking:     ['vendors', 'contracts'],
    purchasing:  ['shopping', 'food', 'quantities'],
    preparation: ['tasks', 'contingencies'],
    setup:       ['timeline', 'logistics', 'staffing'],
    execution:   ['timeline', 'contingencies', 'monitoring'],
    cleanup:     ['tasks', 'inventory'],
    closeout:    ['payments', 'feedback'],
    learning:    ['failures', 'improvements'],
  };

  // Situation emergency boosts
  const situationBoost = {
    'vendor-late':       ['contingencies', 'vendors'],
    'budget-exceeded':   ['budget', 'substitutions'],
    'weather-alert':     ['contingencies'],
    'attendance-spike':  ['quantities', 'food', 'capacity'],
    'food-delay':        ['contingencies', 'food', 'timeline'],
    'power-issue':       ['contingencies', 'safety'],
    'timeline-drift':    ['timeline', 'tasks'],
    'venue-change':      ['logistics', 'contingencies'],
  };

  const boosted = new Set();
  for (const sit of (situations || [])) {
    (situationBoost[sit] || []).forEach((s) => boosted.add(s));
  }
  (phaseBoost[phase] || []).forEach((s) => boosted.add(s));

  const boostedArr = [...boosted];
  const remaining = roleBase.filter((s) => !boosted.has(s));
  return [...boostedArr, ...remaining];
}

// ── Warnings builder ──────────────────────────────────────────────────────────
// Surfaces warnings from active situations + high-severity playbook risks.
function buildWarnings(playbook, context) {
  const warnings = [];

  // Situation warnings (highest priority)
  for (const sitId of (context.situations || [])) {
    const sit = SITUATION_TYPES.find((s) => s.id === sitId);
    if (sit) warnings.push({ id: sitId, type: 'situation', label: sit.label, severity: sit.severity, surface: sit.surface });
  }

  // High-severity playbook risks (only in execution + monitoring phases)
  if (['execution', 'monitoring', 'setup'].includes(context.phase)) {
    for (const risk of (playbook.risks || [])) {
      if (risk.severity === 'high' && !warnings.find((w) => w.id === risk.id)) {
        warnings.push({ id: risk.id, type: 'risk', label: risk.trigger, severity: risk.severity, mitigation: risk.mitigation });
      }
    }
  }

  return warnings;
}

// ── Task filter ───────────────────────────────────────────────────────────────
// tasks[].label, tasks[].phase, tasks[].milestoneId, tasks[].when, tasks[].whenChoice
function filterTasksForContext(tasks, context) {
  if (!tasks.length) return [];
  const { role, phase } = context;

  return tasks.filter((t) => {
    // Milestone tasks with a phase tag: match to current phase
    if (t.phase && t.phase !== phase) return false;

    // Tasks with whenChoice that depends on a decision: show in planning/booking
    if (t.whenChoice && !['planning', 'research', 'booking'].includes(phase)) return false;

    return true;
  }).map((t) => ({
    id: t.id,
    label: t.label,
    phase: t.phase,
    milestoneId: t.milestoneId,
    when: t.when,
    role,
  }));
}

// ── Shopping filter ────────────────────────────────────────────────────────────
// purchases[].id, item, category, essential, buyAt, qtyPerGuest, qtyFlat, unitCostRange, provenance
function filterShoppingForContext(purchases, context) {
  if (!purchases.length) return [];
  const { role, phase, eventState } = context;
  const guestCount = eventState?.guestCount || null;

  const relevant = purchases.filter((p) => {
    // Food items: host + caterer always see them
    if (p.category === 'food') {
      if (!['host', 'caterer', 'planner', 'coordinator'].includes(role)) return false;
    }
    // Essential items always surface in purchasing/preparation
    if (p.essential && ['purchasing', 'preparation'].includes(phase)) return true;
    // Show all items to host/caterer in purchasing phase
    if (['host', 'caterer'].includes(role) && phase === 'purchasing') return true;
    // Planner/coordinator see all
    if (['planner', 'coordinator'].includes(role)) return true;
    return false;
  });

  return relevant.map((p) => {
    const qty = guestCount
      ? (p.qtyPerGuest ? Math.ceil(p.qtyPerGuest * guestCount) : p.qtyFlat || null)
      : null;
    return {
      id: p.id,
      item: p.item,
      category: p.category,
      essential: p.essential,
      qty,
      unit: p.unit,
      unitCostRange: p.unitCostRange,
      where: p.where,
      buyAt: p.buyAt,
      alternatives: p.alternatives,
      provenance: p.provenance,
    };
  });
}

// ── Risk filter ────────────────────────────────────────────────────────────────
// risks[].id, trigger, severity, mitigation
function filterRisksForContext(risks, context) {
  if (!risks.length) return [];
  const { role, phase } = context;

  return risks.filter((r) => {
    // High severity always shows for roles responsible for contingency planning
    if (r.severity === 'high') return true;
    // Med severity: coordinator, planner, operations see them
    if (r.severity === 'med' && ['coordinator', 'planner', 'operations', 'host'].includes(role)) return true;
    // Low severity: only planner/coordinator
    if (r.severity === 'low' && ['planner', 'coordinator'].includes(role)) return true;
    return false;
  }).map((r) => ({
    id: r.id,
    trigger: r.trigger,
    severity: r.severity,
    mitigation: r.mitigation,
  }));
}

// ── Contingency linker ────────────────────────────────────────────────────────
// Links contingency plans to their triggering risk IDs (risks[].id === contingencies[].when)
function filterContingenciesForContext(playbook, context, activeRisks) {
  const contingencies = playbook.contingencies || [];
  const riskIds = new Set(activeRisks.map((r) => r.id));
  return contingencies.filter((c) => riskIds.has(c.when));
}

// ── Milestone filter ──────────────────────────────────────────────────────────
// milestones[].id, name, offsetDays, owner, category, dependsOn, risk
function filterMilestonesForContext(milestones, context) {
  if (!milestones.length) return [];
  const { role, eventState } = context;
  const daysToEvent = eventState?.daysToEvent;

  return milestones.filter((m) => {
    // Milestones owned by the current role always surface
    if (m.owner === role) return true;
    // Planner/coordinator see all
    if (['planner', 'coordinator'].includes(role)) return true;
    // Host sees host-owned + near-term milestones
    if (role === 'host' && daysToEvent !== null && m.offsetDays <= daysToEvent + 3) return true;
    return false;
  }).map((m) => ({
    id: m.id,
    name: m.name,
    offsetDays: m.offsetDays,
    owner: m.owner,
    category: m.category,
    dependsOn: m.dependsOn,
    risk: m.risk,
  }));
}

// ── Actions builder ────────────────────────────────────────────────────────────
// Primary CTAs for this role+phase — derived from phase primary surfaces
function buildActions(playbook, context) {
  const { role, phase } = context;
  const phaseInfo = PHASES[phase];
  const primary = phaseInfo?.primary || [];
  const actions = [];

  if (primary.includes('shopping') || primary.includes('food')) {
    const essentials = (playbook.purchases || []).filter((p) => p.essential);
    if (essentials.length) actions.push({ id: 'buy-essentials', label: `Buy ${essentials.length} essential item${essentials.length > 1 ? 's' : ''}`, section: 'shopping', phase });
  }
  if (primary.includes('timeline')) {
    const tasks = (playbook.tasks || []);
    if (tasks.length) actions.push({ id: 'check-timeline', label: `Review today's timeline`, section: 'timeline', phase });
  }
  if (primary.includes('contingencies')) {
    const contingencies = (playbook.contingencies || []);
    if (contingencies.length) actions.push({ id: 'check-contingencies', label: 'Check contingency plans', section: 'contingencies', phase });
  }
  if (primary.includes('decisions') || primary.includes('budget')) {
    const decisions = resolveDecisions(playbook, context);
    if (decisions.length) actions.push({ id: 'resolve-decisions', label: `Resolve ${decisions.length} pending decision${decisions.length > 1 ? 's' : ''}`, section: 'decisions', phase });
  }

  return actions.slice(0, 3);
}

// ── Recommendation explainer (Bundle H) ────────────────────────────────────────
// Wraps any playbook item with a plain-language confidence explanation.
// Never exposes raw internals; always explains naturally.
export function explainRecommendation(item, context) {
  if (!item) return null;
  const prov = item.provenance || item.costFactorProvenance || {};
  const sources = prov.sources || [];
  return {
    headline: item.label || item.item || item.name || 'Recommendation',
    because: item.why || item.note || 'Based on standard practice for this event type.',
    evidence: sources.length ? sources.join(', ') : 'Synthesized from playbook knowledge',
    freshness: prov.researchedAt || 'Not recently verified',
    confidence: prov.confidence || prov.tier || 'synthesized',
    scope: context.scope ? `${context.scope.region} / ${context.scope.season || 'any season'}` : 'national (US)',
    canOverride: true,
    validationState: prov.verificationStatus || 'synthesized',
  };
}

// ── Adaptive feed builder (Bundle G) ──────────────────────────────────────────
// Converts composed experience into a prioritized, role-appropriate feed.
// The feed replaces menus: surface the most important decision first, always.
export function buildAdaptiveFeed(composed) {
  const items = [];

  // 1. Critical warnings first (situation = urgent)
  for (const w of (composed.warnings || [])) {
    if (w.severity === 'critical' || w.severity === 'high') {
      items.push({ type: 'warning', priority: w.severity === 'critical' ? 0 : 1, ...w });
    }
  }

  // 2. Most blocking decision
  if (composed.topDecision) {
    items.push({
      type: 'decision',
      priority: 2,
      id: composed.topDecision.id,
      title: composed.topDecision.label,
      why: composed.topDecision.why,
      options: composed.topDecision.options,
      default: composed.topDecision.default,
    });
  }

  // 3. Primary actions (phase-appropriate CTAs)
  for (const a of (composed.actions || []).slice(0, 2)) {
    items.push({ type: 'action', priority: 3, ...a });
  }

  // 4. Upcoming risks (med severity)
  for (const r of (composed.risks || []).filter((r) => r.severity === 'high').slice(0, 2)) {
    items.push({ type: 'risk', priority: 4, id: r.id, title: r.trigger, mitigation: r.mitigation });
  }

  // 5. Med warnings
  for (const w of (composed.warnings || []).filter((w) => w.severity === 'med')) {
    items.push({ type: 'warning', priority: 5, ...w });
  }

  // 6. Upcoming milestones (next 3)
  for (const m of (composed.milestones || []).slice(0, 3)) {
    items.push({ type: 'milestone', priority: 6, id: m.id, title: m.name, offsetDays: m.offsetDays });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

// ── Core composition engine (Bundle F) ────────────────────────────────────────
// Assembles the full experience from canonical playbook data + context.
// Returns a projection descriptor — a map of what the screen should render.
// NEVER copies playbook objects. Every item is a lightweight projection reference.
export function composeExperience(playbook, context) {
  if (!playbook || !context) return null;

  const decisions = resolveDecisions(playbook, context);
  const topDecision = rankDecisions(decisions, context.situations);
  const warnings = buildWarnings(playbook, context);
  const risks = filterRisksForContext(playbook.risks || [], context);
  const tasks = filterTasksForContext(playbook.tasks || [], context);
  const shopping = filterShoppingForContext(playbook.purchases || [], context);
  const milestones = filterMilestonesForContext(playbook.milestones || [], context);
  const contingencies = filterContingenciesForContext(playbook, context, risks);
  const actions = buildActions(playbook, context);

  // Top recommendations = first 5 resolved decisions with explanations
  const recommendations = decisions.slice(0, 5).map((d) => ({
    id: d.id,
    label: d.label,
    options: d.options,
    default: d.default,
    why: d.why,
    explanation: explainRecommendation(d, context),
  }));

  const sectionOrder = adaptiveUIRules(context.role, context.phase, context.situations);

  return {
    decisions,
    topDecision,
    warnings,
    risks,
    tasks,
    shopping,
    milestones,
    contingencies,
    actions,
    recommendations,
    sectionOrder,
  };
}
