// ─── eventGeoQuery — single source of truth for "where is this event" ────────
// Extracted from App.js (was a local, un-exported function despite its own
// doctrine comment already claiming "single source of truth" — every
// location-aware feature was supposed to resolve through here, but V2 had no
// way to import it, so it either lacked a location anchor entirely or would
// have needed a silently-drifting reimplementation, found in the 2026-07-11
// food-plan audit). Structured city/state first, then the picked metro, then
// free-text venue, then the host's remembered home city. Empty when truly
// unknown — never a fabricated location.
import { isPlausibleCityText } from './cityText';
import { METRO_MARKETS } from './vendorEstimator';

export const METRO_GEO = {
  nyc: { city: 'New York', state: 'NY' },     sf:  { city: 'San Francisco', state: 'CA' },
  la:  { city: 'Los Angeles', state: 'CA' },  bos: { city: 'Boston', state: 'MA' },
  dc:  { city: 'Washington', state: 'DC' },   sea: { city: 'Seattle', state: 'WA' },
  chi: { city: 'Chicago', state: 'IL' },      mia: { city: 'Miami', state: 'FL' },
  sd:  { city: 'San Diego', state: 'CA' },    den: { city: 'Denver', state: 'CO' },
  aus: { city: 'Austin', state: 'TX' },       dal: { city: 'Dallas', state: 'TX' },
  atl: { city: 'Atlanta', state: 'GA' },      phi: { city: 'Philadelphia', state: 'PA' },
  por: { city: 'Portland', state: 'OR' },     nas: { city: 'Nashville', state: 'TN' },
  min: { city: 'Minneapolis', state: 'MN' },  phx: { city: 'Phoenix', state: 'AZ' },
  hou: { city: 'Houston', state: 'TX' },      tam: { city: 'Tampa', state: 'FL' },
  cha: { city: 'Charlotte', state: 'NC' },    slc: { city: 'Salt Lake City', state: 'UT' },
  col: { city: 'Columbus', state: 'OH' },     pit: { city: 'Pittsburgh', state: 'PA' },
  ind: { city: 'Indianapolis', state: 'IN' }, kc:  { city: 'Kansas City', state: 'MO' },
  stl: { city: 'St. Louis', state: 'MO' },
};

export const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

// Best "City, ST" string for an event, for weather geocoding: structured city/state
// first, then the picked metro, then free-text venue. Empty when truly unknown.
// Single source of truth for "where is this event" — every location-aware feature
// (weather, store distances, pricing) resolves through here so they never disagree.
// Checks every place a location can land: the structured address from the wizard /
// "Where's it happening?" (venueCity/State/Address), the city/state, the picked metro,
// a real venue string — then defaults to the host's remembered HOME city when it's an
// at-home event with nothing explicit. Returns '' only when truly nothing is known.
export function eventGeoQuery(event, profile) {
  if (!event) return '';
  const st = String(event.state || event.venueState || '').trim().toUpperCase();
  // CITY-LEAK-1: a polluted venueCity (a full venue string like
  // "VFW Post 3150 — Alexandria, VA") would build a garbage geocode query and
  // silently kill the weather outlook. Only use city fields that actually look
  // like a city; otherwise fall through to address/venue below.
  const city = [event.venueCity, event.city]
    .map((x) => String(x || '').trim())
    .find(isPlausibleCityText) || '';
  if (city && US_STATES.includes(st)) return `${city}, ${st}, US`;
  const addr = String(event.venueAddress || '').trim();
  if (addr) return addr;
  // W&W audit fix: an explicit LOCATABLE venue string ("VFW Post 3150 —
  // Alexandria, VA") is the event's real place — it must beat the coarse
  // metro-market fallback ("near Atlanta" chips under an Alexandria venue).
  // Locatable = carries a digit or a comma/dash-separated locality; a bare
  // room name ("Grand Ballroom") still falls through to the metro.
  const vEarly = String(event.venue || '').trim();
  if (vEarly && /[\d,—-]/.test(vEarly) && !/^(host'?s home|our (place|home|backyard)|home)$/i.test(vEarly)) return vEarly;
  const g = event.market && METRO_GEO[event.market];
  if (g) return `${g.city}, ${g.state}, US`;
  // METRO_GEO covers fewer metros than the create-flow dropdown (METRO_MARKETS) — so a
  // host who picked e.g. Miami/SF/Boston set event.market but METRO_GEO missed it. Resolve
  // the picked market through the CANONICAL dropdown list so every choice yields a city.
  const mk = event.market && METRO_MARKETS.find((m) => m.id === event.market);
  if (mk && mk.label) return mk.label.split(/[/(]/)[0].trim(); // "San Francisco / Bay Area" → "San Francisco"
  if (city) return st ? `${city}, ${st}` : city;
  const v = String(event.venue || '').trim();
  if (v && !/^(host'?s home|our (place|home|backyard)|home)$/i.test(v)) return v;
  // Host-home default — an at-home event with no explicit place uses the HOST's own home
  // location from their profile (the user's home), then the remembered city. This is what
  // makes "default to the user's home" actually work for at-home gatherings.
  if (profile) {
    const pmk = profile.metroMarket || profile.market;
    const pg = pmk && METRO_GEO[pmk];
    if (pg) return `${pg.city}, ${pg.state}, US`;
    const pm = pmk && METRO_MARKETS.find((m) => m.id === pmk);
    if (pm && pm.label) return pm.label.split(/[/(]/)[0].trim();
    const pcity = String(profile.city || '').trim();
    if (pcity) { const pst = String(profile.state || '').trim().toUpperCase(); return pst ? `${pcity}, ${pst}` : pcity; }
    const paddr = String(profile.address || '').trim();
    if (paddr) return paddr;
  }
  try {
    const hc = (typeof localStorage !== 'undefined' && localStorage.getItem('ngw-host-city')) || '';
    const hs = (typeof localStorage !== 'undefined' && localStorage.getItem('ngw-host-state')) || '';
    // CITY-LEAK-1: a legacy-polluted remembered city (venue-shaped) is worse
    // than no default — skip it rather than geocode garbage.
    if (hc.trim() && isPlausibleCityText(hc)) return hs.trim() ? `${hc.trim()}, ${hs.trim()}` : hc.trim();
  } catch (e) { /* storage blocked */ }
  return '';
}
