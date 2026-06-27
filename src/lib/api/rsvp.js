// ─── Guest RSVP API client (FastAPI backend) ──────────────────────────────────
// Talks to the FastAPI service at REACT_APP_API_BASE_URL.
//
// GRACEFUL DEGRADATION: when REACT_APP_API_BASE_URL is unset (dev / demo / offline),
// isRsvpApiConfigured() is false and the app keeps using the localStorage outbox
// (`ngw-rsvp-queue-${id}`) exactly as before. Nothing here throws into the UI; the
// callers decide what to do with a failure.
//
// Public endpoints (no auth — the rsvp_code is the only credential):
//   GET  /api/public/invite/{code}  → resolve an event to PUBLIC display fields
//   POST /api/public/rsvp/{code}    → submit a guest RSVP (idempotent)
// Planner endpoint (Supabase session / dev token):
//   GET  /api/events/{id}/rsvps     → host read-back
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const BASE  = process.env.REACT_APP_API_BASE_URL;
const TOKEN = process.env.REACT_APP_PLANNER_TOKEN; // transition fallback only

export const isRsvpApiConfigured = () => Boolean(BASE);

// Planner auth headers — prefer the signed-in Supabase session, fall back to the
// shared dev token during the auth rollout. (Mirrors commApi.authHeaders.)
async function authHeaders() {
  const headers = {};
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch { /* fall through to token */ }
  }
  if (TOKEN) headers['X-Planner-Token'] = TOKEN;
  return headers;
}

// ── Public: resolve an invite by code ─────────────────────────────────────────
// Returns the PUBLIC event object on success, or null if not configured / not
// found / errored. NEVER throws — the caller falls back to local events.find.
export async function fetchPublicInvite(code) {
  if (!BASE || !code) return null;
  try {
    const res = await fetch(`${BASE}/api/public/invite/${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.ok && data.event ? data.event : null;
  } catch {
    return null;
  }
}

// ── Public: submit a guest RSVP (idempotent) ──────────────────────────────────
// Throws on failure / non-2xx so the caller can keep the localStorage outbox and
// show an honest "saved — we'll send when you're back online" state. The
// idempotency_key makes a later replay safe (no duplicate row).
export async function submitRsvp(code, payload) {
  if (!BASE) throw new Error('RSVP API not configured');
  const res = await fetch(`${BASE}/api/public/rsvp/${encodeURIComponent(code)}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err.detail || `submitRsvp ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return res.json(); // { ok, submitted_at }
}

// ── Planner: host read-back ───────────────────────────────────────────────────
// Returns the array of submissions, or [] when not configured / errored. NEVER
// throws — the host UI keeps the existing local-queue merge for same-browser dev.
export async function fetchEventRsvps(eventId) {
  if (!BASE || !eventId) return [];
  try {
    const res = await fetch(`${BASE}/api/events/${encodeURIComponent(eventId)}/rsvps`, {
      headers: await authHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ── Idempotency key: stable per (event, code) form instance ───────────────────
// Generated ONCE and persisted in localStorage so a retry / reload / double-tap
// re-uses the SAME key → the backend upserts the same row instead of duplicating.
export function rsvpIdempotencyKey(eventKey) {
  const storeKey = `ngw-rsvp-idemp-${eventKey}`;
  try {
    const existing = localStorage.getItem(storeKey);
    if (existing) return existing;
  } catch {}
  let key;
  try { key = (crypto && crypto.randomUUID) ? crypto.randomUUID() : null; } catch { key = null; }
  if (!key) key = `idk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try { localStorage.setItem(storeKey, key); } catch {}
  return key;
}

// ── Offline outbox flush ──────────────────────────────────────────────────────
// Re-POST queued RSVPs (saved while offline / when the backend was unreachable) the
// next time we're online. Idempotency makes replay safe. Bounded backoff: each
// queued item carries an attempt count; we stop retrying an item after MAX_ATTEMPTS
// so a permanently-bad item can't loop forever. Items that still fail stay queued.
const OUTBOX_PREFIX = 'ngw-rsvp-queue-';
const MAX_ATTEMPTS = 5;
// Outbox PII TTL. Outbox entries hold free-text health/allergy notes; never retain
// that on the device indefinitely. On every flush we drop any entry older than this,
// delivered or not, so stale PII can't linger on a guest's phone. 7 days is well past
// any reasonable offline window for a one-time RSVP.
const OUTBOX_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Drop entries older than the TTL from a queue array. Entries carry `submittedAt`
// (ms epoch, set by the RSVP submit handler). An entry with no/invalid timestamp is
// kept (it can't be aged out safely), but every well-formed write has one.
export function purgeStaleOutbox(queue, now = Date.now()) {
  if (!Array.isArray(queue)) return [];
  return queue.filter((e) => {
    const ts = Number(e && e.submittedAt);
    if (!ts || Number.isNaN(ts)) return true; // can't age it out — keep
    return (now - ts) < OUTBOX_TTL_MS;
  });
}

export async function flushRsvpOutbox(eventId, code) {
  if (!BASE || !eventId || !code) return { flushed: 0, remaining: 0 };
  const key = `${OUTBOX_PREFIX}${eventId}`;
  let queue;
  try { queue = JSON.parse(localStorage.getItem(key) || '[]'); } catch { return { flushed: 0, remaining: 0 }; }
  if (!Array.isArray(queue) || !queue.length) return { flushed: 0, remaining: 0 };
  // Purge stale PII first — anything past the TTL is dropped before we even try to send.
  queue = purgeStaleOutbox(queue);
  if (!queue.length) { try { localStorage.removeItem(key); } catch {} return { flushed: 0, remaining: 0 }; }

  let flushed = 0;
  const remaining = [];
  for (const item of queue) {
    const attempts = Number(item._attempts || 0);
    if (attempts >= MAX_ATTEMPTS) { remaining.push(item); continue; } // give up; keep for inspection
    const idk = item.idempotencyKey || rsvpIdempotencyKey(`${eventId}:${code}:queued`);
    try {
      await submitRsvp(code, {
        idempotency_key: idk,
        name:           item.name,
        rsvp:           item.rsvp,
        meal:           item.meal,
        needs:          item.needs,
        plus_one:       item.plusOne,
        plus_one_meal:  item.plusOneMeal,
        plus_one_needs: item.plusOneNeeds,
        kids:           item.kids,
        note:           item.note,
      });
      flushed++;
    } catch {
      remaining.push({ ...item, idempotencyKey: idk, _attempts: attempts + 1 });
    }
  }
  try {
    if (remaining.length) localStorage.setItem(key, JSON.stringify(remaining));
    else localStorage.removeItem(key);
  } catch {}
  return { flushed, remaining: remaining.length };
}
