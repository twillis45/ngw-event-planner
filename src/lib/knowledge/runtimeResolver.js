// ─── Runtime Knowledge Resolver (KF-1 §7) ─────────────────────────────────────
// The single path from canonical knowledge to a rendered value:
//   Canonical Asset → Overrides → Resolution → Role Projection → Context Projection →
//   Workspace Projection → Rendered value.
// Everything resolves from canonical knowledge — no forks, no duplication. PURE and
// OPT-IN: consumers call resolveKnowledge(); nothing here changes host behavior until a
// reader chooses to resolve through it (backward compatible — rule 6/7). Reuses
// effectiveValue (authored ⊕ published override).

import { effectiveValue } from './knowledgeOverride';

// Role/context lenses may narrow or relabel a value without changing canonical knowledge.
// Default lenses are identity — so resolving with no projections === the authored value
// (the backward-compatible guarantee).
const IDENTITY = (v) => v;

export function resolveKnowledge(asset, fieldPath, { role, context, workspace, overrides, roleLens, contextLens, workspaceLens } = {}) {
  // 1–2. Canonical ⊕ override.
  const base = effectiveValue(asset, fieldPath, overrides);
  const trace = [{ stage: 'canonical', value: readCanonicalOnly(asset, fieldPath, base) }];
  let value = base.value;
  if (base.source === 'override') trace.push({ stage: 'override', value, overrideId: base.overrideId });
  // Conveyor 1: a baked published value is its OWN stage in the trace, carrying the
  // KCR and version that authorised it — the lineage a reader needs to answer
  // "who approved this, and when".
  if (base.source === 'published') trace.push({ stage: 'published', value, kcrId: base.kcrId, versionId: base.versionId });

  // 3–5. Projections (identity by default → no behavior change).
  const rl = roleLens || IDENTITY, cl = contextLens || IDENTITY, wl = workspaceLens || IDENTITY;
  value = rl(value, role); if (roleLens) trace.push({ stage: 'role', role, value });
  value = cl(value, context); if (contextLens) trace.push({ stage: 'context', context, value });
  value = wl(value, workspace); if (workspaceLens) trace.push({ stage: 'workspace', workspace, value });

  return {
    value,
    source: base.source,               // 'authored' | 'published' | 'override'
    provenance: base.provenance || null,
    kcrId: base.kcrId || null,
    versionId: base.versionId || null,
    evidenceIds: base.evidenceIds || [],
    trace,                             // every stage, auditable
  };
}

function readCanonicalOnly(asset, fieldPath, base) {
  // When an override or a published value is active, base.value is NOT the authored
  // one; report undefined in the canonical stage rather than restating the served
  // value as if the source file had said it.
  return (base.source === 'override' || base.source === 'published') ? undefined : base.value;
}

// Convenience: does resolving change anything vs. the authored value? (Used to prove
// backward compatibility — with no override and identity lenses, this is always false.)
export function isResolutionInert(asset, fieldPath, opts) {
  const r = resolveKnowledge(asset, fieldPath, opts);
  return r.source === 'authored' && r.trace.length === 1;
}
