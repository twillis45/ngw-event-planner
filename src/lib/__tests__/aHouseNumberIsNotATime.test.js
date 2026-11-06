// Owner's Vida run on the local real stack (11/5/2026): "…at 12 Sample Rd in
// Pasadena…" saved startTime "12:00 PM" with basis said-with-bucket, so the
// outward gate treated it as the host's own word and every guest invite read
// "Saturday, November 7 · 12:00 PM". Nobody said a time. The last fallback in
// the start-time parse read a bare "at <1-2 digits>" as an hour, and a house
// number after "at" is the ordinary way to write an address.
import { parseSmartEventText } from '../smartParseEvent';

describe('a street address is not a start time', () => {
  test.each([
    'girls’ game night this Saturday, November 7, at 12 Sample Rd in Pasadena, Maryland',
    'dinner at 12 Main St on Friday',
    'party at 7 Oak Lane',
    'brunch at 9 Elm Street, Sunday',
    'cookout at 4 Harbor View Drive',
    'book club at 22 W Pine Ave',
  ])('%s → no start time', (s) => {
    expect(parseSmartEventText(s).startTime).toBe(null);
  });
});

describe('real times still read (negative controls)', () => {
  test.each([
    ['dinner at 7', '7:00 PM'],
    ['party at 7 Saturday night', '7:00 PM'],
    ['dinner at 6:30', '6:30 PM'],
    ['brunch at 11am at 12 Main St', '11:00 AM'],
    ['game night at 8 at 12 Sample Rd', '8:00 PM'],
    ['doors at 6 for 40 guests', '6:00 PM'],
  ])('%s → %s', (s, t) => {
    expect(parseSmartEventText(s).startTime).toBe(t);
  });
});
