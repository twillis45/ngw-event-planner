// ─── Budget Category Shares ────────────────────────────────────────────────
// Sprint 61.D. Per-category share of total event budget, by event type.
// Numbers reflect commonly-cited US event planning bands. These are PLANNING
// estimates — they are not contracts and the UI must say so.
//
// Format: { categoryKey: { min: 0.0–1.0, max: 0.0–1.0, label } }
// min/max sum-of-mins ≤ 1, sum-of-maxes ≥ 1 — the bands intentionally
// overlap because real events shift budget between categories.

const WEDDING_SHARES = {
  venue:            { min: 0.30, max: 0.45, label: 'Venue + catering combined' },
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

export function getCategoryShares(eventType) {
  return CATEGORY_SHARES_BY_TYPE[eventType] || FALLBACK_SHARES;
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
