// ─── rsvp — THE ONE RSVP VOCABULARY ──────────────────────────────────────────
//
// C3. Seven predicates in this codebase asked "has this guest replied?" and four
// of them used different vocabularies. The worst: guestCountResolved treated a
// guest as pending ONLY if rsvp was 'maybe' or '' — an explicit two-value
// allow-list — while csvParsers writes 'Pending' for every blank / "no response"
// / "awaiting" / "invited" row on EVERY import platform. So an imported roster
// nobody had answered reported a RESOLVED guest count.
//
// It lives in its own module (rather than inside playbooks/) because taskEngine
// needs it too, and playbooks already imports taskEngine — importing back would
// be a cycle. A vocabulary this load-bearing shouldn't be a passenger anyway.
//
// The rule: anything that is not an explicit yes/no is STILL OUTSTANDING. An
// unrecognised value is never silently promoted to a reply.

/** 'yes' | 'no' | 'maybe' | 'pending' */
export function rsvpState(guest) {
  const r = String((guest && guest.rsvp) || '').trim().toLowerCase();
  if (r === 'yes' || r === 'attending' || r === 'accepted') return 'yes';
  if (r === 'maybe') return 'maybe';
  if (r === 'no' || r === 'declined' || r === 'regret' || r === 'regrets') return 'no';
  return 'pending';   // '' · 'pending' · anything unrecognised — NOT a reply
}

/** Has this guest actually ANSWERED? maybe/pending are not answers. */
export function rsvpIsSettled(guest) {
  const s = rsvpState(guest);
  return s === 'yes' || s === 'no';
}

/** Has this guest responded AT ALL (including a maybe)? Proves they were asked. */
export function rsvpHasResponded(guest) {
  return rsvpState(guest) !== 'pending';
}
