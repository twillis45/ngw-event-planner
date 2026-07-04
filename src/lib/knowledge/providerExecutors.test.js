// ─── providerExecutors.test.js ────────────────────────────────────────────────
import {
  EXECUTOR_REGISTRY,
  EXECUTOR_IDS,
  executeProvider,
  buildQuery,
  executorFor,
} from './providerExecutors';

// ── Canonical test fixtures ───────────────────────────────────────────────────

const CRAB_GAP = {
  fieldPath: 'p_crabs.unitCostRange',
  fieldLabel: 'Crabs — unit cost range',
  gapKind: 'pricing',
  playbookType: 'crabFeast',
};

const CRAB_BP = {
  knowledgeType: 'pricing',
  claim: 'Larges cost $7.92–8.17/crab at retail in the DMV',
  recommendedProviders: ['market-pricing', 'data.gov'],
  corroborationRequirements: { required: true, targets: ['data.gov', 'scholar'] },
};

const ASOF = '2026-07-03';

// ── EXECUTOR_REGISTRY shape ───────────────────────────────────────────────────

describe('EXECUTOR_REGISTRY', () => {
  const EXPECTED_FAMILIES = [
    'government', 'food-safety', 'commercial', 'industry', 'academic', 'community', 'internal',
  ];

  test('has all 7 executor family keys', () => {
    EXPECTED_FAMILIES.forEach((key) => {
      expect(EXECUTOR_REGISTRY).toHaveProperty(key);
    });
    expect(Object.keys(EXECUTOR_REGISTRY)).toHaveLength(7);
  });

  test('each executor has id, providers, buildQuery, simulate, normalizeResponse', () => {
    Object.values(EXECUTOR_REGISTRY).forEach((executor) => {
      expect(typeof executor.id).toBe('string');
      expect(Array.isArray(executor.providers)).toBe(true);
      expect(typeof executor.buildQuery).toBe('function');
      expect(typeof executor.simulate).toBe('function');
      expect(typeof executor.normalizeResponse).toBe('function');
    });
  });

  test('executor id matches its registry key', () => {
    Object.entries(EXECUTOR_REGISTRY).forEach(([key, executor]) => {
      expect(executor.id).toBe(key);
    });
  });

  test('each executor has at least one provider', () => {
    Object.values(EXECUTOR_REGISTRY).forEach((executor) => {
      expect(executor.providers.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ── EXECUTOR_IDS ──────────────────────────────────────────────────────────────

describe('EXECUTOR_IDS', () => {
  test('is an array of 7 executor IDs', () => {
    expect(Array.isArray(EXECUTOR_IDS)).toBe(true);
    expect(EXECUTOR_IDS).toHaveLength(7);
  });

  test('contains all expected family IDs', () => {
    expect(EXECUTOR_IDS).toContain('government');
    expect(EXECUTOR_IDS).toContain('food-safety');
    expect(EXECUTOR_IDS).toContain('commercial');
    expect(EXECUTOR_IDS).toContain('industry');
    expect(EXECUTOR_IDS).toContain('academic');
    expect(EXECUTOR_IDS).toContain('community');
    expect(EXECUTOR_IDS).toContain('internal');
  });

  test('matches the keys of EXECUTOR_REGISTRY', () => {
    expect(EXECUTOR_IDS.sort()).toEqual(Object.keys(EXECUTOR_REGISTRY).sort());
  });
});

// ── executeProvider — simulate mode ──────────────────────────────────────────

describe('executeProvider (simulate mode)', () => {
  test('market-pricing returns an array of records', () => {
    const records = executeProvider('market-pricing', CRAB_GAP, CRAB_BP, { mode: 'simulate', asOf: ASOF });
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
  });

  test('data.gov returns an array of records', () => {
    const records = executeProvider('data.gov', CRAB_GAP, CRAB_BP, { mode: 'simulate', asOf: ASOF });
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
  });

  test('internal-validation returns [] (honest-empty)', () => {
    const records = executeProvider('internal-validation', CRAB_GAP, null, { mode: 'simulate', asOf: ASOF });
    expect(records).toEqual([]);
  });

  test('each returned record has statement, source, gapType, at', () => {
    const records = executeProvider('market-pricing', CRAB_GAP, CRAB_BP, { mode: 'simulate', asOf: ASOF });
    records.forEach((r) => {
      expect(typeof r.statement).toBe('string');
      expect(r.statement.length).toBeGreaterThan(0);
      expect(typeof r.source).toBe('string');
      expect(r.source.length).toBeGreaterThan(0);
      expect(typeof r.gapType).toBe('string');
      expect(typeof r.at).toBe('string');
    });
  });

  test('data.gov records have statement, source, gapType, at', () => {
    const records = executeProvider('data.gov', CRAB_GAP, CRAB_BP, { mode: 'simulate', asOf: ASOF });
    records.forEach((r) => {
      expect(typeof r.statement).toBe('string');
      expect(typeof r.source).toBe('string');
      expect(typeof r.gapType).toBe('string');
      expect(typeof r.at).toBe('string');
    });
  });

  test('throws for an unknown provider', () => {
    expect(() => {
      executeProvider('unknown-provider', CRAB_GAP, null, { mode: 'simulate', asOf: ASOF });
    }).toThrow();
  });

  test('error message for unknown provider names the provider', () => {
    expect(() => {
      executeProvider('unknown-provider', CRAB_GAP, null, { mode: 'simulate', asOf: ASOF });
    }).toThrow('unknown-provider');
  });

  test('simulate mode uses asOf in returned at field', () => {
    const records = executeProvider('market-pricing', CRAB_GAP, CRAB_BP, { mode: 'simulate', asOf: ASOF });
    expect(records[0].at).toBe(ASOF);
  });

  test('fda-foodsafety returns records in simulate mode', () => {
    const records = executeProvider('fda-foodsafety', CRAB_GAP, CRAB_BP, { mode: 'simulate', asOf: ASOF });
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
  });

  test('scholar returns records in simulate mode', () => {
    const records = executeProvider('scholar', CRAB_GAP, CRAB_BP, { mode: 'simulate', asOf: ASOF });
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
  });
});

// ── executeProvider — inject mode ─────────────────────────────────────────────

describe('executeProvider (inject mode)', () => {
  test('inject mode with injected=null returns []', () => {
    const records = executeProvider('market-pricing', CRAB_GAP, CRAB_BP, {
      mode: 'inject',
      injected: null,
      asOf: ASOF,
    });
    expect(records).toEqual([]);
  });

  test('inject mode with valid records passes them through normalizeResponse', () => {
    const injectedRecords = [
      { statement: 'Test statement', source: 'market-pricing', gapType: 'pricing', at: ASOF },
    ];
    const records = executeProvider('market-pricing', CRAB_GAP, CRAB_BP, {
      mode: 'inject',
      injected: injectedRecords,
      asOf: ASOF,
    });
    expect(Array.isArray(records)).toBe(true);
    expect(records).toHaveLength(1);
  });

  test('inject mode with object containing records array normalizes correctly', () => {
    const injectedPayload = {
      records: [
        { statement: 'Injected', source: 'data.gov', gapType: 'pricing', at: ASOF },
      ],
    };
    const records = executeProvider('data.gov', CRAB_GAP, CRAB_BP, {
      mode: 'inject',
      injected: injectedPayload,
      asOf: ASOF,
    });
    expect(Array.isArray(records)).toBe(true);
  });
});

// ── buildQuery ────────────────────────────────────────────────────────────────

describe('buildQuery', () => {
  test('data.gov returns a query object with type and endpoint', () => {
    const query = buildQuery('data.gov', CRAB_GAP, CRAB_BP);
    expect(query).not.toBeNull();
    expect(typeof query.type).toBe('string');
    expect(typeof query.endpoint).toBe('string');
  });

  test('market-pricing returns a query object with type and endpoint', () => {
    const query = buildQuery('market-pricing', CRAB_GAP, CRAB_BP);
    expect(query).not.toBeNull();
    expect(typeof query.type).toBe('string');
    expect(typeof query.endpoint).toBe('string');
  });

  test('returns null for an unknown provider', () => {
    const query = buildQuery('unknown-xyz', CRAB_GAP, null);
    expect(query).toBeNull();
  });

  test('query includes searchTerms array', () => {
    const query = buildQuery('data.gov', CRAB_GAP, CRAB_BP);
    expect(Array.isArray(query.searchTerms)).toBe(true);
    expect(query.searchTerms.length).toBeGreaterThan(0);
  });

  test('fda-foodsafety returns a query object', () => {
    const query = buildQuery('fda-foodsafety', CRAB_GAP, CRAB_BP);
    expect(query).not.toBeNull();
    expect(typeof query.type).toBe('string');
  });

  test('scholar returns a query object', () => {
    const query = buildQuery('scholar', CRAB_GAP, CRAB_BP);
    expect(query).not.toBeNull();
    expect(typeof query.type).toBe('string');
  });
});

// ── executorFor ───────────────────────────────────────────────────────────────

describe('executorFor', () => {
  test('market-pricing maps to the commercial executor', () => {
    const executor = executorFor('market-pricing');
    expect(executor).not.toBeNull();
    expect(executor.id).toBe('commercial');
  });

  test('fda-foodsafety maps to the food-safety executor', () => {
    const executor = executorFor('fda-foodsafety');
    expect(executor).not.toBeNull();
    expect(executor.id).toBe('food-safety');
  });

  test('data.gov maps to the government executor', () => {
    const executor = executorFor('data.gov');
    expect(executor).not.toBeNull();
    expect(executor.id).toBe('government');
  });

  test('noaa maps to the government executor', () => {
    const executor = executorFor('noaa');
    expect(executor).not.toBeNull();
    expect(executor.id).toBe('government');
  });

  test('scholar maps to the academic executor', () => {
    const executor = executorFor('scholar');
    expect(executor).not.toBeNull();
    expect(executor.id).toBe('academic');
  });

  test('internal-validation maps to the internal executor', () => {
    const executor = executorFor('internal-validation');
    expect(executor).not.toBeNull();
    expect(executor.id).toBe('internal');
  });

  test('community-forums maps to the community executor', () => {
    const executor = executorFor('community-forums');
    expect(executor).not.toBeNull();
    expect(executor.id).toBe('community');
  });

  test('returns null for a nonexistent provider', () => {
    expect(executorFor('nonexistent')).toBeNull();
  });

  test('restaurant-depot maps to the commercial executor', () => {
    const executor = executorFor('restaurant-depot');
    expect(executor).not.toBeNull();
    expect(executor.id).toBe('commercial');
  });

  test('hospitality-assoc maps to the industry executor', () => {
    const executor = executorFor('hospitality-assoc');
    expect(executor).not.toBeNull();
    expect(executor.id).toBe('industry');
  });
});
