// PHASE-PROGRESS-GRADIENT-1 — the header bar means readiness for the CURRENT
// phase: honest counts of chosen workflows only, one goal-gradient cue max,
// no scores, no fake percentages, no counting suppressed panels.

import { deriveEventPhaseProgress } from '../phaseProgress';

const NOW = new Date('2026-07-10T15:00:00');
const base = (over = {}) => ({ id: 'e-pp', type: 'dinner party', date: '2026-07-20', venue: 'Home', guestMode: 'count', guestCount: 12, guests: [], vendors: [], timeline: [], ...over });

test('1 · pre-event label is Planning readiness with honest counts', () => {
  const p = deriveEventPhaseProgress(base(), NOW);
  expect(p.phase).toBe('pre_event');
  expect(p.label).toBe('Planning readiness');
  // R4: the summary NAMES ITS SCOPE. It used to say "Ready for event day" — a claim
  // about the whole event — off a ledger that only contains the areas that APPLY.
  expect(p.summary).toMatch(/\d of \d areas handled|All \d areas? handled/);
  expect(p.summary).not.toMatch(/Ready for event day/);
  expect(JSON.stringify(p)).not.toMatch(/%|percent|score|confidence/i);
});

// R4 — ELAPSED TIME IS NOT DONE. This test used to assert the BUG: with NOW at
// 15:00 and Setup scheduled for 14:00 (and nobody having ticked it), it expected
// "Setup handled". The bar counted cues whose CLOCK TIME had passed as completed,
// so on event day it filled itself and congratulated a host who had done nothing.
// The run of show carries a real per-cue flag (event.rosDone). The clock says
// what's NEXT; only the host says what's DONE.
test('2 · event-day flow: a cue whose time has PASSED is not "handled" until the host says so', () => {
  const rosEvent = (over = {}) => base({
    date: '2026-07-10', rosEdited: true,
    ros: [{ id: 'c1', time: '14:00', segment: 'Setup' }, { id: 'c2', time: '16:00', segment: 'Food service' }],
    ...over,
  });

  // 15:00 — Setup's slot has passed, but nobody ticked it. It is NOT handled.
  const untouched = deriveEventPhaseProgress(rosEvent(), NOW);
  expect(untouched.phase).toBe('live_event');
  expect(untouched.label).toBe('Event flow');
  expect(untouched.completedCount).toBe(0);
  expect(untouched.progress).toBe(0);
  expect(untouched.summary).toBe('Food service next');
  expect(untouched.summary).not.toMatch(/Setup handled/);
  expect(untouched.nextCue.label).toMatch(/Next: Food service/);
  expect(untouched.nextCue.route).toEqual({ tab: 'Event Day Schedule', focusField: 'ros-now' });

  // The host actually ticks Setup → NOW it is handled, and the bar moves.
  const ticked = deriveEventPhaseProgress(rosEvent({ rosDone: { c1: true } }), NOW);
  expect(ticked.completedCount).toBe(1);
  expect(ticked.summary).toBe('Setup handled · Food service next');
});

test('2b · the clock running past every cue does NOT read as "all cues run"', () => {
  const late = new Date('2026-07-10T23:00:00');
  const p = deriveEventPhaseProgress(base({
    date: '2026-07-10', rosEdited: true,
    ros: [{ id: 'c1', time: '14:00', segment: 'Setup' }, { id: 'c2', time: '16:00', segment: 'Food service' }],
  }), late);
  // Both slots are long past; the host ticked nothing. The day is not "run".
  expect(p.completedCount).toBe(0);
  expect(p.summary).not.toMatch(/All cues run/);
  expect(p.summary).toBe('2 cues still open');
});

test('3 · post-event label is Wrap-up; stale planning gaps are retired', () => {
  const p = deriveEventPhaseProgress(base({ date: '2026-07-01', venue: '', vendors: [
    { id: 'v1', name: 'Caterer', cost: 500, depositPaid: true, balancePaid: false, status: 'Confirmed' },
  ] }), NOW);
  expect(p.phase).toBe('post_event');
  expect(p.label).toBe('Wrap-up');
  // no "Add the location" style cues post-event
  expect(JSON.stringify(p)).not.toMatch(/Add the location|guest count|rain backup/i);
  expect(p.nextCue.label).toMatch(/Settle up with Caterer/);
});

test('4 · missing date never fakes a phase', () => {
  const p = deriveEventPhaseProgress(base({ date: '' }), NOW);
  expect(p.phase).toBe('unknown');
  expect(p.label).toBe('Planning setup');
  expect(p.summary).toBe('Add the event date to time the plan');
  expect(p.nextCue.route).toEqual({ tab: 'Event Details', focusField: 'event-date' });
});

test('5-9 · host-choice suppression: no RSVP/vendor/rain counting for workflows not chosen', () => {
  const p = deriveEventPhaseProgress(base(), NOW); // count-only, vendorless, indoor type
  const ids = JSON.stringify(p);
  expect(ids).not.toMatch(/rsvp|repl(y|ies)/i);     // count-only guests
  expect(ids).not.toMatch(/vendor/i);               // vendorless
  expect(ids).not.toMatch(/rain/i);                 // indoor dinner party
});

test('10 · outdoor event counts the rain plan; handled once saved', () => {
  const open = deriveEventPhaseProgress(base({ type: 'bbq' }), NOW);
  expect(JSON.stringify(open)).toMatch(/rain backup/i);
  const saved = deriveEventPhaseProgress(base({ type: 'bbq', rainPlan: 'Carport' }), NOW);
  expect(saved.completedCount).toBeGreaterThan(open.completedCount);
});

// R4 — the doctrine is preserved, but sharpened. "Optional goods never manufacture
// a gap" was implemented as `add('budget', true, TRUE, ...)` — handled was the
// literal true, so Budget could NEVER be open once a number existed. It could not
// report an overspend even in principle, and a green Budget dot sat on events with
// thousands owed. Presence of a number is not control of the money.
// Now: PRESENCE still never opens a gap (a budget that covers the costs stays
// handled) — but a real OVERSPEND does, which is the whole point of a budget.
test('11 · a budget that covers the known costs is handled — presence alone never opens a gap', () => {
  const without = deriveEventPhaseProgress(base(), NOW);
  const withBoth = deriveEventPhaseProgress(base({ totalBudget: 50000, must_have_moment: 'The toast' }), NOW);
  expect(withBoth.totalCount).toBe(without.totalCount + 2);
  expect(withBoth.completedCount).toBe(without.completedCount + 2);
});

test('11b · a budget the known costs BLOW THROUGH is an open gap, and says by how much', () => {
  // A 12-person dinner party carries ~$864 of known food cost. $500 does not cover it.
  const over = deriveEventPhaseProgress(base({ totalBudget: 500 }), NOW);
  const budget = over.items.find(i => i.id === 'budget');
  expect(budget).toBeTruthy();
  expect(budget.handled).toBe(false);
  expect(budget.cueLabel).toMatch(/over your budget/);
  expect(over.summary).not.toMatch(/All \d areas? handled/);
});

test('11c · vendor balances count against the budget — the term hostSpending never had', () => {
  // Budget comfortably covers food ($864). The vendor owed $9,000 is what breaks it.
  const ev = base({
    totalBudget: 5000,
    vendors: [{ id: 'v1', name: 'Fired Up BBQ', status: 'Deposit Paid', cost: 9000, depositAmt: 1000, depositPaid: true }],
  });
  const p = deriveEventPhaseProgress(ev, NOW);
  const budget = p.items.find(i => i.id === 'budget');
  expect(budget.handled).toBe(false);          // $8,000 still owed to the vendor
  expect(budget.cueLabel).toMatch(/over your budget/);

  // Same event, vendor fully paid → nothing outstanding → budget fits again.
  const paid = deriveEventPhaseProgress({ ...ev, totalBudget: 15000 }, NOW);
  expect(paid.items.find(i => i.id === 'budget').handled).toBe(true);
});

test('13-15 · at most one cue, routed exactly, hidden when nothing is near-finishable', () => {
  const p = deriveEventPhaseProgress(base({ venue: '' }), NOW);
  expect(p.nextCue).toBeTruthy();
  expect(p.nextCue.route.tab).toBeTruthy();
  expect(Array.isArray(p.nextCue)).toBe(false); // one object, never a list
  const done = deriveEventPhaseProgress(base({ type: 'dinner party' }), NOW);
  if (done.completedCount === done.totalCount) expect(done.nextCue).toBeNull();
});

test('17 · no fake percentages or score words anywhere', () => {
  ['2026-07-20', '2026-07-10', '2026-07-01', ''].forEach(date => {
    const p = deriveEventPhaseProgress(base({ date }), NOW);
    expect(JSON.stringify(p)).not.toMatch(/\d+%|score|optimi[sz]e|AI |confidence|locked/i);
  });
});

test('18 · cue respects suppression: count-only host never gets an RSVP cue', () => {
  const p = deriveEventPhaseProgress(base({ guests: [{ name: 'A', rsvp: '' }, { name: 'B', rsvp: '' }] }), NOW);
  expect(p.nextCue == null || !/rsvp|repl/i.test(p.nextCue.label)).toBe(true);
});

test('20 · live phase outranks stale planning: cue is the next ROS segment, not a setup gap', () => {
  const p = deriveEventPhaseProgress(base({ date: '2026-07-10', venue: '', rosEdited: true, ros: [{ time: '16:00', segment: 'Toast' }] }), NOW);
  expect(p.nextCue.label).toMatch(/Toast/);
  expect(p.nextCue.label).not.toMatch(/location/i);
});

test('post-event thank-yous count confirmed guests with thankYouSent flags', () => {
  const p = deriveEventPhaseProgress(base({ date: '2026-07-01', guests: [
    { name: 'A', rsvp: 'Yes', thankYouSent: true }, { name: 'B', rsvp: 'Yes' },
  ] }), NOW);
  expect(JSON.stringify(p)).toMatch(/Send thank-yous · 1 left/);
});

test('shopping becomes an essential only inside the final week', () => {
  const far = deriveEventPhaseProgress(base({ type: 'bbq', date: '2026-08-20' }), NOW);
  const near = deriveEventPhaseProgress(base({ type: 'bbq', date: '2026-07-14' }), NOW);
  const has = (p) => JSON.stringify(p).includes('Buy the remaining items');
  expect(has(far)).toBe(false);
  // near-week bbq with a real count has an unbought spread
  expect(near.totalCount).toBeGreaterThanOrEqual(far.totalCount);
});

// ROW-LEVEL CTA RULE (Todd, 2026-07-07): no cue lands on a tab, screen, or
// plan-section top — the route names the exact row/field of the next action.
test('shopping cue routes to the FIRST unbought line, never the food-plan section top', () => {
  const p = deriveEventPhaseProgress(base({ type: 'bbq', date: '2026-07-14', rainPlan: 'Carport', dietaryNoted: true }), NOW);
  expect(p.nextCue).toBeTruthy();
  expect(p.nextCue.label).toMatch(/Buy the remaining items/);
  expect(p.nextCue.route.tab).toBe('Planning');
  expect(p.nextCue.route.foodFocus).toBeTruthy();      // a real food-line id
  expect(p.nextCue.route.focusField).toBeUndefined();  // not the section anchor
});

test('dietary cue routes to the allergies & diets gate, not the food plan top', () => {
  const p = deriveEventPhaseProgress(base({ type: 'bbq', date: '2026-08-20', rainPlan: 'Carport' }), NOW);
  expect(p.nextCue).toBeTruthy();
  expect(p.nextCue.label).toMatch(/dietary/i);
  expect(p.nextCue.route).toEqual({ tab: 'Planning', focusField: 'fp-diet-e-pp' });
});

test('headcount essential: a real named guest list counts as "set", even with replies pending', () => {
  // A host who chose "By guest list" and named real people has taken real,
  // visible action — the essential shouldn't stay open just because nobody
  // has replied yet (that's guestCountResolved's stricter, separate concern
  // for finalizing food/seating quantities, not this planning-readiness cue).
  const noCount = deriveEventPhaseProgress(base({ guestMode: 'list', guestCount: undefined, guests: [] }), NOW);
  expect(noCount.nextCue && noCount.nextCue.id).toBe('headcount');

  const pendingReplies = deriveEventPhaseProgress(base({
    guestMode: 'list', guestCount: undefined,
    guests: [{ name: 'Alex', rsvp: '' }, { name: 'Sam', rsvp: '' }],
  }), NOW);
  expect(pendingReplies.nextCue && pendingReplies.nextCue.id).not.toBe('headcount');
});

// R4 — ZERO IS NOT DONE (UX_08: "zero is a value, null is missing").
// postProgress used `progress: total ? done/total : 1` — an EMPTY wrap-up ledger
// rendered a full green bar and "All wrapped up", on an event where no vendor cost
// was entered, no RSVPs were tracked and no rentals were checked. Nothing was
// wrapped; there was simply nothing tracked. Those are different claims.
test('R4 · an empty post-event ledger is NOT 100% "All wrapped up"', () => {
  const after = new Date('2026-07-25T12:00:00');
  const p = deriveEventPhaseProgress(base({ date: '2026-07-20', vendors: [], guests: [] }), after);
  expect(p.phase).toBe('post_event');
  expect(p.totalCount).toBe(0);
  expect(p.progress).toBe(0);                       // was 1 — a full green bar on nothing
  expect(p.summary).toBe('Nothing tracked to wrap up');
  expect(p.summary).not.toMatch(/All wrapped up/);
});

test('R4 · a real post-event ledger still reaches "All wrapped up" when genuinely done', () => {
  const after = new Date('2026-07-25T12:00:00');
  const p = deriveEventPhaseProgress(base({
    date: '2026-07-20',
    vendors: [{ id: 'v1', name: 'Fired Up BBQ', status: 'Confirmed', cost: 1000, balancePaid: true }],
  }), after);
  expect(p.totalCount).toBe(1);
  expect(p.progress).toBe(1);
  expect(p.summary).toBe('All wrapped up');
});
