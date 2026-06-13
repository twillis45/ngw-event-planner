// ─── Members modal — Phase 1 of multi-tenant Studios ─────────────────────────
// View / invite / change roles / remove members of the current studio. Plus a
// list of pending invitations. Owners only can mutate.
import { useEffect, useState } from 'react';
import {
  currentStudio,
  listStudioMembers, removeStudioMember, updateStudioMemberRole,
  listStudioInvitations, inviteStudioMember, cancelStudioInvitation,
} from '../lib/api';
import { supabase } from '../lib/supabaseClient';

// Studio Matte palette (kept inline so the modal stays decoupled from the App theme tree).
const D = {
  scrim:   'rgba(7,8,9,0.78)',
  bg:      '#0f0f11',
  surface: '#18181c',
  surface2:'#1e1e24',
  border:  '#2a2a32',
  text:    '#e6e6ea',
  muted:   '#86868c',
  accent:  '#4a90d9',
  accent2: '#2dd4bf',
  warn:    '#e0a93f',
  danger:  '#E84036', // Red parity: canonical fire red (was #e63946).
  success: '#22a87a',
};
const fmt = (iso) => { try { return new Date(iso).toLocaleDateString(); } catch { return ''; } };

export default function MembersModal({ onClose, currentUserId: propUid }) {
  const [studio,      setStudio]      = useState(null);
  const [me,          setMe]          = useState(propUid || null);
  const [members,     setMembers]     = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [busy,        setBusy]        = useState(false);
  const [err,         setErr]         = useState('');
  const [okMsg,       setOkMsg]       = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole,  setInviteRole]  = useState('planner');

  const refresh = async () => {
    setLoading(true); setErr('');
    try {
      // Resolve current user (for self-checks) if not provided. Under the dev
      // auth bypass there is no Supabase session, so use the synthetic id so the
      // "(you)" tag + self-row guards still work for local QA.
      if (!me) {
        if (process.env.REACT_APP_AUTH_BYPASS === 'true') setMe('dev-bypass-user');
        else if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user?.id) setMe(data.session.user.id);
        }
      }
      const s = await currentStudio();
      if (!s) { setErr('No studio found for the current user.'); return; }
      setStudio(s);
      const [ms, inv] = await Promise.all([listStudioMembers(s.id), listStudioInvitations(s.id)]);
      setMembers(ms); setInvitations(inv);
    } catch (e) {
      setErr(e?.message || 'Failed to load.');
    } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isOwner = studio?.role === 'owner';
  const showOk = (m) => { setOkMsg(m); setTimeout(() => setOkMsg(''), 3000); };

  const onInvite = async (e) => {
    e?.preventDefault?.();
    const addr = inviteEmail.trim();
    if (!addr || busy) return;
    setBusy(true); setErr(''); setOkMsg('');
    try {
      await inviteStudioMember(studio.id, addr, inviteRole);
      showOk(`Invitation sent to ${addr}.`);
      setInviteEmail(''); setInviteRole('planner');
      await refresh();
    } catch (e2) {
      setErr(e2?.message?.includes('duplicate') ? 'That email is already invited.' : (e2?.message || 'Could not send invitation.'));
    } finally { setBusy(false); }
  };

  const onChangeRole = async (uid, role) => {
    setBusy(true); setErr('');
    try { await updateStudioMemberRole(studio.id, uid, role); await refresh(); }
    catch (e2) { setErr(e2?.message || 'Could not change role.'); }
    finally { setBusy(false); }
  };

  const onRemove = async (uid, email) => {
    if (!window.confirm(`Remove ${email || 'this member'} from the studio?`)) return;
    setBusy(true); setErr('');
    try { await removeStudioMember(studio.id, uid); await refresh(); }
    catch (e2) { setErr(e2?.message || 'Could not remove member.'); }
    finally { setBusy(false); }
  };

  const onCancelInvite = async (id, email) => {
    if (!window.confirm(`Cancel the invitation to ${email}?`)) return;
    setBusy(true); setErr('');
    try { await cancelStudioInvitation(id); await refresh(); }
    catch (e2) { setErr(e2?.message || 'Could not cancel invitation.'); }
    finally { setBusy(false); }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const scrim = { position: 'fixed', inset: 0, background: D.scrim, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
  const card  = { width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, color: D.text, fontFamily: "'Inter', system-ui, sans-serif" };
  const header = { padding: '18px 22px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const section = { padding: '16px 22px', borderBottom: `1px solid ${D.border}` };
  const sectionTitle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.muted, marginBottom: 10 };
  const row = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${D.border}` };
  const input = { width: '100%', background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, fontSize: 13, padding: '8px 10px', outline: 'none', fontFamily: 'inherit' };
  const btn = (variant='default') => ({ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
    background: variant==='primary' ? D.accent : variant==='danger' ? 'transparent' : variant==='ghost' ? 'transparent' : D.surface2,
    color:      variant==='primary' ? '#fff'   : variant==='danger' ? D.danger     : variant==='ghost' ? D.muted      : D.text,
    border:     variant==='danger'  ? `1px solid ${D.danger}55` : variant==='ghost' ? `1px solid ${D.border}` : 'none',
  });
  const rolePill = (role) => ({ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: role==='owner' ? D.warn : role==='assistant' ? D.muted : D.accent,
    background: (role==='owner' ? D.warn : role==='assistant' ? D.muted : D.accent) + '1a',
  });

  return (
    <div style={scrim} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={card} role="dialog" aria-label="Studio members">
        <div style={header}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: D.accent, textTransform: 'uppercase', marginBottom: 4 }}>Studio</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{studio?.name || 'Members'}</div>
          </div>
          <button onClick={onClose} style={{ ...btn('ghost'), fontSize: 18, padding: '4px 10px' }} aria-label="Close">✕</button>
        </div>

        {err && <div style={{ padding: '10px 22px', background: D.danger + '12', color: D.danger, fontSize: 12 }}>{err}</div>}
        {okMsg && <div style={{ padding: '10px 22px', background: D.success + '12', color: D.success, fontSize: 12 }}>{okMsg}</div>}

        {/* Members */}
        <div style={section}>
          <div style={sectionTitle}>Members ({members.length})</div>
          {loading ? (
            <div style={{ fontSize: 13, color: D.muted, padding: '8px 0' }}>Loading…</div>
          ) : members.length === 0 ? (
            <div style={{ fontSize: 13, color: D.muted, padding: '8px 0' }}>No members yet.</div>
          ) : members.map((m, i) => {
            const isMe = m.user_id === me;
            const isLast = i === members.length - 1;
            return (
              <div key={m.user_id} style={{ ...row, borderBottom: isLast ? 'none' : row.borderBottom }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.email}{isMe && <span style={{ fontSize: 10, color: D.muted, marginLeft: 6 }}>(you)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>Joined {fmt(m.joined_at)}</div>
                </div>
                {isOwner && !isMe ? (
                  <select value={m.role} onChange={(e) => onChangeRole(m.user_id, e.target.value)}
                    style={{ ...input, width: 'auto', padding: '4px 8px', fontSize: 11 }} disabled={busy}>
                    <option value="owner">Owner</option>
                    <option value="planner">Planner</option>
                    <option value="assistant">Assistant</option>
                  </select>
                ) : (
                  <span style={rolePill(m.role)}>{m.role}</span>
                )}
                {isOwner && !isMe && (
                  <button onClick={() => onRemove(m.user_id, m.email)} style={btn('danger')} disabled={busy}>Remove</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Invitations */}
        {invitations.length > 0 && (
          <div style={section}>
            <div style={sectionTitle}>Pending invitations ({invitations.length})</div>
            {invitations.map((inv, i) => {
              const isLast = i === invitations.length - 1;
              return (
                <div key={inv.id} style={{ ...row, borderBottom: isLast ? 'none' : row.borderBottom }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.email}</div>
                    <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>Invited {fmt(inv.created_at)}</div>
                  </div>
                  <span style={rolePill(inv.role)}>{inv.role}</span>
                  {isOwner && (
                    <button onClick={() => onCancelInvite(inv.id, inv.email)} style={btn('ghost')} disabled={busy}>Cancel</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Invite form (owners only) */}
        {isOwner && studio && (
          <div style={section}>
            <div style={sectionTitle}>Invite a planner</div>
            <form onSubmit={onInvite} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="email" required placeholder="teammate@studio.com"
                value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                style={{ ...input, flex: '1 1 220px' }} disabled={busy} />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                style={{ ...input, width: 'auto' }} disabled={busy}>
                <option value="planner">Planner</option>
                <option value="assistant">Assistant</option>
                <option value="owner">Owner</option>
              </select>
              <button type="submit" style={btn('primary')} disabled={busy || !inviteEmail.trim()}>
                {busy ? 'Sending…' : 'Send invitation'}
              </button>
            </form>
            <div style={{ fontSize: 11, color: D.muted, marginTop: 8, lineHeight: 1.55 }}>
              They'll get a magic-link email. On first sign-in they're automatically added to this studio.
            </div>
          </div>
        )}

        {!isOwner && studio && (
          <div style={{ ...section, fontSize: 12, color: D.muted, fontStyle: 'italic' }}>
            Only owners can invite or change members.
          </div>
        )}
      </div>
    </div>
  );
}
