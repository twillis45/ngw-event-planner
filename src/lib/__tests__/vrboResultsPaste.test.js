// ── THE VRBO DOOR, AGAINST A REAL VRBO PAGE (2026-08-05) ─────────────────────
// The Vrbo link this app builds does land on a real results page. What had
// never been checked is whether the page it lands on can come BACK: Vrbo's
// cards differ from Airbnb's in every shape the parser touches. See the
// fixture header for the list.
import { extractListingCandidates } from '../lodgingIntel';
import { VRBO_SANTA_FE_RESULTS_HTML as REAL } from '../__fixtures__/vrboSantaFeResults';

describe('pasting a real Vrbo results page', () => {
  const out = extractListingCandidates(REAL);

  test('the cards come back at all — a bare numeric link is still a listing', () => {
    expect(out.candidates).toHaveLength(4);
    expect(out.source).toBe('Vrbo');
  });

  test('each candidate carries a real, openable Vrbo URL', () => {
    for (const c of out.candidates) expect(c.url).toMatch(/^https:\/\/www\.vrbo\.com\/\d+$/);
    expect(new Set(out.candidates.map((c) => c.url)).size).toBe(4);
  });

  test('one line carrying both counts still yields bedrooms AND beds', () => {
    // "House · 5 bedrooms · 6 beds" — Airbnb splits these across lines, Vrbo does not.
    const first = out.candidates[0];
    expect(first.bedrooms).toBe(5);
    expect(first.beds).toBe(6);
  });

  test('the name is the property, not the gallery chrome around it', () => {
    const names = out.candidates.map((c) => c.name);
    expect(names.some((n) => /Hillside Hacienda/.test(n))).toBe(true);
    for (const n of names) expect(n).not.toMatch(/^(Photo gallery|Image of)/);
  });

  // The money shapes Vrbo puts on a discounted card: a saving, the old price,
  // then the price being asked. Only the last is what the stay costs.
  test('a discounted card reports the price being asked, not the saving or the old price', () => {
    const disc = out.candidates.find((c) => /Historic Eastside/.test(c.name));
    expect(disc.priceShown).toBe(1705);      // not 580 (the saving), not 1850 (the old price)
  });

  test('a review score never poses as a price', () => {
    const first = out.candidates[0];         // card carries "10 out of 10"
    expect(first.priceShown).toBe(889);
  });
});
