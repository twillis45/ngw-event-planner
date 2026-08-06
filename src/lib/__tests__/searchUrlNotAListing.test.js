// ─── THE APP MUST RECOGNISE ITS OWN LINK ───────────────────────────────────
//
// Reported live 2026-08-03: pasting the exact URL the app builds —
//   https://www.airbnb.com/s/Santa-Fe--NM/homes?checkin=…&adults=10
// answered "Nothing readable in that — paste a listing link, or the whole
// results page."
//
// Accurate and useless. The extractor only recognises LISTING urls, and a
// search page is not one — but the host did not invent that link, WE handed it
// to them. Answering as though they pasted junk is our defect.
const { looksLikeSearchUrl, looksLikeHotelsResultsPage, lodgingSearchLinks } = require('../lodgingIntel');

const EV = {
  id: 'ev-su', name: 'Mom’s 80th', type: 'Birthday',
  date: '2028-06-17', endDate: '2028-06-21', isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM', guestCount: 10,
  budget: [], vendors: [], guests: [],
};

describe('a search link is named, not dismissed', () => {
  it('recognises every door the app itself opens', () => {
    const links = lodgingSearchLinks(EV);
    expect(links.length).toBe(3);
    for (const l of links) {
      expect(`${l.id}:${looksLikeSearchUrl(l.href)}`).toBe(`${l.id}:${l.id}`);
    }
  });

  it('recognises the exact URL from the live report', () => {
    expect(looksLikeSearchUrl(
      'https://www.airbnb.com/s/Santa-Fe--NM/homes?checkin=2028-06-17&checkout=2028-06-21&adults=10&price_max=4800&pets=1'
    )).toBe('airbnb');
  });

  it('does NOT mistake a real listing for a search', () => {
    expect(looksLikeSearchUrl('https://www.airbnb.com/rooms/20421338?adults=10')).toBeNull();
    expect(looksLikeSearchUrl('https://www.vrbo.com/1234567')).toBeNull();
  });

  it('does not fire on a pasted results PAGE — that one really is readable', () => {
    expect(looksLikeSearchUrl('Cabin in McHenry\n4 bedrooms\n$1,200 for 2 nights')).toBeNull();
    expect(looksLikeSearchUrl('')).toBeNull();
    expect(looksLikeSearchUrl(null)).toBeNull();
  });
});

// HONEST COPY, NOT A SILENT DEAD END (host, 2026-08-05). Unlike Airbnb and
// Vrbo, Hotels has no card parser — no verified Google results fixture to
// build one against. looksLikeSearchUrl() only catches a BARE search link
// (no whitespace); a host who genuinely pastes the whole Hotels results
// page needs a DIFFERENT, honest message, not the generic "tap Share, then
// Copy Link" line that implies retrying would work.
describe('an unreadable Hotels results page is named honestly, not treated as junk', () => {
  it('recognizes a pasted Google Travel/Hotels page even though it is not a bare url', () => {
    const page = '<div><a href="/travel/hotels/entity/abc"></a><span>La Fonda on the Plaza</span>'
      + '<span>$389/night</span></div>';
    expect(looksLikeHotelsResultsPage(page)).toBe(true);
  });

  it('does not fire on an Airbnb or Vrbo page, or on prose with no Google Travel marker', () => {
    expect(looksLikeHotelsResultsPage('<a href="/rooms/123"></a><span>Home in Santa Fe</span>')).toBe(false);
    expect(looksLikeHotelsResultsPage('Cabin in McHenry, 4 bedrooms, $1,200')).toBe(false);
    expect(looksLikeHotelsResultsPage('')).toBe(false);
    expect(looksLikeHotelsResultsPage(null)).toBe(false);
  });
});
