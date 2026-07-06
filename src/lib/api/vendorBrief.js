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

// ── Token shape discrimination ────────────────────────────────────────────────
// A legacy link carries the whole base64-encoded JSON payload (hundreds to
// thousands of chars). A tokenized link carries a ~22-char urlsafe random code.
// A short token can never be a valid legacy payload (a minimal brief JSON is far
// longer than 64 base64 chars), so length is a safe discriminator.
export function looksLikeBriefCode(token) {
  return Boolean(token) && token.length <= 64;
}
