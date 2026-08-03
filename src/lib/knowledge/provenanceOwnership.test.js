// ─── PROVENANCE OWNERSHIP — one canonical source (Phase 5A-0) ────────────────
//
// A proposal carried provenance in two places and the system read different ones:
// GOVERNANCE read `proposal.verificationStatus` / `.sources`; RUNTIME read
// `proposal.newProvenance`. Two failure modes followed —
//
//   DISAGREEMENT: hand-authored nested 'cited' with the top-level default still
//     'synthesized'. The cited-needs-evidence gate evaluated the wrong field.
//   LOSS: finding.js (the AUTOMATED path) writes top-level ONLY, so the version,
//     the override and the snapshot all read `newProvenance` and got null — a
//     researched, reviewed KCR reaching the transport with no provenance at all.
//
// `newProvenance` is canonical. Top-level is mirrored for compatibility and can
// never drift from it. Absence is derived; disagreement throws.
import {
  createKCR, setProposal, recordReview, advanceKCR, publishKCR, kcrGateStatus,
  canonicalProvenance, normalizeProposal, CONFIDENCE_VALUES,
} from './knowledgeChange';
import { findingToKCR } from './finding';

const ASOF = '2026-08-01T12:00:00.000Z';
const draft = (over = {}) => createKCR({
  type: 'research', trigger: 'research', assetId: 'Crab Feast',
  fieldPath: 'p_crabs.provenance', currentValue: null, reason: 'probe', asOf: ASOF, ...over,
});

describe('A — legacy top-level provenance normalizes into newProvenance', () => {
  test('a top-level-only proposal gains a canonical newProvenance', () => {
    const k = setProposal(draft(), {
      newValue: [3, 8], verificationStatus: 'cited', sources: ['ev-1'], rationale: 'BLS',
    }, ASOF);
    expect(k.proposal.newProvenance).toEqual({ verificationStatus: 'cited', sources: ['ev-1'] });
    // and the legacy fields still read exactly as before
    expect(k.proposal.verificationStatus).toBe('cited');
    expect(k.proposal.sources).toEqual(['ev-1']);
  });

  test('a proposal with NO provenance still defaults, as it always did', () => {
    const k = setProposal(draft(), { newValue: [3, 8], rationale: 'x' }, ASOF);
    expect(k.proposal.verificationStatus).toBe('synthesized');
    expect(k.proposal.sources).toEqual([]);
    expect(k.proposal.newProvenance).toEqual({ verificationStatus: 'synthesized', sources: [] });
  });
});

describe('B — nested provenance passes through unchanged', () => {
  test('extra nested keys survive; nested wins', () => {
    const k = setProposal(draft(), {
      newValue: [3, 8],
      newProvenance: { tier: 'regional-heuristic', confidence: 'high', verificationStatus: 'cited', sources: ['ev-1'] },
      verificationStatus: 'cited', rationale: 'DNR report',
    }, ASOF);
    expect(k.proposal.newProvenance).toEqual({
      tier: 'regional-heuristic', confidence: 'high', verificationStatus: 'cited', sources: ['ev-1'],
    });
  });

  test('normalizeProposal is idempotent', () => {
    const once = normalizeProposal({ newValue: 1, newProvenance: { verificationStatus: 'cited', sources: ['a'] } });
    expect(normalizeProposal(once)).toEqual(once);
  });

  test('an absent nested field is DERIVED from its legacy twin, not treated as a conflict', () => {
    const p = normalizeProposal({ newValue: 1, newProvenance: { tier: 'researched' }, verificationStatus: 'cited', sources: ['ev-1'] });
    expect(p.newProvenance).toEqual({ tier: 'researched', verificationStatus: 'cited', sources: ['ev-1'] });
  });

  test('source ORDER is not a conflict — membership is what matters', () => {
    expect(() => normalizeProposal({
      newValue: 1, sources: ['a', 'b'], newProvenance: { sources: ['b', 'a'] },
    })).not.toThrow();
  });
});

describe('C — conflicting nested/top-level provenance cannot silently publish', () => {
  test('disagreeing verificationStatus throws at proposal time', () => {
    expect(() => setProposal(draft(), {
      newValue: [3, 8], verificationStatus: 'synthesized',
      newProvenance: { verificationStatus: 'cited', sources: ['ev-1'] },
    }, ASOF)).toThrow(/provenance conflict/i);
  });

  test('disagreeing sources throws', () => {
    expect(() => canonicalProvenance({
      verificationStatus: 'cited', sources: ['ev-1'],
      newProvenance: { verificationStatus: 'cited', sources: ['ev-2'] },
    })).toThrow(/provenance conflict/i);
  });

  test('a conflicting proposal built OUTSIDE setProposal is refused at publish', () => {
    // The shape finding.js could produce if it were ever given both halves.
    const bad = { ...draft(), status: 'approved',
      proposal: { newValue: [3, 8], verificationStatus: 'synthesized', newProvenance: { verificationStatus: 'cited', sources: ['ev-1'] } } };
    expect(() => publishKCR(bad, { versionId: 'v1', asOf: ASOF })).toThrow(/provenance conflict/i);
  });

  test('the UI gate REPORTS a conflict instead of throwing', () => {
    const bad = { ...draft(), status: 'approved', evidence: [],
      proposal: { newValue: 1, verificationStatus: 'synthesized', newProvenance: { verificationStatus: 'cited' } } };
    const g = kcrGateStatus(bad);
    expect(g.blocked).toMatch(/provenance conflict/i);
    expect(g.next).toBeNull();
  });
});

describe('D — the AUTOMATED research KCR reaches runtime with provenance', () => {
  // findingToKCR writes provenance top-level only. Before this fix, the version,
  // the override and the snapshot all read `newProvenance` and got null.
  const finding = {
    id: 'f-1', status: 'supported', proposedValue: [3, 8],
    conclusion: 'DMV crab retail, July 2026',
    affectedAssets: ['Crab Feast'], fieldPath: 'p_crabs.provenance', evidenceIds: ['ev-1'],
  };
  const evidence = [{ id: 'ev-1', source: 'DMV crab-house survey', authorityLevel: 'primary', contradicts: [], capturedAt: ASOF }];

  test('findingToKCR still writes the legacy shape (this documents WHY the fix is needed)', () => {
    const k = findingToKCR(finding, evidence, null, ASOF);
    expect(k.proposal.verificationStatus).toBe('cited');
    expect(k.proposal.newProvenance).toBeUndefined();      // <- the loss, at source
  });

  test('publishKCR resolves it canonically and the PUBLISHED record carries newProvenance', () => {
    const k = { ...findingToKCR(finding, evidence, null, ASOF), status: 'approved' };
    const { kcr: published, version } = publishKCR(k, { versionId: 'v1', asOf: ASOF });
    // 5A-1.5: publish now COMPLETES the grading for a cited+evidenced claim.
    // Before derivation this was { verificationStatus, sources } only.
    expect(version.provenance).toEqual({
      verificationStatus: 'cited', sources: ['ev-1'], tier: 'researched', confidence: 'medium',
    });
    expect(published.proposal.newProvenance).toEqual({
      verificationStatus: 'cited', sources: ['ev-1'], tier: 'researched', confidence: 'medium',
    });
  });

  test('the cited gate still fires on the automated shape — governance is not weakened', () => {
    const k = { ...findingToKCR(finding, evidence, null, ASOF), status: 'approved', evidence: [] };
    expect(() => publishKCR(k, { versionId: 'v2', asOf: ASOF }))
      .toThrow(/cited value without supporting evidence/i);
  });
});

describe('governance and runtime now read the SAME value', () => {
  test('canonicalProvenance is the single resolution for both shapes', () => {
    const nested = { newProvenance: { verificationStatus: 'cited', sources: ['a'] } };
    const legacy = { verificationStatus: 'cited', sources: ['a'] };
    expect(canonicalProvenance(nested)).toEqual(canonicalProvenance(legacy));
  });

  test('null proposal and junk input resolve to null, never throw', () => {
    for (const bad of [null, undefined, 0, '', [], true]) expect(canonicalProvenance(bad)).toBeNull();
    expect(canonicalProvenance({ newValue: 1 })).toBeNull();
  });

  test('a full lifecycle publishes with agreeing governance and runtime provenance', () => {
    let k = setProposal(draft(), {
      newValue: [3, 8], newProvenance: { verificationStatus: 'cited', sources: ['ev-1'] }, rationale: 'r',
    }, ASOF);
    k = { ...k, evidence: [{ id: 'ev-1', sourceType: 'citation', source: 'DNR', contradicts: false }] };
    for (const s of ['researching', 'grounded', 'review']) k = advanceKCR(k, s, { asOf: ASOF });
    for (const g of ['sme', 'editorial', 'governance']) k = recordReview(k, g, { by: 'x', decision: 'approve', note: '' }, ASOF);
    k = advanceKCR(k, 'approved', { asOf: ASOF });
    const { kcr: pub, version } = publishKCR(k, { versionId: 'v9', asOf: ASOF });
    expect(pub.status).toBe('published');
    expect(version.provenance.verificationStatus).toBe('cited');
    expect(pub.proposal.newProvenance.verificationStatus).toBe(pub.proposal.verificationStatus);
  });
});

// ─── PHASE 5A-1 — provenance GRADING (tier + confidence) ─────────────────────
// The canonical object gains the two fields the playbook grounding predicates
// require. `confidence` is frozen at three values because the corpus already
// spells one idea two ways (medium 82 / med 18); freezing at manufacture stops
// the split spreading. `tier` is deliberately NOT frozen — that vocabulary is
// still being earned.
describe('5A-1 — tier and confidence on the canonical provenance', () => {
  const graded = (over = {}) => ({
    newValue: [3, 8],
    newProvenance: {
      tier: 'researched', confidence: 'high', verificationStatus: 'cited',
      sources: ['ev-1'], note: 'DMV crab-house survey, July 2026', ...over,
    },
    rationale: 'r',
  });

  test('A — tier survives create -> publish', () => {
    const k = { ...setProposal(draft(), graded(), ASOF), status: 'approved',
      evidence: [{ id: 'ev-1', sourceType: 'citation', source: 'DNR', contradicts: false }] };
    expect(k.proposal.newProvenance.tier).toBe('researched');
    const { kcr: pub, version } = publishKCR(k, { versionId: 'v1', asOf: ASOF });
    expect(pub.proposal.newProvenance.tier).toBe('researched');
    expect(version.provenance.tier).toBe('researched');
  });

  test('B — confidence survives create -> publish', () => {
    const k = { ...setProposal(draft(), graded(), ASOF), status: 'approved',
      evidence: [{ id: 'ev-1', sourceType: 'citation', source: 'DNR', contradicts: false }] };
    expect(k.proposal.newProvenance.confidence).toBe('high');
    const { kcr: pub, version } = publishKCR(k, { versionId: 'v2', asOf: ASOF });
    expect(pub.proposal.newProvenance.confidence).toBe('high');
    expect(version.provenance.confidence).toBe('high');
  });

  test('C — invalid confidence is rejected, and `med` names its canonical form', () => {
    expect(() => setProposal(draft(), graded({ confidence: 'med' }), ASOF))
      .toThrow(/invalid provenance confidence 'med'.*use 'medium'/i);
    for (const bad of ['MEDIUM', 'hi', 'certain', '', 0, true]) {
      expect(() => setProposal(draft(), graded({ confidence: bad }), ASOF))
        .toThrow(/invalid provenance confidence/i);
    }
    for (const ok of CONFIDENCE_VALUES) {
      expect(() => setProposal(draft(), graded({ confidence: ok }), ASOF)).not.toThrow();
    }
  });

  test('C2 — an absent or null confidence is allowed (grading is optional)', () => {
    expect(() => setProposal(draft(), graded({ confidence: undefined }), ASOF)).not.toThrow();
    expect(() => setProposal(draft(), graded({ confidence: null }), ASOF)).not.toThrow();
  });

  test('C3 — the rejection fires at PUBLISH too, for proposals built outside setProposal', () => {
    const bad = { ...draft(), status: 'approved',
      proposal: { newValue: 1, newProvenance: { confidence: 'med', verificationStatus: 'synthesized' } } };
    expect(() => publishKCR(bad, { versionId: 'v3', asOf: ASOF })).toThrow(/invalid provenance confidence/i);
  });

  test('D — a legacy KCR with no tier/confidence stays compatible', () => {
    const k = setProposal(draft(), { newValue: [3, 8], verificationStatus: 'cited', sources: ['ev-1'] }, ASOF);
    expect(k.proposal.newProvenance).toEqual({ verificationStatus: 'cited', sources: ['ev-1'] });
    expect(k.proposal.newProvenance.tier).toBeUndefined();
    expect(k.proposal.newProvenance.confidence).toBeUndefined();
    // and it still publishes
    const approved = { ...k, status: 'approved', evidence: [{ id: 'ev-1', sourceType: 'citation', source: 'DNR', contradicts: false }] };
    expect(() => publishKCR(approved, { versionId: 'v4', asOf: ASOF })).not.toThrow();
  });

  test('E — a published KCR carries the COMPLETE five-field shape', () => {
    const k = { ...setProposal(draft(), graded(), ASOF), status: 'approved',
      evidence: [{ id: 'ev-1', sourceType: 'citation', source: 'DNR', contradicts: false }] };
    const { kcr: pub } = publishKCR(k, { versionId: 'v5', asOf: ASOF });
    expect(pub.proposal.newProvenance).toEqual({
      tier: 'researched', confidence: 'high', verificationStatus: 'cited',
      sources: ['ev-1'], note: 'DMV crab-house survey, July 2026',
    });
    expect(Object.keys(pub.proposal.newProvenance).sort())
      .toEqual(['confidence', 'note', 'sources', 'tier', 'verificationStatus']);
  });

  test('grading does NOT weaken the cited gate', () => {
    const k = { ...setProposal(draft(), graded(), ASOF), status: 'approved', evidence: [] };
    expect(() => publishKCR(k, { versionId: 'v6', asOf: ASOF }))
      .toThrow(/cited value without supporting evidence/i);
  });

  test('tier is intentionally NOT frozen — a culture-bearer attribution is accepted', () => {
    for (const t of ['culture-bearer', 'matriarch', 'trade-heuristic', 'cultural-tradition']) {
      expect(() => setProposal(draft(), graded({ tier: t }), ASOF)).not.toThrow();
    }
  });
});

// ─── PHASE 5A-1.5 — deterministic derivation at the publish boundary ─────────
// 5A-1 made grading possible; it did not make it present. The automated path
// emits verificationStatus + sources and nothing else, so a researched, reviewed
// KCR still published UNGRADED — and isGroundedCost() requires tier==='researched',
// so the runtime would have called it ungrounded. Derivation closes that, and only
// for a claim that already earned it.
describe('5A-1.5 — provenance derivation', () => {
  const finding = {
    id: 'f-9', status: 'supported', proposedValue: [3, 8],
    conclusion: 'DMV crab retail, July 2026',
    affectedAssets: ['Crab Feast'], fieldPath: 'p_crabs.provenance', evidenceIds: ['ev-1'],
  };
  const evidence = [{ id: 'ev-1', source: 'DMV crab-house survey', authorityLevel: 'primary', contradicts: [], capturedAt: ASOF }];
  const automated = () => ({ ...findingToKCR(finding, evidence, null, ASOF), status: 'approved' });

  test('A — an automated finding KCR receives tier + confidence at publish', () => {
    const before = findingToKCR(finding, evidence, null, ASOF);
    expect(before.proposal.newProvenance).toBeUndefined();          // ungraded at source
    const { kcr: pub, version } = publishKCR(automated(), { versionId: 'd1', asOf: ASOF });
    expect(pub.proposal.newProvenance.tier).toBe('researched');
    expect(pub.proposal.newProvenance.confidence).toBe('medium');
    expect(version.provenance.tier).toBe('researched');
    expect(version.provenance.confidence).toBe('medium');
  });

  test('A2 — the derived value satisfies the runtime grounding predicate shape', () => {
    // isGroundedCost() requires tier === 'researched' AND >= 1 source.
    const { version } = publishKCR(automated(), { versionId: 'd2', asOf: ASOF });
    expect(version.provenance.tier).toBe('researched');
    expect(Array.isArray(version.provenance.sources) && version.provenance.sources.length).toBeTruthy();
  });

  test('B — cited with no qualifying evidence remains BLOCKED, nothing derived', () => {
    const k = { ...automated(), evidence: [] };
    expect(() => publishKCR(k, { versionId: 'd3', asOf: ASOF }))
      .toThrow(/cited value without supporting evidence/i);
  });

  test('B2 — contradicting evidence does not qualify', () => {
    const k = { ...automated(), evidence: [{ id: 'ev-1', sourceType: 'citation', source: 'x', contradicts: true }] };
    expect(() => publishKCR(k, { versionId: 'd4', asOf: ASOF }))
      .toThrow(/cited value without supporting evidence/i);
  });

  test('C — an explicit HIGH confidence survives derivation', () => {
    const k = { ...setProposal(draft(), {
      newValue: [3, 8],
      newProvenance: { verificationStatus: 'cited', sources: ['ev-1'], confidence: 'high' },
    }, ASOF), status: 'approved', evidence: [{ id: 'ev-1', sourceType: 'citation', source: 'DNR', contradicts: false }] };
    const { kcr: pub } = publishKCR(k, { versionId: 'd5', asOf: ASOF });
    expect(pub.proposal.newProvenance.confidence).toBe('high');
    expect(pub.proposal.newProvenance.tier).toBe('researched');   // tier still derived
  });

  test('D — an explicit LOW confidence survives derivation', () => {
    const k = { ...setProposal(draft(), {
      newValue: [3, 8],
      newProvenance: { verificationStatus: 'cited', sources: ['ev-1'], confidence: 'low' },
    }, ASOF), status: 'approved', evidence: [{ id: 'ev-1', sourceType: 'citation', source: 'DNR', contradicts: false }] };
    const { kcr: pub } = publishKCR(k, { versionId: 'd6', asOf: ASOF });
    expect(pub.proposal.newProvenance.confidence).toBe('low');
  });

  test('an explicit TIER survives — derivation never overwrites an author', () => {
    const k = { ...setProposal(draft(), {
      newValue: [3, 8],
      newProvenance: { verificationStatus: 'cited', sources: ['ev-1'], tier: 'culture-bearer' },
    }, ASOF), status: 'approved', evidence: [{ id: 'ev-1', sourceType: 'citation', source: 'DNR', contradicts: false }] };
    const { kcr: pub } = publishKCR(k, { versionId: 'd7', asOf: ASOF });
    expect(pub.proposal.newProvenance.tier).toBe('culture-bearer');
  });

  test('HIGH is never derived — the conservative floor is medium', () => {
    const { kcr: pub } = publishKCR(automated(), { versionId: 'd8', asOf: ASOF });
    expect(pub.proposal.newProvenance.confidence).not.toBe('high');
    expect(pub.proposal.newProvenance.confidence).toBe('medium');
  });

  test('a NON-cited claim is never dressed as researched', () => {
    const k = { ...setProposal(draft(), {
      newValue: [3, 8], newProvenance: { verificationStatus: 'synthesized', sources: [] },
    }, ASOF), status: 'approved' };
    const { kcr: pub, version } = publishKCR(k, { versionId: 'd9', asOf: ASOF });
    expect(pub.proposal.newProvenance.tier).toBeUndefined();
    expect(pub.proposal.newProvenance.confidence).toBeUndefined();
    expect(version.provenance.tier).toBeUndefined();
  });

  test('derivation preserves the conflict failure and the frozen vocabulary', () => {
    const conflicting = { ...draft(), status: 'approved',
      proposal: { newValue: 1, verificationStatus: 'synthesized', newProvenance: { verificationStatus: 'cited' } } };
    expect(() => publishKCR(conflicting, { versionId: 'da', asOf: ASOF })).toThrow(/provenance conflict/i);
    const badConf = { ...draft(), status: 'approved',
      proposal: { newValue: 1, newProvenance: { verificationStatus: 'cited', confidence: 'med' } } };
    expect(() => publishKCR(badConf, { versionId: 'db', asOf: ASOF })).toThrow(/invalid provenance confidence/i);
  });
});
