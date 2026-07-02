// ─── KnowledgeFinding — validated conclusion from evidence (KAS-2) ─────────────
// A Finding turns evidence into a PROPOSED conclusion. It is NOT canonical knowledge —
// it produces a KCR (the governed change request). One Finding references many evidence;
// one Finding may spawn many KCRs. Pure. Reuses createKCR (no new pipeline).

import { createKCR, knowledgeImpactPreview } from './knowledgeChange';
import { AUTHORITY_LEVELS } from './evidence';

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const AUTH_RANK = Object.fromEntries(AUTHORITY_LEVELS.map((a, i) => [a, AUTHORITY_LEVELS.length - i])); // primary highest

// ── Knowledge Confidence — DIMENSIONS ONLY, never one score (mandate) ─────────
// Every Finding exposes independent trust dimensions with honest uncertainty.
export function findingConfidence(evidence, { asOf, validationN = 0, expertReviewed = false } = {}) {
  const ev = evidence || [];
  const supporting = ev.filter((e) => !e.contradicts?.length);
  const contradicting = ev.filter((e) => e.contradicts?.length);
  const topAuth = ev.reduce((m, e) => Math.max(m, AUTH_RANK[e.authorityLevel] || 0), 0);
  const fresh = ev.filter((e) => !e.expirationDate || (asOf && e.expirationDate >= asOf)).length;
  const d = (dimension, level, reason) => ({ dimension, level, reason }); // level: high|medium|low|unknown
  return {
    dimensions: [
      d('Evidence quality', ev.length === 0 ? 'unknown' : ev.some((e) => e.excerpt) ? 'high' : 'medium', `${ev.length} evidence record(s)`),
      d('Source authority', topAuth >= AUTH_RANK.official ? 'high' : topAuth >= AUTH_RANK.trade ? 'medium' : topAuth ? 'low' : 'unknown', `top authority: ${AUTHORITY_LEVELS.find((a) => AUTH_RANK[a] === topAuth) || 'none'}`),
      d('Corroboration', supporting.length >= 3 ? 'high' : supporting.length === 2 ? 'medium' : supporting.length === 1 ? 'low' : 'unknown', `${supporting.length} independent supporting source(s)`),
      d('Freshness', ev.length === 0 ? 'unknown' : fresh === ev.length ? 'high' : fresh ? 'medium' : 'low', `${fresh}/${ev.length} within effective window`),
      d('Validation state', validationN >= 8 ? 'high' : validationN ? 'medium' : 'unknown', validationN ? `${validationN} scored events` : 'Awaiting completed events'),
      d('Contradictions', contradicting.length === 0 ? 'high' : 'low', `${contradicting.length} contradicting record(s)`),
      d('Expert review', expertReviewed ? 'high' : 'unknown', expertReviewed ? 'SME-reviewed' : 'No expert review yet'),
      d('Stability', 'unknown', 'Awaiting repeat observations over time'),
    ],
    // NO rolled-up number. The weakest load-bearing dimension governs trust.
  };
}

// Derive a proposed conclusion from an observation + its evidence. `conclude` extracts
// the proposed value from the evidence's extractedFacts for the observation's field.
export function deriveFinding(observation, evidence, { asOf, expertReviewed = false } = {}) {
  const field = observation.fieldPath;
  const facts = (evidence || []).flatMap((e) => (e.extractedFacts || []).filter((f) => f.field === field).map((f) => f.value));
  const contradictions = (evidence || []).filter((e) => e.contradicts?.length).map((e) => e.id);
  const proposedValue = facts.length ? facts[facts.length - 1] : null; // last corroborated fact (real logic would consensus-merge)
  return {
    id: `find-${slug(observation.assetId)}-${slug(field)}`,
    gapType: observation.gapType,
    observationId: observation.id,
    fieldPath: field,
    evidenceIds: (evidence || []).map((e) => e.id),
    conclusion: proposedValue != null ? `${field} should become ${JSON.stringify(proposedValue)} (from ${evidence.length} source(s))` : `Insufficient evidence to conclude ${field}`,
    proposedValue,
    corroboration: (evidence || []).filter((e) => !e.contradicts?.length).length,
    contradictions,
    confidence: findingConfidence(evidence, { asOf, expertReviewed }),
    affectedAssets: [observation.assetId],
    status: contradictions.length ? 'contested' : proposedValue != null ? 'proposed' : 'insufficient',
    at: asOf,
  };
}

// Finding → KCR. Contested findings open a knowledge-conflict KCR; a clean finding opens a
// research KCR carrying the proposal (cited to the finding's evidence) AND the evidence
// records (so the cited-publish gate passes). Deterministic id.
export function findingToKCR(finding, evidence, pb, asOf) {
  if (finding.status === 'insufficient') return null;
  const conflict = finding.status === 'contested';
  const id = `kcr-kas-${slug(finding.affectedAssets[0])}-${slug(finding.fieldPath)}`;
  const kcr = createKCR({
    id, type: conflict ? 'contradiction' : 'research', trigger: 'research',
    assetId: finding.affectedAssets[0], assetKind: 'playbook',
    fieldPath: finding.fieldPath,
    reason: finding.conclusion, createdBy: 'kas-finding', asOf,
  });
  // Carry the finding's evidence onto the KCR (id/source/sourceType) so canReachCited passes.
  const evRecords = (evidence || []).filter((e) => finding.evidenceIds.includes(e.id)).map((e) => ({
    id: e.id, source: e.source,
    sourceType: e.authorityLevel === 'primary' ? 'primary' : 'citation',
    contradicts: !!(e.contradicts && e.contradicts.length), capturedAt: e.capturedAt,
  }));
  const base = { ...kcr, evidence: evRecords };
  // The proposal cites the finding's evidence (realizes provenance.sources=[evidenceId]).
  const withProposal = conflict ? base : { ...base, proposal: { newValue: finding.proposedValue, verificationStatus: 'cited', sources: finding.evidenceIds, rationale: finding.conclusion, findingId: finding.id } };
  return { ...withProposal, findingId: finding.id, impact: pb ? knowledgeImpactPreview(pb, kcr.fieldPath) : null };
}
