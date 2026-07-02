// ─── Playbook Intelligence — the Dimension framework (Quality OS) ─────────────
// Matures playbookHealth into governed quality DIMENSIONS. A Dimension is a pure,
// independent evaluator of one quality axis; it EVALUATES, never writes; it RECOMMENDS
// KCRs, never edits. No single score, dimensions are never averaged (EP-2/DL-007), and
// an undeterminable axis returns 'n/a' — honest-empty, never fabricated.
// See docs/architecture/PLAYBOOK_INTELLIGENCE_OS.md.
//
// EP-1: reuses the existing engine — the 12 playbookHealth checks BECOME dimensions
// (wrapped into the richer 7-field contract); Operational Completeness is the first NEW
// dimension. Failing dimensions route to KCR via the existing insight→KCR path.

import { playbookHealth, playbookCoverage, playbookId } from '../playbooks/playbookRegistry';
import { createKCR, knowledgeImpactPreview } from './knowledgeChange';
import { ALL_PLAYBOOKS } from '../playbooks/index';
import { reconcileKCRs } from './kcrStore';

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The 7-field Dimension output contract (the one primitive's shape).
// { status, reason, evidence, missingEvidence, recommendedKCRs, affectedEngines, reviewInterval }

// Per-dimension config: which KCR type a failure opens, and the re-evaluation cadence.
const KCR_TYPE_BY_DIM = {
  Grounding: 'grounding-gap',
  'Cost integrity': 'quality-gap', Sections: 'quality-gap', Shopping: 'quality-gap',
  Timeline: 'quality-gap', Decisions: 'quality-gap', Risks: 'quality-gap',
  Contingencies: 'quality-gap', 'Food safety': 'quality-gap', Freshness: 'correction',
  Governance: 'correction', Validation: 'validation-finding',
  'Operational completeness': 'quality-gap',
};
const REVIEW_DAYS = { 'Food safety': 90, Grounding: 180, Validation: 90 };
const TRIGGER_BY_TYPE = { 'grounding-gap': 'research', 'quality-gap': 'sme', correction: 'freshness', 'validation-finding': 'validation' };
const reviewDays = (dim) => REVIEW_DAYS[dim] || 180;

// The Dimension Registry — the catalog (which dimensions exist + what they apply to).
export const DIMENSION_REGISTRY = [
  ...['Grounding', 'Cost integrity', 'Sections', 'Shopping', 'Timeline', 'Decisions', 'Risks',
    'Contingencies', 'Food safety', 'Freshness', 'Governance', 'Validation']
    .map((id) => ({ id, appliesTo: ['playbook'], source: 'playbookHealth' })),
  { id: 'Operational completeness', appliesTo: ['playbook', 'runbook', 'venue-kit'], source: 'dimensions' },
];

// A gap/warn dimension recommends a KCR (never an edit). Pure.
function recommend(dim, pb, missing) {
  const type = KCR_TYPE_BY_DIM[dim] || 'quality-gap';
  return [{
    type, trigger: TRIGGER_BY_TYPE[type] || 'sme',
    assetId: pb.type, assetKind: 'playbook',
    fieldPath: dimFieldPath(dim),
    reason: `${dim}: ${missing || 'quality gap'} — review + ground before Production`,
  }];
}
const dimFieldPath = (dim) => ({
  Grounding: 'purchases[].unitCostRange', 'Food safety': 'risks', Sections: 'sections',
  Shopping: 'purchases', Timeline: 'tasks', Decisions: 'decisions', Governance: 'governance',
  Freshness: 'governance.lastReviewed', 'Operational completeness': 'operational',
}[dim] || dim.toLowerCase());

// Axes the Command Center RESEARCH QUEUE already sources KCRs for (pricing/sources/
// cadence/review/food-safety). These dimensions still EVALUATE + show status, but they
// DEFER their KCR to the research queue — one gap, one KCR, one source (EP-1). Only the
// genuinely-new dimensions (Operational completeness, …) create KCRs here.
const DEFER_TO_RESEARCH_QUEUE = new Set(['Grounding', 'Freshness', 'Governance', 'Food safety']);

// Wrap a playbookHealth component into the 7-field Dimension contract.
function toDimension(c, pb, engines) {
  const failing = c.status === 'gap' || c.status === 'warn';
  const emits = failing && !DEFER_TO_RESEARCH_QUEUE.has(c.component);
  return {
    id: c.component,
    status: c.status,
    reason: c.reason,
    evidence: c.reason,
    missingEvidence: failing ? c.reason : null,
    recommendedKCRs: emits ? recommend(c.component, pb) : [],
    deferredTo: failing && DEFER_TO_RESEARCH_QUEUE.has(c.component) ? 'research-queue' : null,
    affectedEngines: engines,
    reviewInterval: reviewDays(c.component),
  };
}

// ── NEW dimension: Operational Completeness — can someone actually execute this? ─
function operationalCompleteness(pb, engines) {
  const has = {
    tasks: (pb.tasks || []).length > 0,
    timeline: (pb.milestones || []).length > 0,
    dependencies: (pb.milestones || []).some((m) => (m.dependsOn || []).length) || (pb.tasks || []).some((t) => t.milestoneId),
    equipment: (pb.rentalsGap || []).length > 0 || (pb.purchases || []).some((p) => p.category === 'rental'),
    staffing: (pb.vendors || []).length > 0,
    logistics: !!(pb.schedules && Object.values(pb.schedules).some((a) => Array.isArray(a) && a.length)),
  };
  const missing = Object.entries(has).filter(([, v]) => !v).map(([k]) => k);
  const status = missing.length === 0 ? 'ok' : missing.length <= 2 ? 'warn' : 'gap';
  const reason = missing.length === 0 ? 'Executable: tasks · timeline · dependencies · equipment · staffing · logistics all present'
    : `Missing to execute: ${missing.join(', ')}`;
  return {
    id: 'Operational completeness',
    status, reason, evidence: reason,
    missingEvidence: missing.length ? missing.join(', ') : null,
    recommendedKCRs: missing.length ? recommend('Operational completeness', pb, missing.join(', ')) : [],
    affectedEngines: engines,
    reviewInterval: reviewDays('Operational completeness'),
  };
}

// ── Evaluate one asset across all applicable dimensions (no rollup number) ────
export function evaluateAsset(asset, kind, asOf) {
  if (kind !== 'playbook') {
    // Package-compat: dimensions declared for this kind, honest-empty (no deriver yet).
    return DIMENSION_REGISTRY.filter((d) => d.appliesTo.includes(kind)).map((d) => ({
      id: d.id, status: 'n/a', reason: `No evaluator for '${kind}' yet`,
      evidence: null, missingEvidence: null, recommendedKCRs: [], affectedEngines: [], reviewInterval: reviewDays(d.id),
    }));
  }
  const h = playbookHealth(asset, asOf);
  const engines = playbookCoverage(asset).engines.filter((e) => e.supported).map((e) => e.id);
  const dims = h.components.map((c) => toDimension(c, asset, engines));
  dims.push(operationalCompleteness(asset, engines));
  return dims;
}

// ── Dimension → KCR bridge (the only action a failing dimension may take) ─────
export function dimensionKCRs(pb, asOf) {
  const recs = evaluateAsset(pb, 'playbook', asOf)
    .filter((d) => d.status === 'gap' || d.status === 'warn')
    .flatMap((d) => d.recommendedKCRs);
  return recs.map((r) => {
    // DETERMINISTIC id (dedupe key), distinct from the research-queue's kcr-cc-* ids.
    const id = `kcr-pi-${playbookId(r.assetId)}-${slug(r.fieldPath)}`;
    const kcr = createKCR({ id, type: r.type, trigger: r.trigger, assetId: r.assetId, assetKind: 'playbook', fieldPath: r.fieldPath, reason: r.reason, createdBy: 'playbook-intelligence', asOf });
    return { ...kcr, priority: r.type === 'grounding-gap' ? 'high' : 'med', impact: knowledgeImpactPreview(pb, r.fieldPath) };
  });
}

// Corpus-wide dimension KCRs (deduped by deterministic id) — feeds the Studio backlog.
// Defaults to the whole corpus so callers (the Studio) need not pass it.
export function corpusDimensionKCRs(asOf, playbooks) {
  const list = playbooks || ALL_PLAYBOOKS;
  const all = list.flatMap((pb) => dimensionKCRs(pb, asOf));
  return reconcileKCRs([], all).kcrs;
}

// Convenience: the KCR type map + a helper to know a dimension's config (for the admin view).
export function dimensionConfig(id) { return { kcrType: KCR_TYPE_BY_DIM[id] || 'quality-gap', reviewInterval: reviewDays(id) }; }
export { playbookId };
