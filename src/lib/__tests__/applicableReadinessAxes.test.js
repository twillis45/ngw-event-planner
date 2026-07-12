// applicableReadinessAxes — the events-index card was found reading raw
// getEventReadiness() instead of the same "axes that don't apply are EXCLUDED"
// honesty rule the header's wholeEventReadinessScore already applied, so a
// vendorless/documentless DIY host was pinned "At risk" on that card forever,
// even once the header right above it correctly showed the event as fine.
import { applicableReadinessAxes, getEventReadiness } from '../../CommandCenter';

const future = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const host = (over = {}) => ({
  id: 'e-axes', name: 'Axes QA BBQ', type: 'Backyard BBQ',
  recordKind: 'host_event', date: future(30),
  guests: [], vendors: [], budget: [], timeline: [], documents: [],
  ...over,
});

describe('applicableReadinessAxes', () => {
  test('a vendorless, documentless host gets vendor/document nulled, not AT_RISK', () => {
    const ev = host({ timeline: [{ id: 't1', week: 'Week Of', owner: 'Host', done: true, task: 'Confirm the yard setup' }] });
    const raw = getEventReadiness(ev);
    expect(raw.vendor.status).toBe('AT_RISK'); // the underlying engine still says this...
    const applicable = applicableReadinessAxes(ev);
    expect(applicable.vendor).toBeNull();      // ...but the honesty rule excludes it, not scores it failing
    expect(applicable.document).toBeNull();
    expect(applicable.decision).toEqual(raw.decision); // untouched axes pass through unchanged
    expect(applicable.timeline).toEqual(raw.timeline);
  });

  test('a host who DID hire vendors / upload documents keeps those real axes', () => {
    const ev = host({
      vendors: [{ id: 'v1', name: 'Fork & Flower', category: 'Catering', status: 'Confirmed', contractSigned: true }],
      documents: [{ id: 'd1', name: 'Contract.pdf' }],
    });
    const applicable = applicableReadinessAxes(ev);
    expect(applicable.vendor).not.toBeNull();
    expect(applicable.document).not.toBeNull();
  });

  test('a null/undefined event does not throw', () => {
    expect(() => applicableReadinessAxes(null)).not.toThrow();
    expect(() => applicableReadinessAxes(undefined)).not.toThrow();
  });

  test('a "worst status across axes" computation no longer sees the excluded axes', () => {
    const ev = host({ timeline: [{ id: 't1', week: 'Week Of', owner: 'Host', done: true, task: 'Confirm the yard setup' }] });
    const a = applicableReadinessAxes(ev);
    const statuses = [a.decision, a.vendor, a.timeline, a.document].filter(Boolean).map((x) => x.status);
    expect(statuses).not.toContain('AT_RISK'); // no vendors/docs no longer poisons the summary dot
  });
});
