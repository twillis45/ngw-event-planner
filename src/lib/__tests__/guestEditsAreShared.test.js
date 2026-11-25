// GUEST EDITS ARE SHARED (11/25/2026). hostv4's Guests page writes the same
// changes hostv2's does, so each change is built once, here, and both shells
// save it. Each builder returns { patch, msg }: the fields to save and the
// confirmation line, word for word what hostv2 said before the move.
import {
  countEdit, modeEdit, addNamesEdit, nameLines, rsvpEdit, removeGuestEdit,
  plusOneEdit, kidsEdit, replyByEdit,
} from '../guestEdits';

const ev = (o = {}) => ({ id: 'e1', type: 'Birthday', guestEstimate: 20, guests: [], ...o });

test('the count: the host’s number, and the caterer count follows only if one was set', () => {
  expect(countEdit(ev(), 25)).toEqual({ patch: { guestEstimate: 25, guestCountSource: 'host' }, msg: 'Planning around 25 now.' });
  expect(countEdit(ev({ guestCount: 18 }), 25).patch).toEqual({ guestEstimate: 25, guestCountSource: 'host', guestCount: 25 });
});

test('counting by name or by headcount', () => {
  expect(modeEdit('list')).toEqual({ patch: { guestMode: 'list' }, msg: 'By list — replies are tracked and the quiet ones can be nudged.' });
  expect(modeEdit('count')).toEqual({ patch: { guestMode: 'count' }, msg: 'By headcount — replies are optional and nobody gets chased.' });
});

test('names: one per line, blanks dropped, a couple split into two linked people', () => {
  expect(nameLines('  Ada Pine \n\n Bo Lee ')).toEqual(['Ada Pine', 'Bo Lee']);
  const r = addNamesEdit(ev(), nameLines('Ada Pine\nJohn and Nicole Smith'), { splitCouples: true, now: 1000 });
  const gs = r.patch.guests;
  expect(gs.map((g) => g.name)).toEqual(['Ada Pine', 'John Smith', 'Nicole Smith']);
  expect(gs.every((g) => g.rsvp === '')).toBe(true);
  expect(gs[1].coupleId).toBeTruthy();
  expect(gs[1].coupleId).toBe(gs[2].coupleId);
  expect(gs[0].coupleId).toBeUndefined();
  expect(new Set(gs.map((g) => g.id)).size).toBe(3);
  expect(r.msg).toBe('Added 3 people. Each shows “No reply” until they answer your invite, or you mark it yourself. (1 couple split so everyone gets counted)');
});

test('names: kept whole when splitting is off, and a repeat is named', () => {
  const r = addNamesEdit(ev({ guests: [{ id: 'g1', name: 'Ada Pine', rsvp: '' }] }), ['Ada Pine', 'John and Nicole Smith'], { splitCouples: false, now: 1 });
  expect(r.patch.guests.map((g) => g.name)).toEqual(['Ada Pine', 'Ada Pine', 'John and Nicole Smith']);
  expect(r.msg).toBe('Added 2 people — 3 on the list. Each shows “No reply” until they answer your invite, or you mark it yourself. Ada Pine is on the list twice — remove one if it’s the same person.');
});

test('names: nothing to add is no edit', () => {
  expect(addNamesEdit(ev(), [], { splitCouples: true })).toBe(null);
});

test('a reply, with the confirmed count after it', () => {
  const e = ev({ guests: [{ id: 'g1', name: 'Ada', rsvp: '' }, { id: 'g2', name: 'Bo', rsvp: 'Yes' }] });
  const r = rsvpEdit(e, 0, 'Yes');
  expect(r.patch.guests[0].rsvp).toBe('Yes');
  expect(r.msg).toBe('Ada → Yes — 2 confirmed.');
  expect(rsvpEdit(e, 0, 'Maybe').msg).toBe('Ada → Maybe — 1 confirmed. Maybes stay pending until they land.');
  expect(rsvpEdit(e, 1, '').msg).toBe('Bo → no reply — 0 confirmed.');
});

test('removing a guest', () => {
  const e = ev({ guests: [{ id: 'g1', name: 'Ada', rsvp: '' }, { id: 'g2', name: 'Bo', rsvp: '' }] });
  const r = removeGuestEdit(e, 0);
  expect(r.patch.guests.map((g) => g.name)).toEqual(['Bo']);
  expect('kidsCount' in r.patch).toBe(true);
  expect(r.msg).toBe('Ada removed from the list.');
});

test('the invite rules and the reply-by date', () => {
  expect(plusOneEdit('plus_one_ok')).toEqual({ patch: { plusOnePolicy: 'plus_one_ok' }, msg: 'Plus-ones welcome — the invite says so, and the RSVP page asks who they’re bringing.' });
  expect(plusOneEdit('no_plus_ones').msg).toBe('Named guests only — the RSVP page won’t offer a plus-one.');
  expect(plusOneEdit(null).msg).toBe('Plus-ones not set — the invite stays quiet on them.');
  expect(kidsEdit('kids_welcome')).toEqual({ patch: { kidsPolicy: 'kids_welcome' }, msg: 'Kids welcome — the invite says so.' });
  expect(kidsEdit('adults_only').msg).toBe('Adults-only — the RSVP page won’t ask about kids.');
  expect(kidsEdit(null).msg).toBe('Kids not set — the invite stays quiet on them.');
  expect(replyByEdit('2026-12-20')).toEqual({ patch: { rsvpDeadline: '2026-12-20' }, msg: 'Reply-by date set — your invite and the nudges read it.' });
});

test('mailing addresses and the gift note', () => {
  const { addressesEdit, giftEdit, giftDetailEdit } = require('../guestEdits');
  expect(addressesEdit(true)).toEqual({ patch: { collectAddresses: true }, msg: 'Yeses now get an optional mailing-address question, for thank-yous.' });
  expect(addressesEdit(false).msg).toBe('Address question removed from the RSVP page.');
  expect(giftEdit({}, 'no_gifts')).toEqual({ patch: { giftWish: { mode: 'no_gifts', detail: '' } }, msg: '“Your presence is the gift” goes on the invite.' });
  expect(giftEdit({ giftWish: { mode: 'registry', detail: 'x.com' } }, 'registry').patch.giftWish.detail).toBe('x.com');
  expect(giftEdit({}, 'registry').msg).toBe('Registry noted — paste the link below so guests can find it.');
  expect(giftEdit({}, null)).toEqual({ patch: { giftWish: null }, msg: 'No gift note on the invite.' });
  expect(giftDetailEdit({ giftWish: { mode: 'registry' } }, 'x.com')).toEqual({ patch: { giftWish: { mode: 'registry', detail: 'x.com' } }, msg: null });
});

test('saving the invite words sends nothing, and says so', () => {
  const { saveDraftEdit } = require('../inviteMessageDraft');
  const r = saveDraftEdit({ body: 'Hi', voice: 'warmer', edited: false, line: 'Come!', now: '2026-11-25T18:00:00.000Z' });
  expect(r).toEqual({ patch: { inviteMessageDraft: { body: 'Hi', voice: 'warmer', savedAt: '2026-11-25T18:00:00.000Z', edited: false, line: 'Come!' } }, msg: 'Draft saved — nothing was sent.' });
});
