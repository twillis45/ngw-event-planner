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
import { isPlausibleCityText, parseVenueLocation } from './cityText';

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
  const name = nameIsPlace ? '' : rawName;
  // Kind rule: explicit venueKind wins; a host_event record defaults to home
  // ONLY while no venue is named — naming "VFW Post 3150" makes it a venue,
  // and demanding a city on top of a named venue was the exact false blocker
  // ctaStateTransitions locks against.
  const kind = ev.venueKind || (ev.recordKind === 'host_event' && !name ? 'home' : 'venue');
  const isHome = kind === 'home';
  // CITY-LEAK-1 gate rides INSIDE the accessor: a polluted venueCity ("VFW
  // Post 3150 — Alexandria, VA") never escapes as a city again.
  // An explicit venueCity still wins; the parsed one only fills a gap.
  const city = [ev.venueCity, ev.city].map((x) => String(x || '').trim()).find(isPlausibleCityText)
    || (nameIsPlace ? String(nameIsPlace.city || '').trim() : '') || '';
  const state = String(ev.venueState || ev.state || '').trim()
    || (nameIsPlace ? String(nameIsPlace.state || '').trim() : '');
  // event.address is a PHANTOM (whitelisted+read, never written) — deliberately
  // not consulted here; venueAddress and the structured parts are the truth.
  const street = String(ev.venueStreet || '').trim();
  // A real address needs a street — city/state alone must not masquerade as one
  // (they'd hijack mapsQuery away from the venue name).
  const address = String(ev.venueAddress || '').trim()
    || (street
      ? [street,
        city && state ? `${city}, ${state}` : (city || state),
        String(ev.venueZip || '').trim()].filter(Boolean).join(', ')
      : '');
  // The at-home carve-out, defined ONCE: a home host's location lives in
  // venueCity; a named-venue host's lives in venue. (Three engines used to
  // each carry their own copy of this rule.)
  const isSet = isHome ? !!(city || name) : !!name;
  // The SECOND venue question, distinct from isSet: an at-home event can be
  // "set" (name or city) yet still need a CITY for weather geocoding and maps.
  // The reveal blocker and the shell's city ask both ask THIS, not isSet —
  // they were two of the three hand-copied variants the audit flagged.
  const needsCityForWeather = isHome && !city;
  const displayLine = name
    ? [name, city].filter(Boolean).join(', ')
    : (isHome && city ? `At home in ${city}` : city);
  const mapsQuery = address
    || [name && !HOMEISH.test(name) ? name : '', city, state].filter(Boolean).join(', ');
  return { name, kind, isHome, city, state, address, isSet, needsCityForWeather, displayLine, mapsQuery };
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
export function setVenue(current, { name, locationText } = {}) {
  const v = String(name || '').trim();
  const parsed = locationText
    ? (() => { try { return parseVenueLocation(String(locationText)); } catch { return null; } })()
    : null;
  return {
    venue: v,
    venueKind: /backyard|house|home|yard|place|garden/i.test(v) ? 'home' : String((current || {}).venueKind || ''),
    ...(parsed
      ? (parsed.zip ? { venueCity: parsed.zip } : { venueCity: parsed.city, venueState: parsed.state })
      : {}),
  };
}
