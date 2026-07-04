// ─── Review Packet (KRA-1 Bundle J) ───────────────────────────────────────────
// Pre-formats evidence for human reviewers: what the evidence says, contradictions,
// proposed value, impact estimate, and suggested reviewers. Pure function — no I/O.
//
// The packet is generated once per KCR entering the review queue. Its purpose is
// to cut the time a reviewer spends reading raw evidence before making a decision.
//
// Governance: the packet is informational only. It does not approve, publish,
//             or change any canonical record. Human sign-off is still required.

// ── Reviewer roles ─────────────────────────────────────────────────────────────
// These are not software roles — they are knowledge-domain roles.
const REVIEWER_ROLES = {
  pricing:      ['Senior Planner (Pricing)', 'Event Budget Owner'],
  quantity:     ['Senior Planner (Logistics)', 'Operations Lead'],
  'cost-factor':['Event Finance Lead', 'Senior Planner (Pricing)'],
  safety:       ['Event Safety Officer', 'Senior Planner (Governance)'],
  governance:   ['Senior Planner (Governance)', 'Product Owner'],
  grounding:    ['Research Lead', 'Senior Planner'],
  regional:     ['Regional Planner', 'Research Lead'],
  weather:      ['Operations Lead', 'Regional Planner'],
  cultural:     ['Cultural Consultant', 'Senior Planner'],
  planner:      ['Senior Planner', 'Operations Lead'],
  default:      ['Senior Planner', 'Research Lead'],
};

function suggestReviewers(gapType) {
  return REVIEWER_ROLES[gapType] || REVIEWER_ROLES.default;
}

// ── Evidence strength label ────────────────────────────────────────────────────
function strengthLabel(evidence) {
  if (!evidence?.length) return 'None';
  const hasOfficial = evidence.some((e) => e.authority === 'official' || e.sourceType === 'official');
  const count = evidence.length;
  if (count >= 3 && hasOfficial) return 'Strong';
  if (count >= 2 && hasOfficial) return 'Adequate — official source present';
  if (count >= 2) return 'Moderate — commercial sources only';
  if (count === 1 && hasOfficial) return 'Weak — single official source';
  return 'Weak — single commercial source';
}

// ── Proposed value summary ─────────────────────────────────────────────────────
function describeProposedValue(kcr) {
  if (!kcr) return 'No proposed value — finding was insufficient.';
  const { proposedValue, unit, fieldPath } = kcr;
  if (proposedValue == null) return 'No proposed value extracted.';
  if (Array.isArray(proposedValue)) return `[${proposedValue[0]}–${proposedValue[1]}] ${unit || ''} for ${fieldPath}`;
  return `${proposedValue} ${unit || ''} for ${fieldPath}`;
}

// ── Impact estimate ────────────────────────────────────────────────────────────
function estimateImpact(kcr, playbooks) {
  if (!kcr || !playbooks?.length) return null;
  const pb = playbooks.find((p) => p.type === kcr.assetId);
  if (!pb) return null;

  const guestCounts = [20, 50, 100];  // illustrative host sizes
  const fieldPath = kcr.fieldPath || '';
  const val = kcr.proposedValue;

  if (fieldPath.includes('unitCostRange') && Array.isArray(val) && val.length === 2) {
    const mid = (val[0] + val[1]) / 2;
    const byGuest = guestCounts.map((n) => `${n} guests → ~$${(mid * n).toFixed(0)}`);
    return `Per-event cost estimate at mid-range $${mid.toFixed(2)}: ${byGuest.join(', ')}`;
  }
  if (fieldPath.includes('qtyPerGuest') && typeof val === 'number') {
    const byGuest = guestCounts.map((n) => `${n} guests → ${(val * n).toFixed(1)} units`);
    return `Quantity estimate at ${val} per guest: ${byGuest.join(', ')}`;
  }
  return `Affects ${pb.label || pb.type} recommendations when deployed.`;
}

// ── Contradiction summary ──────────────────────────────────────────────────────
function summarizeContradictions(contradictions) {
  if (!contradictions?.length) return [];
  return contradictions.map((c) => ({
    field:       c.fieldPath || c.field || 'unknown field',
    description: c.description || `Conflict between ${c.sourceA} ($${c.valueA}) and ${c.sourceB} ($${c.valueB})`
      .replace('undefined', '?'),
    resolution:  'Requires human adjudication — do not publish until resolved.',
  }));
}

// ── prepareReviewPacket ────────────────────────────────────────────────────────
// The main export. Takes a KCR + its evidence + all playbooks.
// Returns a self-contained reviewer brief.
export function prepareReviewPacket(kcr, evidence = [], playbooks = [], { asOf } = {}) {
  if (!kcr) return null;

  const relEvidence  = evidence.filter((e) => e.assetId === kcr.assetId && e.fieldPath === kcr.fieldPath);
  const allEvidence  = relEvidence.length ? relEvidence : evidence;
  const conflicts    = kcr.conflicts || [];
  const gapType      = kcr.gapType || kcr.fieldPath?.includes('unitCost') ? 'pricing' : 'default';

  // Extract claim + sufficientWhen from playbook provenance so reviewers know what they're verifying
  const pb = playbooks.find((p) => p.type === kcr.assetId);
  let fieldProvenance = null;
  if (pb) {
    const fp = kcr.fieldPath || '';
    const dm = fp.match(/^decisions\[([^\]]+)\]/);
    if (dm) {
      const d = (pb.decisions || []).find((x) => x.id === dm[1]);
      fieldProvenance = d?.costFactorProvenance || null;
    } else {
      const pm = fp.match(/^([^.[]+)\./);
      if (pm) {
        const p = (pb.purchases || []).find((x) => x.id === pm[1]);
        fieldProvenance = p?.provenance || null;
      }
    }
  }

  const sources = [...new Set(allEvidence.map((e) => e.source || 'unknown'))];
  const regions = [...new Set(allEvidence.map((e) => e.region).filter(Boolean))];
  const oldest  = allEvidence.reduce((m, e) => (!m || (e.capturedAt || '') < (m.capturedAt || '')) ? e : m, null);
  const newest  = allEvidence.reduce((m, e) => (!m || (e.capturedAt || '') > (m.capturedAt || '')) ? e : m, null);

  const hasContradictions = conflicts.length > 0;
  const readyToPublish    = !hasContradictions && allEvidence.length >= 2
    && allEvidence.some((e) => e.authority === 'official' || e.sourceType === 'official');

  return {
    kcrId:            kcr.id,
    assetId:          kcr.assetId,
    fieldPath:        kcr.fieldPath,
    state:            kcr.state,
    generatedAt:      asOf,

    // Evidence brief
    evidenceCount:    allEvidence.length,
    sources,
    regions,
    dataWindow:       oldest && newest ? `${oldest.capturedAt} to ${newest.capturedAt}` : null,
    strength:         strengthLabel(allEvidence),

    // What the evidence says
    excerpts: allEvidence.slice(0, 4).map((e) => ({
      source:    e.source,
      authority: e.authority || e.sourceType || 'trade',
      excerpt:   e.excerpt || '(no excerpt)',
      region:    e.region || 'US',
      capturedAt:e.capturedAt,
    })),

    // What this field claims and when it's considered closed
    claim:            fieldProvenance?.claim || null,
    sufficientWhen:   fieldProvenance?.sufficientWhen || null,
    sourceHint:       fieldProvenance?.sourceHint || null,

    // The proposal
    proposedValue:    describeProposedValue(kcr),
    impactEstimate:   estimateImpact(kcr, playbooks),

    // Contradictions
    hasContradictions,
    contradictions:   summarizeContradictions(conflicts),

    // Recommendation
    readyToPublish,
    reviewerAction:   readyToPublish
      ? 'Approve: evidence is corroborated, no contradictions.'
      : hasContradictions
        ? 'Hold: resolve contradictions before publishing.'
        : allEvidence.length < 2
          ? 'Request more evidence: single-source finding.'
          : 'Review carefully: evidence lacks official source.',

    // Suggested reviewers (knowledge-domain roles, not system roles)
    suggestedReviewers: suggestReviewers(gapType),
  };
}

// ── formatReviewPacketText ─────────────────────────────────────────────────────
// Plain-text version of the packet for clipboard copy or email.
export function formatReviewPacketText(packet) {
  if (!packet) return '';
  const lines = [
    `KCR REVIEW PACKET — ${packet.kcrId}`,
    `Field: ${packet.fieldPath} (${packet.assetId})`,
    `State: ${packet.state}`,
    `Generated: ${packet.generatedAt}`,
    '',
    `EVIDENCE (${packet.evidenceCount} records)`,
    `Sources: ${packet.sources.join(', ')}`,
    `Strength: ${packet.strength}`,
    packet.dataWindow ? `Data window: ${packet.dataWindow}` : null,
    '',
    'EXCERPTS:',
    ...(packet.excerpts || []).map((e, i) => `  ${i + 1}. [${e.authority}] ${e.source}: ${e.excerpt}`),
    '',
    packet.claim          ? `CLAIM: ${packet.claim}` : null,
    packet.sufficientWhen ? `SUFFICIENT WHEN: ${packet.sufficientWhen}` : null,
    packet.sourceHint     ? `SOURCE HINT: ${packet.sourceHint}` : null,
    '',
    `PROPOSED VALUE: ${packet.proposedValue}`,
    packet.impactEstimate ? `IMPACT: ${packet.impactEstimate}` : null,
    '',
    packet.hasContradictions ? `CONTRADICTIONS (${packet.contradictions.length}):` : 'CONTRADICTIONS: None',
    ...(packet.contradictions || []).map((c) => `  - ${c.description}`),
    '',
    `REVIEWER ACTION: ${packet.reviewerAction}`,
    `SUGGESTED REVIEWERS: ${(packet.suggestedReviewers || []).join(', ')}`,
  ];
  return lines.filter((l) => l != null).join('\n');
}
