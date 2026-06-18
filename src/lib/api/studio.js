// ─── Studio scope resolver ────────────────────────────────────────────────────
// Multi-tenant data is scoped by STUDIO (not per-user) — see docs/MULTITENANCY.md.
// Resolves the current user's studio id from studio_members (prefers an 'owner'
// membership, falls back to any). Returns null when Supabase is unconfigured or
// the user is signed out, so callers fall back to localStorage.
import { supabase, isSupabaseConfigured, authRedirectUrl } from '../supabaseClient';

let _cache = { uid: null, studioId: null }; // tiny per-session cache (keyed by uid)

// ── Sprint 52B: dev-only studio for auth bypass ──────────────────────────────
// When REACT_APP_AUTH_BYPASS === 'true' the app injects a synthetic
// `dev-bypass@local` user (see components/AuthGate.jsx) that has no Supabase
// session and therefore no studio membership — so MembersModal showed
// "No studio found." Under bypass ONLY, the studio API below returns an
// in-memory mock studio + members instead of querying Supabase.
//
// Safety:
//   • REACT_APP_* env vars are baked at compile time. Production builds set
//     REACT_APP_AUTH_BYPASS=false, so DEV_BYPASS is false in prod and every
//     function falls through to the real Supabase path — unchanged.
//   • This touches NO Supabase tables and NO RLS. It is pure in-memory mock
//     state, reset on reload. Nothing here can affect production data/security.
const DEV_BYPASS = process.env.REACT_APP_AUTH_BYPASS === 'true';
const DEV_STUDIO = { id: 'dev-studio', name: 'NGW Dev Studio', plan: 'free' };
const DEV_OWNER_ID = 'dev-bypass-user'; // matches AuthGate BYPASS_USER.id
let _devMembers = [
  { user_id: 'dev-bypass-user', email: 'dev-bypass@local',          role: 'owner',   joined_at: '2026-01-01T00:00:00.000Z' },
  { user_id: 'dev-member-1',    email: 'test-planner@example.com',  role: 'planner', joined_at: '2026-01-05T00:00:00.000Z' },
  { user_id: 'dev-member-2',    email: 'second-shooter@example.com', role: 'planner', joined_at: '2026-01-06T00:00:00.000Z' },
];
let _devInvites = []; // in-memory pending invitations for dev QA

// Sprint 58E-B — events/clients `studio_id` is a Postgres `uuid` column. The
// DEV_BYPASS studio id ('dev-studio') is NOT a uuid, so any cloud write under
// auth-bypass returns 400 (22P02 "invalid input syntax for type uuid"). Cloud
// data-sync must therefore only run for a REAL (uuid) studio; otherwise it stays
// local-only. Real prod studios are uuids (AUTH_BYPASS=false), so they're unaffected.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isCloudStudioId(sid) {
  return typeof sid === 'string' && UUID_RE.test(sid);
}

export async function currentStudioId() {
  if (DEV_BYPASS) return DEV_STUDIO.id;
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
  if (DEV_BYPASS) return { ...DEV_STUDIO, role: 'owner' };
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
  if (DEV_BYPASS) return _devMembers.slice();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('list_studio_members', { p_studio_id: studioId });
  if (error) throw error;
  return data || [];
}

export async function removeStudioMember(studioId, userId) {
  if (DEV_BYPASS) { _devMembers = _devMembers.filter((m) => m.user_id !== userId); return; }
  const { error } = await supabase.from('studio_members')
    .delete().eq('studio_id', studioId).eq('user_id', userId);
  if (error) throw error;
}

export async function updateStudioMemberRole(studioId, userId, role) {
  if (!['owner', 'planner', 'assistant'].includes(role)) throw new Error('invalid role');
  if (DEV_BYPASS) { _devMembers = _devMembers.map((m) => (m.user_id === userId ? { ...m, role } : m)); return; }
  const { error } = await supabase.from('studio_members')
    .update({ role }).eq('studio_id', studioId).eq('user_id', userId);
  if (error) throw error;
}

// ── Invitations ─────────────────────────────────────────────────────────────
export async function listStudioInvitations(studioId) {
  if (DEV_BYPASS) return _devInvites.slice();
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
  const addr = email.toLowerCase().trim();
  // Dev bypass: record the invite in memory so the Members modal flow is fully
  // testable locally (no Supabase, no email). Honest — it's a local mock only.
  if (DEV_BYPASS) {
    if (_devMembers.some((m) => m.email === addr) || _devInvites.some((i) => i.email === addr)) throw new Error('duplicate');
    _devInvites = [{ id: `dev-inv-${_devInvites.length + 1}-${addr}`, email: addr, role, invited_by: DEV_OWNER_ID, created_at: new Date().toISOString(), used_at: null }, ..._devInvites];
    return;
  }
  if (!supabase) throw new Error('Supabase not configured');
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
  if (DEV_BYPASS) { _devInvites = _devInvites.filter((i) => i.id !== invitationId); return; }
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
