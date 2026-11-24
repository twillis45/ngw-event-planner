// ─── THE MAP AND THE GEOCODER ARE ASKED WITH THE ZIP (owner's invite, 11/24/2026) ──
//
// venueFor.mapsQuery (the guest page's Directions link) names the ZIP with the
// town, and a ZIP alone is a query. venueGeoQuery is what the weather, the
// airports and the guest's "tell me when I'm close" geocode: the ZIP when it
// is known, else "City, ST, US", else the city. Made-up places only.
import { venueFor, venueGeoQuery } from '../venueFor';

const HOME = {
  name: 'Aunt Rosa’s Dinner', type: 'Dinner Party', recordKind: 'host_event', date: '2027-12-04',
  venueKind: 'home', venueAddress: '42 Elm Ct', venueCity: 'Springfield', venueState: 'VA', venueZip: '22150',
};
const LINE = '42 Elm Ct, Springfield, VA 22150';

describe('the maps query and the geocode carry the ZIP', () => {
  test('a full address', () => {
    expect(venueFor(HOME).mapsQuery).toBe(LINE);
    expect(venueGeoQuery(HOME)).toBe('22150');
  });
  test('a ZIP alone is the query', () => {
    const ev = { venue: 'Home', venueKind: 'home', venueCity: '22150', venueZip: '22150' };
    expect(venueFor(ev).mapsQuery).toBe('22150');
    expect(venueGeoQuery(ev)).toBe('22150');
  });
  test('a named place with a town and a ZIP', () => {
    const ev = { venue: 'The Willow Room', venueCity: 'Springfield', venueState: 'VA', venueZip: '22150' };
    expect(venueFor(ev).mapsQuery).toBe('The Willow Room, Springfield, VA 22150');
  });
  test('a name that carries its town', () => {
    expect(venueFor({ venue: 'VFW Post 3150 — Alexandria, VA', venueZip: '22314' }).mapsQuery)
      .toBe('VFW Post 3150 — Alexandria, VA 22314');
  });
  test('no ZIP: the town, as before', () => {
    expect(venueGeoQuery({ venueCity: 'Springfield', venueState: 'VA' })).toBe('Springfield, VA, US');
    expect(venueGeoQuery({ venueCity: 'Springfield' })).toBe('Springfield');
    expect(venueGeoQuery({ venue: 'The Willow Room' })).toBe('');
  });
});
