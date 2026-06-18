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
    const events = (data || []).map((row) => ({ ...row.data, id: row.id }));
    writeLocal(events);
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return events;
  } catch (e) {
    captureError(e, { where: 'events.loadEvents', onLine: onLine() });
    return readLocal();
  }
}

/** Persist a single event (upsert). Queues locally if cloud write fails. */
export async function saveEvent(event) {
  const local = readLocal();
  writeLocal(local.some((e) => e.id === event.id)
    ? local.map((e) => (e.id === event.id ? event : e))
    : [...local, event]);

  if (!isSupabaseConfigured() || !supabase) return;
  const sid = await currentStudioId();
  if (!sid) { enqueueMutation({ type: 'upsert', id: event.id, data: event }); return; }
  // Sprint 58E-B: a non-uuid studio (dev-bypass) has no cloud row — stay local-only
  // (the localStorage write above already persisted it). Do NOT send 'dev-studio'
  // to a uuid column (22P02 400). Real prod studios are uuids and proceed normally.
  if (!isCloudStudioId(sid)) return;
  try {
    const { error } = await supabase
      .from('events')
      .upsert({ id: event.id, studio_id: sid, data: event }, { onConflict: 'id' });
    if (error) throw error;
  } catch (e) {
    captureError(e, { where: 'events.saveEvent', id: event.id, onLine: onLine(), pending: getPendingCount() });
    enqueueMutation({ type: 'upsert', id: event.id, data: event });
  }
}

/** Delete an event by id (within the current studio). */
export async function deleteEvent(eventId) {
  writeLocal(readLocal().filter((e) => e.id !== eventId));
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

/** Flush pending mutations that failed earlier. Call when back online. */
export async function flushPendingEvents() {
  if (!isSupabaseConfigured() || !supabase) return { flushed: 0, failed: 0 };
  const sid = await currentStudioId();
  // Sprint 58E-B: never retry the queue against a non-uuid (dev) studio — it would
  // 400 forever. Real-studio flushes proceed; stale dev ops stay queued harmlessly.
  if (!sid || !isCloudStudioId(sid)) return { flushed: 0, failed: 0 };
  const queue = getPending();
  if (!queue.length) return { flushed: 0, failed: 0 };
  let flushed = 0;
  const remaining = [];
  for (const op of queue) {
    try {
      if (op.type === 'upsert') {
        const { error } = await supabase
          .from('events')
          .upsert({ id: op.id, studio_id: sid, data: op.data }, { onConflict: 'id' });
        if (error) throw error;
      } else if (op.type === 'delete') {
        const { error } = await supabase
          .from('events').delete().eq('id', op.id).eq('studio_id', sid);
        if (error) throw error;
      }
      flushed++;
    } catch {
      remaining.push(op);
    }
  }
  setPending(remaining);
  return { flushed, failed: remaining.length };
}

/** Import localStorage events into the current studio (first-time migration). */
export async function migrateLocalToCloud(localEvents) {
  if (!isSupabaseConfigured() || !supabase) return { migrated: 0, failed: 0 };
  const sid = await currentStudioId();
  if (!sid || !isCloudStudioId(sid)) return { migrated: 0, failed: 0 }; // Sprint 58E-B: non-uuid (dev) ⇒ skip
  let migrated = 0, failed = 0;
  for (const event of localEvents) {
    try {
      const { error } = await supabase
        .from('events')
        .upsert({ id: event.id, studio_id: sid, data: event }, { onConflict: 'id' });
      if (error) throw error;
      migrated++;
    } catch {
      failed++;
    }
  }
  if (migrated > 0) localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  return { migrated, failed };
}

export function getLastSyncTime() { return localStorage.getItem(LAST_SYNC_KEY) || null; }
export function getPendingCount() { return getPending().length; }
