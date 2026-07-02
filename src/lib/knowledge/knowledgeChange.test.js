// KCR — the governed knowledge write-side. Locks the pipeline gates, the derived
// impact preview, component-only confidence, and the GOLDEN end-to-end production flow.
import {
  createKCR, insightToKCR, addEvidence, setProposal, recordReview, advanceKCR,
  publishKCR, rollbackKCR, canReachCited, deriveImpact, knowledgeImpactPreview,
  deriveDependentKCRs, deriveKnowledgeConfidence, KCR_TYPES, TRIGGERS, KCR_TRANSITIONS,
} from './knowledgeChange';
import { governedAssetEntry, isGovernedKind, isProjectedKind, GOVERNED_ASSET_KINDS } from './governedAsset';
import { getPlaybook } from '../playbooks/index';

const ASOF = '2026-07-02';
const crab = getPlaybook('Crab Feast');

describe('KCR intake + vocabulary', () => {
  test('an insight becomes exactly one KCR with a trigger (no second backlog)', () => {
    const k = insightToKCR({ trigger: 'validation', suggestedType: 'validation-finding', assetId: 'Crab Feast', fieldPath: 'purchases.p_crabs.unitCostRange', note: 'drift' }, ASOF);
    expect(k.type).toBe('validation-finding');
    expect(k.trigger).toBe('validation');
    expect(k.status).toBe('draft');
  });
  test('research is one KCR type; trigger is validated', () => {
    expect(KCR_TYPES).toContain('research');
    expect(TRIGGERS).toEqual(expect.arrayContaining(['research', 'freshness', 'regulation', 'incident', 'post-event', 'market-change', 'sme']));
    expect(() => createKCR({ type: 'research', trigger: 'nope', assetId: 'Crab Feast' })).toThrow(/unknown trigger/);
    expect(() => createKCR({ type: 'nope', trigger: 'research' })).toThrow(/unknown type/);
  });
});

describe('pipeline gates', () => {
  test('illegal transition throws', () => {
    const k = createKCR({ type: 'pricing-update', trigger: 'market-change', assetId: 'Crab Feast', asOf: ASOF });
    expect(() => advanceKCR(k, 'published', { asOf: ASOF })).toThrow(/illegal transition/);
  });
  test('review needs a proposal; approve needs SME+editorial+governance (AI advisory)', () => {
    let k = createKCR({ type: 'pricing-update', trigger: 'market-change', assetId: 'Crab Feast', asOf: ASOF });
    k = advanceKCR(k, 'researching', { asOf: ASOF });
    k = addEvidence(k, { source: 'BLS', sourceType: 'citation' }, ASOF);
    k = advanceKCR(k, 'grounded', { asOf: ASOF });
    expect(() => advanceKCR(k, 'review', { asOf: ASOF })).toThrow(/without a proposal/);
    k = setProposal(k, { newValue: [3, 8], verificationStatus: 'cited', sources: ['ev-1'], rationale: 'BLS' }, ASOF);
    k = advanceKCR(k, 'review', { asOf: ASOF });
    k = recordReview(k, 'ai', { by: 'copilot', decision: 'approve' }, ASOF);
    k = recordReview(k, 'sme', { by: 'chef', decision: 'approve' }, ASOF);
    expect(() => advanceKCR(k, 'approved', { asOf: ASOF })).toThrow(/SME \+ editorial \+ governance/);
  });
});

describe('cited gate — nothing grounded without evidence', () => {
  test('publish of a cited value without evidence is blocked', () => {
    // approved but proposal cited with no supporting evidence
    let k = createKCR({ type: 'citation', trigger: 'sme', assetId: 'Crab Feast', asOf: ASOF });
    expect(canReachCited(k)).toBe(false);
  });
});

describe('GOLDEN — full governed production flow (insight → published → version → rollback)', () => {
  test('every stage is verifiable end-to-end', () => {
    // 1. Insight → Research KCR
    let k = insightToKCR({ trigger: 'research', suggestedType: 'research', assetId: 'Crab Feast', fieldPath: 'purchases.p_crabs.unitCostRange', currentValue: [2.5, 7], note: 'verify crab $/ea' }, ASOF);
    expect(k.status).toBe('draft');
    // 2. Research
    k = advanceKCR(k, 'researching', { asOf: ASOF });
    // 3. Evidence attached
    k = addEvidence(k, { source: 'Maryland DNR market report 2026', sourceType: 'primary', supports: [3, 8] }, ASOF);
    expect(canReachCited(k)).toBe(true);
    // 4. Grounding (proposal)
    k = advanceKCR(k, 'grounded', { asOf: ASOF });
    k = setProposal(k, { newValue: [3, 8], newProvenance: { tier: 'regional-heuristic', confidence: 'high', verificationStatus: 'cited', sources: ['ev-1'] }, verificationStatus: 'cited', rationale: 'DNR report' }, ASOF);
    // 5. Reviews (SME + Editorial + Governance; AI advisory)
    k = advanceKCR(k, 'review', { asOf: ASOF });
    k = recordReview(k, 'sme', { by: 'chef', decision: 'approve' }, ASOF);
    k = recordReview(k, 'editorial', { by: 'editor', decision: 'approve' }, ASOF);
    k = recordReview(k, 'governance', { by: 'publisher', decision: 'approve' }, ASOF);
    k = advanceKCR(k, 'approved', { by: 'publisher', asOf: ASOF });
    expect(k.status).toBe('approved');
    // 6. Publish → version created
    const { kcr: published, version } = publishKCR(k, { prevVersion: 'crab-feast-v-0', versionId: 'crab-feast-v-1', by: 'publisher', asOf: ASOF });
    expect(published.status).toBe('published');
    expect(published.publishedVersion).toBe('crab-feast-v-1');
    expect(version.from).toEqual([2.5, 7]);
    expect(version.to).toEqual([3, 8]);
    expect(version.supersedes).toBe('crab-feast-v-0');
    expect(version.trigger).toBe('research');
    // 7. Dependency preview generated (derived)
    const preview = knowledgeImpactPreview(crab, k.fieldPath);
    expect(preview.recommendationEngines).toEqual(expect.arrayContaining(['budget', 'shopping']));
    expect(preview.downstream).toEqual(expect.arrayContaining(['sourcing']));
    expect(preview.affectedPurchases).toContain('p_crabs');
    expect(preview.tests.known).toBe(false); // honest-empty, not fabricated
    // 8. Rollback possible
    const rolled = rollbackKCR(published, { by: 'publisher', asOf: ASOF });
    expect(rolled.status).toBe('revision');
    expect(rolled.audit.some((a) => a.action === 'rolled-back')).toBe(true);
    // 9. Full audit trail exists (traceability: insight → published value)
    expect(published.audit.map((a) => a.action)).toEqual(expect.arrayContaining(['created', 'evidence-added', 'proposal-set', 'review:governance', 'published']));
  });
  test('cannot publish a cited proposal without evidence (the hard gate)', () => {
    let k = createKCR({ type: 'citation', trigger: 'sme', assetId: 'Crab Feast', asOf: ASOF });
    k = advanceKCR(k, 'researching', { asOf: ASOF });
    k = advanceKCR(k, 'grounded', { asOf: ASOF });
    k = setProposal(k, { newValue: [3, 8], verificationStatus: 'cited' }, ASOF);
    k = advanceKCR(k, 'review', { asOf: ASOF });
    ['sme', 'editorial', 'governance'].forEach((g) => { k = recordReview(k, g, { by: g, decision: 'approve' }, ASOF); });
    k = advanceKCR(k, 'approved', { asOf: ASOF });
    expect(() => publishKCR(k, { versionId: 'x', asOf: ASOF })).toThrow(/cited value without supporting evidence/);
  });
});

describe('knowledge impact preview — derived, honest-empty where unindexed', () => {
  test('pricing change → engines/downstream/purchases derived; prompts/tests honest-empty', () => {
    const p = knowledgeImpactPreview(crab, 'purchases.p_crabs.unitCostRange');
    expect(p.playbooks).toContain('Crab Feast');
    expect(p.knowledgePackages).toContain('home_hosted');
    expect(p.prompts.known).toBe(false);
    expect(p.templates.known).toBe(false);
  });
  test('deriveDependentKCRs fans out downstream, tagged market-change', () => {
    const kcrs = deriveDependentKCRs(crab, 'purchases.p_crabs.unitCostRange', ASOF);
    expect(kcrs.length).toBeGreaterThan(0);
    expect(kcrs.every((k) => k.trigger === 'market-change' && k.createdBy === 'dependency-engine')).toBe(true);
  });
});

describe('knowledge confidence — components only, never one score', () => {
  test('crab: evidence low, sources low, validation unknown; no rolled-up number', () => {
    const c = deriveKnowledgeConfidence(crab, ASOF, { validationN: 0 });
    expect(c.score).toBeUndefined();
    expect(c.components.find((x) => x.component === 'Validation').level).toBe('unknown');
    expect(c.components.find((x) => x.component === 'Evidence').level).toBe('low');
  });
});

describe('governed asset abstraction — one contract, no duplication', () => {
  test('playbook derives a full entry; capabilities inherited', () => {
    const e = governedAssetEntry(crab, 'playbook', ASOF);
    expect(e.derived).toBe(true);
    expect(e.type).toBe('Crab Feast');
    expect(e.capabilities).toEqual(expect.arrayContaining(['lifecycle', 'maturity', 'health', 'provenance', 'versionHistory', 'kcrHistory']));
  });
  test('a governed kind without a deriver is honest-empty, not fabricated', () => {
    const e = governedAssetEntry({ type: 'The Grand Ballroom' }, 'venue-kit', ASOF);
    expect(e.derived).toBe(false);
    expect(e.capabilities).toContain('lifecycle');
    expect(e.note).toMatch(/deriver is not built yet/);
  });
  test('a projected kind is rejected as a governed entry (no truth fork)', () => {
    expect(isProjectedKind('runbook')).toBe(true);
    expect(isGovernedKind('playbook')).toBe(true);
    expect(() => governedAssetEntry(crab, 'runbook', ASOF)).toThrow(/is a projection, not a governed kind/);
  });
  test('kind taxonomy is small + intentional', () => {
    expect(GOVERNED_ASSET_KINDS).toContain('playbook');
    expect(GOVERNED_ASSET_KINDS).not.toContain('runbook'); // projection, not a kind
  });
});
