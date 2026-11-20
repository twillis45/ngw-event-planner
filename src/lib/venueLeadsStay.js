// ─── THE VENUE LEADS THE STAY (owner ruling, 11/20/2026: "Approve") ──────────
//
// "On a destination or trip event whose venue is not picked yet, the venue
// leads the board. Then 'How are guests staying?' leads, even when that
// decision is past its window."
//
// Why: the owner ruled on 11/16 that the venue and where everyone stays go
// together. The stay screen searches near the venue, and rooms far from the
// party are the costly mistake. While the venue is open the stay runs on the
// plan's own pick ("Guests book on their own"), so it still shows — second,
// with its "past its window" note — and once the venue is set it leads as
// before.
//
// Found by hostv2/e2e/handlingTheVenueMyself.spec.mjs: at 209 days out the
// `dest_lodging` decision passes its T-210d window and outranked "Pick the
// place in Santa Fe."
//
// SECOND RULING, SAME DAY ("Venue leads both", 11/20/2026). The first draft
// moved only the stay below the venue, which left "How many guests are
// traveling in?" (the same T-210d window) leading the board at 209 days out.
// The owner ruled the venue goes to the TOP of the queue — ahead of the stay,
// the travel mix, and any other past-window decision. So:
//   * the venue moves to position one; everything else keeps its order, so the
//     stay and the travel mix still show beneath it with their window notes;
//   * a parked venue ("I'll sort this") or a set venue: no change;
//   * not a destination or trip: no change;
//   * the undated case is untouched: the shell applies the date-first rule
//     ("Add the day.") after this one.
//
// Pure: takes the ranked queue, returns a new array. The board's hero and the
// "Then, in order" list both read the one queue it is applied to.
import { VENUE_BLOCKER, venueParked } from './venuePark';
import { venueFor } from './venueFor';
import { passVerdictAtCreation } from './passGate';

// "Destination or trip" — the same facts the pass gate's door 2 reads:
// `isDestination` (heard at intake) or a real multi-day span. Read live here,
// not from the stored stamp, because the stamp exists only on host-created
// events and answers a billing question, not an ordering one.
function isDestinationOrTrip(event) {
  try { return passVerdictAtCreation(event).passRequired === true; } catch { return false; }
}

export function venueLeadsStayApplies(event) {
  if (!event || !isDestinationOrTrip(event)) return false;
  if (venueParked(event)) return false;
  try { return venueFor(event).isSet !== true; } catch { return false; }
}

export function venueLeadsStay(queue, event) {
  if (!Array.isArray(queue) || !venueLeadsStayApplies(event)) return queue;
  const iv = queue.findIndex((a) => a && a.blockerType === VENUE_BLOCKER);
  if (iv <= 0) return queue;
  return [queue[iv], ...queue.slice(0, iv), ...queue.slice(iv + 1)];
}
