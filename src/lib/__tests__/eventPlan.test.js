// eventPlan(event) — THE single source of truth for "what to do next + progress".
// These tests pin the user's exact complaints (acceptance tests in the task spec):
//   1. A backyard-BBQ host with a DATE set → no surface emits "Set date, headcount, menu".
//   2. "Set your budget" is the Command/home #1 — not duplicated as a plan-domain action.
//   3. The X/Y progress badge reflects effectiveDone (set the budget → the count moves).
//   4. Command hero, NEXT-STEP ribbon, and Focus all read nextActions[0].

import { eventPlan, selectEventNextAction } from '../../CommandCenter';
import { playbookAreaNextStep } from '../playbooks';

beforeEach(() => { try { localStorage.clear(); } catch {} });

// A future date ~40 days out so the engine isn't in any urgent buy/compression window.
const future = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const baseBBQ = (over = {}) => ({
  id: 'e-bbq',
  name: 'Backyard BBQ',
  type: 'Backyard BBQ',
  recordKind: 'host_event',
  date: future(40),
  guests: [],
  vendors: [],
  budget: [],
  timeline: [],
  ...over,
});

describe('eventPlan — shape & progress', () => {
  test('returns nextActions, progress, handled', () => {
    const plan = eventPlan(baseBBQ());
    expect(Array.isArray(plan.nextActions)).toBe(true);
    expect(plan.progress).toEqual(expect.objectContaining({ done: expect.any(Number), total: expect.any(Number) }));
    expect(Array.isArray(plan.handled)).toBe(true);
  });

  test('null event → empty plan, never throws', () => {
    expect(eventPlan(null)).toEqual({ nextActions: [], progress: { done: 0, total: 0 }, handled: [] });
  });

  test('progress.done counts a foundation domino satisfied by REAL state (no manual tick)', () => {
    const noBudget = eventPlan(baseBBQ({ guests: [{ rsvp: 'Yes' }] }));
    // Set the budget WITHOUT ticking any task — the count must go up (the "3/6" bug).
    const withBudget = eventPlan(baseBBQ({ guests: [{ rsvp: 'Yes' }], totalBudget: 1500 }));
    expect(withBudget.progress.done).toBeGreaterThan(noBudget.progress.done);
    expect(withBudget.handled).toEqual(expect.arrayContaining([expect.stringMatching(/Budget set/)]));
  });

  test('a fully-founded event has every foundation domino done', () => {
    const plan = eventPlan(baseBBQ({
      date: future(40),
      guests: [{ rsvp: 'Yes' }],
      totalBudget: 1500,
      foodChoices: { sourcing: 'host cooks' },
    }));
    expect(plan.progress.done).toBe(plan.progress.total);
  });
});

describe('eventPlan — state-aware foundation (no satisfied sub-goal in a next action)', () => {
  test('DATE set → no next action says "set date" (acceptance #1)', () => {
    const ev = baseBBQ({ date: future(40), guests: [{ rsvp: 'Yes' }] }); // date + guests in, budget out
    const titles = eventPlan(ev).nextActions.map(a => String(a.title).toLowerCase());
    expect(titles.some(t => /set the date|set date/.test(t))).toBe(false);
    // The composite playbook string must NEVER surface verbatim once the date is set.
    expect(titles.some(t => /set date, headcount, menu/.test(t))).toBe(false);
  });

  test('the "Set date, headcount, menu" composite never reaches the Plan-area next step', () => {
    // Budget area picks the playbook `planning` milestone (the composite). Once guests
    // exist it is satisfied and must drop out.
    const ev = baseBBQ({ date: future(40), guests: [{ rsvp: 'Yes' }] });
    const step = playbookAreaNextStep(ev, 'Budget');
    if (step) expect(step.action.toLowerCase()).not.toMatch(/set date, headcount, menu/);
  });

  test('budget done → "Set your budget" is no longer offered as a next action', () => {
    const ev = baseBBQ({ date: future(40), guests: [{ rsvp: 'Yes' }], totalBudget: 1500 });
    const titles = eventPlan(ev).nextActions.map(a => String(a.title).toLowerCase());
    expect(titles.some(t => /set your budget/.test(t))).toBe(false);
  });
});

describe('eventPlan — ordering, dedup, and the #1 = the hero everywhere', () => {
  test('brand-new event → #1 is the guest-list simple win (start tier)', () => {
    const plan = eventPlan(baseBBQ());
    expect(plan.nextActions.length).toBeGreaterThan(0);
    expect(String(plan.nextActions[0].title).toLowerCase()).toMatch(/guest/);
  });

  test('guests in, budget out → #1 is "Set your budget" (foundational ladder)', () => {
    const plan = eventPlan(baseBBQ({ guests: [{ rsvp: 'Yes' }] }));
    expect(String(plan.nextActions[0].title).toLowerCase()).toMatch(/budget/);
  });

  test('no domain appears twice in nextActions (deduped by domain)', () => {
    const plan = eventPlan(baseBBQ({ guests: [{ rsvp: 'Yes' }] }));
    const domains = plan.nextActions.map(a => a.domain);
    expect(new Set(domains).size).toBe(domains.length);
  });

  test('selectEventNextAction === eventPlan.nextActions[0] (same #1) — acceptance #4', () => {
    const ev = baseBBQ({ guests: [{ rsvp: 'Yes' }] }); // #1 = "Set your budget"
    const na = selectEventNextAction(ev);
    const top = eventPlan(ev).nextActions[0];
    // The wrapper renders the SAME action the plan leads with (title parity).
    expect(na.title).toBe(top.title);
  });
});
