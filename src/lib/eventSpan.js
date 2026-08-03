// ─── Span intelligence — one day, or several? ────────────────────────────────
//
// ONE place answers "how long does this event run". Before this, the answer was
// scattered and mostly absent: `endDate` was written only when the host happened to
// phrase it that way at intake ("weekend of", "3-day", "2 nights"), a single
// hardcoded `ev.type === 'Reunion'` branch in itinerary.js was the only code that
// ever PROPOSED a multi-day shape, and nothing anywhere noticed that a destination
// event people fly to is not a one-afternoon party. A host who said "destination
// 80th birthday in Santa Fe" got a single-day plan and was never asked.
//
// WHAT THIS IS NOT: it does not invent a span. It never writes `endDate`, never
// guesses how many days, and never turns a signal into a fact. When the signals say
// "this is probably multi-day" and the host has not said, the answer is `unasked`
// — which is a prompt to ASK, not a licence to assume. Same propose-don't-invent
// rule as the type, count and date pickers.
//
// THE SIGNALS ARE ALL PRE-EXISTING TRUTH, none of it new or synthesised:
//   · endDate            — the host said it outright
//   · taxonomy multiDay  — types that are multi-day BY DEFINITION (eventTaxonomy)
//   · isDestination      — heard at intake, never inferred from a city alone
//   · guestsStayOvernight— a real host answer; absent means "not told", not false
//   · travelMode 'fly'   — nobody flies in for an afternoon and out again

import { spanNights, spanEnd } from './dates';
import { EVENT_TAXONOMY, resolveCanonicalType } from './eventTaxonomy.mjs';

/** Types the taxonomy already marks as multi-day by definition. */
export function typeIsMultiDay(type) {
  const c = resolveCanonicalType(type);
  return !!(c && EVENT_TAXONOMY[c] && EVENT_TAXONOMY[c].multiDay);
}

/**
 * spanIntel(event) -> what the system knows about this event's length.
 *
 *   state   'multi'   the host gave a span, or the type is multi-day by definition
 *           'single'  nothing suggests otherwise — treat as one day
 *           'unasked' signals point to multi-day and the host has NOT said
 *   days    real day count when a span is known; null otherwise (never a guess)
 *   shouldAsk  true only in 'unasked' — the one state that owes the host a question
 *   signals  the real reasons, so the surface can say WHY rather than assert
 */
export function spanIntel(event) {
  const ev = event || {};
  const nights = spanNights(ev);

  // 1 · The host said it. Nothing outranks that.
  if (ev.date && spanEnd(ev) && nights > 0) {
    return {
      state: 'multi',
      days: nights + 1,
      nights,
      basis: 'host-span',
      shouldAsk: false,
      signals: ['the dates you gave'],
      why: `You said this runs ${nights + 1} days.`,
    };
  }

  // 2 · Collect the signals that suggest more than one day. Each is a real stored
  //     answer — absent means "not told", which is never read as a no.
  const signals = [];
  if (typeIsMultiDay(ev.type)) signals.push(`a ${resolveCanonicalType(ev.type) || ev.type} usually runs more than one day`);
  if (ev.isDestination === true) signals.push('it is a destination event');
  if (ev.guestsStayOvernight === true) signals.push('guests are staying overnight');
  if (String(ev.travelMode || '') === 'fly') signals.push('guests are flying in');

  // A type that is multi-day BY DEFINITION is not a hint, it is the shape of the
  // thing — a Conference is not a one-afternoon event. Still no invented endDate:
  // the state says multi, `days` stays null because nobody has said how many.
  if (typeIsMultiDay(ev.type)) {
    return {
      state: 'multi',
      days: null,
      nights: 0,
      basis: 'type',
      shouldAsk: true, // we know it spans; we still do not know how long
      signals,
      why: `${signals[0]} — set the last day and the plan will cover all of it.`,
    };
  }

  if (signals.length) {
    return {
      state: 'unasked',
      days: null,
      nights: 0,
      basis: 'signals',
      shouldAsk: true,
      signals,
      why: `Does this run more than one day? ${capitalise(joinSignals(signals))}.`,
    };
  }

  // 3 · Nothing says otherwise. Honest label: assumed, not established.
  return {
    state: 'single',
    days: 1,
    nights: 0,
    basis: ev.date ? 'assumed-single' : 'unknown',
    shouldAsk: false,
    signals: [],
    why: 'Nothing so far suggests this runs more than one day.',
  };
}

const joinSignals = (list) =>
  list.length === 1 ? list[0]
    : list.length === 2 ? `${list[0]} and ${list[1]}`
      : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;

const capitalise = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Should the surface ask the host to confirm the length?
 * True only when there is something real to ask ABOUT — never a blank prompt.
 */
export function shouldAskSpan(event) {
  const s = spanIntel(event);
  return s.shouldAsk === true;
}
