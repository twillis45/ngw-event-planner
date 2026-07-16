// demo/src/lib/knowledge/legalContext.js
//
// Wave-2j COVERAGE — a structured legal / liability / COI axis.
//
// The Coverage re-score (held 4) named the single lever to 5: "ground a legal/COI axis
// (alcohol service liability, vendor certificate-of-insurance, permits/noise) on the
// decisions where it steers the call — the highest event-failure-causing axis a seasoned
// planner never omits; this alone flips 4→5." Legal/COI was 0/215 structured.
//
// Same discipline as the other axes: REAL, dated, authoritative sources (Insurance
// Information Institute, Cornell Legal Information Institute, NYC Parks special-event
// permitting). A RESOLVER, like accessibility: an alcohol-service, paid-vendor, or
// public-space/permit decision ALWAYS carries a legal/liability consideration, grounded
// centrally by category. Nothing invented — the standards are cited.

export const LEGAL_SOURCES = {
  'iii-social-host': {
    org: 'Insurance Information Institute — Social Host Liability',
    url: 'https://www.iii.org/article/social-host-liability',
    fetched: '2026-07-16',
    claim: '43 US states impose social-host / dram-shop liability: a private host (homeowner or renter) can be held civilly liable when a guest they served alcohol — especially anyone under 21 — later harms someone. Reduce the risk by hiring a trained bartender who can refuse intoxicated or underage guests, hosting at a licensed venue, and confirming homeowner or event liability insurance actually covers it.',
  },
  'cornell-dramshop': {
    org: 'Cornell Legal Information Institute — dram shop rule',
    url: 'https://www.law.cornell.edu/wex/dram_shop_rule',
    fetched: '2026-07-16',
    claim: 'Dram-shop rules hold those who serve alcohol liable for serving a visibly intoxicated or underage person who then causes harm to a third party.',
  },
  'nyc-special-events-coi': {
    org: 'NYC Parks — Special Event Permits & Insurance (representative of US municipal requirements)',
    url: 'https://www.nycgovparks.org/permits/special-events/large-events',
    fetched: '2026-07-16',
    claim: 'A public-space or large event typically requires a special-event permit (apply ~60 days ahead, sometimes months for big crowds) and a Certificate of Insurance — commonly $1–2M general liability naming the venue/city as an additional insured; outside vendors must provide their own liability coverage; and the event must comply with local noise ordinances.',
  },
};

const LEGAL_CATEGORIES = [
  {
    category: 'alcohol_liability',
    // Any decision about SERVING alcohol carries social-host/dram-shop exposure — including
    // the "dry" option, which is itself the liability-avoiding choice.
    pattern: /\balcohol\b|\bbar\b|\bliquor\b|open bar|signature cocktail|the pour|drinks? plan|serve.*(alcohol|beer|wine)|byob/i,
    antiPattern: /soft ?drinks? only|no bar area|sandbar|crowbar/i,
    factor: 'Alcohol-service liability (social host / dram shop)',
    guideline: 'Serving alcohol carries social-host liability in 43 states — a host can be liable if a guest they served (especially anyone under 21) later harms someone. Lower the risk with a trained bartender who can cut people off, checking IDs, a licensed venue, and confirming homeowner/event insurance covers it. Going dry removes the exposure entirely.',
    tier: 'legal-standard',
    sources: ['iii-social-host', 'cornell-dramshop'],
  },
  {
    category: 'vendor_coi',
    // Hiring/booking a PAID vendor → require a certificate of insurance. Fires on the
    // vendor/help/catering decisions, not on what-food-to-serve choices.
    pattern: /\bcaterer\b|catering (company|service|order)|\bcater\b.*(hire|book|full)|hire.*(bartender|caterer|chef|dj|photographer|staff|vendor|help|cleaner)|book.*(caterer|vendor|photographer|dj|band|florist)|bring in help|drop.?off catering|full.?service cater|professional cater|\bvendor\b|day-of (helper|coordinator)|bartender \+|\bhelp\?/i,
    antiPattern: /potluck|host cooks everything|\bdiy\b|do it yourself|host-?made|host makes|host cooks/i,
    factor: 'Vendor liability — certificate of insurance (COI)',
    guideline: 'A paid vendor should carry their own liability insurance — ask for a Certificate of Insurance (COI) before you pay a deposit; many venues and city permits require $1–2M general liability naming the venue as an additional insured. It shifts the risk off the host if a vendor causes injury or damage.',
    tier: 'legal-standard',
    sources: ['nyc-special-events-coi'],
  },
  {
    category: 'permit_noise',
    // Public-space / park / amplified-sound events → permit + noise ordinance. Matches a
    // venue decision whose option set reaches a public park / community space.
    pattern: /permit|public park|park (permit|shelter|pavilion|space)|city (park|space)|amplified|noise ordinance|street clos|block party|community (space|center|hall)|\bpavilion\b|park \/|park or|outdoor \/ park/i,
    antiPattern: /host home|indoor at home/i,
    factor: 'Permits & noise ordinance',
    guideline: 'A public-space or large event usually needs a special-event permit (apply well ahead — often 60+ days, months for big crowds) and must comply with the local noise ordinance; a park or city venue may also require proof of insurance. Confirm with the parks/city special-events office before you commit the date.',
    tier: 'legal-standard',
    sources: ['nyc-special-events-coi'],
  },
];

export function detectLegalCategory(decision) {
  if (!decision) return null;
  const hay = `${decision.id || ''} ${decision.label || ''}`;
  for (const cat of LEGAL_CATEGORIES) {
    if (cat.pattern.test(hay) && !(cat.antiPattern && cat.antiPattern.test(hay))) return cat;
  }
  return null;
}

export function resolveLegal(decision) {
  const cat = detectLegalCategory(decision);
  if (!cat) return null;
  return {
    factor: cat.factor,
    guideline: cat.guideline,
    category: cat.category,
    tier: cat.tier,
    sources: cat.sources.slice(),
    verificationStatus: 'researched',
    resolvedBy: 'legal-category-resolver',
  };
}

// Grounded only with factor + guideline + the authoritative tier + >=1 real cited source.
export function isGroundedLegal(ctx) {
  return !!(ctx && typeof ctx === 'object'
    && typeof ctx.factor === 'string' && ctx.factor.trim().length > 0
    && typeof ctx.guideline === 'string' && ctx.guideline.trim().length > 0
    && ctx.tier === 'legal-standard'
    && Array.isArray(ctx.sources) && ctx.sources.length > 0
    && ctx.sources.every((s) => !!LEGAL_SOURCES[s]));
}

export function legalSourcesFor(ctx) {
  if (!ctx || !Array.isArray(ctx.sources)) return [];
  return ctx.sources.map((s) => LEGAL_SOURCES[s]).filter(Boolean);
}

export function effectiveLegal(decision) {
  if (decision && isGroundedLegal(decision.legalContext)) return decision.legalContext;
  return resolveLegal(decision);
}
