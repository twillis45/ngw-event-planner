// ─── Governance divergence detection (Phase 5F.4.1) ──────────────────────────
//
// Both scenarios below are REAL — they happened in this session and nothing reported
// either one. The tests reconstruct them exactly.
import { detectDivergence, divergenceSummary, DIVERGENCE_KINDS } from './governanceDivergence';

const kcr = (assetId, fieldPath, version, value, rollbackTo = null) => ({
  id: `k-${assetId}-${version}`, status: 'published', assetId, fieldPath,
  publishedVersion: version, rollbackTo,
  proposal: { newValue: value }, evidence: [], review: {}, audit: [],
});
const entry = (assetId, fieldPath, value, kcrId) => ({ assetId, fieldPath, value, kcrId });

describe('agreement is silent', () => {
  test('a store and snapshot that agree produce no findings', () => {
    const s = [kcr('Fish Fry', 'p_ice.qtyPerGuest', 'v1', 2)];
    const snap = [entry('Fish Fry', 'p_ice.qtyPerGuest', 2, 'v1')];
    const r = detectDivergence(s, snap);
    expect(r.ok).toBe(true);
    expect(r.findings).toEqual([]);
    expect(divergenceSummary(r)).toMatch(/agree/);
  });

  test('empty on both sides is agreement, not a finding', () => {
    expect(detectDivergence([], []).ok).toBe(true);
  });

  test('only PUBLISHED records are considered', () => {
    const s = [{ ...kcr('Fish Fry', 'p_ice.qtyPerGuest', 'v1', 2), status: 'review' }];
    expect(detectDivergence(s, []).ok).toBe(true);
  });
});

describe('REAL SCENARIO 1 — duplicate first-governance lineage', () => {
  // Crab Feast p_ice.provenance was published in the store while the snapshot had been
  // restored to HEAD. The picker offered a FIRST-GOVERNANCE path for an already-governed
  // field, and a second parentless record was created.
  test('two published heads on one field, neither superseding, is the top finding', () => {
    const s = [
      kcr('Crab Feast', 'p_ice.provenance', 'v1', { tier: 'researched', sources: ['reddy-ice-2026'] }),
      kcr('Crab Feast', 'p_ice.provenance', 'v2', { tier: 'researched', sources: ['bar-provision-2026'] }),
    ];
    const r = detectDivergence(s, []);
    expect(r.ok).toBe(false);
    expect(r.findings[0].kind).toBe('duplicate-first-governance');      // ranked first
    expect(r.findings[0].heads.sort()).toEqual(['v1', 'v2']);
    expect(r.findings[0].detail).toMatch(/pick one by ordering, not by lineage/);
  });

  test('a HEALTHY chain — v2 supersedes v1 — is not flagged', () => {
    const s = [
      kcr('Crab Feast', 'p_ice.provenance', 'v1', { tier: 'researched' }),
      kcr('Crab Feast', 'p_ice.provenance', 'v2', { tier: 'researched' }, 'v1'),
    ];
    const dup = detectDivergence(s, [entry('Crab Feast', 'p_ice.provenance', { tier: 'researched' }, 'v2')])
      .findings.filter((f) => f.kind === 'duplicate-first-governance');
    expect(dup).toEqual([]);
  });
});

describe('REAL SCENARIO 2 — published locally, not serving', () => {
  // Five corrections sat published in the store and absent from the snapshot, so the
  // Acquisition workspace reported "2 published" while the store held ten.
  test('a store record with no snapshot entry is reported', () => {
    const s = [kcr('The Cookout', 'p_ice.provenance', 'v1', { tier: 'researched' })];
    const r = detectDivergence(s, []);
    const f = r.findings.find((x) => x.kind === 'published-locally-not-serving');
    expect(f).toBeTruthy();
    expect(f.detail).toMatch(/No host is seeing it/);
    expect(f.detail).toMatch(/treat the field as ungoverned/);
  });
});

describe('stale browser state and value disagreement', () => {
  test('runtime serving a record the store does not hold is STALE LOCAL', () => {
    const r = detectDivergence([], [entry('Retirement Party', 'p_wine.provenance', { tier: 'researched' }, 'v9')]);
    const f = r.findings.find((x) => x.kind === 'stale-local-state');
    expect(f).toBeTruthy();
    expect(f.detail).toMatch(/browser state is behind the snapshot/);
  });

  test('both sides present but DIFFERENT values is reported without blame', () => {
    const s = [kcr('Fish Fry', 'p_ice.qtyPerGuest', 'v1', 2)];
    const snap = [entry('Fish Fry', 'p_ice.qtyPerGuest', 1.5, 'v1')];
    const f = detectDivergence(s, snap).findings.find((x) => x.kind === 'value-disagreement');
    expect(f).toBeTruthy();
    expect(f.detail).toMatch(/Neither side is assumed correct/);
  });
});

describe('it detects and does not repair', () => {
  test('every finding kind is a declared kind', () => {
    const s = [
      kcr('A', 'p_x.provenance', 'v1', 1), kcr('A', 'p_x.provenance', 'v2', 2),
      kcr('B', 'p_y.provenance', 'v1', 1),
    ];
    const snap = [entry('C', 'p_z.provenance', 3, 'v3')];
    for (const f of detectDivergence(s, snap).findings) {
      expect(DIVERGENCE_KINDS).toContain(f.kind);
    }
  });

  test('findings carry ids to act on but never an instruction', () => {
    const s = [kcr('A', 'p_x.provenance', 'v1', 1), kcr('A', 'p_x.provenance', 'v2', 2)];
    const f = detectDivergence(s, []).findings[0];
    expect(Array.isArray(f.ids)).toBe(true);
    // A detector that says "delete this" would sometimes destroy real work: which side
    // is right is a human judgement, and the store may legitimately be ahead of a bake.
    expect(f.detail).not.toMatch(/\b(delete|remove|discard|fix by|run )\b/i);
  });

  test('the summary reports and disclaims', () => {
    const s = [kcr('A', 'p_x.provenance', 'v1', 1)];
    expect(divergenceSummary(detectDivergence(s, []))).toMatch(/nothing is reconciled automatically/);
  });
});
