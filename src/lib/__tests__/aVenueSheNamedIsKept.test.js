// Owner, 11/16/2026: "App shouldn't ask for it if it's been provided." The
// Anaheim 50th, typed with its venue ("…party at House of Blues Anaheim in
// Anaheim, CA…"), kept the town and dropped the venue, then asked "Where is the
// event?". A named venue was only read in the comma form "at Venue, City, ST".
// The other ordinary forms ("at Venue in City", "at Venue on <date>", "at Venue,
// for 60") were dropped — and because the town WAS read, the "not applied"
// disclosure stayed silent too. A capitalized name after "at" is now kept,
// verbatim; times, holidays, months, weekdays and bare town names never are.
import { parseSmartEventText } from '../smartParseEvent';

const venueOf = (s) => parseSmartEventText(s).venue;

test.each([
  ["Jordan's 50th birthday party at House of Blues Anaheim in Anaheim, CA on Saturday June 12, 2027 for 60 guests", 'House of Blues Anaheim'],
  ["Jordan's 50th birthday party at The Grove of Anaheim on June 12, 2027 for 60 guests", 'The Grove of Anaheim'],
  ['50th birthday at Anaheim Majestic Garden Hotel in Anaheim CA June 12 2027, 60 guests', 'Anaheim Majestic Garden Hotel'],
  ["Jordan's 50th at the Phoenix Club in Anaheim on June 12 2027 for 60", 'The Phoenix Club'],
  ["Jordan's 50th birthday party at House of Blues, June 12, 2027, 60 guests", 'House of Blues'],
])('%s → %s', (s, venue) => {
  const p = parseSmartEventText(s);
  expect(p.venue).toBe(venue);
  expect(p.venueKind).toBe('venue');
});

test('the town is still read beside the venue', () => {
  const p = parseSmartEventText("Jordan's 50th birthday party at House of Blues Anaheim in Anaheim, CA on June 12, 2027");
  expect([p.venueCity, p.venueState]).toEqual(['Anaheim', 'CA']);
});

test.each([
  'Birthday party at 7pm on June 12, 2027 in Anaheim, CA',
  'Family dinner at Christmas in Anaheim, CA',
  'Party at Thanksgiving for 20',
  'Birthday at Noon on Saturday June 12 2027',
  'Graduation party at Anaheim on June 12 2027',
  'Retirement party at June 12 2027',
  'Game night at Saturday',
])('not a venue: %s', (s) => {
  expect(venueOf(s) || '').not.toMatch(/7pm|Christmas|Thanksgiving|Noon|Anaheim$|June|Saturday/);
});

test('what was already read is unchanged', () => {
  expect(venueOf("Jordan's 50th at Vida's on June 12 2027")).toBe("Vida's");
  expect(venueOf('80th birthday at the church hall in Baltimore, MD')).toMatch(/church hall/i);
  expect(venueOf('BBQ at my brother’s backyard on July 4 2027')).toMatch(/brother’s backyard/i);
  expect(venueOf('Reunion at City Park, New Orleans, LA on June 3 2027')).toBe('City Park');
});
