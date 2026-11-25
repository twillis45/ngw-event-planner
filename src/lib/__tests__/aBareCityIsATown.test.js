// ─── A BARE CITY IS A TOWN, NOT A PLACE (cohesion G4, owner 11/24/2026) ──────
//
// Measured on a made-up plan with no venue: typing "Springfield, VA" in the
// Venue box and pressing Save stored `venue: "Springfield, VA"` with no
// venueCity/venueState. saveVenue read typed text with townFieldsToPersist only
// at home; anywhere else it was setVenue({ name }). The invite, family and
// vendor pages then printed the city as the place's name.
//
// Now a typed venue that is only a town (or only a ZIP) is read by the same
// reader as the town chip and saved as the town; the place's name stays empty
// and is asked for later. Anything with a place name or a street is still a place.
import { bareTownFields, bareTownNote } from '../townFieldsToPersist';

describe('bareTownFields — a typed venue that is only a town or a ZIP', () => {
  test('"City, ST" is the town', () => {
    expect(bareTownFields('Springfield, VA')).toEqual({ venueCity: 'Springfield', venueState: 'VA' });
    expect(bareTownFields('  Annapolis, MD ')).toEqual({ venueCity: 'Annapolis', venueState: 'MD' });
  });
  test('a bare ZIP is the town, kept as the ZIP too', () => {
    expect(bareTownFields('22150')).toEqual({ venueCity: '22150', venueZip: '22150' });
  });
  test('a place name, a street, or a place in a town is a place, not a bare town', () => {
    for (const t of ['Elm Court Hall', 'Elm Court Hall, Springfield, VA', '42 Elm Ct, Springfield, VA 22150', 'The Ironwood Room', 'Home', '']) {
      expect(`${t} → ${JSON.stringify(bareTownFields(t))}`).toBe(`${t} → null`);
    }
  });
  test('the note names what was saved and asks for the name later', () => {
    expect(bareTownNote({ venueCity: 'Springfield', venueState: 'VA' })).toBe('Springfield, VA noted. Add the place’s name when you have it.');
    expect(bareTownNote({ venueCity: '22150', venueZip: '22150' })).toBe('22150 noted. Add the place’s name when you have it.');
  });
  // saveVenue reading this before treating the text as a name is asserted where
  // it renders: hostv2/e2e/aBareCityIsATownNotAPlace.spec.mjs.
});
