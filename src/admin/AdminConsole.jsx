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
import {
  playbookCoverage, culturalMix, locationSpread, memoryDepth, funnelContent,
} from '../lib/analyticsReader';
import { evaluationAudit, conversionAudit } from '../lib/intelEval';
import { hostShellOn, planV2On } from '../lib/presentationNav';
import { type } from '../design/tokens';

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
      borderRadius: 8, padding: '10px 14px', fontSize: type.size.caption, lineHeight: 1.5,
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
        <div style={{ fontSize: type.size['2xl'], fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: type.size.base, color: D.muted, lineHeight: 1.6 }}>{body}</div>
      </div>
    </div>
  );
}

const TABS = ['Overview', 'Users', 'Workspaces', 'Invitations', 'Activation', 'Analytics', 'Intelligence', 'Metrics', 'Errors', 'Providers', 'Audit', 'Settings'];

const inputStyle = {
  background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6,
  color: D.text, fontSize: type.size.base, padding: '7px 11px', outline: 'none',
  fontFamily: D.ff, flex: 1, minWidth: 160,
};
const btnStyle = (primary) => ({
  background: primary ? D.accent : D.surface2, color: primary ? '#fff' : D.muted,
  border: `1px solid ${primary ? D.accent : D.border}`, borderRadius: 6,
  padding: '7px 14px', fontSize: type.size.caption, cursor: 'pointer', fontFamily: D.ff,
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
            <div style={{ fontSize: type.size.caption, color: D.faint }}>No users found.</div>
          )}
          {results && results.map(u => (
            <button key={u.id} onClick={() => openUser(u.id)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: selected?.user?.id === u.id ? D.surface2 : D.surface,
              border: `1px solid ${D.border}`, borderRadius: 8, padding: '10px 12px',
              marginBottom: 6, cursor: 'pointer', fontFamily: D.ff,
            }}>
              <div style={{ fontSize: type.size.base, color: D.text, fontWeight: 600 }}>
                {u.email || '(no email)'}
                {u.role && <span style={{ color: D.accent, fontSize: type.size.xs, marginLeft: 8 }}>{u.role}</span>}
              </div>
              <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>
                {u.name || '—'} · {u.event_count} synced event{u.event_count === 1 ? '' : 's'}
              </div>
              <div style={{ fontSize: type.size.xs, color: D.faint, marginTop: 2, fontFamily: D.mono }}>
                joined {fmtTs(u.created_at)}
              </div>
            </button>
          ))}
        </div>

        {/* Detail + notes */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected && (
            <div style={{ fontSize: type.size.caption, color: D.faint }}>Select a user to see details and notes.</div>
          )}
          {selected && (
            <div>
              <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.text }}>
                {selected.user.email}
              </div>
              <div style={{ fontSize: type.size.caption, color: D.muted, marginTop: 4, lineHeight: 1.7 }}>
                <div>name: {selected.user.name || '—'} · role: {selected.user.role || 'planner'} · provider: {selected.user.provider || '—'}</div>
                <div style={{ fontFamily: D.mono, fontSize: type.size.sm, color: D.faint }}>id: {selected.user.id}</div>
                <div>joined {fmtTs(selected.user.created_at)} · last sign-in {fmtTs(selected.user.last_sign_in_at)} · email confirmed {selected.user.email_confirmed_at ? 'yes' : 'no'}</div>
                <div>{selected.event_count} server-synced event{selected.event_count === 1 ? '' : 's'} · {selected.workspaces.length} workspace{selected.workspaces.length === 1 ? '' : 's'}</div>
              </div>

              {selected.workspaces.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: type.size.sm, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Workspaces</div>
                  {selected.workspaces.map(w => (
                    <div key={w.id} style={{ fontSize: type.size.caption, color: D.muted, padding: '3px 0' }}>
                      {w.name} <span style={{ color: D.faint }}>· {w.plan} · {w.role}</span>
                    </div>
                  ))}
                </div>
              )}

              {selected.coverage && (
                <div style={{ marginTop: 12, fontSize: type.size.sm, color: D.warn, lineHeight: 1.5 }}>
                  ⚠ {selected.coverage}
                </div>
              )}

              {/* Support notes */}
              <div style={{ marginTop: 20, borderTop: `1px solid ${D.border}`, paddingTop: 14 }}>
                <div style={{ fontSize: type.size.base, fontWeight: 700, marginBottom: 4 }}>Support notes</div>
                <div style={{ fontSize: type.size.sm, color: D.faint, marginBottom: 10 }}>Append-only — corrections are new notes, never edits.</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    style={inputStyle} placeholder="Add a note about this user…"
                    value={noteBody} onChange={e => setNoteBody(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addNote(); }}
                  />
                  <button style={btnStyle(true)} disabled={busy || !noteBody.trim()} onClick={addNote}>Add</button>
                </div>
                {notes && notes.length === 0 && (
                  <div style={{ fontSize: type.size.caption, color: D.faint }}>No notes yet.</div>
                )}
                {notes && notes.map(n => (
                  <div key={n.id} style={{ padding: '8px 0', borderBottom: `1px solid ${D.border}` }}>
                    <div style={{ fontSize: type.size.base, color: D.text, lineHeight: 1.5 }}>{n.body}</div>
                    <div style={{ fontSize: type.size.xs, color: D.faint, marginTop: 3, fontFamily: D.mono }}>
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
        <div style={{ marginTop: 14, fontSize: type.size.sm, color: D.faint }}>{coverage}</div>
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
          {results && results.length === 0 && <div style={{ fontSize: type.size.caption, color: D.faint }}>No workspaces found.</div>}
          {results && results.map(w => (
            <button key={w.id} onClick={() => openWs(w.id)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: selected?.workspace?.id === w.id ? D.surface2 : D.surface,
              border: `1px solid ${D.border}`, borderRadius: 8, padding: '10px 12px',
              marginBottom: 6, cursor: 'pointer', fontFamily: D.ff,
            }}>
              <div style={{ fontSize: type.size.base, color: D.text, fontWeight: 600 }}>
                {w.name || '(unnamed)'}
                <span style={{ color: D.accent, fontSize: type.size.xs, marginLeft: 8 }}>{w.plan}</span>
              </div>
              <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>
                {w.member_count} member{w.member_count === 1 ? '' : 's'} · created {fmtTs(w.created_at)}
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected && <div style={{ fontSize: type.size.caption, color: D.faint }}>Select a workspace to see members and synced events.</div>}
          {selected && (
            <div>
              <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.text }}>
                {selected.workspace.name || '(unnamed)'}
                <span style={{ color: D.accent, fontSize: type.size.sm, marginLeft: 8 }}>{selected.workspace.plan}</span>
              </div>
              <div style={{ fontSize: type.size.sm, color: D.faint, marginTop: 3, fontFamily: D.mono }}>
                id: {selected.workspace.id} · created {fmtTs(selected.workspace.created_at)}
              </div>

              {/* Members */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: type.size.sm, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Members ({selected.members.length})
                </div>
                {selected.members.map(m => (
                  <button key={m.user_id} onClick={() => m.user_id && onOpenUser?.(m.user_id)} style={{
                    display: 'flex', width: '100%', textAlign: 'left', gap: 10, alignItems: 'baseline',
                    background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8,
                    padding: '8px 12px', marginBottom: 5, cursor: 'pointer', fontFamily: D.ff,
                  }}>
                    <span style={{ fontSize: type.size.base, color: D.text, fontWeight: 600, flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.email || '(no email)'}{m.name ? <span style={{ color: D.muted, fontWeight: 400 }}> · {m.name}</span> : null}
                    </span>
                    <span style={{ fontSize: type.size.sm, color: D.accent }}>{m.role}</span>
                  </button>
                ))}
              </div>

              {/* Synced events (pointers only) */}
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: type.size.sm, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Synced events ({selected.events.length})
                </div>
                <div style={{ fontSize: type.size.sm, color: D.warn, marginBottom: 8, lineHeight: 1.5 }}>⚠ {selected.events_note}</div>
                {selected.events.length === 0 && <div style={{ fontSize: type.size.caption, color: D.faint }}>No synced events.</div>}
                {selected.events.map(ev => (
                  <div key={ev.event_id} style={{
                    display: 'flex', gap: 12, alignItems: 'baseline',
                    padding: '6px 0', borderBottom: `1px solid ${D.border}`, fontSize: type.size.caption,
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
          background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm,
          cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline',
        }}>{busy ? 'loading…' : 'refresh'}</button>
        {stuckCount > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: type.size.caption, color: D.bad, fontWeight: 700 }}>
            {stuckCount} stuck
          </span>
        )}
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}
      {note && <Banner tone="warn">{note}</Banner>}

      {rows && rows.length === 0 && (
        <div style={{ fontSize: type.size.caption, color: D.faint }}>No {scope === 'all' ? '' : 'pending '}invitations.</div>
      )}
      {rows && rows.map(inv => (
        <div key={inv.id} style={{
          display: 'flex', gap: 12, alignItems: 'center',
          background: D.surface, border: `1px solid ${D.border}`,
          borderLeft: `2px solid ${inv.stuck ? D.bad : inv.used_at ? D.good : D.border}`,
          borderRadius: 8, padding: '10px 12px', marginBottom: 6,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: type.size.base, color: D.text, fontWeight: 600 }}>
              {inv.invitee_user_id ? (
                <button onClick={() => onOpenUser?.(inv.invitee_user_id)} style={{
                  background: 'none', border: 'none', color: D.text, fontWeight: 600,
                  fontSize: type.size.base, cursor: 'pointer', fontFamily: D.ff, padding: 0, textAlign: 'left',
                }}>{inv.email}</button>
              ) : inv.email}
              <span style={{ color: D.accent, fontSize: type.size.xs, marginLeft: 8 }}>{inv.role}</span>
              {inv.stuck && (
                <span style={{ color: D.bad, fontSize: type.size.xs, marginLeft: 8, fontWeight: 700,
                  border: `1px solid ${D.bad}55`, borderRadius: 4, padding: '1px 5px' }}>STUCK</span>
              )}
              {inv.used_at && (
                <span style={{ color: D.good, fontSize: type.size.xs, marginLeft: 8 }}>claimed</span>
              )}
            </div>
            <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>
              {inv.studio_name || '(unknown workspace)'}
              {inv.invited_by_email ? ` · by ${inv.invited_by_email}` : ''} · invited {fmtTs(inv.created_at)}
            </div>
            {inv.stuck && (
              <div style={{ fontSize: type.size.sm, color: D.faint, marginTop: 3 }}>
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

// ─── Metrics tab — A1 Activation funnel (P1; A2 AI-cost section lands here too) ─
// Honest beta health from server-synced state. Tiny-N is shown truthfully (Tufte:
// "3 of 7", never a vanity curve). "Synced an event" is a proxy — the server can't
// tell a real event from the sample, and the row says so.
function MetricsPanel() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try { setData(await adminApi.activation()); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const funnel = data?.funnel;
  const top = funnel?.[0]?.count || 0;
  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Activation</div>
        <button onClick={load} disabled={busy} style={{
          background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm,
          cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline',
        }}>{busy ? 'loading…' : 'refresh'}</button>
        {data?.new_signups && (
          <span style={{ marginLeft: 'auto', fontSize: type.size.caption, color: D.muted }}>
            <span style={{ color: D.good, fontWeight: 700 }}>+{data.new_signups.d7}</span> in 7d
            {' · '}<span style={{ color: D.muted, fontWeight: 700 }}>+{data.new_signups.d30}</span> in 30d
          </span>
        )}
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}

      {data && top === 0 && <div style={{ fontSize: type.size.base, color: D.faint }}>No signups yet.</div>}

      {data && top > 0 && (
        <div>
          {funnel.map((s, i) => {
            const prev = i > 0 ? funnel[i - 1].count : null;
            return (
              <div key={s.key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: type.size.base, color: D.text, fontWeight: 600, flex: 1 }}>{s.label}</span>
                  <span style={{ fontSize: type.size.lg, color: D.text, fontWeight: 700, fontFamily: D.mono }}>{s.count}</span>
                  <span style={{ fontSize: type.size.sm, color: D.faint, width: 92, textAlign: 'right' }}>
                    {pct(s.count, top)}% of signups
                    {prev !== null && <span style={{ color: prev > 0 && s.count < prev ? D.warn : D.faint }}> · {pct(s.count, prev)}→</span>}
                  </span>
                </div>
                <div style={{ height: 8, background: D.bg, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct(s.count, top)}%`, background: D.accent, borderRadius: 4 }} />
                </div>
                {s.note && <div style={{ fontSize: type.size.xs, color: D.warn, marginTop: 4 }}>⚠ {s.note}</div>}
              </div>
            );
          })}
          <div style={{ fontSize: type.size.sm, color: D.faint, marginTop: 14, lineHeight: 1.5 }}>{data.coverage}</div>
        </div>
      )}
    </div>
  );
}

// ─── Activation tab — per-planner funnel board ("First 50 Real Events" sprint) ──
// The Metrics tab shows the AGGREGATE funnel; this shows WHO is where, so a recruit
// who stalls is visible by name. Built from /api/admin/users (server truth: joined,
// last active, synced-event count) — no new endpoint. Honest limit: the server can't
// see a real event vs the sample (event bodies are localStorage-first), so "synced
// events" is a proxy for activity, never proof of a real qualified event. The strict
// real-event funnel (EVENT_QUALIFIED → SECOND_EVENT_CREATED) lives in PostHog.
const _daysSince = (t) => { if (!t) return null; const ms = Date.now() - Date.parse(t); return Number.isFinite(ms) ? Math.floor(ms / 86400000) : null; };
const _stageOf = (u) => {
  const events = Number(u.event_count) || 0;
  const idle = _daysSince(u.last_sign_in_at);
  if (events > 0 && idle !== null && idle <= 14) return { key: 'active', label: 'Active · has events', color: D.good };
  if (events > 0)                                 return { key: 'has_events', label: 'Has events', color: D.accent };
  if (u.last_sign_in_at)                          return { key: 'returned', label: 'Signed in, no event', color: D.warn };
  return { key: 'signed_up', label: 'Signed up only', color: D.muted };
};

function ActivationPanel({ onOpenUser }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try { const r = await adminApi.users(''); setRows(r?.users || []); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const tally = (rows || []).reduce((acc, u) => { acc[_stageOf(u).key] = (acc[_stageOf(u).key] || 0) + 1; return acc; }, {});
  const total = (rows || []).length;
  const withEvents = (tally.active || 0) + (tally.has_events || 0);
  // Most-at-risk first: stalled (signed-in, no event) and idle accounts to the top.
  const sorted = [...(rows || [])].sort((a, b) => {
    const ra = _stageOf(a).key === 'returned' ? 0 : 1;
    const rb = _stageOf(b).key === 'returned' ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return (_daysSince(b.last_sign_in_at) ?? 1e9) - (_daysSince(a.last_sign_in_at) ?? 1e9);
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Activation — by planner</div>
        <button onClick={load} disabled={busy} style={{ background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm, cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline' }}>{busy ? 'loading…' : 'refresh'}</button>
        {rows && <span style={{ marginLeft: 'auto', fontSize: type.size.caption, color: D.muted }}><span style={{ color: D.good, fontWeight: 700 }}>{withEvents}</span> of {total} have synced an event</span>}
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}
      {rows && total === 0 && <div style={{ fontSize: type.size.base, color: D.faint }}>No accounts yet. Recruiting (Workstream A) is the unblock.</div>}

      {rows && total > 0 && (
        <>
          {/* mini per-person funnel tally */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              { k: 'signed_up', label: 'Signed up only', c: D.muted },
              { k: 'returned', label: 'No event yet', c: D.warn },
              { k: 'has_events', label: 'Has events', c: D.accent },
              { k: 'active', label: 'Active · has events', c: D.good },
            ].map(s => (
              <div key={s.k} style={{ flex: '1 1 120px', background: D.surface, border: `1px solid ${D.border}`, borderLeft: `2px solid ${s.c}`, borderRadius: 8, padding: '8px 11px' }}>
                <div style={{ fontSize: type.size['2xl'], fontWeight: 700, color: D.text, fontFamily: D.mono }}>{tally[s.k] || 0}</div>
                <div style={{ fontSize: type.size.xs, color: D.muted, marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {sorted.map(u => {
            const st = _stageOf(u);
            const idle = _daysSince(u.last_sign_in_at);
            return (
              <button key={u.id} onClick={() => onOpenUser && onOpenUser(u.id)} style={{
                display: 'block', width: '100%', textAlign: 'left', background: D.surface,
                border: `1px solid ${D.border}`, borderLeft: `2px solid ${st.color}`, borderRadius: 8,
                padding: '9px 12px', marginBottom: 6, cursor: 'pointer', fontFamily: D.ff,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: type.size.base, color: D.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.email || '(no email)'}{u.role && <span style={{ color: D.accent, fontSize: type.size.xs, marginLeft: 8 }}>{u.role}</span>}
                  </span>
                  <span style={{ fontSize: type.size.xs, fontWeight: 700, color: st.color, flexShrink: 0 }}>{st.label}</span>
                </div>
                <div style={{ fontSize: type.size.xs, color: D.faint, marginTop: 3, fontFamily: D.mono }}>
                  {u.event_count} synced · joined {fmtTs(u.created_at).slice(0, 10)} · {idle === null ? 'never signed in' : idle === 0 ? 'active today' : `idle ${idle}d`}
                </div>
              </button>
            );
          })}
          <div style={{ fontSize: type.size.xs, color: D.faint, marginTop: 12, lineHeight: 1.5 }}>
            ⚠ "Synced an event" is a server proxy — it can't tell a real qualified event from the sample. The strict real-event funnel (qualified → completed → second event) is in PostHog.
          </div>
        </>
      )}
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
          background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm,
          cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline',
        }}>{busy ? 'loading…' : 'refresh'}</button>
      </div>

      {data?.sentry_note && <Banner tone="muted">{data.sentry_note}</Banner>}
      {data?.note && <Banner tone="warn">{data.note}</Banner>}
      {err && <Banner tone="bad">Error: {err}</Banner>}

      {rows && rows.length === 0 && (
        <div style={{ fontSize: type.size.base, color: D.good, fontWeight: 600, marginTop: 8 }}>
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
            <span style={{ fontSize: type.size.xs, fontWeight: 700, color: SOURCE_COLOR(e.source),
              textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{e.source}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: type.size.base, color: D.text }}>{e.message}</span>
            <span style={{ fontSize: type.size.xs, color: D.faint, fontFamily: D.mono, whiteSpace: 'nowrap' }}>{fmtTs(e.created_at)}</span>
          </div>
          {e.context && Object.keys(e.context).length > 0 && (
            <div style={{ fontSize: type.size.xs, color: D.faint, fontFamily: D.mono, marginTop: 3 }}>
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
        <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          What needs you
        </div>
        <button onClick={load} disabled={busy} style={{
          background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm,
          cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline',
        }}>{busy ? 'refreshing…' : 'refresh'}</button>
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}

      {data && (
        <>
          {needsYou === 0 ? (
            <div style={{ padding: '28px 0 8px' }}>
              <div style={{ fontSize: type.size['3xl'], fontWeight: 700, color: D.good }}>Caught up</div>
              <div style={{ fontSize: type.size.base, color: D.muted, marginTop: 6, maxWidth: 460, lineHeight: 1.6 }}>
                Nobody's stuck at the front door, stalled in onboarding, or going quiet —
                as far as server-synced state can see.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 40 /* display numeral */, fontWeight: 800, color: D.text, lineHeight: 1.1, margin: '6px 0 18px' }}>
              {needsYou}
              <span style={{ fontSize: type.size.lg, fontWeight: 600, color: D.muted, marginLeft: 10 }}>
                {needsYou === 1 ? 'person needs a look' : 'people need a look'}
              </span>
            </div>
          )}

          {/* Buckets */}
          {data.buckets.map(b => (
            <div key={b.key} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 2 }}>
                <span style={{
                  fontSize: type.size.base, fontWeight: 700,
                  color: b.total > 0 ? toneColor(b.tone) : D.faint,
                }}>{b.label}</span>
                <span style={{ fontSize: type.size.caption, color: D.faint, fontFamily: D.mono }}>
                  {b.total}{b.total > b.items.length ? ` · showing ${b.items.length}` : ''}
                </span>
              </div>
              <div style={{ fontSize: type.size.sm, color: D.faint, marginBottom: 8 }}>{b.hint}</div>
              {b.items.length === 0 ? (
                <div style={{ fontSize: type.size.caption, color: D.faint, fontStyle: 'italic' }}>None.</div>
              ) : b.items.map(it => (
                <button key={it.id} onClick={() => onOpenUser?.(it.id)} style={{
                  display: 'flex', width: '100%', textAlign: 'left', gap: 12, alignItems: 'baseline',
                  background: D.surface, border: `1px solid ${D.border}`, borderLeft: `2px solid ${toneColor(b.tone)}`,
                  borderRadius: 8, padding: '8px 12px', marginBottom: 5, cursor: 'pointer', fontFamily: D.ff,
                }}>
                  <span style={{ fontSize: type.size.base, color: D.text, fontWeight: 600, flex: 1, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.email || '(no email)'}{it.name ? <span style={{ color: D.muted, fontWeight: 400 }}> · {it.name}</span> : null}
                  </span>
                  <span style={{ fontSize: type.size.xs, color: D.faint, fontFamily: D.mono, whiteSpace: 'nowrap' }}>
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
              <span style={{ fontSize: type.size.caption, fontWeight: 700, color: data.system.errors_24h > 0 ? D.bad : D.faint }}>
                {data.system.errors_24h > 0
                  ? `⚠ ${data.system.errors_24h} server error${data.system.errors_24h === 1 ? '' : 's'} in last 24h →`
                  : '✓ No server errors in last 24h'}
              </span>
            </button>
          )}

          <div style={{ fontSize: type.size.sm, color: D.faint, marginTop: 14, lineHeight: 1.5 }}>
            {data.coverage}
          </div>

          {/* De-emphasized debug affordance — the old whoami gate-check, tucked away */}
          <div style={{ marginTop: 22, borderTop: `1px solid ${D.border}`, paddingTop: 12 }}>
            <button onClick={() => { setShowGate(v => !v); if (!whoami) runGate(); }} style={{
              background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm,
              cursor: 'pointer', fontFamily: D.ff,
            }}>{showGate ? '▾' : '▸'} Gate check (debug)</button>
            {showGate && (
              <pre style={{
                marginTop: 8, background: D.surface, border: `1px solid ${D.border}`,
                borderRadius: 8, padding: 12, fontSize: type.size.sm, color: D.muted, fontFamily: D.mono, overflowX: 'auto',
              }}>{whoami ? JSON.stringify(whoami, null, 2) : '— probing… —'}</pre>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Analytics suite (ANALYTICS-1) ────────────────────────────────────────────
// One top-level tab with horizontal sub-tabs. Executive reads the SERVER funnel
// (activation API). Funnel/Friction are LINK-OUTS to PostHog (behavioral data is
// write-only server-side — we never fabricate it here). Playbook/Memory/Cultural/
// Location read THIS browser's 'ngw-events' book via analyticsReader and carry a
// loud honesty banner: book-only, not a fleet metric.
const A_SUBTABS = ['Executive', 'Funnel', 'Friction', 'Playbook', 'Memory', 'Cultural', 'Location'];
const POSTHOG_URL = 'https://us.posthog.com';

// Read the local book once per render of a panel. Defensive parse.
function readLocalBook() {
  try { return JSON.parse(localStorage.getItem('ngw-events') || '[]'); }
  catch { return []; }
}

const BOOK_ONLY_NOTE = "This browser's book only — not a fleet metric.";

// Compact stat row used by the local-data panels.
function Stat({ label, value, sub }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 0',
      borderBottom: `1px solid ${D.border}`,
    }}>
      <span style={{ fontSize: type.size.base, color: D.text, flex: 1 }}>{label}</span>
      {sub && <span style={{ fontSize: type.size.sm, color: D.faint }}>{sub}</span>}
      <span style={{ fontSize: type.size.lg, color: D.text, fontWeight: 700, fontFamily: D.mono }}>{value}</span>
    </div>
  );
}

// Mini horizontal bar for a { key: count } map.
function MiniBars({ map }) {
  const entries = Object.entries(map || {}).sort((a, b) => b[1] - a[1]);
  const top = entries.length ? Math.max(...entries.map(([, n]) => n)) : 0;
  if (!entries.length) return <div style={{ fontSize: type.size.caption, color: D.faint }}>None.</div>;
  return (
    <div>
      {entries.map(([k, n]) => (
        <div key={k} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 3 }}>
            <span style={{ fontSize: type.size.caption, color: D.text, flex: 1, wordBreak: 'break-word' }}>{k}</span>
            <span style={{ fontSize: type.size.base, color: D.text, fontWeight: 700, fontFamily: D.mono }}>{n}</span>
          </div>
          <div style={{ height: 7, background: D.bg, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${top > 0 ? Math.round((n / top) * 100) : 0}%`, background: D.accent, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyBook() {
  return (
    <div style={{ fontSize: type.size.base, color: D.faint, padding: '24px 0', lineHeight: 1.6 }}>
      No events in this browser's book yet. Open or create an event in the app, then
      reload this console.
    </div>
  );
}

const BookBanner = () => <Banner tone="warn">{BOOK_ONLY_NOTE}</Banner>;

// Executive — KPI strip from the SERVER activation funnel (server-synced proxy).
// Tries the future overview endpoint first, degrades to activation()/triage().
function ExecutivePanel() {
  const [data, setData] = useState(null);
  const [triage, setTriage] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    // Executive overview is a future endpoint — try it, but fall back gracefully.
    try { await adminApi.overview(); } catch { /* expected 404 today — ignore */ }
    try { setData(await adminApi.activation()); }
    catch (e) { setErr(e.message); }
    try { setTriage(await adminApi.triage()); } catch { /* optional */ }
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const funnel = data?.funnel;
  const top = funnel?.[0]?.count || 0;
  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
  const triageTotal = triage?.buckets
    ? triage.buckets.reduce((a, b) => a + (Number(b.total) || (b.items || []).length), 0)
    : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Executive</div>
        <button onClick={load} disabled={busy} style={{
          background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm,
          cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline',
        }}>{busy ? 'loading…' : 'refresh'}</button>
        {data?.new_signups && (
          <span style={{ marginLeft: 'auto', fontSize: type.size.caption, color: D.muted }}>
            <span style={{ color: D.good, fontWeight: 700 }}>+{data.new_signups.d7}</span> in 7d
            {' · '}<span style={{ color: D.muted, fontWeight: 700 }}>+{data.new_signups.d30}</span> in 30d
          </span>
        )}
      </div>

      {err && <Banner tone="bad">Error: {err}</Banner>}

      {/* KPI strip — stacks on mobile via flex-wrap */}
      {data && top > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          {funnel.map((s) => (
            <div key={s.key} style={{
              flex: '1 1 120px', minWidth: 120, background: D.surface2,
              border: `1px solid ${D.border}`, borderRadius: 8, padding: '12px 14px',
            }}>
              <div style={{ fontSize: type.size['3xl'], fontWeight: 800, color: D.text, fontFamily: D.mono }}>{s.count}</div>
              <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: type.size.xs, color: D.faint, marginTop: 2 }}>{pct(s.count, top)}% of signups</div>
            </div>
          ))}
          {triageTotal !== null && (
            <div style={{
              flex: '1 1 120px', minWidth: 120, background: D.surface2,
              border: `1px solid ${D.border}`, borderRadius: 8, padding: '12px 14px',
            }}>
              <div style={{ fontSize: type.size['3xl'], fontWeight: 800, color: triageTotal > 0 ? D.warn : D.text, fontFamily: D.mono }}>{triageTotal}</div>
              <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>Need attention now</div>
              <div style={{ fontSize: type.size.xs, color: D.faint, marginTop: 2 }}>from Triage</div>
            </div>
          )}
        </div>
      )}

      {/* Funnel bars — reuse the MetricsPanel rendering. */}
      {data && top > 0 && (
        <div>
          {funnel.map((s, i) => {
            const prev = i > 0 ? funnel[i - 1].count : null;
            return (
              <div key={s.key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: type.size.base, color: D.text, fontWeight: 600, flex: 1 }}>{s.label}</span>
                  <span style={{ fontSize: type.size.lg, color: D.text, fontWeight: 700, fontFamily: D.mono }}>{s.count}</span>
                  <span style={{ fontSize: type.size.sm, color: D.faint, width: 92, textAlign: 'right' }}>
                    {pct(s.count, top)}% of signups
                    {prev !== null && <span style={{ color: prev > 0 && s.count < prev ? D.warn : D.faint }}> · {pct(s.count, prev)}→</span>}
                  </span>
                </div>
                <div style={{ height: 8, background: D.bg, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct(s.count, top)}%`, background: D.accent, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && top === 0 && <div style={{ fontSize: type.size.base, color: D.faint }}>No signups yet.</div>}

      <Banner tone="muted">
        {data?.coverage || 'Server-synced proxy — "synced an event" cannot tell a real qualified event from the sample. The strict behavioral funnel lives in PostHog.'}
      </Banner>
    </div>
  );
}

// Funnel / Friction — PostHog link-outs. Behavioral data is write-only server-side;
// we never fabricate it. Each is a short explainer + an "Open in PostHog ↗" button.
function PostHogLinkPanel({ title, body }) {
  return (
    <div>
      <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>{title}</div>
      <Banner tone="muted">
        The behavioral {title.toLowerCase()} lives in PostHog. NGW writes events to
        PostHog server-side (write-only) — this console cannot read them back, so no
        numbers are shown here. Open PostHog for the live charts.
      </Banner>
      <div style={{ fontSize: type.size.base, color: D.muted, lineHeight: 1.6, marginBottom: 16 }}>{body}</div>
      <a href={POSTHOG_URL} target="_blank" rel="noopener noreferrer" style={{
        display: 'inline-block', background: D.accent, color: '#fff', textDecoration: 'none',
        border: `1px solid ${D.accent}`, borderRadius: 6, padding: '8px 16px',
        fontSize: type.size.base, fontWeight: 600, fontFamily: D.ff,
      }}>Open in PostHog ↗</a>
    </div>
  );
}

// Funnel / Friction via the PostHog HogQL proxy. Tries the server proxy; if it isn't
// configured (key absent) or errors, falls back to the honest PostHogLinkPanel.
function PostHogPanel({ mode }) {  // mode: 'funnel' | 'friction'
  const [data, setData] = useState(null);
  const [breakdowns, setBreakdowns] = useState(null);
  const [state, setState] = useState('loading');  // loading | native | fallback

  const load = useCallback(async () => {
    setState('loading');
    try {
      const f = await adminApi.posthogFunnel(30);
      if (!f || f.configured === false || !Array.isArray(f.funnel)) { setState('fallback'); return; }
      setData(f);
      if (mode === 'funnel') {
        const [voice, market, host] = await Promise.all([
          adminApi.posthogBreakdown('voice', 30).catch(() => null),
          adminApi.posthogBreakdown('market', 30).catch(() => null),
          adminApi.posthogBreakdown('is_host', 30).catch(() => null),
        ]);
        setBreakdowns({ voice, market, host });
      }
      setState('native');
    } catch { setState('fallback'); }
  }, [mode]);
  useEffect(() => { load(); }, [load]);

  if (state === 'loading') return <div style={{ fontSize: type.size.base, color: D.faint }}>Loading from PostHog…</div>;
  if (state === 'fallback') {
    return mode === 'friction'
      ? <PostHogLinkPanel title="Friction" body="Where users stall, drop off, or rage-click. Session and event-stream analysis lives in PostHog — open it to inspect paths and retention." />
      : <PostHogLinkPanel title="Funnel" body="Sign-up → first event → qualified → completed → second event. Each step is a server-side PostHog event; the conversion funnel is built and filtered in PostHog." />;
  }

  const funnel = data.funnel || [];
  const top = funnel[0]?.count || 0;
  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
  const bdRows = (b) => (b && b.configured && Array.isArray(b.rows)) ? b.rows : [];

  if (mode === 'friction') {
    return (
      <div>
        <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Friction — where they drop (PostHog · 30d)</div>
        <button onClick={load} style={{ background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm, cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline', marginBottom: 12 }}>refresh</button>
        {funnel.slice(1).map((s, i) => {
          const prev = funnel[i];
          const conv = pct(s.count, prev.count);
          const drop = 100 - conv;
          const worst = drop >= 40;
          return (
            <div key={s.key} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: type.size.base, color: D.text, marginBottom: 4 }}>
                <span>{prev.label} → {s.label}</span>
                <span style={{ color: worst ? D.warn : D.muted, fontWeight: 700, fontFamily: D.mono }}>{conv}% kept · {drop}% lost{worst ? ' ◀ biggest leak' : ''}</span>
              </div>
              <div style={{ height: 8, background: D.bg, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${conv}%`, background: worst ? D.warn : D.accent, borderRadius: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: type.size.lg, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Real-event funnel (PostHog · 30d)</div>
      <button onClick={load} style={{ background: 'transparent', border: 'none', color: D.faint, fontSize: type.size.sm, cursor: 'pointer', fontFamily: D.ff, textDecoration: 'underline', marginBottom: 12 }}>refresh</button>
      {top === 0 && <div style={{ fontSize: type.size.base, color: D.faint }}>No events in this window yet.</div>}
      {funnel.map((s, i) => (
        <div key={s.key} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: type.size.base, color: D.text, fontWeight: 600, flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: type.size.lg, color: D.text, fontWeight: 700, fontFamily: D.mono }}>{s.count}</span>
            <span style={{ fontSize: type.size.sm, color: D.faint, width: 96, textAlign: 'right' }}>{pct(s.count, top)}% of top{i > 0 && funnel[i - 1].count > 0 ? ` · ${pct(s.count, funnel[i - 1].count)}→` : ''}</span>
          </div>
          <div style={{ height: 8, background: D.bg, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct(s.count, top)}%`, background: D.accent, borderRadius: 4 }} />
          </div>
        </div>
      ))}
      {breakdowns && ['voice', 'market', 'host'].map(k => {
        const rows = bdRows(breakdowns[k]);
        if (!rows.length) return null;
        const label = k === 'host' ? 'Host vs planner' : k === 'voice' ? 'By occasion' : 'By market';
        const map = {}; rows.forEach(r => { map[r.value] = r.count; });
        return (
          <div key={k} style={{ marginTop: 16 }}>
            <div style={{ fontSize: type.size.caption, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
            <MiniBars map={map} />
          </div>
        );
      })}
    </div>
  );
}

function PlaybookPanel({ book }) {
  const c = playbookCoverage(book);
  if (c.total === 0) return (<div><BookBanner /><EmptyBook /></div>);
  const matched = c.total - c.unmatchedTypes.reduce((a, t) => a + (c.byType[t] || 0), 0);
  const f = funnelContent(book);
  return (
    <div>
      <BookBanner />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Stat label="Events in book" value={c.total} />
      </div>
      <div style={{ fontSize: type.size.caption, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '6px 0 8px' }}>Events by type</div>
      <MiniBars map={c.byType} />
      <div style={{ marginTop: 16 }}>
        <Stat label="Events with a matched playbook" value={matched} sub={`${c.total - matched} unmatched`} />
      </div>
      <div style={{ fontSize: type.size.caption, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>Local content completeness</div>
      <Stat label="Qualified (has date + guest count)" value={f.qualified} sub={`of ${f.total}`} />
      <Stat label="Has a run-of-show" value={f.withRos} sub={`of ${f.total}`} />
      <Stat label="Has captured outcomes" value={f.withOutcomes} sub={`of ${f.total}`} />
      <Stat label="Has recorded decisions" value={f.withDecisions} sub={`of ${f.total}`} />
      {c.unmatchedTypes.length > 0 && (
        <Banner tone="muted">
          No playbook for: {c.unmatchedTypes.join(', ')}. These types fall back to the
          generic path — candidates for a new playbook data file.
        </Banner>
      )}
    </div>
  );
}

function MemoryPanel({ book }) {
  const m = memoryDepth(book);
  const total = playbookCoverage(book).total;
  if (total === 0) return (<div><BookBanner /><EmptyBook /></div>);
  return (
    <div>
      <BookBanner />
      <Stat label="Events with captured outcomes" value={m.eventsWithOutcomes} />
      <Stat label="Events with a written lesson" value={m.eventsWithLessons} />
      <Stat label="Confirmed vendors tracked" value={m.vendorsTracked} />
      <Stat label="Vendors rehired (≥2 events)" value={m.rehiredVendors} />
      <div style={{ fontSize: type.size.sm, color: D.faint, marginTop: 12, lineHeight: 1.5 }}>
        Rehires are the compounding signal — a vendor confirmed across two or more
        events in this private book.
      </div>
    </div>
  );
}

function CulturalPanel({ book }) {
  const m = culturalMix(book);
  if (m.total === 0) return (<div><BookBanner /><EmptyBook /></div>);
  return (
    <div>
      <BookBanner />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: '1 1 120px', minWidth: 120, background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: type.size['3xl'], fontWeight: 800, color: D.text, fontFamily: D.mono }}>{m.festive}</div>
          <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>Festive</div>
        </div>
        <div style={{ flex: '1 1 120px', minWidth: 120, background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: type.size['3xl'], fontWeight: 800, color: D.text, fontFamily: D.mono }}>{m.sombre}</div>
          <div style={{ fontSize: type.size.sm, color: D.muted, marginTop: 2 }}>Sombre / remembrance</div>
        </div>
      </div>
      <div style={{ fontSize: type.size.caption, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '6px 0 8px' }}>By voice</div>
      <MiniBars map={m.byVoice} />
    </div>
  );
}

function LocationPanel({ book }) {
  const s = locationSpread(book);
  if (s.total === 0) return (<div><BookBanner /><EmptyBook /></div>);
  const pct = (x) => `${Math.round(x * 100)}%`;
  return (
    <div>
      <BookBanner />
      <Stat label="At-home share" value={pct(s.atHomeShare)} />
      <Stat label="Missing-venue share" value={pct(s.missingVenueShare)} />
      <div style={{ fontSize: type.size.caption, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>By market</div>
      <MiniBars map={s.byMarket} />
    </div>
  );
}

// ── INTEL-QA-1 Stage 1A — Intelligence Observatory (evaluation CAPTURE visibility) ───────────────
// Admin-only (this panel renders only inside the role-gated AdminConsole). Reads THIS browser's book
// via evaluationAudit — a pure, capture-only reader. NO scoring, NO grades, NO learning: the copy is
// deliberately honest about that. Never crashes on missing/malformed intelEvaluations.
const IE = { eyebrow: { fontSize: type.size.eyebrow || type.size.caption, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: D.muted, margin: '22px 0 10px' } };
function IntelKpi({ label, value, tone }) {
  return (
    <div style={{ background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 8, padding: '11px 13px', minWidth: 118, flex: '1 0 118px' }}>
      <div style={{ fontSize: type.size.xl, fontWeight: 700, color: tone || D.text, fontFamily: D.mono }}>{value}</div>
      <div style={{ fontSize: type.size.caption, color: D.muted, marginTop: 3 }}>{label}</div>
    </div>
  );
}
function IEBlock({ title, obj }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: type.size.caption, fontWeight: 700, color: D.muted, marginBottom: 4 }}>{title}</div>
      <pre style={{ margin: 0, fontSize: type.size.sm, color: D.text, fontFamily: D.mono, background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, padding: 10, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(obj ?? null, null, 2)}</pre>
    </div>
  );
}
function IntelligencePanel({ book }) {
  const [filter, setFilter] = useState('');
  const [decision, setDecision] = useState('All');
  const [sel, setSel] = useState(null); // { eventId, recId }
  // Stage 1C — server-fleet first, client-book fallback. The server endpoint may 404 until the
  // backend implements it; on ANY failure we degrade to this browser's book. Never fakes fleet data.
  const [server, setServer] = useState({ status: isAdminApiConfigured() ? 'loading' : 'unconfigured', data: null });
  useEffect(() => {
    if (!isAdminApiConfigured()) return undefined;
    let live = true;
    adminApi.intelligence()
      .then((d) => { if (live) setServer({ status: 'ok', data: d }); })
      .catch(() => { if (live) setServer({ status: 'error', data: null }); });
    return () => { live = false; };
  }, []);
  const useServer = server.status === 'ok' && !!server.data && !!(server.data.audit || server.data.totals);
  let audit = null, conv = null;
  if (useServer) {
    const d = server.data.audit || server.data;
    audit = { totals: d.totals || {}, funnel: Array.isArray(d.funnel) ? d.funnel : [], records: Array.isArray(d.records) ? d.records : [], integrity: Array.isArray(d.integrity) ? d.integrity : [], scannedEvents: d.scannedEvents ?? null, eventsWithEvaluations: d.eventsWithEvaluations ?? null };
    conv = server.data.conversion || null;
  } else {
    try { audit = evaluationAudit(book); } catch { audit = null; }
    try { conv = conversionAudit(book); } catch { conv = null; }
  }
  const src = useServer ? 'Server Fleet' : 'This Browser';
  const srcMsg = useServer ? 'Server fleet data — admin scope.'
    : server.status === 'error' ? 'Fleet intelligence unavailable — showing this browser only.'
    : server.status === 'loading' ? 'Loading fleet data…'
    : 'Admin API not configured — showing this browser only.';
  const SourceBadge = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: type.size.caption, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 99, background: useServer ? `${D.good}22` : `${D.warn}22`, color: useServer ? D.good : D.warn }}>{src}</span>
      <span style={{ fontSize: type.size.caption, color: D.muted }}>{srcMsg}</span>
    </div>
  );
  if (!audit) return (<div><SourceBadge /><Banner tone="bad">Could not read evaluation data (safe fallback — nothing scored).</Banner></div>);
  const T = audit.totals || {};
  const ctrl = { background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: type.size.caption, padding: '7px 10px', fontFamily: D.ff, outline: 'none' };

  if (!T.records) {
    return (
      <div>
        <SourceBadge />
        {!useServer && <BookBanner />}
        <Banner tone="muted">Capture only — Scoring not started · Learning loop not active yet.</Banner>
        <div style={{ fontSize: type.size.base, color: D.faint, padding: '24px 0', lineHeight: 1.6 }}>No recommendation records {useServer ? 'in the fleet scope' : "in this browser's book"} yet. When R1 shows a recommendation on an event, a record is frozen.</div>
      </div>
    );
  }

  const rows = audit.records.filter((r) => (decision === 'All' || r.decision === decision) && (!filter || `${r.eventLabel} ${r.reader} ${r.recommendationType}`.toLowerCase().includes(filter.toLowerCase())));
  const drill = sel ? (() => { const e = (book || []).find((x) => x && x.id === sel.eventId); const rec = e && (e.intelEvaluations || []).find((r) => r && r.id === sel.recId); return rec ? { rec, event: e } : null; })() : null;
  const th = { textAlign: 'left', padding: '7px 10px', fontSize: type.size.caption, color: D.muted, borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' };
  const td = { padding: '7px 10px', fontSize: type.size.caption, color: D.text, borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' };

  return (
    <div>
      <SourceBadge />
      {!useServer && <BookBanner />}
      <Banner tone="muted">Capture + integrity only. Scoring not started · Learning loop not active yet · Better-than-baseline pending (Stage 2).</Banner>

      <div style={IE.eyebrow}>Overview</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
        <IntelKpi label="Events scanned" value={audit.scannedEvents} />
        <IntelKpi label="Events w/ evaluations" value={audit.eventsWithEvaluations} />
        <IntelKpi label="Recommendation records" value={T.records} />
        <IntelKpi label="Shown" value={T.shown} />
        <IntelKpi label="Accepted" value={T.accepted} />
        <IntelKpi label="Reverted" value={T.reverted} />
        <IntelKpi label="Overridden" value={T.overridden} />
        <IntelKpi label="Actuals attached" value={T.actualsAttached} />
        <IntelKpi label="Evaluation-ready" value={T.evaluationReady} />
        <IntelKpi label="Malformed" value={T.malformed} tone={T.malformed ? D.bad : undefined} />
        <IntelKpi label="Duplicate warnings" value={T.duplicateWarnings} tone={T.duplicateWarnings ? D.bad : undefined} />
      </div>

      <div style={IE.eyebrow}>Recommendation lifecycle funnel</div>
      {audit.funnel.map((f) => (
        <div key={f.stage} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
          <span style={{ width: 128, flexShrink: 0, fontSize: type.size.caption, color: D.muted, textTransform: 'capitalize' }}>{f.stage}</span>
          {f.available ? (
            <>
              <div style={{ height: 13, background: D.accent, borderRadius: 3, width: `${Math.max(2, Math.round(((f.value || 0) / Math.max(1, T.records)) * 240))}px`, opacity: 0.85 }} />
              <span style={{ fontFamily: D.mono, fontSize: type.size.sm, color: D.text }}>{f.value}</span>
            </>
          ) : (
            <span style={{ fontSize: type.size.caption, color: D.faint, fontStyle: 'italic' }}>unavailable — {f.note}</span>
          )}
        </div>
      ))}

      <div style={IE.eyebrow}>Data integrity</div>
      {audit.integrity.length === 0
        ? <div style={{ fontSize: type.size.base, color: D.good }}>✓ No integrity issues detected.</div>
        : audit.integrity.map((i, idx) => (
          <div key={idx} style={{ fontSize: type.size.caption, color: i.level === 'error' ? D.bad : D.warn, padding: '3px 0' }}>
            {i.level === 'error' ? '✕' : '⚠'} <span style={{ fontFamily: D.mono }}>[{i.code}]</span> {i.message} <span style={{ color: D.faint }}>· {i.eventId || '—'}</span>
          </div>
        ))}

      <div style={IE.eyebrow}>Evaluation records</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by event / reader / type…" style={{ ...ctrl, flex: 1 }} />
        <select value={decision} onChange={(e) => setDecision(e.target.value)} style={ctrl}>{['All', 'Accepted', 'Reverted', 'Overridden', 'Pending'].map((d) => <option key={d}>{d}</option>)}</select>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
          <thead><tr>{['Event', 'Type', 'Reader', 'Recommendation', 'Baseline', 'Decision', 'Actual', 'Eval-ready', 'Engine', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.eventId + i}>
                <td style={td}>{r.eventLabel}</td>
                <td style={td}>{r.recommendationType}</td>
                <td style={td}>{r.reader}</td>
                <td style={td}>{r.snapshot ? `${r.snapshot.from} → ${r.snapshot.to}` : '—'}</td>
                <td style={td}>{r.baselinePresent ? 'yes' : <span style={{ color: D.warn }}>no</span>}</td>
                <td style={td}>{r.decision}</td>
                <td style={td}>{r.actualAttached ? 'attached' : <span style={{ color: D.faint }}>pending</span>}</td>
                <td style={td}>{r.evaluationReady ? 'ready' : <span style={{ color: D.faint }}>pending</span>}</td>
                <td style={td}>{r.reader} v{r.engine ?? '?'} · rec v{r.version ?? '?'}</td>
                <td style={td}><button onClick={() => setSel({ eventId: r.eventId, recId: `${r.reader}:${r.eventId}` })} style={{ ...ctrl, cursor: 'pointer', padding: '4px 10px' }}>view</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {conv && (
        <>
          <div style={IE.eyebrow}>Conversion — local acceptance &amp; reconciliation</div>
          <div style={{ fontSize: type.size.caption, color: D.faint, marginBottom: 8, lineHeight: 1.5 }}>This browser only · "conversion" = the recommendation's lifecycle outcome, NOT a purchase. Paid / CTA / signup conversion is behavioral (PostHog) — see Unavailable below.</div>
          {conv.funnel.map((f) => (
            <div key={f.stage} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
              <span style={{ width: 180, flexShrink: 0, fontSize: type.size.caption, color: D.muted }}>{f.stage}</span>
              <span style={{ fontFamily: D.mono, fontSize: type.size.sm, color: D.text }}>{f.value}</span>
              {f.pct != null && <span style={{ fontSize: type.size.caption, color: D.faint }}>· {f.pct}%</span>}
            </div>
          ))}
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {Object.values(conv.rates).map((r) => <IntelKpi key={r.label} label={r.label} value={r.pct == null ? '—' : r.pct + '%'} />)}
          </div>
          {['byType', 'byConfidence', 'byReader', 'byEngine'].map((dim) => {
            const rows = conv.byDimension[dim]; if (!rows.length) return null;
            const title = { byType: 'By type', byConfidence: 'By confidence', byReader: 'By reader', byEngine: 'By engine' }[dim];
            return (
              <div key={dim} style={{ marginTop: 12 }}>
                <div style={{ fontSize: type.size.caption, fontWeight: 700, color: D.muted, marginBottom: 4 }}>{title}</div>
                {rows.map((g) => <div key={g.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: type.size.caption, color: D.text, padding: '3px 0' }}><span>{g.key}</span><span style={{ color: D.muted }}>{g.shown} shown · {g.accepted} acc · {g.reverted} rev · {g.acceptRate == null ? '—' : g.acceptRate + '%'}</span></div>)}
              </div>
            );
          })}
          <div style={{ ...IE.eyebrow, marginTop: 18 }}>Unavailable — behavioral conversion (PostHog)</div>
          {conv.unavailable.map((u, i) => (
            <div key={i} style={{ padding: '6px 0', borderTop: `1px solid ${D.border}` }}>
              <div style={{ fontSize: type.size.caption, color: D.warn, fontWeight: 700 }}>⚠ {u.metric}</div>
              <div style={{ fontSize: type.size.caption, color: D.muted, marginTop: 2 }}>{u.reason}</div>
              <div style={{ fontSize: type.size.caption, color: D.faint, marginTop: 2 }}>Needs: {u.needs}</div>
            </div>
          ))}
        </>
      )}

      {drill && (
        <div style={{ marginTop: 18, border: `1px solid ${D.border}`, borderRadius: 8, padding: 14, background: D.surface }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: D.text }}>{drill.rec.id} <span style={{ color: D.faint, fontWeight: 400 }}>· {drill.rec.readerId}</span></div>
            <button onClick={() => setSel(null)} style={{ ...ctrl, cursor: 'pointer' }}>close</button>
          </div>
          <div style={{ fontSize: type.size.caption, color: D.muted, marginTop: 4 }}>Actual attached: {drill.rec.actual ? 'yes' : 'no'} · Better-than-baseline pending (Stage 2 scoring not started)</div>
          <IEBlock title="Frozen recommendation snapshot" obj={drill.rec.recommendation} />
          <IEBlock title="Baseline (today's default)" obj={drill.rec.baseline} />
          <IEBlock title="Counterfactual (default / reader / host / actual)" obj={drill.rec.counterfactual} />
          <IEBlock title="Lifecycle (append-only history)" obj={drill.rec.lifecycle} />
          <IEBlock title="Actual (write-once, real only)" obj={drill.rec.actual} />
          <IEBlock title="Reserved — evaluation (Stage 2)" obj={drill.rec.evaluation} />
          <IEBlock title="Reserved — utility (future)" obj={drill.rec.utility} />
          {(() => { const iss = audit.integrity.filter((x) => x.recId === drill.rec.id); return iss.length ? <IEBlock title="Integrity warnings" obj={iss} /> : <div style={{ marginTop: 10, fontSize: type.size.caption, color: D.good }}>✓ No integrity issues on this record.</div>; })()}
        </div>
      )}
    </div>
  );
}

// ── Admin Settings — session, environment, feature flags, and safe actions ───────────────────────
function AdminSettingsPanel() {
  const { user, bypass, signOut, configured } = useAuth();
  const role = (user && user.app_metadata && user.app_metadata.role) || '—';
  const email = (user && user.email) || '—';
  const flag = (fn) => { try { return fn() ? 'on' : 'off'; } catch { return '?'; } };
  const piFlags = (() => { try { return Object.keys(localStorage).filter((k) => /^ngw-pi-/.test(k)).map((k) => [k.replace(/^ngw-/, ''), localStorage.getItem(k)]); } catch { return []; } })();
  const Head = ({ children }) => <div style={{ fontSize: type.size.caption, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.muted, margin: '22px 0 8px' }}>{children}</div>;
  const btn = { background: D.surface2, border: `1px solid ${D.border}`, color: D.text, borderRadius: 8, padding: '9px 15px', cursor: 'pointer', fontFamily: D.ff, fontSize: type.size.caption };
  return (
    <div style={{ maxWidth: 560 }}>
      <Head>Session</Head>
      <Stat label="Signed in as" value={email} />
      <Stat label="Role" value={role} />
      <Stat label="Session type" value={bypass ? 'Dev bypass' : 'Supabase'} />
      <Head>Environment</Head>
      <Stat label="Admin API" value={isAdminApiConfigured() ? 'configured' : 'not configured (local-only)'} />
      <Stat label="Auth backend" value={configured ? 'Supabase' : 'bypass'} />
      <Head>Feature flags (read-only)</Head>
      <Stat label="pi.shell — host shell" value={flag(hostShellOn)} />
      <Stat label="pi.planV2 — plan v2" value={flag(planV2On)} />
      {piFlags.length > 0
        ? piFlags.map(([k, v]) => <Stat key={k} label={k} value={String(v)} />)
        : <div style={{ fontSize: type.size.caption, color: D.faint, padding: '6px 0' }}>No pi-* overrides set in this browser.</div>}
      <div style={{ fontSize: type.size.caption, color: D.faint, marginTop: 8, lineHeight: 1.5 }}>Flags are set via env / URL (e.g. <span style={{ fontFamily: D.mono }}>?devrole=admin</span>), not edited here — this panel shows their resolved state.</div>
      <Head>Console</Head>
      <div style={{ fontSize: type.size.base, color: D.muted, lineHeight: 1.5 }}>The <strong style={{ color: D.text }}>Intelligence</strong> tab shows evaluation capture health for this browser's book. Behavioral trust (accept vs revert) lives in PostHog.</div>
      <Head>Actions</Head>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button style={btn} onClick={() => window.location.reload()}>Reload console</button>
        {signOut && <button style={{ ...btn, background: 'transparent' }} onClick={() => { if (window.confirm('Sign out of the admin console?')) signOut(); }}>Sign out</button>}
      </div>
      <div style={{ marginTop: 18 }}><Banner tone="muted">Admin settings are per-session. Flags are read-only here (set via env/URL). Extend this panel as operator controls are needed.</Banner></div>
    </div>
  );
}

function AnalyticsSuite() {
  const [sub, setSub] = useState('Executive');
  // Read the local book once per sub-tab change (cheap; panels re-derive).
  const book = readLocalBook();

  return (
    <div>
      {/* Sub-tabs — horizontally scrollable on mobile */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 18, paddingBottom: 6,
        overflowX: 'auto', borderBottom: `1px solid ${D.border}`, WebkitOverflowScrolling: 'touch',
      }}>
        {A_SUBTABS.map(s => (
          <button key={s} onClick={() => setSub(s)} style={{
            flex: '0 0 auto',
            background: sub === s ? D.surface2 : 'transparent',
            color: sub === s ? D.text : D.muted,
            border: `1px solid ${sub === s ? D.border : 'transparent'}`,
            borderRadius: 6, padding: '6px 12px', fontSize: type.size.caption, cursor: 'pointer',
            fontFamily: D.ff, whiteSpace: 'nowrap',
          }}>{s}</button>
        ))}
      </div>

      {sub === 'Executive' && <ExecutivePanel />}
      {sub === 'Funnel' && <PostHogPanel mode="funnel" />}
      {sub === 'Friction' && <PostHogPanel mode="friction" />}
      {sub === 'Playbook' && <PlaybookPanel book={book} />}
      {sub === 'Memory' && <MemoryPanel book={book} />}
      {sub === 'Cultural' && <CulturalPanel book={book} />}
      {sub === 'Location' && <LocationPanel book={book} />}
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
          <span style={{ fontSize: type.size.lg, fontWeight: 800, letterSpacing: '0.12em', color: D.accent, textTransform: 'uppercase' }}>
            NGW Admin
          </span>
          <span style={{ fontSize: type.size.sm, color: D.faint }}>
            {user.email} · role: {role}{bypass ? ' · DEV BYPASS' : ''}
          </span>
        </div>
        <button onClick={() => signOut?.()} style={{
          background: D.surface2, color: D.muted, border: `1px solid ${D.border}`,
          borderRadius: 6, padding: '5px 12px', fontSize: type.size.caption, cursor: 'pointer', fontFamily: D.ff,
        }}>Sign out</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 16px', borderBottom: `1px solid ${D.border}` }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? D.surface2 : 'transparent',
            color: tab === t ? D.text : D.muted,
            border: `1px solid ${tab === t ? D.border : 'transparent'}`,
            borderRadius: 6, padding: '6px 12px', fontSize: type.size.caption, cursor: 'pointer', fontFamily: D.ff,
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
            <div style={{ fontSize: type.size.md, fontWeight: 700, marginBottom: 10 }}>Admin audit log</div>
            <div style={{ fontSize: type.size.caption, color: D.muted, marginBottom: 12 }}>
              Immutable record of admin actions (most recent first).
            </div>
            {audit && audit.length === 0 && (
              <div style={{ fontSize: type.size.caption, color: D.faint }}>No actions recorded yet.</div>
            )}
            {audit && audit.map(row => (
              <div key={row.id} style={{
                display: 'flex', gap: 12, alignItems: 'baseline',
                padding: '8px 0', borderBottom: `1px solid ${D.border}`, fontSize: type.size.caption,
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

        {tab === 'Activation' && <ActivationPanel onOpenUser={goToUser} />}

        {tab === 'Analytics' && <AnalyticsSuite />}
        {tab === 'Intelligence' && <IntelligencePanel book={readLocalBook()} />}
        {tab === 'Settings' && <AdminSettingsPanel />}

        {tab === 'Metrics' && <MetricsPanel />}

        {tab === 'Errors' && <ErrorsPanel />}

        {tab === 'Providers' && (
          <div style={{ fontSize: type.size.base, color: D.muted }}>
            <strong style={{ color: D.text }}>Providers</strong> — ships in A5
            (Provider / Message Status). See
            docs/ecosystem/ADMIN_SUPPORT_V1_BUILD_PLAN.md.
          </div>
        )}
      </div>
    </div>
  );
}
