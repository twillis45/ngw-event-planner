// ─── THE HOST'S MESSAGE REPLACES THE STOCK LINE (owner, 11/24/2026) ──────────
// One message, one field (event.deckLine), read by every surface that prints
// the line under the event's name: the guest invite (hostv2 InviteV2), the
// invite email's picture (lib/inviteCard → hostv2 inviteCardImage) and the
// written invite (lib/doItForMe, the "warmer" voice used to hard-code "It
// wouldn't be the same without you"). Signed "— <first name>" only when the
// host wrote or changed it; empty, the suggested line for the event, unsigned.
// Two overrides (owner calls): a past event with no message of hers reads "A
// day worth remembering" (her words win once she wrote one, owner 11/24/2026:
// aPastEventKeepsHerWords), an empty memorial "In loving memory".
import { inviteMessage, suggestedInviteLine, INVITE_MESSAGE_MAX, deckLineFor } from '../inviteDeck';
import { inviteCardModel } from '../inviteCard';
import { draftInvite } from '../doItForMe';

const EV = {
  name: 'Mom Linda’s Thanksgiving', type: 'Thanksgiving', date: '2099-11-26', startTime: '18:00', startTimeSource: 'host',
  venueAddress: '42 Elm Ct', venueCity: 'Springfield', venueState: 'VA', venueZip: '22150', hostName: 'Dana Reyes',
};
const MINE = 'It wouldn’t be the same without you. Come hungry, and bring a story from your year.';

test('empty: the suggested line for the event, unsigned', () => {
  const m = inviteMessage(EV);
  expect(m.text).toBe('It wouldn’t be the same without you');
  expect(m.signedBy).toBe('');
  expect(suggestedInviteLine(EV)).toBe(m.text);
});

test('written by the host: her words, signed with her first name', () => {
  const m = inviteMessage({ ...EV, deckLine: MINE });
  expect(m.text).toBe(MINE);
  expect(m.signedBy).toBe('Dana');
});

test('the suggestion saved unchanged is not her words, so it is not signed', () => {
  expect(inviteMessage({ ...EV, deckLine: 'It wouldn’t be the same without you' }).signedBy).toBe('');
});

test('no host name: her words still show, with no signature to put under them', () => {
  const m = inviteMessage({ ...EV, hostName: '', deckLine: MINE });
  expect(m.text).toBe(MINE);
  expect(m.signedBy).toBe('');
});

test('the two overrides stand: a past event, and an empty memorial', () => {
  expect(inviteMessage({ ...EV, deckLine: '' }, { past: true })).toEqual({ text: 'A day worth remembering', signedBy: '' });
  expect(inviteMessage({ ...EV, deckLine: '' }, { somber: true })).toEqual({ text: 'In loving memory', signedBy: '' });
  // deckLineFor (the older reader) still answers the same text.
  expect(deckLineFor({ ...EV, deckLine: MINE }, false, false)).toBe(MINE);
});

test('the field holds at most 200 characters, and a longer one is cut there', () => {
  expect(INVITE_MESSAGE_MAX).toBe(200);
  expect(inviteMessage({ ...EV, deckLine: 'a'.repeat(260) }).text).toHaveLength(200);
});

test('the invite email picture says her message and signs it', () => {
  const m = inviteCardModel({ ...EV, deckLine: MINE });
  expect(m.deck).toBe(MINE);
  expect(m.sig).toBe('— Dana');
  const plain = inviteCardModel(EV);
  expect(plain.deck).toBe('It wouldn’t be the same without you');
  expect(plain.sig).toBe('');
});

test('the written invite reads the message: no hard-coded line under her words', () => {
  const warm = draftInvite({ ...EV, deckLine: 'Come hungry, and bring a story from your year.' }, null, { voice: 'warmer' });
  expect(warm.body).toContain('Come hungry, and bring a story from your year.');
  expect(warm.body).not.toContain('It wouldn’t be the same without you');
  // Empty: the suggested line, as the invite page shows it.
  const plain = draftInvite({ ...EV, type: 'Crab Feast', name: 'Kent Island Crab Feast' }, null, { voice: 'warmer' });
  expect(plain.body).toContain('Good food, good people.');
  expect(plain.body).not.toContain('It wouldn’t be the same without you');
});
