// ─── Knowledge Scope (KPP-1 — the powerful primitive) ─────────────────────────
// The primitive that replaces Regional Intelligence (E), Commercial Intelligence (F),
// and part of Seasonal/Cultural coverage. A scope narrows a canonical knowledge field
// to a specific context. resolveScoped() returns the most specific applicable value,
// falling back to canonical. No data duplication — canonical stays canonical.
//
// Schema is live NOW; scope projections are authored in playbook files as they mature.
// The resolver provides consistent interface even before projections exist.

import { effectiveValue } from './knowledgeOverride';

// ── Scope dimensions ─────────────────────────────────────────────────────────
export const REGIONS = {
  dmv:        { label: 'DC / MD / VA', states: ['DC', 'MD', 'VA'], timezone: 'America/New_York' },
  northeast:  { label: 'Northeast US', states: ['NY', 'NJ', 'CT', 'MA', 'PA', 'RI', 'VT', 'NH', 'ME'], timezone: 'America/New_York' },
  southeast:  { label: 'Southeast US', states: ['FL', 'GA', 'AL', 'MS', 'SC', 'NC', 'TN', 'AR', 'LA'], timezone: 'America/Chicago' },
  south:      { label: 'South / Gulf', states: ['TX', 'OK', 'AR', 'LA', 'MS'], timezone: 'America/Chicago' },
  midwest:    { label: 'Midwest', states: ['IL', 'OH', 'MI', 'IN', 'WI', 'MN', 'IA', 'MO', 'KS', 'NE', 'ND', 'SD'], timezone: 'America/Chicago' },
  west:       { label: 'West Coast', states: ['CA', 'OR', 'WA'], timezone: 'America/Los_Angeles' },
  southwest:  { label: 'Southwest', states: ['AZ', 'NV', 'NM', 'CO', 'UT'], timezone: 'America/Denver' },
  national:   { label: 'National (US)', states: [], timezone: null },  // canonical fallback
};

export const SEASONS = {
  spring: { months: [3, 4, 5], label: 'Spring (Mar–May)' },
  summer: { months: [6, 7, 8], label: 'Summer (Jun–Aug)' },
  fall:   { months: [9, 10, 11], label: 'Fall (Sep–Nov)' },
  winter: { months: [12, 1, 2], label: 'Winter (Dec–Feb)' },
};

export const BUDGET_TIERS = {
  budget:   { label: 'Budget', multiplier: 0.7 },
  standard: { label: 'Standard', multiplier: 1.0 },
  premium:  { label: 'Premium', multiplier: 1.4 },
  luxury:   { label: 'Luxury', multiplier: 2.2 },
};

export const SCALE_TIERS = {
  micro:    { label: 'Micro (1–10)', minGuests: 1,  maxGuests: 10 },
  small:    { label: 'Small (11–30)', minGuests: 11, maxGuests: 30 },
  medium:   { label: 'Medium (31–75)', minGuests: 31, maxGuests: 75 },
  large:    { label: 'Large (76–150)', minGuests: 76, maxGuests: 150 },
  xlarge:   { label: 'XL (151+)', minGuests: 151, maxGuests: Infinity },
};

// ── Scope shape ────────────────────────────────────────────────────────────────
export function createScope({ region = 'national', season = null, budgetTier = 'standard', scaleTier = 'small' } = {}) {
  return Object.freeze({ region, season, budgetTier, scaleTier });
}

// Derive a scope from an asOf date string (for seasonal awareness)
export function scopeFromDate(asOf, overrides = {}) {
  if (!asOf) return createScope(overrides);
  const month = new Date(asOf).getUTCMonth() + 1;
  const season = Object.entries(SEASONS).find(([, s]) => s.months.includes(month))?.[0] || null;
  return createScope({ season, ...overrides });
}

// ── Scope-aware field resolver ─────────────────────────────────────────────────
// Resolution order (most-specific first):
// 1. Scoped override in playbook (pb.scopedOverrides[scope.region][fieldPath])
// 2. Regional override in playbook (pb.regionalPricing[scope.region][fieldPath])
// 3. Seasonal adjustment in playbook (pb.seasonalAdjustments[scope.season][fieldPath])
// 4. KnowledgeOverride (published KCR) via effectiveValue
// 5. Canonical playbook value
//
// The data keys for (1–3) are authored progressively in playbook files.
// The resolver is live NOW and reads canonical if projections don't exist yet.
export function resolveScoped(pb, fieldPath, scope = createScope(), opts = {}) {
  if (!pb || !fieldPath) return { value: undefined, source: 'not-found', scope };

  // 1. Scope-specific override (region + season + tier)
  const scopeKey = [scope.region, scope.season, scope.budgetTier].filter(Boolean).join('::');
  const scopedOverride = getNestedScopeOverride(pb, scopeKey, fieldPath);
  if (scopedOverride !== undefined) return { value: scopedOverride, source: 'scoped-override', scope, scopeKey };

  // 2. Regional override
  if (scope.region && scope.region !== 'national') {
    const regional = getNestedScopeOverride(pb, scope.region, fieldPath);
    if (regional !== undefined) return { value: regional, source: 'regional-override', scope, region: scope.region };
  }

  // 3. Seasonal adjustment
  if (scope.season) {
    const seasonal = getSeasonalAdjustment(pb, scope.season, fieldPath);
    if (seasonal !== undefined) return { value: seasonal, source: 'seasonal-override', scope, season: scope.season };
  }

  // 4. Budget-tier adjustment (apply multiplier to unit costs)
  if (scope.budgetTier && scope.budgetTier !== 'standard') {
    const budgetAdjusted = applyBudgetMultiplier(pb, fieldPath, scope.budgetTier);
    if (budgetAdjusted !== undefined) return { value: budgetAdjusted, source: 'budget-tier-derived', scope, tier: scope.budgetTier };
  }

  // 5. Canonical effective value (KCR override → authored)
  try {
    const eff = effectiveValue(pb, fieldPath);
    return { value: eff.value, source: 'canonical', scope };
  } catch {
    return { value: undefined, source: 'not-found', scope };
  }
}

// ── Scope coverage assessment ─────────────────────────────────────────────────
// For a playbook: which scopes have actual projections (non-canonical)?
export function scopeCoverage(pb) {
  const hasRegional = pb.regionalPricing ? Object.keys(pb.regionalPricing) : [];
  const hasSeasonal = pb.seasonalAdjustments ? Object.keys(pb.seasonalAdjustments) : [];
  const hasScoped = pb.scopedOverrides ? Object.keys(pb.scopedOverrides) : [];
  const canonicalOnly = hasRegional.length === 0 && hasSeasonal.length === 0 && hasScoped.length === 0;
  return {
    canonicalOnly,
    regionsWithData: hasRegional,
    seasonsWithData: hasSeasonal,
    scopedKeys: hasScoped,
    coverageGrade: canonicalOnly ? 'national-only' : hasRegional.length >= 3 ? 'regional' : 'partial',
  };
}

// Corpus-wide scope coverage (which playbooks have regional/seasonal projections)
export function corpusScopeCoverage(playbooks) {
  const covered = playbooks.map((pb) => ({ type: pb.type, ...scopeCoverage(pb) }));
  const nationalOnly = covered.filter((c) => c.canonicalOnly).length;
  return {
    total: playbooks.length,
    nationalOnly,
    withRegional: covered.filter((c) => c.regionsWithData.length > 0).length,
    withSeasonal: covered.filter((c) => c.seasonsWithData.length > 0).length,
    assets: covered,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getNestedScopeOverride(pb, key, fieldPath) {
  if (!pb.scopedOverrides?.[key]) return undefined;
  return getFieldFromObject(pb.scopedOverrides[key], fieldPath);
}

function getSeasonalAdjustment(pb, season, fieldPath) {
  if (!pb.seasonalAdjustments?.[season]) return undefined;
  return getFieldFromObject(pb.seasonalAdjustments[season], fieldPath);
}

function applyBudgetMultiplier(pb, fieldPath, tier) {
  if (!fieldPath.endsWith('unitCostRange')) return undefined;
  const multiplier = BUDGET_TIERS[tier]?.multiplier;
  if (!multiplier || multiplier === 1) return undefined;
  try {
    const base = effectiveValue(pb, fieldPath).value;
    if (!Array.isArray(base) || base.length !== 2) return undefined;
    return [Math.round(base[0] * multiplier * 100) / 100, Math.round(base[1] * multiplier * 100) / 100];
  } catch { return undefined; }
}

function getFieldFromObject(obj, fieldPath) {
  if (!obj || !fieldPath) return undefined;
  // Simple dot-path lookup (no array syntax for now)
  const parts = fieldPath.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}
