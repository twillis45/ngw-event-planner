// parseVenueLocation — the stricter venue-check gate. A bare city ("Annapolis")
// used to be accepted and geocoded alone (limit=1), silently resolving the
// wrong same-named city in another state (Springfield, Arlington, etc.).
// Now requires "City, ST" / "City, State Name" or a 5-digit ZIP.
import { parseVenueLocation } from '../cityText';

describe('parseVenueLocation', () => {
  test('accepts "City, ST"', () => {
    expect(parseVenueLocation('Annapolis, MD')).toEqual({ city: 'Annapolis', state: 'MD' });
  });
  test('accepts "City, State Name" (case-insensitive)', () => {
    expect(parseVenueLocation('Silver Spring, maryland')).toEqual({ city: 'Silver Spring', state: 'MD' });
  });
  test('accepts a 5-digit ZIP', () => {
    expect(parseVenueLocation('21401')).toEqual({ zip: '21401' });
  });
  test('accepts a ZIP+4 by keeping the 5-digit prefix', () => {
    expect(parseVenueLocation('21401-1234')).toEqual({ zip: '21401' });
  });
  test('rejects a bare city with no state — this is the whole point of the fix', () => {
    expect(parseVenueLocation('Annapolis')).toBeNull();
    expect(parseVenueLocation('Springfield')).toBeNull();
  });
  test('rejects an unrecognized state token', () => {
    expect(parseVenueLocation('Anytown, Narnia')).toBeNull();
  });
  test('rejects empty/whitespace', () => {
    expect(parseVenueLocation('')).toBeNull();
    expect(parseVenueLocation('   ')).toBeNull();
  });
  test('rejects an address-shaped string (digits, not a ZIP)', () => {
    expect(parseVenueLocation('123 Main St, Annapolis, MD')).toBeNull();
  });
});
