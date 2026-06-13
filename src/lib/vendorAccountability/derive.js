// ─── Vendor Accountability Derivation Helpers ──────────────────────────────
// Sprint 61.A Phase A. Pure functions that read vendor + event + promise
// state and return: expected promises, accountability tier, missing proof,
// follow-up questions, brief readiness, conflicts, next action.

import { getVendorPlaybook, normalizeCategory, UNIVERSAL_VENDOR_QUESTIONS } from './playbooks.js';
import { makePromise, PROMISE_STATUS_SEVERITY } from './promiseModel.js';

// Internal accountability tier (machine-internal). UI maps to display labels.
export const ACCOUNTABILITY_TIERS = Object.freeze([
  'on_track',
  'needs_proof',
  'needs_follow_up',
  'at_risk',
  'missed_promise',
]);

export const ACCOUNTABILITY_LABEL = Object.freeze({
  on_track:        'On track',
  needs_proof:     'Needs proof',
  needs_follow_up: 'Needs follow-up',
  at_risk:         'At risk',
  missed_promise:  'Missed promise',
});

// ─── Utilities ────────────────────────────────────────────────────────────
function daysUntil(iso) {
  if (!iso) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(iso); target.setHours(0,0,0,0);
  return Math.round((target - today) / 86_400_000);
}

function isPast(iso) {
  if (!iso) return false;
  return daysUntil(iso) < 0;
}

// ──────────────────────────────────────────────────────────────────────────
// 1. deriveVendorExpectedPromises
// Returns the full set of promise records the planner SHOULD have for a
// given vendor + event, regardless of whether any have been created yet.
// Each entry is shaped like a Promise — callers can persist them as is.
// ──────────────────────────────────────────────────────────────────────────
export function deriveVendorExpectedPromises(vendor, event) {
  if (!vendor || !event) return [];
  const playbook = getVendorPlaybook(vendor.category);
  const eventDate = event.date || null;
  return playbook.commonPromises.map(pp => {
    const dueDate = eventDate
      ? new Date(new Date(eventDate).getTime() - pp.daysBefore * 86_400_000).toISOString().slice(0, 10)
      : null;
    return makePromise({
      vendorId: vendor.id,
      eventId: event.id,
      categoryKey: playbook.categoryKey,
      playbookPromise: pp,
      dueDate,
      whyItMatters: playbook.whyItMattersByField[pp.key] || null,
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 2. deriveVendorMissingProof
// Returns promise records that require evidence but don't have any.
// ──────────────────────────────────────────────────────────────────────────
export function deriveVendorMissingProof(vendor, event, promises = []) {
  return (promises || []).filter(p =>
    p.evidenceRequired &&
    p.evidenceStatus !== 'attached' &&
    p.evidenceStatus !== 'confirmed' &&
    p.status !== 'not_required' &&
    p.status !== 'completed'
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 3. deriveVendorAccountability
// The big one. Returns { tier, score, reasons[], openIssues, dueSoon, overdue,
// missingProof, criticalUnconfirmed }.
// "Missed promise" requires: promised + dueDate passed + no completion +
// no evidence. Calm by default; harsh only when evidence supports it.
// ──────────────────────────────────────────────────────────────────────────
export function deriveVendorAccountability(vendor, event, promises = []) {
  if (!vendor || !event) {
    return { tier: 'on_track', score: 100, reasons: [], openIssues: 0, dueSoon: 0, overdue: 0, missingProof: 0, criticalUnconfirmed: 0 };
  }
  const eventDays = daysUntil(event.date);
  const playbook = getVendorPlaybook(vendor.category);

  // Categorize promises. `actionable` = anything still needing planner
  // attention; `confirmed` promises drop out of follow-up math even if
  // their due date is approaching.
  const actionable = promises.filter(p =>
    p.status !== 'completed' &&
    p.status !== 'not_required' &&
    p.status !== 'confirmed'
  );
  const open       = actionable;
  const overdueRaw = actionable.filter(p => isPast(p.dueDate));
  const dueSoon    = actionable.filter(p => {
    const d = daysUntil(p.dueDate);
    return d !== null && d >= 0 && d <= 3;
  });
  const evidenceMissing = actionable.filter(p =>
    p.evidenceRequired &&
    p.evidenceStatus !== 'attached' &&
    p.evidenceStatus !== 'confirmed'
  );

  // Critical confirmations missing from playbook
  const required = new Set(playbook.requiredConfirmations || []);
  const confirmedKeys = new Set(promises.filter(p => p.status === 'confirmed' || p.status === 'completed').map(p => p.promiseKey));
  const criticalUnconfirmed = [...required].filter(k => !confirmedKeys.has(k));

  // "Missed promise" — strict criteria
  const missed = overdueRaw.filter(p =>
    (p.status === 'promised' || p.status === 'evidence_needed' || p.status === 'at_risk' || p.status === 'overdue') &&
    p.evidenceStatus !== 'attached' &&
    p.evidenceStatus !== 'confirmed' &&
    !p.completedAt
  );

  // Reasons — explainable, plain language
  const reasons = [];
  missed.forEach(p => reasons.push(`${p.promiseText} promised by ${p.dueDate || 'unknown date'} — no completion or evidence.`));
  overdueRaw.forEach(p => {
    if (!missed.includes(p)) reasons.push(`${p.promiseText} overdue (${p.dueDate || 'no date'}).`);
  });
  dueSoon.forEach(p => reasons.push(`${p.promiseText} due in ${daysUntil(p.dueDate)} day(s).`));
  evidenceMissing.forEach(p => {
    if (!overdueRaw.includes(p) && !missed.includes(p)) reasons.push(`${p.promiseText} — evidence missing.`);
  });
  criticalUnconfirmed.forEach(key => {
    const label = (playbook.commonPromises.find(pp => pp.key === key) || {}).label || key;
    reasons.push(`${label} — critical confirmation missing.`);
  });

  // Score (0–100). Transparent: every penalty is named.
  let score = 100;
  score -= missed.length * 25;
  score -= overdueRaw.length * 15;
  score -= dueSoon.length * 6;
  score -= evidenceMissing.length * 5;
  score -= criticalUnconfirmed.length * (eventDays !== null && eventDays < 14 ? 12 : 6);
  if (eventDays !== null && eventDays < 7 && criticalUnconfirmed.length > 0) score -= 8;
  if (vendor && vendor.lastContactedAt) {
    const days = daysUntil(vendor.lastContactedAt);
    if (days !== null && days < -21) score -= 4; // stale contact
  }
  if (score < 0) score = 0;

  // Tier — issue-type aware, not just score-based
  let tier;
  if (missed.length > 0)                                    tier = 'missed_promise';
  else if (eventDays !== null && eventDays < 14 && (criticalUnconfirmed.length > 0 || overdueRaw.length > 0)) tier = 'at_risk';
  else if (overdueRaw.length > 0)                           tier = 'needs_follow_up';
  else if (criticalUnconfirmed.length > 0 || dueSoon.length > 0) tier = 'needs_follow_up';
  else if (evidenceMissing.length > 0)                      tier = 'needs_proof';
  else                                                       tier = 'on_track';

  return {
    tier,
    score,
    reasons,
    openIssues: open.length,
    dueSoon: dueSoon.length,
    overdue: overdueRaw.length,
    missingProof: evidenceMissing.length,
    criticalUnconfirmed: criticalUnconfirmed.length,
    missedPromiseCount: missed.length,
    eventDays,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 4. deriveVendorFollowUpQuestions
// Returns the category-driven list of questions the planner should ask to
// close the open promises.
// ──────────────────────────────────────────────────────────────────────────
export function deriveVendorFollowUpQuestions(vendor, event, promises = []) {
  if (!vendor) return [];
  const playbook = getVendorPlaybook(vendor.category);
  const open = (promises || []).filter(p => p.status !== 'completed' && p.status !== 'not_required' && p.status !== 'confirmed');
  const openKeys = new Set(open.map(p => p.promiseKey));
  // Prioritize: overdue + critical first, then due-soon, then everything else
  const fromPlaybook = playbook.questionsToAsk || [];
  const items = playbook.commonPromises
    .filter(pp => openKeys.has(pp.key) || (pp.critical && !openKeys.has(pp.key)))
    .map(pp => ({
      key: pp.key,
      label: pp.label,
      critical: pp.critical,
      why: playbook.whyItMattersByField[pp.key] || null,
    }));
  // Category script first (most relevant), then the universal baseline every
  // vendor should be asked — de-duplicated.
  const suggestedQuestions = [...fromPlaybook, ...UNIVERSAL_VENDOR_QUESTIONS.filter(q => !fromPlaybook.includes(q))];
  return { items, suggestedQuestions };
}

// ──────────────────────────────────────────────────────────────────────────
// 5. deriveVendorBriefReadiness
// How ready is the vendor brief? Returns ready/missing items + percentage.
// ──────────────────────────────────────────────────────────────────────────
export function deriveVendorBriefReadiness(vendor, event, promises = []) {
  if (!vendor || !event) return { readyCount: 0, totalCount: 0, percentage: 0, missingItems: [], readyItems: [], recommendedNextAction: null };
  const playbook = getVendorPlaybook(vendor.category);
  const sections = playbook.briefSections || [];
  // Map brief section -> playbook promise key (best-effort by case-insensitive substring match).
  // Sprint 60.W Phase A — briefSections reference playbook promise keys
  // directly. Exact key match avoids fuzzy matching ambiguity.
  const promiseByKey = new Map((promises || []).map(p => [p.promiseKey, p]));
  const readyItems = [];
  const missingItems = [];
  sections.forEach(sec => {
    const p = promiseByKey.get(sec);
    if (p && (p.status === 'confirmed' || p.status === 'completed')) readyItems.push(sec);
    else missingItems.push(sec);
  });
  const total = sections.length || 1;
  const percentage = Math.round((readyItems.length / total) * 100);
  const recommendedNextAction = missingItems.length
    ? `Confirm ${missingItems[0]} with vendor`
    : null;
  return {
    readyCount: readyItems.length,
    totalCount: sections.length,
    percentage,
    missingItems,
    readyItems,
    recommendedNextAction,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 6. deriveVendorNextAccountabilityAction
// Single concrete next action the planner should take.
// ──────────────────────────────────────────────────────────────────────────
export function deriveVendorNextAccountabilityAction(vendor, event, promises = []) {
  if (!vendor) return null;
  const acc = deriveVendorAccountability(vendor, event, promises);
  // Priority: missed > overdue > due_soon > evidence missing > critical unconfirmed
  const open = (promises || []).filter(p => p.status !== 'completed' && p.status !== 'not_required');
  const missed = open.find(p => isPast(p.dueDate) && p.evidenceStatus !== 'attached' && p.evidenceStatus !== 'confirmed' && p.status !== 'completed');
  const overdueP = open.find(p => isPast(p.dueDate));
  const dueSoonP = open.find(p => { const d = daysUntil(p.dueDate); return d !== null && d >= 0 && d <= 3; });
  const evidenceP = open.find(p => p.evidenceRequired && p.evidenceStatus !== 'attached' && p.evidenceStatus !== 'confirmed');
  const pick = missed || overdueP || dueSoonP || evidenceP;
  if (!pick) {
    return acc.tier === 'on_track'
      ? { label: 'On track — no action needed', kind: 'none', promiseKey: null, route: null }
      : { label: 'Review open promises', kind: 'review', promiseKey: null, route: { tab: 'Vendors', vendorId: vendor.id, section: 'promises' } };
  }
  const verb =
    pick === missed   ? 'Resolve missed promise:'
    : pick === overdueP ? 'Follow up on overdue:'
    : pick === dueSoonP ? 'Confirm due soon:'
    : 'Attach proof for:';
  return {
    label: `${verb} ${pick.promiseText}`,
    kind: pick === missed ? 'resolve' : pick === overdueP ? 'follow_up' : pick === dueSoonP ? 'confirm' : 'attach',
    promiseKey: pick.promiseKey,
    route: { tab: 'Vendors', vendorId: vendor.id, section: 'promises', promiseId: pick.id },
  };
}

// Convenience: tier label for UI without importing two modules.
export function accountabilityLabel(tier) {
  return ACCOUNTABILITY_LABEL[tier] || tier;
}

// ──────────────────────────────────────────────────────────────────────────
// 7. inferPromisesFromVendor
// Phase C bridge — synthesizes Promise state from EXISTING vendor fields
// (arrivalTime, contractUrl, contractSigned, balancePaid, etc.) so we can
// surface accountability tiers at the list level without requiring the
// planner to migrate to Promise Tracker persistence. Phase B will replace
// these inferences with real persisted Promise records.
//
// The inference is one-way (vendor → promises). It never writes back.
// ──────────────────────────────────────────────────────────────────────────
export function inferPromisesFromVendor(vendor, event) {
  if (!vendor || !event) return [];
  const playbook = getVendorPlaybook(vendor.category);
  const expected = deriveVendorExpectedPromises(vendor, event);

  // Heuristic per-vendor field map. Each entry says "if this vendor field
  // is truthy, mark these promise keys as confirmed (with evidence) at the
  // corresponding evidence status."
  const heuristics = {
    arrival_time:    { whenTruthy: !!vendor.arrivalTime,                       evidence: 'not_required' },
    coverage_hours:  { whenTruthy: !!(vendor.coverageStart || vendor.coverageEnd), evidence: 'not_required' },
    payment_terms:   { whenTruthy: !!(vendor.cost || vendor.depositAmt || vendor.balancePaid || vendor.depositPaid), evidence: 'attached' },
    scope_confirmed: { whenTruthy: !!(vendor.contractUrl || vendor.contractFileName || vendor.contractSigned), evidence: 'attached' },
    day_of_contact:  { whenTruthy: !!(vendor.contact || vendor.phone || vendor.contactName),  evidence: 'not_required' },
    delivery_time:   { whenTruthy: !!vendor.deliveryTime, evidence: 'not_required' },
    delivery_window: { whenTruthy: !!(vendor.deliveryWindowStart || vendor.deliveryWindowEnd), evidence: 'not_required' },
    setup_window:    { whenTruthy: !!(vendor.setupStart || vendor.setupEnd),    evidence: 'not_required' },
    passenger_count: { whenTruthy: vendor.passengerCount != null,               evidence: 'attached' },
    headcount:       { whenTruthy: vendor.headcount != null || vendor.staffCount != null, evidence: 'attached' },
    guard_count:     { whenTruthy: vendor.guardCount != null,                   evidence: 'attached' },
    staff_count:     { whenTruthy: vendor.staffCount != null,                   evidence: 'attached' },
    final_guest_count: { whenTruthy: vendor.guestCount != null, evidence: 'attached' },
  };

  // Broad signal: a vendor whose status is "Confirmed" / "Contracted" /
  // "Deposit Paid" is at least scope-confirmed.
  const SCOPE_CONFIRMED_STATUSES = new Set(['Confirmed', 'Contracted', 'Deposit Paid']);
  const scopeConfirmedByStatus = vendor.status && SCOPE_CONFIRMED_STATUSES.has(vendor.status);

  // Planner override (2026-06-12): `vendor.promiseEvidence` is a studio-scoped
  // map { promiseKey: 'attached' } the planner sets via "Mark proof on file".
  // It's an honest manual assertion ("I have it"), NOT a faked upload — and it
  // wins over the heuristics so the accountability tracker can be CLEARED.
  const overrides = vendor.promiseEvidence || {};

  return expected.map(p => {
    const ov = overrides[p.promiseKey];
    if (ov) {
      return {
        ...p,
        status: 'confirmed',
        evidenceStatus: p.evidenceRequired ? ov : 'not_required',
        sourceType: 'planner',
      };
    }
    const h = heuristics[p.promiseKey];
    if (h && h.whenTruthy) {
      return {
        ...p,
        status: 'confirmed',
        evidenceStatus: p.evidenceRequired ? h.evidence : 'not_required',
        sourceType: 'system',
      };
    }
    if (p.promiseKey === 'scope_confirmed' && scopeConfirmedByStatus) {
      return { ...p, status: 'confirmed', evidenceStatus: 'attached', sourceType: 'system' };
    }
    return p;
  });
}

// Convenience wrapper used by the VendorList — computes accountability
// directly from a vendor + event without requiring the caller to thread
// Promise records.
export function quickAccountabilityForVendor(vendor, event) {
  const inferred = inferPromisesFromVendor(vendor, event);
  return deriveVendorAccountability(vendor, event, inferred);
}
