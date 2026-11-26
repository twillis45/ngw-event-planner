// ─── Guest questions + "opened your invite" API client (11/16/2026, free) ─────
// Talks to the FastAPI service at REACT_APP_API_BASE_URL. Mirrors
// api/helperLink.js and api/rsvp.js. Server: backend/app/routers/guest_messages.py.
//
// Guest endpoints (no sign-in; the credential is the invite code plus the
// device key this browser minted for its RSVP — pass rsvpIdempotencyKey's
// value as guestKey):
//   POST /api/public/questions/{code}/mine     → her own thread
//   POST /api/public/questions/{code}/ask      → ask (opens the thread)
//   POST /api/public/questions/{code}/email    → email + explicit opt-in
//   POST /api/public/questions/{code}/delete   → delete her own thread
//   POST /api/public/invite/{code}/opened      → the invite was opened
// Host endpoints (the signed-in Supabase session):
//   GET  /api/events/{id}/guest-threads              → inbox, unanswered first
//   GET  /api/events/{id}/guest-threads/{tid}        → one thread + messages
//   POST /api/events/{id}/guest-threads/{tid}/reply  → reply
//   POST /api/events/{id}/guest-threads/{tid}/block  → block / unblock
//   GET  /api/events/{id}/invite-opens               → opened times + daily totals
//
// Writes THROW with e.status, so a page never says "Sent to your host" for a
// message the server refused. Fetches return a named result, so a refused
// request is never shown as an empty inbox. NEVER PASS-GATED: a 402 is a plain
// failure here, never a reason to open the pass sheet. The word is "opened",
// never "read" or "seen".
import { authHeaders, isSignedIn } from '../apiAuth';

const BASE = process.env.REACT_APP_API_BASE_URL;
const enc = encodeURIComponent;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const isGuestMessagesApiConfigured = () => Boolean(BASE);

async function throwingPost(url, body, headers) {
  if (!BASE) throw new Error('Guest messages API not configured');
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error((err && typeof err.detail === 'string' && err.detail) || `guestMessages ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

// 401 → signed-out, 403 → forbidden, 404 → not-found, else unavailable.
async function hostGet(path) {
  if (!BASE) return { ok: false, reason: 'not-configured' };
  if (!(await isSignedIn())) return { ok: false, reason: 'signed-out' };
  try {
    const res = await fetch(`${BASE}${path}`, { headers: await authHeaders() });
    if (res.status === 401) return { ok: false, reason: 'signed-out' };
    if (res.status === 403) return { ok: false, reason: 'forbidden' };
    if (res.status === 404) return { ok: false, reason: 'not-found' };
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

// ── Guest ──────────────────────────────────────────────────────────────────────
//   { ok: true, thread }        — her thread ({ guest_name, email, email_opt_in, closed, messages })
//   { ok: true, thread: null }  — none from this device yet
//   { ok: false, reason: 'not-configured' | 'unavailable' }
export async function fetchMyGuestThread(code, guestKey) {
  if (!BASE || !code || !guestKey) return { ok: false, reason: 'not-configured' };
  try {
    const res = await fetch(`${BASE}/api/public/questions/${enc(code)}/mine`, {
      method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ guest_key: guestKey }),
    });
    if (res.status === 404) return { ok: true, thread: null };
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const data = await res.json();
    return { ok: true, thread: (data && data.thread) || null };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

// → { ok, thread }. Throws: 403 closed, 404 bad code, 422 too long / not plain text, 429 a cap.
export function askHost(code, { guestKey, name, body }) {
  return throwingPost(`${BASE}/api/public/questions/${enc(code)}/ask`,
    { guest_key: guestKey, name, body }, JSON_HEADERS);
}

// Opt-in is only ever what the guest ticked: it defaults to false.
export function setGuestEmail(code, { guestKey, email, emailOptIn = false }) {
  return throwingPost(`${BASE}/api/public/questions/${enc(code)}/email`,
    { guest_key: guestKey, email: email || null, email_opt_in: Boolean(emailOptIn) }, JSON_HEADERS);
}

// → { ok: true, deleted: true }, or { ok: true, deleted: false } when nothing
// was there (404). Throws on any other failure.
export async function deleteMyGuestThread(code, guestKey) {
  try {
    return await throwingPost(`${BASE}/api/public/questions/${enc(code)}/delete`, { guest_key: guestKey }, JSON_HEADERS);
  } catch (e) {
    if (e.status === 404) return { ok: true, deleted: false };
    throw e;
  }
}

// Fire-and-forget from the invite page on load: true when the server took it,
// false otherwise. Never throws and never retries. guestKey only when this
// device already has one (existingRsvpKey); the server never makes an identity
// from it.
export async function recordInviteOpened(code, { deviceId, guestKey } = {}) {
  if (!BASE || !code || !deviceId) return false;
  try {
    const body = guestKey ? { device_id: deviceId, guest_key: guestKey } : { device_id: deviceId };
    const res = await fetch(`${BASE}/api/public/invite/${enc(code)}/opened`, {
      method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// A random id for this browser, for the anonymous distinct-device count. The
// server stores only a salted hash of it.
export function inviteDeviceId() {
  const storeKey = 'ngw-invite-device';
  try {
    const existing = localStorage.getItem(storeKey);
    if (existing) return existing;
  } catch {}
  let id;
  try { id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : null; } catch { id = null; }
  if (!id) id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  try { localStorage.setItem(storeKey, id); } catch {}
  return id;
}

// ── Host ───────────────────────────────────────────────────────────────────────
//   { ok: true, rows } | { ok: false, reason: 'not-configured' | 'signed-out' | 'forbidden' | 'unavailable' }
export async function fetchGuestThreads(eventId) {
  const r = await hostGet(`/api/events/${enc(eventId)}/guest-threads`);
  if (!r.ok) return r.reason === 'not-found' ? { ok: false, reason: 'unavailable' } : r;
  return { ok: true, rows: Array.isArray(r.data) ? r.data : [] };
}

//   { ok: true, thread, messages } | { ok: false, reason: ... | 'not-found' }
export async function fetchGuestThread(eventId, threadId) {
  const r = await hostGet(`/api/events/${enc(eventId)}/guest-threads/${enc(threadId)}`);
  if (!r.ok) return r;
  return { ok: true, thread: r.data.thread, messages: r.data.messages || [] };
}

// → { ok, message }. Throws: 409 blocked, 422 too long / not plain text.
export async function replyToGuestThread(eventId, threadId, body) {
  if (!BASE) throw new Error('Guest messages API not configured');
  return throwingPost(`${BASE}/api/events/${enc(eventId)}/guest-threads/${enc(threadId)}/reply`,
    { body }, await authHeaders());
}

export async function blockGuestThread(eventId, threadId, blocked = true) {
  if (!BASE) throw new Error('Guest messages API not configured');
  return throwingPost(`${BASE}/api/events/${enc(eventId)}/guest-threads/${enc(threadId)}/block`,
    { blocked: Boolean(blocked) }, await authHeaders());
}

//   { ok: true, guests: [{ guest_name, last_opened_at, rsvp_id, thread_id }],
//     days: [{ day, opens, distinct_devices }] }
//   { ok: false, reason: ... }
export async function fetchInviteOpens(eventId) {
  const r = await hostGet(`/api/events/${enc(eventId)}/invite-opens`);
  if (!r.ok) return r.reason === 'not-found' ? { ok: false, reason: 'unavailable' } : r;
  return { ok: true, guests: r.data.guests || [], days: r.data.days || [] };
}
