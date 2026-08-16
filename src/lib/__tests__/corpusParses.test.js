// ─── EVERY PLAYBOOK MUST STILL PARSE, AND SAY SO IN ONE LINE ────────────────
//
// 2026-08-15: a citation written into `holidayParty.js` contained the word
// "Seagram's". The helper that wrote it double-escaped the apostrophe, producing
//
//     'budget shelf bottles are ... (SKYY, Seagram\\'s, Bacardi)'
//
// which in a single-quoted JS string is a literal backslash followed by an
// UNESCAPED quote — it terminates the string early and the file stops parsing.
//
// WHAT THE SUITE REPORTED, and why it nearly sent me the wrong way:
//
//     Test Suites: 251 failed, 139 passed, 390 total
//     Tests:         1 failed, 1834 passed, 1835 total
//
// One failing TEST beside 251 failing SUITES is not an assertion problem — it is
// 251 suites that could not LOAD, and the run silently collapsed from 5725 tests
// to 1835. The single named failure was in `selectEventNextAction`, a real and
// entirely innocent test that happened to import the broken corpus. Reading that
// line alone would have sent someone hunting a regression in the engine.
//
// It also poisoned everything downstream: the e2e matrix was launched against a
// build made from the broken source, and its stale preview server then held port
// 5233 against the next run.
//
// So this asserts the cheapest possible property, in the plainest possible way:
// every playbook in the corpus imports. When it fails it names the FILE, so the
// next person spends no time in the engine.
//
// The playbook contract tests already exercise these modules, but they fail as a
// wall of suite-load errors. This one fails as a sentence.
import { ALL_PLAYBOOKS } from '../playbooks/index';

describe('the corpus parses', () => {
  test('every playbook imported, and the registry is not silently short', () => {
    // If a file fails to parse, the import above throws and this suite dies with
    // it — which is itself the signal. If instead a file were dropped from the
    // registry, the count catches it.
    expect(Array.isArray(ALL_PLAYBOOKS)).toBe(true);
    expect(ALL_PLAYBOOKS.length).toBeGreaterThanOrEqual(39);
  });

  test('every playbook carries the shape the corpus tools walk', () => {
    // `grounding:census`, `grounding:audit` and the worklist survey all walk
    // `purchases[]` for `unitCostRange`. A playbook that parses but has lost its
    // purchases array reads as "nothing priced here" rather than as an error —
    // the same false-zero shape the census itself used to produce.
    const broken = ALL_PLAYBOOKS
      .filter((pb) => !Array.isArray(pb.purchases))
      .map((pb) => pb.type || pb.name || '(unnamed)');
    expect(broken).toEqual([]);
  });

  test('no purchase line carries a mangled escape in its provenance strings', () => {
    // The specific defect above, caught at the value level rather than the parse
    // level so it fails even if a future format makes the file parse anyway. A
    // lone backslash in host-facing prose is always a bug — no claim, note or
    // sufficientWhen in this corpus legitimately contains one.
    const offenders = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const p of (pb.purchases || [])) {
        const prov = p.provenance;
        if (!prov || typeof prov !== 'object') continue;
        for (const key of ['claim', 'note', 'sufficientWhen']) {
          const v = prov[key];
          if (typeof v === 'string' && v.includes('\\')) {
            offenders.push(`${pb.type || pb.name} ${p.id} .${key}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
