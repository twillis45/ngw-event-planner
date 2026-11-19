// Owner, 11/19/2026: "check copy for text, each version doesn't change much."
// The invite's voices were word swaps on one fixed draft: Playful added a "!"
// and one line, Formal expanded contractions, and Tighter kept only paragraphs
// with an arrow or a colon, so it DROPPED the date and the place. Each voice is
// now its own invite, written from the same facts, and none loses one.
import { draftInvite, INVITE_VOICES } from '../doItForMe';

const EV = { name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: '2026-12-01', startTime: '16:00', venue: 'Vida’s place', venueCity: 'Baltimore' };
const PROFILE = { name: 'Vida Reyes' };
const URL = 'https://x.test/hostv2/?rsvp=abc123def456ghi7';
const text = (voice, ev = EV) => { const d = draftInvite(ev, PROFILE, { rsvpUrl: URL, voice }); return d.subject + '\n\n' + d.body; };

test('every voice keeps every fact: the day, the time, the place, the reply link, the host', () => {
  for (const v of INVITE_VOICES) {
    const t = text(v);
    expect([v, /December 1/.test(t)]).toEqual([v, true]);
    expect([v, /4(:00)?\s?(PM|pm)/.test(t)]).toEqual([v, true]);
    expect([v, t.includes('Vida’s place')]).toEqual([v, true]);
    expect([v, t.includes(URL)]).toEqual([v, true]);
    expect([v, t.includes('Vida')]).toEqual([v, true]);
  }
});

test('each voice reads as its own invite, not the same one with a word changed', () => {
  const bodies = INVITE_VOICES.map((v) => draftInvite(EV, PROFILE, { rsvpUrl: URL, voice: v }).body);
  const firstLines = bodies.map((b) => b.split('\n')[0]);
  expect(new Set(firstLines).size).toBe(INVITE_VOICES.length);        // every one opens differently
  const closing = (b) => b.split('\n').filter((l) => l.trim() && !l.includes(URL)).slice(-2).join(' ');
  expect(new Set(bodies.map(closing)).size).toBe(INVITE_VOICES.length); // and closes differently
  const len = (v) => text(v).length;
  expect(len('tighter')).toBeLessThan(len('as-written'));
  expect(len('tighter')).toBeLessThan(len('warmer'));
  expect(text('formal')).not.toMatch(/!/);
  expect(text('formal')).not.toMatch(/\b(we’re|you’re|can’t|we’d|it’s)\b/i);
});

test('a repast never gets a festive voice', () => {
  const REPAST = { name: 'Repast for Mr. Lewis', type: 'Repast', honoree: 'Mr. Lewis', date: '2026-12-01', startTime: '13:00', venue: 'Grace Hall' };
  for (const v of INVITE_VOICES) {
    const t = text(v, REPAST);
    expect([v, /!|celebrat|party|can’t wait|good one|clear your calendar/i.test(t)]).toEqual([v, false]);
    expect([v, t.includes('Grace Hall') && t.includes(URL)]).toEqual([v, true]);
  }
});

test('no voice asked for is the invite as it always read', () => {
  expect(draftInvite(EV, PROFILE, { rsvpUrl: URL })).toEqual(draftInvite(EV, PROFILE, { rsvpUrl: URL, voice: 'as-written' }));
});
