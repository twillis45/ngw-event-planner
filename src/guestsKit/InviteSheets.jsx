// YOUR INVITE: THE WORDS (G2c-2b step 4; owner, 11/28/2026, UX_12 §8a, render
// screen 4). What the old Guests sheet's invite card did, in the kit:
//   - Edit the words, not only pick a voice; the edit is saved and is what goes
//     out (lib/inviteMessageDraft saveDraftEdit, the record both shells save);
//   - Copy the invite, with the checked reply link in it (lib/inviteSend, the
//     same check the send sheet runs); copying sends nothing;
//   - What went out: the words sent and who got them, read only
//     (invitesSentMessage and sentRecipients, the old sheet's "What went out").
import { useState } from 'react';
import { LINK_PLACEHOLDER, saveDraftEdit, withLink, sentRecipients } from '@app/lib/inviteMessageDraft';
import { useSendReady, NotReady } from './sendKit.jsx';

const VOICE = { 'as-written': 'As written', tighter: 'Tighter', warmer: 'Warmer', playful: 'Playful', formal: 'Formal' };
const when = (iso) => {
  const t = Date.parse(String(iso || ''));
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' · '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

function Sheet({ label, onDone, children }) {
  return (
    <div className="scrim" onClick={onDone}>
      <div className="gk-sheet" role="dialog" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheethead"><h2>{label}</h2><button className="link" onClick={onDone}>Done</button></div>
        <div className="sendbody">{children}</div>
      </div>
    </div>
  );
}

/** Her words, edited in place. The reply link's marker must stay, or guests can't reply. */
export function WordsSheet({ ev, body, voice, save, onDone }) {
  const [text, setText] = useState(body);
  const noLink = !text.includes(LINK_PLACEHOLDER);
  const keep = () => {
    save(saveDraftEdit({ body: text, voice, edited: true, line: String(ev.deckLine || '').trim(), now: new Date().toISOString() }));
    onDone();
  };
  return (
    <Sheet label="Edit the words" onDone={onDone}>
      <textarea className="gk-field" data-words rows={10} aria-label="The message they get" value={text} onChange={(e) => setText(e.target.value)} />
      {noLink
        ? <p className="fine warn" role="alert" data-link-gone>Put back {LINK_PLACEHOLDER} where the reply link should go. Without it, guests can’t reply.</p>
        : <p className="fine">{LINK_PLACEHOLDER} becomes your reply link when it’s sent.</p>}
      <button className="primary" data-save-words disabled={noLink || text === body} onClick={keep}>Save these words</button>
    </Sheet>
  );
}

/** The invite with the checked reply link in it, to paste anywhere. Nothing is sent. */
export function CopySheet({ ev, body, onDone }) {
  const { link, ready, acct, check } = useSendReady(ev);
  const [done, setDone] = useState('');
  const full = withLink(body, link.url);
  const copy = () => {
    const ok = () => setDone('Copied, with your reply link.');
    const no = () => setDone('Couldn’t copy here. Select the words above and copy them.');
    try { navigator.clipboard.writeText(full).then(ok, no); } catch { no(); }
  };
  return (
    <Sheet label="Copy the invite" onDone={onDone}>
      {!ready ? <NotReady acct={acct} link={link} check={check} /> : (<>
        <div className="msg" data-copy-text>{full}</div>
        <p className="fine">Copying sends nothing. Paste it into a message or a post.</p>
        {done ? <p className="done" role="status" data-copied>{done}</p> : null}
        <button className="primary" data-copy onClick={copy}>Copy</button>
      </>)}
    </Sheet>
  );
}

/** What went out: when, the words, and who got them, read only. */
export function SentSheet({ ev, onDone }) {
  const sent = ev.invitesSentMessage || {};
  const rows = sentRecipients(ev);
  return (
    <Sheet label="What went out" onDone={onDone}>
      <p className="fine">Read only. This is what your guests have.</p>
      <p className="fine" data-sent-at>{when(sent.at) ? 'Sent ' + when(sent.at) : 'Sent'} · {VOICE[sent.voice] || 'Your own words'}</p>
      <div className="msg" data-sent-words>{sent.subject ? sent.subject + '\n\n' : ''}{sent.body}</div>
      <h3 className="sh">Who got it</h3>
      {rows.length ? (
        <div className="grp" data-sent-to>
          {rows.map((g) => (
            <div className="row" key={g.id} data-sent-guest={g.id}>
              <span className="nm">{g.name}<small>{g.channel}</small></span>
              <span className={'val' + (g.tone === 'ok' ? ' ok' : '')}>{g.status}</span>
            </div>
          ))}
        </div>
      ) : <p className="fine">Nobody on your list is marked invited yet.</p>}
      <p className="fine">“Email” means the email service took it. “By you” is your word that you sent it yourself. To change something guests already have, post an update in Updates and questions.</p>
    </Sheet>
  );
}
