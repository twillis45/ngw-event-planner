import { vendorIsCommitted, vendorOutstanding } from './vendorMoney';
import { isVendorBooked } from './workstreams';
import { venueFor } from './venueFor';
import { budgetIsSet } from './budgetFor';
import { rsvpHasResponded } from './rsvp';
import { chaseAnsweredOrNudged } from './replyNudge';
// Live binding, read only at call time: playbooks imports this module too.
import { openFoodChoices, isDietaryChoice, playbookFoodPlan, hostBuysLine, dietaryNoted, stepCalls, stepCallsAnswered } from './playbooks';
import { buildTravelPlan } from './travelPlan';
import { sendStateFor } from './sendLedger';
import { DATE_POLL_ROW, datePollSettled } from './datePoll';
import { giftRowSatisfied } from './giftLog';

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

// taskSatisfied(event, task) → boolean. `task` may be a timeline task ({task}) or a
// subtask ({text}). Keyword-matched against the same domains the next-step engine routes
// on, so the surfaces can never disagree about whether a task is handled.
const DIETARY_STEP = /\b(collect|ask|count|note|gather)\b[^;]*\b(dietary|allerg)/;

// ─── THE INVITE IS OUT (single-source audit, 11/18/2026) ─────────────────────
// Recorded as sent, or any guest has answered (an answer proves an invite
// reached them). The checklist and the guest sheet's "I already sent it" both
// ask this, so a replied-to invite is never offered as unsent.
export function invitesOut(event) {
  if (!event) return false;
  if (event.invitesSentAt) return true;
  return (Array.isArray(event.guests) ? event.guests : []).some((g) => rsvpHasResponded(g));
}

export function taskSatisfied(event, task) {
  if (!event || !task) return false;
  const s = String(task.task || task.text || '').toLowerCase();
  if (!s) return false;
  // A STEP THAT IS A CALL is done when the call is answered (owner's iPad,
  // 11/21/2026): the pick is the fact. Before the "this or that?" guard below,
  // which is about steps no stored fact can prove.
  // The named calls are the WHOLE proof (11/21/2026): Wedding's "Agree total
  // budget, who pays, and the guest-count target" names two, and a typed
  // budget is one of them, not the step. So no keyword rule below may clear a
  // step that names calls; it clears when every call it names is answered.
  if (typeof task.id === 'string' && task.id.startsWith('pbt-') && stepCalls(event, task).length) return stepCallsAnswered(event, task);
  const guests     = Array.isArray(event.guests) ? event.guests : [];
  const hasGuests  = (Number(event.guestCount) || Number(event.guestEstimate) || guests.length) > 0;
  // ONE BUDGET READER (2026-09-18) — this rule was correct and was one of SIX
  // private copies (lib/budgetFor.js carries the measured damage). Same
  // semantics, now shared: a budget exists whether it lives in `totalBudget` or
  // in the rows. One narrowing: a row budgeted at $0 no longer counts, which is
  // what `some(budgeted > 0)` already meant here but the rows SUM now decides,
  // so a row of 0 beside a row of 500 reads the same as it always did.
  const hasBudget  = budgetIsSet(event);
  // venueFor: an at-home event with a city IS venued — reading the bare venue
  // name here told home hosts to go book a venue (audit divergence #2).
  const hasVenue   = (() => { const v = venueFor(event); return v.isSet && !/^(tbd|tba)$/i.test(v.name); })();
  // Menu proof needs MENU content — a lone sourcing key ("host cooks") proves a
  // sourcing choice, not a locked menu (audit class S7).
  const hasFood    = (event.foodChoices && Object.keys(event.foodChoices).some((k) => k !== 'sourcing')) || (Array.isArray(event.foodAdd) && event.foodAdd.length > 0);
  const dateSet    = !!String(event.date || '').trim() && !/^(tbd|tba)$/i.test(String(event.date).trim());

  // "Set the date…" composites (playbook setup milestones like "Set date, headcount, menu")
  // anchor on the date — they are handled the moment the date is set. The atomic headcount /
  // food dominoes then carry on their own (eventPlan decomposes the composite), so the stale
  // bundled string never lingers in a "what's left" list once event.date exists. FIRST so it
  // wins over the generic headcount match below.
  if (/^set\b.*\bdate\b/.test(s) || /\bset (the |a )?date\b/.test(s))         return dateSet;

  // DIETARY NEEDS COLLECTED (11/18/2026): "Collect dietary needs", "Ask every
  // guest for allergies", "note any dietary needs" are the step the food
  // sheet's "Dietary needs noted" answers. Additive: when the host has not
  // noted them, the step falls through to whatever else it is about. An
  // invite that only ASKS about diets is excluded — sending the ask is not
  // having the answers.
  if (dietaryNoted(event) && DIETARY_STEP.test(s) && !/\b(invit|send)|chase|nudge/.test(s)) return true;

  // ── BRUTAL AUDIT 2026-07-28 GUARDS — these run before every domain rule ─────
  // A this-or-that question is a DECISION — no stored fact proves a choice was
  // made ("Ticketed (paid) or free registration?", "At home or a venue?").
  if (/\bor\b/.test(s) && /\?\s*$/.test(s)) return false;
  // A SEND-THE-INVITE STEP IS PROVEN BY THE INVITE GOING OUT, even when it
  // goes on to "collect RSVPs" or "track replies" (single-source audit,
  // 11/18/2026): "Send invites + collect RSVP, dietary, plus-ones" fell to the
  // act guard below, so "I already sent it" said the plan moves on while the
  // row stayed open. Leading send verbs only; the chase rows keep their own rule.
  if (/^(text\/email |send( out)? )(the |your )?invit/.test(s)) return invitesOut(event);

  // THE ALBUM LINK IS THE ALBUM SHARED (owner pick, 11/21/2026). "Share the …
  // photos in one album link" is done by a saved link on the invite recap,
  // which guests see when they reopen the invite: the same full-link test the
  // invite applies before it shows one. Above the act guard, whose "share"
  // would otherwise keep it open forever. Only rows that name the one album
  // link: "start a shared album and send the link" is still an ask of people.
  if (/^share\b[^.;]{0,80}\bin one album link\b/.test(s)) return /^https?:\/\//i.test(String(event.albumUrl || '').trim());

  // THE TRIP DETAILS WENT OUT (11/21/2026). Group Trip's "Send everyone the
  // trip details…" opens their draft; posting it on everyone's invite or
  // handing it off records it on the send ledger, and that record is the
  // step done. Copying is not a send (the invite's rule above), and a server
  // email that failed or is still in flight is not one either.
  if (/^send everyone the trip details\b/.test(s)) {
    const e = sendStateFor(event.sendLedger, TRIP_DETAILS_DRAFT);
    return !!e && e.channel !== 'copy' && (e.status === 'handed_off' || e.status === 'accepted');
  }

  // THE DATE POLL IS SETTLED WHEN THE HOST USES A RANGE (owner pick B,
  // 11/21/2026). Offering ranges is half the step; the other half is the
  // group's answer, and "Use these dates" is the host acting on it. Above the
  // act guard, whose "check" / "poll" words would keep it open forever.
  if (DATE_POLL_ROW.test(s)) return datePollSettled(event);

  // THE GIFT LOG (owner pick A, 11/21/2026): the cash row is done by a cash
  // amount on the log, the mailed-gifts row by a gift from someone who did not
  // come; "go through the gifts" is the host's tick (giftLog.giftRowSatisfied).
  const gift = giftRowSatisfied(event, s);
  if (gift !== null) return gift;

  // ACTS — calls, briefings, walk-throughs, physical work, ongoing collection —
  // are never proven by presence facts. "Recruit 3-5 volunteers" was marked done
  // by a typed headcount; "share live location" by a venue name; "track RSVPs"
  // by a single reply. No stored field witnesses these happening, so they stay
  // open until the host ticks them. (Chase-class rows keep their own stronger
  // proof below — none of these words appear in the chase regex.)
  if (/\b(re-?confirm|call (every|all)|brief|remind|greet|walk|tour|rehears|recruit|volunteers?|sound check|run.of.show|give\b|pick(ing)? up|drop(ping)? off|load|unload|pack|clean|decorat|escort|collect|track|share|point)\b/.test(s)) return false;

  // ── C2 — A PRESENCE PREDICATE MAY NOT SATISFY AN ACT ────────────────────────
  // This file's own header promises it "returns true ONLY when we can prove from
  // event facts that the task is handled." Two families broke that promise, and
  // they are the two where being wrong costs the host the most.
  //
  // MONEY. There was no money signal in this file at all, so tasks that tell the
  // host to PAY fell through to the /cater/ and /vendor/ branches below and were
  // satisfied by hasNamedVendor — i.e. marked done because a vendor had a NAME.
  // These are real seeded tasks, not hypotheticals:
  //     "Confirm all vendors — check balance due status"   (App.js:4689)
  //     "Negotiate vendor payment plans where possible"    (App.js:4684)
  //     "Pay the caterer balance once headcount is final"
  // effectiveDone() is documented as "the value every what's-left surface should
  // use", and the host checklist DROPS every effectiveDone row — so the task did
  // not merely turn green, it disappeared. The app hid the bill.
  //
  // The honest signal now exists (lib/vendorMoney, extracted for exactly this), so
  // a money task is proven by MONEY: nothing outstanding. Never by a name.
  if (/\bpay\b|\bpaid\b|payment|deposit|balance|invoice|remit|settle up/.test(s)) {
    const committed = (Array.isArray(event.vendors) ? event.vendors : [])
      .filter(v => v && String(v.name || '').trim() && vendorIsCommitted(v));
    if (!committed.length) return false;           // nothing to prove it against
    if (/deposit/.test(s)) {
      // Vacuous-proof fix (audit class S5): a committed vendor with NO deposit
      // amount recorded proves nothing about deposits being paid. Require at
      // least one recorded deposit, all of them paid.
      const withDep = committed.filter(v => Number(v.depositAmt) > 0);
      if (!withDep.length) return false;
      return withDep.every(v => v.depositPaid === true);
    }
    // Same class: vendorOutstanding is 0 when no costs were ever recorded.
    // "Nothing owed" is proof only when some money was actually on the books.
    if (!committed.some(v => Number(v.cost) > 0 || Number(v.depositAmt) > 0)) return false;
    return vendorOutstanding(event) === 0;         // pay / balance / settle: nothing owed
  }

  // INVITATIONS. "Send the invitations" and "Chase the RSVPs" were satisfied by
  // hasGuests — a number the host typed at intake. Typing "40" marked the invites
  // SENT and dropped them from the list. Nothing had been sent. Sending is an ACT;
  // a headcount cannot prove it happened. The honest evidence that invitations went
  // out is that somebody ANSWERED (a reply of any kind, including a maybe) — or
  // that the host recorded sending them.
  // NB: the ORIGINAL branch used /invite/, which does not match "invitations"
  // (invit-A-tions) — so "Send the invitations" fell through to false by accident,
  // while "Chase the RSVPs" DID match /rsvp/ and was wrongly satisfied by a typed
  // headcount. /invit/ covers the whole family deliberately, and now every one of
  // them is answered by real evidence instead of an accident of spelling.
  // CHASE ≠ SEND (2026-07-14). These two tasks shared one predicate, and it was the
  // SEND predicate — `guests.some(hasResponded)`. So "Chase the RSVPs; lock the count"
  // was marked DONE the moment a single guest replied. One yes out of forty retired the
  // chase, and the host was told the count was locked while thirty-nine people had said
  // nothing. The task exists precisely BECAUSE people are slow to reply.
  //
  // Chasing is finished when nobody is left to chase — not when somebody answered.
  if (/chase|follow.?up on (repl|rsvp)|lock the count|nudge/.test(s)) {
    if (!guests.length) return false;               // nobody to chase yet — not "done"
    if (guests.every(g => rsvpHasResponded(g))) return true;  // everyone has answered, yes or no
    // THE CHASE STEP TELLS THE TRUTH (owner ruling, 11/20/2026): a chase step
    // is also done when everyone INVITED has answered or been nudged — the act
    // the step names, recorded on the guest by the nudge (lib/replyNudge).
    // Opening the nudge sheet records nothing, so it credits nothing. A bare
    // "lock the count" is not a chase and keeps the rule above.
    return /chase|nudge|follow.?up on/.test(s) && chaseAnsweredOrNudged(event);
  }

  // Sending, on the other hand, IS evidenced by a single reply — someone could only have
  // replied if the invitation reached them.
  // NB: the ORIGINAL branch used /invite/, which does not match "invitations"
  // (invit-A-tions) — so "Send the invitations" fell through to false by accident.
  // /invit/ covers the whole family deliberately.
  if (/invit|rsvp/.test(s)) return invitesOut(event);

  // ── BRUTAL AUDIT 2026-07-28: a MENTION may not satisfy a TASK ───────────────
  // The audit ran every playbook label against these rules and found the mention-
  // match classes below marking unproven work "done by your plan" (which the host
  // checklist then DROPS, and taskLead can never call overdue). The rules now
  // require the task to BE about the fact — an action anchor — not merely to
  // mention a related word. Prefer a false negative (the host ticks it) over a
  // false positive (the app hides work that was never done).

  // Catering moot-ness rides the sourcing choice regardless of verb: if the host
  // self-provides, every caterer task is about a vendor this event doesn't have.
  if (/cater/.test(s) && cateringSelfProvided(event)) return true;

  // Booking-verb vendor proof — ROLE-AWARE and STATUS-AWARE. "Book the DJ" is
  // proven by a DJ the host actually booked (isVendorBooked),
  // never by a florist, and never by a name typed while still considering.
  const vendors = Array.isArray(event.vendors) ? event.vendors : [];
  const bookedMatch = (re) => vendors.some((v) => v && isVendorBooked(v)
    && re.test(((v.name || '') + ' ' + (v.category || '') + ' ' + (v.type || '')).toLowerCase()));
  if (/\b(book(ed)?|hire[ds]?|lock(ed)? in|secure[d]?)\b/.test(s) || /vendor/.test(s)) {
    if (/cater/.test(s)) return bookedMatch(/cater|food/);
    const roles = [
      [/photograph|videograph/, /photo|video/],
      [/\bdj\b|\bbanda?\b|entertain|\bmusic\b/, /\bdj\b|music|banda?\b|entertain/],
      [/florist|\bflowers?\b/, /flor/],
      [/\bcake\b|\bbaker\b/, /bak|cake/],
      [/officiant/, /offici/],
    ];
    const named = roles.filter(([taskRe]) => taskRe.test(s));
    if (named.length) return named.every(([, vendRe]) => bookedMatch(vendRe));
    if (/vendor|\bhire[ds]?\b|book a /.test(s)) return vendors.some((v) => v && isVendorBooked(v));
  }

  // Headcount/guest-count tasks: a typed count DOES prove "set the guest count" —
  // but only tasks about ESTABLISHING the count qualify. The old rule fired on any
  // mention of guest/adult/kids ("Greet guests", "Keep kids back", "buy ice
  // ~1.5 lb/guest") — audit class S4.
  if (/\b(set|lock|confirm|final(ize)?|decide|land)\b.{0,24}\b(head\s?count|guest.?count|the count)\b|head\s?count target|guest list\b|who.?s coming/.test(s)) return hasGuests;
  if (/\b(set|agree[d]?|decide|pick|land)\b.{0,30}budget|^budget\b|spending plan|set (a |the )?(cost|spend)/.test(s)) return hasBudget;
  // Venue: booking/choosing verbs only. Bare /location/ used to close safety rows
  // ("share live location", "Plan B location") off a typed venue name — class S3.
  if (/\b(book(ed)?|find|pick|choose|secure[d]?|reserve[d]?|lock(ed)?|scout)\b.{0,40}\b(venue|location|space|hall|room)\b|^venue\b|venue rfp/.test(s)) return hasVenue;
  // MENU STEPS CLOSE WHEN THE MENU DOES (single-source audit, 11/18/2026): one
  // pick used to close every row containing "menu", while the hero still said
  // "Decide what you're serving · 3 open". The open-questions rule is
  // playbooks.openFoodChoices — the one phaseProgress uses. Shopping and
  // counting rows that only mention the menu are not about deciding it.
  if (/\b(set|lock|plan|decide|map)\b.{0,20}\b(menu|spread)\b|\bmenu\b|food plan|what to (cook|serve|make)|plan the food/.test(s)) {
    if (/\b(buy|grocer|shop|count|serving dish|pick up)/.test(s)) return false;
    if (!hasFood) return false;
    let open = null;
    try { open = openFoodChoices(event); } catch (_e) { open = null; }
    return open == null ? true : open.filter((c) => !isDietaryChoice(c)).length === 0;
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
// RETIRED (its gate closed — no longer work this event needs); the arrivals /
// departures grid holding a real flight; or a FOOD shop whose list is bought.
// The shop rule now counts only the lines the host buys (hostBuysLine,
// 11/20/2026) — a dish a friend brings no longer holds the host's shop open.
const ARRIVALS_GRID_RE = /arrivals?\s*\/\s*departures/i;
// Scoped to FOOD purchases (brutal audit 2026-07-28, class S9): "buy the linens"
// must never ride a fully-ticked grocery list.
const FOOD_SHOP_RE = /\b(buy|shop)\b.{0,50}\b(food|grocer|ingredient|ice|drink|produce|meat|snack)\b|grocery|shopping list|food shop/i;
export function timelineStepResolved(event, task) {
  if (!task) return false;
  if (task.retired) return true;
  try { if (effectiveDone(event, task)) return true; } catch (_e) { /* fall through */ }
  const label = String(task.task || '');
  if (ARRIVALS_GRID_RE.test(label)) {
    try {
      const travel = buildTravelPlan(event);
      return !!(travel.relevant && travel.rosterMode
        && ((travel.air && travel.air.roster) || []).some((r) => r.hasFlightInfo));
    } catch (_e) { return false; }
  }
  if (FOOD_SHOP_RE.test(label)) {
    try {
      const fp = playbookFoodPlan(event);
      const active = ((fp && fp.list) || []).filter((it) => it && !it.skipped && hostBuysLine(it));
      if (!active.length) return false;
      const got = (event && event.foodGot) || {};
      return active.every((it) => got[it.id] === true);
    } catch (_e) { return false; }
  }
  return false;
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
const TICK_FACTS = [
  ['invitesSentAt', () => new Date().toISOString()],
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
