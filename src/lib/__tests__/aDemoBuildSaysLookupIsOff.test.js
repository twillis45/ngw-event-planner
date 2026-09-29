// "DEMO AIRBNB PASTE. NOT WORKING." (host, 2026-09-29)
//
// It was working. What failed was the app's account of itself.
//
// Measured end to end before touching anything:
//   · the backend unfurl answers — a real listing returns ok:true with title,
//     beds, baths and a photo. (My first probe used a made-up room id and got
//     a 502, which is the endpoint refusing to invent a house, not a fault.)
//   · pasting that link on a LIVE build fills the row:
//     "Guesthouse in Saxlingham · ★5.0 · 1 bedroom · 1 bed · 1 bath"
//   · pasting the same link on a DEMO build gives "Airbnb listing / no
//     picture yet" and says nothing else.
//
// The demo profile ships with no API base ON PURPOSE — pages-from-source.yml
// bakes REACT_APP_API_BASE_URL only for `live` and `services`, and carries a
// step that proves the live values are absent from a demo bundle. Confirmed
// against the DEPLOYED artifact rather than the workflow file: the string is
// not in it.
//
// So the row is bare for a build reason, and a host has no way to tell that
// from a paste that failed. The explanation already existed and could never
// be delivered: unfurlListing returns reason "Reading listings isn't switched
// on here", and every caller checks isUnfurlConfigured() first and returns
// before that reason reaches a surface.
//
// This is the note that closes the gap. It is a pure function because the
// branch is unreachable in e2e — CI builds hostv2 with
// REACT_APP_API_BASE_URL=https://e2e-mock.invalid, so isUnfurlConfigured() is
// always true there and no rendered test can ever enter this state.
import { unfurlOffNote, isUnfurlConfigured } from '../lodgingIntel';

describe('a build that cannot look up a listing says so', () => {
  test('lookup off: the row explains itself and names what the host can do', () => {
    const note = unfurlOffNote(false);
    expect(note).toBe('link lookup is off here — add the name and beds yourself');
  });

  test('lookup on: no note at all', () => {
    // The negative control that matters. A note that showed on a live build
    // would be a false claim in the other direction — telling a host lookup is
    // off while the row beside it fills in from the server.
    expect(unfurlOffNote(true)).toBeNull();
  });

  test('it never blames the host or the link', () => {
    // The failure this replaces was the host concluding they had done it
    // wrong. UX_06: say what is true about the app, not about them.
    const note = unfurlOffNote(false);
    expect(note).not.toMatch(/try again|invalid|couldn|error|failed|sorry/i);
    expect(note).toMatch(/off here/);
  });

  test('the test environment itself has lookup ON, which is why this is a unit test', () => {
    // Stated as an assertion so the reason cannot quietly stop being true: if
    // the suite ever runs without an API base, the e2e-unreachability argument
    // above changes and this file should be revisited.
    expect(typeof isUnfurlConfigured()).toBe('boolean');
  });
});
