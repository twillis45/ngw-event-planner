// ─── ONE STORE FOR THE KIDS COUNT (owner, 11/21/2026) ────────────────────────
//
// `kidsCount` had two writers: the "How many are kids?" stepper, and every
// guest-list write, which replaced it with the roster's own kids total. So the
// host who set 8 kids and then added her first named guest had 0 kids — the
// list's total, from a list of one.
//
// The roster speaks for the kids only once it speaks for the party: while it is
// shorter than her planned count, the stepper's number stands unless the list
// itself already holds more. PURE.
import { guestCountFor } from './guestCountFor';

const kidsOf = (gs) => (gs || []).reduce((t, g) => t + (Number(g && g.kids) || 0), 0);
const people = (gs) => (gs || []).reduce((t, g) => t + 1 + (g && g.plusOne ? 1 : 0) + (Number(g && g.kids) || 0), 0);

export function kidsCountAfterRoster(event, guests) {
  const listed = kidsOf(guests);
  const planned = Number(guestCountFor(event).count) || 0;
  const stepper = Math.max(0, Math.round(Number(event && event.kidsCount) || 0));
  const short = planned > 0 && people(guests) < planned;
  return short ? Math.max(stepper, listed) : listed;
}
