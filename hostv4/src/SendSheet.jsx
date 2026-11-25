// hostv4 SEND THE INVITE (owner, 11/25/2026: "Use the hostv2 sign-in for
// sending in hostv4"). The send sheet of the feature map, built on the shared
// steps both shells send with:
//   - the account: the session hostv2 signed in (same origin); signed out, it
//     says so and opens the current app to sign in;
//   - the reply link, checked before anything goes out (lib/inviteSend);
//   - who gets what (lib/inviteBatch): email to everyone with an address, then
//     texts one at a time for those with only a phone; or one guest at a time;
//   - "I sent it another way", a record only.
// Every send is recorded on the plan through the same edits hostv2 saves.
// The invite picture hostv2 draws and uploads is not drawn here yet, so the
// email carries the HTML card the server builds (the designed fallback).
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@app/lib/supabaseClient';
import { isCommApiConfigured } from '@app/lib/commApi';
import { replyLinkFor, emailInviteTo, invitesReachedEdit, inviteSentFields } from '@app/lib/inviteSend';
import { inviteRecipients, inviteContacts, sendInviteEmails, smsHref, inviteSubjectAndBody } from '@app/lib/inviteBatch';
import { guestToldMap } from '@app/lib/guestTold';
import { withLink, textMessageBody, sentSnapshot } from '@app/lib/inviteMessageDraft';
import { recordHandoff } from '@app/lib/sendLedger';

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
const names = (xs) => xs.map((g) => g.name || 'A guest').join(', ');
const LINK_WHY = {
  unpublished: 'Your plan isn’t saved to your account yet. Open it once in the current app, signed in, and it saves.',
  'not-configured': 'Replies aren’t switched on for this app.',
  unavailable: 'We couldn’t reach your reply page. Check your connection and try again.',
};

/** The account hostv2 signed in, read once: { state: 'checking' | 'in' | 'out', email }. */
function useAccount() {
  const [acct, setAcct] = useState({ state: 'checking', email: '' });
  useEffect(() => {
    let live = true;
    if (!isSupabaseConfigured() || !supabase) { setAcct({ state: 'out', email: '' }); return undefined; }
    supabase.auth.getSession().then(({ data }) => {
      const s = data && data.session;
      if (live) setAcct(s ? { state: 'in', email: (s.user && s.user.email) || '' } : { state: 'out', email: '' });
    }).catch(() => { if (live) setAcct({ state: 'out', email: '' }); });
    return () => { live = false; };
  }, []);
  return acct;
}

export default function SendSheet({ ev, draft, subject, voice, hostName, save, onDone }) {
  const acct = useAccount();
  const [link, setLink] = useState({ state: 'idle', url: '', reason: null });
  // Who it goes to is fixed when the sheet opens, so the labels hold still as each send is recorded.
  const [r] = useState(() => inviteRecipients(ev.guests, guestToldMap(ev)));
  const [step, setStep] = useState('idle'); // idle | sending | done
  const [progress, setProgress] = useState([0, 0]);
  const [result, setResult] = useState(null);
  const [queueAt, setQueueAt] = useState(null);
  const [oneOpen, setOneOpen] = useState(false);
  const [oneState, setOneState] = useState({});

  const check = () => {
    setLink({ state: 'checking', url: '', reason: null });
    replyLinkFor(ev).then((x) => setLink({ state: x.url ? 'ready' : 'missing', url: x.url, reason: x.reason }))
      .catch(() => setLink({ state: 'missing', url: '', reason: 'unavailable' }));
  };
  useEffect(() => { if (acct.state === 'in') check(); }, [acct.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const full = withLink(draft, link.url);
  const email = inviteSubjectAndBody(full, subject);
  const textBody = textMessageBody(full, subject);
  const canEmail = isCommApiConfigured() && acct.state === 'in';
  const ready = link.state === 'ready';
  const reached = (list, via) => {
    const at = new Date().toISOString();
    save(invitesReachedEdit(ev, list, via, at, sentSnapshot({ subject: email.subject, body: email.body, voice, at })));
  };
  const sendOne = (g) => emailInviteTo(ev, g, { subject: email.subject, body: email.body, hostName, replyTo: acct.email });

  const run = async () => {
    if (!ready) return;
    setStep('sending'); setProgress([0, r.email.length]);
    const out = await sendInviteEmails(r.email, sendOne, (n, total) => setProgress([n, total]));
    if (out.sent.length) reached(out.sent, 'email');
    setResult(out); setStep('done');
  };
  const emailOne = async (g) => {
    setOneState((m) => ({ ...m, [g.id]: 'sending' }));
    let out; try { out = await sendOne(g); } catch { out = { ok: false, error: 'request failed' }; }
    if (out && out.ok) reached([g], 'email');
    setOneState((m) => ({ ...m, [g.id]: out && out.ok ? 'sent' : out && out.capped ? 'This event has sent its email for today.' : 'Didn’t go out — ' + ((out && out.error) || 'not sent') + '.' }));
  };
  const anotherWay = () => {
    const at = new Date().toISOString();
    const led = recordHandoff(ev.sendLedger, 'Your invite', 'other', at, { kind: 'guests' });
    const snap = sentSnapshot({ subject: email.subject, body: email.body, voice, at });
    save({ patch: { sendLedger: led, ...inviteSentFields(ev, 'other', snap, at) }, msg: 'Noted — the plan remembers this went out.' });
    onDone();
  };

  const current = queueAt != null ? r.text[queueAt] : null;
  const rows = inviteContacts(ev.guests);
  // THE ONE LIT BUTTON is the step she is on: the emails, else the texts, else the text queue.
  const emailLit = canEmail && ready && r.email.length > 0 && step === 'idle';
  const textsLit = ready && r.text.length > 0 && queueAt == null && step !== 'sending' && !emailLit;

  let body;
  if (acct.state === 'checking') body = <p className="fine" role="status">Checking your account…</p>;
  else if (acct.state === 'out') body = (<>
    <p className="qhelp">Sending uses your account, so replies come back to this plan. Sign in once in the current app, then come back here.</p>
    <a className="primary" href="../hostv2/">Sign in in the current app</a>
  </>);
  else if (link.state === 'checking' || link.state === 'idle') body = <p className="fine" role="status">Checking your reply link…</p>;
  else if (!ready) body = (<>
    <p className="qhelp" role="alert" data-link-missing><b>Your reply link isn’t ready.</b> {LINK_WHY[link.reason] || LINK_WHY.unavailable} Nothing can go out without it.</p>
    {link.reason === 'unpublished' ? <a className="primary" href="../hostv2/">Open it in the current app</a> : <button className="primary" onClick={check}>Try again</button>}
  </>);
  else body = (<>
    {r.email.length > 0 && <div className="who" data-who="email"><b>Email · {plural(r.email.length, 'guest', 'guests')}</b><span>{names(r.email)}</span></div>}
    {r.text.length > 0 && <div className="who" data-who="text"><b>Text · {r.text.length}, one at a time</b><span>{names(r.text)}</span></div>}
    {!r.email.length && !r.text.length && <p className="fine">Everyone on your list who can be reached is invited.</p>}
    {r.alreadyInvited > 0 && <p className="fine">{plural(r.alreadyInvited, 'guest is', 'guests are')} already invited.</p>}
    {r.unreachable.length > 0 && <p className="fine warn">{names(r.unreachable)}: the address doesn’t look right — fix it in Guests.</p>}
    {emailLit && <p className="fine">Each guest gets their own email. Nobody sees anyone else’s address, and replies come to you.</p>}
    {emailLit && <button className="primary" data-send-email onClick={run}>Send to {r.email.length} by email</button>}
    {step === 'sending' && <p className="fine" role="status">Sending {progress[0]} of {progress[1]}…</p>}
    {step === 'done' && result && (
      <p className={'done' + (result.failed.length || result.capped || !result.sent.length ? ' warnline' : '')} role="status" data-send-result>
        {result.sent.length ? 'Emailed ' + plural(result.sent.length, 'guest', 'guests') + '.' : 'No email went out.'}
        {result.failed.length ? ' ' + result.failed.length + ' didn’t go out: ' + result.failed.map((f) => f.name || f.email).join(', ') + ' — try their phone instead, or fix the address.' : ''}
        {result.capped ? ' This event has sent its email for today. The other ' + result.notTried.length + ' can go tomorrow.' : ''}
      </p>
    )}
    {textsLit && <button className="primary" data-send-texts onClick={() => setQueueAt(0)}>{r.email.length && canEmail ? 'Then text the other ' + r.text.length : 'Text ' + plural(r.text.length, 'guest', 'guests') + ', one at a time'}</button>}
    {current && (<>
      <p className="fine">{queueAt + 1} of {r.text.length}: {current.name || 'this guest'}. Your messages app opens with the invite; tap send there.</p>
      <a className="primary" data-text-one href={smsHref(current, textBody)} onClick={() => { reached([current], 'text'); setQueueAt((i) => i + 1); }}>Text {current.name || 'them'}</a>
      <button className="link" onClick={() => setQueueAt((i) => i + 1)}>Skip</button>
    </>)}
    {queueAt != null && !current && r.text.length > 0 && <p className="fine" role="status">That’s everyone with only a phone number.</p>}
    <button className="link" aria-expanded={oneOpen} onClick={() => setOneOpen((o) => !o)}>{oneOpen ? 'Hide the guest list' : 'Send to one guest instead (' + rows.length + ')'}</button>
    {oneOpen && (
      <div className="grp" data-one>
        {rows.map((g) => {
          const st = oneState[g.id];
          return (
            <div className="row one" key={g.id}>
              <span className="nm">{g.name || 'A guest'}<small>{st === 'sent' ? 'Emailed just now.' : st && st !== 'sending' ? st : g.invitedVia ? 'Invited by ' + g.invitedVia.replace('+', ' and ') : 'Not invited yet'}</small></span>
              {g.email && canEmail && <button className="link" disabled={st === 'sending' || st === 'sent'} onClick={() => emailOne(g)}>{st === 'sending' ? 'Sending…' : 'Email'}</button>}
              {g.phone && <a className="link" href={smsHref(g, textBody)} onClick={() => reached([g], 'text')}>Text</a>}
            </div>
          );
        })}
      </div>
    )}
    <button className="link" data-another-way onClick={anotherWay}>I already sent it another way</button>
  </>);

  return (
    <div className="scrim" onClick={onDone}>
      <div className="sheet" role="dialog" aria-label="Send the invite" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheethead"><h2>Send the invite</h2><button className="link" onClick={onDone}>Done</button></div>
        <div className="sendbody">{body}</div>
      </div>
    </div>
  );
}
