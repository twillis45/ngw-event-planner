// ─── Orchestrator client — Sprint 2 · B3 ────────────────────────────────────
//
// The browser side of the grounded orchestrator: a transport that posts ONE
// Claude turn to the server relay (POST /api/ai/orchestrate) with the planner's
// Supabase token, plus a readiness check (is the server's key set?). Same
// base-URL + auth convention as aiProxy.js — Vite bakes process.env from the
// REACT_APP_* env, so this works in both shells.
//
// GRACEFUL BY CONSTRUCTION: an unset base, a 503 (no key), a network error, or a
// missing session all surface as `OrchestratorUnavailable` — the caller falls
// back to the deterministic askPlan answer, never a fabricated one. The LLM path
// is a bonus on top of a floor that always works.

import { supabase, isSupabaseConfigured } from './supabaseClient';

const BASE = process.env.REACT_APP_API_BASE_URL;

export class OrchestratorUnavailable extends Error {}

// Is the client even pointed at a backend? (Separate from the SERVER having the
// key — that's checkOrchestratorReady below.)
export function isOrchestratorApiConfigured() {
  return !!BASE;
}

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    if (typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
      const { data } = await supabase.auth.getSession();
      const token = data && data.session && data.session.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* no session — the route 401s and the caller falls back */ }
  return headers;
}

// GET /api/ai/status → is the server orchestrator configured (ANTHROPIC_API_KEY
// set)? Used to decide whether to OFFER the assistant escalation at all, so a
// host never sees an "ask the assistant" affordance that would only 503.
export async function checkOrchestratorReady({ base = BASE, fetchImpl = fetch } = {}) {
  if (!base) return false;
  try {
    const res = await fetchImpl(`${base}/api/ai/status`);
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.orchestrator;
  } catch {
    return false;
  }
}

// A transport for runOrchestration: posts one turn, returns Claude's response
// ({ content, stop_reason }). Throws OrchestratorUnavailable on any non-OK or
// network error so the caller degrades to the deterministic answer.
export function orchestratorTransport({ base = BASE, fetchImpl = fetch } = {}) {
  return async ({ messages, tools }) => {
    if (!base) throw new OrchestratorUnavailable('orchestrator api not configured');
    let res;
    try {
      res = await fetchImpl(`${base}/api/ai/orchestrate`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ messages, tools }),
      });
    } catch {
      throw new OrchestratorUnavailable('network error');
    }
    if (!res.ok) throw new OrchestratorUnavailable(`orchestrator ${res.status}`);
    return res.json();
  };
}
