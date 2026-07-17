// Sprint 52B — frontend client for the secure server-side AI feature proxy.
// The provider API key lives ONLY on the backend (Render env, OPENAI_API_KEY).
// The browser POSTs {feature, prompt, context} to /api/ai/feature with the
// planner's Supabase token; the backend validates, builds a server-owned system
// prompt, calls the model, and returns only the text. No key reaches the client.
import { supabase, isSupabaseConfigured } from './supabaseClient';

const BASE = process.env.REACT_APP_API_BASE_URL;

// Must stay in sync with backend FEATURE_SYSTEM_PROMPTS (routers/ai.py). The
// Sprint 60D dedicated features (proposal/budget/schedule/readiness) share the
// same OPENAI_API_KEY — they only add tuned server-side system prompts.
export const AI_FEATURES = ['event_brief', 'vendor_followup', 'document_summary', 'checklist_help',
  'proposal', 'budget', 'schedule', 'readiness'];

export function isAiProxyConfigured() {
  return !!BASE;
}

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch { /* unauthenticated — backend will 401 */ }
  }
  return headers;
}

// callAiFeature(feature, prompt, context?) → { ok, text, usage } | throws Error.
// Honest failure surface: throws with a friendly message the UI can show.
export async function callAiFeature(feature, prompt, context = null) {
  if (!BASE) throw new Error('AI is not configured.');
  if (!AI_FEATURES.includes(feature)) throw new Error(`Unknown AI feature: ${feature}`);
  let res;
  try {
    res = await fetch(`${BASE}/api/ai/feature`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ feature, prompt, context }),
    });
  } catch {
    throw new Error('Could not reach the AI service. Please try again.');
  }
  if (res.status === 401) throw new Error('Please sign in to use AI features.');
  if (res.status === 429) throw new Error('You’re going a bit fast — please wait a moment and try again.');
  if (res.status === 503) throw new Error('AI is unavailable right now.');
  if (!res.ok) throw new Error('AI service error — please try again.');
  const data = await res.json().catch(() => null);
  if (!data?.ok) throw new Error('AI returned no result.');
  return data; // { ok, feature, text, usage }
}

// parseVendorReply(reply, vendorCtx?) → { ok, fields, confidence, truncated, disclaimer } | throws.
// `truncated` (2026-07-14 audit F8): true when the server read only the first
// part of a long reply — surface a plain note, never trim silently.
// `confidence` is diagnostic/logging only — never show it as a user-facing
// confidence claim (audit F4, 06_AI_GROUNDING).
// Agent Opportunity Audit P0: extracts structured vendor fields from a pasted
// vendor reply so the planner reviews a diff and applies it (never auto-write).
// Structured-JSON path (not callAiFeature, which returns text) — same auth,
// same honest failure surface. `fields` is keyed by src/lib/vendorReplyParse.js.
//
// PROVIDER (B4 migration, 2026-07-17): Sprint 2's D1 decision routes parse/classify
// to Claude Haiku; B4 built that path and left callers on the OpenAI default until
// the key was confirmed live. It is (GET /api/ai/status → orchestrator: true), so
// this is that migration. The server keeps the SAME prompt, JSON parse, allow-list
// filter, and response shape for both providers, and vendorReplyParse.js — the
// honesty core (null-unless-stated, evidence-quoted, manual apply) — is untouched
// either way. Overridable per call so the OpenAI path stays one argument away:
// pass { provider: 'openai' } to roll back without a deploy.
export async function parseVendorReply(reply, vendorCtx = {}) {
  if (!BASE) throw new Error('AI is not configured.');
  const text = (reply || '').trim();
  if (!text) throw new Error('Paste the vendor’s message first.');
  let res;
  try {
    res = await fetch(`${BASE}/api/ai/parse-vendor-reply`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        reply_text: text,
        vendor_name: vendorCtx.vendorName || null,
        vendor_category: vendorCtx.vendorCategory || null,
        event_name: vendorCtx.eventName || null,
        provider: vendorCtx.provider || 'claude',
      }),
    });
  } catch {
    throw new Error('Could not reach the AI service. Please try again.');
  }
  if (res.status === 401) throw new Error('Please sign in to use AI features.');
  if (res.status === 429) throw new Error('You’re going a bit fast — please wait a moment and try again.');
  if (res.status === 503) throw new Error('AI is unavailable right now.');
  if (!res.ok) throw new Error('AI service error — please try again.');
  const data = await res.json().catch(() => null);
  if (!data?.ok) throw new Error('AI returned no result.');
  return data; // { ok, fields, confidence, truncated, disclaimer }
}
