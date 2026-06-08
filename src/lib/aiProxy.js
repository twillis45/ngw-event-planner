// Sprint 52B — frontend client for the server-side Anthropic proxy.
// The Anthropic API key lives ONLY on the backend (Render env). The browser
// just POSTs {feature, prompt, context} to /api/ai/anthropic with the planner's
// Supabase token; the backend validates, builds a server-owned system prompt,
// calls Claude, and returns only the text. No key ever reaches the client.
import { supabase, isSupabaseConfigured } from './supabaseClient';

const BASE = process.env.REACT_APP_API_BASE_URL;

export const AI_FEATURES = ['event_brief', 'vendor_followup', 'document_summary', 'checklist_help'];

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
    res = await fetch(`${BASE}/api/ai/anthropic`, {
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
