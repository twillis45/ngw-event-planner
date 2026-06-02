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

const API_KEY = process.env.REACT_APP_OPENWEATHER_KEY;
const BASE = 'https://api.openweathermap.org/data/3.0/onecall';

export const isWeatherConfigured = () => Boolean(API_KEY);

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
  if (!API_KEY || !venue) return null;
  try {
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
  if (!API_KEY || !lat || !lon || !eventDateIso) return null;

  const daysOut = Math.ceil((new Date(eventDateIso) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysOut < 0 || daysOut > 14) return null; // outside forecast window

  try {
    const res = await fetch(
      `${BASE}?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&units=imperial&appid=${API_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json();

    // Find the daily forecast matching the event date
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

    // Risk classification
    const isThunder = conditions.toLowerCase().includes('thunderstorm');
    const isHeavyRain = conditions.toLowerCase().includes('rain') && pop >= 70;
    const isRain = conditions.toLowerCase().includes('rain') && pop >= 40;
    const isSnow = conditions.toLowerCase().includes('snow');
    const isExtreme = tempMax >= 100 || tempMin <= 20;

    let risk = 'clear';
    let summary = `Clear forecast — ${tempMin}°–${tempMax}°F, ${pop}% precipitation`;

    if (isThunder || isSnow || isExtreme) {
      risk = 'high';
      summary = isThunder
        ? `Thunderstorms forecast (${pop}% chance) — have an indoor backup ready`
        : isSnow
        ? `Snow forecast — confirm vendor arrival times and guest logistics`
        : `Extreme temperature forecast (${tempMax >= 100 ? tempMax + '°F high' : tempMin + '°F low'}) — plan accordingly`;
    } else if (isHeavyRain) {
      risk = 'high';
      summary = `Heavy rain likely (${pop}%) — rain plan required`;
    } else if (isRain) {
      risk = 'medium';
      summary = `Rain possible (${pop}%) — monitor and prepare a rain plan`;
    } else if (pop >= 30) {
      risk = 'low';
      summary = `Light precipitation possible (${pop}%) — worth monitoring`;
    }

    return {
      date: eventDateIso,
      daysOut,
      risk,
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
