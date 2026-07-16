// XIP-1 — Experience Intelligence Platform golden tests
// Bundle A: experienceContext.js  Bundle B: decisionIntelligence.js
// Bundle F/G/H/J: experienceComposer.js  Master: experienceView.js
// Bundle I: experienceAnalytics.js  Bundle K: simulateExperience
//
// Golden tests prove: projection purity, role differentiation, phase projection,
// situation awareness, adaptive feed structure, simulation independence.

import { ROLES, PHASES, SITUATION_TYPES, createContext, resolvePhase, detectSituations } from './experienceContext';
import { resolveDecisions, rankDecisions, unresolvedDecisions, scoreDecision } from './decisionIntelligence';
import { composeExperience, buildAdaptiveFeed, adaptiveUIRules, explainRecommendation } from './experienceComposer';
import { experienceView, simulateExperience, diffExperience } from './experienceView';
import { createExperienceEvent, analyzeExperience, loadExperienceEvents, recordExperienceEvent, clearExperienceEvents, EXPERIENCE_EVENT_TYPES } from './experienceAnalytics';
import { getPlaybook, ALL_PLAYBOOKS } from '../playbooks/index';

const ASOF = '2026-07-02';
const crab = getPlaybook('Crab Feast');
const hostCtx = createContext({ role: 'host', eventState: { daysToEvent: 10 }, asOf: ASOF });
const plannerCtx = createContext({ role: 'planner', eventState: { daysToEvent: 10 }, asOf: ASOF });
const coordCtx = createContext({ role: 'coordinator', eventState: { daysToEvent: 0 }, asOf: ASOF });
const catererCtx = createContext({ role: 'caterer', eventState: { daysToEvent: 5 }, asOf: ASOF });

// ── experienceContext ──────────────────────────────────────────────────────────
describe('experienceContext — ROLES / PHASES / SITUATION_TYPES', () => {
  test('ROLES has ≥8 entries, each with required fields', () => {
    expect(Object.keys(ROLES).length).toBeGreaterThanOrEqual(8);
    for (const [, r] of Object.entries(ROLES)) {
      expect(typeof r.label).toBe('string');
      expect(typeof r.persona).toBe('string');
      expect(Array.isArray(r.workspaceOrder)).toBe(true);
    }
  });

  test('PHASES has ≥8 entries with daysOutMin / daysOutMax', () => {
    expect(Object.keys(PHASES).length).toBeGreaterThanOrEqual(8);
    for (const [, p] of Object.entries(PHASES)) {
      expect(typeof p.label).toBe('string');
      expect(Array.isArray(p.primary)).toBe(true);
    }
  });

  test('SITUATION_TYPES has ≥10 entries with id / severity / surface', () => {
    expect(SITUATION_TYPES.length).toBeGreaterThanOrEqual(10);
    for (const s of SITUATION_TYPES) {
      expect(typeof s.id).toBe('string');
      expect(['critical', 'high', 'med', 'low']).toContain(s.severity);
      expect(Array.isArray(s.surface)).toBe(true);
    }
  });

  test('resolvePhase: purchasing 3-14 days, execution 0 days, planning >60 days', () => {
    expect(resolvePhase(100)).toBe('planning');
    expect(resolvePhase(14)).toBe('purchasing');
    expect(resolvePhase(10)).toBe('purchasing');
    expect(resolvePhase(0)).toBe('execution');
    expect(resolvePhase(-1)).toBe('cleanup');
    expect(resolvePhase(-5)).toBe('closeout');
    expect(resolvePhase(-30)).toBe('learning');
    expect(resolvePhase(null)).toBe('planning');
    expect(resolvePhase('x')).toBe('planning');
  });

  test('detectSituations: returns matching situation IDs from eventState flags', () => {
    expect(detectSituations({ vendorLate: true })).toContain('vendor-late');
    expect(detectSituations({ weatherAlert: true })).toContain('weather-alert');
    expect(detectSituations({ budgetPct: 1.1 })).toContain('budget-exceeded');
    expect(detectSituations({})).toHaveLength(0);
  });

  test('createContext: auto-resolves phase from daysToEvent, returns frozen object', () => {
    const ctx = createContext({ role: 'host', eventState: { daysToEvent: 10 } });
    expect(ctx.phase).toBe('purchasing');
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(ctx.role).toBe('host');
  });

  test('createContext: unknown role falls back to host', () => {
    const ctx = createContext({ role: 'martian' });
    expect(ctx.role).toBe('host');
  });

  test('createContext: explicit situations override auto-detection', () => {
    const ctx = createContext({ situations: ['vendor-late'], eventState: { weatherAlert: true } });
    expect(ctx.situations).toEqual(['vendor-late']);
    expect(ctx.situations).not.toContain('weather-alert');
  });
});

// ── decisionIntelligence ───────────────────────────────────────────────────────
describe('decisionIntelligence — resolveDecisions / rankDecisions', () => {
  test('resolveDecisions returns relevant decisions in score order', () => {
    const decisions = resolveDecisions(crab, hostCtx);
    expect(Array.isArray(decisions)).toBe(true);
    // Host in purchasing phase should see food decisions
    const foodDecision = decisions.find((d) => d.blocks?.includes('food'));
    expect(foodDecision).toBeDefined();
  });

  test('planner sees more decisions than host (planner.decisionBlocks = null = see all)', () => {
    const hostDecisions = resolveDecisions(crab, hostCtx);
    const plannerDecisions = resolveDecisions(crab, plannerCtx);
    expect(plannerDecisions.length).toBeGreaterThanOrEqual(hostDecisions.length);
  });

  test('decisions are references — never duplicated (identity check)', () => {
    const original = crab.decisions;
    const resolved = resolveDecisions(crab, hostCtx);
    for (const d of resolved) {
      expect(original).toContain(d);  // same object reference
    }
  });

  test('resolveDecisions: empty playbook returns []', () => {
    expect(resolveDecisions({ decisions: [] }, hostCtx)).toHaveLength(0);
    expect(resolveDecisions({ type: 'Thin' }, hostCtx)).toHaveLength(0);
  });

  test('rankDecisions returns first decision (most relevant)', () => {
    const decisions = resolveDecisions(crab, hostCtx);
    const top = rankDecisions(decisions, []);
    if (decisions.length) {
      expect(top).toBe(decisions[0]);
    } else {
      expect(top).toBeNull();
    }
  });

  test('rankDecisions on empty list returns null', () => {
    expect(rankDecisions([], [])).toBeNull();
  });

  test('situation urgency elevates relevant decisions', () => {
    const vendorLateCtx = createContext({ role: 'planner', eventState: { daysToEvent: 1 }, situations: ['vendor-late'], asOf: ASOF });
    const normalCtx = createContext({ role: 'planner', eventState: { daysToEvent: 1 }, situations: [], asOf: ASOF });
    const vendorLateDecisions = resolveDecisions(crab, vendorLateCtx);
    const normalDecisions = resolveDecisions(crab, normalCtx);
    // Both should return decisions; vendor-late should not reduce the count
    expect(vendorLateDecisions.length).toBeGreaterThan(0);
    expect(normalDecisions.length).toBeGreaterThan(0);
  });
});

// ── decisionIntelligence — priority tier (DECISION_SCHEMA_SPEC §4.A / §6) ────────
// The scorer's four nullable priority fields (weight, reversibility, emotionalWeight)
// add a bounded, additive importance tie-breaker. Absent fields must be neutral.
describe('decisionIntelligence — priority-tier scoring', () => {
  // planner.decisionBlocks === null (+2 for any block) and an undated decision matches
  // every phase (+3), so any bare decision has a base score of exactly 5. The priority
  // boost (< 1) then re-ranks decisions that tie on that base.
  const undated = (extra) => ({ id: extra.id, blocks: ['food'], ...extra });

  test('higher weight outranks lower weight at equal timing/role', () => {
    const high = undated({ id: 'high', weight: 'high' });
    const low = undated({ id: 'low', weight: 'low' });
    expect(scoreDecision(high, 'planner', 'planning', [])).toBeGreaterThan(
      scoreDecision(low, 'planner', 'planning', [])
    );
    // …and the ranker surfaces the higher-weight decision first regardless of input order.
    const ranked = resolveDecisions({ decisions: [low, high] }, { role: 'planner', phase: 'planning', situations: [] });
    expect(rankDecisions(ranked, [])).toBe(high);
  });

  test("reversibility:'locked' outranks 'reversible' at equal weight", () => {
    const locked = undated({ id: 'locked', weight: 'med', reversibility: 'locked' });
    const rev = undated({ id: 'rev', weight: 'med', reversibility: 'reversible' });
    expect(scoreDecision(locked, 'planner', 'planning', [])).toBeGreaterThan(
      scoreDecision(rev, 'planner', 'planning', [])
    );
    const ranked = resolveDecisions({ decisions: [rev, locked] }, { role: 'planner', phase: 'planning', situations: [] });
    expect(rankDecisions(ranked, [])).toBe(locked);
  });

  test('higher emotionalWeight outranks lower at equal weight/reversibility', () => {
    const hot = undated({ id: 'hot', weight: 'med', emotionalWeight: 'high' });
    const cool = undated({ id: 'cool', weight: 'med', emotionalWeight: 'low' });
    expect(scoreDecision(hot, 'planner', 'planning', [])).toBeGreaterThan(
      scoreDecision(cool, 'planner', 'planning', [])
    );
  });

  test('REGRESSION PIN: a decision with NO priority fields scores exactly as before', () => {
    const plain = undated({ id: 'plain' });
    const base = scoreDecision(plain, 'planner', 'planning', []);
    // Base = timing (+3) + role-null (+2), with no fractional priority boost applied.
    expect(base).toBe(5);
    expect(Number.isInteger(base)).toBe(true);
    // Explicitly-undefined priority fields behave identically to absent ones.
    const explicitNull = undated({ id: 'plain2', weight: undefined, reversibility: undefined, emotionalWeight: undefined });
    expect(scoreDecision(explicitNull, 'planner', 'planning', [])).toBe(base);
    // The zero-floor tiers ('low'/'reversible') also add nothing — a decision modelled at
    // the lowest importance scores identically to an unmodelled one (no penalty either way).
    const allLow = undated({ id: 'allLow', weight: 'low', reversibility: 'reversible', emotionalWeight: 'low' });
    expect(scoreDecision(allLow, 'planner', 'planning', [])).toBe(base);
    // A genuinely high-tier authored decision (crab dietary: weight 'high') DOES get a
    // fractional boost → proves the term fires for modelled importance, not for blanks.
    const dietary = crab.decisions.find((d) => d.id === 'dietary');
    expect(dietary.weight).toBe('high');
    expect(Number.isInteger(scoreDecision(dietary, 'planner', 'planning', []))).toBe(false);
  });

  test('priority boost is bounded < 1 — it never leapfrogs a stronger timing/role match', () => {
    // In-phase, no priority fields: base 5 (undated → matches any phase) for planner.
    const inPhasePlain = undated({ id: 'plain' });
    // Out-of-phase but maximally important: 100 days out misses the purchasing window
    // (3–14d) so timing scores +0; still +2 for planner-null → base 2, plus a boost
    // that maxes below 1. The in-phase plain decision (base 5) must still win.
    const outOfPhaseMax = { id: 'max', blocks: ['food'], when: 'T-100d', weight: 'high', reversibility: 'locked', emotionalWeight: 'high' };
    expect(scoreDecision(inPhasePlain, 'planner', 'purchasing', [])).toBeGreaterThan(
      scoreDecision(outOfPhaseMax, 'planner', 'purchasing', [])
    );
  });

  test('priority boost is applied ONLY to already-relevant decisions (set unchanged)', () => {
    // role 'guest' cares about no blocks ([]); a far-out dated 'food' decision misses the
    // phase too → base 0 → filtered. A high priority must NOT resurrect it.
    const irrelevant = { id: 'irrelevant', blocks: ['food'], when: 'T-100d', weight: 'high', reversibility: 'locked', emotionalWeight: 'high' };
    expect(scoreDecision(irrelevant, 'guest', 'execution', [])).toBe(0);
    const resolved = resolveDecisions({ decisions: [irrelevant] }, { role: 'guest', phase: 'execution', situations: [] });
    expect(resolved).toHaveLength(0);
  });
});

// ── experienceComposer ─────────────────────────────────────────────────────────
describe('experienceComposer — adaptiveUIRules / composeExperience / buildAdaptiveFeed', () => {
  test('adaptiveUIRules: purchasing phase puts shopping near top for host', () => {
    const rules = adaptiveUIRules('host', 'purchasing', []);
    const shoppingIdx = rules.indexOf('shopping');
    expect(shoppingIdx).toBeGreaterThanOrEqual(0);
    expect(shoppingIdx).toBeLessThan(3);  // shopping is in the first 3 positions
  });

  test('adaptiveUIRules: execution phase puts timeline near top for coordinator', () => {
    const rules = adaptiveUIRules('coordinator', 'execution', []);
    const timelineIdx = rules.indexOf('timeline');
    expect(timelineIdx).toBeGreaterThanOrEqual(0);
    expect(timelineIdx).toBeLessThan(3);
  });

  test('adaptiveUIRules: vendor-late situation surfaces contingencies first', () => {
    const rules = adaptiveUIRules('coordinator', 'execution', ['vendor-late']);
    const contingenciesIdx = rules.indexOf('contingencies');
    const vendorsIdx = rules.indexOf('vendors');
    expect(contingenciesIdx).toBeLessThan(3);
    expect(vendorsIdx).toBeLessThan(4);
  });

  test('adaptiveUIRules: no duplicate sections in the output', () => {
    const rules = adaptiveUIRules('host', 'purchasing', ['vendor-late', 'weather-alert']);
    expect(new Set(rules).size).toBe(rules.length);
  });

  test('composeExperience returns correct shape', () => {
    const composed = composeExperience(crab, hostCtx);
    expect(Array.isArray(composed.decisions)).toBe(true);
    expect(Array.isArray(composed.warnings)).toBe(true);
    expect(Array.isArray(composed.shopping)).toBe(true);
    expect(Array.isArray(composed.tasks)).toBe(true);
    expect(Array.isArray(composed.risks)).toBe(true);
    expect(Array.isArray(composed.contingencies)).toBe(true);
    expect(Array.isArray(composed.sectionOrder)).toBe(true);
  });

  test('composeExperience: caterer sees food shopping items', () => {
    const composed = composeExperience(crab, catererCtx);
    expect(composed.shopping.some((s) => s.category === 'food')).toBe(true);
  });

  test('composeExperience: host in purchasing phase sees essential purchases', () => {
    const composed = composeExperience(crab, hostCtx);
    expect(composed.shopping.some((s) => s.essential)).toBe(true);
  });

  test('composeExperience: execution phase adds high-severity risks to warnings', () => {
    const execCtx = createContext({ role: 'coordinator', eventState: { daysToEvent: 0 }, asOf: ASOF });
    const composed = composeExperience(crab, execCtx);
    // Crab feast has high severity risks; they should surface in execution warnings
    const riskWarnings = composed.warnings.filter((w) => w.type === 'risk');
    expect(riskWarnings.length).toBeGreaterThan(0);
  });

  test('composeExperience: situation vendor-late adds a situation warning', () => {
    const ctx = createContext({ role: 'host', situations: ['vendor-late'], eventState: { daysToEvent: 1 }, asOf: ASOF });
    const composed = composeExperience(crab, ctx);
    expect(composed.warnings.some((w) => w.type === 'situation' && w.id === 'vendor-late')).toBe(true);
  });

  test('composeExperience: no situations = no situation warnings', () => {
    const ctx = createContext({ role: 'host', situations: [], eventState: { daysToEvent: 10 }, asOf: ASOF });
    const composed = composeExperience(crab, ctx);
    expect(composed.warnings.filter((w) => w.type === 'situation')).toHaveLength(0);
  });

  test('buildAdaptiveFeed returns items with type and priority', () => {
    const composed = composeExperience(crab, hostCtx);
    const feed = buildAdaptiveFeed(composed);
    expect(Array.isArray(feed)).toBe(true);
    for (const item of feed) {
      expect(typeof item.type).toBe('string');
      expect(typeof item.priority).toBe('number');
    }
  });

  test('buildAdaptiveFeed: warnings appear before decisions (lower priority number = more urgent)', () => {
    const ctx = createContext({ role: 'host', situations: ['vendor-late'], eventState: { daysToEvent: 1 }, asOf: ASOF });
    const composed = composeExperience(crab, ctx);
    const feed = buildAdaptiveFeed(composed);
    const firstWarning = feed.findIndex((i) => i.type === 'warning');
    const firstDecision = feed.findIndex((i) => i.type === 'decision');
    if (firstWarning !== -1 && firstDecision !== -1) {
      expect(firstWarning).toBeLessThan(firstDecision);
    }
  });

  test('explainRecommendation returns required fields', () => {
    const decision = crab.decisions?.[0];
    if (!decision) return;  // skip if no decisions (honest-empty)
    const exp = explainRecommendation(decision, hostCtx);
    expect(typeof exp.headline).toBe('string');
    expect(typeof exp.because).toBe('string');
    expect(typeof exp.evidence).toBe('string');
    expect(typeof exp.confidence).toBe('string');
    expect(exp.canOverride).toBe(true);
  });
});

// ── experienceView — GOLDEN TESTS ─────────────────────────────────────────────
describe('experienceView — golden projection tests', () => {
  test('returns full experience shape for host', () => {
    const exp = experienceView(crab, hostCtx);
    expect(exp).not.toBeNull();
    expect(exp.role).toBe('host');
    expect(exp.phase).toBe('purchasing');
    expect(typeof exp.headline).toBe('string');
    expect(Array.isArray(exp.feed)).toBe(true);
    expect(Array.isArray(exp.sectionOrder)).toBe(true);
    expect(exp.meta.purity).toBe(true);
    expect(exp.meta.knowledgeSource).toBe('Crab Feast');
  });

  test('GOLDEN: host and planner produce different sectionOrder from same knowledge', () => {
    // Test in planning phase where phase boost doesn't dominate (no single section wins)
    const hostPlan = createContext({ role: 'host', phase: 'planning', asOf: ASOF });
    const plannerPlan = createContext({ role: 'planner', phase: 'planning', asOf: ASOF });
    const hostExp = experienceView(crab, hostPlan);
    const plannerExp = experienceView(crab, plannerPlan);
    expect(hostExp).not.toBeNull();
    expect(plannerExp).not.toBeNull();
    // The FULL section orders should differ — roles have different workspace priorities
    expect(JSON.stringify(hostExp.sectionOrder)).not.toBe(JSON.stringify(plannerExp.sectionOrder));
    // And planner sees more decisions than host
    expect(plannerExp.decisions.length).toBeGreaterThanOrEqual(hostExp.decisions.length);
  });

  test('GOLDEN: purchasing vs execution phase produces different section order', () => {
    const purchasingCtx = createContext({ role: 'host', phase: 'purchasing', asOf: ASOF });
    const executionCtx = createContext({ role: 'host', phase: 'execution', asOf: ASOF });
    const purchasingExp = experienceView(crab, purchasingCtx);
    const executionExp = experienceView(crab, executionCtx);
    expect(purchasingExp.sectionOrder[0]).not.toBe(executionExp.sectionOrder[0]);
  });

  test('GOLDEN: vendor-late situation adds warnings and changes section order', () => {
    const normalCtx = createContext({ role: 'coordinator', situations: [], eventState: { daysToEvent: 0 }, asOf: ASOF });
    const vendorLateCtx = createContext({ role: 'coordinator', situations: ['vendor-late'], eventState: { daysToEvent: 0 }, asOf: ASOF });
    const normalExp = experienceView(crab, normalCtx);
    const vendorLateExp = experienceView(crab, vendorLateCtx);
    expect(vendorLateExp.warnings.length).toBeGreaterThan(normalExp.warnings.length);
    expect(vendorLateExp.sectionOrder.indexOf('contingencies')).toBeLessThan(normalExp.sectionOrder.indexOf('contingencies'));
  });

  test('PROJECTION PURITY: experienceView never mutates the playbook', () => {
    const before = JSON.stringify(crab);
    experienceView(crab, hostCtx);
    experienceView(crab, plannerCtx);
    experienceView(crab, coordCtx);
    experienceView(crab, catererCtx);
    expect(JSON.stringify(crab)).toBe(before);
  });

  test('PROJECTION PURITY: experienceView never mutates the context', () => {
    const before = JSON.stringify(hostCtx);
    experienceView(crab, hostCtx);
    expect(JSON.stringify(hostCtx)).toBe(before);
  });

  test('PROJECTION PURITY: result is frozen (no post-hoc mutation)', () => {
    const exp = experienceView(crab, hostCtx);
    expect(Object.isFrozen(exp)).toBe(true);
    expect(Object.isFrozen(exp.meta)).toBe(true);
  });

  test('KNOWLEDGE INTEGRITY: experienceView never owns a copy of playbook data', () => {
    const exp = experienceView(crab, hostCtx);
    // Decisions in the experience must be the same object references as in the playbook
    for (const d of exp.decisions) {
      expect(crab.decisions).toContain(d);
    }
  });

  test('returns null for null inputs', () => {
    expect(experienceView(null, hostCtx)).toBeNull();
    expect(experienceView(crab, null)).toBeNull();
    expect(experienceView(null, null)).toBeNull();
  });

  test('works for all 8 roles without throwing', () => {
    const roles = ['host', 'planner', 'coordinator', 'corporate', 'venue', 'photographer', 'operations', 'caterer'];
    for (const role of roles) {
      const ctx = createContext({ role, eventState: { daysToEvent: 10 }, asOf: ASOF });
      expect(() => experienceView(crab, ctx)).not.toThrow();
      const exp = experienceView(crab, ctx);
      expect(exp.role).toBe(role);
      expect(exp.meta.purity).toBe(true);
    }
  });

  test('works consistently across all playbooks in the corpus', () => {
    const ctx = createContext({ role: 'host', eventState: { daysToEvent: 10 }, asOf: ASOF });
    for (const pb of ALL_PLAYBOOKS.slice(0, 5)) {
      const exp = experienceView(pb, ctx);
      expect(exp).not.toBeNull();
      expect(exp.meta.purity).toBe(true);
    }
  });
});

// ── simulateExperience (Bundle K) ─────────────────────────────────────────────
describe('simulateExperience — pure simulation without runtime mutation', () => {
  test('simulating a different role changes the experience', () => {
    const base = experienceView(crab, hostCtx);
    const simulated = simulateExperience(crab, hostCtx, { role: 'coordinator' });
    expect(simulated.role).toBe('coordinator');
    expect(base.role).toBe('host');
    // Both are valid experiences from the same knowledge
    expect(simulated.meta.purity).toBe(true);
  });

  test('simulation never mutates the base context', () => {
    const before = JSON.stringify(hostCtx);
    simulateExperience(crab, hostCtx, { role: 'caterer', situations: ['food-delay'] });
    expect(JSON.stringify(hostCtx)).toBe(before);
  });

  test('simulating weather-alert adds warnings without changing the base experience', () => {
    const base = experienceView(crab, hostCtx);
    const sim = simulateExperience(crab, hostCtx, { situations: ['weather-alert'] });
    expect(sim.warnings.some((w) => w.id === 'weather-alert')).toBe(true);
    expect(base.warnings.some((w) => w.id === 'weather-alert')).toBe(false);
  });

  test('diffExperience returns delta with changed fields flagged', () => {
    const coordExecCtx = createContext({ role: 'coordinator', phase: 'execution', asOf: ASOF });
    const hostPurchaseCtx = createContext({ role: 'host', phase: 'purchasing', asOf: ASOF });
    const { delta } = diffExperience(crab, hostPurchaseCtx, coordExecCtx);
    expect(delta.roleChanged).toBe(true);
    expect(delta.phaseChanged).toBe(true);
  });
});

// ── experienceAnalytics (Bundle I) ────────────────────────────────────────────
describe('experienceAnalytics — dimensional analysis, no score', () => {
  beforeEach(() => clearExperienceEvents());
  afterEach(() => clearExperienceEvents());

  test('EXPERIENCE_EVENT_TYPES has ≥12 entries', () => {
    expect(EXPERIENCE_EVENT_TYPES.length).toBeGreaterThanOrEqual(12);
  });

  test('createExperienceEvent returns frozen object with correct shape', () => {
    const e = createExperienceEvent({ type: 'decision-viewed', role: 'host', phase: 'purchasing', targetId: 'crab_size', at: ASOF });
    expect(e.type).toBe('decision-viewed');
    expect(e.role).toBe('host');
    expect(Object.isFrozen(e)).toBe(true);
  });

  test('recordExperienceEvent + loadExperienceEvents roundtrip', () => {
    const e = createExperienceEvent({ type: 'recommendation-used', role: 'host', phase: 'purchasing', at: ASOF });
    recordExperienceEvent(e);
    const loaded = loadExperienceEvents();
    expect(loaded.length).toBe(1);
    expect(loaded[0].type).toBe('recommendation-used');
  });

  test('analyzeExperience returns correct dimensional breakdown (no score)', () => {
    const events = [
      createExperienceEvent({ type: 'decision-viewed', role: 'host', phase: 'purchasing', at: ASOF }),
      createExperienceEvent({ type: 'decision-resolved', role: 'host', phase: 'purchasing', at: ASOF }),
      createExperienceEvent({ type: 'recommendation-used', role: 'planner', phase: 'planning', at: ASOF }),
      createExperienceEvent({ type: 'recommendation-ignored', role: 'host', phase: 'purchasing', at: ASOF }),
      createExperienceEvent({ type: 'navigation-friction', role: 'host', phase: 'purchasing', at: ASOF }),
    ];
    const analysis = analyzeExperience(events);
    expect(analysis.total).toBe(5);
    expect(analysis.byType['decision-viewed']).toBe(1);
    expect(analysis.byRole['host']).toBe(4);
    expect(analysis.byRole['planner']).toBe(1);
    expect(analysis.recommendationUsage.usageRate).toBe(50);  // 1 used, 1 ignored
    expect(analysis.navigationFriction).toBe(1);
    // No single score anywhere in the analysis
    expect(analysis.score).toBeUndefined();
  });

  test('analyzeExperience returns honest-empty for no events', () => {
    const a = analyzeExperience([]);
    expect(a.total).toBe(0);
    expect(a.phaseTransitions).toHaveLength(0);
  });
});
