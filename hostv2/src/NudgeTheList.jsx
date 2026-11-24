// NudgeTheList — "Nudge the N who haven't replied" (owner ruling, 11/20/2026:
// "Approve as written"). Lives in the RSVP nudge draft sheet, under the words
// the host just reviewed, the way InviteToTheList lives under the invite.
//
// EMAIL: one tap names the count, a second confirms; then one email per guest
// through the same guarded send as the invite (lib/inviteBatch.sendInviteEmails
// drives the run). The daily cap stops the run and says the rest go tomorrow.
// TEXT: guests with only a phone, one prefilled text at a time. The app does
// not send texts; the host's tap on "Text …" is recorded as the host's word.
// Who, who is skipped, and what a row says afterwards: lib/replyNudge.js.
import { useEffect, useState } from 'react';
import { sendInviteEmails, smsHref } from '@app/lib/inviteBatch';
import { nudgeRecipients, nudgeCount, NUDGE_GAP_DAYS } from '@app/lib/replyNudge';
import { trackNudgeRun, trackNudgeText } from '@app/lib/flowAnalytics';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ONE LIT BUTTON (11/21/2026, UX_05 "maximum ONE primary"): this block's lit
// control is the step it is on. Email the nudge (the send the app makes
// itself), or, while the text queue runs, "Text {name}"; then the email step
// goes quiet. `onLead(true)` tells the sheet this block holds its one primary,
// so the sheet's own "Share…" stands down to a quiet button.
// `disabled` (owner, 11/24/2026): no reply link, nothing goes out; every
// control waits until the sheet has the link.
export default function NudgeTheList({ event, textBody, canEmail, sendOne, onReached, onLead, disabled }) {
  // Who it goes to is fixed when the sheet opens: the run and the queue work
  // through that list, and the counts above them do not shift as each guest's
  // nudge is recorded (a guest just emailed is not "skipped").
  const [r] = useState(() => nudgeRecipients(event));
  const [step, setStep] = useState('idle');          // idle | confirm | sending | done
  const [progress, setProgress] = useState([0, 0]);
  const [result, setResult] = useState(null);
  const [queueAt, setQueueAt] = useState(null);      // index into the text queue while texting
  const [queue, setQueue] = useState([]);

  const emailCount = r.email.length;
  const n = nudgeCount(r);
  const queueOn = queueAt != null && queueAt < queue.length;
  const emailShown = canEmail && emailCount > 0 && (step === 'idle' || step === 'confirm');
  const lead = queueOn || emailShown;
  useEffect(() => { if (onLead) onLead(lead); return () => { if (onLead) onLead(false); }; }, [lead]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    setStep('sending');
    const list = r.email;
    setProgress([0, list.length]);
    const out = await sendInviteEmails(list, sendOne, (k, total) => setProgress([k, total]));
    if (out.sent.length) onReached(out.sent, 'email');
    trackNudgeRun(out, r);   // once per run, counts only (lib/flowAnalytics)
    setResult(out);
    setStep('done');
  };

  const startTexts = () => { setQueue(r.text); setQueueAt(0); };
  const current = queueAt != null ? queue[queueAt] : null;
  const textedOne = () => { onReached([current], 'text'); trackNudgeText(); setQueueAt((i) => i + 1); };

  return (
    <div data-nudge-list className={disabled ? 'si-dis' : undefined} style={{ marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--line)' }}>
      <div className="f-name" style={{ marginBottom: 'var(--sp-2)' }}>
        {n > 0 ? `Nudge the ${n} who ${n === 1 ? 'hasn’t' : 'haven’t'} replied` : 'Nobody is waiting on a nudge'}
      </div>
      {n === 0 && step === 'idle' && queueAt == null && (
        <p className="grounding" style={{ margin: 0 }}>
          Everyone whose invite went out has replied{r.recentlyNudged ? ` or was nudged in the last ${NUDGE_GAP_DAYS} days` : ''}.
        </p>
      )}

      {/* ── EMAIL ─────────────────────────────────────────────────────────── */}
      {canEmail && emailCount > 0 && step === 'idle' && (
        <div className="actions-row">
          <button className={queueOn ? 'mini' : 'cta'} data-nudge-email disabled={disabled} onClick={() => setStep('confirm')}>
            Email the nudge to {plural(emailCount, 'guest', 'guests')}
          </button>
        </div>
      )}
      {step === 'confirm' && (
        <div data-nudge-confirm>
          <p className="grounding" style={{ margin: '0 0 var(--sp-2)' }}>
            Each guest gets their own email with the words above, from the app. Nobody sees anyone else’s address, and replies come to you.
          </p>
          <div className="actions-row">
            <button className={queueOn ? 'mini' : 'cta'} data-nudge-email-go disabled={disabled} onClick={run}>Send {plural(emailCount, 'email', 'emails')}</button>
            <button className="mini" onClick={() => setStep('idle')}>Not yet</button>
          </div>
        </div>
      )}
      {step === 'sending' && (
        <p className="grounding" role="status" data-nudge-progress style={{ margin: 0 }}>Emailing {progress[0]} of {progress[1]}…</p>
      )}
      {step === 'done' && result && (
        <p className="grounding" role="status" data-nudge-result style={{ margin: 0 }}>
          {result.sent.length ? `Emailed ${plural(result.sent.length, 'guest', 'guests')} — delivery shows in Messages.` : 'No email went out.'}
          {result.failed.length ? ` ${result.failed.length} didn’t go out: ${result.failed.map((f) => `${f.name || f.email} (${f.error})`).join(', ')}.` : ''}
          {result.capped ? ` This event has sent its email for today. The other ${result.notTried.length} go tomorrow — tap this again then.` : ''}
        </p>
      )}
      {!canEmail && emailCount > 0 && (
        <p className="grounding" style={{ margin: 0 }}>
          Sign in to email {plural(emailCount, 'guest', 'guests')} from here. Until then, Share or Copy above works.
        </p>
      )}

      {/* ── TEXT, ONE AT A TIME ───────────────────────────────────────────── */}
      {r.text.length > 0 && queueAt == null && (
        <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
          <button className="mini" data-nudge-texts disabled={disabled} onClick={startTexts}>
            Text the nudge to {plural(r.text.length, 'guest', 'guests')}, one at a time
          </button>
        </div>
      )}
      {current && (
        <div data-nudge-text-queue style={{ marginTop: 'var(--sp-2)' }}>
          <p className="grounding" style={{ margin: '0 0 var(--sp-2)' }}>
            {queueAt + 1} of {queue.length}: {current.name || 'this guest'}. Your messages app opens with the nudge; tap send there.
          </p>
          <div className="actions-row">
            <a className="cta" style={{ textDecoration: 'none' }} data-nudge-text-one
              href={smsHref(current, textBody)} onClick={textedOne}>Text {current.name || 'them'}</a>
            <button className="mini" onClick={() => setQueueAt((i) => i + 1)}>Skip</button>
          </div>
        </div>
      )}
      {queueAt != null && !current && queue.length > 0 && (
        <p className="grounding" role="status" style={{ margin: 'var(--sp-2) 0 0' }}>That’s everyone with only a phone number.</p>
      )}

      {(r.recentlyNudged > 0 || r.unreachable.length > 0) && (
        <p className="of" data-nudge-skipped style={{ margin: 'var(--sp-2) 0 0' }}>
          {r.recentlyNudged > 0 ? `Skipped ${plural(r.recentlyNudged, 'guest', 'guests')} nudged in the last ${NUDGE_GAP_DAYS} days. ` : ''}
          {r.unreachable.length > 0 ? `${r.unreachable.map((g) => g.name || 'A guest').join(', ')}: no email or phone that works — fix it in Guests.` : ''}
        </p>
      )}
    </div>
  );
}
