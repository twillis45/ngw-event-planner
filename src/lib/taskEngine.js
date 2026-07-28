import { vendorIsCommitted, vendorOutstanding } from './vendorMoney';
import { venueFor } from './venueFor';
import { rsvpHasResponded } from './rsvp';

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
export function taskSatisfied(event, task) {
  if (!event || !task) return false;
  const s = String(task.task || task.text || '').toLowerCase();
  if (!s) return false;
  const guests     = Array.isArray(event.guests) ? event.guests : [];
  const hasGuests  = (Number(event.guestCount) || Number(event.guestEstimate) || guests.length) > 0;
  const hasBudget  = (Number(event.totalBudget) || 0) > 0 || (Array.isArray(event.budget) && event.budget.some((b) => Number(b && b.budgeted) > 0));
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

  // ── BRUTAL AUDIT 2026-07-28 GUARDS — these run before every domain rule ─────
  // A this-or-that question is a DECISION — no stored fact proves a choice was
  // made ("Ticketed (paid) or free registration?", "At home or a venue?").
  if (/\bor\b/.test(s) && /\?\s*$/.test(s)) return false;
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
    return guests.every(g => rsvpHasResponded(g));  // everyone has answered, yes or no
  }

  // Sending, on the other hand, IS evidenced by a single reply — someone could only have
  // replied if the invitation reached them.
  // NB: the ORIGINAL branch used /invite/, which does not match "invitations"
  // (invit-A-tions) — so "Send the invitations" fell through to false by accident.
  // /invit/ covers the whole family deliberately.
  if (/invit|rsvp/.test(s)) {
    if (event.invitesSentAt) return true;
    return guests.some(g => rsvpHasResponded(g));
  }

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
  // proven by a DJ the host actually booked (isVendorBooked via vendorIsCommitted),
  // never by a florist, and never by a name typed while still considering.
  const vendors = Array.isArray(event.vendors) ? event.vendors : [];
  const committedMatch = (re) => vendors.some((v) => v && vendorIsCommitted(v)
    && re.test(((v.name || '') + ' ' + (v.category || '') + ' ' + (v.type || '')).toLowerCase()));
  if (/\b(book(ed)?|hire[ds]?|lock(ed)? in|secure[d]?)\b/.test(s) || /vendor/.test(s)) {
    if (/cater/.test(s)) return committedMatch(/cater|food/);
    const roles = [
      [/photograph|videograph/, /photo|video/],
      [/\bdj\b|\bbanda?\b|entertain|\bmusic\b/, /\bdj\b|music|banda?\b|entertain/],
      [/florist|\bflowers?\b/, /flor/],
      [/\bcake\b|\bbaker\b/, /bak|cake/],
      [/officiant/, /offici/],
    ];
    const named = roles.filter(([taskRe]) => taskRe.test(s));
    if (named.length) return named.every(([, vendRe]) => committedMatch(vendRe));
    if (/vendor|\bhire[ds]?\b|book a /.test(s)) return vendors.some((v) => v && vendorIsCommitted(v));
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
  if (/\b(set|lock|plan|decide|map)\b.{0,20}\b(menu|spread)\b|\bmenu\b|food plan|what to (cook|serve|make)|plan the food/.test(s)) return hasFood;
  return false;
}

// effectiveDone — the value every "what's left" surface and readiness should use instead
// of the raw stored `task.done`. A task is done if the host ticked it OR real event state
// proves it handled. This is the bridge that retires manual checkoff as a source of truth.
export function effectiveDone(event, task) {
  return !!(task && task.done) || taskSatisfied(event, task);
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
