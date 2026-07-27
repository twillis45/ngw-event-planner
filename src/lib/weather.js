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

import { daysUntil, spanEnd } from './dates';

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

  const data = await fetchForecast(lat, lon);
  if (!data) return null;
  return assessForecastDay(data, eventDateIso);
}

// One Call fetch, shared by the single-day and span readers so a multi-day
// event still costs ONE API call (free tier: 1000/day).
async function fetchForecast(lat, lon) {
  try {
    const res = PROXY
      ? await fetch(`${PROXY}/api/weather/onecall?lat=${lat}&lon=${lon}`)
      : await fetch(`${BASE}?lat=${lat}&lon=${lon}&exclude=current,minutely,alerts&units=imperial&appid=${API_KEY}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Classify ONE forecast day out of an already-fetched One Call payload.
 * Pure (no fetch) — this is the exact classifier getEventWeatherRisk has always
 * applied, extracted so the span reader can run it per day on a single payload.
 * Returns the same result shape as getEventWeatherRisk, or null when the daily
 * array doesn't cover the date.
 */
export function assessForecastDay(data, eventDateIso) {
  if (!data || !eventDateIso) return null;
  const daysOut = daysUntil(eventDateIso);
  try {
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

    // EVENT-ANCHORED COPY (2026-07-07): a weather alert must always relate to
    // THE EVENT — its day by name and, when the hourly forecast supports it,
    // the real rain window ("2–6 PM"). Never a generic "rain likely" a host
    // could mistake for today's weather.
    const dayName = (() => {
      try { return new Date(eventDateIso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' }); } catch { return ''; }
    })();
    const onDay = dayName ? `${dayName} (your event day)` : 'your event day';
    const rainWindow = computeRainWindow(data.hourly, eventDateIso, data.timezone_offset || 0);
    const windowTail = rainWindow && rainWindow.label ? `, ${rainWindow.label}` : '';

    let risk = 'clear';
    let summary = `Clear forecast for ${onDay} — ${tempMin}°–${tempMax}°F, ${pop}% precipitation`;

    if (isThunder || isSnow || isHotExtreme || isColdExtreme) {
      risk = 'high';
      summary = isThunder
        ? `Thunderstorms forecast for ${onDay} (${pop}% chance${windowTail}) — have an indoor backup ready`
        : isSnow
        ? `Snow forecast for ${onDay} — confirm vendor arrival times and guest logistics`
        : isHotExtreme
        ? `Extreme heat on ${onDay} (${tempMax}°F) — ice, shade, and water are not optional`
        : `Extreme cold on ${onDay} (${tempMin}°F) — plan heat and guest comfort`;
    } else if (isHeavyRain) {
      risk = 'high';
      summary = `Heavy rain likely on ${onDay} (${pop}%${windowTail}) — rain plan required`;
    } else if (isHot) {
      risk = 'high';
      summary = `Hot on ${onDay} (${tempMax}°F) — plan ice, shade, and water`;
    } else if (isRain) {
      risk = 'medium';
      summary = `Rain possible on ${onDay} (${pop}%${windowTail}) — monitor and prepare a rain plan`;
    } else if (isWarm) {
      risk = 'medium';
      summary = `Warm on ${onDay} (${tempMax}°F) — plan extra ice and some shade`;
    } else if (pop >= 30) {
      risk = 'low';
      summary = `Light precipitation possible on ${onDay} (${pop}%) — worth monitoring`;
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
      // Sunset in the EVENT's local time (real, computed — never fabricated). Drives
      // golden-hour / "when it gets dark" / lighting planning for outdoor events.
      sunset: (() => {
        const u = eventDay.sunset, off = data.timezone_offset || 0;
        if (!u) return '';
        const d = new Date((u + off) * 1000);
        let h = d.getUTCHours(); const m = d.getUTCMinutes();
        const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
        return `${h}:${String(m).padStart(2, '0')} ${ap}`;
      })(),
      disclaimer: 'Weather forecast — accuracy decreases beyond 7 days.',
      // Rain WINDOW (real hours, never fabricated): derived from the hourly
      // forecast when the event day is inside the API's 48h hourly horizon.
      // Beyond that, hourly is absent for the date and this stays null — the
      // guest message then simply omits the timing line.
      rainWindow,
    };
  } catch {
    return null;
  }
}

/**
 * getEventWeatherSpan — the whole event, not just its first day (Destination +
 * Multi-Day program, P1 "weather range"). ONE fetch; every span day inside the
 * forecast window classified through assessForecastDay. Span truth comes from
 * spanEnd (./dates): endDate absent ⇒ one day ⇒ primary is byte-identical to
 * getEventWeatherRisk — single-day events cannot change behavior.
 *
 * Day gating is PER DAY: mid-event (day 2 of 3) the passed days drop out and
 * `primary` is today — the first day still ahead of or on the clock. Returns
 * { days: [row], primary: row } or null when no span day is forecastable.
 * Rows carry dayIndex/dayCount ("Day 2 of 3") for honest labeling.
 */
export async function getEventWeatherSpan(lat, lon, event) {
  const startIso = event && event.date ? String(event.date).slice(0, 10) : null;
  if ((!API_KEY && !PROXY) || !lat || !lon || !startIso) return null;
  const endIso = spanEnd(event) || startIso;

  // Enumerate the span's calendar dates via local noon (DST-safe stepping).
  const dates = [];
  const cursor = new Date(startIso + 'T12:00:00');
  const last = new Date(endIso + 'T12:00:00');
  const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  while (!isNaN(cursor) && !isNaN(last) && cursor <= last && dates.length < 14) {
    dates.push(fmt(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  if (!dates.length) return null;

  const inWindow = dates.filter(d => {
    const n = daysUntil(d);
    return n != null && n >= 0 && n <= 14;
  });
  if (!inWindow.length) return null;

  const data = await fetchForecast(lat, lon);
  if (!data) return null;
  const days = [];
  for (const d of inWindow) {
    const row = assessForecastDay(data, d);
    if (row) days.push({ ...row, dayIndex: dates.indexOf(d) + 1, dayCount: dates.length });
  }
  if (!days.length) return null;
  return { days, primary: days[0] };
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

// ─── Rain plan readiness (POP-1 continuity slice) ───────────────────────────
// The planner readiness source for "do we have a rain plan?" is event.rainPlan
// ONLY — the free-text field on the Where & when / Event Details venue section.
// event.guestBrief.rainPlan is guest-facing brief copy (lib/doItForMe.js) and
// deliberately NEVER satisfies planner readiness; the two fields are separate
// by design and are not synced.
//
// RAIN_PLAN_TARGET uses the app's existing deep-link convention ({tab,
// focusField} route objects, normalized by App.js handleTabChange; the focus
// effect finds the element by id / data-focus-field). No new routing system.
export const RAIN_PLAN_TARGET = { tab: 'Event Details', focusField: 'rain-plan' };

export function rainPlanStatus(event) {
  const hasPlan = !!String((event && event.rainPlan) || '').trim();
  return {
    hasPlan,
    plan: hasPlan ? String(event.rainPlan).trim() : null,
    target: RAIN_PLAN_TARGET,
    ctaLabel: hasPlan ? 'Review rain plan' : 'Add rain plan',
  };
}

// The "Rain plan missing for an outdoor event" readiness gap — same rule the
// Where & when tab's Missing-logistics card has always used (outdoors + no
// event.rainPlan), extracted here so the gap, its resolution, and its
// deep-link target are one testable source instead of inline-only JSX.
export function rainPlanGap(event, { outdoors } = {}) {
  if (!outdoors) return null;
  const status = rainPlanStatus(event);
  if (status.hasPlan) return null;
  return {
    message: 'Rain plan missing for an outdoor event',
    target: RAIN_PLAN_TARGET,
    ctaLabel: 'Add rain plan',
  };
}

// ── WEATHER-IMPACT-1 — event-PHASE impact intelligence ───────────────────────
// A host doesn't need "rain is likely on Wednesday"; they need "rain overlaps
// guest arrival — update guests and confirm the indoor plan." This classifies
// the real forecast against the phases the event data actually supports:
//   before the event · around arrival/start · during (or after) the event ·
//   event-day-only when hourly timing isn't available.
// HARD RULES: real hourly windows only (computeRainWindow); no invented
// setup/load-out/arrival times (no such fields exist — copy says "before the
// event" / "around your start", never "setup will be wet"); no end time
// exists in the model, so nothing ever claims a bounded event window — copy
// says "during or after". Daily fallback says timing is unknown. Every CTA
// follows the deep-link doctrine.
export function weatherImpactByEventPhase(event, wx) {
  const ev = event || {};
  if (!wx || wx.risk === 'clear') return { hasImpact: false, confidence: wx ? (wx.rainWindow ? 'hourly' : 'daily') : 'unknown', primaryPhase: 'none', affectedPhases: [], headline: null, shouldPromptRainPlan: false, shouldPromptGuestUpdate: false, hourlyWindowUsed: false };
  const dayName = (() => { try { return new Date(String(wx.date || ev.date) + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' }); } catch { return ''; } })();
  const onDay = dayName ? `${dayName} (your event day)` : 'your event day';
  const win = wx.rainWindow && Number.isFinite(wx.rainWindow.startHour) ? wx.rainWindow : null;
  const isRainish = /rain|thunder|storm|drizzle|snow/i.test(String(wx.conditions || '')) || (wx.pop || 0) >= 30;
  const hasPlan = !!String(ev.rainPlan || '').trim();
  const rainCta = hasPlan
    ? { actionLabel: 'Review rain plan', route: RAIN_PLAN_TARGET }
    : { actionLabel: 'Add rain backup', route: RAIN_PLAN_TARGET };
  const guestCta = { actionLabel: 'Draft guest update', route: { tab: 'Guests', focusField: `guests-invites-${ev.id}` } };
  const parkingCta = { actionLabel: 'Confirm parking/arrival note', route: { tab: 'Event Details', focusField: 'parking-notes' } };

  // Start hour — ONLY from an explicit startTime; never inferred from buckets.
  const startHour = (() => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(ev.startTime || '').trim());
    return m ? Number(m[1]) + Number(m[2]) / 60 : null;
  })();

  // No usable hourly window (or non-rain risk like heat) → event-day copy.
  if (!win || !isRainish) {
    const base = {
      hasImpact: true, confidence: win ? 'hourly' : 'daily', primaryPhase: 'event_day', hourlyWindowUsed: false,
      shouldPromptRainPlan: isRainish && !hasPlan, shouldPromptGuestUpdate: false,
      affectedPhases: [{ phase: 'event_day', label: 'Event day', windowLabel: null, severity: wx.risk, summary: wx.summary, ...(isRainish ? rainCta : {}) }],
    };
    base.headline = isRainish
      ? `Rain risk is on ${onDay}, but hourly timing isn’t available yet — confirm the rain plan without assuming when it will hit.`
      : wx.summary;
    return base;
  }

  // Hourly window vs. what we truly know of the day's shape.
  const phases = [];
  let primaryPhase = 'event_day';
  if (startHour == null) {
    primaryPhase = 'event_day';
    phases.push({ phase: 'event_day', label: 'Event day', windowLabel: win.label, severity: wx.risk,
      summary: `Rain is forecast ${win.label} on ${onDay}. Your start time isn’t set, so it can’t be matched to arrival or the event window yet.`,
      ...rainCta });
  } else if (win.endHour + 1 < startHour - 1) {
    primaryPhase = 'prep';
    phases.push({ phase: 'prep', label: 'Before the event', windowLabel: win.label, severity: 'medium',
      summary: `Rain is forecast ${win.label} on ${onDay} — before your ${fmtHour(startHour)} start. Check anything happening outside beforehand and keep the rain plan ready.`,
      ...rainCta });
  } else if (win.startHour <= startHour + 1) {
    // Window touches [start−1, start+1] → arrival/start.
    primaryPhase = 'arrival';
    phases.push({ phase: 'arrival', label: 'Around arrival/start', windowLabel: win.label, severity: wx.risk,
      summary: `Rain may affect guest arrival on ${onDay} — forecast ${win.label}, around your ${fmtHour(startHour)} start. Confirm parking/arrival instructions and the rain plan.`,
      ...rainCta });
    phases.push({ phase: 'arrival', label: 'Parking & arrival', windowLabel: win.label, severity: 'medium',
      summary: 'Wet arrivals go smoother with a clear parking and entrance note.', ...parkingCta });
  } else {
    // Window starts after start+1. No end time exists in the model — say
    // "during or after", never a bounded event window.
    primaryPhase = 'event';
    phases.push({ phase: 'event', label: 'During or after the event', windowLabel: win.label, severity: wx.risk,
      summary: `Rain is forecast ${win.label} on ${onDay} — after your ${fmtHour(startHour)} start, so during or after the event (no end time is set). Confirm the rain plan and consider a guest update.`,
      ...rainCta });
  }
  const shouldPromptGuestUpdate = primaryPhase === 'arrival' || primaryPhase === 'event';
  if (shouldPromptGuestUpdate) {
    phases.push({ phase: primaryPhase, label: 'Tell your guests', windowLabel: win.label, severity: 'medium',
      summary: 'A short weather note saves the day-of texts.', ...guestCta });
  }
  return {
    hasImpact: true, confidence: 'hourly', primaryPhase, affectedPhases: phases,
    headline: phases[0].summary, hourlyWindowUsed: true,
    shouldPromptRainPlan: !hasPlan, shouldPromptGuestUpdate,
  };
}

const fmtHour = (h) => {
  const whole = Math.floor(h); const ampm = whole >= 12 ? 'PM' : 'AM';
  const twelve = whole % 12 === 0 ? 12 : whole % 12;
  return `${twelve} ${ampm}`;
};

// Weather summary copy, made aware of a saved rain plan. The forecast (risk
// level, precipitation) is untouched — only the "rain plan required / prepare
// a rain plan" imperative stops nagging once event.rainPlan has real text.
export function rainAwareSummary(summary, hasPlan) {
  if (!hasPlan || !summary) return summary;
  return String(summary)
    .replace(/— rain plan required/i, '— your rain plan is on file')
    .replace(/— monitor and prepare a rain plan/i, '— monitor; your rain plan is on file');
}

// ─── RAIN-2: "Suggest a rain plan" — deterministic starter templates ──────────
// The app detects a missing rain plan and routes the host to the field; this
// closes the last step by DRAFTING one. No AI, no forecast claims — a plain
// starter the host edits. Callers must never overwrite an existing plan
// silently (the UI hides the action once event.rainPlan has text).
export function suggestRainPlan(event) {
  const ev = event || {};
  const venue = String(ev.venue || '').trim();
  const atHome = ev.venueKind === 'home';
  if (atHome) {
    return 'If weather turns, move food, seating, and the key moments to your covered or indoor backup spot. Keep power, sound, and setup protected, and send guests an updated entrance and parking note before they arrive.';
  }
  if (venue) {
    return `If weather turns, move guests and the key activities indoors at ${venue}. Confirm the venue's indoor backup space and vendor load-in path, and send guests the final arrival instructions before the event.`;
  }
  return 'If weather turns, move guests and the key activities under cover. Confirm your indoor or covered backup, keep vendor setup protected, and send guests the final arrival instructions before the event.';
}

// ─── GUEST-RAIN-2: guest-facing rain message (plain text, SMS-safe) ───────────
// The guest message is NOT the host's rain plan. The host plan carries internal
// logistics (vendors, load-in, power); guests get a calm, structured plain-text
// note with line breaks and light icons — no markdown, no weather certainty,
// no invented details. Parking uses the host-authored guest parking note when
// present (the same field the public invite shows), else a safe fallback.
export function guestRainMessage(event, wx) {
  const ev = event || {};
  const name = String(ev.name || '').trim();
  const venue = String(ev.venue || '').trim();
  const atHome = ev.venueKind === 'home';
  const parkingNote = String(ev.parkingNotes || ev.parking || '').trim();

  const where = atHome
    ? 'Head inside when you arrive'
    : venue
      ? `Head indoors at ${venue}`
      : 'Head to the covered area when you arrive';
  const parking = parkingNote
    ? `Parking: ${parkingNote}`
    : 'Parking stays the same unless we send a change';

  // Timing line: ONLY when the forecast genuinely carries hourly data for the
  // event date (computeRainWindow) — times are never invented, and the voice
  // stays hedged ("looks most likely").
  const windowLabel = wx && wx.rainWindow && wx.rainWindow.label ? wx.rainWindow.label : null;

  // GUEST-RAIN-3 formatting: one restrained glyph (☂) carries the subject;
  // arrows carry structure. Reads clean in SMS, WhatsApp, and email alike.
  return [
    `☂ Weather note — ${name || 'our event'}`,
    '',
    "We're still on.",
    '',
    windowLabel
      ? `If rain comes through (looks most likely ${windowLabel}):`
      : 'If rain comes through:',
    `→ ${where}`,
    `→ ${parking}`,
    '→ Follow signs or staff direction',
    '',
    'Another update will follow if anything changes.',
  ].join('\n');
}

// ─── computeRainWindow — real rain hours from the hourly forecast ─────────────
// Pure + exported for tests. Scans the hourly array (OpenWeather One Call) for
// hours ON the event's local date with precipitation probability >= 40%, and
// returns the span as a host-readable label ("2 PM–6 PM", or "around 3 PM" for
// a single hour). Returns null when hourly data doesn't cover the date — the
// caller must NOT invent times.
export function computeRainWindow(hourly, eventDateIso, tzOffsetSec) {
  if (!Array.isArray(hourly) || !hourly.length || !eventDateIso) return null;
  const off = Number(tzOffsetSec) || 0;
  const hrs = [];
  for (const h of hourly) {
    if (!h || !h.dt) continue;
    const local = new Date((h.dt + off) * 1000);
    if (local.toISOString().slice(0, 10) !== eventDateIso) continue;
    if ((Number(h.pop) || 0) >= 0.4) hrs.push(local.getUTCHours());
  }
  if (!hrs.length) return null;
  const fmtH = (h) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
  const start = Math.min(...hrs), end = Math.max(...hrs);
  return {
    startHour: start, endHour: end,
    label: start === end ? `around ${fmtH(start)}` : `${fmtH(start)}\u2013${fmtH(end + 1)}`,
  };
}
