// ─── Admin / Support API client ───────────────────────────────────────────────
// Talks to the FastAPI backend's /api/admin/* routes. Auth is the signed-in
// Supabase session (Bearer JWT); the backend gates on app_metadata.role. The
// legacy X-Planner-Token is forwarded only as a local-dev fallback (the backend
// honors it as admin ONLY when ALLOW_DEV_TOKEN=true).
//
// Honesty note: this backend only sees server-synced data. Anything that lives
// solely in a user's browser (localStorage) is invisible here — surfaces built on
// these calls must say so.
import { supabase, isSupabaseConfigured } from './supabaseClient';

const BASE  = process.env.REACT_APP_API_BASE_URL;
const TOKEN = process.env.REACT_APP_PLANNER_TOKEN; // local-dev fallback only

export const isAdminApiConfigured = () => Boolean(BASE);

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

const req = async (method, path, body) => {
  if (!BASE) throw new Error('Admin API not configured (REACT_APP_API_BASE_URL unset)');
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try { detail = (await res.json())?.detail || detail; } catch { /* ignore */ }
    const err = new Error(`Admin API ${method} ${path} → ${detail}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
};

export const adminApi = {
  whoami:  ()             => req('GET', '/api/admin/whoami'),
  // S1 — Triage ("who needs me right now")
  triage:  ()             => req('GET', '/api/admin/triage'),
  audit:   (limit = 100)  => req('GET', `/api/admin/audit?limit=${limit}`),
  // A3 — User Lookup + Support Notes
  users:   (q = '')       => req('GET', `/api/admin/users?q=${encodeURIComponent(q)}`),
  user:    (id)           => req('GET', `/api/admin/users/${encodeURIComponent(id)}`),
  notes:   (id)           => req('GET', `/api/admin/users/${encodeURIComponent(id)}/notes`),
  addNote: (id, body)     => req('POST', `/api/admin/users/${encodeURIComponent(id)}/notes`, { body }),
  // S2 — Workspace / Event diagnostics
  workspaces: (q = '')    => req('GET', `/api/admin/workspaces?q=${encodeURIComponent(q)}`),
  workspace:  (id)        => req('GET', `/api/admin/workspaces/${encodeURIComponent(id)}`),
  // S3 — Invitation ops
  invitations:      (scope = 'pending') => req('GET', `/api/admin/invitations?scope=${encodeURIComponent(scope)}`),
  revokeInvitation: (id)  => req('POST', `/api/admin/invitations/${encodeURIComponent(id)}/revoke`),
  // A3-err — Error feed
  errors: (sinceHours = 168, source = '') =>
    req('GET', `/api/admin/errors?since_hours=${sinceHours}${source ? `&source=${encodeURIComponent(source)}` : ''}`),
};
