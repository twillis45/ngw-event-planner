// ─── Address suggestions stay in the host's state ────────────────────────────
// The geocoder ranks by its own idea of prominence, so "Pasadena" returns
// California first for a host planning in Maryland (issue #100 follow-up,
// 11/5/2026). The event usually already knows its state; when it does, those
// suggestions lead. Order only — a host may be planning somewhere else, so
// nothing is ever filtered out.
import { venueFor } from './venueFor';

/** Two-letter state the event already holds, or '' when it holds none.
 *  Read through venueFor, the one venue reader (venueSourceProof). */
export function knownStateCode(ev) {
  if (!ev) return '';
  const st = String(venueFor(ev).state || '').trim();
  return /^[A-Za-z]{2}$/.test(st) ? st.toUpperCase() : '';
}

/** Stable: suggestions in `stateCode` first, everything else in provider order. */
export function preferState(sugs, stateCode) {
  const st = String(stateCode || '').toUpperCase();
  if (!st || !Array.isArray(sugs)) return sugs;
  return [...sugs.filter((s) => s && s.stateCode === st), ...sugs.filter((s) => !s || s.stateCode !== st)];
}

// ─── One lookup result, read whole (owner report, iPad, 11/21/2026) ──────────
// "Should find city and state with zip." The app's address lookup (OpenStreetMap
// Nominatim, asked with addressdetails=1) already returned the house number,
// road, town, state, ZIP and coordinates; the venue field kept only the first
// three comma pieces of the display name. This reads the parts it returns and
// nothing else: no ZIP from a result without a postcode, no state without one.
const STATE_ISO = /^US-([A-Z]{2})$/;
export function nominatimToSuggestion(x) {
  const a = (x && x.address) || {};
  const cityName = String(a.city || a.town || a.village || a.hamlet || '').trim();
  const iso = String(a['ISO3166-2-lvl4'] || '');
  const stateCode = STATE_ISO.test(iso) ? iso.slice(3) : '';
  const street = [a.house_number, a.road].map((p) => String(p || '').trim()).filter(Boolean).join(' ');
  const zipM = /^(\d{5})(?:-\d{4})?$/.exec(String(a.postcode || '').trim());
  const zip = zipM ? zipM[1] : '';
  // A named place (a hall, a park) keeps its name; an address has none.
  const rawName = String((x && x.name) || '').trim();
  const name = rawName && rawName !== a.road && rawName !== a.house_number && rawName !== cityName ? rawName : '';
  const town = [cityName && stateCode ? `${cityName}, ${stateCode}` : (cityName || stateCode), zip].filter(Boolean).join(' ');
  const line = [name, street, town].filter(Boolean).join(', ');
  const short = String((x && x.display_name) || '').split(',').slice(0, 3).join(',');
  const lat = Number(x && x.lat), lon = Number(x && x.lon);
  return {
    label: short,
    // "Town, State" — the shape older callers read.
    city: cityName + (a.state ? ', ' + a.state : ''),
    stateCode, street, cityName, zip, name, line,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
}
