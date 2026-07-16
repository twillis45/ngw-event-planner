// demo/src/lib/knowledge/dietaryContext.js
//
// Wave-2o COVERAGE — a structured dietary / allergy axis.
//
// The Coverage re-score surfaced dietary/allergy as an un-built structural zero the playbooks
// explicitly name in 10+ decision labels ("Allergy / dietary check", "Shellfish allergy
// check", "Collect dietary restrictions + allergies") yet ground nothing — arguably the
// loudest remaining zero, and a safety-critical one. This grounds it, cited to the FDA's
// major-food-allergen standard.

export const DIETARY_SOURCES = {
  'fda-allergens': {
    org: 'U.S. FDA — Food Allergies / FASTER Act (major food allergens)',
    url: 'https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies',
    fetched: '2026-07-16',
    claim: 'The FDA recognizes NINE major food allergens — milk, eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat, soybeans, and sesame (added January 2023 by the FASTER Act) — which account for most severe reactions. Collect guests\' allergies and dietary/religious needs (kosher, halal, vegan) BEFORE the menu locks, and keep an allergen-safe plate physically separated from the allergen through prep and service.',
  },
};

const DIETARY_CATEGORIES = [
  {
    category: 'dietary_allergy',
    // A decision about collecting or accommodating allergies / dietary / religious food needs.
    pattern: /allerg|dietary|diet(ary)? (restriction|need|check|ask)|shellfish|nut ?allergy|gluten|\bkosher\b|\bhalal\b|\bvegan\b|vegetarian|pregnancy-safe|epi.?pen|food safety.*(allerg|diet)/i,
    antiPattern: /dietary supplement/i,
    factor: 'Dietary & allergy safety',
    guideline: 'Collect allergies and dietary/religious needs (kosher, halal, vegan) BEFORE the menu locks — the FDA\'s nine major allergens (milk, egg, fish, shellfish, tree nut, peanut, wheat, soy, sesame) cause most severe reactions. Keep any allergy-safe plate physically separated from the allergen through prep and serving; when in doubt, ask the guest directly.',
    tier: 'fda-standard',
    sources: ['fda-allergens'],
  },
];

export function detectDietaryCategory(decision) {
  if (!decision) return null;
  const hay = `${decision.id || ''} ${decision.label || ''}`;
  for (const cat of DIETARY_CATEGORIES) {
    if (cat.pattern.test(hay) && !(cat.antiPattern && cat.antiPattern.test(hay))) return cat;
  }
  return null;
}

export function resolveDietary(decision) {
  const cat = detectDietaryCategory(decision);
  if (!cat) return null;
  return {
    factor: cat.factor,
    guideline: cat.guideline,
    category: cat.category,
    tier: cat.tier,
    sources: cat.sources.slice(),
    verificationStatus: 'researched',
    resolvedBy: 'dietary-allergy-resolver',
  };
}

export function isGroundedDietary(ctx) {
  return !!(ctx && typeof ctx === 'object'
    && typeof ctx.factor === 'string' && ctx.factor.trim().length > 0
    && typeof ctx.guideline === 'string' && ctx.guideline.trim().length > 0
    && ctx.tier === 'fda-standard'
    && Array.isArray(ctx.sources) && ctx.sources.length > 0
    && ctx.sources.every((s) => !!DIETARY_SOURCES[s]));
}

export function dietarySourcesFor(ctx) {
  if (!ctx || !Array.isArray(ctx.sources)) return [];
  return ctx.sources.map((s) => DIETARY_SOURCES[s]).filter(Boolean);
}

export function effectiveDietary(decision) {
  if (decision && isGroundedDietary(decision.dietaryContext)) return decision.dietaryContext;
  return resolveDietary(decision);
}
