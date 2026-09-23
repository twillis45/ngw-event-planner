// ─── THIRTEEN STEPPERS, OR TWO AND A DOOR ────────────────────────────────────
//
// The same dietary control renders on two surfaces, and until now they disagreed
// about how much of it to show. Measured on the Santa Fe 80th:
//
//   food sheet      Vegetarian · Vegan · "+ 11 more — Pescatarian · Gluten-free
//                   · Dairy-free · Nut allergy …" · "+ Other"
//   Calls to make   all thirteen steppers, expanded, every time
//
// Thirteen −/+ rows is most of a phone screen spent on questions the host has
// not been asked and mostly will not answer. The food sheet already had the
// right shape; the Calls editor was a second hand-rolled copy that never got it.
//
// THIS FINISHES A CONSOLIDATION THAT WAS HALF DONE. The 2026-07-11 food-plan
// audit found the TAG LIST hand-typed in three places and merged it into one
// `DIET_TAGS`. It did not merge the ORDERING AND PARTITION rule, so the
// vocabulary stayed in sync while the behaviour drifted. The list lives here now
// with the rule that reads it, because a vocabulary and the rule for showing it
// are one fact, and splitting them is how they came apart the first time.
//
// Corrected to 'Shellfish' (not legacy's 'Shellfish allergy'): the engine's own
// DIET_KEYWORDS table in lib/playbooks keys on 'Shellfish', so legacy's own
// guest-facing label silently never flags a shellfish line. That is a
// pre-existing legacy bug, not parity worth reproducing. The tags with no
// DIET_KEYWORDS entry (Egg/Soy allergy, Diabetic-friendly) still count toward
// headcount tracking — the same honest limit legacy has for those.
export const DIET_TAGS = Object.freeze([
  'Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Nut allergy',
  'Shellfish', 'Halal', 'Kosher', 'Alcohol-free', 'Egg allergy', 'Soy allergy',
  'Diabetic-friendly',
]);

const countOf = (map, k) => Number((map || {})[k]) || 0;

/**
 * How the dietary steppers should be laid out for THIS event.
 *
 * Returns { active, quick, rest, customs, totalActive, flaggedCount }:
 *   active       every tag the host has already given a count to, customs
 *                included — these are answers and are NEVER hidden behind a
 *                disclosure, however many there are.
 *   quick        the first few UNANSWERED tags, offered inline.
 *   rest         the unanswered remainder, behind "+ N more" (empty when
 *                `expanded`).
 *   customs      host-typed diets that are not in DIET_TAGS.
 *   totalActive  heads covered by the active counts.
 *   flaggedCount how many DIET_TAGS carry a count — the number the summary
 *                lines read, kept here so two surfaces cannot count it
 *                differently.
 *
 * A COUNT IS AN ANSWER AND OUTRANKS THE FOLD. This is the same rule
 * `playbookDecisionOptions` applies to its gates — the host's own input is never
 * the thing that gets hidden — and it is why the partition cannot be a plain
 * `slice(0, 2)` over the whole vocabulary.
 */
export function dietRowsFor(event, opts = {}) {
  const expanded = opts.expanded === true;
  const quickCount = Number.isFinite(opts.quickCount) ? Math.max(0, opts.quickCount) : 2;
  const dc = (event && event.dietCounts && typeof event.dietCounts === 'object') ? event.dietCounts : {};

  const customs = Object.keys(dc).filter((d) => !DIET_TAGS.includes(d) && countOf(dc, d) > 0);
  const active = [...DIET_TAGS, ...customs].filter((d) => countOf(dc, d) > 0);
  // Compared lower-cased so a custom "vegetarian" cannot reappear as an
  // unanswered "Vegetarian" row beside the count it already has.
  const activeLower = new Set(active.map((d) => String(d).toLowerCase()));
  const inactive = DIET_TAGS.filter((d) => countOf(dc, d) <= 0 && !activeLower.has(d.toLowerCase()));

  return {
    active,
    quick: expanded ? inactive : inactive.slice(0, quickCount),
    rest: expanded ? [] : inactive.slice(quickCount),
    customs,
    totalActive: active.reduce((s, d) => s + countOf(dc, d), 0),
    flaggedCount: DIET_TAGS.filter((d) => countOf(dc, d) > 0).length,
  };
}

/** Does this event carry ANY dietary count at all, custom entries included? */
export function anyDietFlagged(event) {
  const dc = (event && event.dietCounts && typeof event.dietCounts === 'object') ? event.dietCounts : {};
  return Object.keys(dc).some((k) => countOf(dc, k) > 0);
}
