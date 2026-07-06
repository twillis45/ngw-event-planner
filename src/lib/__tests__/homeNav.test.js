// Slice D-1 — home arrival semantics. Pins the D-0 demo-blocker fix: the day-of
// FOCUS takeover may auto-emerge only on a FRESH arrival at HostHome. Explicit
// back-navigation ("‹ Your events" from any event) must always land on the
// events overview — never re-enter the today-dated event's takeover.

import { HOME_ARRIVAL, focusTakeoverAllowed } from '../homeNav';

describe('focusTakeoverAllowed', () => {
  test('fresh app open keeps the existing day-of auto-takeover', () => {
    expect(focusTakeoverAllowed(HOME_ARRIVAL.FRESH)).toBe(true);
  });

  test('explicit back-navigation suppresses the takeover (the D-0 hijack)', () => {
    expect(focusTakeoverAllowed(HOME_ARRIVAL.BACK)).toBe(false);
  });

  test('unknown/legacy arrivals default to existing behavior (allowed)', () => {
    expect(focusTakeoverAllowed(undefined)).toBe(true);
    expect(focusTakeoverAllowed('anything-else')).toBe(true);
  });

  test('arrival vocabulary is pinned', () => {
    expect(HOME_ARRIVAL).toEqual({ FRESH: 'fresh', BACK: 'back' });
  });
});
