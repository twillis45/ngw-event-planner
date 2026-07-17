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

// ─── Streaming (B3) ─────────────────────────────────────────────────────────
//
// THE INVARIANT: accumulate Claude's SSE back into the SAME { content, stop_reason }
// a buffered turn returns. Streaming is a TRANSPORT concern and nothing else — the
// tool-calling loop, the tool results, and the grounding check downstream are byte-
// identical either way. That's what keeps this from becoming a second, subtly
// different code path (and it's test-locked in orchestratorStream.test.js).
//
// Wire shapes we accumulate (Anthropic Messages streaming):
//   content_block_start  → the block's identity ({type:'text'} | {type:'tool_use',id,name})
//   content_block_delta  → text_delta.text (append) | input_json_delta.partial_json (append)
//   content_block_stop   → parse a tool_use block's accumulated JSON into .input
//   message_delta        → delta.stop_reason
// onDelta(textChunk) fires ONLY for text — the host reads prose, never raw tool JSON.
export function accumulateSSE(sseText, onDelta) {
  const blocks = [];
  const partials = [];        // index → accumulated input_json string (tool_use only)
  let stopReason = null;
  for (const raw of String(sseText || '').split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    let ev;
    try { ev = JSON.parse(payload); } catch { continue; }  // a split frame: skip, never guess
    if (ev.type === 'error') throw new OrchestratorUnavailable(`stream error: ${ev.error?.type || ev.error || 'unknown'}`);
    const i = ev.index;
    if (ev.type === 'content_block_start') {
      const b = ev.content_block || {};
      blocks[i] = b.type === 'tool_use'
        ? { type: 'tool_use', id: b.id, name: b.name, input: {} }
        : { type: 'text', text: b.text || '' };
      partials[i] = '';
    } else if (ev.type === 'content_block_delta') {
      const d = ev.delta || {};
      if (d.type === 'text_delta') {
        if (!blocks[i]) blocks[i] = { type: 'text', text: '' };
        blocks[i].text += d.text || '';
        if (typeof onDelta === 'function' && d.text) { try { onDelta(d.text); } catch { /* a render throw must not kill the stream */ } }
      } else if (d.type === 'input_json_delta') {
        partials[i] = (partials[i] || '') + (d.partial_json || '');
      }
    } else if (ev.type === 'content_block_stop') {
      if (blocks[i] && blocks[i].type === 'tool_use' && partials[i]) {
        // Empty-input tools (ours take none) stream '' or '{}' — both mean {}.
        try { blocks[i].input = JSON.parse(partials[i]); } catch { blocks[i].input = {}; }
      }
    } else if (ev.type === 'message_delta') {
      stopReason = (ev.delta && ev.delta.stop_reason) || stopReason;
    }
  }
  return { ok: true, content: blocks.filter(Boolean), stop_reason: stopReason };
}

// A streaming transport for runOrchestration. Same contract as the buffered one —
// returns { content, stop_reason } — so the loop cannot tell the difference; the
// only addition is onDelta, which fires as the host's prose arrives.
export function orchestratorStreamTransport({ base = BASE, fetchImpl = fetch, onDelta } = {}) {
  return async ({ messages, tools }) => {
    if (!base) throw new OrchestratorUnavailable('orchestrator api not configured');
    let res;
    try {
      res = await fetchImpl(`${base}/api/ai/orchestrate`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ messages, tools, stream: true }),
      });
    } catch {
      throw new OrchestratorUnavailable('network error');
    }
    if (!res.ok) throw new OrchestratorUnavailable(`orchestrator ${res.status}`);
    if (!res.body || typeof res.body.getReader !== 'function') {
      // No streaming body (older browser, a proxy that buffered, a test stub):
      // fall back to the whole text at once. Same accumulator, same result — the
      // host loses the typing effect, never the answer.
      return accumulateSSE(await res.text(), onDelta);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let carry = '';   // frames can split across chunks; only parse whole ones
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      carry += decoder.decode(value, { stream: true });
      const cut = carry.lastIndexOf('\n\n');
      if (cut === -1) continue;
      const whole = carry.slice(0, cut + 2);
      carry = carry.slice(cut + 2);
      buf += whole;
      accumulateSSE(whole, onDelta);   // fire deltas live…
    }
    buf += carry;
    // …then accumulate the FULL stream once for the authoritative shape, so a
    // frame split across chunk boundaries can never corrupt the final content[].
    return accumulateSSE(buf, null);
  };
}
