// ─── THE RESTAURANT RATE NEEDS A RESTAURANT (queued from #222) ───────────────
//
// The celebration dinner's money uses the restaurant per-head rate
// (boxedlunch-restaurant-2026) only when the place's name or kind says it is a
// restaurant. Otherwise — a courtyard, a house, a hall — the dinner is priced
// by the Spread's own line rules.
//
// ONE READER for "what kind of place is this": knownFacts.placeKindOfName, the
// word list the venue calls already use (venueKindOf). tripFood used to carry a
// second, shorter list, so a "café" or a "grill" was a restaurant to the venue
// call and not to the money; and it pooled the said place and the booked
// venue's words, so "a restaurant" said at creation priced a hall booked later.
import { tripFoodMoney, celebrationAtRestaurant } from '../tripFood';
import { placeKindOfName, venueKindOf } from '../knownFacts';

const SF = (extra = {}) => ({
  id: 'sf', name: 'Mom’s 80th Birthday', honoree: 'Mom', type: 'Birthday',
  date: '2027-06-14', endDate: '2027-06-17', venueCity: 'Santa Fe', venueState: 'NM',
  guestMode: 'count', guestEstimate: 30, isDestination: true, guestsStayOvernight: true,
  travelMode: 'fly', timeOfDay: 'evening',
  celebration: { place: 'adobe courtyard' },
  ...extra,
});
const est = { low: 900, high: 1400 };
const basis = (ev) => tripFoodMoney(ev, { foodEstimate: est }).celebration.basis;

describe('the acceptance case: an adobe courtyard is not a restaurant', () => {
  test('the Spread\'s line rules price it', () => {
    expect(celebrationAtRestaurant(SF())).toBe(false);
    expect(tripFoodMoney(SF(), { foodEstimate: est }).celebration).toMatchObject({ basis: 'spread', low: 900, high: 1400 });
  });
});

describe('the restaurant rate applies when the name or kind says restaurant', () => {
  test.each([
    ['a restaurant on the plaza'],
    ['café on the plaza'],
    ['the Canyon Road Grill'],
    ['a steakhouse'],
  ])('she said "%s"', (place) => {
    expect(basis(SF({ celebration: { place } }))).toBe('restaurant');
  });
  test.each([
    ['La Plazuela Café'],
    ['Coyote Grill'],
    ['The Kitchen on Canyon'],
  ])('the booked venue is "%s"', (venue) => {
    expect(basis(SF({ venue }))).toBe('restaurant');
  });
});

describe('otherwise the line rules: courtyard, house, hall', () => {
  test.each([
    ['adobe courtyard'], ['the house'], ['a rented house'], ['the community hall'], ['a garden'],
  ])('she said "%s"', (place) => {
    expect(basis(SF({ celebration: { place } }))).toBe('spread');
  });
  test('a hall booked in Venue outranks "a restaurant" said at creation', () => {
    expect(basis(SF({ celebration: { place: 'a restaurant' }, venue: 'Santa Fe Woman’s Club Hall' }))).toBe('spread');
  });
  test('a booked venue whose name says no kind keeps the kind she said', () => {
    expect(basis(SF({ celebration: { place: 'a restaurant' }, venue: 'Casa Alegria' }))).toBe('restaurant');
    expect(basis(SF({ celebration: { place: 'adobe courtyard' }, venue: 'Casa Alegria' }))).toBe('spread');
  });
});

test('one reader: the venue call and the money read the same kind', () => {
  for (const name of ['Coyote Grill', 'La Plazuela Café', 'Community Hall', 'Adobe Courtyard', 'The Steakhouse']) {
    expect(placeKindOfName(name)).toBe(venueKindOf({ venue: name }).kind);
  }
});
