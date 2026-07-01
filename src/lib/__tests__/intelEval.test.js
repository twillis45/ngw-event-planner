// INTEL-QA-1 Stage 1 — evaluation capture (pure, append-only, immutable history). Capture ONLY;
// nothing here scores, calibrates, or predicts. Covers creation/duplicates/immutability/snapshot/
// baseline/accepted/reverted/overridden/missing-actual/multi-reader/malformed/version.
import {
  createEvaluation, appendLifecycle, recordDecision, attachActual,
  upsertEvaluation, updateEvaluation, hasEvaluation, evaluationStats, evalId,
  EVAL_VERSION, LIFECYCLE_STATES, DECISION_COST,
  validateEvaluation, evaluationAudit,
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

describe('Stage 1A — validateEvaluation (integrity)', () => {
  const clean = () => attachActual(appendLifecycle(appendLifecycle(mkRec(), 'presented'), 'accepted'), 36, AT);
  test('clean record ⇒ no issues', () => {
    expect(validateEvaluation(clean())).toEqual([]);
  });
  test('non-object / missing id ⇒ malformed', () => {
    expect(validateEvaluation(null)[0].code).toBe('malformed');
    expect(validateEvaluation({ recommendation: {}, baseline: { value: 1 }, version: EVAL_VERSION }).some((i) => i.code === 'malformed')).toBe(true);
  });
  test('missing baseline / snapshot / version flagged', () => {
    const codes = (r) => validateEvaluation(r).map((i) => i.code);
    expect(codes({ id: 'x', version: EVAL_VERSION, recommendation: { from: 1 }, lifecycle: [] })).toContain('missing_baseline');
    expect(codes({ id: 'x', version: EVAL_VERSION, baseline: { value: 1 }, lifecycle: [] })).toContain('missing_snapshot');
    expect(codes({ id: 'x', recommendation: {}, baseline: { value: 1 }, lifecycle: [] })).toContain('version_unknown');
  });
  test('lifecycle out of order flagged', () => {
    const r = { ...mkRec(), lifecycle: [{ state: 'accepted' }, { state: 'created' }] };
    expect(validateEvaluation(r).some((i) => i.code === 'lifecycle_order')).toBe(true);
  });
  test('malformed actual flagged; accepted+eventPassed+no-actual flagged', () => {
    expect(validateEvaluation({ ...mkRec(), actual: { note: 'x' } }).some((i) => i.code === 'actual_malformed')).toBe(true);
    const acc = appendLifecycle(mkRec(), 'accepted');
    expect(validateEvaluation(acc, { eventPassed: true }).some((i) => i.code === 'missing_actual')).toBe(true);
    expect(validateEvaluation(acc, { eventPassed: false }).some((i) => i.code === 'missing_actual')).toBe(false); // pending, not a gap
  });
});

describe('Stage 1A — evaluationAudit (admin dataset)', () => {
  const rec = (over = {}) => ({ ...mkRec(over), lifecycle: [{ state: 'created', at: AT }, { state: 'presented', at: AT }, { state: 'accepted', at: AT }] });
  test('EMPTY / malformed book ⇒ zeroes, never throws', () => {
    for (const bad of [null, undefined, 'x', [], [null, 'y']]) {
      expect(() => evaluationAudit(bad)).not.toThrow();
      expect(evaluationAudit(bad).totals.records).toBe(0);
    }
  });
  test('KPIs + funnel + records over a populated book', () => {
    const done = attachActual(rec(), 36, AT);
    const pending = rec({ readerId: 'R2' });
    const events = [
      { id: 'cf1', type: 'Crab Feast', date: '2026-06-01', intelEvaluations: [done, pending] },
      { id: 'x2', type: 'Cookout', intelEvaluations: [] },
      { id: 'x3' },
    ];
    const a = evaluationAudit(events, '2026-07-01');
    expect(a.scannedEvents).toBe(3);
    expect(a.eventsWithEvaluations).toBe(1);
    expect(a.totals).toMatchObject({ records: 2, shown: 2, accepted: 2, actualsAttached: 1, evaluationReady: 1, malformed: 0, duplicateWarnings: 0 });
    expect(a.funnel.find((f) => f.stage === 'eligible').available).toBe(false); // honest: unavailable
    expect(a.funnel.find((f) => f.stage === 'evaluation ready').value).toBe(1);
    expect(a.records).toHaveLength(2);
    expect(a.records[0]).toMatchObject({ eventLabel: 'Crab Feast · cf1', decision: 'Accepted', actualAttached: true, evaluationReady: true, baselinePresent: true });
  });
  test('DUPLICATE ids in one event ⇒ duplicateWarnings + integrity error', () => {
    const r = rec();
    const a = evaluationAudit([{ id: 'cf1', intelEvaluations: [r, r] }]);
    expect(a.totals.duplicateWarnings).toBe(1);
    expect(a.integrity.some((i) => i.code === 'duplicate_id')).toBe(true);
  });
  test('MALFORMED record ⇒ counted + integrity, does not crash the scan', () => {
    const a = evaluationAudit([{ id: 'cf1', intelEvaluations: [null, 'garbage', rec()] }]);
    expect(a.totals.malformed).toBe(2);
    expect(a.totals.records).toBe(3);
    expect(a.integrity.some((i) => i.code === 'malformed')).toBe(true);
  });
  test('missing-actual gap only for a passed event', () => {
    const acc = appendLifecycle(mkRec(), 'accepted'); // accepted, no actual
    const passed = evaluationAudit([{ id: 'cf1', date: '2026-06-01', intelEvaluations: [acc] }], '2026-07-01');
    expect(passed.integrity.some((i) => i.code === 'missing_actual')).toBe(true);
    const upcoming = evaluationAudit([{ id: 'cf1', date: '2026-12-01', intelEvaluations: [acc] }], '2026-07-01');
    expect(upcoming.integrity.some((i) => i.code === 'missing_actual')).toBe(false);
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
