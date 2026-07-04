// ─── Autonomous Campaign Runner (KRE-1 Bundle A + K) ──────────────────────────
// Orchestrates a full research campaign without manual JSON pasting.
// Blueprint drives provider selection, ordering, and corroboration.
// Failure recovery handles retries, timeouts, partial evidence, and corruption.
//
// Flow:
//   Blueprint → execution plan → provider execution (with retry) →
//   evidence pipeline → corroboration (if needed) → KCR draft
//
// GOVERNANCE: never publishes. Produces only KCR *drafts*.
//   Workers neverProduces: ['kcr-published', 'knowledge-edit']
//
// REUSES: researchBlueprint, researchPolicies, providerExecutors, evidencePipeline,
//         providers, campaign, researchRunner, providerIntelligence
//
// Pure: no localStorage writes. Caller persists what it wants.

import { buildProviders }                                    from './providers';
import { generateResearchBlueprint }                         from './researchBlueprint';
import { runEvidencePipeline, stageSummary }                 from './evidencePipeline';
import { researchPolicyFor, classifyFailure, shouldRetry }   from './researchPolicies';
import { executeProvider }                                   from './providerExecutors';
import { autoCorroborate }                                   from './researchRunner';
import { recordProviderRun }                                 from './providerIntelligence';

// ── Queue Item State Machine (Bundle D) ───────────────────────────────────────
// These states appear in Mission Control queue. Derived — never stored.
export const QUEUE_STATES = {
  READY:         'READY',         // blueprint exists, no campaign
  WAITING:       'WAITING',       // campaign draft, not yet run
  RUNNING:       'RUNNING',       // campaign executing
  CORROBORATING: 'CORROBORATING', // primary evidence found, corroboration needed
  BLOCKED:       'BLOCKED',       // max retries or provider unavailable
  REVIEW:        'REVIEW',        // KCR draft awaiting human
  COMPLETE:      'COMPLETE',      // KCR published
  FAILED:        'FAILED',        // no recovery path
};

// State colors for UI.
export const QUEUE_STATE_COLORS = {
  READY:         '#4ea6dc',
  WAITING:       '#a0a8b8',
  RUNNING:       '#f5a623',
  CORROBORATING: '#9b59b6',
  BLOCKED:       '#e74c3c',
  REVIEW:        '#2ecc71',
  COMPLETE:      '#27ae60',
  FAILED:        '#c0392b',
};

// ── computeQueueItemState ──────────────────────────────────────────────────────
// Derive QUEUE_STATES value from item + related campaigns/evidence/kcrs.
// Pure — no side effects.
export function computeQueueItemState(item, { campaigns = [], evidence = [], kcrs = [] } = {}) {
  if (!item) return QUEUE_STATES.READY;

  if (!item.hasCampaign) return QUEUE_STATES.READY;

  // Find the campaign for this item
  const campaign = campaigns.find(
    (c) => c.assetId === item.playbookType && c.fieldPath === item.fieldPath
  );
  if (!campaign) return QUEUE_STATES.WAITING;

  // KCR state takes priority
  if (campaign.state === 'kcr' || campaign.state === 'published' || campaign.state === 'validated') {
    const kcrId = campaign.kcr?.id || (typeof campaign.kcr === 'string' ? campaign.kcr : null);
    const kcr = kcrId ? kcrs.find((k) => k.id === kcrId) : null;
    if (kcr?.state === 'published' || campaign.state === 'published') return QUEUE_STATES.COMPLETE;
    return QUEUE_STATES.REVIEW;
  }

  if (campaign.blocked) return QUEUE_STATES.BLOCKED;
  if (campaign.failed)  return QUEUE_STATES.FAILED;

  if (campaign.state === 'running') return QUEUE_STATES.RUNNING;

  if (campaign.state === 'evidence' || campaign.state === 'findings') {
    // Check if corroboration is needed
    const policy = researchPolicyFor(item.gapKind);
    if (policy.corroborationRequired) {
      const fieldEvidence = evidence.filter((e) => e.fieldPath === item.fieldPath && e.assetId === item.playbookType);
      if (fieldEvidence.length < policy.minCorroboration) return QUEUE_STATES.CORROBORATING;
    }
    return QUEUE_STATES.REVIEW;
  }

  return QUEUE_STATES.WAITING;
}

// ── buildExecutionPlan ────────────────────────────────────────────────────────
// Derive a complete execution plan from a campaign + blueprint.
// No heuristics — blueprint is the only specification.
export function buildExecutionPlan(campaign, blueprint) {
  const policy = researchPolicyFor(blueprint?.knowledgeType || campaign?.gapType || 'grounding');
  const providerIds = blueprint?.recommendedProviders?.length
    ? blueprint.recommendedProviders
    : (campaign?.providerIds || []);

  return {
    providerIds:           providerIds.slice(0, 6),  // max 6 per run to control blast radius
    maxRetries:            policy.retryAttempts,
    timeoutMs:             policy.timeoutMs,
    corroborationRequired: blueprint?.corroborationRequirements?.required  ?? policy.corroborationRequired,
    corroborationTargets:  blueprint?.corroborationRequirements?.targets   ?? [],
    minEvidence:           blueprint?.validationRequirements?.minEvidence   ?? policy.minCorroboration,
    authorityFloor:        blueprint?.authorityRequirements?.minimum        ?? 'trade',
    gapKind:               blueprint?.knowledgeType || campaign?.gapType   || 'grounding',
  };
}

// ── runProviderWithRetry ──────────────────────────────────────────────────────
// Execute a single provider with retry + failure classification.
// Returns { success, providerId, records, attempt, failureKind, latencyMs }.
function runProviderWithRetry(providerId, gap, blueprint, { mode, asOf, maxRetries, injected = null }) {
  let attempt = 0;
  let lastError = null;
  const t0 = Date.now();

  while (attempt <= maxRetries) {
    try {
      const records = executeProvider(providerId, gap, blueprint, { mode, asOf, injected });
      return {
        success:     true,
        providerId,
        records:     records || [],
        attempt,
        failureKind: null,
        latencyMs:   Date.now() - t0,
      };
    } catch (err) {
      lastError = err;
      const kind = classifyFailure(err);
      if (!shouldRetry(kind, attempt, blueprint?.knowledgeType || 'grounding')) {
        return {
          success:     false,
          providerId,
          records:     [],
          attempt,
          failureKind: kind,
          error:       err.message,
          latencyMs:   Date.now() - t0,
        };
      }
      attempt++;
    }
  }

  const kind = classifyFailure(lastError);
  return {
    success:     false,
    providerId,
    records:     [],
    attempt,
    failureKind: kind,
    error:       lastError?.message,
    latencyMs:   Date.now() - t0,
  };
}

// ── runAutonomousCampaign ─────────────────────────────────────────────────────
// Full autonomous execution: blueprint → providers → pipeline → KCR draft.
//
// Options:
//   playbook      — the target playbook asset (for impact estimation)
//   providerIntel — historical provider intel (for ranking)
//   asOf          — ISO date (deterministic, no Date.now in pure logic)
//   mode          — 'simulate' (tests/demo) | 'inject' (production via injectedRecords)
//   injectedRecords — { [providerId]: record[] } (used in 'inject' mode)
//   maxRetries    — override policy maxRetries per provider
//
// Returns:
//   { campaignId, status, plan, providerRuns, providerIntelUpdates, pipeline,
//     corroborationCampaign, kcrDraft, durationMs, summary }
export function runAutonomousCampaign(campaign, blueprint, {
  playbook       = null,
  providerIntel  = {},
  asOf           = null,
  mode           = 'simulate',
  injectedRecords = {},
  maxRetries     = null,
} = {}) {
  const t0 = Date.now();

  if (!campaign) return { status: 'failed', error: 'No campaign provided' };

  // 1. Resolve or generate blueprint.
  const bp = blueprint || generateResearchBlueprint(
    { gapKind: campaign.gapType, fieldPath: campaign.fieldPath, playbookType: campaign.assetId },
    { providerIntel, asOf }
  );

  // 2. Build execution plan from blueprint.
  const plan = buildExecutionPlan(campaign, bp);
  if (maxRetries != null) plan.maxRetries = maxRetries;

  // 3. Execute each provider (with retry + failure recovery).
  const providerRuns = plan.providerIds.map((pid) =>
    runProviderWithRetry(pid, campaign, bp, {
      mode,
      asOf,
      maxRetries: plan.maxRetries,
      injected: injectedRecords[pid] || null,
    })
  );

  // 4. Collect records for pipeline.
  const allRecords = {};
  for (const run of providerRuns) {
    allRecords[run.providerId] = run.records;
  }

  // 5. Track provider performance (pure — caller persists if desired).
  const providerIntelUpdates = providerRuns.map((run) => ({
    providerId:      run.providerId,
    campaignId:      campaign.id,
    evidenceProduced: run.records.length,
    accepted:        0,          // filled in after finding
    contradictions:  0,          // filled in after pipeline
    success:         run.success,
    latencyMs:       run.latencyMs,
    at:              asOf,
  }));

  // 6. Run named evidence pipeline.
  const providers = buildProviders();
  const pipeline = runEvidencePipeline(allRecords, {
    campaign,
    blueprint: bp,
    providers,
    pb: playbook,
    asOf,
  });

  // 7. Update intel with pipeline-derived counts.
  if (pipeline.result) {
    for (const upd of providerIntelUpdates) {
      upd.accepted       = pipeline.result.evidence > 0 ? 1 : 0;
      upd.contradictions = pipeline.result.conflicts;
    }
  }

  // 8. Auto-corroborate if primary evidence found + corroboration required.
  let corroborationCampaign = null;
  if (plan.corroborationRequired && pipeline.finalCampaign && pipeline.result?.evidence > 0) {
    corroborationCampaign = autoCorroborate(
      pipeline.finalCampaign,
      { evidence: pipeline.finalCampaign.evidence || [] },
      { asOf }
    );
  }

  const durationMs = Date.now() - t0;
  const anySuccess = providerRuns.some((r) => r.success);
  const kcrDraft   = pipeline.result?.kcr ? pipeline.finalCampaign?.kcr : null;

  const status = kcrDraft   ? 'complete'
               : anySuccess ? 'partial'
               : 'failed';

  return {
    campaignId:           campaign.id,
    status,
    plan,
    providerRuns,
    providerIntelUpdates,
    pipeline,
    corroborationCampaign,
    kcrDraft,
    durationMs,
    summary: [
      `${providerRuns.filter((r) => r.success).length}/${providerRuns.length} providers ok`,
      stageSummary(pipeline.stages),
      kcrDraft   ? `KCR draft: ${kcrDraft.id}` : (anySuccess ? 'partial evidence' : 'no evidence'),
      corroborationCampaign ? `corroboration queued: ${corroborationCampaign.id}` : null,
    ].filter(Boolean).join(' · '),
  };
}

// ── batchRunAutonomous ────────────────────────────────────────────────────────
// Run multiple campaigns sequentially with aggregate performance tracking.
// Returns { results[], summary }.
export function batchRunAutonomous(campaigns, blueprints, options = {}) {
  const results = [];
  let kcrTotal = 0;
  let evidenceTotal = 0;
  let errors = 0;

  for (const campaign of campaigns) {
    const bp = blueprints?.find?.((b) => b.fieldPath === campaign.fieldPath && b.assetId === campaign.assetId)
      || blueprints?.[campaigns.indexOf(campaign)]
      || null;
    try {
      const result = runAutonomousCampaign(campaign, bp, options);
      results.push(result);
      if (result.kcrDraft) kcrTotal++;
      if (result.pipeline?.result?.evidence) evidenceTotal += result.pipeline.result.evidence;
      if (result.status === 'failed') errors++;
    } catch (err) {
      results.push({ campaignId: campaign.id, status: 'failed', error: err.message });
      errors++;
    }
  }

  return {
    results,
    summary: {
      total:         campaigns.length,
      complete:      results.filter((r) => r.status === 'complete').length,
      partial:       results.filter((r) => r.status === 'partial').length,
      failed:        errors,
      kcrTotal,
      evidenceTotal,
    },
  };
}

// ── performanceReport ─────────────────────────────────────────────────────────
// Build a provider-level performance summary from a set of run results (BUNDLE I).
export function buildPerformanceReport(runResults) {
  const byProvider = {};

  for (const run of (runResults || [])) {
    for (const pr of (run.providerRuns || [])) {
      if (!byProvider[pr.providerId]) {
        byProvider[pr.providerId] = {
          providerId:      pr.providerId,
          runs:            0,
          successes:       0,
          totalRecords:    0,
          totalLatencyMs:  0,
          failures:        {},
        };
      }
      const p = byProvider[pr.providerId];
      p.runs++;
      if (pr.success) p.successes++;
      p.totalRecords  += pr.records?.length || 0;
      p.totalLatencyMs += pr.latencyMs || 0;
      if (!pr.success && pr.failureKind) {
        p.failures[pr.failureKind] = (p.failures[pr.failureKind] || 0) + 1;
      }
    }
  }

  return Object.values(byProvider).map((p) => ({
    ...p,
    successRate:    p.runs > 0 ? Math.round((p.successes / p.runs) * 100) : 0,
    avgRecords:     p.runs > 0 ? Math.round(p.totalRecords / p.runs) : 0,
    avgLatencyMs:   p.runs > 0 ? Math.round(p.totalLatencyMs / p.runs) : 0,
  })).sort((a, b) => b.successRate - a.successRate || b.runs - a.runs);
}
