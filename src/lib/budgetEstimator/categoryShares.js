// ─── Budget Category Shares ────────────────────────────────────────────────
// Sprint 61.D. Per-category share of total event budget, by event type.
// Numbers reflect commonly-cited US event planning bands. These are PLANNING
// estimates — they are not contracts and the UI must say so.
//
// Format: { categoryKey: { min: 0.0–1.0, max: 0.0–1.0, label } }
// min/max sum-of-mins ≤ 1, sum-of-maxes ≥ 1 — the bands intentionally
// overlap because real events shift budget between categories.

import { budgetShareFamilyFor } from '../eventTaxonomyAdapter';
import { moneyProvenanceFor } from './moneyProvenance.js';

// PROVENANCE: `estimate` — no source. "Commonly-cited US event planning bands"
// names no publisher and no date, so none of the 29 bands below can be
// presented as checked. The record covers all four tables; see
// moneyProvenance.js#budget.categoryShares.
export const CATEGORY_SHARES_PROVENANCE = moneyProvenanceFor('budget.categoryShares');

// NOTE (Sprint 53 engine hardening): bands are PLANNING estimates and intentionally
// OVERLAP — they do NOT sum to 100% (a planner shifts budget between categories).
// The venue row previously read "Venue + catering combined" at 30–45% while a
// SEPARATE catering row existed — double-labeling that misread venue as the largest
// line. Corrected to venue-only (site rental, ~12–20%); catering is its own row.
const WEDDING_SHARES = {
  venue:            { min: 0.12, max: 0.20, label: 'Venue (site rental)' },
  catering:         { min: 0.25, max: 0.40, label: 'Catering (food + beverage + service)' },
  photo_video:      { min: 0.08, max: 0.15, label: 'Photography / videography' },
  florist_decor:    { min: 0.08, max: 0.15, label: 'Florist + decor' },
  dj_entertainment: { min: 0.05, max: 0.12, label: 'DJ / entertainment / music' },
  rentals:          { min: 0.04, max: 0.10, label: 'Rentals (tables, chairs, linens, tent)' },
  hair_makeup:      { min: 0.02, max: 0.04, label: 'Hair + makeup' },
  transportation:   { min: 0.02, max: 0.05, label: 'Transportation' },
  attire_misc:      { min: 0.05, max: 0.10, label: 'Attire + stationery + favors + misc' },
};

const CORPORATE_SHARES = {
  venue:            { min: 0.25, max: 0.40, label: 'Venue' },
  catering:         { min: 0.20, max: 0.35, label: 'Catering' },
  av_production:    { min: 0.10, max: 0.20, label: 'AV / production / staging' },
  photo_video:      { min: 0.04, max: 0.10, label: 'Photo / video' },
  rentals:          { min: 0.04, max: 0.10, label: 'Rentals' },
  transportation:   { min: 0.02, max: 0.06, label: 'Transportation' },
  staffing:         { min: 0.04, max: 0.10, label: 'Staffing / coordination' },
  swag_misc:        { min: 0.04, max: 0.10, label: 'Swag / signage / misc' },
};

const PRIVATE_SHARES = {
  venue:            { min: 0.25, max: 0.40, label: 'Venue' },
  catering:         { min: 0.25, max: 0.40, label: 'Catering' },
  florist_decor:    { min: 0.05, max: 0.12, label: 'Florist + decor' },
  dj_entertainment: { min: 0.04, max: 0.10, label: 'Music / entertainment' },
  rentals:          { min: 0.04, max: 0.10, label: 'Rentals' },
  photo_video:      { min: 0.04, max: 0.10, label: 'Photo / video' },
  misc:             { min: 0.05, max: 0.10, label: 'Misc + service charges' },
};

const FALLBACK_SHARES = {
  venue:            { min: 0.25, max: 0.40, label: 'Venue' },
  catering:         { min: 0.20, max: 0.35, label: 'Catering' },
  vendors_misc:     { min: 0.15, max: 0.30, label: 'Vendors + production + misc' },
  rentals:          { min: 0.05, max: 0.12, label: 'Rentals' },
  buffer:           { min: 0.05, max: 0.10, label: 'Service + tips + contingency' },
};

export const CATEGORY_SHARES_BY_TYPE = {
  Wedding:          WEDDING_SHARES,
  'Vow Renewal':    WEDDING_SHARES,
  Quinceañera:      WEDDING_SHARES,
  'Engagement Party': WEDDING_SHARES,
  'Bridal Shower':  WEDDING_SHARES,
  'Corporate Retreat': CORPORATE_SHARES,
  'Corporate Event':   CORPORATE_SHARES,
  Conference:       CORPORATE_SHARES,
  Gala:             CORPORATE_SHARES,
  'Fundraiser / Gala': CORPORATE_SHARES,
  'Networking Event': CORPORATE_SHARES,
  Birthday:         PRIVATE_SHARES,
  'Sweet 16':       PRIVATE_SHARES,
  'Baby Shower':    PRIVATE_SHARES,
  'Retirement Party': PRIVATE_SHARES,
  Reunion:          PRIVATE_SHARES,
  Graduation:       PRIVATE_SHARES,
};

// The budget-breakdown share axis (3 tables + fallback) is resolved through the
// canonical taxonomy — the same alias/keyword resolver the intake, solve, and vendor
// classifiers use, so the app's TWO event-type vocabularies (modal 'Corporate'/
// 'Conference' vs intake 'Corporate Event'/'Conference / Summit') and any off-taxonomy
// name land on ONE share table instead of three engines disagreeing. The local
// WEDDING/CORPORATE/PRIVATE regexes this file used to own now live in eventTaxonomy.
const SHARES_BY_FAMILY = {
  wedding:   WEDDING_SHARES,
  corporate: CORPORATE_SHARES,
  private:   PRIVATE_SHARES,
  fallback:  FALLBACK_SHARES,
};

export function getCategoryShares(eventType) {
  return SHARES_BY_FAMILY[budgetShareFamilyFor(eventType)] || FALLBACK_SHARES;
}

/**
 * Produce per-category dollar ranges given a total budget estimate.
 * Each row: { key, label, low, high }
 */
export function breakdownByCategory(totalLow, totalHigh, eventType) {
  const shares = getCategoryShares(eventType);
  const out = [];
  for (const [key, s] of Object.entries(shares)) {
    out.push({
      key,
      label: s.label,
      low:  Math.round(totalLow  * s.min / 100) * 100,
      high: Math.round(totalHigh * s.max / 100) * 100,
    });
  }
  return out;
}
