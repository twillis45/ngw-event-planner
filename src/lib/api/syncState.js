// ─── V2 sync-state engine (SYNC-HONESTY-1) ───────────────────────────────────
//
// The offline-write retry/flush rail + honest sync-state readers for the V2
// host shell (demo/hostv2). Legacy App.js has its own SaveCtx rail; this module
// is the V2 equivalent, built as a thin honesty layer OVER the one existing
// pending-writes queue in lib/api/events.js — it does NOT create a second
// queue. (V2's cloudSaveEvent IS events.saveEvent, which already enqueues a
// failed cloud write into ngw-cache-pending; what V2 lacked was any way to
// SEE a failure, FLUSH the queue, or STAMP a real success. That is this file.)
//
// localStorage keys — owned by THIS module (new, V2-namespaced):
//   ngw-hostv2-sync-stamps   — JSON object { [eventId]: ISO timestamp } of the
//                              last CONFIRMED cloud success per event. Written
//                              ONLY on a real success (direct save ok, flush ok,
//                              or a cloud load that returned the event). Never
//                              guessed, never backfilled.
//   ngw-hostv2-sync-attempts — JSON object { [eventId]: { at: ISO, error: string|null } }
//                              describing the last UNSUCCESSFUL sync attempt for
//                              an event that still has a queued write. error set
//                              = the attempt genuinely failed ("Couldn't sync");
//                              error null = the write is queued but no cloud
//                              attempt has failed (e.g. no studio yet — "Waiting
//                              to sync"). Cleared on success.
//
// localStorage keys — read via lib/api/events.js (legacy-owned, NOT duplicated):
//   ngw-cache-pending        — THE pending-writes queue (one source of truth).
//   ngw-cache-last-sync      — global timestamp of the last successful cloud
//                              pull (loadEvents writes it; V2 hydration calls
//                              loadEvents, so it is real in V2 too).
//
// Honesty contract (UX_08):
//   - 'synced' is NEVER returned without a success stamp for that event.
//   - A queued write beats an old stamp: the latest edit is not in the cloud,
//     so the event is 'pending' / 'sync-failed', not 'synced'.
//   - Unknown is unknown: no stamp + no queue entry = 'local-only' ("not synced
//     yet"), which is not the same claim as "failed".
//   - No fake timestamps: getLastSyncTime returns null until a real success.
import {
  flushPendingEvents as eventsFlushPendingEvents,
  getPendingEventIds,
  clearPendingEventWrite,
  getPendingCount as eventsGetPendingCount,
  getLastSyncTime as eventsGetGlobalLastSync,
} from './events';

const STAMPS_KEY   = 'ngw-hostv2-sync-stamps';
const ATTEMPTS_KEY = 'ngw-hostv2-sync-attempts';
// Stamps/attempts maps are pruned to this many most-recent entries so the two
// keys can never grow unbounded across years of events.
const MAX_TRACKED = 300;

// ─── Status vocabulary ───────────────────────────────────────────────────────
export const SYNC_STATUS = {
  LOCAL_ONLY:  'local-only',  // no confirmed cloud copy, nothing queued
  PENDING:     'pending',     // a write is queued; no failed cloud attempt recorded
  SYNCED:      'synced',      // real success stamp, and no newer write queued
  SYNC_FAILED: 'sync-failed', // a write is queued and the last attempt failed
};

// Plain host language (UX_06 / no jargon). "not synced yet" is deliberately not
// "failed" — a local-only event was never attempted, and honesty keeps those apart.
export const SYNC_STATUS_LABEL = {
  'local-only':  'On this phone — not synced yet',
  'pending':     'Waiting to sync',
  'synced':      'Synced',
  'sync-failed': 'Couldn’t sync — will retry',
};

// ─── Storage helpers (corrupt-safe) ──────────────────────────────────────────
function readMap(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
function writeMap(key, map) {
  try { localStorage.setItem(key, JSON.stringify(map)); } catch { /* private mode — readers degrade honestly */ }
}
// Keep only the most recent MAX_TRACKED entries (by the given time getter).
function prune(map, timeOf) {
  const ids = Object.keys(map);
  if (ids.length <= MAX_TRACKED) return map;
  const keep = ids
    .sort((a, b) => new Date(timeOf(map[b]) || 0) - new Date(timeOf(map[a]) || 0))
    .slice(0, MAX_TRACKED);
  const next = {};
  for (const id of keep) next[id] = map[id];
  return next;
}
const validIso = (at) => {
  const t = new Date(at).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

// ─── Success stamps ──────────────────────────────────────────────────────────

/**
 * Record a REAL cloud success for one event id (or an array of ids). Call this
 * only when the cloud confirmed the write (saveEvent → { ok: true }, a flushed
 * queue op, or a cloud load that returned the event). Also clears the event's
 * failed-attempt record and drops any stale queued upsert for it — the latest
 * full snapshot just reached the cloud, so an older queued snapshot must never
 * flush over it later.
 *
 * `at` defaults to now; an unparseable `at` is rejected (no fake timestamps).
 */
export function markEventSynced(eventIdOrIds, at) {
  const ids = (Array.isArray(eventIdOrIds) ? eventIdOrIds : [eventIdOrIds]).filter((id) => id != null && id !== '');
  if (!ids.length) return;
  const iso = at === undefined ? new Date().toISOString() : validIso(at);
  if (!iso) return; // an invalid timestamp is not evidence — record nothing
  const stamps = readMap(STAMPS_KEY);
  for (const id of ids) stamps[id] = iso;
  writeMap(STAMPS_KEY, prune(stamps, (v) => v));
  const attempts = readMap(ATTEMPTS_KEY);
  let touched = false;
  for (const id of ids) { if (attempts[id]) { delete attempts[id]; touched = true; } }
  if (touched) writeMap(ATTEMPTS_KEY, attempts);
  for (const id of ids) { try { clearPendingEventWrite(id); } catch { /* queue unreadable — flush dedup is upsert-idempotent */ } }
}

/** Record an UNSUCCESSFUL sync attempt. error string = failed; null = just waiting. */
export function markEventSyncAttemptFailed(eventId, error = null) {
  if (eventId == null || eventId === '') return;
  const attempts = readMap(ATTEMPTS_KEY);
  attempts[eventId] = { at: new Date().toISOString(), error: error == null ? null : String(error) };
  writeMap(ATTEMPTS_KEY, prune(attempts, (v) => v && v.at));
}

/**
 * Last confirmed cloud success.
 *   getLastSyncTime(eventId) — ISO string for that event, or null (never confirmed).
 *   getLastSyncTime()        — most recent success across all events, falling back
 *                              to the global last-cloud-pull stamp (also real:
 *                              loadEvents writes it only after a successful pull).
 */
export function getLastSyncTime(eventId) {
  const stamps = readMap(STAMPS_KEY);
  if (eventId !== undefined) return stamps[eventId] || null;
  let latest = null;
  for (const id of Object.keys(stamps)) {
    if (!latest || new Date(stamps[id]) > new Date(latest)) latest = stamps[id];
  }
  let globalPull = null;
  try { globalPull = eventsGetGlobalLastSync(); } catch { globalPull = null; }
  if (globalPull && (!latest || new Date(globalPull) > new Date(latest))) latest = globalPull;
  return latest || null;
}

// ─── Status reader ───────────────────────────────────────────────────────────

/**
 * Honest sync status for one event. Pure read over the queue + stamps.
 * Returns one of SYNC_STATUS, or null for a missing/id-less event (a status
 * about nothing would itself be a fabrication).
 *
 * Precedence: a queued write ALWAYS beats a stamp — the newest edit is not in
 * the cloud yet, so the event cannot claim 'synced'.
 */
export function getEventSyncStatus(event) {
  const id = event && event.id;
  if (id == null || id === '') return null;
  let queued = false;
  try { queued = getPendingEventIds().includes(id); } catch { queued = false; }
  if (queued) {
    const a = readMap(ATTEMPTS_KEY)[id];
    return a && a.error ? SYNC_STATUS.SYNC_FAILED : SYNC_STATUS.PENDING;
  }
  if (readMap(STAMPS_KEY)[id]) return SYNC_STATUS.SYNCED;
  return SYNC_STATUS.LOCAL_ONLY;
}

/** Count of queued (unflushed) writes — pass-through to the one real queue. */
export function getPendingCount() {
  try { return eventsGetPendingCount(); } catch { return 0; }
}

// ─── Save-result glue ────────────────────────────────────────────────────────

/**
 * Digest the result object of events.saveEvent for one event — THE call the V2
 * shell makes after every cloudSaveEvent, replacing the old swallow-everything
 * catch. Stamps real successes, records real failures, ignores local-only
 * worlds (not-configured / dev studio — nothing cloudy happened, nothing to claim).
 * Returns the SYNC_STATUS the event is in after digestion (convenience for toasts).
 */
export function recordSaveResult(event, result) {
  const id = event && event.id;
  if (id == null || id === '') return null;
  if (result && result.ok) {
    markEventSynced(id);
    return SYNC_STATUS.SYNCED;
  }
  if (result && result.queued) {
    // reason 'error' = the cloud attempt genuinely failed; 'no-studio' = queued
    // while waiting on account setup — that is waiting, not failure.
    markEventSyncAttemptFailed(id, result.reason === 'error' ? (result.error || 'Save didn’t reach the cloud') : null);
    return result.reason === 'error' ? SYNC_STATUS.SYNC_FAILED : SYNC_STATUS.PENDING;
  }
  return getEventSyncStatus(event);
}

// ─── Flush rail ──────────────────────────────────────────────────────────────

/**
 * Retry queued writes (on demand, or from the online listener). Delegates to
 * the ONE real flush (events.flushPendingEvents), then stamps each event whose
 * queued upsert reached the cloud and records per-event errors for the ops
 * that stayed queued. `flushFn` is injectable for tests.
 * Resolves { flushed, failed, flushedIds, failedOps } (events.js shape).
 */
export async function flushPendingEvents(flushFn = eventsFlushPendingEvents) {
  let res = null;
  try { res = await flushFn(); } catch { res = null; }
  if (!res || typeof res !== 'object') return { flushed: 0, failed: getPendingCount(), flushedIds: [], failedOps: [] };
  const flushedIds = Array.isArray(res.flushedIds) ? res.flushedIds : [];
  if (flushedIds.length) markEventSynced(flushedIds);
  for (const op of (Array.isArray(res.failedOps) ? res.failedOps : [])) {
    if (op && op.type === 'upsert') markEventSyncAttemptFailed(op.id, op.error || 'Retry didn’t reach the cloud');
  }
  return {
    flushed: res.flushed || 0,
    failed: res.failed || 0,
    flushedIds,
    failedOps: Array.isArray(res.failedOps) ? res.failedOps : [],
  };
}

/**
 * Register the browser online listener that retries the queue when the
 * connection returns. Returns an uninstaller (for the shell's effect cleanup).
 * onResult (optional) receives the flush result — the shell uses it to toast
 * "N changes synced" honestly (only when flushed > 0).
 */
export function installOnlineFlush(onResult) {
  if (typeof window === 'undefined' || !window.addEventListener) return () => {};
  const handler = () => {
    if (!getPendingCount()) return;
    flushPendingEvents().then((res) => { if (typeof onResult === 'function') onResult(res); }).catch(() => {});
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
