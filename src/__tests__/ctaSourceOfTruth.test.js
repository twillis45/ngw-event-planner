// ─── CTA SOURCE-OF-TRUTH AUDIT — 100 host-shell scenarios ────────────────────
//
// Todd (2026-07-07): "do a brutal audit of the CTA issue. 50 different
// scenarios for the host shell. CTAs should be coming from source of truth."
// Expanded to 100 on Todd's ask (2026-07-07): 5 more states covering the
// configurations the first matrix never hit — over-budget with helper-assigned
// dishes, the day-before window, RSVP-list pressure, vendor-heavy gaps, and
// outdoor/no-rain with a city-only location.
//
// This makes the doctrine EXECUTABLE: 10 event types × 10 lifecycle states.
// For every scenario, every route producer in the app is swept, and every
// route it emits is validated against the EXACT source its destination
// renders — a dynamic id (foodrow/caprow/crabline/vendor/task) must exist in
// the same list the landing surface draws from; a static anchor must be in
// the known consumer registry; a tab must be one the host shell renders.
// A CTA that fails here is a dead CTA by construction.

import { selectEventNextAction } from '../CommandCenter';
import { milestoneActionRoute } from '../CommandCenter';
import { checklistRouteFor } from '../lib/taskRoute';
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
import { ROUTESHEET_TABS } from '../lib/routeResolver';

// ── The consumer registry: every static anchor a host-shell route may target.
//    (Grown only when a new consumer SHIPS — adding here without a consumer is
//    the exact bug class this audit exists to kill.)
const STATIC_ANCHORS = new Set([
  // 'event-start' ships WITH its consumer (2026-07-14): HostShellV2's wiredKind maps
  // focusField 'event-start' (and the phase ledger's 'starttime' domain) to the DATE editor,
  // which now captures the start time beside the date it belongs to. Added here only because
  // the destination renders — which is the whole rule this list exists to enforce.
  'event-date', 'event-start', 'event-venue', 'guests-entry', 'hsp-budget', 'rain-plan',
  'parking-notes', 'loadin-notes', 'venue-contact', 'house-rules',
  'vendor-add', 'vendor-list', 'food-plan', 'next-step-hero', 'ros-now',
  'host-decisions', 'guest-roster', 'crab-plan', 'crab-headcount',
]);
// 'Risks' ships WITH its consumer (2026-07-14): routeSheet now has a real branch for it, and
// the surface registry raises high-severity risks into the ranked list. Before this, the risk
// engine could reach exactly one passive index row — nothing could route to it, so nothing
// could raise it. Added here only because the destination renders, which is the rule this list
// exists to enforce.
// 'Decisions' ships WITH its consumer too (wave-5/wave-6, 2026-07-15): HostShellV2's
// routeSheet has a real 'Decisions' branch (focuses the sheet on route.decisionId), and V1's
// EventPlanner renders Decisions as a first-class tab. This list lagged the shipped consumer;
// wave-6's band-1 due-date ordering legitimately promotes overdue decision raises to the hero,
// which is what exposed the staleness.
// DE-MIRRORED (2026-07-15, ENFORCEMENT-GAP-1): the routeSheet-owned portion of
// this allow-list is now DERIVED from lib/routeResolver.ROUTESHEET_TABS — the
// same constant the real resolver is bound to (routeExecution.test.js asserts
// every tab there actually resolves, and that every tab a surface raises is
// listed). Before this, HOST_TABS was hand-typed and could drift from routeSheet:
// a tab routeSheet stopped handling still read as valid here, a false pass — the
// exact bug-factory pattern this suite exists to kill, one layer up. Only the
// tabs routeSheet does NOT route to by tab-name (rendered surfaces reachable by
// other means) remain hand-listed. If routeSheet drops a tab, ROUTESHEET_TABS
// shrinks and this set shrinks with it, so a producer emitting the now-orphaned
// tab fails here — the mirror can no longer lie.
const NON_ROUTESHEET_TABS = ['Command', 'Documents'];
const HOST_TABS = new Set([...ROUTESHEET_TABS, ...NON_ROUTESHEET_TABS]);

// ── Scenario matrix: 10 types × 10 states = 100.
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
  // ── Expansion states 6–10 (100-scenario matrix) ──────────────────────────────
  // Over budget WITH helper-assigned dishes — exercises the recovery plan's
  // assigned≠savings path and helper foodrow routes (HELPER-RESPONSIBILITY-1).
  { key: 'over_budget_helpers', ev: () => ({ date: iso(10), guestMode: 'count', guestCount: 30, venueKind: 'home', venueCity: 'Atlanta', venueState: 'GA',
    totalBudget: 50,
    foodAdd: [
      { id: 'fa-1', name: 'Dessert tray', owner: 'Aunt Lisa', cost: 60 },
      { id: 'fa-2', name: 'Bags of ice', owner: 'Marcus', cost: 20 },
    ],
    helperConfirmed: { 'fa-2': true },
    guests: [], vendors: [], timeline: [] }) },
  // The day-before window — buildDayBeforePlan applicable, with helpers, a
  // vendor gap, and a run of show (exercises the new helpers section route).
  { key: 'day_before', ev: () => ({ date: iso(1), guestMode: 'count', guestCount: 18, venue: 'Bowie, MD',
    foodAdd: [ { id: 'fa-db', name: 'Fruit platter', owner: 'Denise', cost: 0 } ],
    vendors: [ { id: 'v1', name: 'DJ Smooth', category: 'DJ', status: 'Quoted', cost: 200 } ],
    rosEdited: true, ros: [ { id: 'r1', time: '11:00', segment: 'Setup', type: 'setup', owner: 'Marcus', confirmed: false }, { id: 'r2', time: '13:00', segment: 'Guests arrive', type: 'event', owner: 'Host' } ],
    timeline: [ { id: 't1', task: 'Confirm the food order', done: false, week: 'Week Of' } ] }) },
  // RSVP-list pressure — a list-mode host with mostly-pending replies two weeks
  // out (exercises guest-facing cues without count-only suppression).
  { key: 'rsvp_list_pressure', ev: () => ({ date: iso(14), guestMode: 'list', venue: 'Bowie, MD', totalBudget: 600,
    guests: [
      { id: 'g1', name: 'Ava', rsvp: 'Yes' }, { id: 'g2', name: 'Ben', rsvp: '' },
      { id: 'g3', name: 'Cam', rsvp: '' }, { id: 'g4', name: 'Dee', rsvp: 'No' }, { id: 'g5', name: 'Eve', rsvp: '' },
    ],
    vendors: [], timeline: [ { id: 't1', task: 'Invite guests and share the details', done: false, week: '2 Weeks Out' } ] }) },
  // Vendor-heavy — three vendors in different gap states (unconfirmed, deposit
  // unpaid, no arrival time) — first-undone vendor routing everywhere.
  { key: 'vendor_heavy', ev: () => ({ date: iso(20), guestMode: 'count', guestCount: 40, venue: 'VFW Post 3150', venueAddress: '123 Main St, Alexandria, VA',
    totalBudget: 2000,
    vendors: [
      { id: 'v1', name: 'Soul Catering', category: 'Catering', status: 'Quoted', cost: 900 },
      { id: 'v2', name: 'DJ Smooth', category: 'DJ', status: 'Confirmed', cost: 400, depositAmt: 100, depositPaid: false },
      { id: 'v3', name: 'Party Rentals Co', category: 'Rentals', status: 'Booked', cost: 300, arrivalTime: '' },
    ],
    guests: [], timeline: [ { id: 't1', task: 'Follow up with the caterer', done: false, week: '3 Weeks Out' } ] }) },
  // Outdoor, no rain plan, city-only location — rain-plan routes + the
  // location-assist add-full-address suggestion (city_only branch).
  { key: 'outdoor_no_rain', ev: () => ({ date: iso(9), guestMode: 'count', guestCount: 25, venueKind: 'home',
    venueCity: 'Decatur', venueState: 'GA', indoorOutdoor: 'outdoor', rainPlan: '',
    guests: [], vendors: [], timeline: [ { id: 't1', task: 'Plan the backyard layout', done: false, week: '1 Week Out' } ] }) },
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
  // Field-drift lock (routing audit 2026-07-27): resolveRoute and routeUpNext
  // read `taskId`; a Timeline route carrying only `timelineId` passes the sweep
  // yet drops the row focus at the executor. Timeline routes must carry taskId.
  if (route.tab === 'Timeline' && route.timelineId && !route.taskId) {
    problems.push(`${producer}: Timeline route carries timelineId but not taskId — the executor reads taskId and drops the focus`);
  }
  if (route.taskId && route.taskId !== 'musthave' && route.taskId !== '__compressed__') {
    const ok = (ev.timeline || []).some((t) => t && t.id === route.taskId);
    if (!ok) problems.push(`${producer}: taskId "${route.taskId}" not on this event's timeline`);
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
    // The V2 checklist CTA producer rides the same sweep now (it used to be an
    // in-component keyword router the audit could not see — audit R2).
    const c = safe(() => checklistRouteFor(t.task, { week: t.week, category: t.category, taskId: t.id }, ev));
    if (c && c.route && !c.route.stage) add(c.route, `checklist("${String(t.task).slice(0, 24)}…")`);
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

// ── Anti-vacuity: the expansion states must actually EXERCISE the producers
//    they were added for — a state that emits no routes proves nothing.
describe('expansion states reach their target producers', () => {
  const evFor = (stateKey, type = 'bbq') => scenarios.find((s) => s.name === `${type} · ${stateKey}`).event;

  test('over_budget_helpers → recovery emits moves AND protects the unconfirmed helper dish', () => {
    const rec = buildBudgetRecoveryPlan(evFor('over_budget_helpers'));
    expect((rec.suggestions || []).length).toBeGreaterThan(0);
    expect((rec.protectedItems || []).some((p) => p.id === 'helper-fa-1')).toBe(true);
    expect((rec.suggestions || []).some((s) => String(s.id).includes('fa-1'))).toBe(false); // assigned ≠ savings
  });

  test('day_before → plan applicable with a routed helpers section', () => {
    const db = buildDayBeforePlan(evFor('day_before'), NOW);
    expect(db.applicable).toBe(true);
    const helpers = db.sections.find((s) => s.key === 'helpers');
    expect(helpers && helpers.route).toBeTruthy();
    expect(db.sections.filter((s) => s.route).length).toBeGreaterThan(2);
  });

  test('rsvp_list_pressure → a next action and phase cue exist to validate', () => {
    const ev = evFor('rsvp_list_pressure');
    expect(safe(() => selectEventNextAction(ev))).toBeTruthy();
    expect(safe(() => deriveEventPhaseProgress(ev, NOW))).toBeTruthy();
  });

  test('vendor_heavy → phase progress routes to a real gap vendor', () => {
    const pp = deriveEventPhaseProgress(evFor('vendor_heavy'), NOW);
    const cue = pp.nextCue;
    expect(cue).toBeTruthy();
    if (cue.route.vendorId) {
      expect(evFor('vendor_heavy').vendors.some((v) => v.id === cue.route.vendorId)).toBe(true);
    }
  });

  test('outdoor_no_rain → rain-plan and location-assist producers fire', () => {
    const ev = evFor('outdoor_no_rain');
    const pp = deriveEventPhaseProgress(ev, NOW);
    // outdoor + dated + no plan → the rain essential is in the denominator
    expect(pp.totalCount).toBeGreaterThan(3);
    const la = deriveCurrentLocationAssist(ev, null);
    expect(la.eventLocationStatus).toBe('city_only');
    expect(la.suggestions.some((s) => s.id === 'add-full-address')).toBe(true);
  });
});

describe('CTA source-of-truth: 100 host-shell scenarios', () => {
  test(`${scenarios.length} scenarios swept — every emitted route targets what its destination renders`, () => {
    expect(scenarios.length).toBe(100);
    const failures = [];
    scenarios.forEach((sc) => {
      const problems = sweep(sc.event);
      if (problems.length) failures.push(`▸ ${sc.name}\n    ${problems.join('\n    ')}`);
    });
    if (failures.length) {
      throw new Error(`${failures.length} of 100 scenarios emit untruthful routes:\n${failures.join('\n')}`);
    }
  });
});
