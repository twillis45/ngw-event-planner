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
    'Airfare and ground transfers',
    'Lodging beyond the group block',
    'Travel insurance, visas, or permits',
    'Meals and activities not in the package',
    'Tips for local staff and guides',
  ],
};

// Lightweight family classifier for the estimator lib (mirrors App.js intakeFamily;
// kept self-contained so the budget lib never imports the app entry). Never falls
// to the maximal family — unknown types resolve to the middle-weight host_driven.
const _FAMILY_BY_TYPE = {
  'Dinner Party': 'home_hosted', 'Housewarming': 'home_hosted', 'Get-Together': 'home_hosted',
  'Wedding': 'full_service', 'Quinceañera': 'full_service', 'Sweet 16': 'full_service', 'Vow Renewal': 'full_service', 'Fundraiser / Gala': 'full_service',
  'Holiday Party': 'corporate', 'Board Meeting': 'corporate', 'Conference': 'corporate', 'Product Launch': 'corporate', 'Team Retreat': 'corporate', 'Town Hall': 'corporate', 'Training / Workshop': 'corporate', 'Award Ceremony': 'corporate', 'Client Dinner': 'corporate', 'Networking Event': 'corporate',
  'Elopement': 'travel_led', 'Wellness Retreat': 'travel_led',
};
export function budgetFamilyForType(type) {
  if (!type) return 'host_driven';
  if (_FAMILY_BY_TYPE[type]) return _FAMILY_BY_TYPE[type];
  const t = String(type).toLowerCase();
  if (/\b(dinner|brunch|lunch|potluck|housewarming|game ?night|book club|cookout|bbq|barbecue|backyard|cocktail|happy hour)\b/.test(t)) return 'home_hosted';
  if (/\b(retreat|getaway|destination|honeymoon|elopement|cruise)\b/.test(t)) return 'travel_led';
  if (/\b(conference|summit|offsite|off-site|launch|meeting|board|town ?hall|training|workshop|networking|corporate|client|kickoff|kick-off|all[- ]?hands|seminar|expo|trade ?show|panel|mixer)\b/.test(t)) return 'corporate';
  if (/\b(wedding|gala|quince|sweet ?16|vow|fundrais)\b/.test(t)) return 'full_service';
  return 'host_driven';
}

// Resolve the exclusion list from an explicit family key OR an event type.
export function notIncludedFor(familyOrType) {
  if (NOT_INCLUDED_BY_FAMILY[familyOrType]) return NOT_INCLUDED_BY_FAMILY[familyOrType];
  return NOT_INCLUDED_BY_FAMILY[budgetFamilyForType(familyOrType)] || NOT_INCLUDED_BY_FAMILY.host_driven;
}

// Back-compat default (full_service) for any caller still importing the constant.
export const NOT_INCLUDED = NOT_INCLUDED_BY_FAMILY.full_service;
