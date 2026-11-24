// Owner, 11/24/2026 (follow-on item 8): on a past event, when the host wrote a
// message (deckLine edited), the invite shows her words, not "A day worth
// remembering". That line fills in only when she wrote nothing (or saved our
// suggestion unchanged). An empty memorial keeps "In loving memory".
import { inviteMessage, suggestedInviteLine } from '../inviteDeck';

const EV = {
  name: 'Mom Linda’s Thanksgiving', type: 'Thanksgiving', date: '2020-11-26', startTime: '18:00', startTimeSource: 'host',
  hostName: 'Dana Reyes',
};
const MINE = 'Thank you all for a wonderful day. Same time next year.';

test('past, and she wrote a message: her words, signed', () => {
  expect(inviteMessage({ ...EV, deckLine: MINE }, { past: true })).toEqual({ text: MINE, signedBy: 'Dana' });
});

test('past, and she wrote nothing: the retrospective line fills in', () => {
  expect(inviteMessage({ ...EV, deckLine: '' }, { past: true })).toEqual({ text: 'A day worth remembering', signedBy: '' });
});

test('past, and our suggestion saved unchanged is not her words', () => {
  const sug = suggestedInviteLine(EV);
  expect(inviteMessage({ ...EV, deckLine: sug }, { past: true })).toEqual({ text: 'A day worth remembering', signedBy: '' });
});

test('an empty memorial keeps "In loving memory", past or not', () => {
  expect(inviteMessage({ ...EV, deckLine: '' }, { somber: true, past: true })).toEqual({ text: 'In loving memory', signedBy: '' });
  expect(inviteMessage({ ...EV, deckLine: '' }, { somber: true })).toEqual({ text: 'In loving memory', signedBy: '' });
});
