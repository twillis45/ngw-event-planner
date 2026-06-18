// Sprint 58C — Decision Memory v1. Proves: real append onto event.decisionMemory[]
// (immutable), minimal schema, rationale-required (no noise), per-subject readback,
// flag gate.

import { memoryOn, makeRecord, appendDecision, getDecisions, decisionsForSubject, latestRationaleForSubject, DECISION_TYPES, outcomeFor, isEventComplete, setOverallOutcome, setVendorOutcome, vendorOutcome, outcomeTone } from '../decisionMemory';

beforeEach(() => { try { localStorage.clear(); } catch {} });

describe('58E Outcome — DERIVE budget variance (actual vs budgeted)', () => {
  const rec = makeRecord({ decisionType: 'budget_reallocation', subjectId: 'b1', subjectLabel: 'Catering', decision: 'x', rationale: 'r' }, 't');
  test('exceeded / within / underspent / pending', () => {
    expect(outcomeFor({ budget: [{ id: 'b1', budgeted: 500, actual: 700 }] }, rec).status).toBe('exceeded');
    expect(outcomeFor({ budget: [{ id: 'b1', budgeted: 500, actual: 480 }] }, rec).status).toBe('within');
    expect(outcomeFor({ budget: [{ id: 'b1', budgeted: 500, actual: 300 }] }, rec).status).toBe('underspent');
    expect(outcomeFor({ budget: [{ id: 'b1', budgeted: 500, actual: 0 }] }, rec)).toBeNull(); // no spend ⇒ no guess
    expect(outcomeFor({ budget: [{ id: 'b1', budgeted: 500, actual: 700 }] }, rec).source).toBe('derived');
  });
});

describe('58E Outcome — DERIVE timeline slip (done / missed / pending)', () => {
  const rec = makeRecord({ decisionType: 'planner_override', subjectId: 't1', subjectLabel: 'Seating', decision: 'Deferred', rationale: 'r' }, 't');
  test('done ⇒ held; past-due & not done ⇒ missed; future ⇒ pending', () => {
    expect(outcomeFor({ timeline: [{ id: 't1', done: true }] }, rec).status).toBe('held');
    expect(outcomeFor({ timeline: [{ id: 't1', done: false, snoozedUntil: '2020-01-01' }] }, rec).status).toBe('missed');
    expect(outcomeFor({ timeline: [{ id: 't1', done: false, snoozedUntil: '2099-01-01' }] }, rec)).toBeNull();
  });
});

describe('58E Outcome — CAPTURE (vendor / overall) persists immutably', () => {
  test('setVendorOutcome stores keyed by vendorId; outcomeFor prefers captured', () => {
    let ev = { vendors: [{ id: 'v1' }] };
    ev = setVendorOutcome(ev, 'v1', 'late', 'now');
    expect(vendorOutcome(ev, 'v1')).toBe('late');
    const rec = makeRecord({ decisionType: 'vendor_selection', subjectId: 'v1', subjectLabel: 'A', decision: 'Confirmed A', rationale: 'fast' }, 't');
    const o = outcomeFor(ev, rec);
    expect(o.status).toBe('late'); expect(o.source).toBe('captured'); expect(o.tone).toBe('bad');
  });
  test('setOverallOutcome stores on event.outcomes; immutable', () => {
    const ev = { id: 'e1' };
    const next = setOverallOutcome(ev, 'great', 'now');
    expect(next).not.toBe(ev);
    expect(ev.outcomes).toBeUndefined();
    expect(next.outcomes.overall).toBe('great');
  });
  test('vendor with no captured outcome ⇒ null (no derive for vendors)', () => {
    const rec = makeRecord({ decisionType: 'vendor_selection', subjectId: 'v9', subjectLabel: 'A', decision: 'x', rationale: 'r' }, 't');
    expect(outcomeFor({ vendors: [{ id: 'v9' }] }, rec)).toBeNull();
  });
});

describe('58E isEventComplete + tone', () => {
  test('past date / archived ⇒ complete; future ⇒ not', () => {
    expect(isEventComplete({ date: '2020-01-01' })).toBe(true);
    expect(isEventComplete({ archived: true })).toBe(true);
    expect(isEventComplete({ date: '2099-01-01' })).toBe(false);
  });
  test('tone classification', () => {
    expect(outcomeTone('great')).toBe('good');
    expect(outcomeTone('no_show')).toBe('bad');
    expect(outcomeTone('ok')).toBe('neutral');
  });
});

describe('58C flag gate', () => {
  test('memoryOn default OFF', () => { expect(memoryOn()).toBe(false); });
  test('ON via localStorage', () => { localStorage.setItem('ngw-pi-memory', '1'); expect(memoryOn()).toBe(true); });
});

describe('58C makeRecord — minimal schema', () => {
  test('produces the required fields + stamps injected time', () => {
    const r = makeRecord({ eventId: 'ev1', decisionType: 'vendor_selection', subjectId: 'v1', subjectLabel: 'Bloom & Stem', decision: 'Confirmed Bloom & Stem', rationale: 'Fastest comms, fully insured', createdBy: 'todd' }, '2026-06-18T10:00:00Z');
    expect(r.id).toMatch(/^dm-/);
    expect(r).toMatchObject({ eventId: 'ev1', decisionType: 'vendor_selection', subjectId: 'v1', subjectLabel: 'Bloom & Stem', decision: 'Confirmed Bloom & Stem', rationale: 'Fastest comms, fully insured', createdAt: '2026-06-18T10:00:00Z', createdBy: 'todd' });
  });
  test('unknown type falls back to planner_override; optional fields omitted when absent', () => {
    const r = makeRecord({ decisionType: 'nope', subjectLabel: 'x', decision: 'y', rationale: 'z' }, 't');
    expect(r.decisionType).toBe('planner_override');
    expect(r.subjectId).toBeUndefined();
    expect(r.createdBy).toBeUndefined();
  });
  test('DECISION_TYPES is the v1 three', () => {
    expect(DECISION_TYPES).toEqual(['vendor_selection', 'budget_reallocation', 'planner_override']);
  });
});

describe('58C appendDecision — immutable, rationale-required', () => {
  test('appends onto event.decisionMemory without mutating the original', () => {
    const ev = { id: 'ev1', vendors: [] };
    const rec = makeRecord({ eventId: 'ev1', decisionType: 'vendor_selection', subjectId: 'v1', subjectLabel: 'A', decision: 'Confirmed A', rationale: 'good' }, 't');
    const next = appendDecision(ev, rec);
    expect(next).not.toBe(ev);
    expect(ev.decisionMemory).toBeUndefined();          // original untouched
    expect(getDecisions(next)).toHaveLength(1);
    expect(getDecisions(next)[0].rationale).toBe('good');
  });
  test('a record with no rationale is NOT stored (capture reasoning, not noise)', () => {
    const ev = { id: 'ev1' };
    const next = appendDecision(ev, makeRecord({ decisionType: 'planner_override', subjectLabel: 'x', decision: 'y', rationale: '' }, 't'));
    expect(getDecisions(next)).toHaveLength(0);
  });
});

describe('58C readback — engine expression', () => {
  test('decisionsForSubject + latestRationaleForSubject surface the last reason', () => {
    let ev = { id: 'ev1' };
    ev = appendDecision(ev, makeRecord({ subjectId: 'v1', decisionType: 'vendor_selection', subjectLabel: 'A', decision: 'Considering A', rationale: 'first pick' }, 't1'));
    ev = appendDecision(ev, makeRecord({ subjectId: 'v1', decisionType: 'vendor_selection', subjectLabel: 'A', decision: 'Confirmed A', rationale: 'faster response time' }, 't2'));
    expect(decisionsForSubject(ev, 'v1')).toHaveLength(2);
    expect(latestRationaleForSubject(ev, 'v1')).toBe('faster response time');
    expect(latestRationaleForSubject(ev, 'nope')).toBe('');
  });
  test('getDecisions safe on empty/missing', () => {
    expect(getDecisions(null)).toEqual([]);
    expect(getDecisions({})).toEqual([]);
  });
});
