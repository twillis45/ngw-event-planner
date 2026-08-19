// ─── Model D paywall engine ──────────────────────────────────────────────────
//
// Ruled 2026-08-18 (three board sittings) + amended 2026-08-19 (fourth sitting):
// docs/audits/2026-08-18_COMMERCE_AND_NOTIFICATIONS_RULING.md and the
// competitive read docs/audits/2026-08-19_MODEL_D_VS_LEADERS.md.
//
// FREE, forever: the host's first LOCAL, single-day event — full planning,
// every vendor tracked, plus ONE complete vendor-brief loop.
// THE $39 ONE-EVENT PASS (one price, one SKU, three doors): sharing briefs
// beyond the first vendor · a destination/multi-day event · any event after
// the first. Whichever door fired, one pass unlocks that whole event.
//
// LOAD-BEARING MECHANICS, each from a named ruling clause:
//  · GRANDFATHER — the door-2/door-3 verdict is stamped ONCE, at event
//    creation (`passVerdictAtCreation`), and stored on the event. Nothing here
//    ever recomputes it from live fields: an event that began free stays free,
//    including a host who later marks it destination or adds a span mid-plan.
//    We eat that edge case for trust, by ruling.
//  · NEVER MID-CONVERSATION — `briefAllowed` returns allowed for any vendor
//    already in `briefSharedVendorIds`, unconditionally. A brief that has been
//    shared is an open conversation; viewing/updating/confirming it is never
//    gated. Only GENERATING a brief for a new vendor is.
//  · INWARD PLANNING IS NEVER GATED — no function in this module gates
//    budgets, guests, timelines, or reading anything. The pass gates the two
//    outward/premium capabilities only: new-vendor briefs and the
//    destination/multi-day toolkit. (Research: the category punishes gating
//    the product itself — Punchbowl — and rewards a free tier that genuinely
//    works: Evite, Paperless Post, Figma's view-free/edit-paid split.)
//  · DORMANT UNTIL BILLING IS LIVE — every gate answers "allowed" while
//    `isBillingLive()` is false. D-2's five preconditions govern flipping it;
//    the flag is the same double-gate the pass sheet has always used
//    (backend configured AND REACT_APP_BILLING_LIVE === '1').
//
// The fourth sitting's standing commitments live in copy, not code, but are
// restated here because this file is where a future revenue conversation will
// land first: (1) no vendor-side fees while the no-vendor-fees sentence ships
// on the pass sheet; (2) any future hotel-block/booking layer ships
// free-with-commission, OUTSIDE the pass. Board sitting required to unwind
// either, copy first.
import { spanIntel } from './eventSpan';

// Reads env at CALL time, not import time — stripeApi captures its BASE const
// on import, which is fine for the app but untestable and one restart stale.
// Same semantics as the pass sheet's own double-gate: isStripeApiConfigured()
// (a truthy API base) AND the explicit billing switch.
export function isBillingLive() {
  try { return Boolean(process.env.REACT_APP_API_BASE_URL) && process.env.REACT_APP_BILLING_LIVE === '1'; } catch { return false; }
}

// User-created events only. Samples (`ev-x-*`, `demo-*`, pool ids) are
// exploration, not the host's free first event — they neither consume the
// free tier nor get gated.
export function isUserCreatedEvent(ev) {
  const id = String((ev && ev.id) || '');
  return id.startsWith('cust-') || id.startsWith('ev-copy-');
}

/**
 * The ONE stamping moment (grandfather rule). Called exactly when an event is
 * created, with the list of events that existed before it. Returns the fields
 * to store on the event: { passRequired, passReasons }.
 *
 * Door 2 (destination/multi-day) reads the same authored facts the travel
 * stack gates on — `isDestination` (heard at intake, never inferred) and
 * `spanIntel()` (host-declared span or taxonomy-definitional; never a guess).
 * Door 3 counts prior USER-CREATED events only.
 */
export function passVerdictAtCreation(ev, priorEvents) {
  const reasons = [];
  if (ev && ev.isDestination === true) reasons.push('destination');
  let span = null;
  try { span = spanIntel(ev); } catch { span = null; }
  if (span && span.state === 'multi') reasons.push('multi-day');
  if ((priorEvents || []).filter(isUserCreatedEvent).length > 0) reasons.push('additional-event');
  return { passRequired: reasons.length > 0, passReasons: reasons };
}

/**
 * May the host GENERATE a vendor brief for `vendorId` on this event, right
 * now? Returns { allowed, reason }. Reasons when blocked name the door, so
 * the shell's copy can be honest about WHY.
 *
 * Order matters and is the ruling's order:
 *   billing dormant → allowed (gate off)
 *   pass purchased → allowed (the pass unlocks the whole event)
 *   vendor already briefed → allowed, ALWAYS (never mid-conversation)
 *   event stamped pass-required (door 2/3) → blocked
 *   a different vendor already briefed (door 1) → blocked
 *   else → the free first-brief loop
 */
export function briefAllowed(ev, vendorId) {
  if (!isBillingLive()) return { allowed: true, reason: 'billing-dormant' };
  if (!ev) return { allowed: true, reason: 'no-event' };
  if (ev.passPurchased === true) return { allowed: true, reason: 'pass' };
  const shared = Array.isArray(ev.briefSharedVendorIds) ? ev.briefSharedVendorIds.filter(Boolean) : [];
  if (vendorId && shared.includes(vendorId)) return { allowed: true, reason: 'already-shared' };
  if (ev.passRequired === true) return { allowed: false, reason: 'pass-required' };
  if (shared.length >= 1) return { allowed: false, reason: 'second-vendor' };
  return { allowed: true, reason: 'first-brief-free' };
}

/**
 * Is the destination/multi-day toolkit (lodging, group air/ground, multi-day
 * program) locked behind the pass for this event? Reads ONLY the stamped
 * verdict — a grandfathered event that turned destination mid-plan stays
 * unlocked, by ruling. Locked surfaces render TEASED with honest copy (the
 * visibility rule), never hidden.
 */
export function destinationLocked(ev) {
  if (!isBillingLive()) return false;
  if (!ev || ev.passPurchased === true) return false;
  const reasons = Array.isArray(ev.passReasons) ? ev.passReasons : [];
  return ev.passRequired === true && (reasons.includes('destination') || reasons.includes('multi-day'));
}

/**
 * The blunt creation-time disclosure (Grandmother's rider, fourth sitting:
 * the pass sheet SELLS; this line INFORMS — it names the concrete boundary
 * and never softens). Returns null while billing is dormant: no boundary
 * exists yet, and claiming one would be invented urgency.
 */
export function creationDisclosure(verdict) {
  if (!isBillingLive()) return null;
  if (!verdict || !verdict.passRequired) {
    return 'This event is free to plan, including sharing one vendor brief. Sharing with more vendors, destination planning, or your next event takes the $39 One-Event Pass.';
  }
  const r = verdict.passReasons || [];
  if (r.includes('destination') || r.includes('multi-day')) {
    return 'This is a ' + (r.includes('destination') ? 'destination' : 'multi-day') + ' event — planning is open, and the destination toolkit and vendor-brief sharing take the $39 One-Event Pass.';
  }
  return 'Planning this event is open — sharing vendor briefs on it takes the $39 One-Event Pass, since your first event already had the free run.';
}
