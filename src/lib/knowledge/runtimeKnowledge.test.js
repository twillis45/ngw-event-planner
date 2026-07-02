// KEP-3 Bundle A — runtime reader seam regression tests. The load-bearing guarantee:
// with NO published override, resolveField returns exactly the authored value (existing
// behavior is the default), and every resolved value carries governance context.
import { resolveField, explainField, fieldValue } from './runtimeKnowledge';
import { applyOverride, clearOverrides } from './knowledgeOverride';
import { getPlaybook } from '../playbooks/index';

const crab = getPlaybook('Crab Feast');
const FIELD = 'p_crabs.unitCostRange';
beforeEach(() => clearOverrides());

describe('runtime reader seam — backward compatible by default (rule 5)', () => {
  test('no override → authored value, source authored, rollback unavailable', () => {
    const r = resolveField(crab, FIELD);
    expect(r.source).toBe('authored');
    expect(r.rollbackAvailable).toBe(false);
    expect(r.reason).toMatch(/authored/i);
    expect(fieldValue(crab, FIELD)).toEqual(r.value);      // convenience matches
    expect(explainField(r)).toBe('Authored');
  });
  test('every resolved value exposes provenance/version/reason/rollback (rule 4)', () => {
    const r = resolveField(crab, FIELD);
    for (const key of ['value', 'source', 'version', 'reason', 'confidence', 'validationState', 'rollbackAvailable', 'trace']) {
      expect(key in r).toBe(true);
    }
  });
  test('a published override resolves through, is explainable + reversible (rule 3)', () => {
    applyOverride({ id: 'ovr-Crab Feast-p_crabs.unitCostRange', assetId: 'Crab Feast', fieldPath: FIELD, value: [3, 8], provenance: { rationale: 'DMV market up', confidence: 'high', versionId: 'v3' } });
    const r = resolveField(crab, FIELD);
    expect(r.value).toEqual([3, 8]);
    expect(r.source).toBe('override');
    expect(r.rollbackAvailable).toBe(true);                 // reversible
    expect(r.authoredValue).not.toEqual([3, 8]);            // canonical preserved underneath
    expect(r.reason).toMatch(/market up/i);
    expect(explainField(r)).toMatch(/Published/);
  });
});
