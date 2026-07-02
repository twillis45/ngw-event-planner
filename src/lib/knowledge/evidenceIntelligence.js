// ─── Evidence Intelligence (KEP-2 Bundle C) ───────────────────────────────────
// Organizes raw evidence: cluster, dedupe, rank authority, measure freshness, and detect
// contradictions. It DETECTS conflicts and emits a conflict-KCR candidate — it NEVER
// resolves them automatically (humans resolve via KCR). Pure. Reuses AUTHORITY_LEVELS +
// the finding→KCR contradiction path.

import { AUTHORITY_LEVELS } from './evidence';

const AUTH_RANK = Object.fromEntries(AUTHORITY_LEVELS.map((a, i) => [a, AUTHORITY_LEVELS.length - i]));
const clusterKey = (e) => `${e.assetId || '?'}::${e.fieldPath || '?'}`;

// Cluster by (asset, field) — the unit a finding concludes over.
export function clusterEvidence(evidence) {
  const clusters = {};
  for (const e of evidence || []) (clusters[clusterKey(e)] = clusters[clusterKey(e)] || []).push(e);
  return clusters;
}

// Dedupe by id (evidence ids are deterministic per source+asset+field → same source twice collapses).
export function dedupeEvidence(evidence) {
  const seen = new Map();
  for (const e of evidence || []) if (!seen.has(e.id)) seen.set(e.id, e);
  return [...seen.values()];
}

export function rankAuthority(evidence) {
  return [...(evidence || [])].sort((a, b) => (AUTH_RANK[b.authorityLevel] || 0) - (AUTH_RANK[a.authorityLevel] || 0));
}

export function freshness(evidence, asOf) {
  const ev = evidence || [];
  const fresh = ev.filter((e) => !e.expirationDate || (asOf && e.expirationDate >= asOf));
  return { total: ev.length, fresh: fresh.length, stale: ev.length - fresh.length,
    level: ev.length === 0 ? 'unknown' : fresh.length === ev.length ? 'high' : fresh.length ? 'medium' : 'low' };
}

// A fact value comparator that treats numeric ranges [a,b] and scalars structurally.
const sameFact = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Detect contradictions WITHIN a cluster: evidence carrying different values for the same
// field, OR an explicit `contradicts` link. Returns conflict descriptors — NOT resolutions.
export function detectContradictions(evidence) {
  const conflicts = [];
  const clusters = clusterEvidence(evidence);
  for (const [key, group] of Object.entries(clusters)) {
    const [assetId, fieldPath] = key.split('::');
    const values = group.flatMap((e) => (e.extractedFacts || []).filter((f) => f.field === fieldPath).map((f) => ({ id: e.id, value: f.value, authority: e.authorityLevel })));
    const distinct = [];
    for (const v of values) if (!distinct.some((d) => sameFact(d.value, v.value))) distinct.push(v);
    const explicit = group.some((e) => e.contradicts && e.contradicts.length);
    if (distinct.length > 1 || explicit) {
      conflicts.push({ assetId, fieldPath, values, distinctValues: distinct.length, explicit,
        // conflict-KCR candidate — routed for human resolution, never auto-resolved.
        conflictKCR: { type: 'contradiction', trigger: 'contradiction', assetId, fieldPath, reason: `Evidence disagrees on ${fieldPath}: ${distinct.map((d) => JSON.stringify(d.value)).join(' vs ')}` } });
    }
  }
  return conflicts;
}

// Full evidence-intelligence pass over a set — the Bundle C summary (dimensional).
export function analyzeEvidence(evidence, asOf) {
  const deduped = dedupeEvidence(evidence);
  return {
    total: (evidence || []).length,
    deduped: deduped.length,
    duplicatesRemoved: (evidence || []).length - deduped.length,
    clusters: Object.keys(clusterEvidence(deduped)).length,
    authorityTop: rankAuthority(deduped)[0]?.authorityLevel || null,
    freshness: freshness(deduped, asOf),
    contradictions: detectContradictions(deduped),
  };
}
