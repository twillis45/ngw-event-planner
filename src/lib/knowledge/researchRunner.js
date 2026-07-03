// ─── Research Runner (KRA-1 Bundles A, E, I) ──────────────────────────────────
// Orchestrates batch campaign execution over existing `runCampaign()`.
//
// THREE FUNCTIONS:
//   batchByFilter   — filter campaigns into a run list
//   runCampaigns    — execute a list sequentially, return aggregate
//   autoCorroborate — after single-commercial finding, queue corroboration
//
// GOVERNANCE: workers never bypass KCR. runCampaigns() → runCampaign() → KCR draft.
//             No output becomes canonical without human approval.

import { runCampaign, createCampaign, PROVIDER_FAMILIES } from './campaign';
import { buildProviders } from './providers';

// ── Filter helpers ─────────────────────────────────────────────────────────────

// Which providers belong to a given family?
function providerIdsForFamily(familyId) {
  const f = PROVIDER_FAMILIES.find((x) => x.id === familyId);
  return f ? f.providers : [];
}

// Does a campaign target at least one provider in a given family?
function campaignMatchesFamily(campaign, familyId) {
  const fids = providerIdsForFamily(familyId);
  return (campaign.providerIds || []).some((pid) => fids.includes(pid));
}

// ── batchByFilter ──────────────────────────────────────────────────────────────
// Returns the subset of `campaigns` that match `filter`.
// filter: { priority?, playbookType?, providerFamily?, ids? }
//   priority      — 'high' | 'med' | 'low' (case-insensitive match)
//   playbookType  — filter by campaign.assetId === playbookType
//   providerFamily — filter by provider family membership
//   ids           — explicit array of campaign IDs to include
//   state         — 'draft' | 'kcr' | ... — include only campaigns in this state
export function batchByFilter(campaigns, filter = {}) {
  if (!campaigns?.length) return [];
  const { priority, playbookType, providerFamily, ids, state } = filter;

  return campaigns.filter((c) => {
    if (ids && ids.length && !ids.includes(c.id)) return false;
    if (state && c.state !== state) return false;
    if (priority && (c.priority || '').toLowerCase() !== priority.toLowerCase()) return false;
    if (playbookType && c.assetId !== playbookType) return false;
    if (providerFamily && !campaignMatchesFamily(c, providerFamily)) return false;
    return true;
  });
}

// ── runCampaigns ───────────────────────────────────────────────────────────────
// Run a list of campaigns sequentially.
// Returns: { results[], summary: { total, ran, evidenceTotal, findingsTotal, kcrTotal, errors } }
//
// `fetched` — { [campaignId]: { [providerId]: records[] } } — pre-fetched records
//             per-campaign. Researcher pastes these before batch run. Missing → empty.
//
// Progress callback: onProgress({ index, total, campaignId, result }) — called after each.
export function runCampaigns(campaigns, { providers = null, fetched = {}, pb = null, asOf, onProgress = null } = {}) {
  const resolvedProviders = providers || buildProviders();
  const results = [];
  let evidenceTotal = 0;
  let findingsTotal = 0;
  let kcrTotal      = 0;
  let errorCount    = 0;

  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i];
    try {
      const campaignFetched = fetched[campaign.id] || {};
      const result = runCampaign(campaign, { providers: resolvedProviders, fetched: campaignFetched, pb, asOf });
      results.push({ campaignId: campaign.id, success: true, result });
      evidenceTotal += result.result?.evidence || 0;
      if (result.result?.finding && result.result.finding !== 'insufficient') findingsTotal++;
      if (result.result?.kcr) kcrTotal++;
    } catch (err) {
      results.push({ campaignId: campaign.id, success: false, error: err.message });
      errorCount++;
    }

    if (onProgress) {
      onProgress({ index: i, total: campaigns.length, campaignId: campaign.id, result: results[i] });
    }
  }

  return {
    results,
    summary: {
      total:    campaigns.length,
      ran:      campaigns.length - errorCount,
      evidenceTotal,
      findingsTotal,
      kcrTotal,
      errors: errorCount,
    },
  };
}

// ── autoCorroborate ────────────────────────────────────────────────────────────
// Given a completed campaign and its `runCampaign()` result, decide whether
// corroboration is needed and — if so — return a ready-to-save draft campaign.
// Returns null if no corroboration is needed.
//
// Corroboration rules (per KRA-1 Bundle E):
//   - Pricing/quantity evidence from commercial-only sources → needs government
//   - Any evidence from community-forums → always needs corroboration
//   - evidence.length === 1 from a single commercial source → needs corroboration
//   - evidence.length === 0 → not enough to corroborate; return null
//   - evidence from official source already present → no corroboration needed
//
// The returned campaign is a draft — it is NOT saved. The caller decides to save.
export function autoCorroborate(campaign, runResult, { asOf } = {}) {
  if (!campaign || !runResult) return null;

  const evidence = runResult.evidence || [];
  if (evidence.length === 0) return null;  // nothing to confirm

  const sources   = evidence.map((e) => e.source || '');
  const authority = evidence.map((e) => e.authority || e.sourceType || 'trade');

  const hasOfficial  = authority.some((a) => a === 'official');
  const hasCommunity = sources.some((s) => s === 'community-forums');
  const allTrade     = authority.every((a) => a === 'trade' || a === 'commercial');
  const singleSource = [...new Set(sources)].length === 1;

  // Already corroborated — no action needed
  if (hasOfficial && !hasCommunity && !singleSource) return null;

  // Community-forums always needs official corroboration
  // Commercial-only or single-source needs official corroboration
  const needsCorroboration = hasCommunity || allTrade || singleSource;
  if (!needsCorroboration) return null;

  // Select target providers based on field kind
  const gapType = campaign.gapType || 'pricing';
  const corrobProviders = CORROBORATION_TARGETS[gapType] || CORROBORATION_TARGETS.default;

  // Avoid re-targeting providers already in the campaign
  const existing = new Set(campaign.providerIds || []);
  const targets  = corrobProviders.filter((p) => !existing.has(p));
  if (!targets.length) return null;  // no fresh providers to try

  const reason = hasCommunity
    ? 'Community source — requires official corroboration'
    : singleSource
      ? `Single-source finding — corroborate with ${targets[0]}`
      : 'Commercial-only evidence — needs government data';

  const corrCampaign = createCampaign({
    goal:      `[Corroboration] ${campaign.goal}`,
    assetId:   campaign.assetId,
    fieldPath: campaign.fieldPath,
    gapType,
    priority:  'high',
    trigger:   'validation',
    providers: targets,
    at:        asOf,
  });

  // Tag it so the UI can distinguish corroboration campaigns
  return {
    ...corrCampaign,
    corroboratesId: campaign.id,
    corroborationReason: reason,
  };
}

// ── Corroboration provider map ─────────────────────────────────────────────────
// Maps gapType → preferred official/academic providers for corroboration.
// Always prefer official (government) first, then academic.
const CORROBORATION_TARGETS = {
  pricing:      ['data.gov', 'scholar'],
  quantity:     ['data.gov', 'scholar'],
  'cost-factor':['data.gov', 'hospitality-assoc'],
  safety:       ['fda-foodsafety', 'data.gov'],
  governance:   ['hospitality-assoc', 'scholar'],
  grounding:    ['scholar', 'data.gov'],
  regional:     ['data.gov', 'noaa'],
  weather:      ['noaa', 'data.gov'],
  cultural:     ['scholar', 'hospitality-assoc'],
  planner:      ['hospitality-assoc', 'scholar'],
  default:      ['data.gov', 'scholar'],
};

// ── Run summary label ─────────────────────────────────────────────────────────
// Human-readable summary of a batch run. Used in Mission Control display.
export function runSummaryLabel(summary) {
  if (!summary) return 'No campaigns run';
  const { ran, total, evidenceTotal, findingsTotal, kcrTotal, errors } = summary;
  const parts = [`${ran}/${total} ran`];
  if (evidenceTotal) parts.push(`${evidenceTotal} evidence`);
  if (findingsTotal) parts.push(`${findingsTotal} findings`);
  if (kcrTotal)      parts.push(`${kcrTotal} KCR drafts`);
  if (errors)        parts.push(`${errors} errors`);
  return parts.join(' · ');
}

// ── Suggested batch labels ─────────────────────────────────────────────────────
// UI button labels for the batch runner.
export const BATCH_RUN_LABELS = {
  all_high:    'Run all HIGH priority',
  all_med:     'Run all MED priority',
  all_draft:   'Run all draft campaigns',
  by_playbook: (label) => `Run all ${label} campaigns`,
  by_family:   (label) => `Run all ${label} providers`,
};
