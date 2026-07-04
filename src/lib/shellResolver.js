// ─── Shell Resolver (Sprint A) ────────────────────────────────────────
// Pure function: resolveShell()
// Inputs: eventIdentity, persona
// Outputs: Shell assignment (deterministic)
//
// Shell routing is deterministic: persona → shell
// No logic here; just the mapping table.

const SHELLS = {
  HOST: 'host',
  PLANNER: 'planner',
  COORDINATOR: 'coordinator',
  CORPORATE: 'corporate',
  VENUE: 'venue',
  VENDOR: 'vendor'
};

// Deterministic routing table
const PERSONA_TO_SHELL = {
  'host': SHELLS.HOST,
  'planner': SHELLS.PLANNER,
  'coordinator': SHELLS.COORDINATOR,
  'corporate': SHELLS.CORPORATE,
  'venue': SHELLS.VENUE,
  'vendor': SHELLS.VENDOR
};

export function resolveShell(eventIdentity, persona) {
  if (!persona) {
    return {
      shell: SHELLS.HOST,
      confidence: 0.50,
      reasoning: 'No persona provided; defaulting to host shell',
      appliedRule: 'fallback_default'
    };
  }

  const shell = PERSONA_TO_SHELL[persona] || SHELLS.HOST;

  return {
    shell,
    confidence: 0.95, // Deterministic routing is high confidence
    reasoning: `Persona '${persona}' → shell '${shell}'`,
    appliedRule: 'deterministic_routing',
    eventComplexity: eventIdentity?.complexity || 'unknown'
  };
}

// Export for testing
export { SHELLS };
