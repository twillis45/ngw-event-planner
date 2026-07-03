// KMP-1 — Knowledge Manufacturing Program golden tests
// Covers: researchPlaybooks.js, sourceCatalog.js, researchPipeline.js, researchRoles.js

import {
  RESEARCH_PLAYBOOKS, FRESHNESS_POLICIES,
  getResearchPlaybook, suggestPlaybooks, playbooksForDomain, playbooksForProvider, validatePlaybook,
} from './researchPlaybooks';

import {
  SOURCE_CATALOG,
  getSource, sourcesForDomain, sourcesForProvider, sourcesForEvidenceType,
  highReliabilitySources, unbiasedSources, catalogSummary, validateSource,
} from './sourceCatalog';

import {
  PIPELINE_STAGES, STAGE_LABELS, STAGE_STATUSES,
  createPipelineManifest, advanceStage, blockStage, skipStage,
  recordKCR, setImpactEstimate, getPipelineProgress, getPipelineStatus,
  buildPipelineMetrics, loadManifests, saveManifests, clearManifests, upsertManifest,
} from './researchPipeline';

import {
  RESEARCH_ROLES,
  getResearchRole, canPerform, publishingRoles, reviewingRoles, aiAssistRoles,
} from './researchRoles';

const ASOF = '2026-07-03';

// ── researchPlaybooks ─────────────────────────────────────────────────────────
describe('researchPlaybooks — Bundle B', () => {
  test('RESEARCH_PLAYBOOKS has ≥15 playbooks', () => {
    expect(RESEARCH_PLAYBOOKS.length).toBeGreaterThanOrEqual(15);
  });

  test('each playbook has all required fields', () => {
    const required = ['id', 'name', 'objective', 'providerFamilies', 'corroborationRequired', 'freshnessPolicy', 'reviewPath'];
    for (const pb of RESEARCH_PLAYBOOKS) {
      for (const field of required) {
        expect({ id: pb.id, field, present: pb[field] != null }).toEqual({ id: pb.id, field, present: true });
      }
      expect(typeof pb.corroborationRequired).toBe('number');
      expect(pb.corroborationRequired).toBeGreaterThanOrEqual(1);
    }
  });

  test('no duplicate playbook IDs', () => {
    const ids = RESEARCH_PLAYBOOKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('all providerFamilies reference valid families', () => {
    for (const pb of RESEARCH_PLAYBOOKS) {
      const v = validatePlaybook(pb);
      expect(v.unknownProviders).toHaveLength(0);
    }
  });

  test('getResearchPlaybook returns correct playbook by id', () => {
    const pb = getResearchPlaybook('govt-pricing-refresh');
    expect(pb).not.toBeNull();
    expect(pb.name).toBe('Government Pricing Refresh');
    expect(pb.freshnessPolicy).toBe('quarterly');
  });

  test('getResearchPlaybook returns null for unknown id', () => {
    expect(getResearchPlaybook('does-not-exist')).toBeNull();
  });

  test('suggestPlaybooks returns playbooks matching gapType', () => {
    const pricingPlaybooks = suggestPlaybooks('pricing');
    expect(pricingPlaybooks.length).toBeGreaterThan(0);
    for (const pb of pricingPlaybooks) {
      expect(pb.targetGapTypes).toContain('pricing');
    }
  });

  test('suggestPlaybooks returns [] for unknown gapType', () => {
    expect(suggestPlaybooks('nonexistent-gap')).toHaveLength(0);
  });

  test('playbooksForDomain returns relevant playbooks', () => {
    const outdoor = playbooksForDomain('outdoor-cooking');
    expect(outdoor.length).toBeGreaterThan(0);
    for (const pb of outdoor) {
      expect(pb.domains).toContain('outdoor-cooking');
    }
  });

  test('FRESHNESS_POLICIES has standard cadences', () => {
    expect(Object.keys(FRESHNESS_POLICIES)).toContain('quarterly');
    expect(Object.keys(FRESHNESS_POLICIES)).toContain('annual');
    expect(Object.keys(FRESHNESS_POLICIES)).toContain('monthly');
    expect(FRESHNESS_POLICIES.quarterly.maxAgeDays).toBe(90);
    expect(FRESHNESS_POLICIES.annual.maxAgeDays).toBe(365);
  });

  test('govt-pricing-refresh has correct corroboration and freshness', () => {
    const pb = getResearchPlaybook('govt-pricing-refresh');
    expect(pb.corroborationRequired).toBe(2);
    expect(pb.freshnessPolicy).toBe('quarterly');
    expect(pb.providerFamilies).toContain('government');
    expect(pb.knowledgeDimensions).toContain('Grounding');
    expect(pb.publicationRules).toContain('no-auto-publish');
  });

  test('food-safety-review requires food-safety sign-off', () => {
    const pb = getResearchPlaybook('food-safety-review');
    expect(pb).not.toBeNull();
    expect(pb.publicationRules).toContain('requires-food-safety-sign-off');
    expect(pb.reviewPath).toBe('food-safety-reviewer');
  });
});

// ── sourceCatalog ─────────────────────────────────────────────────────────────
describe('sourceCatalog — Bundle C', () => {
  test('SOURCE_CATALOG has ≥20 sources', () => {
    expect(SOURCE_CATALOG.length).toBeGreaterThanOrEqual(20);
  });

  test('each source has all required fields', () => {
    const required = ['id', 'name', 'family', 'authority', 'domain', 'coverage', 'reliability', 'freshnessPolicy', 'evidenceTypes', 'confidenceContribution'];
    for (const source of SOURCE_CATALOG) {
      for (const field of required) {
        expect({ id: source.id, field, present: source[field] != null }).toEqual({ id: source.id, field, present: true });
      }
    }
  });

  test('no duplicate source IDs', () => {
    const ids = SOURCE_CATALOG.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('all sources reference valid provider families', () => {
    for (const source of SOURCE_CATALOG) {
      const v = validateSource(source);
      expect(v.unknownFamily).toBe(false);
    }
  });

  test('getSource returns correct source by id', () => {
    const bls = getSource('bls-cpi');
    expect(bls).not.toBeNull();
    expect(bls.name).toBe('BLS Consumer Price Index');
    expect(bls.authority).toBe('official');
    expect(bls.commercialBias).toBe('none');
  });

  test('getSource returns null for unknown id', () => {
    expect(getSource('nonexistent-source')).toBeNull();
  });

  test('sourcesForDomain returns government sources for outdoor-cooking', () => {
    const sources = sourcesForDomain('outdoor-cooking');
    expect(sources.length).toBeGreaterThan(0);
    const govSources = sources.filter((s) => s.family === 'government');
    expect(govSources.length).toBeGreaterThan(0);
  });

  test('sourcesForProvider returns sources for government family', () => {
    const govSources = sourcesForProvider('government');
    expect(govSources.length).toBeGreaterThanOrEqual(3);
    for (const s of govSources) {
      expect(s.family).toBe('government');
    }
  });

  test('highReliabilitySources returns only high-reliability entries', () => {
    const high = highReliabilitySources('high');
    for (const s of high) {
      expect(s.reliability).toBe('high');
    }
    expect(high.length).toBeGreaterThan(5);
  });

  test('unbiasedSources returns sources with none or low commercial bias', () => {
    const unbiased = unbiasedSources();
    for (const s of unbiased) {
      expect(['none', 'low']).toContain(s.commercialBias);
    }
  });

  test('catalogSummary returns correct totals', () => {
    const summary = catalogSummary();
    expect(summary.total).toBe(SOURCE_CATALOG.length);
    expect(summary.governmentSources).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(summary.unverifiedFamilies)).toBe(true);
  });

  test('community sources have low reliability and corroboration note', () => {
    const community = SOURCE_CATALOG.filter((s) => s.family === 'community');
    expect(community.length).toBeGreaterThan(0);
    for (const s of community) {
      expect(s.reliability).toBe('low');
      expect(s.confidenceContribution).toBe('low');
    }
  });

  test('official government sources have public-domain or public licensing', () => {
    const govt = SOURCE_CATALOG.filter((s) => s.family === 'government');
    for (const s of govt) {
      expect(['public-domain', 'public']).toContain(s.licensing);
      expect(s.commercialBias).toBe('none');
    }
  });
});

// ── researchPipeline ──────────────────────────────────────────────────────────
describe('researchPipeline — Bundle A', () => {
  beforeEach(() => clearManifests());
  afterEach(() => clearManifests());

  test('PIPELINE_STAGES has exactly 12 stages', () => {
    expect(PIPELINE_STAGES).toHaveLength(12);
    expect(PIPELINE_STAGES[0]).toBe('discover');
    expect(PIPELINE_STAGES[PIPELINE_STAGES.length - 1]).toBe('track-validation');
  });

  test('STAGE_LABELS covers all 12 stages', () => {
    for (const stage of PIPELINE_STAGES) {
      expect(STAGE_LABELS[stage]).toBeDefined();
    }
  });

  test('createPipelineManifest returns correct shape', () => {
    const m = createPipelineManifest({ playbookId: 'govt-pricing-refresh', assetId: 'Crab Feast', at: ASOF });
    expect(m.id).toBeTruthy();
    expect(m.playbookId).toBe('govt-pricing-refresh');
    expect(m.assetId).toBe('Crab Feast');
    expect(m.status).toBe('active');
    expect(m.currentStage).toBe('discover');
    expect(m.stages.discover.status).toBe('in-progress');
    expect(m.stages.collect.status).toBe('pending');
    expect(PIPELINE_STAGES.every((s) => m.stages[s])).toBe(true);
  });

  test('advanceStage completes current stage and starts next', () => {
    const m = createPipelineManifest({ playbookId: 'govt-pricing-refresh', assetId: 'Crab Feast', at: ASOF });
    const m2 = advanceStage(m, 'discover', { outcome: 'Found 3 sources', at: ASOF });
    expect(m2.stages.discover.status).toBe('complete');
    expect(m2.stages.discover.outcome).toBe('Found 3 sources');
    expect(m2.stages.collect.status).toBe('in-progress');
    expect(m2.currentStage).toBe('collect');
    expect(m2.status).toBe('active');
  });

  test('advanceStage is pure — does not mutate original manifest', () => {
    const m = createPipelineManifest({ playbookId: 'govt-pricing-refresh', assetId: 'Crab Feast', at: ASOF });
    const before = JSON.stringify(m);
    advanceStage(m, 'discover', { outcome: 'Found 3 sources', at: ASOF });
    expect(JSON.stringify(m)).toBe(before);
  });

  test('advancing final stage sets status=complete', () => {
    let m = createPipelineManifest({ playbookId: 'govt-pricing-refresh', assetId: 'Crab Feast', at: ASOF });
    for (const stage of PIPELINE_STAGES) {
      m = advanceStage(m, stage, { outcome: 'done', at: ASOF });
    }
    expect(m.status).toBe('complete');
    expect(m.completedAt).toBe(ASOF);
  });

  test('blockStage sets status=blocked on the manifest', () => {
    const m = createPipelineManifest({ playbookId: 'govt-pricing-refresh', assetId: 'Crab Feast', at: ASOF });
    const m2 = blockStage(m, 'discover', 'Cannot access source', ASOF);
    expect(m2.status).toBe('blocked');
    expect(m2.stages.discover.status).toBe('blocked');
    expect(m2.stages.discover.notes).toBe('Cannot access source');
  });

  test('skipStage advances to next stage and marks current as skipped', () => {
    const m = createPipelineManifest({ playbookId: 'govt-pricing-refresh', assetId: 'Crab Feast', at: ASOF });
    const m2 = advanceStage(m, 'discover', { outcome: 'done', at: ASOF });
    const m3 = skipStage(m2, 'normalize', 'Data already normalized by provider', ASOF);
    expect(m3.stages.normalize.status).toBe('skipped');
    expect(m3.currentStage).toBe('deduplicate');
  });

  test('getPipelineProgress returns correct percentage', () => {
    let m = createPipelineManifest({ playbookId: 'govt-pricing-refresh', assetId: 'Crab Feast', at: ASOF });
    m = advanceStage(m, 'discover', { outcome: 'done', at: ASOF });
    m = advanceStage(m, 'collect', { outcome: 'done', at: ASOF });
    const progress = getPipelineProgress(m);
    expect(progress.completed).toBe(2);
    expect(progress.total).toBe(12);
    expect(progress.pct).toBe(17); // 2/12 = 16.67% rounds to 17%
    expect(progress.currentStage).toBe('normalize');
    expect(progress.blocked).toBe(false);
  });

  test('recordKCR appends KCR ID to manifest', () => {
    const m = createPipelineManifest({ playbookId: 'govt-pricing-refresh', assetId: 'Crab Feast', at: ASOF });
    const m2 = recordKCR(m, 'kcr-001', ASOF);
    expect(m2.kcrIds).toContain('kcr-001');
    const m3 = recordKCR(m2, 'kcr-002', ASOF);
    expect(m3.kcrIds).toHaveLength(2);
  });

  test('buildPipelineMetrics aggregates correctly', () => {
    const m1 = createPipelineManifest({ playbookId: 'govt-pricing-refresh', assetId: 'Crab Feast', at: ASOF });
    const m2 = createPipelineManifest({ playbookId: 'food-safety-review', assetId: 'Dinner Party', at: ASOF });
    const m2blocked = blockStage(m2, 'discover', 'Source unavailable', ASOF);
    const metrics = buildPipelineMetrics([m1, m2blocked]);
    expect(metrics.total).toBe(2);
    expect(metrics.active).toBe(1);
    expect(metrics.blocked).toBe(1);
    expect(metrics.complete).toBe(0);
    expect(metrics.kcrTotal).toBe(0);
  });

  test('buildPipelineMetrics on empty list returns safe defaults', () => {
    const m = buildPipelineMetrics([]);
    expect(m.total).toBe(0);
    expect(m.kcrTotal).toBe(0);
    expect(m.avgCompletionPct).toBe(0);
  });

  test('advanceStage throws on unknown stage', () => {
    const m = createPipelineManifest({ playbookId: 'govt-pricing-refresh', assetId: 'Crab Feast', at: ASOF });
    expect(() => advanceStage(m, 'mystery-stage', {})).toThrow('Unknown pipeline stage');
  });

  test('upsertManifest + loadManifests + clearManifests roundtrip', () => {
    const m = createPipelineManifest({ playbookId: 'govt-pricing-refresh', assetId: 'Crab Feast', at: ASOF });
    upsertManifest(m);
    const loaded = loadManifests();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe(m.id);
    clearManifests();
    expect(loadManifests()).toHaveLength(0);
  });
});

// ── researchRoles ─────────────────────────────────────────────────────────────
describe('researchRoles — Bundle I', () => {
  test('RESEARCH_ROLES has ≥7 roles', () => {
    expect(Object.keys(RESEARCH_ROLES).length).toBeGreaterThanOrEqual(7);
  });

  test('each role has required fields', () => {
    const required = ['label', 'description', 'responsibilities', 'canPropose', 'canReview', 'canPublish'];
    for (const [id, role] of Object.entries(RESEARCH_ROLES)) {
      for (const field of required) {
        expect({ id, field, present: role[field] != null }).toEqual({ id, field, present: true });
      }
      expect(Array.isArray(role.responsibilities)).toBe(true);
      expect(role.responsibilities.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('ONLY governance-publisher can publish', () => {
    const publishers = publishingRoles();
    expect(publishers.length).toBe(1);
    expect(publishers[0].id).toBe('governance-publisher');
  });

  test('ai-research-assistant cannot publish', () => {
    expect(canPerform('ai-research-assistant', 'publish')).toBe(false);
    expect(canPerform('ai-research-assistant', 'review')).toBe(false);
    expect(canPerform('ai-research-assistant', 'propose')).toBe(true);
  });

  test('governance-publisher cannot launch campaigns', () => {
    expect(canPerform('governance-publisher', 'launch-campaigns')).toBe(false);
    expect(canPerform('governance-publisher', 'publish')).toBe(true);
  });

  test('domain-expert can review but not publish', () => {
    expect(canPerform('domain-expert', 'review')).toBe(true);
    expect(canPerform('domain-expert', 'publish')).toBe(false);
    expect(canPerform('domain-expert', 'propose')).toBe(true);
  });

  test('getResearchRole returns correct role', () => {
    const steward = getResearchRole('research-steward');
    expect(steward).not.toBeNull();
    expect(steward.label).toBe('Research Steward');
    expect(steward.canLaunchCampaigns).toBe(true);
    expect(steward.canPublish).toBe(false);
  });

  test('getResearchRole returns null for unknown id', () => {
    expect(getResearchRole('super-admin')).toBeNull();
  });

  test('reviewingRoles returns ≥3 roles', () => {
    const reviewers = reviewingRoles();
    expect(reviewers.length).toBeGreaterThanOrEqual(3);
    for (const r of reviewers) {
      expect(canPerform(r.id, 'review')).toBe(true);
    }
  });

  test('aiAssistRoles includes ai-research-assistant', () => {
    const aiRoles = aiAssistRoles();
    const ids = aiRoles.map((r) => r.id);
    expect(ids).toContain('ai-research-assistant');
    const aiRole = aiRoles.find((r) => r.id === 'ai-research-assistant');
    expect(Array.isArray(aiRole.automatable)).toBe(true);
    expect(aiRole.automatable.length).toBeGreaterThan(0);
  });

  test('ai-research-assistant has a constraint note', () => {
    const ai = getResearchRole('ai-research-assistant');
    expect(ai.constraint).toContain('AI PROPOSES');
    expect(ai.constraint).toContain('HUMANS APPROVE');
  });

  test('canPerform returns false for invalid action', () => {
    expect(canPerform('governance-publisher', 'delete-corpus')).toBe(false);
    expect(canPerform('nonexistent-role', 'publish')).toBe(false);
  });
});
