// InviteSentRecord — "What went out" (owner-approved render s2-5, 11/24/2026).
// Read only: when the invite went out, the words (event.invitesSentMessage,
// written at send time), and each guest it went to with the channel and where
// their reply stands (lib/inviteMessageDraft sentRecipients, from invitedAt,
// invitedVia, guestTold and rsvp). Changing what guests already have is
// Update everyone's job, so the sheet hands over to it.
const VOICE = { 'as-written': 'As written', tighter: 'Tighter', warmer: 'Warmer', playful: 'Playful', formal: 'Formal' };
const URL_RE = /(https?:\/\/[^\s]+)/g;
const linked = (text) => String(text || '').split(URL_RE).map((part, i) => (
  i % 2 ? <span key={i} className="pv-link">{part}</span> : part
));
const when = (iso) => {
  const t = Date.parse(String(iso || ''));
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' · '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default function InviteSentRecord({ sent, recipients, onUpdate }) {
  return (
    <div data-sent-record>
      <p className="grounding si-g">Read only. This is what your guests have.</p>
      <div className="si-meta">
        <span data-sent-at>{when(sent.at) ? 'Sent ' + when(sent.at) : 'Sent'}</span>
        <span>Your words, {VOICE[sent.voice] || 'edited by you'}</span>
      </div>
      <div className="si-sent" data-sent-words>
        {sent.subject ? <div className="si-sent-s">{sent.subject}</div> : null}
        {linked(sent.body)}
      </div>
      <div className="f-name si-whohead">Who got it</div>
      {recipients.length ? (
        <ul className="si-rcp">
          {recipients.map((g) => (
            <li key={g.id} data-sent-guest={g.id}>
              <span className="si-rn">{g.name}</span>
              <span className="si-rc">{g.channel}</span>
              <span className={'si-pill' + (g.tone === 'ok' ? ' ok' : '')}>{g.status}</span>
            </li>
          ))}
        </ul>
      ) : <p className="grounding si-g">Nobody on your list is marked invited yet.</p>}
      <p className="grounding si-g">“Email” means the email service took it. “By you” is your word that you sent it yourself.</p>
      <div className="si-note">
        <p className="grounding si-g si-first">To change something guests already have, use Update everyone.</p>
        <button type="button" className="mini si-wide" onClick={onUpdate}>Update everyone</button>
      </div>
    </div>
  );
}
