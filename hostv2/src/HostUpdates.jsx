// HostUpdates — "Updates to everyone" (owner ruling 11/16/2026, "go with
// recommendations"; migration 027, backend/app/routers/announcements.py).
//
// Inside the Guest list sheet, above the questions: no new tab. The host (or a
// co-host) posts one short update; it shows on every guest's invite, and the
// guests who ticked "email me" get it by email, once. 3 a day and 20 per
// event, counted by the server; the limits are shown before the host hits them.
// Posting to guests who will get an email takes a second tap that says so,
// because an email cannot be taken back. Removing a post takes it off the
// invite and says plainly that emails already sent stay sent.
import { useEffect, useState } from 'react';
import { track as trackEvent, EVENTS as ANALYTICS } from '@app/lib/analytics';
import { listAnnouncements, postAnnouncement, removeAnnouncement, isAnnouncementsApiConfigured } from '@app/lib/api/announcements';
import BusyLine from './BusyLine.jsx';

const when = (iso) => {
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return ''; }
};
const guests = (n) => `${n} guest${n === 1 ? '' : 's'}`;
const gets = (n) => (n === 1 ? 'gets' : 'get');   // "1 guest gets", "2 guests get" (live check 11/16)

// THE ONE POST PATH (11/21/2026): the Guest list box below and the trip
// details draft's "Post to everyone's invite" both post through this, with the
// same limits, the same second tap before an email, and the same answers.
function useGuestUpdates(eventId) {
  const [st, setSt] = useState(undefined);       // undefined loading · { announcements, limits, email_guests } · { failed }
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState('');
  const [line, setLine] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    const r = await listAnnouncements(eventId);
    // A 200 without the expected shape (a proxy, a half-deployed server) is a
    // failed load, never a crash: the e2e mock host answers {ok:true} to
    // anything, and that took this whole sheet down on desktop.
    const good = r.ok && r.limits && Array.isArray(r.announcements);
    setSt(good ? r : { failed: r.ok ? 'unavailable' : r.reason, status: r.ok ? 0 : r.status });
  };
  useEffect(() => { if (isAnnouncementsApiConfigured()) load(); }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps
  const emailN = (st && !st.failed && st.email_guests) || 0;

  // → true once the server took it. The first tap only asks when guests will be emailed.
  const post = async (text) => {
    const body = String(text || '').trim();
    if (!body || busy) return false;
    if (emailN > 0 && !confirm) { setConfirm(true); return false; }
    setBusy('post'); setErr(''); setLine('');
    const r = await postAnnouncement(eventId, body);
    setBusy(''); setConfirm(false);
    if (!r.ok) { setErr(r.status === 429 || r.status === 422 ? r.reason : 'That didn’t post. Try again.'); return false; }
    try { trackEvent(ANALYTICS.GUEST_UPDATE_POSTED, { emailing: r.emailing || 0 }); } catch (_e) { /* counter only */ }
    setLine(r.emailing > 0 ? `Posted — it’s on every invite, and ${guests(r.emailing)} ${gets(r.emailing)} it by email.` : 'Posted — it’s on every invite.');
    load();
    return true;
  };
  const remove = async (a) => {
    setBusy(a.id); setErr('');
    const r = await removeAnnouncement(eventId, a.id);
    setBusy('');
    if (!r.ok) { setErr('That didn’t go through. Try again.'); return; }
    setLine('Taken off the invite. Emails already sent stay sent.');
    load();
  };
  return { st, emailN, confirm, setConfirm, busy, line, err, post, remove };
}

const failedLine = (st) => (st.status === 503 ? 'Updates to everyone aren’t switched on yet.'
  : st.failed === 'signed-out' ? 'Sign in to post updates.'
  : st.failed === 'forbidden' ? 'This account can’t post updates for this event.'
  : 'Couldn’t load updates — check your connection and reopen this list.');
const limitLine = (limits, eventLeft) => (eventLeft === 0
  ? `You’ve posted the most updates this event allows (${limits.per_event}).`
  : `You’ve posted ${limits.per_day} updates in the last day — you can post again tomorrow.`);
const reachLine = (emailN) => (emailN > 0
  ? `It shows on every guest’s invite, and the ${guests(emailN)} who asked for email ${gets(emailN)} it by email.`
  : 'It shows on every guest’s invite. No guest has asked for email yet, so nobody is emailed.');
const room = (limits) => {
  const dayLeft = Math.max(0, limits.per_day - limits.today);
  const eventLeft = Math.max(0, limits.per_event - limits.total);
  return { dayLeft, eventLeft, canPost: dayLeft > 0 && eventLeft > 0 };
};

export default function HostUpdates({ eventId }) {
  const u = useGuestUpdates(eventId);
  const [draft, setDraft] = useState('');
  if (!isAnnouncementsApiConfigured()) return null;
  const { st, emailN, confirm, setConfirm, busy, line, err } = u;

  if (st === undefined) return <section id="guests-updates-anchor" data-host-updates style={{ marginTop: 'var(--sp-4)' }}><p className="grounding" style={{ margin: 0 }}>Loading updates…</p></section>;
  if (st.failed) {
    return (
      <section id="guests-updates-anchor" data-host-updates style={{ marginTop: 'var(--sp-4)' }}>
        <div className="shelf-label" style={{ marginBottom: 6 }}>Updates to everyone</div>
        <p className="grounding" style={{ margin: 0 }}>{failedLine(st)}</p>
      </section>
    );
  }

  const { limits } = st;
  const { dayLeft, eventLeft, canPost } = room(limits);
  const post = async () => { if (await u.post(draft)) setDraft(''); };
  const remove = u.remove;

  return (
    <section id="guests-updates-anchor" data-host-updates aria-label="Updates to everyone" style={{ marginTop: 'var(--sp-4)' }}>
      <div className="shelf-label" style={{ marginBottom: 6 }}>Updates to everyone</div>
      <p className="grounding" style={{ margin: '0 0 var(--sp-2)' }} data-updates-reach>
        {reachLine(emailN)}
      </p>
      {canPost ? (
        <>
          <textarea className="field" style={{ maxWidth: 'none', minHeight: 64, resize: 'vertical', fontSize: 'var(--t-input)' }}
            maxLength={1000} value={draft} onChange={(e) => { setDraft(e.target.value); setConfirm(false); }}
            aria-label="Your update to every guest" placeholder="Parking is on Elm after 5 — the lot is closed." />
          <div className="actions-row" style={{ marginTop: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="cta" data-update-post onClick={post} disabled={!draft.trim() || busy === 'post'}
              style={!draft.trim() ? { opacity: .45 } : undefined}>
              {busy === 'post' ? 'Posting…' : confirm ? `Post and email ${guests(emailN)}` : 'Post the update'}
            </button>
            {confirm && <button className="mini" onClick={() => setConfirm(false)}>Not yet</button>}
          </div>
          {busy === 'post' && <BusyLine>{emailN > 0 ? `Posting, and emailing ${guests(emailN)}…` : 'Posting the update…'}</BusyLine>}
          {confirm && <p className="of" style={{ margin: '4px 0 0' }}>An email can’t be taken back once it’s sent.</p>}
        </>
      ) : (
        <p className="grounding" data-updates-limit style={{ margin: 0 }}>
          {limitLine(limits, eventLeft)}
        </p>
      )}
      <p className="of" data-updates-left style={{ margin: '6px 0 0' }}>{dayLeft} of {limits.per_day} left today · {eventLeft} of {limits.per_event} left for this event</p>
      {err && <p className="grounding" role="alert" style={{ margin: '6px 0 0', color: 'var(--danger)' }}>{err}</p>}
      {line && <p className="grounding" role="status" data-update-status style={{ margin: '6px 0 0' }}>{line}</p>}
      {st.announcements.filter((a) => !a.removed).length > 0 && (
        <ul data-update-list style={{ listStyle: 'none', margin: 'var(--sp-3) 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {st.announcements.filter((a) => !a.removed).map((a) => (
            <li key={a.id} style={{ border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)', padding: '10px 12px', minWidth: 0 }}>
              <div className="of">{when(a.created_at)}</div>
              <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{a.body}</p>
              <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
                <button className="mini" onClick={() => remove(a)} disabled={busy === a.id}>Take it off the invite</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── "POST TO EVERYONE'S INVITE" FROM A DRAFT (owner pick, 11/21/2026) ────────
// The trip details draft posts its reviewed words through the same path as
// the box above: on every guest's invite, emailed once to the guests who
// asked, 3 a day and 20 per event, a second tap before an email goes out. The
// shell renders this only when signed in, on a saved event, with travelers on
// the list; otherwise it shows the one line saying why. The server's answer is
// the only success it reports.
const MAX_POST = 1000;
export function PostToEveryone({ eventId, body }) {
  const u = useGuestUpdates(eventId);
  if (!isAnnouncementsApiConfigured()) return null;
  const { st, emailN, confirm, setConfirm, busy, line, err } = u;
  if (st === undefined) return <p className="grounding" data-post-invite>Checking your updates…</p>;
  if (st.failed) return <p className="grounding" data-post-invite data-post-invite-why>{failedLine(st)}</p>;
  const { dayLeft, eventLeft, canPost } = room(st.limits);
  const text = String(body || '').trim();
  const tooLong = text.length > MAX_POST;
  return (
    <div data-post-invite>
      <p className="grounding" data-post-invite-reach>{reachLine(emailN)}</p>
      {canPost ? (
        <div className="actions-row" style={{ marginTop: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="cta" data-post-invite-btn onClick={() => u.post(text)} disabled={!text || tooLong || busy === 'post'}>
            {busy === 'post' ? 'Posting…' : confirm ? `Post and email ${guests(emailN)}` : 'Post to everyone’s invite'}
          </button>
          {confirm && <button className="mini" onClick={() => setConfirm(false)}>Not yet</button>}
        </div>
      ) : (
        <p className="grounding" data-post-invite-limit>{limitLine(st.limits, eventLeft)}</p>
      )}
      {busy === 'post' && <BusyLine>{emailN > 0 ? `Posting, and emailing ${guests(emailN)}…` : 'Posting the update…'}</BusyLine>}
      {confirm && <p className="of">An email can’t be taken back once it’s sent.</p>}
      {tooLong && <p className="grounding" data-post-invite-long>The invite takes {MAX_POST.toLocaleString('en-US')} characters and this is {text.length.toLocaleString('en-US')}. Shorten it above to post it.</p>}
      <p className="of" data-post-invite-left>{dayLeft} of {st.limits.per_day} left today · {eventLeft} of {st.limits.per_event} left for this event</p>
      {err && <p className="grounding" role="alert" style={{ color: 'var(--danger)' }}>{err}</p>}
      {line && <p className="grounding" role="status" data-post-invite-status>{line}</p>}
    </div>
  );
}
