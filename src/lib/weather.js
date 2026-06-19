/**
 * Weather risk alerts — Sprint 63 (Phase 2)
 *
 * Uses OpenWeather One Call API 3.0 (free tier: 1000 calls/day).
 * Only called when REACT_APP_OPENWEATHER_KEY is set AND the event is
 * within 14 days. Returns structured risk data for the Event Command surface.
 *
 * CTA truthfulness: forecast ≠ guarantee. All weather data labeled as forecast.
 * Outdoor events only — indoor events skip the check.
 */

import { daysUntil } from './dates';

const API_KEY = process.env.REACT_APP_OPENWEATHER_KEY;
const BASE = 'https://api.openweathermap.org/data/3.0/onecall';
// Sprint 52B — prefer the backend weather proxy (key stays server-side). Falls
// back to a direct REACT_APP_OPENWEATHER_KEY call for local dev.
const PROXY = process.env.REACT_APP_API_BASE_URL;

export const isWeatherConfigured = () => Boolean(API_KEY || PROXY);

/** Outdoor venue keywords — used to determine if weather check applies */
const OUTDOOR_KEYWORDS = [
  'garden', 'park', 'outdoor', 'outside', 'patio', 'terrace', 'rooftop',
  'beach', 'lawn', 'field', 'vineyard', 'winery', 'barn', 'farm', 'tent',
  'pavilion', 'amphitheater', 'backyard', 'estate grounds', 'lake', 'riverside',
];

export function isLikelyOutdoor(venue = '', notes = '') {
  const text = `${venue} ${notes}`.toLowerCase();
  return OUTDOOR_KEYWORDS.some(kw => text.includes(kw));
}

/**
 * Get coordinates for a venue string using OpenWeather Geocoding API.
 * Returns { lat, lon } or null on failure.
 */
export async function geocodeVenue(venue) {
  if (!venue || (!API_KEY && !PROXY)) return null;
  try {
    if (PROXY) {
      const res = await fetch(`${PROXY}/api/weather/geocode?q=${encodeURIComponent(venue)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data?.result || null;
    }
    const res = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(venue)}&limit=1&appid=${API_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) return null;
    return { lat: data[0].lat, lon: data[0].lon, name: data[0].name };
  } catch {
    return null;
  }
}

/**
 * Fetch weather forecast for lat/lon, return risk assessment for event date.
 * Returns null if not configured or forecast unavailable.
 *
 * Result shape:
 * {
 *   date: string,           // ISO date string
 *   risk: 'high'|'medium'|'low'|'clear',
 *   summary: string,        // "Rain likely (80%) — have a rain plan ready"
 *   temp: { min, max, unit },
 *   precipitation: number,  // probability 0-100
 *   conditions: string,     // "Light rain", "Thunderstorm", etc.
 *   icon: string,           // OpenWeather icon code
 *   disclaimer: string,     // always shown
 * }
 */
export async function getEventWeatherRisk(lat, lon, eventDateIso) {
  if ((!API_KEY && !PROXY) || !lat || !lon || !eventDateIso) return null;

  // Canonical day count (./dates) — same math the WeatherAlert uses to gate the
  // fetch, so the two never disagree at the 14-day boundary.
  const daysOut = daysUntil(eventDateIso);
  if (daysOut == null || daysOut < 0 || daysOut > 14) return null; // outside forecast window

  try {
    const res = PROXY
      ? await fetch(`${PROXY}/api/weather/onecall?lat=${lat}&lon=${lon}`)
      : await fetch(`${BASE}?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&units=imperial&appid=${API_KEY}`);
    if (!res.ok) return null;
    const data = await res.json();

    // Find the daily forecast matching the event date (proxy + direct both
    // expose a `daily` array).
    const eventDay = data.daily?.find(d => {
      const dayDate = new Date(d.dt * 1000).toISOString().slice(0, 10);
      return dayDate === eventDateIso;
    });

    if (!eventDay) return null;

    const pop = Math.round((eventDay.pop || 0) * 100); // precipitation probability %
    const conditions = eventDay.weather?.[0]?.main || '';
    const description = eventDay.weather?.[0]?.description || '';
    const icon = eventDay.weather?.[0]?.icon || '';
    const tempMin = Math.round(eventDay.temp?.min || 0);
    const tempMax = Math.round(eventDay.temp?.max || 0);

    // Risk classification. Heat is a first-class risk now (board #2): a dry 95°F
    // day used to read as "clear" and drive nothing, even though it dictates ice,
    // shade, and water for an outdoor event.
    const isThunder = conditions.toLowerCase().includes('thunderstorm');
    const isHeavyRain = conditions.toLowerCase().includes('rain') && pop >= 70;
    const isRain = conditions.toLowerCase().includes('rain') && pop >= 40;
    const isSnow = conditions.toLowerCase().includes('snow');
    const isHotExtreme = tempMax >= 100;
    const isColdExtreme = tempMin <= 20;
    const isHot = tempMax >= 95;   // plan ice/shade/water now
    const isWarm = tempMax >= 90;  // worth planning extra

    let risk = 'clear';
    let summary = `Clear forecast — ${tempMin}°–${tempMax}°F, ${pop}% precipitation`;

    if (isThunder || isSnow || isHotExtreme || isColdExtreme) {
      risk = 'high';
      summary = isThunder
        ? `Thunderstorms forecast (${pop}% chance) — have an indoor backup ready`
        : isSnow
        ? `Snow forecast — confirm vendor arrival times and guest logistics`
        : isHotExtreme
        ? `Extreme heat (${tempMax}°F) — ice, shade, and water are not optional`
        : `Extreme cold (${tempMin}°F) — plan heat and guest comfort`;
    } else if (isHeavyRain) {
      risk = 'high';
      summary = `Heavy rain likely (${pop}%) — rain plan required`;
    } else if (isHot) {
      risk = 'high';
      summary = `Hot day forecast (${tempMax}°F) — plan ice, shade, and water`;
    } else if (isRain) {
      risk = 'medium';
      summary = `Rain possible (${pop}%) — monitor and prepare a rain plan`;
    } else if (isWarm) {
      risk = 'medium';
      summary = `Warm day (${tempMax}°F) — plan extra ice and some shade`;
    } else if (pop >= 30) {
      risk = 'low';
      summary = `Light precipitation possible (${pop}%) — worth monitoring`;
    }

    return {
      date: eventDateIso,
      daysOut,
      risk,
      kind: (isHot || isWarm || isHotExtreme) && !isHeavyRain && !isThunder ? 'heat' : (isHeavyRain || isRain || isThunder ? 'rain' : (isColdExtreme ? 'cold' : (isSnow ? 'snow' : 'mixed'))),
      summary,
      temp: { min: tempMin, max: tempMax, unit: '°F' },
      precipitation: pop,
      conditions: description || conditions,
      icon,
      disclaimer: 'Weather forecast — accuracy decreases beyond 7 days.',
    };
  } catch {
    return null;
  }
}

/**
 * weatherLogistics — board #2: turn a forecast into CONCRETE day-of adjustments,
 * not just an alert banner. Heat bumps the ice math + promotes shade/water; rain
 * promotes the tent/canopy. Grounded in standard outdoor-event rules of thumb
 * (cookout ice ≈ 1.5 lb/guest baseline; ~2–2.5 lb/guest on a hot day for drink
 * coolers + cold-holding). Pure + synchronous so it's testable and the UI can
 * call it the moment a forecast lands. Returns [] when nothing is actionable.
 *
 * @param {object} wx     the getEventWeatherRisk result
 * @param {object} opts   { guests }
 * @returns {Array<{key,icon,text}>}
 */
export function weatherLogistics(wx, opts = {}) {
  if (!wx) return [];
  const guests = Math.max(0, Number(opts.guests) || 0);
  const tmax = wx.temp && Number.isFinite(wx.temp.max) ? wx.temp.max : null;
  const pop = Number(wx.precipitation) || 0;
  const round5 = (n) => Math.max(10, Math.round(n / 5) * 5);
  const out = [];

  // Heat → ice math + shade + water
  if (tmax != null && tmax >= 90) {
    const hot = tmax >= 95;
    const perGuest = hot ? 2.5 : 2;
    out.push({
      key: 'ice', icon: '🧊',
      text: guests > 0
        ? `Bump ice to ~${round5(guests * perGuest)} lbs (≈${perGuest} lb/guest) — ${tmax}° empties drink coolers fast and the food has to stay cold.`
        : `Plan extra ice (~${perGuest} lb/guest) — ${tmax}° empties drink coolers fast and the food has to stay cold.`,
    });
    out.push({ key: 'shade', icon: '⛱️', text: `Set up shade or a canopy — ${tmax}° with no cover is rough on guests and the food table.` });
    out.push({ key: 'water', icon: '💧', text: `Put out extra water — ${tmax}° pushes hydration, especially for elders and kids.` });
  }

  // Rain → cover/tent
  if (pop >= 70) {
    out.push({ key: 'tent', icon: '⛺', text: `Get the tent/canopy up — ${pop}% rain is a cover-the-food-and-guests call, not a maybe.` });
  } else if (pop >= 50) {
    out.push({ key: 'tent', icon: '⛺', text: `Have the canopy ready to raise — ${pop}% rain means you may need cover fast.` });
  }

  return out;
}
