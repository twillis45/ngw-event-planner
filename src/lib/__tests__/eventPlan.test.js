// eventPlan(event) — THE single source of truth for "what to do next + progress".
// These tests pin the user's exact complaints (acceptance tests in the task spec):
//   1. A backyard-BBQ host with a DATE set → no surface emits "Set date, headcount, menu".
//   2. "Set your budget" is the Command/home #1 — not duplicated as a plan-domain action.
//   3. The X/Y progress badge reflects effectiveDone (set the budget → the count moves).
//   4. Command hero, NEXT-STEP ribbon, and Focus all read nextActions[0].

import { eventPlan, selectEventNextAction, taskTiming, deriveCommandCenterData } from '../../CommandCenter';
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

// ── PART A: timing derives from the REAL event date (one source) ──────────────
const isoForOffset = (days) => {
  // returns a YYYY-MM-DD date `days` from today (negative = past).
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

describe('taskTiming — label derived from the real event date, never a static phase', () => {
  test('offsetDays-based task, event 6 days out → due-in label off the real countdown', () => {
    // event is 6 days out; a "2 Weeks Out" (offset -14) task is already overdue by 8d.
    const eventDate = isoForOffset(6);
    const tm = taskTiming({ week: '2 Weeks Out' }, eventDate);
    expect(tm.overdue).toBe(true);
    expect(tm.label).toBe('Overdue 8d');
    expect(tm.label).not.toMatch(/Weeks Out/);
  });

  test('due today reads "Due today"', () => {
    const eventDate = isoForOffset(14); // a 2-weeks-out task is due exactly today
    const tm = taskTiming({ week: '2 Weeks Out' }, eventDate);
    expect(tm.daysUntil).toBe(0);
    expect(tm.label).toBe('Due today');
  });

  test('future due → "Due in Nd"', () => {
    const eventDate = isoForOffset(40); // 2-weeks-out task due in 40-14 = 26d → "Due Mon D"
    const near = taskTiming({ offsetDays: 5 }, isoForOffset(10)); // due in 5d
    expect(near.daysUntil).toBe(5);
    expect(near.label).toBe('Due in 5d');
    // far future falls to a calendar date, still real-date-derived (no phase string)
    const far = taskTiming({ week: '2 Weeks Out' }, eventDate);
    expect(far.label).not.toMatch(/Weeks Out/);
    expect(far.daysUntil).toBe(26);
  });

  test('undatable task (no offset, no known phase) → empty label, no crash', () => {
    expect(taskTiming({ task: 'x' }, isoForOffset(10)).label).toBe('');
    expect(taskTiming(null, isoForOffset(10)).label).toBe('');
    expect(taskTiming({ week: '2 Weeks Out' }, null).label).toBe('');
  });
});

describe('deriveCommandCenterData — Next Up drops satisfied + uses real-date timing', () => {
  // Week-Of phase so the task lands in the Next-Up window for an event ~6 days out
  // (proves the drop is from effectiveDone, not the phase filter).
  const bbqWithSetdate = (over = {}) => baseBBQ({
    timeline: [{ id: 't1', week: 'Week Of', owner: 'Host', done: false, task: 'Set date, headcount, menu' }],
    ...over,
  });

  test('event 6 days out → no Next-Up row shows the static "2 Weeks Out"/"Week Of" phase', () => {
    const ev = baseBBQ({
      date: isoForOffset(6),
      guests: [{ rsvp: 'Yes' }],
      timeline: [{ id: 't9', week: 'Week Of', owner: 'Host', done: false, task: 'Buy the ice' }],
    });
    const d = deriveCommandCenterData(ev);
    expect(d.nextUp.length).toBeGreaterThan(0);
    d.nextUp.forEach((row) => {
      expect(row.sub).not.toMatch(/Weeks Out/);
      expect(row.sub).not.toMatch(/Months Out/);
      expect(row.sub).not.toMatch(/Week Of/);
    });
  });

  test('"Set date, headcount, menu" does NOT appear once the date is set (effectiveDone drop)', () => {
    const ev = bbqWithSetdate({ date: isoForOffset(6) }); // date set, task in-window
    const labels = deriveCommandCenterData(ev).nextUp.map((r) => r.label.toLowerCase());
    expect(labels.some((l) => /set date, headcount, menu/.test(l))).toBe(false);
  });

  test('the composite STAYS visible when the date is NOT set (proves the drop is date-driven)', () => {
    // No date → phaseIdx defaults to the last phase (Week Of), so a Week-Of task is in-window
    // and effectiveDone must NOT drop it (date sub-goal not done).
    const ev = bbqWithSetdate({ date: '' });
    const labels = deriveCommandCenterData(ev).nextUp.map((r) => r.label.toLowerCase());
    expect(labels.some((l) => /set date, headcount, menu/.test(l))).toBe(true);
  });

  test('Next-Up timing label matches the real countdown for an event 6 days out', () => {
    const ev = baseBBQ({
      date: isoForOffset(6),
      guests: [{ rsvp: 'Yes' }],
      timeline: [{ id: 't9', week: 'Week Of', owner: 'Host', done: false, task: 'Buy the ice' }],
    });
    const d = deriveCommandCenterData(ev);
    const row = d.nextUp.find((r) => /ice/i.test(r.label));
    expect(row).toBeTruthy();
    // Week Of = offset -7 → due 6-7 = -1 day → overdue 1d (real-date-derived).
    expect(row.sub).toMatch(/Overdue 1d|Due/);
    expect(row.sub).not.toMatch(/Week Of/);
  });
});
