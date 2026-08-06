// ── A REAL RESULTS PAGE, END TO END (2026-08-05) ─────────────────────────────
// Every prior test of this path used markup we wrote ourselves, which only ever
// proves the parser agrees with our imagination. This one runs the real
// extractor over a REAL Airbnb search — Santa Fe, the exact query
// lodgingSearchLinks() builds for the 80th — captured from the live rendered
// page. See the fixture header for what was reduced and what was not.
import { extractListingCandidates, rankCandidates } from '../lodgingIntel';
import { AIRBNB_SANTA_FE_RESULTS_HTML as REAL } from '../__fixtures__/airbnbSantaFeResults';

describe('pasting a real Airbnb results page', () => {
  const out = extractListingCandidates(REAL);

  test('every card on the page becomes a candidate — not one, not some', () => {
    expect(out.candidates).toHaveLength(6);
    expect(out.source).toBe('Airbnb');
    expect(out.linksOnly).toBe(false);          // real cards carry facts, not bare links
  });

  test('each candidate carries the listing URL the host would open', () => {
    for (const c of out.candidates) expect(c.url).toMatch(/^https:\/\/www\.airbnb\.com\/rooms\/\d+$/);
    expect(new Set(out.candidates.map((c) => c.url)).size).toBe(6);   // no card swallowed another
  });

  test('the real card text yields the name, the beds and the price', () => {
    const first = out.candidates[0];
    expect(first.name).toBe('Mountain views from 6 secluded acres');
    expect(first.bedrooms).toBe(6);
    expect(first.beds).toBe(9);
    expect(first.priceShown).toBe(6211);        // "$6,211 for 4 nights", not 4
  });

  test('a real photo rides along when the card has one, and a badge PNG never poses as one', () => {
    const withPhoto = out.candidates.filter((c) => c.photo);
    expect(withPhoto.length).toBeGreaterThanOrEqual(3);
    for (const c of withPhoto) expect(c.photo).toMatch(/^https:\/\/a0\.muscache\.com\//);
  });

  // ── THE BUG A SYNTHETIC FIXTURE COULD NEVER HAVE FOUND ────────────────────
  // Two of these six real cards end on Airbnb's "Pay $0 today" badge. The price
  // reader took the LAST money figure on the card, so both reached the shortlist
  // priced at $0 — under every budget, ranked ahead of everything, and free
  // -looking to the host. A deposit badge is not what the stay costs.
  test('a "Pay $0 today" badge never becomes the price', () => {
    const byName = (n) => out.candidates.find((c) => c.name.includes(n));
    expect(byName('Private backyard').priceShown).toBe(2180);      // was 0
    expect(byName('Spectacular views').priceShown).toBe(4371);     // was 0
    for (const c of out.candidates) expect(c.priceShown).toBeGreaterThan(0);
  });

  // FIT IS A GATE, NOT A WEIGHT — asserted against real numbers rather than a
  // guess. Of these six real houses only the $2,180 one fits a $4,000 budget,
  // but it sleeps 6 where 10 are coming; the ranker is right to put a house that
  // can actually hold the group first and to say plainly that nothing cleared
  // both bars. A cheaper house that cannot sleep everyone is the wrong house.
  test('the shortlist ranks the real page against the real event', () => {
    const event = { id: 'sf', type: 'Birthday', date: '2027-06-17', endDate: '2027-06-21',
      venueCity: 'Santa Fe', venueState: 'NM', guestCount: 10, totalBudget: 4000, isDestination: true };
    const ranked = rankCandidates(out.candidates, event, { budget: 4000 });
    expect(ranked.considered).toBe(6);
    expect(ranked.clearing).toHaveLength(0);        // honest: none clears both bars
    const top = ranked.ranked[0];
    expect(top.beds).toBeGreaterThanOrEqual(10);    // it can sleep the ten
    // and the under-budget-but-too-small house is NOT sold as the answer
    const cheap = ranked.ranked.find((c) => c.priceShown === 2180);
    expect(ranked.ranked.indexOf(cheap)).toBeGreaterThan(0);
  });
});
