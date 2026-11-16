// GuestInboxHost — the host's side of guest questions, invite opens and guest
// photos, INSIDE the existing Guest list sheet (owner rulings A–D, 11/16/2026).
// No new tab, no new sheet: L4 work for guests lives with the guest list.
//
//   HostQuestions   "Questions & updates": unanswered first; open one, reply,
//                   block or unblock. A reply is stored and shows on that
//                   guest's invite; nothing is emailed in this release, and
//                   nothing here says it was.
//   HostInviteOpens "Ana last opened the invite Nov 16, 8:42 PM" for guests
//                   the server can name, and anonymous daily totals. "Opened",
//                   never "read" or "seen".
//   HostGuestPhotos "Guest photos": waiting-for-approval first; approve, hide,
//                   delete, and "Don't allow sharing" per photo; a Share button
//                   on an approved, shareable photo (it opens the host's own
//                   share sheet; the host posts, or doesn't).
//
// Each reads its own server route and names its failures (signed out,
// unavailable) instead of showing an empty list as if nothing were there.
import { useEffect, useState } from 'react';
import {
  isGuestMessagesApiConfigured, fetchGuestThreads, fetchGuestThread, replyToGuestThread, blockGuestThread, fetchInviteOpens,
} from '@app/lib/api/guestMessages';
import {
  isGuestPhotosApiConfigured, fetchEventGuestPhotos, approveGuestPhoto, hideGuestPhoto, deleteGuestPhoto, setGuestPhotoSharing,
} from '@app/lib/api/guestPhotos';
import { sortThreads, questionsWaiting, openedLine, openDayLine } from '@app/lib/guestInbox';
import { PhotoShareControls } from './GuestPhotosV2.jsx';
import PhotoViewer from './PhotoViewer.jsx';

const first = (n) => String(n || '').trim().split(/\s+/)[0] || 'this guest';
const why = (reason, what) => (reason === 'signed-out'
  ? `Sign in to see ${what}.`
  : reason === 'forbidden' ? `This account can’t see ${what} for this event.`
  : `Couldn’t load ${what} — check your connection and reopen this list.`);

export function HostQuestions({ eventId, onWaiting }) {
  const [rows, setRows] = useState(undefined);    // undefined loading · array · { failed }
  const [open, setOpen] = useState(null);          // { id, thread, messages } | null
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    const r = await fetchGuestThreads(eventId);
    if (!r.ok) { setRows({ failed: r.reason }); return; }
    const sorted = sortThreads(r.rows);
    setRows(sorted);
    if (onWaiting) onWaiting(questionsWaiting(sorted));
  };
  useEffect(() => { if (isGuestMessagesApiConfigured()) load(); }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!isGuestMessagesApiConfigured()) return null;

  // keep: a refresh after a reply or a block keeps that status line.
  const openThread = async (id, keep = false) => {
    if (!keep) { setErr(''); setLine(''); setDraft(''); }
    const r = await fetchGuestThread(eventId, id);
    if (!r.ok) { setErr(why(r.reason, 'this question')); return; }
    setOpen({ id, thread: r.thread, messages: r.messages });
  };
  const reply = async () => {
    const body = draft.trim();
    if (!body || busy || !open) return;
    setBusy(true); setErr(''); setLine('');
    try {
      await replyToGuestThread(eventId, open.id, body);
      setDraft('');
      setLine(`Sent — it shows on ${first(open.thread.guest_name)}’s invite.`);
      await openThread(open.id, true);
      await load();
    } catch (e) {
      setErr(e && e.status === 409 ? 'This guest is blocked. Unblock them to reply.'
        : e && e.status === 422 ? 'Plain text only, up to 1,000 characters.'
        : 'Your reply didn’t send. Check your connection and try again.');
    } finally { setBusy(false); }
  };
  const block = async (blocked) => {
    if (!open || busy) return;
    setBusy(true); setErr('');
    try {
      await blockGuestThread(eventId, open.id, blocked);
      setLine(blocked ? `${first(open.thread.guest_name)} can’t send more questions.` : `${first(open.thread.guest_name)} can ask again.`);
      await openThread(open.id, true);
      await load();
    } catch { setErr('That didn’t save. Try again.'); }
    finally { setBusy(false); }
  };

  return (
    <section id="guests-questions-anchor" data-host-questions aria-label="Questions & updates" style={{ marginTop: 'var(--sp-4)', scrollMarginTop: 12 }}>
      <div className="shelf-label" style={{ marginBottom: 6 }}>Questions &amp; updates</div>
      {rows === undefined ? <p className="grounding" style={{ margin: 0 }}>Loading guests’ questions…</p>
        : rows.failed ? <p className="grounding" style={{ margin: 0 }}>{why(rows.failed, 'guests’ questions')}</p>
        : !rows.length ? <p className="grounding" style={{ margin: 0 }}>No questions yet. Guests can ask you one from their invite link; it lands here.</p>
        : (
          <ul className="guest-q-list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {rows.map((t) => (
              <li key={t.id} data-thread={t.id} data-unanswered={t.unanswered && !t.blocked ? 'true' : 'false'}
                style={{ border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)', padding: '10px 12px', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <strong style={{ overflowWrap: 'anywhere' }}>{t.guest_name}</strong>
                  {t.unanswered && !t.blocked && <span className="of" style={{ color: 'var(--warn)' }}>Waiting on your answer</span>}
                  {t.blocked && <span className="of">Blocked</span>}
                </div>
                {t.last_body && <p className="vc-detail" style={{ margin: '4px 0 0', overflowWrap: 'anywhere' }}>{t.last_author === 'host' ? 'You: ' : ''}{t.last_body}</p>}
                {open && open.id === t.id ? (
                  <div style={{ marginTop: 'var(--sp-2)' }}>
                    <ol className="guest-thread" aria-label={`Conversation with ${t.guest_name}`}>
                      {open.messages.map((m, i) => (
                        <li key={i} className={'guest-msg ' + (m.author === 'host' ? 'from-host' : 'from-guest')}>
                          <div className="guest-msg-who">{m.author === 'host' ? 'You' : first(t.guest_name)}</div>
                          <div className="guest-msg-body">{m.body}</div>
                        </li>
                      ))}
                    </ol>
                    {!open.thread.blocked && (
                      <>
                        <textarea className="field" style={{ maxWidth: 'none', minHeight: 64, resize: 'vertical', fontSize: 'var(--t-input)' }}
                          maxLength={1000} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`Your reply to ${t.guest_name}`}
                          placeholder="Street parking on Pine — the lot fills up by 4." />
                        <p className="of" style={{ margin: '4px 0 0' }}>It shows on {first(t.guest_name)}’s invite. Nothing is emailed yet.</p>
                      </>
                    )}
                    <div className="actions-row" style={{ marginTop: 'var(--sp-2)', flexWrap: 'wrap' }}>
                      {!open.thread.blocked && <button className="cta" onClick={reply} disabled={busy || !draft.trim()} style={!draft.trim() ? { opacity: .45 } : undefined}>{busy ? 'Sending…' : 'Send reply'}</button>}
                      <button className="mini" onClick={() => block(!open.thread.blocked)} disabled={busy}>
                        {open.thread.blocked ? `Unblock ${first(t.guest_name)}` : `Block ${first(t.guest_name)}’s questions`}
                      </button>
                      <button className="mini" onClick={() => { setOpen(null); setLine(''); setErr(''); }}>Close</button>
                    </div>
                  </div>
                ) : (
                  <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                    <button className="mini" onClick={() => openThread(t.id)}>{t.unanswered && !t.blocked ? `Answer ${first(t.guest_name)}` : 'See the conversation'}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      {err && <p className="grounding" role="alert" style={{ margin: '6px 0 0', color: 'var(--danger)' }}>{err}</p>}
      {line && <p className="grounding" role="status" data-reply-status style={{ margin: '6px 0 0' }}>{line}</p>}
    </section>
  );
}

export function HostInviteOpens({ eventId }) {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    if (!isGuestMessagesApiConfigured()) return undefined;
    let live = true;
    fetchInviteOpens(eventId).then((r) => { if (live) setData(r); });
    return () => { live = false; };
  }, [eventId]);
  if (!isGuestMessagesApiConfigured() || data === undefined) return null;
  if (!data.ok) return <p className="grounding" data-invite-opens style={{ margin: 'var(--sp-3) 0 0' }}>{why(data.reason, 'when guests opened the invite')}</p>;
  const guests = data.guests.map((g) => openedLine(g)).filter(Boolean);
  const days = data.days.slice(0, 7).map(openDayLine).filter(Boolean);
  return (
    <section data-invite-opens aria-label="Invite opens" style={{ marginTop: 'var(--sp-4)' }}>
      <div className="shelf-label" style={{ marginBottom: 6 }}>Who opened the invite</div>
      {!guests.length && !days.length ? (
        <p className="grounding" style={{ margin: 0 }}>No one has opened the invite link yet.</p>
      ) : (
        <>
          {guests.map((l, i) => <p key={i} className="vc-detail" data-opened-guest style={{ margin: '2px 0 0' }}>{l}</p>)}
          {days.length > 0 && (
            <>
              <p className="of" style={{ margin: 'var(--sp-2) 0 2px' }}>Everyone, by day (not named):</p>
              {days.map((l, i) => <p key={i} className="vc-detail" data-opened-day style={{ margin: '2px 0 0' }}>{l}</p>)}
            </>
          )}
          <p className="of" style={{ margin: 'var(--sp-2) 0 0' }}>A name shows only after that guest replied or asked a question. Opening isn’t reading.</p>
        </>
      )}
    </section>
  );
}

export function HostGuestPhotos({ eventId, event, onPhotos }) {
  const [state, setState] = useState(undefined);   // undefined · { photos } · { failed }
  const [busy, setBusy] = useState('');
  const [confirmDel, setConfirmDel] = useState('');
  const [view, setView] = useState(null);           // index into photos | null
  const [line, setLine] = useState('');
  const [err, setErr] = useState('');
  const load = async () => {
    const r = await fetchEventGuestPhotos(eventId);
    if (!r.ok) { setState({ failed: r.reason }); return; }
    const rank = { pending: 0, approved: 1, hidden: 2 };
    const photos = [...r.photos].sort((a, b) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3));
    setState({ photos });
    if (onPhotos) onPhotos(photos);
  };
  useEffect(() => { if (isGuestPhotosApiConfigured()) load(); }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!isGuestPhotosApiConfigured()) return null;

  const act = async (id, fn, done) => {
    if (busy) return;
    setBusy(id); setErr(''); setLine('');
    try { await fn(); setLine(done); await load(); }
    catch (e) { setErr(e && e.status === 502 ? 'The photo wasn’t deleted. Try again.' : 'That didn’t save. Try again.'); }
    finally { setBusy(''); setConfirmDel(''); }
  };
  const photos = (state && state.photos) || [];
  const waiting = photos.filter((p) => p.status === 'pending').length;
  return (
    <section id="guests-photos-anchor" data-host-photos aria-label="Guest photos" style={{ marginTop: 'var(--sp-4)', scrollMarginTop: 12 }}>
      <div className="shelf-label" style={{ marginBottom: 6 }}>Guest photos</div>
      {state === undefined ? <p className="grounding" style={{ margin: 0 }}>Loading guests’ photos…</p>
        : state.failed ? <p className="grounding" style={{ margin: 0 }}>{why(state.failed, 'guests’ photos')}</p>
        : !photos.length ? <p className="grounding" style={{ margin: 0 }}>No photos yet. Guests can add photos from their invite link after the event; you approve each one before other guests see it.</p>
        : (
          <>
            <p className="grounding" style={{ margin: '0 0 8px' }}>
              {waiting ? `${waiting} waiting for you to approve. ` : ''}Other guests see a photo only after you approve it.
            </p>
            <ul className="photo-grid">
              {photos.map((p, i) => (
                <li key={p.id} className="photo-cell" data-photo={p.id} data-status={p.status}>
                  {(p.thumb || p.url)
                    ? <button type="button" className="photo-tile-btn" data-host-photo-open aria-label={`Open the photo from ${p.guest_name}`} onClick={() => setView(i)}>
                        <img src={p.thumb || p.url} alt="" loading="lazy" decoding="async" />
                      </button>
                    : <div className="photo-missing">Photo</div>}
                  <div className="photo-meta">
                    From {p.guest_name} · {p.status === 'pending' ? 'Waiting for your approval' : p.status === 'approved' ? 'Guests can see it' : 'Hidden from guests'}
                    {p.status === 'approved' && p.uploader_private ? ' · Kept private by the guest — no sharing' : ''}
                    {p.status === 'approved' && !p.uploader_private && p.share_blocked ? ' · Sharing off' : ''}
                  </div>
                  <div className="actions-row photo-acts">
                    {p.status !== 'approved' && <button className="mini" disabled={busy === p.id} onClick={() => act(p.id, () => approveGuestPhoto(eventId, p.id), 'Approved — guests can see it now.')}>Approve</button>}
                    {p.status !== 'hidden' && <button className="mini" disabled={busy === p.id} onClick={() => act(p.id, () => hideGuestPhoto(eventId, p.id), 'Hidden from guests.')}>Hide</button>}
                    {p.status === 'approved' && !p.uploader_private && (
                      <button className="mini" data-photo-sharing disabled={busy === p.id}
                        onClick={() => act(p.id, () => setGuestPhotoSharing(eventId, p.id, p.share_blocked), p.share_blocked ? 'Sharing allowed again.' : 'Sharing is off for this photo.')}>
                        {p.share_blocked ? 'Allow sharing' : 'Don’t allow sharing'}
                      </button>
                    )}
                    {p.shareable && <PhotoShareControls photo={p} event={event} index={i + 1} onLine={(l) => setLine(l || '')} />}
                    {confirmDel === p.id ? (
                      <>
                        <button className="mini danger" disabled={busy === p.id} onClick={() => act(p.id, () => deleteGuestPhoto(eventId, p.id), 'Photo deleted.')}>Delete it for good</button>
                        <button className="mini" onClick={() => setConfirmDel('')}>Keep it</button>
                      </>
                    ) : (
                      <button className="mini" onClick={() => setConfirmDel(p.id)}>Delete photo</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      {err && <p className="grounding" role="alert" style={{ margin: '6px 0 0', color: 'var(--danger)' }}>{err}</p>}
      {line && <p className="grounding" role="status" data-photos-status style={{ margin: '6px 0 0' }}>{line}</p>}
      {view != null && photos[view] && (
        <PhotoViewer photos={photos} index={view} onIndex={setView} onClose={() => setView(null)} onExpired={load}
          label={(i, n) => `Photo ${i + 1} of ${n}, from ${photos[i].guest_name}`}
          actions={(p) => (
            <>
              <span className="pv-note">From {p.guest_name} · {p.status === 'pending' ? 'Waiting for your approval' : p.status === 'approved' ? 'Guests can see it' : 'Hidden from guests'}</span>
              {p.status !== 'approved' && <button className="mini" disabled={busy === p.id} onClick={() => act(p.id, () => approveGuestPhoto(eventId, p.id), 'Approved — guests can see it now.')}>Approve</button>}
              {p.status !== 'hidden' && <button className="mini" disabled={busy === p.id} onClick={() => act(p.id, () => hideGuestPhoto(eventId, p.id), 'Hidden from guests.')}>Hide</button>}
            </>
          )} />
      )}
    </section>
  );
}
