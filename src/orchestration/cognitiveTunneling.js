// Cognitive Tunneling (Peripheral Recession) — Sprint 34 Implementation
//
// Under pressure, peripheral elements fade. The environment narrows
// attention to what matters NOW. This is not hiding — it's recession.
// Ghosted elements are still there; they're just not competing for
// attention when the coordinator is under pressure.
//
// Formula: periphery_opacity = 1.0 - (pressure * 0.9)
//   At pressure 0.0: everything visible (100%)
//   At pressure 0.5: peripherals at 55%
//   At pressure 1.0: peripherals at 10%
//
// Items are classified as:
//   FOCAL     — in the gravity well, always fully visible
//   ADJACENT  — near the gravity well, partial recession
//   PERIPHERAL — far from the gravity well, full recession
//   GHOSTED   — outside the current coordination context entirely

export const VISIBILITY_ZONE = {
  FOCAL:      'focal',
  ADJACENT:   'adjacent',
  PERIPHERAL: 'peripheral',
  GHOSTED:    'ghosted',
};

/**
 * Compute peripheral recession opacity.
 * This is the core formula from Sprint 32's behavioral grammar.
 *
 * @param {number} pressure — 0.0–1.0 continuous pressure
 * @param {string} zone     — focal | adjacent | peripheral | ghosted
 * @returns {number} opacity 0.0–1.0
 */
export function recessionOpacity(pressure, zone) {
  switch (zone) {
    case VISIBILITY_ZONE.FOCAL:
      // Focal items stay fully visible under all pressure
      return 1.0;

    case VISIBILITY_ZONE.ADJACENT:
      // Adjacent items recede gently — 50% of the recession curve
      return Math.max(0.40, 1.0 - (pressure * 0.50));

    case VISIBILITY_ZONE.PERIPHERAL:
      // Peripheral items follow the full recession curve
      return Math.max(0.10, 1.0 - (pressure * 0.90));

    case VISIBILITY_ZONE.GHOSTED:
      // Ghosted items remain as orientation landmarks — visible enough
      // to maintain navigational context without competing for attention.
      // Sprint 37: raised from 0.05 → 0.20 minimum after Sprint 36
      // validation showed completed items ghosting too aggressively.
      return Math.max(0.20, 0.35 - (pressure * 0.15));

    default:
      return 1.0;
  }
}

/**
 * Classify an item's visibility zone based on its relationship
 * to the current gravity well (active coordination context).
 *
 * @param {Object} params
 * @param {boolean} params.isActive          — item is in active coordination
 * @param {boolean} params.isInDependencyChain — item is in dependency chain
 * @param {number}  params.chainDistance      — dependency chain links from active item (0 = active)
 * @param {boolean} params.isCompleted        — item is already completed
 * @param {number}  params.minutesToRelevance — minutes until item becomes relevant
 * @param {string}  params.pressureState      — calm | building | active | recovery
 * @returns {string} visibility zone
 */
export function classifyZone({
  isActive = false,
  isInDependencyChain = false,
  chainDistance = Infinity,
  isCompleted = false,
  minutesToRelevance = 240,
  pressureState = 'calm',
}) {
  // Under calm pressure, everything is focal (no tunneling)
  if (pressureState === 'calm') return VISIBILITY_ZONE.FOCAL;

  // Recovery — gentle recession only on completed items
  if (pressureState === 'recovery') {
    return isCompleted ? VISIBILITY_ZONE.PERIPHERAL : VISIBILITY_ZONE.FOCAL;
  }

  // Active item or direct dependency — always focal
  if (isActive) return VISIBILITY_ZONE.FOCAL;

  // Items in the dependency chain — adjacent if close, peripheral if far
  if (isInDependencyChain) {
    if (chainDistance <= 1) return VISIBILITY_ZONE.FOCAL;
    if (chainDistance <= 3) return VISIBILITY_ZONE.ADJACENT;
    return VISIBILITY_ZONE.PERIPHERAL;
  }

  // Completed items ghost under pressure
  if (isCompleted) return VISIBILITY_ZONE.GHOSTED;

  // Items far from relevance ghost under active pressure
  if (pressureState === 'active') {
    if (minutesToRelevance > 60) return VISIBILITY_ZONE.GHOSTED;
    if (minutesToRelevance > 15) return VISIBILITY_ZONE.PERIPHERAL;
    return VISIBILITY_ZONE.ADJACENT;
  }

  // Building pressure — moderate recession
  if (minutesToRelevance > 120) return VISIBILITY_ZONE.PERIPHERAL;
  if (minutesToRelevance > 30) return VISIBILITY_ZONE.ADJACENT;
  return VISIBILITY_ZONE.FOCAL;
}

/**
 * Resolve full tunneling treatment for an item.
 *
 * @param {Object} item — item with zone classification inputs
 * @param {number} pressure — 0.0–1.0 continuous
 * @param {string} pressureState — calm | building | active | recovery
 * @returns {Object} { zone, opacity, pointerEvents, ariaHidden, transition }
 */
export function resolveTunneling(item, pressure, pressureState) {
  const zone = classifyZone({ ...item, pressureState });
  const opacity = recessionOpacity(pressure, zone);

  return {
    zone,
    opacity,
    // Ghosted items lose pointer events under active pressure
    // (they're still visible but not interactive — prevents accidental clicks)
    pointerEvents: zone === VISIBILITY_ZONE.GHOSTED && pressure >= 0.6 ? 'none' : 'auto',
    // Accessibility: ghosted items are aria-hidden under active pressure
    ariaHidden: zone === VISIBILITY_ZONE.GHOSTED && pressure >= 0.6,
    // 40D.1: unified at 1200ms across all pressure states. Geological drift, not state-switch.
    // Urgency signaling comes from disruption card (600ms), not tunneling opacity speed.
    transitionMs: 1200,
  };
}

/**
 * Batch resolve tunneling for a sequence of items.
 *
 * @param {Array} items — items with zone classification inputs
 * @param {number} pressure — 0.0–1.0
 * @param {string} pressureState — calm | building | active | recovery
 * @returns {Array} items with .tunneling property
 */
export function resolveSequenceTunneling(items, pressure, pressureState) {
  return items.map(item => ({
    ...item,
    tunneling: resolveTunneling(item, pressure, pressureState),
  }));
}
