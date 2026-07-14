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

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const daysTo = (dateStr, now) => {
  if (!dateStr) return null;
  const d = new Date(String(dateStr) + 'T00:00:00');
  if (isNaN(d)) return null;
  const t = new Date(now); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};
const OUTDOOR_TYPE = /cookout|bbq|barbecue|fish fry|crab feast|crawfish|boil|picnic|day party|block party|tailgate|luau|beach|garden party|graduation|juneteenth|family reunion|reunion/i;

export function deriveEventPhaseProgress(event, now = new Date()) {
  const ev = event || {};
  const d = daysTo(ev.date, now);

  // ── Phase ───────────────────────────────────────────────────────────────────
  const phase = d == null ? 'unknown' : d > 0 ? 'pre_event' : d === 0 ? 'live_event' : 'post_event';

  if (phase === 'live_event') return liveProgress(ev, now);
  if (phase === 'post_event') return postProgress(ev);
  return preProgress(ev, phase, d);
}

// ── Pre-event (and unknown-date) — applicable essentials only ─────────────────
function preProgress(ev, phase, daysOut) {
  const noDate = phase === 'unknown';
  const items = [];
  const add = (id, applies, handled, cueLabel, route, priority) => {
    if (!applies) return;
    items.push({ id, handled: !!handled, cueLabel, route, priority });
  };

  // Always-applicable foundations.
  add('date', true, !!String(ev.date || '').trim(), 'Add the event date to time the plan', { tab: 'Event Details', focusField: 'event-date' }, 1);
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
  add('food', usesFood && hasCount, !!(plan && plan.dietaryResolved), 'Note dietary needs on the food plan', { tab: 'Planning', focusField: `fp-diet-${ev.id}` }, 6);

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
  const outdoor = OUTDOOR_TYPE.test(String(ev.type || '')) || (() => { try { return isLikelyOutdoor(ev.venue, ev.notes); } catch { return false; } })();
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
  if (num(ev.totalBudget) > 0) add('budget', true, true, null, { tab: 'Budget' }, 9);
  if (String(ev.must_have_moment || '').trim()) add('moment', true, true, null, null, 9);

  const total = items.length;
  const done = items.filter(i => i.handled).length;
  const left = total - done;
  const label = noDate ? 'Planning setup' : 'Planning readiness';
  const summary = noDate && !String(ev.date || '').trim()
    ? 'Add the event date to time the plan'
    : left === 0 ? 'Ready for event day' : `${done} of ${total} essentials handled`;
  return {
    phase, label, completedCount: done, totalCount: total,
    progress: total ? done / total : 0,
    summary,
    nextCue: pickCue(items),
    // The per-essential ledger behind the counts — same rows pickCue ranks.
    // Additive: readers that only want the counts are unaffected.
    items,
  };
}

// One cue: nearest meaningful finishable step, spec priority order.
function pickCue(items) {
  const open = items.filter(i => !i.handled && i.cueLabel && i.route);
  if (!open.length) return null;
  const best = open.sort((a, b) => (a.priority || 9) - (b.priority || 9))[0];
  return { id: best.id, label: best.cueLabel, actionLabel: 'Go', route: best.route, source: best.id };
}

// ── Live event — the day's cues, never stale planning gaps ────────────────────
function liveProgress(ev, now) {
  let ros = []; try { ros = (effectiveRos(ev) || []).filter(r => r && r.segment); } catch { ros = []; }
  const timed = ros.filter(r => r.time).sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const mins = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t)); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const past = timed.filter(r => { const m = mins(r.time); return m != null && m <= nowMin; });
  const nextSeg = timed.find(r => { const m = mins(r.time); return m != null && m > nowMin; });
  const total = timed.length;
  const done = past.length;
  const lastDone = past[past.length - 1];
  const summary = total === 0
    ? 'Event day — run it your way'
    : nextSeg
      ? `${lastDone ? `${lastDone.segment} handled · ` : ''}${nextSeg.segment} next`
      : 'All cues run — enjoy the rest';
  return {
    phase: 'live_event', label: 'Event flow', completedCount: done, totalCount: total,
    progress: total ? done / total : 0,
    summary,
    nextCue: nextSeg ? { id: 'ros-next', label: `Next: ${nextSeg.segment}${nextSeg.time ? ` · ${nextSeg.time}` : ''}`, actionLabel: 'Go', route: { tab: 'Event Day Schedule', focusField: 'ros-now' }, source: 'ros' } : null,
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
  return {
    phase: 'post_event', label: 'Wrap-up', completedCount: done, totalCount: total,
    progress: total ? done / total : 1,
    summary: total === 0 ? 'All wrapped up' : (total - done) === 0 ? 'All wrapped up' : `${total - done} thing${total - done === 1 ? '' : 's'} left`,
    nextCue: pickCue(items),
    items,
  };
}
