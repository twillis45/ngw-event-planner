// ─── THE HOTELS DOOR CARRIES THE TRIP, NOT A SENTENCE ABOUT IT (2026-08-06) ──
//
// WHAT WAS WRONG, AND HOW LONG IT HAD BEEN WRONG
//
// `lodgingSearchLinks()` built the Hotels door as free text:
//
//   /travel/search?q=hotels in Santa Fe, NM Jun 20–Jun 24 for 5 guests
//
// and the comment above it asserted, in so many words, that "Google parses
// 'Jun 17-Jun 21' perfectly well, so there is nothing to trade away."
//
// It does not. Driven live 2026-08-06: Google reads the place out of `q` and
// DISCARDS the dates and the party size, then falls back to its own defaults —
// tomorrow, one night, two guests. Every price on the page the host landed on
// was a one-night, two-guest, wrong-month price. `checkin=` / `checkout=` /
// `adults=` are ignored too; they are not Google's parameters.
//
// That made this the same defect class as the occupancy/capacity bug fixed
// earlier the same day: a number displayed with `read` provenance that means
// something other than what the host is being shown. extractHotelCandidates()
// stores that price as `priceShown`, so a wrong-date rate could reach the
// shortlist wearing the page's authority.
//
// WHAT ACTUALLY CARRIES THE TRIP
//
// One parameter does: `ts`, a base64url-encoded protobuf. Its shape was not
// guessed — it was decoded from a real shared link, then re-captured from
// Google's own picker after setting Sep 15–19 for 5 adults, and every field
// below was confirmed live before it was written down:
//
//   1              = 1                     constant
//   2.1  (repeated)= {1: 3}                ONE ENTRY PER ADULT. Two adults is
//                                          two entries; five is five. The count
//                                          IS the party size — there is no
//                                          integer field holding it.
//   2.2            = 1                     set whenever the party is stated
//   3.1.2.7        = "Santa Fe"            the place, as plain text
//   3.2.2.1        = {1:y, 2:m, 3:d}       check-in
//   3.2.2.2        = {1:y, 2:m, 3:d}       check-out
//   3.2.2.3        = nights                check-out minus check-in
//   3.2.6.2        = 0
//   5.1.7          = "USD"
//
// PROVEN LIVE, and each one mattered:
//   · Name-only works. The captured link carried a Knowledge Graph id
//     (`/m/0f25y`) and later a place-id pair, and we hold NEITHER for an
//     arbitrary town the host typed. Field 3.1.2.7 alone is enough, so this
//     builds for any destination.
//   · 20 adults was accepted with the dates intact, so there is no low cap to
//     design around. Airbnb's 16-guest clamp has no equivalent here. Nothing
//     above 20 has been tried, and this does not pretend otherwise.
//   · The guests block is OPTIONAL. Omitted, the dates still apply and Google
//     shows its own default of 2. So an unknown party size stays unstated
//     rather than being invented as "2" by us.
//
// THE PAST-DATE GUARD IS LOAD-BEARING, NOT DEFENSIVE POLISH
//
// A `ts` whose check-in has already passed is silently ignored and Google
// reverts to its defaults — which is exactly how the first two attempts to
// verify this were misread as "the mechanism does not work". Emitting one
// anyway would restore the original bug in a form that LOOKS fixed: the URL
// would carry the host's dates while the page showed someone else's. So a stay
// that has already started returns null, the door opens without a `ts`, and the
// caller must not claim the dates travelled.
//
// Returning null is the honest failure here, and every guard below returns it
// rather than a best-effort string.

const b64url = (bytes) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === 'function'
    ? btoa(bin)
    : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const varint = (n) => {
  const out = [];
  let v = n;
  do {
    let c = v & 0x7f;
    v >>>= 7;
    if (v) c |= 0x80;
    out.push(c);
  } while (v);
  return out;
};

const varField = (field, n) => [...varint((field << 3) | 0), ...varint(n)];
const lenField = (field, bytes) => [...varint((field << 3) | 2), ...varint(bytes.length), ...bytes];
// UTF-8 by hand rather than TextEncoder: this repo's jest environment has no
// TextEncoder, and a town is exactly the kind of string that carries an accent
// — "Cañón", "Zürich", "Curaçao". Mangling one would send the host to the wrong
// place, so this encodes the code points properly instead of assuming ASCII.
const utf8 = (text) => {
  const out = [];
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return out;
};

const strField = (field, text) => lenField(field, utf8(text));
const dateField = (field, d) => lenField(field, [
  ...varField(1, d.y), ...varField(2, d.m), ...varField(3, d.d),
]);

// `YYYY-MM-DD` only. Anything else is a caller bug, not something to coerce —
// a silently mis-parsed date is the failure mode this whole module exists to
// stop.
const parseISO = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  // Noon-anchored, matching niceDay() in lodgingIntel.js — a midnight-anchored
  // date shifts a day under some timezones and the whole point here is a date
  // that does not drift.
  const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return null;
  // Round-trip check: 2026-02-31 parses to March 3 without this.
  if (dt.getMonth() + 1 !== mo || dt.getDate() !== d) return null;
  return { y, m: mo, d, dt };
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build the `ts` parameter that makes Google Travel honour a real stay.
 *
 * Returns a base64url string, or NULL when the trip cannot be carried
 * truthfully — no place, no dates, a malformed date, a check-out that does not
 * follow check-in, or a stay that has already started. A caller receiving null
 * must open the door WITHOUT dates and must not tell the host the dates were
 * applied.
 *
 * @param {object}  trip
 * @param {string}  trip.place   destination as the host said it
 * @param {string}  trip.start   check-in,  `YYYY-MM-DD`
 * @param {string}  trip.end     check-out, `YYYY-MM-DD`
 * @param {number} [trip.guests] party size; omitted entirely when absent
 * @param {Date}   [now]         injected for tests; defaults to the real clock
 * @returns {string|null}
 */
export function googleTravelTs({ place, start, end, guests } = {}, now = new Date()) {
  const where = String(place || '').trim();
  if (!where) return null;

  const ci = parseISO(start);
  const co = parseISO(end);
  if (!ci || !co) return null;

  const nights = Math.round((co.dt.getTime() - ci.dt.getTime()) / DAY_MS);
  if (nights < 1) return null;              // a stay is at least one night

  // Already under way — see the guard note above. Compared noon-to-noon so a
  // check-in TODAY still counts as bookable.
  const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  if (ci.dt.getTime() < todayNoon.getTime()) return null;

  const body = [];
  body.push(...varField(1, 1));

  // The party, one submessage per adult. Non-integer, zero and negative counts
  // mean "the host has not said", which is stated by OMITTING the block — not
  // by sending a number we made up.
  const party = Number(guests);
  if (Number.isInteger(party) && party > 0) {
    const g = [];
    for (let i = 0; i < party; i += 1) g.push(...lenField(1, varField(1, 3)));
    g.push(...varField(2, 1));
    body.push(...lenField(2, g));
  }

  const stay = [
    ...lenField(2, [...dateField(1, ci), ...dateField(2, co), ...varField(3, nights)]),
    ...lenField(6, varField(2, 0)),
  ];
  body.push(...lenField(3, [
    ...lenField(1, lenField(2, strField(7, where))),
    ...lenField(2, stay),
  ]));
  body.push(...lenField(5, lenField(1, strField(7, 'USD'))));

  return b64url(body);
}

export default googleTravelTs;
