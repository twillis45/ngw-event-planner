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
  // KPP-1 new coverage dimensions
  'Regional coverage': 'quality-gap', 'Seasonal awareness': 'quality-gap',
  'Vendor network': 'quality-gap', 'Cultural overlay': 'quality-gap',
  'Weather contingency': 'quality-gap', 'Scale variance': 'quality-gap',
  'Accessibility': 'quality-gap', 'Professional guidance': 'quality-gap',
};
const REVIEW_DAYS = { 'Food safety': 90, Grounding: 180, Validation: 90, 'Regional coverage': 365, 'Seasonal awareness': 90 };
const TRIGGER_BY_TYPE = { 'grounding-gap': 'research', 'quality-gap': 'sme', correction: 'freshness', 'validation-finding': 'validation' };
const reviewDays = (dim) => REVIEW_DAYS[dim] || 180;

// The Dimension Registry — the catalog (which dimensions exist + what they apply to).
export const DIMENSION_REGISTRY = [
  ...['Grounding', 'Cost integrity', 'Sections', 'Shopping', 'Timeline', 'Decisions', 'Risks',
    'Contingencies', 'Food safety', 'Freshness', 'Governance', 'Validation']
    .map((id) => ({ id, appliesTo: ['playbook'], source: 'playbookHealth' })),
  { id: 'Operational completeness', appliesTo: ['playbook', 'runbook', 'venue-kit'], source: 'dimensions' },
  // KPP-1 Bundle B — extended coverage dimensions
  { id: 'Regional coverage',   appliesTo: ['playbook'], source: 'dimensions' },
  { id: 'Seasonal awareness',  appliesTo: ['playbook'], source: 'dimensions' },
  { id: 'Vendor network',      appliesTo: ['playbook'], source: 'dimensions' },
  { id: 'Cultural overlay',    appliesTo: ['playbook'], source: 'dimensions' },
  { id: 'Weather contingency', appliesTo: ['playbook'], source: 'dimensions' },
  { id: 'Scale variance',      appliesTo: ['playbook'], source: 'dimensions' },
  { id: 'Accessibility',       appliesTo: ['playbook'], source: 'dimensions' },
  { id: 'Professional guidance', appliesTo: ['playbook'], source: 'dimensions' },
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
  'Regional coverage': 'regionalPricing', 'Seasonal awareness': 'seasonalAdjustments',
  'Vendor network': 'vendors', 'Cultural overlay': 'cultural',
  'Weather contingency': 'risks', 'Scale variance': 'purchases[].qtyPerGuest',
  'Accessibility': 'accessibility', 'Professional guidance': 'professional',
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

// ── KPP-1 Bundle B: Extended coverage dimension evaluators ────────────────────

// Regional coverage: does the playbook have ANY region-specific data?
function regionalCoverage(pb, engines) {
  const hasRegional = pb.regionalPricing && Object.keys(pb.regionalPricing).length > 0;
  const hasScopedOverrides = pb.scopedOverrides && Object.keys(pb.scopedOverrides).length > 0;
  const hasNotes = pb.regionalNotes && pb.regionalNotes.length > 0;
  const ok = hasRegional || hasScopedOverrides || hasNotes;
  return {
    id: 'Regional coverage',
    status: ok ? 'ok' : 'warn',
    reason: ok ? 'Has regional pricing or notes' : 'National-only — no regional pricing, overrides, or notes. Knowledge may not project accurately across US regions.',
    evidence: ok ? 'regionalPricing / scopedOverrides present' : null,
    missingEvidence: ok ? null : 'Add regionalPricing or regionalNotes to ground regional variants',
    recommendedKCRs: ok ? [] : recommend('Regional coverage', pb, 'missing regional pricing data'),
    affectedEngines: engines,
    reviewInterval: reviewDays('Regional coverage'),
  };
}

// Seasonal awareness: does the playbook address seasonal variation?
function seasonalAwareness(pb, engines) {
  const hasSeasonal = pb.seasonalAdjustments && Object.keys(pb.seasonalAdjustments).length > 0;
  const knowledgeNote = pb.knowledge?.note || pb.knowledge?.notes || '';
  const hasSeasonalNote = knowledgeNote.toLowerCase().includes('season');
  const ok = hasSeasonal || hasSeasonalNote;
  return {
    id: 'Seasonal awareness',
    status: ok ? 'ok' : 'warn',
    reason: ok ? 'Seasonal adjustments or notes present' : 'No seasonal awareness — pricing and availability may vary significantly by season.',
    evidence: ok ? 'seasonalAdjustments or seasonal note present' : null,
    missingEvidence: ok ? null : 'Add seasonalAdjustments for summer/winter pricing or availability windows',
    recommendedKCRs: ok ? [] : recommend('Seasonal awareness', pb, 'missing seasonal adjustment data'),
    affectedEngines: engines,
    reviewInterval: reviewDays('Seasonal awareness'),
  };
}

// Vendor network: does the playbook document at least one vendor category?
function vendorNetwork(pb, engines) {
  const vendors = pb.vendors || [];
  const hasVendors = vendors.length >= 1;
  const categorized = vendors.filter((v) => v.category || v.role).length;
  const status = hasVendors && categorized >= 1 ? 'ok' : hasVendors ? 'warn' : 'gap';
  const reason = status === 'ok' ? `${vendors.length} vendors with categories documented`
    : status === 'warn' ? `${vendors.length} vendors but categories not specified`
    : 'No vendors documented — host cannot identify who to hire for this event';
  return {
    id: 'Vendor network',
    status, reason, evidence: reason,
    missingEvidence: status !== 'ok' ? 'Add at least one vendor with category (catering, venue, photography, etc.)' : null,
    recommendedKCRs: status === 'gap' ? recommend('Vendor network', pb, 'no vendors documented') : [],
    affectedEngines: engines,
    reviewInterval: reviewDays('Vendor network'),
  };
}

// Cultural overlay: does the playbook acknowledge cultural specifics?
function culturalOverlay(pb, engines) {
  // Cultural playbooks (those with cultural identity in their type or explicit cultural field)
  // Cultural events: named tradition celebrations (not generic regional foods)
  const culturalKeywords = ['cultural', 'ethiopian', 'pupusa', 'kwanzaa', 'juneteenth', 'quinceañera', 'repast', 'sunday dinner'];
  const isCultural = culturalKeywords.some((k) => pb.type.toLowerCase().includes(k));
  const hasCulturalField = !!(pb.cultural || pb.culturalNotes || pb.culturalContext);
  if (!isCultural) return { id: 'Cultural overlay', status: 'n/a', reason: 'Not a cultural-specific event type', evidence: null, missingEvidence: null, recommendedKCRs: [], affectedEngines: engines, reviewInterval: 365 };
  const ok = hasCulturalField;
  return {
    id: 'Cultural overlay',
    status: ok ? 'ok' : 'warn',
    reason: ok ? 'Cultural context documented' : 'Cultural event type but no cultural-specific notes documented',
    evidence: ok ? 'cultural field present' : null,
    missingEvidence: ok ? null : 'Add cultural or culturalNotes field for cultural authenticity guidance',
    recommendedKCRs: ok ? [] : recommend('Cultural overlay', pb, 'missing cultural context for cultural event type'),
    affectedEngines: engines,
    reviewInterval: reviewDays('Cultural overlay'),
  };
}

// Weather contingency: is there weather-specific risk planning?
function weatherContingency(pb, engines) {
  const risks = pb.risks || [];
  const weatherRisk = risks.some((r) => (r.risk || r.trigger || r.description || r.label || '').toLowerCase().match(/weather|rain|wind|heat|cold|storm|outdoor/));
  const hasOutdoor = (pb.type || '').toLowerCase().match(/cookout|barbecue|bbq|crab feast|crawfish|boil|fish fry|outdoor|backyard|pool|day party/);
  if (!hasOutdoor) return { id: 'Weather contingency', status: 'n/a', reason: 'Not an outdoor event type', evidence: null, missingEvidence: null, recommendedKCRs: [], affectedEngines: engines, reviewInterval: 365 };
  const ok = weatherRisk;
  return {
    id: 'Weather contingency',
    status: ok ? 'ok' : 'gap',
    reason: ok ? 'Weather contingency in risks' : 'Outdoor event with no weather contingency in risks',
    evidence: ok ? 'weather risk item found' : null,
    missingEvidence: ok ? null : 'Add weather contingency risk item (rain, heat, wind) to risks',
    recommendedKCRs: ok ? [] : recommend('Weather contingency', pb, 'outdoor event missing weather contingency'),
    affectedEngines: engines,
    reviewInterval: reviewDays('Weather contingency'),
  };
}

// Scale variance: does quantity data address different group sizes?
function scaleVariance(pb, engines) {
  const purchases = pb.purchases || [];
  const hasQtyPerGuest = purchases.some((p) => p.qtyPerGuest !== undefined);
  const hasScaleFactor = purchases.some((p) => p.scalingFactor || p.bulkDiscount || p.scaleNote);
  const status = hasQtyPerGuest && hasScaleFactor ? 'ok' : hasQtyPerGuest ? 'warn' : 'gap';
  const reason = status === 'ok' ? 'qty-per-guest + scale factors present'
    : status === 'warn' ? 'qty-per-guest present but no bulk/scale factors (quantities may not extrapolate correctly at large scale)'
    : 'No qty-per-guest data — quantities cannot scale with headcount';
  return {
    id: 'Scale variance',
    status, reason, evidence: reason,
    missingEvidence: status !== 'ok' ? 'Add qtyPerGuest to purchases; add bulkDiscount or scaleNote for large-group accuracy' : null,
    recommendedKCRs: status === 'gap' ? recommend('Scale variance', pb, 'missing qtyPerGuest data') : [],
    affectedEngines: engines,
    reviewInterval: 180,
  };
}

// Accessibility: any accessibility guidance?
function accessibilityDimension(pb, engines) {
  const hasAccessibility = !!(pb.accessibility || pb.accessibilityNotes);
  const hasAccessRisk = (pb.risks || []).some((r) => (r.risk || r.description || '').toLowerCase().includes('access'));
  const ok = hasAccessibility || hasAccessRisk;
  return {
    id: 'Accessibility',
    status: ok ? 'ok' : 'warn',
    reason: ok ? 'Accessibility notes present' : 'No accessibility guidance — guests with mobility, dietary, or sensory needs are not addressed',
    evidence: ok ? 'accessibility field or risk present' : null,
    missingEvidence: ok ? null : 'Add accessibility field with mobility/dietary/sensory considerations',
    recommendedKCRs: ok ? [] : [],   // accessibility is a warn, not a gap requiring immediate KCR
    affectedEngines: engines,
    reviewInterval: 365,
  };
}

// Professional guidance: is there guidance specifically for professional planners?
function professionalGuidance(pb, engines) {
  const hasPro = !!(pb.professional || pb.plannerGuidance || pb.coordinatorNotes);
  const hasProDecision = (pb.decisions || []).some((d) => (d.label || '').toLowerCase().includes('planner') || (d.label || '').toLowerCase().includes('professional'));
  const ok = hasPro || hasProDecision;
  return {
    id: 'Professional guidance',
    status: ok ? 'ok' : 'warn',
    reason: ok ? 'Professional / planner guidance documented' : 'No professional guidance — planners and coordinators must infer from host-level knowledge',
    evidence: ok ? 'professional field or planner decision present' : null,
    missingEvidence: ok ? null : 'Add professional or plannerGuidance field for coordinator/planner-specific notes',
    recommendedKCRs: [],  // warn only, no auto-KCR
    affectedEngines: engines,
    reviewInterval: 365,
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
  // KPP-1 Bundle B: extended coverage dimensions
  dims.push(regionalCoverage(asset, engines));
  dims.push(seasonalAwareness(asset, engines));
  dims.push(vendorNetwork(asset, engines));
  dims.push(culturalOverlay(asset, engines));
  dims.push(weatherContingency(asset, engines));
  dims.push(scaleVariance(asset, engines));
  dims.push(accessibilityDimension(asset, engines));
  dims.push(professionalGuidance(asset, engines));
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

// ── Bundle F: Quality Manufacturing ─────────────────────────────────────────────
// Per-asset dimensional health matrix: which dimensions pass/fail per playbook +
// corpus-wide coverage totals. Drives the Quality workspace in the Studio.
export function qualityManufacturing(playbooks, asOf) {
  const list = playbooks || ALL_PLAYBOOKS;
  const dimIds = DIMENSION_REGISTRY.map((d) => d.id);

  const byDimension = {};
  dimIds.forEach((id) => { byDimension[id] = { ok: 0, warn: 0, gap: 0, na: 0 }; });

  const assets = list.map((pb) => {
    const dims = evaluateAsset(pb, 'playbook', asOf);
    const kcrs = dimensionKCRs(pb, asOf);
    dims.forEach((d) => {
      const bucket = byDimension[d.id] || (byDimension[d.id] = { ok: 0, warn: 0, gap: 0, na: 0 });
      bucket[d.status] = (bucket[d.status] || 0) + 1;
    });
    return {
      type: pb.type,
      status: pb.status,
      dimensions: dims.map((d) => ({ id: d.id, status: d.status, reason: d.reason, deferred: !!d.deferredTo })),
      kcrCount: kcrs.length,
      gapCount: dims.filter((d) => d.status === 'gap').length,
      warnCount: dims.filter((d) => d.status === 'warn').length,
    };
  });

  const totalAssets = list.length;
  const fullyOk = assets.filter((a) => a.gapCount === 0 && a.warnCount === 0).length;
  const totalKCRs = assets.reduce((s, a) => s + a.kcrCount, 0);

  return { asOf, totalAssets, fullyOk, totalKCRs, dimIds, byDimension, assets };
}

export { playbookId };
