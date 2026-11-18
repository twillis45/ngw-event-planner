// A STREET TYPED AS THE VENUE IS THE ADDRESS (owner report, 11/18/2026).
//
// The host typed "271 Whitaker Rd, Pasadena MD" in the venue field. With no
// comma before the state the town parser leaves it whole, so it was stored as
// the venue NAME and venueAddress stayed empty. The Space sheet then said
// "Venue / location — Set: 271 Whitaker Rd, Pasadena MD, Pasadena" directly
// above "Guest arrival — Add your street address so guests know exactly where
// to go." One fact, asked for twice. The street she typed is the address.
import { venueFor } from '../venueFor';
import { derivePlaceIntelligence } from '../placeIntelligence';

const ev = (extra = {}) => ({
  id: 'e', type: 'Game Night', recordKind: 'host_event', venueKind: 'home', venueConfirmed: true,
  venue: '271 Whitaker Rd, Pasadena MD', venueCity: 'Pasadena', ...extra,
});
const arrival = (e) => derivePlaceIntelligence(e).sections.find((s) => s.key === 'arrival');

test('a street typed in the venue field counts as the address', () => {
  expect(venueFor(ev()).address).toBe('271 Whitaker Rd, Pasadena MD');
});

test('guest arrival does not ask for the street she already typed', () => {
  const a = arrival(ev());
  expect(a.state).toBe('handled');
  expect(a.detail).not.toMatch(/Add your street address/i);
});

test('the place line does not repeat the town already in it', () => {
  expect(venueFor(ev()).displayLine).toBe('271 Whitaker Rd, Pasadena MD');
});

test('a venue name is still not an address', () => {
  for (const venue of ['The Boathouse', 'VFW Post 3150', '21 Club', '3 Brothers Pizza']) {
    expect(venueFor(ev({ venue, venueKind: 'venue' })).address).toBe('');
  }
});

test('an explicit venueAddress still wins', () => {
  expect(venueFor(ev({ venueAddress: '9 Elm St, Pasadena, MD' })).address).toBe('9 Elm St, Pasadena, MD');
});
