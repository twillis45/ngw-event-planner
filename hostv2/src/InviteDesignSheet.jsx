// InviteDesignSheet — "Your invite" (owner-approved render r3-3, 11/24/2026).
// The host's one place to shape what guests see when they open her link:
//   · the layout, "Classic" or "At a glance" (event.inviteLayout);
//   · her message, the line under the event's name (event.deckLine — the ONE
//     field; "Make it yours" sends her here), 200 characters, Start over;
//   · who it's from: Hosted by, her photo, how guests reach her;
//   · Paper (inviteStyle), Replies by (the shell's one reply-by editor),
//     Artwork (inviteCrest);
//   · a LIVE preview that is the guest's own invite component (InviteV2 with
//     `preview`), not a copy, and one lit "Save your invite".
// Nothing is sent from here. Saving writes the event; the link shows it.
import { lazy, Suspense, useMemo, useState } from 'react';
import { SettledRow, OptionList } from './parity/askKit';
import HostPhotoRow, { useMyHostPhoto } from './HostPhotoRow.jsx';
import { suggestedInviteLine, INVITE_MESSAGE_MAX } from '@app/lib/inviteDeck';
import { hostNameFor } from '@app/lib/hostNameFor';
import { isValidPhone, isValidEmail } from '@app/lib/contactFormat';

const InviteV2 = lazy(() => import('./InviteV2.jsx'));

const PAPERS = [['', 'Match the event'], ['bright', 'Bright paper'], ['elegant', 'Elegant dark']];
const LAYOUTS = [['classic', 'Classic'], ['glance', 'At a glance']];

export default function InviteDesignSheet({
  event, profile, patchEvent, patchProfile, signedIn, email, onDone, onSeeFull, renderDeadlineEditor, hasArtwork,
}) {
  const suggestion = useMemo(() => suggestedInviteLine(event), [event]);
  const [layout, setLayout] = useState(event.inviteLayout === 'glance' ? 'glance' : 'classic');
  const [message, setMessage] = useState(String(event.deckLine || '').trim() || suggestion);
  const [host, setHost] = useState(hostNameFor(event, profile));
  const [contact, setContact] = useState(String(event.hostContact || ''));
  const [paper, setPaper] = useState(event.inviteStyle || '');
  const [crest, setCrest] = useState(event.inviteCrest === 'off' ? 'off' : '');
  const [open, setOpen] = useState('');            // which "other option" row is open
  const [contactErr, setContactErr] = useState('');
  const photoUrl = useMyHostPhoto((profile && profile.hostPhoto) || null);

  // The suggested line saved unchanged is not her words: it is stored empty,
  // so it stays the suggestion (and unsigned) if the event's type changes.
  const stored = message.trim() === suggestion ? '' : message.trim().slice(0, INVITE_MESSAGE_MAX);
  const first = String(host || '').trim().split(/\s+/)[0] || '';
  const draft = useMemo(() => ({
    ...event, inviteLayout: layout, deckLine: stored, hostName: host.trim(), hostContact: contact.trim(),
    inviteStyle: paper, inviteCrest: crest,
  }), [event, layout, stored, host, contact, paper, crest]);

  const save = () => {
    const c = contact.trim();
    if (c && !isValidPhone(c) && !isValidEmail(c)) { setContactErr('Add a phone number or an email address, or leave it empty.'); return; }
    setContactErr('');
    patchEvent({ inviteLayout: layout, deckLine: stored, hostName: host.trim(), hostContact: c, inviteStyle: paper, inviteCrest: crest },
      'Your invite is saved — your link shows it now.');
    onDone();
  };

  const paperLabel = (PAPERS.find(([v]) => v === paper) || PAPERS[0])[1];
  const replyBy = String(event.rsvpDeadline || '').trim();
  const replyLabel = replyBy ? new Date(replyBy + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Not set';

  return (
    <div className="ivd" data-invite-panel>
      <p className="grounding ivd-sub">{event.name || 'Your event'} · what guests see when they open your link</p>

      <div className="ivd-cap">Layout</div>
      <div className="ivd-pick" role="radiogroup" aria-label="Layout">
        {LAYOUTS.map(([val, label]) => (
          <button key={val} type="button" role="radio" aria-checked={layout === val} className={'ivd-lo' + (layout === val ? ' on' : '')}
            onClick={() => setLayout(val)}>
            <span className={'ivd-thumb ivd-thumb-' + val} aria-hidden="true">
              <i className="t-mast" /><i className="t-name" /><i className="t-name s" /><i className="t-msg" />
              {val === 'classic'
                ? (<><i className="t-rule" /><i className="t-line" /><i className="t-line" /><i className="t-count" /></>)
                : (<><i className="t-row" /><i className="t-row" /><i className="t-row" /><i className="t-btns" /></>)}
            </span>
            <span className="ivd-lo-name">{layout === val ? '✓ ' : ''}{label}</span>
          </button>
        ))}
      </div>

      <div className="ivd-pv">
        <div className="ivd-pv-top">
          <span className="ivd-live"><i aria-hidden="true" />Live preview · {layout === 'glance' ? 'At a glance' : 'Classic'}</span>
          <button type="button" className="ghost ivd-full" onClick={onSeeFull}>See the full invite</button>
        </div>
        <div className="ivd-pv-frame" data-invite-preview inert>
          <Suspense fallback={<p className="grounding">Loading the preview…</p>}>
            <InviteV2 code={event.rsvpCode || event.id} preview={draft} previewPhotoUrl={photoUrl} />
          </Suspense>
        </div>
      </div>

      <h3 className="ivd-h">Your message</h3>
      <p className="ivd-why">The first thing guests read, under your event’s name, in your words.</p>
      <div className="ivd-lab"><label htmlFor="ivd-msg">Message</label><span className="ivd-n" data-message-count>{message.length} / {INVITE_MESSAGE_MAX}</span></div>
      <textarea id="ivd-msg" className="field ivd-msg" aria-label="Message" maxLength={INVITE_MESSAGE_MAX} value={message}
        onChange={(e) => setMessage(e.target.value)} placeholder={suggestion} />
      <div className="ivd-help">
        <span className="grounding">
          {stored ? (first ? `Signed “— ${first}.” ` : '') + 'These are your words.' : 'Our line for this event, unsigned. Write your own and it’s signed with your name.'}
        </span>
        <button type="button" className="ghost" onClick={() => setMessage(suggestion)}>Start over</button>
      </div>

      <h3 className="ivd-h">Who it’s from</h3>
      <p className="ivd-why">So guests know who’s asking, see who it is, and can reach you.</p>
      <label className="ivd-lab" htmlFor="ivd-host">Hosted by</label>
      <input id="ivd-host" className="field" aria-label="Hosted by" value={host} maxLength={120} placeholder="Dana — or “Dana & Sam”"
        onChange={(e) => setHost(e.target.value)} />
      <div className="ivd-lab ivd-gap">Your photo</div>
      <HostPhotoRow profile={profile} patchProfile={patchProfile} signedIn={signedIn} hostName={host} email={email} variant="panel" />
      <label className="ivd-lab ivd-gap" htmlFor="ivd-contact">How guests reach you</label>
      <input id="ivd-contact" className="field" aria-label="How guests reach you" value={contact} maxLength={120} inputMode="email"
        placeholder="A cell phone number or an email" onChange={(e) => { setContact(e.target.value); setContactErr(''); }} />
      <p className="grounding ivd-note">{contactErr || `Shows as a “Message ${first || 'the host'}” link. Your number is never printed on the invite.`}</p>

      <div className="ivd-cap ivd-gap">Other invite options</div>
      <SettledRow label="Paper" value={paperLabel} onOpen={() => setOpen(open === 'paper' ? '' : 'paper')} />
      {open === 'paper' && (
        <OptionList ariaLabel="Paper" options={PAPERS.map(([value, label]) => ({ value, label }))} value={paper}
          onPick={(v) => { setPaper(v); setOpen(''); }} />
      )}
      <SettledRow label="Replies by" value={replyLabel} onOpen={() => setOpen(open === 'reply' ? '' : 'reply')} />
      {open === 'reply' && <div className="ivd-reply">{renderDeadlineEditor()}</div>}
      {hasArtwork && (
        <>
          <SettledRow label="Artwork" value={crest === 'off' ? 'Words only' : 'On the invite'} onOpen={() => setOpen(open === 'art' ? '' : 'art')} />
          {open === 'art' && (
            <OptionList ariaLabel="Artwork" options={[{ value: '', label: 'On the invite' }, { value: 'off', label: 'Words only' }]} value={crest}
              onPick={(v) => { setCrest(v); setOpen(''); }} />
          )}
        </>
      )}

      <div className="ivd-foot">
        <button type="button" className="cta" onClick={save}>Save your invite</button>
        <p className="grounding">Anyone who already has your link sees the changes next time they open it.</p>
      </div>
    </div>
  );
}
