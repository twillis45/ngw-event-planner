// Sprint HQ-2 regression tests:
// - P0-3/P1: Risk rows carry a confidence label and a persisted status (risk loop)
// - P2: effectiveDoneDetail distinguishes explicit checkoff from inferred completion
import { effectiveDone, effectiveDoneDetail, taskSatisfied } from '../taskEngine';
import { playbookRisks } from '../playbooks';

describe('HQ-2 P2: effectiveDoneDetail (Tasks "Inferred" label)', () => {
  const eventWithVenue = { type: 'Birthday', venue: 'The Grand Hall', guests: [], budget: [], vendors: [] };
  const eventNoVenue = { type: 'Birthday', venue: '', guests: [], budget: [], vendors: [] };
  const venueTask = { id: 't1', text: 'Book the venue', done: false };

  test('explicit checkoff: done=true, inferred=false', () => {
    const result = effectiveDoneDetail(eventWithVenue, { ...venueTask, done: true });
    expect(result.done).toBe(true);
    expect(result.inferred).toBe(false);
  });

  test('inferred completion (real event state satisfies the task, never manually checked): done=true, inferred=true', () => {
    const result = effectiveDoneDetail(eventWithVenue, venueTask);
    expect(result.done).toBe(true);
    expect(result.inferred).toBe(true);
  });

  test('neither explicit nor inferred: done=false, inferred=false', () => {
    const result = effectiveDoneDetail(eventNoVenue, venueTask);
    expect(result.done).toBe(false);
    expect(result.inferred).toBe(false);
  });

  test('effectiveDoneDetail.done always matches the existing effectiveDone() boolean (no behavior change for existing callers)', () => {
    [
      [eventWithVenue, { ...venueTask, done: true }],
      [eventWithVenue, venueTask],
      [eventNoVenue, venueTask],
    ].forEach(([event, task]) => {
      expect(effectiveDoneDetail(event, task).done).toBe(effectiveDone(event, task));
    });
  });

  test('taskSatisfied() itself is unchanged (still exported, still a plain boolean)', () => {
    expect(typeof taskSatisfied(eventWithVenue, venueTask)).toBe('boolean');
  });
});

describe('HQ-2 P0-3/P1: Risk confidence + risk loop data shape', () => {
  test('playbookRisks output has no built-in status field (status now lives in event.riskStatus, set by the panel)', () => {
    const rk = playbookRisks({ type: 'Birthday' }, null);
    if (rk && rk.items && rk.items.length) {
      rk.items.forEach(r => {
        expect(r).not.toHaveProperty('status');
      });
    }
  });

  test('each risk item has a stable id-or-trigger key usable for event.riskStatus lookups', () => {
    const rk = playbookRisks({ type: 'Birthday' }, null);
    if (rk && rk.items && rk.items.length) {
      rk.items.forEach(r => {
        expect(r.id || r.trigger).toBeTruthy();
      });
    }
  });
});
