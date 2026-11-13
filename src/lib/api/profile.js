// ─── Studio profile / settings data access layer ──────────────────────────────
// One settings object per STUDIO (studios → studio_settings, studio_id PK).
// localStorage-first, Supabase-when-available. localStorage key is the SAME one
// the old localStorage-only profile used (ngw-profile), so a planner's existing
// setup is preserved and migrates to the cloud on first save.
//
// ── UNSENT CHANGES WIN (G19, owner ruling 11/12/2026) ───────────────────────
// The sign-in pull used to replace this device's profile WHOLESALE with the
// account row, and saveProfile swallowed every failure without retrying. So a
// name or area typed while signed out, or saved while the account write
// failed, was deleted at the next sign-in or token refresh.
//
// Now every field this device changes is marked UNSENT until the account
// confirms it. syncProfile (sign-in, token refresh, reconnect) takes the
// account row and lays this device's unsent fields over it, pushes the result,
// and only then clears the marker. A field-level merge was not asked for; this
// is top-level keys, which is what "this device's unsent changes win" needs and
// keeps one device's stale copy of the fields it did NOT change from winning.
// Known limit: two devices with unsent changes to the SAME key — the last one
// to send wins.
//
// The unsent marker and the owner stamp are device-only plumbing, like the
// event sync records: they describe what THIS device has confirmed.
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { currentStudioId } from './studio';
import { captureError } from '../sentry';

const LOCAL_KEY = 'ngw-profile';
const UNSENT_KEY = 'ngw-profile-unsent';   // { field: token } — changed here, not yet in the account
const OWNER_KEY = 'ngw-profile-owner';     // the studio this device's copy last agreed with
const onLine = () => (typeof navigator !== 'undefined' ? navigator.onLine : null);

function writeLocal(profile) {
  // Board (Majors): a swallowed write here = the planner's studio setup silently lost.
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(profile)); } catch (e) { captureError(e, { where: 'profile.writeLocal' }); }
}
function readJSON(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch { return fallback; }
}
const readLocal = () => readJSON(LOCAL_KEY, null);
const readUnsent = () => { const u = readJSON(UNSENT_KEY, {}); return u && typeof u === 'object' && !Array.isArray(u) ? u : {}; };
function writeUnsent(u) {
  try { if (Object.keys(u).length) localStorage.setItem(UNSENT_KEY, JSON.stringify(u)); else localStorage.removeItem(UNSENT_KEY); } catch { /* best-effort */ }
}
const readOwner = () => { try { return localStorage.getItem(OWNER_KEY); } catch { return null; } };
const writeOwner = (sid) => { try { localStorage.setItem(OWNER_KEY, sid); } catch { /* best-effort */ } };

let tokenSeq = 0;
function markUnsent(keys) {
  const u = readUnsent();
  for (const k of keys || []) u[k] = `${Date.now()}-${++tokenSeq}`;
  writeUnsent(u);
}
// Clear exactly the markers that were current when the send started: a field
// changed again while the write was in flight keeps its newer marker.
function clearSent(snapshot) {
  const u = readUnsent();
  for (const [k, t] of Object.entries(snapshot)) if (u[k] === t) delete u[k];
  writeUnsent(u);
}

/** Fields this device changed that the account has not confirmed. */
export function profileUnsentKeys() { return Object.keys(readUnsent()); }

/**
 * The account row with this device's unsent fields laid over it. A field the
 * device removed is removed. Pure, so the rule is testable without a network.
 */
export function mergeUnsentProfile(cloud, local, unsentKeys) {
  const next = { ...(cloud || {}) };
  for (const k of unsentKeys || []) {
    if (local && Object.prototype.hasOwnProperty.call(local, k)) next[k] = local[k];
    else delete next[k];
  }
  return next;
}

async function upsertRow(sid, data) {
  const { error } = await supabase
    .from('studio_settings')
    .upsert({ studio_id: sid, data }, { onConflict: 'studio_id' });
  if (error) throw error;
}

// The studio this session has reconciled with. Until then a save must not
// upsert this device's whole (possibly stale) copy over the account's.
let reconciledSid = null;
// One profile write at a time, so an older copy can never land after a newer one.
let chain = Promise.resolve();
const serial = (fn) => { const run = chain.then(fn, fn); chain = run.catch(() => {}); return run; };

/**
 * Reconcile this device with the account: take the account row, lay this
 * device's unsent fields over it, push the result if anything was unsent, and
 * keep it locally. Called on sign-in, token refresh and reconnect.
 * Returns { ok, profile, pushed, reason }.
 */
export function syncProfile() {
  return serial(async () => {
    if (!isSupabaseConfigured() || !supabase) return { ok: false, reason: 'unconfigured', profile: readLocal() };
    const sid = await currentStudioId();
    if (!sid) return { ok: false, reason: 'signed-out', profile: readLocal() };
    let cloud;
    try {
      const { data, error } = await supabase.from('studio_settings').select('data').eq('studio_id', sid).maybeSingle();
      if (error) throw error;
      cloud = (data && data.data) || null;
    } catch (e) {
      captureError(e, { where: 'profile.syncProfile.read', onLine: onLine() });
      return { ok: false, reason: 'read-failed', profile: readLocal() };
    }
    const local = readLocal();
    const unsent = readUnsent();
    const owner = readOwner();
    // Unsent changes belong to the account this copy last agreed with. Never
    // push another account's profile into this one (a shared device).
    if (owner && owner !== sid) {
      writeUnsent({});
      const next = cloud || local;
      if (next) writeLocal(next);
      writeOwner(sid);
      reconciledSid = sid;
      return { ok: true, profile: next, pushed: false };
    }
    const keys = Object.keys(unsent);
    const hasLocal = !!(local && Object.keys(local).length);
    // No row yet: this device's copy is the account's first ("try first, sign in to keep").
    const next = cloud ? mergeUnsentProfile(cloud, local, keys) : (hasLocal ? local : null);
    const push = cloud ? keys.length > 0 : hasLocal;
    if (next) writeLocal(next);
    if (push) {
      try { await upsertRow(sid, next); } catch (e) {
        captureError(e, { where: 'profile.syncProfile.write', onLine: onLine() });
        return { ok: false, reason: 'write-failed', profile: next };
      }
      clearSent(unsent);
    }
    writeOwner(sid);
    reconciledSid = sid;
    return { ok: true, profile: next, pushed: push };
  });
}

/**
 * Load the studio profile from the cloud. Returns the stored profile object, or
 * null when the cloud has none (unconfigured, signed out, or no row yet) — the
 * caller then falls back to / keeps its localStorage copy.
 * NOTE: replaces the local copy wholesale. The host shell uses syncProfile,
 * which keeps this device's unsent fields.
 */
export async function loadProfile() {
  if (!isSupabaseConfigured() || !supabase) return null;
  const sid = await currentStudioId();
  if (!sid) return null;
  try {
    const { data, error } = await supabase
      .from('studio_settings')
      .select('data')
      .eq('studio_id', sid)
      .maybeSingle();
    if (error) throw error;
    if (data?.data) { writeLocal(data.data); return data.data; }
    return null;
  } catch (e) {
    captureError(e, { where: 'profile.loadProfile', onLine: onLine() });
    return null;
  }
}

/**
 * Save the studio profile (single row per studio). Writes local immediately and
 * marks `changed` (default: every field) unsent until the account confirms it.
 * Signed out or offline, the marker stays and syncProfile sends it later.
 * Returns { ok, reason }.
 */
export async function saveProfile(profile, { changed } = {}) {
  writeLocal(profile);
  markUnsent(changed || Object.keys(profile || {}));
  if (!isSupabaseConfigured() || !supabase) return { ok: false, reason: 'unconfigured' };
  const sid = await currentStudioId();
  if (!sid) return { ok: false, reason: 'signed-out' };
  if (reconciledSid !== sid) {
    const r = await syncProfile();
    return { ok: !!r.ok && profileUnsentKeys().length === 0, reason: r.reason };
  }
  return serial(async () => {
    const snapshot = readUnsent();
    const current = readLocal() || profile;
    try { await upsertRow(sid, current); } catch (e) {
      captureError(e, { where: 'profile.saveProfile', onLine: onLine() });
      return { ok: false, reason: 'write-failed' };
    }
    clearSent(snapshot);
    writeOwner(sid);
    return { ok: true };
  });
}

/** Retry unsent profile fields when the connection comes back. Returns the remover. */
export function installProfileOnlineFlush(onResult) {
  if (typeof window === 'undefined' || !window.addEventListener) return () => {};
  const handler = () => {
    if (!profileUnsentKeys().length) return;
    syncProfile().then((r) => { if (typeof onResult === 'function') onResult(r); }).catch(() => {});
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

/** Test seam: forget which studio this session reconciled with. */
export function __resetProfileSyncForTests() { reconciledSid = null; chain = Promise.resolve(); }
