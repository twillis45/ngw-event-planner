// PL-15 — readiness history for the event-card sparkline. Honest, forward-only:
// we record a point only when an event's readiness score actually CHANGES (no
// synthetic backfill), so the trend reflects real work — confirming a vendor,
// clearing overdue tasks, etc. Capped per event; localStorage-backed.
const KEY = (id) => `ngw-readiness-hist-${id}`;
const CAP = 30;

export function getReadinessHistory(eventId) {
  if (!eventId) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(eventId)));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

// Append a point only if the score differs from the most recent one. Returns
// the (possibly unchanged) history array. `score` is 0–100.
export function recordReadiness(eventId, score) {
  if (!eventId || score == null || Number.isNaN(score)) return getReadinessHistory(eventId);
  let hist = getReadinessHistory(eventId);
  const last = hist.length ? hist[hist.length - 1] : null;
  if (last && last.s === score) return hist; // unchanged → no new point
  hist.push({ t: Date.now(), s: Math.round(score) });
  if (hist.length > CAP) hist = hist.slice(-CAP);
  try { localStorage.setItem(KEY(eventId), JSON.stringify(hist)); } catch {}
  return hist;
}

// Map a getEventReadiness() result (4 axes) to a 0–100 score.
// ON_TRACK = 1, ATTENTION = 0.5, AT_RISK / anything else = 0.
export function readinessScore(r) {
  if (!r) return null;
  const axes = [r.decision, r.vendor, r.timeline, r.document].filter(Boolean);
  if (!axes.length) return null;
  const v = axes.reduce((s, a) => s + (a.status === 'ON_TRACK' ? 1 : a.status === 'ATTENTION' ? 0.5 : 0), 0);
  return Math.round((v / axes.length) * 100);
}
