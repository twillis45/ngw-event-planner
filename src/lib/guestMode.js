// ─── guestMode — the host's chosen guest workflow (HOST-CHOICE-SUPPRESSION-1) ──
//
// A host who chose "just a headcount" must never be nagged with RSVP-management
// UI ("Nudge the 5 who haven't replied", "N haven't RSVP'd") — that's the app
// ignoring their setup choice. This is the ONE reader every reply-pressure
// surface gates on, derived from the EXISTING model (event.guestMode
// 'count'|'list', the roster, the count locks). Suppression hides pressure,
// never data: a count-only host keeps their roster visible for tracking
// (the Headcount card already says "RSVPs below are just for tracking") —
// they just stop being chased about it.
//
//   count_only    · host went by a number (guestMode='count' or a locked count)
//   rsvp_tracking · host tracks people and replies (guestMode='list' or a roster
//                   with no count choice)
//   unknown       · nothing chosen yet — default to count-first, never assume
//                   RSVP mode from empty data.

export function guestPlanningMode(event) {
  const ev = event || {};
  if (ev.guestMode === 'count' || ev.guestCountLocked === true || ev.headcountLocked === true) return 'count_only';
  const roster = Array.isArray(ev.guests) ? ev.guests.filter(Boolean) : [];
  if (ev.guestMode === 'list' || roster.length > 0) return 'rsvp_tracking';
  return 'unknown';
}

// Should this event show reply-chasing UI (nudges, "haven't RSVP'd" alerts,
// awaiting-reply pressure)? Only when the host actually manages replies.
export const showsReplyTracking = (event) => guestPlanningMode(event) === 'rsvp_tracking';
