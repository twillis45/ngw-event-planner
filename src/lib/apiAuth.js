// ─── apiAuth — the ONE planner identity used on backend calls ────────────────
//
// 2026-07-30 (Security & Release Integrity sprint). Several backend routes that
// spend the server's provider keys or fetch documents on the server's behalf
// (/api/ai/extract-document, /api/docusign/send-envelope) were being called
// with no credentials at all. They now require a planner. A third,
// /api/ai/complete, was removed outright — it accepted a caller-supplied system
// prompt and had no reachable consumer.
//
// This module exists so securing them did NOT introduce a second auth system:
// every caller sends the same Supabase access token that lib/aiProxy.js has
// always sent to /api/ai/feature. There is one derivation, in one place.
//
// Unauthenticated callers simply get no Authorization header and the backend
// answers 401 — the client decides how to degrade (App.js falls back to BYOK).
import { supabase, isSupabaseConfigured } from './supabaseClient';

export async function authHeaders() {
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
