// Sprint 55N — the reusable analytics layer (trackOnce dedupe + event registry).
// The App.js wiring (recordFirstValue / trackActivationSession / intake loop) is
// verified by the build + the no-regression suite + the authenticated prod smoke.

import { trackOnce, EVENTS } from '../analytics';

beforeEach(() => { try { localStorage.clear(); } catch {} });

describe('55N activation event registry', () => {
  test('the 5 funnel events are defined', () => {
    ['SIGNED_UP', 'INTAKE_COMMITTED', 'FIRST_VALUE', 'RETURNED_D1', 'RETURNED_D7']
      .forEach(k => expect(typeof EVENTS[k]).toBe('string'));
  });
  test('event names are the agreed strings', () => {
    expect(EVENTS.SIGNED_UP).toBe('signed_up');
    expect(EVENTS.INTAKE_COMMITTED).toBe('intake_committed');
    expect(EVENTS.FIRST_VALUE).toBe('first_value');
    expect(EVENTS.RETURNED_D1).toBe('returned_d1');
    expect(EVENTS.RETURNED_D7).toBe('returned_d7');
  });
});

describe('55N trackOnce dedupe (powers once/user + once/event stages)', () => {
  test('fires the first time, no-ops thereafter, and stamps the key', () => {
    expect(trackOnce('k1', EVENTS.SIGNED_UP, {})).toBe(true);
    expect(localStorage.getItem('k1')).toBe('1');
    expect(trackOnce('k1', EVENTS.SIGNED_UP, {})).toBe(false);
    expect(trackOnce('k1', EVENTS.SIGNED_UP, {})).toBe(false);
  });
  test('distinct keys are independent', () => {
    expect(trackOnce('a', EVENTS.RETURNED_D1, {})).toBe(true);
    expect(trackOnce('b', EVENTS.RETURNED_D7, {})).toBe(true);
  });
  test('a pre-existing flag suppresses the fire', () => {
    localStorage.setItem('ngw-first-value', '1');
    expect(trackOnce('ngw-first-value', EVENTS.FIRST_VALUE, {})).toBe(false);
  });
});
