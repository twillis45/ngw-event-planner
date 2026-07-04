// ─── Finding Analysis & Messaging ─────────────────────────────────────────────
// Explain WHY a finding is sufficient/insufficient, not just say it.
// Users need to know what's missing and what to do next.

export const FINDING_STATUS = {
  PROPOSED: 'proposed',       // Enough evidence to propose a value
  SUFFICIENT: 'sufficient',   // High confidence, can use
  INSUFFICIENT: 'insufficient', // Not enough or wrong type of evidence
  CONFLICTED: 'conflicted',   // Evidence contradicts itself
  INCONCLUSIVE: 'inconclusive', // Evidence exists but unclear/mixed
};

// Analyze why a finding is sufficient or not
export function analyzeFinding(campaign, evidence, result) {
  const {
    fieldPath,          // What gap was researched? e.g., "decisions[steam_vs_order].costFactors"
    goal,               // What was the campaign trying to answer?
  } = campaign;

  const {
    evidence: allEvidence = [],
    conflicts = 0,
  } = result;

  // Categorize evidence relevance
  const relevant = allEvidence.filter(ev =>
    ev.extractedFacts?.some(f => f.relevance === 'direct' || f.relevance === 'high')
  );

  const tangential = allEvidence.filter(ev =>
    ev.extractedFacts?.some(f => f.relevance === 'medium')
  );

  const unrelated = allEvidence.filter(ev =>
    !ev.extractedFacts?.some(f => f.relevance === 'direct' || f.relevance === 'high' || f.relevance === 'medium')
  );

  // Determine status
  let status = FINDING_STATUS.INSUFFICIENT;
  let reasons = [];
  let missing = [];
  let nextSteps = [];

  // Check relevance
  if (relevant.length === 0) {
    reasons.push(`Evidence doesn't address the gap: Got ${allEvidence.length} items but 0 directly answer "${goal}"`);
    missing.push('Evidence directly relevant to the research question');
    nextSteps.push('Search for providers that specialize in this topic');
  }

  // Check volume
  if (relevant.length < 2) {
    reasons.push(`Insufficient sources: Only ${relevant.length} directly relevant source${relevant.length !== 1 ? 's' : ''}`);
    missing.push('Corroboration from multiple independent sources');
    nextSteps.push('Run another campaign with different provider families');
  }

  // Check conflicts
  if (conflicts > 0) {
    status = FINDING_STATUS.CONFLICTED;
    reasons.push(`${conflicts} conflicting value${conflicts !== 1 ? 's' : ''} reported`);
    missing.push('Agreement between sources');
    nextSteps.push('Manually resolve conflicts using consensus rules');
  }

  // Check completeness
  const totalFacts = allEvidence.reduce((sum, ev) => sum + (ev.extractedFacts?.length || 0), 0);
  if (totalFacts < 3) {
    reasons.push(`Limited data extracted: Only ${totalFacts} fact${totalFacts !== 1 ? 's' : ''} from ${allEvidence.length} sources`);
    missing.push('More comprehensive data from sources');
    nextSteps.push('Ask providers more specific questions');
  }

  // Check freshness
  const staleEvidence = allEvidence.filter(ev =>
    ev.connectionStatus?.freshness === 'stale' || ev.connectionStatus?.freshness === 'archived'
  );

  if (staleEvidence.length > allEvidence.length * 0.5) {
    reasons.push(`Data is outdated: ${staleEvidence.length}/${allEvidence.length} sources are stale or archived`);
    missing.push('Current, up-to-date information');
    nextSteps.push('Request fresh data from active providers');
  }

  // Determine if sufficient
  if (relevant.length >= 2 && conflicts === 0 && totalFacts >= 3) {
    status = FINDING_STATUS.PROPOSED;
    reasons = [
      `Sufficient evidence from ${relevant.length} independent sources`,
      `${totalFacts} relevant facts extracted`,
      'No conflicting values'
    ];
  }

  if (relevant.length >= 3 && conflicts === 0 && totalFacts >= 5) {
    status = FINDING_STATUS.SUFFICIENT;
    reasons = [
      `Strong consensus from ${relevant.length} sources`,
      `${totalFacts} facts with high confidence`,
      'Ready to accept and apply'
    ];
  }

  if (relevant.length === 1 && conflicts === 0 && totalFacts >= 2) {
    status = FINDING_STATUS.INSUFFICIENT;
    reasons.push('Only one source (need corroboration)');
    missing.push('Independent verification from another source');
    nextSteps.push('Run campaign with different provider family');
  }

  return {
    status,
    reasons,              // Why this status? (human-readable)
    missing,              // What information is still needed?
    nextSteps,            // What should the user do?
    relevantCount: relevant.length,
    tangentialCount: tangential.length,
    unrelatedCount: unrelated.length,
    totalFacts,
    conflicts,
  };
}

// User-friendly message explaining the finding
export function explainFinding(analysis, gap) {
  const { status, reasons, missing, nextSteps, relevantCount, unrelatedCount } = analysis;

  const messages = {
    [FINDING_STATUS.SUFFICIENT]: {
      title: '✅ SUFFICIENT',
      icon: '✓',
      color: 'good',
      summary: 'Strong evidence to make a decision',
      action: 'Accept and apply this finding',
    },
    [FINDING_STATUS.PROPOSED]: {
      title: '✓ PROPOSED',
      icon: '◐',
      color: 'accent',
      summary: 'Enough evidence to propose a value',
      action: 'Review and accept if confident',
    },
    [FINDING_STATUS.INCONCLUSIVE]: {
      title: '❓ INCONCLUSIVE',
      icon: '?',
      color: 'warn',
      summary: 'Evidence exists but unclear',
      action: 'Gather more specific information',
    },
    [FINDING_STATUS.CONFLICTED]: {
      title: '⚠️ CONFLICTED',
      icon: '⚠',
      color: 'warn',
      summary: 'Sources disagree on the value',
      action: 'Manually resolve conflicts',
    },
    [FINDING_STATUS.INSUFFICIENT]: {
      title: '✕ INSUFFICIENT',
      icon: '✕',
      color: 'bad',
      summary: 'Not enough valid evidence',
      action: 'Run another research campaign',
    },
  };

  const msg = messages[status];

  return {
    title: msg.title,
    icon: msg.icon,
    color: msg.color,
    summary: msg.summary,
    action: msg.action,
    details: {
      gap: gap?.label || 'Unknown gap',
      why: reasons.map((r, i) => `${i + 1}. ${r}`),
      missing: missing.length > 0 ? missing : null,
      nextSteps: nextSteps.length > 0 ? nextSteps : null,
      stats: {
        relevantSources: relevantCount,
        unrelatedSources: unrelatedCount,
      },
    },
  };
}

// Specific reason why gap is unresearchable with current data
export function whyInsufficientForGap(gap, analysis) {
  const { relevantCount, unrelatedCount, totalFacts, status } = analysis;

  const issues = [];

  if (gap.label && relevantCount === 0) {
    issues.push(
      `Gap: "${gap.label}"`,
      `Problem: 0 of ${unrelatedCount} evidence sources directly address this gap`,
      `Why: Evidence returned is about unrelated topics (pricing, seasonality, etc.)`
    );
  }

  if (relevantCount === 1) {
    issues.push(
      `Single source risk: Only 1 provider addresses this gap`,
      `Need: Independent verification from another provider`,
      `Risk of accepting: May be provider-specific opinion, not industry standard`
    );
  }

  if (totalFacts < 3 && relevantCount > 0) {
    issues.push(
      `Incomplete data: Only ${totalFacts} fact${totalFacts !== 1 ? 's' : ''} extracted`,
      `Need: More detailed information from providers`,
      `Action: Ask providers more specific questions about this gap`
    );
  }

  return issues.length > 0 ? issues : null;
}

// Suggest which provider families might better answer this gap
export function suggestBetterProviders(gap, currentProviders, allProviderFamilies) {
  // Map gap types to provider specialties
  const SPECIALTY_MAP = {
    'cost-factor': ['Commercial', 'Industry', 'Government'],
    'heat-level': ['Food Safety', 'Government', 'Academic'],
    'storage': ['Food Safety', 'Government', 'Commercial'],
    'seasonality': ['Government', 'Industry', 'Academic'],
    'timing': ['Industry', 'Commercial', 'Internal'],
  };

  const gapType = gap.type || 'cost-factor';
  const specialists = SPECIALTY_MAP[gapType] || [];

  const notUsed = specialists.filter(s =>
    !currentProviders.includes(s)
  );

  return {
    gapType,
    specialists,
    notUsed,
    suggestion: notUsed.length > 0
      ? `Try running with ${notUsed.join(', ')} — they specialize in this topic`
      : 'Already used all relevant providers',
  };
}
