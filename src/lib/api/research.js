// ─── Research execution API client (KRE-2) ────────────────────────────────────
// Talks to /api/admin/research/* (FastAPI, require_admin).
// Graceful degradation: when REACT_APP_API_BASE_URL is unset, all calls return null.
// The UI falls back to localStorage / in-browser simulate mode. Never throws into UI.
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const BASE  = process.env.REACT_APP_API_BASE_URL;
const TOKEN = process.env.REACT_APP_PLANNER_TOKEN; // dev fallback only

export const isResearchApiConfigured = () => Boolean(BASE);

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch { /* fall through */ }
  }
  if (TOKEN) headers['X-Planner-Token'] = TOKEN;
  return headers;
}

// Create a run and enqueue it. Returns { id, state, campaignId } or null.
export async function createResearchRun({ campaignId, playbookType, fieldPath, gapKind, blueprint, executionPlan, mode = 'simulate', priority = 'MED' }) {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}/api/admin/research/runs`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        campaign_id:    campaignId,
        playbook_type:  playbookType,
        field_path:     fieldPath,
        gap_kind:       gapKind,
        blueprint:      blueprint      || {},
        execution_plan: executionPlan  || {},
        mode,
        priority,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// Start a run (synchronous execution on server). Returns run result or null.
export async function startResearchRun(runId, injectedRecords = {}) {
  if (!BASE || !runId) return null;
  try {
    const res = await fetch(`${BASE}/api/admin/research/runs/${runId}/start`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ injected_records: injectedRecords }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// List runs. Returns array or null (fallback to local state).
export async function listResearchRuns(limit = 50) {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}/api/admin/research/runs?limit=${limit}`, { headers: await authHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// Get a single run + provider logs.
export async function getResearchRun(runId) {
  if (!BASE || !runId) return null;
  try {
    const res = await fetch(`${BASE}/api/admin/research/runs/${runId}`, { headers: await authHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// Retry a failed provider on an existing run.
export async function retryProvider(runId, providerId) {
  if (!BASE || !runId || !providerId) return null;
  try {
    const res = await fetch(`${BASE}/api/admin/research/runs/${runId}/providers/${providerId}/retry`, {
      method: 'POST',
      headers: await authHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// Cancel a queued or running run.
export async function cancelResearchRun(runId) {
  if (!BASE || !runId) return null;
  try {
    const res = await fetch(`${BASE}/api/admin/research/runs/${runId}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// List server-produced observations (Evidence Inbox). Null = localStorage fallback.
export async function fetchServerObservations({ runId, fieldPath, status, limit = 200 } = {}) {
  if (!BASE) return null;
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (runId)     params.set('run_id', runId);
    if (fieldPath) params.set('field_path', fieldPath);
    if (status)    params.set('status', status);
    const res = await fetch(`${BASE}/api/admin/research/observations?${params}`, { headers: await authHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// Update observation status (accept/reject/merge/flag).
export async function updateObservationStatus(obsId, newStatus) {
  if (!BASE || !obsId) return null;
  try {
    const res = await fetch(`${BASE}/api/admin/research/observations/${obsId}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// List server-produced evidence records.
export async function fetchServerEvidence({ runId, fieldPath, limit = 200 } = {}) {
  if (!BASE) return null;
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (runId)     params.set('run_id', runId);
    if (fieldPath) params.set('field_path', fieldPath);
    const res = await fetch(`${BASE}/api/admin/research/evidence?${params}`, { headers: await authHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// List server-produced findings (all draft — KCR lifecycle is client-side).
export async function fetchServerFindings({ runId, fieldPath, status, limit = 100 } = {}) {
  if (!BASE) return null;
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (runId)     params.set('run_id', runId);
    if (fieldPath) params.set('field_path', fieldPath);
    if (status)    params.set('status', status);
    const res = await fetch(`${BASE}/api/admin/research/findings?${params}`, { headers: await authHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}
