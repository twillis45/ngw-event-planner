// ─── Studio scope resolver ────────────────────────────────────────────────────
// Multi-tenant data is scoped by STUDIO (not per-user) — see docs/MULTITENANCY.md.
// Resolves the current user's studio id from studio_members (prefers an 'owner'
// membership, falls back to any). Returns null when Supabase is unconfigured or
// the user is signed out, so callers fall back to localStorage.
import { supabase, isSupabaseConfigured, authRedirectUrl } from '../supabaseClient';

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

// ── Studio identity + role of the current user ──────────────────────────────
export async function currentStudio() {
  const sid = await currentStudioId();
  if (!sid || !supabase) return null;
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess?.session?.user?.id;
  if (!uid) return null;
  const { data: studio } = await supabase
    .from('studios').select('id, name, plan').eq('id', sid).maybeSingle();
  const { data: me } = await supabase
    .from('studio_members').select('role').eq('studio_id', sid).eq('user_id', uid).maybeSingle();
  return studio ? { ...studio, role: me?.role || 'planner' } : null;
}

// ── Members (joined with auth.users via the SECURITY DEFINER RPC) ───────────
export async function listStudioMembers(studioId) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('list_studio_members', { p_studio_id: studioId });
  if (error) throw error;
  return data || [];
}

export async function removeStudioMember(studioId, userId) {
  const { error } = await supabase.from('studio_members')
    .delete().eq('studio_id', studioId).eq('user_id', userId);
  if (error) throw error;
}

export async function updateStudioMemberRole(studioId, userId, role) {
  if (!['owner', 'planner', 'assistant'].includes(role)) throw new Error('invalid role');
  const { error } = await supabase.from('studio_members')
    .update({ role }).eq('studio_id', studioId).eq('user_id', userId);
  if (error) throw error;
}

// ── Invitations ─────────────────────────────────────────────────────────────
export async function listStudioInvitations(studioId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('studio_invitations')
    .select('id, email, role, invited_by, created_at, used_at')
    .eq('studio_id', studioId).is('used_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Invite a planner by email. Inserts the invitation row (owner-gated by RLS),
// then sends a magic link so they can sign in; claim_pending_invitations()
// auto-adds them to this studio on first sign-in.
export async function inviteStudioMember(studioId, email, role = 'planner') {
  if (!supabase) throw new Error('Supabase not configured');
  const addr = email.toLowerCase().trim();
  const { data: sess } = await supabase.auth.getSession();
  const invitedBy = sess?.session?.user?.id;
  if (!invitedBy) throw new Error('Not signed in');
  const { error } = await supabase.from('studio_invitations')
    .insert({ studio_id: studioId, email: addr, role, invited_by: invitedBy });
  if (error) throw error;
  // Best-effort magic link so they can sign in; ignore errors (the invitation is saved).
  // Sprint 51 endpoint consistency: use the shared authRedirectUrl() so this
  // invite redirect matches the planner's own sign-in redirect. Previously
  // hardcoded window.location.origin + pathname, which silently broke when
  // REACT_APP_AUTH_REDIRECT was set for LAN/tunnel development.
  try {
    await supabase.auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: authRedirectUrl() },
    });
  } catch { /* invitation row is the source of truth */ }
}

export async function cancelStudioInvitation(invitationId) {
  const { error } = await supabase.from('studio_invitations').delete().eq('id', invitationId);
  if (error) throw error;
}

// Picks up any pending invitations for the current user. Call after sign-in.
export async function claimPendingInvitations() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('claim_pending_invitations');
  if (error) return [];
  return data || [];
}
