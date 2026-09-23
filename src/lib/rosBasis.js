// ─── WHOSE DAY IS THIS RUN-OF-SHOW WRITTEN FOR? ──────────────────────────────
//
// The Day tab's agenda is byte-identical for a host cooking in a rented house
// and a host in a hotel room block with a caterer dropping the food off.
// Measured on the Santa Fe 80th, with `food_style` answered BOTH ways: eleven
// rows, same text, same order, every one stamped `Host`.
//
//   Decorate, blow up balloons, set food + drinks stations · Host · 3h before
//   Chill drinks; build the drinks station + ice · Host · 2h before
//   Food out while everyone's still arriving · Host · 30m in
//   Leftovers to containers, favors out, deflate/clear decor · Host · 3h in
//
// WHAT THIS DELIBERATELY DOES NOT DO: rewrite the beats, or re-own them to a
// caterer. There is no signal in this corpus that says which beats a venue or a
// caterer performs — audited: schedule entries author exactly four fields
// (`when`, `what`, `whenChoice`, `copyByAnswer`) and `owner` is not among them;
// the 485 authored `owner` values all sit on `milestones`, which the run-of-show
// builder never consults; `difmCapable` is decision-scoped; `altToDIY` belongs
// to vendor categories. The `Host` on every row is a literal in the engine, not
// a discarded authored value.
//
// So re-owning "set food + drinks stations" to a caterer would mean DECIDING
// that a caterer sets it — and for `Order pizza/trays`, which resolves to the
// same `usesCaterer: true`, the host plainly still does. Splitting a mixed beat
// ("Decorate, blow up balloons, set food + drinks stations") between two owners
// is authoring a run-of-show nobody researched. That is the same line foodSpan.js
// draws when it refuses to multiply a one-gathering food plan by the day count:
// state the scope the thing actually has, and let the host see the gap.
//
// THE SEAM WHERE THE REAL FIX LANDS IS ALREADY OPEN. Beats support
// `copyByAnswer` (playbooks/index.js ~2014, via resolveAnsweredCopy) and
// `whenChoice` (~2003) — three playbooks already author conditional beats. A
// playbook author can therefore re-word its own food beats per `food_style`
// answer without any engine change. That is content work, per playbook, and it
// is not this module's to invent.
import { foodApproach } from './playbooks';
import { lodgingKitchen } from './lodgingIntel';

/**
 * Does the agenda's built-in assumption still hold for this event?
 *
 * Returns null when it does — the ordinary case, and nothing is shown. Otherwise
 * { reasons, text }, where `reasons` are stable ids ('catered' | 'no-kitchen')
 * so a surface can branch without matching prose.
 *
 * Both predicates are facts the app was TOLD, never inferred:
 *   catered     the host answered a food-style decision that resolves to
 *               usesCaterer — drop-off catering, ordered trays.
 *   no-kitchen  the host answered the lodging question with a hotel or room
 *               block on a destination event.
 * A `null` from either accessor means "not told", and says nothing.
 */
export function rosBasisNote(event) {
  const ev = event || {};
  const reasons = [];

  // ANSWERED PICKS ONLY — the authored DEFAULT never fires this. `foodApproach`
  // resolves to a playbook's default when the host has said nothing, and
  // Birthday defaults `food_style` to 'Order pizza/trays', which carries
  // usesCaterer: true. Reading it raw therefore told EVERY untouched birthday
  // that it was not cooking — caught by this module's own negative control, and
  // the same rule vendorPlan.js states for its destination stand-downs: a
  // default is the app's guess, not the host's answer, and this note exists
  // precisely to report what the host TOLD us.
  const catered = (() => {
    try {
      const fa = foodApproach(ev);
      if (fa.usesCaterer !== true || !fa.decisionId) return false;
      const picks = (ev.foodChoices && typeof ev.foodChoices === 'object') ? ev.foodChoices : {};
      return picks[fa.decisionId] != null && String(picks[fa.decisionId]).trim() !== '';
    } catch (_e) { return false; }
  })();
  if (catered) reasons.push('catered');

  const noKitchen = (() => {
    try { return ev.isDestination === true && lodgingKitchen(ev) === false; } catch (_e) { return false; }
  })();
  if (noKitchen) reasons.push('no-kitchen');

  if (!reasons.length) return null;

  // One sentence for what the agenda assumes, one for what the host told us, one
  // for what to do. No claim about WHICH lines move or who takes them — that is
  // exactly the knowledge this module does not have.
  const told = catered && noKitchen
    ? 'you are not cooking and there is no kitchen where everyone is staying'
    : catered
      ? 'the food is being brought in rather than cooked'
      : 'there is no kitchen where everyone is staying';

  return {
    reasons,
    catered,
    noKitchen,
    text: `These times are the playbook's standard run, written for a host cooking and setting up in their own space. You have told us ${told}, so the prep and cleanup lines may not be yours to run. The order still holds — change any line that does not fit your day.`,
  };
}
