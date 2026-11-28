// ─── A NUDGE FOR ONE GUEST (G2c-2b-1, owner 11/28/2026) ──────────────────────
// The guest sheet's "Nudge Ava" reaches Ava alone, by the same rule the batch
// uses for how (a good address gets the email, else a phone the text queue).
// The host chose her by name, so the batch's 3-day spacing does not hide her.
import { nudgeRecipients } from '../replyNudge';

const NOW = new Date('2026-11-28T12:00:00');
const EV = {
  id: 'n1', guestMode: 'list', invitesSentAt: '2026-11-24T15:00:00.000Z',
  guests: [
    { id: 'a', name: 'Ava Lane', email: 'ava@example.com', invitedAt: '2026-11-24T15:00:00.000Z', nudgedAt: '2026-11-27T15:00:00.000Z', nudgedVia: 'email' },
    { id: 'b', name: 'Bo Reed', phone: '(555) 010-0199', invitedAt: '2026-11-24T15:00:00.000Z' },
    { id: 'c', name: 'Cy Lark', email: 'cy@example.com', invitedAt: '2026-11-24T15:00:00.000Z', rsvp: 'Yes' },
  ],
};

test('only: Ava alone, by email, even though she was nudged yesterday', () => {
  const r = nudgeRecipients(EV, NOW, { only: 'a' });
  expect(r.email.map((g) => g.id)).toEqual(['a']);
  expect(r.text).toEqual([]);
  expect(r.recentlyNudged).toBe(0);
});
test('only: Bo, who has just a phone, goes in the text queue', () => {
  const r = nudgeRecipients(EV, NOW, { only: 'b' });
  expect(r.text.map((g) => g.id)).toEqual(['b']);
  expect(r.email).toEqual([]);
});
test('only: a guest who replied is nobody to nudge', () => {
  const r = nudgeRecipients(EV, NOW, { only: 'c' });
  expect(r.email.length + r.text.length).toBe(0);
});
test('NEGATIVE CONTROL: the batch still skips Ava, nudged in the last 3 days', () => {
  const r = nudgeRecipients(EV, NOW);
  expect(r.email.map((g) => g.id)).toEqual([]);
  expect(r.text.map((g) => g.id)).toEqual(['b']);
  expect(r.recentlyNudged).toBe(1);
});
