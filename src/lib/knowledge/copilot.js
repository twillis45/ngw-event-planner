// ─── Knowledge Intelligence Copilot (KEP-3 Bundle G) ──────────────────────────
// PROPOSE-ONLY, GOVERNED. The copilot analyzes the corpus + evidence + quality
// matrix and proposes targeted KCRs. It NEVER creates KCRs or overrides directly
// — proposals must be accepted by an admin, which creates a governed draft KCR.
// No AI model is called here: proposals are derived from structural analysis of
// the existing knowledge state (honest-empty when data is insufficient).

import { ALL_PLAYBOOKS } from '../playbooks/index';
import { qualityManufacturing } from './dimensions';
import { loadEvidence } from './evidence';
import { loadCampaigns } from './campaign';
import { loadKCRs } from './kcrStore';
import { createKCR } from './knowledgeChange';

// ── Proposal types (drives KCR type when accepted) ────────────────────────────
export const PROPOSAL_TYPES = [
  'fill-quality-gap',   // failing quality dimension → needs SME review
  'ground-pricing',     // unitCostRange missing or ungrounded → needs research
  'add-governance',     // playbook has no governance block → needs cadence
  'resolve-conflict',   // evidence contradiction → needs expert judgment
  'run-campaign',       // evidence gap for a known field → suggests a campaign
  'retire-asset',       // playbook deprecated but still generating KCRs
];

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ── Single proposal shape ─────────────────────────────────────────────────────
function makeProposal({ type, assetId, fieldPath, reason, rationale, confidence, data = {} }) {
  return Object.freeze({
    id: `prop-${slug(type)}-${slug(assetId)}-${slug(fieldPath || 'n/a')}`,
    type, assetId, fieldPath, reason, rationale, confidence,
    proposedAt: new Date().toISOString().slice(0, 10),
    data,
    accepted: false,
  });
}

// ── Analysis passes ───────────────────────────────────────────────────────────

// Pass 1: quality gaps — assets with multiple failing dimensions, prioritized by gap count
function analyzeQualityGaps(qualityMatrix) {
  return qualityMatrix.assets
    .filter((a) => a.gapCount > 0 && a.status !== 'archived' && a.status !== 'deprecated')
    .sort((a, b) => b.gapCount - a.gapCount)
    .slice(0, 10) // top-10 highest-gap assets
    .flatMap((a) => {
      const failingDims = a.dimensions.filter((d) => d.status === 'gap' && !d.deferred);
      return failingDims.slice(0, 3).map((d) => makeProposal({
        type: 'fill-quality-gap',
        assetId: a.type,
        fieldPath: d.id.toLowerCase().replace(/\s+/g, '_'),
        reason: `${d.id} dimension failing: ${d.reason}`,
        rationale: `This playbook has ${a.gapCount} gap-level dimension failure${a.gapCount > 1 ? 's' : ''}. Addressing the "${d.id}" dimension would reduce operational risk for all events using this playbook.`,
        confidence: 'high',
        data: { dimStatus: d.status, dimReason: d.reason, totalGaps: a.gapCount },
      }));
    });
}

// Pass 2: pricing gaps — purchases without unitCostRange (ungrounded)
function analyzePricingGaps(playbooks) {
  const proposals = [];
  for (const pb of playbooks) {
    if (['archived', 'deprecated'].includes(pb.status)) continue;
    const ungrounded = (pb.purchases || []).filter((p) => !p.unitCostRange || p.unitCostRange.length < 2);
    if (ungrounded.length > 0) {
      proposals.push(makeProposal({
        type: 'ground-pricing',
        assetId: pb.type,
        fieldPath: `${ungrounded[0].id}.unitCostRange`,
        reason: `${ungrounded.length} purchase${ungrounded.length > 1 ? 's' : ''} missing unitCostRange`,
        rationale: `Pricing is the primary cost driver for hosts. Without unitCostRange on ${ungrounded.map((p) => p.id).join(', ')}, the budget engine produces unreliable estimates. Research into regional pricing is recommended.`,
        confidence: ungrounded.length >= 3 ? 'high' : 'medium',
        data: { ungroundedIds: ungrounded.map((p) => p.id), count: ungrounded.length },
      }));
    }
  }
  return proposals;
}

// Pass 3: governance gaps — no governance block (can't schedule review cadence)
function analyzeGovernanceGaps(playbooks) {
  return playbooks
    .filter((pb) => !['archived', 'deprecated'].includes(pb.status) && !(pb.governance && pb.governance.reviewIntervalDays))
    .map((pb) => makeProposal({
      type: 'add-governance',
      assetId: pb.type,
      fieldPath: 'governance',
      reason: 'No governance block — review cadence unset',
      rationale: `Without a governance block, the playbook cannot be automatically monitored for staleness. Add owner + reviewIntervalDays to enable the Freshness dimension to report correctly.`,
      confidence: 'medium',
      data: { hasGovernance: !!(pb.governance) },
    }));
}

// Pass 4: campaign suggestions — active evidence gaps without a running campaign
function analyzeCampaignGaps(kcrs, campaigns) {
  const alreadyCampaigning = new Set(campaigns.map((c) => `${c.assetId}::${c.fieldPath}`));
  return kcrs
    .filter((k) => k.status === 'draft' && k.type === 'grounding-gap' && !alreadyCampaigning.has(`${k.assetId}::${k.fieldPath}`))
    .slice(0, 5)
    .map((k) => makeProposal({
      type: 'run-campaign',
      assetId: k.assetId,
      fieldPath: k.fieldPath,
      reason: `Grounding gap: no campaign targeting ${k.fieldPath}`,
      rationale: `KCR ${k.id} identifies a grounding gap for "${k.fieldPath}" on ${k.assetId}. Running a campaign with appropriate providers would generate evidence to resolve this gap.`,
      confidence: 'medium',
      data: { kcrId: k.id, trigger: k.trigger },
    }));
}

// ── Public API ────────────────────────────────────────────────────────────────

export function runCopilot({ playbooks, asOf } = {}) {
  const pbs = playbooks || ALL_PLAYBOOKS;
  const evidence = loadEvidence();
  const campaigns = loadCampaigns();
  const kcrs = loadKCRs();
  const qualityMatrix = qualityManufacturing(pbs, asOf || new Date().toISOString().slice(0, 10));

  const qualityGaps = analyzeQualityGaps(qualityMatrix);
  const pricingGaps = analyzePricingGaps(pbs);
  const govGaps = analyzeGovernanceGaps(pbs);
  const campaignSuggestions = analyzeCampaignGaps(kcrs, campaigns);

  // Dedup by id (same asset+field → one proposal, first wins)
  const seen = new Set();
  const proposals = [...qualityGaps, ...pricingGaps, ...govGaps, ...campaignSuggestions]
    .filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });

  return {
    proposals,
    summary: {
      total: proposals.length,
      byType: PROPOSAL_TYPES.reduce((m, t) => { m[t] = proposals.filter((p) => p.type === t).length; return m; }, {}),
      highConfidence: proposals.filter((p) => p.confidence === 'high').length,
      evidenceCount: evidence.length,
      campaignCount: campaigns.length,
    },
  };
}

// Accept a proposal → creates a governed draft KCR (still needs review → publish)
export function acceptProposal(proposal, { role = 'steward', asOf } = {}) {
  if (!proposal || proposal.accepted) return null;
  const typeMap = {
    'fill-quality-gap': 'quality-gap',
    'ground-pricing': 'grounding-gap',
    'add-governance': 'correction',
    'resolve-conflict': 'contradiction',
    'run-campaign': 'research',
    'retire-asset': 'quality-gap',
  };
  return createKCR({
    type: typeMap[proposal.type] || 'quality-gap',
    trigger: proposal.type === 'ground-pricing' ? 'research' : 'sme',
    assetId: proposal.assetId,
    assetKind: 'playbook',
    fieldPath: proposal.fieldPath,
    reason: `[Copilot proposal] ${proposal.reason}. Rationale: ${proposal.rationale}`,
    createdBy: `copilot:${role}`,
    asOf: asOf || new Date().toISOString().slice(0, 10),
  });
}
