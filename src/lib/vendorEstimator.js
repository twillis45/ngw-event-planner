// ─── Vendor cost estimator — metro market + rush factors ──────────────────────
// Extracted from App.js (previously local, legacy-only) so both apps can share
// one source of truth for "what makes a vendor estimate more or less expensive,
// and why." Composes with estimatorFactors.js (date premium, time-of-day,
// service+tax, contingency) via computeEstimatorBreakdown.
//
// Every number here is a labeled planning estimate, never a guaranteed quote —
// same doctrine as the rest of lib/: no invented market data, every factor
// carries a plain-language explanation the UI can show verbatim.

import { daysUntil } from './dates';

// 27-market cost-of-vendor-services index, tiered 1 (premium) to 4 (value).
// Factors are directional planning multipliers against a US national baseline,
// not a live market feed — every consumer must label them as estimates.
export const METRO_MARKETS = [
  // Tier 1 — Premium (1.4–1.65×)
  { id: 'nyc',   label: 'New York / New Jersey',    region: 'Northeast',    tier: 1, factor: 1.65 },
  { id: 'sf',    label: 'San Francisco / Bay Area',  region: 'West Coast',   tier: 1, factor: 1.60 },
  { id: 'la',    label: 'Los Angeles',               region: 'West Coast',   tier: 1, factor: 1.50 },
  { id: 'bos',   label: 'Boston',                    region: 'Northeast',    tier: 1, factor: 1.45 },
  { id: 'dc',    label: 'Washington DC / NoVA',      region: 'Mid-Atlantic', tier: 1, factor: 1.45 },
  { id: 'sea',   label: 'Seattle',                   region: 'West Coast',   tier: 1, factor: 1.40 },
  // Tier 2 — Above Average (1.10–1.35×)
  { id: 'chi',   label: 'Chicago',                   region: 'Midwest',      tier: 2, factor: 1.35 },
  { id: 'mia',   label: 'Miami / Fort Lauderdale',   region: 'Southeast',    tier: 2, factor: 1.30 },
  { id: 'sd',    label: 'San Diego',                 region: 'West Coast',   tier: 2, factor: 1.25 },
  { id: 'den',   label: 'Denver',                    region: 'Mountain',     tier: 2, factor: 1.20 },
  { id: 'aus',   label: 'Austin',                    region: 'South',        tier: 2, factor: 1.20 },
  { id: 'dal',   label: 'Dallas / Fort Worth',       region: 'South',        tier: 2, factor: 1.15 },
  { id: 'atl',   label: 'Atlanta',                   region: 'Southeast',    tier: 2, factor: 1.15 },
  { id: 'phi',   label: 'Philadelphia',              region: 'Mid-Atlantic', tier: 2, factor: 1.15 },
  { id: 'por',   label: 'Portland',                  region: 'West Coast',   tier: 2, factor: 1.15 },
  { id: 'nas',   label: 'Nashville',                 region: 'South',        tier: 2, factor: 1.15 },
  { id: 'min',   label: 'Minneapolis',               region: 'Midwest',      tier: 2, factor: 1.10 },
  { id: 'phx',   label: 'Phoenix',                   region: 'Mountain',     tier: 2, factor: 1.10 },
  // Tier 3 — Market Rate (0.88–1.05×)
  { id: 'hou',   label: 'Houston',                   region: 'South',        tier: 3, factor: 1.05 },
  { id: 'tam',   label: 'Tampa / Orlando',           region: 'Southeast',    tier: 3, factor: 1.00 },
  { id: 'cha',   label: 'Charlotte',                 region: 'Southeast',    tier: 3, factor: 1.00 },
  { id: 'slc',   label: 'Salt Lake City',            region: 'Mountain',     tier: 3, factor: 0.95 },
  { id: 'col',   label: 'Columbus',                  region: 'Midwest',      tier: 3, factor: 0.95 },
  { id: 'pit',   label: 'Pittsburgh',                region: 'Northeast',    tier: 3, factor: 0.90 },
  { id: 'ind',   label: 'Indianapolis',              region: 'Midwest',      tier: 3, factor: 0.90 },
  { id: 'kc',    label: 'Kansas City',               region: 'Midwest',      tier: 3, factor: 0.90 },
  { id: 'stl',   label: 'St. Louis',                 region: 'Midwest',      tier: 3, factor: 0.88 },
  // Tier 4 — Value / Small Market (0.75–0.82×)
  { id: 'rural', label: 'Rural / Small Market',      region: 'Other',        tier: 4, factor: 0.80 },
  { id: 'other', label: 'Other / International',     region: 'Other',        tier: 4, factor: 1.00 },
];

export const METRO_TIER_LABEL = {
  1: { label: 'Premium Market',       color: '#a78bfa' },
  2: { label: 'Above-Average Market', color: '#60a5fa' },
  3: { label: 'Market Rate',          color: '#34d399' },
  4: { label: 'Value Market',         color: '#fbbf24' },
};

// getMetroFactor(marketId) — the vendor-cost multiplier for a chosen market.
// Unset / unrecognized → 1.0 (no adjustment, no claim). Takes the market id
// directly (not a profile object) so any caller — legacy's planner profile,
// V2's per-event pick — can share the exact same lookup.
export const getMetroFactor = (marketId) => {
  if (!marketId) return 1.0;
  return METRO_MARKETS.find(m => m.id === marketId)?.factor || 1.0;
};

// getRushFactor(eventDate) — timeline-compression premium for vendor estimates.
// Industry-typical premiums (planner surveys + Wedding Wire / The Knot patterns):
//   <30 days  → ~25% (heavy rush — limited vendor pool, last-minute booking
//                     fees, catering minimums often scale up)
//   30-60 d   → ~12% (compressed — moderate premium for fast turnaround)
//   60-120 d  → ~5%  (tight but workable — small premium for some categories)
//   120+ d    → no premium (industry-standard lead time)
//
// Returns { multiplier, days, label, explanation } so the estimator can both
// apply the math AND show the host why the total moved.
export const getRushFactor = (eventDate) => {
  if (!eventDate) return { multiplier: 1, days: null, label: null, explanation: null };
  const days = daysUntil(eventDate);
  if (days === null || days < 0) return { multiplier: 1, days, label: null, explanation: null };
  if (days < 30) return {
    multiplier: 1.25, days, label: 'RUSH',
    explanation: `Less than 30 days out — vendors typically charge premium for short-notice bookings, catering minimums tend to scale up, and venue options narrow.`,
  };
  if (days < 60) return {
    multiplier: 1.12, days, label: 'COMPRESSED',
    explanation: `Tight timeline (~${days} days) — small premium typical for catering and last-minute vendor commitments.`,
  };
  if (days < 120) return {
    multiplier: 1.05, days, label: 'TIGHT',
    explanation: `Tight but workable (~${days} days) — small premium for some vendor categories at this stage.`,
  };
  return { multiplier: 1, days, label: null, explanation: null };
};
