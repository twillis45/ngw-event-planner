// ─── Events data access layer ─────────────────────────────────────────────────
// Studio-scoped (multi-tenant): rows are owned by a STUDIO, not a user — any
// member of the studio can read/write. See docs/MULTITENANCY.md.
//
// All functions degrade gracefully: when Supabase is not configured or there's
// no studio (signed out), localStorage is used directly. This keeps the app
// working identically in demo / offline mode.
//
// localStorage keys:
//   ngw-events           — canonical local copy
//   ngw-cache-last-sync  — ISO timestamp of the last successful cloud pull
//   ngw-cache-pending    — JSON array of mutations not yet flushed to Supabase
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { currentStudioId, isCloudStudioId } from './studio';
import { captureError } from '../sentry';

const onLine = () => (typeof navigator !== 'undefined' ? navigator.onLine : null);

const LOCAL_KEY     = 'ngw-events';
const LAST_SYNC_KEY = 'ngw-cache-last-sync';
const PENDING_KEY   = 'ngw-cache-pending';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}
function writeLocal(events) {
  // Board (Majors): a swallowed write here = silent data loss (e.g. iOS Private Mode);
  // the planner still sees "autosaved". Capture it instead of dropping it silently.
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(events)); } catch (e) { captureError(e, { where: 'events.writeLocal', count: events?.length }); }
}
function getPending() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; }
}
function setPending(queue) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(queue)); } catch {}
}
function enqueueMutation(op) {
  const q = getPending();
  if (op.type === 'upsert') {
    const idx = q.findIndex((m) => m.type === 'upsert' && m.id === op.id);
    if (idx !== -1) { q[idx] = op; } else { q.push(op); }
  } else {
    q.push(op);
  }
  setPending(q);
}

// ─── Queue observability (SYNC-HONESTY-1) ────────────────────────────────────
// Read-only views + one targeted removal so sync-state readers (lib/api/syncState)
// can tell the truth about which events have unflushed writes. The queue itself
// stays the ONE pending-writes source of truth (key: ngw-cache-pending).

/** Ids of events with a queued (unflushed) upsert. */
export function getPendingEventIds() {
  return getPending().filter((m) => m && m.type === 'upsert' && m.id != null).map((m) => m.id);
}

/** True when the given event has a queued (unflushed) upsert. */
export function hasPendingEventWrite(eventId) {
  return getPendingEventIds().includes(eventId);
}

/**
 * Drop the queued upsert for an event whose LATEST full snapshot just reached
 * the cloud by a direct save. Without this, a stale queued snapshot (from an
 * earlier failed save) would later flush OVER the newer cloud row.
 */
export function clearPendingEventWrite(eventId) {
  const q = getPending();
  const next = q.filter((m) => !(m && m.type === 'upsert' && m.id === eventId));
  if (next.length !== q.length) setPending(next);
}

// ─── A SAVE NEVER SILENTLY OVERWRITES (2026-11-02) ───────────────────────────
// LIVE_MODE_CENSUS §5 recorded this: every cloud write was a blind
// `upsert(..., { onConflict: 'id' })` — last-write-wins on the whole blob —
// which "silently discards the losing side's concurrent edits and nothing
// surfaces that." UX_08: never silently overwrite. The cloud->local direction
// was already honest (hydrate adopts a newer cloud copy and SAYS so, and never
// over a dirty local one); this is the local->cloud half.
//
// Mechanism: when the event carries the version it was loaded at, the write
// is a conditional UPDATE that lands only if the row is still at that version
// (`updated_at <= loadedAt`; the trigger bumps updated_at on every UPDATE, so
// any newer write moves it past). Zero rows matched means the row moved on —
// a newer write, or a deletion — and the caller gets `reason: 'conflict'`
// instead of a lie. The host's edit is already in the local store (saveEvent
// writes it first, unconditionally), so nothing is lost on either side.
//
// Returned `updatedAt` is the row's NEW stamp, so the caller can refresh the
// local copy's `_cloudUpdatedAt`.
//
// THE DEVICE'S OWN WRITES ARE NOT A CONFLICT. Two things would otherwise make
// a device refuse ITSELF, and the first was measured on the first cut of this:
//   1. Back-to-back edits. hostv2 saves on every patch with no debounce, so a
//      second keystroke can start before the first write's new stamp is back;
//      both carry the loaded stamp, the first lands and moves the row, and the
//      second reads as "changed somewhere else". So writes to one id are
//      CHAINED — the second starts after the first settles.
//   2. A caller that never adopts the returned stamp (the frozen CRA shell
//      ignores save results), or a reload before it could. So the newest
//      version this device produced or saw is kept HERE, per id, persisted,
//      and the comparison uses the newer of the event's stamp and that record.
//      A write only has to beat what this device has NOT seen — which is the
//      whole point.
//
// No version carried (created here, never loaded from the cloud, nothing on
// record) → the plain upsert, because there is no version to compare and an
// insert cannot conflict with anything this device knows about.
const STAMPS_KEY = 'ngw-cache-stamps';   // { [eventId]: updated_at } newest this device produced or saw
function readStamps() {
  try { return JSON.parse(localStorage.getItem(STAMPS_KEY) || '{}') || {}; } catch { return {}; }
}
/** True when `a` is a later version stamp than `b` (ISO/Postgres timestamps). */
function newerStamp(a, b) {
  if (!a) return false;
  if (!b) return true;
  const ta = Date.parse(a), tb = Date.parse(b);
  return Number.isFinite(ta) && Number.isFinite(tb) ? ta > tb : a > b;
}
function noteStamp(id, stamp) {
  if (!id || !stamp) return;
  const all = readStamps();
  if (newerStamp(stamp, all[id])) { all[id] = stamp; try { localStorage.setItem(STAMPS_KEY, JSON.stringify(all)); } catch {} }
}
function forgetStamp(id) {
  const all = readStamps();
  if (id in all) { delete all[id]; try { localStorage.setItem(STAMPS_KEY, JSON.stringify(all)); } catch {} }
}
/** The version this device should write against: its copy's stamp or the newest on record, whichever is later. */
export function knownVersion(event) {
  const own = event && event.id ? readStamps()[event.id] : undefined;
  const carried = event && event._cloudUpdatedAt;
  return newerStamp(own, carried) ? own : carried;
}

const inFlight = new Map();   // eventId → the write currently running for it
function writeGuarded(sid, event) {
  const id = event && event.id;
  const prev = inFlight.get(id) || Promise.resolve();
  const run = prev.catch(() => {}).then(() => writeGuardedNow(sid, event));
  inFlight.set(id, run);
  run.then(() => { if (inFlight.get(id) === run) inFlight.delete(id); }, () => { if (inFlight.get(id) === run) inFlight.delete(id); });
  return run;
}

async function writeGuardedNow(sid, event) {
  const { _cloudUpdatedAt: _carried, ...data } = event;
  const loadedAt = knownVersion(event);
  if (loadedAt) {
    const { data: rows, error } = await supabase
      .from('events')
      .update({ data })
      .eq('id', event.id).eq('studio_id', sid)
      .lte('updated_at', loadedAt)
      .select('id, updated_at');
    if (error) throw error;
    if (rows && rows.length) { noteStamp(event.id, rows[0].updated_at); return { ok: true, updatedAt: rows[0].updated_at }; }
    // Zero rows: newer write, or gone. One cheap read tells the host which.
    const { data: cur, error: e2 } = await supabase
      .from('events').select('updated_at').eq('id', event.id).eq('studio_id', sid).maybeSingle();
    if (e2) throw e2;
    return { ok: false, queued: false, reason: 'conflict', loadedAt, serverUpdatedAt: cur ? cur.updated_at : null };
  }
  const { data: rows, error } = await supabase
    .from('events')
    .upsert({ id: event.id, studio_id: sid, data }, { onConflict: 'id' })
    .select('updated_at');
  if (error) throw error;
  const updatedAt = rows && rows[0] ? rows[0].updated_at : undefined;
  noteStamp(event.id, updatedAt);
  return { ok: true, updatedAt };
}

// ─── Public API (signatures unchanged) ─────────────────────────────────────────

/** Load all events for the current studio. Falls back to local cache. */
export async function loadEvents() {
  if (!isSupabaseConfigured() || !supabase) return readLocal();
  const sid = await currentStudioId();
  // Sprint 58E-B: no real (uuid) studio ⇒ local-only (dev-bypass 'dev-studio' is
  // not a uuid and would 400). Avoids a doomed cloud round-trip on hydration.
  if (!sid || !isCloudStudioId(sid)) return readLocal();
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, data, updated_at')
      .eq('studio_id', sid)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    // `_cloudUpdatedAt` is the row's `updated_at` COLUMN, never the blob — the
    // version this device loaded, carried as provenance (same convention as
    // `_sample`). saveEvent writes conditionally against it, so a newer write
    // from another device is refused and disclosed instead of silently
    // overwritten. Stripped from `data` on every write, so the blob never
    // carries a stale copy of its own column.
    const events = (data || []).map((row) => ({ ...row.data, id: row.id, _cloudUpdatedAt: row.updated_at }));
    events.forEach((e) => noteStamp(e.id, e._cloudUpdatedAt));   // seen — see writeGuarded
    writeLocal(events);
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return events;
  } catch (e) {
    captureError(e, { where: 'events.loadEvents', onLine: onLine() });
    return readLocal();
  }
}

/**
 * Persist a single event (guarded upsert). Queues locally if cloud write fails.
 *   { ok: false, queued: false, reason: 'conflict', loadedAt, serverUpdatedAt }
 *     — the row changed since this device loaded it; NOT written, NOT queued,
 *       the local copy keeps the edit. See writeGuarded.
 *
 * SYNC-HONESTY-1: now returns an honest result object so callers (V2 shell via
 * lib/api/syncState) can distinguish a real cloud success from a swallowed
 * failure. Existing callers that ignore the return value are unaffected.
 *   { ok: true }                                        — cloud row confirmed written
 *   { ok: false, queued: true,  reason: 'no-studio' }   — no studio yet; write queued
 *   { ok: false, queued: true,  reason: 'error', error } — cloud write failed; queued for retry
 *   { ok: false, queued: false, reason: 'not-configured' | 'local-studio' } — local-only world
 */
export async function saveEvent(event) {
  const local = readLocal();
  writeLocal(local.some((e) => e.id === event.id)
    ? local.map((e) => (e.id === event.id ? event : e))
    : [...local, event]);

  if (!isSupabaseConfigured() || !supabase) return { ok: false, queued: false, reason: 'not-configured' };
  const sid = await currentStudioId();
  if (!sid) { enqueueMutation({ type: 'upsert', id: event.id, data: event }); return { ok: false, queued: true, reason: 'no-studio' }; }
  // Sprint 58E-B: a non-uuid studio (dev-bypass) has no cloud row — stay local-only
  // (the localStorage write above already persisted it). Do NOT send 'dev-studio'
  // to a uuid column (22P02 400). Real prod studios are uuids and proceed normally.
  if (!isCloudStudioId(sid)) return { ok: false, queued: false, reason: 'local-studio' };
  try {
    // A conflict is an ANSWER, not an error: it is not queued (retrying a
    // refused overwrite would just refuse again) and it is not thrown.
    return await writeGuarded(sid, event);
  } catch (e) {
    captureError(e, { where: 'events.saveEvent', id: event.id, onLine: onLine(), pending: getPendingCount() });
    enqueueMutation({ type: 'upsert', id: event.id, data: event });
    return { ok: false, queued: true, reason: 'error', error: (e && e.message) || String(e) };
  }
}

/** Delete an event by id (within the current studio). */
export async function deleteEvent(eventId) {
  writeLocal(readLocal().filter((e) => e.id !== eventId));
  forgetStamp(eventId);
  if (!isSupabaseConfigured() || !supabase) return;
  const sid = await currentStudioId();
  if (!sid) { enqueueMutation({ type: 'delete', id: eventId }); return; }
  if (!isCloudStudioId(sid)) return; // Sprint 58E-B: dev-bypass non-uuid studio ⇒ local-only
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('studio_id', sid);
    if (error) throw error;
  } catch (e) {
    captureError(e, { where: 'events.deleteEvent', id: eventId, onLine: onLine() });
    enqueueMutation({ type: 'delete', id: eventId });
  }
}

/**
 * Flush pending mutations that failed earlier. Call when back online.
 *
 * SYNC-HONESTY-1: the result now also carries per-op detail so sync-state
 * readers can stamp real successes and explain real failures (extra fields —
 * existing { flushed, failed } consumers are unaffected):
 *   flushedIds — event ids whose queued UPSERT reached the cloud this flush
 *   failedOps  — [{ id, type, error }] for ops that stayed queued
 */
export async function flushPendingEvents() {
  const empty = { flushed: 0, failed: 0, flushedIds: [], failedOps: [] };
  if (!isSupabaseConfigured() || !supabase) return empty;
  const sid = await currentStudioId();
  // Sprint 58E-B: never retry the queue against a non-uuid (dev) studio — it would
  // 400 forever. Real-studio flushes proceed; stale dev ops stay queued harmlessly.
  if (!sid || !isCloudStudioId(sid)) return empty;
  const queue = getPending();
  if (!queue.length) return empty;
  let flushed = 0;
  const flushedIds = [];
  const failedOps = [];
  const remaining = [];
  for (const op of queue) {
    try {
      if (op.type === 'upsert') {
        const r = await writeGuarded(sid, { ...op.data, id: op.id });
        if (r && r.reason === 'conflict') {
          // Not retried: the refusal is final until the host sees a newer
          // version. Dropped from the queue, reported by name, and the local
          // copy still holds the edit.
          failedOps.push({ id: op.id, type: op.type, error: 'conflict' });
          continue;
        }
        flushedIds.push(op.id);
      } else if (op.type === 'delete') {
        const { error } = await supabase
          .from('events').delete().eq('id', op.id).eq('studio_id', sid);
        if (error) throw error;
      }
      flushed++;
    } catch (e) {
      remaining.push(op);
      failedOps.push({ id: op.id, type: op.type, error: (e && e.message) || String(e) });
    }
  }
  setPending(remaining);
  return { flushed, failed: remaining.length, flushedIds, failedOps };
}

/** Import localStorage events into the current studio (first-time migration). */
export async function migrateLocalToCloud(localEvents) {
  if (!isSupabaseConfigured() || !supabase) return { migrated: 0, failed: 0 };
  const sid = await currentStudioId();
  if (!sid || !isCloudStudioId(sid)) return { migrated: 0, failed: 0 }; // Sprint 58E-B: non-uuid (dev) ⇒ skip
  let migrated = 0, failed = 0, firstError = null;
  for (const event of localEvents) {
    try {
      const { error } = await supabase
        .from('events')
        // Blind on purpose: a first-time import of local events has no cloud
        // version to compare. The stamp is stripped so the blob stays clean.
        .upsert({ id: event.id, studio_id: sid, data: (({ _cloudUpdatedAt, ...d }) => d)(event) }, { onConflict: 'id' });
      if (error) throw error;
      migrated++;
    } catch (e) {
      failed++;
      // Capture the FIRST real Supabase error so the "Partial import" modal can show
      // the reason (RLS studio-mismatch / auth / network) instead of a blind "N failed."
      if (!firstError) firstError = e?.message || String(e);
    }
  }
  if (migrated > 0) localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  return { migrated, failed, firstError };
}

export function getLastSyncTime() { return localStorage.getItem(LAST_SYNC_KEY) || null; }
export function getPendingCount() { return getPending().length; }
