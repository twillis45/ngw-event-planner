// demo/src/lib/knowledge/weatherContext.js
//
// Wave-2n COVERAGE — a structured weather-contingency axis (per decision).
//
// The Coverage re-score (soft-6) named weather-per-decision-as-a-field as a remaining
// hard-zero: weather was covered only by a global runtime engine (playbookContingencyForWeather),
// invisible to the per-decision layer, even though several outdoor decisions literally say
// "and the weather call." This grounds a per-decision weather axis on the outdoor / rain-plan /
// shade / tent decisions, cited to NOAA / National Weather Service outdoor-event guidance.
//
// Same discipline: a RESOLVER by category, real dated source, rigorous predicate, no invention.

export const WEATHER_SOURCES = {
  'noaa-outdoor-events': {
    org: 'NOAA / National Weather Service — Outdoor Event Weather Preparedness',
    url: 'https://www.weather.gov/otx/Outdoor_Event_Weather_Preparedness',
    fetched: '2026-07-16',
    claim: 'For an outdoor event, monitor the forecast and set up multiple ways to receive NWS warnings (NOAA Weather Radio, phone alerts). Have a rain/wind/heat contingency: a properly anchored, fire-rated tent gives both rain shelter and shade; cooling stations + water for heat; a warming shelter if it is forecast below 50°F. Set a decision point and a call time to move indoors or pause for lightning/severe weather.',
  },
};

const WEATHER_CATEGORIES = [
  {
    category: 'weather',
    // Outdoor exposure / rain-plan / shade / tent decisions — the ones a planner attaches a
    // weather backup to. Excludes cooking-placement ("roast indoors or outdoors") via antiPattern.
    pattern: /\bweather\b|rain ?(plan|backup|date)|\bshade\b|\btent\b|canopy|inclement|heat plan|weather backup|if it rains|indoor or outdoor|outdoor|backyard|\bpatio\b|\bpavilion\b|open.?air|al fresco|beach|park (shelter|pavilion|space)|heat .*plan|sun\b/i,
    antiPattern: /buy|steam|roast|\bcook\b|cooklocation|fryer|\bgrill\b|smoke|\bbean\b|where to buy|host home\b(?!.*outdoor)/i,
    factor: 'Weather contingency (outdoor exposure)',
    guideline: 'For anything outdoors, watch the forecast and have a backup: a properly anchored, fire-rated tent covers both rain and shade; cooling + water for heat, a warm shelter if it is forecast below 50°F. Set a call time to move indoors or pause for lightning, and have more than one way to get NWS warnings.',
    tier: 'noaa-standard',
    sources: ['noaa-outdoor-events'],
  },
];

export function detectWeatherCategory(decision) {
  if (!decision) return null;
  const hay = `${decision.id || ''} ${decision.label || ''}`;
  for (const cat of WEATHER_CATEGORIES) {
    if (cat.pattern.test(hay) && !(cat.antiPattern && cat.antiPattern.test(hay))) return cat;
  }
  return null;
}

export function resolveWeather(decision) {
  const cat = detectWeatherCategory(decision);
  if (!cat) return null;
  return {
    factor: cat.factor,
    guideline: cat.guideline,
    category: cat.category,
    tier: cat.tier,
    sources: cat.sources.slice(),
    verificationStatus: 'researched',
    resolvedBy: 'weather-contingency-resolver',
  };
}

export function isGroundedWeather(ctx) {
  return !!(ctx && typeof ctx === 'object'
    && typeof ctx.factor === 'string' && ctx.factor.trim().length > 0
    && typeof ctx.guideline === 'string' && ctx.guideline.trim().length > 0
    && ctx.tier === 'noaa-standard'
    && Array.isArray(ctx.sources) && ctx.sources.length > 0
    && ctx.sources.every((s) => !!WEATHER_SOURCES[s]));
}

export function weatherSourcesFor(ctx) {
  if (!ctx || !Array.isArray(ctx.sources)) return [];
  return ctx.sources.map((s) => WEATHER_SOURCES[s]).filter(Boolean);
}

export function effectiveWeather(decision) {
  if (decision && isGroundedWeather(decision.weatherContext)) return decision.weatherContext;
  return resolveWeather(decision);
}
