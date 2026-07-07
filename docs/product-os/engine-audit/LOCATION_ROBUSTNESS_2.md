# LOCATION-ROBUSTNESS-2 — Permissioned Phone-Location Assist

Date: 2026-07-07 · Slice type: privacy-bounded location assist · Status: SHIPPED

## 1. Executive verdict
The app had ZERO geolocation usage (clean baseline). It now has exactly one, tap-gated use: a host with no event location can opt their phone location in as a clearly-labeled, temporary **weather fallback**. Phone location never becomes the event location (no reverse geocoder exists, so coordinates never turn into a fake address), never persists beyond the approved fallback coords, and never reaches guest/vendor/public output — all test-locked.

## 2. Phone Location Assist Matrix
| Event location status | Assist offered | Behavior |
|---|---|---|
| missing | "Add the event location" (manual, first option) + "Use current location for weather" | tap → browser permission → rounded coords (3 decimals ≈ city precision) stored as `event.weatherFallbackCoords`; forecast runs on them with the note "Using your current location for weather until the event location is added"; host can "Stop using it" |
| city_only | "Add the full address" → event-venue field | manual only |
| venue_only / full_address | nothing — event location is canonical; phone location has no role | (test: no suggestions, coords never treated as confirmed address) |
| any + fallback coords lingering | event location WINS — `weatherCoordsFallback` returns null the moment any location text exists (self-expiring, live-verified) | |

## 3–4. Files
- `src/lib/locationAssist.js` — NEW: `deriveCurrentLocationAssist`, `eventLocationStatus`, `weatherCoordsFallback` (pure; the geolocation call lives in the UI tap handler only).
- `src/App.js` — `LocationAssistBlock` on Where & when (both host/planner venue branches); WeatherAlert coords: `geocodeVenue(event…) || weatherCoordsFallback(event)` + labeled fallback note.
- `src/lib/__tests__/locationAssist.test.js` — NEW, 9 tests.

## 5–8. Boundaries & behaviors
Event location canonical (weather/guests/brief unchanged); phone location tap-only (`navigator.geolocation` appears exactly ONCE in the codebase, inside the tap handler — source-contract test); denied → "No problem — location stays off…" manual path; unavailable → calm copy; coords rounded to ~110m precision (all a forecast needs); fallback active only while location is missing.

## 9–10. Day-of assist & nearby needs — PARKED honestly
Near-venue/day-of proximity assist needs event coordinates + an accuracy model we don't have ("near, not at" can't be honored reliably yet) — parked. Nearby-needs search: no provider exists; the existing "Find local help near you" chips (real Google Maps links keyed off the EVENT city) already cover it without faking results — no phone-location variant added.

## 11–12. Privacy
No tracking/monitor/at-the-venue language (test-banned in the block); permission copy: "Used only to help with this event's forecast until the real location is added. Never shared with guests or vendors." Guest update + parking drafts proven coordinate-free by test. Not stored: precise coords, location history, any phone location once an event location exists.

## 13–14. CTAs & mobile
Manual add routes to the event-venue anchor; the phase-progress cue ("Add the location →") lands directly on the form with the assist visible. Mobile 375px: block fits, 40px tap target, no overflow.

## 15–22. Tests & suites & preview
9 contract tests (load-time ban, no-overwrite, precedence, fallback copy, guest/vendor coordinate leak-proofing, denied/unavailable, status classification, privacy language, no fake nearby results). Full frontend **2131/2131 (130 suites)** · backend **97/97** · build clean (one JSX-fragment fix en route). Live-verified: assist renders for a location-less event; tap → calm denied path in the emulated browser; granted-state simulation → fallback forecast WITH the label (composing with WEATHER-IMPACT-1 phase copy); adding a venue retired the fallback instantly even with stale coords. Disposable event cleaned.

## 23. Parked
Day-of proximity assist + reverse-geocoded "use as event location" (needs a reverse geocoder decision), Permissions API state read (the helper reports UI-observed state only).

## 24. Recommendation
Accept.
