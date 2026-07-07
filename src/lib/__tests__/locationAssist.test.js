// LOCATION-ROBUSTNESS-2 — phone location is a permissioned assist, never the
// event location. No load-time requests, no silent overwrite, no leakage to
// guest/vendor/public copy, no fake addresses from coordinates.

import { deriveCurrentLocationAssist, eventLocationStatus, weatherCoordsFallback } from '../locationAssist';
import { draftGuestUpdate, draftParkingInstructions } from '../doItForMe';
import fs from 'fs';
import path from 'path';

const ev = (over = {}) => ({ id: 'e-loc', type: 'bbq', date: '2026-08-01', ...over });

test('1 · geolocation is never requested on load — only inside the tap handler', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'App.js'), 'utf8');
  const uses = app.match(/navigator\.geolocation/g) || [];
  expect(uses.length).toBe(1); // exactly the one tap handler
  const idx = app.indexOf('navigator.geolocation');
  const before = app.slice(Math.max(0, idx - 600), idx);
  expect(before).toMatch(/const useForWeather = \(\) =>/); // inside the click-invoked fn
  expect(app).not.toMatch(/useEffect\([^)]*geolocation/);
});

test('2+3 · assist never sets event location fields — only the weather fallback coords', () => {
  const a = deriveCurrentLocationAssist(ev(), { lat: 38.9, lon: -76.8 });
  a.suggestions.forEach(sg => expect(sg.safeToApplyAutomatically).toBe(false));
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'App.js'), 'utf8');
  const block = app.slice(app.indexOf('function LocationAssistBlock'), app.indexOf('function LocationAssistBlock') + 4500);
  expect(block).toMatch(/upd\('weatherFallbackCoords'/);
  expect(block).not.toMatch(/upd\('venue'|upd\('venueAddress'|upd\('city'|upd\('venueCity'/);
});

test('4+5 · event location always wins as weather source; fallback only when location is missing', () => {
  expect(weatherCoordsFallback(ev({ venue: 'Bowie, MD', weatherFallbackCoords: { lat: 1, lon: 2 } }))).toBeNull();
  expect(weatherCoordsFallback(ev({ city: 'Bowie', weatherFallbackCoords: { lat: 1, lon: 2 } }))).toBeNull();
  expect(weatherCoordsFallback(ev({ weatherFallbackCoords: { lat: 38.9, lon: -76.8 } })))
    .toEqual({ lat: 38.9, lon: -76.8, fallback: true });
  expect(weatherCoordsFallback(ev())).toBeNull();
});

test('6 · fallback copy clearly says current-location fallback (App source)', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'App.js'), 'utf8');
  expect(app).toMatch(/Using your current location for weather until the event location is added/);
});

test('7+8 · guest and vendor copy never carry phone-location coords', () => {
  const e = ev({ venue: 'Home', venueAddress: '12 Oak Ln', parking: 'Street parking',
    weatherFallbackCoords: { lat: 38.912, lon: -76.812 }, guests: [] });
  const guest = JSON.stringify(draftGuestUpdate(e, { type: 'general' }));
  const parkingDraft = JSON.stringify(draftParkingInstructions(e, {}));
  ['38.912', '-76.812', 'weatherFallbackCoords', 'current location'].forEach(bad => {
    expect(guest).not.toContain(bad);
    expect(parkingDraft).not.toContain(bad);
  });
});

test('9+10 · denied/unavailable paths show calm manual fallback (source contract)', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'App.js'), 'utf8');
  expect(app).toMatch(/No problem — location stays off/);
  expect(app).toMatch(/Location isn’t available on this device/);
});

test('11+12+13 · status classification drives the right asks', () => {
  expect(eventLocationStatus(ev())).toBe('missing');
  expect(eventLocationStatus(ev({ city: 'Bowie' }))).toBe('city_only');
  expect(eventLocationStatus(ev({ venue: 'VFW Post 3150' }))).toBe('venue_only');
  expect(eventLocationStatus(ev({ venueAddress: '12 Oak Ln, Bowie, MD' }))).toBe('full_address');
  const missing = deriveCurrentLocationAssist(ev(), null);
  expect(missing.suggestions.map(s => s.type)).toEqual(['set_event_location', 'weather_fallback']);
  const cityOnly = deriveCurrentLocationAssist(ev({ city: 'Bowie' }), null);
  expect(cityOnly.suggestions.map(s => s.type)).toEqual(['set_event_location']);
  expect(cityOnly.suggestions[0].title).toMatch(/full address/i);
  // venue-only: phone location never treated as a confirmed address — no suggestions push coords anywhere
  const venueOnly = deriveCurrentLocationAssist(ev({ venue: 'VFW' }), { lat: 1, lon: 2 });
  expect(venueOnly.suggestions.length).toBe(0);
});

test('16+19 · privacy-safe copy: no tracking/monitor/at-the-venue claims', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'App.js'), 'utf8');
  const block = app.slice(app.indexOf('function LocationAssistBlock'), app.indexOf('function LocationAssistBlock') + 4500);
  expect(block).not.toMatch(/tracking|monitor|we know|at the venue|guests.*can see/i);
  expect(block).toMatch(/Never shared with guests or vendors/);
});

test('17+18 · no fake nearby search: assist suggestions carry no vendor/search results', () => {
  const a = deriveCurrentLocationAssist(ev(), { lat: 1, lon: 2 });
  expect(JSON.stringify(a)).not.toMatch(/nearby_need|search result|found \d+ (stores|vendors)/i);
});
