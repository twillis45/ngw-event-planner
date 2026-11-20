// ─── Helper link API client (owner-approved 11/15/2026, free) ─────────────────
// Talks to the FastAPI service at REACT_APP_API_BASE_URL. Mirrors
// api/vendorBrief.js: results name their failure, and nothing here throws into
// the UI except submitHelperAnswer, which throws ON PURPOSE so the helper's
// page shows an honest retry instead of a fake "sent".
//
// Planner endpoints (the signed-in Supabase session):
//   POST /api/events/{id}/helper-links          → mint-or-reuse a helper's code
//   GET  /api/events/{id}/helper-confirmations  → the answers, newest first
//   POST /api/events/{id}/helper-links/email    → the app emails the helper their job
// Public endpoints (the unguessable code is the only credential):
//   GET  /api/public/helper/{code}              → this helper's jobs
//   POST /api/public/helper/{code}/answer       → "I've got it" / "I can't"
//
// NEVER PASS-GATED. The server never answers 402 here; if it ever did, it
// reads as a plain failure, not as a reason to open the pass sheet.
//
// The ONE planner identity (lib/apiAuth): the signed-in Supabase session. No
// dev-token fallback of its own — authHeadersDoesNotGrowAgain.test.js holds the
// line at nine copies, and this is not a tenth.
import { authHeaders } from '../apiAuth';
import { appEmailWords } from '../appEmail';

const BASE = process.env.REACT_APP_API_BASE_URL;

export const isHelperLinkApiConfigured = () => Boolean(BASE);

// ── Planner: mint-or-reuse THE link for one helper ────────────────────────────
//   { ok: true,  code, helperKey }
//   { ok: false, kind: 'not-configured', status: null }
//   { ok: false, kind: 'signed-out',     status: 401 }
//   { ok: false, kind: 'not-found',      status: 404 } — the server's copy of the
//                                                       event has no job for them
//   { ok: false, kind: 'failed',         status }
//   { ok: false, kind: 'network',        status: null } — after ONE retry
export async function mintHelperLinkResult(eventId, helperName) {
  if (!BASE || !eventId || !helperName) return { ok: false, kind: 'not-configured', status: null };
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(`${BASE}/api/events/${encodeURIComponent(eventId)}/helper-links`, {
        method:  'POST',
        headers: await authHeaders(),
        body:    JSON.stringify({ helper_name: helperName }),
      });
    } catch {
      if (attempt < 1) continue;
      return { ok: false, kind: 'network', status: null };
    }
    const status = res.status;
    if (!res.ok) {
      if (status === 401) return { ok: false, kind: 'signed-out', status };
      if (status === 404) return { ok: false, kind: 'not-found', status };
      return { ok: false, kind: 'failed', status };
    }
    try {
      const data = await res.json();
      if (data && data.ok && data.code) return { ok: true, code: data.code, helperKey: data.helper_key || null };
    } catch { /* unreadable 2xx is still not a code */ }
    return { ok: false, kind: 'failed', status };
  }
}

// ── Planner: the app emails a helper their job (owner, 11/20/2026) ────────────
// The server finds the helper's saved address, sends the ask in the invite's
// frame and records it for the Messages view. Never throws.
//   { ok: true,  status: 'accepted' }            — Resend accepted it
//   { ok: false, kind: 'failed',     status }     — the server tried and Resend refused
//   { ok: false, kind: 'signed-out', status: 401 }
//   { ok: false, kind: 'refused',    status: 403 }  — not this event's host or co-host
//   { ok: false, kind: 'not-found',  status: 404 }  — the saved plan has no job for them
//   { ok: false, kind: 'unsaved',    status: 409 }
//   { ok: false, kind: 'stopped',    status: 410 }  — they asked for no emails about this event
//   { ok: false, kind: 'no-email',   status: 422 }
//   { ok: false, kind: 'capped',     status: 429 }  — the event's emails for today are used
//   { ok: false, kind: 'network' | 'not-configured', status: null }
// No retry: a second POST could send a second email.
const EMAIL_KINDS = { 401: 'signed-out', 403: 'refused', 404: 'not-found', 409: 'unsaved', 410: 'stopped', 422: 'no-email', 429: 'capped' };
export async function emailHelperJob(eventId, helperName) {
  if (!BASE || !eventId || !helperName) return { ok: false, kind: 'not-configured', status: null };
  let res;
  try {
    res = await fetch(`${BASE}/api/events/${encodeURIComponent(eventId)}/helper-links/email`, {
      method:  'POST',
      headers: await authHeaders(),
      body:    JSON.stringify({ helper_name: helperName }),
    });
  } catch {
    return { ok: false, kind: 'network', status: null };
  }
  const status = res.status;
  if (!res.ok) return { ok: false, kind: EMAIL_KINDS[status] || 'failed', status };
  try {
    const data = await res.json();
    if (data && data.ok === true && data.status === 'accepted') return { ok: true, status: 'accepted' };
  } catch { /* an unreadable answer is not an acceptance */ }
  return { ok: false, kind: 'failed', status };
}

/** What the helper email button and its line say (lib/appEmail, shared with the RSVP nudge). */
export const helperEmailWords = (first, r) => {
  const who = String(first || '').trim() || 'them';
  return appEmailWords(`Email ${who} their job`, who, r);
};

// ── Public: this helper's jobs, or null (not configured / not found / error) ──
export async function fetchPublicHelperLink(code) {
  if (!BASE || !code) return null;
  try {
    const res = await fetch(`${BASE}/api/public/helper/${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.ok && data.helper ? data.helper : null;
  } catch {
    return null;
  }
}

// ── Public: the helper's answer. THROWS on failure (mirrors submitRsvp). ──────
export async function submitHelperAnswer(code, payload) {
  if (!BASE) throw new Error('Helper link API not configured');
  const res = await fetch(`${BASE}/api/public/helper/${encodeURIComponent(code)}/answer`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error((err && typeof err.detail === 'string' && err.detail) || `submitHelperAnswer ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

// ── Planner: the answers (newest first), or [] on any failure ────────────────
// No hasPlannerAuth() pre-check, unlike the vendor read-back: the shell calls
// this only for an event that has minted a helper link, and a mint needed the
// same credential — so this is never a request known in advance to 401.
export async function fetchHelperConfirmations(eventId) {
  if (!BASE || !eventId) return [];
  try {
    const res = await fetch(`${BASE}/api/events/${encodeURIComponent(eventId)}/helper-confirmations`, {
      headers: await authHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ── Idempotency key: stable per helper code (mirrors vendorBriefIdempotencyKey)
export function helperIdempotencyKey(code) {
  const storeKey = `ngw-helper-idemp-${code}`;
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
