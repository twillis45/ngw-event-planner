// ─── Estimator Confidence ──────────────────────────────────────────────────
// Sprint 61.D. The estimator is honest about how much it knows. Confidence
// is a function of how many input signals exist (type / date / guests /
// market / time-of-day / event-history).
//
// We never claim "exact." The hint surface always shows a range + a
// confidence chip + a "Not included" line.

// Canonical taxonomy import MUST be at module top (ESLint import/first) — it was
// previously placed mid-file next to budgetFamilyForType, which crashed the build.
import { budgetFamilyFor } from '../eventTaxonomyAdapter';

/**
 * Score 0–100, then map to:
 *   high   (≥75) — ±10%
 *   medium (40–74) — ±20%
 *   low    (<40) — ±35%
 *
 * @returns {{ score:number, level:'high'|'medium'|'low', spread:number, label:string }}
 */
export function estimatorConfidence({ hasType, hasDate, hasGuestCount, hasMarket, hasTimeOfDay, hasHistory }) {
  let score = 0;
  if (hasType)        score += 25;
  if (hasGuestCount)  score += 25;
  if (hasDate)        score += 15;
  if (hasMarket)      score += 15;
  if (hasTimeOfDay)   score += 10;
  if (hasHistory)     score += 10;
  let level, spread, label;
  if (score >= 75) { level = 'high';   spread = 0.10; label = 'High confidence'; }
  else if (score >= 40) { level = 'medium'; spread = 0.20; label = 'Medium confidence'; }
  else { level = 'low'; spread = 0.35; label = 'Low confidence — add more info to tighten'; }
  return { score, level, spread, label };
}

// DESTINATION-3 (budget) — the pure travel-logistics exclusions. Defined once
// so the travel_led family list below and the destination merge in
// notIncludedFor can never drift apart (no positional slicing). These are the
// lines that apply to ANY destination event regardless of its base type; the
// travel_led list's remaining two lines are package-relative and only make
// sense for types that are natively travel-led.
export const TRAVEL_LOGISTICS_NOT_INCLUDED = [
  'Airfare and ground transfers',
  'Lodging beyond the group block',
  'Travel insurance, visas, or permits',
];

// Items NOT included in an estimate — keyed by intake family so a Dinner Party
// is never told its estimate excludes a honeymoon or a marriage license. The
// hint surfaces the list for the event's family (Chunk A: family-aware intake).
export const NOT_INCLUDED_BY_FAMILY = {
  home_hosted: [
    'Serveware, linens, or furniture you keep afterward',
    'Alcohol if guests bring their own',
    'Gifts or party favors',
    'Cleaning or extra help hired separately',
    'Tips for any hired help',
  ],
  full_service: [
    'Event-day attire and accessories',
    'Gifts (welcome bags, attendant gifts, favors)',
    'Honeymoon or travel for the couple/host',
    'Rehearsal dinner and pre-event parties',
    'Marriage license / permit fees',
    'Tips and gratuities beyond standard service charge',
  ],
  corporate: [
    'Employee travel, lodging, and per diems',
    'Speaker or talent fees and their travel',
    'Swag, printed collateral, and signage production',
    'AV / production overages beyond the base package',
    'Staff overtime and gratuities',
  ],
  host_driven: [
    'Gifts, favors, and thank-you cards',
    'Outfits and accessories for the guest of honor',
    'Tips and gratuities beyond service charge',
    'Cake / dessert when not included with catering',
    'Pre- or post-event gatherings',
  ],
  travel_led: [
    ...TRAVEL_LOGISTICS_NOT_INCLUDED,
    'Meals and activities not in the package',
    'Tips for local staff and guides',
  ],
};

// Budget family = the SAME 5-family axis as App.js intakeFamily. Previously this
// lib carried a verbatim mirror of that map (the genuine same-axis duplication the
// Sprint 53 audit flagged); it now derives from the canonical taxonomy so the two
// can never drift. Unknown types still resolve to the middle-weight 'host_driven',
// never the maximal family. (Import hoisted to module top — see header.)
export function budgetFamilyForType(type) {
  return budgetFamilyFor(type);
}

// Resolve the exclusion list from an explicit family key OR an event type.
//
// DESTINATION-3 (budget) — opts.isDestination itemizes travel the way
// travel_led types already do: the shared travel-logistics lines (airfare /
// lodging / travel insurance — existing travel_led copy, nothing new) are
// prepended to the base family's list so a destination Birthday's estimate
// discloses the same travel exclusions a Wellness Retreat's always has.
// Types already in the travel_led family are returned unchanged (they
// itemize travel natively).
export function notIncludedFor(familyOrType, opts = {}) {
  const base = NOT_INCLUDED_BY_FAMILY[familyOrType]
    || NOT_INCLUDED_BY_FAMILY[budgetFamilyForType(familyOrType)]
    || NOT_INCLUDED_BY_FAMILY.host_driven;
  if (!opts || !opts.isDestination) return base;
  if (base === NOT_INCLUDED_BY_FAMILY.travel_led) return base;
  return [
    ...TRAVEL_LOGISTICS_NOT_INCLUDED,
    ...base.filter((line) => !TRAVEL_LOGISTICS_NOT_INCLUDED.includes(line)),
  ];
}

// Back-compat default (full_service) for any caller still importing the constant.
export const NOT_INCLUDED = NOT_INCLUDED_BY_FAMILY.full_service;
