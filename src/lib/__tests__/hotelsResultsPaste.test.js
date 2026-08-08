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
const { extractListingCandidates, looksLikeHotelsResultsPage, looksLikeHotelDetailPage } = require('../lodgingIntel');
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

  // ── REVERSED 2026-08-06 BY THE REVIEW BOARD ──────────────────────────────
  // This used to assert `ojo.photo` matched `https://lh3.googleusercontent.com/`
  // — it locked IN a bypass. The rental path runs every card image through
  // isAllowedMedia; this path stored it raw, and Google's CDN is not on
  // MEDIA_HOSTS. The Liability seat found the consequence: `lodgingOptions` is
  // guest-published (backend/app/routers/rsvp.py:105) and InviteV2 renders the
  // photos, so an unallowlisted host fires from EVERY GUEST'S BROWSER on a
  // public invite — telling that host who is reading a private guest list.
  //
  // Widening MEDIA_HOSTS to admit Google was the obvious fix and is the wrong
  // one, for precisely that reason. The row arrives without a photo instead,
  // and the card says so in words it already had.
  test('a Google-hosted card image is REFUSED — it never cleared the media allowlist', () => {
    const { candidates } = extractListingCandidates(GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML);
    const ojo = candidates.find((c) => c.name === 'Ojo Santa Fe Spa Resort');
    expect(ojo.photo).toBe('');
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

// ─── WHAT THE REVIEW BOARD FOUND, LOCKED (2026-08-06) ───────────────────────
// Eight seats sat on a proposal to capture a booking URL off a pasted property
// DETAIL view. The board KILLED it — the one real link on that page is a bare
// homepage carrying no dates and no party (measured live), and both override
// seats ruled the per-property paste costs the host more than it returns.
//
// What the board found on the way is what these lock: defects already shipped,
// on a surface the host is using now.
describe('the board’s findings, held down', () => {
  test('one hotel’s page is refused outright — it used to become a row called "Visit site"', () => {
    // The detail view satisfies looksLikeHotelsResultsPage (it carries both
    // `travel/hotels` and lh3.googleusercontent.com), so it fell into the card
    // parser, which groups on the <a> BOUNDARY and discards everything before
    // the first anchor — the name, the price and the rating all sit above the
    // Visit-site button. The first text AFTER that anchor became the name, and
    // the row committed with sources:{label:'read'}: fabricated provenance,
    // which UX_08 forbids outright.
    const detail = `
      <div>google.com/travel/hotels/entity/ChgI29</div>
      <div>Overview</div><div>Prices</div><div>Reviews</div>
      <div>Location</div><div>About</div><div>Photos</div>
      <div>Eldorado Hotel and Spa</div><div>4-star hotel</div>
      <a href="https://www.eldoradohotel.com/"><span><button>Visit site</button></span></a>
      <div>Hot tub</div><div>Spa</div>
      <img src="https://lh3.googleusercontent.com/x" />
    `;
    expect(looksLikeHotelDetailPage(detail)).toBe(true);
    const { candidates, source } = extractListingCandidates(detail);
    expect(candidates).toEqual([]);
    expect(source).toBe('HotelsDetail');
    expect(candidates.some((c) => /visit site/i.test(c.name || ''))).toBe(false);
  });

  test('a real results page is still read, and is NOT mistaken for one hotel’s page', () => {
    expect(looksLikeHotelDetailPage(GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML)).toBe(false);
    const { candidates, source } = extractListingCandidates(GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML);
    expect(source).toBe('Hotels');
    expect(candidates.length).toBeGreaterThan(1);
  });

  test('a hotel price is marked as a NIGHTLY rate, never a stay total', () => {
    // Google's own control reads "Nightly price with fees"; a live 4-night
    // Santa Fe search returned $125–$258 where a stay total would be ~4x that.
    // The Airbnb/Vrbo card sharing this field quotes a stay TOTAL, so without
    // a basis the caller stored one room-night as the whole stay and the
    // per-person split divided it across the entire party.
    const { candidates } = extractListingCandidates(GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML);
    const priced = candidates.filter((c) => c.priceShown != null);
    expect(priced.length).toBeGreaterThan(0);
    for (const c of priced) expect(c.priceBasis).toBe('night');
  });
});

// ─── THE SAME DEFECT IN URL FORM (2026-08-07) ──────────────────────────────
// The 2026-08-06 guard fires on the tab strip, which is visible TEXT. A pasted
// LINK carries none, so a single-property URL slipped straight past it. Driven
// through the predicates before the fix: looksLikeHotelsResultsPage true,
// looksLikeHotelDetailPage false, zero candidates — so LodgingCockpit fell to
// its hotelsPage branch and told the host "copy the whole list (⌘A then ⌘C)"
// while she was on ONE hotel's page. That instruction cannot succeed there.
describe('pasting ONE hotel’s Google URL', () => {
  const ENTITY_URL = 'https://www.google.com/travel/hotels/entity/CgsIx4van-nQ0d6UARAB';
  const ENTITY_URL_Q = `${ENTITY_URL}?q=Ojo%20Santa%20Fe&g2lb=1`;

  test('a bare entity URL is one hotel’s page, with or without a query', () => {
    expect(looksLikeHotelDetailPage(ENTITY_URL)).toBe(true);
    expect(looksLikeHotelDetailPage(ENTITY_URL_Q)).toBe(true);
    // Surrounding whitespace is what a real copy carries.
    expect(looksLikeHotelDetailPage(`\n  ${ENTITY_URL_Q}  \n`)).toBe(true);
  });

  test('it names itself HotelsDetail rather than yielding a nameless row', () => {
    const { candidates, source } = extractListingCandidates(ENTITY_URL_Q);
    expect(candidates).toEqual([]);
    expect(source).toBe('HotelsDetail');
  });

  test('the RESULTS url is still a search link, not one hotel’s page', () => {
    // /travel/search is the door lodgingSearchLinks() hands the host. If the
    // new clause caught it, the search-link copy would be replaced by "that's
    // one hotel's page" — wrong, and it would break the offer-to-read path.
    expect(looksLikeHotelDetailPage('https://www.google.com/travel/search?q=resort%20santa%20fe')).toBe(false);
  });

  test('the entity clause is anchored — a page that MENTIONS one is not one', () => {
    // Anchored ^…$, so the whole payload must BE the link. Without that, a
    // results page carrying a single entity href would be refused outright and
    // every hotel on it thrown away.
    const mentions = `${GOOGLE_HOTELS_SANTA_FE_RESULTS_HTML}<a href="${ENTITY_URL}">More</a>`;
    expect(looksLikeHotelDetailPage(mentions)).toBe(false);
    expect(extractListingCandidates(mentions).candidates.length).toBeGreaterThan(1);
  });
});
