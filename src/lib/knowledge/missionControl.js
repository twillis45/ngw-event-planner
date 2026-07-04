// ─── Mission Control (KML-1 Bundle A / C / E / F / H) ────────────────────────
// Pure functions that answer the five operational questions every day:
//   1. What changed overnight?
//   2. What knowledge is degrading?
//   3. What should we research today?
//   4. What is ready for review?
//   5. What can safely be published?
//
// Reads existing stores only — no new data models.
// All functions are pure (inputs → output, no side effects).

import { getFieldPaths, createCampaign } from './campaign';
import { detectGapsInPlaybook, getRelevantProvidersForGap } from './playbookSchema';
import { generateResearchBlueprint, blueprintToGoal } from './researchBlueprint';
export { QUEUE_STATES, QUEUE_STATE_COLORS, computeQueueItemState } from './campaignRunner';

// ── Helpers ────────────────────────────────────────────────────────────────────

// Resolves the provenance object (claim/sufficientWhen/sourceHint) for a field path in a playbook.
// purchase paths:  'crabLegs.unitCostRange', 'ice.qtyPerGuest'  → purchase.provenance
// decision paths: 'decisions[diy_vs_order].costFactors'          → decision.costFactorProvenance
function getFieldProvenance(pb, fieldPath) {
  if (!pb || !fieldPath) return null;
  const decisionMatch = fieldPath.match(/^decisions\[([^\]]+)\]/);
  if (decisionMatch) {
    const d = (pb.decisions || []).find((x) => x.id === decisionMatch[1]);
    return d?.costFactorProvenance || null;
  }
  const purchaseIdMatch = fieldPath.match(/^([^.[]+)\./);
  if (purchaseIdMatch) {
    const p = (pb.purchases || []).find((x) => x.id === purchaseIdMatch[1]);
    return p?.provenance || null;
  }
  return null;
}

function daysBetween(isoA, isoB) {
  if (!isoA || !isoB) return null;
  return Math.floor((new Date(`${isoB}T00:00:00Z`) - new Date(`${isoA}T00:00:00Z`)) / 86_400_000);
}

function isAfter(isoDate, asOf) {
  if (!isoDate) return false;
  return isoDate > asOf;
}

function isWithinDays(isoDate, asOf, days) {
  if (!isoDate) return false;
  const d = daysBetween(asOf, isoDate);
  return d != null && d >= 0 && d <= days;
}

function isOverdue(isoDate, asOf) {
  if (!isoDate) return false;
  return isoDate < asOf;
}

// Field kind → knowledge dimension
const KIND_TO_DIMENSION = {
  pricing:    'Grounding',
  quantity:   'Grounding',
  'cost-factor': 'Grounding',
  grounding:  'Grounding',
  governance: 'Operational completeness',
  safety:     'Accessibility',
  regional:   'Regional coverage',
  cultural:   'Cultural overlay',
  weather:    'Weather contingency',
  planner:    'Professional guidance',
};

// ── 1. OVERNIGHT ACTIVITY ──────────────────────────────────────────────────────
// What changed since `sinceDate` (default: yesterday).
export function buildOvernightActivity(
  { runs = [], observations = [], evidence = [], findings = [], kcrs = [], campaigns = [] },
  { asOf, sinceDate = null }
) {
  const since = sinceDate || (asOf ? (() => { const d = new Date(`${asOf}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); })() : null);

  const after = (items, dateField) => items.filter((x) => x[dateField] && x[dateField] >= since);

  const recentRuns      = after(runs, 'at');
  const providerFailures = recentRuns.filter((r) => r.status === 'failed');
  const newObservations  = after(observations, 'at');
  const newEvidence      = after(evidence, 'capturedAt');
  const newFindings      = after(findings, 'at');
  const newKcrs          = after(kcrs, 'createdAt').filter((k) => k.state !== 'published');
  const published        = after(kcrs, 'publishedAt').filter((k) => k.state === 'published');
  const validationUpdates = after(kcrs, 'updatedAt').filter((k) => k.state === 'validated');

  return {
    since,
    asOf,
    workerRuns: recentRuns.length,
    providerFailures: providerFailures.length,
    failedProviders: [...new Set(providerFailures.map((r) => r.typeId))],
    newObservations: newObservations.length,
    newEvidence: newEvidence.length,
    newFindings: newFindings.length,
    newKcrs: newKcrs.length,
    published: published.length,
    validationUpdates: validationUpdates.length,
    empty: recentRuns.length === 0 && newObservations.length === 0 && newEvidence.length === 0,
  };
}

// ── 2. MANUFACTURING QUEUE ─────────────────────────────────────────────────────
// What should be researched today? Auto-prioritized from playbook field gaps.
// Returns items sorted HIGH → MED → LOW. Never manual.
export function buildManufacturingQueue(playbooks, allEvidence, allCampaigns, asOf) {
  const PRIORITY_ORDER = { HIGH: 0, MED: 1, LOW: 2 };
  const evidenceByKey  = {};
  for (const ev of (allEvidence || [])) {
    const key = `${ev.assetId}::${ev.fieldPath}`;
    if (!evidenceByKey[key]) evidenceByKey[key] = [];
    evidenceByKey[key].push(ev);
  }
  const campaignsByKey = new Set((allCampaigns || []).map((c) => `${c.assetId}::${c.fieldPath}`));
  const campaignKeysArray = Array.from(campaignsByKey);
  console.log('DEBUG: campaignsByKey size:', campaignsByKey.size);
  if (campaignKeysArray.length > 0) {
    console.log('DEBUG: Sample campaign keys:', campaignKeysArray.slice(0, 5));
  }

  const items = [];
  let dinnervineMatches = [];

  for (const pb of (playbooks || [])) {
    const fields = getFieldPaths(pb);
    const gaps = detectGapsInPlaybook(pb);
    const gapsByFieldPath = {};
    gaps.forEach(g => { gapsByFieldPath[g.fieldPath] = g; });

    for (const { path, label, kind } of fields) {
      const key   = `${pb.type}::${path}`;
      const evs   = evidenceByKey[key] || [];
      const hasCampaign = campaignsByKey.has(key);

      // Debug: Check Dinner Party wine matches
      if (pb.type === 'Dinner Party' && path.includes('wine')) {
        dinnervineMatches.push({
          pbType: pb.type,
          path,
          queueKey: key,
          hasCampaign,
          campaignsIncludeKey: campaignKeysArray.filter(ck => ck.includes('wine')),
        });
      }

      // Score this field
      let priority, reason;
      if (evs.length === 0) {
        priority = 'HIGH';
        reason   = 'No evidence — field is completely ungrounded';
      } else {
        // Check freshness of most recent evidence
        const newest = evs.reduce((m, e) => (!m || (e.capturedAt || '') > (m.capturedAt || '')) ? e : m, null);
        const ageDays = newest ? daysBetween(newest.capturedAt, asOf) : null;
        const commercial = evs.every((e) => e.sourceType === 'commercial');
        const hasGov     = evs.some((e) => e.sourceType === 'official');

        if (ageDays != null && ageDays > 180) {
          priority = 'HIGH';
          reason   = `Evidence is ${ageDays}d old — stale`;
        } else if (ageDays != null && ageDays > 90) {
          priority = 'MED';
          reason   = `Evidence is ${ageDays}d old — aging`;
        } else if (commercial && !hasGov) {
          priority = 'MED';
          reason   = 'Commercial-only evidence — needs government corroboration';
        } else if (!hasGov) {
          priority = 'LOW';
          reason   = 'No official source — consider adding government data';
        } else {
          continue;  // covered — skip
        }
      }

      const prov = getFieldProvenance(pb, path);
      const gapForThisField = gapsByFieldPath[path];

      // Provider groups come from gap-based routing (RBE-1 expands to individual IDs at blueprint layer)
      const suggestedProviders = gapForThisField ? getRelevantProvidersForGap(gapForThisField) : [];

      items.push({
        priority,
        playbookType: pb.type,
        playbookLabel: pb.label || pb.type,
        fieldPath: path,
        fieldLabel: label,
        gapKind: kind,
        dimension: KIND_TO_DIMENSION[kind] || 'Grounding',
        reason,
        evidenceCount: evs.length,
        hasCampaign,
        suggestedProviders,
        claim: prov?.claim || null,
        sufficientWhen: prov?.sufficientWhen || null,
        sourceHint: prov?.sourceHint || null,
      });
    }
  }

  items.sort((a, b) => {
    const po = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return po !== 0 ? po : a.evidenceCount - b.evidenceCount;
  });

  // Log debug info for Dinner Party wine fields
  if (dinnervineMatches.length > 0) {
    console.log('DEBUG Dinner Party wine matches:', dinnervineMatches);
  }

  // Log KPI summary
  const highCount = items.filter(i => i.priority === 'HIGH' && !i.hasCampaign).length;
  const highWithCampaign = items.filter(i => i.priority === 'HIGH' && i.hasCampaign).length;
  console.log('DEBUG KPI summary - HIGH items without campaign:', highCount, 'with campaign:', highWithCampaign, 'total HIGH:', items.filter(i => i.priority === 'HIGH').length);

  return items;
}

// ── 3. KNOWLEDGE HEALTH ────────────────────────────────────────────────────────
// Per-playbook × dimension health. No overall score. Gaps route to queue.
export function buildKnowledgeHealth(playbooks, allEvidence, allKcrs, asOf) {
  const DIMENSIONS = ['Grounding', 'Freshness', 'Regional coverage', 'Operational completeness', 'Professional guidance', 'Accessibility', 'Weather contingency', 'Cultural overlay', 'Failure intelligence', 'Validation'];

  const evidenceByAsset = {};
  for (const ev of (allEvidence || [])) {
    const k = ev.assetId;
    if (!evidenceByAsset[k]) evidenceByAsset[k] = [];
    evidenceByAsset[k].push(ev);
  }
  const kcrByAsset = {};
  for (const k of (allKcrs || [])) {
    const a = k.assetId;
    if (!kcrByAsset[a]) kcrByAsset[a] = [];
    kcrByAsset[a].push(k);
  }

  const health = {};
  for (const pb of (playbooks || [])) {
    const evs  = evidenceByAsset[pb.type] || [];
    const kcrs = kcrByAsset[pb.type] || [];
    const fields = getFieldPaths(pb);
    const totalFields = fields.length;
    const coveredFields = fields.filter(({ path }) => evs.some((e) => e.fieldPath === path)).length;

    const freshEvs = evs.filter((e) => e.expirationDate && isAfter(e.expirationDate, asOf));
    const govEvs   = evs.filter((e) => e.sourceType === 'official');
    const regEvs   = evs.filter((e) => e.region && e.region !== 'US');
    const published = kcrs.filter((k) => k.state === 'published');

    const score = (n, d) => d === 0 ? null : Math.min(1, n / d);

    health[pb.type] = {
      playbookLabel: pb.label || pb.type,
      dimensions: {
        Grounding:                 { score: score(coveredFields, totalFields), evidenceCount: evs.length, label: evs.length === 0 ? 'none' : coveredFields / totalFields > 0.7 ? 'high' : coveredFields / totalFields > 0.3 ? 'med' : 'low' },
        Freshness:                 { score: score(freshEvs.length, evs.length), evidenceCount: freshEvs.length, label: evs.length === 0 ? 'none' : freshEvs.length === evs.length ? 'high' : freshEvs.length / evs.length > 0.5 ? 'med' : 'low' },
        'Regional coverage':       { score: score(regEvs.length, evs.length), evidenceCount: regEvs.length, label: regEvs.length === 0 ? 'none' : regEvs.length / evs.length > 0.2 ? 'high' : 'low' },
        'Operational completeness':{ score: score(published.length, Math.max(1, kcrs.length)), evidenceCount: published.length, label: published.length > 0 ? 'high' : kcrs.length > 0 ? 'med' : 'none' },
        'Professional guidance':   { score: govEvs.length > 0 ? 0.5 : 0, evidenceCount: govEvs.length, label: govEvs.length === 0 ? 'none' : 'med' },
        Accessibility:             { score: null, evidenceCount: 0, label: 'none' },
        'Weather contingency':     { score: null, evidenceCount: 0, label: 'none' },
        'Cultural overlay':        { score: null, evidenceCount: 0, label: 'none' },
        'Failure intelligence':    { score: null, evidenceCount: 0, label: 'none' },
        Validation:                { score: score(kcrs.filter((k) => k.state === 'validated').length, Math.max(1, kcrs.length)), evidenceCount: kcrs.filter((k) => k.state === 'validated').length, label: kcrs.filter((k) => k.state === 'validated').length > 0 ? 'high' : 'none' },
      },
      totalEvidence: evs.length,
      coveredFields,
      totalFields,
      publishedKcrs: published.length,
      lastRefreshed: evs.reduce((m, e) => (!m || (e.capturedAt || '') > m) ? (e.capturedAt || m) : m, null),
    };
  }

  return { health, dimensions: DIMENSIONS };
}

// ── 4. PUBLISHING QUEUE ────────────────────────────────────────────────────────
// Everything awaiting sign-off at each gate.
export function buildPublishingQueue(kcrs) {
  const all = kcrs || [];
  return {
    awaitingReview:      all.filter((k) => k.state === 'proposed'),
    awaitingSme:         all.filter((k) => k.state === 'sme-review'),
    awaitingEditorial:   all.filter((k) => k.state === 'editorial-review'),
    awaitingGovernance:  all.filter((k) => k.state === 'governance-review'),
    awaitingValidation:  all.filter((k) => k.state === 'validated'),
    total: all.filter((k) => !['published', 'rejected', 'abandoned'].includes(k.state)).length,
  };
}

// ── 5. KNOWLEDGE AGING ────────────────────────────────────────────────────────
// What expires this week / month / is already overdue?
export function buildKnowledgeAging(allEvidence, asOf) {
  const evs = allEvidence || [];
  return {
    overdue:          evs.filter((e) => e.expirationDate && isOverdue(e.expirationDate, asOf)),
    expiresThisWeek:  evs.filter((e) => e.expirationDate && isWithinDays(e.expirationDate, asOf, 7) && !isOverdue(e.expirationDate, asOf)),
    expiresThisMonth: evs.filter((e) => e.expirationDate && isWithinDays(e.expirationDate, asOf, 30) && !isWithinDays(e.expirationDate, asOf, 7) && !isOverdue(e.expirationDate, asOf)),
    healthy:          evs.filter((e) => e.expirationDate && !isOverdue(e.expirationDate, asOf) && !isWithinDays(e.expirationDate, asOf, 30)),
    noExpiry:         evs.filter((e) => !e.expirationDate),
    total:            evs.length,
  };
}

// ── BUNDLE C: AUTO-CAMPAIGN GENERATION ────────────────────────────────────────
// Converts queue items above a threshold into campaign objects.
// Returns new campaign objects — caller saves them via recordCampaign().
// Never creates duplicates for items that already have campaigns.
export function generateCampaignsFromQueue(queueItems, { priorities = ['HIGH'], limit = 10, at, providerIntel = {} } = {}) {
  return queueItems
    .filter((item) => priorities.includes(item.priority) && !item.hasCampaign)
    .slice(0, limit)
    .map((item) => {
      const bp = generateResearchBlueprint(item, { providerIntel, asOf: at });
      return createCampaign({
        goal:      blueprintToGoal(bp, { fieldLabel: item.fieldLabel, playbookLabel: item.playbookLabel, reason: item.reason }),
        assetId:   item.playbookType,
        fieldPath: item.fieldPath,
        gapTypes:  [item.gapKind],
        priority:  item.priority.toLowerCase(),
        trigger:   bp?.campaignTemplate?.defaultTrigger || 'research',
        providers: bp?.recommendedProviders?.length ? bp.recommendedProviders : item.suggestedProviders,
        at,
      });
    });
}

// ── BUNDLE G: RESEARCH SESSION ─────────────────────────────────────────────────
// Full gap analysis for a single playbook. Returns everything a steward needs
// to begin a research session without searching the UI.
export function buildResearchSession(pb, allEvidence, allKcrs, allCampaigns, asOf) {
  if (!pb) return null;
  const fields = getFieldPaths(pb);
  const evsByField = {};
  for (const ev of (allEvidence || [])) {
    if (ev.assetId !== pb.type) continue;
    if (!evsByField[ev.fieldPath]) evsByField[ev.fieldPath] = [];
    evsByField[ev.fieldPath].push(ev);
  }
  const kcrs = (allKcrs || []).filter((k) => k.assetId === pb.type);
  const campaigns = (allCampaigns || []).filter((c) => c.assetId === pb.type);

  const missingFields   = fields.filter(({ path }) => !evsByField[path]);
  const staleFields     = fields.filter(({ path }) => {
    const evs = evsByField[path] || [];
    if (!evs.length) return false;
    const newest = evs.reduce((m, e) => (!m || (e.capturedAt || '') > (m.capturedAt || '')) ? e : m, null);
    return newest && daysBetween(newest.capturedAt, asOf) > 90;
  });
  const commercialOnly  = fields.filter(({ path }) => {
    const evs = evsByField[path] || [];
    return evs.length > 0 && evs.every((e) => e.sourceType === 'commercial');
  });
  const hasContradictions = kcrs.filter((k) => k.type === 'contradiction');

  const coveredCount = fields.length - missingFields.length;
  const totalEvidence = (allEvidence || []).filter((e) => e.assetId === pb.type).length;
  const researchDebt  = missingFields.length + staleFields.length + commercialOnly.length;

  return {
    playbookType: pb.type,
    playbookLabel: pb.label || pb.type,
    totalFields: fields.length,
    coveredFields: coveredCount,
    totalEvidence,
    researchDebt,
    missingFields,
    staleFields,
    commercialOnly,
    contradictions: hasContradictions,
    activeKcrs: kcrs.filter((k) => !['published', 'rejected'].includes(k.state)),
    activeCampaigns: campaigns.filter((c) => c.state !== 'kcr'),
    suggestedProviders: [],
    highImpactFields: [...missingFields, ...staleFields].slice(0, 5),
  };
}

// ── BUNDLE H: EXECUTIVE DAILY REPORT ──────────────────────────────────────────
// Auto-generated. No synthetic metrics. Honest-empty when data is absent.
export function buildExecutiveReport(
  { overnight, queue, health, publishingQueue, aging },
  { playbooks = [], asOf }
) {
  const improved    = Object.entries(health?.health || {}).filter(([, h]) => h.totalEvidence > 0 && h.coveredFields / Math.max(1, h.totalFields) > 0.5).map(([type]) => type);
  const degrading   = Object.entries(health?.health || {}).filter(([pbType]) => (aging?.overdue || []).some((e) => e.assetId === pbType)).map(([pbType]) => pbType);
  const topGaps     = (queue || []).filter((q) => q.priority === 'HIGH').slice(0, 5);
  const readyToPublish = (publishingQueue?.awaitingGovernance || []).length;

  return {
    generatedAt: asOf,
    sections: {
      whatImproved:   improved.length ? improved : ['Nothing published yet — data collection in progress'],
      whatDegraded:   degrading.length ? degrading : ['No degradation detected'],
      whatChanged:    overnight ? `${overnight.newObservations} observations, ${overnight.newEvidence} evidence, ${overnight.newKcrs} KCRs overnight` : 'No overnight activity data',
      whatPublished:  overnight?.published ? `${overnight.published} KCRs published` : 'Nothing published yet',
      whatFailed:     overnight?.providerFailures ? `${overnight.providerFailures} provider failures (${(overnight.failedProviders || []).join(', ')})` : 'No provider failures',
      topResearch:    topGaps.map((g) => `${g.priority}: ${g.playbookLabel} — ${g.fieldLabel} (${g.reason})`),
      roiWork:        topGaps.slice(0, 3).map((g) => `${g.playbookLabel} ${g.fieldPath} via ${(g.suggestedProviders || []).join(', ')}`),
      knowledgeVelocity: overnight ? `${overnight.newEvidence} evidence + ${overnight.newFindings} findings → ${overnight.newKcrs} KCRs` : 'No velocity data',
      agingSummary:   `${(aging?.overdue || []).length} overdue, ${(aging?.expiresThisWeek || []).length} expire this week, ${(aging?.expiresThisMonth || []).length} expire this month`,
      readyToPublish,
    },
  };
}
