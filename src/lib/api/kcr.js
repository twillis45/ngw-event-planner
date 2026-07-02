// ─── KCR server store API client (KCR-4) ─────────────────────────────────────
// Talks to the admin-gated FastAPI KCR store. GRACEFUL DEGRADATION: when
// REACT_APP_API_BASE_URL is unset (dev/offline) isKcrApiConfigured() is false and the
// kcrStore falls back to localStorage — nothing here throws into the UI. The server is
// a dumb store (list + authoritative upsert); the progress-preserving merge lives in
// kcrStore.js (one JS implementation). Admin-only on the server (require_admin).
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const BASE  = process.env.REACT_APP_API_BASE_URL;
const TOKEN = process.env.REACT_APP_PLANNER_TOKEN; // dev fallback only

export const isKcrApiConfigured = () => Boolean(BASE);

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch { /* fall through to token */ }
  }
  if (TOKEN) headers['X-Planner-Token'] = TOKEN;
  return headers;
}

// List all KCRs (the full objects). Returns an array on success, or null on any
// failure so the store can fall back to the local cache. NEVER throws.
export async function fetchKCRs() {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}/api/admin/kcrs`, { headers: await authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// Authoritative batch upsert (keyed by id, incoming wins). Returns true on success,
// false on any failure (the store keeps the local cache either way). NEVER throws.
export async function upsertKCRsRemote(kcrs) {
  if (!BASE || !Array.isArray(kcrs) || !kcrs.length) return false;
  try {
    const res = await fetch(`${BASE}/api/admin/kcrs`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ kcrs }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
