// ─── Event Identity Engine (Sprint A) ─────────────────────────────────────
// Pure function: resolveEventIdentity()
// Inputs: intake, eventType, relationship, optionalFreeText
// Outputs: Canonical Event Identity object (what IS this event?)
//
// This is THE foundational engine. Everything downstream (persona, shell, timeline,
// budget, vendors) derives from correct event identity.
//
// Event Identity includes:
// - primaryEventType: canonical type
// - secondaryEventTypes: array of additional milestones
// - eventSubtype: domain-specific classification (e.g., 'military-retirement')
// - celebrationType: ceremonial | casual | formal | mixed
// - participants: roles/groups present
// - knowledgeDomains: required planning domains
// - complexity: simple | standard | compound | multi-day | enterprise
// - isCompound: boolean (multiple milestones/ceremonies)
// - requiresMerge: boolean (compound events need timeline/budget merging)
// - confidence: 0.0-1.0
// - missingClarifyingQuestions: array of questions to resolve ambiguity

const EVENT_COMPLEXITY = {
  SIMPLE: 'simple',           // Single event, <50 guests, single location, one time block
  STANDARD: 'standard',       // Single event, 50-200 guests, standard logistics
  COMPOUND: 'compound',       // Multiple events/ceremonies OR multiple celebration types
  MULTI_DAY: 'multi-day',     // Spans 2+ days (rehearsal+ceremony+reception, etc.)
  ENTERPRISE: 'enterprise'    // Corporate, 500+ guests, formal governance
};

const CELEBRATION_TYPES = {
  CEREMONIAL: 'ceremonial',   // Formal ceremony component (wedding, military, religious)
  CASUAL: 'casual',           // Informal gathering
  FORMAL: 'formal',           // Formal event (gala, awards, conference)
  MIXED: 'mixed'              // Combination of ceremony + casual/formal
};

// Knowledge domains that events might require
const KNOWLEDGE_DOMAINS = {
  BIRTHDAY: 'birthday-celebration',
  RETIREMENT: 'retirement-planning',
  MILITARY_CEREMONY: 'military-ceremony',
  WEDDING: 'wedding-planning',
  CATERING: 'catering',
  PHOTOGRAPHY: 'photography',
  FORMAL_EVENTS: 'formal-events',
  VENUE_LOGISTICS: 'venue-logistics',
  GUEST_MANAGEMENT: 'guest-management',
  BUDGET_PLANNING: 'budget-planning',
  CEREMONY_PROTOCOL: 'ceremony-protocol',
  FAMILY_COORDINATION: 'family-coordination',
  CULTURAL_TRADITIONS: 'cultural-traditions',
  TIMELINE_COORDINATION: 'timeline-coordination'
};

// Detect milestone types from free text
function detectMilestones(text, primaryType) {
  const lowerText = (text || '').toLowerCase();
  const detected = [];

  // Retirement
  if (lowerText.includes('retire') || lowerText.includes('retirement')) {
    if (!detected.includes('retirement')) {
      detected.push('retirement');
      // Detect subtype (military, career, etc.)
      if (lowerText.includes('military') || lowerText.includes('navy') || lowerText.includes('army') || lowerText.includes('marines') || lowerText.includes('air force')) {
        if (!detected.includes('military-retirement')) {
          detected.push('military-retirement');
        }
      }
    }
  }

  // Anniversary
  if (lowerText.includes('anniversar')) {
    if (!detected.includes('anniversary')) detected.push('anniversary');
  }

  // Graduation
  if (lowerText.includes('graduat')) {
    if (!detected.includes('graduation')) detected.push('graduation');
  }

  // Promotion/Achievement
  if (lowerText.includes('promot') || lowerText.includes('achievement') || lowerText.includes('promotion')) {
    if (!detected.includes('promotion')) detected.push('promotion');
  }

  // Family Reunion
  if (lowerText.includes('family reunion') || lowerText.includes('reunion')) {
    if (!detected.includes('family-reunion')) detected.push('family-reunion');
  }

  // Birthday — as a SECONDARY milestone only. When primaryType is already
  // 'Birthday', the text describing itself ("planning my birthday party")
  // must not also register as a compound secondary milestone — that's the
  // event, not an add-on. This is the real-world gap a retirement party
  // that's ALSO someone's milestone birthday exposed: a Retirement Party
  // whose free text mentions "50th birthday" had no keyword path to ever
  // register the birthday half, so isCompound stayed false and the
  // ceremony-timing blocker (which depends on isCompound) could never fire
  // for that scenario — asymmetric with the Birthday-primary + retirement-
  // secondary case, which already worked via the 'retire' check below.
  if (primaryType !== 'Birthday' && lowerText.includes('birthday')) {
    if (!detected.includes('birthday')) detected.push('birthday');
  }

  return detected;
}

// Detect ceremony components from text
function detectCeremonyComponents(text) {
  const lowerText = (text || '').toLowerCase();
  const components = [];

  if (lowerText.includes('ceremony')) {
    components.push('ceremony');
    // If it's a ceremony, assume formal salute as part of it
    if (lowerText.includes('military')) components.push('formal-salute');
  }
  if (lowerText.includes('military') && lowerText.includes('ceremony')) components.push('military-ceremony');
  if (lowerText.includes('salute') || lowerText.includes('flag')) components.push('formal-salute');
  if (lowerText.includes('vows') || lowerText.includes('exchange vows')) components.push('wedding-vows');
  if (lowerText.includes('toast') || lowerText.includes('speech')) components.push('toasts-speeches');

  return components;
}

// Detect participant groups
function detectParticipants(text, relationship) {
  const participants = [];
  const lowerText = (text || '').toLowerCase();

  if (relationship === 'self' || relationship === 'family') {
    participants.push('immediate-family');
  }

  if (lowerText.includes('friend')) {
    participants.push('friends');
  }

  if (lowerText.includes('coworker') || lowerText.includes('colleague') || lowerText.includes('work')) {
    participants.push('coworkers');
  }

  if (lowerText.includes('navy') || lowerText.includes('army') || lowerText.includes('military')) {
    participants.push('military-colleagues');
  }

  if (lowerText.includes('extended') || lowerText.includes('large group')) {
    participants.push('extended-family');
  }

  // Fallback: always have at least one participant group
  if (participants.length === 0) {
    participants.push('guests');
  }

  return participants;
}

// Infer knowledge domains needed for this event
function inferKnowledgeDomains(primaryType, secondaryTypes, participants, text) {
  const domains = new Set();

  // Primary type determines base domains
  if (primaryType === 'Birthday') {
    domains.add(KNOWLEDGE_DOMAINS.BIRTHDAY);
  } else if (primaryType === 'Retirement Party' || primaryType.includes('Retirement')) {
    domains.add(KNOWLEDGE_DOMAINS.RETIREMENT);
  } else if (primaryType === 'Wedding') {
    domains.add(KNOWLEDGE_DOMAINS.WEDDING);
  }

  // Secondary types add more domains
  secondaryTypes.forEach(secondary => {
    if (secondary.includes('retirement')) {
      domains.add(KNOWLEDGE_DOMAINS.RETIREMENT);
      if (secondary.includes('military')) {
        domains.add(KNOWLEDGE_DOMAINS.MILITARY_CEREMONY);
      }
    }
    if (secondary === 'graduation') {
      domains.add(KNOWLEDGE_DOMAINS.BIRTHDAY);
    }
    if (secondary === 'birthday') {
      domains.add(KNOWLEDGE_DOMAINS.BIRTHDAY);
    }
  });

  // Check for military references
  const lowerText = (text || '').toLowerCase();
  if (lowerText.includes('military') || lowerText.includes('navy') || lowerText.includes('armed')) {
    domains.add(KNOWLEDGE_DOMAINS.MILITARY_CEREMONY);
    domains.add(KNOWLEDGE_DOMAINS.CEREMONY_PROTOCOL);
  }

  // Always include common domains
  domains.add(KNOWLEDGE_DOMAINS.CATERING);
  domains.add(KNOWLEDGE_DOMAINS.PHOTOGRAPHY);
  domains.add(KNOWLEDGE_DOMAINS.VENUE_LOGISTICS);
  domains.add(KNOWLEDGE_DOMAINS.GUEST_MANAGEMENT);
  domains.add(KNOWLEDGE_DOMAINS.BUDGET_PLANNING);

  // Add if family is involved
  if (lowerText.includes('family')) {
    domains.add(KNOWLEDGE_DOMAINS.FAMILY_COORDINATION);
  }

  return Array.from(domains);
}

// Determine event complexity based on characteristics
function determineComplexity(primaryType, secondaryTypes, participants, guestCount, hasMultipleTimeBlocks) {
  const isCompound = secondaryTypes.length > 0;
  const guestCountEstimate = guestCount || 75;

  // Enterprise: corporate, 500+ guests, formal governance
  if (guestCountEstimate >= 500 || primaryType === 'Conference' || primaryType === 'Team Retreat') {
    return EVENT_COMPLEXITY.ENTERPRISE;
  }

  // Multi-day: spans 2+ days
  if (hasMultipleTimeBlocks || primaryType === 'Team Retreat' || primaryType === 'Conference') {
    return EVENT_COMPLEXITY.MULTI_DAY;
  }

  // Compound: multiple events/milestones
  if (isCompound) {
    return EVENT_COMPLEXITY.COMPOUND;
  }

  // Standard: 50-200 guests, single event
  if (guestCountEstimate > 50) {
    return EVENT_COMPLEXITY.STANDARD;
  }

  // Simple: <50 guests, single event, simple logistics
  return EVENT_COMPLEXITY.SIMPLE;
}

// Main function: resolve event identity
export function resolveEventIdentity(intake, eventType, relationship, optionalFreeText) {
  const freeText = optionalFreeText || '';
  const lowerText = freeText.toLowerCase();

  // Detect primary type (from intake selection or free text)
  const primaryType = eventType || 'Other';

  // Detect secondary types from free text
  const secondaryTypes = detectMilestones(freeText, primaryType);

  // Detect if this is compound (multiple milestones or explicit conjunction)
  const isCompound = secondaryTypes.length > 0 ||
                     lowerText.includes(' and ') ||
                     lowerText.includes('+');

  // Detect ceremony components
  let ceremonyComponents = detectCeremonyComponents(freeText);

  // Auto-add military ceremony components if military retirement detected
  if (secondaryTypes.includes('military-retirement')) {
    if (!ceremonyComponents.includes('military-ceremony')) {
      ceremonyComponents.push('military-ceremony');
    }
    if (!ceremonyComponents.includes('formal-salute')) {
      ceremonyComponents.push('formal-salute');
    }
  }

  // Detect celebration components
  const celebrationComponents = [];
  if (primaryType === 'Birthday' || primaryType.includes('Birthday')) {
    celebrationComponents.push('milestone-birthday-celebration');
  }

  // Detect recognition components
  const recognitionComponents = [];
  if (secondaryTypes.includes('military-retirement')) {
    recognitionComponents.push('military-service-honor');
  }
  if (secondaryTypes.includes('retirement')) {
    recognitionComponents.push('career-retirement-recognition');
  }

  // Determine celebration type
  let celebrationType = CELEBRATION_TYPES.CASUAL;
  if (ceremonyComponents.length > 0) {
    celebrationType = CELEBRATION_TYPES.CEREMONIAL;
  }
  if (primaryType === 'Wedding' || primaryType === 'Fundraiser / Gala') {
    celebrationType = CELEBRATION_TYPES.FORMAL;
  }
  if (ceremonyComponents.length > 0 && celebrationComponents.length > 0) {
    celebrationType = CELEBRATION_TYPES.MIXED;
  }

  // Detect participants
  const participants = detectParticipants(freeText, relationship);

  // Infer knowledge domains
  const knowledgeDomains = inferKnowledgeDomains(primaryType, secondaryTypes, participants, freeText);

  // Estimate guest count from text (default to 30 for simple events)
  const guestCountMatch = freeText.match(/(\d+)\s*(?:people|guests|person|attendee)/i);
  const estimatedGuestCount = guestCountMatch ? parseInt(guestCountMatch[1]) : 30;

  // Detect multiple time blocks
  const hasMultipleTimeBlocks =
    (lowerText.includes('ceremony') && lowerText.includes('reception')) ||
    (lowerText.includes('rehearsal') && lowerText.includes('reception')) ||
    lowerText.includes('rehearsal dinner') ||
    lowerText.includes('separate event') ||
    lowerText.includes('2 day') ||
    lowerText.includes('multi-day') ||
    lowerText.includes('night before');

  // Determine complexity
  const complexity = determineComplexity(primaryType, secondaryTypes, participants, estimatedGuestCount, hasMultipleTimeBlocks);

  // Determine if merge is required
  const requiresMerge = isCompound && (
    participants.length > 1 ||  // Multiple participant groups
    hasMultipleTimeBlocks ||    // Different time blocks
    lowerText.includes('same day') // Explicit same-day merge intent
  );

  // Identify missing clarifying questions
  const missingQuestions = [];
  if (isCompound && !lowerText.includes('same day') && !lowerText.includes('separate')) {
    missingQuestions.push('Will the ceremony and celebration happen on the same day or separate days?');
  }
  if (participants.includes('military-colleagues') && !lowerText.includes('how many')) {
    missingQuestions.push('How many military colleagues vs. family members will attend?');
  }
  if (ceremonyComponents.length > 0 && !lowerText.includes('dress')) {
    missingQuestions.push('Will the formal dress code apply to the entire event or just the ceremony?');
  }
  if (secondaryTypes.includes('military-retirement') && !lowerText.includes('flag')) {
    missingQuestions.push('Will there be a flag ceremony or color guard?');
  }

  // Calculate confidence
  let confidence = 0.75;
  if (eventType) confidence += 0.10;
  if (relationship) confidence += 0.05;
  if (freeText.length > 50) confidence += 0.05;
  if (isCompound && ceremonyComponents.length > 0) confidence += 0.05;
  confidence = Math.min(confidence, 0.95); // Cap at 0.95

  // Generate canonical description
  let canonicalDesc = `${primaryType}`;
  if (secondaryTypes.length > 0) {
    canonicalDesc += ` + ${secondaryTypes.join(' + ')}`;
  }
  if (isCompound) {
    canonicalDesc += ` (compound event`;
    if (requiresMerge) canonicalDesc += ', requires merging';
    canonicalDesc += ')';
  }

  return {
    primaryEventType: primaryType,
    secondaryEventTypes: secondaryTypes,
    celebrationType,
    participants,
    knowledgeDomains,
    complexity,
    isCompound,
    requiresMerge,
    confidence,
    ceremonyComponents,
    celebrationComponents,
    recognitionComponents,
    reasoning: `Primary: ${primaryType}. Compound: ${isCompound}. Complexity: ${complexity}.`,
    missingClarifyingQuestions: missingQuestions,
    canonicalDescription: canonicalDesc,
    estimatedGuestCount
  };
}

// Export for testing
export { EVENT_COMPLEXITY, CELEBRATION_TYPES, KNOWLEDGE_DOMAINS };
