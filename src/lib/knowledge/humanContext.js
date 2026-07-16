// demo/src/lib/knowledge/humanContext.js
//
// Wave-2n COVERAGE — a structured human / relational axis.
//
// The Coverage re-score named human/relational as the other remaining hard-zero (only the
// ungrounded `emotionalWeight` existed): a seasoned planner weighs guest & family dynamics
// (seating politics, guest-list obligation, VIP handling) and centers the day on the person
// being celebrated. This grounds that as a per-decision axis on the seating / guest-list /
// honoree decisions, cited to etiquette-protocol + seating-dynamics guidance.

export const HUMAN_SOURCES = {
  'gatech-protocol': {
    org: 'Georgia Tech Special Events — Etiquette, Protocol & Customer Service',
    url: 'https://specialevents.gatech.edu/resources/protocol',
    fetched: '2026-07-16',
    claim: 'Protocol centers the honored guest: seat the guest of honor to the host\'s right, the next-ranking guest to the co-host\'s right, and rank outward from there. The event is built around the person being recognized, not the host\'s convenience.',
  },
  'seatplan-dynamics': {
    org: 'Wedding Seating & Guest-List Etiquette (seatplan.io / expert guidance)',
    url: 'https://seatplan.io/blog/wedding-seating-etiquette',
    fetched: '2026-07-16',
    claim: 'When there is family tension, seat conflicting parties at separate tables each with their own support, put a neutral buffer of guests between them, and brief the coordinator. Every invite shapes the day\'s energy — invite for the person being celebrated, not out of obligation, because tension rarely stays contained.',
  },
};

const HUMAN_CATEGORIES = [
  {
    category: 'honoree',
    // A call that BELONGS to the person being celebrated — center it on their wishes. Kept
    // specific to honoree-defining decisions (tribute/surprise/honor/vals/court) so it does
    // not swallow a beverage or cost-split call that merely names the honoree in passing.
    pattern: /honoree|guest of honor|\btribute\b|surprise or announced|surprise vs|honor the (retiree|honoree|couple|grad|mom)|whose (day|night)|\bvals\b|the quincea|bride's wishes|celebrate .*(them|the honoree)/i,
    antiPattern: /\bbar\b|\bdrink|beverage|cost ?split|budget|who pays/i,
    factor: 'Whose day it is — center it on them',
    guideline: 'This one belongs to the person being celebrated. Confirm their wishes — and their hard nos — and build the moment around them, not the host\'s preference. Protocol seats the guest of honor beside the host and ranks outward from there.',
    tier: 'relational-guidance',
    sources: ['gatech-protocol', 'seatplan-dynamics'],
  },
  {
    category: 'guest_dynamics',
    // Seating / guest-list decisions carry family-dynamics weight.
    pattern: /\bseating\b|floor ?plan|who sits|guest ?list|invite list|who('s| is) invited|\bcourt\b|court (size|of)|table plan/i,
    // exclude comfort/sightline decisions that merely say "+ seating" (shade, TV screen) —
    // the family-dynamics guideline doesn't fit an outdoor-comfort or viewing call.
    antiPattern: /seatbelt|seasoning|seated dinner\?|\bshade\b|\bscreen\b|sightline|\btv\b|viewing/i,
    factor: 'Guest & family dynamics',
    guideline: 'Read the room: seat conflicting people apart with a neutral buffer and brief whoever runs the floor; and remember every invite shapes the day\'s energy — invite for the celebrated person, not obligation, because tension rarely stays contained.',
    tier: 'relational-guidance',
    sources: ['seatplan-dynamics'],
  },
];

export function detectHumanCategory(decision) {
  if (!decision) return null;
  const hay = `${decision.id || ''} ${decision.label || ''}`;
  for (const cat of HUMAN_CATEGORIES) {
    if (cat.pattern.test(hay) && !(cat.antiPattern && cat.antiPattern.test(hay))) return cat;
  }
  return null;
}

export function resolveHuman(decision) {
  const cat = detectHumanCategory(decision);
  if (!cat) return null;
  return {
    factor: cat.factor,
    guideline: cat.guideline,
    category: cat.category,
    tier: cat.tier,
    sources: cat.sources.slice(),
    verificationStatus: 'researched',
    resolvedBy: 'human-relational-resolver',
  };
}

export function isGroundedHuman(ctx) {
  return !!(ctx && typeof ctx === 'object'
    && typeof ctx.factor === 'string' && ctx.factor.trim().length > 0
    && typeof ctx.guideline === 'string' && ctx.guideline.trim().length > 0
    && ctx.tier === 'relational-guidance'
    && Array.isArray(ctx.sources) && ctx.sources.length > 0
    && ctx.sources.every((s) => !!HUMAN_SOURCES[s]));
}

export function humanSourcesFor(ctx) {
  if (!ctx || !Array.isArray(ctx.sources)) return [];
  return ctx.sources.map((s) => HUMAN_SOURCES[s]).filter(Boolean);
}

export function effectiveHuman(decision) {
  if (decision && isGroundedHuman(decision.humanContext)) return decision.humanContext;
  return resolveHuman(decision);
}
