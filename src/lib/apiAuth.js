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

async function accessToken() {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch { return null; /* unauthenticated — backend will 401 */ }
}

export async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = await accessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// Signed out, a host-only read can only come back 401. Its caller asks this
// first and answers "signed out" itself, so no request is made (live check of
// 2981924, 11/26/2026: a 401 per plan open, focus and page). A build with no
// account system (the e2e suite's mocked API) can't know, so it asks as it
// always did and the server decides.
export async function isSignedIn() {
  if (!isSupabaseConfigured() || !supabase) return true;
  return Boolean(await accessToken());
}
