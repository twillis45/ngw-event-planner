// ─── locationAssist — LOCATION-ROBUSTNESS-2 ──────────────────────────────────
//
// Phone location is NOT event location. The event's address/venue/city stays
// canonical for weather, guest directions, the vendor brief, and the day-of
// plan. The phone's location is a permissioned, tap-triggered ASSIST:
//   · weather fallback while the event location is missing (temporary,
//     clearly labeled, cleared the moment a real location exists)
//   · a prompt to set the event location manually (we have NO reverse
//     geocoder, so coordinates never become a fake address)
// HARD RULES (test-locked): never requested on page load; never overwrites
// the event location; never stored beyond the fallback coords the host
// explicitly approved; never appears in guest, vendor, or public-brief
// output; no "you are at the venue" claims (no reliable accuracy model);
// no fake nearby-search results (no provider exists — nearby needs route
// to the host's own notes/lists instead).
//
// deriveCurrentLocationAssist(event, deviceLocation) is a PURE classifier —
// the browser geolocation call itself lives in the UI, inside a tap handler.

const has = (v) => !!String(v || '').trim();
// CITY-LEAK guard: a city field counts as a location only when it looks like
// a city (the pollution incident left venue strings in city fields).
let _isPlausibleCity = (v) => has(v);
try { _isPlausibleCity = require('./cityText').isPlausibleCityText; } catch { /* keep permissive */ }

export function eventLocationStatus(event) {
  const ev = event || {};
  if (has(ev.venueAddress)) return 'full_address';
  if (has(ev.venue)) return 'venue_only';
  if ((has(ev.venueCity) && _isPlausibleCity(ev.venueCity)) || (has(ev.city) && _isPlausibleCity(ev.city))) return 'city_only';
  return 'missing';
}

export function deriveCurrentLocationAssist(event, deviceLocation) {
  const ev = event || {};
  const status = eventLocationStatus(ev);
  const dev = deviceLocation && Number.isFinite(Number(deviceLocation.lat)) && Number.isFinite(Number(deviceLocation.lon))
    ? { lat: Number(deviceLocation.lat), lon: Number(deviceLocation.lon) } : null;
  const suggestions = [];

  if (status === 'missing') {
    // No reverse geocoder exists — coordinates never become an address. The
    // honest assists: manual add (always) + weather-only fallback (tap-gated).
    suggestions.push({
      id: 'add-location-manual',
      type: 'set_event_location',
      title: 'Add the event location',
      body: 'Weather, directions, and parking notes all key off it.',
      actionLabel: 'Add the location',
      route: { tab: 'Event Details', focusField: 'event-venue' },
      safeToApplyAutomatically: false,
    });
    suggestions.push({
      id: 'weather-fallback',
      type: 'weather_fallback',
      title: 'Use your current location for weather until the event location is added?',
      body: 'Used only for the forecast, only until you add the real location. Nothing is shared with guests or vendors.',
      actionLabel: 'Use current location for weather',
      requiresDeviceLocation: true, // UI requests permission ON TAP, never on load
      safeToApplyAutomatically: false,
    });
  } else if (status === 'city_only') {
    suggestions.push({
      id: 'add-full-address',
      type: 'set_event_location',
      title: 'Add the full address',
      body: 'A city gets you weather; guests and vendors need the street address.',
      actionLabel: 'Add the address',
      route: { tab: 'Event Details', focusField: 'event-venue' },
      safeToApplyAutomatically: false,
    });
  }

  // Weather source truth: the moment ANY event location exists, it is the
  // weather source — the fallback is expired even if coords linger.
  const fallbackActive = status === 'missing' && !!(ev.weatherFallbackCoords
    && Number.isFinite(Number(ev.weatherFallbackCoords.lat)));

  return {
    permissionState: dev ? 'granted' : 'unknown', // the UI owns the real Permissions API state
    eventLocationStatus: status,
    currentLocationAvailable: !!dev,
    weatherFallbackActive: fallbackActive,
    suggestions,
  };
}

// Weather coordinate source with the canonical precedence baked in: the
// EVENT location always wins; the host-approved fallback applies only while
// the event has no location text at all. Returns {lat, lon, fallback} | null.
export function weatherCoordsFallback(event) {
  const ev = event || {};
  if (eventLocationStatus(ev) !== 'missing') return null; // event location wins — geocode it instead
  const c = ev.weatherFallbackCoords;
  if (c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lon))) {
    return { lat: Number(c.lat), lon: Number(c.lon), fallback: true };
  }
  return null;
}
