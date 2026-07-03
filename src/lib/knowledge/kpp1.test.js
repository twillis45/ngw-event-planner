// KPP-1 — Knowledge Production Platform tests
// Bundle A: domain.js, Bundle B: extended dimensions (coverage), Bundle D: failureIntelligence.js,
// "Powerful Primitive": knowledgeScope.js
// Guarantees: no fake scores, no auto-publish, no registry duplication, no invented data.

import {
  KNOWLEDGE_DOMAINS, getDomain, domainsForPlaybook, domainCoverage, domainResearch, generateDomainReport,
} from './domain';
import {
  FAILURE_CATEGORIES, FAILURE_SEVERITIES, FAILURE_SOURCES,
  createFailureRecord, failureToKCR, analyzeFailures,
  loadFailures, recordFailure, clearFailures,
} from './failureIntelligence';
import {
  REGIONS, SEASONS, BUDGET_TIERS, SCALE_TIERS,
  createScope, scopeFromDate, resolveScoped, scopeCoverage, corpusScopeCoverage,
} from './knowledgeScope';
import { evaluateAsset, DIMENSION_REGISTRY } from './dimensions';
import { getPlaybook, ALL_PLAYBOOKS } from '../playbooks/index';

const ASOF = '2026-07-02';
const crab = getPlaybook('Crab Feast');

// ── Bundle A — Knowledge Domains ───────────────────────────────────────────────
describe('Bundle A — Knowledge Domains', () => {
  test('KNOWLEDGE_DOMAINS has 7 domains', () => {
    expect(KNOWLEDGE_DOMAINS.length).toBe(7);
  });

  test('every domain has required fields', () => {
    for (const d of KNOWLEDGE_DOMAINS) {
      expect(typeof d.id).toBe('string');
      expect(typeof d.label).toBe('string');
      expect(typeof d.description).toBe('string');
      expect(Array.isArray(d.playbookTypes)).toBe(true);
      expect(d.playbookTypes.length).toBeGreaterThan(0);
      expect(['high', 'med', 'low']).toContain(d.researchPriority);
    }
  });

  test('getDomain returns domain or undefined', () => {
    expect(getDomain('outdoor-cooking')).toBeDefined();
    expect(getDomain('outdoor-cooking').label).toBe('Outdoor Cooking Events');
    expect(getDomain('nonexistent')).toBeUndefined();
  });

  test('domainsForPlaybook: Crab Feast resolves to outdoor-cooking domain', () => {
    const domains = domainsForPlaybook(crab);
    expect(domains.some((d) => d.id === 'outdoor-cooking')).toBe(true);
  });

  test('domainsForPlaybook: a playbook may belong to 0 or more domains', () => {
    const dinner = getPlaybook('Dinner Party');
    if (dinner) {
      const domains = domainsForPlaybook(dinner);
      expect(Array.isArray(domains)).toBe(true);
    }
  });

  test('domainCoverage returns correct shape', () => {
    const domain = getDomain('outdoor-cooking');
    const cov = domainCoverage(domain, ALL_PLAYBOOKS, ASOF);
    expect(cov.domain).toBe('outdoor-cooking');
    expect(typeof cov.found).toBe('number');
    expect(typeof cov.coverageScore).toBe('number');
    expect(cov.coverageScore).toBeGreaterThanOrEqual(0);
    expect(cov.coverageScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(cov.sharedGaps)).toBe(true);
    expect(typeof cov.researchByKind).toBe('object');
  });

  test('domainCoverage with unknown domain has 0 playbooks', () => {
    const cov = domainCoverage({ id: 'unknown', playbookTypes: [] }, ALL_PLAYBOOKS, ASOF);
    expect(cov.found).toBe(0);
  });

  test('domainResearch returns sorted research items with assetId', () => {
    const domain = getDomain('outdoor-cooking');
    const items = domainResearch(domain, ALL_PLAYBOOKS, ASOF);
    expect(Array.isArray(items)).toBe(true);
    for (const item of items.slice(0, 5)) {
      expect(typeof item.assetId).toBe('string');
      expect(['high', 'med', 'low']).toContain(item.priority);
    }
    // High priority items before low
    const priorities = items.map((i) => ({ h: i.priority === 'high' ? 0 : i.priority === 'med' ? 1 : 2 }));
    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i].h).toBeGreaterThanOrEqual(priorities[i - 1].h);
    }
  });

  test('generateDomainReport returns a summary string and topFields', () => {
    const domain = getDomain('outdoor-cooking');
    const report = generateDomainReport(domain, ALL_PLAYBOOKS, ASOF);
    expect(typeof report.summary).toBe('string');
    expect(report.summary.length).toBeGreaterThan(10);
    expect(Array.isArray(report.topFields)).toBe(true);
    expect(report.playbooksFound).toBeGreaterThan(0);
    expect(typeof report.coverageScore).toBe('number');
    expect(report.totalGaps + report.totalWarns).toBeGreaterThanOrEqual(0);
  });

  test('sharedGaps identifies dimensions that gap ≥2 playbooks in a domain', () => {
    const domain = getDomain('outdoor-cooking');
    const cov = domainCoverage(domain, ALL_PLAYBOOKS, ASOF);
    // sharedGaps is an array; each item has id and assets array with ≥2 entries
    for (const sg of cov.sharedGaps) {
      expect(sg.assets.length).toBeGreaterThanOrEqual(2);
      expect(typeof sg.id).toBe('string');
    }
  });
});

// ── Bundle D — Failure Intelligence ───────────────────────────────────────────
describe('Bundle D — Failure Intelligence', () => {
  beforeEach(() => clearFailures());
  afterEach(() => clearFailures());

  test('FAILURE_CATEGORIES includes all expected categories', () => {
    const required = ['vendor', 'weather', 'food', 'budget', 'timeline', 'safety', 'other'];
    for (const r of required) expect(FAILURE_CATEGORIES).toContain(r);
    expect(FAILURE_CATEGORIES.length).toBeGreaterThan(10);
  });

  test('FAILURE_SEVERITIES includes exceeded for positive outcomes', () => {
    expect(FAILURE_SEVERITIES).toContain('exceeded');
    expect(FAILURE_SEVERITIES).toContain('critical');
  });

  test('createFailureRecord returns correct frozen shape', () => {
    const rec = createFailureRecord({
      eventType: 'Crab Feast', category: 'food', what: 'Ran out of crabs',
      severity: 'major', impact: '12 guests had no crabs', source: 'host', at: ASOF,
    });
    expect(rec.id).toMatch(/^fail-/);
    expect(rec.category).toBe('food');
    expect(rec.severity).toBe('major');
    expect(rec.status).toBe('raw');
    expect(Object.isFrozen(rec)).toBe(true);
  });

  test('createFailureRecord handles estimatedVsActual context', () => {
    const rec = createFailureRecord({
      eventType: 'Crab Feast', category: 'budget', what: 'Crabs cost 40% more than estimated',
      severity: 'major', at: ASOF,
      estimatedVsActual: { field: 'p_crabs.unitCostRange', estimated: [2.5, 7], actual: [2.5, 9], delta: 2, deltaPct: 28 },
    });
    expect(rec.estimatedVsActual.deltaPct).toBe(28);
  });

  test('failureToKCR maps food failure → KCR with createdBy=failure-intelligence (never auto-publishes)', () => {
    const rec = createFailureRecord({
      eventType: 'Crab Feast', category: 'food', what: 'Ran out of crabs',
      severity: 'critical', at: ASOF,
    });
    const kcr = failureToKCR(rec, ASOF);
    expect(kcr.createdBy).toBe('failure-intelligence');
    expect(kcr.assetId).toBe('Crab Feast');
    expect(typeof kcr.type).toBe('string');
    // KCR is created but NOT in published state — status must not be 'published'
    expect(kcr.status).not.toBe('published');
  });

  test('failureToKCR maps different categories to appropriate KCR types', () => {
    for (const cat of ['vendor', 'weather', 'budget', 'safety']) {
      const rec = createFailureRecord({ eventType: 'Dinner Party', category: cat, what: 'Test', at: ASOF });
      const kcr = failureToKCR(rec, ASOF);
      expect(typeof kcr.type).toBe('string');
      expect(kcr.createdBy).toBe('failure-intelligence');
    }
  });

  test('analyzeFailures returns correct aggregates', () => {
    const records = [
      createFailureRecord({ eventType: 'Crab Feast', category: 'food', what: 'A', severity: 'major', at: ASOF }),
      createFailureRecord({ eventType: 'Crab Feast', category: 'food', what: 'B', severity: 'minor', at: ASOF }),
      createFailureRecord({ eventType: 'Crab Feast', category: 'weather', what: 'C', severity: 'critical', at: ASOF }),
    ];
    const analysis = analyzeFailures(records);
    expect(analysis.total).toBe(3);
    expect(analysis.byCategory.food).toBe(2);
    expect(analysis.byCategory.weather).toBe(1);
    expect(analysis.bySeverity.major).toBe(1);
    expect(analysis.patterns.some((p) => p.category === 'food')).toBe(true);  // food > 20%
  });

  test('analyzeFailures surfaces estimation gaps when deltaPct is present', () => {
    const r = createFailureRecord({
      eventType: 'Crab Feast', category: 'budget', what: 'Cost overrun', at: ASOF,
      estimatedVsActual: { field: 'budget', estimated: 100, actual: 140, delta: 40, deltaPct: 40 },
    });
    const analysis = analyzeFailures([r]);
    expect(analysis.estimationGaps.length).toBe(1);
    expect(analysis.estimationGaps[0].deltaPct).toBe(40);
  });

  test('analyzeFailures returns honest-empty for empty input', () => {
    const a = analyzeFailures([]);
    expect(a.total).toBe(0);
    expect(a.patterns).toHaveLength(0);
  });

  test('store: recordFailure + loadFailures roundtrip', () => {
    const r = createFailureRecord({ eventType: 'Dinner Party', category: 'vendor', what: 'Caterer late', at: ASOF });
    recordFailure(r);
    const list = loadFailures();
    expect(list.length).toBe(1);
    expect(list[0].eventType).toBe('Dinner Party');
  });
});

// ── Knowledge Scope (the powerful primitive) ───────────────────────────────────
describe('Knowledge Scope — the powerful primitive', () => {
  test('REGIONS has 8 entries including national fallback', () => {
    expect(Object.keys(REGIONS).length).toBe(8);
    expect(REGIONS.national).toBeDefined();
    expect(REGIONS.dmv).toBeDefined();
  });

  test('SEASONS covers all 4 seasons with correct month arrays', () => {
    expect(SEASONS.summer.months).toContain(7);   // July
    expect(SEASONS.winter.months).toContain(12);  // December
    expect(SEASONS.spring.months).toContain(4);   // April
    expect(SEASONS.fall.months).toContain(10);    // October
  });

  test('BUDGET_TIERS: luxury multiplier > premium > standard > budget', () => {
    expect(BUDGET_TIERS.luxury.multiplier).toBeGreaterThan(BUDGET_TIERS.premium.multiplier);
    expect(BUDGET_TIERS.premium.multiplier).toBeGreaterThan(BUDGET_TIERS.standard.multiplier);
    expect(BUDGET_TIERS.standard.multiplier).toBeGreaterThan(BUDGET_TIERS.budget.multiplier);
  });

  test('createScope returns frozen scope with defaults', () => {
    const s = createScope();
    expect(s.region).toBe('national');
    expect(s.budgetTier).toBe('standard');
    expect(s.scaleTier).toBe('small');
    expect(Object.isFrozen(s)).toBe(true);
  });

  test('createScope accepts overrides', () => {
    const s = createScope({ region: 'dmv', budgetTier: 'premium', scaleTier: 'large' });
    expect(s.region).toBe('dmv');
    expect(s.budgetTier).toBe('premium');
  });

  test('scopeFromDate derives summer season from July date', () => {
    const s = scopeFromDate('2026-07-02');
    expect(s.season).toBe('summer');
  });

  test('scopeFromDate derives winter season from January date', () => {
    const s = scopeFromDate('2026-01-15');
    expect(s.season).toBe('winter');
  });

  test('scopeFromDate accepts overrides that take precedence', () => {
    const s = scopeFromDate('2026-07-02', { region: 'dmv' });
    expect(s.region).toBe('dmv');
    expect(s.season).toBe('summer');
  });

  test('resolveScoped falls back to canonical when no regional data exists', () => {
    const scope = createScope({ region: 'dmv' });
    const result = resolveScoped(crab, 'p_crabs.qtyPerGuest', scope);
    expect(result.value).toBeDefined();  // canonical value from crab feast
    expect(result.source).toBe('canonical');
  });

  test('resolveScoped returns undefined value for non-existent field (falls through to canonical)', () => {
    const scope = createScope();
    const result = resolveScoped(crab, 'totally.nonexistent.field.path', scope);
    expect(result.value).toBeUndefined();
  });

  test('resolveScoped handles null pb gracefully', () => {
    const result = resolveScoped(null, 'p_crabs.unitCostRange', createScope());
    expect(result.value).toBeUndefined();
    expect(result.source).toBe('not-found');
  });

  test('scopeCoverage: crab feast is national-only (no regional projections yet)', () => {
    const cov = scopeCoverage(crab);
    expect(cov.canonicalOnly).toBe(true);
    expect(cov.coverageGrade).toBe('national-only');
    expect(Array.isArray(cov.regionsWithData)).toBe(true);
  });

  test('corpusScopeCoverage: reports total + nationalOnly across corpus', () => {
    const cov = corpusScopeCoverage(ALL_PLAYBOOKS.slice(0, 5));
    expect(cov.total).toBe(5);
    expect(typeof cov.nationalOnly).toBe('number');
    expect(cov.nationalOnly).toBeLessThanOrEqual(5);
    expect(Array.isArray(cov.assets)).toBe(true);
  });
});

// ── KPP-1 dimension coverage evaluators ───────────────────────────────────────
describe('KPP-1 coverage dimensions — all 8 present and return correct contract', () => {
  const newDimIds = [
    'Regional coverage', 'Seasonal awareness', 'Vendor network', 'Cultural overlay',
    'Weather contingency', 'Scale variance', 'Accessibility', 'Professional guidance',
  ];

  test('all 8 new dimensions are in DIMENSION_REGISTRY', () => {
    const registered = DIMENSION_REGISTRY.map((d) => d.id);
    for (const id of newDimIds) {
      expect(registered).toContain(id);
    }
  });

  test('evaluateAsset returns all 8 new dimensions for any playbook', () => {
    const dims = evaluateAsset(crab, 'playbook', ASOF);
    const dimIds = dims.map((d) => d.id);
    for (const id of newDimIds) {
      expect(dimIds).toContain(id);
    }
  });

  test('each new dimension returns full 7-field contract', () => {
    const dims = evaluateAsset(crab, 'playbook', ASOF).filter((d) => newDimIds.includes(d.id));
    for (const d of dims) {
      expect(['ok', 'warn', 'gap', 'n/a']).toContain(d.status);
      expect(typeof d.reason).toBe('string');
      expect('missingEvidence' in d).toBe(true);
      expect(Array.isArray(d.recommendedKCRs)).toBe(true);
      expect(Array.isArray(d.affectedEngines)).toBe(true);
      expect(typeof d.reviewInterval).toBe('number');
    }
  });

  test('Weather contingency is ok for crab feast (has r_weather risk)', () => {
    const dims = evaluateAsset(crab, 'playbook', ASOF);
    const wc = dims.find((d) => d.id === 'Weather contingency');
    expect(wc.status).toBe('ok');
    expect(wc.recommendedKCRs).toHaveLength(0);
  });

  test('Cultural overlay is n/a for crab feast (regional food, not a cultural tradition)', () => {
    const dims = evaluateAsset(crab, 'playbook', ASOF);
    const co = dims.find((d) => d.id === 'Cultural overlay');
    expect(co.status).toBe('n/a');
  });

  test('Seasonal awareness is ok for crab feast (knowledge note references season)', () => {
    const dims = evaluateAsset(crab, 'playbook', ASOF);
    const sa = dims.find((d) => d.id === 'Seasonal awareness');
    expect(sa.status).toBe('ok');
  });

  test('Regional coverage is a warn for crab feast (no regionalPricing yet)', () => {
    const dims = evaluateAsset(crab, 'playbook', ASOF);
    const rc = dims.find((d) => d.id === 'Regional coverage');
    expect(rc.status).toBe('warn');  // legit coverage gap
    expect(typeof rc.reason).toBe('string');
  });

  test('Scale variance is at least warn for crab feast (has qtyPerGuest but no bulk factors)', () => {
    const dims = evaluateAsset(crab, 'playbook', ASOF);
    const sv = dims.find((d) => d.id === 'Scale variance');
    expect(['ok', 'warn']).toContain(sv.status);  // should have qtyPerGuest at minimum
  });

  test('a completely thin playbook shows gap/warn for most new dimensions', () => {
    const thin = { type: 'Thin Test', tasks: [], milestones: [], purchases: [], rentalsGap: [], vendors: [], schedules: {}, decisions: [], risks: [], contingencies: [] };
    const dims = evaluateAsset(thin, 'playbook', ASOF).filter((d) => newDimIds.includes(d.id));
    const nonOk = dims.filter((d) => d.status !== 'ok' && d.status !== 'n/a');
    expect(nonOk.length).toBeGreaterThan(2);  // at least several coverage gaps on a bare playbook
  });
});
