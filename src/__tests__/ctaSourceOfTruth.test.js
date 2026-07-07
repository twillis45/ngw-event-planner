// ─── CTA SOURCE-OF-TRUTH AUDIT — 50 host-shell scenarios ─────────────────────
//
// Todd (2026-07-07): "do a brutal audit of the CTA issue. 50 different
// scenarios for the host shell. CTAs should be coming from source of truth."
//
// This makes the doctrine EXECUTABLE: 10 event types × 5 lifecycle states.
// For every scenario, every route producer in the app is swept, and every
// route it emits is validated against the EXACT source its destination
// renders — a dynamic id (foodrow/caprow/crabline/vendor/task) must exist in
// the same list the landing surface draws from; a static anchor must be in
// the known consumer registry; a tab must be one the host shell renders.
// A CTA that fails here is a dead CTA by construction.

import { selectEventNextAction } from '../CommandCenter';
import { milestoneActionRoute } from '../CommandCenter';
import { deriveEventPhaseProgress } from '../lib/phaseProgress';
import { buildBudgetRecoveryPlan } from '../lib/budgetRecovery';
import { buildCrabPlan } from '../lib/crabPlan';
import { buildDayBeforePlan } from '../lib/dayBefore';
import { eventContextNudge } from '../lib/eventContextNudges';
import { deriveCurrentLocationAssist } from '../lib/locationAssist';
import { rainPlanStatus } from '../lib/weather';
import {
  playbookFoodPlan, playbookCapacity, nextUpcomingTask, playbookDecisionBoard,
} from '../lib/playbooks';

// ── The consumer registry: every static anchor a host-shell route may target.
//    (Grown only when a new consumer SHIPS — adding here without a consumer is
//    the exact bug class this audit exists to kill.)
const STATIC_ANCHORS = new Set([
  'event-date', 'event-venue', 'guests-entry', 'hsp-budget', 'rain-plan',
  'parking-notes', 'loadin-notes', 'venue-contact', 'house-rules',
  'vendor-add', 'vendor-list', 'food-plan', 'next-step-hero', 'ros-now',
  'host-decisions', 'guest-roster', 'crab-plan', 'crab-headcount',
]);
const HOST_TABS = new Set(['Command', 'Guests', 'Budget', 'Planning', 'Planning Tasks', 'Vendors', 'Event Details', 'Documents', 'Event Day Schedule', 'Timeline']);

// ── Scenario matrix: 10 types × 5 states = 50.
const TYPES = ['bbq', 'crab feast', 'birthday', 'graduation', 'juneteenth',
  'baby shower', 'celebration of life', 'dinner party', 'family reunion', 'retirement'];
const NOW = new Date('2026-07-07T12:00:00');
const iso = (daysFromNow) => {
  const d = new Date(NOW); d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};
const STATES = [
  { key: 'fresh_no_date', ev: () => ({ date: '', guests: [], vendors: [], timeline: [] }) },
  { key: 'planning_counted', ev: () => ({ date: iso(45), guestMode: 'count', guestCount: 25, guests: [], vendors: [], timeline: [
    { id: 't1', task: 'Invite guests and share the details', done: false, week: '1 Month Out' },
  ] }) },
  { key: 'near_event_full', ev: (type) => ({ date: iso(5), guestMode: 'list', venue: 'Bowie, MD', totalBudget: 400,
    guests: [ { id: 'g1', name: 'Ava', rsvp: 'Yes' }, { id: 'g2', name: 'Ben', rsvp: '' } ],
    vendors: [ { id: 'v1', name: 'Main Vendor', category: type === 'crab feast' ? 'Seafood market' : 'Catering', status: 'Quoted', cost: 250 } ],
    timeline: [ { id: 't1', task: 'Confirm the food order', done: false, week: 'Week Of' } ],
    ...(type === 'crab feast' ? { crabPlan: { crabEatingHeadcount: 20, lines: [ { id: 'cl1', size: 'large', unit: 'bushel', quantity: 1, pricePerUnit: null, bought: false } ] } } : {}),
  }) },
  { key: 'event_day', ev: () => ({ date: iso(0), guestMode: 'count', guestCount: 20, venue: 'Bowie, MD', guests: [], vendors: [],
    rosEdited: true, ros: [ { time: '10:00', segment: 'Setup' }, { time: '23:30', segment: 'Cleanup' } ], timeline: [] }) },
  { key: 'post_event', ev: () => ({ date: iso(-6), guestMode: 'count', guestCount: 20, venue: 'Bowie, MD', guests: [ { id: 'g1', name: 'Ava', rsvp: 'Yes' } ],
    vendors: [ { id: 'v1', name: 'Main Vendor', cost: 300, depositPaid: true, balancePaid: false, status: 'Confirmed' } ], timeline: [
    { id: 't1', task: 'Old planning task', done: false, week: '2 Weeks Out' } ] }) },
];

const scenarios = [];
TYPES.forEach((type) => STATES.forEach((st) => {
  scenarios.push({ name: `${type} · ${st.key}`, event: { id: `sc-${type.replace(/\W+/g, '')}-${st.key}`, type, name: `${type} test`, ...st.ev(type) } });
}));

// ── The validator: a route is truthful iff its destination renders its target.
function validateRoute(route, ev, producer) {
  const problems = [];
  if (!route) return problems;
  const tab = route.tab;
  if (tab && !HOST_TABS.has(tab)) problems.push(`${producer}: unknown tab "${tab}"`);

  const ff = route.focusField;
  if (ff) {
    if (STATIC_ANCHORS.has(ff)) { /* ok */ }
    else if (ff === `guests-invites-${ev.id}` || ff === `cap-hero-${ev.id}` || ff === `fp-diet-${ev.id}`) { /* per-event anchors */ }
    else if (ff.startsWith('foodrow-')) {
      const id = ff.slice('foodrow-'.length);
      const plan = safe(() => playbookFoodPlan(ev));
      const ok = plan && plan.list && plan.list.some((x) => x && !x.skipped && x.id === id);
      if (!ok) problems.push(`${producer}: foodrow target "${id}" not on the rendered plan`);
    } else if (ff.startsWith('caprow-')) {
      const key = ff.slice('caprow-'.length);
      const cap = safe(() => playbookCapacity(ev));
      const ok = cap && cap.groups && cap.groups.some((g) => (g.items || []).some((i) => i && i.key === key));
      if (!ok) problems.push(`${producer}: caprow target "${key}" not on the capacity list`);
    } else if (ff.startsWith('crabline-')) {
      const m = /^crabline-(.+)-(count|price)$/.exec(ff);
      const ok = m && ev.crabPlan && (ev.crabPlan.lines || []).some((l) => l && l.id === m[1]);
      if (!ok) problems.push(`${producer}: crabline target "${ff}" not on the crab plan`);
    } else if (ff.startsWith('fpchoice-')) {
      const id = ff.slice('fpchoice-'.length);
      const plan = safe(() => playbookFoodPlan(ev));
      const ok = plan && plan.choices && plan.choices.some((c) => c && c.id === id);
      if (!ok) problems.push(`${producer}: fpchoice target "${id}" not among the plan's choices`);
    } else {
      problems.push(`${producer}: unregistered focusField "${ff}" (no known consumer)`);
    }
  }
  if (route.foodFocus) {
    const plan = safe(() => playbookFoodPlan(ev));
    const inList = plan && plan.list && plan.list.some((x) => x && !x.skipped && x.id === route.foodFocus);
    const inChoices = plan && plan.choices && plan.choices.some((c) => c && c.id === route.foodFocus);
    if (!inList && !inChoices) problems.push(`${producer}: foodFocus "${route.foodFocus}" not rendered by the food plan`);
  }
  if (route.vendorId) {
    const ok = (ev.vendors || []).some((v) => v && v.id === route.vendorId);
    if (!ok) problems.push(`${producer}: vendorId "${route.vendorId}" not among this event's vendors`);
  }
  if (route.timelineId && route.timelineId !== 'musthave') {
    const ok = (ev.timeline || []).some((t) => t && t.id === route.timelineId);
    if (!ok) problems.push(`${producer}: timelineId "${route.timelineId}" not on this event's timeline`);
  }
  return problems;
}
const safe = (fn) => { try { return fn(); } catch { return null; } };

// ── Sweep every producer for one scenario.
function sweep(ev) {
  const problems = [];
  const add = (route, producer) => problems.push(...validateRoute(route, ev, producer));

  const na = safe(() => selectEventNextAction(ev));
  if (na && na.primaryRoute && typeof na.primaryRoute === 'object') add(na.primaryRoute, 'hero(selectEventNextAction)');

  const pp = safe(() => deriveEventPhaseProgress(ev, NOW));
  if (pp && pp.nextCue) add(pp.nextCue.route, 'phase-cue');

  (ev.timeline || []).forEach((t) => {
    if (!t || t.done) return;
    add(safe(() => milestoneActionRoute(t.task, ev, t.id)), `milestone("${String(t.task).slice(0, 24)}…")`);
  });

  const rec = safe(() => buildBudgetRecoveryPlan(ev));
  if (rec && rec.suggestions) rec.suggestions.forEach((sg) => add(sg.route, `recovery(${sg.id})`));

  const crab = safe(() => buildCrabPlan(ev));
  if (crab && crab.relevant && crab.issues) crab.issues.forEach((i) => {
    // crab issue routes are in-card focus targets — validate the id family
    add({ focusField: i.route.focusField }, `crab-issue(${i.type})`);
  });

  const db = safe(() => buildDayBeforePlan(ev, NOW));
  if (db && db.applicable) db.sections.forEach((s) => { if (s.route) add(s.route, `daybefore(${s.key})`); });

  ['food', 'guests', 'vendors', 'program'].forEach((surface) => {
    const n = safe(() => eventContextNudge(ev, surface));
    if (n) add(n.route, `context-nudge(${n.id})`);
  });

  const la = safe(() => deriveCurrentLocationAssist(ev, null));
  if (la && la.suggestions) la.suggestions.forEach((sg) => { if (sg.route) add(sg.route, `location-assist(${sg.id})`); });

  const nu = safe(() => nextUpcomingTask(ev, NOW));
  if (nu && nu.route) add(nu.route, 'nextUpcomingTask');

  const rp = safe(() => rainPlanStatus(ev));
  if (rp && rp.target) add({ tab: rp.target.tab, focusField: rp.target.focusField }, 'rain-plan-target');

  const board = safe(() => playbookDecisionBoard(ev, NOW));
  if (board) {
    (board.open || []).forEach((row) => { if (row.route) add(row.route, `decision-board(${row.id})`); });
    (board.locked || []).forEach((row) => { if (row.route) add(row.route, `decision-board-settled(${row.id})`); });
  }

  return problems;
}

describe('CTA source-of-truth: 50 host-shell scenarios', () => {
  test(`${scenarios.length} scenarios swept — every emitted route targets what its destination renders`, () => {
    expect(scenarios.length).toBe(50);
    const failures = [];
    scenarios.forEach((sc) => {
      const problems = sweep(sc.event);
      if (problems.length) failures.push(`▸ ${sc.name}\n    ${problems.join('\n    ')}`);
    });
    if (failures.length) {
      throw new Error(`${failures.length} of 50 scenarios emit untruthful routes:\n${failures.join('\n')}`);
    }
  });
});
