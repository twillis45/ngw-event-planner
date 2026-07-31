// ─── Runtime Knowledge — the single reader seam (KEP-3 Bundle A) ──────────────
// Every runtime consumer (host/planner/coordinator/pro readers) resolves knowledge
// through resolveField() instead of reading canonical values directly. It composes the
// Runtime Resolver (canonical ⊕ published override ⊕ role/context/workspace projection)
// and returns not just a value but the GOVERNANCE CONTEXT every reader must expose:
// source · version · reason · confidence · validation state · rollback.
//
// BACKWARD COMPATIBLE (rule 5): with no published override + identity projections,
// resolveField returns exactly the authored value with source:'authored' — existing
// behavior is the default. Reuses runtimeResolver + knowledgeOverride; no new pipeline.

import { resolveKnowledge } from './runtimeResolver';
import { readAuthored } from './knowledgeOverride';

// The explainable runtime value. `explain()` gives a one-line provenance string for UI.
export function resolveField(asset, fieldPath, ctx = {}) {
  const r = resolveKnowledge(asset, fieldPath, ctx);
  const overridden = r.source === 'override';
  const published = r.source === 'published';
  const governed = overridden || published;             // not the authored file
  return {
    value: r.value,
    source: r.source,                                   // 'authored' | 'published' | 'override'
    authoredValue: governed ? readAuthored(asset, fieldPath) : r.value,
    version: r.provenance?.versionId || r.versionId
      || (overridden ? r.trace.find((t) => t.stage === 'override')?.overrideId : null) || null,
    // Conveyor 1: the KCR and the evidence behind a baked value, so a reader can
    // trace it to the governance record rather than take the number on faith.
    kcrId: r.kcrId || null,
    evidenceIds: r.evidenceIds || [],
    reason: governed ? (r.provenance?.rationale || 'Published via governed KCR') : 'Authored knowledge (no published change)',
    confidence: r.provenance?.confidence || null,       // dimensional/qualitative — never a fabricated %
    validationState: r.provenance?.validationState || 'unvalidated',
    // HONEST ROLLBACK. A local override is reversible in place; a BAKED value is
    // reversible only by rebuilding the snapshot and redeploying. Reporting the
    // baked case as rollback-available would promise something this transport
    // cannot do, so it says false and names the real mechanism.
    rollbackAvailable: overridden,
    rollbackMechanism: overridden ? 'drop the override' : (published ? 'rebuild the snapshot and redeploy' : null),
    trace: r.trace,                                      // full resolution chain, auditable
  };
}

// One-line provenance for a reader chip: "Published v3 · cited · steward" or "Authored".
export function explainField(resolved) {
  if (!resolved || resolved.source === 'authored') return 'Authored';
  return `Published${resolved.version ? ` · ${resolved.version}` : ''}${resolved.confidence ? ` · ${resolved.confidence}` : ''}`;
}

// The snapshot the running bundle is carrying — for a build check or an admin chip.
// Re-exported here so a reader needs ONE import for "what is governed right now".
export { snapshotMeta } from './publishedSnapshot';

// Convenience for readers that only want the value but must stay resolver-routed.
export function fieldValue(asset, fieldPath, ctx) { return resolveField(asset, fieldPath, ctx).value; }
