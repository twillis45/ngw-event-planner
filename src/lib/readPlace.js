// ─── readPlace — a place she typed, read by the SENTENCE'S reader (11/24/2026) ─
//
// The Create flow's "Which town?" chip ran its text through parseVenueLocation
// alone, which refuses any digit, so "123 Maple St, Springfield, VA 22150" read
// as "— which state?" and creation saved no town and no street. The same words
// in the sentence saved all three, because parseSmartEventText reads a street
// line, "City, ST", a ZIP, a nickname, a vacation area and a landmark.
//
// One reader: this hands the chip's text to parseSmartEventText and takes back
// only its place fields. The field asks where the event is, so the text is read
// as "in <text>", which is how the sentence reader hears a bare ZIP or a bare
// town ("in 22150", "in Chicago"); a street line or "City, ST" read the same
// with or without it.
//
// `located` is the same strict gate creation commits by (parseVenueLocation: a
// real state, or a ZIP). `missing` is the one thing to ask for when it is not:
// 'state' when a town was read with no state, otherwise 'town'.
import { parseSmartEventText } from './smartParseEvent';
import { parseVenueLocation } from './cityText';

export function readPlace(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  let p = {};
  try { p = parseSmartEventText('in ' + raw) || {}; } catch { p = {}; }
  const venueAddress = String(p.venueAddress || '').trim();
  const venueCity = String(p.venueCity || '').trim();
  const venueState = String(p.venueState || '').trim();
  const venueZip = String(p.venueZip || '').trim();
  const located = !!venueCity && !!parseVenueLocation(venueState ? venueCity + ', ' + venueState : venueCity);
  const missing = located ? null : (venueCity && !venueState ? 'state' : 'town');
  return { venueAddress, venueCity, venueState, venueZip, located, missing };
}
