// ─── Vendor Accountability — barrel export ─────────────────────────────────
// Sprint 61.A Phase A.

export { PLAYBOOKS, PLAYBOOK_KEYS, getVendorPlaybook, normalizeCategory } from './playbooks.js';
export {
  PROMISE_STATUSES, PROMISE_STATUS_LABEL, PROMISE_STATUS_SEVERITY,
  EVIDENCE_STATUSES, SOURCE_TYPES, RISK_LEVELS,
  makePromise, canTransition, transition,
} from './promiseModel.js';
export {
  ACCOUNTABILITY_TIERS, ACCOUNTABILITY_LABEL, accountabilityLabel,
  deriveVendorExpectedPromises,
  deriveVendorMissingProof,
  deriveVendorAccountability,
  deriveVendorFollowUpQuestions,
  deriveVendorBriefReadiness,
  deriveVendorNextAccountabilityAction,
  inferPromisesFromVendor,
  quickAccountabilityForVendor,
} from './derive.js';
export { deriveVendorPromiseConflicts, conflictsForVendor } from './conflicts.js';
export { generateVendorFollowUpDraft, generateAllFollowUpDrafts } from './followUpDrafts.js';
