// ─── Provider Intelligence (KRA-1 Bundle D) ───────────────────────────────────
// Tracks per-provider operational history: evidence produced, acceptance rate,
// contradiction rate, authority, and freshness. Pure data model — no side effects.
//
// Storage: localStorage 'ngw-kas-provider-intel'. Each record is keyed by providerId.
// Records are APPEND-ONLY from the perspective of individual runs; the summary
// reader aggregates across all runs. No run is deleted.
//
// Governance: never modifies providers, campaigns, evidence, or KCRs.
//             read-only view into campaign run history.

const STORE_KEY = 'ngw-kas-provider-intel';

// ── Store ──────────────────────────────────────────────────────────────────────
export function loadProviderIntel() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}
export function saveProviderIntel(intel) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(intel || {})); return true; } catch { return false; }
}
export function clearProviderIntel() {
  try { localStorage.removeItem(STORE_KEY); } catch { /* noop */ }
}

// ── recordProviderRun ──────────────────────────────────────────────────────────
// Record the outcome of one provider contributing to one campaign run.
// Pure function: returns updated intel object, does NOT save it.
// Caller is responsible for saving (allows batching multiple records before save).
export function recordProviderRun(intel, providerId, {
  campaignId,
  evidenceProduced = 0,   // how many evidence records came from this provider
  accepted = 0,           // how many were accepted by deriveFinding
  contradictions = 0,     // how many contradictions surfaced
  authority = 'trade',    // 'official' | 'trade' | 'community'
  freshnessDays = null,   // age of data in days (null = unknown)
  at,                     // ISO date of this run
} = {}) {
  const current = (intel || {})[providerId] || {
    providerId,
    runs: [],
    totalRuns: 0,
    totalEvidence: 0,
    totalAccepted: 0,
    totalContradictions: 0,
    authorityBuckets: { official: 0, trade: 0, community: 0 },
    freshnessSum: 0,
    freshnessCount: 0,
    lastRun: null,
    firstRun: null,
  };

  const run = { campaignId, evidenceProduced, accepted, contradictions, authority, freshnessDays, at };

  const updated = {
    ...current,
    providerId,
    runs: [...current.runs, run],
    totalRuns: current.totalRuns + 1,
    totalEvidence: current.totalEvidence + evidenceProduced,
    totalAccepted: current.totalAccepted + accepted,
    totalContradictions: current.totalContradictions + contradictions,
    authorityBuckets: {
      ...current.authorityBuckets,
      [authority]: (current.authorityBuckets[authority] || 0) + 1,
    },
    freshnessSum: freshnessDays != null ? current.freshnessSum + freshnessDays : current.freshnessSum,
    freshnessCount: freshnessDays != null ? current.freshnessCount + 1 : current.freshnessCount,
    lastRun: at || current.lastRun,
    firstRun: current.firstRun || at,
  };

  return { ...intel, [providerId]: updated };
}

// ── getProviderStats ───────────────────────────────────────────────────────────
// Compute derived stats for a single provider from stored intel.
// Returns null if no data for this provider.
export function getProviderStats(intel, providerId) {
  const rec = (intel || {})[providerId];
  if (!rec) return null;

  const acceptanceRate  = rec.totalEvidence > 0 ? (rec.totalAccepted / rec.totalEvidence) : null;
  const contradictionRate = rec.totalEvidence > 0 ? (rec.totalContradictions / rec.totalEvidence) : null;
  const avgFreshnessDays  = rec.freshnessCount > 0 ? Math.round(rec.freshnessSum / rec.freshnessCount) : null;
  const dominantAuthority = Object.entries(rec.authorityBuckets).sort((a, b) => b[1] - a[1])[0]?.[0] || 'trade';
  const evidencePerRun    = rec.totalRuns > 0 ? (rec.totalEvidence / rec.totalRuns).toFixed(1) : '0';

  return {
    providerId,
    totalRuns: rec.totalRuns,
    totalEvidence: rec.totalEvidence,
    totalAccepted: rec.totalAccepted,
    acceptanceRate,          // 0–1, null if no evidence
    contradictionRate,       // 0–1, null if no evidence
    avgFreshnessDays,        // null if unknown
    dominantAuthority,       // 'official' | 'trade' | 'community'
    evidencePerRun,          // avg evidence produced per run
    lastRun: rec.lastRun,
    firstRun: rec.firstRun,
  };
}

// ── rankProviders ──────────────────────────────────────────────────────────────
// Rank a list of providerIds by historical performance for a given field kind.
// Returns the same list in descending order (best first).
// Rules:
//   - Official authority providers ranked higher for non-commercial fields
//   - Higher acceptance rate = higher rank
//   - Lower contradiction rate = higher rank
//   - No intel on a provider → rank by authority preference for field kind
export function rankProviders(intel, providerIds, fieldKind = 'pricing') {
  // Preferred authority for each field kind
  const preferOfficial = ['grounding', 'governance', 'safety', 'weather', 'regional'];
  const wantOfficial   = preferOfficial.includes(fieldKind);

  return [...providerIds].sort((a, b) => {
    const sa = getProviderStats(intel, a);
    const sb = getProviderStats(intel, b);

    // No intel → use authority preference heuristic
    if (!sa && !sb) {
      const govA = ['data.gov', 'noaa', 'fda-foodsafety', 'scholar'].includes(a);
      const govB = ['data.gov', 'noaa', 'fda-foodsafety', 'scholar'].includes(b);
      if (wantOfficial) return (govB ? 1 : 0) - (govA ? 1 : 0);
      return 0;
    }
    if (!sa) return 1;
    if (!sb) return -1;

    // Acceptance rate — higher is better
    const accDiff = (sb.acceptanceRate ?? 0) - (sa.acceptanceRate ?? 0);
    if (Math.abs(accDiff) > 0.1) return accDiff > 0 ? 1 : -1;

    // Authority bonus for official when field prefers it
    if (wantOfficial) {
      const authA = sa.dominantAuthority === 'official' ? 1 : 0;
      const authB = sb.dominantAuthority === 'official' ? 1 : 0;
      if (authA !== authB) return authB - authA;
    }

    // Contradiction rate — lower is better
    const conDiff = (sa.contradictionRate ?? 0) - (sb.contradictionRate ?? 0);
    return conDiff;
  });
}

// ── providerIntelligenceSummary ────────────────────────────────────────────────
// Aggregate view across all providers for Mission Control.
export function providerIntelligenceSummary(intel) {
  const allRecs = Object.values(intel || {});
  if (!allRecs.length) return { totalProviders: 0, activeProviders: 0, avgAcceptanceRate: null, bestPerformer: null, mostContradictions: null };

  const withEvidence = allRecs.filter((r) => r.totalEvidence > 0);
  const avgAcc = withEvidence.length
    ? withEvidence.reduce((s, r) => s + (r.totalAccepted / r.totalEvidence), 0) / withEvidence.length
    : null;

  const best = withEvidence.reduce((m, r) => {
    const acc = r.totalEvidence > 0 ? r.totalAccepted / r.totalEvidence : 0;
    const macc = m ? m.totalEvidence > 0 ? m.totalAccepted / m.totalEvidence : 0 : -1;
    return acc > macc ? r : m;
  }, null);

  const mostContra = allRecs.reduce((m, r) => (!m || r.totalContradictions > m.totalContradictions) ? r : m, null);

  return {
    totalProviders:    allRecs.length,
    activeProviders:   allRecs.filter((r) => r.totalRuns > 0).length,
    avgAcceptanceRate: avgAcc,
    bestPerformer:     best?.providerId || null,
    mostContradictions:mostContra?.providerId || null,
  };
}

// ── extractProviderRunStats ────────────────────────────────────────────────────
// Extract per-provider run stats from a batch runCampaigns() result set,
// so callers can update providerIntel without parsing campaign internals.
// Returns [{ providerId, campaignId, evidenceProduced, accepted, contradictions, authority, at }]
export function extractProviderRunStats(runResults, asOf) {
  const stats = [];
  for (const { campaignId, success, result } of runResults) {
    if (!success || !result) continue;
    const evidence = result.evidence || [];
    const conflicts = result.evidenceIntel?.contradictions?.length || 0;

    // Group evidence by source (= provider)
    const bySource = {};
    for (const ev of evidence) {
      const src = ev.source || 'unknown';
      if (!bySource[src]) bySource[src] = { evidence: [], authority: ev.authority || ev.sourceType || 'trade' };
      bySource[src].evidence.push(ev);
    }

    for (const [providerId, { evidence: provEvs, authority }] of Object.entries(bySource)) {
      stats.push({
        providerId,
        campaignId,
        evidenceProduced: provEvs.length,
        accepted:         provEvs.filter((e) => e.fieldPath === result.finding?.fieldPath).length,
        contradictions:   conflicts,
        authority,
        at: asOf,
      });
    }
  }
  return stats;
}
