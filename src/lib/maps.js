/**
 * Google Maps Places Autocomplete — Sprint 63.1
 *
 * Adds venue/address autocomplete to event create and vendor forms.
 * Degrades gracefully when REACT_APP_GOOGLE_MAPS_KEY is not set — the
 * field stays a plain text input with no autocomplete.
 *
 * CTA truthfulness: "Suggested by Google Maps" label on autocomplete results.
 * Source of truth: user must confirm the selected address — it's not auto-applied.
 */

const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;

export const isMapsConfigured = () => Boolean(API_KEY);

let _scriptLoaded = false;
let _scriptLoading = false;
const _callbacks = [];

/** Load the Google Maps Places JS library once. */
export function loadMapsScript() {
  if (!API_KEY) return Promise.resolve(false);
  if (_scriptLoaded) return Promise.resolve(true);
  if (_scriptLoading) {
    return new Promise((res) => _callbacks.push(res));
  }
  _scriptLoading = true;
  return new Promise((resolve) => {
    _callbacks.push(resolve);
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      _scriptLoaded = true;
      _scriptLoading = false;
      _callbacks.forEach(cb => cb(true));
      _callbacks.length = 0;
    };
    script.onerror = () => {
      _scriptLoading = false;
      _callbacks.forEach(cb => cb(false));
      _callbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

/**
 * Attach Google Places Autocomplete to an input element.
 * Returns a cleanup function to remove the listener.
 *
 * @param {HTMLInputElement} input - the input element
 * @param {Function} onSelect - called with { address, city, state, zip, country, lat, lon, placeId, name }
 * @param {string[]} types - ['establishment'] for venues, ['address'] for street addresses
 */
export function attachAutocomplete(input, onSelect, types = ['establishment', 'geocode']) {
  if (!window.google?.maps?.places) return () => {};

  const autocomplete = new window.google.maps.places.Autocomplete(input, {
    types,
    fields: ['formatted_address', 'geometry', 'name', 'place_id', 'address_components'],
  });

  const listener = autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) return;

    const components = place.address_components || [];
    const get = (type) => components.find(c => c.types.includes(type))?.long_name || '';
    const getShort = (type) => components.find(c => c.types.includes(type))?.short_name || '';

    onSelect({
      address: place.formatted_address || '',
      name:    place.name || '',
      city:    get('locality') || get('sublocality'),
      state:   getShort('administrative_area_level_1'),
      zip:     get('postal_code'),
      country: getShort('country'),
      lat:     place.geometry.location.lat(),
      lon:     place.geometry.location.lng(),
      placeId: place.place_id,
    });
  });

  return () => window.google.maps.event.removeListener(listener);
}
