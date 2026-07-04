// ─── Data Quality & Connection Status ──────────────────────────────────────────
// Track connection success, data freshness, completeness, and reliability.
// Every piece of evidence carries metadata about its provenance quality.

export const CONNECTION_STATUS = {
  SUCCESS: 'success',
  PARTIAL: 'partial',       // Some data returned but with errors/warnings
  EMPTY: 'empty',           // Connected but no matching results
  TIMEOUT: 'timeout',       // Request timed out
  ERROR: 'error',           // Connection failed
  OFFLINE: 'offline',       // Provider is offline/unreachable
  UNSUPPORTED: 'unsupported', // Provider doesn't support this query
};

export const DATA_FRESHNESS = {
  CURRENT: 'current',       // Data from today or yesterday
  RECENT: 'recent',         // 1 week old
  AGED: 'aged',            // 1-4 weeks old
  STALE: 'stale',          // >1 month old
  ARCHIVED: 'archived',     // >6 months old (reference only)
};

export const COMPLETENESS = {
  COMPLETE: 'complete',     // All requested fields returned
  PARTIAL: 'partial',       // Some fields missing
  SPARSE: 'sparse',         // Very few fields returned
  MINIMAL: 'minimal',       // Only 1-2 key fields
};

// Assess data freshness relative to a reference date
export function assessFreshness(dataDate, asOf = new Date().toISOString()) {
  if (!dataDate) return DATA_FRESHNESS.ARCHIVED;

  const data = new Date(dataDate);
  const ref = new Date(asOf);
  const daysDiff = Math.floor((ref - data) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 1) return DATA_FRESHNESS.CURRENT;
  if (daysDiff <= 7) return DATA_FRESHNESS.RECENT;
  if (daysDiff <= 28) return DATA_FRESHNESS.AGED;
  if (daysDiff <= 180) return DATA_FRESHNESS.STALE;
  return DATA_FRESHNESS.ARCHIVED;
}

// Assess data completeness (what % of expected fields were returned)
export function assessCompleteness(extractedFacts, expectedFieldCount = 5) {
  if (!extractedFacts || extractedFacts.length === 0) return COMPLETENESS.MINIMAL;

  const ratio = extractedFacts.length / expectedFieldCount;

  if (ratio >= 0.9) return COMPLETENESS.COMPLETE;
  if (ratio >= 0.7) return COMPLETENESS.PARTIAL;
  if (ratio >= 0.3) return COMPLETENESS.SPARSE;
  return COMPLETENESS.MINIMAL;
}

// Create connection status metadata for evidence
export function createConnectionStatus({
  providerId,
  success,
  statusCode,
  message,
  dataDate,
  resultCount,
  fieldCount,
  responseTime, // milliseconds
  asOf = new Date().toISOString(),
} = {}) {
  let status = CONNECTION_STATUS.SUCCESS;
  let issue = null;

  // Determine connection status
  if (!success || statusCode >= 400) {
    if (statusCode === 408 || statusCode === 504) {
      status = CONNECTION_STATUS.TIMEOUT;
      issue = `Provider timeout (${responseTime}ms)`;
    } else if (statusCode === 404 || resultCount === 0) {
      status = CONNECTION_STATUS.EMPTY;
      issue = 'No results found for query';
    } else if (statusCode === 501 || statusCode === 405) {
      status = CONNECTION_STATUS.UNSUPPORTED;
      issue = 'Provider does not support this query type';
    } else if (statusCode >= 503) {
      status = CONNECTION_STATUS.OFFLINE;
      issue = 'Provider is offline or unavailable';
    } else if (statusCode >= 500) {
      status = CONNECTION_STATUS.ERROR;
      issue = `Server error: ${message}`;
    } else if (statusCode >= 400) {
      status = CONNECTION_STATUS.PARTIAL;
      issue = `Partial results: ${message}`;
    }
  } else if (resultCount === 0) {
    status = CONNECTION_STATUS.EMPTY;
    issue = 'Connected but no data returned';
  } else if (resultCount < 2) {
    status = CONNECTION_STATUS.PARTIAL;
    issue = `Limited results (${resultCount} item${resultCount !== 1 ? 's' : ''})`;
  }

  // Assess freshness
  const freshness = assessFreshness(dataDate, asOf);

  // Assess completeness
  const completeness = assessCompleteness(null, fieldCount || 5);

  return {
    provider: providerId,
    status,
    issue,
    success: status === CONNECTION_STATUS.SUCCESS,
    dataDate,
    freshness,
    completeness,
    resultCount: resultCount || 0,
    fieldCount: fieldCount || 0,
    responseTime,
    statusCode,
    timestamp: new Date().toISOString(),
  };
}

// Quality score (0-100) for evidence
export function calculateEvidenceQualityScore(evidence) {
  if (!evidence) return 0;

  let score = 0;

  // Connection success (40 points)
  if (evidence.connectionStatus?.success) score += 40;
  else if (evidence.connectionStatus?.status === CONNECTION_STATUS.PARTIAL) score += 20;

  // Freshness (30 points)
  if (evidence.connectionStatus?.freshness === DATA_FRESHNESS.CURRENT) score += 30;
  else if (evidence.connectionStatus?.freshness === DATA_FRESHNESS.RECENT) score += 20;
  else if (evidence.connectionStatus?.freshness === DATA_FRESHNESS.AGED) score += 10;

  // Completeness (20 points)
  if (evidence.connectionStatus?.completeness === COMPLETENESS.COMPLETE) score += 20;
  else if (evidence.connectionStatus?.completeness === COMPLETENESS.PARTIAL) score += 15;
  else if (evidence.connectionStatus?.completeness === COMPLETENESS.SPARSE) score += 10;

  // Extracted facts (bonus 10 points)
  if (evidence.extractedFacts && evidence.extractedFacts.length > 0) {
    score += Math.min(10, evidence.extractedFacts.length);
  }

  return Math.min(100, score);
}

// Human-readable quality description
export function describeEvidenceQuality(score) {
  if (score >= 80) return { level: 'excellent', emoji: '✨', color: 'good' };
  if (score >= 60) return { level: 'good', emoji: '✓', color: 'accent' };
  if (score >= 40) return { level: 'fair', emoji: '◐', color: 'warn' };
  if (score >= 20) return { level: 'poor', emoji: '⚠', color: 'warn' };
  return { level: 'insufficient', emoji: '✕', color: 'bad' };
}

// Status badge color mapping
export const STATUS_COLOR = {
  [CONNECTION_STATUS.SUCCESS]: 'good',
  [CONNECTION_STATUS.PARTIAL]: 'warn',
  [CONNECTION_STATUS.EMPTY]: 'warn',
  [CONNECTION_STATUS.TIMEOUT]: 'warn',
  [CONNECTION_STATUS.ERROR]: 'bad',
  [CONNECTION_STATUS.OFFLINE]: 'bad',
  [CONNECTION_STATUS.UNSUPPORTED]: 'faint',
};

export const FRESHNESS_COLOR = {
  [DATA_FRESHNESS.CURRENT]: 'good',
  [DATA_FRESHNESS.RECENT]: 'good',
  [DATA_FRESHNESS.AGED]: 'accent',
  [DATA_FRESHNESS.STALE]: 'warn',
  [DATA_FRESHNESS.ARCHIVED]: 'faint',
};

// Explain why evidence shouldn't be trusted
export function whyEvidenceUntrustworthy(evidence) {
  const reasons = [];

  const status = evidence.connectionStatus;
  if (!status) {
    reasons.push('No connection status recorded');
    return reasons;
  }

  if (status.status !== CONNECTION_STATUS.SUCCESS) {
    reasons.push(`Connection: ${status.issue || status.status}`);
  }

  if (status.freshness === DATA_FRESHNESS.STALE) {
    reasons.push(`Data is stale (${status.dataDate})`);
  } else if (status.freshness === DATA_FRESHNESS.ARCHIVED) {
    reasons.push(`Data is archived (${status.dataDate}) — reference only`);
  }

  if (status.completeness === COMPLETENESS.MINIMAL) {
    reasons.push(`Only ${status.fieldCount} field${status.fieldCount !== 1 ? 's' : ''} returned`);
  } else if (status.completeness === COMPLETENESS.SPARSE) {
    reasons.push('Data is incomplete');
  }

  if (status.resultCount === 0) {
    reasons.push('No results returned');
  }

  return reasons;
}

// Recommend whether to use this evidence
export function recommendEvidenceUsage(evidence) {
  const score = calculateEvidenceQualityScore(evidence);
  const quality = describeEvidenceQuality(score);

  return {
    score,
    quality: quality.level,
    canUse: score >= 40,
    shouldAutoAccept: score >= 70,
    reasons: whyEvidenceUntrustworthy(evidence),
  };
}
