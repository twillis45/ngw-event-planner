// ─── Governance divergence detection (Phase 5F.4.1) ──────────────────────────
//
// Both scenarios below are REAL — they happened in this session and nothing reported
// either one. The tests reconstruct them exactly.
import {
  detectDivergence, divergenceSummary, DIVERGENCE_KINDS, firstGovernanceGuard,
} from './governanceDivergence';

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

// ─── THE BLOCKING GUARD (Phase 5F.5) ─────────────────────────────────────────
describe('firstGovernanceGuard — refuses to CREATE the divergence', () => {
  const inFlight = (assetId, fieldPath, status) => ({
    id: `k-${status}`, status, assetId, fieldPath, proposal: {}, evidence: [], review: {}, audit: [],
  });

  test('an unrelated, ungoverned field is allowed', () => {
    const g = firstGovernanceGuard('Fish Fry', 'p_ice.provenance', [], []);
    expect(g.ok).toBe(true);
    expect(g.blocked).toBe(false);
  });

  test('THE MEASURED DEFECT — store published, snapshot empty, is BLOCKED', () => {
    // This is exactly the state that produced the duplicate: the snapshot (which is all
    // `doCorrect` consulted) says ungoverned, and the store says published.
    const store = [kcr('Crab Feast', 'p_ice.provenance', 'v1', { tier: 'researched' })];
    const g = firstGovernanceGuard('Crab Feast', 'p_ice.provenance', store, []);
    expect(g.ok).toBe(false);
    expect(g.kind).toBe('already-published-in-store');
    expect(g.ids).toEqual(['k-Crab Feast-v1']);
    expect(g.reason).toMatch(/second lineage with no parent/);
    expect(g.reason).toMatch(/Correct the existing record instead/);
  });

  test('a change already in review is BLOCKED — the same collision, one step earlier', () => {
    for (const status of ['draft', 'researching', 'grounded', 'review', 'approved']) {
      const g = firstGovernanceGuard('A', 'p_x.provenance', [inFlight('A', 'p_x.provenance', status)], []);
      expect(g.ok).toBe(false);
      expect(g.kind).toBe('change-already-in-flight');
      expect(g.reason).toContain(status);
    }
  });

  test('a field already SERVING from the snapshot is BLOCKED even with an empty store', () => {
    const g = firstGovernanceGuard('A', 'p_x.provenance', [], [entry('A', 'p_x.provenance', 1, 'v1')]);
    expect(g.ok).toBe(false);
    expect(g.kind).toBe('already-serving');
    expect(g.reason).toMatch(/a correction, not a first governance/);
  });

  test('CLOSED records do not block — a rejected attempt must not wedge the field forever', () => {
    for (const status of ['rejected', 'abandoned', 'archived', 'deprecated']) {
      const g = firstGovernanceGuard('A', 'p_x.provenance', [inFlight('A', 'p_x.provenance', status)], []);
      expect(g.ok).toBe(true);
    }
  });

  test('it is scoped to ONE field — a sibling field on the same asset does not block', () => {
    const store = [kcr('Crab Feast', 'p_ice.provenance', 'v1', 1)];
    expect(firstGovernanceGuard('Crab Feast', 'p_oldbay.provenance', store, []).ok).toBe(true);
    expect(firstGovernanceGuard('Fish Fry', 'p_ice.provenance', store, []).ok).toBe(true);
  });

  test('it blocks and explains, but never repairs or instructs a deletion', () => {
    const store = [kcr('A', 'p_x.provenance', 'v1', 1)];
    const g = firstGovernanceGuard('A', 'p_x.provenance', store, []);
    // Same rule the detector follows: name what exists, never order a destructive fix.
    expect(g.reason).not.toMatch(/\b(delete|remove|discard)\b/i);
    expect(Array.isArray(g.ids)).toBe(true);
  });

  test('missing arguments do not throw or block — the guard is not a validator', () => {
    expect(firstGovernanceGuard(null, null, [], []).ok).toBe(true);
    expect(firstGovernanceGuard('A', 'p_x.provenance', null, null).ok).toBe(true);
  });
});
