// ─── WHO ANSWERED THIS DECISION — the app, or the host? ──────────────────────
//
// THE DEFECT THIS EXISTS FOR (difmCapable audit, 2026-09-18). A decision the
// host picked and a decision the APP proposed and the host tapped "Sounds good"
// on were byte-identical afterwards: the same string, in the same
// `event.foodChoices[id]`, written by the same `settleDecision`, confirmed with
// the same toast. Nothing recorded which had happened. Downstream, the settled
// card printed `Your call: "…"` over both — so the app could stamp its own pick
// as the host's.
//
// That is the same shape as the start-time bug fixed earlier the same day
// (a date tap writing `startTimeSource: 'host'` onto an hour the app derived,
// which released it to guests and vendors). This is that bug across the ~130
// decisions `difmCapable: 'can-derive'` proposes on.
//
// AND THE HARDER HALF: `choicePickFor` falls back to a decision's authored
// `default` whenever the host has not answered, so the plan is ALREADY running
// on a value nobody chose — pricing the budget, filling the shopping list —
// before anyone taps anything. Measured in the same audit: 119 of 131
// `needs-host` rows carry a default and run on it while telling the host "This
// one's your call to make." Naming that state is half of what this module does.
//
// THE PRECEDENT IT FOLLOWS. travelPlan.js's `transportDecision()` already
// returns `{ providing, source, pick }` and refuses to fall back to a default,
// precisely because its answer feeds a guest-facing email. This generalises that
// discipline instead of re-inventing it per surface.
//
// PURE: no I/O, no clock, no storage. It reads the event and returns a verdict.
// Surfaces read THIS — they do not re-derive it from the raw maps. Six private
// copies of "is the venue set?" earlier the same day are why that sentence is
// here rather than assumed.

import { isMultiDecision, answerList } from './decisionType';

/** How a settled value came to be. Absent means: never settled by anyone. */
export const CHOICE_SOURCES = Object.freeze(['host', 'accepted']);

/** Where the provenance map lives on the event, mirroring `foodChoices`. */
export const CHOICE_SOURCE_FIELD = 'choiceSource';

const picksOf = (ev) => ((ev && ev.foodChoices) || {});
const sourcesOf = (ev) => ((ev && ev[CHOICE_SOURCE_FIELD]) || {});

/**
 * THE ONE WRITE BUILDER. Every settle goes through this, so a value can never be
 * stored without its provenance — the two maps cannot drift, because no caller
 * is able to write one of them alone.
 *
 * @param event   the current event (read for the maps to merge into)
 * @param id      decision id
 * @param value   the option string being settled
 * @param source  'host' (they picked it) | 'accepted' (they took OUR proposal)
 */
export function settleChoicePatch(event, id, value, source, decision) {
  const src = CHOICE_SOURCES.includes(source) ? source : 'host';
  const picks = picksOf(event);
  // ── A MULTI DECISION ACCUMULATES; IT DOES NOT REPLACE (2026-09-18) ────────
  // This builder replaced unconditionally, which is right for a pick-one and
  // was silently destructive for the dietary lists. MEASURED: pick "Vegetarian",
  // then pick "Nut allergy", and the vegetarian is gone — on a decision offering
  // TEN independent restrictions that describe DIFFERENT GUESTS. For allergens
  // that is a safety defect, not a preference.
  //
  // `decision` is optional and the behaviour is unchanged without it, so every
  // existing two-and-three-argument caller keeps today's semantics exactly. Only
  // a caller that hands over the decision — and only when that decision types as
  // multi — gets the accumulating path.
  //
  // Toggling, not just adding: the same tap that records a need has to be able
  // to take it back, or the host can never correct a mis-tap.
  //
  // AN EMPTIED LIST STORES AS '', NEVER []. `[]` is TRUTHY in JavaScript, and
  // this value is read at ~80 sites across the tree — `if (foodChoices[id])`,
  // `filter(c => !choices[c.id])`, `Object.keys(...).length`. A host who
  // toggled their only restriction back OFF would have read as ANSWERED at
  // every one of them: the same class of defect this change exists to fix,
  // pointed the other way. The empty string is falsy everywhere and
  // `answerList('')` is `[]`, so both readerships agree on "nothing recorded".
  const nextValue = (() => {
    if (!decision || !isMultiDecision(decision)) return value;
    const have = answerList(picks[id]);
    const v = String(value == null ? '' : value).trim();
    const next = !v ? have : (have.includes(v) ? have.filter((x) => x !== v) : [...have, v]);
    return next.length ? next : '';
  })();
  return {
    foodChoices: { ...picks, [id]: nextValue },
    [CHOICE_SOURCE_FIELD]: { ...sourcesOf(event), [id]: src },
  };
}

/**
 * What can honestly be said about one decision's answer.
 *
 *   settled          someone actually answered — the host, or the host accepting ours
 *   source           'host' | 'accepted' | null
 *   isHostChoice     THEY chose the value. Only this earns "Your call".
 *   isAppPick        the value was ours; they agreed to it. Ours to own, not theirs.
 *   runningOnDefault nobody answered, and the plan is using the authored default
 *                    anyway. The honest name for the silent state.
 *   attributable     safe to attribute to the host in copy at all.
 *
 * `decision` is optional; pass it to learn `runningOnDefault`, which needs the
 * authored default to be knowable.
 */
export function choiceStateFor(event, decision, id) {
  const key = id || (decision && decision.id) || '';
  const picks = picksOf(event);
  const raw = key ? picks[key] : undefined;
  const value = (raw == null || raw === '') ? null : raw;
  const stored = key ? sourcesOf(event)[key] : undefined;
  const source = CHOICE_SOURCES.includes(stored) ? stored : null;

  // A value with NO recorded source is not assumed to be the host's. It may be
  // one written before this module existed, or by the frozen CRA shell which
  // does not carry provenance. Unknown is its own answer, and claiming
  // authorship on a guess is the whole defect this module was built for.
  const settled = value != null;
  const authoredDefault = decision && decision.default != null && decision.default !== ''
    ? decision.default : null;

  return {
    value,
    settled,
    source,
    isHostChoice: settled && source === 'host',
    isAppPick: settled && source === 'accepted',
    // Nobody answered, yet the engine hands the authored default to every
    // consumer downstream. The plan IS running on it.
    runningOnDefault: !settled && authoredDefault != null,
    defaultValue: authoredDefault,
    // Only a recorded host pick may be spoken of as theirs.
    attributable: settled && source === 'host',
  };
}

/**
 * The line a surface may put under a settled decision, given who answered.
 * Centralised so the attribution cannot fork per card — `Your call:` was
 * printed over app picks precisely because each surface wrote its own.
 * Returns null when there is nothing honest to say.
 */
export function choiceAttribution(state) {
  if (!state || !state.settled) return null;
  if (state.isHostChoice) return 'Your call';
  if (state.isAppPick) return 'Our pick, accepted by you';
  // Settled, source unknown — say nothing rather than guess whose it was.
  return null;
}
