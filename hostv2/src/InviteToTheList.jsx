// InviteToTheList — the invite to every guest at once (owner, 11/19/2026:
// "Build the invite email batch and text queue"). Lives in the invite draft
// sheet, under the words the host just reviewed.
//
// THE SEND CONFIRM (owner, 11/24/2026: render s2-4). The sheet this lives in is
// the confirm step: who gets an email and who a text, by name, then one lit
// "Send to N by email", "Then text the other M", "Not yet", and "Send to one
// guest instead". Texts carry the body only, in plain punctuation (textBody).
// EMAIL: one tap, the count named on it; then one email per guest,
// through the same guarded send as every other email this app sends. Each
// result is kept on the guest. The daily cap stops the run and says so.
// TEXT: guests with only a phone, one prefilled text at a time. The app does
// not send texts; the host's tap on "Text …" is recorded as handed off.
// ONE GUEST (owner, 11/19/2026: "Host needs to be able to send both email and
// text to individual guests"): every guest who has not declined, with Email
// and Text wherever they have that contact, and how they were already invited.
// The rules (who, how, nobody twice) are in lib/inviteBatch.js.
import { useEffect, useState } from 'react';
import { inviteRecipients, inviteContacts, sendInviteEmails, smsHref } from '@app/lib/inviteBatch';

// ONE LIT BUTTON (11/21/2026, UX_05 "maximum ONE primary"): this block's lit
// control is the step it is on. The email to the list (the send the app makes
// itself); with no email to send, the texts; while the text queue runs,
// "Text {name}". `onLead(true)` tells the sheet this block holds its one
// primary, so the sheet's own buttons stand down.
// `disabled`: no reply link, nothing goes out (owner, 11/24/2026).
const MAIL = <svg className="si-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
const TEXT = <svg className="si-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H9l-4 4z" /><path d="M8.5 9h7M8.5 12h4.5" /></svg>;

export default function InviteToTheList({ guests, told, textBody, canEmail, sendOne, onReached, onLead, disabled, onNotYet }) {
  // Who it goes to is fixed when the sheet opens, as the nudge's is: the run
  // and the queue work through that list, and "Then text the other M" does not
  // turn into another label as each guest's invite is recorded.
  const [r] = useState(() => inviteRecipients(guests, told));
  const [step, setStep] = useState('idle');          // idle | sending | done
  const [progress, setProgress] = useState([0, 0]);
  const [result, setResult] = useState(null);
  const [queueAt, setQueueAt] = useState(null);      // index into r.text while texting
  const [queue, setQueue] = useState([]);
  const [oneOpen, setOneOpen] = useState(false);
  const [oneState, setOneState] = useState({});      // guest id → 'sending' | 'sent' | error text
  const rows = inviteContacts(guests);

  const emailCount = r.email.length;
  const textCount = r.text.length;
  const queueOn = queueAt != null && queueAt < queue.length;
  const emailShown = !!rows.length && canEmail && emailCount > 0 && step === 'idle';
  const textsShown = textCount > 0 && queueAt == null && step !== 'sending';
  const textsLit = textsShown && !emailShown;
  const lead = queueOn || emailShown || textsLit;
  useEffect(() => { if (onLead) onLead(lead); return () => { if (onLead) onLead(false); }; }, [lead]); // eslint-disable-line react-hooks/exhaustive-deps
  // No guest list to speak of: say nothing.
  if (!rows.length) return null;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const names = (xs) => xs.map((g) => g.name || 'A guest').join(', ');

  const run = async () => {
    if (disabled) return;
    setStep('sending');
    const list = r.email;
    setProgress([0, list.length]);
    const out = await sendInviteEmails(list, sendOne, (n, total) => setProgress([n, total]));
    if (out.sent.length) onReached(out.sent, 'email');
    setResult(out);
    setStep('done');
  };

  const emailOne = async (row) => {
    setOneState((m) => ({ ...m, [row.id]: 'sending' }));
    let out;
    try { out = await sendOne(row); } catch (e) { out = { ok: false, error: 'request failed' }; }
    if (out && out.ok) onReached([row], 'email');
    const said = out && out.ok ? 'sent'
      : out && out.capped ? 'This event has sent its email for today.'
      : `Didn’t go out — ${(out && out.error) || 'not sent'}.`;
    setOneState((m) => ({ ...m, [row.id]: said }));
  };
  const invitedLine = (via) => (via
    ? 'Invited by ' + via.split('+').map((w) => (w === 'text' ? 'text' : 'email')).join(' and ')
    : 'Not invited yet');

  const startTexts = () => { setQueue(r.text); setQueueAt(0); };
  const current = queueAt != null ? queue[queueAt] : null;
  const textedOne = () => {
    onReached([current], 'text');
    setQueueAt((i) => i + 1);
  };

  return (
    <div data-invite-list className={'si-list' + (disabled ? ' si-dis' : '')}>
      <div className="f-name" style={{ marginBottom: 'var(--sp-2)' }}>Send it to your guest list</div>
      {emailCount > 0 && (
        <div className="si-who" data-invite-who="email">
          <span className="si-who-h">{MAIL}Email · {plural(emailCount, 'guest', 'guests')}</span>
          <span className="si-who-n">{names(r.email)}</span>
        </div>
      )}
      {textCount > 0 && (
        <div className="si-who" data-invite-who="text">
          <span className="si-who-h">{TEXT}Text · {textCount}, one at a time</span>
          <span className="si-who-n">{names(r.text)}</span>
        </div>
      )}
      {!emailCount && !textCount && (
        <p className="grounding" style={{ margin: 0 }}>Everyone on your list who can be reached is invited.</p>
      )}

      {/* ── EMAIL ─────────────────────────────────────────────────────────── */}
      {canEmail && emailCount > 0 && step === 'idle' && (
        <p className="grounding si-g" data-invite-confirm>
          Each guest gets their own email with the words above. Nobody sees anyone else’s address, and replies come to you.
        </p>
      )}
      {!canEmail && emailCount > 0 && (
        <p className="grounding si-g">
          Sign in to email {plural(emailCount, 'guest', 'guests')} from here. Until then, text them or use Invite text on the guest list.
        </p>
      )}
      {emailShown && (
        <div className="si-actions">
          <button className={'si-wide ' + (queueOn ? 'mini' : 'cta')} data-invite-email-go disabled={disabled} onClick={run}>
            Send to {emailCount} by email
          </button>
        </div>
      )}
      {step === 'sending' && (
        <p className="grounding" role="status" style={{ margin: 'var(--sp-3) 0 0' }}>Sending {progress[0]} of {progress[1]}…</p>
      )}
      {step === 'done' && result && (
        <div role="status" data-invite-result>
          <p className="grounding" style={{ margin: 'var(--sp-3) 0 0' }}>
            {result.sent.length ? `Emailed ${plural(result.sent.length, 'guest', 'guests')}.` : 'No email went out.'}
            {result.failed.length ? ` ${result.failed.length} didn’t go out: ${result.failed.map((f) => f.name || f.email).join(', ')} — try their phone instead, or fix the address.` : ''}
            {result.capped ? ` This event has sent its email for today. The other ${result.notTried.length} can go tomorrow.` : ''}
          </p>
        </div>
      )}

      {/* ── TEXT, ONE AT A TIME, AND NOT YET ──────────────────────────────── */}
      {(textsShown || (step === 'idle' && onNotYet)) && (
        <div className="si-row2">
          {textsShown && (
            <button className={textsLit ? 'cta' : 'mini'} data-invite-texts disabled={disabled} onClick={startTexts}>
              {emailCount > 0 && canEmail ? `Then text the other ${textCount}` : `Text ${plural(textCount, 'guest', 'guests')}, one at a time`}
            </button>
          )}
          {step === 'idle' && onNotYet && <button className="mini" onClick={onNotYet}>Not yet</button>}
        </div>
      )}
      {current && (
        <div data-invite-text-queue style={{ marginTop: 'var(--sp-3)' }}>
          <p className="grounding" style={{ margin: '0 0 var(--sp-2)' }}>
            {queueAt + 1} of {queue.length}: {current.name || 'this guest'}. Your messages app opens with the invite; tap send there.
          </p>
          <div className="actions-row">
            {disabled
              ? <button className="cta" disabled>Text {current.name || 'them'}</button>
              : <a className="cta" style={{ textDecoration: 'none' }} data-invite-text-one
                href={smsHref(current, textBody)} onClick={textedOne}>Text {current.name || 'them'}</a>}
            <button className="mini" onClick={() => setQueueAt((i) => i + 1)}>Skip</button>
          </div>
        </div>
      )}
      {queueAt != null && !current && queue.length > 0 && (
        <p className="grounding" role="status" style={{ margin: 'var(--sp-2) 0 0' }}>That’s everyone with only a phone number.</p>
      )}

      {/* ── ONE GUEST, EITHER WAY OR BOTH ─────────────────────────────────── */}
      <button className="si-link" data-invite-one-open aria-expanded={oneOpen} onClick={() => setOneOpen((o) => !o)}>
        {oneOpen ? 'Hide the guest list' : `Send to one guest instead (${rows.length})`}
      </button>
      {oneOpen && (
        <ul data-invite-one style={{ listStyle: 'none', margin: 'var(--sp-2) 0 0', padding: 0 }}>
          {rows.map((g) => {
            const st = oneState[g.id];
            return (
              <li key={g.id} data-invite-guest={g.id} style={{ padding: 'var(--sp-2) 0', borderTop: '1px solid var(--line)' }}>
                <div className="f-name">{g.name || 'A guest'}</div>
                <p className="of" style={{ margin: '2px 0 var(--sp-2)' }}>
                  {st === 'sent' ? 'Emailed just now.' : (st && st !== 'sending') ? st : invitedLine(g.invitedVia)}
                </p>
                <div className="actions-row">
                  {g.email && canEmail && (
                    <button className="mini" data-invite-one-email disabled={disabled || st === 'sending' || st === 'sent'}
                      onClick={() => emailOne(g)}>{st === 'sending' ? 'Sending…' : 'Email'}</button>
                  )}
                  {g.phone && (disabled
                    ? <button className="mini" disabled>Text</button>
                    : <a className="mini" style={{ textDecoration: 'none' }} data-invite-one-text
                      href={smsHref(g, textBody)} onClick={() => onReached([g], 'text')}>Text</a>)}
                  {!g.phone && !(g.email && canEmail) && (
                    <span className="of">{g.email ? 'Sign in to email them from here.' : 'No email or phone yet — add one in Guests.'}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(r.alreadyInvited > 0 || r.unreachable.length > 0) && (
        <p className="of" style={{ margin: 'var(--sp-2) 0 0' }}>
          {r.alreadyInvited > 0 ? `${plural(r.alreadyInvited, 'guest is', 'guests are')} already invited. ` : ''}
          {r.unreachable.length > 0 ? `${r.unreachable.map((g) => g.name || 'A guest').join(', ')}: the address doesn’t look right — fix it in Guests.` : ''}
        </p>
      )}
    </div>
  );
}
