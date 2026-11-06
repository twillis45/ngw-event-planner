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

describe('R2-6 — "my son jaxon" names Jaxon, not "Son"', () => {
  test.each([
    ['bday party for my son jaxon turning 7 next friday, like 20 kids, $500', 'Jaxon'],
    ['Birthday party for my mom Linda, 30 people', 'Linda'],
    ['surprise party for our daughter Maya who is turning 16', 'Maya'],
  ])('%s → %s', (s, who) => {
    expect(parseSmartEventText(s).honoree).toBe(who);
  });
  test.each([
    ['Birthday party for my mom Saturday at 3', 'Mom'],
    ['Birthday party for my son turning 7', 'Son'],
    ['Birthday dinner for my dad and 12 friends', 'Dad'],
    ['party for my sister who just graduated', 'Sister'],
  ])('CONTROL — no name follows: %s → %s', (s, who) => {
    expect(parseSmartEventText(s).honoree).toBe(who);
  });
});

describe('R2-6 — a place she named is reported when nothing kept it', () => {
  const { unusedClauses } = require('../smartParseEvent');
  test('"at chuck e cheese" is listed', () => {
    expect(unusedClauses('bday party for my son jaxon turning 7 next friday at chuck e cheese, like 20 kids, $500')).toContain('at chuck e cheese');
  });
  test.each([
    'Anniversary dinner for 2 at home tonight at 7pm',
    'Housewarming at 4512 Elm Street, Apt 3B, Silver Spring MD 20910 on 12/5, 25 friends',
    'Cookout at my house this Saturday for 25 people',
    'Birthday at The Grand Hall, Baltimore, MD on June 3 2027 for 80',
    'game night at 7 for 10 friends',
  ])('CONTROL — nothing invented: %s', (s) => {
    expect(unusedClauses(s).join(' | ')).not.toMatch(/^at |\| at /);
  });
});
