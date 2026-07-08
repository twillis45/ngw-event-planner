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
  expect(p.summary).toMatch(/of \d essentials handled|Ready for event day/);
  expect(JSON.stringify(p)).not.toMatch(/%|percent|score|confidence/i);
});

test('2 · event-day label is Event flow driven by the run of show', () => {
  const p = deriveEventPhaseProgress(base({ date: '2026-07-10', rosEdited: true, ros: [
    { time: '14:00', segment: 'Setup' }, { time: '16:00', segment: 'Food service' },
  ] }), NOW);
  expect(p.phase).toBe('live_event');
  expect(p.label).toBe('Event flow');
  expect(p.summary).toBe('Setup handled · Food service next');
  expect(p.nextCue.label).toMatch(/Next: Food service/);
  expect(p.nextCue.route).toEqual({ tab: 'Event Day Schedule', focusField: 'ros-now' });
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

test('11 · optional goods (budget, moment) never manufacture a gap — they only add handled', () => {
  const without = deriveEventPhaseProgress(base(), NOW);
  const withBoth = deriveEventPhaseProgress(base({ totalBudget: 500, must_have_moment: 'The toast' }), NOW);
  expect(withBoth.totalCount).toBe(without.totalCount + 2);
  expect(withBoth.completedCount).toBe(without.completedCount + 2);
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
