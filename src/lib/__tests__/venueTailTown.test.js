// ─── "VENUE, CITY, ST" IS A TOWN TOO (2026-08-06, board, mobile seat) ───────
//
// The hero field invites "Name or address". parseVenueLocation is strict and
// reads the WHOLE string, so a town was only ever recovered when the venue field
// contained nothing BUT the town. A host who typed "Casa Alegria, Santa Fe, NM"
// got no town — and the lodging screen then asked her to name it a THIRD time,
// behind a placeholder already showing "Santa Fe, NM" as ghost text. The seat
// named that as the moment she blames herself.
//
// Only the TRAILING pair is tried, through the same strict parser. No leniency
// was added — the parser is untouched.
import { venueFor } from '../venueFor';

const at = (venue) => venueFor({ id: 'v', venue });

describe('a town at the end of a venue string is found', () => {
  test('venue, city, state — the name is kept and the town is lifted out', () => {
    const v = at('Casa Alegria, Santa Fe, NM');
    expect({ name: v.name, city: v.city, state: v.state })
      .toEqual({ name: 'Casa Alegria', city: 'Santa Fe', state: 'NM' });
  });

  test('a venue name containing its own comma survives intact', () => {
    const v = at('The Lodge, Room 2, Santa Fe, NM');
    expect(v.name).toBe('The Lodge, Room 2');
    expect(v.city).toBe('Santa Fe');
  });

  test('a street address with a trailing town recovers the town', () => {
    // The whole string is digit-rejected by the parser; the TAIL is not. This
    // was not predicted — the probe found it, and it is the behaviour a host
    // typing an address actually wants.
    const v = at('1234 Canyon Rd, Santa Fe, NM');
    expect({ city: v.city, state: v.state }).toEqual({ city: 'Santa Fe', state: 'NM' });
    expect(v.name).toBe('1234 Canyon Rd');
  });

  test('the whole-string case is unchanged — the venue name goes empty', () => {
    const v = at('Santa Fe, NM');
    expect({ name: v.name, city: v.city, state: v.state })
      .toEqual({ name: '', city: 'Santa Fe', state: 'NM' });
  });
});

describe('the parser stays strict — these still ask', () => {
  test('no comma before the state is not a town', () => {
    const v = at('Casa Alegria, Santa Fe NM');
    expect(v.city).toBe('');
    expect(v.name).toBe('Casa Alegria, Santa Fe NM');   // nothing was lifted
  });

  test('a plain venue name is left completely alone', () => {
    const v = at('Casa Alegria');
    expect({ name: v.name, city: v.city }).toEqual({ name: 'Casa Alegria', city: '' });
  });

  test('an explicit venueCity always wins over anything parsed', () => {
    const v = venueFor({ id: 'v', venue: 'Casa Alegria, Santa Fe, NM', venueCity: 'Taos', venueState: 'NM' });
    expect(v.city).toBe('Taos');
  });

  test('a two-part venue that is not a place is untouched', () => {
    // Fewer than three parts never reaches the tail branch.
    const v = at('Chicago, Nebraska Room');
    expect(v.city).toBe('');
    expect(v.name).toBe('Chicago, Nebraska Room');
  });
});
