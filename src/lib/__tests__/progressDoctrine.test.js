// PROGRESS-2 — progress source-of-truth doctrine lock.
//
// THE RULE: exactly one canonical whole-event readiness source —
// wholeEventReadinessScore (CommandCenter). Everything else is scoped-local
// and must stay that way:
//   eventPlan().progress      → plan-essentials COUNT ("Plan 8/14"), never the header bar
//   vendor chips              → vendor-scoped ("X of Y confirmed")
//   task rows                 → task-scoped ("% complete · N overdue")
//   per-area rows / trackers  → named local state (capacity, thank-you, setup guide)
// These tests make the doctrine executable so future work can't silently
// present local progress as whole-event readiness.

import { wholeEventReadinessScore, eventPlan, deriveCommandCenterData } from '../../CommandCenter';

const future = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const host = (over = {}) => ({
  id: 'e-doct', name: 'Doctrine QA BBQ', type: 'Backyard BBQ',
  recordKind: 'host_event', date: future(30),
  guests: [], vendors: [], budget: [], timeline: [],
  ...over,
});

describe('one canonical whole-event source', () => {
  test('LOCAL tracker completion (capacityChecked) does NOT move whole-event readiness', () => {
    // capacityChecked is a display-only local tracker ("Seating & supplies") —
    // by doctrine it must never enter the whole-event score.
    const base = host({ timeline: [{ id: 't1', week: 'Week Of', owner: 'Host', done: false, task: 'Buy the ice' }] });
    const before = wholeEventReadinessScore(base);
    const after  = wholeEventReadinessScore({ ...base, capacityChecked: { chairs: true, tables: true, coolers: true } });
    expect(after).toBe(before);
  });

  test('whole-event readiness moves only through its applicable axes (tasks here)', () => {
    const open = host({ timeline: [{ id: 't1', week: 'Week Of', owner: 'Host', done: false, task: 'Buy the ice' }] });
    const done = host({ timeline: [{ id: 't1', week: 'Week Of', owner: 'Host', done: true,  task: 'Buy the ice' }] });
    expect(wholeEventReadinessScore(done)).toBeGreaterThanOrEqual(wholeEventReadinessScore(open));
  });
});

describe('local indicators stay scoped', () => {
  test('eventPlan().progress is a plan-essentials COUNT, never a percentage', () => {
    const p = eventPlan(host()).progress;
    expect(typeof p.done).toBe('number');
    expect(typeof p.total).toBe('number');
    expect(p.pct).toBeUndefined();       // no fake precision field
    expect(p.percent).toBeUndefined();
  });

  test('vendor stat copy is vendor-scoped ("of N confirmed"), never generic "ready"', () => {
    const data = JSON.stringify(deriveCommandCenterData(host({
      vendors: [
        { id: 'v1', name: 'Fork & Flower', category: 'Catering', status: 'Confirmed', contractSigned: true },
        { id: 'v2', name: 'Beltway Sound', category: 'DJ', status: 'Considering' },
      ],
    })));
    expect(data).toMatch(/1 of 2 confirmed/);
    expect(data).not.toMatch(/event ready|fully ready|\d+% ready/i);
  });

  test('no surface copy claims "event ready" from local state', () => {
    const data = JSON.stringify(deriveCommandCenterData(host()));
    expect(data).not.toMatch(/event ready|\d+% ready/i);
  });
});
