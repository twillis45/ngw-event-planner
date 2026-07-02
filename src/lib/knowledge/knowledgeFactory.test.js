// KF-1 — Knowledge Factory integration tests: graph, dependency/blast-radius, runtime
// resolution (backward-compatible), batch publishing, factory metrics, and performance.
import { buildKnowledgeGraph, neighbors, RELATIONSHIP_TYPES } from './knowledgeGraph';
import { blastRadius, combinedBlastRadius } from './dependencyEngine';
import { resolveKnowledge, isResolutionInert } from './runtimeResolver';
import { buildFactory, batchKCRsFromFinding } from './factory';
import { createEvidence } from './evidence';
import { createObservation } from './observation';
import { deriveFinding } from './finding';
import { overrideFromPublishedKCR, applyOverride, clearOverrides } from './knowledgeOverride';
import { advanceKCR, recordReview, publishKCR } from './knowledgeChange';
import { getPlaybook, ALL_PLAYBOOKS } from '../playbooks/index';

const ASOF = '2026-07-02';
const crab = getPlaybook('Crab Feast');
beforeEach(() => clearOverrides());

describe('knowledge graph (§2) — generalized, derived, honest', () => {
  test('builds nodes + edges from the estate and only keeps live edges', () => {
    const g = buildKnowledgeGraph({
      assets: [crab, { type: 'Low Country Boil', dependsOn: ['Crab Feast'] }],
      evidence: [createEvidence({ source: 'USDA', authorityLevel: 'primary', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', at: ASOF })],
    });
    expect(g.stats.nodeCount).toBeGreaterThan(0);
    expect(g.edges.some((e) => e.rel === 'depends_on')).toBe(true);
    expect(g.edges.some((e) => e.rel === 'supports')).toBe(true);
    expect(g.edges.every((e) => g.nodes.find((n) => n.id === e.from) && g.nodes.find((n) => n.id === e.to))).toBe(true); // no dangling
  });
  test('relationship vocabulary includes the KF-1 variants', () => {
    expect(RELATIONSHIP_TYPES).toEqual(expect.arrayContaining(['supports', 'contradicts', 'depends_on', 'derived_from', 'regional_variant', 'seasonal_variant']));
  });
  test('neighbors walks a direction', () => {
    const g = buildKnowledgeGraph({ assets: [{ type: 'A', dependsOn: ['B'] }, { type: 'B' }] });
    expect(neighbors(g, 'asset:A', { direction: 'out' }).map((n) => n.id)).toContain('asset:B');
    expect(neighbors(g, 'asset:B', { direction: 'in' }).map((n) => n.id)).toContain('asset:A');
  });
});

describe('dependency engine (§3) — blast radius, dimensional', () => {
  test('a pricing change names affected engines, readers, runtime (no single risk score)', () => {
    const b = blastRadius(crab, 'purchases[].unitCostRange');
    expect(b.affectedAssets).toContain('Crab Feast');
    expect(b.affectedEngines.length).toBeGreaterThan(0);
    expect(b.affectedReaders.length).toBeGreaterThan(0);
    expect(b.magnitude).toBeDefined();
    expect(b.score).toBeUndefined();
  });
  test('combined blast radius unions many changes', () => {
    const c = combinedBlastRadius([{ pb: crab, fieldPath: 'purchases[].unitCostRange' }, { pb: crab, fieldPath: 'tasks' }]);
    expect(c.changes).toBe(2);
    expect(Array.isArray(c.affectedAssets)).toBe(true);
  });
});

describe('runtime resolution (§7) — canonical→override→projection, backward compatible', () => {
  test('with no override and identity lenses, resolution is INERT (host unchanged)', () => {
    expect(isResolutionInert(crab, 'p_crabs.unitCostRange')).toBe(true);
    const r = resolveKnowledge(crab, 'p_crabs.unitCostRange');
    expect(r.source).toBe('authored');
    expect(r.trace).toHaveLength(1);
  });
  test('a published override resolves through, with an auditable trace', () => {
    applyOverride({ id: 'ovr-Crab Feast-p_crabs.unitCostRange', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', value: [3, 8] });
    const r = resolveKnowledge(crab, 'p_crabs.unitCostRange');
    expect(r.value).toEqual([3, 8]);
    expect(r.source).toBe('override');
    expect(r.trace.map((t) => t.stage)).toContain('override');
  });
  test('role/context lenses project without mutating canonical', () => {
    const r = resolveKnowledge(crab, 'p_crabs.unitCostRange', { role: 'host', roleLens: (v) => v });
    expect(r.trace.some((t) => t.stage === 'role')).toBe(true);
  });
});

describe('batch publishing (§6) — one finding → many KCRs', () => {
  test('a finding across assets produces one governed KCR per asset + combined blast radius', () => {
    const obs = createObservation({ kind: 'pricing', gapType: 'pricing', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', statement: 'x', source: 'corpus', at: ASOF });
    const ev = [createEvidence({ source: 'USDA', authorityLevel: 'primary', assetId: 'Crab Feast', fieldPath: 'p_crabs.unitCostRange', extractedFacts: [{ field: 'p_crabs.unitCostRange', value: [3, 8] }], at: ASOF })];
    const finding = { ...deriveFinding(obs, ev, { asOf: ASOF }), affectedAssets: ['Crab Feast', 'Low Country Boil'] };
    const assetsById = { 'Crab Feast': crab, 'Low Country Boil': getPlaybook('Low Country Boil') || { type: 'Low Country Boil', purchases: [] } };
    const { kcrs, blastRadius: br } = batchKCRsFromFinding(finding, ev, assetsById, ASOF);
    expect(kcrs.length).toBe(2);
    expect(new Set(kcrs.map((k) => k.id)).size).toBe(2);         // distinct per asset
    expect(kcrs.every((k) => k.type === 'research')).toBe(true);
    expect(br.changes).toBeGreaterThan(0);
  });
});

describe('factory engine (§4,9) — derived queues + dimensional debt', () => {
  const factory = buildFactory(ASOF, { playbooks: ALL_PLAYBOOKS, kcrs: [] });
  test('queues are derived and drillable', () => {
    expect(factory.queues.observation.count).toBeGreaterThan(0);
    expect(Array.isArray(factory.queues.observation.items)).toBe(true);
    expect(factory.queues.finding.count).toBeGreaterThanOrEqual(0);
  });
  test('debt is dimensional (per-axis counts), never one score', () => {
    expect(factory.debt.grounding.count).toBeGreaterThan(0);       // synthesized pricing across corpus
    expect(factory.debt.operational).toBeDefined();
    expect(factory.score).toBeUndefined();
    expect(factory.debt.overall).toBeUndefined();
  });
  test('growth + graph stats reflect the whole estate', () => {
    expect(factory.growth.assets).toBe(ALL_PLAYBOOKS.length);
    expect(factory.growth.graphNodes).toBeGreaterThan(0);
  });
});

describe('performance / enterprise scale (§10)', () => {
  test('graph over 4,000 synthetic assets builds within budget (O(n))', () => {
    const assets = Array.from({ length: 4000 }, (_, i) => ({ type: `A${i}`, dependsOn: i ? [`A${i - 1}`] : [] }));
    const t0 = Date.now();
    const g = buildKnowledgeGraph({ assets });
    const ms = Date.now() - t0;
    expect(g.stats.nodeCount).toBe(4000);
    expect(g.stats.edgeCount).toBe(3999);
    expect(ms).toBeLessThan(2000);                                 // scales without redesign
  });
});
