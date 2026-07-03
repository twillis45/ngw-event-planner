// KML-1 — Mission Control golden tests
import {
  buildOvernightActivity, buildManufacturingQueue, buildKnowledgeHealth,
  buildPublishingQueue, buildKnowledgeAging, generateCampaignsFromQueue,
  buildResearchSession, buildExecutiveReport,
} from './missionControl';

const ASOF = '2026-07-03';
const YESTERDAY = '2026-07-02';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mkEv = (assetId, fieldPath, opts = {}) => ({
  id: `ev-${assetId}-${fieldPath}`.replace(/\./g, '-'),
  assetId, fieldPath,
  sourceType: opts.sourceType || 'official',
  region: opts.region || 'US',
  capturedAt: opts.capturedAt || ASOF,
  expirationDate: opts.expirationDate || '2027-01-01',
  extractedFacts: [],
  ...opts,
});

const mkKcr = (assetId, state, type = 'research') => ({
  id: `kcr-${assetId}-${state}`, assetId, state, type,
  createdAt: ASOF, updatedAt: ASOF, publishedAt: state === 'published' ? ASOF : null,
});

const crabPb = {
  type: 'Crab Feast', label: 'Crab Feast',
  purchases: [
    { id: 'p_crabs', item: 'Crabs', qtyPerGuest: 9, unitCostRange: [2.5, 9] },
    { id: 'p_corn', item: 'Corn', qtyPerGuest: 1.2, unitCostRange: [0.5, 1.5] },
  ],
  decisions: [],
  knowledge: { sources: [] },
};

const dinnerPb = {
  type: 'Dinner Party', label: 'Dinner Party',
  purchases: [{ id: 'p_food', item: 'Food', unitCostRange: [15, 40] }],
  decisions: [],
  knowledge: { sources: [] },
};

// ── buildOvernightActivity ─────────────────────────────────────────────────────
describe('buildOvernightActivity', () => {
  test('empty stores return empty=true', () => {
    const result = buildOvernightActivity({}, { asOf: ASOF });
    expect(result.empty).toBe(true);
    expect(result.workerRuns).toBe(0);
    expect(result.newObservations).toBe(0);
    expect(result.newKcrs).toBe(0);
  });

  test('counts items created since since-date', () => {
    const runs = [{ id: 'r1', typeId: 'freshness-worker', status: 'complete', at: ASOF }];
    const observations = [{ id: 'o1', at: ASOF }, { id: 'o2', at: '2026-06-01' }];
    const evidence = [{ id: 'ev1', capturedAt: ASOF }];
    const result = buildOvernightActivity({ runs, observations, evidence, findings: [], kcrs: [], campaigns: [] }, { asOf: ASOF, sinceDate: YESTERDAY });
    expect(result.workerRuns).toBe(1);
    expect(result.newObservations).toBe(1);
    expect(result.newEvidence).toBe(1);
    expect(result.empty).toBe(false);
  });

  test('counts provider failures separately', () => {
    const runs = [
      { id: 'r1', typeId: 'freshness-worker', status: 'failed', at: ASOF },
      { id: 'r2', typeId: 'gap-detection-worker', status: 'complete', at: ASOF },
    ];
    const result = buildOvernightActivity({ runs, observations: [], evidence: [], findings: [], kcrs: [], campaigns: [] }, { asOf: ASOF, sinceDate: YESTERDAY });
    expect(result.providerFailures).toBe(1);
    expect(result.failedProviders).toContain('freshness-worker');
    expect(result.workerRuns).toBe(2);
  });

  test('counts published vs new KCRs separately', () => {
    const kcrs = [
      mkKcr('Crab Feast', 'published'),
      mkKcr('Dinner Party', 'proposed'),
    ];
    const result = buildOvernightActivity({ runs: [], observations: [], evidence: [], findings: [], kcrs, campaigns: [] }, { asOf: ASOF, sinceDate: YESTERDAY });
    expect(result.published).toBe(1);
    expect(result.newKcrs).toBe(1);
  });

  test('auto-derives since from asOf when not provided', () => {
    const result = buildOvernightActivity({}, { asOf: ASOF });
    expect(result.since).toBe(YESTERDAY);
    expect(result.asOf).toBe(ASOF);
  });
});

// ── buildManufacturingQueue ────────────────────────────────────────────────────
describe('buildManufacturingQueue', () => {
  test('returns HIGH priority for fields with no evidence', () => {
    const queue = buildManufacturingQueue([crabPb], [], [], ASOF);
    expect(queue.length).toBeGreaterThan(0);
    const high = queue.filter((q) => q.priority === 'HIGH');
    expect(high.length).toBeGreaterThan(0);
  });

  test('HIGH items sort before MED sort before LOW', () => {
    const evStale = mkEv('Crab Feast', 'p_crabs.unitCostRange', { capturedAt: '2025-12-01', expirationDate: '2027-01-01', sourceType: 'official' });
    const evFresh = mkEv('Crab Feast', 'p_corn.qtyPerGuest', { capturedAt: ASOF, expirationDate: '2027-01-01', sourceType: 'commercial' });
    const queue = buildManufacturingQueue([crabPb], [evStale, evFresh], [], ASOF);
    const priorities = queue.map((q) => q.priority);
    const highIdx = priorities.indexOf('HIGH');
    const medIdx  = priorities.findIndex((p) => p === 'MED');
    const lowIdx  = priorities.findIndex((p) => p === 'LOW');
    if (highIdx >= 0 && medIdx >= 0) expect(highIdx).toBeLessThan(medIdx);
    if (medIdx >= 0 && lowIdx >= 0) expect(medIdx).toBeLessThan(lowIdx);
  });

  test('stale evidence (>180d) is HIGH priority', () => {
    const oldEv = mkEv('Crab Feast', 'p_crabs.unitCostRange', { capturedAt: '2025-12-01', sourceType: 'official' });
    const queue = buildManufacturingQueue([crabPb], [oldEv], [], ASOF);
    const staleItem = queue.find((q) => q.fieldPath === 'p_crabs.unitCostRange');
    expect(staleItem).toBeDefined();
    expect(staleItem.priority).toBe('HIGH');
  });

  test('commercial-only evidence is MED priority', () => {
    const commEv = mkEv('Crab Feast', 'p_crabs.unitCostRange', { sourceType: 'commercial', capturedAt: ASOF });
    const queue = buildManufacturingQueue([crabPb], [commEv], [], ASOF);
    const item = queue.find((q) => q.fieldPath === 'p_crabs.unitCostRange');
    expect(item?.priority).toBe('MED');
    expect(item?.reason).toMatch(/commercial/i);
  });

  test('marks item as hasCampaign when campaign exists for that field', () => {
    const campaigns = [{ id: 'c1', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange' }];
    const queue = buildManufacturingQueue([crabPb], [], campaigns, ASOF);
    const item = queue.find((q) => q.fieldPath === 'p_crabs.unitCostRange');
    expect(item?.hasCampaign).toBe(true);
  });

  test('fully covered fields do not appear in queue', () => {
    const freshGovEv = mkEv('Crab Feast', 'p_crabs.unitCostRange', { sourceType: 'official', capturedAt: ASOF, expirationDate: '2027-01-01' });
    const queue = buildManufacturingQueue([crabPb], [freshGovEv], [], ASOF);
    const covered = queue.find((q) => q.fieldPath === 'p_crabs.unitCostRange');
    expect(covered).toBeUndefined();
  });

  test('spans multiple playbooks', () => {
    const queue = buildManufacturingQueue([crabPb, dinnerPb], [], [], ASOF);
    const playbookTypes = [...new Set(queue.map((q) => q.playbookType))];
    expect(playbookTypes).toContain('Crab Feast');
    expect(playbookTypes).toContain('Dinner Party');
  });

  test('returns empty array for no playbooks', () => {
    expect(buildManufacturingQueue([], [], [], ASOF)).toHaveLength(0);
  });
});

// ── buildKnowledgeHealth ──────────────────────────────────────────────────────
describe('buildKnowledgeHealth', () => {
  test('returns health entry for each playbook', () => {
    const { health } = buildKnowledgeHealth([crabPb, dinnerPb], [], [], ASOF);
    expect(health['Crab Feast']).toBeDefined();
    expect(health['Dinner Party']).toBeDefined();
  });

  test('Grounding is none when no evidence', () => {
    const { health } = buildKnowledgeHealth([crabPb], [], [], ASOF);
    expect(health['Crab Feast'].dimensions.Grounding.label).toBe('none');
    expect(health['Crab Feast'].dimensions.Grounding.evidenceCount).toBe(0);
  });

  test('Grounding improves when evidence covers fields', () => {
    const evs = [
      mkEv('Crab Feast', 'p_crabs.unitCostRange'),
      mkEv('Crab Feast', 'p_corn.unitCostRange'),
      mkEv('Crab Feast', 'p_crabs.qtyPerGuest'),
      mkEv('Crab Feast', 'p_corn.qtyPerGuest'),
    ];
    const { health } = buildKnowledgeHealth([crabPb], evs, [], ASOF);
    expect(health['Crab Feast'].dimensions.Grounding.label).not.toBe('none');
    expect(health['Crab Feast'].totalEvidence).toBe(4);
  });

  test('returns 10 dimensions per playbook', () => {
    const { health, dimensions } = buildKnowledgeHealth([crabPb], [], [], ASOF);
    expect(dimensions.length).toBe(10);
    expect(Object.keys(health['Crab Feast'].dimensions).length).toBe(10);
  });

  test('Validation is high when a validated KCR exists', () => {
    const kcrs = [mkKcr('Crab Feast', 'validated')];
    const { health } = buildKnowledgeHealth([crabPb], [], kcrs, ASOF);
    expect(health['Crab Feast'].dimensions.Validation.label).toBe('high');
  });
});

// ── buildPublishingQueue ──────────────────────────────────────────────────────
describe('buildPublishingQueue', () => {
  test('routes KCRs to correct queue by state', () => {
    const kcrs = [
      mkKcr('A', 'proposed'),
      mkKcr('B', 'sme-review'),
      mkKcr('C', 'editorial-review'),
      mkKcr('D', 'governance-review'),
      mkKcr('E', 'validated'),
      mkKcr('F', 'published'),
    ];
    const q = buildPublishingQueue(kcrs);
    expect(q.awaitingReview.length).toBe(1);
    expect(q.awaitingSme.length).toBe(1);
    expect(q.awaitingEditorial.length).toBe(1);
    expect(q.awaitingGovernance.length).toBe(1);
    expect(q.awaitingValidation.length).toBe(1);
    expect(q.total).toBe(5);  // published is not in total
  });

  test('returns empty queues for no KCRs', () => {
    const q = buildPublishingQueue([]);
    expect(q.total).toBe(0);
    expect(q.awaitingReview).toHaveLength(0);
  });
});

// ── buildKnowledgeAging ───────────────────────────────────────────────────────
describe('buildKnowledgeAging', () => {
  test('categorizes evidence by expiry proximity', () => {
    const evs = [
      mkEv('A', 'f1', { expirationDate: '2026-06-01' }),   // overdue
      mkEv('A', 'f2', { expirationDate: '2026-07-05' }),   // expires this week
      mkEv('A', 'f3', { expirationDate: '2026-07-20' }),   // expires this month
      mkEv('A', 'f4', { expirationDate: '2027-06-01' }),   // healthy
      mkEv('A', 'f5', { expirationDate: null }),             // no expiry
    ];
    const aging = buildKnowledgeAging(evs, ASOF);
    expect(aging.overdue).toHaveLength(1);
    expect(aging.expiresThisWeek).toHaveLength(1);
    expect(aging.expiresThisMonth).toHaveLength(1);
    expect(aging.healthy).toHaveLength(1);
    expect(aging.noExpiry).toHaveLength(1);
    expect(aging.total).toBe(5);
  });

  test('returns safe empty state for no evidence', () => {
    const aging = buildKnowledgeAging([], ASOF);
    expect(aging.overdue).toHaveLength(0);
    expect(aging.total).toBe(0);
  });
});

// ── generateCampaignsFromQueue ────────────────────────────────────────────────
describe('generateCampaignsFromQueue', () => {
  test('generates campaigns for HIGH items without existing campaigns', () => {
    const queue = [
      { priority: 'HIGH', playbookType: 'Crab Feast', playbookLabel: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', fieldLabel: 'Crabs — unit cost range', gapKind: 'pricing', reason: 'No evidence', hasCampaign: false, suggestedProviders: ['market-pricing'] },
      { priority: 'MED',  playbookType: 'Crab Feast', playbookLabel: 'Crab Feast', fieldPath: 'p_corn.unitCostRange', fieldLabel: 'Corn — unit cost range', gapKind: 'pricing', reason: 'Stale', hasCampaign: false, suggestedProviders: ['retail'] },
    ];
    const campaigns = generateCampaignsFromQueue(queue, { priorities: ['HIGH'], at: ASOF });
    expect(campaigns.length).toBe(1);
    expect(campaigns[0].assetId).toBe('Crab Feast');
    expect(campaigns[0].fieldPath).toBe('p_crabs.unitCostRange');
    expect(campaigns[0].providerIds).toContain('market-pricing');
  });

  test('skips items that already have campaigns', () => {
    const queue = [
      { priority: 'HIGH', playbookType: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', fieldLabel: 'x', gapKind: 'pricing', reason: 'r', playbookLabel: 'Crab Feast', hasCampaign: true, suggestedProviders: [] },
    ];
    expect(generateCampaignsFromQueue(queue, { priorities: ['HIGH'], at: ASOF })).toHaveLength(0);
  });

  test('respects limit param', () => {
    const queue = Array.from({ length: 20 }, (_, i) => ({
      priority: 'HIGH', playbookType: 'Crab Feast', playbookLabel: 'Crab Feast',
      fieldPath: `field_${i}`, fieldLabel: `Field ${i}`, gapKind: 'pricing',
      reason: 'missing', hasCampaign: false, suggestedProviders: [],
    }));
    expect(generateCampaignsFromQueue(queue, { priorities: ['HIGH'], limit: 5, at: ASOF })).toHaveLength(5);
  });

  test('generated campaigns have required fields', () => {
    const queue = [{ priority: 'HIGH', playbookType: 'Crab Feast', playbookLabel: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', fieldLabel: 'Crabs', gapKind: 'pricing', reason: 'No evidence', hasCampaign: false, suggestedProviders: ['market-pricing'] }];
    const c = generateCampaignsFromQueue(queue, { at: ASOF })[0];
    expect(c.id).toBeDefined();
    expect(c.goal).toBeDefined();
    expect(c.assetId).toBe('Crab Feast');
    expect(c.state).toBe('draft');
  });
});

// ── buildResearchSession ──────────────────────────────────────────────────────
describe('buildResearchSession', () => {
  test('returns null for missing playbook', () => {
    expect(buildResearchSession(null, [], [], [], ASOF)).toBeNull();
  });

  test('all fields are missing when no evidence exists', () => {
    const session = buildResearchSession(crabPb, [], [], [], ASOF);
    expect(session.missingFields.length).toBe(session.totalFields);
    expect(session.researchDebt).toBeGreaterThan(0);
    expect(session.coveredFields).toBe(0);
  });

  test('covered fields reduce missing count', () => {
    const evs = [mkEv('Crab Feast', 'p_crabs.unitCostRange')];
    const session = buildResearchSession(crabPb, evs, [], [], ASOF);
    expect(session.coveredFields).toBe(1);
    expect(session.missingFields.length).toBe(session.totalFields - 1);
  });

  test('identifies commercial-only fields', () => {
    const commEv = mkEv('Crab Feast', 'p_crabs.unitCostRange', { sourceType: 'commercial' });
    const session = buildResearchSession(crabPb, [commEv], [], [], ASOF);
    expect(session.commercialOnly.some((f) => f.path === 'p_crabs.unitCostRange')).toBe(true);
  });

  test('includes suggested providers', () => {
    const session = buildResearchSession(crabPb, [], [], [], ASOF);
    expect(session.suggestedProviders.length).toBeGreaterThan(0);
  });

  test('includes active campaigns and KCRs', () => {
    const campaigns = [{ id: 'c1', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', state: 'running' }];
    const kcrs = [mkKcr('Crab Feast', 'proposed')];
    const session = buildResearchSession(crabPb, [], kcrs, campaigns, ASOF);
    expect(session.activeCampaigns).toHaveLength(1);
    expect(session.activeKcrs).toHaveLength(1);
  });
});

// ── buildExecutiveReport ──────────────────────────────────────────────────────
describe('buildExecutiveReport', () => {
  test('returns all required sections', () => {
    const report = buildExecutiveReport({ overnight: null, queue: [], health: null, publishingQueue: null, aging: null }, { playbooks: [], asOf: ASOF });
    const sections = report.sections;
    expect(sections.whatImproved).toBeDefined();
    expect(sections.whatDegraded).toBeDefined();
    expect(sections.whatChanged).toBeDefined();
    expect(sections.whatPublished).toBeDefined();
    expect(sections.whatFailed).toBeDefined();
    expect(sections.topResearch).toBeDefined();
    expect(sections.roiWork).toBeDefined();
    expect(sections.knowledgeVelocity).toBeDefined();
    expect(sections.agingSummary).toBeDefined();
    expect(report.generatedAt).toBe(ASOF);
  });

  test('lists top research opportunities from HIGH queue items', () => {
    const queue = [
      { priority: 'HIGH', playbookLabel: 'Crab Feast', fieldLabel: 'Crabs — unit cost range', reason: 'No evidence', suggestedProviders: ['market-pricing'] },
    ];
    const report = buildExecutiveReport({ overnight: null, queue, health: null, publishingQueue: null, aging: null }, { asOf: ASOF });
    expect(report.sections.topResearch.length).toBe(1);
    expect(report.sections.topResearch[0]).toMatch(/Crab Feast/);
  });

  test('reports overnight velocity when data available', () => {
    const overnight = { newObservations: 4, newEvidence: 12, newFindings: 3, newKcrs: 2, published: 1, providerFailures: 0, failedProviders: [], empty: false };
    const report = buildExecutiveReport({ overnight, queue: [], health: null, publishingQueue: null, aging: null }, { asOf: ASOF });
    expect(report.sections.knowledgeVelocity).toMatch(/12 evidence/);
    expect(report.sections.whatPublished).toMatch(/1 KCRs published/);
  });
});
