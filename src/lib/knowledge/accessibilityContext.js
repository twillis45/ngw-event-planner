// demo/src/lib/knowledge/accessibilityContext.js
//
// Wave-2h COVERAGE — a structured accessibility axis.
//
// The Coverage re-score (held at 4) found the cultural axis genuinely off 0 but the
// dimension still min-governed by the OTHER hard zeros: accessibility, legal/COI, and
// venue-constraint all 0/215 as structured decision fields. Its #1 lever: "add a
// structured, grounded accessibility axis (mobility/ADA/sensory) to the ~15-20 decisions
// where it steers the choice (venue, seating, transport) — the hard-compliance zero most
// likely to cause a real event failure."
//
// Same discipline as culturalContext.js: REAL, dated, attributed sources (ADA National
// Network, Meeting Professionals International, inclusive-event guidance), a rigorous
// isGroundedAccessibility predicate, no invented standards. A decision that touches how a
// guest with a mobility, sensory, hearing/vision, or age-related need reaches and takes
// part in the event carries an `accessibilityContext` grounding the consideration.

export const ACCESSIBILITY_SOURCES = {
  'ada-events': {
    org: 'ADA National Network — A Planning Guide for Making Temporary Events Accessible',
    url: 'https://adata.org/guide/planning-guide-making-temporary-events-accessible-people-disabilities',
    fetched: '2026-07-16',
    claim: 'Under the ADA, an event must offer a step-free accessible route (aisles/paths ≥36" wide) from accessible parking (≥1 per 25 spaces, at least one van-accessible) through the entrance to seating and accessible restrooms; evaluate the whole facility — including bathrooms and parking — before finalizing, and communicate the accessibility offered to guests in advance.',
  },
  'mpi-ada-mobility': {
    org: 'Meeting Professionals International — ADA Mobility Guide for Event Planners',
    url: 'https://www.mpi.org/docs/default-source/pdf/certificate-programs/ada-mobility-guide-article-for-mpi.pdf',
    fetched: '2026-07-16',
    claim: 'A single wheelchair seating space is 36"×48"; aisles must stay ≥36" clear for a wheelchair or scooter; planners should visit the venue and verify the full path of travel can be used with minimal assistance.',
  },
  'inclusive-seating': {
    org: 'Inclusive & Accessible Event Seating — A Planner\'s Guide (Seatchart)',
    url: 'https://seatchart.app/inclusive-seating',
    fetched: '2026-07-16',
    claim: 'Inclusive seating gives every guest a clear step-free path to their seat, restroom, and event areas; offers seating variety (with/without armrests, higher weight capacity) for older and larger guests; and provides a calmer, lower-volume zone away from speakers for sensory comfort.',
  },
};

// Category → grounded accessibility guidance. A venue/space/seating decision ALWAYS has an
// accessibility dimension (can a guest with a mobility, sensory, or age-related need reach
// and take part?), so — like the timing resolver — the axis is resolved centrally by the
// decision's category rather than hand-authored 15 times. `pattern` matches id+label;
// `antiPattern` vetoes a false match. Order matters; first confident match wins.
const ACCESSIBILITY_CATEGORIES = [
  {
    // Seating is checked FIRST so a seating/floor-plan decision gets seating guidance even
    // when its label also mentions "place" (place cards/setting).
    category: 'seating',
    // Require genuine seating/floor-plan intent, not a bare "seat" token (which caught
    // "seated dinner" on a food-FORMAT decision). "shade + seating" legitimately matches.
    pattern: /\bseating\b|floor ?plan|who sits|place setting|table plan/i,
    factor: 'Inclusive seating — step-free path, seat variety, sensory comfort',
    guideline: 'Leave a clear step-free path to every seat and the restroom; offer seat variety (with and without armrests, higher weight capacity) for older and larger guests; and keep a calmer, lower-volume zone away from the speakers for sensory comfort.',
    tier: 'established-guidance',
    sources: ['inclusive-seating'],
  },
  {
    category: 'venue',
    // A guest-facing VENUE/space choice. Deliberately excludes cooking-placement calls
    // ("where to roast", "where the fryer sits") — those are smoke/fire-safety, not guest
    // access — via the antiPattern, and drops the bare "indoor or outdoor" token that caught
    // a coffee-roast decision.
    pattern: /\bvenue\b|\bplace\b|\blocation\b|reception (hall|site)|banquet hall|event space|where .*(hold|held)|at home or a venue|host home/i,
    antiPattern: /buy|order|steam|which crab|where to buy|roast|\bcook\b|cooklocation|fryer|\bgrill\b|smoke|bean|prep/i,
    factor: 'Physical access — mobility, parking, restrooms',
    guideline: 'Pick a space with a step-free accessible route from parking (ADA: ≥1 accessible space per 25, van-accessible) through the entrance to seating and an accessible restroom; walk the whole path — bathrooms included — before you commit, and tell guests what access is offered so those with mobility needs can plan.',
    tier: 'ada-standard',
    sources: ['ada-events', 'mpi-ada-mobility'],
  },
];

export function detectAccessibilityCategory(decision) {
  if (!decision) return null;
  const hay = `${decision.id || ''} ${decision.label || ''}`;
  for (const cat of ACCESSIBILITY_CATEGORIES) {
    if (cat.pattern.test(hay) && !(cat.antiPattern && cat.antiPattern.test(hay))) return cat;
  }
  return null;
}

// resolveAccessibility(decision) → a grounded accessibilityContext for a venue/seating
// decision, else null. An authored `decision.accessibilityContext` always wins (callers
// check it first via effectiveAccessibility).
export function resolveAccessibility(decision) {
  const cat = detectAccessibilityCategory(decision);
  if (!cat) return null;
  return {
    factor: cat.factor,
    guideline: cat.guideline,
    category: cat.category,
    tier: cat.tier,
    sources: cat.sources.slice(),
    verificationStatus: 'researched',
    resolvedBy: 'accessibility-category-resolver',
  };
}

// A grounded accessibilityContext names the factor (which need it touches) + the guideline
// (how it steers the decision) + an authoritative tier + >=1 real cited source id.
export function isGroundedAccessibility(ctx) {
  return !!(ctx && typeof ctx === 'object'
    && typeof ctx.factor === 'string' && ctx.factor.trim().length > 0
    && typeof ctx.guideline === 'string' && ctx.guideline.trim().length > 0
    && (ctx.tier === 'ada-standard' || ctx.tier === 'established-guidance')
    && Array.isArray(ctx.sources) && ctx.sources.length > 0
    && ctx.sources.every((s) => !!ACCESSIBILITY_SOURCES[s]));
}

export function accessibilitySourcesFor(ctx) {
  if (!ctx || !Array.isArray(ctx.sources)) return [];
  return ctx.sources.map((s) => ACCESSIBILITY_SOURCES[s]).filter(Boolean);
}

// The effective accessibility context for a decision: an authored one if grounded, else
// the resolver's, else null (a decision with no venue/seating dimension).
export function effectiveAccessibility(decision) {
  if (decision && isGroundedAccessibility(decision.accessibilityContext)) return decision.accessibilityContext;
  return resolveAccessibility(decision);
}
