// ─── Insight Sources (KCR-2 gap 3) ────────────────────────────────────────────
// Proves the KCR pipeline accepts MORE THAN ONE insight source through the SAME
// Insight → KCR shape (never a per-source system). The research queue (researchIntake)
// is one producer; this adds validation-finding and manual-insight producers, and a
// unifier that merges every source into one deduped backlog.
//
// Honesty: the validation source reads the IntelEvaluation corpus, which is honest-empty
// until real completed events exist — so it produces nothing today, by design, not by bug.

import { insightToKCR, knowledgeImpactPreview } from './knowledgeChange';
import { getPlaybook } from '../playbooks/index';
import { researchQueueToKCRs } from './researchIntake';
import { reconcileKCRs } from './kcrStore';

// Attach derived priority + impact to a KCR built from an insight (mirrors researchIntake).
function finalize(kcr, priority) {
  if (!kcr) return null;
  const pb = kcr.assetId ? getPlaybook(kcr.assetId) : null;
  return { ...kcr, priority: priority || 'med', impact: pb && kcr.fieldPath ? knowledgeImpactPreview(pb, kcr.fieldPath) : null };
}

// ── Source: Validation findings (from the IntelEvaluation corpus) ─────────────
// A recommendation that graded poorly (F/D or worse-than-baseline) is a signal that the
// KNOWLEDGE behind it needs revision → a validation-finding KCR. Honest-empty until the
// eval corpus has scored records. `findings` = evaluationAudit records (or []).
export function validationFindingsToKCRs(findings, asOf) {
  const bad = (findings || []).filter((f) => f && (f.grade === 'F' || f.grade === 'D' || f.betterThanBaseline === false));
  return bad.map((f) => finalize(insightToKCR({
    trigger: 'validation',
    suggestedType: 'validation-finding',
    assetId: f.assetType || f.type || null,
    fieldPath: f.domain ? `outcome.${f.domain}` : null,
    reason: `Validation: ${f.reader || 'recommendation'} graded ${f.grade || 'below baseline'} on ${f.domain || 'this event'} — revisit the knowledge`,
    createdBy: 'validation-platform',
  }, asOf), 'high')).filter(Boolean);
}

// ── Source: Manual insights (admin / SME / customer / planner / coordinator) ──
// A human-entered insight. Each is `{trigger, suggestedType, assetId, fieldPath, reason, priority}`.
export function manualInsightsToKCRs(insights, asOf) {
  return (insights || []).map((i) => finalize(insightToKCR(i, asOf), i.priority)).filter(Boolean);
}

// ── The unifier — every source → one deduped backlog ──────────────────────────
// Research queue (live) + validation (honest-empty today) + manual insights. Dedupe by
// the deterministic KCR id, so the same underlying gap from two sources collapses.
export function collectAllKCRs({ asOf, validationFindings = [], manualInsights = [] } = {}) {
  const research = researchQueueToKCRs(asOf);
  const validation = validationFindingsToKCRs(validationFindings, asOf);
  const manual = manualInsightsToKCRs(manualInsights, asOf);
  const { kcrs } = reconcileKCRs([], [...research, ...validation, ...manual]);
  return kcrs;
}
