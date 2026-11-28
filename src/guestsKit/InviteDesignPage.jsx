// hostv4 DESIGN THIS PAGE (owner, 11/26/2026: "start the card design"). Pushed
// from Your invite. The page a guest opens, shaped here with the fields hostv2's
// InviteDesignSheet saves, through the same rule (lib/inviteDesign):
//   - the preview first (the guest's own page, InvitePreview);
//   - Layout: Classic or At a glance;
//   - Your message: the line under the event's name (Start over);
//   - Who it's from: Hosted by, how guests reach you (a phone or an email);
//   - Colors: Match my event, the palettes (best fits first), and how a
//     palette's colors are arranged.
// Each change saves as it's made, and the preview reloads with it. The photo's
// upload needs hostv2's sign-in, so it stays there for now and says so.
import { useMemo, useState } from 'react';
import { suggestedInviteLine, INVITE_MESSAGE_MAX } from '@app/lib/inviteDeck';
import { hostNameFor } from '@app/lib/hostNameFor';
import { inviteDesignEdit, INVITE_LAYOUTS } from '@app/lib/inviteDesign';
import { INVITE_PALETTES, parseInviteStyle, formatInviteStyle, arrangementsFor, autoInvitePalette, monthPalette, paletteByKey } from '@app/lib/inviteTone';
import InvitePreview from './InvitePreview.jsx';
import { readProfile } from './sendKit.jsx';

function Swatch({ paper, ink, accent, line }) {
  return (
    <svg className="sw" viewBox="0 0 44 32" aria-hidden="true">
      <circle cx="15" cy="16" r="13" fill={paper} stroke={line || ink} strokeWidth="1" />
      <circle cx="33" cy="10" r="7" fill={ink} />
      <circle cx="33" cy="23" r="7" fill={accent} />
    </svg>
  );
}

export default function InviteDesignPage({ ev, save, nav, status }) {
  const suggestion = useMemo(() => suggestedInviteLine(ev), [ev]);
  const profile = useMemo(readProfile, []);
  const [message, setMessage] = useState(String(ev.deckLine || '').trim() || suggestion);
  const [host, setHost] = useState(() => hostNameFor(ev, profile) || '');
  const [contact, setContact] = useState(String(ev.hostContact || ''));
  const [problem, setProblem] = useState('');
  const put = (fields) => {
    const ed = inviteDesignEdit(ev, fields);
    if (ed.error) { setProblem(ed.error); return; }
    setProblem('');
    save(ed);
  };
  const layout = ev.inviteLayout === 'glance' ? 'glance' : 'classic';
  const style = parseInviteStyle(ev.inviteStyle || '');
  const fits = [autoInvitePalette(ev), monthPalette(ev.date)].filter((k) => paletteByKey(k));
  const palettes = [...fits.map(paletteByKey), ...INVITE_PALETTES.filter((p) => !fits.includes(p.key))].filter((p, i, all) => all.indexOf(p) === i);
  const arrangements = style.kind === 'palette' ? arrangementsFor(style.key) : [];
  const first = String(host || '').trim().split(/\s+/)[0] || 'you';

  return (
    <main className="view" data-view="invite-design">
      {nav}
      {status}
      <InvitePreview ev={ev} height={360} />

      <h3 className="sh">Layout</h3>
      <div className="seg" role="group" aria-label="Layout">
        {INVITE_LAYOUTS.map(([v, l]) => <button key={v} aria-pressed={layout === v} onClick={() => { if (layout !== v) put({ inviteLayout: v }); }}>{l}</button>)}
      </div>

      <h3 className="sh">Your message <span data-message-count>{message.length} / {INVITE_MESSAGE_MAX}</span></h3>
      <textarea className="gk-field" rows={3} aria-label="Your message" maxLength={INVITE_MESSAGE_MAX} value={message}
        onChange={(e) => setMessage(e.target.value)} onBlur={() => put({ message })} placeholder={suggestion} />
      <p className="fine">The first thing guests read, under your event’s name.{' '}
        <button className="link" onClick={() => { setMessage(suggestion); put({ message: suggestion }); }}>Start over</button>
      </p>

      <h3 className="sh">Who it’s from</h3>
      <label className="lbl" htmlFor="dz-host">Hosted by</label>
      <input id="dz-host" className="gk-field" aria-label="Hosted by" maxLength={120} value={host} placeholder="Dana, or Dana & Sam"
        onChange={(e) => setHost(e.target.value)} onBlur={() => put({ hostName: host })} />
      <label className="lbl" htmlFor="dz-contact">How guests reach you</label>
      <input id="dz-contact" className="gk-field" aria-label="How guests reach you" inputMode="email" maxLength={120} value={contact}
        placeholder="A cell phone number or an email" aria-invalid={problem ? true : undefined}
        onChange={(e) => setContact(e.target.value)} onBlur={() => put({ hostContact: contact })} />
      {problem ? <p className="fine warn" data-design-problem>{problem}</p>
        : <p className="fine">Shows as a “Message {first}” link. Your number is never printed on the invite.</p>}
      <p className="fine">Your photo is added in the current app for now. <a className="link" href="../hostv2/">Open the current app</a></p>

      <h3 className="sh">Colors</h3>
      <div className="swatches" role="group" aria-label="Colors">
        <button className="swb" aria-pressed={style.kind === 'auto'} onClick={() => put({ inviteStyle: 'auto' })}>
          <span className="swauto" aria-hidden="true">✦</span><span>Match my event</span>
        </button>
        {palettes.map((p) => (
          <button key={p.key} className="swb" data-palette={p.key} aria-pressed={style.kind === 'palette' && style.key === p.key}
            onClick={() => put({ inviteStyle: formatInviteStyle(p.key, 0) })}>
            <Swatch {...p} /><span>{p.name}</span>
          </button>
        ))}
      </div>
      {arrangements.length > 1 && (<>
        <h3 className="lbl">Arrange</h3>
        <div className="swatches" role="group" aria-label="Arrange">
          {arrangements.map((a, i) => (
            <button key={a.index} className="swb" aria-pressed={style.arrangement === a.index}
              aria-label={`Arrangement ${i + 1}${a.index === 0 ? ', as designed' : ''}`} onClick={() => put({ inviteStyle: formatInviteStyle(style.key, a.index) })}>
              <Swatch {...a} />
            </button>
          ))}
        </div>
      </>)}
      <p className="fine">{style.kind === 'auto' ? 'Picked for your occasion and its month.' : style.kind === 'palette' ? paletteByKey(style.key).name + '.' : 'The invite’s original paper.'} Anyone who already has your link sees changes next time they open it.</p>
    </main>
  );
}
