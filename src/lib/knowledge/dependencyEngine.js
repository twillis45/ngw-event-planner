// ─── Dependency Engine — blast radius of a change (KF-1 §3) ───────────────────
// Given a proposed change to an asset field, derive everything it touches: downstream
// assets, engines, readers, prompts, tests, and runtime experiences. Reuses
// knowledgeImpactPreview (field → engines/downstream) + the knowledge graph (asset →
// asset edges). Pure. No new registry.

import { knowledgeImpactPreview } from './knowledgeChange';
import { buildKnowledgeGraph, neighbors } from './knowledgeGraph';

// Reader/prompt/test surfaces an engine feeds — declared here so blast radius names real
// runtime consumers instead of guessing. Extend as engines gain consumers.
const ENGINE_CONSUMERS = {
  budget: { readers: ['SpendingPlan', 'BudgetTab'], prompts: ['budget-summary'], runtime: ['Host Budget'] },
  shopping: { readers: ['ShoppingList', 'FoodPlan'], prompts: ['shopping-list'], runtime: ['Host Food Plan'] },
  sourcing: { readers: ['FoodPlan'], prompts: [], runtime: ['Host Food Plan'] },
  timeline: { readers: ['RunSheet', 'TheDay'], prompts: ['day-of-timeline'], runtime: ['Host The Day'] },
  readiness: { readers: ['CommandCenter'], prompts: [], runtime: ['Host Command'] },
};

// Blast radius for a single asset+field change.
export function blastRadius(pb, fieldPath, graph) {
  const impact = knowledgeImpactPreview(pb, fieldPath); // { recommendationEngines, downstream, affectedPurchases, ... }
  const engines = impact.recommendationEngines || [];
  const g = graph || buildKnowledgeGraph({ assets: [pb] });
  const assetId = `asset:${pb.type}`;

  // Assets that depend on / use this one (walk graph both directions for used_by/depends_on).
  const dependents = neighbors(g, assetId, { direction: 'in' }).filter((n) => n.rel === 'depends_on' || n.rel === 'used_by' || n.rel === 'references');
  const affectedAssets = Array.from(new Set([pb.type, ...dependents.map((d) => d.id.replace(/^asset:/, ''))]));

  const readers = new Set(); const prompts = new Set(); const runtime = new Set();
  for (const e of engines) {
    const c = ENGINE_CONSUMERS[e];
    if (c) { c.readers.forEach((r) => readers.add(r)); c.prompts.forEach((p) => prompts.add(p)); c.runtime.forEach((r) => runtime.add(r)); }
  }

  return {
    asset: pb.type, fieldPath,
    affectedAssets,
    affectedEngines: engines,
    affectedReaders: [...readers],
    affectedPrompts: [...prompts],
    affectedTests: impact.tests && impact.tests.known === false ? { known: false, note: 'CI: npm run knowledge:impact' } : (impact.tests || []),
    affectedRuntime: [...runtime],
    affectedPurchases: impact.affectedPurchases || [],
    // Severity is DIMENSIONAL (counts), never a single risk score.
    magnitude: { assets: affectedAssets.length, engines: engines.length, readers: readers.size, runtime: runtime.size },
  };
}

// Batch blast radius — the combined footprint of many changes (for batch publishing §6).
export function combinedBlastRadius(changes, graph) {
  const each = changes.map(({ pb, fieldPath }) => blastRadius(pb, fieldPath, graph));
  const union = (key) => Array.from(new Set(each.flatMap((b) => b[key] || [])));
  return {
    changes: each.length,
    affectedAssets: union('affectedAssets'),
    affectedEngines: union('affectedEngines'),
    affectedReaders: union('affectedReaders'),
    affectedRuntime: union('affectedRuntime'),
    perChange: each,
  };
}
