// ─── THE INVITE RULES, ONE COMPONENT (owner-approved renders 10a/10b, 11/24/2026)
//
// Plus-ones, kids, collecting mailing addresses and the gift note: the SAME
// event fields the public RSVP page already enforces (InviteV2 reads
// plusOnePolicy / kidsPolicy / collectAddresses) and the invite and guest brief
// drafts read (giftWish). Rendered in "Before your invite goes out" and in the
// guest list, so both edit one record with one wording.
//
// Stored values are unchanged; only the labels are plain:
//   Plus-ones                   Welcome 'plus_one_ok' · Not this time 'no_plus_ones' · Not set (none)
//   Kids                        Kids welcome 'kids_welcome' · Adults only 'adults_only' · Not set (none)
//   Collect mailing addresses   Yes true · No false
//   Gift note                   None (none) · "No gifts, please" giftWish.mode 'no_gifts' · Registry link 'registry'
// A gift wish stored before these labels (a donation, a potluck, a chip-in) is
// shown as its own selected chip rather than hidden; picking another replaces it.
//
// Chips are outlined; the selected one has a green outline and a check, no fill.
import { plusOneEdit, kidsEdit, addressesEdit, giftEdit, giftDetailEdit, LEGACY_GIFT, GIFT_DETAIL } from '@app/lib/guestEdits';

export default function InviteRules({ event, patchEvent, note }) {
  const ev = event || {};
  const gw = (ev.giftWish && typeof ev.giftWish === 'object') ? ev.giftWish : {};
  const giftMode = gw.mode || null;
  const rules = [
    {
      key: 'plus', label: 'Plus-ones', value: ev.plusOnePolicy || null,
      options: [['Welcome', 'plus_one_ok'], ['Not this time', 'no_plus_ones'], ['Not set', null]],
      pick: (v) => { const ed = plusOneEdit(v); patchEvent(ed.patch, ed.msg); },
    },
    {
      key: 'kids', label: 'Kids', value: ev.kidsPolicy || null,
      options: [['Kids welcome', 'kids_welcome'], ['Adults only', 'adults_only'], ['Not set', null]],
      pick: (v) => { const ed = kidsEdit(v); patchEvent(ed.patch, ed.msg); },
    },
    {
      key: 'addr', label: 'Collect mailing addresses', value: !!ev.collectAddresses,
      options: [['Yes', true], ['No', false]],
      pick: (v) => { const ed = addressesEdit(v); patchEvent(ed.patch, ed.msg); },
    },
    {
      key: 'gift', label: 'Gift note', value: giftMode,
      options: [['None', null], ['“No gifts, please”', 'no_gifts'], ['Registry link', 'registry'],
        ...(LEGACY_GIFT[giftMode] ? [[LEGACY_GIFT[giftMode], giftMode]] : [])],
      pick: (v) => { const ed = giftEdit(ev, v); patchEvent(ed.patch, ed.msg); },
    },
  ];
  return (
    <div className="invite-rules" data-invite-rules>
      <div className="shelf-label">Invite rules</div>
      {rules.map((r) => (
        <div key={r.key} className="invite-rule" data-invite-rule={r.key}>
          <span className="invite-rule-l" id={'invite-rule-' + r.key}>{r.label}</span>
          <div className="chips" role="group" aria-labelledby={'invite-rule-' + r.key}>
            {r.options.map(([label, v]) => {
              const on = r.value === v;
              return (
                <button key={label} type="button" className="chip" aria-pressed={on}
                  onClick={() => { if (!on) r.pick(v); }}>{label}</button>
              );
            })}
          </div>
        </div>
      ))}
      {giftMode && giftMode !== 'no_gifts' && (
        <input className="field" style={{ maxWidth: 'none', fontSize: 'var(--t-input)', margin: '0 0 var(--sp-2)' }}
          placeholder={GIFT_DETAIL[giftMode] || ''} value={gw.detail || ''}
          onChange={(e) => { const ed = giftDetailEdit(ev, e.target.value); patchEvent(ed.patch, ed.msg); }}
          aria-label="Gift note detail" />
      )}
      {note ? <p className="grounding invite-rules-note">{note}</p> : null}
    </div>
  );
}
