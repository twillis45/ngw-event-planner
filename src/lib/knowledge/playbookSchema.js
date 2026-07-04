// ─── Playbook Schema Registry ─────────────────────────────────────────────────
// Single source of truth for playbook structure, field definitions, and access patterns.
// All sections of the app (admin console, campaign research, etc.) reference this
// rather than hardcoding assumptions about playbook structure.

// Field metadata: what constitutes a gap, how to access it, metadata rules
export const FIELD_TYPES = {
  COST_FACTOR: 'cost-factor',
  COST_RANGE: 'cost-range',
  DECISION: 'decision',
  TASK: 'task',
  MILESTONE: 'milestone',
};

// Gap definition: what makes a field "researchable"
export const GAP_CRITERIA = {
  // A decision's costFactors is a gap if:
  // 1. It has costFactors defined
  // 2. It has costFactorProvenance with verificationStatus === 'synthesized'
  COST_FACTOR: {
    type: FIELD_TYPES.COST_FACTOR,
    hasData: (decision) => decision.costFactors && Object.keys(decision.costFactors).length > 0,
    needsResearch: (decision) =>
      decision.costFactorProvenance?.verificationStatus === 'synthesized' &&
      decision.costFactors && Object.keys(decision.costFactors).length > 0,
    label: (decision) => decision.label || decision.id,
    fieldPath: (decisionId) => `decisions[${decisionId}].costFactors`,
  },
};

// Playbook traversal — get all gaps from a playbook
export function detectGapsInPlaybook(playbook) {
  if (!playbook) return [];

  const gaps = [];

  // Check decisions for cost factor gaps
  if (playbook.decisions && Array.isArray(playbook.decisions)) {
    playbook.decisions.forEach((decision) => {
      if (GAP_CRITERIA.COST_FACTOR.needsResearch(decision)) {
        gaps.push({
          id: decision.id,
          type: FIELD_TYPES.COST_FACTOR,
          label: decision.label || decision.id,
          fieldPath: GAP_CRITERIA.COST_FACTOR.fieldPath(decision.id),
          decision,
        });
      }
    });
  }

  // TODO: Check other gap types (cost ranges, etc.)

  return gaps;
}

// Get field metadata from path (e.g., "decisions[steam_vs_order].costFactors")
export function parseFieldPath(fieldPath) {
  const decisionMatch = fieldPath.match(/decisions\[([^\]]+)\]/);
  const purchaseMatch = fieldPath.match(/purchases\[([^\]]+)\]/);

  if (decisionMatch) {
    return {
      type: 'decision',
      resourceType: 'decisions',
      id: decisionMatch[1],
      subField: fieldPath.split('].')[1],
    };
  }

  if (purchaseMatch) {
    return {
      type: 'purchase',
      resourceType: 'purchases',
      id: purchaseMatch[1],
      subField: fieldPath.split('].')[1],
    };
  }

  return null;
}

// Get a playbook field by path
export function getPlaybookField(playbook, fieldPath) {
  const parsed = parseFieldPath(fieldPath);
  if (!parsed) return null;

  const resource = playbook[parsed.resourceType]?.find((r) => r.id === parsed.id);
  if (!resource) return null;

  if (parsed.subField) {
    return resource[parsed.subField];
  }

  return resource;
}

// Update a playbook field by path
export function setPlaybookField(playbook, fieldPath, value) {
  const parsed = parseFieldPath(fieldPath);
  if (!parsed) return playbook;

  const updated = JSON.parse(JSON.stringify(playbook));
  const resource = updated[parsed.resourceType]?.find((r) => r.id === parsed.id);
  if (!resource) return playbook;

  if (parsed.subField) {
    resource[parsed.subField] = value;
  }

  return updated;
}

// Resolve provenance metadata — is it high-confidence enough to auto-accept?
export function isHighConfidenceProvenance(provenance) {
  if (!provenance) return false;

  const { verificationStatus, confidence, sources } = provenance;

  // Synthesized (research-needed) is never high confidence by default
  if (verificationStatus === 'synthesized') return false;

  // Researched findings with high confidence are acceptable
  if (verificationStatus === 'researched' && confidence === 'high') {
    return true;
  }

  // Published/verified are always high confidence
  if (verificationStatus === 'published' || verificationStatus === 'verified') {
    return true;
  }

  return false;
}

// Check if a playbook's gaps are ready for research
export function playbookReadinessForResearch(playbook) {
  const gaps = detectGapsInPlaybook(playbook);

  return {
    hasResearchableGaps: gaps.length > 0,
    totalGaps: gaps.length,
    gaps,
    readiness: gaps.length > 0 ? 'ready' : 'complete',
  };
}

// Get all researchable fields across all playbooks
export function findResearchableFieldsAcrossPlaybooks(playbooks) {
  const fields = [];

  playbooks.forEach((pb) => {
    const gaps = detectGapsInPlaybook(pb);
    gaps.forEach((gap) => {
      fields.push({
        playbook: pb.type,
        ...gap,
      });
    });
  });

  return fields;
}

// Check if evidence consensus should be auto-accepted (no manual review needed)
export function shouldAutoAcceptConsensus(conflictingField) {
  const { valueCounts, facts } = conflictingField;

  if (!valueCounts || valueCounts.length === 0) return false;

  // Sort by count to get the consensus winner
  const sorted = [...valueCounts].sort((a, b) => b.count - a.count);
  const winner = sorted[0];

  // Auto-accept if:
  // 1. Unanimous agreement (all sources report same value), OR
  // 2. All sources reporting the winning value have high confidence
  const isUnanimous = winner.count === facts.length;
  const allHighConfidence = winner.confidence.every((c) => c === 'high');

  return isUnanimous || allHighConfidence;
}

// Research intent routing — maps question types to research strategies
// Use costFactorProvenance.researchIntent to declare what kind of research is needed
export const RESEARCH_INTENTS = {
  // Cost verification: "Does hiring cost 40% more?"
  COST_VERIFICATION: 'cost-verification',
  // Vendor capability: "Who can handle the food? What are their capabilities?"
  VENDOR_CAPABILITY: 'vendor-capability',
  // Quantity validation: "Is 0.5 lb per guest right?"
  QUANTITY_VALIDATION: 'quantity-validation',
  // Safety compliance: "What temperature to cook at?"
  SAFETY_COMPLIANCE: 'safety-compliance',
  // Decision validation: "What do successful events do?"
  DECISION_VALIDATION: 'decision-validation',
};

// Extract research intent from a gap's provenance
export function getResearchIntent(gap) {
  const intent = gap.decision?.costFactorProvenance?.researchIntent;
  // Default to cost-verification if not specified (backward compatible)
  return intent || RESEARCH_INTENTS.COST_VERIFICATION;
}

// Route gap to appropriate templates based on research intent
export function getTemplatesForIntent(intent, allTemplates) {
  if (!allTemplates || !Array.isArray(allTemplates)) return [];

  return allTemplates.filter((t) => {
    // Map research intent to gapTypes that templates expect
    const intentToGapTypes = {
      [RESEARCH_INTENTS.COST_VERIFICATION]: ['cost-factor', 'pricing'],
      [RESEARCH_INTENTS.VENDOR_CAPABILITY]: ['vendor-capability', 'sourcing'],
      [RESEARCH_INTENTS.QUANTITY_VALIDATION]: ['quantity'],
      [RESEARCH_INTENTS.SAFETY_COMPLIANCE]: ['safety'],
      [RESEARCH_INTENTS.DECISION_VALIDATION]: ['pricing', 'quantity'],
    };

    const targetGapTypes = intentToGapTypes[intent] || [];
    return t.gapTypes?.some((gt) => targetGapTypes.includes(gt));
  });
}

// Route gap to relevant provider families based on research intent and gap characteristics
// Only returns providers that directly have expertise in answering this gap
export function getRelevantProvidersForGap(gap) {
  if (!gap) return [];

  const intent = getResearchIntent(gap);
  const provenance = gap.decision?.costFactorProvenance || {};

  // Map research intent to directly relevant provider families
  // Based on: who actually has expertise in answering this specific type of question
  const intentToProviders = {
    [RESEARCH_INTENTS.COST_VERIFICATION]: [
      'commercial',  // vendors have pricing
      'internal',    // your past events have cost baselines
    ],
    [RESEARCH_INTENTS.VENDOR_CAPABILITY]: [
      'commercial',  // vendors provide services
      'industry',    // industry standards for capability levels
    ],
    [RESEARCH_INTENTS.QUANTITY_VALIDATION]: [
      'industry',    // standards (e.g., sq ft per guest)
      'commercial',  // vendors confirm feasibility
      'community',   // similar events validate quantities
    ],
    [RESEARCH_INTENTS.SAFETY_COMPLIANCE]: [
      'government',   // regulations and requirements
      'food-safety',  // food-specific safety (if applicable)
      'commercial',   // vendors with credentials/insurance
    ],
    [RESEARCH_INTENTS.DECISION_VALIDATION]: [
      'community',   // similar events show what works
      'industry',    // best practices
      'internal',    // your past events
    ],
  };

  // Get base providers for this intent
  const baseProviders = intentToProviders[intent] || [];

  // For food-related gaps, always add food-safety when gap involves food
  const isFood = gap.decision?.label?.toLowerCase().includes('food') ||
                 gap.decision?.id?.toLowerCase().includes('food');
  if (isFood && intent === RESEARCH_INTENTS.SAFETY_COMPLIANCE && !baseProviders.includes('food-safety')) {
    return [...baseProviders, 'food-safety'];
  }

  return baseProviders;
}

// Get providers for a specific gap (using the gap object with all metadata)
export function getProvidersForGap(gap) {
  return getRelevantProvidersForGap(gap);
}
