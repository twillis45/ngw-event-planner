// Intelligence Observatory reader — the Memory Validation admin surface. Pure, this-browser.
import { intelligenceObservatory } from '../analyticsReader';
import { emptyHostIntelligence, appendObservation } from '../hostIntel';

const ASOF = '2026-07-01';
const attHI = () => {
  let hi = emptyHostIntelligence();
  [['e1', '2026-04-01', 34], ['e2', '2026-05-01', 35], ['e3', '2026-06-01', 33]].forEach(([id, d, a]) => {
    hi = appendObservation(hi, 'attendance', { eventId: id, date: d, estimate: 40, actual: a });
  });
  hi.reconciled = { e1: '2026-04-01', e2: '2026-05-01', e3: '2026-06-01' };
  hi.eventsObserved = 3;
  return hi;
};
const events = [{ id: 'e1', type: 'Crab Feast' }, { id: 'e2', type: 'Crab Feast' }, { id: 'e3', type: 'Cookout' }];

describe('intelligenceObservatory', () => {
  test('EMPTY memory ⇒ present:false, no domains', () => {
    const o = intelligenceObservatory({}, [], ASOF);
    expect(o.present).toBe(false);
    expect(o.domains).toEqual([]);
    expect(o.eventsObserved).toBe(0);
  });

  test('POPULATED ⇒ attendance domain eligible, summary, readers, time-to-value', () => {
    const o = intelligenceObservatory({ hostIntelligence: attHI() }, events, ASOF);
    expect(o.present).toBe(true);
    expect(o.eventsObserved).toBe(3);
    const att = o.domains.find((d) => d.key === 'attendance');
    expect(att.eligible).toBe(true);
    expect(att.n).toBe(3);
    expect(att.reason).toMatch(/recent events/);
    expect(att.timeToApplicableDays).toBe(61); // Apr 1 → Jun 1
    expect(o.summary.applicableDomains).toBeGreaterThanOrEqual(1);
    expect(o.summary.avgConfidence).toMatch(/Medium|High/);
  });

  test('active readers name R1 and its eligibility; trust points to PostHog', () => {
    const o = intelligenceObservatory({ hostIntelligence: attHI() }, events, ASOF);
    const r1 = o.readers.find((r) => r.id === 'R1');
    expect(r1).toMatchObject({ domain: 'attendance', status: 'live', eligibleNow: true });
    expect(o.trust.events).toContain('intel_attendance_applied');
    expect(o.trust.note).toMatch(/PostHog/);
  });

  test('memory-by-playbook joins reconciled events to their type', () => {
    const o = intelligenceObservatory({ hostIntelligence: attHI() }, events, ASOF);
    const crab = o.byPlaybook.find((b) => b.type === 'Crab Feast');
    expect(crab.count).toBe(2);
    expect(o.byPlaybook[0].type).toBe('Crab Feast'); // sorted desc
  });

  test('never throws on malformed input', () => {
    for (const p of [null, undefined, 'x', { hostIntelligence: 'y' }]) {
      expect(() => intelligenceObservatory(p, null, ASOF)).not.toThrow();
      expect(intelligenceObservatory(p, null, ASOF).present).toBe(false);
    }
  });
});
