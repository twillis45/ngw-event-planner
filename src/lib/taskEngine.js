import { vendorIsCommitted, vendorOutstanding } from './vendorMoney';
import { isVendorBooked, hiredVendors } from './workstreams';
import { venueFor } from './venueFor';
import { budgetIsSet } from './budgetFor';
import { rsvpHasResponded } from './rsvp';
import { chaseAnsweredOrNudged } from './replyNudge';
// Live binding, read only at call time: playbooks imports this module too.
import { openFoodChoices, isDietaryChoice, playbookFoodPlan, hostBuysLine, dietaryNoted, stepCallsAnswered, stepBooks } from './playbooks';
import { buildTravelPlan } from './travelPlan';
import { sendStateFor } from './sendLedger';
import { datePollSettled } from './datePoll';
import { spanNights } from './dates';
import { giftCashLogged, giftsByMailLogged } from './giftLog';
import { borrowedAllBack } from './borrowedList';
import { roomPlanSettled } from './roomPlan';
import { sponsorAskDone } from './sponsors';
// Live binding, read only at call time: stepTarget imports playbooks, which imports this module.
import { stepFactsFor, declaredStepFor } from './stepTarget';
// Live binding, read only at call time: tripFood imports playbooks, which imports this module.
import { dinnerParts } from './tripFood';

// The trip-details draft's title, which is also its send-ledger key: the
// draft sheet records under it, and the checklist row reads it back.
export const TRIP_DETAILS_DRAFT = 'The trip details';

// Single source of truth for "is this planning task already handled by real event state?"
//
// Lifted + generalized from CommandCenter's `_stTask` so that What's-left, Next Up, and
// readiness all share ONE satisfaction predicate. Doctrine (project_single_source_task_
// doctrine): derive, don't store; self-updating; current-only; no manual checkoff.
//
// Conservative: returns true ONLY when we can prove from event facts that the task is
// handled — unmatched tasks fall through to false (so a manual `done` flag, used as an
// override on top of this, still covers the long tail we can't yet prove).
//
// CHOICES ARE ENGINE INPUTS: a caterer task is "satisfied" (drops out of the plan) when
// the host chose to self-provide food (cook / potluck) — there is no caterer in this
// event — OR when a real vendor exists. This is what makes a sourcing toggle ripple
// through the plan / tasks / readiness.

// True when the host's food sourcing choice means no caterer is part of this event.
export function cateringSelfProvided(event) {
  const src = String((event && event.foodChoices && event.foodChoices.sourcing) || '').toLowerCase();
  if (!src) return false;
  return /host cooks|potluck|cook (it )?(yourself|everything|the mains)|\bdiy\b|self[-\s]?cater/.test(src);
}

// True when a real, named vendor is attached to the event.
export function hasNamedVendor(event) {
  return Array.isArray(event && event.vendors) && event.vendors.some((v) => v && String(v.name || '').trim());
}

// ─── THE INVITE IS OUT (single-source audit, 11/18/2026) ─────────────────────
// Recorded as sent, or any guest has answered (an answer proves an invite
// reached them). The checklist and the guest sheet's "I already sent it" both
// ask this, so a replied-to invite is never offered as unsent.
export function invitesOut(event) {
  if (!event) return false;
  if (event.invitesSentAt) return true;
  return (Array.isArray(event.guests) ? event.guests : []).some((g) => rsvpHasResponded(g));
}

// ─── WHO IS BOOKED, BY ROLE: ONE TABLE ──────────────────────────────────────
// A role as a step names it → the words a vendor of that role carries in its
// name, category or type. Booked means isVendorBooked on event.vendors, the
// record every booking proof reads. The booking-verb rule below and the steps
// that list their roles (`books` on a playbook task) both read this table.
// The third column rules a vendor OUT of the role (Wanda audit P0-11): a
// photobooth is its own role, and neither a booth nor a photoshoot is the
// event's photographer.
export const BOOKING_ROLES = [
  [/cater/, /cater|food/],
  [/photo ?booth/, /booth/],
  [/photograph|videograph/, /photo|video/, /booth|photo ?shoot/],
  [/\bdj\b|\bbanda?\b|entertain|\bmusic\b/, /\bdj\b|music|banda?\b|entertain/],
  [/florist|\bflowers?\b/, /flor/],
  [/\bcake\b|\bbaker\b/, /bak|cake/],
  [/officiant/, /offici/],
  [/\bplanner\b|coordinator/, /planner|coordinat/],
];
// HIRED vendors only (hiredVendors, Wanda audit P0-10): a friend helping is not a booking.
const vendorBookedAs = (event, vendRe, notRe) => hiredVendors(event || {})
  .some((v) => {
    if (!v || !isVendorBooked(v)) return false;
    const t = ((v.name || '') + ' ' + (v.category || '') + ' ' + (v.type || '')).toLowerCase();
    return vendRe.test(t) && !(notRe && notRe.test(t));
  });
/** Is a vendor of this role booked? `role` is the step's word for it ("band/DJ"). */
export function roleBooked(event, role) {
  const r = String(role || '').toLowerCase();
  const hit = BOOKING_ROLES.find(([taskRe]) => taskRe.test(r));
  return !!hit && vendorBookedAs(event, hit[1], hit[2]);
}

// ─── THE FACTS A STEP DECLARES (six root causes, cause 1, part 2) ────────────
// taskSatisfied used to decide from the step's WORDS: ~40 keyword rules over its
// text ("set … date", "chase", "pay", "book … DJ", "menu", an act word that kept
// it open). The rules were sound about FACTS and wrong about WORDS: a variant
// spelling changed the answer ("groceries" is not "grocery"), and any row's
// prose could trip any rule. Each fact below is one of those rules' proofs, kept
// exactly; every step now DECLARES which facts prove it (lib/stepTarget
// stepFactsFor: on the row, else on its step by id), and nothing here reads a
// step's text. The declarations were derived once from the retired rules and
// committed; the history of each proof is in git (taskEngine.js before this).
//
// A declaration is an ordered list. A bare fact is the answer; `or:<fact>`
// proves the step when it holds and otherwise passes on; `and:<fact>` refuses
// the step when it does not hold and otherwise passes on; `then:<fact>` is read
// only by timelineStepResolved, after the step is not otherwise done. An empty
// list, or no declaration, means only the host's tick proves it: an act (a
// call, a walk-through, a briefing) has no stored witness.
const _named = (v) => v && String(v.name || '').trim();
const _guests = (e) => (Array.isArray(e.guests) ? e.guests : []);
const _dateSet = (e) => !!String(e.date || '').trim() && !/^(tbd|tba)$/i.test(String(e.date).trim());
const _bookedHired = (e) => hiredVendors(e).filter((v) => isVendorBooked(v));
const _vendorText = (v) => ((v.name || '') + ' ' + (v.category || '') + ' ' + (v.type || '')).toLowerCase();
// The roles a fact can name, keyed (BOOKING_ROLES above, in its order).
export const BOOKING_ROLE_KEYS = ['caterer', 'photobooth', 'photographer', 'dj', 'florist', 'baker', 'officiant', 'planner'];
const _roleByKey = (k) => { const i = BOOKING_ROLE_KEYS.indexOf(k); return i >= 0 ? BOOKING_ROLES[i] : null; };
// Money is proven by money (C2, brutal audit): committed vendors, with money on the books.
const _committed = (e) => (Array.isArray(e.vendors) ? e.vendors : []).filter((v) => _named(v) && vendorIsCommitted(v));
export const STEP_FACTS = Object.freeze({
  // "Set the date…" composites anchor on the date (eventPlan decomposes the rest).
  'date-set': (e) => _dateSet(e),
  // The food sheet's "Dietary needs noted".
  'dietary-noted': (e) => !!dietaryNoted(e),
  // Recorded as sent, or any guest has answered.
  'invites-out': (e) => invitesOut(e),
  // A saved album link, the full-link test the invite applies.
  'album-link': (e) => /^https?:\/\//i.test(String(e.albumUrl || '').trim()),
  // The trip details went out (the send ledger; a copy or a failed email is not a send).
  'trip-details-sent': (e) => {
    const r = sendStateFor(e.sendLedger, TRIP_DETAILS_DRAFT);
    return !!r && r.channel !== 'copy' && (r.status === 'handed_off' || r.status === 'accepted');
  },
  // The poll is settled, or she gave a real range and never started one.
  'dates-polled': (e) => {
    if (datePollSettled(e)) return true;
    const offered = Array.isArray(e.dateOptions) && e.dateOptions.length > 0;
    return !offered && _dateSet(e) && spanNights(e) > 0 && !e.datesToConfirm;
  },
  // "Pick the date (and time)": the time half counts only when the hour is hers.
  'date-picked': (e) => _dateSet(e) && !e.datesToConfirm,
  'date-and-time-picked': (e) => _dateSet(e) && !e.datesToConfirm
    && !!String(e.startTime || '').trim() && e.startTimeSource !== 'derived',
  // The gift log on the guest rows.
  'gift-cash-logged': (e) => giftCashLogged(e),
  'gifts-by-mail-logged': (e) => giftsByMailLogged(e),
  'borrowed-back': (e) => borrowedAllBack(e),
  'rooms-planned': (e) => roomPlanSettled(e),
  'sponsor-asked': (e) => sponsorAskDone(e),
  // A recorded deposit, all of them paid (never vacuous).
  'deposits-paid': (e) => {
    const withDep = _committed(e).filter((v) => Number(v.depositAmt) > 0);
    return withDep.length > 0 && withDep.every((v) => v.depositPaid === true);
  },
  // Nothing owed, and some money was actually on the books.
  'nothing-owed': (e) => {
    const c = _committed(e);
    if (!c.length || !c.some((v) => Number(v.cost) > 0 || Number(v.depositAmt) > 0)) return false;
    return vendorOutstanding(e) === 0;
  },
  // CHASE ≠ SEND: nobody left to chase — everyone answered, or everyone invited
  // answered or was nudged (owner ruling, 11/20/2026).
  'replies-chased': (e) => {
    const gs = _guests(e);
    if (!gs.length) return false;
    return gs.every((g) => rsvpHasResponded(g)) || chaseAnsweredOrNudged(e);
  },
  // "Lock the count": everyone has answered.
  'everyone-replied': (e) => { const gs = _guests(e); return gs.length > 0 && gs.every((g) => rsvpHasResponded(g)); },
  // No caterer is part of this event (she cooks, or a potluck).
  'catering-moot': (e) => cateringSelfProvided(e),
  // A caterer she actually booked (HIRED vendors only; a friend helping is not a booking).
  'caterer-booked': (e) => _bookedHired(e).some((v) => /cater|food/.test(_vendorText(v))),
  // Any vendor she actually booked.
  'a-vendor-booked': (e) => _bookedHired(e).length > 0,
  // A typed count, a guest list, or an estimate.
  'guest-count': (e) => (Number(e.guestCount) || Number(e.guestEstimate) || _guests(e).length) > 0,
  'budget-set': (e) => budgetIsSet(e),
  // venueFor: an at-home event with a city IS venued.
  'venue-set': (e) => { const v = venueFor(e); return v.isSet && !/^(tbd|tba)$/i.test(v.name); },
  // The menu's open questions are closed (playbooks.openFoodChoices), with
  // menu content behind it (a lone sourcing key is a sourcing choice).
  'menu-decided': (e) => {
    const hasFood = (e.foodChoices && Object.keys(e.foodChoices).some((k) => k !== 'sourcing'))
      || (Array.isArray(e.foodAdd) && e.foodAdd.length > 0);
    if (!hasFood) return false;
    let open = null;
    try { open = openFoodChoices(e); } catch (_e) { open = null; }
    return open == null ? true : open.filter((c) => !isDietaryChoice(c)).length === 0;
  },
  // The calls the step names (`answeredBy` on the step, found by the row's id)
  // are answered: the pick is the fact (owner's iPad, 11/21/2026).
  'calls-answered': (e, st, row) => stepCallsAnswered(e, row),
  // Every role the step lists (`books` on the step, found by the row's id) is
  // booked — and only then.
  'roles-listed': (e, st, row) => { const books = stepBooks(e, row); return books.length > 0 && books.every((r) => roleBooked(e, r)); },
  // The dinner's own part is set (the dinner sheet's `set`).
  'dinner-part': (e, st) => {
    try { const p = dinnerParts(e).find((x) => x.id === (st && st.part)); return !!(p && p.set); } catch (_e) { return false; }
  },
  // The arrivals/departures grid holds a real flight.
  'arrivals-grid': (e) => {
    try {
      const travel = buildTravelPlan(e);
      return !!(travel.relevant && travel.rosterMode
        && ((travel.air && travel.air.roster) || []).some((r) => r.hasFlightInfo));
    } catch (_e) { return false; }
  },
  // A food shop whose list is bought — only the lines the host buys (hostBuysLine).
  'food-bought': (e) => {
    try {
      const fp = playbookFoodPlan(e);
      const active = ((fp && fp.list) || []).filter((it) => it && !it.skipped && hostBuysLine(it));
      if (!active.length) return false;
      const got = e.foodGot || {};
      return active.every((it) => got[it.id] === true);
    } catch (_e) { return false; }
  },
});
// `roles:<key>+<key>` — a booked vendor PER role (Wanda audit P0-11), each
// fitted to its own role and none ruled out of it (BOOKING_ROLES).
function rolesBooked(e, keys) {
  const named = keys.map(_roleByKey);
  if (!named.length || named.some((r) => !r)) return false;
  const vendors = _bookedHired(e);
  const fits = (v, [, vendRe, notRe]) => vendRe.test(_vendorText(v)) && !(notRe && notRe.test(_vendorText(v)));
  const fill = (i, used) => i === named.length || vendors.some((v) => !used.has(v)
    && fits(v, named[i]) && fill(i + 1, new Set([...used, v])));
  return fill(0, new Set());
}
const _bare = (f) => String(f || '').replace(/^(?:or|and|then):/, '');
/** True for a fact (with or without its or:/and:/then: mode) this vocabulary can prove. */
export function isKnownStepFact(f) {
  const b = _bare(f);
  if (b.startsWith('roles:')) return b.slice(6).split('+').every((k) => BOOKING_ROLE_KEYS.includes(k));
  return Object.prototype.hasOwnProperty.call(STEP_FACTS, b);
}
function factHolds(event, fact, step, row) {
  const b = _bare(fact);
  try {
    if (b.startsWith('roles:')) return rolesBooked(event, b.slice(6).split('+'));
    const fn = STEP_FACTS[b];
    return fn ? !!fn(event, step, row) : false;
  } catch (_e) { return false; }
}

// taskSatisfied(event, task) → boolean. `task` is a checklist row (or a
// milestone carrying its facts). True ONLY when the facts its step declares
// prove it handled; a row that declares none is proven by the host's tick.
export function taskSatisfied(event, task) {
  if (!event || !task) return false;
  const facts = stepFactsFor(event, task);
  if (!Array.isArray(facts) || !facts.length) return false;
  const step = declaredStepFor(event, task);
  for (const f of facts) {
    const m = String(f);
    if (m.startsWith('then:')) continue;
    if (m.startsWith('or:')) { if (factHolds(event, m, step, task)) return true; continue; }
    if (m.startsWith('and:')) { if (!factHolds(event, m, step, task)) return false; continue; }
    return factHolds(event, m, step, task);
  }
  return false;
}

// effectiveDone — the value every "what's left" surface and readiness should use instead
// of the raw stored `task.done`. A task is done if the host ticked it OR real event state
// proves it handled. This is the bridge that retires manual checkoff as a source of truth.
export function effectiveDone(event, task) {
  return !!(task && task.done) || taskSatisfied(event, task);
}

// ─── IS THIS CHECKLIST STEP HANDLED? ONE ANSWER (hero-clears sweep, 11/20/2026) ──
// The checklist sheet answered this in the shell (isTimelineStepResolved) and
// the overdue policy every engine reads (taskLead.taskIsOverdue → the board's
// "Catch up on this step", getEventReadiness, the ladder's "Catch up on overdue
// planning tasks") answered it with effectiveDone alone. So the checklist said
// "Every step is handled — 3 no longer needed" while the hero said "Order the
// balloons — overdue by 5 days" about a step the plan had retired. Moved here,
// unchanged in meaning except one line (below), and read by both.
//
// A step is handled when it is ticked or proven by event state (effectiveDone);
// RETIRED (its gate closed — no longer work this event needs); or proven by a
// `then:` fact its step declares (the arrivals grid holding a real flight; a
// food shop whose list is bought — only the lines the host buys).
export function timelineStepResolved(event, task) {
  if (!task) return false;
  if (task.retired) return true;
  try { if (effectiveDone(event, task)) return true; } catch (_e) { /* fall through */ }
  let facts = null;
  try { facts = stepFactsFor(event, task); } catch (_e) { facts = null; }
  if (!Array.isArray(facts)) return false;
  const step = (() => { try { return declaredStepFor(event, task); } catch (_e) { return null; } })();
  return facts.some((f) => String(f).startsWith('then:') && factHolds(event, f, step, task));
}

// ─── THE CHECKLIST'S "N OF M": ONE READER (UX_11 rule 12; audit #35) ────────
// What the host's checklist prints ("Checked off 2 of 41"): a step counts as
// done when it is ticked or proven handled (timelineStepResolved); retired steps
// leave the count entirely, the denominator too. Her app saves this on the
// event as `checklistCount`, and the family page prints the same number (owner
// ruling 11/24/2026, option a) — only her app can see what the plan handled.
// → { done, total, open }
export function checklistProgress(event) {
  const live = ((event && Array.isArray(event.timeline)) ? event.timeline : []).filter((t) => t && !t.retired);
  const open = live.filter((t) => !t.done && !timelineStepResolved(event, t)).length;
  return { done: live.length - open, total: live.length, open };
}

// ─── A TICK RECORDS WHAT IT STANDS FOR (owner, 11/18/2026) ───────────────────
// The checklist reads section facts through taskSatisfied; this is the reverse,
// and it is derived from the SAME rule rather than a second list of patterns:
// ticking a step writes a fact only when taskSatisfied says that fact is what
// completes it. Ticking "Send the invite" records invitesSentAt, so the guest
// sheet stops offering "I already sent it"; ticking "Collect dietary needs"
// records dietaryNoted, so the food sheet stops saying "none yet". Only
// "it happened" facts belong here — never a value (a date, a budget, a menu)
// that a tick cannot know. Already-recorded facts are never overwritten.
// NOT a send (owner, 11/23/2026, six root causes): `invitesSentAt` left this
// list. "Mark done" marks the step done; it never records that an invite went
// out when nothing was sent. A send is recorded by the send.
const TICK_FACTS = [
  ['dietaryNoted', () => true],
];
export function factsATickRecords(event, task) {
  if (!event || !task) return {};
  try {
    if (taskSatisfied(event, task)) return {};
    for (const [key, value] of TICK_FACTS) {
      if (event[key]) continue;
      const v = value();
      if (taskSatisfied({ ...event, [key]: v }, task)) return { [key]: v };
    }
  } catch (_e) { /* a tick never fails on inference */ }
  return {};
}

// HQ-2 P2: taskSatisfied() is a heuristic (regex-matched) inference, not a host
// confirmation — a host should be able to tell the difference. effectiveDoneDetail
// returns the same boolean effectiveDone() does, PLUS whether that boolean came
// from an explicit checkoff (task.done) or an inference (taskSatisfied). Render
// layers show "Inferred" only in the second case; effectiveDone() itself is
// unchanged so every existing caller keeps its current behavior.
export function effectiveDoneDetail(event, task) {
  const explicit = !!(task && task.done);
  const inferred = !explicit && taskSatisfied(event, task);
  return { done: explicit || inferred, inferred };
}
