// ─── Research Blueprint Engine (RBE-1) ────────────────────────────────────────
// Assembles a structured Research Blueprint from an existing knowledge gap.
// Pure function — no stores, no lifecycle, no side effects.
//
// Replaces ad-hoc prompt-based provider selection across:
//   missionControl.js   → generateCampaignsFromQueue
//   researchRunner.js   → autoCorroborate
//   AdminConsole.jsx    → Research Session / Mission Control
//
// Every primitive is imported from its canonical home; nothing is invented here.

import { RESEARCH_INTENTS, getRelevantProvidersForGap }                    from './playbookSchema';
import { CAMPAIGN_TEMPLATES, suggestTemplates }                             from './campaignTemplates';
import { FAMILY_DEFAULTS }                                                  from './providers';
import { PROVIDER_FAMILIES as CAMPAIGN_FAMILY_GROUPS }                     from './campaign';
import { rankProviders, getProviderStats }                                  from './providerIntelligence';
import { CORROBORATION_TARGETS }                                            from './researchRunner';

// Expand UI family group IDs → individual provider IDs (e.g. 'commercial' → ['market-pricing','retail','restaurant-depot'])
function expandFamilyGroups(groupIds) {
  const result = [];
  for (const gid of (groupIds || [])) {
    const group = CAMPAIGN_FAMILY_GROUPS.find((g) => g.id === gid);
    if (group) result.push(...group.providers);
    else result.push(gid); // already a provider ID, pass through
  }
  return [...new Set(result)];
}

// Map individual provider ID → authority level (via FAMILY_DEFAULTS on the provider's family)
function authorityForProvider(providerId) {
  for (const [family, defaults] of Object.entries(FAMILY_DEFAULTS)) {
    // providers.js family names map roughly to campaign group names — do a partial match
    if (providerId.includes(family) || family.includes(providerId)) return defaults.authorityLevel;
  }
  return 'trade';
}

// Mirror of missionControl.js KIND_TO_DIMENSION — inlined to avoid circular import.
// Keep in sync if missionControl.js adds new kinds.
const KIND_TO_DIMENSION = {
  pricing:       'Grounding',
  quantity:      'Grounding',
  'cost-factor': 'Grounding',
  grounding:     'Grounding',
  governance:    'Operational completeness',
  safety:        'Accessibility',
  regional:      'Regional coverage',
  cultural:      'Cultural overlay',
  weather:       'Weather contingency',
  planner:       'Professional guidance',
};

// ── Classification ────────────────────────────────────────────────────────────

// Maps gapKind from buildManufacturingQueue → researchIntent
const KIND_TO_INTENT = {
  pricing:       RESEARCH_INTENTS.COST_VERIFICATION,
  quantity:      RESEARCH_INTENTS.QUANTITY_VALIDATION,
  'cost-factor': RESEARCH_INTENTS.COST_VERIFICATION,
  safety:        RESEARCH_INTENTS.SAFETY_COMPLIANCE,
  governance:    RESEARCH_INTENTS.DECISION_VALIDATION,
  grounding:     RESEARCH_INTENTS.DECISION_VALIDATION,
  regional:      RESEARCH_INTENTS.COST_VERIFICATION,
  cultural:      RESEARCH_INTENTS.DECISION_VALIDATION,
  weather:       RESEARCH_INTENTS.DECISION_VALIDATION,
  planner:       RESEARCH_INTENTS.DECISION_VALIDATION,
};

// Maps detectGapsInPlaybook gap type → gapKind (bridge)
const GAP_TYPE_TO_KIND = {
  'cost-factor': 'cost-factor',
  'cost-range':  'pricing',
  'decision':    'cost-factor',
  'task':        'governance',
  'milestone':   'governance',
};

// ── Evidence requirements ─────────────────────────────────────────────────────

export const EVIDENCE_REQUIREMENTS = {
  pricing:       ['Commercial Quote', 'Historical Pricing'],
  quantity:      ['Industry Standard', 'Professional Review'],
  'cost-factor': ['Commercial Quote', 'Historical Pricing'],
  safety:        ['Government Regulation', 'Food Safety Guideline'],
  governance:    ['Industry Standard', 'Past Event Data'],
  grounding:     ['Academic Source', 'Industry Standard'],
  regional:      ['Commercial Quote', 'Regional Observation'],
  cultural:      ['Community Source', 'Expert Interview'],
  weather:       ['Government Data', 'Historical Record'],
  planner:       ['Professional Review', 'Industry Standard'],
};

// ── Authority requirements ────────────────────────────────────────────────────
// Maps knowledgeType → minimum authority level required for the gap to be closeable.

const AUTHORITY_FLOOR = {
  safety:        'primary',    // government/fda mandatory
  governance:    'standards',
  grounding:     'standards',
  pricing:       'trade',
  quantity:      'trade',
  'cost-factor': 'trade',
  regional:      'trade',
  cultural:      'community',  // community-sourced, but needs corroboration
  weather:       'official',
  planner:       'expert',
};

// One step above minimum — what we PREFER
const AUTH_PREFERRED = {
  community:  'trade',
  trade:      'standards',
  standards:  'primary',
  primary:    'primary',
  official:   'official',
  expert:     'expert',
  derived:    'trade',
};

// ── Worker assignments ────────────────────────────────────────────────────────

export const KIND_TO_WORKERS = {
  pricing:       ['freshness-worker', 'gap-detection-worker'],
  quantity:      ['gap-detection-worker'],
  'cost-factor': ['gap-detection-worker'],
  safety:        ['gap-detection-worker'],
  governance:    ['freshness-worker'],
  grounding:     ['gap-detection-worker'],
  regional:      ['gap-detection-worker'],
  cultural:      ['gap-detection-worker'],
  weather:       ['gap-detection-worker'],
  planner:       ['gap-detection-worker'],
};

// ── generateResearchBlueprint ─────────────────────────────────────────────────
// gap: a queue item from buildManufacturingQueue, or a gap from detectGapsInPlaybook
// context: { playbook?, providerIntel?, asOf? }
export function generateResearchBlueprint(gap, { playbook = null, providerIntel = {}, asOf = null } = {}) {
  if (!gap) return null;

  // 1. Classify
  const fieldPath     = gap.fieldPath || '';
  const assetId       = gap.playbookType || gap.playbook || playbook?.type || 'unknown';
  const knowledgeType = gap.gapKind || GAP_TYPE_TO_KIND[gap.type] || 'grounding';
  const researchIntent = KIND_TO_INTENT[knowledgeType] || RESEARCH_INTENTS.DECISION_VALIDATION;

  // 2. Claim + success criteria (from provenance fields added in board recommendation)
  const claim           = gap.claim || null;
  const successCriteria = gap.sufficientWhen || null;
  const sourceHint      = gap.sourceHint || null;

  // 3. Knowledge dimensions this gap affects
  const knowledgeDimensions = [KIND_TO_DIMENSION[knowledgeType] || 'Grounding'];

  // 4. Required evidence
  const requiredEvidence = EVIDENCE_REQUIREMENTS[knowledgeType] || ['Industry Standard'];

  // 5. Authority requirements
  const minAuth          = AUTHORITY_FLOOR[knowledgeType] || 'trade';
  const preferredAuth    = AUTH_PREFERRED[minAuth] || minAuth;
  const authorityRequirements = {
    minimum:  minAuth,
    preferred: preferredAuth,
    corroborationRequired: minAuth === 'community' || knowledgeType === 'cultural',
  };

  // 6. Provider capabilities — resolve from playbookSchema intent routing
  // Wrap gap into the shape getRelevantProvidersForGap expects
  const schemaGap = gap.decision
    ? gap
    : {
        type: knowledgeType,
        decision: {
          id:   fieldPath,
          label: gap.fieldLabel || fieldPath,
          costFactorProvenance: { researchIntent },
        },
      };
  // getRelevantProvidersForGap returns UI group IDs ('commercial', 'industry', …)
  // Expand to individual provider IDs that createCampaign + rankProviders understand
  const groupIds     = getRelevantProvidersForGap(schemaGap);
  const baseProviders = expandFamilyGroups(groupIds);

  // Prepend sourceHint provider if specified
  const providersOrdered = sourceHint && !baseProviders.includes(sourceHint)
    ? [sourceHint, ...baseProviders]
    : baseProviders;

  const providerCapabilities = providersOrdered.map((pid) => ({
    provider: pid,
    authorityLevel: authorityForProvider(pid),
    family: CAMPAIGN_FAMILY_GROUPS.find((g) => g.providers.includes(pid))?.id || null,
  }));

  // 7. Provider ranking — historical intel first, then authority preference
  const rankedProviders     = rankProviders(providerIntel, providersOrdered, knowledgeType);
  const recommendedProviders = rankedProviders;
  const providerRanking      = rankedProviders
    .map((pid) => { const s = getProviderStats(providerIntel, pid); return s ? { providerId: pid, ...s } : null; })
    .filter(Boolean);

  // 8. Worker assignments
  const workerAssignments = KIND_TO_WORKERS[knowledgeType] || ['gap-detection-worker'];

  // 9. Campaign template — most specific match first
  const templates = suggestTemplates(fieldPath).filter((t) => t.gapTypes.includes(knowledgeType));
  const campaignTemplate = templates[0] || CAMPAIGN_TEMPLATES.find((t) => t.gapTypes.includes(knowledgeType)) || null;

  // 10. Corroboration requirements
  const corrobTargets = CORROBORATION_TARGETS[knowledgeType] || CORROBORATION_TARGETS.default || ['data.gov', 'scholar'];
  const corroborationRequirements = {
    required: knowledgeType === 'safety' || authorityRequirements.corroborationRequired,
    targets:  corrobTargets,
    reason:   knowledgeType === 'safety'
      ? 'Safety findings always require official corroboration'
      : authorityRequirements.corroborationRequired
        ? 'Community-source gap requires official corroboration'
        : 'Commercial evidence should be corroborated with government data',
  };

  // 11. Validation requirements
  const validationRequirements = {
    minEvidence:      knowledgeType === 'cultural' ? 3 : 2,
    requiresOfficial: minAuth === 'primary' || minAuth === 'official',
    requiresExpert:   minAuth === 'expert',
  };

  return {
    assetKind:                'playbook',
    assetId,
    fieldPath,
    knowledgeType,
    claim,
    researchIntent,
    knowledgeDimensions,
    requiredEvidence,
    authorityRequirements,
    providerCapabilities,
    recommendedProviders,
    providerRanking,
    workerAssignments,
    campaignTemplate,
    corroborationRequirements,
    validationRequirements,
    successCriteria,
    sourceHint,
    expectedOutputs: ['evidence', 'finding', 'kcr-draft'],
    generatedAt: asOf,
  };
}

// ── blueprintToGoal ───────────────────────────────────────────────────────────
// Converts a blueprint into a structured campaign goal string consumed by
// createCampaign(). Same pipe-delimited format already used in generateCampaignsFromQueue.
export function blueprintToGoal(bp, { fieldLabel = '', playbookLabel = '', reason = '' } = {}) {
  if (!bp) return reason || 'Research: unknown';
  const parts = [`Research: ${fieldLabel || bp.fieldPath} (${playbookLabel || bp.assetId}) — ${reason || bp.knowledgeType}`];
  if (bp.claim)           parts.push(`Claim: ${bp.claim}`);
  if (bp.successCriteria) parts.push(`Sufficient when: ${bp.successCriteria}`);
  if (bp.sourceHint)      parts.push(`Source hint: ${bp.sourceHint}`);
  return parts.join(' | ');
}

// ── blueprintStatusLabel ──────────────────────────────────────────────────────
// Human-readable readiness label for Mission Control display.
export function blueprintStatusLabel(bp, { evidenceCount = 0 } = {}) {
  if (!bp) return null;
  if (bp.corroborationRequirements.required && evidenceCount === 1) return 'Corroboration needed';
  if (evidenceCount === 0) return 'No evidence';
  if (evidenceCount >= bp.validationRequirements.minEvidence) return 'Evidence sufficient';
  return `${evidenceCount}/${bp.validationRequirements.minEvidence} evidence`;
}
