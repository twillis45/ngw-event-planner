// ─── Playbook Schema Registry ─────────────────────────────────────────────────
// Single source of truth for playbook structure, field definitions, and access patterns.
// All sections of the app (admin console, campaign research, etc.) reference this
// rather than hardcoding assumptions about playbook structure.

// Wave-2c-2: a decision's `when` deadline is GROUNDED either by an authored
// `timingProvenance` OR by the centralized category resolver (real dated sources for
// venue/invite/rsvp/rentals/catering/entertainment/cake timing). See timingProvenance.js.
import { resolveTimingProvenance, isGroundedTiming } from './timingProvenance';
// Wave-2g: a decision may carry a structured cultural/religious axis (faith/tradition that
// steers the choice). If authored, it must be GROUNDED against a real cited source.
import { isGroundedCulture } from './culturalContext';
// Wave-2h: a venue/seating decision has an accessibility dimension (mobility/ADA/sensory);
// the resolver grounds it against ADA / inclusive-seating guidance. Machine-verify coverage.
import { detectAccessibilityCategory, effectiveAccessibility, isGroundedAccessibility } from './accessibilityContext';
// Wave-2i: a decision's costFactorProvenance is grounded only when researched against a real
// market source (USDA meat prices, 2026 catering per-person data, the DMV crab survey).
import { isGroundedCost } from './costProvenance';
// Wave-2j: an alcohol/vendor/permit decision carries a legal-liability dimension; the
// resolver grounds it against social-host/dram-shop/COI/permit standards.
import { detectLegalCategory, effectiveLegal, isGroundedLegal } from './legalContext';
// Wave-2l: a venue/space decision carries a capacity/power constraint; the resolver grounds
// it against event space-planning + power standards.
import { detectVenueCategory, effectiveVenue, isGroundedVenue } from './venueContext';

// Field metadata: what constitutes a gap, how to access it, metadata rules
export const FIELD_TYPES = {
  COST_FACTOR: 'cost-factor',
  COST_RANGE: 'cost-range',
  DECISION: 'decision',
  TASK: 'task',
  MILESTONE: 'milestone',
  // Decision priority-tier fields (DECISION_SCHEMA_SPEC §4.A–D). Each names a
  // researchable/authorable dimension the gap-detector now surfaces per decision,
  // so a maintainer can SEE which decisions are missing an importance axis, a
  // propose-vs-ask signal, a timing source, or a budget-engine linkage.
  PRIORITY_WEIGHT: 'priority-weight',      // §4.A — the missing importance axis (`weight` unset)
  PRIORITY_UNSOURCED: 'priority-unsourced', // §4.A — an importance axis AUTHORED but ungrounded (`weight` set, no `priorityBasis.rationale`)
  DIFM_CAPABILITY: 'difm-capability',      // §4.C — the propose-vs-ask signal (`difmCapable`)
  TIMING_PROVENANCE: 'timing-provenance',  // §4.B — a `when` deadline with no GROUNDED `timingProvenance` source
  BUDGET_LINKAGE: 'budget-linkage',        // §4.D — costFactors that never reach the budget engine (no `affects`)
  CULTURAL_UNSOURCED: 'cultural-unsourced', // §4.G — a decision that AUTHORS a culturalContext but leaves it ungrounded (no real cited source)
  ACCESSIBILITY_UNGROUNDED: 'accessibility-ungrounded', // §4.H — a venue/seating decision whose accessibility axis isn't grounded (ADA / inclusive-seating)
  COST_UNRESEARCHED: 'cost-unresearched', // §4.D — a costFactorProvenance that is still synthesized, not researched against a real market source
  LEGAL_UNGROUNDED: 'legal-ungrounded', // §4.I — an alcohol/vendor/permit decision whose legal-liability axis isn't grounded
  VENUE_UNGROUNDED: 'venue-ungrounded', // §4.J — a venue/space decision whose capacity/power constraint axis isn't grounded
};

// ─── Provenance grounding predicates ──────────────────────────────────────────
// A provenance object is only GROUNDED when it carries real evidence, not merely a
// truthy key. The honest bar (DECISION_SCHEMA_SPEC §2): dated `sources`, OR a stated
// `tier` PLUS a written basis/rationale. An empty `{}` or a bare `{tier:'researched'}`
// with no sources and no basis is a hollow marker and does NOT ground anything.
const isGroundedProvenance = (p) =>
  !!p && typeof p === 'object' &&
  ((Array.isArray(p.sources) && p.sources.length > 0) ||
    (!!p.tier && typeof (p.basis || p.rationale) === 'string' && (p.basis || p.rationale).trim().length > 0));

// The importance axis (§4.A) is an EDITORIAL judgment, not an empirical fact, so its
// honest grounding is a stated one-line `rationale` (the "show your work" the host sees).
// A decision declares a priority axis if it authors any of weight/reversibility/emotionalWeight.
const hasPriorityAxis = (d) =>
  d.weight != null || d.reversibility != null || d.emotionalWeight != null;
const hasPriorityRationale = (d) =>
  !!d.priorityBasis && typeof d.priorityBasis.rationale === 'string' && d.priorityBasis.rationale.trim().length > 0;

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

  // §4.A `weight` — how consequential the decision is (venue vs place cards). BLANK
  // on every decision today, so the scorer has no importance axis. Any decision that
  // has not declared a weight is a gap (nullable-and-additive: unset = "not modelled").
  PRIORITY_WEIGHT: {
    type: FIELD_TYPES.PRIORITY_WEIGHT,
    hasData: (decision) => decision.weight != null,
    needsResearch: (decision) => decision.weight == null,
    label: (decision) => decision.label || decision.id,
    fieldPath: (decisionId) => `decisions[${decisionId}].weight`,
  },

  // §4.A `priorityBasis` — the PROVENANCE of the importance axis. A decision that
  // AUTHORS a weight/reversibility/emotionalWeight steers the host's board (it floats
  // the tribute above the place cards), so it must state WHY — a one-line, host-readable
  // rationale. An authored priority axis with no `priorityBasis.rationale` is an
  // unsourced editorial judgment: it changes what the host sees at a LOWER bar than a
  // crab price. That is the PRIORITY_UNSOURCED gap (authored-but-ungrounded). Distinct
  // from PRIORITY_WEIGHT (no weight at all): here the weight exists but is naked.
  PRIORITY_UNSOURCED: {
    type: FIELD_TYPES.PRIORITY_UNSOURCED,
    hasData: (decision) => hasPriorityRationale(decision),
    needsResearch: (decision) => hasPriorityAxis(decision) && !hasPriorityRationale(decision),
    label: (decision) => decision.label || decision.id,
    fieldPath: (decisionId) => `decisions[${decisionId}].priorityBasis`,
  },

  // §4.C `difmCapable` — the do-it-for-me / propose-vs-ask signal ('can-derive' vs
  // 'needs-host'). Missing → the frictionless doctrine can't tell whether to fill a
  // grounded default or ask the host, so an unset difmCapable is a gap.
  DIFM_CAPABILITY: {
    type: FIELD_TYPES.DIFM_CAPABILITY,
    hasData: (decision) => decision.difmCapable != null,
    needsResearch: (decision) => decision.difmCapable == null,
    label: (decision) => decision.label || decision.id,
    fieldPath: (decisionId) => `decisions[${decisionId}].difmCapable`,
  },

  // §4.B `timingProvenance` — a `when` deadline ('T-14d') is a bare guess until it
  // carries real grounding. `hasData` now demands a GROUNDED provenance (dated sources,
  // or a tier + a written basis) — NOT merely a truthy key: an empty `{}` or a bare
  // `{tier:'researched'}` with no sources is hollow and still counts as ungrounded.
  // A decision that DECLARES a `when` but no grounded timingProvenance is a gap
  // (a decision with no `when` at all has no deadline to ground, so it is not).
  // §4.G — cultural/religious axis. A decision that AUTHORS a `culturalContext` (faith or
  // tradition that steers the choice) must GROUND it against a real cited source — an
  // ungrounded/hollow cultural claim is worse than none. Only fires when the field exists,
  // so non-cultural decisions are never flagged (mirrors PRIORITY_UNSOURCED).
  CULTURAL_UNSOURCED: {
    type: FIELD_TYPES.CULTURAL_UNSOURCED,
    hasData: (decision) => !decision.culturalContext || isGroundedCulture(decision.culturalContext),
    needsResearch: (decision) => !!decision.culturalContext && !isGroundedCulture(decision.culturalContext),
    label: (decision) => decision.label || decision.id,
    fieldPath: (decisionId) => `decisions[${decisionId}].culturalContext`,
  },
  // §4.H — accessibility axis. A venue/seating decision (detected by category) must carry a
  // GROUNDED accessibility consideration (ADA route/restrooms/parking, or inclusive seating).
  // Only fires on venue/seating decisions, so non-spatial decisions are never flagged.
  ACCESSIBILITY_UNGROUNDED: {
    type: FIELD_TYPES.ACCESSIBILITY_UNGROUNDED,
    hasData: (decision) => !detectAccessibilityCategory(decision) || isGroundedAccessibility(effectiveAccessibility(decision)),
    needsResearch: (decision) => !!detectAccessibilityCategory(decision) && !isGroundedAccessibility(effectiveAccessibility(decision)),
    label: (decision) => decision.label || decision.id,
    fieldPath: (decisionId) => `decisions[${decisionId}].accessibilityContext`,
  },
  // §4.D — cost research. A decision that carries a costFactorProvenance should have it
  // RESEARCHED against a real market source, not left synthesized. Fires on every decision
  // with a still-synthesized provenance (a shrinking research backlog: 46 → 36 today).
  COST_UNRESEARCHED: {
    type: FIELD_TYPES.COST_UNRESEARCHED,
    hasData: (decision) => !decision.costFactorProvenance || isGroundedCost(decision.costFactorProvenance),
    needsResearch: (decision) => !!decision.costFactorProvenance && !isGroundedCost(decision.costFactorProvenance),
    label: (decision) => decision.label || decision.id,
    fieldPath: (decisionId) => `decisions[${decisionId}].costFactorProvenance`,
  },
  // §4.I — legal/liability axis. An alcohol/vendor/permit decision (detected by category)
  // must carry a GROUNDED legal consideration. Fires only on those decisions.
  LEGAL_UNGROUNDED: {
    type: FIELD_TYPES.LEGAL_UNGROUNDED,
    hasData: (decision) => !detectLegalCategory(decision) || isGroundedLegal(effectiveLegal(decision)),
    needsResearch: (decision) => !!detectLegalCategory(decision) && !isGroundedLegal(effectiveLegal(decision)),
    label: (decision) => decision.label || decision.id,
    fieldPath: (decisionId) => `decisions[${decisionId}].legalContext`,
  },
  // §4.J — venue-constraint axis. A venue/space decision (detected by category) must carry a
  // GROUNDED capacity/power constraint. Fires only on venue/power decisions.
  VENUE_UNGROUNDED: {
    type: FIELD_TYPES.VENUE_UNGROUNDED,
    hasData: (decision) => !detectVenueCategory(decision) || isGroundedVenue(effectiveVenue(decision)),
    needsResearch: (decision) => !!detectVenueCategory(decision) && !isGroundedVenue(effectiveVenue(decision)),
    label: (decision) => decision.label || decision.id,
    fieldPath: (decisionId) => `decisions[${decisionId}].venueContext`,
  },
  TIMING_PROVENANCE: {
    type: FIELD_TYPES.TIMING_PROVENANCE,
    // Grounded by an authored timingProvenance OR the category resolver's real sources.
    hasData: (decision) => isGroundedProvenance(decision.timingProvenance)
      || isGroundedTiming(resolveTimingProvenance(decision)),
    needsResearch: (decision) => !!decision.when
      && !isGroundedProvenance(decision.timingProvenance)
      && !isGroundedTiming(resolveTimingProvenance(decision)),
    label: (decision) => decision.label || decision.id,
    fieldPath: (decisionId) => `decisions[${decisionId}].timingProvenance`,
  },

  // §4.D budget linkage — a money-touching decision (costFactors present) must feed
  // the budget engine through `affects` (the cost-driver purchase ids). costFactors
  // with no `affects` is a consequence-graph gap: the price signal never reaches a
  // surface. Complements the contract linter's well-formedness check (which validates
  // affects → real purchase ids when affects EXISTS); this flags its ABSENCE.
  BUDGET_LINKAGE: {
    type: FIELD_TYPES.BUDGET_LINKAGE,
    hasData: (decision) => Array.isArray(decision.affects) && decision.affects.length > 0,
    needsResearch: (decision) =>
      decision.costFactors && Object.keys(decision.costFactors).length > 0 &&
      !(Array.isArray(decision.affects) && decision.affects.length > 0),
    label: (decision) => decision.label || decision.id,
    fieldPath: (decisionId) => `decisions[${decisionId}].affects`,
  },
};

// The decision-level criteria the traversal runs, in a stable order. COST_FACTOR
// leads (the original gap type) so existing fieldPath-keyed consumers are unaffected;
// the priority-tier criteria (DECISION_SCHEMA_SPEC §6) follow.
const DECISION_GAP_CRITERIA = [
  GAP_CRITERIA.COST_FACTOR,
  GAP_CRITERIA.PRIORITY_WEIGHT,
  GAP_CRITERIA.PRIORITY_UNSOURCED,
  GAP_CRITERIA.CULTURAL_UNSOURCED,
  GAP_CRITERIA.ACCESSIBILITY_UNGROUNDED,
  GAP_CRITERIA.COST_UNRESEARCHED,
  GAP_CRITERIA.LEGAL_UNGROUNDED,
  GAP_CRITERIA.VENUE_UNGROUNDED,
  GAP_CRITERIA.DIFM_CAPABILITY,
  GAP_CRITERIA.TIMING_PROVENANCE,
  GAP_CRITERIA.BUDGET_LINKAGE,
];

// Playbook traversal — get all gaps from a playbook. Each decision is checked against
// every decision-level criterion; a single decision can surface MULTIPLE typed gaps
// (e.g. missing weight AND missing difmCapable). Each gap is keyed by its own
// fieldPath sub-field, so downstream fieldPath-indexed consumers never collide.
export function detectGapsInPlaybook(playbook) {
  if (!playbook) return [];

  const gaps = [];

  if (playbook.decisions && Array.isArray(playbook.decisions)) {
    playbook.decisions.forEach((decision) => {
      for (const criterion of DECISION_GAP_CRITERIA) {
        if (criterion.needsResearch(decision)) {
          gaps.push({
            id: decision.id,
            type: criterion.type,
            label: criterion.label(decision),
            fieldPath: criterion.fieldPath(decision.id),
            decision,
          });
        }
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
