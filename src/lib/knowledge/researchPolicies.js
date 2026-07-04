// ─── Research Policies (KRE-1 Bundle G) ───────────────────────────────────────
// Single source of truth for all research freshness, retry, and scheduling policy.
// Replaces kind-based heuristics scattered across missionControl / researchRunner.
//
// Policy fields:
//   freshnessDays         — evidence is stale after this many days
//   retryAttempts         — max provider call retries on transient failure
//   timeoutMs             — per-provider execution timeout
//   corroborationRequired — must have ≥2 independent sources
//   minCorroboration      — minimum supporting evidence records
//   scheduleInterval      — how often to re-research this gap kind
//   priority              — 'high' | 'med' | 'low'
//   failureMode           — 'retry' | 'skip' | 'alert' | 'cache'
//
// NEVER import from missionControl or AdminConsole (circular dep risk).
// This file has zero runtime-side imports.

// ── Per-kind research policies ────────────────────────────────────────────────
export const RESEARCH_POLICIES = {
  pricing: {
    freshnessDays:         45,
    retryAttempts:         3,
    timeoutMs:             8_000,
    corroborationRequired: true,
    minCorroboration:      2,
    scheduleInterval:      'monthly',
    priority:              'high',
    failureMode:           'retry',
    freshnessTrigger:      'commercial-shift',
    note:                  'Commercial prices shift monthly; always corroborate across ≥2 sources.',
  },
  'cost-factor': {
    freshnessDays:         90,
    retryAttempts:         2,
    timeoutMs:             8_000,
    corroborationRequired: true,
    minCorroboration:      2,
    scheduleInterval:      'quarterly',
    priority:              'high',
    failureMode:           'retry',
    freshnessTrigger:      'commercial-shift',
    note:                  'Cost multipliers (DIY vs. catered) change with inflation; re-research quarterly.',
  },
  quantity: {
    freshnessDays:         365,
    retryAttempts:         2,
    timeoutMs:             6_000,
    corroborationRequired: false,
    minCorroboration:      1,
    scheduleInterval:      'annual',
    priority:              'med',
    failureMode:           'skip',
    freshnessTrigger:      'best-practice-revision',
    note:                  'Per-guest quantities are stable; annual refresh is sufficient.',
  },
  safety: {
    freshnessDays:         180,
    retryAttempts:         3,
    timeoutMs:             10_000,
    corroborationRequired: true,
    minCorroboration:      2,
    scheduleInterval:      'semi-annual',
    priority:              'high',
    failureMode:           'alert',
    freshnessTrigger:      'regulation-change',
    note:                  'Food safety regulations may change; alert on any provider failure.',
  },
  governance: {
    freshnessDays:         365,
    retryAttempts:         1,
    timeoutMs:             6_000,
    corroborationRequired: false,
    minCorroboration:      1,
    scheduleInterval:      'annual',
    priority:              'med',
    failureMode:           'skip',
    freshnessTrigger:      'best-practice-revision',
    note:                  'Operational standards are stable; annual cadence appropriate.',
  },
  grounding: {
    freshnessDays:         365,
    retryAttempts:         1,
    timeoutMs:             6_000,
    corroborationRequired: false,
    minCorroboration:      1,
    scheduleInterval:      'annual',
    priority:              'med',
    failureMode:           'skip',
    freshnessTrigger:      'new-information',
    note:                  'General grounding knowledge is stable.',
  },
  regional: {
    freshnessDays:         90,
    retryAttempts:         2,
    timeoutMs:             8_000,
    corroborationRequired: false,
    minCorroboration:      1,
    scheduleInterval:      'quarterly',
    priority:              'med',
    failureMode:           'cache',
    freshnessTrigger:      'seasonal-adjustment',
    note:                  'Regional data varies by season; refresh quarterly.',
  },
  cultural: {
    freshnessDays:         730,
    retryAttempts:         1,
    timeoutMs:             6_000,
    corroborationRequired: true,
    minCorroboration:      3,
    scheduleInterval:      'annual',
    priority:              'low',
    failureMode:           'skip',
    freshnessTrigger:      'cultural-update',
    note:                  'Cultural knowledge is stable; community sources require 3-way corroboration.',
  },
  weather: {
    freshnessDays:         7,
    retryAttempts:         3,
    timeoutMs:             5_000,
    corroborationRequired: false,
    minCorroboration:      1,
    scheduleInterval:      'monthly',
    priority:              'high',
    failureMode:           'retry',
    freshnessTrigger:      'weather-guidance-update',
    note:                  'Weather data expires in 7 days; prioritize freshness.',
  },
  planner: {
    freshnessDays:         365,
    retryAttempts:         1,
    timeoutMs:             6_000,
    corroborationRequired: false,
    minCorroboration:      1,
    scheduleInterval:      'annual',
    priority:              'low',
    failureMode:           'skip',
    freshnessTrigger:      'best-practice-revision',
    note:                  'Planner guidance from SMEs; annual cadence appropriate.',
  },
};

// ── Per-family provider freshness ─────────────────────────────────────────────
// Mirrors FAMILY_DEFAULTS in providers.js but adds scheduling and failure context.
// These are policy constraints, not the low-level provider model.
export const PROVIDER_POLICIES = {
  government:           { freshnessDays: 365, failureMode: 'cache',   scheduleInterval: 'monthly',    priority: 'high' },
  academic:             { freshnessDays: 730, failureMode: 'skip',    scheduleInterval: 'annual',     priority: 'low'  },
  standards:            { freshnessDays: 365, failureMode: 'skip',    scheduleInterval: 'annual',     priority: 'med'  },
  'food-safety':        { freshnessDays: 180, failureMode: 'alert',   scheduleInterval: 'weekly',     priority: 'high' },
  weather:              { freshnessDays: 7,   failureMode: 'retry',   scheduleInterval: 'weekly',     priority: 'high' },
  hospitality:          { freshnessDays: 180, failureMode: 'skip',    scheduleInterval: 'semi-annual', priority: 'med' },
  'event-industry':     { freshnessDays: 180, failureMode: 'skip',    scheduleInterval: 'semi-annual', priority: 'med' },
  'commercial-pricing': { freshnessDays: 45,  failureMode: 'retry',   scheduleInterval: 'monthly',    priority: 'high' },
  retail:               { freshnessDays: 45,  failureMode: 'retry',   scheduleInterval: 'monthly',    priority: 'high' },
  wholesale:            { freshnessDays: 45,  failureMode: 'retry',   scheduleInterval: 'monthly',    priority: 'high' },
  tourism:              { freshnessDays: 180, failureMode: 'cache',   scheduleInterval: 'semi-annual', priority: 'med' },
  venue:                { freshnessDays: 180, failureMode: 'cache',   scheduleInterval: 'semi-annual', priority: 'med' },
  catering:             { freshnessDays: 180, failureMode: 'cache',   scheduleInterval: 'semi-annual', priority: 'med' },
  sme:                  { freshnessDays: 365, failureMode: 'skip',    scheduleInterval: 'annual',     priority: 'low'  },
  'internal-validation':{ freshnessDays: 90,  failureMode: 'skip',    scheduleInterval: 'quarterly',  priority: 'high' },
  community:            { freshnessDays: 30,  failureMode: 'skip',    scheduleInterval: 'monthly',    priority: 'low'  },
};

// ── Failure recovery decision table ──────────────────────────────────────────
// Maps failureKind → action per policy failureMode.
export const FAILURE_RECOVERY = {
  // timeout: transient — retry up to maxRetries
  timeout:     { retry: true,  skip: false, alert: false, cache: true  },
  // unavailable: server down — cache or skip depending on data criticality
  unavailable: { retry: false, skip: true,  alert: true,  cache: true  },
  // partial: incomplete data — retry once, then accept partial
  partial:     { retry: true,  skip: false, alert: false, cache: true  },
  // duplicate: same evidence re-fetched — skip gracefully
  duplicate:   { retry: false, skip: true,  alert: false, cache: false },
  // corrupt: bad response format — skip; do not cache bad data
  corrupt:     { retry: false, skip: true,  alert: true,  cache: false },
  // unknown: classify cautiously as retryable once
  unknown:     { retry: true,  skip: false, alert: false, cache: false },
};

// ── Policy accessors ──────────────────────────────────────────────────────────

export function researchPolicyFor(gapKind) {
  return RESEARCH_POLICIES[gapKind] || RESEARCH_POLICIES.grounding;
}

export function providerPolicyFor(familyId) {
  return PROVIDER_POLICIES[familyId] || { freshnessDays: 180, failureMode: 'skip', scheduleInterval: 'semi-annual', priority: 'med' };
}

// Is this evidence stale by its gap kind's policy?
export function isStaleByPolicy(evidence, gapKind, asOf) {
  if (!evidence || !asOf) return false;
  const policy = researchPolicyFor(gapKind);
  const capturedAt = evidence.capturedAt || evidence.effectiveDate;
  if (!capturedAt) return true;
  const msPerDay = 86_400_000;
  const ageMs = new Date(asOf) - new Date(capturedAt);
  return ageMs > policy.freshnessDays * msPerDay;
}

// When should the next research run happen, given last research date?
export function nextResearchDate(lastResearchedAt, gapKind) {
  if (!lastResearchedAt) return null;
  const policy = researchPolicyFor(gapKind);
  const d = new Date(lastResearchedAt);
  d.setDate(d.getDate() + policy.freshnessDays);
  return d.toISOString().slice(0, 10);
}

// Should we retry given a failure kind, current attempt count, and policy?
export function shouldRetry(failureKind, attemptCount, gapKind) {
  const policy = researchPolicyFor(gapKind);
  if (attemptCount >= policy.retryAttempts) return false;
  const recovery = FAILURE_RECOVERY[failureKind] || FAILURE_RECOVERY.unknown;
  return recovery.retry;
}

// Classify a JS error into a failure kind.
export function classifyFailure(error) {
  const msg = (error?.message || String(error)).toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out'))       return 'timeout';
  if (msg.includes('unavailable') || msg.includes('503') || msg.includes('down')) return 'unavailable';
  if (msg.includes('partial') || msg.includes('incomplete'))      return 'partial';
  if (msg.includes('duplicate'))                                  return 'duplicate';
  if (msg.includes('corrupt') || msg.includes('invalid json'))    return 'corrupt';
  return 'unknown';
}
