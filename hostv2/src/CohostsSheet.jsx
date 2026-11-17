// CohostsSheet — "Co-hosts" (owner ruling 11/16/2026: "per-event co-host").
//
// The HOST invites someone by email to this one event. When they sign in with
// that email, they can see and change this plan, and nothing else of the
// host's: no other events, and they cannot delete this one or invite others
// (supabase/migrations/026, backend/app/routers/cohosts.py).
// A CO-HOST sees who they are here and can leave.
// Signed out, or a plan not yet saved: the sheet says so and offers nothing.
import { useEffect, useState } from 'react';
import { track as trackEvent, EVENTS as ANALYTICS } from '@app/lib/analytics';
import { listCohosts, inviteCohost, removeCohost, leaveCohostedEvent, isCohostApiConfigured } from '@app/lib/api/cohosts';

export default function CohostsSheet({ event, signedIn, onLine, onLeft }) {
  const isCohost = Boolean(event._cohostOf);
  const [state, setState] = useState(undefined);      // undefined · { cohosts } · { error }
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    const r = await listCohosts(event.id);
    setState(r.ok ? { cohosts: r.cohosts || [] } : { error: r.reason });
  };
  useEffect(() => { if (signedIn && !isCohost && isCohostApiConfigured()) load(); }, [event.id, signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isCohostApiConfigured()) return null;

  if (isCohost) {
    return (
      <div data-cohosts data-role="cohost">
        <p className="grounding" style={{ margin: '2px 0 var(--sp-3)' }}>
          You’re co-hosting this event. You can see and change the plan; only the host can invite others or delete the event.
        </p>
        {confirm === 'leave' ? (
          <div className="actions-row">
            <button className="mini danger" data-cohost-leave disabled={busy === 'leave'} onClick={async () => {
              setBusy('leave');
              const r = await leaveCohostedEvent(event.id);
              setBusy(''); setConfirm('');
              if (r.ok) { onLine('You’ve left this event.'); onLeft && onLeft(); } else setErr('That didn’t go through. Try again.');
            }}>Leave it</button>
            <button className="mini" onClick={() => setConfirm('')}>Stay</button>
          </div>
        ) : <button className="mini" onClick={() => setConfirm('leave')}>Leave this event</button>}
        {err && <p className="grounding" role="alert" style={{ margin: 'var(--sp-2) 0 0', color: 'var(--danger)' }}>{err}</p>}
      </div>
    );
  }

  const send = async () => {
    const v = email.trim();
    if (!v) return;
    setBusy('invite'); setErr('');
    const r = await inviteCohost(event.id, v);
    setBusy('');
    if (!r.ok) { setErr(r.status === 404 || r.status === 403 || r.status === 422 || r.status === 429 || r.status === 503 ? r.reason : 'The invite didn’t go through. Try again.'); return; }
    setEmail('');
    setState({ cohosts: r.cohosts || [] });
    if (!r.already_invited) { try { trackEvent(ANALYTICS.COHOST_INVITED, { emailed: !!r.emailed }); } catch (_e) { /* counter only */ } }
    onLine(r.already_invited ? 'They’re already invited.'
      : r.emailed ? `Invite sent to ${v.toLowerCase()}.`
        : `Invited — tell ${v.toLowerCase()} to sign in with that email. (The invite email didn’t go out.)`);
  };
  const remove = async (c) => {
    setBusy(c.id); setErr('');
    const r = await removeCohost(event.id, c.id);
    setBusy(''); setConfirm('');
    if (r.ok) { onLine(`${c.email} can’t open this event anymore.`); load(); } else setErr('That didn’t go through. Try again.');
  };

  return (
    <div data-cohosts data-role="host">
      <p className="grounding" style={{ margin: '2px 0 var(--sp-3)' }}>
        Invite someone to plan this event with you. When they sign in with that email, they can see and change this plan — not your other events, and they can’t delete it or invite others.
      </p>
      {!signedIn ? (
        <p className="grounding" data-cohosts-signed-out style={{ margin: 0 }}>Sign in and keep this plan first — co-hosts join the saved plan.</p>
      ) : (
        <>
          <div className="actions-row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="field" type="email" inputMode="email" autoComplete="off" style={{ maxWidth: 260, fontSize: 'var(--t-input)' }}
              placeholder="Their email" aria-label="Co-host’s email" value={email}
              onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
            <button className="mini" data-cohost-invite disabled={!email.trim() || busy === 'invite'} onClick={send}>{busy === 'invite' ? 'Inviting…' : 'Invite'}</button>
          </div>
          {err && <p className="grounding" role="alert" style={{ margin: 'var(--sp-2) 0 0', color: 'var(--danger)' }}>{err}</p>}
          {state === undefined ? <p className="grounding" style={{ margin: 'var(--sp-3) 0 0' }}>Loading co-hosts…</p>
            : state.error ? <p className="grounding" style={{ margin: 'var(--sp-3) 0 0' }}>{state.error === 'unavailable' ? 'Co-hosts didn’t load. Check your connection.' : state.error}</p>
              : state.cohosts.length > 0 && (
                <ul className="split-people" data-cohost-list style={{ marginTop: 'var(--sp-3)' }}>
                  {state.cohosts.map((c) => (
                    <li key={c.id} data-status={c.status}>
                      <span>{c.email}<span className="fam-sub"> · {c.status === 'joined' ? 'Joined' : 'Invited — not signed in yet'}</span></span>
                      {confirm === c.id ? (
                        <span className="actions-row">
                          <button className="mini danger" disabled={busy === c.id} onClick={() => remove(c)}>Remove</button>
                          <button className="mini" onClick={() => setConfirm('')}>Keep</button>
                        </span>
                      ) : <button className="mini" aria-label={`Remove ${c.email}`} onClick={() => setConfirm(c.id)}>Remove</button>}
                    </li>
                  ))}
                </ul>
              )}
        </>
      )}
    </div>
  );
}
