// KAW-1 — Autonomous Knowledge Acquisition Platform golden tests
// Covers: knowledgeWorkers.js, providerMonitor.js, changeDetector.js

import {
  WORKER_TYPES,
  createWorkerInstance, createWorkerRun, completeWorkerRun, failWorkerRun,
  buildFleetHealth, buildFleetMetrics,
  loadWorkers, saveWorkers, clearWorkers, upsertWorker, toggleWorker,
  loadRuns, addRun, clearRuns,
} from './knowledgeWorkers';

import {
  PROVIDER_MONITOR_RULES,
  getMonitorRule, overdueProviders, highPriorityProviders,
  providerHealthSummary, normalizeObservation,
} from './providerMonitor';

import {
  CHANGE_TYPES, CHANGE_SIGNIFICANCE,
  detectChange, detectChanges, detectContradictions, summarizeChanges,
} from './changeDetector';

import { PROVIDER_FAMILIES } from './providers';

const ASOF = '2026-07-03';

// ── knowledgeWorkers ──────────────────────────────────────────────────────────
describe('knowledgeWorkers — Bundle A', () => {
  beforeEach(() => { clearWorkers(); clearRuns(); });
  afterEach(() => { clearWorkers(); clearRuns(); });

  test('WORKER_TYPES has ≥7 worker types', () => {
    expect(Object.keys(WORKER_TYPES).length).toBeGreaterThanOrEqual(7);
  });

  test('each worker type has required fields', () => {
    const required = ['id', 'label', 'version', 'description', 'mission', 'inputs', 'outputs', 'defaultCadence', 'produces', 'neverProduces'];
    for (const [id, w] of Object.entries(WORKER_TYPES)) {
      for (const field of required) {
        expect({ id, field, present: w[field] != null }).toEqual({ id, field, present: true });
      }
    }
  });

  test('no worker type can produce kcr-published or knowledge-edit', () => {
    for (const [id, w] of Object.entries(WORKER_TYPES)) {
      expect(w.produces).not.toContain('kcr-published');
      expect(w.produces).not.toContain('knowledge-edit');
      expect(w.neverProduces).toContain('knowledge-edit');
    }
  });

  test('createWorkerInstance returns correct shape', () => {
    const w = createWorkerInstance({ typeId: 'freshness-worker', assetId: 'Crab Feast', at: ASOF });
    expect(w.typeId).toBe('freshness-worker');
    expect(w.version).toBe('1.0.0');
    expect(w.assetId).toBe('Crab Feast');
    expect(w.enabled).toBe(true);
    expect(w.runCount).toBe(0);
  });

  test('createWorkerInstance throws on unknown type', () => {
    expect(() => createWorkerInstance({ typeId: 'mystery-worker', at: ASOF })).toThrow('Unknown worker type');
  });

  test('createWorkerRun + completeWorkerRun lifecycle', () => {
    const run = createWorkerRun({ workerId: 'worker-1', typeId: 'freshness-worker', at: ASOF });
    expect(run.status).toBe('running');
    expect(run.completedAt).toBeNull();
    const completed = completeWorkerRun(run, { outputs: { observationCount: 3 }, durationMs: 420, at: ASOF });
    expect(completed.status).toBe('complete');
    expect(completed.outputs.observationCount).toBe(3);
    expect(completed.durationMs).toBe(420);
    expect(completed.completedAt).toBe(ASOF);
  });

  test('failWorkerRun sets status=failed with message', () => {
    const run = createWorkerRun({ workerId: 'worker-1', typeId: 'freshness-worker', at: ASOF });
    const failed = failWorkerRun(run, { errorMessage: 'Provider unavailable', at: ASOF });
    expect(failed.status).toBe('failed');
    expect(failed.errorMessage).toBe('Provider unavailable');
  });

  test('completeWorkerRun/failWorkerRun are pure (do not mutate run)', () => {
    const run = createWorkerRun({ workerId: 'worker-1', typeId: 'freshness-worker', at: ASOF });
    const before = JSON.stringify(run);
    completeWorkerRun(run, { outputs: { observationCount: 3 }, at: ASOF });
    failWorkerRun(run, { errorMessage: 'oops', at: ASOF });
    expect(JSON.stringify(run)).toBe(before);
  });

  test('buildFleetHealth returns health report for all workers', () => {
    const w1 = createWorkerInstance({ typeId: 'freshness-worker', at: ASOF });
    const w2 = createWorkerInstance({ typeId: 'gap-detection-worker', at: ASOF });
    const r1 = completeWorkerRun(createWorkerRun({ workerId: w1.id, typeId: 'freshness-worker', at: ASOF }), { at: ASOF });
    const health = buildFleetHealth([w1, w2], [r1]);
    expect(health).toHaveLength(2);
    const h1 = health.find((h) => h.id === w1.id);
    expect(h1.lastRunStatus).toBe('complete');
    expect(h1.healthy).toBe(true);
    const h2 = health.find((h) => h.id === w2.id);
    expect(h2.totalRuns).toBe(0);
  });

  test('buildFleetMetrics aggregates correctly', () => {
    const w1 = createWorkerInstance({ typeId: 'freshness-worker', at: ASOF });
    const r1 = completeWorkerRun(createWorkerRun({ workerId: w1.id, typeId: 'freshness-worker', at: ASOF }), { outputs: { observationCount: 5, kcrDrafts: 2 }, at: ASOF });
    const r2 = failWorkerRun(createWorkerRun({ workerId: w1.id, typeId: 'freshness-worker', at: ASOF }), { at: ASOF });
    const m = buildFleetMetrics([w1], [r1, r2]);
    expect(m.total).toBe(1);
    expect(m.totalRuns).toBe(2);
    expect(m.completedRuns).toBe(1);
    expect(m.failedRuns).toBe(1);
    expect(m.successRate).toBe(50);
    expect(m.observationsThroughput).toBe(5);
    expect(m.kcrDraftsThroughput).toBe(2);
  });

  test('upsertWorker + loadWorkers + toggleWorker roundtrip', () => {
    const w = createWorkerInstance({ typeId: 'freshness-worker', at: ASOF });
    upsertWorker(w);
    expect(loadWorkers()).toHaveLength(1);
    toggleWorker(w.id, false);
    expect(loadWorkers()[0].enabled).toBe(false);
    clearWorkers();
    expect(loadWorkers()).toHaveLength(0);
  });

  test('addRun + loadRuns + clearRuns roundtrip', () => {
    const run = createWorkerRun({ workerId: 'w1', typeId: 'freshness-worker', at: ASOF });
    addRun(run);
    expect(loadRuns()).toHaveLength(1);
    clearRuns();
    expect(loadRuns()).toHaveLength(0);
  });

  test('buildFleetHealth returns empty array for no workers', () => {
    expect(buildFleetHealth([], [])).toHaveLength(0);
  });
});

// ── providerMonitor ────────────────────────────────────────────────────────────
describe('providerMonitor — Bundle B', () => {
  test('PROVIDER_MONITOR_RULES covers all 16 provider families', () => {
    for (const family of PROVIDER_FAMILIES) {
      expect(PROVIDER_MONITOR_RULES[family]).toBeDefined();
    }
  });

  test('each rule has required fields', () => {
    const required = ['family', 'label', 'pollingCadence', 'expectedFreshnessDays', 'authority', 'failureTolerance', 'normalizationRules', 'examples'];
    for (const [family, rule] of Object.entries(PROVIDER_MONITOR_RULES)) {
      for (const field of required) {
        expect({ family, field, present: rule[field] != null }).toEqual({ family, field, present: true });
      }
    }
  });

  test('government family has official authority and monthly or better polling', () => {
    const rule = getMonitorRule('government');
    expect(rule.authority).toBe('official');
    expect(['daily', 'weekly', 'monthly']).toContain(rule.pollingCadence);
  });

  test('food-safety family has weekly or better polling', () => {
    const rule = getMonitorRule('food-safety');
    expect(['daily', 'weekly']).toContain(rule.pollingCadence);
    expect(rule.failureTolerance).toBe('alert');
  });

  test('community family has low authority and monthly polling', () => {
    const rule = getMonitorRule('community');
    expect(rule.authority).toBe('community');
    expect(rule.normalizationRules.some((r) => r.includes('corroboration'))).toBe(true);
  });

  test('getMonitorRule returns null for unknown family', () => {
    expect(getMonitorRule('martian-data')).toBeNull();
  });

  test('overdueProviders: never-checked providers all appear as overdue', () => {
    const overdue = overdueProviders({}, ASOF);
    expect(overdue.length).toBe(PROVIDER_FAMILIES.length);
    for (const o of overdue) {
      expect(o.overdueBy).toBe('never-checked');
    }
  });

  test('overdueProviders: recently-checked providers are not overdue', () => {
    const lastCheckedAt = Object.fromEntries(PROVIDER_FAMILIES.map((f) => [f, ASOF]));
    const overdue = overdueProviders(lastCheckedAt, ASOF);
    expect(overdue).toHaveLength(0);
  });

  test('highPriorityProviders returns official and standards-tier providers', () => {
    const high = highPriorityProviders();
    for (const p of high) {
      expect(['official', 'standards']).toContain(p.authority);
    }
    expect(high.length).toBeGreaterThan(3);
  });

  test('providerHealthSummary returns coverage metrics', () => {
    const summary = providerHealthSummary({}, ASOF);
    expect(summary.total).toBe(PROVIDER_FAMILIES.length);
    expect(summary.covered).toBe(PROVIDER_FAMILIES.length);
    expect(summary.uncovered).toHaveLength(0);
    expect(summary.neverChecked).toBe(PROVIDER_FAMILIES.length);
  });

  test('normalizeObservation enriches observation with provider metadata', () => {
    const obs = { id: 'obs-1', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [8, 15], at: ASOF };
    const normalized = normalizeObservation(obs, 'government');
    expect(normalized.family).toBe('government');
    expect(normalized.authority).toBe('official');
    expect(normalized.expectedFreshnessDays).toBe(365);
    expect(normalized.requiresCorroboration).toBe(false);
  });

  test('community observations require corroboration', () => {
    const obs = { id: 'obs-2', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [7, 12], at: ASOF };
    const normalized = normalizeObservation(obs, 'community');
    expect(normalized.requiresCorroboration).toBe(true);
  });
});

// ── changeDetector ─────────────────────────────────────────────────────────────
describe('changeDetector — Bundle D', () => {
  test('CHANGE_TYPES has ≥15 entries', () => {
    expect(CHANGE_TYPES.length).toBeGreaterThanOrEqual(15);
  });

  test('CHANGE_SIGNIFICANCE covers all CHANGE_TYPES', () => {
    for (const type of CHANGE_TYPES) {
      expect(CHANGE_SIGNIFICANCE[type]).toBeDefined();
    }
  });

  test('food-recall-alert is critical significance', () => {
    expect(CHANGE_SIGNIFICANCE['food-recall-alert']).toBe('critical');
  });

  test('detectChange: returns null when values are within tolerance', () => {
    const prev = { id: 'obs-a', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [8.00, 15.00], at: '2026-04-01' };
    const next = { id: 'obs-b', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [8.10, 15.20], at: ASOF };
    expect(detectChange(prev, next, { tolerancePct: 0.05 })).toBeNull();
  });

  test('detectChange: detects price increase exceeding tolerance', () => {
    const prev = { id: 'obs-a', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [8, 15], at: '2026-01-01' };
    const next = { id: 'obs-b', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [12, 22], at: ASOF };
    const change = detectChange(prev, next);
    expect(change).not.toBeNull();
    expect(change.changeType).toBe('price-increase');
    expect(change.significance).toBe('med');
    expect(change.assetId).toBe('Crab Feast');
    expect(change.needsReview).toBe(true);
    expect(change.resolved).toBe(false);
  });

  test('detectChange: detects price decrease', () => {
    const prev = { id: 'obs-a', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [12, 22], at: '2026-01-01' };
    const next = { id: 'obs-b', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [8, 14], at: ASOF };
    const change = detectChange(prev, next);
    expect(change).not.toBeNull();
    expect(change.changeType).toBe('price-decrease');
  });

  test('detectChange: detects food-recall-alert keyword in value', () => {
    const prev = { id: 'obs-a', assetId: 'Crab Feast', fieldPath: 'safetyNotes', value: 'Follow temperature guidelines', at: '2026-01-01' };
    const next = { id: 'obs-b', assetId: 'Crab Feast', fieldPath: 'safetyNotes', value: 'RECALL ALERT: listeria contamination detected in supplier', at: ASOF };
    const change = detectChange(prev, next);
    expect(change).not.toBeNull();
    expect(change.changeType).toBe('food-recall-alert');
    expect(change.significance).toBe('critical');
  });

  test('detectChange: returns null for identical string values', () => {
    const obs = { id: 'obs-a', assetId: 'Crab Feast', fieldPath: 'knowledge.note', value: 'Same note', at: '2026-01-01' };
    expect(detectChange(obs, { ...obs, id: 'obs-b', at: ASOF })).toBeNull();
  });

  test('detectChange: returns null for null inputs', () => {
    expect(detectChange(null, null)).toBeNull();
    expect(detectChange(null, { id: 'obs-b' })).toBeNull();
  });

  test('detectChanges: batch detects changes against previous set', () => {
    const prev = [{ id: 'obs-a', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [8, 15], at: '2026-01-01' }];
    const next = [{ id: 'obs-b', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [13, 24], at: ASOF }];
    const changes = detectChanges(next, prev);
    expect(changes.length).toBe(1);
    expect(changes[0].changeType).toBe('price-increase');
  });

  test('detectChanges: returns [] when no previous observations exist', () => {
    const next = [{ id: 'obs-b', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [13, 24], at: ASOF }];
    expect(detectChanges(next, [])).toHaveLength(0);
  });

  test('detectContradictions: finds conflicting price ranges from different sources', () => {
    const observations = [
      { id: 'obs-a', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [8, 12], provider: 'bls-cpi', at: ASOF },
      { id: 'obs-b', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [18, 28], provider: 'community-forums', at: ASOF },
    ];
    const contradictions = detectContradictions(observations, { tolerancePct: 0.15 });
    expect(contradictions.length).toBeGreaterThan(0);
    expect(contradictions[0].needsResolution).toBe(true);
    expect(contradictions[0].resolved).toBe(false);
    expect(contradictions[0].sourceA).toBeDefined();
    expect(contradictions[0].sourceB).toBeDefined();
  });

  test('detectContradictions: no contradiction when values are close', () => {
    const observations = [
      { id: 'obs-a', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [8, 12], provider: 'bls-cpi', at: ASOF },
      { id: 'obs-b', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [8.50, 12.50], provider: 'retail', at: ASOF },
    ];
    expect(detectContradictions(observations, { tolerancePct: 0.15 })).toHaveLength(0);
  });

  test('detectContradictions: returns [] for single observation per field', () => {
    const obs = [{ id: 'obs-a', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [8, 12], at: ASOF }];
    expect(detectContradictions(obs)).toHaveLength(0);
  });

  test('summarizeChanges: returns correct breakdown', () => {
    const changes = [
      { changeType: 'price-increase', significance: 'med', assetId: 'Crab Feast' },
      { changeType: 'food-recall-alert', significance: 'critical', assetId: 'Crab Feast' },
      { changeType: 'price-decrease', significance: 'med', assetId: 'Dinner Party' },
    ];
    const summary = summarizeChanges(changes);
    expect(summary.total).toBe(3);
    expect(summary.byType['price-increase']).toBe(1);
    expect(summary.bySignificance['critical']).toBe(1);
    expect(summary.critical).toHaveLength(1);
    expect(summary.high).toHaveLength(0);
  });

  test('summarizeChanges: returns safe empty state for no changes', () => {
    const s = summarizeChanges([]);
    expect(s.total).toBe(0);
    expect(s.critical).toHaveLength(0);
  });
});
