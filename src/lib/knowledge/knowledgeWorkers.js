// ─── Knowledge Worker Engine (KAW-1 Bundle A) ─────────────────────────────────
// Autonomous worker registry. Workers detect changes, manufacture observations,
// organize evidence candidates, and generate research campaigns. Workers NEVER
// modify production knowledge — they stop at KCR draft.
//
// Reuses: observation.js, evidence.js, evidenceIntelligence.js, campaign.js,
//         finding.js, schedule.js, dimensions.js, roadmap.js, providerMonitor.js
//
// Workers are: registered, observable, individually enabled/disabled, versioned.
// Pure worker definitions here. Execution state tracked separately in worker runs.

const RUNS_KEY = 'ngw-worker-runs';

// ── Worker types ──────────────────────────────────────────────────────────────
// Every worker has a clearly defined mission, data contracts, and constraints.
export const WORKER_TYPES = {

  'freshness-worker': {
    id: 'freshness-worker',
    label: 'Freshness Worker',
    version: '1.0.0',
    description: 'Scans the corpus for stale knowledge. Generates overdue schedule reports and drafts research campaign candidates for assets past their freshness policy.',
    mission: 'Identify what knowledge has exceeded its freshness policy and needs refresh.',
    inputs: ['schedules', 'playbooks', 'asOf'],
    outputs: ['stale-asset-list', 'campaign-candidates'],
    defaultCadence: 'daily',
    priority: 'high',
    produces: ['observation', 'campaign-candidate'],
    neverProduces: ['kcr', 'evidence-published', 'knowledge-edit'],
    canAutoLaunchCampaign: true,
    requiresHumanApproval: 'campaign-launch',
    estimatedRunMs: 500,
    failureTolerance: 'skip',
  },

  'gap-detection-worker': {
    id: 'gap-detection-worker',
    label: 'Gap Detection Worker',
    version: '1.0.0',
    description: 'Runs all 21 coverage dimensions against the corpus. Generates KCR candidates for missing citations, missing regions, missing commercial data, and weak evidence.',
    mission: 'Continuously identify what the corpus is missing.',
    inputs: ['playbooks', 'asOf'],
    outputs: ['gap-report', 'kcr-candidates'],
    defaultCadence: 'daily',
    priority: 'high',
    produces: ['kcr-draft', 'observation'],
    neverProduces: ['kcr-published', 'knowledge-edit'],
    canAutoLaunchCampaign: false,
    requiresHumanApproval: 'kcr-publish',
    estimatedRunMs: 2000,
    failureTolerance: 'skip',
  },

  'provider-monitor-worker': {
    id: 'provider-monitor-worker',
    label: 'Provider Monitor Worker',
    version: '1.0.0',
    description: 'Checks provider health and schedules. Detects when a provider is overdue, unavailable, or has exceeded its freshness window. Flags stale providers to the research steward.',
    mission: 'Keep the provider network healthy and observable.',
    inputs: ['providerRules', 'observationHistory', 'asOf'],
    outputs: ['provider-health-report', 'overdue-provider-list'],
    defaultCadence: 'daily',
    priority: 'med',
    produces: ['observation'],
    neverProduces: ['kcr-draft', 'knowledge-edit'],
    canAutoLaunchCampaign: false,
    requiresHumanApproval: 'any-action',
    estimatedRunMs: 300,
    failureTolerance: 'retry',
  },

  'change-detection-worker': {
    id: 'change-detection-worker',
    label: 'Change Detection Worker',
    version: '1.0.0',
    description: 'Compares new observations against previous knowledge state. Detects pricing changes, regulation updates, recall alerts, and best-practice revisions. Never decides — only detects.',
    mission: 'Detect meaningful changes between current and previous observations.',
    inputs: ['newObservations', 'previousObservations', 'playbooks'],
    outputs: ['change-report', 'flagged-changes'],
    defaultCadence: 'on-new-observation',
    priority: 'high',
    produces: ['observation'],
    neverProduces: ['kcr-draft', 'knowledge-edit'],
    canAutoLaunchCampaign: false,
    requiresHumanApproval: 'any-action',
    estimatedRunMs: 1000,
    failureTolerance: 'skip',
  },

  'corroboration-worker': {
    id: 'corroboration-worker',
    label: 'Corroboration Worker',
    version: '1.0.0',
    description: 'Reviews evidence candidates awaiting corroboration. Identifies which have met their required corroboration threshold and which need additional sources. Flags contradictions.',
    mission: 'Advance evidence through the corroboration stage — never resolve contradictions.',
    inputs: ['evidenceCandidates', 'researchPlaybooks'],
    outputs: ['corroboration-status', 'contradiction-flags'],
    defaultCadence: 'daily',
    priority: 'med',
    produces: ['observation'],
    neverProduces: ['kcr-draft', 'knowledge-edit', 'contradiction-resolution'],
    canAutoLaunchCampaign: false,
    requiresHumanApproval: 'contradiction-resolution',
    estimatedRunMs: 800,
    failureTolerance: 'skip',
  },

  'validation-worker': {
    id: 'validation-worker',
    label: 'Validation Worker',
    version: '1.0.0',
    description: 'Monitors published KCRs for post-publication validation. Watches for evidence that confirms or contradicts published knowledge. Generates validation observations.',
    mission: 'Close the loop between what we published and what the field confirmed.',
    inputs: ['publishedKCRs', 'newObservations', 'asOf'],
    outputs: ['validation-report', 'contradiction-observations'],
    defaultCadence: 'weekly',
    priority: 'med',
    produces: ['observation'],
    neverProduces: ['kcr-published', 'knowledge-edit'],
    canAutoLaunchCampaign: false,
    requiresHumanApproval: 'any-action',
    estimatedRunMs: 600,
    failureTolerance: 'skip',
  },

  'prioritization-worker': {
    id: 'prioritization-worker',
    label: 'Prioritization Worker',
    version: '1.0.0',
    description: 'Answers "if we have two hours today, where is the highest ROI?" Uses runtime usage, dependency graph, research debt, validation gaps, and freshness to rank work. Produces recommendations only.',
    mission: 'Tell the research steward what to work on next.',
    inputs: ['playbooks', 'schedules', 'kcrQueue', 'asOf'],
    outputs: ['prioritized-research-list'],
    defaultCadence: 'daily',
    priority: 'low',
    produces: ['prioritization-report'],
    neverProduces: ['kcr-draft', 'campaign', 'knowledge-edit'],
    canAutoLaunchCampaign: false,
    requiresHumanApproval: 'n/a',
    estimatedRunMs: 2000,
    failureTolerance: 'skip',
  },
};

// ── Worker instance registry ───────────────────────────────────────────────────
// A worker INSTANCE is a configured, enabled/disabled deployment of a worker type.
// Multiple instances of the same type can run against different assets.
export function createWorkerInstance({
  typeId,
  assetId = null,
  providerFamily = null,
  fieldPath = null,
  cadence = null,
  enabled = true,
  assignedTo = null,
  at = null,
}) {
  const type = WORKER_TYPES[typeId];
  if (!type) throw new Error(`Unknown worker type: "${typeId}"`);
  const id = `worker-${typeId}-${(assetId || 'global').replace(/\s+/g, '-').toLowerCase()}-${String(at || '').slice(0, 10).replace(/-/g, '')}`;
  return {
    id,
    typeId,
    version: type.version,
    assetId,
    providerFamily,
    fieldPath,
    cadence: cadence || type.defaultCadence,
    enabled,
    assignedTo,
    createdAt: at,
    lastRunAt: null,
    lastRunStatus: null,
    runCount: 0,
    produces: type.produces,
    neverProduces: type.neverProduces,
    requiresHumanApproval: type.requiresHumanApproval,
  };
}

// ── Worker run record ─────────────────────────────────────────────────────────
// Every time a worker executes, a run record is created (immutable after creation).
export function createWorkerRun({
  workerId, typeId, assetId = null, triggeredBy = 'scheduler', at = null,
  status = 'running', outputs = {}, errorMessage = null, durationMs = null,
}) {
  return {
    id: `run-${typeId}-${String(at || '').replace(/\D/g, '').slice(0, 14)}`,
    workerId, typeId, assetId, triggeredBy,
    status,              // running | complete | failed | skipped
    outputs,             // { observationCount, campaignCandidates, kcrDrafts, changesDetected, ... }
    errorMessage,
    durationMs,
    at: at || new Date().toISOString().slice(0, 10),
    completedAt: null,
  };
}

export function completeWorkerRun(run, { outputs, durationMs, at = null } = {}) {
  return { ...run, status: 'complete', outputs: outputs || run.outputs, durationMs: durationMs ?? run.durationMs, completedAt: at };
}

export function failWorkerRun(run, { errorMessage, at = null } = {}) {
  return { ...run, status: 'failed', errorMessage: errorMessage || 'Unknown error', completedAt: at };
}

// ── Fleet health (Observable) ─────────────────────────────────────────────────
export function buildFleetHealth(workers = [], runs = []) {
  const runsByWorker = runs.reduce((m, r) => {
    m[r.workerId] = m[r.workerId] || [];
    m[r.workerId].push(r);
    return m;
  }, {});

  return workers.map((w) => {
    const workerRuns = (runsByWorker[w.id] || []).sort((a, b) => (b.at > a.at ? 1 : -1));
    const lastRun = workerRuns[0] || null;
    const successCount = workerRuns.filter((r) => r.status === 'complete').length;
    const failCount = workerRuns.filter((r) => r.status === 'failed').length;
    const totalRuns = workerRuns.length;
    const successRate = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : null;

    return {
      id: w.id,
      typeId: w.typeId,
      label: WORKER_TYPES[w.typeId]?.label || w.typeId,
      enabled: w.enabled,
      cadence: w.cadence,
      assetId: w.assetId,
      lastRunAt: lastRun?.at || null,
      lastRunStatus: lastRun?.status || null,
      totalRuns,
      successRate,
      failCount,
      healthy: w.enabled && failCount < 3 && (successRate === null || successRate >= 80),
    };
  });
}

// ── Aggregate fleet metrics (Bundle N) ────────────────────────────────────────
export function buildFleetMetrics(workers = [], runs = []) {
  const enabled = workers.filter((w) => w.enabled).length;
  const healthy = buildFleetHealth(workers, runs).filter((w) => w.healthy).length;
  const total = workers.length;
  const totalRuns = runs.length;
  const completedRuns = runs.filter((r) => r.status === 'complete').length;
  const failedRuns = runs.filter((r) => r.status === 'failed').length;
  const successRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : null;
  const byType = runs.reduce((m, r) => { m[r.typeId] = (m[r.typeId] || 0) + 1; return m; }, {});

  const observationsThroughput = runs.reduce((sum, r) => sum + (r.outputs?.observationCount || 0), 0);
  const kcrDraftsThroughput = runs.reduce((sum, r) => sum + (r.outputs?.kcrDrafts || 0), 0);
  const campaignCandidates = runs.reduce((sum, r) => sum + (r.outputs?.campaignCandidates || 0), 0);

  return {
    total, enabled, healthy,
    totalRuns, completedRuns, failedRuns, successRate,
    byType,
    observationsThroughput,
    kcrDraftsThroughput,
    campaignCandidates,
  };
}

// ── Thin localStorage store ───────────────────────────────────────────────────
const WORKERS_KEY = 'ngw-worker-instances';

export function loadWorkers() {
  try { return JSON.parse(localStorage.getItem(WORKERS_KEY) || '[]'); } catch { return []; }
}
export function saveWorkers(list) {
  try { localStorage.setItem(WORKERS_KEY, JSON.stringify(list || [])); return true; } catch { return false; }
}
export function upsertWorker(worker) {
  const list = loadWorkers();
  const idx = list.findIndex((w) => w.id === worker.id);
  if (idx >= 0) list[idx] = worker; else list.push(worker);
  saveWorkers(list);
  return worker;
}
export function toggleWorker(workerId, enabled) {
  const list = loadWorkers();
  const idx = list.findIndex((w) => w.id === workerId);
  if (idx >= 0) { list[idx] = { ...list[idx], enabled }; saveWorkers(list); }
}
export function clearWorkers() {
  try { localStorage.removeItem(WORKERS_KEY); } catch { /* noop */ }
}

export function loadRuns() {
  try { return JSON.parse(localStorage.getItem(RUNS_KEY) || '[]'); } catch { return []; }
}
export function saveRuns(list) {
  try { localStorage.setItem(RUNS_KEY, JSON.stringify(list || [])); return true; } catch { return false; }
}
export function addRun(run) {
  const list = loadRuns();
  list.push(run);
  saveRuns(list);
  return run;
}
export function clearRuns() {
  try { localStorage.removeItem(RUNS_KEY); } catch { /* noop */ }
}
