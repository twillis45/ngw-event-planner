// ─── Promise Tracker Model ─────────────────────────────────────────────────
// Sprint 61.A Phase A. Schema constants + state machine for the Promise
// Tracker. Promise records reference source records (contract, message,
// document) — they never duplicate that truth.

/**
 * @typedef {('not_requested'|'requested'|'promised'|'evidence_needed'|'confirmed'|'due_soon'|'overdue'|'changed'|'at_risk'|'completed'|'not_required')} PromiseStatus
 */

/** All allowed promise statuses (machine-internal). */
export const PROMISE_STATUSES = Object.freeze([
  'not_requested',
  'requested',
  'promised',
  'evidence_needed',
  'confirmed',
  'due_soon',
  'overdue',
  'changed',
  'at_risk',
  'completed',
  'not_required',
]);

/** User-facing label for each status. */
export const PROMISE_STATUS_LABEL = Object.freeze({
  not_requested:   'Not requested',
  requested:       'Requested',
  promised:        'Promised',
  evidence_needed: 'Evidence needed',
  confirmed:       'Confirmed',
  due_soon:        'Due soon',
  overdue:         'Overdue',
  changed:         'Changed',
  at_risk:         'At risk',
  completed:       'Completed',
  not_required:    'Not required',
});

/** Severity bucket per status (drives UI color + accountability score). */
export const PROMISE_STATUS_SEVERITY = Object.freeze({
  not_requested:   'watch',
  requested:       'watch',
  promised:        'watch',
  evidence_needed: 'attention',
  confirmed:       'none',
  due_soon:        'attention',
  overdue:         'critical',
  changed:         'attention',
  at_risk:         'critical',
  completed:       'none',
  not_required:    'none',
});

/** Evidence statuses. */
export const EVIDENCE_STATUSES = Object.freeze(['none', 'attached', 'confirmed', 'not_required']);

/** Source types — keep aligned with existing source records. */
export const SOURCE_TYPES = Object.freeze(['contract', 'message', 'note', 'invoice', 'uploaded_file', 'manual', 'system']);

/** Risk levels (mirrors notification severity 0–4 collapsed to 4 buckets). */
export const RISK_LEVELS = Object.freeze(['none', 'watch', 'attention', 'critical']);

/**
 * @typedef Promise
 * @prop {string}  id
 * @prop {string}  vendorId
 * @prop {string}  eventId
 * @prop {string}  category               playbook key
 * @prop {string}  promiseKey             matches a playbook commonPromises[].key
 * @prop {string}  promiseText            human label (defaults from playbook)
 * @prop {string|null} expectedBy         ISO date string
 * @prop {string|null} promisedBy         ISO date string — when vendor committed
 * @prop {('planner'|'vendor'|'client'|'venue'|'team')} owner
 * @prop {('contract'|'message'|'note'|'invoice'|'uploaded_file'|'manual'|'system')} sourceType
 * @prop {string|null} sourceId           id of the source record
 * @prop {boolean} evidenceRequired
 * @prop {('none'|'attached'|'confirmed'|'not_required')} evidenceStatus
 * @prop {Array<{kind:string, id:string}>} evidenceRefs
 * @prop {PromiseStatus} status
 * @prop {string|null} dueDate
 * @prop {string|null} completedAt
 * @prop {string|null} lastCheckedAt
 * @prop {('none'|'watch'|'attention'|'critical')} riskLevel
 * @prop {string|null} nextAction
 * @prop {{tab:string, vendorId?:string, sourceId?:string}|null} nextActionRoute
 * @prop {string|null} whyItMatters       loaded from playbook
 * @prop {string} notes
 */

/**
 * Build a blank promise record from a playbook entry.
 * @param {Object} opts
 * @param {string} opts.vendorId
 * @param {string} opts.eventId
 * @param {string} opts.categoryKey
 * @param {Object} opts.playbookPromise   one entry from playbook.commonPromises
 * @param {string|null} [opts.dueDate]
 */
export function makePromise({ vendorId, eventId, categoryKey, playbookPromise, dueDate = null, whyItMatters = null }) {
  return {
    id: `pr-${vendorId}-${playbookPromise.key}`,
    vendorId,
    eventId,
    category: categoryKey,
    promiseKey: playbookPromise.key,
    promiseText: playbookPromise.label,
    expectedBy: null,
    promisedBy: null,
    owner: playbookPromise.ownerHint || 'planner',
    sourceType: 'manual',
    sourceId: null,
    evidenceRequired: !!playbookPromise.evidenceRequired,
    evidenceStatus: playbookPromise.evidenceRequired ? 'none' : 'not_required',
    evidenceRefs: [],
    status: 'not_requested',
    dueDate,
    completedAt: null,
    lastCheckedAt: null,
    riskLevel: 'none',
    nextAction: null,
    nextActionRoute: null,
    whyItMatters,
    notes: '',
  };
}

/**
 * State transitions — strict allowlist. Helpers below use these to keep
 * the state machine honest. UI components should call `transition()` not
 * mutate `.status` directly.
 */
const TRANSITIONS = {
  not_requested:   ['requested', 'not_required', 'completed'],
  requested:       ['promised', 'overdue', 'not_required'],
  promised:        ['evidence_needed', 'confirmed', 'changed', 'overdue', 'completed', 'not_required'],
  evidence_needed: ['confirmed', 'overdue', 'at_risk', 'completed', 'not_required'],
  confirmed:       ['completed', 'changed', 'at_risk'],
  due_soon:        ['confirmed', 'overdue', 'completed'],
  overdue:         ['confirmed', 'at_risk', 'completed'],
  changed:         ['confirmed', 'overdue', 'at_risk'],
  at_risk:         ['confirmed', 'overdue', 'completed'],
  completed:       [],
  not_required:    ['requested'],
};

export function canTransition(from, to) {
  if (!PROMISE_STATUSES.includes(from)) return false;
  if (!PROMISE_STATUSES.includes(to))   return false;
  return TRANSITIONS[from].includes(to);
}

/**
 * Returns a new promise with the status applied, or returns the original
 * unchanged if the transition is not allowed.
 */
export function transition(promise, nextStatus, patch = {}) {
  if (!canTransition(promise.status, nextStatus)) return promise;
  return {
    ...promise,
    ...patch,
    status: nextStatus,
    riskLevel: PROMISE_STATUS_SEVERITY[nextStatus] || promise.riskLevel,
    lastCheckedAt: new Date().toISOString(),
  };
}
