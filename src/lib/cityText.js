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
