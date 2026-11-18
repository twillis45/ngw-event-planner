// THE INVITE IS OUT, ONCE (single-source audit, 11/18/2026).
import { taskSatisfied, invitesOut, factsATickRecords } from '../taskEngine';

const ev = (extra = {}) => ({ id: 'e', type: 'Holiday Party', guests: [], vendors: [], ...extra });
const step = (task) => ({ task });

test('a guest who answered proves the invite went out', () => {
  expect(invitesOut(ev({ guests: [{ id: 'a', rsvp: 'Yes' }] }))).toBe(true);
  expect(invitesOut(ev({ guests: [{ id: 'a' }] }))).toBe(false);
});

test('"Send invites + collect RSVP…" is credited once the invite is out', () => {
  const t = step('Send invites + collect RSVP, dietary, plus-ones');
  expect(taskSatisfied(ev(), t)).toBe(false);
  expect(taskSatisfied(ev({ invitesSentAt: '2026-11-01T00:00:00Z' }), t)).toBe(true);
});

test('"Send invitations… track replies for the count" too', () => {
  expect(taskSatisfied(ev({ invitesSentAt: 'x' }), step('Send invitations with the date and dress code; track replies for the count'))).toBe(true);
});

test('ticking it records the invite', () => {
  expect(Object.keys(factsATickRecords(ev(), step('Send invites + collect RSVP, dietary, plus-ones')))).toEqual(['invitesSentAt']);
});

test('a bare "track RSVPs" act is still not proven by one reply', () => {
  expect(taskSatisfied(ev({ guests: [{ id: 'a', rsvp: 'Yes' }] }), step('Track RSVPs as they come in'))).toBe(false);
});
