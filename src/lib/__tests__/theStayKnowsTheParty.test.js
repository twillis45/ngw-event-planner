// Owner, 11/16/2026: "Venue is related to where everyone stays." The 40-host
// lodging run found Where everyone stays never used the venue it held: the
// hotel search looked across the whole town, so rooms could land far from the
// party. When the party has a named venue, the hotel door searches near it.
import { lodgingSearchLinks } from '../lodgingIntel';

const trip = { type: 'Birthday', date: '2027-06-11', endDate: '2027-06-13', venueCity: 'Anaheim', venueState: 'CA', guestEstimate: 60, isDestination: true };
const hotels = (ev) => decodeURIComponent((lodgingSearchLinks(ev).find((d) => /hotel/i.test(d.label || d.key || '')) || {}).href || '');

test('with a venue, the hotel door searches near it', () => {
  expect(hotels({ ...trip, venue: 'House of Blues Anaheim', venueKind: 'venue' })).toMatch(/q=hotels near House of Blues Anaheim, Anaheim, CA/);
});
test('with no venue yet, it searches the town as before', () => {
  expect(hotels(trip)).toMatch(/q=hotels in Anaheim, CA/);
});
test('a home is never named to a search engine', () => {
  expect(hotels({ ...trip, venue: 'Backyard', venueKind: 'home' })).toMatch(/q=hotels in Anaheim, CA/);
});

// "That's the plan, not booked" (and "Guests stay at the party hotel too") left
// the screen on "Go find some places." — the host had just said where everyone
// is staying. A named plan is a pick: "Lock one in." Never "on the books".
import { lodgingStage, STAY_FROM_PLAN, STAY_FROM_CONFIRMATION } from '../lodgingIntel';
test('a stay named as the plan is the pick, not more looking — and not booked', () => {
  expect(lodgingStage({ ...trip, lodging: { hotelName: 'Hotel Fera', from: STAY_FROM_PLAN } }).stage).toBe('picked');
  expect(lodgingStage({ ...trip, lodging: { hotelName: 'Hotel Fera', from: STAY_FROM_CONFIRMATION } }).stage).toBe('booked');
  expect(lodgingStage(trip).stage).toBe('looking');
});
