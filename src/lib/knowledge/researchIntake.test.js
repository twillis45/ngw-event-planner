// KCR-2 — Command Center research queue → KCR intake. Proves deterministic,
// deduped, correctly-targeted KCR generation from the live research queue.
import {
  researchQueueToKCRs, researchItemsToKCRs, researchItemToKCR, researchItemToInsight,
  intakeKcrId, RESEARCH_KIND_MAP,
} from './researchIntake';

const ASOF = '2026-07-02';

describe('live research queue → KCRs', () => {
  const kcrs = researchQueueToKCRs(ASOF);
  test('generates KCRs from the real Command Center queue', () => {
    expect(kcrs.length).toBeGreaterThan(0);
    expect(kcrs.every((k) => k.assetId && k.fieldPath && k.type && k.trigger)).toBe(true);
    expect(kcrs.every((k) => k.createdBy === 'command-center')).toBe(true);
  });
  test('deterministic — same asOf yields identical KCR ids', () => {
    const again = researchQueueToKCRs(ASOF);
    expect(again.map((k) => k.id)).toEqual(kcrs.map((k) => k.id));
  });
  test('all ids are unique (no duplicate KCRs across the corpus)', () => {
    const ids = kcrs.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('pricing gap', () => {
  test('a pricing research item → citation KCR targeting priced items, trigger research', () => {
    const k = researchItemToKCR({ kind: 'pricing', priority: 'high', reason: '18 priced synthesized', type: 'Crab Feast' }, ASOF);
    expect(k.type).toBe('citation');
    expect(k.trigger).toBe('research');
    expect(k.fieldPath).toBe('purchases[].unitCostRange');
    expect(k.assetId).toBe('Crab Feast');
    expect(k.priority).toBe('high');
  });
});

describe('source gap', () => {
  test('a sources research item → missing-evidence KCR on knowledge.sources', () => {
    const k = researchItemToKCR({ kind: 'sources', priority: 'low', reason: 'populate sources', type: 'Crab Feast' }, ASOF);
    expect(k.type).toBe('missing-evidence');
    expect(k.fieldPath).toBe('knowledge.sources');
    expect(k.trigger).toBe('research');
  });
});

describe('cadence gap', () => {
  test('a cadence research item → correction KCR on governance, trigger freshness', () => {
    const k = researchItemToKCR({ kind: 'cadence', priority: 'med', reason: 'set a review cadence', type: 'Crab Feast' }, ASOF);
    expect(k.type).toBe('correction');
    expect(k.fieldPath).toBe('governance');
    expect(k.trigger).toBe('freshness');
  });
});

describe('duplicate prevention', () => {
  test('two identical research items collapse to ONE KCR', () => {
    const item = { kind: 'pricing', priority: 'high', reason: 'dup', type: 'Crab Feast' };
    const out = researchItemsToKCRs([item, { ...item }], ASOF);
    expect(out.length).toBe(1);
  });
  test('same asset, different kinds → distinct KCRs (not deduped away)', () => {
    const out = researchItemsToKCRs([
      { kind: 'pricing', priority: 'high', reason: 'a', type: 'Crab Feast' },
      { kind: 'sources', priority: 'low', reason: 'b', type: 'Crab Feast' },
    ], ASOF);
    expect(out.length).toBe(2);
    expect(new Set(out.map((k) => k.id)).size).toBe(2);
  });
  test('dedupe id is stable + independent of session ordering', () => {
    expect(intakeKcrId('Crab Feast', 'pricing')).toBe(intakeKcrId('Crab Feast', 'pricing'));
    expect(intakeKcrId('Crab Feast', 'pricing')).not.toBe(intakeKcrId('Crab Feast', 'sources'));
  });
});

describe('malformed asset', () => {
  test('an item with no asset type → skipped (null), no throw', () => {
    expect(researchItemToKCR({ kind: 'pricing', reason: 'x' }, ASOF)).toBeNull();
    expect(researchItemToInsight({ kind: 'pricing' })).toBeNull();
  });
  test('an item whose asset resolves to no playbook → skipped, no throw', () => {
    expect(researchItemToKCR({ kind: 'pricing', type: 'Not A Real Event Type ZZZ', reason: 'x' }, ASOF)).toBeNull();
  });
  test('an unknown research kind → skipped (do not guess a mapping)', () => {
    expect(researchItemToKCR({ kind: 'wat', type: 'Crab Feast', reason: 'x' }, ASOF)).toBeNull();
  });
  test('a whole list with malformed entries yields only the valid KCRs', () => {
    const out = researchItemsToKCRs([
      { kind: 'pricing', type: 'Crab Feast', reason: 'ok' },
      { kind: 'pricing', reason: 'no asset' },
      { kind: 'wat', type: 'Crab Feast' },
      null,
    ], ASOF);
    expect(out.length).toBe(1);
  });
});

describe('impact preview derives from registry/dependency data', () => {
  test('a pricing KCR carries a derived impact (engines + downstream + purchases)', () => {
    const k = researchItemToKCR({ kind: 'pricing', priority: 'high', reason: 'x', type: 'Crab Feast' }, ASOF);
    expect(k.impact.recommendationEngines).toEqual(expect.arrayContaining(['budget', 'shopping']));
    expect(k.impact.downstream).toEqual(expect.arrayContaining(['sourcing']));
    expect(k.impact.affectedPurchases).toContain('p_crabs');
    expect(k.impact.tests.known).toBe(false); // honest-empty, not fabricated
  });
  test('the mapping table covers exactly the Command Center research kinds', () => {
    expect(Object.keys(RESEARCH_KIND_MAP).sort()).toEqual(['cadence', 'food-safety', 'pricing', 'review', 'sources']);
  });
});
