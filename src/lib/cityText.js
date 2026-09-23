import US_CITIES from './usCities';

// CITY-LEAK-1 — shared gate for "is this a city name, or a whole venue/address
// string?" Guards every seam where a remembered city crosses events (the
// Where & when localStorage seed, the ngw-host-city writeback) and where a
// polluted venueCity would otherwise build a garbage geocode query
// ("VFW Post 3150 — Alexandria, VA, MD, US" → geocode null → WeatherAlert
// silently never renders). Deliberately permissive: it only rejects strings
// that clearly cannot be a bare city — digits (street numbers, "Post 3150"),
// em/en dashes (venue — city compounds), or implausible length. "St. Louis",
// "Winston-Salem", and "Washington, DC" all pass.
export function isPlausibleCityText(v) {
  const s = String(v || '').trim();
  if (!s) return false;
  if (s.length > 48) return false;      // longer than any real city + ", ST"
  if (/\d/.test(s)) return false;       // digits → address/venue-shaped
  if (/[—–]/.test(s)) return false;     // em/en dash → "Venue — City, ST" compounds
  return true;
}

// ─── parseVenueLocation — the STRICTER gate for the venue-check flow ─────────
// isPlausibleCityText above is deliberately permissive (used broadly for
// memory/localStorage seams where a bare city is fine). A bare city is NOT
// enough where the app commits to a location for weather/maps geocoding —
// "Springfield", "Arlington", "Manchester", and dozens of other US city names
// exist in multiple states, and OpenWeather's geocode (limit=1, see
// lib/weather.js geocodeVenue) will silently resolve to the wrong one with no
// error. Require "City, ST" (or the full state name) or a 5-digit ZIP; reject
// a bare city outright rather than guess.
const US_STATE_ABBR = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM',
  'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
  'WV', 'WI', 'WY',
]);
export const US_STATE_NAME_TO_ABBR = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY',
  louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};

// parseVenueLocation(input) → { zip } | { city, state } | null (invalid — reject).
export function parseVenueLocation(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  const zip = s.match(/^(\d{5})(-\d{4})?$/);
  if (zip) return { zip: zip[1] };
  if (/\d/.test(s)) return null;          // digits outside a bare ZIP → address-shaped, not "City, ST"
  if (/[—–]/.test(s)) return null;
  if (s.length > 60) return null;
  const m = s.match(/^([^,]+),\s*(.+)$/); // "City, ST" or "City, State Name"
  if (!m) return null;
  const city = m[1].trim();
  const stateRaw = m[2].trim();
  if (!isPlausibleCityText(city)) return null;
  const abbr = stateRaw.toUpperCase();
  if (US_STATE_ABBR.has(abbr)) return { city, state: abbr };
  const byName = US_STATE_NAME_TO_ABBR[stateRaw.toLowerCase()];
  if (byName) return { city, state: byName };
  return null;
}

// ─── resolveSpokenCity — the TOWN SHE NAMED, WITHOUT A STATE (2026-09-18) ────
//
// THIS DOES NOT LOOSEN parseVenueLocation. That gate is untouched and still
// refuses a bare city outright, because it answers "may the app COMMIT this
// string as a located venue?" — and for that question a guessed state is worse
// than asking (see its comment above; the manual "Which town?" field, the
// creation seam and setVenue all still route through it).
//
// This answers a DIFFERENT and weaker question: "did the host name a town at
// all?" Measured 2026-09-18 on the seed corpus: three of seven real sentences
// lost the town entirely — "Reunion in Asheville Aug 3 to Aug 7 2027",
// "Bachelorette weekend trip to Nashville", "Cookout in 20770 for 30" — and the
// town is what gates weather, the shopping list, lodging search and maps. The
// parser was throwing away a fact the host stated plainly.
//
// TWO PROPERTIES, both deliberate:
//
//   1. A NON-PLACE WORD CAN NEVER BECOME A CITY. Membership in the curated
//      lib/usCities.js list — the ~240 largest metros, all 50 state capitals
//      and the popular event/wedding destinations, already statically bundled
//      for the city autocomplete — is the whole admission test. It is a
//      WHITELIST, not a regex: "Memory", "Grand Ballroom", "Aisha's", "June"
//      and "Vida" are not on it and can never resolve. (Vida is a REAL US place
//      — Vida, OR — and is still refused, which is the point: the 29,738-entry
//      usCitiesFull list would admit person-shaped names like Vida, Linda and
//      May, so it is deliberately NOT the list used here. It is also
//      dynamic-import-only, so a sync parser could not read it anyway.)
//
//   2. THE STATE IS NEVER GUESSED — `state` is always null here, even when the
//      name appears exactly once in the list. PROOF that "unique in the list"
//      would be a lie: "Arlington" appears once, as Arlington, TX, because
//      Arlington, VA (pop. ~238k, and the likelier one for this app's
//      Washington-area hosts) is not in the curated set. Publishing TX there
//      would fabricate a fact the host never typed, which is exactly what
//      parseVenueLocation exists to prevent. Ambiguous names resolve too
//      ("Springfield", "Charleston") — carrying the host's own word forward is
//      not the same as resolving it, and the state stays hers to supply.
//
// Returns { city, state: null } or null. `city` is the LIST's spelling of the
// name ("St. Louis", "Winston-Salem"), never a new string.
const MAJOR_CITY_BY_NAME = (() => {
  const idx = new Map();
  for (const entry of US_CITIES) {
    const i = String(entry).lastIndexOf(',');
    if (i < 0) continue;
    const name = String(entry).slice(0, i).trim();
    const key = name.toLowerCase();
    if (!key) continue;
    if (!idx.has(key)) idx.set(key, name);
  }
  return idx;
})();

export function resolveSpokenCity(v) {
  const s = String(v || '').trim().replace(/\s+/g, ' ');
  if (!s) return null;
  if (s.includes(',')) return null;        // "City, ST" is parseVenueLocation's job, not this one
  if (!isPlausibleCityText(s)) return null; // digits / dashes / absurd length, same shared gate
  const name = MAJOR_CITY_BY_NAME.get(s.toLowerCase());
  if (!name) return null;
  return { city: name, state: null };
}
