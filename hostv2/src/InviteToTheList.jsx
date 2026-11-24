// InviteToTheList — the invite to every guest at once (owner, 11/19/2026:
// "Build the invite email batch and text queue"). Lives in the invite draft
// sheet, under the words the host just reviewed.
//
// EMAIL: one tap names the count, a second confirms; then one email per guest,
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
// control is the step it is on. Email it to the list (the send the app makes
// itself), or, while the text queue runs, "Text {name}"; then the email step
// goes quiet. `onLead(true)` tells the sheet this block holds its one primary,
// so the sheet's own "Share…" stands down to a quiet button.
export default function InviteToTheList({ guests, told, draft, canEmail, sendOne, onReached, onLead }) {
  const r = inviteRecipients(guests, told);
  const [step, setStep] = useState('idle');          // idle | confirm | sending | done
  const [progress, setProgress] = useState([0, 0]);
  const [result, setResult] = useState(null);
  const [queueAt, setQueueAt] = useState(null);      // index into r.text while texting
  const [queue, setQueue] = useState([]);
  const [oneOpen, setOneOpen] = useState(false);
  const [oneState, setOneState] = useState({});      // guest id → 'sending' | 'sent' | error text
  const rows = inviteContacts(guests);

  const emailCount = r.email.length;
  const queueOn = queueAt != null && queueAt < queue.length;
  const emailShown = !!rows.length && canEmail && emailCount > 0 && (step === 'idle' || step === 'confirm');
  const lead = queueOn || emailShown;
  useEffect(() => { if (onLead) onLead(lead); return () => { if (onLead) onLead(false); }; }, [lead]); // eslint-disable-line react-hooks/exhaustive-deps
  // No guest list to speak of: say nothing.
  if (!rows.length) return null;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  const run = async () => {
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
    <div data-invite-list style={{ marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--line)' }}>
      <div className="f-name" style={{ marginBottom: 'var(--sp-2)' }}>Send it to your guest list</div>

      {/* ── EMAIL ─────────────────────────────────────────────────────────── */}
      {canEmail && emailCount > 0 && step === 'idle' && (
        <div className="actions-row">
          <button className={queueOn ? 'mini' : 'cta'} data-invite-email onClick={() => setStep('confirm')}>
            Email it to {plural(emailCount, 'guest', 'guests')}
          </button>
        </div>
      )}
      {step === 'confirm' && (
        <div data-invite-confirm>
          <p className="grounding" style={{ margin: '0 0 var(--sp-2)' }}>
            Each guest gets their own email with the words above. Nobody sees anyone else’s address, and replies come to you.
          </p>
          <div className="actions-row">
            <button className={queueOn ? 'mini' : 'cta'} data-invite-email-go onClick={run}>Send {plural(emailCount, 'email', 'emails')}</button>
            <button className="mini" onClick={() => setStep('idle')}>Not yet</button>
          </div>
        </div>
      )}
      {step === 'sending' && (
        <p className="grounding" role="status" style={{ margin: 0 }}>Sending {progress[0]} of {progress[1]}…</p>
      )}
      {step === 'done' && result && (
        <div role="status" data-invite-result>
          <p className="grounding" style={{ margin: 0 }}>
            {result.sent.length ? `Emailed ${plural(result.sent.length, 'guest', 'guests')}.` : 'No email went out.'}
            {result.failed.length ? ` ${result.failed.length} didn’t go out: ${result.failed.map((f) => f.name || f.email).join(', ')} — try their phone instead, or fix the address.` : ''}
            {result.capped ? ` This event has sent its email for today. The other ${result.notTried.length} can go tomorrow.` : ''}
          </p>
        </div>
      )}
      {!canEmail && emailCount > 0 && (
        <p className="grounding" style={{ margin: 0 }}>
          Sign in to email {plural(emailCount, 'guest', 'guests')} from here. Until then, Share or Copy above works.
        </p>
      )}

      {/* ── TEXT, ONE AT A TIME ───────────────────────────────────────────── */}
      {r.text.length > 0 && queueAt == null && (
        <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
          <button className="mini" data-invite-texts onClick={startTexts}>
            Text it to {plural(r.text.length, 'guest', 'guests')}, one at a time
          </button>
        </div>
      )}
      {current && (
        <div data-invite-text-queue style={{ marginTop: 'var(--sp-2)' }}>
          <p className="grounding" style={{ margin: '0 0 var(--sp-2)' }}>
            {queueAt + 1} of {queue.length}: {current.name || 'this guest'}. Your messages app opens with the invite; tap send there.
          </p>
          <div className="actions-row">
            <a className="cta" style={{ textDecoration: 'none' }} data-invite-text-one
              href={smsHref(current, draft)} onClick={textedOne}>Text {current.name || 'them'}</a>
            <button className="mini" onClick={() => setQueueAt((i) => i + 1)}>Skip</button>
          </div>
        </div>
      )}
      {queueAt != null && !current && queue.length > 0 && (
        <p className="grounding" role="status" style={{ margin: 'var(--sp-2) 0 0' }}>That’s everyone with only a phone number.</p>
      )}

      {/* ── ONE GUEST, EITHER WAY OR BOTH ─────────────────────────────────── */}
      <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
        <button className="mini" data-invite-one-open aria-expanded={oneOpen} onClick={() => setOneOpen((o) => !o)}>
          {oneOpen ? 'Hide the guest list' : `Send to one guest (${rows.length})`}
        </button>
      </div>
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
                    <button className="mini" data-invite-one-email disabled={st === 'sending' || st === 'sent'}
                      onClick={() => emailOne(g)}>{st === 'sending' ? 'Sending…' : 'Email'}</button>
                  )}
                  {g.phone && (
                    <a className="mini" style={{ textDecoration: 'none' }} data-invite-one-text
                      href={smsHref(g, draft)} onClick={() => onReached([g], 'text')}>Text</a>
                  )}
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
