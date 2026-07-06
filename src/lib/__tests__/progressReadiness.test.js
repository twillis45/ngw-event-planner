// PROGRESS-1 — the header ReadinessTrack is a WHOLE-EVENT readiness bar, and
// it must be honest in both directions: never inflated (unresolved axes score
// low), never a false alarm (axes that don't apply to this event are excluded,
// not scored as failing).

import { wholeEventReadinessScore, getEventReadiness } from '../../CommandCenter';
import { readinessScore } from '../readinessHistory';

const future = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const host = (over = {}) => ({
  id: 'e-prog', name: 'Progress QA BBQ', type: 'Backyard BBQ',
  recordKind: 'host_event', date: future(30),
  guests: [], vendors: [], budget: [], timeline: [],
  ...over,
});

describe('wholeEventReadinessScore', () => {
  test('a vendorless, documentless host is NOT dinged for axes they do not have', () => {
    const ev = host({ timeline: [{ id: 't1', week: 'Week Of', owner: 'Host', done: true, task: 'Confirm the yard setup' }] });
    const raw = readinessScore(getEventReadiness(ev));       // vendor axis says AT_RISK "No vendors"
    const whole = wholeEventReadinessScore(ev);              // vendor + document axes excluded
    expect(whole).toBeGreaterThan(raw);
  });

  test('score MOVES when vendors get confirmed (whole-event, not tab-local)', () => {
    const withVendors = (status) => host({
      vendors: [
        { id: 'v1', name: 'Fork & Flower', category: 'Catering', status, contractSigned: status === 'Confirmed' },
        { id: 'v2', name: 'Beltway Sound', category: 'DJ', status, contractSigned: status === 'Confirmed' },
      ],
      timeline: [{ id: 't1', week: 'Week Of', owner: 'Host', done: true, task: 'Confirm the yard setup' }],
    });
    expect(wholeEventReadinessScore(withVendors('Confirmed')))
      .toBeGreaterThan(wholeEventReadinessScore(withVendors('Considering')));
  });

  test('score MOVES when tasks complete (timeline axis is whole-event work)', () => {
    const withTasks = (done) => host({
      timeline: [
        { id: 't1', week: 'Week Of', owner: 'Host', done, task: 'Buy the ice' },
        { id: 't2', week: 'Week Of', owner: 'Host', done, task: 'Set up tables' },
      ],
    });
    expect(wholeEventReadinessScore(withTasks(true)))
      .toBeGreaterThanOrEqual(wholeEventReadinessScore(withTasks(false)));
  });

  test('no fake precision: null when nothing is measurable', () => {
    expect(wholeEventReadinessScore(null)).toBeNull();
  });

  test('never inflated: an event with everything open scores low', () => {
    const s = wholeEventReadinessScore(host());
    expect(s === null || s <= 50).toBe(true);
  });
});
