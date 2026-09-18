// ─── A NAMED CITY IS A PLACE, EVEN WITHOUT A STATE ─────────────────────────
//
// Found by probing the intake parser (2026-08-03). `isDestination` derived
// placeName from exactly two sources: `loc` (parseVenueLocation, which REQUIRES
// a state) and `awayPlace` (which requires a travel verb followed by "to").
//
// "Family reunion in Asheville Aug 3 to Aug 7 2027, 24 people" satisfies
// neither, so placeName was '' → placeAway false → isDestination FALSE, on a
// five-day event with a city named in plain English.
//
// That is not a cosmetic miss. isDestination === true gates the lodging axis
// (phaseProgress), kitchenConsequence, the reveal's lodging stage, and
// foodSpanNote. One missed boolean removed the whole destination stack.
//
// ⚠ HEADER AMENDED 2026-09-18 (CITY-SAID-1). The paragraph that stood here said
// the captured place "must never become venueCity". That conflated two facts:
// the CITY (her word) and the STATE (our guess). Measured over the seed corpus
// on 2026-09-18, refusing both threw the town away in three of seven real
// sentences — and the town gates weather, the shopping list, lodging search and
// maps, the same "whole stack removed by one missing value" failure this file
// was written about. So the captured place now DOES become venueCity when it is
// a name in the curated usCities whitelist, and NEVER carries a state.
// parseVenueLocation — what the sentence above was really defending — is
// untouched and still refuses a bare city at every seam that commits a
// location. See spokenCityGate.test.js for both properties, and the test below
// for this file's own version.
const { parseSmartEventText } = require('../smartParseEvent');

describe('a bare "in <City>" counts as a place', () => {
  it('flags the case that was silently missed', () => {
    const r = parseSmartEventText('Family reunion in Asheville Aug 3 to Aug 7 2027, 24 people');
    expect(r.isDestination).toBe(true);
    expect(r.date).toBe('2027-08-03');
    expect(r.endDate).toBe('2027-08-07');
  });

  it('carries the town she named, and still refuses to invent its state', () => {
    const r = parseSmartEventText('Family reunion in Asheville Aug 3 to Aug 7 2027');
    // The flag flips; the town is recorded as typed; the STATE is not invented.
    expect(r.isDestination).toBe(true);
    expect(r.venueCity).toBe('Asheville');
    expect(r.venueState || '').toBe('');
  });

  it('keeps working when the state IS given', () => {
    const r = parseSmartEventText('Mom’s 80th birthday in Santa Fe, New Mexico June 17-21 2028, 10 people');
    expect(r.isDestination).toBe(true);
    expect(r.venueCity).toBe('Santa Fe');
    expect(r.date).toBe('2028-06-17');
    expect(r.endDate).toBe('2028-06-21');
  });

  it('does not mistake a month or a weekday for a town', () => {
    for (const s of ['Birthday dinner in June', 'Dinner in Saturday', 'Party in December 2027']) {
      const r = parseSmartEventText(s);
      expect(`${s} -> ${r.isDestination}`).toBe(`${s} -> false`);
    }
  });

  it('respects the host’s own area — same town is not a destination', () => {
    const away = parseSmartEventText('Reunion in Asheville Aug 3 to Aug 7 2027', { homeCity: 'Annapolis' });
    expect(away.isDestination).toBe(true);

    const home = parseSmartEventText('Reunion in Annapolis Aug 3 to Aug 7 2027', { homeCity: 'Annapolis' });
    expect(home.isDestination).toBe(false);
  });

  it('records how it decided, so the host can see the basis', () => {
    const r = parseSmartEventText('Reunion in Asheville Aug 3 to Aug 7 2027');
    expect(r.destinationBasis).toBeTruthy();
  });
});
