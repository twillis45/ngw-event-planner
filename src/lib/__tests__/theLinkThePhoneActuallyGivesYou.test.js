// ─── "I PASTED AN AIRBNB BUT IT DIDN'T PULL THE PROPERTY" ─────────────────────
//
// Host report, 2026-09-22. Measured: the paste was rejected by the URL gate
// BEFORE anything was attempted, because the gate only knew the DESKTOP shape.
//
//   desktop  https://www.airbnb.com/rooms/47074377        accepted
//   the app  https://abnb.me/YEO24YyMisb                  REJECTED
//
// abnb.me is Airbnb's own share domain and is what the mobile app's Share button
// produces — "often what people share from mobile devices"
// (stackoverflow.com/questions/73268819; the Airbnb community thread confirms it
// is app-only). Both read 2026-09-23. On a product whose declared flagship is a
// 390px phone, the one link shape a phone produces was the one it would not take.
//
// WHAT THIS DELIBERATELY DOES NOT DO: add a platform. The never-build doctrine
// at the top of lodgingIntel bans live rental APIs and price scraping, and the
// review board REMOVED Booking.com on 2026-07-28 because its terms uniquely name
// browser-based assistants. Adding a host is that decision again — a terms read,
// not a regex. This widens the FORMS of platforms already sanctioned.
//
// Vrbo's modern slug URLs (locale and property-type segments) were NOT widened:
// no shape for them was verified in this pass, and guessing a URL grammar is how
// a gate starts accepting things nobody checked.
import { extractListingCandidates } from '../lodgingIntel';

// The gate is exercised through the REAL paste path — the same door the host
// used — rather than by reaching for the private helper behind it.
const accepts = (url) => {
  const r = extractListingCandidates(url);
  const list = (r && r.candidates) || [];
  return list.some((c) => c && typeof c.url === 'string' && c.url.split('?')[0] === url.split('?')[0]);
};

describe('the app takes the link a phone actually produces', () => {
  test('(premise) the desktop shape was already accepted', () => {
    expect(accepts('https://www.airbnb.com/rooms/47074377')).toBe(true);
  });

  test('THE FIX: the mobile Share link is accepted', () => {
    expect(accepts('https://abnb.me/YEO24YyMisb')).toBe(true);
    expect(accepts('https://abnb.me/D2Anmizv3T')).toBe(true);
  });

  test('the other Airbnb short form is accepted too', () => {
    expect(accepts('https://www.airbnb.com/l/YEO24YyMisb')).toBe(true);
  });

  test('a very long modern listing id still works', () => {
    // Airbnb ids grew: 1334969360537740707 is a real 2025-era id.
    expect(accepts('https://www.airbnb.com/rooms/1334969360537740707')).toBe(true);
  });

  test('NEGATIVE CONTROL: no new platform sneaks in', () => {
    // Booking.com was removed by the review board over its terms. Re-adding it
    // is a decision, not a side effect of widening Airbnb.
    expect(accepts('https://www.booking.com/hotel/us/some-place.html')).toBe(false);
    expect(accepts('https://www.hotels.com/ho123456/')).toBe(false);
    expect(accepts('https://www.expedia.com/h123456.Hotel-Information')).toBe(false);
  });

  test('NEGATIVE CONTROL: a look-alike domain is not Airbnb', () => {
    // `abnb.me.evil.com` and `notabnb.me` must not pass on a loose match.
    expect(accepts('https://abnb.me.evil.com/YEO24YyMisb')).toBe(false);
    expect(accepts('https://evil.com/abnb.me/YEO24YyMisb')).toBe(false);
  });

  test('NEGATIVE CONTROL: the short-link shape still has to look like one', () => {
    expect(accepts('https://abnb.me/')).toBe(false);
    expect(accepts('https://abnb.me/abc')).toBe(false);
  });

  test('NEGATIVE CONTROL: http is still refused', () => {
    expect(accepts('http://abnb.me/YEO24YyMisb')).toBe(false);
  });

  test('a www-LESS host is accepted — a bug older than this change', () => {
    // The patterns used `(^|\.)`, which needs a dot BEFORE the host. `www.`
    // supplied one, so this was hidden: a bare airbnb.com/rooms/... matched
    // neither `^` (the string starts "https://") nor `\.` and was silently
    // refused, which is exactly what some browsers hand a host.
    expect(accepts('https://airbnb.com/rooms/47074377')).toBe(true);
    expect(accepts('https://vrbo.com/963775')).toBe(true);
  });

  test('NEGATIVE CONTROL: the host still cannot appear mid-path', () => {
    expect(accepts('https://evil.com/www.airbnb.com/rooms/1')).toBe(false);
  });
});
