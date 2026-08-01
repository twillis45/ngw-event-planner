// ─── TRUST INTEGRITY CHECKS — report-only harness (Phase 5C.1) ───────────────
//
// This suite DELIBERATELY asserts nothing about finding counts. Phase 5C.1's
// instruction was "do not fail CI yet — report only", and there is a reason
// beyond caution: checks 3 and 4 flag nearly every claim in the corpus on their
// first run. Wired to a gate on day one, they would turn the build red and be
// disabled within a week, which is how an integrity check dies.
//
// So this prints a summary and passes. Turning any check into a gate is a Phase
// 5C.2 decision, taken once the numbers have been read. The pure functions live
// in trustIntegrityChecks.js so that promotion needs no rewrite — only a new
// assertion here.
//
// Set TRUST_CHECK_DETAIL=1 for the per-finding dump.
import { ALL_PLAYBOOKS } from '../playbooks/index';
import { runTrustIntegrityChecks, PROPOSED_SOURCE_COVERAGE } from './trustIntegrityChecks';

const DETAIL = process.env.TRUST_CHECK_DETAIL === '1';

describe('trust integrity checks (report only — never fails on findings)', () => {
  const r = runTrustIntegrityChecks(ALL_PLAYBOOKS, PROPOSED_SOURCE_COVERAGE);

  test('report', () => {
    const lines = [];
    lines.push('');
    lines.push('=== TRUST INTEGRITY REPORT ===================================');
    lines.push(`  1 same source, same relationship, unexplained values : ${r.check1.length}`);
    lines.push(`  2 source claim-type mismatch                         : ${r.check2.length}`);
    lines.push(`  3 researched claim with no derivation recorded       : ${r.check3.length}`);
    lines.push(`  4 researched claim with no sufficiency verdict       : ${r.check4.length}`);
    lines.push('--------------------------------------------------------------');

    for (const f of r.check1) {
      lines.push(`  [1] ${f.key}`);
      lines.push(`      ${f.members.length} claims, ${f.distinctValues.length} distinct values ` +
                 `(${f.distinctValues.join(' / ')}), spread ${f.spread}x`);
      if (DETAIL) for (const m of f.members) lines.push(`         ${String(m.value).padEnd(6)} ${m.where}`);
    }
    for (const f of r.check2) lines.push(`  [2] ${f.where} cites ${f.source} for a '${f.domain}' claim`);
    if (DETAIL) {
      for (const f of r.check3) lines.push(`  [3] ${f.where} (${f.kind})`);
      for (const f of r.check4) lines.push(`  [4] ${f.where} — ${f.outcome}`);
    } else {
      lines.push(`  [3] ${r.check3.length} claims — set TRUST_CHECK_DETAIL=1 to list`);
      lines.push(`  [4] ${r.check4.length} claims — set TRUST_CHECK_DETAIL=1 to list`);
    }
    lines.push('==============================================================');
    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));

    // The only assertions: the checks RAN and returned arrays. Never counts.
    expect(Array.isArray(r.check1)).toBe(true);
    expect(Array.isArray(r.check2)).toBe(true);
    expect(Array.isArray(r.check3)).toBe(true);
    expect(Array.isArray(r.check4)).toBe(true);
  });

  // Behaviour of the checks themselves IS asserted — a check that silently stops
  // working is worse than no check, and these fixtures are independent of corpus
  // content so they cannot drift as playbooks change.
  test('check 1 treats a recorded varianceReason as justified, not a finding', () => {
    const mk = (type, v, reason) => ({
      type, decisions: [{
        id: 'd', costFactors: { Potluck: v },
        costFactorProvenance: { tier: 'researched', sources: ['s1'], varianceReason: reason },
      }],
    });
    expect(runTrustIntegrityChecks([mk('A', 0.5), mk('B', 0.9)]).check1).toHaveLength(1);
    expect(runTrustIntegrityChecks([mk('A', 0.5, 'shorter event'), mk('B', 0.9, 'longer event')]).check1)
      .toHaveLength(0);
    expect(runTrustIntegrityChecks([mk('A', 0.5), mk('B', 0.5)]).check1).toHaveLength(0);
  });

  test('check 2 fires only when the source declares the domain excluded', () => {
    const pb = (src) => ({
      type: 'X', decisions: [{
        id: 'menu', costFactors: { a: 1 },
        costFactorProvenance: { tier: 'researched', sources: [src], claim: 'mixed grill + seafood adds 25%' },
      }],
    });
    expect(runTrustIntegrityChecks([pb('usda-meat-2026')], PROPOSED_SOURCE_COVERAGE).check2).toHaveLength(1);
    expect(runTrustIntegrityChecks([pb('dmv-crab-2026')], PROPOSED_SOURCE_COVERAGE).check2).toHaveLength(0);
  });

  test('check 3 clears a claim that records its method', () => {
    const mk = (note) => ({
      type: 'X', decisions: [{ id: 'd', costFactors: { a: 1 }, costFactorProvenance: { tier: 'researched', sources: ['s'], note } }],
    });
    expect(runTrustIntegrityChecks([mk('we picked a sensible number')]).check3).toHaveLength(1);
    expect(runTrustIntegrityChecks([mk('ratios use market midpoint, $85/dz as 1.0')]).check3).toHaveLength(0);
  });

  test('check 4 distinguishes "never evaluated" from "no criterion"', () => {
    const mk = (prov) => ({ type: 'X', decisions: [{ id: 'd', costFactors: { a: 1 }, costFactorProvenance: prov }] });
    const base = { tier: 'researched', sources: ['s'] };
    expect(runTrustIntegrityChecks([mk(base)]).check4[0].outcome).toBe('no-sufficiency-criterion');
    expect(runTrustIntegrityChecks([mk({ ...base, sufficientWhen: 'two quotes' })]).check4[0].outcome)
      .toBe('criterion-never-evaluated');
    expect(runTrustIntegrityChecks([mk({ ...base, sufficientWhen: 'two quotes', sufficiencyMet: false })]).check4)
      .toHaveLength(0);
  });
});
