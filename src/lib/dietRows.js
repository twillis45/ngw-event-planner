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

// A guest's free text ("gluten free please", a meal pick, an invite chip) → a
// DIET_TAG, or null. Moved here from HostShellV2 (parity: App.js:10831, tagFor)
// so the vocabulary and the rule that reads guests into it are one file.
export const dietTagFor = (s) => {
  const t = String(s || '').trim().toLowerCase();
  if (!t) return null;
  return DIET_TAGS.find((tag) => {
    const tl = tag.toLowerCase();
    return tl === t || tl.startsWith(t) || (t.length > 2 && tl.startsWith(t.replace(/ (allergy|free)$/, '')));
  }) || null;
};

// ─── THE GUEST ROWS COUNT, IN EITHER MODE (Wanda audit P0-13, 11/22/2026) ──
// A headcount event can still carry guest rows, and a row's meal ("Vegetarian",
// "Gluten-free") is a dietary fact about a person who is coming. Each row that
// has not said no counts once per tag, from its needs, its plus-one's needs,
// its meal, and the invite's structured diet and allergen chips.
export function guestDietCounts(event) {
  const out = {};
  for (const g of (Array.isArray(event && event.guests) ? event.guests : [])) {
    if (!g || /^n/i.test(String(g.rsvp || ''))) continue;
    const parts = [
      ...String(g.needs || '').split(','), ...String(g.plusOneNeeds || '').split(','), String(g.meal || ''),
      ...(Array.isArray(g.diets) ? g.diets : []), ...(Array.isArray(g.allergens) ? g.allergens : []),
    ];
    const seen = new Set();
    for (const p of parts) {
      const tag = dietTagFor(p);
      if (tag && !seen.has(tag)) { seen.add(tag); out[tag] = (out[tag] || 0) + 1; }
    }
  }
  return out;
}

/**
 * The ONE dietary count every surface reads: the host's own tally wins for any
 * tag she has given a number to (zero included); every other tag comes from the
 * guest rows.
 */
export function dietCountsFor(event) {
  const host = (event && event.dietCounts && typeof event.dietCounts === 'object') ? event.dietCounts : {};
  const merged = { ...guestDietCounts(event) };
  for (const [k, v] of Object.entries(host)) merged[k] = Number(v) || 0;
  return merged;
}

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
  const dc = dietCountsFor(event);

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
  const dc = dietCountsFor(event);
  return Object.keys(dc).some((k) => countOf(dc, k) > 0);
}

/**
 * The guests' meal picks, tallied once (owner, 11/24/2026). Moved here from the
 * food page's estimate card, which kept it inline, so the "Dietary needs" row
 * reads the same count. `guest.meal` is the field RSVPs, CSV imports and the
 * per-guest meal edit write; '' and '—' are no pick. `unanswered` counts only
 * once someone has answered (no invented gap on a list nobody was asked).
 * @returns {{ counts: Object<string, number>, answered: number, unanswered: number }}
 */
export function mealTally(event) {
  const gs = (event && event.guests) || [];
  const counts = {};
  gs.forEach((g) => {
    const m = String((g && g.meal) || '').trim();
    if (m && m !== '—') counts[m] = (counts[m] || 0) + 1;
  });
  const answered = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, answered, unanswered: answered ? Math.max(0, gs.length - answered) : 0 };
}

/** AT THE TABLE (B6, 11/26/2026): who needs what, by name, grouped by need, in
 *  the order the guest list first names each. The same reading as
 *  guestDietCounts (needs, meal, diets, allergens; anyone who said no is not
 *  coming); a need the tags don't cover is kept as written. */
export function tableNeeds(event) {
  const by = new Map();
  for (const g of (Array.isArray(event && event.guests) ? event.guests : [])) {
    if (!g || /^n/i.test(String(g.rsvp || ''))) continue;
    const parts = [
      ...String(g.needs || '').split(','), String(g.meal || ''),
      ...(Array.isArray(g.diets) ? g.diets : []), ...(Array.isArray(g.allergens) ? g.allergens : []),
    ].map((p) => String(p || '').trim()).filter(Boolean);
    const seen = new Set();
    for (const p of parts) {
      const need = dietTagFor(p) || p;
      const key = need.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (!by.has(key)) by.set(key, { need, names: [] });
      by.get(key).names.push(String(g.name || '').trim() || 'A guest');
    }
  }
  return [...by.values()];
}
