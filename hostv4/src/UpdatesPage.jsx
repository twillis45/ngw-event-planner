// hostv4 UPDATES AND QUESTIONS (owner, 11/25/2026: "start the updates and
// questions flow"). Pushed from Guests. The feature map's updates page, on the
// steps hostv2 uses (lib/guestUpdatesKit):
//   - Post an update: on every guest's invite, emailed once to the guests who
//     asked; 3 a day and 20 per event, shown before she hits them; a second tap
//     before any email; take one off the invite;
//   - Questions: unanswered first; tap one to read and reply in a sheet (a
//     reply shows on that guest's invite, emailed only if they asked); block;
//   - Who opened the invite: named only after a guest replied or asked.
// Each reads its own server route on the account hostv2 signed in, and says
// when it can't (signed out, not allowed, unavailable). "Send the details" is
// in the current app for now.
import { useEffect, useState } from 'react';
import { isAnnouncementsApiConfigured } from '@app/lib/api/announcements';
import { isGuestMessagesApiConfigured, fetchInviteOpens } from '@app/lib/api/guestMessages';
import { openedLine, openDayLine } from '@app/lib/guestInbox';
import { getLastSyncTime } from '@app/lib/api/syncState';
import {
  useGuestUpdates, useGuestQuestions, updatesRoom, updatesReachLine, updatesLimitLine, updatesFailedLine,
  postingLine, postAndEmailLabel, firstName, inboxWhy, replyHintLine, UPDATE_PLACEHOLDER, replyPlaceholder,
} from '@app/lib/guestUpdatesKit';

const when = (iso) => { try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };
const chev = <svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function Updates({ eventId }) {
  const u = useGuestUpdates(eventId);
  const [draft, setDraft] = useState('');
  if (!isAnnouncementsApiConfigured()) return <p className="fine">Updates to everyone aren’t switched on yet.</p>;
  if (u.st === undefined) return <p className="fine" role="status">Loading updates…</p>;
  if (u.st.failed) return <p className="fine" data-updates-failed>{updatesFailedLine(u.st)}</p>;
  const { limits, announcements } = u.st;
  const { dayLeft, eventLeft, canPost } = updatesRoom(limits);
  const live = announcements.filter((a) => !a.removed);
  const post = async () => { if (await u.post(draft)) setDraft(''); };
  return (<>
    <p className="fine" data-updates-reach>{updatesReachLine(u.emailN)}</p>
    {canPost ? (<>
      <textarea className="field" rows={3} maxLength={1000} value={draft} onChange={(e) => { setDraft(e.target.value); u.setConfirm(false); }}
        aria-label="Your update to every guest" placeholder={UPDATE_PLACEHOLDER} />
      <div className="addrow">
        <button className="link" data-update-post disabled={!draft.trim() || u.busy === 'post'} onClick={post}>
          {u.busy === 'post' ? 'Posting…' : u.confirm ? postAndEmailLabel(u.emailN) : 'Post the update'}
        </button>
        {u.confirm && <button className="link" onClick={() => u.setConfirm(false)}>Not yet</button>}
      </div>
      {u.confirm && <p className="fine warn">An email can’t be taken back once it’s sent.</p>}
      {u.busy === 'post' && <p className="fine" role="status">{postingLine(u.emailN)}</p>}
    </>) : <p className="fine" data-updates-limit>{updatesLimitLine(limits, eventLeft)}</p>}
    <p className="fine" data-updates-left>{dayLeft} of {limits.per_day} left today · {eventLeft} of {limits.per_event} left for this event</p>
    {u.err && <p className="fine warn" role="alert">{u.err}</p>}
    {u.line && <p className="done" role="status" data-update-status>{u.line}</p>}
    {live.length > 0 && (
      <div className="grp" data-update-list>
        {live.map((a) => (
          <div className="row update" key={a.id}>
            <span className="nm"><small>{when(a.created_at)}</small>{a.body}</span>
            <button className="link" disabled={u.busy === a.id} onClick={() => u.remove(a)}>Take it off</button>
          </div>
        ))}
      </div>
    )}
  </>);
}

function ThreadSheet({ q, onDone }) {
  const { open } = q;
  const t = open.thread; const f = firstName(t.guest_name);
  return (
    <div className="scrim" onClick={onDone}>
      <div className="sheet" role="dialog" aria-label={'Conversation with ' + t.guest_name} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheethead"><h2>{t.guest_name}</h2><button className="link" onClick={onDone}>Done</button></div>
        <ol className="thread" data-thread-open>
          {open.messages.map((m, i) => <li key={i} className={m.author === 'host' ? 'me' : 'them'}><b>{m.author === 'host' ? 'You' : f}</b>{m.body}</li>)}
        </ol>
        {!t.blocked && (<>
          <textarea className="field" rows={3} maxLength={1000} value={q.draft} onChange={(e) => q.setDraft(e.target.value)}
            aria-label={'Your reply to ' + t.guest_name} placeholder={replyPlaceholder(t.guest_name)} />
          <p className="fine" data-reply-email>{replyHintLine(t)}</p>
          <button className="primary" data-reply-send disabled={!!q.busy || !q.draft.trim()} onClick={q.reply}>{q.busy === 'reply' ? 'Sending…' : 'Send your reply'}</button>
        </>)}
        {q.err && <p className="fine warn" role="alert">{q.err}</p>}
        {q.line && <p className="done" role="status" data-reply-status>{q.line}</p>}
        <button className="link" data-block disabled={!!q.busy} onClick={() => q.block(!t.blocked)}>{t.blocked ? 'Unblock ' + f : 'Block ' + f + '’s questions'}</button>
      </div>
    </div>
  );
}

function Questions({ eventId }) {
  const q = useGuestQuestions(eventId);
  if (!isGuestMessagesApiConfigured()) return <p className="fine">Guest questions aren’t switched on yet.</p>;
  if (q.rows === undefined) return <p className="fine" role="status">Loading guests’ questions…</p>;
  if (q.rows.failed) return <p className="fine" data-questions-failed>{inboxWhy(q.rows.failed, 'guests’ questions')}</p>;
  return (<>
    {!q.rows.length ? <p className="fine">No questions yet. Guests can ask you one from their invite link; it lands here.</p> : (
      <div className="grp" data-questions>
        {q.rows.map((t) => (
          <button className="row go" key={t.id} data-thread={t.id} data-unanswered={t.unanswered && !t.blocked ? 'true' : 'false'} onClick={() => q.openThread(t.id)}>
            <span className="nm">{t.guest_name}<small>{t.last_body ? (t.last_author === 'host' ? 'You: ' : '') + t.last_body : ''}</small></span>
            <span className={'val' + (t.unanswered && !t.blocked ? ' next' : '')}>{t.blocked ? 'Blocked' : t.unanswered ? 'Waiting' : 'Answered'}</span>{chev}
          </button>
        ))}
      </div>
    )}
    {!q.open && q.err && <p className="fine warn" role="alert">{q.err}</p>}
    {q.open && <ThreadSheet q={q} onDone={q.close} />}
  </>);
}

function Opens({ eventId }) {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    if (!isGuestMessagesApiConfigured() || !eventId) return undefined;
    let live = true;
    fetchInviteOpens(eventId).then((r) => { if (live) setData(r); });
    return () => { live = false; };
  }, [eventId]);
  if (!isGuestMessagesApiConfigured() || data === undefined) return null;
  if (!data.ok) return <p className="fine" data-invite-opens>{inboxWhy(data.reason, 'when guests opened the invite')}</p>;
  const named = data.guests.map((g) => openedLine(g)).filter(Boolean);
  const days = data.days.slice(0, 7).map(openDayLine).filter(Boolean);
  return (
    <section data-invite-opens>
      <h3 className="sh">Who opened the invite</h3>
      {!named.length && !days.length ? <p className="fine">No one has opened the invite link yet.</p> : (<>
        {named.length > 0 && <div className="grp">{named.map((l, i) => <div className="row" key={i}>{l}</div>)}</div>}
        {days.length > 0 && <><p className="fine">Everyone, by day (not named):</p><div className="grp">{days.map((l, i) => <div className="row" key={i}>{l}</div>)}</div></>}
        <p className="fine">A name shows only after that guest replied or asked a question. Opening isn’t reading.</p>
      </>)}
    </section>
  );
}

export default function UpdatesPage({ ev, nav, status }) {
  // A plan never saved to an account has no updates, questions or opens to read:
  // say so once and ask the server for nothing (no signed-out 401s).
  if (!getLastSyncTime(ev.id)) return (
    <main className="view" data-view="updates">
      {nav}
      {status}
      <p className="fine" data-updates-signed-out>Updates and guests’ questions need this plan saved to your account. Sign in from the current app first. <a className="link" href="../hostv2/">Open the current app</a></p>
    </main>
  );
  return (
    <main className="view" data-view="updates">
      {nav}
      {status}
      <h3 className="sh">Post an update</h3>
      <Updates eventId={ev.id} />
      <h3 className="sh">Questions</h3>
      <Questions eventId={ev.id} />
      <Opens eventId={ev.id} />
      <p className="fine">Sending the day’s details is in the current app for now. <a className="link" href="../hostv2/">Open the current app</a></p>
    </main>
  );
}
