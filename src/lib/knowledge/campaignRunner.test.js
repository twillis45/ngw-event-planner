import {
  QUEUE_STATES,
  QUEUE_STATE_COLORS,
  computeQueueItemState,
  buildExecutionPlan,
  runAutonomousCampaign,
  batchRunAutonomous,
  buildPerformanceReport,
} from './campaignRunner';
import { createCampaign } from './campaign';

const ASOF = '2026-07-03';

const campaign = createCampaign({
  goal: 'Research Crab Feast pricing',
  assetId: 'crabFeast',
  fieldPath: 'p_crabs.unitCostRange',
  gapType: 'pricing',
  providers: ['market-pricing', 'data.gov'],
  at: ASOF,
});

const blueprint = {
  knowledgeType: 'pricing',
  claim: 'Larges cost $7.92–8.17/crab at retail in the DMV',
  successCriteria: '≥2 retail sources agree within 15%',
  recommendedProviders: ['market-pricing', 'data.gov'],
  authorityRequirements: {
    minimum: 'trade',
    preferred: 'standards',
    corroborationRequired: false,
  },
  corroborationRequirements: {
    required: false,
    targets: ['data.gov', 'scholar'],
  },
  validationRequirements: { minEvidence: 2, requiresOfficial: false },
  workerAssignments: ['freshness-worker', 'gap-detection-worker'],
};

const queueItem = {
  playbookType: 'crabFeast',
  fieldPath: 'p_crabs.unitCostRange',
  gapKind: 'pricing',
  hasCampaign: false,
  evidenceCount: 0,
};

describe('QUEUE_STATES', () => {
  const EXPECTED_KEYS = [
    'READY', 'WAITING', 'RUNNING', 'CORROBORATING', 'BLOCKED', 'REVIEW', 'COMPLETE', 'FAILED',
  ];

  test('has all 8 keys', () => {
    EXPECTED_KEYS.forEach((key) => {
      expect(QUEUE_STATES).toHaveProperty(key);
    });
  });

  test('has exactly 8 keys', () => {
    expect(Object.keys(QUEUE_STATES)).toHaveLength(8);
  });
});

describe('QUEUE_STATE_COLORS', () => {
  const EXPECTED_KEYS = [
    'READY', 'WAITING', 'RUNNING', 'CORROBORATING', 'BLOCKED', 'REVIEW', 'COMPLETE', 'FAILED',
  ];

  test('has all 8 keys', () => {
    EXPECTED_KEYS.forEach((key) => {
      expect(QUEUE_STATE_COLORS).toHaveProperty(key);
    });
  });

  test('all values are color strings', () => {
    Object.values(QUEUE_STATE_COLORS).forEach((value) => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });
});

describe('computeQueueItemState', () => {
  test('item with hasCampaign=false → READY', () => {
    const state = computeQueueItemState(
      { ...queueItem, hasCampaign: false },
      { campaigns: [], evidence: [], kcrs: [] }
    );
    expect(state).toBe(QUEUE_STATES.READY);
  });

  test('item with hasCampaign=true and no matching campaign → WAITING', () => {
    const state = computeQueueItemState(
      { ...queueItem, hasCampaign: true },
      { campaigns: [], evidence: [], kcrs: [] }
    );
    expect(state).toBe(QUEUE_STATES.WAITING);
  });

  test('item with hasCampaign=true and campaign.state=running → RUNNING', () => {
    const runningCampaign = { ...campaign, state: 'running' };
    const state = computeQueueItemState(
      { ...queueItem, hasCampaign: true, fieldPath: campaign.fieldPath },
      { campaigns: [runningCampaign], evidence: [], kcrs: [] }
    );
    expect(state).toBe(QUEUE_STATES.RUNNING);
  });

  test('item with hasCampaign=true and campaign.state=kcr → REVIEW', () => {
    const kcrCampaign = { ...campaign, state: 'kcr' };
    const state = computeQueueItemState(
      { ...queueItem, hasCampaign: true, fieldPath: campaign.fieldPath },
      { campaigns: [kcrCampaign], evidence: [], kcrs: [] }
    );
    expect(state).toBe(QUEUE_STATES.REVIEW);
  });

  test('item with hasCampaign=true and campaign.state=kcr and published KCR → COMPLETE', () => {
    const kcrCampaign = { ...campaign, state: 'kcr', kcr: { id: 'kcr-test-123' } };
    const publishedKcr = { id: 'kcr-test-123', state: 'published', campaignId: campaign.id };
    const state = computeQueueItemState(
      { ...queueItem, hasCampaign: true, fieldPath: campaign.fieldPath },
      { campaigns: [kcrCampaign], evidence: [], kcrs: [publishedKcr] }
    );
    expect(state).toBe(QUEUE_STATES.COMPLETE);
  });

  test('null item → READY', () => {
    const state = computeQueueItemState(null, { campaigns: [], evidence: [], kcrs: [] });
    expect(state).toBe(QUEUE_STATES.READY);
  });
});

describe('buildExecutionPlan', () => {
  test('returns providerIds array (non-empty)', () => {
    const plan = buildExecutionPlan(campaign, blueprint);
    expect(Array.isArray(plan.providerIds)).toBe(true);
    expect(plan.providerIds.length).toBeGreaterThan(0);
  });

  test('providerIds comes from blueprint.recommendedProviders when blueprint provided', () => {
    const plan = buildExecutionPlan(campaign, blueprint);
    expect(plan.providerIds).toEqual(blueprint.recommendedProviders);
  });

  test('returns maxRetries >= 1', () => {
    const plan = buildExecutionPlan(campaign, blueprint);
    expect(plan.maxRetries).toBeGreaterThanOrEqual(1);
  });

  test('returns gapKind', () => {
    const plan = buildExecutionPlan(campaign, blueprint);
    expect(plan.gapKind).toBeDefined();
    expect(typeof plan.gapKind).toBe('string');
  });
});

describe('runAutonomousCampaign', () => {
  test('returns campaignId matching campaign.id', () => {
    const result = runAutonomousCampaign(campaign, blueprint, {});
    expect(result.campaignId).toBe(campaign.id);
  });

  test('returns status: complete | partial | failed', () => {
    const result = runAutonomousCampaign(campaign, blueprint, {});
    expect(['complete', 'partial', 'failed']).toContain(result.status);
  });

  test('returns pipeline object with stages array', () => {
    const result = runAutonomousCampaign(campaign, blueprint, {});
    expect(result.pipeline).toBeDefined();
    expect(Array.isArray(result.pipeline.stages)).toBe(true);
  });

  test('returns providerRuns array (one per provider in plan)', () => {
    const result = runAutonomousCampaign(campaign, blueprint, {});
    expect(Array.isArray(result.providerRuns)).toBe(true);
    expect(result.providerRuns.length).toBe(blueprint.recommendedProviders.length);
  });

  test('returns summary string (non-empty)', () => {
    const result = runAutonomousCampaign(campaign, blueprint, {});
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(0);
  });

  test('null campaign → returns { status: failed }', () => {
    const result = runAutonomousCampaign(null, blueprint, {});
    expect(result.status).toBe('failed');
  });

  test('with blueprint → uses blueprint.recommendedProviders for plan', () => {
    const result = runAutonomousCampaign(campaign, blueprint, {});
    const providerIds = result.providerRuns.map((r) => r.providerId);
    blueprint.recommendedProviders.forEach((pid) => {
      expect(providerIds).toContain(pid);
    });
  });

  test('result.pipeline.stages has 7 entries', () => {
    const result = runAutonomousCampaign(campaign, blueprint, {});
    expect(result.pipeline.stages).toHaveLength(7);
  });
});

describe('batchRunAutonomous', () => {
  test('empty array → { results: [], summary: { total: 0 } }', () => {
    const output = batchRunAutonomous([], [], {});
    expect(output.results).toEqual([]);
    expect(output.summary.total).toBe(0);
  });

  test('single campaign → results.length === 1', () => {
    const output = batchRunAutonomous([campaign], [blueprint], {});
    expect(output.results).toHaveLength(1);
  });

  test('summary.complete + summary.partial + summary.failed === campaigns.length', () => {
    const campaigns = [campaign, campaign];
    const blueprints = [blueprint, blueprint];
    const output = batchRunAutonomous(campaigns, blueprints, {});
    const { complete = 0, partial = 0, failed = 0 } = output.summary;
    expect(complete + partial + failed).toBe(campaigns.length);
  });
});

describe('buildPerformanceReport', () => {
  test('empty input → []', () => {
    expect(buildPerformanceReport([])).toEqual([]);
  });

  test('run result with 2 providers → 2 entries in report', () => {
    const runResult = runAutonomousCampaign(campaign, blueprint, {});
    const report = buildPerformanceReport([runResult]);
    expect(report).toHaveLength(blueprint.recommendedProviders.length);
  });

  test('each entry has providerId, runs, successRate, avgRecords, avgLatencyMs', () => {
    const runResult = runAutonomousCampaign(campaign, blueprint, {});
    const report = buildPerformanceReport([runResult]);
    report.forEach((entry) => {
      expect(typeof entry.providerId).toBe('string');
      expect(typeof entry.runs).toBe('number');
      expect(typeof entry.successRate).toBe('number');
      expect(typeof entry.avgRecords).toBe('number');
      expect(typeof entry.avgLatencyMs).toBe('number');
    });
  });
});
