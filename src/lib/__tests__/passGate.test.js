// ─── Model D paywall engine — the ruling, executable ─────────────────────────
// Each describe block pins one named clause of the 2026-08-18 ruling (+ the
// 2026-08-19 fourth-sitting riders). If a future change makes one of these
// fail, it is contradicting a board ruling, not just breaking a test.
import {
  isBillingLive, isUserCreatedEvent, passVerdictAtCreation, briefAllowed,
  destinationLocked, creationDisclosure,
} from '../passGate';

const OLD_ENV = { ...process.env };
const billingOn = () => {
  process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
  process.env.REACT_APP_BILLING_LIVE = '1';
};
const billingOff = () => {
  delete process.env.REACT_APP_BILLING_LIVE;
};
afterEach(() => { process.env = { ...OLD_ENV }; });

const local = (over = {}) => ({ id: 'cust-abc123', type: 'Birthday', date: '2026-10-01', ...over });

describe('DORMANT UNTIL BILLING IS LIVE — every gate answers allowed', () => {
  test('billing off: brief and destination gates never fire, disclosure is null', () => {
    billingOff();
    expect(isBillingLive()).toBe(false);
    const ev = local({ passRequired: true, passReasons: ['destination'], briefSharedVendorIds: ['v1'] });
    expect(briefAllowed(ev, 'v2').allowed).toBe(true);
    expect(destinationLocked(ev)).toBe(false);
    expect(creationDisclosure({ passRequired: true, passReasons: ['destination'] })).toBe(null);
  });
});

describe('the three doors, stamped at creation', () => {
  test('door 2a: isDestination === true requires the pass', () => {
    const v = passVerdictAtCreation(local({ isDestination: true }), []);
    expect(v.passRequired).toBe(true);
    expect(v.passReasons).toContain('destination');
  });
  test('door 2b: a host-declared span requires the pass — and a bare city never does', () => {
    const v = passVerdictAtCreation(local({ endDate: '2026-10-03' }), []);
    expect(v.passRequired).toBe(true);
    expect(v.passReasons).toContain('multi-day');
    // Never inferred: a city name alone is not a destination and not a span.
    const free = passVerdictAtCreation(local({ venue: 'Santa Fe, NM' }), []);
    expect(free.passRequired).toBe(false);
  });
  test('door 3: a prior USER event requires the pass; samples never count', () => {
    const samplesOnly = [{ id: 'ev-x-retirement-party' }, { id: 'demo-jun' }];
    expect(passVerdictAtCreation(local(), samplesOnly).passRequired).toBe(false);
    const oneReal = [...samplesOnly, { id: 'cust-first' }];
    const v = passVerdictAtCreation(local(), oneReal);
    expect(v.passRequired).toBe(true);
    expect(v.passReasons).toEqual(['additional-event']);
  });
  test('the free tier: first local single-day event owes nothing', () => {
    expect(passVerdictAtCreation(local(), []).passRequired).toBe(false);
  });
});

describe('GRANDFATHER — the stored verdict wins, live fields never re-gate', () => {
  test('an event that began free stays free after turning destination mid-plan', () => {
    billingOn();
    // Stamped free at creation; host later set isDestination — by ruling we eat this.
    const ev = local({ passRequired: false, passReasons: [], isDestination: true, endDate: '2026-10-05' });
    expect(destinationLocked(ev)).toBe(false);
    expect(briefAllowed(ev, 'v1').allowed).toBe(true);
  });
  test('an event with no stamp at all (pre-paywall) is grandfathered free', () => {
    billingOn();
    const ev = local({ isDestination: true });
    expect(destinationLocked(ev)).toBe(false);
  });
});

describe('door 1 — the brief gate, never mid-conversation', () => {
  test('first brief is the free taste; a second vendor hits the gate', () => {
    billingOn();
    const ev = local({ passRequired: false, briefSharedVendorIds: [] });
    expect(briefAllowed(ev, 'v1')).toEqual({ allowed: true, reason: 'first-brief-free' });
    const after = { ...ev, briefSharedVendorIds: ['v1'] };
    expect(briefAllowed(after, 'v2')).toEqual({ allowed: false, reason: 'second-vendor' });
  });
  test('an already-shared vendor is ALWAYS allowed — an open conversation is never interrupted', () => {
    billingOn();
    const ev = local({ passRequired: true, passReasons: ['additional-event'], briefSharedVendorIds: ['v1'] });
    expect(briefAllowed(ev, 'v1').allowed).toBe(true);
  });
  test('a pass-required event gates a NEW vendor brief; the pass unlocks the whole event', () => {
    billingOn();
    const ev = local({ passRequired: true, passReasons: ['additional-event'], briefSharedVendorIds: [] });
    expect(briefAllowed(ev, 'v1')).toEqual({ allowed: false, reason: 'pass-required' });
    expect(briefAllowed({ ...ev, passPurchased: true }, 'v1').allowed).toBe(true);
  });
});

describe('the destination toolkit lock — teased, purchased-away, grandfather-aware', () => {
  test('locks only on a creation-stamped destination/multi-day verdict', () => {
    billingOn();
    expect(destinationLocked(local({ passRequired: true, passReasons: ['destination'] }))).toBe(true);
    expect(destinationLocked(local({ passRequired: true, passReasons: ['additional-event'] }))).toBe(false);
    expect(destinationLocked(local({ passRequired: true, passReasons: ['destination'], passPurchased: true }))).toBe(false);
  });
});

describe('the blunt disclosure (Grandmother rider: informs, never sells)', () => {
  test('names the concrete boundary for each verdict shape', () => {
    billingOn();
    expect(creationDisclosure({ passRequired: false, passReasons: [] })).toMatch(/free to plan.*one vendor brief/);
    expect(creationDisclosure({ passRequired: true, passReasons: ['destination'] })).toMatch(/destination event.*\$39/);
    expect(creationDisclosure({ passRequired: true, passReasons: ['additional-event'] })).toMatch(/first event already had the free run/);
  });
});

describe('sample exemption', () => {
  test('user-created ids are cust-/ev-copy-; everything else is exploration', () => {
    expect(isUserCreatedEvent({ id: 'cust-x1' })).toBe(true);
    expect(isUserCreatedEvent({ id: 'ev-copy-x1' })).toBe(true);
    expect(isUserCreatedEvent({ id: 'ev-x-retirement-party' })).toBe(false);
    expect(isUserCreatedEvent({ id: 'demo-jun' })).toBe(false);
    expect(isUserCreatedEvent(null)).toBe(false);
  });
});
