// InviteDesignSheet — "Invite page" (owner-approved render r3-3, 11/24/2026;
// renamed from "Your invite" 11/24/2026, one door, one name).
// The host's one place to shape what guests see when they open her link:
//   · the layout, "Classic" or "At a glance" (event.inviteLayout);
//   · her message, the line under the event's name (event.deckLine — the ONE
//     field; "Make it yours" sends her here), 200 characters, Start over;
//   · who it's from: Hosted by, her photo, how guests reach her;
//   · Paper (inviteStyle), Replies by (the shell's one reply-by editor),
//     Artwork (inviteCrest);
//   · a LIVE preview that is the guest's own invite component (InviteV2 with
//     `preview`), not a copy, and one lit "Save your invite page".
// Nothing is sent from here. Saving writes the event; the link shows it.
import { lazy, Suspense, useMemo, useState } from 'react';
import { SettledRow, OptionList } from './parity/askKit';
import HostPhotoRow, { useMyHostPhoto } from './HostPhotoRow.jsx';
import { suggestedInviteLine, INVITE_MESSAGE_MAX } from '@app/lib/inviteDeck';
import { hostNameFor } from '@app/lib/hostNameFor';
import { isValidPhone, isValidEmail } from '@app/lib/contactFormat';
import { INVITE_PALETTES, parseInviteStyle, formatInviteStyle, arrangementsFor, autoInvitePalette, monthPalette, paletteByKey } from '@app/lib/inviteTone';

const InviteV2 = lazy(() => import('./InviteV2.jsx'));

// A palette as three dots, the paper biggest (SVG fills: the colors are data).
function Swatch({ paper, ink, accent, line }) {
  return (
    <svg className="ivd-sw" viewBox="0 0 44 32" aria-hidden="true">
      <circle cx="15" cy="16" r="13" fill={paper} stroke={line || ink} strokeWidth="1" />
      <circle cx="33" cy="10" r="7" fill={ink} />
      <circle cx="33" cy="23" r="7" fill={accent} />
    </svg>
  );
}
const LEGACY_LABEL = { '': 'Today’s cream', bright: 'Today’s cream', elegant: 'Elegant dark' };
const LAYOUTS = [['classic', 'Classic'], ['glance', 'At a glance']];

export default function InviteDesignSheet({
  event, profile, patchEvent, patchProfile, signedIn, email, onDone, renderDeadlineEditor, hasArtwork,
}) {
  const suggestion = useMemo(() => suggestedInviteLine(event), [event]);
  const [layout, setLayout] = useState(event.inviteLayout === 'glance' ? 'glance' : 'classic');
  // THE FULL INVITE IS THIS ONE, OPENED IN PLACE (owner report, 11/24/2026).
  // It used to open the public link in a new tab, which shows the SAVED invite
  // (Classic while At a glance was picked), and the framed preview cut off the
  // reply buttons. Expanding the same draft shows exactly what she is editing.
  const [full, setFull] = useState(false);
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
      'Your invite page is saved — your link shows it now.');
    onDone();
  };

  // COLORS (owner-approved palettes, 11/24/2026): "Match my event", the eight
  // palettes with the best fits for this event first, then the selected
  // palette's arrangements (only those that pass the contrast gate).
  const style = parseInviteStyle(paper);
  const fits = (() => {
    const a = autoInvitePalette(event);
    return [a, monthPalette(event.date)].filter((k) => paletteByKey(k));
  })();
  const ordered = [...fits.map(paletteByKey), ...INVITE_PALETTES.filter((p) => !fits.includes(p.key))]
    .filter((p, i, all) => all.indexOf(p) === i);
  const arrangements = style.kind === 'palette' ? arrangementsFor(style.key) : [];
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
          <button type="button" className="ghost ivd-full" aria-expanded={full} onClick={() => setFull((f) => !f)}>{full ? 'Show less' : 'See the full invite'}</button>
        </div>
        <div className={'ivd-pv-frame' + (full ? ' full' : '')} data-invite-preview inert>
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
      <HostPhotoRow profile={profile} patchProfile={patchProfile} signedIn={signedIn} hostName={host} variant="panel" />
      <label className="ivd-lab ivd-gap" htmlFor="ivd-contact">How guests reach you</label>
      <input id="ivd-contact" className="field" aria-label="How guests reach you" value={contact} maxLength={120} inputMode="email"
        placeholder="A cell phone number or an email" onChange={(e) => { setContact(e.target.value); setContactErr(''); }} />
      <p className="grounding ivd-note">{contactErr || `Shows as a “Message ${first || 'the host'}” link. Your number is never printed on the invite.`}</p>

      <div className="ivd-cap ivd-gap">Other invite options</div>
      <div className="ivd-lab ivd-colors-h">Colors</div>
      <div className="ivd-colors" role="radiogroup" aria-label="Colors" data-invite-colors>
        <button type="button" role="radio" aria-checked={style.kind === 'auto'} className={'ivd-col' + (style.kind === 'auto' ? ' on' : '')}
          onClick={() => setPaper('auto')}>
          <span className="ivd-auto" aria-hidden="true">✦</span><span className="ivd-col-name">Match my event</span>
        </button>
        {ordered.map((p) => (
          <button key={p.key} type="button" role="radio" aria-checked={style.kind === 'palette' && style.key === p.key}
            className={'ivd-col' + (style.kind === 'palette' && style.key === p.key ? ' on' : '')} data-palette={p.key}
            onClick={() => setPaper(formatInviteStyle(p.key, 0))}>
            <Swatch {...p} /><span className="ivd-col-name">{p.name}</span>
          </button>
        ))}
      </div>
      <p className="grounding ivd-note">
        {style.kind === 'legacy' ? `Now: ${LEGACY_LABEL[style.value] || 'Today’s cream'}, the invite’s original paper.`
          : style.kind === 'auto' ? 'Picked for your occasion and its month. Change the date or the type and it follows.'
          : `${paletteByKey(style.key).name}. Swap which color is the paper, the words and the accent below.`}
      </p>
      {arrangements.length > 1 && (
        <>
          <div className="ivd-lab ivd-gap">Arrange</div>
          <div className="ivd-arr" role="radiogroup" aria-label="Arrange" data-invite-arrange>
            {arrangements.map((a, i) => (
              <button key={a.index} type="button" role="radio" aria-checked={style.arrangement === a.index}
                aria-label={`Arrangement ${i + 1}${a.index === 0 ? ', as designed' : ''}`} data-arrangement={a.index}
                className={'ivd-arr-b' + (style.arrangement === a.index ? ' on' : '')}
                onClick={() => setPaper(formatInviteStyle(style.key, a.index))}>
                <Swatch {...a} />
              </button>
            ))}
          </div>
        </>
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
        <button type="button" className="cta" onClick={save}>Save your invite page</button>
        <p className="grounding">Anyone who already has your link sees the changes next time they open it.</p>
      </div>
    </div>
  );
}
