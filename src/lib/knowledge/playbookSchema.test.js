// Gap-detector coverage for the decision priority-tier fields
// (DECISION_SCHEMA_SPEC §4.A–D / §5). The detector flags, per decision: a missing
// `weight`, a missing `difmCapable`, a `when` deadline with no `timingProvenance`,
// and a money-touching decision (costFactors) with no budget-affecting `affects`.
import { FIELD_TYPES, GAP_CRITERIA, detectGapsInPlaybook } from './playbookSchema';
import crabFeast from '../playbooks/data/crabFeast';
import retirementParty from '../playbooks/data/retirementParty';

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

  test('a `when` deadline needs GROUNDED timingProvenance; no `when` at all is not flagged', () => {
    const unsourced = pbWith([{ id: 'd1', weight: 'med', difmCapable: 'needs-host', when: 'T-14d' }]);
    expect(typesFor(unsourced, 'd1')).toContain(FIELD_TYPES.TIMING_PROVENANCE);

    const noDeadline = pbWith([{ id: 'd2', weight: 'med', difmCapable: 'needs-host' }]);
    expect(typesFor(noDeadline, 'd2')).not.toContain(FIELD_TYPES.TIMING_PROVENANCE);

    // Updated 2026-07-15 (Wave-2a): the grounded bar is now real evidence, not a truthy
    // key. A hollow `{}` and a bare `{tier:'researched'}` with no sources and no basis
    // both FAIL the bar — they are now correctly FLAGGED as ungrounded.
    const hollow = pbWith([{ id: 'd3', weight: 'med', difmCapable: 'needs-host', when: 'T-14d', timingProvenance: {} }]);
    expect(typesFor(hollow, 'd3')).toContain(FIELD_TYPES.TIMING_PROVENANCE);

    const bareTier = pbWith([{ id: 'd4', weight: 'med', difmCapable: 'needs-host', when: 'T-14d', timingProvenance: { tier: 'researched' } }]);
    expect(typesFor(bareTier, 'd4')).toContain(FIELD_TYPES.TIMING_PROVENANCE);

    // A real sourced provenance (dated sources) is grounded → clean.
    const sourced = pbWith([{ id: 'd5', weight: 'med', difmCapable: 'needs-host', when: 'T-14d', timingProvenance: { tier: 'researched', sources: ['NGW vendor-lead timing survey 2026'] } }]);
    expect(typesFor(sourced, 'd5')).not.toContain(FIELD_TYPES.TIMING_PROVENANCE);

    // A tier + a written basis (no sources) also grounds — timing basis can be reasoned.
    const reasoned = pbWith([{ id: 'd6', weight: 'med', difmCapable: 'needs-host', when: 'T-14d', timingProvenance: { tier: 'reasoned', basis: 'Crab houses sell out popular sizes on a summer holiday weekend.' } }]);
    expect(typesFor(reasoned, 'd6')).not.toContain(FIELD_TYPES.TIMING_PROVENANCE);
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

  test('an AUTHORED weight with no priorityBasis.rationale is a PRIORITY_UNSOURCED gap', () => {
    // weight set, no priorityBasis → the importance axis steers the board ungrounded.
    const naked = pbWith([{ id: 'd1', label: 'Naked weight', weight: 'high', difmCapable: 'needs-host' }]);
    expect(typesFor(naked, 'd1')).toContain(FIELD_TYPES.PRIORITY_UNSOURCED);
    // It is NOT the missing-weight gap — the weight exists, it is just unsourced.
    expect(typesFor(naked, 'd1')).not.toContain(FIELD_TYPES.PRIORITY_WEIGHT);

    // reversibility / emotionalWeight alone also count as an authored priority axis.
    const revOnly = pbWith([{ id: 'd2', reversibility: 'locked', difmCapable: 'needs-host' }]);
    expect(typesFor(revOnly, 'd2')).toContain(FIELD_TYPES.PRIORITY_UNSOURCED);
  });

  test('a weight WITH a priorityBasis.rationale passes (rationale grounds an editorial axis)', () => {
    const grounded = pbWith([{ id: 'd1', weight: 'high', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'An allergy is an ER risk and must be known before ordering.', tier: 'reasoned' } }]);
    expect(typesFor(grounded, 'd1')).not.toContain(FIELD_TYPES.PRIORITY_UNSOURCED);

    // An empty priorityBasis (no rationale) does NOT ground it — still flagged.
    const empty = pbWith([{ id: 'd2', weight: 'high', difmCapable: 'needs-host', priorityBasis: {} }]);
    expect(typesFor(empty, 'd2')).toContain(FIELD_TYPES.PRIORITY_UNSOURCED);

    // No priority axis at all → nothing to ground, so not a PRIORITY_UNSOURCED gap.
    const noAxis = pbWith([{ id: 'd3', difmCapable: 'needs-host' }]);
    expect(typesFor(noAxis, 'd3')).not.toContain(FIELD_TYPES.PRIORITY_UNSOURCED);
  });

  test('every priority-bearing decision in crabFeast + retirement carries a real rationale', () => {
    [crabFeast, retirementParty].forEach((pb) => {
      pb.decisions.forEach((d) => {
        const authored = d.weight != null || d.reversibility != null || d.emotionalWeight != null;
        if (!authored) return;
        expect(typeof d.priorityBasis?.rationale).toBe('string');
        expect(d.priorityBasis.rationale.trim().length).toBeGreaterThan(0);
      });
      // ...so the detector surfaces ZERO PRIORITY_UNSOURCED gaps for these playbooks.
      const unsourced = detectGapsInPlaybook(pb).filter((g) => g.type === FIELD_TYPES.PRIORITY_UNSOURCED);
      expect(unsourced).toHaveLength(0);
    });
  });

  test('COST_FACTOR gap (the original) is preserved and still leads', () => {
    const pb = pbWith([{ id: 'd1', weight: 'high', difmCapable: 'can-derive', costFactors: { A: 1.2 }, affects: ['p_a'], costFactorProvenance: { verificationStatus: 'synthesized' } }]);
    expect(GAP_CRITERIA.COST_FACTOR.needsResearch(pb.decisions[0])).toBe(true);
    expect(typesFor(pb, 'd1')).toContain(FIELD_TYPES.COST_FACTOR);
  });
});
