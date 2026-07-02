// KEP-2 golden tests: provider→observation, campaign execution (with REAL fetched DMV crab
// pricing), observation/evidence dedup, clustering, conflict detection, finding + KCR.
import { buildProviders, PROVIDER_FAMILIES, normalizeToObservations } from './providers';
import { createCampaign, runCampaign, CAMPAIGN_STATES } from './campaign';
import { analyzeEvidence, detectContradictions, dedupeEvidence, clusterEvidence } from './evidenceIntelligence';
import { createEvidence } from './evidence';
import { getPlaybook } from '../playbooks/index';

const ASOF = '2026-07-02';
const crab = getPlaybook('Crab Feast');

// REAL data acquired via external search (DMV blue crab market, July 2026):
// $250–400/bushel, holiday +30–40%, peak May–Oct. Three independent sources agree.
const REAL_FETCH = {
  'market-pricing': [
    { source: 'mdseafoodmarket.com', url: 'https://www.mdseafoodmarket.com/collections/crab', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', gapType: 'pricing', statement: 'DMV full bushel $399–599 (large)', excerpt: 'full bushel $399-599', extractedFacts: [{ field: 'p_crabs.unitCostRange', value: [250, 400] }] },
    { source: 'donscrabsandseafood.com', url: 'https://donscrabsandseafood.com/crab-prices/', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', gapType: 'pricing', statement: 'bushel ~$250–400 (2026)', extractedFacts: [{ field: 'p_crabs.unitCostRange', value: [250, 400] }] },
    { source: 'foxbaltimore.com', url: 'https://foxbaltimore.com/news/local/price-and-demand-for-blue-crabs-crabmeat-predicted-to-remain-high-in-maryland', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', gapType: 'pricing', statement: 'prices predicted to remain high in MD', extractedFacts: [{ field: 'p_crabs.unitCostRange', value: [250, 400] }] },
  ],
};

describe('Bundle A — providers produce observations only', () => {
  const providers = buildProviders();
  test('one provider per family, all 16 families', () => {
    expect(providers.length).toBeGreaterThanOrEqual(PROVIDER_FAMILIES.length);
    expect(new Set(providers.map((p) => p.family)).size).toBe(PROVIDER_FAMILIES.length);
  });
  test('a provider yields Observations (never findings/KCRs)', () => {
    const mp = providers.find((p) => p.id === 'market-pricing');
    const obs = mp.acquire({ records: REAL_FETCH['market-pricing'], at: ASOF });
    expect(obs.length).toBe(3);
    expect(obs.every((o) => o.status === 'open' && o.audit[0].action === 'observed')).toBe(true);
    expect(obs.every((o) => o.findingId === undefined && o.kcr === undefined)).toBe(true);
  });
});

describe('Bundle C — evidence intelligence', () => {
  test('dedupes, clusters, and ranks authority', () => {
    const ev = [
      createEvidence({ source: 'A', authorityLevel: 'community', assetId: 'Crab Feast', fieldPath: 'f', at: ASOF }),
      createEvidence({ source: 'A', authorityLevel: 'community', assetId: 'Crab Feast', fieldPath: 'f', at: ASOF }), // dup id
      createEvidence({ source: 'USDA', authorityLevel: 'primary', assetId: 'Crab Feast', fieldPath: 'f', at: ASOF }),
    ];
    expect(dedupeEvidence(ev).length).toBe(2);
    expect(Object.keys(clusterEvidence(ev))).toContain('Crab Feast::f');
    const a = analyzeEvidence(ev, ASOF);
    expect(a.duplicatesRemoved).toBe(1);
    expect(a.authorityTop).toBe('primary');
  });
  test('detects contradictions and emits a conflict-KCR candidate — never resolves', () => {
    const ev = [
      createEvidence({ source: 'A', authorityLevel: 'trade', assetId: 'Crab Feast', fieldPath: 'price', extractedFacts: [{ field: 'price', value: [250, 400] }], at: ASOF }),
      createEvidence({ source: 'B', authorityLevel: 'community', assetId: 'Crab Feast', fieldPath: 'price', extractedFacts: [{ field: 'price', value: [150, 250] }], at: ASOF }),
    ];
    const conflicts = detectContradictions(ev);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].conflictKCR.type).toBe('contradiction');
    expect(conflicts[0].distinctValues).toBe(2);
  });
});

describe('Bundle B — the real "Improve Crab Feast Pricing" campaign, end to end', () => {
  const providers = buildProviders();
  const campaign = createCampaign({ goal: 'Improve Crab Feast Pricing', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', gapType: 'pricing', providers: ['market-pricing'], at: ASOF });
  const done = runCampaign(campaign, { providers, fetched: REAL_FETCH, pb: crab, asOf: ASOF });

  test('campaign advances through the lifecycle to a governed KCR', () => {
    expect(CAMPAIGN_STATES).toContain('kcr');
    expect(done.state).toBe('kcr');
    expect(done.audit.map((a) => a.state)).toEqual(expect.arrayContaining(['running', 'observations', 'evidence', 'findings', 'kcr']));
  });
  test('it manufactured real evidence → a corroborated finding → a research KCR (no auto-publish)', () => {
    expect(done.observations.length).toBe(3);
    expect(done.evidence.length).toBe(3);
    expect(done.finding.status).toBe('proposed');
    expect(done.finding.proposedValue).toEqual([250, 400]);
    expect(done.finding.corroboration).toBe(3);
    expect(done.kcr.type).toBe('research');
    expect(done.kcr.status).toBe('draft');                 // governed — needs review, not published
    expect(done.kcr.proposal.sources.length).toBe(3);      // cited to the real sources
    expect(done.result.conflicts).toBe(0);
  });
  test('the KCR carries real source provenance (external acquisition, unfrozen)', () => {
    expect(done.evidence.map((e) => e.url)).toEqual(expect.arrayContaining([
      'https://www.mdseafoodmarket.com/collections/crab',
      'https://donscrabsandseafood.com/crab-prices/',
    ]));
    expect(done.evidence.every((e) => e.expirationDate)).toBe(true); // freshness inherited from provider
  });
});
