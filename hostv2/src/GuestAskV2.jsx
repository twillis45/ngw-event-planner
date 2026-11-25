// GuestAskV2 — "Ask your host" on the invite (owner ruling A, 11/16/2026, free).
//
// Narrow, not chat: a guest asks the host a question from the invite link and
// sees her own thread, with the host's answers labeled "From your host". The
// host replies from the Guest list sheet. A guest who ticks the box gets one
// email per host reply and per host update (backend/app/guest_notices.py,
// 11/16/2026), each with a stop link (UX_07: the box promises only what is sent).
//
// The credential is the pair a guest's own RSVP uses: the invite code plus the
// device key this browser minted (rsvpIdempotencyKey), so the same phone sees
// the same thread. Server: backend/app/routers/guest_messages.py. Writes
// throw, so this page never says "Sent" for a question the server refused.
import { useEffect, useState } from 'react';
import {
  isGuestMessagesApiConfigured, fetchMyGuestThread, askHost, setGuestEmail, deleteMyGuestThread,
} from '@app/lib/api/guestMessages';
import { rsvpIdempotencyKey, existingRsvpKey } from '@app/lib/api/rsvp';
import { isMalformedEmail } from '@app/lib/contactFormat';

const MAX = 1000;
const fmtWhen = (iso) => {
  const d = new Date(String(iso || ''));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function GuestAskV2({ code, eventKey, hostName, guestName }) {
  const hostFirst = String(hostName || '').trim().split(/\s+/)[0] || '';
  const hostWord = hostFirst || 'your host';
  const [thread, setThread] = useState(undefined);     // undefined loading · null none · object
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('');
  const [optIn, setOptIn] = useState(false);            // unchecked by default, always
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');                 // the one status line
  const [err, setErr] = useState('');
  const [deleteAsk, setDeleteAsk] = useState(false);

  useEffect(() => {
    let live = true;
    const key = existingRsvpKey(eventKey);
    if (!key) { setThread(null); return undefined; }
    fetchMyGuestThread(code, key).then((r) => {
      if (!live) return;
      const t = r && r.ok ? r.thread : null;
      setThread(t);
      if (t) { setName(t.guest_name || ''); setEmail(t.email || ''); setOptIn(Boolean(t.email_opt_in)); }
    });
    return () => { live = false; };
  }, [code, eventKey]);
  // The reply form's name, until she types her own here.
  useEffect(() => { if (!name && guestName) setName(guestName); }, [guestName]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isGuestMessagesApiConfigured()) return null;

  const closed = Boolean(thread && thread.closed);
  const emailBad = Boolean(email.trim()) && isMalformedEmail(email);
  const emailChanged = thread && ((thread.email || '') !== email.trim() || Boolean(thread.email_opt_in) !== optIn);

  const saveEmail = async (key) => {
    // Opt-in only with an email: the server refuses one without the other.
    await setGuestEmail(code, { guestKey: key, email: email.trim(), emailOptIn: optIn && Boolean(email.trim()) });
  };

  const send = async () => {
    if (busy) return;
    const n = name.trim(), b = body.trim();
    if (!n || !b) { setErr(!n ? 'Add your name so your host knows who is asking.' : 'Write your question first.'); return; }
    if (emailBad) { setErr('That email doesn’t look right — fix it or leave it blank.'); return; }
    setErr(''); setNote(''); setBusy(true);
    const key = rsvpIdempotencyKey(eventKey);
    try {
      const r = await askHost(code, { guestKey: key, name: n, body: b });
      let t = r && r.thread;
      if (email.trim() || (thread && thread.email)) {
        try { await saveEmail(key); t = { ...t, email: email.trim() || null, email_opt_in: optIn && Boolean(email.trim()) }; }
        catch { setErr('Your question went through, but the email didn’t save. Try saving it again.'); }
      }
      setThread(t || null);
      setBody('');
      setNote(`Sent to ${hostFirst ? hostFirst + '’s' : 'your host’s'} plan. ${hostFirst || 'Your host'}’s answer shows here, on this invite.`);
    } catch (e) {
      setErr(e && e.status === 403 ? 'This conversation is closed.'
        : e && e.status === 429 ? (e.message || 'Too many questions right now — try again later.')
        : e && e.status === 422 ? 'Plain text only, up to 1,000 characters.'
        : 'Your question didn’t send. Check your connection and try again.');
    } finally { setBusy(false); }
  };

  const saveEmailOnly = async () => {
    if (busy || emailBad) return;
    setBusy(true); setErr(''); setNote('');
    try {
      await saveEmail(rsvpIdempotencyKey(eventKey));
      setThread((t) => ({ ...t, email: email.trim() || null, email_opt_in: optIn && Boolean(email.trim()) }));
      setNote('Saved.');
    } catch { setErr('That didn’t save. Check your connection and try again.'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true); setErr(''); setNote('');
    try {
      await deleteMyGuestThread(code, rsvpIdempotencyKey(eventKey));
      setThread(null); setDeleteAsk(false); setBody(''); setEmail(''); setOptIn(false);
      setNote('Your questions are deleted from your host’s plan.');
    } catch { setErr('Your questions were not deleted. Check your connection and try again.'); }
    finally { setBusy(false); }
  };

  const msgs = (thread && Array.isArray(thread.messages)) ? thread.messages : [];
  return (
    <div className="card no-hover guest-ask" data-guest-ask style={{ marginTop: 14 }}>
      <div className="card-head" style={{ cursor: 'default', padding: '14px 18px' }}>
        <h2 className="shelf-label" style={{ margin: '0 0 6px' }}>Ask your host</h2>
        {msgs.length > 0 && (
          <ol className="guest-thread" aria-label="Your questions and your host’s answers">
            {msgs.map((m, i) => (
              <li key={i} className={'guest-msg ' + (m.author === 'host' ? 'from-host' : 'from-guest')}>
                <div className="guest-msg-who">{m.author === 'host' ? 'From your host' : 'You asked'}{m.created_at ? ' · ' + fmtWhen(m.created_at) : ''}</div>
                <div className="guest-msg-body">{m.body}</div>
              </li>
            ))}
          </ol>
        )}
        {thread === undefined ? null : closed ? (
          <p className="grounding" style={{ margin: 0 }}>Your host closed questions on this invite. Reach them directly if you need to.</p>
        ) : (
          <>
            {msgs.length === 0 && (
              <p className="grounding" style={{ margin: '0 0 8px' }}>A question about the day — parking, timing, what to bring. Only {hostWord} sees it.</p>
            )}
            {!(thread && thread.guest_name) && (
              <input className="field" style={{ maxWidth: 'none', marginBottom: 8, fontSize: 'var(--t-input)' }} placeholder="Your name"
                autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name to sign your question" />
            )}
            <textarea className="field" style={{ maxWidth: 'none', minHeight: 72, resize: 'vertical', fontSize: 'var(--t-input)' }}
              maxLength={MAX} placeholder={msgs.length ? 'Type another question' : 'Type your question'}
              value={body} onChange={(e) => setBody(e.target.value)} aria-label="Your question for your host" />
            <input className="field" style={{ maxWidth: 'none', marginTop: 8, fontSize: 'var(--t-input)' }} placeholder="Your email — optional"
              type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              aria-label="Email for answers — optional" aria-invalid={emailBad || undefined} />
            {/* PROMINENT, directly under the email, unchecked by default (owner).
                Ticked: one email per host reply and per host update. */}
            <label className="guest-optin" data-email-optin>
              <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
              <span>Email me when {hostWord} replies or posts an update.</span>
            </label>
            {err && <p className="grounding" role="alert" style={{ margin: '8px 0 0', color: 'var(--danger)' }}>{err}</p>}
            <div className="actions-row" style={{ marginTop: 10 }}>
              <button className="cta" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send to your host'}</button>
              {thread && emailChanged && !body.trim() && (
                <button className="mini" onClick={saveEmailOnly} disabled={busy}>Save my email choice</button>
              )}
            </div>
          </>
        )}
        {note && <p className="grounding" role="status" data-ask-status style={{ margin: '8px 0 0' }}>{note}</p>}
        {thread && !deleteAsk && (
          <div className="actions-row" style={{ marginTop: 8 }}>
            <button className="mini" onClick={() => setDeleteAsk(true)}>Delete my questions</button>
          </div>
        )}
        {thread && deleteAsk && (
          <div role="group" aria-label="Delete your questions" style={{ marginTop: 8 }}>
            <p className="grounding" style={{ margin: 0 }}>Delete your questions and {hostWord}’s answers from {hostWord}’s plan?</p>
            <div className="actions-row" style={{ marginTop: 6 }}>
              <button className="mini" onClick={remove} disabled={busy}>{busy ? 'Deleting…' : 'Delete them'}</button>
              <button className="mini" onClick={() => setDeleteAsk(false)} disabled={busy}>Keep them</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
