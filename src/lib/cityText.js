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
const US_STATE_NAME_TO_ABBR = {
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
