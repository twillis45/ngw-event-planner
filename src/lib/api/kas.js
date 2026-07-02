// ─── KAS knowledge-store API client (KEP-3 Bundle B) ──────────────────────────
// Talks to the admin-gated FastAPI KAS store (/api/admin/kas/{kind}). GRACEFUL
// DEGRADATION: when REACT_APP_API_BASE_URL is unset, isKasApiConfigured() is false and the
// KAS stores fall back to localStorage — nothing here throws into the UI. The server is a
// dumb store (list + optimistic-concurrency upsert); all merge/lifecycle logic lives client
// side. Admin-only on the server (require_admin). Mirrors the KCR client.
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const BASE = process.env.REACT_APP_API_BASE_URL;
const TOKEN = process.env.REACT_APP_PLANNER_TOKEN; // dev fallback only

export const KAS_KINDS = ['observation', 'evidence', 'finding', 'override', 'campaign'];
export const isKasApiConfigured = () => Boolean(BASE);

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

// List records of a kind. Array on success, null on any failure (store falls back to cache).
export async function fetchKasRecords(kind) {
  if (!BASE || !KAS_KINDS.includes(kind)) return null;
  try {
    const res = await fetch(`${BASE}/api/admin/kas/${kind}`, { headers: await authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// Batch upsert. Returns `{upserted, conflicts:[{id, serverUpdatedAt}]}` on success (a stale
// write lands in `conflicts`, not silently applied), or null on failure. NEVER throws.
export async function upsertKasRecords(kind, records) {
  if (!BASE || !KAS_KINDS.includes(kind) || !Array.isArray(records) || !records.length) return null;
  try {
    const res = await fetch(`${BASE}/api/admin/kas/${kind}`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ records }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
