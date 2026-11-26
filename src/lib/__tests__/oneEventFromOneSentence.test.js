// ONE EVENT FROM ONE SENTENCE (owner, 11/26/2026: "start Create"). hostv4's
// Create and hostv2's creation build the event through lib/eventFromSentence,
// so the same words make the same plan in both apps. These pin what the
// builder keeps from her sentence; the source check that hostv2 calls it is in
// hostv2/test/oneEventFromOneSentence.test.mjs.
import { parseSmartEventText } from '../smartParseEvent';
import { effectiveAnswers, eventFromSentence } from '../eventFromSentence';
import { mintEventId, mintRsvpToken } from '../eventIds';

const NOW = new Date('2026-11-01T15:00:00Z');
const build = (text, said = {}) => eventFromSentence({
  text, parsed: parseSmartEventText(text), said, id: 'cust-test-1', rsvpCode: 'R'.repeat(22), now: NOW,
});

describe('what she said is what the plan uses', () => {
  test('type, count, date and her potluck/BYOB answers are kept as hers', () => {
    const ev = build('Friendsgiving potluck for 12 on November 21, 2026, BYOB');
    expect(ev.type).toBe('Friendsgiving');
    expect(ev.guestEstimate).toBe(12);
    expect(ev.guestCountSource).toBe('host');
    expect(ev.date).toBe('2026-11-21');
    expect(Object.values(ev.choiceSource || {})).toContain('host');
    expect(ev.createdFromText).toMatch(/potluck/);
    expect(ev.timeline.length).toBeGreaterThan(0);
  });

  test('a count she did not say is the playbook’s, and says so', () => {
    const ev = build('Thanksgiving dinner on November 26, 2026');
    expect(ev.guestEstimate).toBeGreaterThan(0);
    expect(ev.guestCountSource).toBe('playbook-typical');
  });

  test('her correction outranks her sentence', () => {
    const ev = build('Friendsgiving for 12 on November 21, 2026', { fGuests: 20 });
    expect(ev.guestEstimate).toBe(20);
    expect(ev.guestCountSource).toBe('host');
  });

  test('the shell’s id, code and clock are the event’s', () => {
    const ev = build('cookout for 30 on July 4, 2027');
    expect(ev.id).toBe('cust-test-1');
    expect(ev.rsvpCode).toBe('R'.repeat(22));
    expect(ev.createdAt).toBe(NOW.toISOString());
    expect(ev.inviteStyle).toBe('auto');
  });
});

describe('effective answers', () => {
  test('a place-named guess is not a destination answer', () => {
    const a = effectiveAnswers(parseSmartEventText('birthday party in Greenbelt, MD'));
    expect(a.destinationIsGuess).toBe(true);
    expect(a.effIsDestination).toBe(null);
  });
  test('no occasion means no type and no typical count', () => {
    const a = effectiveAnswers(parseSmartEventText(''));
    expect(a.effType).toBe(null);
    expect(a.effGuests).toBe(null);
  });
});

test('the minted ids keep their shapes', () => {
  expect(mintEventId()).toMatch(/^cust-[a-z0-9]+-[a-z0-9]+$/);
  expect(mintRsvpToken()).toMatch(/^[A-Za-z0-9]{22}$/);
});
