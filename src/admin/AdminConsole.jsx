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

const TABS = ['Overview', 'Users', 'Workspaces', 'Invitations', 'Errors', 'Providers', 'Audit'];

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
function UsersPanel({ initialUserId }) {
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

  // Deep-link from Triage: open the requested user once on arrival.
  useEffect(() => { if (initialUserId) openUser(initialUserId); }, [initialUserId, openUser]);

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

// ─── Workspaces tab — S2 Event / Workspace diagnostics ───────────────────────
// Master-detail like Users: search studios → see members + the synced-event
// pointers across them. Honest by construction: studios are server-synced, but
// event *contents* are localStorage-first, so events show as pointers only.
function WorkspacesPanel({ onOpenUser }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const search = useCallback(async (term) => {
    setBusy(true); setErr(null);
    try { const r = await adminApi.workspaces(term ?? q); setResults(r?.workspaces || []); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, [q]);
  useEffect(() => { search(''); }, [search]);

  const openWs = useCallback(async (id) => {
    setBusy(true); setErr(null); setSelected(null);
    try { setSelected(await adminApi.workspace(id)); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input style={inputStyle} placeholder="Search workspace name…"
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') search(); }} />
        <button style={btnStyle(true)} disabled={busy} onClick={() => search()}>{busy ? '…' : 'Search'}</button>
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* List */}
        <div style={{ flex: '0 0 300px' }}>
          {results && results.length === 0 && <div style={{ fontSize: 12, color: D.faint }}>No workspaces found.</div>}
          {results && results.map(w => (
            <button key={w.id} onClick={() => openWs(w.id)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: selected?.workspace?.id === w.id ? D.surface2 : D.surface,
              border: `1px solid ${D.border}`, borderRadius: 8, padding: '10px 12px',
              marginBottom: 6, cursor: 'pointer', fontFamily: D.ff,
            }}>
              <div style={{ fontSize: 13, color: D.text, fontWeight: 600 }}>
                {w.name || '(unnamed)'}
                <span style={{ color: D.accent, fontSize: 10, marginLeft: 8 }}>{w.plan}</span>
              </div>
              <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>
                {w.member_count} member{w.member_count === 1 ? '' : 's'} · created {fmtTs(w.created_at)}
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected && <div style={{ fontSize: 12, color: D.faint }}>Select a workspace to see members and synced events.</div>}
          {selected && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: D.text }}>
                {selected.workspace.name || '(unnamed)'}
                <span style={{ color: D.accent, fontSize: 11, marginLeft: 8 }}>{selected.workspace.plan}</span>
              </div>
              <div style={{ fontSize: 11, color: D.faint, marginTop: 3, fontFamily: D.mono }}>
                id: {selected.workspace.id} · created {fmtTs(selected.workspace.created_at)}
              </div>

              {/* Members */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Members ({selected.members.length})
                </div>
                {selected.members.map(m => (
                  <button key={m.user_id} onClick={() => m.user_id && onOpenUser?.(m.user_id)} style={{
                    display: 'flex', width: '100%', textAlign: 'left', gap: 10, alignItems: 'baseline',
                    background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8,
                    padding: '8px 12px', marginBottom: 5, cursor: 'pointer', fontFamily: D.ff,
                  }}>
                    <span style={{ fontSize: 13, color: D.text, fontWeight: 600, flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.email || '(no email)'}{m.name ? <span style={{ color: D.muted, fontWeight: 400 }}> · {m.name}</span> : null}
                    </span>
                    <span style={{ fontSize: 11, color: D.accent }}>{m.role}</span>
                  </button>
                ))}
              </div>

              {/* Synced events (pointers only) */}
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Synced events ({selected.events.length})
                </div>
                <div style={{ fontSize: 11, color: D.warn, marginBottom: 8, lineHeight: 1.5 }}>⚠ {selected.events_note}</div>
                {selected.events.length === 0 && <div style={{ fontSize: 12, color: D.faint }}>No synced events.</div>}
                {selected.events.map(ev => (
                  <div key={ev.event_id} style={{
                    display: 'flex', gap: 12, alignItems: 'baseline',
                    padding: '6px 0', borderBottom: `1px solid ${D.border}`, fontSize: 12,
                  }}>
                    <span style={{ color: D.muted, fontFamily: D.mono, flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.event_id}</span>
                    <span style={{ color: D.faint }}>{ev.owner_email || ev.owner_id}</span>
                    <span style={{ color: D.faint, fontFamily: D.mono, whiteSpace: 'nowrap' }}>{fmtTs(ev.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Invitations tab — S3 Invitation ops ─────────────────────────────────────
// All pending studio invitations. The actionable signal is "stuck": the invitee
// already signed up but the invite never attached (the claim_pending noise). Ops
// can revoke (audit-logged). No resend — the backend can't send Supabase OTP mail,
// and a button that can't send would be dishonest.
function InvitationsPanel({ onOpenUser }) {
  const [scope, setScope] = useState('pending');
  const [rows, setRows] = useState(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (sc) => {
    setBusy(true); setErr(null);
    try { const r = await adminApi.invitations(sc); setRows(r?.invitations || []); setNote(r?.note || ''); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(scope); }, [load, scope]);

  const revoke = useCallback(async (inv) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Revoke the invitation to ${inv.email}? This deletes the pending invite.`)) return;
    setBusy(true); setErr(null);
    try { await adminApi.revokeInvitation(inv.id); await load(scope); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, [load, scope]);

  const stuckCount = (rows || []).filter(r => r.stuck).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {['pending', 'all'].map(sc => (
          <button key={sc} onClick={() => setScope(sc)} style={{
            ...btnStyle(scope === sc), textTransform: 'capitalize',
          }}>{sc}</button>
        ))}
        <button onClick={() => load(scope)} disabled={busy} style={{
          background: 'transparent', border: 'none', color: D.faint, fontSize: 11,
          cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline',
        }}>{busy ? 'loading…' : 'refresh'}</button>
        {stuckCount > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: D.bad, fontWeight: 700 }}>
            {stuckCount} stuck
          </span>
        )}
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}
      {note && <Banner tone="warn">{note}</Banner>}

      {rows && rows.length === 0 && (
        <div style={{ fontSize: 12, color: D.faint }}>No {scope === 'all' ? '' : 'pending '}invitations.</div>
      )}
      {rows && rows.map(inv => (
        <div key={inv.id} style={{
          display: 'flex', gap: 12, alignItems: 'center',
          background: D.surface, border: `1px solid ${D.border}`,
          borderLeft: `2px solid ${inv.stuck ? D.bad : inv.used_at ? D.good : D.border}`,
          borderRadius: 8, padding: '10px 12px', marginBottom: 6,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: D.text, fontWeight: 600 }}>
              {inv.invitee_user_id ? (
                <button onClick={() => onOpenUser?.(inv.invitee_user_id)} style={{
                  background: 'none', border: 'none', color: D.text, fontWeight: 600,
                  fontSize: 13, cursor: 'pointer', fontFamily: D.ff, padding: 0, textAlign: 'left',
                }}>{inv.email}</button>
              ) : inv.email}
              <span style={{ color: D.accent, fontSize: 10, marginLeft: 8 }}>{inv.role}</span>
              {inv.stuck && (
                <span style={{ color: D.bad, fontSize: 10, marginLeft: 8, fontWeight: 700,
                  border: `1px solid ${D.bad}55`, borderRadius: 4, padding: '1px 5px' }}>STUCK</span>
              )}
              {inv.used_at && (
                <span style={{ color: D.good, fontSize: 10, marginLeft: 8 }}>claimed</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>
              {inv.studio_name || '(unknown workspace)'}
              {inv.invited_by_email ? ` · by ${inv.invited_by_email}` : ''} · invited {fmtTs(inv.created_at)}
            </div>
            {inv.stuck && (
              <div style={{ fontSize: 11, color: D.faint, marginTop: 3 }}>
                Signed up {fmtTs(inv.invitee_signed_up_at)} but the invite never attached — revoke if stale.
              </div>
            )}
          </div>
          {!inv.used_at && (
            <button onClick={() => revoke(inv)} disabled={busy} style={{
              ...btnStyle(false), color: D.bad, borderColor: `${D.bad}55`, flexShrink: 0,
            }}>Revoke</button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Errors tab — A3-err server-side error feed ──────────────────────────────
// admin_error_log: AI-proxy, email, payments, unhandled API exceptions. Honest
// scope — browser errors (CSP, frontend crashes) are NOT here; they live in
// Sentry, and the panel says so rather than implying full coverage.
const SOURCE_COLOR = (src) =>
  src === 'ai_proxy' ? D.accent : src === 'api' ? D.bad : src === 'email' ? D.warn : D.muted;

function ErrorsPanel() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hours, setHours] = useState(168);

  const load = useCallback(async (h) => {
    setBusy(true); setErr(null);
    try { setData(await adminApi.errors(h)); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(hours); }, [load, hours]);

  const rows = data?.errors;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {[[24, '24h'], [168, '7d'], [720, '30d']].map(([h, lbl]) => (
          <button key={h} onClick={() => setHours(h)} style={btnStyle(hours === h)}>{lbl}</button>
        ))}
        <button onClick={() => load(hours)} disabled={busy} style={{
          background: 'transparent', border: 'none', color: D.faint, fontSize: 11,
          cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline',
        }}>{busy ? 'loading…' : 'refresh'}</button>
      </div>

      {data?.sentry_note && <Banner tone="muted">{data.sentry_note}</Banner>}
      {data?.note && <Banner tone="warn">{data.note}</Banner>}
      {err && <Banner tone="bad">Error: {err}</Banner>}

      {rows && rows.length === 0 && (
        <div style={{ fontSize: 13, color: D.good, fontWeight: 600, marginTop: 8 }}>
          No server-side errors in this window.
        </div>
      )}
      {rows && rows.map(e => (
        <div key={e.id} style={{
          background: D.surface, border: `1px solid ${D.border}`,
          borderLeft: `2px solid ${e.level === 'warning' ? D.warn : D.bad}`,
          borderRadius: 8, padding: '9px 12px', marginBottom: 6,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: SOURCE_COLOR(e.source),
              textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{e.source}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: D.text }}>{e.message}</span>
            <span style={{ fontSize: 10, color: D.faint, fontFamily: D.mono, whiteSpace: 'nowrap' }}>{fmtTs(e.created_at)}</span>
          </div>
          {e.context && Object.keys(e.context).length > 0 && (
            <div style={{ fontSize: 10, color: D.faint, fontFamily: D.mono, marginTop: 3 }}>
              {Object.entries(e.context).map(([k, v]) => `${k}=${v}`).join(' · ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Overview tab — S1 Triage ("who needs me right now") ──────────────────────
// The operator's landing hero. ONE hero (the needs-you count), evidence whispers
// (bucket rows), empty = caught-up reward. Buckets come from the backend; each is
// honest that an empty list means "nothing visible server-side," not "all fine."
const toneColor = (t) => (t === 'bad' ? D.bad : t === 'warn' ? D.warn : D.muted);

function TriagePanel({ onOpenUser, onGoErrors }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [whoami, setWhoami] = useState(null);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try { setData(await adminApi.triage()); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const runGate = useCallback(async () => {
    try { const w = await adminApi.whoami(); setWhoami(w?.principal || null); }
    catch (e) { setWhoami({ error: e.message }); }
  }, []);

  const needsYou = data?.needs_you ?? 0;

  return (
    <div>
      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <div style={{ fontSize: 13, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          What needs you
        </div>
        <button onClick={load} disabled={busy} style={{
          background: 'transparent', border: 'none', color: D.faint, fontSize: 11,
          cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline',
        }}>{busy ? 'refreshing…' : 'refresh'}</button>
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}

      {data && (
        <>
          {needsYou === 0 ? (
            <div style={{ padding: '28px 0 8px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: D.good }}>Caught up</div>
              <div style={{ fontSize: 13, color: D.muted, marginTop: 6, maxWidth: 460, lineHeight: 1.6 }}>
                Nobody's stuck at the front door, stalled in onboarding, or going quiet —
                as far as server-synced state can see.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 40, fontWeight: 800, color: D.text, lineHeight: 1.1, margin: '6px 0 18px' }}>
              {needsYou}
              <span style={{ fontSize: 15, fontWeight: 600, color: D.muted, marginLeft: 10 }}>
                {needsYou === 1 ? 'person needs a look' : 'people need a look'}
              </span>
            </div>
          )}

          {/* Buckets */}
          {data.buckets.map(b => (
            <div key={b.key} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 2 }}>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: b.total > 0 ? toneColor(b.tone) : D.faint,
                }}>{b.label}</span>
                <span style={{ fontSize: 12, color: D.faint, fontFamily: D.mono }}>
                  {b.total}{b.total > b.items.length ? ` · showing ${b.items.length}` : ''}
                </span>
              </div>
              <div style={{ fontSize: 11, color: D.faint, marginBottom: 8 }}>{b.hint}</div>
              {b.items.length === 0 ? (
                <div style={{ fontSize: 12, color: D.faint, fontStyle: 'italic' }}>None.</div>
              ) : b.items.map(it => (
                <button key={it.id} onClick={() => onOpenUser?.(it.id)} style={{
                  display: 'flex', width: '100%', textAlign: 'left', gap: 12, alignItems: 'baseline',
                  background: D.surface, border: `1px solid ${D.border}`, borderLeft: `2px solid ${toneColor(b.tone)}`,
                  borderRadius: 8, padding: '8px 12px', marginBottom: 5, cursor: 'pointer', fontFamily: D.ff,
                }}>
                  <span style={{ fontSize: 13, color: D.text, fontWeight: 600, flex: 1, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.email || '(no email)'}{it.name ? <span style={{ color: D.muted, fontWeight: 400 }}> · {it.name}</span> : null}
                  </span>
                  <span style={{ fontSize: 10, color: D.faint, fontFamily: D.mono, whiteSpace: 'nowrap' }}>
                    {b.key === 'going_quiet' ? `last seen ${fmtTs(it.last_sign_in_at)}`
                      : b.key === 'stuck_invites' ? `invited ${fmtTs(it.created_at)}`
                      : `joined ${fmtTs(it.created_at)}`}
                  </span>
                </button>
              ))}
            </div>
          ))}

          {/* System health stat — server-side errors (A3-err), not a person bucket. */}
          {data.system && (
            <button onClick={() => onGoErrors?.()} style={{
              display: 'block', width: '100%', textAlign: 'left', marginTop: 14,
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: D.ff,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: data.system.errors_24h > 0 ? D.bad : D.faint }}>
                {data.system.errors_24h > 0
                  ? `⚠ ${data.system.errors_24h} server error${data.system.errors_24h === 1 ? '' : 's'} in last 24h →`
                  : '✓ No server errors in last 24h'}
              </span>
            </button>
          )}

          <div style={{ fontSize: 11, color: D.faint, marginTop: 14, lineHeight: 1.5 }}>
            {data.coverage}
          </div>

          {/* De-emphasized debug affordance — the old whoami gate-check, tucked away */}
          <div style={{ marginTop: 22, borderTop: `1px solid ${D.border}`, paddingTop: 12 }}>
            <button onClick={() => { setShowGate(v => !v); if (!whoami) runGate(); }} style={{
              background: 'transparent', border: 'none', color: D.faint, fontSize: 11,
              cursor: 'pointer', fontFamily: D.ff,
            }}>{showGate ? '▾' : '▸'} Gate check (debug)</button>
            {showGate && (
              <pre style={{
                marginTop: 8, background: D.surface, border: `1px solid ${D.border}`,
                borderRadius: 8, padding: 12, fontSize: 11, color: D.muted, fontFamily: D.mono, overflowX: 'auto',
              }}>{whoami ? JSON.stringify(whoami, null, 2) : '— probing… —'}</pre>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminConsole() {
  const { ready, user, configured, bypass, signOut } = useAuth();
  const role = user?.app_metadata?.role;
  const isAdmin = role === 'admin' || role === 'support';

  const [tab, setTab] = useState('Overview');
  const [pendingUserId, setPendingUserId] = useState(null);  // Triage → Users deep-link
  const [audit, setAudit] = useState(null);
  const [err, setErr] = useState(null);

  const goToUser = useCallback((id) => { setPendingUserId(id); setTab('Users'); }, []);

  const loadAudit = useCallback(async () => {
    setErr(null);
    try {
      const a = await adminApi.audit(100);
      setAudit(a?.rows || []);
    } catch (e) {
      setErr(e.message || 'audit fetch failed');
    }
  }, []);

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

        {tab === 'Overview' && <TriagePanel onOpenUser={goToUser} onGoErrors={() => setTab('Errors')} />}

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

        {tab === 'Users' && <UsersPanel initialUserId={pendingUserId} />}

        {tab === 'Workspaces' && <WorkspacesPanel onOpenUser={goToUser} />}

        {tab === 'Invitations' && <InvitationsPanel onOpenUser={goToUser} />}

        {tab === 'Errors' && <ErrorsPanel />}

        {tab === 'Providers' && (
          <div style={{ fontSize: 13, color: D.muted }}>
            <strong style={{ color: D.text }}>Providers</strong> — ships in A5
            (Provider / Message Status). See
            docs/ecosystem/ADMIN_SUPPORT_V1_BUILD_PLAN.md.
          </div>
        )}
      </div>
    </div>
  );
}
