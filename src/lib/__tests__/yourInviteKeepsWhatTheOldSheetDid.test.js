// YOUR INVITE IN THE KIT (G2c-2b step 4; owner, 11/28/2026, UX_12 §8a, render
// screen 4). What the old Guests sheet's invite card did, read from one place so
// the kit and the old sheet say the same thing:
//   - who was added after the invite went out, and the button that invites only them;
//   - what went out, in one line (when, and by which way to how many);
//   - an older gift choice shown as its own option, with its detail.
// Made-up names only.
import { lateInvite } from '../guestRows';
import { sentSummary } from '../inviteMessageDraft';
import { giftChoices, GIFT_DETAIL } from '../guestEdits';

const at = '2026-11-24T15:00:00.000Z';
const sentEvent = (extra = []) => ({
  invitesSentAt: at,
  guests: [
    { id: 'a', name: 'Ada Pine', email: 'ada@example.com', invitedAt: at, invitedVia: 'email' },
    { id: 'b', name: 'Bo Lee', phone: '555-555-0101', invitedAt: at, invitedVia: 'text' },
    ...extra,
  ],
});

describe('lateInvite: the guests added after the invite went out', () => {
  test('nothing before any invite went out', () => {
    expect(lateInvite({ guests: [{ id: 'x', name: 'Cy Ng', email: 'cy@example.com' }] })).toBeNull();
  });
  test('nothing once everyone reachable has it', () => {
    expect(lateInvite(sentEvent())).toBeNull();
  });
  test('one late guest by email: the old sheet’s label and line', () => {
    const l = lateInvite(sentEvent([{ id: 'c', name: 'Sam Ortiz', email: 'sam@example.com' }]));
    expect(l.count).toBe(1);
    expect(l.label).toBe('Invite 1 new guest');
    expect(l.line).toBe('Sam Ortiz was added after your invite went out. Sam gets the same message by email.');
  });
  test('two late guests, one by email and one by text', () => {
    const l = lateInvite(sentEvent([
      { id: 'c', name: 'Priya Shah', email: 'priya@example.com' },
      { id: 'd', name: 'Dev Okafor', phone: '555-555-0102' },
    ]));
    expect(l.label).toBe('Invite 2 new guests');
    expect(l.line).toBe('Priya Shah and Dev Okafor were added after your invite went out. They get the same message by email or text.');
  });
  test('a declined or unreachable late guest is not counted', () => {
    expect(lateInvite(sentEvent([{ id: 'e', name: 'No Way', email: 'no@example.com', rsvp: 'No' }, { id: 'f', name: 'No Contact' }]))).toBeNull();
  });
});

describe('sentSummary: what went out, in one line', () => {
  test('nothing until something went out', () => {
    expect(sentSummary({ guests: [] })).toBe('');
  });
  test('the day, then each way and how many', () => {
    const ev = { ...sentEvent(), invitesSentMessage: { subject: 'S', body: 'B', voice: 'as-written', at } };
    expect(sentSummary(ev)).toBe('Nov 24 · email to 1, text to 1');
  });
  test('a guest told by hand counts as sent by you', () => {
    const ev = { invitesSentAt: at, invitesSentMessage: { body: 'B', at }, guests: [{ id: 'a', name: 'Ada', invitedAt: at }] };
    expect(sentSummary(ev)).toBe('Nov 24 · by you to 1');
  });
});

describe('giftChoices: an older gift choice keeps its own option', () => {
  test('the three choices for a new plan', () => {
    expect(giftChoices(null).map((o) => o[1])).toEqual([null, 'no_gifts', 'registry']);
  });
  test('a donation set before stays chosen, with its detail hint', () => {
    const opts = giftChoices('charity');
    expect(opts[opts.length - 1]).toEqual(['A donation', 'charity']);
    expect(GIFT_DETAIL.charity).toBe('Cause name or link');
  });
  test('potluck and chip in too', () => {
    expect(giftChoices('potluck').some((o) => o[1] === 'potluck')).toBe(true);
    expect(giftChoices('contribution').some((o) => o[1] === 'contribution')).toBe(true);
  });
});
