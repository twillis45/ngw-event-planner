// Trust Compression System — Sprint 34 Implementation Foundation
//
// Trusted vendors compress when not in active dependency chains.
// Compression is EARNED through operational history — not configured
// by user preference. The environment observes vendor reliability
// and compresses what has been proven trustworthy.
//
// Compression levels:
//   FULL      — all details visible (name, status, contact, notes)
//   COMPACT   — name + status indicator only
//   COLLAPSED — single-line: abbreviated name + status symbol
//   GHOSTED   — near-invisible, 10-15% opacity, name only
//
// Compression triggers:
//   1. Vendor trust score (from completed events without issues)
//   2. Current pressure state (higher pressure = more compression)
//   3. Active dependency (in dependency chain = always expanded)
//   4. Current status (any non-nominal status = always expanded)

export const COMPRESSION_LEVEL = {
  FULL:      'full',
  COMPACT:   'compact',
  COLLAPSED: 'collapsed',
  GHOSTED:   'ghosted',
};

// Trust thresholds — how many successful events before compression kicks in
const TRUST_THRESHOLDS = {
  compact:   5,    // 5+ events without issues → eligible for compact
  collapsed: 20,   // 20+ events → eligible for collapsed
  ghosted:   50,   // 50+ events → eligible for ghosted (under active pressure only)
};

/**
 * Compute trust score from vendor operational history.
 *
 * @param {Object} vendor
 * @param {number} vendor.eventsCompleted    — total events completed
 * @param {number} vendor.failureCount       — total failures/issues
 * @param {number} vendor.consecutiveClean   — consecutive events without issues
 * @param {number} vendor.avgResponseMinutes — average response time to coordinator
 * @returns {number} trust score 0.0–1.0
 */
export function computeTrust(vendor) {
  const {
    eventsCompleted = 0,
    failureCount = 0,
    consecutiveClean = 0,
    avgResponseMinutes = 30,
  } = vendor;

  if (eventsCompleted === 0) return 0.0;

  // Success rate (0–1)
  const successRate = Math.max(0, 1 - (failureCount / eventsCompleted));

  // Volume factor — more events = more confidence in the trust signal
  const volumeFactor = Math.min(1.0, eventsCompleted / 50);

  // Streak bonus — consecutive clean events show current reliability
  const streakBonus = Math.min(0.15, consecutiveClean * 0.01);

  // Responsiveness factor (faster response = more trustworthy for compression)
  const responseFactor = avgResponseMinutes <= 5 ? 0.10
    : avgResponseMinutes <= 15 ? 0.05
    : 0.0;

  return Math.min(1.0, (successRate * 0.5 + volumeFactor * 0.25 + streakBonus + responseFactor));
}

/**
 * Resolve compression level for a vendor given trust + operational context.
 *
 * @param {Object} params
 * @param {Object} params.vendor            — vendor with operational history
 * @param {string} params.pressureState     — calm | building | active | recovery
 * @param {number} params.pressure          — 0.0–1.0 continuous
 * @param {boolean} params.isInDependencyChain — vendor is in active dependency chain
 * @param {string} params.currentStatus     — vendor's current status
 * @returns {Object} { level, opacity, showDetails, showContact, abbreviate }
 */
export function resolveCompression({
  vendor,
  pressureState = 'calm',
  pressure = 0,
  isInDependencyChain = false,
  currentStatus = 'nominal',
}) {
  const trust = computeTrust(vendor);
  const eventsCompleted = vendor.eventsCompleted || 0;

  // Override: always expand if in active dependency chain or non-nominal
  if (isInDependencyChain || (currentStatus !== 'nominal' && currentStatus !== 'confirmed')) {
    return {
      level: COMPRESSION_LEVEL.FULL,
      opacity: 1.0,
      showDetails: true,
      showContact: true,
      abbreviate: false,
      trust,
    };
  }

  // Determine maximum eligible compression from trust history
  let maxCompression = COMPRESSION_LEVEL.FULL;
  if (eventsCompleted >= TRUST_THRESHOLDS.ghosted && trust >= 0.85) {
    maxCompression = COMPRESSION_LEVEL.GHOSTED;
  } else if (eventsCompleted >= TRUST_THRESHOLDS.collapsed && trust >= 0.70) {
    maxCompression = COMPRESSION_LEVEL.COLLAPSED;
  } else if (eventsCompleted >= TRUST_THRESHOLDS.compact && trust >= 0.50) {
    maxCompression = COMPRESSION_LEVEL.COMPACT;
  }

  // Apply pressure — higher pressure enables deeper compression
  let level;
  if (pressureState === 'active' && maxCompression === COMPRESSION_LEVEL.GHOSTED) {
    level = COMPRESSION_LEVEL.GHOSTED;
  } else if (pressureState === 'active' && maxCompression !== COMPRESSION_LEVEL.FULL) {
    level = COMPRESSION_LEVEL.COLLAPSED;
  } else if (pressureState === 'building' && maxCompression !== COMPRESSION_LEVEL.FULL) {
    level = COMPRESSION_LEVEL.COMPACT;
  } else if (pressureState === 'calm') {
    // Under calm, max compression is compact (never ghost trusted vendors at rest)
    level = maxCompression !== COMPRESSION_LEVEL.FULL ? COMPRESSION_LEVEL.COMPACT : COMPRESSION_LEVEL.FULL;
  } else {
    level = maxCompression;
  }

  // Recovery: relax one level from what pressure would normally dictate
  if (pressureState === 'recovery') {
    level = level === COMPRESSION_LEVEL.GHOSTED ? COMPRESSION_LEVEL.COLLAPSED
      : level === COMPRESSION_LEVEL.COLLAPSED ? COMPRESSION_LEVEL.COMPACT
      : COMPRESSION_LEVEL.FULL;
  }

  // Resolve visual properties
  const LEVEL_PROPS = {
    [COMPRESSION_LEVEL.FULL]:      { opacity: 1.0,  showDetails: true,  showContact: true,  abbreviate: false },
    [COMPRESSION_LEVEL.COMPACT]:   { opacity: 0.85, showDetails: false, showContact: false, abbreviate: false },
    [COMPRESSION_LEVEL.COLLAPSED]: { opacity: 0.55, showDetails: false, showContact: false, abbreviate: true },
    [COMPRESSION_LEVEL.GHOSTED]:   { opacity: 0.12, showDetails: false, showContact: false, abbreviate: true },
  };

  return {
    level,
    ...LEVEL_PROPS[level],
    trust,
  };
}

/**
 * Batch resolve compression for a vendor list.
 * Returns vendors sorted by compression level (expanded first, ghosted last).
 *
 * @param {Array} vendors           — array of vendor objects
 * @param {string} pressureState    — calm | building | active | recovery
 * @param {number} pressure         — 0.0–1.0 continuous
 * @param {Set|Array} dependencyChain — vendor IDs in active dependency chain
 * @returns {Array} vendors with .compression property
 */
export function resolveVendorCompression(vendors, pressureState, pressure, dependencyChain = []) {
  const depSet = new Set(Array.isArray(dependencyChain) ? dependencyChain : dependencyChain);

  return vendors.map(vendor => ({
    ...vendor,
    compression: resolveCompression({
      vendor,
      pressureState,
      pressure,
      isInDependencyChain: depSet.has(vendor.id),
      currentStatus: vendor.status || 'nominal',
    }),
  }));
}
