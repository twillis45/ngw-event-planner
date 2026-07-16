// Gap-detector coverage for the decision priority-tier fields
// (DECISION_SCHEMA_SPEC §4.A–D / §5). The detector flags, per decision: a missing
// `weight`, a missing `difmCapable`, a `when` deadline with no `timingProvenance`,
// and a money-touching decision (costFactors) with no budget-affecting `affects`.
import { FIELD_TYPES, GAP_CRITERIA, detectGapsInPlaybook } from './playbookSchema';

const pbWith = (decisions) => ({ type: 'Test PB', decisions });
const typesFor = (pb, id) => detectGapsInPlaybook(pb).filter((g) => g.id === id).map((g) => g.type);

describe('detectGapsInPlaybook — priority-tier gap types', () => {
  test('a decision with NO weight is flagged; one WITH weight is not', () => {
    const noWeight = pbWith([{ id: 'd1', label: 'No weight', when: 'T-7d', timingProvenance: {}, difmCapable: 'can-derive' }]);
    expect(typesFor(noWeight, 'd1')).toContain(FIELD_TYPES.PRIORITY_WEIGHT);

    const hasWeight = pbWith([{ id: 'd2', label: 'Has weight', weight: 'high', when: 'T-7d', timingProvenance: {}, difmCapable: 'can-derive' }]);
    expect(typesFor(hasWeight, 'd2')).not.toContain(FIELD_TYPES.PRIORITY_WEIGHT);
  });

  test('a decision with NO difmCapable is flagged; one WITH it is not', () => {
    const noDifm = pbWith([{ id: 'd1', weight: 'med', when: 'T-7d', timingProvenance: {} }]);
    expect(typesFor(noDifm, 'd1')).toContain(FIELD_TYPES.DIFM_CAPABILITY);

    const hasDifm = pbWith([{ id: 'd2', weight: 'med', when: 'T-7d', timingProvenance: {}, difmCapable: 'needs-host' }]);
    expect(typesFor(hasDifm, 'd2')).not.toContain(FIELD_TYPES.DIFM_CAPABILITY);
  });

  test('a `when` deadline with no timingProvenance is flagged; no `when` at all is not', () => {
    const unsourced = pbWith([{ id: 'd1', weight: 'med', difmCapable: 'needs-host', when: 'T-14d' }]);
    expect(typesFor(unsourced, 'd1')).toContain(FIELD_TYPES.TIMING_PROVENANCE);

    const noDeadline = pbWith([{ id: 'd2', weight: 'med', difmCapable: 'needs-host' }]);
    expect(typesFor(noDeadline, 'd2')).not.toContain(FIELD_TYPES.TIMING_PROVENANCE);

    const sourced = pbWith([{ id: 'd3', weight: 'med', difmCapable: 'needs-host', when: 'T-14d', timingProvenance: { tier: 'researched' } }]);
    expect(typesFor(sourced, 'd3')).not.toContain(FIELD_TYPES.TIMING_PROVENANCE);
  });

  test('costFactors with no affects[] is a budget-linkage gap; with affects[] it is not', () => {
    const unlinked = pbWith([{ id: 'd1', weight: 'high', difmCapable: 'can-derive', costFactors: { A: 1.2 } }]);
    expect(typesFor(unlinked, 'd1')).toContain(FIELD_TYPES.BUDGET_LINKAGE);

    const linked = pbWith([{ id: 'd2', weight: 'high', difmCapable: 'can-derive', costFactors: { A: 1.2 }, affects: ['p_a'] }]);
    expect(typesFor(linked, 'd2')).not.toContain(FIELD_TYPES.BUDGET_LINKAGE);

    // A decision with no costFactors at all has nothing to link — not a budget gap.
    const noMoney = pbWith([{ id: 'd3', weight: 'high', difmCapable: 'can-derive' }]);
    expect(typesFor(noMoney, 'd3')).not.toContain(FIELD_TYPES.BUDGET_LINKAGE);
  });

  test('one decision can surface MULTIPLE typed gaps, each keyed by its own fieldPath', () => {
    const bare = pbWith([{ id: 'd1', label: 'Bare', when: 'T-7d', costFactors: { A: 1.1 } }]);
    const gaps = detectGapsInPlaybook(bare).filter((g) => g.id === 'd1');
    const types = gaps.map((g) => g.type);
    expect(types).toEqual(expect.arrayContaining([
      FIELD_TYPES.PRIORITY_WEIGHT,
      FIELD_TYPES.DIFM_CAPABILITY,
      FIELD_TYPES.TIMING_PROVENANCE,
      FIELD_TYPES.BUDGET_LINKAGE,
    ]));
    // Distinct fieldPaths so downstream fieldPath-indexed consumers never collide.
    const paths = gaps.map((g) => g.fieldPath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test('COST_FACTOR gap (the original) is preserved and still leads', () => {
    const pb = pbWith([{ id: 'd1', weight: 'high', difmCapable: 'can-derive', costFactors: { A: 1.2 }, affects: ['p_a'], costFactorProvenance: { verificationStatus: 'synthesized' } }]);
    expect(GAP_CRITERIA.COST_FACTOR.needsResearch(pb.decisions[0])).toBe(true);
    expect(typesFor(pb, 'd1')).toContain(FIELD_TYPES.COST_FACTOR);
  });
});
