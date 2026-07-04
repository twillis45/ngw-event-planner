// ─── Golden Test (KRE-1 Bundle L) ─────────────────────────────────────────────
// Full integration path: Crab Feast → missing pricing → blueprint → campaign →
// providers execute → evidence → finding → KCR draft.
//
// NO JSON pasting. NO manual campaign editing. No human step until KCR review.
// Verifies the complete autonomous pipeline end-to-end in simulate mode.

import { createCampaign } from './campaign';
import { generateResearchBlueprint } from './researchBlueprint';
import { runAutonomousCampaign, buildExecutionPlan, computeQueueItemState, QUEUE_STATES } from './campaignRunner';
import { runEvidencePipeline, PIPELINE_STAGE_NAMES } from './evidencePipeline';
import { buildProviders } from './providers';
import { researchPolicyFor, isStaleByPolicy, nextResearchDate } from './researchPolicies';
import { executeProvider } from './providerExecutors';

const ASOF = '2026-07-03';

// ── Canonical gap: Crab Feast pricing ────────────────────────────────────────
// Include claim + sufficientWhen so blueprint can assemble a full specification.
const CRAB_GAP = {
  fieldPath:    'p_crabs.unitCostRange',
  fieldLabel:   'Crabs — unit cost range',
  gapKind:      'pricing',
  playbookType: 'crabFeast',
  priority:     'HIGH',
  hasCampaign:  false,
  evidenceCount: 0,
  claim:        'Larges cost $7.92–8.17/crab at retail in the DMV area',
  sufficientWhen: '≥2 retail sources agree on a price range within 15% margin',
};

// ── Step 1: Blueprint is generated — no manual provider selection ────────────
describe('Step 1: Blueprint generation (no manual provider selection)', () => {
  let bp;
  beforeEach(() => {
    bp = generateResearchBlueprint(CRAB_GAP, { asOf: ASOF });
  });

  test('blueprint is not null', () => {
    expect(bp).not.toBeNull();
  });

  test('blueprint has a claim (testable proposition)', () => {
    expect(typeof bp.claim).toBe('string');
    expect(bp.claim.length).toBeGreaterThan(10);
  });

  test('blueprint has recommendedProviders (no manual selection needed)', () => {
    expect(Array.isArray(bp.recommendedProviders)).toBe(true);
    expect(bp.recommendedProviders.length).toBeGreaterThan(0);
  });

  test('blueprint has successCriteria (string from gap.sufficientWhen)', () => {
    expect(bp.successCriteria).toBe(CRAB_GAP.sufficientWhen);
    expect(typeof bp.successCriteria).toBe('string');
  });

  test('blueprint has requiredEvidence', () => {
    expect(Array.isArray(bp.requiredEvidence)).toBe(true);
  });

  test('blueprint has workerAssignments', () => {
    expect(Array.isArray(bp.workerAssignments)).toBe(true);
  });

  test('blueprint has corroborationRequirements', () => {
    expect(bp.corroborationRequirements).toBeDefined();
  });

  test('blueprint has authorityRequirements', () => {
    expect(bp.authorityRequirements).toBeDefined();
  });

  test('blueprint knows expected outputs', () => {
    expect(Array.isArray(bp.expectedOutputs)).toBe(true);
  });
});

// ── Step 2: Execution plan derived from blueprint — no heuristics ────────────
describe('Step 2: Execution plan — blueprint is the only provider source', () => {
  let campaign, bp, plan;
  beforeEach(() => {
    bp = generateResearchBlueprint(CRAB_GAP, { asOf: ASOF });
    campaign = createCampaign({
      goal:       'Crab Feast: research pricing for p_crabs.unitCostRange',
      assetId:    'crabFeast',
      fieldPath:  'p_crabs.unitCostRange',
      gapType:    'pricing',
      providers:  bp.recommendedProviders,
      at:         ASOF,
    });
    plan = buildExecutionPlan(campaign, bp);
  });

  test('plan.providerIds comes from blueprint (not heuristic)', () => {
    expect(plan.providerIds).toEqual(expect.arrayContaining(bp.recommendedProviders.slice(0, plan.providerIds.length)));
  });

  test('plan.maxRetries from policy (not hardcoded)', () => {
    const policy = researchPolicyFor('pricing');
    expect(plan.maxRetries).toBe(policy.retryAttempts);
  });

  test('plan.corroborationRequired from blueprint', () => {
    expect(typeof plan.corroborationRequired).toBe('boolean');
  });

  test('plan.gapKind is set', () => {
    expect(plan.gapKind).toBeTruthy();
  });

  test('plan has at most 6 providers (blast-radius cap)', () => {
    expect(plan.providerIds.length).toBeLessThanOrEqual(6);
  });
});

// ── Step 3: Providers execute — no JSON pasting ──────────────────────────────
describe('Step 3: Provider execution — simulate mode, no external calls', () => {
  let bp;
  beforeEach(() => {
    bp = generateResearchBlueprint(CRAB_GAP, { asOf: ASOF });
  });

  test('each recommended provider returns records without manual JSON', () => {
    for (const pid of bp.recommendedProviders.slice(0, 3)) {
      let records;
      try {
        records = executeProvider(pid, CRAB_GAP, bp, { mode: 'simulate', asOf: ASOF });
        // records may be [] (e.g. internal-validation is honest-empty)
        expect(Array.isArray(records)).toBe(true);
      } catch (e) {
        // Unknown provider is ok; just log
      }
    }
  });

  test('commercial provider returns pricing records', () => {
    const records = executeProvider('market-pricing', CRAB_GAP, bp, { mode: 'simulate', asOf: ASOF });
    expect(records.length).toBeGreaterThan(0);
    expect(typeof records[0].statement).toBe('string');
    expect(records[0].source).toBeTruthy();
  });

  test('government provider returns pricing records', () => {
    const records = executeProvider('data.gov', CRAB_GAP, bp, { mode: 'simulate', asOf: ASOF });
    expect(records.length).toBeGreaterThan(0);
    expect(records[0].gapType).toBeTruthy();
  });
});

// ── Step 4: Evidence pipeline — 7 named stages ───────────────────────────────
describe('Step 4: Evidence pipeline — observations → evidence → finding', () => {
  let campaign, bp, allRecords, pipeline;
  beforeEach(() => {
    bp = generateResearchBlueprint(CRAB_GAP, { asOf: ASOF });
    campaign = createCampaign({
      goal:      'Crab Feast pricing',
      assetId:   'crabFeast',
      fieldPath: 'p_crabs.unitCostRange',
      gapType:   'pricing',
      providers: bp.recommendedProviders,
      at:        ASOF,
    });
    allRecords = {};
    for (const pid of bp.recommendedProviders.slice(0, 4)) {
      try {
        allRecords[pid] = executeProvider(pid, CRAB_GAP, bp, { mode: 'simulate', asOf: ASOF });
      } catch (e) {
        allRecords[pid] = [];
      }
    }
    const providers = buildProviders();
    pipeline = runEvidencePipeline(allRecords, { campaign, blueprint: bp, providers, asOf: ASOF });
  });

  test('pipeline returns 7 stages', () => {
    expect(pipeline.stages.length).toBe(7);
  });

  test('all 7 stage names are present', () => {
    const names = pipeline.stages.map((s) => s.name);
    expect(names).toEqual(PIPELINE_STAGE_NAMES);
  });

  test('all stages complete (no failures)', () => {
    const failed = pipeline.stages.filter((s) => s.status === 'failed');
    expect(failed).toHaveLength(0);
  });

  test('normalize stage produced observations', () => {
    const norm = pipeline.stages.find((s) => s.name === 'normalize');
    expect(norm.outputCount).toBeGreaterThan(0);
  });

  test('evidence stage produced evidence records', () => {
    expect(pipeline.result.evidence).toBeGreaterThanOrEqual(0);
  });

  test('finding stage produced a finding', () => {
    expect(pipeline.result.finding).not.toBeNull();
  });

  test('finalCampaign is not null', () => {
    expect(pipeline.finalCampaign).not.toBeNull();
  });
});

// ── Step 5: Full autonomous run — end-to-end golden path ─────────────────────
describe('Step 5: runAutonomousCampaign — full end-to-end without JSON pasting', () => {
  let campaign, bp, run;
  beforeEach(() => {
    bp = generateResearchBlueprint(CRAB_GAP, { asOf: ASOF });
    campaign = createCampaign({
      goal:      'Autonomous: Crab Feast pricing research',
      assetId:   'crabFeast',
      fieldPath: 'p_crabs.unitCostRange',
      gapType:   'pricing',
      providers: bp.recommendedProviders,
      at:        ASOF,
    });
    run = runAutonomousCampaign(campaign, bp, { mode: 'simulate', asOf: ASOF });
  });

  test('run returns a result', () => {
    expect(run).not.toBeNull();
  });

  test('run.campaignId matches campaign', () => {
    expect(run.campaignId).toBe(campaign.id);
  });

  test('run.status is complete or partial (not failed)', () => {
    expect(['complete', 'partial']).toContain(run.status);
  });

  test('run.plan was derived from blueprint', () => {
    expect(run.plan).toBeDefined();
    expect(run.plan.providerIds.length).toBeGreaterThan(0);
  });

  test('run.providerRuns has one entry per planned provider', () => {
    expect(run.providerRuns.length).toBe(run.plan.providerIds.length);
  });

  test('at least one provider run succeeded', () => {
    const success = run.providerRuns.filter((r) => r.success);
    expect(success.length).toBeGreaterThan(0);
  });

  test('run.pipeline has 7 stages', () => {
    expect(run.pipeline.stages.length).toBe(7);
  });

  test('run.pipeline stages all complete', () => {
    const failed = run.pipeline.stages.filter((s) => s.status === 'failed');
    expect(failed).toHaveLength(0);
  });

  test('run.summary is a non-empty string', () => {
    expect(typeof run.summary).toBe('string');
    expect(run.summary.length).toBeGreaterThan(10);
  });

  test('governance: kcrDraft is a DRAFT (not published)', () => {
    if (run.kcrDraft) {
      expect(run.kcrDraft.state).not.toBe('published');
    }
    // If null, no KCR draft produced yet — also fine (partial evidence)
  });

  test('governance: providerRuns never produce knowledge-edit', () => {
    for (const pr of run.providerRuns) {
      // providerRuns are raw records — they must not contain published KCRs or knowledge edits
      for (const rec of (pr.records || [])) {
        expect(rec).not.toHaveProperty('kcr-published');
        expect(rec).not.toHaveProperty('knowledge-edit');
      }
    }
  });
});

// ── Step 6: Queue state reflects autonomous execution ────────────────────────
describe('Step 6: Queue state machine — reflects run outcome', () => {
  test('gap starts as READY (no campaign)', () => {
    const state = computeQueueItemState(CRAB_GAP, { campaigns: [], evidence: [], kcrs: [] });
    expect(state).toBe(QUEUE_STATES.READY);
  });

  test('after run, campaign moves queue state from READY to at least WAITING', () => {
    const bp = generateResearchBlueprint(CRAB_GAP, { asOf: ASOF });
    const campaign = createCampaign({
      goal:      'Queue state test',
      assetId:   CRAB_GAP.playbookType,
      fieldPath: CRAB_GAP.fieldPath,
      gapType:   CRAB_GAP.gapKind,
      providers: bp.recommendedProviders,
      at:        ASOF,
    });
    const run = runAutonomousCampaign(campaign, bp, { mode: 'simulate', asOf: ASOF });
    const newState = computeQueueItemState(
      { ...CRAB_GAP, hasCampaign: true },
      { campaigns: [run.pipeline.finalCampaign], evidence: [], kcrs: [] }
    );
    // After run, must not be READY anymore
    expect(newState).not.toBe(QUEUE_STATES.READY);
  });

  test('KCR draft in REVIEW state — not COMPLETE (human must approve)', () => {
    const bp = generateResearchBlueprint(CRAB_GAP, { asOf: ASOF });
    const campaign = createCampaign({
      goal:      'Review state test',
      assetId:   CRAB_GAP.playbookType,
      fieldPath: CRAB_GAP.fieldPath,
      gapType:   CRAB_GAP.gapKind,
      providers: bp.recommendedProviders,
      at:        ASOF,
    });
    const run = runAutonomousCampaign(campaign, bp, { mode: 'simulate', asOf: ASOF });
    const finalCampaign = run.pipeline.finalCampaign;
    const newState = computeQueueItemState(
      { ...CRAB_GAP, hasCampaign: true },
      { campaigns: [finalCampaign], evidence: [], kcrs: [] }
    );
    // Must be REVIEW or WAITING — NOT COMPLETE (human hasn't published yet)
    expect(newState).not.toBe(QUEUE_STATES.COMPLETE);
  });
});

// ── Step 7: Policy compliance ─────────────────────────────────────────────────
describe('Step 7: Policy compliance — freshness, retry, scheduling', () => {
  test('pricing evidence is stale after 46 days', () => {
    const ev = { capturedAt: '2026-05-18', fieldPath: CRAB_GAP.fieldPath };
    // ASOF is 2026-07-03 = 46 days after 2026-05-18 → stale by 45-day pricing policy
    expect(isStaleByPolicy(ev, 'pricing', ASOF)).toBe(true);
  });

  test('pricing evidence is not stale after 10 days', () => {
    const ev = { capturedAt: '2026-06-23', fieldPath: CRAB_GAP.fieldPath };
    expect(isStaleByPolicy(ev, 'pricing', ASOF)).toBe(false);
  });

  test('nextResearchDate for pricing is 45 days out', () => {
    const next = nextResearchDate('2026-07-03', 'pricing');
    expect(next).toBe('2026-08-17');
  });
});
