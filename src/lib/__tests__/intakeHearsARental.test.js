// ─── INTAKE KNEW EVERY WAY TO SAY HOTEL AND NO WAY TO SAY AIRBNB ─────────────
//
// Host, 2026-09-22: "intake should pick up if the trip is to a spa resort hotel
// or hotel/airbnb/vrbo types."
//
// MEASURED before the change, across 25 phrasings a host plausibly types:
// TWELVE caught, THIRTEEN missed — and every miss was the same family.
//
//   caught    resort spa · spa resort · luxury resort and spa · hotel ·
//             boutique hotel · mountain lodge · inn · villa · b&b ·
//             guest house · all-inclusive resort
//   missed    airbnb · air bnb · vrbo · "a VRBO rental" · "a vacation rental" ·
//             "renting a house" · "we are renting a whole house" · cabin ·
//             condo · apartment · "short term rental" · "a big house for
//             everyone"
//
// The vocabulary knew every way to say hotel and no way to say the thing this
// product's own flagship fixture IS: `airbnbSantaFeResults.js`, a captured
// Airbnb results page for the Santa Fe 80th. The lodging stack reads
// `lodgingStyle` to lead the search — "searching hotels in Santa Fe for a host
// who asked for a resort spa hands back the wrong results", per the field's own
// note — so a host who said "airbnb" got a hotel search.
//
// WHAT WAS NOT WIDENED, AND WHY. "house" and "apartment" are ordinary words: the
// house band, an open house, house wine, the apartment upstairs. They count only
// with a renting verb or a vacation/holiday qualifier beside them. "cabin",
// "condo", "airbnb" and "vrbo" carry no such ambiguity in an event brief and
// stand alone.
//
// ONE PHRASE IS DELIBERATELY STILL MISSED: "a big house for everyone" — no
// renting verb, and it reads as easily as a VENUE as a stay. Catching it costs
// the false-positive guard below, which is the more expensive mistake: a style
// matcher that fires on "house wine" puts the whole lodging stack behind a
// phantom.
import { heardStayStyle } from '../lodgingIntel';

describe('intake hears the rental family, not only the hotel family', () => {
  test('(premise) the hotel half still works — nothing was traded away', () => {
    // If the widening broke what already worked, every assertion below is a
    // net loss dressed as a fix.
    expect(heardStayStyle('Santa Fe, NM resort spa')).toBe('resort spa');
    expect(heardStayStyle('boutique hotel in Santa Fe')).toBe('boutique hotel');
    expect(heardStayStyle('a luxury resort and spa')).toBe('luxury resort and spa');
    expect(heardStayStyle('the inn at Loretto')).toBe('inn');
    expect(heardStayStyle('mountain lodge')).toBe('mountain lodge');
    expect(heardStayStyle('bed and breakfast')).toBe('bed and breakfast');
  });

  test('THE GAP: the platforms a host actually names', () => {
    for (const t of ['we want an airbnb', 'getting an Airbnb in Santa Fe', 'an air bnb']) {
      expect(heardStayStyle(t)).toBeTruthy();
    }
    expect(heardStayStyle('vrbo')).toBeTruthy();
    expect(heardStayStyle('a VRBO rental')).toBeTruthy();
  });

  test('THE GAP: the rental words a host uses instead of a platform', () => {
    for (const t of [
      'a vacation rental', 'short term rental', 'renting a house',
      'we are renting a whole house', 'renting an apartment', 'holiday home',
      'a cabin', 'a condo',
    ]) {
      expect(heardStayStyle(t)).toBeTruthy();
    }
  });

  test('NEGATIVE CONTROL: the ordinary uses of "house" never become a stay style', () => {
    // The expensive mistake. Each of these would put the lodging stack behind a
    // property the host never mentioned.
    for (const t of [
      'the house band plays at 8', 'open house on Sunday', 'house wine for the table',
      'a full house of guests', 'housewarming', 'the apartment upstairs neighbours',
      'in-house catering', 'house salad',
    ]) {
      expect(heardStayStyle(t)).toBe(null);
    }
  });

  test('NEGATIVE CONTROL: silence stays silence', () => {
    expect(heardStayStyle('')).toBe(null);
    expect(heardStayStyle('we need a venue')).toBe(null);
    expect(heardStayStyle(null)).toBe(null);
    expect(heardStayStyle(undefined)).toBe(null);
  });

  test('the one phrase left deliberately unheard, named so it is a choice', () => {
    // If a later pass decides to catch this, it should fail HERE first and
    // carry the false-positive guard above with it.
    expect(heardStayStyle('a big house for everyone')).toBe(null);
  });
});
