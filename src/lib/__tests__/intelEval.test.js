// INTEL-QA-1 Stage 1 — evaluation capture (pure, append-only, immutable history). Capture ONLY;
// nothing here scores, calibrates, or predicts. Covers creation/duplicates/immutability/snapshot/
// baseline/accepted/reverted/overridden/missing-actual/multi-reader/malformed/version.
import {
  createEvaluation, appendLifecycle, recordDecision, attachActual,
  upsertEvaluation, updateEvaluation, hasEvaluation, evaluationStats, evalId,
  EVAL_VERSION, LIFECYCLE_STATES, DECISION_COST,
} from '../intelEval';

const AT = '2026-07-01T10:00:00.000Z';
const mkRec = (over = {}) => createEvaluation({
  eventId: 'cf1', readerId: 'R1', at: AT,
  recommendation: { from: 40, to: 34, ratio: 0.85, because: 'size for 34?', confidence: 'Medium', stability: 'High', gate: { eligible: true, reason: '3 recent events', observations: 3, required: 3 }, applied: true },
  baseline: { value: 40, source: 'playbook' },
  counterfactual: { default: 40, reader: 34, host: 34 },
  metadata: { readerVersion: 1, layer: 'host', domain: 'attendance', source: 'attendance-memory', decisionCost: DECISION_COST.HIGH },
  ...over,
});

describe('createEvaluation — snapshot integrity', () => {
  test('produces the canonical shape with frozen snapshot + reserved empties', () => {
    const r = mkRec();
    expect(r.id).toBe('R1:cf1');
    expect(r.version).toBe(EVAL_VERSION);
    expect(r.recommendation).toMatchObject({ from: 40, to: 34, because: 'size for 34?', confidence: 'Medium', applied: true });
    expect(r.baseline).toEqual({ value: 40, source: 'playbook' });
    expect(r.counterfactual).toEqual({ default: 40, reader: 34, host: 34, actual: null });
    expect(r.metadata.decisionCost).toBe('high');
    expect(r.lifecycle).toEqual([{ state: 'created', at: AT }]);
    expect(r.actual).toBeNull();
    expect(r.evaluation).toEqual({ status: 'pending', baselineBetter: null, delta: null, notes: null, grade: null });
    expect(r.utility).toEqual({ unexpected: null, useful: null, savedTime: null, reducedStress: null, avoidedCost: null, avoidedProblem: null });
  });
  test('snapshot is a COPY — mutating the source object does not change the record', () => {
    const src = { from: 40, to: 34 };
    const r = createEvaluation({ eventId: 'e', readerId: 'R1', at: AT, recommendation: src, baseline: { value: 40 } });
    src.to = 99;
    expect(r.recommendation.to).toBe(34); // frozen at creation
  });
  test('baseline is stored SEPARATELY from the reader recommendation', () => {
    const r = mkRec();
    expect(r.baseline.value).toBe(40);        // the default
    expect(r.recommendation.to).toBe(34);     // the suggestion — both preserved
    expect(r.counterfactual.default).toBe(40);
    expect(r.counterfactual.reader).toBe(34);
  });
});

describe('lifecycle — append-only, idempotent, immutable', () => {
  test('appendLifecycle returns a NEW record and does not mutate the input', () => {
    const r = mkRec();
    const r2 = appendLifecycle(r, 'accepted', AT);
    expect(r2).not.toBe(r);
    expect(r.lifecycle).toHaveLength(1);      // input untouched
    expect(r2.lifecycle.map((h) => h.state)).toEqual(['created', 'accepted']);
  });
  test('idempotent per state — appending the same state twice records it once', () => {
    let r = appendLifecycle(mkRec(), 'reverted', AT);
    r = appendLifecycle(r, 'reverted', '2026-07-02');
    expect(r.lifecycle.filter((h) => h.state === 'reverted')).toHaveLength(1);
  });
  test('ACCEPTED / REVERTED / OVERRIDDEN transitions', () => {
    expect(appendLifecycle(mkRec(), 'accepted').lifecycle.some((h) => h.state === 'accepted')).toBe(true);
    const rev = recordDecision(appendLifecycle(mkRec(), 'reverted'), 40);
    expect(rev.counterfactual.host).toBe(40);  // reverted ⇒ default in effect
    const ovr = recordDecision(appendLifecycle(mkRec(), 'overridden'), 28);
    expect(ovr.counterfactual.host).toBe(28);  // host typed their own
  });
  test('unknown lifecycle state is a no-op (never throws, never records)', () => {
    const r = appendLifecycle(mkRec(), 'bogus', AT);
    expect(r.lifecycle.map((h) => h.state)).toEqual(['created']);
  });
});

describe('actual — write-once, real-only', () => {
  test('attachActual sets the observed outcome + counterfactual.actual once', () => {
    const r = attachActual(mkRec(), 36, AT);
    expect(r.actual).toEqual({ value: 36, capturedAt: AT, source: 'reconciliation' });
    expect(r.counterfactual.actual).toBe(36);
  });
  test('WRITE-ONCE — a second attach never overwrites reality', () => {
    const r1 = attachActual(mkRec(), 36, AT);
    const r2 = attachActual(r1, 99, '2026-07-09');
    expect(r2.actual.value).toBe(36);
  });
  test('MISSING actual stays unknown — null/undefined/NaN never fabricates a value', () => {
    for (const bad of [null, undefined, NaN, 'x']) {
      const r = attachActual(mkRec(), bad, AT);
      expect(r.actual).toBeNull();
      expect(r.counterfactual.actual).toBeNull();
    }
  });
});

describe('list ops — upsert idempotent, multi-reader, update-by-id', () => {
  test('DUPLICATES — upserting the same id twice does not add a second record', () => {
    let list = upsertEvaluation([], mkRec());
    const same = upsertEvaluation(list, mkRec());       // same id R1:cf1
    expect(same).toBe(list);                            // unchanged ref
    expect(same).toHaveLength(1);
  });
  test('MULTIPLE READERS on one event coexist (distinct ids)', () => {
    let list = upsertEvaluation([], mkRec());
    list = upsertEvaluation(list, mkRec({ readerId: 'R2' }));
    expect(list).toHaveLength(2);
    expect(list.map((r) => r.id).sort()).toEqual(['R1:cf1', 'R2:cf1']);
    expect(hasEvaluation(list, evalId('R2', 'cf1'))).toBe(true);
  });
  test('updateEvaluation applies a transform by id; no-op returns same ref', () => {
    const list = upsertEvaluation([], mkRec());
    const updated = updateEvaluation(list, 'R1:cf1', (r) => appendLifecycle(r, 'reverted', AT));
    expect(updated).not.toBe(list);
    expect(updated[0].lifecycle.some((h) => h.state === 'reverted')).toBe(true);
    // transform that changes nothing ⇒ same array ref (skip persist)
    expect(updateEvaluation(list, 'R1:cf1', (r) => appendLifecycle(r, 'created', AT))).toBe(list);
    expect(updateEvaluation(list, 'nope', (r) => r)).toBe(list);
  });
});

describe('malformed + version compatibility', () => {
  test('helpers never throw on malformed input', () => {
    for (const bad of [null, undefined, 'x', 42, {}]) {
      expect(() => appendLifecycle(bad, 'accepted')).not.toThrow();
      expect(() => attachActual(bad, 36)).not.toThrow();
      expect(() => recordDecision(bad, 1)).not.toThrow();
      expect(() => upsertEvaluation(bad, mkRec())).not.toThrow();
      expect(() => updateEvaluation(bad, 'x', (r) => r)).not.toThrow();
      expect(() => evaluationStats(bad)).not.toThrow();
    }
  });
  test('every record carries a version; older records without new fields still update', () => {
    const legacy = { id: 'R1:old', readerId: 'R1', eventId: 'old', lifecycle: [{ state: 'created', at: AT }] }; // no counterfactual/actual
    expect(attachActual(legacy, 30, AT).actual.value).toBe(30);
    expect(appendLifecycle(legacy, 'accepted').lifecycle).toHaveLength(2);
    expect(mkRec().version).toBe(EVAL_VERSION);
    expect(LIFECYCLE_STATES).toContain('evaluated');
  });
});

describe('evaluationStats — counts only (deliverable 9)', () => {
  test('total / pending / completed / byReader across events', () => {
    const r1 = attachActual(mkRec(), 36, AT);                 // completed
    const r2 = mkRec({ readerId: 'R2' });                     // pending
    const events = [{ id: 'cf1', intelEvaluations: [r1, r2] }, { id: 'x', intelEvaluations: [] }, { id: 'y' }];
    const s = evaluationStats(events);
    expect(s).toMatchObject({ total: 2, completed: 1, pending: 1 });
    expect(s.byReader.R1).toEqual({ total: 1, completed: 1 });
    expect(s.byReader.R2).toEqual({ total: 1, completed: 0 });
  });
  test('no events ⇒ zeroes, never throws', () => {
    expect(evaluationStats([])).toMatchObject({ total: 0, pending: 0, completed: 0 });
  });
});
