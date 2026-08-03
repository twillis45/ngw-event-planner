// ─── DOES THE FOOD PLAN COVER THE SPAN? ────────────────────────────────────
//
// One place answers it, because the honest answer is "no" and every surface
// that prints a food plan needs to say so in the same words.
//
// The finding (lodging→food audit, 2026-08-03, reproduced live on the Santa Fe
// 80th — 10 guests, Jun 17–21): the plan produces "4 items for 10 guests" for a
// FIVE-DAY trip. That figure sizes one gathering. A five-day whole-home rental
// is roughly fifteen meals; a five-day resort stay is close to zero host-cooked
// meals. The plan models neither, and printed its one-event number as if it
// covered the trip.
//
// WHAT THIS DELIBERATELY DOES NOT DO: multiply anything by the day count.
// Scaling "4 items" to "20 items" would invent a plan nobody researched — the
// published corpus contains ZERO entries on lodging, kitchens or multi-day
// meal structure (measured: 16 KCRs, all `provenance` on purchase lines). The
// honest move while that knowledge does not exist is to state the scope the
// number actually has, and let the host see the gap. When the research lands,
// this is the seam it lands in.
import { spanNights } from './dates';
import { lodgingKitchen } from './lodgingIntel';

/**
 * The scope disclosure for a food plan, or null when the plan genuinely covers
 * the event (a single-day gathering).
 *
 * Returns { days, nights, kitchen, text, listApplies }:
 *   kitchen      true | false | null  — three-valued, null means NOT TOLD
 *   listApplies  false only when we KNOW there is no kitchen; null when untold
 */
export function foodSpanNote(event) {
  const ev = event || {};
  const nights = spanNights(ev) || 0;
  if (nights < 1) return null;

  const days = nights + 1;
  const kitchen = lodgingKitchen(ev);

  // A room block IS a hotel, and a hotel stay is fed by restaurants and room
  // service — a grocery list is not the artifact for it. We only say this when
  // we KNOW (kitchen === false), never on the untold case.
  if (kitchen === false) {
    return {
      days, nights, kitchen, listApplies: false,
      text: `Sized for the main gathering. Across ${days} days most meals are eaten out — a shopping list is not the plan for a hotel stay.`,
    };
  }

  if (kitchen === true) {
    return {
      days, nights, kitchen, listApplies: true,
      text: `Sized for the main gathering, not all ${days} days. The rental has a kitchen, so the other meals are still yours to plan.`,
    };
  }

  // NOT TOLD. Say what is true about the number, and name the open question
  // rather than assuming a hotel or a rental.
  return {
    days, nights, kitchen: null, listApplies: null,
    text: `Sized for the main gathering, not all ${days} days. Where everyone stays decides the rest.`,
  };
}

/** Convenience for surfaces that only need the sentence. */
export function foodSpanText(event) {
  const n = foodSpanNote(event);
  return n ? n.text : null;
}
