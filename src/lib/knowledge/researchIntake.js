// ─── Research Queue → KCR Intake (KCR-2) ──────────────────────────────────────
// The FIRST real insight source wired into the KCR pipeline. The Knowledge Command
// Center already DERIVES a research queue (playbookResearch → buildPlaybookRegistry
// .research); this converts each actionable item into an Insight and then a KCR via
// the existing primitive. No new backlog, no new queue — the queue IS the intake.
//
// Deterministic + idempotent: the same research item always yields the same KCR id,
// so re-running intake (or a duplicated queue item) NEVER creates a duplicate KCR.
// Pure (asOf injected). No persistence, no UI, no AI — pure derivation.

import { buildPlaybookRegistry, playbookId } from '../playbooks/playbookRegistry';
import { getPlaybook } from '../playbooks/index';
import { createKCR, knowledgeImpactPreview } from './knowledgeChange';

// Research-kind → KCR mapping. Each research reason maps to a KCR type + causal trigger
// + the exact field locus it targets. (The Command Center research kinds are:
// pricing · review · cadence · food-safety · sources — see playbookResearch.)
export const RESEARCH_KIND_MAP = {
  pricing:       { type: 'citation',         trigger: 'research',  fieldPath: 'purchases[].unitCostRange' },
  sources:       { type: 'missing-evidence', trigger: 'research',  fieldPath: 'knowledge.sources' },
  cadence:       { type: 'correction',       trigger: 'freshness', fieldPath: 'governance' },
  review:        { type: 'sme-revision',     trigger: 'freshness', fieldPath: 'governance.lastReviewed' },
  'food-safety': { type: 'sme-revision',     trigger: 'sme',       fieldPath: 'risks' },
};

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Deterministic dedupe key = (asset, kind-target). Two research items on the SAME
// asset+target collapse to one KCR; different targets stay distinct.
export function intakeKcrId(assetId, kind) {
  const m = RESEARCH_KIND_MAP[kind];
  return `kcr-cc-${playbookId(assetId)}-${slug(m ? m.fieldPath : kind)}`;
}

// One research item → an Insight (the intake shape). Null for unmappable items.
export function researchItemToInsight(item) {
  if (!item || !item.type) return null;              // malformed: no asset
  const m = RESEARCH_KIND_MAP[item.kind];
  if (!m) return null;                               // unknown kind → skip (don't guess)
  return {
    trigger: m.trigger,
    suggestedType: m.type,
    assetId: item.type,                              // research item's `type` = the asset type
    assetKind: 'playbook',
    fieldPath: m.fieldPath,
    reason: item.reason || '',
    priority: item.priority || 'low',
    createdBy: 'command-center',
  };
}

// One research item → a fully-formed KCR (deterministic id + derived priority + impact).
// Returns null when the item is malformed or its asset resolves to no playbook.
export function researchItemToKCR(item, asOf) {
  const insight = researchItemToInsight(item);
  if (!insight) return null;
  const pb = getPlaybook(insight.assetId);
  if (!pb) return null;                              // malformed asset — skip gracefully
  const kcr = createKCR({
    id: intakeKcrId(insight.assetId, item.kind),
    type: insight.suggestedType,
    trigger: insight.trigger,
    assetId: insight.assetId,
    assetKind: 'playbook',
    fieldPath: insight.fieldPath,
    reason: insight.reason,
    createdBy: 'command-center',
    asOf,
  });
  // Priority + impact DERIVE from existing registry/health/dependency data.
  return { ...kcr, priority: insight.priority, impact: knowledgeImpactPreview(pb, insight.fieldPath) };
}

// A list of research items → deduped KCRs (first occurrence of each id wins).
export function researchItemsToKCRs(items, asOf) {
  const byId = new Map();
  for (const item of items || []) {
    const kcr = researchItemToKCR(item, asOf);
    if (kcr && !byId.has(kcr.id)) byId.set(kcr.id, kcr);
  }
  return [...byId.values()];
}

// The whole live Command Center research queue → deduped KCRs. This is the wired path.
export function researchQueueToKCRs(asOf) {
  const reg = buildPlaybookRegistry(asOf);
  return researchItemsToKCRs(reg.research, asOf);
}
