// ─── THE EVENT'S HASHTAG (owner, 11/16/2026) ─────────────────────────────────
//
// The owner ruled: suggest a hashtag from the event's own data, host-editable,
// and hand photos to the person's own Instagram/Facebook through the share
// sheet. Board (11/16): never claim a tag is "unused" or "available" — nothing
// here can know that — and nothing is invented: every word comes from a field
// the host gave (honoree, host, name, type, date).
import { suggestHashtags, normalizeHashtag } from '../eventHashtag';

describe('suggestions come from the event’s own words', () => {
  test('a retirement with an honoree leads with the honoree', () => {
    const s = suggestHashtags({ type: 'Retirement Party', honoree: 'Margaret Adeyemi', date: '2027-02-08' });
    expect(s[0]).toBe('#MargaretsRetirement2027');
    expect(s).toContain('#MargaretRetires2027');
  });
  test('a Friendsgiving uses the host, not an invented honoree', () => {
    const s = suggestHashtags({ type: 'Friendsgiving', hostName: 'Vida Okafor', date: '2026-11-21' });
    expect(s[0]).toBe('#VidasFriendsgiving2026');
    s.forEach((t) => expect(t).not.toMatch(/undefined|null/));
  });
  test('a wedding joins the two names when the name gives them', () => {
    const s = suggestHashtags({ type: 'Wedding', name: 'Ana & Leo’s Wedding', date: '2027-06-12' });
    expect(s).toContain('#AnaAndLeo2027');
  });
  test('three at most, all distinct, all valid tags', () => {
    const s = suggestHashtags({ type: 'Birthday Party', honoree: 'Jo', hostName: 'Sam', date: '2026-12-01', name: 'Jo’s 40th' });
    expect(s.length).toBeGreaterThan(0);
    expect(s.length).toBeLessThanOrEqual(3);
    expect(new Set(s).size).toBe(s.length);
    s.forEach((t) => expect(t).toMatch(/^#[A-Za-z][A-Za-z0-9]{1,29}$/));
  });
  test('nothing to build from → no suggestion, never a made-up one', () => {
    expect(suggestHashtags({})).toEqual([]);
  });
});

describe('a host’s own tag is cleaned, never second-guessed', () => {
  test.each([
    ['#vida friendsgiving 2026', '#VidaFriendsgiving2026'],
    ['VidasFriendsgiving', '#VidasFriendsgiving'],
    ['##Ana&Leo!', '#AnaLeo'],
    ['Margaret’s Big Day', '#MargaretsBigDay'],
  ])('%s → %s', (input, want) => {
    expect(normalizeHashtag(input)).toBe(want);
  });
  test('empty or only symbols → empty', () => {
    expect(normalizeHashtag('  # !! ')).toBe('');
  });
});
