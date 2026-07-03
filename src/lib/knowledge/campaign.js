// ─── Research Campaign System (KEP-2 Bundle B) ─────────────────────────────────
// A Campaign is a reusable, governed acquisition workflow toward a goal ("Improve Crab
// Feast Pricing"). It orchestrates: providers → observations → evidence → evidence
// intelligence → finding → KCR. It STOPS at KCR — review/publish/validate stay in the
// existing pipeline (nothing auto-publishes). Pure + a thin store. Reuses providers,
// evidenceIntelligence, deriveFinding, findingToKCR — no new lifecycle, no new registry.

import { deriveFinding, findingToKCR } from './finding';
import { recordsToEvidence } from './providers';
import { analyzeEvidence, dedupeEvidence } from './evidenceIntelligence';
import { createObservation } from './observation';

export const CAMPAIGN_STATES = ['draft', 'scheduled', 'running', 'observations', 'evidence', 'findings', 'kcr', 'published', 'validated'];
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function createCampaign({ goal, assetId, fieldPath, gapType = 'pricing', gapTypes = null, providers = [], at = null }) {
  const types = gapTypes && gapTypes.length ? gapTypes : [gapType];
  return {
    id: `camp-${slug(goal)}`,
    goal, assetId, fieldPath,
    gapType: types[0],   // primary — drives the seed observation kind
    gapTypes: types,     // full set for multi-axis campaigns
    providerIds: providers.map((p) => (typeof p === 'string' ? p : p.id)),
    state: 'draft', createdAt: at,
    audit: [{ at, action: 'created', state: 'draft' }],
    result: null,
  };
}

const advance = (c, state, at, extra = {}) => ({ ...c, state, ...extra, audit: [...c.audit, { at, action: `→${state}`, state }] });

// Execute the campaign end-to-end (up to KCR). `fetched` = the records the campaign's
// providers gathered (external fetch handed in by agent/backend). `pb` = the target asset
// (for impact). Returns the advanced campaign carrying the full manufactured chain.
export function runCampaign(campaign, { providers, fetched = {}, pb, asOf } = {}) {
  const provs = (providers || []).filter((p) => campaign.providerIds.includes(p.id));
  let c = advance(campaign, 'running', asOf);

  // 1. Providers → observations (each provider may also surface candidate evidence).
  const observations = provs.flatMap((p) => p.acquire({ records: fetched[p.id] || [], at: asOf }));
  const seedObs = observations[0] || createObservation({ kind: campaign.gapType === 'safety' ? 'regulation' : 'pricing', gapType: campaign.gapType, assetId: campaign.assetId, fieldPath: campaign.fieldPath, statement: campaign.goal, source: 'campaign', at: asOf });
  c = advance(c, 'observations', asOf, { observations });

  // 2. Evidence (from the providers' fetched records) + evidence intelligence.
  const evidence = dedupeEvidence(provs.flatMap((p) => recordsToEvidence(fetched[p.id] || [], p, { at: asOf })));
  const intel = analyzeEvidence(evidence, asOf);
  c = advance(c, 'evidence', asOf, { evidence, evidenceIntel: intel });

  // 3. Finding (from the observation + evidence for the campaign's field).
  const scopedObs = { ...seedObs, assetId: campaign.assetId, fieldPath: campaign.fieldPath, gapType: campaign.gapType };
  const finding = deriveFinding(scopedObs, evidence.filter((e) => e.fieldPath === campaign.fieldPath), { asOf });
  c = advance(c, 'findings', asOf, { finding });

  // 4. KCR (governed). Contradictions surface as conflict-KCR candidates (not resolved).
  const kcr = findingToKCR(finding, evidence, pb, asOf);
  c = advance(c, 'kcr', asOf, { kcr, conflicts: intel.contradictions });

  c.result = { observations: observations.length, evidence: evidence.length, finding: finding.status, kcr: kcr ? kcr.id : null, conflicts: intel.contradictions.length };
  return c;
}

// ── Thin store (campaigns are reusable organizational assets) ─────────────────
const KEY = 'ngw-kas-campaigns';
export function loadCampaigns() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function saveCampaigns(list) { try { localStorage.setItem(KEY, JSON.stringify(list || [])); return true; } catch { return false; } }
export function recordCampaign(c) { const list = loadCampaigns().filter((x) => x.id !== c.id); list.push(c); saveCampaigns(list); return list; }
export function clearCampaigns() { try { localStorage.removeItem(KEY); } catch { /* noop */ } }
