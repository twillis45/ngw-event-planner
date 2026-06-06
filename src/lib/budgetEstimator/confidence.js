// ─── Estimator Confidence ──────────────────────────────────────────────────
// Sprint 61.D. The estimator is honest about how much it knows. Confidence
// is a function of how many input signals exist (type / date / guests /
// market / time-of-day / event-history).
//
// We never claim "exact." The hint surface always shows a range + a
// confidence chip + a "Not included" line.

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

// Items NOT included in any estimate. Surfaced verbatim by the hint.
export const NOT_INCLUDED = [
  'Wedding/event-day attire and accessories',
  'Gifts (welcome bags, attendant gifts, favors)',
  'Honeymoon or travel for the couple/host',
  'Rehearsal dinner and pre-event parties',
  'Marriage license / permit fees',
  'Tips and gratuities beyond standard service charge',
  'Cake / dessert (when not included with catering)',
  'Health insurance, day-of medical, security beyond required',
];
