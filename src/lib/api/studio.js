// ─── Studio scope resolver ────────────────────────────────────────────────────
// Multi-tenant data is scoped by STUDIO (not per-user) — see docs/MULTITENANCY.md.
// Resolves the current user's studio id from studio_members (prefers an 'owner'
// membership, falls back to any). Returns null when Supabase is unconfigured or
// the user is signed out, so callers fall back to localStorage.
import { supabase, isSupabaseConfigured } from '../supabaseClient';

let _cache = { uid: null, studioId: null }; // tiny per-session cache (keyed by uid)

export async function currentStudioId() {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess?.session?.user?.id;
  if (!uid) return null;
  if (_cache.uid === uid && _cache.studioId) return _cache.studioId;
  try {
    const { data, error } = await supabase
      .from('studio_members')
      .select('studio_id, role')
      .eq('user_id', uid);
    if (error || !data?.length) return null;
    const chosen = data.find((m) => m.role === 'owner') || data[0];
    _cache = { uid, studioId: chosen.studio_id };
    return chosen.studio_id;
  } catch {
    return null;
  }
}

// Call on sign-out / user switch so a stale studio isn't reused.
export function clearStudioCache() { _cache = { uid: null, studioId: null }; }
