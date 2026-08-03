// ─── DESTINATION DETECTION ────────────────────────────────────────────────
//
// `isDestination` is the ONE flag the whole travel stack gates on: travelPlan
// returns relevant:false without it, destinationDecisionsFor returns [], the
// destination tasks and vendor categories never layer on. A miss therefore does
// not degrade the experience — it silently deletes the feature, and the board
// leads with food instead of lodging and transport.
//
// Two failures were driven from the create screen:
//   1. "18 people flying in" did not match `fly (?:in|out)` — the pattern wanted
//      the bare stem, so the ordinary gerund missed.
//   2. "Weekend trip to Asheville" had no keyword at all and depended on a
//      strict "City, ST" parse, which a bare city name never satisfies.
// And one that had not been noticed: any resolved city set the flag, so a
// gathering in the host's OWN city was flagged as a destination event.
import { parseSmartEventText } from '../smartParseEvent';

const d = (text, opts) => parseSmartEventText(text, opts).isDestination;

describe('destination detection — travel language', () => {
  test.each([
    ['Retirement party in Charleston, 18 people flying in, September 14'],
    ['Reunion where most of the family is flying in for the weekend'],
    ['Booking flights for 20 people in June'],
    ['Weekend trip to Asheville for my dad turning 70, 12 of us'],
    ['Destination wedding in Tulum for 40'],
    ['Birthday getaway for 14'],
    ['Company retreat for 30 in the spring'],
    ['Cousins coming in from Texas for the anniversary'],
    ['Out-of-town guests for the reunion'],
    ['Everyone is driving up for a long weekend'],
  ])('flags: %s', (text) => {
    expect(d(text)).toBe(true);
  });
});

describe('destination detection — local events stay local', () => {
  test.each([
    ['Retirement dinner at home for 18'],
    ['Backyard cookout for 30 in July'],
    ['Birthday party at my place next Saturday'],
    ['Graduation lunch for 12'],
  ])('does not flag: %s', (text) => {
    expect(d(text)).toBe(false);
  });
});

describe('destination detection — the home comparison', () => {
  const HOME = { homeCity: 'Annapolis', homeState: 'MD' };

  test('a city that is NOT the host area flags', () => {
    expect(d('Anniversary dinner in Savannah, Georgia for 20', HOME)).toBe(true);
  });

  test('the host OWN city does not flag — this used to be a false positive', () => {
    expect(d('Anniversary dinner in Annapolis, Maryland for 20', HOME)).toBe(false);
  });

  test('case and punctuation do not change the comparison', () => {
    expect(d('Dinner in annapolis, MD', { homeCity: 'ANNAPOLIS' })).toBe(false);
  });

  test('travel language OVERRIDES the home comparison — guests still travel in', () => {
    // The flag gates "how many guests are traveling in" and "how are guests
    // staying". Those are live even when the party is in the host's own town.
    expect(d('Reunion in Annapolis, Maryland — 20 cousins flying in', HOME)).toBe(true);
  });

  test('with no host area on file, a named place still flags (prior behaviour)', () => {
    expect(d('Anniversary dinner in Savannah, Georgia for 20')).toBe(true);
  });
});

describe('destination detection — provenance', () => {
  test('a decision carries WHY, so the chip can attribute it', () => {
    expect(parseSmartEventText('20 people flying in').destinationBasis).toBe('travel-language');
    expect(parseSmartEventText('Dinner in Savannah, Georgia', { homeCity: 'Annapolis' }).destinationBasis)
      .toBe('place-differs-from-your-area');
    expect(parseSmartEventText('Backyard cookout for 30').destinationBasis).toBe(null);
  });
});

describe('destination detection — the flag never invents a location', () => {
  test('a bare city used only for the away comparison does not become venueCity', () => {
    const p = parseSmartEventText('Weekend trip to Asheville for 12');
    expect(p.isDestination).toBe(true);
    // parseVenueLocation's strict "City, ST" gate still governs what is
    // COMMITTED — a guessed state is worse than asking.
    expect(p.venueCity || '').toBe('');
  });
});
