// ─── "I PASTED AN AIRBNB AND IT DIDN'T PULL THE PROPERTY" ────────────────────
//
// Host report, 2026-09-22, reproduced here. `extractListingCandidates` is built
// for a RESULTS PAGE — six cards, each carrying name, beds, price and a photo in
// its own markup — and `realResultsPaste.test.js` proves it handles one well.
//
// A host who has already chosen a place does not paste a results page. They
// paste ONE listing. MEASURED across every shape they plausibly would:
//
//   paste                                            candidates  name  photo  price
//   ──────────────────────────────────────────────────────────────────────────────
//   airbnb.com/rooms/7422…                                1      —     —      —
//   airbnb.com/rooms/7422…?check_in=…&adults=10           1      —     —      —
//   the URL WITH the facts beside it in the text          1      —     —      —
//   abnb.me/xYz123          (Airbnb's own share link)     0      —     —      —
//   vrbo.com/en-gb/cottage-rental/p1234567vb              0      —     —      —
//   booking.com/hotel/us/…                                0      —     —      —
//   hotels.com/ho123456/                                  0      —     —      —
//   the listing's text with no markup at all              0      —     —      —
//
// THREE SEPARATE FAILURES, and they want different fixes:
//
//   1. A RECOGNISED single listing yields `linksOnly: true` — a bare URL with no
//      name, no photo, no bedroom count and no price. Nothing to rank, nothing
//      to show, nothing to compare. This is the host's actual complaint.
//   2. TWO URL SHAPES ARE ACCEPTED and no others (lodgingIntel.js:822-823):
//      `airbnb.*/rooms/<digits>` and `vrbo.com/<digits>`. Airbnb's own share
//      button produces `abnb.me/…` — on a mobile-first product, the single most
//      likely paste returns nothing at all. VRBO's real listing URLs carry a
//      locale and a slug and also return nothing.
//   3. NO HOTEL SOURCE IS RECOGNISED. The host is told to sort where everyone
//      stays; booking.com and hotels.com paste as nothing.
//
// THIS FILE CHANGES NOTHING. It records the gap as a fact, the way the other
// recording guards do, because closing it is three different pieces of work and
// the third (hotels) needs a product call about which sources to support at all.
// If a future pass fixes one, this file should fail FIRST and say so.
import { extractListingCandidates } from '../lodgingIntel';

const ROOM = 'https://www.airbnb.com/rooms/742220082744554592';
const n = (s) => (extractListingCandidates(s).candidates || []).length;
const one = (s) => (extractListingCandidates(s).candidates || [])[0] || null;

describe('a single listing, pasted the way a host actually pastes it', () => {
  test('(premise) the parser really does work on the results page it was built for', () => {
    // Without this, every assertion below could be measuring a broken import
    // rather than a real gap. Six real cards, from the captured Santa Fe search.
    // eslint-disable-next-line global-require
    const { AIRBNB_SANTA_FE_RESULTS_HTML } = require('../__fixtures__/airbnbSantaFeResults');
    const out = extractListingCandidates(AIRBNB_SANTA_FE_RESULTS_HTML);
    expect(out.candidates).toHaveLength(6);
    expect(out.linksOnly).toBe(false);
    expect(out.candidates[0].photo).toMatch(/^https:\/\/a0\.muscache\.com\//);
  });

  test('THE COMPLAINT: a recognised listing URL pulls no property and no image', () => {
    const r = extractListingCandidates(ROOM);
    expect(r.candidates).toHaveLength(1);
    expect(r.source).toBe('Airbnb');
    expect(r.linksOnly).toBe(true);            // a link, and nothing else
    const c = r.candidates[0];
    expect(String(c.name || '')).toBe('');     // no property name
    expect(c.photo || null).toBe(null);        // no image — the host's words
    expect(c.bedrooms ?? null).toBe(null);
    expect(c.priceShown ?? null).toBe(null);
  });

  test('check-in params do not help, which rules out a query-string problem', () => {
    const r = extractListingCandidates(`${ROOM}?check_in=2027-06-17&check_out=2027-06-21&adults=10`);
    expect(r.candidates).toHaveLength(1);
    expect(r.linksOnly).toBe(true);
    expect(String(r.candidates[0].name || '')).toBe('');
  });

  test('the facts beside the link are ignored even when the host pasted them', () => {
    // The sharpest of the three. She pasted the link AND what she was looking
    // at; the reader took the URL and walked past "6 bedrooms" and "$6,211".
    const r = extractListingCandidates(
      `Look at this one! ${ROOM} 6 bedrooms $6,211 for 4 nights`,
    );
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].bedrooms ?? null).toBe(null);
    expect(r.candidates[0].priceShown ?? null).toBe(null);
  });

  test('CLOSED 2026-09-23 — Airbnb’s OWN share link now resolves', () => {
    // This assertion used to read `.toBe(0)`, recording the gap. `abnb.me` is
    // what the share sheet hands a host on a phone, so on a product whose
    // flagship viewport is 390px it was the most likely paste there is — and it
    // was refused before anything was attempted.
    //
    // THE RECORD IS WHAT CAUGHT THE FIX. Closing the gap turned this file red,
    // which is a recorded defect working exactly as intended: the gap could not
    // be closed quietly, and it could not stay recorded once it was closed.
    // Sources and the rest of the reasoning are in
    // __tests__/theLinkThePhoneActuallyGivesYou.test.js.
    expect(n('https://abnb.me/xYz123')).toBe(1);
  });

  test('VRBO’s real listing URL resolves to nothing; only the bare-digits form works', () => {
    expect(n('https://www.vrbo.com/en-gb/cottage-rental/p1234567vb')).toBe(0);
    expect(n('https://www.vrbo.com/1234567')).toBe(1);   // the one shape accepted
  });

  test('no hotel source is recognised at all', () => {
    expect(n('https://www.booking.com/hotel/us/inn-at-loretto.html')).toBe(0);
    expect(n('https://www.hotels.com/ho123456/')).toBe(0);
  });

  test('NEGATIVE CONTROL: junk stays junk, and nothing throws', () => {
    // A parser that got looser to fix the above must not start inventing a
    // listing out of arbitrary text. These must still be zero afterwards.
    expect(n('')).toBe(0);
    expect(n('hello world')).toBe(0);
    expect(n('Mountain views from 6 secluded acres\n6 bedrooms · 9 beds\n$6,211 for 4 nights')).toBe(0);
    expect(() => extractListingCandidates(null)).not.toThrow();
    expect(() => extractListingCandidates(undefined)).not.toThrow();
  });

  test('NEGATIVE CONTROL: the recognised shapes still resolve to a real canonical URL', () => {
    // Whatever changes, the two shapes that DO work must keep working — this is
    // the regression surface for any widening of the patterns.
    expect(one(ROOM).url).toBe('https://www.airbnb.com/rooms/742220082744554592');
    expect(one('https://www.vrbo.com/1234567').url).toMatch(/vrbo\.com\/1234567/);
  });
});
