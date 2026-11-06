// Run 2 break run (11/6/2026): four sentences whose creation saved something
// the host never said, or dropped something she did, with nothing on screen.
import { parseSmartEventText } from '../smartParseEvent';

describe('R2-1 — a time RANGE starts at its first time', () => {
  test.each([
    ['Housewarming on 12/5 from 2-6pm, 25 friends', /^2(:00)?\s*PM$|^14:00$/i],
    ['Birthday party Saturday 7 to 10pm for 20', /^7(:00)?\s*PM$|^19:00$/i],
    ['Brunch on Sunday 11am-2pm for 12', /^11(:00)?\s*AM$|^11:00$/i],
  ])('%s', (s, want) => {
    const p = parseSmartEventText(s);
    expect(String(p.startTime || p.time || '')).toMatch(want);
  });
  test('a single time still works (control)', () => {
    expect(String(parseSmartEventText('Anniversary dinner tonight at 7pm for 2').startTime || '')).toMatch(/^7(:00)?\s*PM$|^19:00$/i);
  });
});

describe('R2-2 — an impossible date is never rolled over', () => {
  test('February 30 is not saved as March 2', () => {
    const p = parseSmartEventText('Baby shower February 30 2027 for 40 people');
    expect(p.date || '').not.toBe('2027-03-02');
    expect(p.date || '').not.toMatch(/^2027-03/);
  });
  test('February 28 still parses (control)', () => {
    expect(parseSmartEventText('Baby shower February 28 2027 for 40 people').date).toBe('2027-02-28');
  });
});

describe('R2-4 — a town the parse shows is a town it keeps', () => {
  test('"in Chicago"', () => {
    const p = parseSmartEventText('holiday party for 40 people in Chicago december 12');
    expect(p.venueCity || p.city).toBe('Chicago');
  });
});

describe('R2-5 — a stated count is kept, never silently replaced', () => {
  test('"for 10000 people"', () => {
    const p = parseSmartEventText('company holiday party for 10000 people in Chicago december 12, budget $5k');
    expect(p.guests).toBe(10000);
  });
});

describe('R2-2 — the impossible date is named, so the screen can say so', () => {
  test.each(['Baby shower February 30 2027 for 40', 'Party on April 31 for 10', 'Dinner on 13/45 for 4'])('%s', (s) => {
    const p = parseSmartEventText(s);
    expect(p.date).toBeFalsy();
    expect(p.impossibleDate).toBeTruthy();
  });
});

describe('R2-5 — big counts, and the years that must not become one', () => {
  test.each([['conference for 1,200 attendees in May', 1200], ['gala for 2500 guests', 2500], ['picnic for 20 people', 20]])('%s → %i', (s, n) => {
    expect(parseSmartEventText(s).guests).toBe(n);
  });
  test.each(['reunion for 2027 in Asheville', 'planning for 2028', 'wedding in 2027 for the family'])('%s → no count', (s) => {
    const g = parseSmartEventText(s).guests;
    expect(g == null || g <= 999).toBe(true);
  });
});
