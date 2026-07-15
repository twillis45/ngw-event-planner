// eventPlan(event) — THE single source of truth for "what to do next + progress".
// These tests pin the user's exact complaints (acceptance tests in the task spec):
//   1. A backyard-BBQ host with a DATE set → no surface emits "Set date, headcount, menu".
//   2. "Set your budget" is the Command/home #1 — not duplicated as a plan-domain action.
//   3. The X/Y progress badge reflects effectiveDone (set the budget → the count moves).
//   4. Command hero, NEXT-STEP ribbon, and Focus all read nextActions[0].

import { eventPlan, selectEventNextAction, taskTiming, deriveCommandCenterData, _stripLeadingDateClause } from '../../CommandCenter';
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

  test('PAST-EVENT-1: a 6-year-past event never surfaces "N things need you" — agrees with the phase engine\'s "this one is behind you"', () => {
    const sixYearsAgo = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 6); return d.toISOString().slice(0, 10); })();
    const plan = eventPlan(baseBBQ({ date: sixYearsAgo, guests: [], vendors: [], budget: [] }));
    expect(plan.nextActions).toEqual([]);
    expect(plan.planningState.currentPriority).toBeNull();
    expect(plan.planningState.deepLink).toBeNull();
  });

  test('PAST-EVENT-1: an upcoming event with the same gaps still surfaces its real next actions (no over-suppression)', () => {
    const plan = eventPlan(baseBBQ({ guests: [], vendors: [], budget: [] }));
    expect(plan.nextActions.length).toBeGreaterThan(0);
  });

  test('PAST-EVENT-1: today (day 0) is not treated as past — still surfaces real actions', () => {
    const today = new Date().toISOString().slice(0, 10);
    const plan = eventPlan(baseBBQ({ date: today, guests: [], vendors: [], budget: [] }));
    expect(plan.nextActions.length).toBeGreaterThan(0);
  });

  test('null event → empty plan, never throws', () => {
    // POP-1/WOW-1: vendorReadiness + workstreams + vendorReadinessRollup are additive read-only fields.
    // WAVE-6 (2026-07-15): setAside added — eventPlan applies snooze itself now, and the
    // set-aside pile (snoozed items + comeback dates) rides out beside nextActions.
    // WAVE-7 (2026-07-15): worries added — the heads-up lane rides out beside them,
    // and the null-event/error backstop is worries: [] (same as setAside).
    expect(eventPlan(null)).toEqual({
      nextActions: [], setAside: [], worries: [], progress: { done: 0, total: 0 }, handled: [],
      vendorReadiness: { total: 0, booked: 0, confirmed: 0, toConfirm: 0, needsAttention: 0 }, workstreams: [],
      vendorReadinessRollup: {
        status: 'not_started', label: 'No vendors added yet', nextAction: 'Add your first vendor.',
        ctaLabel: 'Add vendor', target: { tab: 'Vendors', focusField: 'vendor-add' }, reason: null,
        counts: { total: 0, ready: 0, confirmed: 0, toConfirm: 0, needsAttention: 0, missing: 0 },
      },
      planningState: { currentPriority: null, currentWorkstream: null, currentMilestone: null, nextMilestone: null, blockedDecisions: [], recommendationLifecycle: undefined, deepLink: null, reasoning: null, confidence: undefined },
    });
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

  test('a stale "Set date, …" composite is stripped of its date clause when the date is set', () => {
    const dated = { date: future(40) };
    // date set → leading "date" clause dropped, connector preserved across forms.
    expect(_stripLeadingDateClause('Set date, headcount, menu', dated)).toBe('Set headcount, menu');
    expect(_stripLeadingDateClause('Set date, headcount & the steam-vs-order call', dated)).toBe('Set headcount & the steam-vs-order call');
    expect(_stripLeadingDateClause('Set date + window + rough headcount', dated)).toBe('Set window + rough headcount');
    // no date → never strip (defensive: a real "set date" stays when there genuinely is none).
    expect(_stripLeadingDateClause('Set date, headcount, menu', { date: '' })).toBe('Set date, headcount, menu');
    expect(_stripLeadingDateClause('Set date, headcount, menu', { date: 'TBD' })).toBe('Set date, headcount, menu');
    // not a date-led composite → untouched.
    expect(_stripLeadingDateClause('Lock the menu', dated)).toBe('Lock the menu');
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

  test('no item appears twice — ids unique; plan domains dedupe among themselves', () => {
    // UPDATED (re-audit F4, 2026-07-14): the surface registry now raises PER ITEM — three
    // high playbook risks are three actions sharing the 'surface:risks' domain, by design
    // (one-per-surface was silently dropping the second and third). Uniqueness lives on the
    // ID (which snooze also keys against); plan-area domains still dedupe one-per-area.
    const plan = eventPlan(baseBBQ({ guests: [{ rsvp: 'Yes' }] }));
    const ids = plan.nextActions.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    // UPDATED (wave-5 ranking, 2026-07-15): registry actions now carry their surface's
    // PLAIN domain ('vendors' | 'risks' | 'day') so the shell's domain lens can file
    // them — three risk raises legitimately share 'risks'. Exclude them by SOURCE
    // (the dedup/snooze key is the id, unchanged); plan-area domains still dedupe.
    const planDomains = plan.nextActions
      .filter(a => a.source !== 'surfaceRegistry')
      .map(a => a.domain).filter(Boolean);
    expect(new Set(planDomains).size).toBe(planDomains.length);
  });

  test('selectEventNextAction === eventPlan.nextActions[0] (same #1) — acceptance #4', () => {
    const ev = baseBBQ({ guests: [{ rsvp: 'Yes' }] }); // #1 = "Set your budget"
    const na = selectEventNextAction(ev);
    const top = eventPlan(ev).nextActions[0];
    // The wrapper renders the SAME action the plan leads with (title parity).
    expect(na.title).toBe(top.title);
  });
});

// ── WAVE-7 (2026-07-15): THE WORRY LANE — worries leave nextActions in the ENGINE ──
// The split used to live only in the V2 shell (HostShellV2 isWorry), so every other
// consumer — V1 heroes, mayExhale, App.js auto-route, the reveal's step count,
// planningState — spoke the worry-INCLUSIVE head. CONTRACT: eventPlan(event) returns
// `worries` (risks-surface raises at 'attention'; bundle:risks wholesale) and
// nextActions EXCLUDES them everywhere. Worries keep the full action shape — they
// are actionable heads-ups, just uncounted and unranked.

import { SURFACES } from '../surfaceRegistry';
import { playbookFoodPlan, playbookRisks } from '../playbooks';

const isoLocal = (n) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// A risk-bearing fixture: the Crab Feast playbook raises 2 high risks (r_supply,
// r_seafood) from the moment the event exists.
const riskFeast = (over = {}) => ({
  id: 'w7-feast', type: 'Crab Feast', name: 'Feast', date: isoLocal(20),
  guestMode: 'count', guestCount: 18, guestEstimate: 18, totalBudget: 1500,
  venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
  startTime: '14:00', startTimeSource: 'host',
  guests: [], vendors: [], timeline: [], ...over,
});

// Every essential handled, must-have captured — the risk surface is the ONLY
// raiser left, so this is the only-worries event. (Same construction as
// severityBand.test.js's quietRetirement.)
const onlyWorries = () => {
  const base = {
    id: 'w7-only', recordKind: 'host_event', type: 'Retirement Party', name: 'Ret',
    date: isoLocal(40), startTime: '14:00',
    venueKind: 'venue', venue: 'The Ironwood Room', venueCity: 'Annapolis', venueState: 'MD',
    rainPlan: 'Indoors — the Ironwood Room is covered.',
    guestMode: 'count', guestCount: 40, totalBudget: 8000, dietaryNoted: true,
    must_have_moment: 'The toast from her old unit.',
    budget: [{ id: 'b1', category: 'Venue', budgeted: 3000, actual: 3000 }],
    timeline: [], guests: [],
    vendors: [{
      id: 'v1', name: 'Fired Up BBQ', category: 'Catering', status: 'Confirmed',
      contractSigned: true, contractFileName: 'contract.pdf',
    }],
  };
  const fp = playbookFoodPlan(base);
  const foodChoices = {};
  (fp && fp.choices ? fp.choices : []).forEach((c) => { foodChoices[c.id] = c.chosen != null ? c.chosen : (c.options && c.options[0]); });
  return { ...base, foodChoices };
};

describe('WAVE-7 — worries are excluded from nextActions, everywhere', () => {
  test('a risk-bearing event: the raises land in worries, never in nextActions', () => {
    const plan = eventPlan(riskFeast());
    // The raises exist and file as worries…
    expect(plan.worries.length).toBeGreaterThan(0);
    const flat = plan.worries.flatMap((w) => (w.kind === 'bundle' ? w.items : [w]));
    for (const w of flat) {
      expect(w.surface).toBe('risks');
      expect(String(w.level)).toBe('attention');
      // Full action shape — an actionable heads-up, just uncounted and unranked.
      expect(w.id).toBeTruthy();
      expect(w.title).toMatch(/^Have a plan for:/i);
      expect(w.route && w.route.tab).toBe('Risks');
      expect(w.route.riskId).toBeTruthy();
      expect(w.cta).toBeTruthy();
    }
    // …and nextActions carries NONE of them (no count/hero/badge bills a worry).
    for (const a of plan.nextActions) {
      expect(a.surface === 'risks').toBe(false);
      expect(String(a.title)).not.toMatch(/^Have a plan for:/i);
    }
  });

  test('ONLY worries → nextActions [], selectEventNextAction null (V1 may exhale), worries N', () => {
    const ev = onlyWorries();
    const plan = eventPlan(ev);
    expect(plan.nextActions).toEqual([]);           // no calm filler beside a live heads-up
    expect(plan.worries.length).toBeGreaterThan(0);
    // ≥3 risk raises bundle — the risks bundle is a worry WHOLESALE.
    const bundle = plan.worries.find((w) => w.id === 'bundle:risks');
    if (bundle) {
      expect(bundle.kind).toBe('bundle');
      expect(bundle.level).toBe('attention');
    }
    // The hero is honestly silent — mayExhale call sites read this truthiness.
    expect(selectEventNextAction(ev)).toBeNull();
    // planningState speaks the worry-exclusive head (null here) — the V2
    // grounding line and the App.js auto-route both read these fields.
    expect(plan.planningState.currentPriority).toBeNull();
    expect(plan.planningState.reasoning).toBeNull();
    expect(plan.planningState.deepLink).toBeNull();
  });

  test('dismissing the risks (riskStatus, the worry dismissal lane) restores the calm line', () => {
    const base = onlyWorries();
    const riskStatus = {};
    (((playbookRisks(base) || {}).items) || []).forEach((r) => { riskStatus[r.id] = 'dismissed'; });
    const plan = eventPlan({ ...base, riskStatus });
    expect(plan.worries).toEqual([]);
    expect(plan.nextActions).toHaveLength(1);       // the single calm line returns
    expect(['neutral', 'calendar', 'heart']).toContain(plan.nextActions[0].category);
  });

  test('a CRITICAL from the risks surface stays in nextActions — a critical never files as a worry', () => {
    // No in-repo raiser produces a critical risk today (risk raises are
    // attention-only by doctrine), so pin the FILTER LOGIC with a synthetic
    // surface entry: same surface id, escalated severity.
    const synthetic = {
      id: 'risks', label: 'What could go wrong', domain: 'risks',
      route: { tab: 'Risks' },
      bundleTitle: (n) => `Have a plan for ${n} things that could go wrong`,
      raise: () => [{
        severity: 'critical', title: 'RISK ESCALATED: the caterer cancelled for event day',
        why: 'Reactive, real, now — work, not a worry.',
        route: { tab: 'Risks', riskId: 'r_synthetic' }, key: 'r_synthetic',
      }],
    };
    SURFACES.push(synthetic);
    try {
      // Dismiss one real risk so the risks group stays under the ≥3 bundle
      // threshold — this pins the per-item filter itself, not bundle mechanics.
      // (A mixed bundle would carry the critical and stay in nextActions whole:
      // a critical never files as a worry, bundled or not.)
      const plan = eventPlan(riskFeast({ id: 'w7-crit', riskStatus: { r_supply: 'dismissed' } }));
      const inList = plan.nextActions.find((a) => a.id === 'surface:risks:r_synthetic');
      expect(inList).toBeTruthy();
      expect(inList.level).toBe('critical');
      // The attention-level risk raises still file as worries beside it.
      const flat = plan.worries.flatMap((w) => (w.kind === 'bundle' ? w.items : [w]));
      expect(flat.some((w) => w.id === 'surface:risks:r_synthetic')).toBe(false);
      expect(flat.length).toBeGreaterThan(0);
    } finally {
      SURFACES.splice(SURFACES.indexOf(synthetic), 1);
    }
  });

  test('backstop: a past event empties the worry lane too', () => {
    const plan = eventPlan(riskFeast({ date: isoLocal(-10) }));
    expect(plan.nextActions).toEqual([]);
    expect(plan.setAside).toEqual([]);
    expect(plan.worries).toEqual([]);
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
