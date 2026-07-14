// Behavioral coverage for the day-of alert engine BOTH shells (App.js host
// stack and the V2 Day stage) read. Exercises the real computeDayAlerts on a
// same-day event under a frozen clock — vendor-overdue criticals, the
// guest-mode gate on RSVP chasing, and the exported parseMin contract.
import { computeDayAlerts, parseMin } from '../dayAlerts';

// Freeze the clock at local noon so "past" and "future" arrival times are deterministic.
//
// UPDATED 2026-07-14. This used to derive the event date with `toISOString()` — "the same
// way the module derives today" — which meant the test faithfully reproduced the module's
// bug instead of catching it. `today8601()` was a UTC date compared against a LOCAL event
// date, so east of UTC-0 the whole day-of alert stack switched off during the event
// evening (8pm ET). The test agreed with it because it made the same mistake.
//
// The event date is now the LOCAL calendar date, which is what a host's event date is.
const NOON = new Date(2026, 6, 8, 12, 0, 0);
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const freezeAtNoon = () => {
  jest.useFakeTimers();
  jest.setSystemTime(NOON);
  return localDate(NOON);
};

afterEach(() => { jest.useRealTimers(); });

const vendor = (over = {}) => ({
  id: 'v1', name: 'Smokehouse Catering', category: 'Catering',
  status: 'Confirmed', arrivalTime: '10:00', arrivalStatus: 'pending',
  ...over,
});

describe('computeDayAlerts — vendor arrival on event day', () => {
  test('vendor past arrivalTime and not arrived → critical/warning alert naming the vendor', () => {
    const td = freezeAtNoon();
    const alerts = computeDayAlerts({ id: 'e1', date: td, vendors: [vendor()] });
    const hit = alerts.filter(a => a.headline.includes('Smokehouse Catering')
      && (a.tier === 'critical' || a.tier === 'warning'));
    expect(hit.length).toBeGreaterThan(0);
    // It is specifically the overdue critical, with the sev alias intact.
    const overdue = hit.find(a => a.id === 'ov-v1');
    expect(overdue).toBeTruthy();
    expect(overdue.tier).toBe('critical');
    expect(overdue.sev).toBe('critical');
    expect(overdue.headline).toBe("Smokehouse Catering hasn't arrived");
    expect(overdue.move).toContain('10:00 AM');
  });

  test('same vendor marked arrived → no alert names the vendor', () => {
    const td = freezeAtNoon();
    const alerts = computeDayAlerts({ id: 'e1', date: td, vendors: [vendor({ arrivalStatus: 'arrived' })] });
    expect(alerts.filter(a => a.headline.includes('Smokehouse Catering'))).toHaveLength(0);
  });

  test('not event day → no overdue-arrival alert even when the time is past', () => {
    freezeAtNoon();
    const alerts = computeDayAlerts({ id: 'e1', date: '2026-08-01', vendors: [vendor()] });
    expect(alerts.find(a => a.id === 'ov-v1')).toBeUndefined();
  });
});

describe('computeDayAlerts — rsvp-pending gated by guest mode', () => {
  const guests = [
    { id: 'g1', name: 'Ada Byron', rsvp: 'Yes' },
    { id: 'g2', name: 'Sam Hill', rsvp: '' },      // never replied
    { id: 'g3', name: 'Max Ray', rsvp: 'Maybe' },  // soft reply
  ];

  test('list-mode event with blank rsvps → rsvp-pending warning appears', () => {
    const td = freezeAtNoon();
    const alerts = computeDayAlerts({ id: 'e1', date: td, guestMode: 'list', guests });
    const rsvp = alerts.find(a => a.id === 'rsvp-pending');
    expect(rsvp).toBeTruthy();
    expect(rsvp.tier).toBe('warning');
    expect(rsvp.headline).toBe("2 haven't RSVP'd");
    // yesCount > 0 → the "plan for N" move variant
    expect(rsvp.move).toContain('plan for 1');
  });

  test("guestMode 'count' (headcount host) → never chased about replies", () => {
    const td = freezeAtNoon();
    const alerts = computeDayAlerts({ id: 'e1', date: td, guestMode: 'count', guests });
    expect(alerts.find(a => a.id === 'rsvp-pending')).toBeUndefined();
  });
});

describe('parseMin — exported time parser, actual contract', () => {
  test('24-hour strings parse to minutes since midnight', () => {
    expect(parseMin('14:05')).toBe(845);
    expect(parseMin('15:30')).toBe(930);
    expect(parseMin('0:00')).toBe(0);
    expect(parseMin('9')).toBe(540); // missing minutes → 0
  });

  test('12-hour display strings parse correctly — "3:30 PM" is 930 minutes', () => {
    // Documented limitation: Number('30 PM') is NaN and (m || 0) coerces it to
    // 0 minutes, so the PM half is silently dropped. Callers must normalize
    // mixed-format times to 24h before parsing (see fmtTime12's comment about
    // the cookout-at-3am bug). If this assertion ever fails, the contract
    // changed — update the doc comment on parseMin too.
    expect(parseMin('3:30 PM')).toBe(930);
  });

  test('falsy or non-numeric input → null', () => {
    expect(parseMin(null)).toBeNull();
    expect(parseMin(undefined)).toBeNull();
    expect(parseMin('')).toBeNull();
    expect(parseMin('garbage')).toBeNull();
    expect(parseMin('noon')).toBeNull();
  });
});
