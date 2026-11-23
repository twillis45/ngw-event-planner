// ─── WHAT AN INVITE CANNOT GO OUT WITHOUT (owner, 11/19/2026) ────────────────
//
// "Before sending invites app should verify if the important info is
// included." A guest needs three facts to come: the day, the hour and the
// place. The invite sheet asks for any that are missing BEFORE it writes the
// invite, so no email, text, share or copy carries a hole.
//
// The hour counts only when the HOST set it: a time the app proposed
// (startTimeSource 'derived') is never stated to guests (startTime.js), so an
// invite built on it would quietly say no time at all.
//
// PURE. Reads the same helpers every surface uses: venueFor (is the place
// set?) and startTimeIsConfirmed (did the host choose this hour?).
import { venueFor } from './venueFor';
import { startTimeIsConfirmed } from './startTime';
import { outwardGaps } from './outwardReady';

/** The facts still missing, in the order a guest reads them. Empty when ready. */
export function inviteGaps(event) {
  const ev = event || {};
  const gaps = [];
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(ev.date || ''))) gaps.push('date');
  if (!startTimeIsConfirmed(ev)) gaps.push('time');
  if (!venueFor(ev).isSet) gaps.push('place');
  // AND NO PLACEHOLDER (six root causes, cause 6): the one outward guard's
  // name and findable-address checks, so the invite asks them here too.
  for (const g of outwardGaps(ev, 'invite')) if (!(g.key === 'address' && gaps.includes('place'))) gaps.push(g.key);
  return gaps;
}
