// ─── Admin / Support Console — v1 (A1: role + auth gate) ──────────────────────
// Mounted only at ?admin=1 (see index.js), wrapped in AuthGate so it has the
// Supabase session. Renders only for users whose app_metadata.role is admin or
// support; everyone else gets an honest "not authorized" screen.
//
// A1 scope = the gate + a whoami probe + a read-only audit view that prove the
// end-to-end path works. Users / Workspaces / Providers tabs are wired in A3–A5.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApi, isAdminApiConfigured } from '../lib/adminApi';

// Dark palette aligned with AuthGate's login screen so the console feels native.
const D = {
  bg: '#0d0e12', surface: '#16181f', surface2: '#1d2029', border: '#2a2d38',
  text: '#e8eaf0', muted: '#9aa0b4', faint: '#6b7184',
  accent: '#4a90d9', good: '#22c55e', warn: '#f59e0b', bad: '#ef4444',
  ff: "'Inter', system-ui, sans-serif",
  mono: "'SF Mono', ui-monospace, Menlo, monospace",
};

function Banner({ tone = 'muted', children }) {
  const c = tone === 'warn' ? D.warn : tone === 'bad' ? D.bad : D.muted;
  return (
    <div style={{
      border: `1px solid ${c}33`, background: `${c}11`, color: c,
      borderRadius: 8, padding: '10px 14px', fontSize: 12, lineHeight: 1.5,
      fontFamily: D.ff, marginBottom: 16,
    }}>{children}</div>
  );
}

function Centered({ title, body }) {
  return (
    <div style={{
      minHeight: '100vh', background: D.bg, color: D.text, fontFamily: D.ff,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: D.muted, lineHeight: 1.6 }}>{body}</div>
      </div>
    </div>
  );
}

const TABS = ['Overview', 'Users', 'Workspaces', 'Providers', 'Audit'];

const inputStyle = {
  background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6,
  color: D.text, fontSize: 13, padding: '7px 11px', outline: 'none',
  fontFamily: D.ff, flex: 1, minWidth: 160,
};
const btnStyle = (primary) => ({
  background: primary ? D.accent : D.surface2, color: primary ? '#fff' : D.muted,
  border: `1px solid ${primary ? D.accent : D.border}`, borderRadius: 6,
  padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: D.ff,
});
const fmtTs = (t) => (t ? String(t).replace('T', ' ').slice(0, 19) : '—');

// ─── Users tab — A3 User Lookup + Support Notes ───────────────────────────────
function UsersPanel() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [coverage, setCoverage] = useState('');
  const [selected, setSelected] = useState(null);   // full user detail payload
  const [notes, setNotes] = useState(null);
  const [noteBody, setNoteBody] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const search = useCallback(async (term) => {
    setBusy(true); setErr(null);
    try {
      const r = await adminApi.users(term ?? q);
      setResults(r?.users || []);
      setCoverage(r?.coverage || '');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, [q]);

  // Initial load: most recent signups.
  useEffect(() => { search(''); }, [search]);

  const openUser = useCallback(async (id) => {
    setBusy(true); setErr(null); setSelected(null); setNotes(null);
    try {
      const [detail, n] = await Promise.all([adminApi.user(id), adminApi.notes(id)]);
      setSelected(detail);
      setNotes(n?.notes || []);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);

  const addNote = useCallback(async () => {
    const id = selected?.user?.id;
    if (!id || !noteBody.trim()) return;
    setBusy(true); setErr(null);
    try {
      await adminApi.addNote(id, noteBody.trim());
      setNoteBody('');
      const n = await adminApi.notes(id);
      setNotes(n?.notes || []);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, [selected, noteBody]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          style={inputStyle} placeholder="Search email, name, or user id…"
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') search(); }}
        />
        <button style={btnStyle(true)} disabled={busy} onClick={() => search()}>
          {busy ? '…' : 'Search'}
        </button>
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Results list */}
        <div style={{ flex: '0 0 320px' }}>
          {results && results.length === 0 && (
            <div style={{ fontSize: 12, color: D.faint }}>No users found.</div>
          )}
          {results && results.map(u => (
            <button key={u.id} onClick={() => openUser(u.id)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: selected?.user?.id === u.id ? D.surface2 : D.surface,
              border: `1px solid ${D.border}`, borderRadius: 8, padding: '10px 12px',
              marginBottom: 6, cursor: 'pointer', fontFamily: D.ff,
            }}>
              <div style={{ fontSize: 13, color: D.text, fontWeight: 600 }}>
                {u.email || '(no email)'}
                {u.role && <span style={{ color: D.accent, fontSize: 10, marginLeft: 8 }}>{u.role}</span>}
              </div>
              <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>
                {u.name || '—'} · {u.event_count} synced event{u.event_count === 1 ? '' : 's'}
              </div>
              <div style={{ fontSize: 10, color: D.faint, marginTop: 2, fontFamily: D.mono }}>
                joined {fmtTs(u.created_at)}
              </div>
            </button>
          ))}
        </div>

        {/* Detail + notes */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected && (
            <div style={{ fontSize: 12, color: D.faint }}>Select a user to see details and notes.</div>
          )}
          {selected && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: D.text }}>
                {selected.user.email}
              </div>
              <div style={{ fontSize: 12, color: D.muted, marginTop: 4, lineHeight: 1.7 }}>
                <div>name: {selected.user.name || '—'} · role: {selected.user.role || 'planner'} · provider: {selected.user.provider || '—'}</div>
                <div style={{ fontFamily: D.mono, fontSize: 11, color: D.faint }}>id: {selected.user.id}</div>
                <div>joined {fmtTs(selected.user.created_at)} · last sign-in {fmtTs(selected.user.last_sign_in_at)} · email confirmed {selected.user.email_confirmed_at ? 'yes' : 'no'}</div>
                <div>{selected.event_count} server-synced event{selected.event_count === 1 ? '' : 's'} · {selected.workspaces.length} workspace{selected.workspaces.length === 1 ? '' : 's'}</div>
              </div>

              {selected.workspaces.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Workspaces</div>
                  {selected.workspaces.map(w => (
                    <div key={w.id} style={{ fontSize: 12, color: D.muted, padding: '3px 0' }}>
                      {w.name} <span style={{ color: D.faint }}>· {w.plan} · {w.role}</span>
                    </div>
                  ))}
                </div>
              )}

              {selected.coverage && (
                <div style={{ marginTop: 12, fontSize: 11, color: D.warn, lineHeight: 1.5 }}>
                  ⚠ {selected.coverage}
                </div>
              )}

              {/* Support notes */}
              <div style={{ marginTop: 20, borderTop: `1px solid ${D.border}`, paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Support notes</div>
                <div style={{ fontSize: 11, color: D.faint, marginBottom: 10 }}>Append-only — corrections are new notes, never edits.</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    style={inputStyle} placeholder="Add a note about this user…"
                    value={noteBody} onChange={e => setNoteBody(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addNote(); }}
                  />
                  <button style={btnStyle(true)} disabled={busy || !noteBody.trim()} onClick={addNote}>Add</button>
                </div>
                {notes && notes.length === 0 && (
                  <div style={{ fontSize: 12, color: D.faint }}>No notes yet.</div>
                )}
                {notes && notes.map(n => (
                  <div key={n.id} style={{ padding: '8px 0', borderBottom: `1px solid ${D.border}` }}>
                    <div style={{ fontSize: 13, color: D.text, lineHeight: 1.5 }}>{n.body}</div>
                    <div style={{ fontSize: 10, color: D.faint, marginTop: 3, fontFamily: D.mono }}>
                      {n.author_name || n.author_id} · {fmtTs(n.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {coverage && !selected && (
        <div style={{ marginTop: 14, fontSize: 11, color: D.faint }}>{coverage}</div>
      )}
    </div>
  );
}

export default function AdminConsole() {
  const { ready, user, configured, bypass, signOut } = useAuth();
  const role = user?.app_metadata?.role;
  const isAdmin = role === 'admin' || role === 'support';

  const [tab, setTab] = useState('Overview');
  const [whoami, setWhoami] = useState(null);
  const [audit, setAudit] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const probe = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const w = await adminApi.whoami();
      setWhoami(w?.principal || null);
    } catch (e) {
      setErr(e.message || 'whoami failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const a = await adminApi.audit(100);
      setAudit(a?.rows || []);
    } catch (e) {
      setErr(e.message || 'audit fetch failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Probe whoami once the gate confirms an admin principal.
  useEffect(() => { if (isAdmin && isAdminApiConfigured()) probe(); }, [isAdmin, probe]);
  useEffect(() => { if (isAdmin && tab === 'Audit') loadAudit(); }, [isAdmin, tab, loadAudit]);

  // ── Gate states (honest) ─────────────────────────────────────────────────
  if (!ready) return <Centered title="Loading…" body="Resolving your session." />;

  if (!configured && !bypass) {
    return <Centered title="Supabase not configured"
      body="The admin console needs Supabase auth. Set REACT_APP_SUPABASE_URL / ANON_KEY (or REACT_APP_AUTH_BYPASS for local dev)." />;
  }
  if (!user) {
    // AuthGate normally shows the login wall before we get here; this is a guard.
    return <Centered title="Sign in required" body="Sign in with an admin-enabled account to continue." />;
  }
  if (!isAdmin) {
    return <Centered title="Not authorized"
      body={`This account (${user.email || 'unknown'}) does not have the admin role. Ask an admin to set app_metadata.role = "admin" in Supabase.`} />;
  }

  // ── Authorized console ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.text, fontFamily: D.ff }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderBottom: `1px solid ${D.border}`, background: D.surface,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: D.accent, textTransform: 'uppercase' }}>
            NGW Admin
          </span>
          <span style={{ fontSize: 11, color: D.faint }}>
            {user.email} · role: {role}{bypass ? ' · DEV BYPASS' : ''}
          </span>
        </div>
        <button onClick={() => signOut?.()} style={{
          background: D.surface2, color: D.muted, border: `1px solid ${D.border}`,
          borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: D.ff,
        }}>Sign out</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 16px', borderBottom: `1px solid ${D.border}` }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? D.surface2 : 'transparent',
            color: tab === t ? D.text : D.muted,
            border: `1px solid ${tab === t ? D.border : 'transparent'}`,
            borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: D.ff,
          }}>{t}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ padding: 20, maxWidth: 900 }}>
        <Banner tone="warn">
          <strong>Server-synced data only.</strong> The app is localStorage-first —
          anything that exists only in a user's browser is not visible here. Never
          report "delivered / paid / sent" from this console unless the underlying
          state is real; show "unknown" when it cannot be known.
        </Banner>

        {!isAdminApiConfigured() && (
          <Banner tone="bad">
            REACT_APP_API_BASE_URL is not set — the console cannot reach the admin API.
          </Banner>
        )}
        {err && <Banner tone="bad">Error: {err}</Banner>}

        {tab === 'Overview' && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Gate check</div>
            <div style={{ fontSize: 12, color: D.muted, marginBottom: 12 }}>
              Confirms the browser session authenticates against the backend admin gate.
            </div>
            <button onClick={probe} disabled={loading} style={{
              background: D.accent, color: '#fff', border: 'none', borderRadius: 6,
              padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: D.ff, opacity: loading ? 0.6 : 1,
            }}>{loading ? 'Checking…' : 'Re-run whoami'}</button>
            <pre style={{
              marginTop: 14, background: D.surface, border: `1px solid ${D.border}`,
              borderRadius: 8, padding: 14, fontSize: 12, color: D.text, fontFamily: D.mono,
              overflowX: 'auto',
            }}>{whoami ? JSON.stringify(whoami, null, 2) : '— no response yet —'}</pre>
          </div>
        )}

        {tab === 'Audit' && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Admin audit log</div>
            <div style={{ fontSize: 12, color: D.muted, marginBottom: 12 }}>
              Immutable record of admin actions (most recent first).
            </div>
            {audit && audit.length === 0 && (
              <div style={{ fontSize: 12, color: D.faint }}>No actions recorded yet.</div>
            )}
            {audit && audit.map(row => (
              <div key={row.id} style={{
                display: 'flex', gap: 12, alignItems: 'baseline',
                padding: '8px 0', borderBottom: `1px solid ${D.border}`, fontSize: 12,
              }}>
                <span style={{ color: D.faint, fontFamily: D.mono, whiteSpace: 'nowrap' }}>
                  {String(row.created_at).replace('T', ' ').slice(0, 19)}
                </span>
                <span style={{ color: D.accent, fontWeight: 600 }}>{row.action}</span>
                <span style={{ color: D.muted }}>{row.actor_name || row.actor_id}</span>
                {row.target_type && <span style={{ color: D.faint }}>→ {row.target_type}:{row.target_id}</span>}
              </div>
            ))}
          </div>
        )}

        {tab === 'Users' && <UsersPanel />}

        {['Workspaces', 'Providers'].includes(tab) && (
          <div style={{ fontSize: 13, color: D.muted }}>
            <strong style={{ color: D.text }}>{tab}</strong> — ships in A4–A5 (Event
            Diagnostics, Provider/Message Status). See
            docs/ecosystem/ADMIN_SUPPORT_V1_BUILD_PLAN.md.
          </div>
        )}
      </div>
    </div>
  );
}
