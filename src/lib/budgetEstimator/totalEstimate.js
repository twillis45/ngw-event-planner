// ─── Budget total estimate ─────────────────────────────────────────────────
// Sprint 60.Y. Extracted from BudgetEstimateHint so the per-head total range is
// a single source of truth — the hint, the intake "typical setup" checklist,
// and any future surface all compute the same planning total. Planning
// estimates only; never a quote or contract.

import { getDatePremium, getTimeOfDayFactor } from '../estimatorFactors.js';
import { budgetFamilyForType } from './confidence.js';

// Per-event-type per-head bands. Reflect commonly cited US bands.
export const PER_HEAD_BY_TYPE = {
  Wedding:             { low: 200, high: 500 },
  'Vow Renewal':       { low: 150, high: 400 },
  Quinceañera:         { low: 150, high: 400 },
  'Engagement Party':  { low: 100, high: 300 },
  'Bridal Shower':     { low:  80, high: 250 },
  'Baby Shower':       { low:  50, high: 180 },
  Birthday:            { low:  60, high: 250 },
  'Sweet 16':          { low: 100, high: 350 },
  'Retirement Party':  { low:  80, high: 250 },
  Reunion:             { low:  60, high: 200 },
  Graduation:          { low:  50, high: 180 },
  Conference:          { low: 150, high: 400 },
  'Corporate Retreat': { low: 200, high: 500 },
  'Corporate Event':   { low: 150, high: 400 },
  Gala:                { low: 250, high: 600 },
  'Fundraiser / Gala': { low: 250, high: 600 },
  'Networking Event':  { low:  60, high: 200 },
};

// Sprint 53 engine hardening — family-level fallback so EVERY supported type
// resolves to an explicit OR a family band (no silent flat generic). ~19 of the
// 24 canonical types (Elopement, Anniversary, Holiday Party, Board Meeting,
// Product Launch, Team Retreat, Town Hall, Training, Award Ceremony, Client
// Dinner, Wellness Retreat, Dinner Party, Housewarming, Get-Together, etc.)
// previously fell through to { low:100, high:250 }. Family bands close that gap.
export const PER_HEAD_BY_FAMILY = {
  home_hosted:  { low:  30, high: 120 },  // potluck-to-catered home gatherings
  host_driven:  { low:  60, high: 250 },  // showers, birthdays, graduations
  full_service: { low: 200, high: 500 },  // weddings, quinces, galas
  corporate:    { low: 150, high: 400 },  // conferences, launches, retreats
  travel_led:   { low: 200, high: 600 },  // destination / wellness retreats
};

/**
 * Planning-grade total budget range for an event.
 * Returns { lowTotal, highTotal, destinationAdjusted } rounded to the nearest
 * $100, or null when type/guests are missing (can't estimate without them).
 *
 * DESTINATION-3 (budget) — `isDestination` fixes the silent override: an
 * explicit per-type band (e.g. Birthday $60–250) used to win outright, so a
 * DESTINATION birthday reflected none of its real cost drivers (lodging,
 * flights, multi-day scope) even though the travel_led family band already
 * encodes them. When the host set event.isDestination and the base type is
 * not itself travel_led, we blend the band TOWARD travel_led by element-wise
 * max — every output number already exists in the tables above (no invented
 * figures), a destination event is never estimated below the travel-led
 * floor, and a type that already exceeds it (e.g. Gala) is left alone.
 * `destinationAdjusted` tells the surface whether the blend actually moved
 * the band, so copy can disclose it honestly.
 */
export function estimateTotalRange({ type, guestCount, date = null, timeOfDay = 'afternoon', metroFactor = 1, isDestination = false }) {
  const guests = Math.max(0, Number(guestCount) || 0);
  if (!type || guests < 1) return null;
  let ph = PER_HEAD_BY_TYPE[type] || PER_HEAD_BY_FAMILY[budgetFamilyForType(type)] || { low: 100, high: 250 };
  let destinationAdjusted = false;
  if (isDestination && budgetFamilyForType(type) !== 'travel_led') {
    const tl = PER_HEAD_BY_FAMILY.travel_led;
    const blended = { low: Math.max(ph.low, tl.low), high: Math.max(ph.high, tl.high) };
    destinationAdjusted = blended.low !== ph.low || blended.high !== ph.high;
    ph = blended;
  }
  const tod = getTimeOfDayFactor(timeOfDay);
  const datePrem = getDatePremium(date, type);
  const factor = (metroFactor || 1) * (tod.multiplier || 1) * (datePrem.multiplier || 1);
  return {
    lowTotal:  Math.round(ph.low  * guests * factor / 100) * 100,
    highTotal: Math.round(ph.high * guests * factor / 100) * 100,
    destinationAdjusted,
  };
}
