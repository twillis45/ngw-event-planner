// ─── A HOST'S OWN EVENTS MUST SURVIVE A RELOAD ───────────────────────────────
//
// Regression gate for a bug that shipped 2026-09-24 and was found the same day
// while debugging something else entirely.
//
// `eventPool.js` carried `export { LS_CUSTOMS } from '@app/lib/customEventStore'`
// — a pure re-export, which forwards the binding to consumers and creates NO
// local binding. `loadCustomEvents()` in that same module then read
// `localStorage.getItem(LS_CUSTOMS)`, threw a ReferenceError into its own
// `catch`, and returned `[]`. Every event the host had created vanished from
// ALL_SAMPLES, so BOOT_EVENT_ID could not resolve one and fell back to
// ROSTER[0]. The events were still in storage; the app simply could not see them.
//
// WHY THIS LIVES IN VITEST AND NOT JEST: jest cannot execute hostv2 at all
// (`react-scripts` pins roots to demo/src), so the 36 jest suites that "cover"
// this tree only read it as text. A regex would have found the identifier on
// both lines and called it present. Only executing the module catches it.
import { describe, it, expect, beforeEach } from 'vitest';

const withStore = (seed) => {
  const store = { ...seed };
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    key: () => null, length: 0,
  };
  return store;
};

describe("a host's own events are visible to the event pool", () => {
  beforeEach(() => { });

  it('loadCustomEvents returns an event that is in storage', async () => {
    withStore({ 'ngw-hostv2-custom-events': JSON.stringify([{ id: 'vis-1', name: 'Mine', type: 'Repast' }]) });
    const mod = await import('../src/eventPool.js?visible1');
    expect(mod.loadCustomEvents().map((e) => e.id)).toContain('vis-1');
  });

  it('LS_CUSTOMS is a real local binding here, not only a re-export', async () => {
    // The specific defect: the module could still EXPORT the key while being
    // unable to READ it. Asserting the export alone would have passed.
    withStore({});
    const mod = await import('../src/eventPool.js?visible2');
    expect(mod.LS_CUSTOMS).toBe('ngw-hostv2-custom-events');
    expect(() => mod.loadCustomEvents()).not.toThrow();
  });

  it('a stored event reaches ALL_SAMPLES, which is what boot resolves against', async () => {
    withStore({ 'ngw-hostv2-custom-events': JSON.stringify([{ id: 'vis-3', name: 'Mine', type: 'Repast' }]) });
    const mod = await import('../src/eventPool.js?visible3');
    expect(mod.ALL_SAMPLES.some((e) => e && e.id === 'vis-3')).toBe(true);
  });

  it('BOOT_EVENT_ID lands on the host’s own event, not the first roster sample', async () => {
    withStore({
      'ngw-hostv2-custom-events': JSON.stringify([{ id: 'vis-4', name: 'Mine', type: 'Repast' }]),
      'ngw-hostv2-last-event': 'vis-4',
    });
    const mod = await import('../src/eventPool.js?visible4');
    expect(mod.BOOT_EVENT_ID).toBe('vis-4');
  });
});
