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
import { moneyProvenanceFor } from './budgetEstimator/moneyProvenance.js';

// ─── Provenance markers ─────────────────────────────────────────────────────
// The header above promises "no invented market data" and "every factor
// carries a plain-language explanation." Both were true. Neither is a source,
// and until now there was no field in which to say so. Both records below are
// ungrounded; the rush record documents why its comment's reference to two
// named publishers must NOT be read as a citation.
export const METRO_MARKETS_PROVENANCE = moneyProvenanceFor('vendor.metroMarkets');
export const RUSH_FACTOR_PROVENANCE   = moneyProvenanceFor('vendor.rushFactor');

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
//
// PROVENANCE WARNING — read RUSH_FACTOR_PROVENANCE before trusting the ladder
// below. Until 2026-09-19 the line under this block attributed these premiums to
// unnamed planner surveys plus two named publishers — Wedding Wire and The Knot —
// while recording no page, no date and no figure from either. It read like a
// citation and could not be followed like one, so the attribution has been
// withdrawn rather than dressed up. RESEARCHED 2026-09-18 — neither publisher
// was found publishing a lead-time premium schedule at all, and The Knot's only
// statement about short timelines points the OPPOSITE way. The premiums stay
// registered as a trade-heuristic; the record's one real citation (WPIC's published
// rush-fee structure) sources their DIRECTION and not their magnitude — it prices a
// PLANNER'S FEE rather than a vendor quote, uses different windows, and every rung
// of it sits above every rung of ours. No premium below was changed by any of this.
//
// Industry-typical premiums — TRADE HEURISTIC, NOT A CITATION. No page states
// these four windows or these three percentages:
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
