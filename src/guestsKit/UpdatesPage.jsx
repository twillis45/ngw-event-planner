// hostv4 UPDATES AND QUESTIONS (owner, 11/25/2026: "start the updates and
// questions flow"). Pushed from Guests. Steps 5a and 5b of G2c-2b (owner,
// 11/28/2026, UX_12 §8a, render screen 5) add the update written from the plan
// with Copy and Text it, everything that went out, the day's details in the
// kit, and photos from guests with how many wait. The feature map's updates page, on the
// steps hostv2 uses (lib/guestUpdatesKit):
//   - Post an update: on every guest's invite, emailed once to the guests who
//     asked; 3 a day and 20 per event, shown before she hits them; a second tap
//     before any email; take one off the invite;
//   - Questions: unanswered first; tap one to read and reply in a sheet (a
//     reply shows on that guest's invite, emailed only if they asked); block;
//   - Who opened the invite: named only after a guest replied or asked.
// Each reads its own server route on the account hostv2 signed in, and says
// when it can't (signed out, not allowed, unavailable).
import { useEffect, useState } from 'react';
import { isAnnouncementsApiConfigured } from '@app/lib/api/announcements';
import { isGuestMessagesApiConfigured, fetchInviteOpens } from '@app/lib/api/guestMessages';
import { openedLine, openDayLine } from '@app/lib/guestInbox';
import { draftGuestBrief } from '@app/lib/doItForMe';
import { getLastSyncTime } from '@app/lib/api/syncState';
import {
  useGuestUpdates, useGuestQuestions, updatesRoom, updatesReachLine, updatesLimitLine, updatesFailedLine,
  postingLine, postAndEmailLabel, firstName, inboxWhy, replyHintLine, UPDATE_PLACEHOLDER, replyPlaceholder,
  updateFromPlan, textItHref, usePhotosWaiting,
} from '@app/lib/guestUpdatesKit';
import { unfilledBlanks } from '@app/lib/guestFacing';
import { LINK_PLACEHOLDER, withLink } from '@app/lib/inviteMessageDraft';
import { listSentMessages } from '@app/lib/commApi';
import { buildMessageTimeline, filterTimeline } from '@app/lib/messageTimeline';
import { readProfile, useSendReady, NotReady } from './sendKit.jsx';
import { recordHandoff } from '@app/lib/sendLedger';

// What the old draft sheet called this draft; a hand-off is recorded under it.
const UPDATE_TITLE = 'Update to everyone';
const BRIEF_TITLE = 'The guest brief';
import { useKitHost } from './kitHost.js';

const when = (iso) => { try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };
const chev = <svg className="gk-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function Updates({ ev, save }) {
  const u = useGuestUpdates(ev.id);
  // WRITTEN FROM THE PLAN (render screen 5): the box starts with the plan's own
  // update (the old sheet's "Update everyone" draft); she edits it. A blank the
  // plan couldn't fill ("[add it here]") keeps Post, Copy and Text off.
  const [fromPlan] = useState(() => updateFromPlan(ev, readProfile()));
  const [draft, setDraft] = useState(fromPlan);
  const [copied, setCopied] = useState('');
  const blanks = unfilledBlanks(draft);
  const ready = !!draft.trim() && !blanks.length;
  // A hand-off she makes herself is recorded on the plan, as the old draft sheet
  // did (lib/sendLedger), so "Everything that went out" lists it: "copied to
  // send" or "by text", never "sent". For guests, so it files under them.
  const handedOff = (channel) => { if (save) save({ patch: { sendLedger: recordHandoff(ev.sendLedger, UPDATE_TITLE, channel, new Date().toISOString(), { kind: 'guests' }) }, msg: null }); };
  const copy = () => {
    const ok = () => { setCopied('Copied. Nothing was sent.'); handedOff('copy'); };
    const no = () => setCopied('Couldn’t copy here. Select the words and copy them.');
    try { navigator.clipboard.writeText(draft).then(ok, no); } catch { no(); }
  };
  if (!isAnnouncementsApiConfigured()) return <p className="fine">Updates to everyone aren’t switched on yet.</p>;
  if (u.st === undefined) return <p className="fine" role="status">Loading updates…</p>;
  if (u.st.failed) return <p className="fine" data-updates-failed>{updatesFailedLine(u.st)}</p>;
  const { limits, announcements } = u.st;
  const { dayLeft, eventLeft, canPost } = updatesRoom(limits);
  const live = announcements.filter((a) => !a.removed);
  const post = async () => { if (await u.post(draft)) { setDraft(''); setCopied(''); } };
  return (<>
    <p className="fine" data-updates-reach>{updatesReachLine(u.emailN)}</p>
    {canPost ? (<>
      <textarea className="gk-field" rows={5} maxLength={1000} value={draft} onChange={(e) => { setDraft(e.target.value); u.setConfirm(false); setCopied(''); }}
        aria-label="Your update to every guest" placeholder={UPDATE_PLACEHOLDER} />
      {draft && draft === fromPlan && <p className="fine" data-update-from-plan>Written from your plan. Edit it.</p>}
      {blanks.length > 0 && <p className="fine warn" data-update-blank>Fill in {blanks[0]} first, or take it out.</p>}
      <div className="addrow">
        <button className="link" data-update-post disabled={!ready || u.busy === 'post'} onClick={post}>
          {u.busy === 'post' ? 'Posting…' : u.confirm ? postAndEmailLabel(u.emailN) : 'Post the update'}
        </button>
        {u.confirm && <button className="link" onClick={() => u.setConfirm(false)}>Not yet</button>}
        {!u.confirm && <button className="link" data-update-copy disabled={!ready} onClick={copy}>Copy</button>}
        {!u.confirm && (ready
          ? <a className="link" data-update-text href={textItHref(draft)} onClick={() => handedOff('sms')}>Text it</a>
          : <button className="link" data-update-text disabled>Text it</button>)}
      </div>
      {copied && <p className="done" role="status" data-update-copied>{copied}</p>}
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
      <div className="gk-sheet" role="dialog" aria-label={'Conversation with ' + t.guest_name} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheethead"><h2>{t.guest_name}</h2><button className="link" onClick={onDone}>Done</button></div>
        <ol className="thread" data-thread-open>
          {open.messages.map((m, i) => <li key={i} className={m.author === 'host' ? 'me' : 'them'}><b>{m.author === 'host' ? 'You' : f}</b>{m.body}</li>)}
        </ol>
        {!t.blocked && (<>
          <textarea className="gk-field" rows={3} maxLength={1000} value={q.draft} onChange={(e) => q.setDraft(e.target.value)}
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
          <button className="row gk-go" key={t.id} data-thread={t.id} data-unanswered={t.unanswered && !t.blocked ? 'true' : 'false'} onClick={() => q.openThread(t.id)}>
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

// EVERYTHING THAT WENT OUT (render screen 5): the old Messages view's guest
// rows, read from the same timeline (lib/messageTimeline): the invite, the
// nudges and the updates, to whom, how, when and the true status. Read only.
// Signed out, only what this device sent shows, and it says so.
function WentOut({ ev }) {
  const [server, setServer] = useState({ status: 'loading' });
  useEffect(() => {
    let live = true;
    listSentMessages(ev.id).then((r) => { if (live) setServer(r); });
    return () => { live = false; };
  }, [ev.id]);
  const { entries, note } = buildMessageTimeline({ event: ev, server });
  const rows = filterTimeline(entries, 'guests');
  return (
    <section data-went-out>
      <h3 className="sh">Everything that went out</h3>
      {server.status === 'loading' ? <p className="fine" role="status">Loading what the app sent…</p>
        : !rows.length ? <p className="fine">Nothing has gone to guests yet. The invite, nudges and updates show here: to whom, how and when.</p> : (
          <div className="grp">
            {rows.map((e) => (
              <div className="row" key={e.key} data-went={e.key}>
                <span className="nm">{e.who || e.what}<small>{[e.who ? e.what : null, e.how, e.when].filter(Boolean).join(' · ')}</small></span>
                <span className={'val' + (e.tone === 'ok' ? ' ok' : '')}>{e.status}</span>
              </div>
            ))}
          </div>
        )}
      {note && server.status !== 'loading' && <p className="fine" data-went-note>{note}</p>}
    </section>
  );
}

// SEND THE DAY'S DETAILS (render screen 5), in the kit, not the old sheet: the
// guest brief written from the plan (doItForMe draftGuestBrief, the old sheet's
// "Send the details") with the checked reply link. Same rules as the update: a
// blank keeps Copy and Text it off; each hand-off is recorded for her guests.
function DetailsSheet({ ev, save, onDone }) {
  const { acct, link, ready, check } = useSendReady(ev);
  // Until the reply link is checked the draft holds its place (as the old sheet
  // did) and every hand-off waits; the words can still be read and edited.
  const written = (() => { try { return draftGuestBrief(ev, readProfile(), { rsvpUrl: link.url || LINK_PLACEHOLDER }).body || ''; } catch { return ''; } })();
  const [text, setText] = useState(null);
  const [done, setDone] = useState('');
  const body = text == null ? written : text;
  const blanks = unfilledBlanks(body);
  const others = blanks.filter((b) => b !== LINK_PLACEHOLDER);
  // What leaves: her words with the checked link where its place is held.
  const out = withLink(body, link.url);
  const ok = ready && !!out.trim() && !others.length && !out.includes(LINK_PLACEHOLDER);
  const handedOff = (channel) => { if (save) save({ patch: { sendLedger: recordHandoff(ev.sendLedger, BRIEF_TITLE, channel, new Date().toISOString(), { kind: 'guests' }) }, msg: null }); };
  const copy = () => {
    const yes = () => { setDone('Copied. Nothing was sent.'); handedOff('copy'); };
    const no = () => setDone('Couldn’t copy here. Select the words and copy them.');
    try { navigator.clipboard.writeText(out).then(yes, no); } catch { no(); }
  };
  return (
    <div className="scrim" onClick={onDone}>
      <div className="gk-sheet" role="dialog" aria-label="Send the day’s details" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheethead"><h2>Send the day’s details</h2><button className="link" onClick={onDone}>Done</button></div>
        <div className="sendbody">
          {!ready && <NotReady acct={acct} link={link} check={check} />}
          <>
            <textarea className="gk-field" data-details rows={10} aria-label="The day’s details" value={body} onChange={(e) => { setText(e.target.value); setDone(''); }} />
            <p className="fine">Written from your plan. Edit it before it goes.</p>
            {others.length > 0 && <p className="fine warn" data-details-blank>Fill in {others[0]} first, or take it out.</p>}
            {done && <p className="done" role="status" data-details-copied>{done}</p>}
            <div className="addrow">
              <button className="link" data-details-copy disabled={!ok} onClick={copy}>Copy</button>
              {ok ? <a className="link" data-details-text href={textItHref(out)} onClick={() => handedOff('sms')}>Text it</a>
                : <button className="link" data-details-text disabled>Text it</button>}
            </div>
          </>
        </div>
      </div>
    </div>
  );
}

// PHOTOS FROM GUESTS (render screen 5): the row and how many wait for her
// approval (lib/guestUpdatesKit usePhotosWaiting), from the event day on (the
// old sheet's rule); it opens hostv2's photos, where she approves them. hostv4
// has no photos yet, so no row there.
const dayHasCome = (ev) => {
  const d = String(ev.date || '').slice(0, 10); if (!d) return false;
  const n = new Date();
  return d <= n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
};

export default function UpdatesPage({ ev, save, nav, status }) {
  const [details, setDetails] = useState(false);
  const host = useKitHost();
  const photosOn = !!(host && host.photos) && dayHasCome(ev) && !!getLastSyncTime(ev.id);
  const waiting = usePhotosWaiting(ev.id, photosOn);
  // A plan never saved to an account has no updates, questions or opens to read:
  // say so once and ask the server for nothing (no signed-out 401s).
  if (!getLastSyncTime(ev.id)) return (
    <main className="view" data-view="updates">
      {nav}
      {status}
      {host && host.openSignIn
        ? <p className="fine" data-updates-signed-out>Updates and guests’ questions need this plan saved to your account. <button className="link" onClick={host.openSignIn}>Sign in</button></p>
        : <p className="fine" data-updates-signed-out>Updates and guests’ questions need this plan saved to your account. Sign in from the current app first. <a className="link" href="../hostv2/">Open the current app</a></p>}
      <WentOut ev={ev} />
    </main>
  );
  return (
    <main className="view" data-view="updates">
      {nav}
      {status}
      <h3 className="sh">Post an update</h3>
      <Updates ev={ev} save={save} />
      <h3 className="sh">Questions</h3>
      <Questions eventId={ev.id} />
      <Opens eventId={ev.id} />
      <WentOut ev={ev} />
      <div className="grp" data-day-rows>
        <button className="row gk-go" data-send-details onClick={() => setDetails(true)}><span className="nm">Send the day’s details<small>Parking, what to wear, what to bring</small></span>{chev}</button>
        {photosOn && (
          <button className="row gk-go" data-photos-waiting onClick={host.photos}>
            <span className="nm">Photos from guests</span>
            {waiting > 0 && <span className="val warn">{waiting} waiting</span>}{chev}
          </button>
        )}
      </div>
      {details && <DetailsSheet ev={ev} save={save} onDone={() => setDetails(false)} />}
    </main>
  );
}
