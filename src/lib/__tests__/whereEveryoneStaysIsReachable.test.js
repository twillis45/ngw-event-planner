// 40-host lodging run (owner, 11/16/2026: "Need to go through lodging workflow
// for many"). Trips the host plainly described as trips were saved as NOT a
// destination, so "Where everyone stays" never appeared: a town + state alone
// is the parser's 'place-named' guess, which creation never commits — and the
// travel words list knew "flying in" and "getaway" but not one word for where
// people SLEEP. Naming lodging in a named town is the host's own statement.
import { parseSmartEventText } from '../smartParseEvent';

const p = (s) => parseSmartEventText(s);
const said = (r) => r.isDestination === true && r.destinationBasis !== 'place-named';

test.each([
  'Family reunion in Santa Fe, NM, July 8-11 2027, 30 people, renting a couple of houses',
  'Bachelorette weekend in Nashville, TN, May 14-16 2027, 10 girls, need an Airbnb',
  'Wedding weekend in Orlando, FL, March 5-7 2027, 80 guests, hotel room block',
  'Golf weekend in Scottsdale, AZ, Feb 11-14 2027, 6 guys, rental house with a pool',
  'Girls trip to Palm Springs, CA, Jan 22-24 2027, 9 friends, Airbnb with a pool',
])('lodging named in a town → a trip she said: %s', (s) => { expect(said(p(s))).toBe(true); });

test.each([
  ["Jordan's 50th at Anaheim Majestic Garden Hotel, Anaheim, CA, June 12, 2027, 50 guests", 'the hotel is the venue'],
  ['Two-day Friendsgiving at my place, Sat Nov 21 and Sun Nov 22 2026, 20 people', 'a span at home'],
  ['Sleepover birthday party at my house in Anaheim, CA, June 12 2027, 8 kids', 'a sleepover at home'],
  ['Birthday party at the Phoenix Club, Anaheim, CA, June 12 2027, 60 guests', 'no lodging words'],
])('(control) %s — %s: not a said trip', (s) => { expect(said(p(s))).toBe(false); });
