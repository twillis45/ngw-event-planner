// ─── Who eats the protein? ONE reader. ────────────────────────────────────────
//
// "How many kids are here" and "how many vegetarians are here" were being answered
// twice — once by the food engine (playbooks/index.js) and once by the crab engine
// (crabPlan.js) — from DIFFERENT fields. The food engine read `dietCounts` and the
// roster's `meal`/`needs`/`diets`; the crab engine read neither, so a declared
// vegetarian shrank the food row and left the crab plan untouched. Two screens, two
// crab totals. Same shape as every other bug in this sweep.
//
// A vegetarian eats NONE of the protein — a full subtraction, not a discount. A kid
// eats about 40% of an adult's share. Both engines now ask these two functions.

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Kids eat ~40% of an adult's protein share. A grounded catering heuristic; the crab
 *  and cookout playbooks both said "fewer for kids" for years without ever sizing it. */
export const KID_PROTEIN_FACTOR = 0.4;

const isRosterMode = (event) =>
  Array.isArray(event && event.guests) && event.guests.length > 0 && event.guestMode !== 'count';

const attending = (event) =>
  (Array.isArray(event && event.guests) ? event.guests : []).filter(
    (g) => g && !/^n/i.test(String(g.rsvp || ''))
  );

/**
 * Vegetarians + vegans among the people actually coming.
 * The host's explicit `dietCounts` tally WINS when set; the roster fills in only when
 * no manual tally exists (so the invite's diet picks size the food on their own).
 */
export function vegCount(event) {
  const ev = event || {};
  const dietCounts = (ev.dietCounts && typeof ev.dietCounts === 'object') ? ev.dietCounts : {};
  const cnt = (k) => Math.max(0, Math.round(num(dietCounts[k])));
  const manual = cnt('Vegetarian') + cnt('Vegan');
  if (manual > 0) return manual;
  if (!isRosterMode(ev)) return 0;
  return attending(ev).filter((g) => {
    const hay = [g.meal, g.needs, ...(Array.isArray(g.diets) ? g.diets : [])].filter(Boolean).join(' ').toLowerCase();
    return /\bvegan\b|vegetarian|veggie/.test(hay);
  }).length;
}

/**
 * Children among the people actually coming.
 * A roster's own per-guest `kids` ("Children in Party") is the ground truth once a
 * roster exists. `event.kidsCount` is a SEPARATE manual field that only applies in
 * headcount/count mode, where there is no roster to derive it from.
 * @param {number} [bandKids] the attendance band's already-summed kid count, when the
 *        caller has one (the food engine does). Avoids re-summing the roster.
 */
export function kidCount(event, bandKids) {
  const ev = event || {};
  if (!isRosterMode(ev)) return Math.max(0, Math.round(num(ev.kidsCount)));
  if (bandKids != null) return Math.max(0, Math.round(num(bandKids)));
  return attending(ev).reduce((s, g) => s + Math.max(0, num(g.kids)), 0);
}
