// ─── Consensus Resolver ───────────────────────────────────────────────────────
// Builds consensus on conflicting findings using multiple strategies:
// - Authority ranking (government > academic > commercial > community)
// - Confidence weighting (high > medium > low)
// - Majority voting (how many sources agree)
// - Numeric averaging (for ranges/costs)
// - Freshness recency (most recently researched)

export const CONSENSUS_STRATEGIES = {
  AUTHORITY: 'authority',
  CONFIDENCE: 'confidence',
  MAJORITY: 'majority',
  AVERAGE: 'average',
  RECENCY: 'recency',
  MANUAL: 'manual',
};

const AUTHORITY_RANK = {
  'government': 5,
  'academic': 4,
  'industry': 3,
  'commercial': 2,
  'community': 1,
  'internal': 2,
  'food_safety': 5,
};

const CONFIDENCE_RANK = {
  'high': 3,
  'medium': 2,
  'low': 1,
};

// Extract numeric value from cost/range formats
const extractNumeric = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  }
  if (Array.isArray(value) && value.length > 0) {
    const nums = value.map(v => extractNumeric(v)).filter(v => v !== null);
    return nums.length > 0 ? nums[0] : null;
  }
  return null;
};

// Resolve conflicts using multiple strategies and return ranked recommendations
export function resolveConflict(conflict, evidence, strategies = null) {
  const { fieldPath, values, distinctValues } = conflict;

  if (distinctValues <= 1) {
    return {
      consensus: true,
      recommended: values[0]?.value,
      strategy: 'none',
      confidence: 'high',
      reason: 'No conflict detected',
      alternatives: []
    };
  }

  // Group values by the actual value for voting
  const valueGroups = {};
  values.forEach(v => {
    const key = JSON.stringify(v.value);
    if (!valueGroups[key]) {
      valueGroups[key] = { value: v.value, sources: [] };
    }
    valueGroups[key].sources.push({
      id: v.id,
      authority: v.authority,
      confidence: evidence.find(e => e.id === v.id)?.extractedFacts?.find(f => f.field === fieldPath)?.confidence
    });
  });

  // Compute scores for each candidate value
  const candidates = Object.values(valueGroups).map(group => ({
    value: group.value,
    sourceCount: group.sources.length,
    sources: group.sources,
    scores: {
      authority: Math.max(0, ...group.sources.map(s => AUTHORITY_RANK[s.authority] || 0)),
      confidence: Math.max(0, ...group.sources.map(s => CONFIDENCE_RANK[s.confidence] || 0)),
      majority: group.sources.length / values.length,
    }
  }));

  // Calculate composite score using weighted strategies
  candidates.forEach(c => {
    c.compositeScore = (
      (c.scores.authority / 5) * 0.4 +
      (c.scores.confidence / 3) * 0.3 +
      c.scores.majority * 0.3
    );
  });

  // Sort by composite score
  candidates.sort((a, b) => b.compositeScore - a.compositeScore);

  const winner = candidates[0];
  const alternativeStrategies = [];

  // Majority vote
  const majorityVote = candidates[0];
  if (majorityVote.sourceCount > values.length / 2) {
    alternativeStrategies.push({
      strategy: CONSENSUS_STRATEGIES.MAJORITY,
      value: majorityVote.value,
      evidence: `${majorityVote.sourceCount}/${values.length} sources agree`,
      confidence: 'high'
    });
  }

  // Authority-based
  const authorityWinner = candidates.reduce((best, c) =>
    (c.scores.authority > best.scores.authority) ? c : best
  );
  alternativeStrategies.push({
    strategy: CONSENSUS_STRATEGIES.AUTHORITY,
    value: authorityWinner.value,
    evidence: `Highest authority source: ${authorityWinner.sources[0].authority}`,
    confidence: authorityWinner.sourceCount === 1 ? 'medium' : 'high'
  });

  // Numeric average (for costs/ranges)
  const numeric = candidates.map(c => ({
    ...c,
    numeric: extractNumeric(c.value)
  })).filter(c => c.numeric !== null);

  if (numeric.length > 1) {
    const avg = numeric.reduce((sum, c) => sum + c.numeric, 0) / numeric.length;
    alternativeStrategies.push({
      strategy: CONSENSUS_STRATEGIES.AVERAGE,
      value: Math.round(avg * 100) / 100,
      evidence: `Average of ${numeric.length} numeric values`,
      confidence: 'medium'
    });
  }

  return {
    consensus: false,
    fieldPath,
    distinctValues,
    recommended: winner.value,
    strategy: 'composite',
    confidence: winner.compositeScore > 0.7 ? 'high' : 'medium',
    compositeScore: winner.compositeScore,
    alternatives: alternativeStrategies.slice(1),
    allCandidates: candidates,
    reason: `${winner.sourceCount} source${winner.sourceCount !== 1 ? 's' : ''} provided this value (composite score: ${(winner.compositeScore * 100).toFixed(0)}%)`
  };
}

// Resolve multiple conflicts at once
export function resolveConflicts(conflicts, evidence) {
  return conflicts.map(conflict => ({
    ...conflict,
    resolution: resolveConflict(conflict, evidence)
  }));
}

// Build consensus summary for decision approval
export function buildConsensusPacket(conflicts, evidence) {
  const resolved = resolveConflicts(conflicts, evidence);

  return {
    totalConflicts: conflicts.length,
    highConfidenceResolutions: resolved.filter(r => r.resolution.confidence === 'high').length,
    mediumConfidenceResolutions: resolved.filter(r => r.resolution.confidence === 'medium').length,
    conflicts: resolved,
    summary: resolved.map(r => ({
      field: r.fieldPath,
      recommended: r.resolution.recommended,
      strategy: r.resolution.strategy,
      confidence: r.resolution.confidence,
      sourceCount: r.values.length
    }))
  };
}
