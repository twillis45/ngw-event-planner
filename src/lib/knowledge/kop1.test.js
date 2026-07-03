// KOP-1 — Knowledge Operations Platform tests
// Bundle B: schedule.js, Bundle C: providerHealth.js, Bundle D: campaignTemplates.js,
// Bundle H: roadmap.js. No UI — pure logic contracts.

import { CAMPAIGN_TEMPLATES, getTemplate, suggestTemplates, applyTemplate } from './campaignTemplates';
import {
  createSchedule, evaluateSchedule, buildScheduleCoverage, SCHEDULE_FREQUENCIES,
  loadSchedules, recordSchedule, removeSchedule, clearSchedules,
} from './schedule';
import {
  createProviderEvent, buildProviderHealth, PROVIDER_OUTCOME_TYPES,
  loadProviderEvents, recordProviderEvent, clearProviderEvents,
} from './providerHealth';
import { generateRoadmap, roadmapSummary } from './roadmap';
import { ALL_PLAYBOOKS } from '../playbooks/index';

const ASOF = '2026-07-02';

// ── Bundle D — Campaign Templates ─────────────────────────────────────────────
describe('Bundle D — Campaign Templates', () => {
  test('CAMPAIGN_TEMPLATES has ≥15 entries', () => {
    expect(CAMPAIGN_TEMPLATES.length).toBeGreaterThanOrEqual(15);
  });

  test('every template has required shape fields', () => {
    for (const t of CAMPAIGN_TEMPLATES) {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('label');
      expect(t).toHaveProperty('description');
      expect(t).toHaveProperty('gapTypes');
      expect(Array.isArray(t.gapTypes)).toBe(true);
      expect(t.gapTypes.length).toBeGreaterThanOrEqual(1);
      expect(t).toHaveProperty('defaultProviders');
      expect(t).toHaveProperty('defaultPriority');
      expect(t).toHaveProperty('defaultTrigger');
    }
  });

  test('template IDs are unique', () => {
    const ids = CAMPAIGN_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('getTemplate returns correct template or undefined', () => {
    const t = getTemplate('price-discovery');
    expect(t).toBeDefined();
    expect(t.id).toBe('price-discovery');
    expect(getTemplate('nonexistent-xyz')).toBeUndefined();
  });

  test('suggestTemplates with unitCostRange returns pricing templates first', () => {
    const suggestions = suggestTemplates('p_crabs.unitCostRange');
    const first = suggestions[0];
    expect(first.fieldPathPattern).toBe('unitCostRange');
  });

  test('suggestTemplates with null returns all templates', () => {
    expect(suggestTemplates(null).length).toBe(CAMPAIGN_TEMPLATES.length);
  });

  test('applyTemplate merges template defaults with overrides', () => {
    const result = applyTemplate('price-discovery', { assetId: 'Crab Feast' });
    expect(result.assetId).toBe('Crab Feast');
    expect(result.gapTypes).toContain('pricing');
    expect(result.priority).toBe('high');
    expect(result.providers).toContain('market-pricing');
  });

  test('applyTemplate with unknown id returns overrides unchanged', () => {
    const result = applyTemplate('does-not-exist', { assetId: 'Test' });
    expect(result.assetId).toBe('Test');
  });
});

// ── Bundle B — Research Scheduler ─────────────────────────────────────────────
describe('Bundle B — Research Scheduler', () => {
  beforeEach(() => clearSchedules());
  afterEach(() => clearSchedules());

  test('createSchedule returns correct shape', () => {
    const s = createSchedule({ assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', startAt: ASOF });
    expect(s.id).toMatch(/^sched-/);
    expect(s.assetId).toBe('Crab Feast');
    expect(s.fieldPath).toBe('p_crabs.unitCostRange');
    expect(s.frequency).toBe('quarterly');   // default
    expect(s.enabled).toBe(true);
  });

  test('SCHEDULE_FREQUENCIES has 5 entries including on-demand', () => {
    expect(SCHEDULE_FREQUENCIES).toContain('monthly');
    expect(SCHEDULE_FREQUENCIES).toContain('quarterly');
    expect(SCHEDULE_FREQUENCIES).toContain('on-demand');
    expect(SCHEDULE_FREQUENCIES.length).toBe(5);
  });

  test('evaluateSchedule: quarterly schedule due after 90 days', () => {
    const s = createSchedule({ assetId: 'Test', fieldPath: 'f', frequency: 'quarterly', startAt: '2026-01-01', lastRunAt: '2026-01-01' });
    // asOf = 2026-07-02: 182 days after lastRunAt (2026-01-01 + 90 = 2026-04-01 — overdue)
    const ev = evaluateSchedule(s, ASOF);
    expect(ev.due).toBe(true);
    expect(ev.overdue).toBe(true);
    expect(ev.daysOverdue).toBeGreaterThan(0);
  });

  test('evaluateSchedule: recently run quarterly schedule not due yet', () => {
    const s = createSchedule({ assetId: 'Test', fieldPath: 'f', frequency: 'quarterly', startAt: ASOF, lastRunAt: ASOF });
    const ev = evaluateSchedule(s, ASOF);
    expect(ev.due).toBe(false);
    expect(ev.overdue).toBe(false);
  });

  test('evaluateSchedule: on-demand is never due automatically', () => {
    const s = createSchedule({ assetId: 'Test', fieldPath: 'f', frequency: 'on-demand', startAt: '2020-01-01' });
    const ev = evaluateSchedule(s, ASOF);
    expect(ev.due).toBe(false);
    expect(ev.overdue).toBe(false);
  });

  test('store: recordSchedule, loadSchedules, removeSchedule roundtrip', () => {
    const s = createSchedule({ assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', startAt: ASOF });
    recordSchedule(s);
    expect(loadSchedules().length).toBe(1);
    removeSchedule(s.id);
    expect(loadSchedules().length).toBe(0);
  });

  test('buildScheduleCoverage reports 0% when no schedules exist', () => {
    const coverage = buildScheduleCoverage(ALL_PLAYBOOKS, [], ASOF);
    expect(coverage.totalScheduled).toBe(0);
    expect(coverage.coverage).toBe(0 < coverage.totalNeeded ? 0 : 100);
  });
});

// ── Bundle C — Provider Health ─────────────────────────────────────────────────
describe('Bundle C — Provider Health', () => {
  beforeEach(() => clearProviderEvents());
  afterEach(() => clearProviderEvents());

  test('PROVIDER_OUTCOME_TYPES includes success, partial, empty, error', () => {
    expect(PROVIDER_OUTCOME_TYPES).toEqual(expect.arrayContaining(['success', 'partial', 'empty', 'error']));
  });

  test('createProviderEvent returns correct shape', () => {
    const e = createProviderEvent({ providerId: 'market-pricing', campaignId: 'c1', at: ASOF, outcomeType: 'success', evidenceCount: 3 });
    expect(e.id).toMatch(/^pev-/);
    expect(e.providerId).toBe('market-pricing');
    expect(e.outcomeType).toBe('success');
    expect(e.evidenceCount).toBe(3);
    expect(e.errorMsg).toBeNull();
  });

  test('createProviderEvent sets errorMsg for error outcome', () => {
    const e = createProviderEvent({ providerId: 'scholar', campaignId: 'c2', at: ASOF, outcomeType: 'error', errorMsg: 'timeout' });
    expect(e.errorMsg).toBe('timeout');
  });

  test('buildProviderHealth: no events → all providers have no-data status', () => {
    const providers = [{ id: 'market-pricing', family: 'commercial', authorityLevel: 'trade' }];
    const health = buildProviderHealth([], providers);
    expect(health.length).toBe(1);
    expect(health[0].status).toBe('no-data');
    expect(health[0].totalRuns).toBe(0);
    expect(health[0].successRate).toBeNull();
  });

  test('buildProviderHealth: success rate computed correctly', () => {
    const ev = [
      createProviderEvent({ providerId: 'market-pricing', campaignId: 'c1', at: ASOF, outcomeType: 'success', evidenceCount: 5 }),
      createProviderEvent({ providerId: 'market-pricing', campaignId: 'c2', at: ASOF, outcomeType: 'success', evidenceCount: 3 }),
      createProviderEvent({ providerId: 'market-pricing', campaignId: 'c3', at: ASOF, outcomeType: 'empty', evidenceCount: 0 }),
    ];
    const providers = [{ id: 'market-pricing', family: 'commercial', authorityLevel: 'trade' }];
    const health = buildProviderHealth(ev, providers);
    const mp = health.find((h) => h.id === 'market-pricing');
    expect(mp.totalRuns).toBe(3);
    expect(mp.successRate).toBe(67);            // 2/3 successes
    expect(mp.avgEvidence).toBeCloseTo(2.7, 0); // (5+3+0)/3
    expect(mp.emptyCount).toBe(1);
    expect(mp.status).toBe('healthy');
  });

  test('buildProviderHealth: degraded status when >50% errors', () => {
    const ev = [
      createProviderEvent({ providerId: 'p', campaignId: 'c1', at: ASOF, outcomeType: 'error' }),
      createProviderEvent({ providerId: 'p', campaignId: 'c2', at: ASOF, outcomeType: 'error' }),
      createProviderEvent({ providerId: 'p', campaignId: 'c3', at: ASOF, outcomeType: 'success', evidenceCount: 1 }),
    ];
    const health = buildProviderHealth(ev, []);
    const p = health[0];
    expect(p.status).toBe('degraded');
  });

  test('store: recordProviderEvent + loadProviderEvents roundtrip', () => {
    const e = createProviderEvent({ providerId: 'retail', campaignId: 'cx', at: ASOF, outcomeType: 'partial', evidenceCount: 1 });
    recordProviderEvent(e);
    const loaded = loadProviderEvents();
    expect(loaded.length).toBe(1);
    expect(loaded[0].providerId).toBe('retail');
  });
});

// ── Bundle H — Roadmap Generator ──────────────────────────────────────────────
describe('Bundle H — Roadmap Generator', () => {
  test('generateRoadmap returns an array (honest-empty when no research needed)', () => {
    const rm = generateRoadmap(ALL_PLAYBOOKS, ASOF);
    expect(Array.isArray(rm)).toBe(true);
  });

  test('roadmap items have required shape', () => {
    const rm = generateRoadmap(ALL_PLAYBOOKS, ASOF);
    for (const item of rm.slice(0, 5)) {
      expect(item).toHaveProperty('assetId');
      expect(item).toHaveProperty('fieldPath');
      expect(item).toHaveProperty('blastScore');
      expect(item).toHaveProperty('weaknessCount');
      expect(item).toHaveProperty('score');
      expect(item).toHaveProperty('suggestedType');
      expect(item).toHaveProperty('priority');
      expect(['high', 'med', 'low']).toContain(item.priority);
    }
  });

  test('roadmap is capped at 50 items', () => {
    const rm = generateRoadmap(ALL_PLAYBOOKS, ASOF);
    expect(rm.length).toBeLessThanOrEqual(50);
  });

  test('high-priority items appear before med/low items', () => {
    const rm = generateRoadmap(ALL_PLAYBOOKS, ASOF);
    if (rm.length > 1) {
      let seenNonHigh = false;
      for (const item of rm) {
        if (item.priority !== 'high') seenNonHigh = true;
        if (seenNonHigh) expect(item.priority).not.toBe('high');
      }
    }
  });

  test('roadmapSummary returns correct shape', () => {
    const rm = generateRoadmap(ALL_PLAYBOOKS, ASOF);
    const s = roadmapSummary(rm);
    expect(s).toHaveProperty('total');
    expect(s).toHaveProperty('byKind');
    expect(s).toHaveProperty('byPriority');
    expect(s).toHaveProperty('highImpactCount');
    expect(s.total).toBe(rm.length);
  });

  test('roadmapSummary on empty roadmap returns zeros', () => {
    const s = roadmapSummary([]);
    expect(s.total).toBe(0);
    expect(s.highImpactCount).toBe(0);
  });
});
