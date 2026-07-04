// ─── Research Blueprint Engine tests (RBE-1) ─────────────────────────────────
import { generateResearchBlueprint, blueprintToGoal, blueprintStatusLabel, EVIDENCE_REQUIREMENTS, KIND_TO_WORKERS } from './researchBlueprint';

const ASOF = '2026-07-03';

// Canonical fixture — crab feast pricing gap (matches the acceptance criteria in the brief)
const CRAB_PRICING_GAP = {
  priority:      'HIGH',
  playbookType:  'crabFeast',
  playbookLabel: 'Crab Feast',
  fieldPath:     'p_crabs.unitCostRange',
  fieldLabel:    'Crabs — unit cost range',
  gapKind:       'pricing',
  reason:        'No evidence — field is completely ungrounded',
  evidenceCount: 0,
  hasCampaign:   false,
  claim:         'Larges cost $7.92–8.17/crab at retail in the DMV',
  sufficientWhen:'≥2 retail sources agree within 15%',
  sourceHint:    null,
};

const CRAB_COSTFACTOR_GAP = {
  priority:      'HIGH',
  playbookType:  'crabFeast',
  playbookLabel: 'Crab Feast',
  fieldPath:     'decisions[steam_vs_order].costFactors',
  fieldLabel:    'Steam vs. order — cost multipliers',
  gapKind:       'cost-factor',
  reason:        'No evidence — field is completely ungrounded',
  evidenceCount: 0,
  hasCampaign:   false,
  claim:         'DIY steaming saves ~15% vs crab-house pickup after propane and pot cost',
  sufficientWhen:'≥2 crab-house vs live-buy price quotes in the DMV market agree within 15%',
  sourceHint:    null,
};

// ── generateResearchBlueprint ─────────────────────────────────────────────────

describe('generateResearchBlueprint', () => {
  test('returns null for null input', () => {
    expect(generateResearchBlueprint(null)).toBeNull();
    expect(generateResearchBlueprint(undefined)).toBeNull();
  });

  test('pricing gap — correct knowledgeType + researchIntent', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    expect(bp.knowledgeType).toBe('pricing');
    expect(bp.researchIntent).toBe('cost-verification');
  });

  test('cost-factor gap — correct knowledgeType + researchIntent', () => {
    const bp = generateResearchBlueprint(CRAB_COSTFACTOR_GAP, { asOf: ASOF });
    expect(bp.knowledgeType).toBe('cost-factor');
    expect(bp.researchIntent).toBe('cost-verification');
  });

  test('claim and successCriteria pass through from gap provenance', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    expect(bp.claim).toBe('Larges cost $7.92–8.17/crab at retail in the DMV');
    expect(bp.successCriteria).toBe('≥2 retail sources agree within 15%');
  });

  test('assetId resolves from gap.playbookType', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    expect(bp.assetId).toBe('crabFeast');
    expect(bp.fieldPath).toBe('p_crabs.unitCostRange');
  });

  test('requiredEvidence is non-empty for every gap kind', () => {
    const kinds = Object.keys(EVIDENCE_REQUIREMENTS);
    for (const kind of kinds) {
      const gap = { ...CRAB_PRICING_GAP, gapKind: kind };
      const bp = generateResearchBlueprint(gap, { asOf: ASOF });
      expect(bp.requiredEvidence.length).toBeGreaterThan(0);
    }
  });

  test('recommendedProviders are individual provider IDs, not group IDs', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    const GROUP_IDS = ['commercial', 'government', 'industry', 'academic', 'community', 'food-safety', 'internal'];
    for (const pid of bp.recommendedProviders) {
      expect(GROUP_IDS).not.toContain(pid);
    }
  });

  test('pricing gap recommendedProviders contain at least one commercial provider', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    const COMMERCIAL = ['market-pricing', 'retail', 'restaurant-depot'];
    const hasCommercial = bp.recommendedProviders.some((p) => COMMERCIAL.includes(p));
    expect(hasCommercial).toBe(true);
  });

  test('safety gap — authority minimum is primary', () => {
    const safetyGap = { ...CRAB_PRICING_GAP, gapKind: 'safety', fieldPath: 'risks' };
    const bp = generateResearchBlueprint(safetyGap, { asOf: ASOF });
    expect(bp.authorityRequirements.minimum).toBe('primary');
  });

  test('safety gap — corroboration is required', () => {
    const safetyGap = { ...CRAB_PRICING_GAP, gapKind: 'safety', fieldPath: 'risks' };
    const bp = generateResearchBlueprint(safetyGap, { asOf: ASOF });
    expect(bp.corroborationRequirements.required).toBe(true);
    expect(bp.corroborationRequirements.targets.length).toBeGreaterThan(0);
  });

  test('pricing gap — authority minimum is trade', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    expect(bp.authorityRequirements.minimum).toBe('trade');
  });

  test('workerAssignments is non-empty', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    expect(bp.workerAssignments.length).toBeGreaterThan(0);
    expect(typeof bp.workerAssignments[0]).toBe('string');
  });

  test('campaignTemplate matches the gap kind', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    expect(bp.campaignTemplate).not.toBeNull();
    expect(bp.campaignTemplate.gapTypes).toContain('pricing');
  });

  test('cost-factor gap — campaignTemplate is cost-factor-grounding', () => {
    const bp = generateResearchBlueprint(CRAB_COSTFACTOR_GAP, { asOf: ASOF });
    expect(bp.campaignTemplate?.id).toBe('cost-factor-grounding');
  });

  test('expectedOutputs always contains evidence + finding + kcr-draft', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    expect(bp.expectedOutputs).toContain('evidence');
    expect(bp.expectedOutputs).toContain('finding');
    expect(bp.expectedOutputs).toContain('kcr-draft');
  });

  test('providerRanking is empty when no intel exists', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { providerIntel: {}, asOf: ASOF });
    expect(bp.providerRanking).toEqual([]);
  });

  test('sourceHint is prepended to providers when specified', () => {
    const gap = { ...CRAB_PRICING_GAP, sourceHint: 'wholesale' };
    const bp = generateResearchBlueprint(gap, { asOf: ASOF });
    expect(bp.recommendedProviders[0]).toBe('wholesale');
  });

  test('generatedAt is set when asOf is passed', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    expect(bp.generatedAt).toBe(ASOF);
  });
});

// ── blueprintToGoal ───────────────────────────────────────────────────────────

describe('blueprintToGoal', () => {
  test('returns fallback for null blueprint', () => {
    expect(blueprintToGoal(null, { reason: 'No evidence' })).toBe('No evidence');
  });

  test('includes claim and successCriteria when present', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    const goal = blueprintToGoal(bp, { fieldLabel: 'Crabs — unit cost', playbookLabel: 'Crab Feast', reason: 'No evidence' });
    expect(goal).toContain('Claim:');
    expect(goal).toContain('Sufficient when:');
    expect(goal).toContain('Larges cost');
  });

  test('omits claim/sufficient sections when not present', () => {
    const bp = generateResearchBlueprint({ ...CRAB_PRICING_GAP, claim: null, sufficientWhen: null }, { asOf: ASOF });
    const goal = blueprintToGoal(bp, { fieldLabel: 'x', playbookLabel: 'y', reason: 'r' });
    expect(goal).not.toContain('Claim:');
    expect(goal).not.toContain('Sufficient when:');
  });
});

// ── blueprintStatusLabel ──────────────────────────────────────────────────────

describe('blueprintStatusLabel', () => {
  test('returns null for null blueprint', () => {
    expect(blueprintStatusLabel(null)).toBeNull();
  });

  test('no evidence → "No evidence"', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    expect(blueprintStatusLabel(bp, { evidenceCount: 0 })).toBe('No evidence');
  });

  test('evidence meets minimum → "Evidence sufficient"', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    expect(blueprintStatusLabel(bp, { evidenceCount: 2 })).toBe('Evidence sufficient');
  });

  test('partial evidence → count/min format', () => {
    const bp = generateResearchBlueprint(CRAB_PRICING_GAP, { asOf: ASOF });
    expect(blueprintStatusLabel(bp, { evidenceCount: 1 })).toMatch(/1\/2/);
  });
});

// ── KIND_TO_WORKERS ───────────────────────────────────────────────────────────

describe('KIND_TO_WORKERS', () => {
  test('all entries are arrays of strings', () => {
    for (const [, workers] of Object.entries(KIND_TO_WORKERS)) {
      expect(Array.isArray(workers)).toBe(true);
      expect(workers.length).toBeGreaterThan(0);
    }
  });
});
