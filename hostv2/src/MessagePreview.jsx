// MessagePreview — "Preview as: Email | Text" on the invite message (owner-
// approved renders s2-3 and s2-3b, 11/24/2026). Nothing here is sent or saved.
//   Email: who it is from and to, the subject on the envelope, the invite
//     card (the email leads with the invite page's picture), the body and the
//     link. The split is the send's own (inviteBatch.inviteSubjectAndBody).
//   Text: the bubble a guest gets, greeted by name (inviteBatch.greetingName,
//     smsHref's greeting), body only, in plain punctuation, with its character count and
//     how many texts a phone splits it into (lib/inviteMessageDraft).
import { useState } from 'react';
import { inviteSubjectAndBody, greetingName } from '@app/lib/inviteBatch';
import { textMessageBody, smsSegments } from '@app/lib/inviteMessageDraft';

const URL_RE = /(https?:\/\/[^\s]+)/g;
const linked = (text) => String(text || '').split(URL_RE).map((part, i) => (
  i % 2 ? <span key={i} className="pv-link">{part}</span> : part
));
const initials = (name) => {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?';
  return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
};
const first = (name) => String(name || '').trim().split(/\s+/)[0] || '';

export default function MessagePreview({ draft, subject, from, toEmail, toText, card }) {
  const [as, setAs] = useState('email');
  const mail = inviteSubjectAndBody(draft, subject);
  const greet = toText && greetingName(toText.name) ? `Hi ${greetingName(toText.name)}, ` : '';
  const sms = greet + textMessageBody(draft, subject);
  const seg = smsSegments(sms);
  const pick = (v) => (e) => { e.preventDefault(); setAs(v); };
  const onKey = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    setAs((a) => (a === 'email' ? 'text' : 'email'));
  };
  return (
    <div data-message-preview>
      <div className="pv-head">
        <span className="of">Preview as</span>
        <div className="pv-seg" role="radiogroup" aria-label="Preview as" onKeyDown={onKey}>
          <button type="button" role="radio" aria-checked={as === 'email'} tabIndex={as === 'email' ? 0 : -1} onClick={pick('email')}>Email</button>
          <button type="button" role="radio" aria-checked={as === 'text'} tabIndex={as === 'text' ? 0 : -1} onClick={pick('text')}>Text</button>
        </div>
      </div>
      {as === 'email' ? (
        <div className="pv-mail" data-preview-email>
          <div className="pv-mh">
            <div className="pv-from">
              <span className="pv-av" aria-hidden="true">{initials(from)}</span>
              <span><b>{from || 'You'}</b><br /><span className="pv-dim">to {toEmail || 'each guest'} · replies come to {first(from) || 'you'}</span></span>
            </div>
            <div className="pv-subj">{mail.subject}</div>
          </div>
          {card ? (
            <div className="pv-card">
              <div className="pv-card-t">{card.name}</div>
              {card.when ? <div className="pv-card-s">{card.when}</div> : null}
              <div className="pv-card-n">Your invite page’s picture, as it is when you send</div>
            </div>
          ) : null}
          <div className="pv-body">{linked(mail.body)}</div>
        </div>
      ) : (
        <>
          <div className="pv-phone">
            <div className="pv-to">To: {toText ? [toText.name, toText.phone].filter(Boolean).join(' · ') : 'a guest'}</div>
            <div className="pv-bubble" data-preview-text>{linked(sms)}</div>
            <div className="pv-count" data-preview-count>{seg.chars} characters · sends as {seg.parts} {seg.parts === 1 ? 'text' : 'texts'}</div>
          </div>
          <p className="grounding si-g">
            Each text starts with the guest’s first name and leaves out the subject line. Curly quotes and dashes go out plain{seg.gsm ? '' : '; emoji still make a phone split it'}{seg.parts > 1 ? `, and it arrives as one message on most phones.` : '.'}
          </p>
        </>
      )}
    </div>
  );
}
