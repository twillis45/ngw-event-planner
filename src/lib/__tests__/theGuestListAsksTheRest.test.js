// ─── THE GUEST LIST ASKS THE REST (G2c-2b-2b; owner, 11/28/2026: calls A and B
// "go with your recommendations"; UX_12 §8a) ─────────────────────────────────
// A. A headcount plan with kids welcome is asked how many are kids (the field
//    the old sheet's stepper wrote and the food engine reads: kidsCount).
// B. The turnout line: "Likely 6–9 on the day", from the replies (sizingRange,
//    the one sized-for reader), its reason one tap down; none without a range.
import { guestQuestions } from '../guestPath';
import { kidsCountEdit } from '../guestEdits';
import { turnoutLine } from '../guestRows';

const HEAD = { id: 'k1', type: 'Thanksgiving', guestMode: 'count', guestCount: 20, guestCountSource: 'host', plusOnePolicy: 'no_plus_ones', rsvpDeadline: '2099-12-01' };

describe('A. kids count, for a headcount plan with kids welcome', () => {
  test('asked after "Are kids welcome?" when kids are welcome and the count is unset', () => {
    expect(guestQuestions({ ...HEAD, kidsPolicy: 'kids_welcome' })).toEqual(['kidsCount']);
  });
  test('not asked for adults only, for a plan by name, or once answered (0 counts as an answer)', () => {
    expect(guestQuestions({ ...HEAD, kidsPolicy: 'adults_only' })).toEqual([]);
    expect(guestQuestions({ ...HEAD, guestMode: 'list', kidsPolicy: 'kids_welcome' })).toEqual([]);
    expect(guestQuestions({ ...HEAD, kidsPolicy: 'kids_welcome', kidsCount: 0 })).toEqual([]);
  });
  test('the edit saves kidsCount, never above the count, and says so', () => {
    expect(kidsCountEdit({ ...HEAD }, 4)).toEqual({ patch: { kidsCount: 4 }, msg: '4 of your 20 are kids. The food plan sizes them lighter.' });
    expect(kidsCountEdit({ ...HEAD }, 99).patch.kidsCount).toBe(20);
    expect(kidsCountEdit({ ...HEAD }, 0).msg).toBe('No kids. The food plan sizes everyone as adults.');
  });
});

describe('B. the turnout line', () => {
  const list = (rs) => ({ id: 't1', type: 'Thanksgiving', guestMode: 'list', guests: rs.map((r, i) => ({ id: 'g' + i, name: 'G' + i, rsvp: r })) });
  test('replies still out: a range, and its reason', () => {
    const t = turnoutLine(list(['Yes', 'Yes', 'Yes', '', 'Maybe', 'No']));
    expect(t).toEqual({ line: 'Likely 3–5 on the day.', why: '3 confirmed · 2 replies still out' });
  });
  test('everyone answered (no range): no line', () => {
    expect(turnoutLine(list(['Yes', 'Yes', 'No']))).toBeNull();
  });
  test('a planned count over a short list is the plan, not a turnout: no line', () => {
    expect(turnoutLine({ ...list(['Yes', '']), guestCount: 40 })).toBeNull();
  });
});

// ─── WHO HASN'T HAD THE INVITE (render screen 1, #5) ─────────────────────────
// Counted against guests who can be reached (a phone or an email) and who have
// no invite record of any kind: emailed or texted (invitedAt) or told by hand.
// Only after an invite went out with per-guest records: a link shared with no
// record went to the whole list (the Replies rule, #324).
import { notToldYet } from '../guestRows';

describe("who hasn't had the invite", () => {
  const at = '2026-11-24T15:00:00.000Z';
  const base = { id: 'n1', guestMode: 'list', invitesSentAt: at };
  test('emailed and told guests count as told; the unreachable are not counted', () => {
    const ev = { ...base, guestTold: { c: { at, channel: 'other' } }, guests: [
      { id: 'a', name: 'Ada', email: 'a@example.com', invitedAt: at },
      { id: 'b', name: 'Bo', email: 'b@example.com' },
      { id: 'c', name: 'Cy', phone: '(555) 010-0100' },
      { id: 'd', name: 'Di', phone: '(555) 010-0101' },
      { id: 'e', name: 'Ed' },
    ] };
    expect(notToldYet(ev)).toEqual({ count: 2, line: '2 you can reach haven’t had the invite yet.' });
  });
  test('one left reads in the singular', () => {
    const ev = { ...base, guests: [{ id: 'a', name: 'Ada', email: 'a@example.com', invitedAt: at }, { id: 'b', name: 'Bo', email: 'b@example.com' }] };
    expect(notToldYet(ev).line).toBe('1 you can reach hasn’t had the invite yet.');
  });
  test('nothing sent yet, or a link shared with no records, or everyone had it: no line', () => {
    expect(notToldYet({ ...base, invitesSentAt: undefined, guests: [{ id: 'b', name: 'Bo', email: 'b@example.com' }] })).toBeNull();
    expect(notToldYet({ ...base, guests: [{ id: 'b', name: 'Bo', email: 'b@example.com' }] })).toBeNull();
    expect(notToldYet({ ...base, guests: [{ id: 'a', name: 'Ada', email: 'a@example.com', invitedAt: at }] })).toBeNull();
  });
});

// ─── SAME PERSON? (render screen 1, #3) ─────────────────────────────────────
import { sameGuestEdit } from '../guestEdits';
describe('Same person?', () => {
  const ev = { guestMode: 'list', guests: [{ id: 'g3', name: 'Dev Okafor' }, { id: 'x', name: 'Dev O.', rsvp: 'Yes', maybeSameAs: 'g3' }] };
  test('same: the reply folds onto the guest’s row and the extra row goes', () => {
    const e = sameGuestEdit(ev, 'x', true);
    expect(e.patch.guests.map((g) => [g.id, g.rsvp])).toEqual([['g3', 'Yes']]);
    expect(e.msg).toBe('The reply is on Dev Okafor’s row now.');
  });
  test('different: both stay, and the question is not asked again', () => {
    const e = sameGuestEdit(ev, 'x', false);
    expect(e.patch.guests).toHaveLength(2);
    expect(e.patch.guests.find((g) => g.id === 'x').maybeSameAs).toBeUndefined();
  });
});
