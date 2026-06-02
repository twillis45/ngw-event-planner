// Adaptive Hierarchy Engine — Sprint 34 Implementation Foundation
//
// Items earn visual weight through operational consequence, not designer
// assignment. Hierarchy is a function of:
//   1. Failure history (items that failed before gain permanent weight)
//   2. Dependency position (items in active dependency chains gain weight)
//   3. Temporal urgency (items closer to their deadline gain weight)
//   4. Pressure state (under higher pressure, hierarchy differences amplify)
//
// Output: weight (0–1), opacity (0.1–1.0), spacing (px), border treatment.
// All values are tokenized and composable with existing design tokens.

import { space } from '../design/tokens';

// ─── Hierarchy weight computation ────────────────────────────────────────

/**
 * Compute the visual weight for a single orchestration item.
 *
 * @param {Object} item
 * @param {number} item.failureCount      — prior failures (0+)
 * @param {number} item.dependencyDepth   — position in dependency chain (0 = independent)
 * @param {number} item.minutesToDeadline — minutes until item's deadline
 * @param {boolean} item.isFragile        — flagged fragile from prior failure
 * @param {boolean} item.isActive         — currently in active coordination
 * @param {number} pressureFactor         — 0.0–1.0 from pressure state system
 * @returns {number} weight 0.0–1.0
 */
export function computeWeight(item, pressureFactor = 0) {
  const {
    failureCount = 0,
    dependencyDepth = 0,
    minutesToDeadline = 240,
    isFragile = false,
    isActive = false,
  } = item;

  // Base weight — everyone starts at 0.3
  let weight = 0.30;

  // Failure history: +0.15 per failure, capped at +0.45
  weight += Math.min(0.45, failureCount * 0.15);

  // Fragile flag: +0.20 (earned from specific prior failure)
  if (isFragile) weight += 0.20;

  // Dependency depth: deeper in chain = more consequential
  // +0.05 per depth level, capped at +0.20
  weight += Math.min(0.20, dependencyDepth * 0.05);

  // Temporal urgency: items approaching deadline gain weight
  if (minutesToDeadline <= 5)       weight += 0.25;
  else if (minutesToDeadline <= 15) weight += 0.18;
  else if (minutesToDeadline <= 45) weight += 0.10;
  else if (minutesToDeadline <= 120) weight += 0.04;

  // Active coordination: +0.15
  if (isActive) weight += 0.15;

  // Pressure amplification: under higher pressure, weight differences
  // are amplified. This makes important items MORE prominent and
  // unimportant items LESS prominent as pressure rises.
  const amplified = weight * (1 + pressureFactor * 0.4);

  return Math.min(1.0, Math.max(0.0, amplified));
}

// ─── Visual properties from weight ───────────────────────────────────────

/**
 * Resolve visual properties from hierarchy weight + pressure state.
 *
 * @param {number} weight       — 0.0–1.0 from computeWeight
 * @param {number} pressure     — 0.0–1.0 continuous pressure
 * @param {boolean} isFragile   — show fragile treatment
 * @returns {Object} { opacity, spacing, borderWidth, borderColor, fontWeight }
 */
export function resolveHierarchy(weight, pressure = 0, isFragile = false) {
  // Opacity: weight directly drives opacity, but floor is pressure-dependent.
  // Under high pressure, low-weight items fade more aggressively.
  const opacityFloor = 1.0 - (pressure * 0.85);  // calm=1.0, active=0.15
  const opacity = Math.max(opacityFloor, weight);

  // Spacing: items with higher weight get tighter spacing (gravity compression)
  // Low weight → 14px (breathing room), high weight → 2px (gravity well)
  const spacingIndex = weight >= 0.8 ? 1   // 2px — gravity well
    : weight >= 0.6 ? 2                     // 4px — compressed
    : weight >= 0.4 ? 3                     // 8px — moderate
    : weight >= 0.2 ? 4                     // 12px — relaxed
    : 5;                                    // 16px — full breathing room
  const spacingPx = space[spacingIndex];

  // Border width: earned from operational consequence
  const borderWidth = isFragile ? 3
    : weight >= 0.8 ? 2
    : weight >= 0.5 ? 1
    : 0;

  // Border color token reference (not the hex — consumers resolve via tokens)
  const borderIntent = isFragile ? 'fragile'    // red treatment
    : weight >= 0.8 ? 'urgent'                  // amber treatment
    : weight >= 0.5 ? 'active'                  // subtle emphasis
    : 'none';

  // Font weight: heavier items get bolder text
  const fontWeight = weight >= 0.7 ? 600
    : weight >= 0.4 ? 500
    : 400;

  return {
    opacity,
    spacingPx,
    borderWidth,
    borderIntent,
    fontWeight,
    // Raw values for custom composition
    weight,
    pressure,
  };
}

// ─── Batch hierarchy resolution ──────────────────────────────────────────

/**
 * Resolve hierarchy for a list of items, normalizing relative weights.
 * This is the primary API for orchestration surfaces — pass all items
 * in a coordination sequence and get back resolved visual properties.
 *
 * @param {Array} items          — array of item objects with hierarchy inputs
 * @param {number} pressure      — 0.0–1.0 from pressure state system
 * @returns {Array} items with .hierarchy property containing visual resolution
 */
export function resolveSequenceHierarchy(items, pressure = 0) {
  // Compute raw weights
  const weighted = items.map(item => ({
    ...item,
    _weight: computeWeight(item, pressure),
  }));

  // Find max weight for relative scaling under high pressure
  const maxWeight = Math.max(0.3, ...weighted.map(i => i._weight));

  // Under active pressure, normalize so the highest-weight item = 1.0
  // This ensures maximum contrast between important and unimportant items
  const normalize = pressure >= 0.6;

  return weighted.map(item => {
    const finalWeight = normalize
      ? item._weight / maxWeight
      : item._weight;

    return {
      ...item,
      hierarchy: resolveHierarchy(finalWeight, pressure, item.isFragile),
    };
  });
}
