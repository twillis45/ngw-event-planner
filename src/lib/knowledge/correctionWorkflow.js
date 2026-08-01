// ─── GOVERNED CORRECTION PATH (Phase 5C.2) ───────────────────────────────────
//
// WHY THIS EXISTS. Phase 5C.1 found a defect in a PUBLISHED artifact:
// `p_wine.provenance` shipped a derivation whose arithmetic did not reproduce
// (it attributed the source's ~40% BEER share to wine, and its own stated method
// yields 0.24 bottle/guest, not the 0.4 published). The playbook was repaired,
// and the repair did not reach a single host — because a published override wins
// over the authored value, and nothing in NGW could replace a published override.
//
// NGW had proven it could PUBLISH governed knowledge. It had never proven it
// could FIX published governed knowledge. Every artifact in the snapshot was
// effectively write-once, and defects were found in both of them.
//
// WHAT THIS ADDS: nothing to the schema, and no new governance. A correction is
// an ordinary KCR that happens to name the version it replaces. It walks exactly
// the same gates as a first publication — evidence, SME + editorial + governance
// review, approval — because a correction that could skip review would be a
// wider hole than the defect it fixes.
//
// The ONLY new capability is at the selection boundary (publishedSnapshotBuild),
// where "last in the array wins" became "the head of the lineage wins".
//
// HISTORY IS PRESERVED. v1 is not deleted, mutated, or removed from the export.
// It stays a published KCR with its full audit trail; it simply stops being the
// head of its lineage. That is what makes rollback possible: withdraw v2 and v1
// is current again, with nothing to restore.

import {
  createKCR, addEvidence, setProposal, recordReview, advanceKCR, publishKCR,
} from './knowledgeChange';

// 'validation' is an EXISTING trigger and is the honest one: a correction is
// raised because validation found a defect. Deliberately not a new vocabulary
// entry — "no new KCR domains" — and `correction` is already a valid KCR *type*,
// which is what the prior artifact carries and what this inherits. The schema
// needed nothing added to express a correction; it already could.
export const CORRECTION_TRIGGER = 'validation';

/**
 * correctPublishedKCR(prior, opts) -> { kcr, version }
 *
 * `prior` MUST be a published KCR. The returned KCR supersedes it by pointing
 * `rollbackTo` at the prior's publishedVersion — the same field publishKCR has
 * always written, now honoured by the builder.
 *
 * Required opts:
 *   newValue   the corrected value
 *   reason     WHY the correction is being made. Not optional: a correction
 *              without a stated defect is indistinguishable from an edit.
 *   evidence   [] of evidence records; may be empty ONLY when the correction is
 *              a reasoning fix that cites the same sources as the artifact it
 *              replaces (as p_wine v2 is).
 */
/**
 * openCorrection(prior, opts) -> KCR at status 'review'
 *
 * Phase 5C.7. The UI-facing half of a correction: everything up to the review
 * gate and NOT ONE STEP FURTHER. It exists because correctPublishedKCR records
 * all three approvals itself and publishes in one call — correct for a scripted
 * correction, but wiring it to a button would auto-approve and bypass the human
 * review this whole programme depends on.
 *
 * So the button opens a correction; a reviewer approves it; a publisher publishes
 * it. Same gates as any other knowledge change, because a correction that could
 * skip review would be a wider hole than the defect it fixes.
 */
export function openCorrection(prior, {
  newValue, newProvenance = null, rationale = '', reason, evidence = [],
  by = 'publisher', asOf = null, id = null,
} = {}) {
  if (!prior || prior.status !== 'published') {
    throw new Error('correction: prior KCR must be published');
  }
  if (!prior.publishedVersion) {
    throw new Error('correction: prior KCR has no publishedVersion to supersede');
  }
  if (!reason || !String(reason).trim()) {
    throw new Error('correction: a correction must state its reason');
  }

  let k = createKCR({
    id: id || `${prior.id}-correction`,
    type: prior.type || 'correction',
    trigger: CORRECTION_TRIGGER,
    assetId: prior.assetId,
    assetKind: prior.assetKind || 'playbook',
    fieldPath: prior.fieldPath,
    currentValue: prior.proposal ? prior.proposal.newValue : prior.currentValue,
    currentProvenance: prior.currentProvenance || null,
    reason: String(reason),
    createdBy: by,
    asOf,
  });

  // Evidence carried forward from the superseded version: a reasoning fix cites
  // the same sources, and those sources already passed the publish gate once.
  const carried = evidence.length ? evidence : (prior.evidence || []);
  for (const ev of carried) k = addEvidence(k, ev, asOf);
  k = advanceKCR(k, 'researching', { by, note: 'correction opened', asOf });
  k = advanceKCR(k, 'grounded', { by, note: 'evidence carried from superseded version', asOf });
  k = setProposal(k, {
    newValue,
    newProvenance: newProvenance || (prior.proposal && prior.proposal.newProvenance) || null,
    rationale: rationale || String(reason),
  }, asOf);
  k = advanceKCR(k, 'review', { by, note: 'correction submitted for review', asOf });

  // The ancestor this correction will supersede, carried so the publish step can
  // pass it as prevVersion without re-deriving it.
  return { ...k, correctionOf: prior.publishedVersion };
}

export function correctPublishedKCR(prior, {
  newValue, newProvenance = null, rationale = '', reason, evidence = [], versionId = null,
  by = 'publisher', reviewers = {}, asOf = null, id = null,
} = {}) {
  let k = openCorrection(prior, { newValue, newProvenance, rationale, reason, evidence, by, asOf, id });

  // Same three gates as any other publication. A correction is not a fast path.
  for (const gate of ['sme', 'editorial', 'governance']) {
    const r = reviewers[gate] || {};
    k = recordReview(k, gate, {
      by: r.by || by,
      decision: r.decision || 'approve',
      note: r.note || `correction reviewed: ${gate}`,
    }, asOf);
  }
  k = advanceKCR(k, 'approved', { by, note: 'correction approved', asOf });

  // `correctionOf` is a UI handoff field (it tells the publish step which version to
  // supersede when the correction is published later, from the store). The scripted
  // path already knows the ancestor, so it must not leak into the published record.
  const { correctionOf, ...clean } = k;
  return publishKCR(clean, { prevVersion: prior.publishedVersion, versionId, by, asOf });
}

/**
 * lineageOf(kcrs, assetId, fieldPath) -> { head, superseded[], conflicts[] }
 *
 * The read-side of the same rule the builder applies, for callers that need to
 * SHOW a lineage (an admin view, a test, a report) rather than bake one.
 */
export function lineageOf(kcrs, assetId, fieldPath) {
  const live = (Array.isArray(kcrs) ? kcrs : []).filter((k) => k
    && k.status === 'published' && k.assetId === assetId && k.fieldPath === fieldPath);
  const replaced = new Set(live.map((k) => k.rollbackTo).filter(Boolean).map(String));
  const heads = live.filter((k) => !(k.publishedVersion && replaced.has(String(k.publishedVersion))));
  return {
    head: heads.length === 1 ? heads[0] : null,
    superseded: live.filter((k) => k.publishedVersion && replaced.has(String(k.publishedVersion))),
    conflicts: heads.length > 1 ? heads.map((k) => k.id) : [],
  };
}
