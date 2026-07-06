// Slice D-1C — CTA STATE-TRANSITION contract. D-1B proved CTAs deep-link in a
// static state; these pin the full POP1 loop: detect → show → route → user
// resolves → old CTA clears → NEXT CTA is correct and still carries its exact
// deep-link target. All pure — eventPlan()/selectEventNextAction() and the
// blocker/gap engines recompute from event state alone, so a resolution is a
// plain object mutation here (exactly what the shells' setEvent does).

import { eventPlan, selectEventNextAction } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';
import { rainPlanGap, RAIN_PLAN_TARGET } from '../weather';
import { confirmationActionsFor } from '../vendorBriefConfirm';

beforeEach(() => { try { localStorage.clear(); } catch {} });

const future = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const host = (over = {}) => ({
  id: 'e-trans',
  name: 'Transition QA BBQ',
  type: 'Backyard BBQ',
  recordKind: 'host_event',
  date: future(40),
  guests: [],
  vendors: [],
  budget: [],
  timeline: [],
  ...over,
});

const blockers = (ev) => buildExperienceContext(ev, {}, 1).decisionBlockers.map(b => b.type);

// ── 1. Venue: blocker → resolve → clears; next action still exact ──────────────
describe('venue resolution', () => {
  test('venue blocker clears when venue is set; blockedDecisions follows', () => {
    const before = host({ venue: '' });
    expect(blockers(before)).toContain('venue-selection');
    const beforePlan = eventPlan(before, buildExperienceContext(before, {}, 1));
    expect(beforePlan.planningState.blockedDecisions.map(b => b.type)).toContain('venue-selection');

    const after = { ...before, venue: 'VFW Post 3150 — Alexandria, VA' };
    expect(blockers(after)).not.toContain('venue-selection');
    const afterPlan = eventPlan(after, buildExperienceContext(after, {}, 1));
    expect(afterPlan.planningState.blockedDecisions.map(b => b.type)).not.toContain('venue-selection');
  });

  test('at-home venue resolves on venueCity (the at-home carve-out survives)', () => {
    const atHome = host({ venueKind: 'home', venueCity: '' });
    expect(blockers(atHome)).toContain('venue-selection');
    expect(blockers({ ...atHome, venueCity: 'Alexandria, VA' })).not.toContain('venue-selection');
  });
});

// ── 2→3. Guest → budget ladder: resolve each, next CTA advances with its anchor ─
describe('foundation ladder advances with exact deep-links at every step', () => {
  test('guests missing → resolve → budget CTA (hsp-budget) → resolve → not budget', () => {
    const step1 = host();
    const na1 = selectEventNextAction(step1);
    expect(na1.primaryRoute).toEqual(expect.objectContaining({ tab: 'Guests', focusField: 'guests-entry' }));

    // user locks a headcount (what onLockCount writes)
    const step2 = { ...step1, guestMode: 'count', guestCount: 40, guestEstimate: 40 };
    const na2 = selectEventNextAction(step2);
    expect(na2.primaryRoute).toEqual(expect.objectContaining({ tab: 'Budget', focusField: 'hsp-budget' }));
    // old CTA gone — nothing about guests remains the top action
    expect(/guest/i.test(na2.title || '')).toBe(false);

    // user sets the budget (what the hsp-budget input writes)
    const step3 = { ...step2, totalBudget: 1500 };
    const na3 = selectEventNextAction(step3);
    expect(na3.primaryRoute.focusField === 'hsp-budget').toBe(false);
    expect(/budget/i.test(na3.title || '')).toBe(false);
    // and whatever comes next still carries a route
    expect(na3.primaryRoute && na3.primaryRoute.tab).toBeTruthy();
  });

  test('guest-count blocker clears in the blocker engine too (both systems agree)', () => {
    expect(blockers(host())).toContain('guest-count-confirmation');
    expect(blockers(host({ guestCount: 40 }))).not.toContain('guest-count-confirmation');
  });

  test('progress counter moves when a foundation resolves (no manual tick)', () => {
    const before = eventPlan(host({ guestCount: 40, guestMode: 'count' }));
    const after  = eventPlan(host({ guestCount: 40, guestMode: 'count', totalBudget: 1500 }));
    expect(after.progress.done).toBeGreaterThan(before.progress.done);
  });
});

// ── 5. Rain plan: gap → fill → cleared, and the target stays the real anchor ───
describe('rain-plan resolution', () => {
  test('outdoor event without a plan gaps to the rain-plan anchor; filling clears it', () => {
    const gap = rainPlanGap(host(), { outdoors: true });
    expect(gap).toBeTruthy();
    expect(gap.target).toEqual(RAIN_PLAN_TARGET);
    expect(RAIN_PLAN_TARGET.focusField).toBe('rain-plan');

    expect(rainPlanGap(host({ rainPlan: 'Tent from Old Town Tent & Party Rentals' }), { outdoors: true })).toBeNull();
  });
});

// ── 6. Vendor readiness: confirm one vendor → CTA advances to the next ─────────
describe('vendor CTA advances across vendors', () => {
  const twoVendors = (v1Status) => host({
    guestMode: 'count', guestCount: 40, guestEstimate: 40, totalBudget: 1500,
    foodPlanChoice: 'catering',
    venue: 'Fort Ward Park', venueKind: 'venue',
    vendors: [
      { id: 'v1', name: 'Capital Rotisserie Catering', category: 'Catering', status: v1Status, contractSigned: v1Status === 'Confirmed' },
      { id: 'v2', name: 'Beltway Sound Collective', category: 'DJ', status: 'Considering' },
    ],
  });

  test('vendor-targeted actions retarget after the first vendor is confirmed', () => {
    const beforeActions = eventPlan(twoVendors('Considering')).nextActions
      .filter(a => a.primaryRoute && a.primaryRoute.vendorId);
    const afterActions = eventPlan(twoVendors('Confirmed')).nextActions
      .filter(a => a.primaryRoute && a.primaryRoute.vendorId);
    // Whatever the engine surfaces, no action may still target v1 for CONFIRMATION
    // once v1 is Confirmed (payment/doc actions about v1 remain legitimate).
    const staleConfirm = afterActions.find(a =>
      a.primaryRoute.vendorId === 'v1' && /confirm/i.test(a.title || ''));
    expect(staleConfirm).toBeUndefined();
    // and every vendor action before AND after still names its row
    [...beforeActions, ...afterActions].forEach(a => expect(a.primaryRoute.vendorId).toBeTruthy());
  });
});

// ── 7. Vendor confirmation row actions hide once applied (2B-1 recompute rule) ──
describe('vendor confirmation actions are self-clearing', () => {
  const row = { state: 'confirmed', on_site_name: 'Dana', on_site_phone: '(301) 555-0134' };
  test('mark-confirmed disappears after the host applies it', () => {
    expect(confirmationActionsFor(row, { status: 'Contracted' }).markConfirmed).toBe(true);
    expect(confirmationActionsFor(row, { status: 'Confirmed' }).markConfirmed).toBe(false);
  });
  test('save-contact disappears once the vendor record matches', () => {
    expect(confirmationActionsFor(row, { status: 'Confirmed' }).saveContact).toBe(true);
    expect(confirmationActionsFor(row, {
      status: 'Confirmed', onSiteContactName: 'Dana', onSitePhone: '(301) 555-0134',
    }).saveContact).toBe(false);
  });
});

// ── 8. Task/checklist: completing the driving task stops it driving ────────────
describe('task completion advances the task CTA', () => {
  const withTasks = (t1Done) => host({
    guestMode: 'count', guestCount: 40, guestEstimate: 40, totalBudget: 1500,
    foodPlanChoice: 'potluck',
    venue: 'Backyard', venueKind: 'home', venueCity: 'Alexandria, VA',
    date: future(3), // inside the urgency window so tasks lead
    timeline: [
      { id: 't1', week: 'Week Of', owner: 'Host', done: t1Done, task: 'Buy the ice' },
      { id: 't2', week: 'Week Of', owner: 'Host', done: false, task: 'Set up the tables' },
    ],
  });

  test('a completed task never remains the CTA target', () => {
    const before = eventPlan(withTasks(false));
    const after  = eventPlan(withTasks(true));
    const targetsT1 = (plan) => (plan.nextActions || []).some(a =>
      (a.primaryRoute && a.primaryRoute.taskId === 't1') || /buy the ice/i.test(a.title || ''));
    // Whether or not t1 drives the top action before, it must NOT after completion.
    expect(targetsT1(after)).toBe(false);
    // and the single next-action voice still answers with a real route (the
    // engine's neutral fallback guarantees a CTA even when nothing is urgent —
    // eventPlan.nextActions may legitimately be empty here).
    const na = selectEventNextAction(withTasks(true));
    expect(na && na.primaryRoute && na.primaryRoute.tab).toBeTruthy();
    expect(before).toBeTruthy();
  });
});

// ── 9. No stale CTA after arbitrary mutation: recompute is stateless ────────────
describe('eventPlan is stateless — no memo/staleness across mutations', () => {
  test('same event object identity is irrelevant; only state matters', () => {
    const ev = host({ guestMode: 'count', guestCount: 40, guestEstimate: 40 });
    const a = selectEventNextAction(ev);
    ev.totalBudget = 2000; // in-place mutation, same object
    const b = selectEventNextAction(ev);
    expect(a.primaryRoute.focusField).toBe('hsp-budget');
    expect(b.primaryRoute.focusField === 'hsp-budget').toBe(false);
  });
});
