// ─── Knowledge Change Request (KCR) — the governed write-side primitive ───────
// The ONE permanent primitive for changing canonical knowledge. Every mutation —
// research, correction, citation, pricing/seasonal/regulation update, SME revision,
// customer feedback, validation finding, AI suggestion, retirement, new knowledge,
// contradiction, missing evidence — is a KCR of a `type`. It replaces the earlier
// "Research Ticket" (research is now KCR{type:'research'}) so no second backlog exists.
//
// KCRs are GOVERNANCE WORK-OBJECTS, not canonical knowledge (Platform Constitution
// Art. I): the Studio owns them; the Knowledge layer owns assets + provenance. A KCR
// writes a versioned change onto an asset ONLY at publish, ONLY with evidence, ONLY
// after review. Nothing edits canonical knowledge directly:
//     Knowledge Asset ▲ Published Version ▲ Approved KCR ▲ Evidence ▲ Insight
//
// Pure + testable (asOf injected, no Date.now) — same discipline as hostIntel.js.
// Reuses the Knowledge Registry (playbookRegistry.js); adds NO registry, NO lifecycle.

import { playbookDependencies, playbookGrounding, playbookFreshness, playbookId } from '../playbooks/playbookRegistry';

// ── Vocabulary ────────────────────────────────────────────────────────────────
export const KCR_TYPES = [
  'research', 'correction', 'citation', 'pricing-update', 'seasonal-update',
  'regulation-update', 'sme-revision', 'customer-feedback', 'validation-finding',
  'ai-suggestion', 'retirement', 'new-knowledge', 'contradiction', 'missing-evidence',
];
// TRIGGER — the causal "WHY is our knowledge changing?" dimension for analytics.
// The single causal taxonomy (replaces the earlier free 'source' field — no duplicate axis).
export const TRIGGERS = [
  'research', 'customer', 'planner', 'coordinator', 'corporate', 'validation',
  'ai', 'freshness', 'regulation', 'incident', 'post-event', 'market-change', 'sme',
];
export const EVIDENCE_TYPES = ['citation', 'document', 'link', 'sme-note', 'dataset', 'primary', 'secondary'];
export const GRAPH_RELATIONS = ['depends_on', 'used_by', 'derived_from', 'supersedes', 'supports', 'contradicts', 'related_to', 'references'];

// Canonical Knowledge Lifecycle (NOT new — maps to KNOWLEDGE_OPERATING_SYSTEM).
export const KCR_STATUS = ['draft', 'researching', 'grounded', 'review', 'approved', 'published', 'monitoring', 'revision', 'archived'];
export const KCR_TRANSITIONS = {
  draft:       ['researching', 'archived'],
  researching: ['grounded', 'archived'],
  grounded:    ['review', 'researching', 'archived'],
  review:      ['approved', 'researching', 'archived'],
  approved:    ['published', 'archived'],
  published:   ['monitoring', 'revision'],
  monitoring:  ['revision', 'archived'],
  revision:    ['researching', 'archived'],
  archived:    [],
};

// ── Insight intake — everything begins as an Insight, becomes ONE KCR ─────────
export function insightToKCR(insight, asOf) {
  return createKCR({
    type: insight.suggestedType || 'research',
    trigger: insight.trigger || 'research',
    assetId: insight.assetId || null,
    assetKind: insight.assetKind || 'playbook',
    fieldPath: insight.fieldPath || null,
    currentValue: insight.currentValue ?? null,
    reason: insight.reason || insight.note || '',
    createdBy: insight.createdBy || 'admin',
    asOf,
  });
}

let _seq = 0; // deterministic within a session; real ids stamped by the store
export function createKCR({ type, trigger, assetId, assetKind = 'playbook', fieldPath = null, currentValue = null, currentProvenance = null, reason = '', createdBy = 'admin', asOf = null }) {
  if (!KCR_TYPES.includes(type)) throw new Error(`KCR: unknown type '${type}'`);
  if (!TRIGGERS.includes(trigger)) throw new Error(`KCR: unknown trigger '${trigger}' (why is this knowledge changing?)`);
  const id = `kcr-${assetId ? playbookId(assetId) + '-' : ''}${type}-${(_seq += 1)}`;
  return {
    id, type, trigger, createdBy, createdAt: asOf,
    assetId, assetKind, fieldPath, currentValue, currentProvenance,
    reason,
    status: 'draft',
    priority: null,        // derived from the Command Center research queue
    impact: null,          // derived by knowledgeImpactPreview()
    evidence: [],
    contradictions: [],
    proposal: null,        // { newValue, newProvenance:{verificationStatus,sources[]}, rationale }
    review: { sme: null, editorial: null, ai: null, governance: null },
    publishedVersion: null,
    rollbackTo: null,
    audit: [{ at: asOf, by: createdBy, action: 'created', note: `type=${type} trigger=${trigger}` }],
  };
}

// ── Immutable mutations (return NEW objects) ──────────────────────────────────
const stamp = (kcr, entry) => ({ ...kcr, audit: [...kcr.audit, entry] });

export function addEvidence(kcr, ev, asOf) {
  const evidence = { id: `ev-${kcr.evidence.length + 1}`, sourceType: 'secondary', confidence: 'medium', supports: null, contradicts: false, capturedAt: asOf, ...ev };
  return stamp({ ...kcr, evidence: [...kcr.evidence, evidence] }, { at: asOf, by: ev.by || 'steward', action: 'evidence-added', note: evidence.source || evidence.url || '' });
}

export function setProposal(kcr, proposal, asOf) {
  return stamp({ ...kcr, proposal: { verificationStatus: 'synthesized', sources: [], ...proposal } }, { at: asOf, by: proposal.by || 'steward', action: 'proposal-set', note: proposal.rationale || '' });
}

export function recordReview(kcr, gate, decision, asOf) {
  if (!['sme', 'editorial', 'ai', 'governance'].includes(gate)) throw new Error(`KCR: unknown review gate '${gate}'`);
  return stamp({ ...kcr, review: { ...kcr.review, [gate]: { by: decision.by, decision: decision.decision, note: decision.note || '', at: asOf } } }, { at: asOf, by: decision.by, action: `review:${gate}`, note: decision.decision });
}

export function advanceKCR(kcr, toStatus, { by = 'steward', note = '', asOf = null } = {}) {
  const legal = KCR_TRANSITIONS[kcr.status] || [];
  if (!legal.includes(toStatus)) throw new Error(`KCR: illegal transition ${kcr.status} → ${toStatus}`);
  if (toStatus === 'review' && !kcr.proposal) throw new Error('KCR: cannot enter review without a proposal');
  if (toStatus === 'approved') {
    const passed = (g) => kcr.review[g] && kcr.review[g].decision === 'approve';
    if (!(passed('sme') && passed('editorial') && passed('governance'))) throw new Error('KCR: approve requires SME + editorial + governance approval (AI is advisory only)');
  }
  return stamp({ ...kcr, status: toStatus }, { at: asOf, by, action: `advanced:${toStatus}`, note });
}

// ── Publish + version lineage + rollback ──────────────────────────────────────
// Publishing is the ONLY write-path to canonical knowledge. It requires an APPROVED
// KCR, mints a version record (the audit trail from insight → published value), and
// records the rollback pointer. A cited proposal requires linked evidence (the gate).
export function publishKCR(kcr, { prevVersion = null, versionId, by = 'publisher', asOf = null } = {}) {
  if (kcr.status !== 'approved') throw new Error('KCR: only an approved KCR may publish');
  if (kcr.proposal && kcr.proposal.verificationStatus === 'cited' && !canReachCited(kcr)) {
    throw new Error('KCR: cannot publish a cited value without supporting evidence');
  }
  const version = {
    id: versionId || `${playbookId(kcr.assetId || 'asset')}-v-${(_seq += 1)}`,
    kcrId: kcr.id, at: asOf, by,
    field: kcr.fieldPath, from: kcr.currentValue, to: kcr.proposal ? kcr.proposal.newValue : null,
    provenance: kcr.proposal ? kcr.proposal.newProvenance : null,
    reason: kcr.reason, trigger: kcr.trigger, supersedes: prevVersion,
  };
  const published = stamp({ ...kcr, status: 'published', publishedVersion: version.id, rollbackTo: prevVersion }, { at: asOf, by, action: 'published', note: version.id });
  return { kcr: published, version };
}

// Roll a published KCR back to its prior version (creates a compensating revision KCR).
export function rollbackKCR(kcr, { by = 'publisher', asOf = null } = {}) {
  if (!kcr.publishedVersion) throw new Error('KCR: nothing published to roll back');
  const reverted = stamp({ ...kcr, status: 'revision' }, { at: asOf, by, action: 'rolled-back', note: `to ${kcr.rollbackTo || 'baseline'}` });
  return reverted;
}

// ── The hard gate: a value may only be `cited` with real linked evidence ──────
export function canReachCited(kcr) {
  return kcr.evidence.some((e) => !e.contradicts && (e.source || e.url) && ['citation', 'primary', 'secondary', 'dataset'].includes(e.sourceType));
}

// ── Dependency / Knowledge Impact Preview — DERIVED, no manual list ───────────
const FIELD_DOWNSTREAM = [
  { re: /unitCostRange|perGuestCost|cost/i, engines: ['budget', 'shopping'], downstream: ['budget', 'shopping', 'sourcing'], readers: ['R2', 'R1'] },
  { re: /qtyPerGuest|qtyFlat|qtyPer|quantity/i, engines: ['shopping', 'budget', 'capacity'], downstream: ['shopping', 'budget', 'capacity'], readers: ['R2'] },
  { re: /decisions|costFactors/i, engines: ['decisions', 'budget'], downstream: ['decisions', 'budget', 'shopping'], readers: [] },
  { re: /tasks|milestones/i, engines: ['timeline'], downstream: ['timeline', 'notifications'], readers: [] },
  { re: /rentalsGap|capacity/i, engines: ['capacity'], downstream: ['capacity'], readers: [] },
  { re: /risks|contingencies/i, engines: ['risks', 'contingencies'], downstream: ['risks'], readers: [] },
  { re: /schedules/i, engines: ['runOfShow'], downstream: ['runOfShow'], readers: [] },
  { re: /vendors/i, engines: ['vendors'], downstream: ['vendors'], readers: [] },
  { re: /attendance|guest/i, engines: ['sizing'], downstream: ['sizing', 'budget', 'shopping'], readers: ['R1'] },
];
export function deriveImpact(pb, fieldPath) {
  const deps = playbookDependencies(pb);
  const m = FIELD_DOWNSTREAM.find((x) => fieldPath && x.re.test(fieldPath));
  const engines = m ? m.engines : ['shopping', 'budget'];
  const downstream = m ? m.downstream : ['shopping', 'budget'];
  const allAffects = (pb.decisions || []).flatMap((d) => d.affects || []);
  const affectedPurchases = fieldPath ? [...new Set(allAffects.filter((a) => fieldPath.includes(a)))] : [...new Set(allAffects)];
  const viaDecisions = fieldPath
    ? (pb.decisions || []).filter((d) => (d.affects || []).some((a) => fieldPath.includes(a))).map((d) => d.id)
    : (pb.decisions || []).map((d) => d.id);
  return { engines, downstream, affectedPurchases, viaDecisions, vendorCategories: deps.vendorCategories, note: 'Derived from field kind + decision→purchase affects wiring — no manual list.' };
}

// The full Knowledge Impact Preview shown BEFORE publish. Derivable categories are
// computed; categories that need an index we don't have (prompts/tests/templates)
// are honest-empty with a reason — NEVER fabricated (Honesty doctrine).
export function knowledgeImpactPreview(pb, fieldPath) {
  const imp = deriveImpact(pb, fieldPath);
  return {
    playbooks: [pb.type],                                  // this asset (cross-asset edges: graph, future)
    recommendationEngines: imp.engines,                    // which corpus engines re-read
    readers: imp.readers || [],                            // Intelligence Readers Registry entries touched
    knowledgePackages: [pb.family || pb.solveFamily].filter(Boolean),
    affectedPurchases: imp.affectedPurchases,
    viaDecisions: imp.viaDecisions,
    downstream: imp.downstream,
    // Not runtime-derivable without a build-time index — honest-empty, not fabricated:
    prompts: { known: false, note: 'No prompt index at runtime — resolve via CI grep of aiProxy features' },
    tests: { known: false, note: 'No test index at runtime — CI maps changed fields → affected specs' },
    templates: { known: false, note: 'No template index yet (projections derive from this asset)' },
  };
}

// When one asset's field changes, derive the KCRs its downstream dependents need.
export function deriveDependentKCRs(pb, fieldPath, asOf) {
  return deriveImpact(pb, fieldPath).downstream.map((eng) => createKCR({
    type: 'correction', trigger: 'market-change', assetId: pb.type, assetKind: 'playbook',
    fieldPath: `~${eng}`, reason: `Downstream of a change to ${pb.type}.${fieldPath} — re-verify ${eng}`,
    createdBy: 'dependency-engine', asOf,
  }));
}

// ── Knowledge Confidence — component-based, DERIVED, never one AI score ────────
export function deriveKnowledgeConfidence(pb, asOf, { validationN = 0 } = {}) {
  const g = playbookGrounding(pb);
  const f = playbookFreshness(pb, asOf);
  const c = (component, level, reason) => ({ component, level, reason });
  return {
    components: [
      c('Evidence', g.pricedItems === 0 ? 'unknown' : g.cited > 0 ? 'high' : g.consensus === g.pricedItems ? 'medium' : 'low',
        `${g.cited} cited / ${g.consensus} consensus / ${g.synthesized} synthesized of ${g.pricedItems} priced`),
      c('Sources', g.hasSources ? 'high' : 'low', g.hasSources ? 'knowledge.sources present' : 'knowledge.sources empty'),
      c('Freshness', !f.known ? 'unknown' : f.overdue ? 'low' : 'high', f.reason),
      c('Validation', validationN >= 8 ? 'high' : validationN > 0 ? 'medium' : 'unknown',
        validationN > 0 ? `${validationN} scored events` : 'Awaiting completed events'),
    ],
  };
}
