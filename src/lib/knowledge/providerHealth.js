// ─── Provider Health (KOP-1 Bundle C) ──────────────────────────────────────────
// Thin event log for provider acquisition outcomes + derived health metrics.
// Records what happened when a campaign ran through a provider (success/partial/
// empty/error, evidence count, latency). buildProviderHealth() composes these events
// into per-provider dimensional metrics — no fabricated rates when log is empty.

export const PROVIDER_OUTCOME_TYPES = ['success', 'partial', 'empty', 'error'];

// ── Event shape ────────────────────────────────────────────────────────────────
export function createProviderEvent({ providerId, campaignId, at, outcomeType, evidenceCount = 0, observationCount = 0, latencyMs = null, errorMsg = null }) {
  return Object.freeze({
    id: `pev-${providerId}-${String(at || '').replace(/\D/g, '').slice(0, 14)}-${campaignId}`,
    providerId,
    campaignId,
    at: at || null,
    outcomeType,      // 'success' | 'partial' | 'empty' | 'error'
    evidenceCount,
    observationCount,
    latencyMs,
    errorMsg: outcomeType === 'error' ? (errorMsg || 'unknown error') : null,
  });
}

// ── Per-provider health snapshot ───────────────────────────────────────────────
// Returns an array of provider health objects, one per unique providerId in events.
// Only counts are reported — no rates invented if totalRuns === 0.
export function buildProviderHealth(events = [], providers = []) {
  const byProvider = events.reduce((m, e) => {
    if (!m[e.providerId]) m[e.providerId] = [];
    m[e.providerId].push(e);
    return m;
  }, {});

  // Ensure every registered provider has an entry even with 0 events
  const allIds = Array.from(new Set([
    ...providers.map((p) => p.id),
    ...Object.keys(byProvider),
  ]));

  return allIds.map((id) => {
    const evs = byProvider[id] || [];
    const totalRuns = evs.length;
    const successCount = evs.filter((e) => e.outcomeType === 'success').length;
    const partialCount = evs.filter((e) => e.outcomeType === 'partial').length;
    const emptyCount   = evs.filter((e) => e.outcomeType === 'empty').length;
    const errorCount   = evs.filter((e) => e.outcomeType === 'error').length;
    const totalEvidence = evs.reduce((s, e) => s + (e.evidenceCount || 0), 0);
    const latencies = evs.filter((e) => e.latencyMs != null).map((e) => e.latencyMs);
    const lastRunAt = evs.length ? evs.sort((a, b) => (b.at || '').localeCompare(a.at || ''))[0].at : null;

    const successRate = totalRuns > 0 ? Math.round((successCount + partialCount) / totalRuns * 100) : null;
    const avgEvidence = totalRuns > 0 ? Math.round(totalEvidence / totalRuns * 10) / 10 : null;
    const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length) : null;

    const provider = providers.find((p) => p.id === id);
    return {
      id,
      family: provider?.family || 'unknown',
      authorityLevel: provider?.authorityLevel || 'unknown',
      totalRuns,
      successRate,           // null = no data (not 0%)
      avgEvidence,           // null = no data
      avgLatencyMs,
      successCount,
      partialCount,
      emptyCount,
      errorCount,
      totalEvidence,
      lastRunAt,
      status: totalRuns === 0 ? 'no-data' : errorCount / totalRuns > 0.5 ? 'degraded' : emptyCount / totalRuns > 0.5 ? 'low-yield' : 'healthy',
    };
  });
}

// ── Thin store ────────────────────────────────────────────────────────────────
const KEY = 'ngw-kas-provider-events';
export function loadProviderEvents() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function saveProviderEvents(list) { try { localStorage.setItem(KEY, JSON.stringify(list || [])); return true; } catch { return false; } }
export function recordProviderEvent(e) { const list = loadProviderEvents(); list.push(e); saveProviderEvents(list); return list; }
export function clearProviderEvents() { try { localStorage.removeItem(KEY); } catch { /* noop */ } }
