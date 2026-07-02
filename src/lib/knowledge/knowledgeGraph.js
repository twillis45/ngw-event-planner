// ─── Knowledge Graph — generalized relationship model (KF-1 §2) ───────────────
// A DERIVED graph (no DB) over the whole knowledge estate: assets of many kinds +
// evidence + findings + KCRs, connected by canonical relationships. Built on demand from
// the linked* fields already on each object, so it scales to 40k assets without redesign
// (one O(n) pass). Reuses GOVERNED_ASSET_KINDS + GRAPH_RELATIONS — no new registry.

import { GOVERNED_ASSET_KINDS } from './governedAsset';
import { GRAPH_RELATIONS } from './knowledgeChange';

// The full relationship vocabulary (GRAPH_RELATIONS + KF-1 variant/lineage edges).
export const RELATIONSHIP_TYPES = Array.from(new Set([
  ...GRAPH_RELATIONS, 'regional_variant', 'seasonal_variant',
]));

// Asset kinds the factory manufactures for — generalized beyond playbooks. Domain kinds
// (food/recipe/vendor/venue/…) map onto the governed kinds via `domain` metadata; the
// graph treats any node with a `type` + `kind` uniformly.
export const KNOWLEDGE_DOMAINS = [
  'playbook', 'food', 'recipe', 'vendor', 'venue', 'equipment', 'entertainment',
  'transportation', 'hospitality', 'accessibility', 'corporate-standard', 'culture',
  'regional-practice', 'pricing', 'regulation', 'weather', 'guest-psychology',
  'failure-intelligence', 'success-intelligence', 'operations', 'template', 'policy',
  'guide', 'checklist',
];
export function isKnownDomain(d) { return KNOWLEDGE_DOMAINS.includes(d); }

const node = (id, kind, label, extra = {}) => ({ id, kind, label, ...extra });
const edge = (from, to, rel) => ({ from, to, rel });

// Build the graph from the estate. All inputs optional (honest-empty). Pure.
export function buildKnowledgeGraph({ assets = [], evidence = [], findings = [], kcrs = [] } = {}) {
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const add = (n) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };

  for (const a of assets) {
    const id = `asset:${a.type}`;
    add(node(id, a.kind || 'playbook', a.type, { domain: a.domain || a.kind || 'playbook' }));
    // depends_on / used_by from authored dependencies
    for (const dep of a.dependsOn || []) { add(node(`asset:${dep}`, 'playbook', dep)); edges.push(edge(id, `asset:${dep}`, 'depends_on')); }
    for (const rv of a.regionalVariants || []) edges.push(edge(id, `asset:${rv}`, 'regional_variant'));
    for (const sv of a.seasonalVariants || []) edges.push(edge(id, `asset:${sv}`, 'seasonal_variant'));
  }
  for (const e of evidence) {
    const id = `evidence:${e.id}`;
    add(node(id, 'evidence', e.source, { authorityLevel: e.authorityLevel }));
    for (const aId of e.linkedAssets || (e.assetId ? [e.assetId] : [])) edges.push(edge(id, `asset:${aId}`, (e.contradicts && e.contradicts.length) ? 'contradicts' : 'supports'));
  }
  for (const f of findings) {
    const id = `finding:${f.id}`;
    add(node(id, 'finding', f.conclusion || f.id));
    for (const evId of f.evidenceIds || []) edges.push(edge(id, `evidence:${evId}`, 'derived_from'));
    for (const aId of f.affectedAssets || []) edges.push(edge(id, `asset:${aId}`, 'references'));
  }
  for (const k of kcrs) {
    const id = `kcr:${k.id}`;
    add(node(id, 'kcr', k.reason || k.id, { status: k.status }));
    if (k.assetId) edges.push(edge(id, `asset:${k.assetId}`, 'references'));
    if (k.findingId) edges.push(edge(`finding:${k.findingId}`, id, 'derived_from'));
    if (k.rollbackTo) edges.push(edge(id, `kcr:${k.rollbackTo}`, 'supersedes'));
  }

  // Keep only edges whose endpoints exist (honest graph; no dangling references).
  const present = new Set(nodes.map((n) => n.id));
  const liveEdges = edges.filter((e) => present.has(e.from) && present.has(e.to));

  return {
    nodes, edges: liveEdges,
    stats: {
      nodeCount: nodes.length,
      edgeCount: liveEdges.length,
      byKind: countBy(nodes, (n) => n.kind),
      byRelation: countBy(liveEdges, (e) => e.rel),
      assetKinds: GOVERNED_ASSET_KINDS,
    },
  };
}

// Neighbors of a node in a direction — the primitive the dependency engine walks.
export function neighbors(graph, id, { direction = 'out' } = {}) {
  return graph.edges
    .filter((e) => (direction === 'out' ? e.from === id : e.to === id))
    .map((e) => ({ id: direction === 'out' ? e.to : e.from, rel: e.rel }));
}

function countBy(arr, keyFn) {
  return arr.reduce((m, x) => { const k = keyFn(x); m[k] = (m[k] || 0) + 1; return m; }, {});
}
