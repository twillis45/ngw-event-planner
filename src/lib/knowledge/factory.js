// ─── Knowledge Factory — the manufacturing engine (KF-1 §1,4,6,9) ─────────────
// Composes the whole line into one DERIVED view: the queues (observation → evidence →
// finding → review → publishing → validation), the dimensional debt/velocity metrics, and
// batch publishing (one finding → many KCRs). Everything is derived from the estate +
// existing engines — no fabricated metrics, never a single score. Reuses corpusConnector,
// evaluateAsset, corpusDimensionKCRs, buildPlaybookRegistry, blastRadius, findingToKCR.

import { corpusConnector } from './connectors';
import { evaluateAsset, corpusDimensionKCRs } from './dimensions';
import { findingToKCR } from './finding';
import { buildKnowledgeGraph } from './knowledgeGraph';
import { combinedBlastRadius } from './dependencyEngine';

const OPEN = ['draft', 'researching', 'grounded'];
const REVIEW = ['review'];
const PUBLISHING = ['approved'];
const VALIDATION = ['published', 'monitoring'];

// ── The factory view — derived, dimensional, honest-empty ─────────────────────
export function buildFactory(asOf, { playbooks = [], kcrs = [] } = {}) {
  const observations = corpusConnector.observe({ asOf });               // gap → observation
  const byStatus = (set) => kcrs.filter((k) => set.includes(k.status));

  // Debt — DIMENSIONAL. Each is an honest count of assets failing that axis (no rollup).
  const dims = playbooks.map((pb) => ({ pb, d: evaluateAsset(pb, 'playbook', asOf) }));
  const failing = (id) => dims.filter(({ d }) => d.some((x) => x.id === id && (x.status === 'gap' || x.status === 'warn'))).map(({ pb }) => pb.type);
  const debt = {
    grounding: failing('Grounding'),
    freshness: failing('Freshness'),
    coverage: failing('Sections'),
    operational: failing('Operational completeness'),
    commercial: failing('Cost integrity'),
    foodSafety: failing('Food safety'),
  };

  // Evidence reuse — evidence referenced by >1 finding (honest 0 until findings exist).
  const findingKCRs = corpusDimensionKCRs(asOf, playbooks);              // finding-stage output

  const graph = buildKnowledgeGraph({ assets: playbooks, kcrs });

  return {
    asOf,
    queues: {
      observation: { count: observations.length, items: observations },
      evidence: { count: 0, items: [] },                                 // honest-empty until evidence recorded
      finding: { count: findingKCRs.length, items: findingKCRs },
      review: { count: byStatus(REVIEW).length, items: byStatus(REVIEW) },
      publishing: { count: byStatus(PUBLISHING).length, items: byStatus(PUBLISHING) },
      validation: { count: byStatus(VALIDATION).length, items: byStatus(VALIDATION) },
    },
    // Flow metrics — dimensional, derived.
    flow: {
      openWork: byStatus(OPEN).length,
      reviewBacklog: byStatus(REVIEW).length,
      publicationVelocity: byStatus(VALIDATION).length,                  // published + monitoring
      researchVelocity: observations.length,
      evidenceReuse: 0,                                                  // honest until evidence graph populated
    },
    // Debt — dimensional counts (never averaged into a health score).
    debt: Object.fromEntries(Object.entries(debt).map(([k, v]) => [k, { count: v.length, assets: v }])),
    growth: { assets: playbooks.length, graphNodes: graph.stats.nodeCount, graphEdges: graph.stats.edgeCount },
    graphStats: graph.stats,
  };
}

// ── Batch publishing (§6): one Finding → many KCRs across affected assets ──────
// Each affected asset gets its own governed KCR (deterministic id, reuses findingToKCR);
// nothing publishes here — they enter the pipeline. Returns the KCRs + combined blast radius.
export function batchKCRsFromFinding(finding, evidence, assetsById, asOf) {
  const kcrs = (finding.affectedAssets || []).map((assetId) => {
    const pb = assetsById[assetId];
    const perAssetFinding = { ...finding, affectedAssets: [assetId] };
    return findingToKCR(perAssetFinding, evidence, pb, asOf);
  }).filter(Boolean);
  const changes = kcrs.map((k) => ({ pb: assetsById[k.assetId], fieldPath: k.fieldPath })).filter((c) => c.pb);
  return { kcrs, blastRadius: changes.length ? combinedBlastRadius(changes) : { changes: 0, affectedAssets: [], affectedEngines: [], affectedReaders: [], affectedRuntime: [], perChange: [] } };
}
