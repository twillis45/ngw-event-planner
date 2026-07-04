// ─── Persona Resolution Engine (Sprint A) ────────────────────────────────
// Pure function: resolvePersona()
// Inputs: eventIdentity, accountProfile, relationship, context
// Outputs: Canonical persona (Host, Planner, Coordinator, Corporate, Venue, Vendor)
//
// Persona resolution NOW consumes Event Identity (not raw intake).
// This ensures persona determination is based on correct event understanding.
//
// 6-Rule Priority Hierarchy:
// 1. Event Type → Persona Mapping (highest priority)
// 2. Account Role
// 3. Declared Relationship
// 4. Knowledge Domain Inference
// 5. Participant Composition
// 6. Explicit Override (user wins, always)

const PERSONAS = {
  HOST: 'host',
  PLANNER: 'planner',
  COORDINATOR: 'coordinator',
  CORPORATE: 'corporate',
  VENUE: 'venue',
  VENDOR: 'vendor'
};

// Rule 1: Event Type → Persona Mapping
// Maps event characteristics to most likely persona
function applyRule1_EventTypeMapping(eventIdentity, relationship) {
  const { complexity, primaryEventType, isCompound, celebrationType } = eventIdentity;

  // Simple or standard personal events → host
  if ((complexity === 'simple' || complexity === 'standard') &&
      (relationship === 'self' || relationship === 'family' || relationship === 'friend')) {
    return {
      persona: PERSONAS.HOST,
      confidence: 0.90,
      appliedRule: 'event_type_simple_personal'
    };
  }

  // Compound events with self-planning → host
  if (isCompound && (relationship === 'self' || relationship === 'family')) {
    return {
      persona: PERSONAS.HOST,
      confidence: 0.85,
      appliedRule: 'event_type_compound_self_planning'
    };
  }

  // Enterprise events → corporate
  if (complexity === 'enterprise' || primaryEventType === 'Conference' || primaryEventType === 'Team Retreat') {
    return {
      persona: PERSONAS.CORPORATE,
      confidence: 0.85,
      appliedRule: 'event_type_enterprise'
    };
  }

  // Multi-day events with travel → planner
  if (complexity === 'multi-day' && eventIdentity.knowledgeDomains.includes('travel')) {
    return {
      persona: PERSONAS.PLANNER,
      confidence: 0.75,
      appliedRule: 'event_type_multiday_travel'
    };
  }

  return null;
}

// Rule 2: Account Role
function applyRule2_AccountRole(accountProfile) {
  if (!accountProfile || !accountProfile.role) return null;

  const { role } = accountProfile;

  if (role === 'individual') {
    return {
      persona: PERSONAS.HOST,
      confidence: 0.75,
      appliedRule: 'account_role_individual'
    };
  }

  if (role === 'professional_planner') {
    return {
      persona: PERSONAS.PLANNER,
      confidence: 0.80,
      appliedRule: 'account_role_professional_planner'
    };
  }

  if (role === 'business' || role === 'corporate') {
    return {
      persona: PERSONAS.CORPORATE,
      confidence: 0.80,
      appliedRule: 'account_role_business'
    };
  }

  if (role === 'venue') {
    return {
      persona: PERSONAS.VENUE,
      confidence: 0.85,
      appliedRule: 'account_role_venue'
    };
  }

  if (role === 'vendor') {
    return {
      persona: PERSONAS.VENDOR,
      confidence: 0.85,
      appliedRule: 'account_role_vendor'
    };
  }

  return null;
}

// Rule 3: Declared Relationship
function applyRule3_DeclaredRelationship(relationship) {
  if (!relationship) return null;

  if (relationship === 'self' || relationship === 'family' || relationship === 'friend') {
    return {
      persona: PERSONAS.HOST,
      confidence: 0.85,
      appliedRule: 'declared_relationship_personal'
    };
  }

  if (relationship === 'client' || relationship === 'contract') {
    return {
      persona: PERSONAS.PLANNER,
      confidence: 0.75,
      appliedRule: 'declared_relationship_professional'
    };
  }

  if (relationship === 'corporate') {
    return {
      persona: PERSONAS.CORPORATE,
      confidence: 0.80,
      appliedRule: 'declared_relationship_corporate'
    };
  }

  return null;
}

// Rule 4: Knowledge Domain Inference
// If event requires specialized domains (military ceremony, etc.), consider persona
function applyRule4_KnowledgeDomainInference(eventIdentity, relationship) {
  const { knowledgeDomains } = eventIdentity;

  // Military ceremonies usually planned by family (host), not professional planner
  if (knowledgeDomains.includes('military-ceremony') && relationship !== 'vendor' && relationship !== 'client') {
    return {
      persona: PERSONAS.HOST,
      confidence: 0.70,
      appliedRule: 'domain_military_ceremony_personal'
    };
  }

  // Corporate domains suggest corporate persona
  if (knowledgeDomains.includes('formal-events') && relationship === 'corporate') {
    return {
      persona: PERSONAS.CORPORATE,
      confidence: 0.75,
      appliedRule: 'domain_corporate'
    };
  }

  return null;
}

// Rule 5: Participant Composition
// Heavily family-focused → host; heavily professional → corporate/planner
function applyRule5_ParticipantComposition(eventIdentity) {
  const { participants } = eventIdentity;

  const familyCount = participants.filter(p => p.includes('family')).length;
  const professionalCount = participants.filter(p => p.includes('coworker') || p.includes('military-colleague')).length;

  if (familyCount > professionalCount && familyCount > 0) {
    return {
      persona: PERSONAS.HOST,
      confidence: 0.65,
      appliedRule: 'participant_family_focused'
    };
  }

  if (professionalCount > familyCount) {
    return {
      persona: PERSONAS.CORPORATE,
      confidence: 0.65,
      appliedRule: 'participant_professional_focused'
    };
  }

  return null;
}

// Rule 6: Explicit Override (always wins)
function applyRule6_ExplicitOverride(context) {
  if (context && context.explicitPersonaOverride) {
    return {
      persona: context.explicitPersonaOverride,
      confidence: 1.0,
      appliedRule: 'explicit_override'
    };
  }

  return null;
}

// Main function
export function resolvePersona(eventIdentity, accountProfile, relationship, context) {
  // Try Rule 6 FIRST (explicit override always wins)
  let result = applyRule6_ExplicitOverride(context);
  if (result) {
    return { ...result };
  }

  // Try Rule 1 (highest priority after override)
  result = applyRule1_EventTypeMapping(eventIdentity, relationship);
  if (result && result.confidence >= 0.85) {
    return { ...result, appliedRule: result.appliedRule || 'rule1_event_type' };
  }

  // Try Rule 2
  result = applyRule2_AccountRole(accountProfile);
  if (result && result.confidence >= 0.80) {
    return { ...result };
  }

  // Try Rule 3
  result = applyRule3_DeclaredRelationship(relationship);
  if (result && result.confidence >= 0.80) {
    return { ...result };
  }

  // Try Rule 4
  result = applyRule4_KnowledgeDomainInference(eventIdentity, relationship);
  if (result) {
    return { ...result };
  }

  // Try Rule 5
  result = applyRule5_ParticipantComposition(eventIdentity);
  if (result) {
    return { ...result };
  }

  // Fallback: default to host
  return {
    persona: PERSONAS.HOST,
    confidence: 0.30,
    reasoning: 'No strong signals matched; defaulting to host',
    appliedRule: 'fallback_default',
    requiresOverride: true
  };
}

// Export for testing
export { PERSONAS };
