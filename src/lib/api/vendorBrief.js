// ─── Vendor Brief link API client (Vendor Brief v2 Phase 1) ───────────────────
// Talks to the FastAPI service at REACT_APP_API_BASE_URL. Mirrors api/rsvp.js.
//
// GRACEFUL DEGRADATION: when the API is unset / unreachable / errors, callers
// fall back to the legacy frozen base64 snapshot URL — sharing a brief NEVER
// breaks because the backend is down. Nothing here throws into the UI.
//
// Planner endpoint (Supabase session / dev token):
//   POST /api/events/{id}/vendor-brief-links  → mint-or-reuse the active code
// Public endpoint (the unguessable code is the only credential):
//   GET  /api/public/vendor-brief/{code}      → resolve the CURRENT brief payload
//
// Phase 1 only: no confirmation submit, no revoke, no confirmation read-back.
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const BASE  = process.env.REACT_APP_API_BASE_URL;
const TOKEN = process.env.REACT_APP_PLANNER_TOKEN; // transition fallback only

export const isVendorBriefApiConfigured = () => Boolean(BASE);

// Planner auth headers — prefer the signed-in Supabase session, fall back to the
// shared dev token during the auth rollout. (Mirrors api/rsvp.js authHeaders.)
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

// ── Planner: mint-or-reuse the active brief code for a vendor ─────────────────
// Returns the short code string, or null when not configured / unauthorized /
// errored. NEVER throws — the caller falls back to the legacy base64 URL.
export async function mintVendorBriefLink(eventId, vendorId) {
  if (!BASE || !eventId || !vendorId) return null;
  try {
    const res = await fetch(`${BASE}/api/events/${encodeURIComponent(eventId)}/vendor-brief-links`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body:    JSON.stringify({ vendor_id: vendorId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.ok && data.code ? data.code : null;
  } catch {
    return null;
  }
}

// ── Public: resolve a brief code to the CURRENT brief payload ─────────────────
// Returns the brief object on success, or null if not configured / not found /
// errored. NEVER throws — the route falls back to legacy base64 decode.
export async function fetchPublicVendorBrief(code) {
  if (!BASE || !code) return null;
  try {
    const res = await fetch(`${BASE}/api/public/vendor-brief/${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.ok && data.brief ? data.brief : null;
  } catch {
    return null;
  }
}

// ── Public: submit a vendor confirmation (Phase 2A) ───────────────────────────
// THROWS on failure / non-2xx (mirrors submitRsvp) so the confirm block can show
// an honest retry state instead of a fake success. Idempotent on the key.
export async function submitVendorBriefConfirmation(code, payload) {
  if (!BASE) throw new Error('Vendor brief API not configured');
  const res = await fetch(`${BASE}/api/public/vendor-brief/${encodeURIComponent(code)}/confirm`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err.detail || `submitVendorBriefConfirmation ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return res.json(); // { ok, submitted_at }
}

// ── Planner: confirmation read-back (display only) ────────────────────────────
// Returns the array of confirmation rows (newest first), or [] when not
// configured / unauthorized / errored. NEVER throws — the cockpit simply shows
// nothing, exactly like an event with no confirmations.
export async function fetchVendorConfirmations(eventId) {
  if (!BASE || !eventId) return [];
  try {
    const res = await fetch(`${BASE}/api/events/${encodeURIComponent(eventId)}/vendor-confirmations`, {
      headers: await authHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ── Idempotency key: stable per brief code ────────────────────────────────────
// Mirrors rsvpIdempotencyKey: minted once per code, persisted, so a retry /
// reload / double-tap UPDATES the same server row instead of duplicating. A
// vendor changing their answer reuses the key and flips the row in place.
export function vendorBriefIdempotencyKey(code) {
  const storeKey = `ngw-vbrief-idemp-${code}`;
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

// ── Token shape discrimination ────────────────────────────────────────────────
// A legacy link carries the whole base64-encoded JSON payload (hundreds to
// thousands of chars). A tokenized link carries a ~22-char urlsafe random code.
// A short token can never be a valid legacy payload (a minimal brief JSON is far
// longer than 64 base64 chars), so length is a safe discriminator.
export function looksLikeBriefCode(token) {
  return Boolean(token) && token.length <= 64;
}
