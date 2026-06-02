// Environmental Memory Architecture — Sprint 34 Implementation Foundation
//
// Past failures reshape the current environment. The coordinator doesn't
// need to remember that crossfade failed at the Chen wedding — the
// environment carries that memory as structural reinforcement.
//
// Memory is NOT notifications. It is NOT alerts. It is environmental
// consequence: spacing changes, border treatments, buffer additions,
// weight adjustments. The system remembers so the human doesn't have to.
//
// Three memory types:
//   1. FAILURE    — something went wrong → item gains permanent weight
//   2. DELAY      — vendor was late → buffer time added to routing
//   3. PATTERN    — recurring behavior → environmental reinforcement

export const MEMORY_TYPE = {
  FAILURE: 'failure',
  DELAY:   'delay',
  PATTERN: 'pattern',
};

// Severity of the original incident — drives memory intensity
export const MEMORY_SEVERITY = {
  MINOR:    'minor',    // inconvenience, recovered quickly
  MODERATE: 'moderate', // noticeable impact, required intervention
  MAJOR:    'major',    // significant disruption, guests affected
  CRITICAL: 'critical', // near-failure or actual failure
};

const SEVERITY_WEIGHT = {
  minor:    0.10,
  moderate: 0.20,
  major:    0.35,
  critical: 0.50,
};

/**
 * Create a memory record from a past event failure.
 *
 * @param {Object} params
 * @param {string} params.eventName       — "Chen Wedding", "Rodriguez Gala"
 * @param {string} params.vendorId        — vendor involved
 * @param {string} params.itemId          — sequence item involved (e.g., "crossfade")
 * @param {string} params.type            — FAILURE | DELAY | PATTERN
 * @param {string} params.severity        — minor | moderate | major | critical
 * @param {string} params.description     — human-readable failure description
 * @param {number} params.daysAgo         — how many days ago (memory decays)
 * @param {number} params.delayMinutes    — for DELAY type: actual delay in minutes
 * @returns {Object} memory record
 */
export function createMemory({
  eventName,
  vendorId,
  itemId,
  type = MEMORY_TYPE.FAILURE,
  severity = MEMORY_SEVERITY.MODERATE,
  description = '',
  daysAgo = 0,
  delayMinutes = 0,
}) {
  return {
    eventName,
    vendorId,
    itemId,
    type,
    severity,
    description,
    daysAgo,
    delayMinutes,
    createdAt: Date.now(),
  };
}

/**
 * Compute memory decay factor. Recent memories have stronger influence.
 * Memory doesn't vanish — it fades. A failure from 2 days ago dominates;
 * a failure from 6 months ago is a whisper.
 *
 * @param {number} daysAgo — how many days since the event
 * @returns {number} decay factor 0.0–1.0 (1.0 = full intensity)
 */
export function memoryDecay(daysAgo) {
  if (daysAgo <= 2) return 1.0;        // very recent — full intensity
  if (daysAgo <= 7) return 0.90;       // this week — near-full
  if (daysAgo <= 14) return 0.75;      // last two weeks — strong
  if (daysAgo <= 30) return 0.55;      // last month — moderate
  if (daysAgo <= 90) return 0.35;      // last quarter — fading
  if (daysAgo <= 180) return 0.20;     // last 6 months — whisper
  return 0.10;                         // older — barely there but not gone
}

/**
 * Compute the environmental consequence of a memory for a specific item.
 *
 * @param {Object} memory — memory record from createMemory
 * @returns {Object} environmental consequences
 */
export function memoryConsequence(memory) {
  const decay = memoryDecay(memory.daysAgo);
  const baseWeight = SEVERITY_WEIGHT[memory.severity] || 0.10;
  const effectiveWeight = baseWeight * decay;

  switch (memory.type) {
    case MEMORY_TYPE.FAILURE:
      return {
        type: 'failure',
        // Item weight increase — makes the item visually heavier
        weightIncrease: effectiveWeight * 0.6,
        // Fragile flag threshold — critical/major failures flag item as fragile
        isFragile: memory.severity === 'critical' || memory.severity === 'major',
        // Border treatment
        borderIntent: effectiveWeight > 0.15 ? 'fragile' : 'caution',
        // Buffer time added (seconds) — proportional to severity
        bufferSeconds: memory.severity === 'critical' ? 45
          : memory.severity === 'major' ? 30
          : 15,
        // Source attribution for environmental display
        source: memory.eventName,
        description: memory.description,
        effectiveWeight,
        decay,
      };

    case MEMORY_TYPE.DELAY:
      return {
        type: 'delay',
        // Buffer time = 50% of the actual delay (conservative)
        bufferMinutes: Math.ceil(memory.delayMinutes * 0.5 * decay),
        // Vendor weight increase
        weightIncrease: effectiveWeight * 0.4,
        // Vendor-level caution
        borderIntent: 'caution',
        isFragile: false,
        source: memory.eventName,
        description: memory.description,
        effectiveWeight,
        decay,
      };

    case MEMORY_TYPE.PATTERN:
      return {
        type: 'pattern',
        // Reinforcement strength — patterns build environmental character
        reinforcementStrength: effectiveWeight,
        weightIncrease: effectiveWeight * 0.3,
        borderIntent: effectiveWeight > 0.20 ? 'caution' : 'none',
        isFragile: false,
        source: memory.eventName,
        description: memory.description,
        effectiveWeight,
        decay,
      };

    default:
      return {
        type: 'unknown',
        weightIncrease: 0,
        isFragile: false,
        borderIntent: 'none',
        effectiveWeight: 0,
        decay,
      };
  }
}

/**
 * Aggregate multiple memories for the same item or vendor.
 * Multiple failures compound — the environment accumulates consequence.
 *
 * @param {Array} memories — array of memory records
 * @param {string} targetId — item or vendor ID to aggregate for
 * @param {string} field — 'itemId' or 'vendorId'
 * @returns {Object} aggregated environmental effect
 */
export function aggregateMemories(memories, targetId, field = 'itemId') {
  const relevant = memories.filter(m => m[field] === targetId);
  if (relevant.length === 0) {
    return {
      totalWeightIncrease: 0,
      isFragile: false,
      borderIntent: 'none',
      bufferSeconds: 0,
      bufferMinutes: 0,
      memories: [],
      memoryCount: 0,
    };
  }

  const consequences = relevant.map(memoryConsequence);

  // Aggregate with diminishing returns — each additional memory adds less
  let totalWeight = 0;
  consequences.forEach((c, i) => {
    const diminishing = 1 / (1 + i * 0.3); // first=1.0, second=0.77, third=0.63
    totalWeight += (c.weightIncrease || 0) * diminishing;
  });

  const isFragile = consequences.some(c => c.isFragile);
  const maxBorderIntent = consequences.reduce((max, c) => {
    const order = { none: 0, caution: 1, fragile: 2 };
    return (order[c.borderIntent] || 0) > (order[max] || 0) ? c.borderIntent : max;
  }, 'none');

  const totalBufferSeconds = consequences.reduce((sum, c) => sum + (c.bufferSeconds || 0), 0);
  const totalBufferMinutes = consequences.reduce((sum, c) => sum + (c.bufferMinutes || 0), 0);

  return {
    totalWeightIncrease: Math.min(0.50, totalWeight), // cap at +0.50
    isFragile,
    borderIntent: maxBorderIntent,
    bufferSeconds: Math.min(120, totalBufferSeconds), // cap at 2 minutes
    bufferMinutes: Math.min(15, totalBufferMinutes),  // cap at 15 minutes
    memories: relevant,
    memoryCount: relevant.length,
    consequences,
  };
}
