// KAS-2 — the complete vertical slice. Proves ONE field (Crab Feast p_crabs.unitCostRange)
// travels the full manufacturing chain — Observation → Evidence → Finding → KCR → Review →
// Publish → override → Production — with ZERO source-file editing, an immutable audit trail,
// required KCR/review/publish, working rollback, and dimension-only confidence.
import { createObservation, OBSERVATION_KINDS } from './observation';
import { createEvidence } from './evidence';
import { deriveFinding, findingConfidence, findingToKCR } from './finding';
import { advanceKCR, recordReview, publishKCR } from './knowledgeChange';
import { overrideFromPublishedKCR, applyOverride, effectiveValue, readAuthored, rollbackOverride, clearOverrides } from './knowledgeOverride';
import { corpusConnector, DECLARED_CONNECTORS } from './connectors';
import { getPlaybook } from '../playbooks/index';

const ASOF = '2026-07-02';
const FIELD = 'p_crabs.unitCostRange';
const NEW_VALUE = [3, 8];
const crab = getPlaybook('Crab Feast');
beforeEach(() => clearOverrides());

describe('KAS-2 vertical slice — observation → production, no manual file editing', () => {
  test('the complete chain, every stage, one field', () => {
    // 0. AUTHORED baseline (from the source file, untouched throughout).
    const authored = readAuthored(crab, FIELD);
    expect(Array.isArray(authored)).toBe(true);

    // 1. OBSERVATION — something noticed (immutable, attributed). Not a conclusion.
    const obs = createObservation({ kind: 'pricing', gapType: 'pricing', assetId: 'Crab Feast', fieldPath: FIELD, statement: 'DMV blue-crab prices appear up', source: 'corpus', at: ASOF });
    expect(obs.status).toBe('open');
    expect(Object.isFrozen(obs)).toBe(true);                 // immutable
    expect(obs.audit[0].action).toBe('observed');

    // 2. EVIDENCE — sources supporting the observation (reusable, authority-graded).
    const evidence = [
      createEvidence({ source: 'USDA', sourceType: 'official', authorityLevel: 'primary', assetId: 'Crab Feast', fieldPath: FIELD, excerpt: 'blue crab dockside up', extractedFacts: [{ field: FIELD, value: NEW_VALUE }], at: ASOF }),
      createEvidence({ source: 'Restaurant Depot', sourceType: 'commercial', authorityLevel: 'trade', assetId: 'Crab Feast', fieldPath: FIELD, extractedFacts: [{ field: FIELD, value: NEW_VALUE }], at: ASOF }),
      createEvidence({ source: 'Maine Ave Market', sourceType: 'regional', authorityLevel: 'community', assetId: 'Crab Feast', fieldPath: FIELD, extractedFacts: [{ field: FIELD, value: NEW_VALUE }], at: ASOF }),
    ];
    expect(evidence.every((e) => e.status === 'candidate')).toBe(true);

    // 3. FINDING — validated conclusion from evidence (still NOT canonical).
    const finding = deriveFinding(obs, evidence, { asOf: ASOF });
    expect(finding.status).toBe('proposed');
    expect(finding.proposedValue).toEqual(NEW_VALUE);
    expect(finding.corroboration).toBe(3);
    // Confidence is DIMENSIONS ONLY — never one score.
    expect(finding.confidence.score).toBeUndefined();
    const dims = finding.confidence.dimensions.map((d) => d.dimension);
    expect(dims).toEqual(expect.arrayContaining(['Evidence quality', 'Source authority', 'Corroboration', 'Freshness', 'Validation state', 'Contradictions', 'Expert review', 'Stability']));
    expect(finding.confidence.dimensions.find((d) => d.dimension === 'Corroboration').level).toBe('high');
    expect(finding.confidence.dimensions.find((d) => d.dimension === 'Source authority').level).toBe('high'); // USDA primary

    // 4. KCR — the finding produces a governed change request (nothing bypasses KCR).
    let kcr = findingToKCR(finding, evidence, crab, ASOF);
    expect(kcr.type).toBe('research');
    expect(kcr.findingId).toBe(finding.id);
    expect(kcr.proposal.sources).toEqual(evidence.map((e) => e.id)); // provenance.sources=[evidenceId]

    // 5. REVIEW — required; publish is blocked until SME + editorial + governance approve.
    kcr = advanceKCR(kcr, 'researching', { asOf: ASOF });
    kcr = advanceKCR(kcr, 'grounded', { asOf: ASOF });
    kcr = advanceKCR(kcr, 'review', { asOf: ASOF });
    kcr = recordReview(kcr, 'sme', { by: 'John Shields', decision: 'approve' }, ASOF);
    expect(() => advanceKCR(kcr, 'approved', { asOf: ASOF })).toThrow(/SME \+ editorial \+ governance/); // review required
    kcr = recordReview(kcr, 'editorial', { by: 'editor', decision: 'approve' }, ASOF);
    kcr = recordReview(kcr, 'governance', { by: 'publisher', decision: 'approve' }, ASOF);
    kcr = advanceKCR(kcr, 'approved', { by: 'publisher', asOf: ASOF });

    // 6. PUBLISH — creates a version; a cited value requires the linked evidence (it has it).
    const { kcr: published, version } = publishKCR(kcr, { versionId: 'crab-p_crabs-v1', prevVersion: 'crab-p_crabs-v0', by: 'publisher', asOf: ASOF });
    expect(published.status).toBe('published');
    expect(version.to).toEqual(NEW_VALUE);

    // 7. PRODUCTION via OVERRIDE — the field is now the new value, and the AUTHORED FILE IS UNCHANGED.
    const ovr = overrideFromPublishedKCR(published);
    applyOverride(ovr);
    const eff = effectiveValue(crab, FIELD);
    expect(eff.value).toEqual(NEW_VALUE);
    expect(eff.source).toBe('override');
    expect(readAuthored(crab, FIELD)).toEqual(authored);     // NO source-file edit — manufactured, not authored

    // 8. AUDIT TRAIL — immutable, end to end.
    expect(published.audit.map((a) => a.action)).toEqual(expect.arrayContaining(['created', 'published']));
    expect(published.evidence.map((e) => e.id)).toEqual(evidence.map((e) => e.id)); // traceable to evidence

    // 9. ROLLBACK — drop the override; the field returns to the authored value.
    rollbackOverride(ovr.id);
    const reverted = effectiveValue(crab, FIELD);
    expect(reverted.value).toEqual(authored);
    expect(reverted.source).toBe('authored');
  });

  test('publish is blocked without evidence (a cited proposal needs it)', () => {
    const obs = createObservation({ kind: 'pricing', gapType: 'pricing', assetId: 'Crab Feast', fieldPath: FIELD, statement: 'x', source: 'corpus', at: ASOF });
    const finding = deriveFinding(obs, [], { asOf: ASOF });   // no evidence
    expect(finding.status).toBe('insufficient');
    expect(findingToKCR(finding, [], crab, ASOF)).toBeNull(); // insufficient finding → no KCR
  });

  test('a contradiction routes a knowledge-conflict KCR, never a silent replacement', () => {
    const obs = createObservation({ kind: 'pricing', gapType: 'pricing', assetId: 'Crab Feast', fieldPath: FIELD, statement: 'x', source: 'corpus', at: ASOF });
    const ev = [
      createEvidence({ source: 'A', sourceType: 'commercial', authorityLevel: 'trade', assetId: 'Crab Feast', fieldPath: FIELD, extractedFacts: [{ field: FIELD, value: [3, 8] }], at: ASOF }),
      createEvidence({ source: 'B', sourceType: 'community', authorityLevel: 'community', assetId: 'Crab Feast', fieldPath: FIELD, contradicts: ['A'], extractedFacts: [{ field: FIELD, value: [2, 5] }], at: ASOF }),
    ];
    const finding = deriveFinding(obs, ev, { asOf: ASOF });
    expect(finding.status).toBe('contested');
    const kcr = findingToKCR(finding, ev, crab, ASOF);
    expect(kcr.type).toBe('contradiction');
    expect(kcr.proposal).toBeNull();                         // no proposal — humans resolve
  });
});

describe('connectors produce observations only (no crawlers, no findings)', () => {
  test('the corpus connector emits observations from the research queue', () => {
    const obs = corpusConnector.observe({ asOf: ASOF });
    expect(obs.length).toBeGreaterThan(0);
    expect(obs.every((o) => OBSERVATION_KINDS.includes(o.kind))).toBe(true);
    expect(obs.every((o) => o.status === 'open')).toBe(true); // observations, not findings
  });
  test('declared external connectors are architecture-only (no-op observe)', () => {
    expect(DECLARED_CONNECTORS.length).toBeGreaterThan(0);
    expect(DECLARED_CONNECTORS.every((c) => c.observe({ asOf: ASOF }).length === 0)).toBe(true); // not executing
  });
});
