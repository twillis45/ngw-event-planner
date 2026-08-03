// ─── phaseProgress — PHASE-PROGRESS-GRADIENT-1 ────────────────────────────────
//
// The header progress bar means ONE thing: readiness for the CURRENT EVENT
// PHASE — never "how done the event is", never a score, never a percent with
// a dishonest denominator.
//   pre_event  · "Planning readiness"  — applicable essentials only
//   live_event · "Event flow"          — the day's cues, not stale planning
//   post_event · "Wrap-up"             — closeout only, planning gaps retired
//   unknown    · "Planning setup"      — no date, no faked phase
// DENOMINATOR HONESTY (test-locked): an essential counts only when the host
// chose that workflow — count-only guests never count RSVP replies, vendorless
// events never count vendor readiness, indoor events never count a rain plan,
// context nudges never count at all. Optional goods (budget target, named
// moment) count only once they exist — they can raise the handled count but
// never manufacture a gap.
// GOAL-GRADIENT: at most ONE cue — the nearest meaningful finishable step,
// source-backed, routed to its exact fix, matching the phase. Hidden when
// nothing actionable is near. It never touches green-dot logic.
//
// Thin composition over existing single sources (guestCountResolved, weather
// readers, dayBefore-style vendor gaps, playbook plans) — not a new engine.

import { playbookFoodPlan, playbookCapacity, guestCountResolved, effectiveRos } from './playbooks';
import { rainPlanStatus, isLikelyOutdoor } from './weather';
import { eventLocationStatus } from './locationAssist';
import { buildCrabPlan } from './crabPlan';
import { isVendorConfirmed } from './workstreams';
import { hostSpending } from './hostSpending';
import { daysUntil, spanEnd } from './dates';
import { venueFor } from './venueFor';
import { startTimeIsConfirmed } from './startTime';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const daysTo = (dateStr, now) => {
  return daysUntil(dateStr, now);
};
const OUTDOOR_TYPE = /cookout|bbq|barbecue|fish fry|crab feast|crawfish|boil|picnic|day party|block party|tailgate|luau|beach|garden party|graduation|juneteenth|family reunion|reunion/i;

export function deriveEventPhaseProgress(event, now = new Date()) {
  const ev = event || {};
  const d = daysTo(ev.date, now);
  const dEnd = daysTo(spanEnd(ev), now); // = d for single-day events

  // ── Phase ───────────────────────────────────────────────────────────────────
  // Span-aware (R1, 2026-07-26): live holds from the first day THROUGH the last
  // day (endDate) — day 2 of a 3-day event is live_event, not post_event.
  const phase = d == null ? 'unknown' : d > 0 ? 'pre_event' : dEnd >= 0 ? 'live_event' : 'post_event';

  if (phase === 'live_event') return liveProgress(ev, now);
  if (phase === 'post_event') return postProgress(ev);
  return preProgress(ev, phase, d);
}

// ── Pre-event (and unknown-date) — applicable essentials only ─────────────────
function preProgress(ev, phase, daysOut) {
  const noDate = phase === 'unknown';
  const items = [];
  // WAVE-6 (2026-07-15): `extra` lets an item name the RECORDS it summarizes
  // (records: [...ids]) — the food cue counts choice records the surface
  // registry's `decisions` raiser can ALSO raise individually, and eventPlan's
  // record-level dedup needs the ids, not just the count, to drop the summary's
  // claim to exactly the records already raised. Additive: no reader breaks.
  const add = (id, applies, handled, cueLabel, route, priority, extra) => {
    if (!applies) return;
    items.push({ id, handled: !!handled, cueLabel, route, priority, ...(extra || null) });
  };

  // ── DATE & TIME — ONE area (host directive 2026-07-14) ──────────────────────
  // The day and the hour are both "when", and counting them as two separate areas
  // padded the scoreboard (a host reads "5 of 7" and rightly asks why "when" is two
  // of them). They are now one area, "Date & time", handled only when BOTH the date
  // is set AND the start time is confirmed. The gap still surfaces its own action in
  // the queue — the cue below is "Add the event date" until there's a date, then
  // "Set the start time" — and that action still routes to the editor that drives the
  // run of show and the vendor briefs. Merged for the COUNT; not lost from the queue.
  const _hasDate = !!String(ev.date || '').trim();
  const _timeOk = (() => { try { return startTimeIsConfirmed(ev); } catch (_e) { return false; } })();
  // Priority splits by which half is open: a MISSING DATE is the #1 foundation (everything
  // counts back from it, priority 1); a merely-unconfirmed start time is a real but low-stakes
  // gap (priority 9, same as when it was its own area — it surfaces without crowding the venue,
  // the food or the guest count).
  add('datetime', true, _hasDate && _timeOk,
    !_hasDate ? 'Add the event date to time the plan'
      : String(ev.startTime || '').trim() ? 'Confirm the start time' : 'Set the start time',
    !_hasDate ? { tab: 'Event Details', focusField: 'event-date' } : { tab: 'Event Details', focusField: 'event-start' },
    !_hasDate ? 1 : 9);
  // Location essential uses the ONE shared reader (eventLocationStatus) — an
  // at-home host with their city on file has a location (weather and shopping
  // already run off it); only a truly missing location is a readiness gap.
  // (Todd's report: home-hosted event was nagged 'Add the location' while the
  // app was simultaneously using Atlanta, GA for its own features.)
  add('location', true, eventLocationStatus(ev) !== 'missing', 'Add the location', { tab: 'Event Details', focusField: 'event-venue' }, 5);
  const gc = (() => { try { return guestCountResolved(ev); } catch { return { resolved: false }; } })();
  // A real named guest list — even with replies still pending — IS the host
  // having set a count: it's a real floor number, informative on its own.
  // guestCountResolved()'s stricter "zero pending RSVPs" bar is correct for
  // ITS purpose (finalizing food/seating quantities) but was leaking into
  // this essential too, leaving "Set the guest count" open indefinitely
  // right after a host chose "By guest list" and named real people — the
  // one moment they'd already taken real, visible action.
  const hasCount = num(ev.guestCount) > 0 || num(ev.guestEstimate) > 0 || gc.resolved
    || (Array.isArray(ev.guests) && ev.guests.length > 0);
  add('headcount', true, hasCount, 'Set the guest count', { tab: 'Guests', focusField: 'guests-entry' }, 8);

  // Time-independent essentials below are skipped for no-date events only when
  // they are time-dependent (shopping urgency); decisions still count.
  let plan = null; try { plan = playbookFoodPlan(ev); } catch { plan = null; }
  const usesFood = !!(plan && Array.isArray(plan.list) && plan.list.length);
  // ROW-LEVEL CTA RULE (Todd, 2026-07-07): no cue lands on a tab, screen, or
  // plan-section top — every route targets the exact row/field of the next
  // action. Dietary → the allergies & diets gate card; shopping → the FIRST
  // unbought line (foodFocus expands the spread + group and highlights it).
  // FOOD — the label and the predicate must describe the same thing.
  // This area is called "Food", but `handled` was ONLY `plan.dietaryResolved` — so a
  // host who had noted allergies but never decided what they were serving read as
  // Food ✓. The label said food; the bar said dietary.
  // The app already knows the difference: the food sheet itself renders "3 decisions
  // open" for menu picks the host hasn't made (a choice falls back to a DEFAULT for
  // rendering, but `event.foodChoices[id]` is what the host actually chose). Food is
  // handled when the menu decisions are made AND the dietary question is answered.
  const foodPicks = (ev.foodChoices && typeof ev.foodChoices === 'object') ? ev.foodChoices : {};
  const openChoices = plan ? (plan.choices || []).filter(c => c && foodPicks[c.id] == null) : [];
  const dietaryDone = !!(plan && plan.dietaryResolved);
  const foodHandled = openChoices.length === 0 && dietaryDone;
  add('food', usesFood && hasCount, foodHandled,
    openChoices.length > 0
      ? `Decide what you're serving · ${openChoices.length} open`
      : 'Note dietary needs on the food plan',
    openChoices.length > 0
      ? { tab: 'Planning', focusField: 'food-plan' }
      : { tab: 'Planning', focusField: `fp-diet-${ev.id}` },
    6,
    // WAVE-6: the exact choice records the "N open" count claims — the same ids
    // playbookDecisionBoard rows carry, so record-level dedup can subtract the
    // ones the decisions surface raises individually instead of double-counting.
    openChoices.length > 0 ? { records: openChoices.map((c) => c.id) } : null);

  // Shopping only becomes an essential inside the final week — a full cart in
  // month two is not a readiness gap.
  if (!noDate && daysOut != null && daysOut <= 7 && usesFood && hasCount) {
    const got = (ev.foodGot && typeof ev.foodGot === 'object') ? ev.foodGot : {};
    const unboughtItems = plan.list.filter(i => i && !i.skipped && !got[i.id]);
    const unbought = unboughtItems.length;
    add('shopping', true, unbought === 0, `Buy the remaining items · ${unbought} left`,
      unbought ? { tab: 'Planning', foodFocus: unboughtItems[0].id } : { tab: 'Planning', focusField: 'food-plan' }, 6);
  }

  // Vendors — only when the host uses vendors; first-undone routing.
  const vendors = (Array.isArray(ev.vendors) ? ev.vendors : []).filter(v => v && String(v.name || '').trim());
  if (vendors.length) {
    // POP-1C: canonical status predicate (was a regex that missed 'Deposit
    // Paid'); the unpaid-deposit guard stays as this surface's extra concern.
    // The area dot is "handled" ONLY when the vendor is fully locked in (same
    // predicate the "Confirm vendor" action uses) — "Deposit Paid" is one rung
    // short, so it reads as open (grey), never green-with-a-pending-confirm.
    const gap = vendors.find(v => !isVendorConfirmed(v)
      || (num(v.depositAmt) > 0 && v.depositPaid !== true));
    // Route even when handled — the chip is also review-navigation to the area,
    // not only a fix-the-gap link (host: every area chip should open its area).
    add('vendors', true, !gap, gap ? `Follow up with ${gap.name}` : null, gap ? { tab: 'Vendors', vendorId: gap.id } : { tab: 'Vendors' }, 7);
  }

  // Rain plan — outdoor-relevant events only.
  const outdoor = OUTDOOR_TYPE.test(String(ev.type || '')) || (() => { try { return isLikelyOutdoor(venueFor(ev).name, ev.notes); } catch { return false; } })();
  if (outdoor && !noDate) {
    const rp = (() => { try { return rainPlanStatus(ev); } catch { return { hasPlan: false }; } })();
    add('rain', true, rp.hasPlan, 'Add a rain backup', { tab: 'Event Details', focusField: 'rain-plan' }, 5);
  }

  // Crab order — crab events with a plan started (CRAB-PRICING-1 handled state).
  try {
    if (ev.crabPlan) {
      const crab = buildCrabPlan(ev);
      if (crab.relevant && (crab.lines || []).length) add('crabs', true, crab.handled, 'Finish the crab order', { tab: 'Planning', focusField: 'crab-plan' }, 6);
    }
  } catch { /* skip */ }

  // Optional goods: count only once they EXIST (they never manufacture a gap).
  // BUDGET — SSOT #1 / R4. This was `add('budget', true, true, ...)`: handled was
  // the literal `true`, so once a host typed any number the Budget area could NEVER
  // be a gap again. It was either absent from the ledger or permanently green — it
  // could not report an overspend even in principle, and a green Budget dot sat on
  // events with thousands owed. Presence of a number is not control of the money.
  //
  // Honest bar: a budget is handled while the KNOWN costs still fit inside it.
  // Known costs = hostSpending().committed (food/supplies/capacity/crab + entered
  // rows) PLUS what is owed to committed vendors — the term hostSpending has never
  // had, which is why every host money surface was blind to vendor balances. Both
  // numbers come from canonical sources; neither is re-derived here.
  if (num(ev.totalBudget) > 0) {
    // C1: hostSpending().committed NOW INCLUDES what is owed to vendors (it had no
    // vendor term at all until then, which is why this used to add vendorOutstanding
    // separately). Adding it again here would double-count the balance — caught by
    // this file's own test 11c. One source: read `committed` and nothing else.
    const money = (() => { try { return hostSpending(ev); } catch { return null; } })();
    const knownCosts = money ? num(money.committed) : 0;
    const totalBudget = num(ev.totalBudget);
    const over = Math.round(knownCosts - totalBudget);
    add('budget', true, over <= 0,
      over > 0 ? `Known costs are $${over.toLocaleString()} over your budget` : null,
      { tab: 'Budget' }, 9);
  }
  if (String(ev.must_have_moment || '').trim()) add('moment', true, true, null, null, 9);

  const total = items.length;
  const done = items.filter(i => i.handled).length;
  const left = total - done;

  // ── WHEN DOES THIS LEDGER NEXT CHANGE? (board finding, 2026-08-03) ──────────
  //
  // THE DENOMINATOR MOVES. Shopping is not an essential until the final week
  // (see the `daysOut <= 7` gate above), so a host reading "5 of 5 handled" at 43
  // days becomes "5 of 6" on day 7 — having done nothing wrong, and having been
  // told nothing. Every completion claim this ledger supports is therefore a claim
  // with a fuse, and the surfaces had no way to know it.
  //
  // This is the fuse, named. DERIVED from the same condition that gates the axis,
  // read forward instead of now — never a guess, and null whenever nothing is
  // pending (the axis is already counted, or can never apply to this event).
  //
  // A completion state MUST print this. "Settled" without "until when" is the
  // defect; "settled until Sep 12, when the shopping list opens" is the fix.
  const nextLedgerChange = (() => {
    if (noDate || daysOut == null) return null;
    // Shopping is the only date-gated axis today. If another is added, it joins here.
    if (!(daysOut > 7 && usesFood && hasCount)) return null;
    const start = String(ev.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
    const d = new Date(start + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { date: iso, days: daysOut - 7, id: 'shopping', what: 'the shopping list opens' };
  })();
  const label = noDate ? 'Planning setup' : 'Planning readiness';
  // SSOT #1 / R4 — a claim must not outrun its own scope. This said "Ready for
  // event day", which is a claim about the EVENT. The ledger is only the areas that
  // APPLY: an event type with no food playbook never adds Food or Shopping, so an
  // event carrying nothing but a date, a location and a headcount printed
  // "3 of 3 · Ready for event day" — nothing was planned, and the app called it
  // ready. Excluding inapplicable areas is correct (that is the denominator-honesty
  // rule this file already documents); what was wrong is CLAIMING THE WHOLE EVENT
  // off a partial ledger. The count now names its own scope. The genuine
  // "you're set" moment belongs to the engine, which can see every open action
  // (see lib/exhaleGate) — not to a checklist that cannot.
  const summary = noDate && !String(ev.date || '').trim()
    ? 'Add the event date to time the plan'
    : left === 0 ? `All ${total} part${total === 1 ? '' : 's'} of your plan handled` : `${done} of ${total} parts of your plan handled`;
  return {
    phase, label, completedCount: done, totalCount: total,
    progress: total ? done / total : 0,
    summary,
    nextCue: pickCue(items),
    // The date this ledger's DENOMINATOR next moves, or null. Additive; a reader
    // that ignores it is unchanged, but a surface claiming completion must not.
    nextLedgerChange,
    // The per-essential ledger behind the counts — same rows pickCue ranks.
    // Additive: readers that only want the counts are unaffected.
    items,
  };
}

// ── THE CUE'S ACTION LABEL (host ruling 2026-07-28: no "Do this" CTAs) ───────
// Every cue used to carry `actionLabel: 'Go'`, and the two CommandCenter tiers
// that render a cue as the hero hard-coded "Take me to it" over the top of it —
// a label that describes the HOST moving, not the work. The cue id set is small
// and closed, so each one can name its own destination as an act.
//
// Deliberately NOT the cueLabel: the cue label is already the hero TITLE, and a
// button that repeats the headline verbatim is the same overlap the hero/voice
// audit removed. Title says what's open; the button says where the work is.
const CUE_ACTIONS = {
  datetime: 'Open the date',
  location: 'Open the place',
  headcount: 'Open guests',
  food: 'Open the food plan',
  shopping: 'Open the list',
  vendors: 'Open vendors',
  rain: 'Open the backup plan',
  budget: 'Open your money',
  payments: 'Open vendors',
  thankyous: 'Open guests',
  rentals: 'Open the rentals',
  'ros-next': 'Open the day plan',
};
export const cueActionLabel = (cue) =>
  (cue && CUE_ACTIONS[cue.id]) || (cue && CUE_ACTIONS[cue.source]) || 'Open the plan';

// One cue: nearest meaningful finishable step, spec priority order.
function pickCue(items) {
  const open = items.filter(i => !i.handled && i.cueLabel && i.route);
  if (!open.length) return null;
  const best = open.sort((a, b) => (a.priority || 9) - (b.priority || 9))[0];
  return {
    id: best.id, label: best.cueLabel, route: best.route, source: best.id,
    actionLabel: CUE_ACTIONS[best.id] || 'Open the plan',
  };
}

// ── Live event — the day's cues, never stale planning gaps ────────────────────
function liveProgress(ev, now) {
  let ros = []; try { ros = (effectiveRos(ev) || []).filter(r => r && r.segment); } catch { ros = []; }
  const timed = ros.filter(r => r.time).sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const mins = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t)); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nextSeg = timed.find(r => { const m = mins(r.time); return m != null && m > nowMin; });
  const total = timed.length;
  // SSOT #1 / R4 — ELAPSED TIME IS NOT DONE. This used to count the cues whose
  // clock time had PASSED (`past.length`) as completed, so on event day the bar
  // filled itself and the header said "Cake handled" because 4pm arrived — not
  // because anyone cut the cake. By 9pm it read "All cues run — enjoy the rest"
  // to a host who had ticked nothing. The run of show carries a REAL per-cue flag
  // (event.rosDone, overlaid by effectiveRos) — the same one the day-of hero reads.
  // The clock still says what's NEXT; only the host says what's DONE.
  const doneRows = timed.filter(r => r.done);
  const done = doneRows.length;
  const open = total - done;
  const lastDone = doneRows[doneRows.length - 1];
  const summary = total === 0
    ? 'Event day — run it your way'
    : open === 0
      ? 'All cues run — enjoy the rest'
      : nextSeg
        ? `${lastDone ? `${lastDone.segment} handled · ` : ''}${nextSeg.segment} next`
        : `${open} cue${open === 1 ? '' : 's'} still open`;
  return {
    phase: 'live_event', label: 'Event flow', completedCount: done, totalCount: total,
    progress: total ? done / total : 0,
    summary,
    nextCue: nextSeg ? { id: 'ros-next', label: `Next: ${nextSeg.segment}${nextSeg.time ? ` · ${nextSeg.time}` : ''}`, actionLabel: 'Open the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' }, source: 'ros' } : null,
    items: [], // live day has no essentials rail — the run of show owns the rows
  };
}

// ── Post-event — closeout only; stale planning is retired ─────────────────────
function postProgress(ev) {
  const items = [];
  const vendors = (Array.isArray(ev.vendors) ? ev.vendors : []).filter(v => v && String(v.name || '').trim());
  const unpaid = vendors.find(v => num(v.cost) > 0 && v.balancePaid !== true && (v.depositPaid === true || v.contractSigned === true || /confirmed|booked|contracted/i.test(String(v.status || ''))));
  if (vendors.some(v => num(v.cost) > 0)) {
    items.push({ id: 'payments', handled: !unpaid, cueLabel: unpaid ? `Settle up with ${unpaid.name}` : null, route: unpaid ? { tab: 'Vendors', vendorId: unpaid.id } : null, priority: 1 });
  }
  const confirmed = (Array.isArray(ev.guests) ? ev.guests : []).filter(g => g && /^y/i.test(String(g.rsvp || '')));
  if (confirmed.length) {
    const thanked = confirmed.filter(g => g.thankYouSent === true).length;
    items.push({ id: 'thankyous', handled: thanked >= confirmed.length, cueLabel: `Send thank-yous · ${confirmed.length - thanked} left`, route: { tab: 'Guests', focusField: `guests-invites-${ev.id}` }, priority: 3 });
  }
  let cap = null; try { cap = playbookCapacity(ev); } catch { cap = null; }
  const rented = cap && Array.isArray(cap.groups)
    ? cap.groups.flatMap(g => g.items || []).filter(i => i && i.kind === 'rent' && (ev.capacityChecked || {})[i.key])
    : [];
  if (rented.length) {
    const returned = (ev.rentalsReturned === true);
    items.push({ id: 'rentals', handled: returned, cueLabel: 'Return the rentals', route: { tab: 'Planning', focusField: `cap-hero-${ev.id}` }, priority: 2 });
  }
  const total = items.length;
  const done = items.filter(i => i.handled).length;
  // SSOT #1 / R4 — ZERO IS NOT DONE (UX_08: "zero is a value, null is missing").
  // `progress: total ? done/total : 1` rendered an EMPTY ledger as a full green bar
  // and "All wrapped up" — on an event where no vendor cost was ever entered, no
  // RSVPs were tracked and no rentals were checked, so there was nothing to wrap
  // and nothing was wrapped. An empty ledger means we have nothing TRACKED, which
  // is not the same claim as "you're finished". preProgress (line ~143) already
  // gets this right with `: 0` — this is now consistent with it.
  return {
    phase: 'post_event', label: 'Wrap-up', completedCount: done, totalCount: total,
    progress: total ? done / total : 0,
    summary: total === 0
      ? 'Nothing tracked to wrap up'
      : (total - done) === 0 ? 'All wrapped up' : `${total - done} thing${total - done === 1 ? '' : 's'} left`,
    nextCue: pickCue(items),
    items,
  };
}
