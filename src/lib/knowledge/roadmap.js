// ─── Research Roadmap Generator (KOP-1 Bundle H) ───────────────────────────────
// Auto-generates a priority-sorted research roadmap from existing corpus data.
// Score = weaknessCount × blastScore (engines hit). Higher = more urgent.
// Composes: playbookWeaknesses + playbookResearch + blastRadius.
// Pure — no fabricated scores, no AI, honest-empty when corpus is empty.

import { playbookWeaknesses, playbookResearch } from '../playbooks/playbookRegistry';
import { blastRadius } from './dependencyEngine';

const MAX_ITEMS = 50;

// ── Per-research-item roadmap entry ───────────────────────────────────────────
function roadmapEntry(pb, item, asOf) {
  const fp = item.fieldPath || item.kind;
  let blast = { engines: 0, affectedAssets: [], changes: 0 };
  try { blast = blastRadius(pb, fp); } catch { /* field path not resolvable — blast stays zero */ }

  const weaknesses = playbookWeaknesses(pb);
  const blastScore = blast.engines || 0;
  const weaknessCount = weaknesses.length;
  const score = weaknessCount * (blastScore + 1);  // +1 so zero-engine fields still rank by weakness

  return {
    assetId: pb.type,
    fieldPath: fp,
    label: item.reason || item.kind,
    kind: item.kind,
    blastScore,
    affectedEngines: blast.affectedEngines || [],
    affectedAssets: blast.affectedAssets || [],
    weaknessCount,
    score,
    suggestedType: kindToCampaignType(item.kind),
    priority: item.priority || 'med',
    reason: item.reason || '',
  };
}

function kindToCampaignType(kind) {
  switch (kind) {
    case 'pricing':             return 'price-discovery';
    case 'cost-factor-grounding': return 'cost-factor-grounding';
    case 'review':              return 'sme-interview';
    case 'cadence':             return 'governance-cadence';
    case 'food-safety':         return 'food-safety-review';
    case 'sources':             return 'academic-grounding';
    default:                    return 'price-discovery';
  }
}

// ── Corpus-wide research roadmap ──────────────────────────────────────────────
// Returns the top MAX_ITEMS research items ranked by urgency (score desc).
// Each item is a roadmap entry ready to drive a campaign.
export function generateRoadmap(playbooks, asOf) {
  const items = [];
  for (const pb of playbooks) {
    const research = playbookResearch(pb, asOf);
    for (const item of research) {
      items.push(roadmapEntry(pb, item, asOf));
    }
  }
  // Sort: high-priority first, then by score desc
  items.sort((a, b) => {
    const pOrder = { high: 0, med: 1, low: 2 };
    const pa = pOrder[a.priority] ?? 1;
    const pb_ = pOrder[b.priority] ?? 1;
    if (pa !== pb_) return pa - pb_;
    return b.score - a.score;
  });
  return items.slice(0, MAX_ITEMS);
}

// ── Summary stats for dashboard display ───────────────────────────────────────
export function roadmapSummary(roadmap) {
  const byKind = roadmap.reduce((m, r) => { m[r.kind] = (m[r.kind] || 0) + 1; return m; }, {});
  const byPriority = roadmap.reduce((m, r) => { m[r.priority] = (m[r.priority] || 0) + 1; return m; }, {});
  const highImpact = roadmap.filter((r) => r.blastScore >= 3);
  return {
    total: roadmap.length,
    byKind,
    byPriority,
    highImpactCount: highImpact.length,
    topAssets: [...new Set(roadmap.slice(0, 10).map((r) => r.assetId))],
  };
}
