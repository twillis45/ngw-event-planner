// venueFor — the one venue reader (tokenization audit 2026-07-27). Locks the
// at-home carve-out, the CITY-LEAK gate riding inside, phantom-field refusal,
// and the maps-query preference order.

import { venueFor } from '../venueFor';

describe('venueFor', () => {
  test('named venue: set, display, maps', () => {
    const v = venueFor({ venue: 'VFW Post 3150', venueCity: 'Alexandria', venueState: 'VA' });
    expect(v.isSet).toBe(true);
    expect(v.isHome).toBe(false);
    expect(v.displayLine).toBe('VFW Post 3150, Alexandria');
    expect(v.mapsQuery).toBe('VFW Post 3150, Alexandria, VA');
  });

  test('at-home carve-out: city alone sets the venue', () => {
    const v = venueFor({ venueKind: 'home', venueCity: 'Decatur' });
    expect(v.isSet).toBe(true);
    expect(v.isHome).toBe(true);
    expect(v.displayLine).toBe('At home in Decatur');
  });

  test('named-venue event without a name is NOT set, even with a city', () => {
    expect(venueFor({ venueKind: 'venue', venueCity: 'Decatur' }).isSet).toBe(false);
  });

  test('CITY-LEAK gate: a polluted venueCity never escapes as a city', () => {
    const v = venueFor({ venue: 'VFW Post 3150', venueCity: 'VFW Post 3150 — Alexandria, VA' });
    expect(v.city).toBe('');
    expect(v.displayLine).toBe('VFW Post 3150');
  });

  test('address wins the maps query; home-ish names never map', () => {
    expect(venueFor({ venue: 'Backyard', venueAddress: '12 Elm St, Decatur, GA' }).mapsQuery)
      .toBe('12 Elm St, Decatur, GA');
    expect(venueFor({ venueKind: 'home', venue: 'Backyard', venueCity: 'Decatur', venueState: 'GA' }).mapsQuery)
      .toBe('Decatur, GA');
  });

  test('phantom event.address is refused; structured parts compose', () => {
    const v = venueFor({ address: '99 Ghost Rd', venueStreet: '12 Elm St', venueCity: 'Decatur', venueState: 'GA', venueZip: '30030' });
    expect(v.address).toBe('12 Elm St, Decatur, GA, 30030');
  });

  test('host_event records default to home', () => {
    expect(venueFor({ recordKind: 'host_event' }).isHome).toBe(true);
    expect(venueFor({}).isHome).toBe(false);
  });
});
