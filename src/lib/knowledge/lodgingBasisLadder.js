// ─── ONE QUESTION, FOUR ANSWERS, RANKED BY WHAT WE ACTUALLY KNOW ───────────
//
// "What will the rooms cost?" now has more than one possible source, and the
// worst thing this code could do is let the weakest one wear the strongest
// one's authority. So there is a ladder, every rung says what it is, and the
// bottom rung is `null`.
//
//   1. picked      the host chose a place and the page showed a price
//   2. cheapest    a shortlist exists; the least expensive one on it
//   3. listings    no shortlist — Inside Airbnb's asking band for a whole
//                  place that sleeps the party, in one of 34 regions
//   4. federal     no shortlist and no listings — GSA's per-night CAP for
//                  the locality, which is a reimbursement ceiling per ROOM
//   —  null        none of the above. Not a zero, not a guess.
//
// Rungs 1 and 2 are the host's OWN evidence and are delegated unchanged to
// lodgingFloor.js, whose refusal ("no listing, no number — null, not a
// guess") is left exactly as it is. This file never overrides it; it only
// answers when it has already declined.
//
// ── THE UNITS DO NOT MATCH, AND THAT IS STATED, NOT RECONCILED ────────────
//
// Rung 3 prices a WHOLE PLACE. Rung 4 caps ONE ROOM. They are not
// convertible into each other, because a party does not divide into rooms by
// arithmetic — lodgingIntel refuses that exact guess (2026-08-03: "we do not
// know the room count and will not guess one… couples, children, singles"),
// and multiplying a room cap by a guessed room count here would be the same
// invention wearing a federal citation.
//
// So every rung carries `unit` and `perNight`, and a caller that wants a
// stay total must multiply by nights ITSELF, knowing which unit it has. No
// rung is ever silently converted to another rung's shape.
//
// PURE: no I/O, no UI, no storage.
import { lodgingFloorFor } from '../lodgingFloor';
import { venueFor } from '../venueFor';
import { lodgingCapFor } from './lodgingRateIndex';
import { airbnbNightlyFor } from './airbnbNightlyIndex';
import { priceStateFor } from './geoCostIndex';

// ── THE VENUE IS READ THROUGH venueFor, NOT OFF THE EVENT ─────────────────
// The first cut of this file read `event.venueCity` and `event.state`  venue-exempt: names the bad read, does not perform one
// directly and hand-rolled a ", XX" split. `venueSourceProof.test.js` caught
// it — that ratchet exists because raw venue reads are how two surfaces come
// to disagree about the same event, and it counts them per file so they can
// only ever shrink.
//
// It is also the exact bug this repo fixed THIS MORNING at the other end:
// the price-factor effect parsed a state out of a trailing ", XX" on the
// city while venueFor had already split that pattern into city + state
// before any reader saw it, so the regex matched almost nothing a real event
// carries. Writing the same hand-roll here would have reintroduced it.
// See knowledge/__tests__/theNudgeAsksForAFieldWeRead.test.js.

const guestsOf = (event) => {
  const e = event || {};
  const n = Number(e.guestCount != null ? e.guestCount : (e.guests && e.guests.length));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * The best lodging basis available for an event.
 *
 * @returns {{
 *   rung: 'picked'|'cheapest'|'listings'|'federal',
 *   unit: 'stay'|'place-night'|'room-night',
 *   low: number, high: number,
 *   perNight: boolean,
 *   source: string,
 *   basis: string,
 *   name?: string,
 * } | null}
 */
export function lodgingBasisFor(event) {
  const ev = event || {};
  const guests = guestsOf(ev);

  // ── 1 & 2 — the host's own evidence always wins ─────────────────────────
  // A real price on a real place the host is looking at outranks any
  // published average, even a fresher one.
  const floor = (() => {
    try { return lodgingFloorFor(ev, guests); } catch (_) { return null; }
  })();
  if (floor && floor.total > 0) {
    return {
      rung: floor.basis,                 // 'picked' | 'cheapest'
      unit: 'stay',
      low: floor.total,
      high: floor.total,
      perNight: false,
      source: 'your shortlist',
      name: floor.name || undefined,
      basis: floor.basis === 'picked'
        ? `${floor.name || 'The place you chose'} showed ${floor.total} for the stay.`
        : `The least expensive place on your shortlist showed ${floor.total} for the stay.`,
    };
  }

  const v = (() => { try { return venueFor(ev) || {}; } catch (_) { return {}; } })();
  const city = String(v.city || '').trim();
  const state = priceStateFor(v, ev.profile || null);
  if (!state) return null;

  // ── 3 — real listings, when the region is one of the 34 ────────────────
  // Preferred over the federal cap because it prices the thing a group
  // actually rents, at the size they actually need.
  if (guests) {
    const bnb = airbnbNightlyFor(city, state, guests);
    if (bnb) {
      return {
        rung: 'listings',
        unit: 'place-night',
        low: bnb.low,
        high: bnb.high,
        perNight: true,
        source: 'Inside Airbnb',
        basis: bnb.basis,
      };
    }
  }

  // ── 4 — the federal cap, which is a ceiling on ONE ROOM ────────────────
  const cap = lodgingCapFor(city, state, ev.date);
  if (cap) {
    return {
      rung: 'federal',
      unit: 'room-night',
      low: cap.capPerNight,
      high: cap.capPerNight,
      perNight: true,
      source: 'GSA per diem',
      basis: cap.basis,
    };
  }

  return null;
}

/**
 * Whether a basis is strong enough to put a number in front of a host
 * without a hedge. Rungs 1 and 2 are the host's own evidence; 3 and 4 are
 * published averages and ceilings, and must always be shown with their
 * qualifier.
 */
export function isOwnEvidence(basis) {
  return !!basis && (basis.rung === 'picked' || basis.rung === 'cheapest');
}

// ─── WHAT MAY BE COMPARED AGAINST A BUDGET — AND IT IS NOT MOST OF THIS ────
//
// The 2026-09-27 lodging board's first finding, from the Next Maintainer
// seat: rung 4 is a cap PER ROOM, the budget flag compares a WHOLE-EVENT
// total, and nothing stopped the two meeting. "We remembered not to" is not a
// guard. This is the guard.
//
// It refuses on TWO independent grounds, and either alone is enough:
//
//   UNITS. A room-night cannot become a stay total without a room count, and
//   lodgingIntel refuses to guess one (2026-08-03: "we do not know the room
//   count and will not guess one... couples, children, singles"). Multiplying
//   a federal per-room ceiling by an invented room count would be that same
//   invention wearing a GSA citation.
//
//   STANDING. The board ruled unanimously that a regional ASKING band must
//   not fire "the stay alone exceeds your whole budget". Inside Airbnb asking
//   data systematically overstates — vacancy, discounts and negotiated stays
//   are invisible in it — and in many destination celebrations the guests
//   book and pay their own rooms, so the warning may be aimed at a wallet
//   that is not the host's. Shortlisting is an act of intent about money the
//   host expects to spend. A regional average is not.
//
// So only the host's own evidence converts, and everything else returns null
// BY CONSTRUCTION rather than by a caller's good manners.
//
// This is deliberately NOT the reader the ladder still needs. Rungs 3 and 4
// belong on the lodging surface, shown with their units in context, which is
// finding #2 and is not built. If that is never built, the honest move is to
// delete the rungs rather than keep them as capability-shaped scenery.
export function budgetComparableTotal(basis, nights = 0) {
  if (!basis) return null;
  // The only unit that is already a stay, and it only ever comes from rungs
  // 1 and 2. Checked BOTH ways: a future rung that claimed 'stay' without
  // being the host's own evidence would still be refused here.
  if (basis.unit !== 'stay' || !isOwnEvidence(basis)) return null;
  const n = Number(basis.low);
  if (!Number.isFinite(n) || n <= 0) return null;
  // `nights` is accepted and deliberately unused for this unit: a stay total
  // already spans the stay. Taking the argument keeps the signature honest
  // for a caller holding a per-night basis, who will get null and should.
  return Math.round(n);
}
