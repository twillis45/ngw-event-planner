import { PIPELINE_STAGE_NAMES, runEvidencePipeline, stageSummary } from './evidencePipeline';
import { createCampaign } from './campaign';
import { buildProviders } from './providers';

const ASOF = '2026-07-03';

const campaign = createCampaign({
  goal: 'Test: Crab Feast pricing',
  assetId: 'crabFeast',
  fieldPath: 'p_crabs.unitCostRange',
  gapType: 'pricing',
  providers: ['market-pricing', 'data.gov'],
  at: ASOF,
});

const priceRecord = {
  statement: 'Market price $7.92–8.17/crab retail DMV',
  source: 'market-pricing',
  gapType: 'pricing',
  fieldPath: 'p_crabs.unitCostRange',
  at: ASOF,
  extractedFacts: [{ field: 'p_crabs.unitCostRange', value: [7.92, 8.17] }],
};

const govRecord = {
  statement: 'USDA: Blue crab $7.50–8.25/unit seasonal average',
  source: 'data.gov',
  gapType: 'pricing',
  fieldPath: 'p_crabs.unitCostRange',
  at: ASOF,
  extractedFacts: [{ field: 'p_crabs.unitCostRange', value: [7.50, 8.25] }],
};

const allRecords = { 'market-pricing': [priceRecord], 'data.gov': [govRecord] };
const providers = buildProviders();

describe('PIPELINE_STAGE_NAMES', () => {
  test('has 7 entries', () => {
    expect(PIPELINE_STAGE_NAMES).toHaveLength(7);
  });

  test('first stage is normalize', () => {
    expect(PIPELINE_STAGE_NAMES[0]).toBe('normalize');
  });

  test('last stage is kcr-draft', () => {
    expect(PIPELINE_STAGE_NAMES[6]).toBe('kcr-draft');
  });
});

describe('runEvidencePipeline — with valid records', () => {
  let output;
  beforeEach(() => {
    output = runEvidencePipeline(allRecords, {
      campaign,
      blueprint: null,
      providers,
      pb: null,
      asOf: ASOF,
    });
  });

  test('stages is array of 7', () => {
    expect(Array.isArray(output.stages)).toBe(true);
    expect(output.stages).toHaveLength(7);
  });

  test('all stages have status complete', () => {
    output.stages.forEach((stage) => {
      expect(stage.status).toBe('complete');
    });
  });

  test('result.observations > 0', () => {
    expect(output.result.observations).toBeGreaterThan(0);
  });

  test('result.evidence > 0', () => {
    expect(output.result.evidence).toBeGreaterThan(0);
  });

  test('result.finding is not null', () => {
    expect(output.result.finding).not.toBeNull();
  });

  test('finalCampaign is not null', () => {
    expect(output.finalCampaign).not.toBeNull();
  });
});

describe('runEvidencePipeline — with empty records', () => {
  let output;
  beforeEach(() => {
    output = runEvidencePipeline({}, {
      campaign,
      blueprint: null,
      providers,
      pb: null,
      asOf: ASOF,
    });
  });

  test('stages still complete (seed observation created)', () => {
    expect(Array.isArray(output.stages)).toBe(true);
    output.stages.forEach((stage) => {
      expect(stage.status).toBe('complete');
    });
  });

  test('result.kcr is null (insufficient evidence)', () => {
    expect(output.result.kcr).toBeNull();
  });
});

describe('stageSummary', () => {
  test('null → "No pipeline run"', () => {
    expect(stageSummary(null)).toBe('No pipeline run');
  });

  test('all-complete stages includes "7/7 stages complete"', () => {
    const { stages } = runEvidencePipeline(allRecords, {
      campaign,
      blueprint: null,
      providers,
      pb: null,
      asOf: ASOF,
    });
    expect(stageSummary(stages)).toContain('7/7 stages complete');
  });
});

describe('stage shape', () => {
  test('each stage has name, status, inputCount, outputCount, durationMs', () => {
    const { stages } = runEvidencePipeline(allRecords, {
      campaign,
      blueprint: null,
      providers,
      pb: null,
      asOf: ASOF,
    });
    stages.forEach((stage) => {
      expect(typeof stage.name).toBe('string');
      expect(typeof stage.status).toBe('string');
      expect(typeof stage.inputCount).toBe('number');
      expect(typeof stage.outputCount).toBe('number');
      expect(typeof stage.durationMs).toBe('number');
    });
  });
});
