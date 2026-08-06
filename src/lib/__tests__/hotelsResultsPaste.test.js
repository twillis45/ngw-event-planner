// ─── HOTELS, WITHOUT A URL TO KEY ON (host, 2026-08-06) ────────────────────
//
// "get a real google page for our hotel and our options/amenities" — captured
// live: a Google Hotels results page for "resort spa in Santa Fe, NM Jun
// 17-Jun 21 for 10 guests", the exact query lodgingSearchLinks() builds for
// the Hotels door.
//
// THE STRUCTURAL FACT THIS LOCKS: every card's <a href> is a Google ad-click
// redirect (/aclk?...&adurl=), not a stable per-hotel URL — unlike Airbnb's
// /rooms/N or Vrbo's /N. extractHotelCandidates groups on the <a> tag
// BOUNDARY, never the href, and never stores it as `url` — real name/price/
// rating/amenities come back, "Open the listing" simply has nothing to
// point at.
const { extractListingCandidates, looksLikeHotelsResultsPage } = require('../lodgingIntel');
const { GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML } = require('../__fixtures__/googleHotelsSantaFeResults');

describe('pasting a real Google Hotels results page', () => {
  test('looksLikeHotelsResultsPage recognizes the real captured page', () => {
    expect(looksLikeHotelsResultsPage(GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML)).toBe(true);
  });

  test('every card on the page becomes a candidate — all 4, not some', () => {
    const { candidates } = extractListingCandidates(GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML);
    expect(candidates).toHaveLength(4);
  });

  test('no candidate carries a url — the ad-redirect is never stored as one', () => {
    const { candidates } = extractListingCandidates(GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML);
    for (const c of candidates) expect(c.url).toBe('');
  });

  test('the real card text yields the name, price, rating and star class', () => {
    const { candidates } = extractListingCandidates(GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML);
    const ojo = candidates.find((c) => c.name === 'Ojo Santa Fe Spa Resort');
    expect(ojo.priceShown).toBe(365);
    expect(ojo.rating).toBe(4.2);
    expect(ojo.ratingCount).toBe('2.2K');
    expect(ojo.starClass).toBe(4);
    expect(ojo.amenities).toEqual(['Hot tub', 'Spa']);
  });

  test('the OTA badge is dropped, not read as a second hotel name — "Expedia.com" style', () => {
    const { candidates } = extractListingCandidates(GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML);
    const fourSeasons = candidates.find((c) => c.name.startsWith('Four Seasons'));
    expect(fourSeasons.amenities).not.toContain('Expedia.com');
    expect(fourSeasons.priceShown).toBe(1457);
    expect(fourSeasons.starClass).toBe(5);
  });

  test('a badge whose alt text duplicates the hotel\'s own name is not read as an amenity — Hilton\'s real card does this', () => {
    const { candidates } = extractListingCandidates(GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML);
    const hilton = candidates.find((c) => c.name === 'Hilton Santa Fe Buffalo Thunder');
    expect(hilton.amenities).toEqual(['Hot tub', 'Spa']);
    expect(hilton.priceShown).toBe(186);
  });

  test('a real photo rides along — the first image in the card, not the OTA branding icon', () => {
    const { candidates } = extractListingCandidates(GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML);
    const ojo = candidates.find((c) => c.name === 'Ojo Santa Fe Spa Resort');
    expect(ojo.photo).toMatch(/^https:\/\/lh3\.googleusercontent\.com\//);
  });

  test('amenities separated by a middle-dot come back as two, not one run-on string', () => {
    const { candidates } = extractListingCandidates(GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML);
    const laFonda = candidates.find((c) => c.name === 'La Fonda on the Plaza');
    expect(laFonda.amenities).toEqual(['Free cancellation', 'Hot tub']);
  });

  test('an Airbnb page is untouched by the hotels path — it still resolves via its own url', () => {
    const airbnbLike = '<div><a href="/rooms/123"></a><span>Home in Santa Fe</span><span>4 beds</span></div>';
    expect(looksLikeHotelsResultsPage(airbnbLike)).toBe(false);
    const { candidates, source } = extractListingCandidates(airbnbLike);
    expect(source).not.toBe('Hotels');
    expect(candidates[0].url).toBe('https://www.airbnb.com/rooms/123');
  });
});
