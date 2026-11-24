// venueFor — the ONE reader for "where is this event, as a place a human sees."
//
// Constitution (mirrors eventWhen.js): this module imports NO playbook or engine
// code, so the invite bundle and both shells can use it without dragging the
// planner along. Venue truth lives on the event as scattered raw fields
// (venue / venueKind / venueCity / venueState / venueAddress / venueStreet /
// venueZip) written by half a dozen seams; the 2026-07-27 audit counted ~250
// raw reads across 15 modules, three engines re-implementing the at-home
// "is the venue set?" carve-out, and phantom fields (event.address,
// event.venueNotes) that nothing writes. Every consumer that wants a name,
// a display line, a maps query, or a set/home verdict reads THIS shape;
// raw field reads outside this module are the bug class venueSourceProof exists
// to catch. (App.js is freeze-exempt until CRA deletion — its raw reads are
// grandfathered, not sanctioned.)
import { isPlausibleCityText, parseVenueLocation, splitTrailingPlace } from './cityText';

const STREET_LINE = /^\d{1,6}[a-z]?\s+(?:[a-z0-9.'-]+\s+){0,4}(st|street|rd|road|ave|avenue|blvd|boulevard|ln|lane|dr|drive|way|ct|court|pl|place|pkwy|parkway|hwy|highway|cir|circle|ter|terrace|trl|trail|pike|sq|square)\b\.?/i;

// Home-ish venue labels: real to the host ("Backyard") but useless as a maps
// destination — the city carries the location for those.
const HOMEISH = /^(backyard|back\s?yard|home|house|my place|host'?s home|our (place|home|backyard))$/i;

export function venueFor(event) {
  const ev = event || {};
  // ── A VENUE FIELD HOLDING "City, ST" IS A PLACE, NOT A VENUE NAME ────────
  // Host ruling 2026-08-03: "if venue is recognized as a city, state then the
  // actual venue name is blank and venueCity should have a value."
  //
  // Seen live this session: an event carried venue:"Santa Fe, NM" with
  // venueCity:"" — because a CTA routed to `event-venue`, which writes the NAME
  // field. Every consumer that needs a CITY (the lodging searches, weather,
  // shopping) then read nothing, while the town sat in plain sight one field
  // over. It also put two answers on one screen: the hero asked "Add the
  // location." while the readiness ledger counted the location handled.
  //
  // Reconciled HERE, at the one reader, rather than by migrating stored data:
  // every existing event is fixed on read, nothing has to be rewritten, and no
  // write seam can reintroduce the split. parseVenueLocation is the same strict
  // gate the manual "Which town?" field uses — it needs a real state, so a
  // venue genuinely named "Chicago" is untouched; only "Santa Fe, NM" converts.
  const rawName = String(ev.venue || '').trim();
  const nameIsPlace = (() => {
    if (!rawName) return null;
    try { return parseVenueLocation(rawName) || null; } catch { return null; }
  })();
  // ── "VENUE, CITY, ST" IS A TOWN TOO (2026-08-06, board, mobile seat) ──────
  // parseVenueLocation is strict on purpose and reads the WHOLE string, so it
  // only ever recovered a town when the venue field contained nothing BUT the
  // town. The hero field invites "Name or address", so a host who typed
  // "Casa Alegria, Santa Fe, NM" got no town recovered — and the lodging screen
  // then asked her to name the town a THIRD time, behind a placeholder that
  // already read "Santa Fe, NM" as ghost text. Driven live; it is the moment
  // the seat named as where she blames herself.
  //
  // Only the TRAILING pair is tried, and only through the same strict parser —
  // no new leniency. "Casa Alegria, Santa Fe, NM" yields Santa Fe, NM and keeps
  // "Casa Alegria" as the venue name. A venue genuinely called "Chicago, Nebraska
  // Room" still fails the parser and is left alone.
  //
  // SCOPE, measured rather than assumed — the first draft of this comment got
  // it wrong and the probe corrected it:
  //   "Casa Alegria, Santa Fe, NM"      → name "Casa Alegria",   Santa Fe NM ✓
  //   "The Lodge, Room 2, Santa Fe, NM" → name "The Lodge, Room 2", Santa Fe NM ✓
  //   "1234 Canyon Rd, Santa Fe, NM"    → name "1234 Canyon Rd",  Santa Fe NM ✓
  //     (the whole string is digit-rejected, but the TAIL is not — so a street
  //      address with a trailing town now recovers the town, which is the
  //      behaviour a host typing an address actually wants)
  //   "Casa Alegria, Santa Fe NM"       → unchanged, still asks
  //     (no comma before the state; the parser requires one and stays strict)
  //   "Casa Alegria"                    → unchanged, still asks
  //
  const tailIsPlace = (() => {
    if (nameIsPlace || !rawName) return null;
    const parts = rawName.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) return null;
    try { return parseVenueLocation(parts.slice(-2).join(', ')) || null; } catch { return null; }
  })();
  // "VENUE — CITY, ST" TOO (owner's demo, 11/15/2026): the seeded "VFW Post
  // 3150 — Alexandria, VA" separates the town with a dash, not a comma, so no
  // state was recovered and the price note asked the host to "add your state".
  // Unlike the comma form, the NAME is kept whole: vendor briefs, rain plans and
  // parking notes print it, and the town in it is what a vendor reads. Only the
  // city and state are lifted, and the display line does not repeat the town.
  const dashTail = (() => {
    if (nameIsPlace || tailIsPlace || !rawName || !/\s[—–-]\s/.test(rawName)) return null;
    try { return splitTrailingPlace(rawName); } catch { return null; }
  })();
  // The venue keeps its own name; only the trailing town is lifted out of it.
  const name = nameIsPlace ? ''
    : tailIsPlace ? rawName.split(',').map((p) => p.trim()).filter(Boolean).slice(0, -2).join(', ')
      : rawName;
  // Kind rule: explicit venueKind wins; a host_event record defaults to home
  // ONLY while no venue is named — naming "VFW Post 3150" makes it a venue,
  // and demanding a city on top of a named venue was the exact false blocker
  // ctaStateTransitions locks against.
  // A 'home' the old substring guess wrote for a named venue ("The Boathouse")
  // reads as a venue again. Only an unconfirmed guess on a name that guess
  // matched and a home phrase does not: a host's own confirmation, and a home
  // set at creation for an address, are never second-guessed.
  const staleHomeGuess = ev.venueKind === 'home' && !ev.venueConfirmed && !!rawName
    && OLD_HOME_GUESS.test(rawName) && !isHomeVenueName(rawName);
  const kind = staleHomeGuess ? 'venue' : (ev.venueKind || (ev.recordKind === 'host_event' && !name ? 'home' : 'venue'));
  const isHome = kind === 'home';
  // CITY-LEAK-1 gate rides INSIDE the accessor: a polluted venueCity ("VFW
  // Post 3150 — Alexandria, VA") never escapes as a city again.
  // An explicit venueCity still wins; the parsed one only fills a gap.
  const placeFromName = nameIsPlace || tailIsPlace || dashTail;
  const city = [ev.venueCity, ev.city].map((x) => String(x || '').trim()).find(isPlausibleCityText)
    || (placeFromName ? String(placeFromName.city || '').trim() : '') || '';
  const state = String(ev.venueState || ev.state || '').trim()
    || (placeFromName ? String(placeFromName.state || '').trim() : '');
  // event.address is a PHANTOM (whitelisted+read, never written) — deliberately
  // not consulted here; venueAddress and the structured parts are the truth.
  const street = String(ev.venueStreet || '').trim();
  // A real address needs a street — city/state alone must not masquerade as one
  // (they'd hijack mapsQuery away from the venue name).
  // A STREET TYPED AS THE VENUE IS THE ADDRESS (owner report, 11/18/2026):
  // "271 Whitaker Rd, Pasadena MD" has no comma before the state, so the town
  // parsers above leave it whole as the NAME — and arrival then asked for the
  // street she had just typed. A house number followed by a street-type word is
  // an address; "21 Club" and "VFW Post 3150" are not.
  const nameIsStreet = !!name && STREET_LINE.test(name);
  const address = String(ev.venueAddress || '').trim()
    || (street
      ? [street, joinTown(city, state, String(ev.venueZip || '').trim())].filter(Boolean).join(', ')
      : (nameIsStreet ? name : ''));
  // The at-home carve-out, defined ONCE: a home host's location lives in
  // venueCity; a named-venue host's lives in venue. (Three engines used to
  // each carry their own copy of this rule.)
  // ── A STREET ADDRESS IS A LOCATION (host report, 2026-09-18) ─────────────
  // `address` was computed right above and then never consulted here, so an
  // event carrying venueAddress:'8100 Ryan Way' with no venue NAME read as
  // having no venue at all. Measured on a real creation: the host typed "Watch
  // the big game this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD", the
  // creation seam stored the street correctly (HostShellV2 ~6423) — and the
  // plan still asked "Where is the event? Everything depends on venue." The
  // fact was on the record and the app could not see it, which is the exact
  // split this module was built to end.
  //
  // This does NOT loosen the 2026-08-14 board ruling that a town and an address
  // answer different questions. `address` is street-gated fifteen lines up — a
  // bare city/state can never produce one — so the test "a named-venue event
  // without a name is NOT set, even with a city" still holds, and so does the
  // production-layer reading that a town alone does not unblock.
  const isSet = isHome ? !!(city || name || address) : !!(name || address);
  // The SECOND venue question, distinct from isSet: an at-home event can be
  // "set" (name or city) yet still need a CITY for weather geocoding and maps.
  // The reveal blocker and the shell's city ask both ask THIS, not isSet —
  // they were two of the three hand-copied variants the audit flagged.
  // A ZIP answers it too (11/24/2026): a bare ZIP is stored in venueCity, which
  // the city gate above refuses (digits), so "at my house in 22150" was saved
  // and then asked "Add your city." zipOf reads the same record `zip` publishes.
  const needsCityForWeather = isHome && !city && !zipOf(ev, address);
  // ── THE PRODUCTION-LAYER VERDICT, PUBLISHED (2026-09-18) ─────────────────
  // The 2026-08-14 board ruling split the venue fact in two: the TOWN unblocks
  // travel (weather, shopping, lodging search), the ADDRESS unblocks production
  // (COI, dock, rentals, power, run-of-show, every signature and deposit). This
  // module published `isSet` for the first question and nothing for the second,
  // so callers that needed the second had to build it — and three of them did,
  // each slightly differently:
  //
  //   phaseProgress `_addressSigned`   via eventLocationStatus  (correct)
  //   LodgingCockpit  !(v.address || v.name)                    (correct, copied)
  //   surfaceRegistry  truthiness of .name alone                 (WRONG: told a
  //                    host with a street on file "No venue booked yet")
  //
  // A verdict that consumers must assemble themselves WILL fork; it forked six
  // ways for `isSet` before this. So it is published here, once.
  //
  // A NAME COUNTS. `venue_only` is settled for this purpose — a named hall IS
  // the address, and the street line merely adds precision. That is
  // phaseProgress's existing rule, kept rather than tightened, because
  // demanding a street on top of a named venue re-opens a nag this repo already
  // took a scar for.
  //
  // A BARE CITY NEVER COUNTS: `address` is street-gated above and `name` is
  // city-rejected, so neither half can be satisfied by a town.
  const addressSettled = !!(name || address);
  // ── A GUEST CAN FIND THE DOOR (six root causes, cause 6, 11/23/2026) ─────
  // The OUTWARD verdict (lib/outwardReady): an invite to "my house in Fort
  // Washington, MD" cannot be found. At home only a street counts; elsewhere
  // the production verdict above (a named place is its address).
  const findable = isHome ? !!address : addressSettled;
  // Same finding as isSet: with no name, an event holding a real street had
  // nothing to show for itself but its town. Show the street the host typed —
  // it is the most specific thing known about where this is.
  // ── ONE ADDRESS LINE (owner report, iPad, 11/21/2026) ────────────────────
  // "On space seats and helpers, the state is not being picked up. Also in
  // invite not picking up all of address." The display line was [name, city]:
  // a street typed as the venue read "100 Example Ln, Ft Washington" on Space
  // and the invite, the state and ZIP dropped although the record held them.
  // Every reader now takes the line composed here (formatVenueAddress below):
  // street, City, ST ZIP when known. A part the line already carries is not
  // repeated, and a part the record does not hold is never supplied.
  const zipKnown = zipOf(ev, address);
  const townLine = joinTown(city, state, zipKnown);
  const fullAddress = address ? withMissingParts(address, city, state, zipKnown) : '';
  // THE ZIP WHEREVER IT IS KNOWN (owner's invite, 11/24/2026: WHERE read
  // street, City, ST with no ZIP). A name that says its town gets the ZIP after
  // it, and so does "At home in City, ST".
  const zipTail = (line) => (zipKnown && !carries(line, zipKnown) ? `${line} ${zipKnown}` : line);
  const displayLine = nameIsStreet
    ? fullAddress
    : name
      // A named place, then where it is: "VFW Post 3150 · Alexandria, VA",
      // "The Boathouse · 9 Dock Rd, Annapolis, MD 21401". A name that already
      // says its town and state ("VFW Post 3150 — Alexandria, VA") stands alone.
      ? (!fullAddress && (dashTail || (carries(name, city) && (!state || carries(name, state)))) ? zipTail(name)
        : [name, fullAddress || townLine].filter(Boolean).join(' · '))
      : (isHome && city && !address ? zipTail(`At home in ${joinTown(city, state, '')}`) : (fullAddress || townLine));
  // The maps query names the ZIP too, and a ZIP alone is enough to ask with.
  const mapsQuery = fullAddress
    || (dashTail ? zipTail(name)
      : [name && !HOMEISH.test(name) ? name : '', joinTown(city, state, zipKnown)].filter(Boolean).join(', '));
  // ── THE ZIP, PUBLISHED (2026-09-23) ──────────────────────────────────────
  // `setVenue` below stores a bare ZIP in **venueCity**, because the city gate
  // rejects digits by design. So the ZIP a host typed sits on the record under
  // a field named for something else, and any consumer that wants it has to
  // know that and reach past this accessor to get it.
  //
  // Two already did: the geocoder query in the shell, and — today — the
  // store-price picker. Both carried the same `/^\d{5}$/` test against the same
  // raw field, one of them with a `venue-exempt:` note admitting it. That is
  // precisely the fork this module exists to end, so the fact is published here
  // once and both consumers ask for it.
  //
  // '' when there is no ZIP. Never inferred from a city, never geocoded.
  // A ZIP at the end of the address line the host typed counts too (11/21/2026):
  // it is on the record, read rather than looked up.
  const zip = zipKnown;
  // `display`: what to SHOW for the place (owner acceptance run 11/5/2026,
  // issue #100 D-4). A street address from Creation with no venue name made
  // `isSet` true while the Venue sheet rendered "Currently:" only for a name.
  // `confirmed`: the host said so, as opposed to the plan having been told.
  const display = name || address;
  const confirmed = !!ev.venueConfirmed;
  return { name, kind, isHome, city, state, zip, address, fullAddress, townLine, isSet, addressSettled, findable, needsCityForWeather, displayLine, mapsQuery, display, confirmed };
}

// ─── venueGeoQuery — what the geocoder is asked for this place ───────────────
// The weather, the airports and the guest's "tell me when I'm close" geocode a
// town, not a street (lib/weather geocodeVenue). The ZIP when it is known is
// the most precise thing that geocoder takes; else "City, ST, US" (a bare city
// can resolve to a same-named one in another state); else the city; else ''.
export function venueGeoQuery(event) {
  const vf = venueFor(event);
  if (vf.zip) return vf.zip;
  return vf.city && vf.state ? `${vf.city}, ${vf.state}, US` : vf.city;
}

// ── The address helpers venueFor composes with ───────────────────────────────
const escRe = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Does the line already carry this part, as a whole word? ("Pasadena MD" holds
// both Pasadena and MD; "Mdina" holds neither.)
const carries = (line, part) => !!part && new RegExp('(^|[\\s,])' + escRe(part) + '(?=$|[\\s,.])', 'i').test(line);
function zipOf(ev, address) {
  const z = String(ev.venueZip || '').trim();
  if (/^\d{5}$/.test(z)) return z;
  const c = String(ev.venueCity || '').trim();
  if (/^\d{5}$/.test(c)) return c;
  const m = /(?:^|[\s,])(\d{5})(?:-\d{4})?\s*$/.exec(String(address || ''));
  // A trailing five digits after a comma or state, never a house number alone.
  return m && /[a-z]/i.test(String(address).slice(0, m.index)) ? m[1] : '';
}
function joinTown(city, state, zip) {
  const cs = city && state ? `${city}, ${state}` : (city || state || '');
  return [cs, zip].filter(Boolean).join(' ');
}
function withMissingParts(line, city, state, zip) {
  let out = String(line).trim();
  if (city && !carries(out, city)) out += `, ${city}`;
  if (state && !carries(out, state) && !carries(out, US_STATE_FULL[state] || '')) out += `, ${state}`;
  if (zip && !carries(out, zip)) out += ` ${zip}`;
  return out;
}
const US_STATE_FULL = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

// ─── formatVenueAddress — THE one place line every reader shows ──────────────
//   style 'line'    (default) what a person reads: the venue name with its
//                   address, "street, City, ST ZIP", or "At home in City, ST"
//   style 'address' the street line with its town, state and ZIP; '' with no street
//   style 'town'    "City, ST ZIP"
export function formatVenueAddress(event, { style = 'line' } = {}) {
  const vf = venueFor(event);
  if (style === 'address') return vf.fullAddress;
  if (style === 'town') return vf.townLine;
  return vf.displayLine;
}

// ─── venueLineParts — the one place line, split for the invite's bold rule ──
// (owner, 11/24/2026: the street line bold, "City, ST ZIP" regular). The SAME
// line formatVenueAddress returns, cut where its town begins, so
// head + sep + tail is exactly that line. No town at its end: all head.
export function venueLineParts(event) {
  const vf = venueFor(event);
  const line = vf.displayLine || '';
  const town = vf.townLine || '';
  if (town && line.length > town.length && line.endsWith(town)) {
    const rest = line.slice(0, line.length - town.length);
    const m = /[\s,·]+$/.exec(rest);
    if (m && m.index > 0) return { line, head: rest.slice(0, m.index), sep: m[0], tail: town, mapsQuery: vf.mapsQuery };
  }
  return { line, head: line, sep: '', tail: '', mapsQuery: vf.mapsQuery };
}

// ─── setVenue — THE one venue WRITE path ─────────────────────────────────────
// Counterpart to venueFor: a surface that stores a venue builds its patch HERE,
// so home-kind inference and the strict city gate can never fork per call site
// (the quick-add carried its own copy of both — write-seam wave 4's last hole).
//   name          the venue string the host typed — kept VERBATIM
//   locationText  optional "City, ST" / ZIP text; gated through
//                 parseVenueLocation — a bare/ambiguous city writes NOTHING
//                 (the manual "Which town?" field's exact rule)
//   current       the event, so an explicit kind the host already set survives
//                 a rename instead of being silently flipped.
// ── IS THIS NAME A PRIVATE HOME? BY WORDS, NOT LETTERS (11/16/2026) ─────────
// The guess used to be a bare substring test (/backyard|house|home|yard|place|
// garden/), so "The Boathouse", "Riverside Clubhouse", "Madison Square Garden"
// and "Union Place Hotel" all became the host's home. The whole name must be a
// home phrase: "home", "backyard", or a home word after my/our/the or a
// possessive ("Mom's house", "my sister's place", "Mom and Dad's house") — the
// same line smartParseEvent draws at creation.
const HOME_WORD = '(?:back\\s?yard|yard|home|house|place|garden|apartment|condo)';
const HOME_NAME = new RegExp(
  '^(?:at\\s+)?(?:home|back\\s?yard|' +
  '(?:(?:my|our)\\s+)?(?:[a-z][\\w.-]*(?:\\s+(?:and|&)\\s+[a-z][\\w.-]*)?[\'\u2019]s\\s+)' + HOME_WORD + '|' +
  '(?:my|our)\\s+' + HOME_WORD + '|' +
  'the\\s+(?:back\\s?yard|yard|house|home))$', 'i');
export const isHomeVenueName = (v) => HOME_NAME.test(String(v || '').trim().replace(/\s+/g, ' '));
// What the OLD guess matched, kept only to recognize its mistakes on read.
const OLD_HOME_GUESS = /backyard|house|home|yard|place|garden/i;

//   resolved      optional suggestion picked from the address lookup
//                 (addressSuggest.nominatimToSuggestion): its street, town,
//                 state, ZIP and coordinates are stored as given — a part the
//                 lookup did not return is left empty, never filled in.
export function setVenue(current, { name, locationText, resolved } = {}) {
  const cur = current || {};
  if (resolved && String(resolved.street || '').trim()) return resolvedVenuePatch(cur, resolved);
  const v = String(name || '').trim();
  const parsed = locationText
    ? (() => { try { return parseVenueLocation(String(locationText)); } catch { return null; } })()
    : null;
  return {
    venue: v,
    venueKind: isHomeVenueName(v) ? 'home' : String(cur.venueKind || ''),
    // A new place is a new question: the old answer to "is this a private home?"
    // was about a different address.
    venueConfirmed: false,
    // The old place's street, ZIP and coordinates belonged to it (11/21/2026):
    // a place saved as typed must not show the previous one's ZIP.
    ...(cur.venueStreet || cur.venueZip || cur.venueAddress || cur.venueLat != null
      ? { venueStreet: '', venueZip: '', venueAddress: '', venueLat: null, venueLon: null } : {}),
    ...(parsed
      ? (parsed.zip ? { venueCity: parsed.zip } : { venueCity: parsed.city, venueState: parsed.state })
      : {}),
  };
}

const streetKey = (x) => String(x || '').toLowerCase().split(',')[0]
  .replace(/\b(lane|ln)\b/g, 'ln').replace(/\b(street|st)\b/g, 'st').replace(/\b(road|rd)\b/g, 'rd')
  .replace(/\b(avenue|ave)\b/g, 'ave').replace(/\b(drive|dr)\b/g, 'dr').replace(/\b(court|ct)\b/g, 'ct')
  .replace(/\b(boulevard|blvd)\b/g, 'blvd').replace(/\b(place|pl)\b/g, 'pl').replace(/[^a-z0-9]+/g, ' ').trim();

function resolvedVenuePatch(cur, r) {
  const street = String(r.street).trim();
  const state = /^[A-Z]{2}$/.test(String(r.stateCode || '')) ? r.stateCode : '';
  const before = venueFor(cur);
  // A lookup that names no town keeps the town the event already has, when it
  // is in the same state: the host's own answer, not a guess.
  const city = String(r.cityName || '').trim() || (state && before.state === state ? before.city : '');
  const zip = /^\d{5}$/.test(String(r.zip || '')) ? r.zip : '';
  const placeName = String(r.name || '').trim();
  // Re-picking the street already on the plan (now with its ZIP) is the same
  // place, so the host's "your home, confirmed" stands.
  const samePlace = !!before.address && streetKey(before.address) === streetKey(street);
  const lat = Number(r.lat), lon = Number(r.lon);
  return {
    venue: placeName,
    venueKind: isHomeVenueName(placeName) ? 'home' : String(cur.venueKind || ''),
    venueConfirmed: samePlace ? !!cur.venueConfirmed : false,
    venueStreet: street,
    venueCity: city,
    venueState: state,
    venueZip: zip,
    venueAddress: withMissingParts(street, city, state, zip),
    venueLat: Number.isFinite(lat) ? lat : null,
    venueLon: Number.isFinite(lon) ? lon : null,
  };
}

// The host confirms what the place IS (her home, or a venue) with no business
// search. setVenue only guesses venueKind from the name; this is the host's own
// answer, so it also records `confirmed`. Nothing here can mark a place booked:
// a residence is a location, not a vendor.
export function confirmVenue(current, { kind } = {}) {
  if (kind !== 'home' && kind !== 'venue') throw new Error('confirmVenue: kind must be "home" or "venue"');
  return { venueKind: kind, venueConfirmed: true };
}
