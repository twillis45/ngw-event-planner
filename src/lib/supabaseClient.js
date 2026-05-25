// ─── Supabase client (Phase 1A) ───────────────────────────────────────────────
// CRA build: reads REACT_APP_* env vars (baked at build time). NOT Vite.
// Safe by design: when env vars are absent the app keeps running on localStorage —
// `supabase` is null and isSupabaseConfigured() returns false. Nothing breaks.
//
// SECURITY: REACT_APP_SUPABASE_ANON_KEY is the *publishable anon* key and WILL be
// embedded in the public JS bundle. That is expected for Supabase — Row Level
// Security is the real boundary. NEVER put the service_role/secret key here.
import { createClient } from '@supabase/supabase-js';

const url     = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => Boolean(url && anonKey);

export const supabase = isSupabaseConfigured()
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
