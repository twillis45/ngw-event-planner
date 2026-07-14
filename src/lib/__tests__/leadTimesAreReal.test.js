// LEAD TIMES ARE REAL — nothing in this app was EVER overdue.
//
// Not one task, on any event, ever. The playbooks author real lead times (crabFeast's
// "Pre-order the crabs by size and count" is `when: 'T-5d'`) and the contract broke in
// transit:
//
//   playbookChecklist WROTE   week: taskPhaseLabel(offset)   →  'Week of'
//   every consumer READ       /T-(\d+)\s*d/.exec(task.week)  →  never matched
//                       or    PHASE_OFFSET[task.week]        →  keys are 'Week Of'
//                                                               (TitleCase, and
//                                                               '2 Weeks Out' vs
//                                                               '2 weeks out')
//
// So isTaskOverdue was permanently false, overdueCount permanently 0, the readiness
// engine's decision axis permanently "No open decisions", classifyTemplateTaskUrgency
// permanently 'standard', and the day-of "N things still open" alert could never fire.
// A host who never pre-ordered the crabs was never told.

import { taskLeadDays, taskDueInDays, taskIsOverdue, taskIsDueSoon, taskDueLabel, taskWasReachable } from '../taskLead';
import { playbookChecklist } from '../playbooks';
import { computeDayAlerts } from '../dayAlerts';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return iso(d); };

describe('the checklist emits a lead a consumer can actually read', () => {
  test('THE REGRESSION: every generated task carries a numeric leadDays', () => {
    const ev = { id: 'e', type: 'Crab Feast', date: inDays(30), guestCount: 18, guestMode: 'count' };
    const tasks = playbookChecklist(ev) || [];
    expect(tasks.length).toBeGreaterThan(3);

    // Before the fix, EVERY one of these was unreadable: `week` was prose and nothing
    // else survived. A single unreadable lead is the whole bug.
    for (const t of tasks) {
      expect({ task: t.task, lead: taskLeadDays(t) }).toEqual({ task: t.task, lead: expect.any(Number) });
    }
  });

  test('the crab pre-order keeps its authored T-5d lead', () => {
    const ev = { id: 'e', type: 'Crab Feast', date: inDays(30), guestCount: 18, guestMode: 'count' };
    const preorder = (playbookChecklist(ev) || []).find(t => /pre-?order the crabs/i.test(t.task || ''));
    expect(preorder).toBeTruthy();
    expect(taskLeadDays(preorder)).toBe(-5);
  });
});

describe('overdue is real, and honest about whose fault it is', () => {
  const task = (over = {}) => ({ id: 't', task: 'Pre-order the crabs', leadDays: -5, done: false, ...over });

  test('a T-5d task on an event 10 days out is NOT overdue', () => {
    const ev = { date: inDays(10) };
    expect(taskDueInDays(task(), ev)).toBe(5);
    expect(taskIsOverdue(task(), ev)).toBe(false);
  });

  test('the same task 2 days out IS overdue — this could never fire before', () => {
    const ev = { date: inDays(2) };
    expect(taskDueInDays(task(), ev)).toBe(-3);
    expect(taskIsOverdue(task(), ev)).toBe(true);
  });

  test('a done task is never overdue', () => {
    expect(taskIsOverdue(task({ done: true }), { date: inDays(2) })).toBe(false);
  });

  test('due-soon is a real window', () => {
    expect(taskIsDueSoon(task(), { date: inDays(7) })).toBe(true);   // due in 2
    expect(taskIsDueSoon(task(), { date: inDays(30) })).toBe(false); // due in 25
  });

  test('a host who booked LATE is not blamed for a window they never had', () => {
    // Event created 3 days out. A T-5d task was never reachable — that is a tight
    // timeline, not the host being late, and blaming them is how an app gets ignored.
    const ev = { date: inDays(1), createdAt: new Date(Date.now() - 2 * 86400000).toISOString() };
    expect(taskWasReachable(task(), ev)).toBe(false);
    expect(taskIsOverdue(task(), ev)).toBe(false);
  });

  test('a host who had the runway IS told', () => {
    const created = new Date(); created.setDate(created.getDate() - 60);
    const ev = { date: inDays(1), createdAt: created.toISOString() };
    expect(taskWasReachable(task(), ev)).toBe(true);
    expect(taskIsOverdue(task(), ev)).toBe(true);
  });
});

describe('a closed window does not masquerade as "today"', () => {
  // The old dueLabel() returned 'today' for ANY dueInDays <= 0, so a pre-order 13 days
  // past its window still read "Buy the crabs — 4 bushels today". It never said the
  // window had closed. A closed window is a different problem and the host deserves to
  // know which one they have.
  test('past its window says so, and names the gap', () => {
    const t = { leadDays: -14, done: false };
    expect(taskDueLabel(t, { date: inDays(1) })).toBe('13 days past its window');
  });
  test('due today still says today', () => {
    expect(taskDueLabel({ leadDays: -5, done: false }, { date: inDays(5) })).toBe('today');
  });
});

describe('legacy tasks with only a prose label still resolve', () => {
  // Tasks persisted before leadDays existed carry only 'Week of' / 'Day before'. They
  // map back to their own bucket — lossy, but honest, and not a guess dressed as precision.
  test.each([
    ['Day of', 0],
    ['Day before', -1],
    ['Week of', -7],
    ['2 weeks out', -14],
    ['1 month out', -31],
  ])('%s → %i', (week, lead) => {
    expect(taskLeadDays({ week })).toBe(lead);
  });

  test('an unknown label is null, NOT zero — zero would read as "due today"', () => {
    expect(taskLeadDays({ week: 'whenever' })).toBeNull();
    expect(taskIsOverdue({ week: 'whenever', done: false }, { date: inDays(1) })).toBe(false);
  });
});

describe('the day-of alert stack can finally fire', () => {
  test('open overdue tasks reach computeDayAlerts on the event day', () => {
    const ev = {
      id: 'e', type: 'Crab Feast', date: inDays(0), guestCount: 18, guestMode: 'count',
      vendors: [], guests: [],
      timeline: [
        { id: 't1', task: 'Pre-order the crabs', leadDays: -5, done: false },
        { id: 't2', task: 'Buy the Old Bay', leadDays: -3, done: false },
      ],
    };
    const alerts = computeDayAlerts(ev) || [];
    expect(JSON.stringify(alerts)).toMatch(/still open|open/i);
  });
});
