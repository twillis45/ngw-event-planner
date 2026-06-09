// ─── Supabase client — NGW Event Boss ────────────────────────────────────────
//
// IMPORTANT: This is a Create React App project (react-scripts, not Vite).
// Environment variables must use the REACT_APP_* prefix to be baked into
// the public bundle at build time. Vite-style VITE_* vars will NOT work here.
//
// Required env vars (set in .env.local for dev, .env.production.local for deploy):
//   REACT_APP_SUPABASE_URL      — your Supabase project URL
//   REACT_APP_SUPABASE_ANON_KEY — the publishable anon key (safe to bundle)
//
// SECURITY: The anon key is intentionally public. Row Level Security (RLS)
// is the real access boundary. NEVER put the service_role / secret key here.
//
// When env vars are absent the app runs in localStorage-only mode — supabase
// is null, isSupabaseConfigured() returns false, nothing else breaks.

import { createClient } from '@supabase/supabase-js';

const url     = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Fail visibly in dev when misconfigured, silently degrade in production.
if (process.env.NODE_ENV === 'development' && (!url || !anonKey)) {
  console.error(
    '[NGW] Supabase env vars missing — running in localStorage-only mode.\n' +
    'Copy .env.example to .env.local and fill in REACT_APP_SUPABASE_URL + REACT_APP_SUPABASE_ANON_KEY.\n' +
    'Restart `npm start` after editing .env.local.'
  );
}

export const isSupabaseConfigured = () => Boolean(url && anonKey);

// Returns the single Supabase client instance, or null when unconfigured.
// Every caller must guard: if (!supabase) { /* localStorage fallback */ }
export const supabase = isSupabaseConfigured()
  ? createClient(url, anonKey, {
      auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true,
        storage:            window.localStorage,
        // Use implicit flow so magic links work when opened in any browser/tab.
        // PKCE (the default) requires the code verifier to be in the same
        // browser session that initiated the sign-in — this breaks on GitHub
        // Pages where the email client may open the link in a fresh context.
        flowType: 'implicit',
        // Sprint 52B — non-deadlocking lock. Supabase's default uses
        // navigator.locks, which can get STUCK after a closed/crashed tab so
        // getSession() never resolves → permanent "Loading…" / login bounce
        // (it bit a real device until site-data was cleared). A no-op lock just
        // runs the callback — at worst two tabs refresh the token concurrently,
        // which is harmless. This guarantees auth can never deadlock.
        lock: (_name, _acquireTimeout, fn) => fn(),
      },
    })
  : null;

// ─── Sprint 51: shared auth-redirect resolver ────────────────────────────────
// Single source of truth for the URL Supabase should redirect to after a
// successful magic-link / OAuth sign-in. Used by:
//   - components/AuthGate.jsx (planner sign-in)
//   - lib/api/studio.js inviteStudioMember (invitee magic link)
// Resolution order:
//   1. REACT_APP_AUTH_REDIRECT env var (explicit override — stable when set)
//   2. window.location.origin + window.location.pathname (auto-correct in
//      the absence of an override; whatever URL the browser opened)
// Every consumer of this helper produces the SAME URL — eliminates the
// previous inconsistency where AuthGate honored the env var but invites
// silently fell back to the runtime origin, breaking LAN/tunnel setups.
export function authRedirectUrl() {
  const override = process.env.REACT_APP_AUTH_REDIRECT;
  if (override) return override;
  return window.location.origin + window.location.pathname;
}
