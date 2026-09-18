// ─── WHAT KIND OF ANSWER DOES THIS DECISION TAKE? ────────────────────────────
//
// `decisionType` has sat in DECISION_SCHEMA_SPEC.md since 2026-07-15 as
// `'pick-one'|'multi'|'count'|'yes-no'|'free'`, authored on 0 of 260 decisions
// and — until this file — READ BY NOTHING. The spec's own note said it: "BLANK
// (`options` implies pick-one)".
//
// A field with no reader is not a gap, it is a line in a spec that was never
// built, and seven of its neighbours were deleted rather than filled for exactly
// that reason. This one earned the opposite treatment because the missing type
// costs a host something measurable.
//
// THE DEFECT, MEASURED 2026-09-18. Every decision is implicitly pick-one, and the
// write path replaces:
//
//     host picks "Vegetarian"    -> foodChoices.dietary = "Vegetarian"
//     host picks "Nut allergy"   -> foodChoices.dietary = "Nut allergy"
//     is the vegetarian still recorded?  NO
//
// Dinner Party's `dietary` offers TEN options — Vegetarian, Vegan, Gluten-free,
// Nut allergy, Dairy-free, Shellfish, Halal, Kosher, Pescatarian, Alcohol-free.
// Crab Feast's offers NINE. These are not alternatives to choose between; they
// are independent facts about different guests. A real table has a vegetarian AND
// someone with a nut allergy, and the app could hold exactly one — the second
// pick silently erased the first.
//
// For allergens that is a safety defect, not a UX nicety. This repo has been here
// before: a shipped commit records the diet picker flagging NO allergens for two
// of its own options because the picker's labels and the matcher's keys had
// drifted. The dietary vocabulary is load-bearing and it has bitten.
//
// WHAT THIS FILE DOES NOT DO. It does not type all 260 decisions. The default
// stays 'pick-one' and it is correct for the overwhelming majority — and for at
// least one case the band-string that LOOKS like a workaround is deliberate care:
// Repast's headcount offers "Close family + a few (~20)" / "…congregation (~50)"
// / "A large homegoing (~120+)", and its authored `why` says "No one needs an
// exact count on a day like this — an honest estimate is enough." Asking a
// grieving family to type 47 would be worse than the bands. That decision stays
// pick-one on purpose.
//
// PURE: no I/O, no clock, no storage.

export const DECISION_TYPES = Object.freeze(['pick-one', 'multi', 'count', 'yes-no', 'free']);

/** The default, and correct for most decisions: one answer replaces another. */
export const DEFAULT_DECISION_TYPE = 'pick-one';

const optionLabels = (decision) => {
  const raw = (decision && decision.options) || [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => (typeof o === 'string' ? o : (o && (o.label || o.id)) || ''))
    .filter(Boolean);
};

/**
 * A restriction list: options that are independent facts about different guests
 * rather than alternatives to choose between. Deliberately narrow — it requires
 * the decision to BE about dietary needs AND to offer several of them, because a
 * three-option "how many have needs" question (Thanksgiving's `dietary_table`)
 * is a genuine pick-one and must not be caught.
 */
const looksLikeRestrictionList = (decision) => {
  const subject = `${(decision && decision.id) || ''} ${(decision && decision.label) || ''}`;
  if (!/allerg|dietar|\bdiet\b|restriction/i.test(subject)) return false;
  const opts = optionLabels(decision);
  if (opts.length < 4) return false;
  // Every option is a short restriction NAME, not a sentence describing a
  // situation. "Vegetarian" yes; "One or two needs — adjust dishes and label
  // them" no. The dash-clause is what separates the two shapes in this corpus.
  return opts.every((o) => o.length <= 24 && !/—|\bthe\b|\badjust\b/i.test(o));
};

/**
 * What kind of answer this decision takes.
 *
 * An authored `decisionType` always wins — this is a derivation for the case
 * nobody has typed one, exactly like the timing-provenance resolver, and it
 * refuses rather than guessing when the shape is not clearly a restriction list.
 */
export function decisionTypeFor(decision) {
  if (!decision) return DEFAULT_DECISION_TYPE;
  const authored = String(decision.decisionType || '');
  if (DECISION_TYPES.includes(authored)) return authored;
  if (looksLikeRestrictionList(decision)) return 'multi';
  return DEFAULT_DECISION_TYPE;
}

/** Does this decision hold SEVERAL answers at once? */
export const isMultiDecision = (decision) => decisionTypeFor(decision) === 'multi';

/**
 * Normalise a stored answer to a list, whatever shape it is on disk.
 *
 * A pick-one answer is a string and stays a one-item list; a multi answer is an
 * array. Callers that need the list read this instead of branching on typeof —
 * the branch is the thing that drifts.
 */
export function answerList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v || '')).filter(Boolean);
  const s = String(value == null ? '' : value).trim();
  return s ? [s] : [];
}

/**
 * The one display form. Existing surfaces print `foodChoices[id]` directly and a
 * bare array would render as "Vegetarian,Nut allergy" with no space — so any
 * surface showing a multi answer asks for it here.
 */
export function answerText(value) {
  return answerList(value).join(', ');
}
