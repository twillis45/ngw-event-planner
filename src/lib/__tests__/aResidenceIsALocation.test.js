// Owner acceptance run, 11/5/2026 (issue #100, D-4). Creation saved a street
// address with no venue name; HostHome said "Where it happens · handled" while
// the Venue sheet showed an empty box, and nothing could say "this is my home"
// or that the host had confirmed it. These were RED on venueFor.js as it stood.
import { venueFor, setVenue, confirmVenue } from '../venueFor';

const fromCreation = { venue: '', venueKind: '', venueAddress: '12 Sample Rd', venueCity: 'Pasadena', venueState: 'MD' };

test('an address-only place has something to show', () => {
  const vf = venueFor(fromCreation);
  expect(vf.isSet).toBe(true);
  expect(vf.display).toBe('12 Sample Rd');
});

test('a named venue still shows its name', () => {
  expect(venueFor({ ...fromCreation, venue: 'The Ironwood Room' }).display).toBe('The Ironwood Room');
});

test('supplied is not confirmed', () => {
  expect(venueFor(fromCreation).confirmed).toBe(false);
});

test('the host can confirm a private home without any business search', () => {
  const patch = confirmVenue(fromCreation, { kind: 'home' });
  expect(patch).toEqual({ venueKind: 'home', venueConfirmed: true });
  const vf = venueFor({ ...fromCreation, ...patch });
  expect(vf.isHome).toBe(true);
  expect(vf.confirmed).toBe(true);
  expect(vf.display).toBe('12 Sample Rd');
});

test('the host can confirm it is a venue instead', () => {
  const vf = venueFor({ ...fromCreation, ...confirmVenue(fromCreation, { kind: 'venue' }) });
  expect(vf.isHome).toBe(false);
  expect(vf.confirmed).toBe(true);
});

test('only home or venue can be confirmed', () => {
  expect(() => confirmVenue(fromCreation, { kind: 'booked' })).toThrow();
});

test('changing the place clears the confirmation, so a new address is asked about again', () => {
  const confirmed = { ...fromCreation, ...confirmVenue(fromCreation, { kind: 'home' }) };
  const edited = { ...confirmed, ...setVenue(confirmed, { name: '40 Other St, Pasadena, MD' }) };
  expect(venueFor(edited).confirmed).toBe(false);
});
