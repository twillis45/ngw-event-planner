// KEP-3 Bundle D — Runtime Simulation Lab. Proves a change can be diffed BEFORE publish:
// value before→after, blast radius, and the host-level cost diff — with no mutation.
import { simulatePublish, simulateBatch } from './simulation';
import { clearOverrides, readAuthored } from './knowledgeOverride';
import { getPlaybook } from '../playbooks/index';

const crab = getPlaybook('Crab Feast');
const FIELD = 'p_crabs.unitCostRange';
beforeEach(() => clearOverrides());

describe('runtime simulation — nothing publishes blind', () => {
  test('diffs before→after value + blast radius, without mutating anything', () => {
    const authored = readAuthored(crab, FIELD);
    const sim = simulatePublish({ asset: crab, fieldPath: FIELD, proposedValue: [3, 8] });
    expect(sim.before).toEqual(authored);
    expect(sim.after).toEqual([3, 8]);
    expect(sim.changes).toBe(true);
    expect(sim.affectedEngines.length).toBeGreaterThan(0);
    expect(sim.affectedReaders.length).toBeGreaterThan(0);
    expect(sim.magnitude).toBeDefined();
    // no mutation: authored value still intact + no override persisted
    expect(readAuthored(crab, FIELD)).toEqual(authored);
  });

  test('host-level diff shows what the runtime reader would render', () => {
    const sim = simulatePublish({ asset: crab, fieldPath: FIELD, proposedValue: [3, 8] });
    expect(sim.hostDiff).toBeTruthy();
    expect(sim.hostDiff.afterCost).toEqual([3, 8]);
    expect(sim.hostDiff.changes).toBe(true);
  });

  test('a no-op change reports changes:false', () => {
    const authored = readAuthored(crab, FIELD);
    const sim = simulatePublish({ asset: crab, fieldPath: FIELD, proposedValue: authored });
    expect(sim.changes).toBe(false);
  });

  test('batch simulation summarizes many changes', () => {
    const b = simulateBatch([
      { asset: crab, fieldPath: FIELD, proposedValue: [3, 8] },
      { asset: crab, fieldPath: 'tasks', proposedValue: ['x'] },
    ]);
    expect(b.count).toBe(2);
    expect(b.changing).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(b.affectedRuntime)).toBe(true);
  });
});
