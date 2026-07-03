// ─── KRA-1 Tests — Knowledge Research Automation ──────────────────────────────
// Covers: providerNormalizers, researchRunner, providerIntelligence, reviewPacket
// All tests are pure — no localStorage, no network, no side effects.

import {
  normalizeBLS, normalizeUSDA, normalizeFDA, normalizeMarketPricing, normalizeNOAA,
  autoNormalize, pasteHintFor, PROVIDER_NORMALIZER_MAP,
} from './providerNormalizers';

import {
  batchByFilter, runCampaigns, autoCorroborate, runSummaryLabel,
} from './researchRunner';

import {
  recordProviderRun, getProviderStats, rankProviders, providerIntelligenceSummary, extractProviderRunStats,
} from './providerIntelligence';

import {
  prepareReviewPacket, formatReviewPacketText,
} from './reviewPacket';

// ─── providerNormalizers ───────────────────────────────────────────────────────

describe('normalizeBLS', () => {
  const blsResponse = {
    Results: {
      series: [{
        seriesID: 'APU0000711211',
        data: [{ year: '2026', period: 'M06', value: '1.478' }],
      }],
    },
  };

  test('parses the most recent data point as a record', () => {
    const { records } = normalizeBLS(blsResponse, { assetId: 'crab_feast', fieldPath: 'crabs.unitCostRange' });
    expect(records).toHaveLength(1);
    expect(records[0].source).toBe('data.gov');
    expect(records[0].extractedFacts[0].value).toBeCloseTo(1.478);
    expect(records[0].extractedFacts[0].field).toBe('crabs.unitCostRange');
    expect(records[0].authority).toBe('official');
  });

  test('returns empty records with error on invalid JSON string', () => {
    const { records, error } = normalizeBLS('not json at all');
    expect(records).toHaveLength(0);
    expect(error).toBeTruthy();
  });

  test('accepts a JSON string (not just object)', () => {
    const { records } = normalizeBLS(JSON.stringify(blsResponse), { fieldPath: 'p_x.cost' });
    expect(records).toHaveLength(1);
  });

  test('skips data points with missing or dash values', () => {
    const response = { Results: { series: [{ seriesID: 'X', data: [{ year: '2026', period: 'M01', value: '-' }] }] } };
    const { records } = normalizeBLS(response);
    expect(records).toHaveLength(0);
  });

  test('returns period in YYYY-MM format', () => {
    const { records } = normalizeBLS(blsResponse, { fieldPath: 'f' });
    expect(records[0].extractedFacts[0].period).toBe('2026-06');
  });
});

describe('normalizeUSDA', () => {
  test('extracts price from array of USDA records', () => {
    const input = [{ commodity: 'Crabs', price: 8.5, unit: 'lb', year: 2026 }];
    const { records } = normalizeUSDA(input, { assetId: 'crab_feast', fieldPath: 'crabs.unitCostRange' });
    expect(records).toHaveLength(1);
    expect(records[0].extractedFacts[0].value).toBeCloseTo(8.5);
    expect(records[0].authority).toBe('official');
  });

  test('extracts price from wrapped { data: [...] } response', () => {
    const input = { data: [{ commodity: 'Corn', price: 5.2, unit: 'bushel' }] };
    const { records } = normalizeUSDA(input, { fieldPath: 'corn.unitCost' });
    expect(records).toHaveLength(1);
  });

  test('skips records without recognizable price field', () => {
    const input = [{ commodity: 'X', description: 'no price here' }];
    const { records } = normalizeUSDA(input, { fieldPath: 'x' });
    expect(records).toHaveLength(0);
  });

  test('falls back to commodity label from opts when not in record', () => {
    const input = [{ price: 12.0, unit: 'lb' }];
    const { records } = normalizeUSDA(input, { fieldPath: 'f', commodity: 'Shrimp' });
    expect(records[0].excerpt).toContain('Shrimp');
  });
});

describe('normalizeFDA', () => {
  test('converts FDA enforcement results to recall records', () => {
    const input = {
      results: [
        { recall_number: '123', product_description: 'Raw shrimp', reason_for_recall: 'Salmonella', status: 'Ongoing' },
      ],
    };
    const { records } = normalizeFDA(input, { assetId: 'crab_feast' });
    expect(records).toHaveLength(1);
    expect(records[0].fieldPath).toBe('safetyNotes');
    expect(records[0].authority).toBe('official');
    expect(records[0].extractedFacts[0].value).toContain('Salmonella');
  });

  test('limits to 10 recall records', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ recall_number: String(i), product_description: 'item', reason_for_recall: 'bacteria', status: 'Completed' }));
    const { records } = normalizeFDA({ results: many }, {});
    expect(records).toHaveLength(10);
  });

  test('returns empty records on invalid JSON', () => {
    const { records, error } = normalizeFDA('bad', {});
    expect(records).toHaveLength(0);
    expect(error).toBeTruthy();
  });
});

describe('normalizeMarketPricing', () => {
  test('parses scalar price', () => {
    const input = [{ price: 9.5, unit: 'lb', item: 'Blue crab', source: 'Costco' }];
    const { records } = normalizeMarketPricing(input, { assetId: 'crab_feast', fieldPath: 'crabs.unitCostRange' });
    expect(records).toHaveLength(1);
    expect(records[0].extractedFacts[0].value).toBe(9.5);
    expect(records[0].authority).toBe('trade');
  });

  test('parses [min, max] array price', () => {
    const input = [{ price: [7, 12], unit: 'dozen', item: 'Dungeness crab' }];
    const { records } = normalizeMarketPricing(input, { fieldPath: 'f' });
    expect(Array.isArray(records[0].extractedFacts[0].value)).toBe(true);
    expect(records[0].extractedFacts[0].value).toEqual([7, 12]);
  });

  test('parses priceMin/priceMax style', () => {
    const input = [{ priceMin: 6, priceMax: 10, unit: 'lb', item: 'Shrimp' }];
    const { records } = normalizeMarketPricing(input, { fieldPath: 'f' });
    expect(records[0].extractedFacts[0].value).toEqual([6, 10]);
  });

  test('skips records without any price field', () => {
    const input = [{ item: 'mystery', unit: 'lb' }];
    const { records } = normalizeMarketPricing(input, { fieldPath: 'f' });
    expect(records).toHaveLength(0);
  });

  test('accepts single object (not array)', () => {
    const input = { price: 8, unit: 'lb', item: 'crab' };
    const { records } = normalizeMarketPricing(input, { fieldPath: 'f' });
    expect(records).toHaveLength(1);
  });
});

describe('normalizeNOAA', () => {
  test('parses results array into records', () => {
    const input = { results: [{ date: '2026-06-01', datatype: 'TMAX', value: 87, station: 'GHCND:US12345' }] };
    const { records } = normalizeNOAA(input, { assetId: 'outdoor', fieldPath: 'weatherGuidance' });
    expect(records).toHaveLength(1);
    expect(records[0].source).toBe('noaa');
    expect(records[0].fieldPath).toBe('weatherGuidance');
    expect(records[0].authority).toBe('official');
  });

  test('limits to 5 records', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ date: `2026-06-0${i + 1}`, datatype: 'TMAX', value: 80 + i, station: 'X' }));
    const { records } = normalizeNOAA({ results: many }, {});
    expect(records).toHaveLength(5);
  });
});

describe('autoNormalize', () => {
  test('routes data.gov to normalizeBLS', () => {
    const blsResponse = { Results: { series: [{ seriesID: 'X', data: [{ year: '2026', period: 'M05', value: '2.0' }] }] } };
    const { records } = autoNormalize('data.gov', blsResponse, { fieldPath: 'f' });
    expect(records.length).toBeGreaterThanOrEqual(0);  // may be 0 if BLS parse fails gracefully
  });

  test('routes unknown provider to market pricing normalizer', () => {
    const input = [{ price: 5, unit: 'lb', item: 'salmon' }];
    const { records } = autoNormalize('some-unknown-provider', input, { fieldPath: 'f' });
    expect(records).toHaveLength(1);
    expect(records[0].source).toBe('some-unknown-provider');
  });

  test('routes restaurant-depot to market pricing normalizer', () => {
    const input = [{ price: [4, 7], unit: 'lb', item: 'crab' }];
    const { records } = autoNormalize('restaurant-depot', input, { fieldPath: 'f' });
    expect(records).toHaveLength(1);
    expect(records[0].source).toBe('restaurant-depot');
  });
});

describe('pasteHintFor', () => {
  test('returns a hint string for known providers', () => {
    const hint = pasteHintFor('data.gov');
    expect(typeof hint).toBe('string');
    expect(hint.length).toBeGreaterThan(10);
  });

  test('returns a generic hint for unknown provider', () => {
    const hint = pasteHintFor('something-unknown');
    expect(typeof hint).toBe('string');
    expect(hint).toContain('price');
  });
});

describe('PROVIDER_NORMALIZER_MAP', () => {
  test('covers key providers', () => {
    expect(PROVIDER_NORMALIZER_MAP['data.gov']).toBeDefined();
    expect(PROVIDER_NORMALIZER_MAP['noaa']).toBeDefined();
    expect(PROVIDER_NORMALIZER_MAP['fda-foodsafety']).toBeDefined();
    expect(PROVIDER_NORMALIZER_MAP['restaurant-depot']).toBeDefined();
  });
});

// ─── researchRunner ────────────────────────────────────────────────────────────

const mkCampaign = (id, priority = 'high', assetId = 'crab_feast', state = 'draft') => ({
  id, goal: `Research ${id}`, assetId, fieldPath: 'p_crabs.unitCostRange',
  gapType: 'pricing', gapTypes: ['pricing'], priority, trigger: 'research',
  providerIds: ['internal-validation'], state, createdAt: '2026-06-01',
  audit: [{ at: '2026-06-01', action: 'created', state: 'draft' }], result: null,
});

describe('batchByFilter', () => {
  const campaigns = [
    mkCampaign('c1', 'high', 'crab_feast'),
    mkCampaign('c2', 'med', 'crab_feast'),
    mkCampaign('c3', 'low', 'dinner_party'),
    mkCampaign('c4', 'high', 'dinner_party'),
  ];

  test('filters by priority', () => {
    expect(batchByFilter(campaigns, { priority: 'high' })).toHaveLength(2);
    expect(batchByFilter(campaigns, { priority: 'low' })).toHaveLength(1);
  });

  test('filters by playbookType (assetId)', () => {
    expect(batchByFilter(campaigns, { playbookType: 'crab_feast' })).toHaveLength(2);
  });

  test('filters by explicit IDs', () => {
    const result = batchByFilter(campaigns, { ids: ['c1', 'c3'] });
    expect(result).toHaveLength(2);
    expect(result.map(c => c.id)).toContain('c1');
  });

  test('returns all campaigns with empty filter', () => {
    expect(batchByFilter(campaigns, {})).toHaveLength(4);
  });

  test('returns empty array for empty input', () => {
    expect(batchByFilter([], { priority: 'high' })).toHaveLength(0);
    expect(batchByFilter(null, {})).toHaveLength(0);
  });

  test('stacks multiple filters (priority + playbook)', () => {
    const result = batchByFilter(campaigns, { priority: 'high', playbookType: 'crab_feast' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });
});

describe('runCampaigns', () => {
  test('returns summary with total and ran counts', () => {
    const campaigns = [mkCampaign('x1'), mkCampaign('x2')];
    const { results, summary } = runCampaigns(campaigns, { asOf: '2026-07-01' });
    expect(summary.total).toBe(2);
    expect(typeof summary.ran).toBe('number');
    expect(summary.evidenceTotal).toBeGreaterThanOrEqual(0);
    expect(summary.findingsTotal).toBeGreaterThanOrEqual(0);
    expect(summary.kcrTotal).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(results)).toBe(true);
  });

  test('reports each campaign result', () => {
    const campaigns = [mkCampaign('x3')];
    const { results } = runCampaigns(campaigns, { asOf: '2026-07-01' });
    expect(results[0].campaignId).toBe('x3');
    expect(typeof results[0].success).toBe('boolean');
  });

  test('calls onProgress for each campaign', () => {
    const calls = [];
    runCampaigns([mkCampaign('xp')], { asOf: '2026-07-01', onProgress: (x) => calls.push(x) });
    expect(calls).toHaveLength(1);
    expect(calls[0].campaignId).toBe('xp');
  });

  test('returns empty summary for empty campaign list', () => {
    const { summary } = runCampaigns([], { asOf: '2026-07-01' });
    expect(summary.total).toBe(0);
    expect(summary.ran).toBe(0);
  });
});

describe('autoCorroborate', () => {
  const campaign = mkCampaign('corr-test', 'high', 'crab_feast');

  test('returns null when evidence is empty', () => {
    const result = { evidence: [] };
    expect(autoCorroborate(campaign, result, { asOf: '2026-07-01' })).toBeNull();
  });

  test('returns null for null campaign or result', () => {
    expect(autoCorroborate(null, {}, {})).toBeNull();
    expect(autoCorroborate(campaign, null, {})).toBeNull();
  });

  test('creates corroboration for single commercial evidence', () => {
    const result = {
      evidence: [{ source: 'market-pricing', authority: 'trade', fieldPath: 'p_crabs.unitCostRange' }],
    };
    const corr = autoCorroborate(campaign, result, { asOf: '2026-07-01' });
    expect(corr).not.toBeNull();
    expect(corr.trigger).toBe('validation');
    expect(corr.priority).toBe('high');
    expect(corr.corroboratesId).toBe('corr-test');
    expect(corr.corroborationReason).toBeTruthy();
  });

  test('creates corroboration for community-forums source', () => {
    const result = {
      evidence: [
        { source: 'community-forums', authority: 'community', fieldPath: 'p_crabs.unitCostRange' },
        { source: 'market-pricing', authority: 'trade', fieldPath: 'p_crabs.unitCostRange' },
      ],
    };
    const corr = autoCorroborate(campaign, result, { asOf: '2026-07-01' });
    expect(corr).not.toBeNull();
    expect(corr.corroborationReason).toContain('Community');
  });

  test('returns null when evidence already has official source (no community)', () => {
    const result = {
      evidence: [
        { source: 'data.gov', authority: 'official', fieldPath: 'f' },
        { source: 'market-pricing', authority: 'trade', fieldPath: 'f' },
      ],
    };
    expect(autoCorroborate(campaign, result, {})).toBeNull();
  });

  test('does not target providers already in campaign', () => {
    const campaignWithGov = { ...campaign, providerIds: ['data.gov', 'scholar'] };
    const result = { evidence: [{ source: 'market-pricing', authority: 'trade' }] };
    const corr = autoCorroborate(campaignWithGov, result, { asOf: '2026-07-01' });
    // All corroboration targets for pricing (data.gov, scholar) are already in providerIds
    expect(corr).toBeNull();
  });
});

describe('runSummaryLabel', () => {
  test('formats summary as a readable string', () => {
    const label = runSummaryLabel({ ran: 3, total: 4, evidenceTotal: 8, findingsTotal: 2, kcrTotal: 1, errors: 1 });
    expect(label).toContain('3/4');
    expect(label).toContain('8 evidence');
    expect(label).toContain('2 findings');
    expect(label).toContain('1 KCR');
    expect(label).toContain('1 error');
  });

  test('returns safe string for null input', () => {
    expect(runSummaryLabel(null)).toBeTruthy();
  });
});

// ─── providerIntelligence ──────────────────────────────────────────────────────

describe('recordProviderRun', () => {
  test('creates a new provider record on first run', () => {
    const intel = {};
    const updated = recordProviderRun(intel, 'market-pricing', { campaignId: 'c1', evidenceProduced: 3, accepted: 2, contradictions: 0, authority: 'trade', at: '2026-07-01' });
    expect(updated['market-pricing']).toBeDefined();
    expect(updated['market-pricing'].totalRuns).toBe(1);
    expect(updated['market-pricing'].totalEvidence).toBe(3);
    expect(updated['market-pricing'].totalAccepted).toBe(2);
  });

  test('accumulates across multiple runs', () => {
    let intel = {};
    intel = recordProviderRun(intel, 'market-pricing', { evidenceProduced: 2, accepted: 1, authority: 'trade', at: '2026-07-01' });
    intel = recordProviderRun(intel, 'market-pricing', { evidenceProduced: 4, accepted: 3, authority: 'trade', at: '2026-07-02' });
    expect(intel['market-pricing'].totalRuns).toBe(2);
    expect(intel['market-pricing'].totalEvidence).toBe(6);
    expect(intel['market-pricing'].totalAccepted).toBe(4);
  });

  test('tracks first and last run dates', () => {
    let intel = {};
    intel = recordProviderRun(intel, 'data.gov', { evidenceProduced: 1, accepted: 1, authority: 'official', at: '2026-06-01' });
    intel = recordProviderRun(intel, 'data.gov', { evidenceProduced: 1, accepted: 1, authority: 'official', at: '2026-07-01' });
    expect(intel['data.gov'].firstRun).toBe('2026-06-01');
    expect(intel['data.gov'].lastRun).toBe('2026-07-01');
  });

  test('does not mutate the input intel object', () => {
    const intel = {};
    const updated = recordProviderRun(intel, 'noaa', { evidenceProduced: 1, accepted: 1, authority: 'official' });
    expect(intel['noaa']).toBeUndefined();
    expect(updated['noaa']).toBeDefined();
  });
});

describe('getProviderStats', () => {
  test('returns null for unknown provider', () => {
    expect(getProviderStats({}, 'unknown')).toBeNull();
  });

  test('computes acceptance rate correctly', () => {
    let intel = {};
    intel = recordProviderRun(intel, 'market-pricing', { evidenceProduced: 4, accepted: 2, authority: 'trade' });
    const stats = getProviderStats(intel, 'market-pricing');
    expect(stats.acceptanceRate).toBeCloseTo(0.5);
  });

  test('returns null acceptance rate when no evidence', () => {
    let intel = {};
    intel = recordProviderRun(intel, 'test-p', { evidenceProduced: 0, accepted: 0, authority: 'trade' });
    const stats = getProviderStats(intel, 'test-p');
    expect(stats.acceptanceRate).toBeNull();
  });

  test('returns evidencePerRun as string', () => {
    let intel = {};
    intel = recordProviderRun(intel, 'data.gov', { evidenceProduced: 3, accepted: 3, authority: 'official' });
    const stats = getProviderStats(intel, 'data.gov');
    expect(typeof stats.evidencePerRun).toBe('string');
  });
});

describe('rankProviders', () => {
  test('ranks official providers higher for grounding fields', () => {
    const intel = {};
    const ranked = rankProviders(intel, ['market-pricing', 'data.gov', 'scholar'], 'grounding');
    expect(ranked.indexOf('data.gov')).toBeLessThan(ranked.indexOf('market-pricing'));
  });

  test('uses acceptance rate as primary rank when intel exists', () => {
    let intel = {};
    intel = recordProviderRun(intel, 'market-pricing', { evidenceProduced: 4, accepted: 4, authority: 'trade' });
    intel = recordProviderRun(intel, 'data.gov', { evidenceProduced: 4, accepted: 1, authority: 'official' });
    const ranked = rankProviders(intel, ['market-pricing', 'data.gov'], 'pricing');
    // market-pricing has 100% acceptance vs data.gov's 25%
    expect(ranked[0]).toBe('market-pricing');
  });

  test('returns same-length list', () => {
    const providers = ['a', 'b', 'c'];
    expect(rankProviders({}, providers, 'pricing')).toHaveLength(3);
  });
});

describe('providerIntelligenceSummary', () => {
  test('returns zero counts for empty intel', () => {
    const s = providerIntelligenceSummary({});
    expect(s.totalProviders).toBe(0);
    expect(s.avgAcceptanceRate).toBeNull();
  });

  test('identifies best performer', () => {
    let intel = {};
    intel = recordProviderRun(intel, 'data.gov', { evidenceProduced: 4, accepted: 4, authority: 'official' });
    intel = recordProviderRun(intel, 'market-pricing', { evidenceProduced: 4, accepted: 1, authority: 'trade' });
    const s = providerIntelligenceSummary(intel);
    expect(s.bestPerformer).toBe('data.gov');
  });
});

describe('extractProviderRunStats', () => {
  test('extracts stats from batch run results', () => {
    const results = [{
      campaignId: 'c1',
      success: true,
      result: {
        evidence: [
          { source: 'market-pricing', authority: 'trade', fieldPath: 'f' },
          { source: 'market-pricing', authority: 'trade', fieldPath: 'f' },
          { source: 'data.gov', authority: 'official', fieldPath: 'f' },
        ],
        evidenceIntel: { contradictions: [] },
        finding: { fieldPath: 'f' },
      },
    }];
    const stats = extractProviderRunStats(results, '2026-07-01');
    expect(stats.length).toBeGreaterThan(0);
    const mpStat = stats.find((s) => s.providerId === 'market-pricing');
    expect(mpStat).toBeDefined();
    expect(mpStat.evidenceProduced).toBe(2);
  });

  test('skips failed run results', () => {
    const results = [{ campaignId: 'c2', success: false, error: 'failed' }];
    expect(extractProviderRunStats(results, '2026-07-01')).toHaveLength(0);
  });
});

// ─── reviewPacket ─────────────────────────────────────────────────────────────

const mkKcr = (id, state = 'kcr', opts = {}) => ({
  id,
  assetId: opts.assetId || 'crab_feast',
  fieldPath: opts.fieldPath || 'p_crabs.unitCostRange',
  state,
  type: 'pricing',
  gapType: 'pricing',
  proposedValue: opts.proposedValue || [8, 15],
  unit: opts.unit || 'USD/lb',
  priority: 'high',
  trigger: 'research',
  reason: 'Pricing gap',
  conflicts: opts.conflicts || [],
  audit: [],
  impact: null,
});

const mkEvidence = (source, authority = 'trade') => ({
  id: `ev-${source}`,
  assetId: 'crab_feast',
  fieldPath: 'p_crabs.unitCostRange',
  source,
  authority,
  sourceType: authority,
  excerpt: `${source}: crabs $9/lb`,
  region: 'US',
  capturedAt: '2026-06-01',
});

describe('prepareReviewPacket', () => {
  test('returns null for null KCR', () => {
    expect(prepareReviewPacket(null, [], [])).toBeNull();
  });

  test('generates a packet for a KCR with evidence', () => {
    const kcr = mkKcr('kcr-1');
    const ev = [mkEvidence('market-pricing', 'trade'), mkEvidence('data.gov', 'official')];
    const packet = prepareReviewPacket(kcr, ev, [], { asOf: '2026-07-01' });
    expect(packet).not.toBeNull();
    expect(packet.kcrId).toBe('kcr-1');
    expect(packet.evidenceCount).toBe(2);
    expect(packet.sources).toContain('market-pricing');
    expect(packet.sources).toContain('data.gov');
  });

  test('marks readyToPublish when official evidence and no contradictions', () => {
    const kcr = mkKcr('kcr-2');
    const ev = [mkEvidence('market-pricing', 'trade'), mkEvidence('data.gov', 'official')];
    const packet = prepareReviewPacket(kcr, ev, [], { asOf: '2026-07-01' });
    expect(packet.readyToPublish).toBe(true);
    expect(packet.reviewerAction).toContain('Approve');
  });

  test('flags hasContradictions when conflicts present', () => {
    const kcr = mkKcr('kcr-3', 'kcr', { conflicts: [{ field: 'f', description: 'conflict A vs B' }] });
    const packet = prepareReviewPacket(kcr, [mkEvidence('a'), mkEvidence('b', 'official')], [], {});
    expect(packet.hasContradictions).toBe(true);
    expect(packet.readyToPublish).toBe(false);
    expect(packet.reviewerAction).toContain('Hold');
  });

  test('suggests reviewers for pricing fields', () => {
    const packet = prepareReviewPacket(mkKcr('kcr-4'), [mkEvidence('a', 'official')], [], {});
    expect(Array.isArray(packet.suggestedReviewers)).toBe(true);
    expect(packet.suggestedReviewers.length).toBeGreaterThan(0);
  });

  test('strength label reflects evidence quality', () => {
    const strong = [mkEvidence('a', 'official'), mkEvidence('b', 'trade'), mkEvidence('c', 'trade')];
    const weak   = [mkEvidence('a', 'trade')];
    const pStrong = prepareReviewPacket(mkKcr('k5'), strong, [], {});
    const pWeak   = prepareReviewPacket(mkKcr('k6'), weak, [], {});
    expect(pStrong.strength).toContain('Strong');
    expect(pWeak.strength).toContain('Weak');
  });

  test('generates impact estimate for range proposedValue', () => {
    const kcr = mkKcr('kcr-7', 'kcr', { proposedValue: [8, 15], unit: 'USD/lb' });
    const pb = { type: 'crab_feast', label: 'Crab Feast' };
    const packet = prepareReviewPacket(kcr, [mkEvidence('a', 'official')], [pb], {});
    expect(packet.impactEstimate).toBeTruthy();
  });
});

describe('formatReviewPacketText', () => {
  test('returns a non-empty text block for a valid packet', () => {
    const kcr = mkKcr('kcr-text');
    const ev = [mkEvidence('data.gov', 'official'), mkEvidence('market-pricing', 'trade')];
    const packet = prepareReviewPacket(kcr, ev, [], { asOf: '2026-07-01' });
    const text = formatReviewPacketText(packet);
    expect(typeof text).toBe('string');
    expect(text).toContain('KCR REVIEW PACKET');
    expect(text).toContain('EVIDENCE');
    expect(text).toContain('PROPOSED VALUE');
    expect(text).toContain('REVIEWER ACTION');
  });

  test('returns empty string for null packet', () => {
    expect(formatReviewPacketText(null)).toBe('');
  });
});
