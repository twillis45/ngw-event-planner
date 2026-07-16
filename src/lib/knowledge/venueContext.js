// demo/src/lib/knowledge/venueContext.js
//
// Wave-2l COVERAGE — a structured venue-constraint axis.
//
// The Coverage re-score (5, soft) named the 5→6 lever: "ground a distinct venue-constraint
// axis (capacity/fit vs headcount, indoor-outdoor exposure, parking/kitchen/power/load-in)
// as a structured field — the true remaining hard-zero." This is DISTINCT from the
// accessibility axis (which grounds the ADA physical-access slice on the same venue rows):
// venue-constraint is about whether the SPACE physically fits and powers the event.
//
// Same discipline: REAL, dated sources (Social Tables event-capacity guide; United Rentals
// event-power guide), a RESOLVER by category, a rigorous predicate, nothing invented.

export const VENUE_SOURCES = {
  'socialtables-capacity': {
    org: 'Social Tables — Event Capacity & Space Planning',
    url: 'https://www.socialtables.com/blog/event-planning/capacity-party-space-calculator/',
    fetched: '2026-07-16',
    claim: 'Plan ~6–8 sq ft per guest for a standing/cocktail reception, ~10–15 for a seated dinner (round tables ~15, long banquet tables ~12), ~9 theater-style. A room\'s USABLE event space is typically only 60–75% of its total (kitchens, restrooms, pillars, and circulation eat the rest), and you should keep a 10–20% buffer under the rated capacity for fire-code occupancy and comfort.',
  },
  'unitedrentals-power': {
    org: 'United Rentals — Planning Generators for Events',
    url: 'https://www.unitedrentals.com/project-uptime/equipment/planning-generators-events-united-rentals-guide',
    fetched: '2026-07-16',
    claim: 'Total the wattage of every powered item (lights, sound/DJ, food warmers, fridges) and add a ≥20% safety margin for startup current. A backyard party typically needs a 2,000–7,500W generator, a wedding ~3,000W. Keep any generator 5+ ft from tents and buildings and NEVER inside an enclosed space — carbon-monoxide risk.',
  },
};

const VENUE_CATEGORIES = [
  {
    category: 'power',
    // Outdoor / tent / amplified-power decisions — check the electrical load first (order
    // before capacity so a "tent + power" venue call gets the power guidance).
    pattern: /\bgenerator\b|\bpower\b|electrical|\boutlets?\b|\btent\b|pop-?up canop|amplified (sound|music|power)|outdoor.*(sound|power|dj)/i,
    antiPattern: /powdered|empower|horsepower/i,
    factor: 'Power & electrical load (outdoor / tent)',
    guideline: 'Total the wattage of everything that plugs in (lights, sound/DJ, warmers, fridges) and add a 20% margin. A backyard party often needs 2,000–7,500W, a wedding ~3,000W. Keep any generator 5+ ft from tents and never inside — carbon-monoxide risk.',
    tier: 'planning-standard',
    sources: ['unitedrentals-power'],
  },
  {
    category: 'capacity',
    // A venue/space choice — does the room physically fit the headcount? Excludes
    // cooking-placement calls (roast/fryer) via the antiPattern.
    pattern: /\bvenue\b|\bplace\b|\blocation\b|reception (hall|site)|banquet hall|event space|\bhall\b|at home or a venue|host home|indoor or outdoor|which room|backyard or/i,
    antiPattern: /buy|steam|which crab|where to buy|roast|\bcook\b|cooklocation|fryer|\bgrill\b|smoke|\bbean\b/i,
    factor: 'Capacity & fit (guest count vs the room)',
    guideline: 'Check the space physically fits: plan ~6–8 sq ft/guest standing, ~10–15 seated, and remember a room\'s usable area is only ~60–75% of its total. Keep a 10–20% buffer under the rated/fire-code capacity — confirm the venue\'s number covers your real headcount before you book.',
    tier: 'planning-standard',
    sources: ['socialtables-capacity'],
  },
];

export function detectVenueCategory(decision) {
  if (!decision) return null;
  const hay = `${decision.id || ''} ${decision.label || ''}`;
  for (const cat of VENUE_CATEGORIES) {
    if (cat.pattern.test(hay) && !(cat.antiPattern && cat.antiPattern.test(hay))) return cat;
  }
  return null;
}

export function resolveVenue(decision) {
  const cat = detectVenueCategory(decision);
  if (!cat) return null;
  return {
    factor: cat.factor,
    guideline: cat.guideline,
    category: cat.category,
    tier: cat.tier,
    sources: cat.sources.slice(),
    verificationStatus: 'researched',
    resolvedBy: 'venue-constraint-resolver',
  };
}

export function isGroundedVenue(ctx) {
  return !!(ctx && typeof ctx === 'object'
    && typeof ctx.factor === 'string' && ctx.factor.trim().length > 0
    && typeof ctx.guideline === 'string' && ctx.guideline.trim().length > 0
    && ctx.tier === 'planning-standard'
    && Array.isArray(ctx.sources) && ctx.sources.length > 0
    && ctx.sources.every((s) => !!VENUE_SOURCES[s]));
}

export function venueSourcesFor(ctx) {
  if (!ctx || !Array.isArray(ctx.sources)) return [];
  return ctx.sources.map((s) => VENUE_SOURCES[s]).filter(Boolean);
}

export function effectiveVenue(decision) {
  if (decision && isGroundedVenue(decision.venueContext)) return decision.venueContext;
  return resolveVenue(decision);
}
