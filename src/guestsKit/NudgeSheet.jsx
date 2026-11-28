// hostv4 NUDGE THE ONES WHO HAVEN'T REPLIED (owner, 11/25/2026: "start the
// nudge and lock count flow"). The feature map's nudge sheet, on the same
// steps hostv2 nudges with:
//   - who: everyone whose invite went out, has not replied and was not nudged
//     in the last 3 days (lib/replyNudge nudgeRecipients);
//   - the words: the RSVP nudge (draftRsvpChase) with the checked reply link;
//   - email, then texts one at a time; each nudge recorded on the guest
//     (lib/inviteSend nudgedEdit), never as a delivery claim.
// Nobody waiting who can be reached: it says so (the map's no-contact case).
import { useMemo, useState } from 'react';
import { isCommApiConfigured } from '@app/lib/commApi';
import { emailNudgeTo, nudgedEdit } from '@app/lib/inviteSend';
import { sendInviteEmails, smsHref, inviteSubjectAndBody } from '@app/lib/inviteBatch';
import { nudgeRecipients, nudgeCount, nudgeTextBody, NUDGE_GAP_DAYS } from '@app/lib/replyNudge';
import { draftRsvpChase } from '@app/lib/doItForMe';
import { plainText } from '@app/lib/inviteMessageDraft';
import { useSendReady, NotReady, readProfile } from './sendKit.jsx';

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

export default function NudgeSheet({ ev, save, onDone }) {
  const { acct, link, ready, check } = useSendReady(ev);
  const profile = useMemo(readProfile, []);
  // Who it goes to is fixed when the sheet opens, as hostv2's is.
  const [r] = useState(() => nudgeRecipients(ev));
  const [step, setStep] = useState('idle'); // idle | sending | done
  const [progress, setProgress] = useState([0, 0]);
  const [result, setResult] = useState(null);
  const [queueAt, setQueueAt] = useState(null);
  const n = nudgeCount(r);

  const draft = useMemo(() => { try { return draftRsvpChase(ev, profile, { rsvpUrl: link.url }); } catch { return { subject: '', body: '' }; } }, [ev, profile, link.url]);
  const subject = draft.subject || 'Can you make it?';
  const email = inviteSubjectAndBody(draft.body, subject);
  const textBody = plainText(nudgeTextBody(email.body));
  const canEmail = isCommApiConfigured() && acct.state === 'in';
  const reached = (list, via) => save(nudgedEdit(ev, list, via, new Date().toISOString()));
  const sendOne = (g) => emailNudgeTo(ev, g, { subject: email.subject, body: email.body, hostName: (profile && profile.name) || '', replyTo: acct.email });

  const run = async () => {
    setStep('sending'); setProgress([0, r.email.length]);
    const out = await sendInviteEmails(r.email, sendOne, (k, total) => setProgress([k, total]));
    if (out.sent.length) reached(out.sent, 'email');
    setResult(out); setStep('done');
  };
  const current = queueAt != null ? r.text[queueAt] : null;
  const emailLit = canEmail && r.email.length > 0 && step === 'idle';

  let body;
  if (!n && step === 'idle') body = (<>
    <p className="qhelp" data-nobody>Everyone whose invite went out has replied{r.recentlyNudged ? ' or was nudged in the last ' + NUDGE_GAP_DAYS + ' days' : ''}.</p>
    {r.unreachable.length > 0 && <p className="fine warn" data-no-contact>{r.unreachable.map((g) => g.name || 'A guest').join(', ')}: no email or phone that works — fix it in Guests.</p>}
  </>);
  else if (!ready) body = <NotReady acct={acct} link={link} check={check} />;
  else body = (<>
    <div className="msg" data-message>{email.body}</div>
    {r.email.length > 0 && <div className="who" data-who="email"><b>Email · {plural(r.email.length, 'guest', 'guests')}</b><span>{r.email.map((g) => g.name).join(', ')}</span></div>}
    {r.text.length > 0 && <div className="who" data-who="text"><b>Text · {r.text.length}, one at a time</b><span>{r.text.map((g) => g.name).join(', ')}</span></div>}
    {emailLit && <p className="fine">Each guest gets their own email. Nobody sees anyone else’s address, and replies come to you.</p>}
    {emailLit && <button className="primary" data-nudge-email onClick={run}>Email the nudge to {plural(r.email.length, 'guest', 'guests')}</button>}
    {step === 'sending' && <p className="fine" role="status">Emailing {progress[0]} of {progress[1]}…</p>}
    {step === 'done' && result && (
      <p className={'done' + (result.failed.length || result.capped || !result.sent.length ? ' warnline' : '')} role="status" data-nudge-result>
        {result.sent.length ? 'Emailed ' + plural(result.sent.length, 'guest', 'guests') + '.' : 'No email went out.'}
        {result.failed.length ? ' ' + result.failed.length + ' didn’t go out: ' + result.failed.map((f) => (f.name || f.email) + ' (' + f.error + ')').join(', ') + '.' : ''}
        {result.capped ? ' This event has sent its email for today. The other ' + result.notTried.length + ' go tomorrow.' : ''}
      </p>
    )}
    {r.text.length > 0 && queueAt == null && step !== 'sending' && !emailLit && <button className="primary" data-nudge-texts onClick={() => setQueueAt(0)}>Text the nudge to {plural(r.text.length, 'guest', 'guests')}, one at a time</button>}
    {current && (<>
      <p className="fine">{queueAt + 1} of {r.text.length}: {current.name || 'this guest'}. Your messages app opens with the nudge; tap send there.</p>
      <a className="primary" data-nudge-text-one href={smsHref(current, textBody)} onClick={() => { reached([current], 'text'); setQueueAt((i) => i + 1); }}>Text {current.name || 'them'}</a>
      <button className="link" onClick={() => setQueueAt((i) => i + 1)}>Skip</button>
    </>)}
    {queueAt != null && !current && r.text.length > 0 && <p className="fine" role="status">That’s everyone with only a phone number.</p>}
    {(r.recentlyNudged > 0 || r.unreachable.length > 0) && (
      <p className="fine" data-skipped>
        {r.recentlyNudged > 0 ? 'Skipped ' + plural(r.recentlyNudged, 'guest', 'guests') + ' nudged in the last ' + NUDGE_GAP_DAYS + ' days. ' : ''}
        {r.unreachable.length > 0 ? r.unreachable.map((g) => g.name || 'A guest').join(', ') + ': no email or phone that works — fix it in Guests.' : ''}
      </p>
    )}
  </>);

  return (
    <div className="scrim" onClick={onDone}>
      <div className="gk-sheet" role="dialog" aria-label="Nudge" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheethead"><h2>{n ? 'Nudge the ' + n + ' who ' + (n === 1 ? 'hasn’t' : 'haven’t') + ' replied' : 'Nobody to nudge'}</h2><button className="link" onClick={onDone}>Done</button></div>
        <div className="sendbody">{body}</div>
      </div>
    </div>
  );
}
