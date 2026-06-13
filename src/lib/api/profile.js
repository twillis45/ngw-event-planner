// ─── Studio profile / settings data access layer ──────────────────────────────
// One settings object per STUDIO (studios → studio_settings, studio_id PK).
// localStorage-first, Supabase-when-available. localStorage key is the SAME one
// the old localStorage-only profile used (ngw-profile), so a planner's existing
// setup is preserved and migrates to the cloud on first save.
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { currentStudioId } from './studio';
import { captureError } from '../sentry';

const LOCAL_KEY = 'ngw-profile';
const onLine = () => (typeof navigator !== 'undefined' ? navigator.onLine : null);

function writeLocal(profile) {
  // Board (Majors): a swallowed write here = the planner's studio setup silently lost.
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(profile)); } catch (e) { captureError(e, { where: 'profile.writeLocal' }); }
}

/**
 * Load the studio profile from the cloud. Returns the stored profile object, or
 * null when the cloud has none (unconfigured, signed out, or no row yet) — the
 * caller then falls back to / keeps its localStorage copy.
 */
export async function loadProfile() {
  if (!isSupabaseConfigured() || !supabase) return null;
  const sid = await currentStudioId();
  if (!sid) return null;
  try {
    const { data, error } = await supabase
      .from('studio_settings')
      .select('data')
      .eq('studio_id', sid)
      .maybeSingle();
    if (error) throw error;
    if (data?.data) { writeLocal(data.data); return data.data; }
    return null;
  } catch (e) {
    captureError(e, { where: 'profile.loadProfile', onLine: onLine() });
    return null;
  }
}

/** Upsert the studio profile (single row per studio). Writes local immediately. */
export async function saveProfile(profile) {
  writeLocal(profile);
  if (!isSupabaseConfigured() || !supabase) return;
  const sid = await currentStudioId();
  if (!sid) return;
  try {
    const { error } = await supabase
      .from('studio_settings')
      .upsert({ studio_id: sid, data: profile }, { onConflict: 'studio_id' });
    if (error) throw error;
  } catch (e) { captureError(e, { where: 'profile.saveProfile', onLine: onLine() }); }
}
