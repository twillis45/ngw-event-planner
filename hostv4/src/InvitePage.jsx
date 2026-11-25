// hostv4 YOUR INVITE, step 1 (owner, 11/25/2026: "start the invite and send
// flow"). Pushed from Guests. Against the feature map's invite page:
//   - Before it can go out: the day, the time guests arrive and the place
//     (lib/inviteGaps, the same check hostv2 runs before any invite leaves);
//   - the message they get, in each voice (lib/doItForMe draftInvite), and
//     "Save this version" (the edit hostv2 saves, lib/inviteMessageDraft);
//   - the rules: plus-ones, kids, mailing addresses, the gift note (lib/guestEdits).
// Sending needs the plan's reply link, which needs the plan in an account, so
// it stays in the current app until hostv4 can sign in. The page says so, and
// its one button opens the current app. Answering a missing day, time or
// place does too: those editors carry rules (a suggested hour is never told to
// guests until the host confirms it) that v4 does not copy.
import { useMemo, useState } from 'react';
import { inviteGaps } from '@app/lib/inviteGaps';
import { draftInvite, inviteVoicesFor } from '@app/lib/doItForMe';
import { LINK_PLACEHOLDER, savedInviteDraft, saveDraftEdit } from '@app/lib/inviteMessageDraft';
import { plusOneEdit, kidsEdit, addressesEdit, giftEdit, giftDetailEdit } from '@app/lib/guestEdits';

const VOICE = { 'as-written': 'As written', tighter: 'Tighter', warmer: 'Warmer', playful: 'Playful', formal: 'Formal' };
const GAP = { date: 'The day', time: 'The time guests arrive', place: 'Where it is', name: 'The event’s name', address: 'The street address' };
const GIFT = [['None', null], ['No gifts, please', 'no_gifts'], ['Registry link', 'registry']];

function readProfile() { try { return JSON.parse(window.localStorage.getItem('ngw-profile')) || null; } catch { return null; } }

function Seg({ label, value, options, pick }) {
  return (
    <div className="rule">
      <h3 className="lbl">{label}</h3>
      <div className="seg" role="group" aria-label={label}>
        {options.map(([l, v]) => <button key={l} aria-pressed={value === v} onClick={() => { if (value !== v) pick(v); }}>{l}</button>)}
      </div>
    </div>
  );
}

export default function InvitePage({ ev, save, nav, status }) {
  const gaps = inviteGaps(ev);
  const saved = savedInviteDraft(ev);
  const voices = useMemo(() => { try { return inviteVoicesFor(ev); } catch { return ['as-written']; } }, [ev]);
  const [voice, setVoice] = useState(() => (saved && voices.includes(saved.voice) ? saved.voice : 'as-written'));
  // The words: her saved version when it is the voice shown, else this voice written from the facts.
  const body = useMemo(() => {
    if (saved && saved.voice === voice) return saved.body;
    try { return draftInvite(ev, readProfile(), { rsvpUrl: LINK_PLACEHOLDER, voice }).body || ''; } catch { return ''; }
  }, [ev, voice, saved]);
  const isSaved = !!saved && saved.voice === voice && saved.body === body;
  const gift = (ev.giftWish && ev.giftWish.mode) || null;

  return (<>
    <main className="view" data-view="invite">
      {nav}
      <section data-invite>
        {status}
        {gaps.length > 0 && (<>
          <h3 className="sh">Before it can go out</h3>
          <div className="grp" data-invite-check>
            {['date', 'time', 'place', 'name', 'address'].filter((k) => GAP[k] && (gaps.includes(k) || ['date', 'time', 'place'].includes(k))).map((k) => (
              <div className="row" key={k} data-gap={k} data-ok={gaps.includes(k) ? '0' : '1'}>
                <span>{GAP[k]}</span>
                <span className={'val' + (gaps.includes(k) ? ' warnv' : ' ok')}>{gaps.includes(k) ? (k === 'time' && String(ev.startTime || '').trim() ? 'Not confirmed' : 'Missing') : 'Set'}</span>
              </div>
            ))}
          </div>
          <p className="fine">Add these in the current app for now. <a className="link" href="../hostv2/">Open the current app</a></p>
        </>)}

        <h3 className="sh">The message they get</h3>
        <div className="seg voices" role="group" aria-label="How it sounds">
          {voices.map((v) => <button key={v} aria-pressed={voice === v} onClick={() => setVoice(v)}>{VOICE[v] || v}</button>)}
        </div>
        <div className="msg" data-message>{body}</div>
        <p className="fine">The reply link goes in when it’s sent.{' '}
          {isSaved ? <span className="okline" data-draft-saved>Saved.</span>
            : <button className="link" onClick={() => save(saveDraftEdit({ body, voice, edited: false, line: String(ev.deckLine || '').trim(), now: new Date().toISOString() }))}>Save this version</button>}
        </p>

        <h3 className="sh">Rules</h3>
        <Seg label="Plus-ones" value={ev.plusOnePolicy || null} options={[['Welcome', 'plus_one_ok'], ['Not this time', 'no_plus_ones']]} pick={(v) => save(plusOneEdit(v))} />
        <Seg label="Kids" value={ev.kidsPolicy || null} options={[['Welcome', 'kids_welcome'], ['Adults only', 'adults_only']]} pick={(v) => save(kidsEdit(v))} />
        <Seg label="Ask for mailing addresses" value={!!ev.collectAddresses} options={[['Yes', true], ['No', false]]} pick={(v) => save(addressesEdit(v))} />
        <Seg label="Gifts" value={gift} options={GIFT} pick={(v) => save(giftEdit(ev, v))} />
        {gift === 'registry' && (
          <input className="field" aria-label="Registry link" placeholder="Paste the registry link" defaultValue={(ev.giftWish && ev.giftWish.detail) || ''}
            onBlur={(e) => { if (e.target.value !== ((ev.giftWish && ev.giftWish.detail) || '')) save(giftDetailEdit(ev, e.target.value.trim())); }} />
        )}
        <p className="fine">The reply page follows these.</p>
        <p className="fine">Sending needs the plan’s reply link, which comes from your account. For now you send it from the current app.</p>
      </section>
    </main>
    <div className="action"><a className="primary" href="../hostv2/">Send it from the current app</a></div>
  </>);
}
