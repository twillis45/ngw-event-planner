// ─── THE REPLIES STEP COUNTS A SHARED LINK (live signed-in check, 11/28/2026) ─
// The invite went out by "Share the link", Ada replied Yes from it, and the
// Guests groups said "Coming 1 · No reply yet 2" while the path's Replies step
// said "0 of 0". The step counted only guests with a per-guest invite record
// (emailed, or marked told), and a shared link records none. Owner: "Fix both."
//
// The rule now: a guest who replied had the invite; and an invite that went out
// with no per-guest record at all (the link, shared) went to the whole list.
import { guestPath, guestPathState } from '../guestPath';

const NOW = new Date('2026-11-28T12:00:00');
const guests = [
  { id: 'a', name: 'Ada Pine', email: 'ada@example.com', rsvp: 'Yes' },
  { id: 'b', name: 'Bo Reed', email: 'bo@example.com' },
  { id: 'c', name: 'Cy Lark', phone: '555-0100' },
];
const EV = {
  id: 'r1', name: 'Thanksgiving', type: 'Thanksgiving', date: '2026-12-19', guestMode: 'list', guestCount: 12,
  plusOnePolicy: 'no_plus_ones', kidsPolicy: 'adults_only', rsvpDeadline: '2026-12-09',
  invitesSentAt: '2026-11-28T11:00:00.000Z', guests,
};
const repliesLine = (ev) => guestPath(guestPathState(ev, { now: NOW })).steps.find((s) => s.k === 'replies').val;

test('shared by link, one Yes of three named: "1 of 3", not "0 of 0"', () => {
  expect(repliesLine(EV)).toBe('1 of 3');
});

test('emailed to two of three: the two count, and a reply from the third counts too', () => {
  const ev = { ...EV, guests: [
    { ...guests[0], invitedAt: '2026-11-28T11:00:00.000Z' },
    { ...guests[1], invitedAt: '2026-11-28T11:00:00.000Z' },
    { ...guests[2], rsvp: 'No' },
  ] };
  expect(repliesLine(ev)).toBe('2 of 3');
  const two = { ...ev, guests: [ev.guests[0], ev.guests[1], { ...guests[2] }] };
  expect(repliesLine(two)).toBe('1 of 2');
});

test('NEGATIVE CONTROL: not sent yet still reads "After the invite"', () => {
  expect(repliesLine({ ...EV, invitesSentAt: undefined })).toBe('After the invite');
});
