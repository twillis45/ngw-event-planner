// KEP-3 Bundle A — the host runtime consumer (resolveEffectiveItem) resolving published
// knowledge. Regression: default behavior unchanged; published cost flows with provenance;
// host locks win.
import { resolveEffectiveItem } from '../effectiveItem';
import { applyOverride, clearOverrides } from './knowledgeOverride';

const asset = { type: 'Crab Feast', purchases: [{ id: 'p_crabs', unitCostRange: [2.5, 7] }] };
const item = { id: 'p_crabs', item: 'Blue crabs', low: 2.5, high: 7 };
beforeEach(() => clearOverrides());

describe('effectiveItem runtime knowledge consumption', () => {
  test('no ctx → authored/engine cost, knowledge null (backward compatible)', () => {
    const e = resolveEffectiveItem(item, {});
    expect(e.cost.low).toBe(2.5);
    expect(e.cost.high).toBe(7);
    expect(e.provenance.costFrom).toBe('engine');
    expect(e.provenance.knowledge).toBeNull();
  });

  test('ctx.asset but no published override → still authored (default preserved)', () => {
    const e = resolveEffectiveItem(item, {}, { asset });
    expect(e.cost.low).toBe(2.5);
    expect(e.provenance.costFrom).toBe('engine');
    expect(e.provenance.knowledge).toBeNull();
  });

  test('a PUBLISHED override resolves through with provenance + rollback', () => {
    applyOverride({ id: 'ovr-Crab Feast-p_crabs.unitCostRange', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [3, 8], provenance: { rationale: 'DMV market up', confidence: 'high', versionId: 'v3' } });
    const e = resolveEffectiveItem(item, {}, { asset });
    expect(e.cost.low).toBe(3);
    expect(e.cost.high).toBe(8);
    expect(e.provenance.costFrom).toBe('published');
    expect(e.provenance.knowledge.version).toBe('v3');
    expect(e.provenance.knowledge.reason).toMatch(/market up/i);
    expect(e.provenance.knowledge.rollbackAvailable).toBe(true);
    expect(e.provenance.knowledge.authoredValue).toEqual([2.5, 7]); // canonical preserved
  });

  test('host lock WINS over published knowledge', () => {
    applyOverride({ id: 'ovr-Crab Feast-p_crabs.unitCostRange', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [3, 8] });
    const locked = { ...item, locked: 5 };
    const e = resolveEffectiveItem(locked, {}, { asset });
    expect(e.cost.low).toBe(5);
    expect(e.provenance.costFrom).toBe('host');
    expect(e.provenance.knowledge).toBeNull();
  });
});
