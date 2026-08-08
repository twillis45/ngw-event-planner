// ─── ONE TABLE FOR RISK SEVERITY (2026-08-08, review board) ─────────────────
//
// The board found two defects that were really one: the authored vocabulary and
// the rendered vocabulary had drifted apart, and nothing held them together.
//
// CENSUS OF WHAT IS ACTUALLY AUTHORED in playbooks/data/*.js:
//
//     med       261      <- the LARGEST class
//     high      240
//     low        75
//     medium     18
//     critical    4
//
// The renderer's lookup was `{ high, medium, low }[r.severity] || 'Worth a look'`,
// duplicated verbatim at two call sites. So:
//
//   · 261 `med` risks missed the map and fell to the fallback string. The label
//     "Keep an eye on it" was unreachable for 93% of mid-severity risks — dead
//     code that nobody could see was dead, because the fallback looked like a
//     real answer.
//   · The 4 `critical` risks ALSO missed, so they rendered as the same vague
//     "Worth a look", and the colour ternary (`high ? danger : low ? muted :
//     warn`) painted them AMBER — quieter than `high`. The severity inversion is
//     the actual harm: the most serious rows the product can author are
//     `holidayParty.r_saferides` ("An impaired guest is about to drive home",
//     written with social-host liability language), `holidayParty.r_overserve`,
//     and `dinnerParty.r_dietary`.
//
// A fallback that renders a plausible label is worse than one that renders
// nothing, because it cannot be seen to be wrong. `riskSeverityLabel` therefore
// has NO string fallback — an unknown value normalizes to `medium` and is
// reported by `isKnownRiskSeverity`, which the gate test asserts over the whole
// authored corpus. If someone authors `severity: 'urgent'` tomorrow, a test
// fails; the host never sees a guess.
//
// WHY NOT A FIFTH COLOUR. UX_02 caps a viewport at 3 semantic colours and names
// the vocabulary outright: "No other semantic colors... accent, warn, crit,
// safe, muted." Red is already the band UX_02:25 assigns to "at risk, blocking,
// critical issue". So `critical` and `high` share --danger; they are separated
// by LABEL and by ORDER, not by inventing a colour the system does not have.
// Critical sorts first and says what is at stake; that is the fix. Adding a
// fifth hue would break the budget to solve a problem ranking already solves.

/** Canonical order. Lower sorts first. `med` and `medium` are the same tier. */
export const RISK_RANK = { critical: 0, high: 1, med: 2, medium: 2, low: 3 };

/** The four tiers that actually render. `med` collapses into `medium`. */
const CANON = { critical: 'critical', high: 'high', med: 'medium', medium: 'medium', low: 'low' };

/** True when the authored value is one this module knows. Gated by test. */
export function isKnownRiskSeverity(sev) {
  return Object.prototype.hasOwnProperty.call(CANON, String(sev || '').toLowerCase());
}

/** Authored value -> one of critical | high | medium | low. Never throws. */
export function normalizeRiskSeverity(sev) {
  return CANON[String(sev || '').toLowerCase()] || 'medium';
}

export function riskRank(sev) {
  const k = String(sev || '').toLowerCase();
  return Object.prototype.hasOwnProperty.call(RISK_RANK, k) ? RISK_RANK[k] : RISK_RANK.medium;
}

// ── THE LABELS ──────────────────────────────────────────────────────────────
// UX_06 asks for consequence over status and for a lead-coordinator voice, not
// a worried intern — so `critical` does not shout. It states the stake and the
// act, which is what separates it from `high` ("worth planning now" is about
// TIMING; "someone could get hurt" is about CONSEQUENCE). Each label starts
// with a different word so they separate at chip distance, which the old set
// failed: three of four began with "Worth".
const LABEL = {
  critical: 'Safety — plan this first',
  high: 'Worth planning now',
  medium: 'Keep an eye on it',
  low: 'Minor',
};

export function riskSeverityLabel(sev) {
  return LABEL[normalizeRiskSeverity(sev)];
}

// ── THE TONE ────────────────────────────────────────────────────────────────
// Token PAIRS, never literals — styles.css owns the values and the contrast
// note at :2456 ("--warn on --warn-tint over --card: 6.38:1, AA-clean") is a
// measurement of those tokens, not of a hex someone inlined here.
const TONE = {
  critical: { color: 'var(--danger)', background: 'var(--danger-tint)' },
  high: { color: 'var(--danger)', background: 'var(--danger-tint)' },
  medium: { color: 'var(--warn)', background: 'var(--warn-tint)' },
  low: { color: 'var(--muted)', background: 'var(--line-soft)' },
};

export function riskSeverityTone(sev) {
  return TONE[normalizeRiskSeverity(sev)];
}

/**
 * Does this severity deserve to interrupt the host on the command board?
 *
 * The 2026-07-14 ruling stands and is NOT what was broken: a static authored
 * contingency is not an emergency, so `medium` and `low` still never raise, and
 * the raised ACTION keeps `severity:'attention'` so a brand-new outdoor event
 * does not open with "Have a plan for: rain" as its number one.
 *
 * What was broken is that the filter said `=== 'high'` — a string equality
 * against one literal — while the comment above it said "only high severity
 * raises", meaning high AND ABOVE. `critical` is above `high` and silently
 * failed the test, so the four most serious authored risks in the product were
 * the ones guaranteed never to reach the board. Comparing RANK says what was
 * meant and cannot be defeated by adding a tier.
 */
export function raisesToCommandBoard(sev) {
  return riskRank(sev) <= RISK_RANK.high;
}
