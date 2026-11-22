// ─── WHAT SHE SAID THAT A CALL ASKS AGAIN (owner, 11/21/2026) ────────────────
//
// "Don't keep asking host for the same information." Five facts in a creation
// sentence were heard, printed under "Didn't make it into the plan", and then
// asked for on the next screen:
//
//   "Potluck Thanksgiving"            → who cooks       (hosting model)
//   "BYOB"                            → the drinks call
//   "including 8 kids"                → the kids count
//   "one guest has a nut allergy"     → the allergy count
//   "3 staying overnight"             → how many stay
//
// Each reader returns what she said or null — never a guess — and the creation
// seam writes it (HostShellV2's event builder). heardClauses lists them as
// seam readers so a clause one of them read is no longer reported as dropped.
//
// PURE: text in, a value out.

const NUMBER_WORDS = { one: 1, a: 1, an: 1, single: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
const NUM = '(\\d+|one|a|an|single|two|three|four|five|six|seven|eight|nine|ten|twelve)';
const toNumber = (w) => (/^\d+$/.test(String(w)) ? Number(w) : (NUMBER_WORDS[String(w).toLowerCase()] || 0));

/** "potluck" — the word, when she said it and did not rule it out. */
export function heardPotluck(text) {
  const t = String(text || '');
  if (!/\bpot\s?-?luck\b/i.test(t) || /\b(?:no|not a|instead of a?)\s+pot\s?-?luck\b/i.test(t)) return null;
  return 'potluck';
}

/** The food-model call's potluck option, when she said "potluck". */
const FOOD_MODEL_CALLS = ['hosting_model', 'food-model', 'food_model', 'food_source', 'food_style', 'sourcing'];
export function potluckPickFor(decisions, text) {
  if (!heardPotluck(text)) return null;
  for (const id of FOOD_MODEL_CALLS) {
    const d = (decisions || []).find((x) => x && x.id === id);
    const o = (d && Array.isArray(d.options)) ? d.options.map(String) : [];
    const pick = o.find((x) => /^potluck\b/i.test(x)) || o.find((x) => /^full potluck/i.test(x)) || o.find((x) => /potluck/i.test(x));
    if (pick) return { id, pick };
  }
  return null;
}

/** "BYOB" / "bring your own bottle". */
export function heardByob(text) {
  return /\bBYOB\b|\bbring your own (?:booze|bottle|drinks|beer|wine)\b/i.test(String(text || '')) ? 'BYOB' : null;
}
/** The drinks call's BYOB option (playbooks mark the drinks call `drinksCall`). */
export function byobPickFor(decisions, text) {
  if (!heardByob(text)) return null;
  const d = (decisions || []).find((x) => x && x.drinksCall);
  const pick = d && Array.isArray(d.options) ? d.options.map(String).find((o) => /\bBYOB\b/i.test(o)) : null;
  return pick ? { id: d.id, pick } : null;
}

/**
 * "no kids" / "adults only" (the parser's kidsPolicy) → the audience call's
 * adults-only option, when the playbook has one (audit lane B, 11/22/2026:
 * "40 adults, no kids" was saved adults-only while the Halloween audience call
 * proposed "Family party — all ages"). null when she did not say it or the
 * playbook asks no such question.
 */
export function adultsOnlyPickFor(decisions, kidsPolicy) {
  if (kidsPolicy !== 'adults_only') return null;
  const d = (decisions || []).find((x) => x && x.id === 'audience');
  const pick = d && Array.isArray(d.options) ? d.options.map(String).find((o) => /^adults?[\s-]only\b/i.test(o)) : null;
  return pick ? { id: d.id, pick } : null;
}

/** "including 8 kids", "plus 3 children" → 8. */
export function heardKidsCount(text) {
  const m = String(text || '').match(new RegExp(`\\b${NUM}\\s+(?:little\\s+)?(?:kids|children|little ones)\\b`, 'i'));
  const n = m ? toNumber(m[1]) : 0;
  return n > 0 ? n : null;
}

// The allergy words her sentence can carry, keyed to the dietary steppers'
// own vocabulary (lib/dietRows.js DIET_TAGS).
const ALLERGENS = [
  ['Nut allergy', /(?:tree\s+)?(?:pea)?nut/],
  ['Shellfish', /shellfish/],
  ['Egg allergy', /egg/],
  ['Soy allergy', /soy/],
  ['Gluten-free', /gluten|celiac/],
  ['Dairy-free', /dairy|lactose/],
];
/** "one guest has a nut allergy" → { 'Nut allergy': 1 }. null when none. */
export function heardAllergyCounts(text) {
  const t = String(text || '');
  const out = {};
  const re = new RegExp(`\\b${NUM}\\s+(?:of (?:them|us|the guests)\\s+|guests?\\s+|people\\s+|persons?\\s+|kids?\\s+|child(?:ren)?\\s+)?(?:has|have|with|is|are)?\\s*(?:an?\\s+)?((?:tree\\s+)?[a-z]+)\\s+allerg(?:y|ies|ic)\\b`, 'gi');
  let m;
  while ((m = re.exec(t))) {
    const n = toNumber(m[1]);
    const hit = ALLERGENS.find(([, r]) => r.test(m[2].toLowerCase()));
    if (hit && n > 0) out[hit[0]] = (out[hit[0]] || 0) + n;
  }
  return Object.keys(out).length ? out : null;
}

/** "3 staying overnight" → 3. */
export function heardOvernightCount(text) {
  const m = String(text || '').match(new RegExp(`\\b${NUM}\\s+(?:guests?\\s+|people\\s+|of (?:them|us)\\s+)?(?:are\\s+|will be\\s+)?staying\\s+(?:overnight|over|the night)\\b`, 'i'));
  const n = m ? toNumber(m[1]) : 0;
  return n > 0 ? n : null;
}
