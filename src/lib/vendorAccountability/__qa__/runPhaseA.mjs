// ─── Vendor Accountability Phase A — QA script ─────────────────────────────
// Sprint 61.A. Run with:  node src/lib/vendorAccountability/__qa__/runPhaseA.mjs
// Asserts:
//  - every playbook loads
//  - every category returns expected confirmations
//  - every fixture returns a tier
//  - every fixture returns a next action
//  - follow-up text is generated and provider state controls allowed actions
//  - brief readiness returns ready/missing counts
//  - conflict detector catches expected conflicts
//  - no provider/send action is exposed when commLive/emailEnabled are false

import {
  PLAYBOOKS,
  PLAYBOOK_KEYS,
  getVendorPlaybook,
  deriveVendorAccountability,
  deriveVendorMissingProof,
  deriveVendorBriefReadiness,
  deriveVendorFollowUpQuestions,
  deriveVendorNextAccountabilityAction,
  deriveVendorPromiseConflicts,
  generateVendorFollowUpDraft,
} from '../index.js';
import { FIXTURES } from '../fixtures.js';

let failed = 0;
let passed = 0;
const failures = [];

function ok(cond, msg) {
  if (cond) { passed += 1; }
  else      { failed += 1; failures.push(msg); }
}

function header(title) {
  console.log(`\n=== ${title} ===`);
}

// ──────────────────────────────────────────────────────────────────────────
header('Playbook completeness');
const expectedKeys = [
  'venue', 'catering', 'photo_video', 'dj_entertainment', 'florist_decor',
  'rentals', 'transportation', 'hair_makeup', 'officiant', 'av_production',
  'security', 'staffing', 'other',
];
expectedKeys.forEach(key => {
  const pb = PLAYBOOKS[key];
  ok(!!pb, `Playbook present: ${key}`);
  if (pb) {
    ok(Array.isArray(pb.commonPromises) && pb.commonPromises.length > 0, `${key}: has commonPromises`);
    ok(Array.isArray(pb.requiredConfirmations) && pb.requiredConfirmations.length > 0, `${key}: has requiredConfirmations`);
    ok(Array.isArray(pb.questionsToAsk) && pb.questionsToAsk.length > 0, `${key}: has questionsToAsk`);
    ok(typeof pb.whyItMattersByField === 'object', `${key}: has whyItMattersByField`);
    // Every required confirmation should also appear in commonPromises
    const promiseKeys = new Set(pb.commonPromises.map(p => p.key));
    pb.requiredConfirmations.forEach(k => {
      ok(promiseKeys.has(k), `${key}: requiredConfirmation "${k}" exists in commonPromises`);
    });
    // Every evidenceNeeded entry exists
    (pb.evidenceNeeded || []).forEach(k => {
      ok(promiseKeys.has(k), `${key}: evidenceNeeded "${k}" exists in commonPromises`);
    });
  }
});

// Category normalization sanity
ok(getVendorPlaybook('Florals').categoryKey === 'florist_decor', 'normalizeCategory: "Florals" → florist_decor');
ok(getVendorPlaybook('Photography').categoryKey === 'photo_video', 'normalizeCategory: "Photography" → photo_video');
ok(getVendorPlaybook('Caterer').categoryKey === 'catering', 'normalizeCategory: "Caterer" → catering');
ok(getVendorPlaybook('not-a-real-category').categoryKey === 'other', 'normalizeCategory: unknown → other');

// ──────────────────────────────────────────────────────────────────────────
header('Fixture behavior');
FIXTURES.forEach(fix => {
  const { name, event, vendor, promises, expected } = fix;
  // Tier
  const acc = deriveVendorAccountability(vendor, event, promises);
  ok(typeof acc.tier === 'string', `[${name}] returns a tier`);
  if (expected.tier) {
    ok(acc.tier === expected.tier, `[${name}] tier === ${expected.tier} (got ${acc.tier})`);
  }
  ok(Array.isArray(acc.reasons), `[${name}] reasons is an array`);

  // Next action
  const next = deriveVendorNextAccountabilityAction(vendor, event, promises);
  ok(!!next && typeof next === 'object', `[${name}] returns a next action`);
  if (expected.nextActionContains) {
    const label = (next.label || '').toLowerCase();
    expected.nextActionContains.forEach(term => {
      ok(label.includes(term.toLowerCase()), `[${name}] next action mentions "${term}"`);
    });
  }

  // Missing proof
  const missing = deriveVendorMissingProof(vendor, event, promises);
  ok(Array.isArray(missing), `[${name}] missing proof is an array`);
  if (expected.missingProofIncludes) {
    expected.missingProofIncludes.forEach(k => {
      ok(missing.some(p => p.promiseKey === k), `[${name}] missing proof includes "${k}"`);
    });
  }

  // Follow-up questions
  const fu = deriveVendorFollowUpQuestions(vendor, event, promises);
  ok(typeof fu === 'object' && Array.isArray(fu.items), `[${name}] follow-up returns items[]`);
  if (expected.followUpKeysInclude) {
    expected.followUpKeysInclude.forEach(k => {
      ok(fu.items.some(it => it.key === k), `[${name}] follow-up mentions "${k}"`);
    });
  }

  // Brief readiness
  const brief = deriveVendorBriefReadiness(vendor, event, promises);
  ok(typeof brief.readyCount === 'number' && typeof brief.totalCount === 'number', `[${name}] brief returns ready/total counts`);
  ok(typeof brief.percentage === 'number', `[${name}] brief returns percentage`);
  if (expected.briefMissingIncludes) {
    expected.briefMissingIncludes.forEach(k => {
      ok(brief.missingItems.includes(k), `[${name}] brief missing items include "${k}"`);
    });
  }
  if (expected.briefPercentageAtLeast) {
    ok(brief.percentage >= expected.briefPercentageAtLeast, `[${name}] brief percentage >= ${expected.briefPercentageAtLeast} (got ${brief.percentage})`);
  }

  // Conflicts (event-level)
  const conflicts = deriveVendorPromiseConflicts(event, promises);
  ok(Array.isArray(conflicts), `[${name}] conflicts is an array`);
  if (expected.conflictKinds) {
    expected.conflictKinds.forEach(k => {
      ok(conflicts.some(c => c.kind === k), `[${name}] conflicts include kind "${k}"`);
    });
  }
  if (expected.affectedVendorId) {
    ok(conflicts.some(c => c.affectedVendorId === expected.affectedVendorId), `[${name}] conflicts list ${expected.affectedVendorId}`);
  }

  // Follow-up draft truthfulness
  const draftOffline = generateVendorFollowUpDraft(vendor, event, promises, { commLive: false, emailEnabled: false });
  ok(typeof draftOffline.subject === 'string' && draftOffline.subject.length > 0, `[${name}] draft has subject`);
  ok(typeof draftOffline.body === 'string' && draftOffline.body.length > 0, `[${name}] draft has body`);
  ok(draftOffline.allowedActions.includes('copy'), `[${name}] offline draft allows Copy`);
  ok(draftOffline.allowedActions.includes('open_email_draft'), `[${name}] offline draft allows Open email draft`);
  ok(!draftOffline.allowedActions.includes('send_via_email'), `[${name}] offline draft BLOCKS Send via email`);
  ok(!draftOffline.allowedActions.includes('save_to_thread'), `[${name}] offline draft BLOCKS Save to thread`);

  const draftLive = generateVendorFollowUpDraft(vendor, event, promises, { commLive: true, emailEnabled: true });
  ok(draftLive.allowedActions.includes('save_to_thread'), `[${name}] live draft allows Save to thread`);
  ok(draftLive.allowedActions.includes('send_via_email'), `[${name}] live draft allows Send via email`);

  if (expected.followUpDraftReason) {
    ok(draftOffline.reason.toLowerCase().includes(expected.followUpDraftReason.toLowerCase()), `[${name}] draft reason mentions "${expected.followUpDraftReason}"`);
  }
});

// ──────────────────────────────────────────────────────────────────────────
header('Source-of-truth safety');
// We do not invent fields on the vendor object — promises live in their own table.
// Verify: no derive helper mutates vendor or event.
import { deriveVendorExpectedPromises } from '../derive.js';
const safeEvent = { id: 'ev-s', date: '2026-12-31', vendors: [], budget: [], guests: [], ros: [] };
const safeVendor = { id: 'v-s', name: 'Test', category: 'Catering' };
const snapshotEvent = JSON.stringify(safeEvent);
const snapshotVendor = JSON.stringify(safeVendor);
deriveVendorExpectedPromises(safeVendor, safeEvent);
deriveVendorAccountability(safeVendor, safeEvent, []);
deriveVendorBriefReadiness(safeVendor, safeEvent, []);
deriveVendorPromiseConflicts(safeEvent, []);
ok(JSON.stringify(safeEvent) === snapshotEvent,   'derive helpers do not mutate event');
ok(JSON.stringify(safeVendor) === snapshotVendor, 'derive helpers do not mutate vendor');

// ──────────────────────────────────────────────────────────────────────────
console.log(`\n=== RESULTS ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log('\n✓ All Phase A assertions passed.');
  process.exit(0);
}
