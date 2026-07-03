// ─── Failure Intelligence (KPP-1 Bundle D) ────────────────────────────────────
// Operational learning from completed events. Every failure record captures what
// went wrong, nearly went wrong, or exceeded expectations. Records never directly
// modify canonical knowledge — they route through KCR (governed, traceable).
//
// This is the platform's long-term moat: as events complete, knowledge improves.
// Evidence from failure records is the most operationally grounded source we have.

import { createKCR } from './knowledgeChange';
import { playbookId } from '../playbooks/playbookRegistry';

// ── Failure categories ─────────────────────────────────────────────────────────
export const FAILURE_CATEGORIES = [
  'vendor',        // vendor was late, wrong, unavailable
  'weather',       // weather impacted the event
  'attendance',    // actual headcount vs. estimate
  'budget',        // actual cost vs. estimate
  'timeline',      // timing failures, overruns
  'food',          // food shortages, waste, quality
  'equipment',     // equipment failure, missing items
  'staffing',      // staff shortage, coordination
  'logistics',     // transport, parking, access
  'communication', // coordination breakdowns
  'planning',      // insufficient lead time, missed tasks
  'execution',     // day-of execution failures
  'safety',        // food safety, physical safety concerns
  'satisfaction',  // guest/planner/host satisfaction
  'other',
];

export const FAILURE_SEVERITIES = ['critical', 'major', 'minor', 'near-miss', 'exceeded'];
// 'exceeded' = positive: something was better than expected (also informative)

export const FAILURE_SOURCES = ['host', 'planner', 'coordinator', 'vendor', 'operator', 'post-event-survey'];

// ── Failure record shape ───────────────────────────────────────────────────────
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function createFailureRecord({
  eventId, eventType, category, what, severity = 'minor', impact = '',
  context = {}, estimatedVsActual = null, source = 'operator', at,
  fieldPath = null, proposedFix = null,
}) {
  const id = `fail-${slug(eventType)}-${slug(category)}-${String(at || '').replace(/\D/g, '').slice(0, 10)}`;
  return Object.freeze({
    id,
    eventId: eventId || null,
    eventType,
    category,
    what,
    severity,  // 'critical' | 'major' | 'minor' | 'near-miss' | 'exceeded'
    impact,    // plain-language impact description
    context,   // freeform event context (weather, headcount, region, season, etc.)
    estimatedVsActual,  // { field, estimated, actual, delta, deltaPct }
    source,    // who reported this
    at: at || null,
    fieldPath, // which playbook field this informs (if known)
    proposedFix,     // optional: what should change
    linkedKCRId: null,  // set after KCR creation
    status: 'raw',   // raw → reviewed → linked
    audit: [{ at, action: 'created', status: 'raw' }],
  });
}

// ── Route a failure record → KCR ───────────────────────────────────────────────
// Maps the failure's category to a KCR type and trigger.
// NEVER auto-publishes. Every fix goes through the review pipeline.
const CATEGORY_TO_KCR = {
  vendor:        { type: 'correction',         trigger: 'sme',       fieldPath: 'vendors' },
  weather:       { type: 'sme-revision',        trigger: 'sme',       fieldPath: 'risks' },
  attendance:    { type: 'citation',            trigger: 'research',  fieldPath: 'guests' },
  budget:        { type: 'research',            trigger: 'research',  fieldPath: 'purchases[].unitCostRange' },
  timeline:      { type: 'correction',         trigger: 'sme',       fieldPath: 'tasks' },
  food:          { type: 'correction',         trigger: 'sme',       fieldPath: 'purchases' },
  equipment:     { type: 'missing-evidence',   trigger: 'sme',       fieldPath: 'operational' },
  staffing:      { type: 'sme-revision',       trigger: 'sme',       fieldPath: 'vendors' },
  logistics:     { type: 'correction',         trigger: 'sme',       fieldPath: 'tasks' },
  communication: { type: 'sme-revision',       trigger: 'sme',       fieldPath: 'tasks' },
  planning:      { type: 'correction',         trigger: 'freshness', fieldPath: 'milestones' },
  execution:     { type: 'sme-revision',       trigger: 'sme',       fieldPath: 'operational' },
  safety:        { type: 'sme-revision',       trigger: 'sme',       fieldPath: 'risks' },
  satisfaction:  { type: 'validation-finding', trigger: 'validation', fieldPath: 'governance' },
  other:         { type: 'quality-gap',        trigger: 'sme',       fieldPath: 'governance' },
};

export function failureToKCR(record, asOf) {
  const map = CATEGORY_TO_KCR[record.category] || CATEGORY_TO_KCR.other;
  const fp = record.fieldPath || map.fieldPath;
  const id = `kcr-fi-${playbookId(record.eventType)}-${slug(record.category)}-${String(record.at || '').replace(/\D/g, '').slice(0, 10)}`;

  const reason = [
    `[${record.severity.toUpperCase()}] ${record.category}: ${record.what}`,
    record.impact ? `Impact: ${record.impact}` : null,
    record.estimatedVsActual ? `Est. vs Actual: ${JSON.stringify(record.estimatedVsActual)}` : null,
    record.proposedFix ? `Proposed: ${record.proposedFix}` : null,
    `Source: ${record.source} (${record.at})`,
  ].filter(Boolean).join(' | ');

  return createKCR({
    id, type: map.type, trigger: map.trigger,
    assetId: record.eventType, assetKind: 'playbook',
    fieldPath: fp, reason,
    createdBy: 'failure-intelligence',
    asOf,
  });
}

// ── Analysis: aggregate patterns across failure records ────────────────────────
// Returns dimensional summary — never a single failure rate.
export function analyzeFailures(records) {
  if (!records.length) return { total: 0, byCategory: {}, bySeverity: {}, bySource: {}, estimationGaps: [], patterns: [] };

  const byCategory = records.reduce((m, r) => { m[r.category] = (m[r.category] || 0) + 1; return m; }, {});
  const bySeverity = records.reduce((m, r) => { m[r.severity] = (m[r.severity] || 0) + 1; return m; }, {});
  const bySource = records.reduce((m, r) => { m[r.source] = (m[r.source] || 0) + 1; return m; }, {});

  // Estimation gaps: records where estimated ≠ actual (reveals calibration errors)
  const estimationGaps = records
    .filter((r) => r.estimatedVsActual && r.estimatedVsActual.deltaPct != null)
    .map((r) => ({ ...r.estimatedVsActual, category: r.category, eventType: r.eventType }))
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));

  // Patterns: categories that appear in >20% of records
  const threshold = records.length * 0.2;
  const patterns = Object.entries(byCategory)
    .filter(([, n]) => n > threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => ({ category: cat, count, pct: Math.round(count / records.length * 100) }));

  return { total: records.length, byCategory, bySeverity, bySource, estimationGaps, patterns };
}

// ── Thin store ─────────────────────────────────────────────────────────────────
const KEY = 'ngw-kas-failures';
export function loadFailures() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function saveFailures(list) { try { localStorage.setItem(KEY, JSON.stringify(list || [])); return true; } catch { return false; } }
export function recordFailure(f) { const list = loadFailures().filter((x) => x.id !== f.id); list.push(f); saveFailures(list); return list; }
export function clearFailures() { try { localStorage.removeItem(KEY); } catch { /* noop */ } }
