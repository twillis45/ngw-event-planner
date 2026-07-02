// ─── Playbook Operating System — the generated registry + health engine ───────
// Part of the Playbook OS (docs/architecture/PLAYBOOK_OPERATING_SYSTEM.md). This is
// the OBSERVABILITY layer over the playbook corpus — it is READ-ONLY and produces NO
// change to any playbook output. Registry + health are DERIVED from the single source
// of truth (the playbook data objects), never a hand-maintained parallel store (EP-1).
//
// Mirrors the doctrine's proven governance shape (the Intelligence Readers/Writers
// registries): component-level status with a reason, NO single fabricated "AI score"
// (Validation Platform rule), everything explainable from the same fields it read.
//
// The ONLY input that can't be derived from content is a playbook's governance dates
// (owner / lastReviewed / reviewInterval / explicit status). Those live in an optional
// co-located `governance` block on the playbook object; when absent, the registry marks
// them UNSET and surfaces that as an actionable gap (never a fabricated date).

import { ALL_PLAYBOOKS } from './index';

const norm = (s) => String(s || '').trim().toLowerCase();
// Stable kebab id from the event type — the registry key ('Crab Feast' → 'crab-feast').
export const playbookId = (type) => norm(type).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ── Component + status vocabulary (no numeric score) ──────────────────────────
export const HEALTH = { OK: 'ok', WARN: 'warn', GAP: 'gap', NA: 'n/a' };
// The engines the playbook CORPUS can feed. Memory (L4) / Prediction (L5) are host-
// intelligence layers, NOT playbook-driven — marked n/a here by design (see Intelligence OS).
export const ENGINES = [
  { id: 'sizing',        label: 'Attendance / Sizing' },
  { id: 'shopping',      label: 'Shopping' },
  { id: 'budget',        label: 'Budget' },
  { id: 'decisions',     label: 'Decisions' },
  { id: 'timeline',      label: 'Timeline / Tasks' },
  { id: 'capacity',      label: 'Capacity / Rentals' },
  { id: 'runOfShow',     label: 'Run of Show' },
  { id: 'risks',         label: 'Risks' },
  { id: 'contingencies', label: 'Contingencies' },
  { id: 'heart',         label: 'Heart Moments' },
  { id: 'vendors',       label: 'Vendors' },
  { id: 'context',       label: 'Context (culture)' },
];

const nonEmpty = (a) => Array.isArray(a) && a.length > 0;
const foodPurchases = (pb) => (pb.purchases || []).filter((p) => p.category === 'food' || p.category === 'beverage');

// ── Grounding (mirrors scripts/groundingAudit.mjs, over the OBJECT not regex) ──
export function playbookGrounding(pb) {
  const purchases = pb.purchases || [];
  const priced = purchases.filter((p) => Array.isArray(p.unitCostRange));
  let cited = 0, synthesized = 0, consensus = 0, withProvenance = 0;
  for (const p of purchases) {
    const v = p.provenance && p.provenance.verificationStatus;
    if (p.provenance) withProvenance++;
    if (v === 'cited') cited++;
    else if (v === 'synthesized') synthesized++;
    else if (v === 'established-consensus') consensus++;
  }
  // The playbook-level knowledge block also carries a verificationStatus + sources[].
  const kv = pb.knowledge && pb.knowledge.verificationStatus;
  const hasSources = !!(pb.knowledge && Array.isArray(pb.knowledge.sources) && pb.knowledge.sources.length);
  const labeled = cited + synthesized + consensus;
  const groundedPct = labeled ? Math.round((cited / labeled) * 100) : 0;
  return {
    pricedItems: priced.length,
    itemsWithProvenance: withProvenance,
    cited, synthesized, consensus,
    groundedPct,
    knowledgeStatus: kv || 'unlabeled',
    hasSources,
  };
}

// ── Engine coverage — which corpus sections are populated (⇒ which engines fed) ─
export function playbookCoverage(pb) {
  const has = {
    sizing:        !!(pb.meta && pb.meta.typicalGuests) && !!(pb.meta && pb.meta.scaleBy),
    shopping:      nonEmpty(pb.purchases),
    budget:        (pb.purchases || []).some((p) => Array.isArray(p.unitCostRange)) || !!(pb.meta && pb.meta.perGuestCost),
    decisions:     nonEmpty(pb.decisions),
    timeline:      nonEmpty(pb.milestones) && nonEmpty(pb.tasks),
    capacity:      nonEmpty(pb.rentalsGap) || (pb.purchases || []).some((p) => p.category === 'rental'),
    runOfShow:     !!(pb.schedules && Object.values(pb.schedules).some(nonEmpty)),
    risks:         nonEmpty(pb.risks),
    contingencies: nonEmpty(pb.contingencies),
    heart:         nonEmpty(pb.heartMoments),
    vendors:       nonEmpty(pb.vendors),
    context:       !!(pb.knowledge && pb.knowledge.note) || !!pb.solveFamily,
  };
  const engines = ENGINES.map((e) => ({ ...e, supported: !!has[e.id] }));
  return { engines, supportedCount: engines.filter((e) => e.supported).length, total: ENGINES.length };
}

// ── Dependencies (what the playbook relies on downstream) ─────────────────────
export function playbookDependencies(pb) {
  const purchaseCategories = [...new Set((pb.purchases || []).map((p) => p.category).filter(Boolean))];
  const vendorCategories = (pb.vendors || []).map((v) => v.category).filter(Boolean);
  const rentals = (pb.rentalsGap || []).map((r) => r.item).filter(Boolean);
  // Decision→purchase wiring (a decision's costFactors affect specific purchase ids).
  const decisionAffects = (pb.decisions || []).flatMap((d) => d.affects || []);
  return { purchaseCategories, vendorCategories, rentals, decisionAffects };
}

// ── Governance (the one authored, non-derivable block) ────────────────────────
// Reads an optional co-located `governance` block; when absent, returns an UNSET
// shell so the registry surfaces "cadence not set" as an actionable gap (no fake date).
export function playbookGovernance(pb) {
  const g = pb.governance || null;
  if (!g) return { set: false, owner: null, created: null, lastReviewed: null, reviewIntervalDays: null, declaredStatus: null };
  return {
    set: true,
    owner: g.owner || null,
    created: g.created || null,
    lastReviewed: g.lastReviewed || null,
    reviewIntervalDays: typeof g.reviewIntervalDays === 'number' ? g.reviewIntervalDays : null,
    declaredStatus: g.status || null,
  };
}

// ── Freshness — derived from governance dates + `asOf` (caller passes the date) ─
// asOf is an ISO date string (YYYY-MM-DD) supplied by the caller — this module never
// calls Date.now() (the prod-bundle + resume discipline; freshness is a pure function).
export function playbookFreshness(pb, asOf) {
  const g = playbookGovernance(pb);
  if (!g.set || !g.lastReviewed) {
    return { known: false, ageDays: null, reviewDue: null, overdue: false, reason: 'No review cadence set' };
  }
  const last = Date.parse(g.lastReviewed);
  const now = Date.parse(asOf);
  if (Number.isNaN(last) || Number.isNaN(now)) return { known: false, ageDays: null, reviewDue: null, overdue: false, reason: 'Unparseable review date' };
  const ageDays = Math.floor((now - last) / 86400000);
  const interval = g.reviewIntervalDays || 180; // default cadence when unset but a lastReviewed exists
  const overdue = ageDays > interval;
  return { known: true, ageDays, reviewDue: interval - ageDays, overdue, reason: overdue ? `Last reviewed ${ageDays}d ago (cadence ${interval}d)` : `Reviewed ${ageDays}d ago` };
}

// ── Known weaknesses — DERIVED gaps, never authored ───────────────────────────
export function playbookWeaknesses(pb) {
  const w = [];
  const g = playbookGrounding(pb);
  if (g.pricedItems > 0 && g.cited === 0) w.push('Priced items are synthesized/consensus — no citations attached');
  if (!g.hasSources) w.push('knowledge.sources is empty (no source list)');
  const missingProv = (pb.purchases || []).filter((p) => Array.isArray(p.unitCostRange) && !p.provenance).length;
  if (missingProv > 0) w.push(`${missingProv} priced item(s) without a provenance block`);
  if (!nonEmpty(pb.risks)) w.push('No risks declared');
  if (!nonEmpty(pb.contingencies)) w.push('No contingencies declared');
  if (!(pb.schedules && Object.values(pb.schedules).some(nonEmpty))) w.push('No run-of-show schedules');
  if (!playbookGovernance(pb).set) w.push('No governance block (owner / review cadence unset)');
  return w;
}

// ── Research queue — derived tasks (no manual spreadsheet) ────────────────────
export function playbookResearch(pb, asOf) {
  const q = [];
  const g = playbookGrounding(pb);
  const fresh = playbookFreshness(pb, asOf);
  if (g.pricedItems > 0 && g.cited === 0) q.push({ kind: 'pricing', priority: 'high', reason: `${g.pricedItems} priced items synthesized — attach citations` });
  if (fresh.known && fresh.overdue) q.push({ kind: 'review', priority: 'high', reason: fresh.reason });
  if (!fresh.known) q.push({ kind: 'cadence', priority: 'med', reason: 'Set a review cadence (governance block)' });
  // Food-safety review for any cook-with-heat / raw-protein foodway.
  const foodSafetyRelevant = /crab|boil|fry|grill|bbq|cookout|shrimp|seafood|steam|smoke|oyster|raw/i.test(pb.type + ' ' + ((pb.meta && pb.meta.summary) || ''));
  if (foodSafetyRelevant) q.push({ kind: 'food-safety', priority: 'high', reason: 'Hot-cooking / raw-protein foodway — food-safety review due' });
  if (!g.hasSources) q.push({ kind: 'sources', priority: 'low', reason: 'Populate knowledge.sources' });
  return q;
}

// ── Component health — the core "is it healthy?" reader (no single score) ──────
export function playbookHealth(pb, asOf) {
  const g = playbookGrounding(pb);
  const cov = playbookCoverage(pb);
  const fresh = playbookFreshness(pb, asOf);
  const gov = playbookGovernance(pb);
  const foods = foodPurchases(pb);
  const uncostedFood = foods.filter((p) => !Array.isArray(p.unitCostRange)).length;
  const foodSafetyRelevant = /crab|boil|fry|grill|bbq|cookout|shrimp|seafood|steam|smoke|oyster|raw/i.test(pb.type + ' ' + ((pb.meta && pb.meta.summary) || ''));

  const c = (component, status, reason) => ({ component, status, reason });
  const comps = [
    c('Grounding',
      g.pricedItems === 0 ? HEALTH.NA : g.cited > 0 ? HEALTH.OK : g.consensus === g.pricedItems ? HEALTH.WARN : HEALTH.GAP,
      g.pricedItems === 0 ? 'No priced items' : `${g.cited} cited / ${g.consensus} consensus / ${g.synthesized} synthesized of ${g.pricedItems} priced`),
    c('Freshness',
      !fresh.known ? HEALTH.GAP : fresh.overdue ? HEALTH.WARN : HEALTH.OK, fresh.reason),
    c('Cost integrity',
      uncostedFood === 0 ? HEALTH.OK : HEALTH.GAP,
      uncostedFood === 0 ? 'Every food/beverage item priced' : `${uncostedFood} food/beverage item(s) missing unitCostRange`),
    c('Sections',
      (nonEmpty(pb.decisions) && nonEmpty(pb.milestones) && nonEmpty(pb.tasks) && nonEmpty(pb.purchases)) ? HEALTH.OK : HEALTH.GAP,
      'decisions · milestones · tasks · purchases'),
    c('Shopping', nonEmpty(pb.purchases) ? HEALTH.OK : HEALTH.GAP, `${(pb.purchases || []).length} purchases`),
    c('Timeline', (nonEmpty(pb.milestones) && nonEmpty(pb.tasks)) ? HEALTH.OK : HEALTH.GAP, `${(pb.milestones || []).length} milestones · ${(pb.tasks || []).length} tasks`),
    c('Decisions', nonEmpty(pb.decisions) ? HEALTH.OK : HEALTH.WARN, `${(pb.decisions || []).length} decisions`),
    c('Risks', nonEmpty(pb.risks) ? HEALTH.OK : HEALTH.WARN, `${(pb.risks || []).length} risks`),
    c('Contingencies', nonEmpty(pb.contingencies) ? HEALTH.OK : HEALTH.WARN, `${(pb.contingencies || []).length} contingencies`),
    c('Food safety', !foodSafetyRelevant ? HEALTH.NA : nonEmpty(pb.risks) ? HEALTH.OK : HEALTH.GAP,
      !foodSafetyRelevant ? 'Not a hot-cook/raw foodway' : nonEmpty(pb.risks) ? 'Risk section present (review cadence in research queue)' : 'Hot-cook foodway with no risk section'),
    c('Governance', gov.set ? HEALTH.OK : HEALTH.GAP, gov.set ? `Owner: ${gov.owner || 'unset'}` : 'No governance block'),
    // Field validation is honest-empty until real completed events exist (Intelligence OS sequencing).
    c('Validation', HEALTH.NA, 'Awaiting completed events (no field data yet)'),
  ];
  const gaps = comps.filter((x) => x.status === HEALTH.GAP).length;
  const warns = comps.filter((x) => x.status === HEALTH.WARN).length;
  return { components: comps, gaps, warns, ok: comps.filter((x) => x.status === HEALTH.OK).length };
}

// ── Derived status (GATED, not summed — mirrors EP-2/DL-007) ──────────────────
// A single GAP in a load-bearing component caps status below Production, exactly like
// the bless gate. Never a rolled-up average.
export function playbookStatus(pb, asOf) {
  const gov = playbookGovernance(pb);
  if (gov.declaredStatus === 'draft' || gov.declaredStatus === 'archived' || gov.declaredStatus === 'deprecated') return gov.declaredStatus;
  const h = playbookHealth(pb, asOf);
  const g = playbookGrounding(pb);
  const sections = h.components.find((c) => c.component === 'Sections');
  if (sections && sections.status === HEALTH.GAP) return 'draft';           // incomplete corpus
  if (g.pricedItems > 0 && g.cited === 0) return 'research-needed';         // ungrounded pricing
  const fresh = playbookFreshness(pb, asOf);
  if (fresh.known && fresh.overdue) return 'review-needed';                 // stale review
  if (!gov.set) return 'review-needed';                                     // no cadence
  return 'production';
}

// ── The full registry entry for one playbook ──────────────────────────────────
export function playbookRegistryEntry(pb, asOf) {
  return {
    id: playbookId(pb.type),
    type: pb.type,
    title: pb.type,
    category: pb.family || pb.solveFamily || 'uncategorized',
    solveFamily: pb.solveFamily || null,
    recordKind: pb.recordKind || 'event',
    version: pb.version || '0.0.0',
    difficulty: (pb.meta && pb.meta.hostDifficulty) || null,
    leadTimeDays: (pb.meta && pb.meta.leadTimeDays) || null,
    perGuestCost: (pb.meta && pb.meta.perGuestCost) || null,
    typicalGuests: (pb.meta && pb.meta.typicalGuests) || null,
    status: playbookStatus(pb, asOf),
    governance: playbookGovernance(pb),
    grounding: playbookGrounding(pb),
    coverage: playbookCoverage(pb),
    dependencies: playbookDependencies(pb),
    freshness: playbookFreshness(pb, asOf),
    health: playbookHealth(pb, asOf),
    weaknesses: playbookWeaknesses(pb),
    research: playbookResearch(pb, asOf),
    // Honest-empty scaffolds — light up automatically once real events accrue.
    validation: { status: 'awaiting-events', completedEvents: 0, note: 'Field validation activates when completed events with reconciled outcomes exist.' },
    history: { entries: [], note: 'Semantic change history activates as playbook versions are released with recorded change reasons.' },
  };
}

// ── The whole corpus registry + rollup summary (the Command Center's data) ─────
export function buildPlaybookRegistry(asOf) {
  const entries = ALL_PLAYBOOKS.map((pb) => playbookRegistryEntry(pb, asOf)).sort((a, b) => a.type.localeCompare(b.type));
  const byStatus = entries.reduce((m, e) => { m[e.status] = (m[e.status] || 0) + 1; return m; }, {});
  const totalPriced = entries.reduce((s, e) => s + e.grounding.pricedItems, 0);
  const totalCited = entries.reduce((s, e) => s + e.grounding.cited, 0);
  const engineCoverage = ENGINES.map((eng) => ({
    ...eng,
    playbooks: entries.filter((e) => e.coverage.engines.find((x) => x.id === eng.id && x.supported)).length,
  }));
  const research = entries.flatMap((e) => e.research.map((r) => ({ ...r, type: e.type, id: e.id })));
  return {
    generatedAsOf: asOf || null,
    count: entries.length,
    byStatus,
    groundingCoveragePct: totalPriced ? Math.round((totalCited / totalPriced) * 100) : 0,
    withGovernance: entries.filter((e) => e.governance.set).length,
    reviewsOverdue: entries.filter((e) => e.freshness.overdue).length,
    researchOpen: research.length,
    criticalGaps: entries.filter((e) => e.status === 'draft').length,
    engineCoverage,
    research: research.sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1)),
    entries,
  };
}
