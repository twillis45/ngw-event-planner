// ─── DUPLICATE AN EVENT — COPY THE PLAN, NEVER THE STATE ──────────────────────
//
// From the competitive read (2026-07-30). Three independent products ship this and
// Event Boss had none of it: Partiful ("Duplicating an event"), Linear (issue and
// document templates), Blink ("template reuse for future events"). For the repeat
// host — the annual crab feast, the yearly birthday, the reunion that rotates
// hosts — starting from nothing every year is the single largest avoidable setup
// cost in the product.
//
// THE WHOLE DESIGN IS ONE DISTINCTION: a plan is what you decided; state is what
// happened. Copying state forward would make the new event lie on its first
// screen — last year's RSVPs shown as this year's replies, last year's paid
// deposits shown as paid, last year's checklist shown as done. The app's honesty
// doctrine is that unknown reads as unknown, and a duplicate that inherits state
// manufactures knowledge it does not have.
//
// So this is an ALLOW-LIST on state, not a blanket clone: every field that records
// something that HAPPENED is named and reset here. New state fields therefore
// carry forward by default, which is the safe direction for a plan field and the
// wrong one for a state field — so anything added to the event model that records
// an occurrence must be added to the resets below. That is the maintenance cost,
// and it is deliberate: the alternative (an allow-list on the plan) silently DROPS
// new plan fields, and a duplicate quietly missing half the plan is harder to
// notice than one that shows a stale flag.
//
// PURE: no React, no storage, no clock. The caller supplies the new id and the
// timestamp, so this is testable and so the shell keeps owning persistence.

/** Fields that record what HAPPENED on the occurrence being copied. */
const GUEST_STATE = ['rsvp', 'rsvpAt', 'checkedIn', 'seat', 'seatId', 'tableId', 'plusOneRsvp'];
const VENDOR_STATE = ['depositPaid', 'balancePaid', 'contractSigned', 'coiStatus', 'coiVerified',
  'arrivalTime', 'paidAt', 'confirmedAt', 'reconfirmedAt', 'replyText', 'lastReplyAt'];
const EVENT_STATE = ['id', 'createdAt', 'updatedAt', 'date', 'endDate',
  'rosDone', 'rosEdited', 'photos', 'thanks', 'thanksSent',
  'lodging', 'lodgingOptions', 'lodgingPick',
  'snoozed', 'snoozeUntil', 'deferred', 'satisfied', 'handled',
  'startTime', 'startTimeSource', 'startTimeWhy'];

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/**
 * duplicateEvent(source, { id, now, name }) → a new event object.
 *
 * `id` is required — the caller owns id generation (the shell already has one).
 * `now` is an ISO string for createdAt; injectable so tests do not touch the clock.
 * `name` overrides the copy's name; defaults to the source name unchanged, because
 * a host duplicating "Family Reunion" almost always still wants "Family Reunion" —
 * appending "(copy)" would make them edit it back on every use. The DATE is what
 * distinguishes the two, and the date is deliberately blank.
 */
export function duplicateEvent(source, opts = {}) {
  const src = isObj(source) ? source : {};
  const id = opts.id;
  if (!id) throw new Error('duplicateEvent: an id is required — the caller owns id generation');

  const out = { ...src };
  for (const k of EVENT_STATE) delete out[k];

  out.id = id;
  out.createdAt = opts.now || new Date().toISOString();
  // NO DATE. This is the one field the host must supply, and leaving it unset is
  // what makes every date-relative engine (checklist leads, decision windows, the
  // countdown) honestly say "no date yet" instead of computing against last year's.
  out.date = '';
  if (opts.name) out.name = opts.name;

  // GUESTS: the list is the most valuable thing being copied — names, contacts and
  // dietary notes took the host real effort. Their REPLIES belong to the event that
  // already happened, so every guest returns to not-yet-asked.
  if (Array.isArray(src.guests)) {
    out.guests = src.guests.filter(Boolean).map(g => {
      const copy = { ...g };
      for (const k of GUEST_STATE) delete copy[k];
      return copy;
    });
  }

  // VENDORS: who you hired and what they cost is plan. Whether you PAID them, and
  // whether their insurance is on file, is emphatically not — a duplicate showing
  // a deposit as paid could cost the host the booking.
  if (Array.isArray(src.vendors)) {
    out.vendors = src.vendors.filter(Boolean).map(v => {
      const copy = { ...v };
      for (const k of VENDOR_STATE) delete copy[k];
      return copy;
    });
  }

  // TIMELINE: the tasks are the plan; ticking them off was last year's work.
  if (Array.isArray(src.timeline)) {
    out.timeline = src.timeline.filter(Boolean).map(t => ({ ...t, done: false }));
  }

  // RUN OF SHOW: the shape of the day carries; what got done during it does not.
  // (rosDone is deleted above — this drops any per-row done flag too.)
  if (Array.isArray(src.ros)) {
    out.ros = src.ros.filter(Boolean).map(r => { const c = { ...r }; delete c.done; return c; });
  }

  // BUDGET LINES: the categories and their budgeted amounts are the plan. What was
  // actually bought or spent against them is not.
  if (Array.isArray(src.budget)) {
    out.budget = src.budget.filter(Boolean).map(b => {
      const c = { ...b };
      delete c.spent; delete c.actual; delete c.bought; delete c.paid;
      return c;
    });
  }

  // SETTLED DECISIONS CARRY ON PURPOSE. `picks` is the clearest case of plan-not-
  // state in the model: "we do potluck, assigned by category" is precisely the
  // knowledge a repeat host wants back, and re-answering it every year is the
  // friction this feature exists to remove. They stay editable like any other pick.

  out.duplicatedFrom = src.id || null;   // provenance, so the copy can say where it came from
  return out;
}

/** True when an event is a copy — lets a surface say so rather than guess. */
export function isDuplicate(event) {
  return !!(event && event.duplicatedFrom);
}
