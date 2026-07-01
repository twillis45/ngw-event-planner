// ── INTEL-QA-1 Sync Status Visibility ────────────────────────────────────────
//
// Pure helper — no network calls, no side effects.
// Returns an honest sync status for a single event given session context the
// caller provides synchronously.
//
// Status values:
//   'sample'        — seed/demo event; inherently local-only
//   'local-only'    — real event in a non-cloud (dev-bypass) session
//   'server-synced' — cloud session + events have been loaded from Supabase
//   'unknown'       — cloud session but sync not yet confirmed this session
//
// Honesty contract: 'server-synced' is NEVER returned unless the caller confirms
// both a cloud auth session AND that a Supabase sync has completed (hasSynced).
// When uncertain, the helper returns 'unknown' — never falsely claims 'synced'.
//
// Caller provides:
//   isSample       — boolean: is this a seed/demo event? (caller knows via isSeedEvent)
//   isCloudSession — boolean: is the user in a Supabase-authenticated cloud session?
//   hasSynced      — boolean: has a Supabase event load completed? (from getLastSyncTime)
// ─────────────────────────────────────────────────────────────────────────────

export const SYNC_STATUS = {
  SAMPLE:        'sample',
  LOCAL_ONLY:    'local-only',
  SERVER_SYNCED: 'server-synced',
  UNKNOWN:       'unknown',
};

export const SYNC_STATUS_LABEL = {
  'sample':        'Sample event · local only',
  'local-only':    'Local only',
  'server-synced': 'Server synced',
  'unknown':       'Server sync unknown',
};

// Returns a SYNC_STATUS value for the given event.
// sessionCtx: { isSample?: boolean, isCloudSession?: boolean, hasSynced?: boolean }
export function getEventSyncStatus(event, sessionCtx = {}) {
  if (!event) return SYNC_STATUS.UNKNOWN;
  const { isSample = false, isCloudSession = false, hasSynced = false } = sessionCtx;

  if (isSample) return SYNC_STATUS.SAMPLE;
  if (!isCloudSession) return SYNC_STATUS.LOCAL_ONLY;
  if (isCloudSession && hasSynced) return SYNC_STATUS.SERVER_SYNCED;
  return SYNC_STATUS.UNKNOWN;
}

// Builds the dev/debug sync row for an event (no PII — id, name, status, intel flag, updatedAt).
// updatedAt here is the last global sync timestamp (individual events don't carry it).
export function makeEventSyncRow(event, sessionCtx, lastSyncTime) {
  const status = getEventSyncStatus(event, sessionCtx);
  return {
    id:         event?.id ?? null,
    name:       event?.name ?? null,
    syncStatus: status,
    hasIntel:   Array.isArray(event?.intelEvaluations) && event.intelEvaluations.length > 0,
    updatedAt:  lastSyncTime ?? null,
  };
}
