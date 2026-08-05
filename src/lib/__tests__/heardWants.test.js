// ── SHE ASKED FOR A SPA (host, 2026-08-05) ──────────────────────────────────
// "80th birthday for Linda Stewart, 10 of us, Santa Fe, NM resort spa" — the
// parser kept the town and dropped "resort spa", so the requirement list
// proposed six things she never mentioned and missed the one she did, while a
// hot-tub filter VERIFIED against Airbnb's own search sat unused in this file.
import { heardMustHaves, heardStayStyle, suggestedMustHaves, mustHavesFor, lodgingSearchLinks } from '../lodgingIntel';

const linda = (over) => ({
  id: 'sf', type: 'Birthday', date: '2027-06-17', endDate: '2027-06-21',
  venueCity: 'Santa Fe', venueState: 'NM', guestCount: 10, totalBudget: 4000,
  isDestination: true, honoree: 'Linda', guests: [], ...over,
});

describe('the amenity the host actually asked for', () => {
  // HOST CORRECTION 2026-08-05: "resort spa is a type of property not a hot tub."
  // The first cut read it as an amenity request because the hot-tub matcher
  // lists "spa" — right for a listing's prose, wrong for a host's sentence.
  test('"resort spa" is the kind of place, and never becomes an amenity', () => {
    const said = '80th birthday for Linda Stewart, 10 of us, Santa Fe, NM resort spa, June 17-21';
    expect(heardStayStyle(said)).toBe('resort spa');
    expect(heardMustHaves(said)).toEqual([]);
  });

  test('a feature she really did ask for is still heard', () => {
    expect(heardMustHaves('lake house with a hot tub')).toContain('hottub');
    expect(heardMustHaves('reunion at the lake house with a pool and pets welcome'))
      .toEqual(expect.arrayContaining(['pool', 'pets']));
  });

  test('the style she named leads the hotel search and the claim beside it', () => {
    const [, , hotels] = lodgingSearchLinks(linda({ lodgingStyle: 'resort spa' }));
    expect(decodeURIComponent(hotels.href)).toContain('resort spa in Santa Fe, NM');
    expect(hotels.applied).toContain('resort spa');
  });

  test('nothing is invented from a sentence that names no amenity', () => {
    expect(heardMustHaves('family reunion in Deep Creek Lake, MD, 24 of us, June 17-21')).toEqual([]);
    expect(heardMustHaves('')).toEqual([]);
  });

  test('what she said LEADS the proposal, and says where it came from', () => {
    const musts = suggestedMustHaves(linda({ lodgingWants: ['hottub'] }));
    expect(musts[0].id).toBe('hottub');
    expect(musts[0].why).toMatch(/you said so/i);
    // and the inferred ones still follow
    expect(musts.map((m) => m.id)).toEqual(expect.arrayContaining(['realbeds', 'baths', 'parking']));
  });

  test('and it reaches the search as a REAL filter, not just a chip', () => {
    const [ab] = lodgingSearchLinks(linda({ lodgingWants: ['hottub'] }));
    expect(ab.href).toContain('amenities%5B%5D=25');     // Airbnb's own verified hot-tub filter
    expect(ab.applied).toContain('hot tub');
  });

  test('a host who edits the list still wins outright', () => {
    const ev = linda({ lodgingWants: ['hottub'], lodgingMustHaves: ['pool'] });
    expect(mustHavesFor(ev).map((m) => m.id)).toEqual(['pool']);
  });
});
