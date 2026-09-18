// ─── recommendedWhen — the pick that moves with the event ────────────────────
//
// WHAT THIS EXISTS TO FIX. `difmCapable: 'can-derive'` claims the app can work
// an answer out. Measured across the corpus 2026-09-18: all 129 such decisions
// propose their authored `default` literal, and ZERO respond to any event data —
// the proposal is identical on a 4-guest event and a 400-guest one. "can-derive"
// was a flag meaning "this playbook authored a default", said out loud as
// "We'll go with X". The word derive appeared in exactly one place in the code
// and was the one place nothing happened.
//
// DECISION_SCHEMA_SPEC.md declared the fix and left it BLANK:
//
//   recommendedWhen · [{ when: condition, pick: option }] ·
//     budget/count engines → — → the recommendation · BLANK.
//     Best pick adapts to context instead of a static default.
//
// This is that field, built.
//
// ── THE TWO RULES THAT KEEP IT HONEST ───────────────────────────────────────
//
// 1. A RULE ONLY FIRES ON A FACT THE APP ACTUALLY KNOWS. Every fact carries
//    `known`. An unknown fact does not compare as zero, does not compare as
//    false — it refuses the rule outright and the authored default stands. A
//    guest-count rule on an event with no headcount must not quietly recommend
//    the small-party option; that would be the invention this whole file is
//    written against, dressed as a derivation.
//
// 2. A RECOMMENDATION MUST NAME ITSELF. `evaluateRecommendation` returns the
//    rule that fired and the facts it read, so the surface can say "assigned
//    seats, because you're expecting 12" instead of the generic line. A
//    derivation nobody can see the reasoning for is indistinguishable from a
//    guess, and this repo has spent a day proving what that costs.
//
// ── WHY A DECLARED CONDITION AND NOT A PREDICATE FUNCTION ───────────────────
// Playbook data files are content, reviewed by people who are not reading the
// engine. A function in a data file is code nobody reviews and nothing can
// scan; a declared `{ guests: { gte: 8 } }` is legible, diffable, and
// checkable — recommendedPick.test.js asserts every authored rule names a real
// option and a known operator. Same division `whenChoice` already uses: the
// data says the condition, the engine says what happens.
//
// PURE, AND DELIBERATELY IMPORT-FREE. An earlier draft imported sizingGuests
// and venueFor directly and created a cycle: index.js must import THIS to wire
// the proposal, so this must not import index.js back. The caller gathers the
// engine values and hands them to `buildFacts`. That also makes the fact bag
// testable without booting the whole engine.

/** Comparison operators a `when` clause may use. Anything else is a defect. */
export const OPERATORS = Object.freeze(['gte', 'lte', 'gt', 'lt', 'eq', 'in', 'not']);

/** The facts a rule may read. Each is `{ value, known }` — never a bare value. */
export const FACT_KEYS = Object.freeze([
  'guests', 'budget', 'daysOut', 'venueKind', 'isDestination', 'overnight',
  // ── THE HOST IS A FACT TOO (2026-09-18) ────────────────────────────────────
  // Until this line there was NO host fact in this bag at all, so no authored
  // rule could condition on who is carrying the event — only on how big it is,
  // when it is, and where. Measured consequence in the corpus: nine authored
  // strings across five playbooks assert the host is on their own ("a dinner
  // party this size is one person's job", "one host cannot pass apps, tend bar,
  // AND host", "a brutal solo lift", "the app assumes solo until you say
  // otherwise") and they were UNCONDITIONAL — they printed unchanged to a host
  // who had set hostCapacity:'has_help' AND typed named helpers onto their food
  // and timeline rows. Two independent statements of "I have help", both
  // ignored, because the fact bag had nowhere to put them.
  'hostCapacity', 'helperCount',
]);

/** The two values hostCapacity may take. Anything else is "not told". */
const HOST_CAPACITY = Object.freeze(['solo', 'has_help']);

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

/**
 * The fact bag, read from the REAL engines rather than from raw event fields.
 * This is the half that makes it a derivation: `guests` is sizingGuests — the
 * same number the food plan and the budget size against — not `event.guestCount`.
 */
export function buildFacts({
  guests, guestsKnown, budget, daysOut, venueKind, venueKnown, isDestination, overnight,
  hostCapacity, helperCount,
} = {}) {
  const g = num(guests);
  const b = num(budget);
  const d = num(daysOut);
  const h = num(helperCount);
  return {
    // KNOWN means the app genuinely has the number — not that a field coerced
    // to zero. A roster of nothing but pending RSVPs is not a headcount, and
    // recommending off it would be the fabrication this file exists to prevent.
    guests: { value: g, known: !!guestsKnown && g != null && g > 0 },
    // An explicit total the host set. A budget ROWSUM is a different fact
    // (what is allocated), and conflating the two is a live defect elsewhere in
    // this repo — not one to import here.
    budget: { value: b, known: b != null && b > 0 },
    daysOut: { value: d, known: d != null },
    venueKind: { value: venueKind || null, known: !!venueKnown && !!venueKind },
    // `undefined` on these is genuinely "not told", not false.
    isDestination: { value: isDestination === true, known: typeof isDestination === 'boolean' },
    overnight: { value: overnight === true, known: typeof overnight === 'boolean' },
    // What the host SAID about capacity. Unset, misspelt, or any other value is
    // "not told", and not told is NOT 'solo' — that inference is precisely the
    // one the nine strings were making for free.
    hostCapacity: {
      value: HOST_CAPACITY.includes(hostCapacity) ? hostCapacity : null,
      known: HOST_CAPACITY.includes(hostCapacity),
    },
    // How many distinct people the host has NAMED as helping (the helper
    // engine's own count — see decisionFactsFor for where it comes from).
    //
    // KNOWN ONLY WHEN POSITIVE, and that asymmetry is deliberate, not a bug:
    //   • ≥1 named helper is EVIDENCE the host has help. The app can act on it.
    //   • 0 named helpers is SILENCE. A host who has not typed anyone onto a
    //     food row has not told us they are alone; they have told us nothing.
    // So `{ helperCount: { lt: 1 } }` can never fire, by construction. A rule
    // that wants to say "you are on your own" has no fact to stand on, which is
    // the correct outcome — the authored literal stays and says whatever it
    // always said. Only the claim that the host HAS help is derivable here.
    helperCount: { value: h, known: h != null && h > 0 },
  };
}

/** One comparison. Returns null (not false) when the fact is unknown. */
const compare = (fact, op, operand) => {
  if (!fact || !fact.known) return null;                 // UNKNOWN ≠ false
  const v = fact.value;
  switch (op) {
    case 'gte': return num(v) != null && num(v) >= Number(operand);
    case 'lte': return num(v) != null && num(v) <= Number(operand);
    case 'gt': return num(v) != null && num(v) > Number(operand);
    case 'lt': return num(v) != null && num(v) < Number(operand);
    case 'eq': return v === operand;
    case 'in': return Array.isArray(operand) && operand.includes(v);
    case 'not': return Array.isArray(operand) ? !operand.includes(v) : v !== operand;
    default: return null;                                 // unknown operator: refuse
  }
};

/**
 * Does this `when` clause hold? EVERY named fact must be known and must pass —
 * an AND, and one unknown fact refuses the whole clause.
 * Returns { pass, read } where `read` names the facts actually consulted, so a
 * surface can explain the recommendation in the host's own terms.
 */
export function clauseHolds(when, facts) {
  if (!when || typeof when !== 'object') return { pass: false, read: [] };
  const read = [];
  for (const [key, test] of Object.entries(when)) {
    const fact = facts[key];
    if (!fact) return { pass: false, read: [] };          // unknown fact key
    if (!test || typeof test !== 'object') return { pass: false, read: [] };
    for (const [op, operand] of Object.entries(test)) {
      const r = compare(fact, op, operand);
      if (r !== true) return { pass: false, read: [] };    // false OR unknown
    }
    read.push({ key, value: fact.value });
  }
  return { pass: read.length > 0, read };
}

/**
 * The recommended pick for this decision on this event, or null.
 *
 * Rules are tried IN AUTHORED ORDER and the first match wins, so an author
 * orders from most specific to least — the same reading as a CSS cascade or a
 * switch. Returning null means "no rule applied", and the caller keeps the
 * authored default; that is the ordinary case, not a failure.
 */
export function evaluateRecommendation(decision, facts) {
  const rules = decision && Array.isArray(decision.recommendedWhen) ? decision.recommendedWhen : null;
  if (!rules || !rules.length) return null;
  const options = Array.isArray(decision.options) ? decision.options : [];
  for (const rule of rules) {
    if (!rule || !rule.pick) continue;
    // A rule picking something the decision does not offer is the defect
    // defaultIsAnOption catches for defaults. Refuse it at runtime too rather
    // than recommend a value no chip can match.
    if (options.length && !options.includes(rule.pick)) continue;
    const { pass, read } = clauseHolds(rule.when, facts);
    if (pass) return { pick: rule.pick, because: rule.because || null, read, rule };
  }
  return null;
}

/**
 * The first authored rule in `rules` whose `when` clause holds. Same contract as
 * `evaluateRecommendation` above — authored order, first match wins, an unknown
 * fact REFUSES the clause rather than comparing as zero/false — but it returns
 * the rule itself rather than a pick, so a caller can hang something other than
 * an option off a condition. Returns null when nothing holds.
 */
export function firstHoldingRule(rules, facts) {
  if (!Array.isArray(rules) || !rules.length) return null;
  for (const rule of rules) {
    if (!rule || typeof rule !== 'object') continue;
    const { pass, read } = clauseHolds(rule.when, facts || {});
    if (pass) return { rule, read };
  }
  return null;
}

/**
 * CONDITIONAL AUTHORED COPY — `copyWhen`.
 *
 * WHAT IT EXISTS TO FIX. Nine authored strings across five playbooks stated as
 * fact that the host is on their own — "a dinner party this size is one
 * person's job", "one host cannot pass apps, tend bar, AND host", "a brutal
 * solo lift", "the app assumes solo until you say otherwise". Measured
 * 2026-09-18: all nine were UNCONDITIONAL literals, so they printed verbatim to
 * a host who had already set hostCapacity:'has_help' and named real people on
 * their food and timeline rows. The app had the answer twice over and said the
 * opposite anyway.
 *
 * WHY A DECLARED CONDITION, SAME AS `recommendedWhen`. These strings live in
 * content files reviewed by people who do not read the engine. `{ when: {
 * helperCount: { gte: 1 } }, why: '…' }` is legible, diffable and scannable;
 * a predicate function in a data file is none of those. The data says the
 * condition, the engine says what happens.
 *
 * A CLAUSE IS AN AND, SO AN OR IS TWO ENTRIES. `{a, b}` requires both facts.
 * Authors who mean "either signal" write two rules with the same copy — which
 * is what the nine do, because either "I have help" statement is enough to stop
 * asserting the opposite.
 *
 * SILENCE CHANGES NOTHING. Every fact these rules read is unknown on an event
 * that has said nothing, an unknown fact refuses its clause, and a decision
 * with no `copyWhen` never enters this function's body at all — so every
 * existing playbook renders byte-identically. That is the additive guarantee,
 * and conditionalCopy.test.js holds it.
 *
 * Returns the three resolved strings plus `copyBasis`:
 *   'authored'    the literal stands (no rules, or none held)
 *   'conditional' a rule fired on facts the app knows; `read` names them
 */
export function resolveCopy(decision, facts) {
  const base = {
    why: (decision && typeof decision.why === 'string') ? decision.why : '',
    defaultWhy: (decision && typeof decision.defaultWhy === 'string') ? decision.defaultWhy : '',
    rationale: (decision && decision.priorityBasis && typeof decision.priorityBasis.rationale === 'string')
      ? decision.priorityBasis.rationale : '',
  };
  const rules = (decision && Array.isArray(decision.copyWhen)) ? decision.copyWhen : null;
  const hit = rules ? firstHoldingRule(rules, facts) : null;
  if (!hit) return { ...base, copyBasis: 'authored', read: [] };
  const r = hit.rule;
  const take = (k) => (typeof r[k] === 'string' && r[k].trim() ? r[k] : base[k]);
  return {
    why: take('why'),
    defaultWhy: take('defaultWhy'),
    rationale: take('rationale'),
    copyBasis: 'conditional',
    read: hit.read,
  };
}

/**
 * The whole job in one call: what should this decision propose, and on what
 * basis? `basis` is the honest part —
 *
 *   'recommended'      a rule fired on facts the app knows
 *   'authored-default' no rule applied; the playbook's literal stands
 *   null               nothing to propose at all
 */
export function proposedPickFor(decision, facts) {
  const rec = evaluateRecommendation(decision, facts || {});
  if (rec) return { pick: rec.pick, basis: 'recommended', because: rec.because, read: rec.read };
  const def = decision && decision.default != null && decision.default !== '' ? decision.default : null;
  return def ? { pick: def, basis: 'authored-default', because: null, read: [] } : null;
}
