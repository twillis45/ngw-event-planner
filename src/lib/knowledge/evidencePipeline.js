// ─── Evidence Pipeline (KRE-1 Bundle C) ───────────────────────────────────────
// Named-stage pipeline runner. Wraps campaign.js::runCampaign() with per-stage
// visibility. Every stage has a name, status, inputs, outputs, and duration.
//
// Stages:
//   normalize    → raw records → observations (via providers)
//   deduplicate  → remove duplicate observations
//   evidence     → create evidence records from records
//   cluster      → group evidence by field path
//   conflicts    → flag contradictions within clusters
//   finding      → propose a finding for each non-contested cluster
//   kcr-draft    → produce a KCR draft for each valid finding
//
// The pipeline is PURE — it never saves to localStorage. The caller persists.
// Reuses: campaign.js::runCampaign(), providers.js::buildProviders() / recordsToEvidence(),
//         evidenceIntelligence.js::analyzeEvidence(), finding.js::deriveFinding() + findingToKCR().
//
// GOVERNANCE: never auto-publishes. Output is always a KCR *draft*. Human approves.

import { runCampaign }          from './campaign';
import { buildProviders, normalizeToObservations, recordsToEvidence } from './providers';
import { analyzeEvidence, dedupeEvidence }                           from './evidenceIntelligence';
import { deriveFinding, findingToKCR }                               from './finding';
import { createObservation }                                         from './observation';

export const PIPELINE_STAGE_NAMES = [
  'normalize',
  'deduplicate',
  'evidence',
  'cluster',
  'conflicts',
  'finding',
  'kcr-draft',
];

// Build an empty stage record.
function makeStage(name) {
  return { name, status: 'pending', inputCount: 0, outputCount: 0, durationMs: 0, detail: null, error: null };
}

function stamp(stage, status, input, output, durationMs, detail = null) {
  return { ...stage, status, inputCount: Array.isArray(input) ? input.length : (input ?? 0), outputCount: Array.isArray(output) ? output.length : (output ?? 0), durationMs, detail };
}

function fail(stage, error) {
  return { ...stage, status: 'failed', error: error?.message || String(error) };
}

// ── runEvidencePipeline ───────────────────────────────────────────────────────
// allRecords: { [providerId]: record[] } — already fetched/simulated by campaignRunner
// campaign: the campaign being run
// blueprint: the ResearchBlueprint for this gap
// providers: buildProviders() output (or null for defaults)
// pb: the target playbook asset (for impact estimation)
// asOf: ISO date string
//
// Returns: { stages, finalCampaign, result }
export function runEvidencePipeline(allRecords, { campaign, blueprint, providers = null, pb = null, asOf }) {
  const stages = PIPELINE_STAGE_NAMES.map(makeStage);
  const stageMap = Object.fromEntries(stages.map((s, i) => [s.name, i]));
  const providerList = providers || buildProviders();
  const set = (name, updated) => { stages[stageMap[name]] = updated; };

  let t0;

  // ── Stage 1: Normalize ──────────────────────────────────────────────────────
  t0 = Date.now();
  let allObservations = [];
  try {
    const relevantProviders = providerList.filter((p) => campaign.providerIds.includes(p.id));
    allObservations = relevantProviders.flatMap((p) =>
      p.acquire({ records: allRecords[p.id] || [], at: asOf })
    );
    // If no provider produced observations, create a seed observation from the campaign goal.
    if (allObservations.length === 0) {
      allObservations = [createObservation({
        kind: campaign.gapType === 'safety' ? 'regulation' : 'pricing',
        gapType: campaign.gapType,
        assetId: campaign.assetId,
        fieldPath: campaign.fieldPath,
        statement: campaign.goal,
        source: 'campaign-seed',
        at: asOf,
      })];
    }
    set('normalize', stamp(stages[0], 'complete', Object.values(allRecords).flat(), allObservations, Date.now() - t0,
      `${relevantProviders.length} providers → ${allObservations.length} observations`));
  } catch (err) {
    set('normalize', fail(stages[0], err));
    return { stages, finalCampaign: null, result: null };
  }

  // ── Stage 2: Deduplicate ────────────────────────────────────────────────────
  t0 = Date.now();
  let uniqueObs = allObservations;
  try {
    const seen = new Set();
    uniqueObs = allObservations.filter((o) => { if (seen.has(o.id)) return false; seen.add(o.id); return true; });
    set('deduplicate', stamp(stages[1], 'complete', allObservations, uniqueObs, Date.now() - t0,
      `${allObservations.length - uniqueObs.length} duplicates removed`));
  } catch (err) {
    set('deduplicate', fail(stages[1], err));
  }

  // ── Stage 3: Evidence ───────────────────────────────────────────────────────
  t0 = Date.now();
  let evidence = [];
  try {
    const relevantProviders = providerList.filter((p) => campaign.providerIds.includes(p.id));
    const rawEvidence = relevantProviders.flatMap((p) =>
      recordsToEvidence(allRecords[p.id] || [], p, { at: asOf })
    );
    evidence = dedupeEvidence(rawEvidence);
    set('evidence', stamp(stages[2], 'complete', rawEvidence, evidence, Date.now() - t0,
      `${rawEvidence.length} candidate → ${evidence.length} deduped evidence records`));
  } catch (err) {
    set('evidence', fail(stages[2], err));
  }

  // ── Stage 4: Cluster (group by fieldPath) ───────────────────────────────────
  t0 = Date.now();
  let clusters = {};
  try {
    for (const ev of evidence) {
      const key = ev.fieldPath || campaign.fieldPath || 'unknown';
      if (!clusters[key]) clusters[key] = [];
      clusters[key].push(ev);
    }
    const clusterCount = Object.keys(clusters).length;
    set('cluster', stamp(stages[3], 'complete', evidence, clusterCount, Date.now() - t0,
      `${clusterCount} field cluster(s): ${Object.keys(clusters).join(', ')}`));
  } catch (err) {
    set('cluster', fail(stages[3], err));
    clusters = { [campaign.fieldPath]: evidence };
  }

  // ── Stage 5: Conflict Detection ─────────────────────────────────────────────
  t0 = Date.now();
  let conflicts = [];
  try {
    const intel = analyzeEvidence(evidence, asOf);
    conflicts = intel.contradictions || [];
    const hasConflicts = conflicts.length > 0;
    set('conflicts', stamp(stages[4], hasConflicts ? 'complete' : 'complete', [], conflicts, Date.now() - t0,
      hasConflicts ? `${conflicts.length} contradiction(s) detected` : 'No contradictions'));
  } catch (err) {
    set('conflicts', fail(stages[4], err));
  }

  // ── Stage 6: Finding ─────────────────────────────────────────────────────────
  t0 = Date.now();
  let finding = null;
  try {
    // Use the primary field observation (first unique obs for campaign field)
    const seedObs = uniqueObs.find((o) => o.fieldPath === campaign.fieldPath) ||
      uniqueObs[0] ||
      createObservation({ kind: 'pricing', gapType: campaign.gapType, assetId: campaign.assetId, fieldPath: campaign.fieldPath, statement: campaign.goal, source: 'campaign-seed', at: asOf });
    const scopedObs = { ...seedObs, assetId: campaign.assetId, fieldPath: campaign.fieldPath, gapType: campaign.gapType };
    const fieldEvidence = clusters[campaign.fieldPath] || evidence;
    finding = deriveFinding(scopedObs, fieldEvidence, { asOf });
    set('finding', stamp(stages[5], 'complete', fieldEvidence, finding ? 1 : 0, Date.now() - t0,
      finding ? `status: ${finding.status}, corroboration: ${finding.corroboration}` : 'no finding'));
  } catch (err) {
    set('finding', fail(stages[5], err));
  }

  // ── Stage 7: KCR Draft ───────────────────────────────────────────────────────
  t0 = Date.now();
  let kcrDraft = null;
  try {
    if (finding && finding.status !== 'insufficient') {
      kcrDraft = findingToKCR(finding, evidence, pb, asOf);
    }
    set('kcr-draft', stamp(stages[6], 'complete', finding ? 1 : 0, kcrDraft ? 1 : 0, Date.now() - t0,
      kcrDraft ? `KCR id: ${kcrDraft.id}, state: ${kcrDraft.state}` : (finding?.status === 'insufficient' ? 'Insufficient evidence — no KCR' : 'No finding')));
  } catch (err) {
    set('kcr-draft', fail(stages[6], err));
  }

  // ── Compose the final campaign state (mirrors runCampaign output) ─────────
  const finalCampaign = kcrDraft ? { ...campaign, state: 'kcr', kcr: kcrDraft, finding, evidence } : { ...campaign, state: finding ? 'findings' : 'evidence', finding, evidence };

  return {
    stages,
    finalCampaign,
    result: {
      observations: uniqueObs.length,
      evidence:     evidence.length,
      clusters:     Object.keys(clusters).length,
      conflicts:    conflicts.length,
      finding:      finding?.status || null,
      kcr:          kcrDraft?.id || null,
    },
  };
}

// ── stageSummary ──────────────────────────────────────────────────────────────
// Human-readable one-liner for a completed pipeline.
export function stageSummary(stages) {
  if (!stages) return 'No pipeline run';
  const complete = stages.filter((s) => s.status === 'complete').length;
  const failed   = stages.filter((s) => s.status === 'failed').length;
  return `${complete}/${stages.length} stages complete${failed ? `, ${failed} failed` : ''}`;
}
