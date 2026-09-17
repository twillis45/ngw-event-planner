// ─── The street line the host actually typed ──────────────────────────────────
//
// venueAddress rides into the invite guests read and into a Google Maps deep
// link (App.js), so a wrong string here is not a parsing curiosity — it is a
// guest standing at the wrong place.
//
// THE DEFECT THIS GUARDS, found on a live seed 2026-09-17. For
// "this Sunday at 1 pm at 8100 Ryan Way" the extractor returned
// "1 pm at 8100 Ryan Way": the house-number group matched the "1" of "1 pm",
// and the lazy street-word run walked through the second "at" to reach "Way".
// Both halves are now blocked — a number followed by am/pm is a time, and a
// street-word run may not cross a connective.
import { parseSmartEventText } from '../smartParseEvent';

const addr = (text) => parseSmartEventText(text).venueAddress || '';

describe('venueAddress never swallows the time that precedes it', () => {
  test('the live seed that found this', () => {
    expect(addr("Big game this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD. For 5 people."))
      .toBe('8100 Ryan Way');
  });

  test.each([
    ['no time at all',            'Party at 8100 Ryan Way, Greenbelt MD',                    '8100 Ryan Way'],
    ['spaced time then address',  'Cookout at 7 pm at 1500 Anacostia Dr SE',                 '1500 Anacostia Dr'],
    ['unspaced time',             'Dinner at 6pm at 231 6th Avenue North, Nashville TN',      '231 6th Avenue'],
    ['unit tail survives',        'Shower on Saturday at 2 pm at 418 King Street Apt 4B, Alexandria VA', '418 King Street Apt 4B'],
  ])('%s', (_label, text, want) => {
    expect(addr(text)).toBe(want);
  });

  test.each([
    ['a guest count is not an address', 'Watch party for 20 guests'],
    ['a bare time is not an address',   'Birthday at 3 pm for 12 people'],
    ['a date is not an address',        'Cookout on Aug 2 for 30'],
  ])('%s', (_label, text) => {
    expect(addr(text)).toBe('');
  });

  test('the time is still parsed out separately, not lost to the guard', () => {
    const p = parseSmartEventText("Big game this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD.");
    expect(p.startTime).toBe('1:00 PM');
    expect(p.venueCity).toBe('Greenbelt');
    expect(p.venueState).toBe('MD');
  });
});
