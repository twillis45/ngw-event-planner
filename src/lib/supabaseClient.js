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
        persistSession:    true,
        autoRefreshToken:  true,
        detectSessionInUrl: true,
        // Store session in localStorage so it survives page reloads.
        // The JWT is opaque to anyone without the Supabase signing secret.
        storage: window.localStorage,
      },
    })
  : null;
