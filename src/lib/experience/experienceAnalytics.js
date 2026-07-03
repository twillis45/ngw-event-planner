// ─── Experience Analytics (XIP-1 Bundle I) ────────────────────────────────────
// Thin event store + dimensional analysis. Records how the experience layer is
// being consumed: decision latency, recommendation usage, override frequency,
// navigation friction, phase transitions, role differences.
// No single experience score. Everything dimensional.

const KEY = 'ngw-xip-events';

// ── Event types ────────────────────────────────────────────────────────────────
export const EXPERIENCE_EVENT_TYPES = [
  'decision-viewed',      // a decision surfaced in the feed/section
  'decision-resolved',    // user made a decision selection
  'recommendation-used',  // user acted on a recommendation
  'recommendation-ignored', // user dismissed/skipped a recommendation
  'override-applied',     // user overrode a knowledge value
  'override-reverted',    // user reverted to canonical
  'phase-transition',     // experience phase changed
  'role-switch',          // user switched role in simulation
  'situation-triggered',  // a situation was detected
  'situation-cleared',    // a situation was resolved
  'section-viewed',       // user navigated to a section
  'feed-item-tapped',     // user tapped a feed item
  'navigation-friction',  // user could not find what they needed
  'shopping-completed',   // shopping list item purchased
  'task-completed',       // task marked done
];

// ── Event shape ────────────────────────────────────────────────────────────────
export function createExperienceEvent({
  type, role, phase, situation = null, workspace = null,
  targetId = null, targetType = null, data = {}, at,
}) {
  return Object.freeze({
    id: `xev-${String(at || '').replace(/\D/g, '').slice(0, 12)}-${Math.floor(Math.random() * 9999)}`,
    type, role, phase, situation, workspace, targetId, targetType, data,
    at: at || new Date().toISOString().slice(0, 10),
  });
}

// ── Store ──────────────────────────────────────────────────────────────────────
export function loadExperienceEvents() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveExperienceEvents(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list || [])); return true; } catch { return false; }
}
export function recordExperienceEvent(event) {
  const list = loadExperienceEvents();
  list.push(event);
  saveExperienceEvents(list);
  return list;
}
export function clearExperienceEvents() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

// ── Analysis (Bundle I) ────────────────────────────────────────────────────────
// Returns dimensional analysis of experience events. Never a single score.
export function analyzeExperience(events = []) {
  if (!events.length) return {
    total: 0, byType: {}, byRole: {}, byPhase: {}, bySituation: {},
    decisionLatency: [], recommendationUsage: {}, overrideFrequency: {},
    navigationFriction: 0, phaseTransitions: [], roleDistribution: {},
  };

  const byType = events.reduce((m, e) => { m[e.type] = (m[e.type] || 0) + 1; return m; }, {});
  const byRole = events.reduce((m, e) => { m[e.role] = (m[e.role] || 0) + 1; return m; }, {});
  const byPhase = events.reduce((m, e) => { m[e.phase] = (m[e.phase] || 0) + 1; return m; }, {});
  const bySituation = events.filter((e) => e.situation)
    .reduce((m, e) => { m[e.situation] = (m[e.situation] || 0) + 1; return m; }, {});

  // Decision latency: time between decision-viewed and decision-resolved for the same targetId
  const decisionViewed = events.filter((e) => e.type === 'decision-viewed');
  const decisionResolved = events.filter((e) => e.type === 'decision-resolved');
  const decisionLatency = decisionViewed
    .map((v) => {
      const resolved = decisionResolved.find((r) => r.targetId === v.targetId && r.at >= v.at);
      if (!resolved) return null;
      return { targetId: v.targetId, role: v.role, phase: v.phase, viewedAt: v.at, resolvedAt: resolved.at };
    })
    .filter(Boolean);

  // Recommendation usage: used vs ignored
  const recUsed = byType['recommendation-used'] || 0;
  const recIgnored = byType['recommendation-ignored'] || 0;
  const recommendationUsage = {
    used: recUsed, ignored: recIgnored,
    usageRate: recUsed + recIgnored > 0 ? Math.round(recUsed / (recUsed + recIgnored) * 100) : null,
  };

  // Override frequency: overrides applied vs reverted
  const overrides = byType['override-applied'] || 0;
  const reverts = byType['override-reverted'] || 0;
  const overrideFrequency = { applied: overrides, reverted: reverts, netOverrides: overrides - reverts };

  // Navigation friction count
  const navigationFriction = byType['navigation-friction'] || 0;

  // Phase transitions (ordered)
  const phaseTransitions = events
    .filter((e) => e.type === 'phase-transition')
    .map((e) => ({ from: e.data?.from, to: e.data?.to, role: e.role, at: e.at }));

  // Role distribution: how many events per role as % of total
  const roleDistribution = Object.entries(byRole).reduce((m, [role, count]) => {
    m[role] = { count, pct: Math.round(count / events.length * 100) };
    return m;
  }, {});

  return {
    total: events.length,
    byType, byRole, byPhase, bySituation,
    decisionLatency, recommendationUsage, overrideFrequency,
    navigationFriction, phaseTransitions, roleDistribution,
  };
}
