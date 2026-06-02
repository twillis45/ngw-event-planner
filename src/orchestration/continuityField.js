// Continuity Field Logic — Sprint 34 Implementation Foundation
//
// Nearby orchestration items influence each other. Pressure doesn't
// respect container boundaries. When a vendor is in crisis, that
// pressure leaks into connected items — timeline, budget, guest flow.
//
// This is NOT a notification system. It is atmospheric contamination.
// Connected items gain warmth/urgency proportional to their relationship
// to the pressure source. The contamination decays with distance.
//
// Field types:
//   DEPENDENCY  — item B depends on item A completing first
//   VENDOR      — items share the same vendor
//   TEMPORAL    — items happen close together in time
//   RESOURCE    — items share a resource (venue space, equipment)

export const FIELD_TYPE = {
  DEPENDENCY: 'dependency',
  VENDOR:     'vendor',
  TEMPORAL:   'temporal',
  RESOURCE:   'resource',
};

// Propagation strength by relationship type
const PROPAGATION_STRENGTH = {
  dependency: 0.70,  // strongest: B can't happen if A fails
  vendor:     0.50,  // strong: vendor problems affect all their items
  temporal:   0.30,  // moderate: nearby items feel time pressure
  resource:   0.40,  // moderate-strong: shared resource creates coupling
};

/**
 * Define a continuity field connection between two items.
 *
 * @param {string} sourceId     — item generating the pressure
 * @param {string} targetId     — item receiving the contamination
 * @param {string} fieldType    — dependency | vendor | temporal | resource
 * @param {number} distance     — 0 = direct, 1 = one step removed, etc.
 * @returns {Object} field connection
 */
export function createFieldConnection(sourceId, targetId, fieldType, distance = 0) {
  return {
    sourceId,
    targetId,
    fieldType,
    distance,
    strength: PROPAGATION_STRENGTH[fieldType] || 0.30,
  };
}

/**
 * Compute contamination level at a target item given a pressure source.
 * Contamination decays with distance: each step removes 40% of the signal.
 *
 * @param {number} sourcePressure  — 0.0–1.0 pressure at the source
 * @param {Object} connection      — field connection object
 * @returns {number} contamination 0.0–1.0
 */
export function computeContamination(sourcePressure, connection) {
  const { strength, distance } = connection;
  // Decay: 60% retained per step
  const distanceDecay = Math.pow(0.60, distance);
  return Math.min(1.0, sourcePressure * strength * distanceDecay);
}

/**
 * Resolve the visual treatment for contamination.
 * Low contamination = subtle warmth. High contamination = urgent presence.
 *
 * @param {number} contamination — 0.0–1.0 aggregate contamination level
 * @returns {Object} visual treatment
 */
export function contaminationTreatment(contamination) {
  // Sprint 37: strengthened visual treatment 3-5× after Sprint 36 validation
  // showed contamination was imperceptible at previous levels on dark canvas.
  // Also added borderTint at lower thresholds — border shifts are more
  // perceptible than background gradients on dark surfaces.

  if (contamination < 0.03) {
    return {
      level: 'none',
      backgroundShift: null,
      borderTint: null,
      textTint: null,
      opacity: 1.0,
    };
  }

  if (contamination < 0.15) {
    return {
      level: 'trace',
      backgroundShift: 'rgba(184, 148, 63, 0.06)',  // subtle brass warmth
      borderTint: 'rgba(184, 148, 63, 0.08)',        // faint border presence
      textTint: null,
      opacity: 1.0,
    };
  }

  if (contamination < 0.35) {
    return {
      level: 'warm',
      backgroundShift: 'rgba(184, 148, 63, 0.12)',  // visible warmth
      borderTint: 'rgba(184, 148, 63, 0.25)',        // clear brass border
      textTint: null,
      opacity: 1.0,
    };
  }

  if (contamination < 0.60) {
    return {
      level: 'concerned',
      backgroundShift: 'rgba(184, 148, 63, 0.18)',  // strong warmth
      borderTint: 'rgba(184, 148, 63, 0.45)',        // prominent brass border
      textTint: '#b8943f',                            // text picks up brass
      opacity: 1.0,
    };
  }

  return {
    level: 'urgent',
    backgroundShift: 'rgba(191, 80, 80, 0.15)',   // strong red warmth
    borderTint: 'rgba(191, 80, 80, 0.40)',         // visible red border
    textTint: '#bf5050',                            // text reflects urgency
    opacity: 1.0,
  };
}

/**
 * Resolve all continuity field effects for a single target item.
 * Aggregates contamination from all connected pressure sources.
 *
 * @param {string} targetId        — the item receiving contamination
 * @param {Array}  connections     — all field connections in the system
 * @param {Object} pressureMap     — { itemId: pressureLevel } for all items
 * @returns {Object} { totalContamination, treatment, sources }
 */
export function resolveFieldEffects(targetId, connections, pressureMap) {
  const inbound = connections.filter(c => c.targetId === targetId);

  if (inbound.length === 0) {
    return {
      totalContamination: 0,
      treatment: contaminationTreatment(0),
      sources: [],
    };
  }

  // Compute contamination from each source
  const sources = inbound.map(conn => {
    const sourcePressure = pressureMap[conn.sourceId] || 0;
    const contamination = computeContamination(sourcePressure, conn);
    return {
      sourceId: conn.sourceId,
      fieldType: conn.fieldType,
      contamination,
    };
  }).filter(s => s.contamination > 0.01);

  // Aggregate: take the maximum + 30% of remaining (diminishing stack)
  sources.sort((a, b) => b.contamination - a.contamination);
  let total = 0;
  sources.forEach((s, i) => {
    total += s.contamination * (i === 0 ? 1.0 : 0.30);
  });
  total = Math.min(1.0, total);

  return {
    totalContamination: total,
    treatment: contaminationTreatment(total),
    sources,
  };
}

/**
 * Build a dependency chain from a sequence of items.
 * Each item depends on the previous one completing first.
 *
 * @param {Array} sequenceIds — ordered array of item IDs
 * @returns {Array} field connections for the chain
 */
export function buildDependencyChain(sequenceIds) {
  const connections = [];
  for (let i = 0; i < sequenceIds.length - 1; i++) {
    // Forward dependency: each item's pressure propagates downstream
    for (let j = i + 1; j < sequenceIds.length; j++) {
      connections.push(
        createFieldConnection(sequenceIds[i], sequenceIds[j], FIELD_TYPE.DEPENDENCY, j - i)
      );
    }
  }
  return connections;
}

/**
 * Build vendor-shared connections — all items from the same vendor
 * are connected through a vendor field.
 *
 * @param {Array} items — items with .vendorId property
 * @returns {Array} field connections
 */
export function buildVendorFields(items) {
  const connections = [];
  const byVendor = {};

  items.forEach(item => {
    if (!item.vendorId) return;
    if (!byVendor[item.vendorId]) byVendor[item.vendorId] = [];
    byVendor[item.vendorId].push(item.id);
  });

  Object.values(byVendor).forEach(ids => {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        connections.push(createFieldConnection(ids[i], ids[j], FIELD_TYPE.VENDOR, 1));
        connections.push(createFieldConnection(ids[j], ids[i], FIELD_TYPE.VENDOR, 1));
      }
    }
  });

  return connections;
}
