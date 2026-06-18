// Sprint 58C — Decision Memory v1. Proves: real append onto event.decisionMemory[]
// (immutable), minimal schema, rationale-required (no noise), per-subject readback,
// flag gate.

import { memoryOn, makeRecord, appendDecision, getDecisions, decisionsForSubject, latestRationaleForSubject, DECISION_TYPES } from '../decisionMemory';

beforeEach(() => { try { localStorage.clear(); } catch {} });

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
