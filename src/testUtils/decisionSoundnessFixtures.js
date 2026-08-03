// ─── SIX JUDGED FIXTURES — the decision-soundness contract ────────────────────
//
// Each fixture is an event the engine must handle soundly, plus the judgement of
// what sound means for it. The judgement lives beside the state deliberately: a
// fixture whose expectation is written in the test body can be quietly relaxed
// when it fails, and this package exists because exactly that kept happening.
//
// Deterministic by construction: every date comes from daysFromNow(), which is
// built from LOCAL date components, so the lead is exactly n days in UTC and in
// America/New_York alike. No Date.now() reaches a fixture body.

import { daysFromNow } from './frozenClock';

// The seven rules, named once so a failure reports which rule it broke.
export const RULES = {
  REACHABLE: 'Reachable — a valid authored decision can become the selected next action',
  HONEST: 'Honest under uncertainty — unknown is not silently converted to false',
  GATED: 'Properly gated — missing prerequisites block downstream action without fabricating completion',
  RANKED: 'Ranked for consequence — a higher-consequence reachable action beats a lower-value timing artifact',
  TRUTHFUL: 'Truthful in voice — the ask preserves intent and is not circular, malformed, or internally worded',
  ACTIONABLE: 'Actionable — the CTA route matches the selected action',
  EXPLAINABLE: 'Explainable — the reason shown is grounded in actual event state',
};

// Output shapes no fixture may ever produce. Checked against the rendered ask,
// the explanation, and the CTA label together.
export const FORBIDDEN = [
  { name: 'double question mark', re: /\?\?/ },
  { name: 'empty question stem', re: /^\s*\?+\s*$/ },
  { name: 'stray null/undefined/NaN', re: /\b(null|undefined|NaN)\b/ },
  { name: 'internal wording', re: /\b(dueInDays|leadDays|priorityScore|createdAt|\[object)\b/ },
  { name: 'unresolved template', re: /\$\{|\{\{/ },
];

const base = (over) => ({
  guestMode: 'count',
  vendors: [],
  guests: [],
  timeline: [],
  ...over,
});

// ── A — Fresh event ──────────────────────────────────────────────────────────
// Minimal intake. The engine must find one foundational thing to do and must not
// manufacture urgency out of an empty event.
export const fixtureA = {
  key: 'A',
  name: 'Fresh event',
  event: () => base({
    id: 'ds-a', type: 'Birthday Party', name: 'Birthday', date: daysFromNow(60),
    guestCount: null, guestEstimate: null, totalBudget: null, venue: '',
  }),
  judgement: {
    eligible: 'foundational dominoes only (date/guests/budget class)',
    gated: 'everything depending on guest count or budget',
    expectWinner: 'a foundational action',
    expectAsk: 'a plain foundational instruction',
    expectExplanation: 'grounded in the empty state, not in invented risk',
    expectRoute: 'a real tab route on this event',
    unacceptable: ['critical severity', 'overdue framing', 'certainty about unentered facts'],
  },
};

// ── B — Solemn repast ────────────────────────────────────────────────────────
// Short runway, food provider undecided. The circular "Decide the menu" ask was
// reported live on this shape.
export const fixtureB = {
  key: 'B',
  name: 'Solemn repast',
  event: () => base({
    id: 'ds-b', type: 'Repast', name: 'Repast', date: daysFromNow(4),
    guestCount: 60, guestEstimate: 60, totalBudget: 900,
    venue: 'Fellowship Hall', venueCity: 'Baltimore', venueState: 'MD',
    solemn: true,
  }),
  judgement: {
    eligible: 'food provider sourcing',
    gated: 'menu detail until the provider is known',
    expectWinner: 'provider/sourcing, not menu detail',
    expectAsk: 'names the provider question, never restates the decision title',
    expectExplanation: 'grounded, no blame',
    expectRoute: 'food context',
    unacceptable: ['Decide the menu (circular)', 'blame language', 'late/overdue scolding'],
  },
};

// ── C — Guest count unknown ──────────────────────────────────────────────────
// The absent-fact fixture. guestCount is genuinely absent, not zero.
export const fixtureC = {
  key: 'C',
  name: 'Guest count unknown',
  event: () => base({
    id: 'ds-c', type: 'Dinner Party', name: 'Dinner', date: daysFromNow(21),
    guestMode: 'count', guestCount: null, guestEstimate: null,
    totalBudget: 1500, venue: 'Home',
  }),
  judgement: {
    eligible: 'the request for the missing headcount',
    gated: 'catering quantities and seating',
    expectWinner: 'the headcount request',
    expectAsk: 'asks for the count',
    expectExplanation: 'says what the count unlocks',
    expectRoute: 'guests context',
    unacceptable: ['treating absent as zero', 'quantities computed from a fabricated count', 'marking the decision complete'],
  },
};

// ── D — Budget pressure ──────────────────────────────────────────────────────
// Spend entered against an estimate, one money decision blocking another. The
// money action has been unreachable on this shape.
export const fixtureD = {
  key: 'D',
  name: 'Budget pressure',
  event: () => base({
    id: 'ds-d', type: 'Wedding Reception', name: 'Reception', date: daysFromNow(14),
    guestCount: 80, guestEstimate: 80, totalBudget: 6000,
    venue: 'The Hall', venueCity: 'Annapolis', venueState: 'MD',
    vendors: [
      { id: 'v1', name: 'Hall Catering', category: 'Catering', status: 'booked', cost: 4200, deposit: 2000, depositPaid: true, balanceDue: 2200, balanceDueDate: daysFromNow(3) },
      { id: 'v2', name: 'Bloom Florals', category: 'Florist', status: 'booked', cost: 1400, deposit: 700, depositPaid: false },
    ],
    expenses: [
      { id: 'e1', label: 'Catering deposit', amount: 2000, paid: true },
      { id: 'e2', label: 'Rentals', amount: 1900, paid: true },
    ],
  }),
  judgement: {
    eligible: 'the money decision (balance/deposit)',
    gated: 'discretionary spend while the balance is unsettled',
    expectWinner: 'a money action when it is the most consequential reachable item',
    expectAsk: 'names the money act',
    expectExplanation: 'cites real amounts or real dates from the event',
    expectRoute: 'budget context',
    unacceptable: ['money action absent from the plan', 'infinite recommendation loop', 'route that does not reach budget'],
  },
};

// ── E — Authored ask preservation ────────────────────────────────────────────
// A decision carrying a specific authored host-facing ask. Its meaning must
// survive every stage, and the malformed-punctuation path is judged here too.
export const fixtureE = {
  key: 'E',
  name: 'Authored ask preservation',
  event: () => base({
    id: 'ds-e', type: 'Game Night', name: 'Game Night', date: daysFromNow(9),
    guestCount: 12, guestEstimate: 12, totalBudget: 300, venue: 'Home',
  }),
  // The authored labels that carry a question AND a trailing parenthetical —
  // the exact shape that produced "??" at the render boundary.
  authoredLabels: [
    'Alcohol? (adult parties)',
    'What is the drink spread? (game night skews light — people need to think)',
    'Who is in on it? (secret-keepers)',
    'How will you honor the history? (the heart of Juneteenth)',
  ],
  judgement: {
    eligible: 'the authored decision',
    gated: 'none',
    expectWinner: 'the authored decision when it leads',
    expectAsk: 'the authored question, intact, with exactly one terminal question mark',
    expectExplanation: 'grounded',
    expectRoute: 'aligned with the authored decision',
    unacceptable: ['??', 'empty stem', 'generic fallback replacing a valid authored ask'],
  },
};

// ── F — Ranking inversion ────────────────────────────────────────────────────
// Two reachable actions. The consequential one is listed SECOND and carries the
// LATER date — the exact shape where an ordering or timing artifact used to win.
export const fixtureF = {
  key: 'F',
  name: 'Ranking inversion',
  event: () => base({
    id: 'ds-f', type: 'Crab Feast', name: 'Feast', date: daysFromNow(5),
    guestCount: 30, guestEstimate: 30, totalBudget: 2000,
    venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
    timeline: [
      // Incidental, listed first, marginally sooner.
      { id: 'incidental', task: 'Print the parking signs', leadDays: -4, done: false },
      // Consequential, listed second, marginally later.
      { id: 'consequential', task: 'Pre-order the crabs', leadDays: -3, done: false },
    ],
  }),
  judgement: {
    eligible: 'both timeline tasks',
    gated: 'none',
    expectWinner: 'the consequential action, despite the later date and later array position',
    expectAsk: 'names the consequential act',
    expectExplanation: 'reflects the winning reason',
    expectRoute: 'aligned with the winner',
    unacceptable: ['array order deciding', 'a one-day timing edge outranking consequence', 'nondeterministic order across runs'],
  },
};

export const ALL_FIXTURES = [fixtureA, fixtureB, fixtureC, fixtureD, fixtureE, fixtureF];
