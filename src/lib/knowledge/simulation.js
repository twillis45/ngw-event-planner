// ─── Runtime Simulation Lab (KEP-3 Bundle D) ──────────────────────────────────
// Before a KCR publishes, simulate its effect: what value changes, what breaks/improves,
// which engines/readers/runtime experiences change, and what the host actually sees. Nothing
// publishes blind. PURE — composes effectiveValue (before), the proposed value (after), the
// dependency engine (blast radius), and resolveEffectiveItem (host-level diff). No mutation.

import { blastRadius } from './dependencyEngine';
import { effectiveValue } from './knowledgeOverride';
import { resolveEffectiveItem } from '../effectiveItem';

const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

// Simulate publishing `proposedValue` to asset.fieldPath — a full before→after diff.
export function simulatePublish({ asset, fieldPath, proposedValue }, opts = {}) {
  const before = effectiveValue(asset, fieldPath);            // current effective (authored or live override)
  const impact = blastRadius(asset, fieldPath);
  return {
    asset: asset.type, fieldPath,
    before: before.value, after: proposedValue,
    changes: changed(before.value, proposedValue),
    beforeSource: before.source,
    // Dependency blast radius — what this change touches (dimensional, no risk score).
    affectedAssets: impact.affectedAssets,
    affectedEngines: impact.affectedEngines,
    affectedReaders: impact.affectedReaders,
    affectedRuntime: impact.affectedRuntime,
    magnitude: impact.magnitude,
    // Host-level diff: what the runtime reader actually renders before vs after (§ "what
    // host experience changes"). Only for item-cost fields (<purchaseId>.unitCostRange).
    hostDiff: simulateHostCostDiff(asset, fieldPath, proposedValue, opts),
  };
}

// Resolve the effective item cost with the SIMULATED override layered, vs. without.
function simulateHostCostDiff(asset, fieldPath, proposedValue, opts) {
  const m = /^(p_[^.]+)\.unitCostRange$/.exec(fieldPath || '');
  if (!m || !Array.isArray(proposedValue)) return null;
  const purchaseId = m[1];
  const purchase = (asset.purchases || []).find((p) => p.id === purchaseId);
  if (!purchase) return null;
  const item = { id: purchaseId, item: purchase.item || purchaseId, low: (purchase.unitCostRange || [])[0], high: (purchase.unitCostRange || [])[1] };
  const beforeItem = resolveEffectiveItem(item, {}, { asset });                              // current
  const simOverride = [{ id: `sim-${asset.type}-${fieldPath}`, assetId: asset.type, fieldPath, value: proposedValue }];
  const afterItem = resolveEffectiveItem(item, {}, { asset, knowledgeCtx: { overrides: simOverride } }); // simulated
  return {
    item: item.item,
    beforeCost: [beforeItem.cost.low, beforeItem.cost.high],
    afterCost: [afterItem.cost.low, afterItem.cost.high],
    changes: changed([beforeItem.cost.low, beforeItem.cost.high], [afterItem.cost.low, afterItem.cost.high]),
  };
  void opts;
}

// Simulate a whole finding/campaign (many fields) → the combined diff (batch preview).
export function simulateBatch(changes, opts = {}) {
  const each = (changes || []).map((c) => simulatePublish(c, opts));
  return {
    count: each.length,
    changing: each.filter((d) => d.changes).length,
    affectedAssets: [...new Set(each.flatMap((d) => d.affectedAssets))],
    affectedRuntime: [...new Set(each.flatMap((d) => d.affectedRuntime))],
    diffs: each,
  };
}
