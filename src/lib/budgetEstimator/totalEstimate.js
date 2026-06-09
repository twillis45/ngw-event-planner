// ─── Budget total estimate ─────────────────────────────────────────────────
// Sprint 60.Y. Extracted from BudgetEstimateHint so the per-head total range is
// a single source of truth — the hint, the intake "typical setup" checklist,
// and any future surface all compute the same planning total. Planning
// estimates only; never a quote or contract.

import { getDatePremium, getTimeOfDayFactor } from '../estimatorFactors.js';

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

/**
 * Planning-grade total budget range for an event.
 * Returns { lowTotal, highTotal } rounded to the nearest $100, or null when
 * type/guests are missing (can't estimate without them).
 */
export function estimateTotalRange({ type, guestCount, date = null, timeOfDay = 'afternoon', metroFactor = 1 }) {
  const guests = Math.max(0, Number(guestCount) || 0);
  if (!type || guests < 1) return null;
  const ph = PER_HEAD_BY_TYPE[type] || { low: 100, high: 250 };
  const tod = getTimeOfDayFactor(timeOfDay);
  const datePrem = getDatePremium(date, type);
  const factor = (metroFactor || 1) * (tod.multiplier || 1) * (datePrem.multiplier || 1);
  return {
    lowTotal:  Math.round(ph.low  * guests * factor / 100) * 100,
    highTotal: Math.round(ph.high * guests * factor / 100) * 100,
  };
}
