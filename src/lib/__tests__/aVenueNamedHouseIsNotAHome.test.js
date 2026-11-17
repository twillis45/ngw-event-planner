// Owner, 11/16/2026: "help me find one and location workflows has logic issues".
// setVenue (the one venue write path) guessed "private home" from a bare
// substring: any venue whose name CONTAINED house, home, place, yard or garden.
// "The Boathouse", "Riverside Clubhouse", "Madison Square Garden" and "Union
// Place Hotel" all became the host's home, so the plan dropped venue booking,
// vendor notes said "at my place", and the venue line read "At home in …".
// The creation parser already draws this line by words, not letters
// (smartParseEvent: a possessive or my/our is required); the venue box now does
// too. Stored events the old guess mislabeled are read correctly again.
import { venueFor, setVenue, confirmVenue } from '../venueFor';

const NAMED_PLACES = [
  'The Boathouse', 'Riverside Clubhouse', 'Madison Square Garden', 'Union Place Hotel',
  'The Steakhouse on Main', 'Brookside Gardens', 'Home Depot community room', 'Farmhouse Tavern',
  'Placerville Grange Hall', 'Courtyard by Marriott',
];
const HOMES = [
  'Backyard', 'back yard', 'Home', 'at home', 'My house', 'our place', 'the house',
  "Mom's house", "my sister's place", "Grandma’s backyard", "Mom and Dad's house",
];

test.each(NAMED_PLACES)('"%s" is a venue, not the host’s home', (name) => {
  const patch = setVenue({}, { name });
  expect(patch.venueKind).not.toBe('home');
  expect(venueFor({ ...patch }).isHome).toBe(false);
});

test.each(HOMES)('"%s" is still a home', (name) => {
  expect(setVenue({}, { name }).venueKind).toBe('home');
});

test('an event the old guess mislabeled reads as a venue again', () => {
  const stored = { venue: 'The Boathouse', venueKind: 'home', venueConfirmed: false, venueCity: 'Annapolis', venueState: 'MD' };
  const vf = venueFor(stored);
  expect(vf.isHome).toBe(false);
  expect(vf.displayLine).not.toMatch(/At home/);
});

test('a host who CONFIRMED it is their home is never second-guessed', () => {
  const stored = { venue: 'The Carriage House', ...confirmVenue({}, { kind: 'home' }) };
  expect(venueFor(stored).isHome).toBe(true);
});

test('a home kind the creation step set for an address-only home is kept', () => {
  const stored = { venue: '12 Sample Rd', venueKind: 'home', venueConfirmed: false, venueCity: 'Pasadena', venueState: 'MD' };
  expect(venueFor(stored).isHome).toBe(true);
});
