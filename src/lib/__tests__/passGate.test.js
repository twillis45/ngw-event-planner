// ─── Model H paywall engine — the ruling, executable ─────────────────────────
// Each describe block pins one named clause of the owner's 11/13/2026 ruling
// ("Go with H for now", first-time-host board, BOARD_2026-11-12.md) and the
// Model D mechanics it kept (2026-08-18 ruling + 2026-08-19 riders). If a
// future change makes one of these fail, it is contradicting a ruling, not
// just breaking a test.
import {
  isBillingLive, isUserCreatedEvent, passVerdictAtCreation, briefAllowed,
  destinationLocked, creationDisclosure, passStatus, lockingReasons,
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

describe('the two doors, stamped at creation', () => {
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
  test('NO DOOR 3 (Model H): any number of prior user events never stamps the pass', () => {
    const prior = [{ id: 'cust-first' }, { id: 'cust-second' }, { id: 'ev-copy-third' }, { id: 'demo-jun' }];
    expect(passVerdictAtCreation(local(), prior)).toEqual({ passRequired: false, passReasons: [] });
    // A destination still stamps, and only for being a destination.
    expect(passVerdictAtCreation(local({ isDestination: true }), prior).passReasons).toEqual(['destination']);
  });
  test('the free tier: a local single-day event owes nothing, first or fifth', () => {
    expect(passVerdictAtCreation(local(), []).passRequired).toBe(false);
    expect(passVerdictAtCreation(local(), [{ id: 'cust-first' }]).passRequired).toBe(false);
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

// Owner ruling 11/13/2026: door 3 is gone, so an event stamped under it ALONE
// is free. Any other stamped reason keeps locking exactly as before.
describe('A DOOR-3-ONLY STAMP IS FREE — the removed rule locks nothing', () => {
  const door3Only = (over = {}) => local({ passRequired: true, passReasons: ['additional-event'], ...over });
  test('it has no locking reasons, and every gate reads it as free', () => {
    billingOn();
    const ev = door3Only({ briefSharedVendorIds: [] });
    expect(lockingReasons(ev)).toEqual([]);
    expect(briefAllowed(ev, 'v1')).toEqual({ allowed: true, reason: 'first-brief-free' });
    expect(destinationLocked(ev)).toBe(false);
    expect(passStatus(ev)).toBeNull();
  });
  test('door 1 still applies to it, like any free event: the second vendor takes the pass', () => {
    billingOn();
    expect(briefAllowed(door3Only({ briefSharedVendorIds: ['v1'] }), 'v2')).toEqual({ allowed: false, reason: 'second-vendor' });
  });
  test('a destination stamp still locks, with or without a door-3 reason beside it', () => {
    billingOn();
    for (const reasons of [['destination'], ['destination', 'additional-event'], ['multi-day', 'additional-event']]) {
      const ev = local({ passRequired: true, passReasons: reasons, briefSharedVendorIds: [] });
      expect(lockingReasons(ev)).toEqual(reasons.filter((r) => r !== 'additional-event'));
      expect(briefAllowed(ev, 'v1')).toEqual({ allowed: false, reason: 'pass-required' });
      expect(destinationLocked(ev)).toBe(true);
      expect(passStatus(ev).state).toBe('needed');
    }
  });
  test('the stamp is still never recomputed: live destination fields on a door-3-only event do not lock it', () => {
    billingOn();
    const ev = door3Only({ isDestination: true, endDate: '2026-10-05' });
    expect(destinationLocked(ev)).toBe(false);
    expect(briefAllowed(ev, 'v1').allowed).toBe(true);
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
    const ev = local({ passRequired: true, passReasons: ['destination'], briefSharedVendorIds: ['v1'] });
    expect(briefAllowed(ev, 'v1').allowed).toBe(true);
  });
  test('a pass-required event gates a NEW vendor brief; the pass unlocks the whole event', () => {
    billingOn();
    const ev = local({ passRequired: true, passReasons: ['destination'], briefSharedVendorIds: [] });
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
    // Model H (11/13/2026): planning is free, said plainly, and the pass is
    // named for exactly its two doors.
    const FREE = 'Planning this event is free, including sharing one vendor brief (that takes a free account). Sharing with more than one vendor, or a destination or multi-day event, takes the $39 One-Event Pass.';
    expect(creationDisclosure({ passRequired: false, passReasons: [] })).toBe(FREE);
    // The free brief needs an account; the free-tier promise must say so (11/12/2026).
    expect(creationDisclosure({ passRequired: false, passReasons: [] })).toMatch(/one vendor brief \(that takes a free account\)/);
    expect(creationDisclosure({ passRequired: true, passReasons: ['destination'] }))
      .toBe('This is a destination event. Planning it is free. Its trip tools and sharing vendor briefs take the $39 One-Event Pass.');
    expect(creationDisclosure({ passRequired: true, passReasons: ['multi-day'] })).toMatch(/^This is a multi-day event\. Planning it is free\./);
    // A door-3-only verdict reads as the free event it now is.
    expect(creationDisclosure({ passRequired: true, passReasons: ['additional-event'] })).toBe(FREE);
  });
  test('no branch mentions a next event or a first event that used the free run', () => {
    billingOn();
    for (const v of [{ passRequired: false, passReasons: [] }, { passRequired: true, passReasons: ['additional-event'] },
      { passRequired: true, passReasons: ['destination'] }, { passRequired: true, passReasons: ['multi-day'] }, null]) {
      expect(creationDisclosure(v)).not.toMatch(/next event|first event|free run/i);
    }
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


// Owner decision, 11/9/2026: the command board names the pass on an event that
// needs it, and stays quiet everywhere else (the free tier never nags).
describe('passStatus — the command board line', () => {
  test('silent while billing is dormant, on samples, and on a free event', () => {
    billingOff();
    expect(passStatus(local({ passRequired: true, passReasons: ['destination'] }))).toBeNull();
    billingOn();
    expect(passStatus({ id: 'ev-x-retirement-party', passRequired: true, passReasons: ['destination'] })).toBeNull();
    expect(passStatus(local({ passRequired: false, passReasons: [] }))).toBeNull();
    expect(passStatus(local())).toBeNull();
  });
  test('a destination or multi-day event names the whole toolkit', () => {
    billingOn();
    for (const reason of ['destination', 'multi-day']) {
      const s = passStatus(local({ passRequired: true, passReasons: [reason] }));
      expect(s.state).toBe('needed');
      expect(s.covers).toMatch(/where everyone stays/);
    }
  });
  test('a door-3-only event (Model D stamp) says nothing: it is a free event now', () => {
    billingOn();
    expect(passStatus(local({ passRequired: true, passReasons: ['additional-event'] }))).toBeNull();
  });
  test('a held pass reads as held, even on a free event', () => {
    billingOn();
    expect(passStatus(local({ passRequired: true, passReasons: ['destination'], passPurchased: true }))).toEqual({ state: 'held' });
    expect(passStatus(local({ passPurchased: true }))).toEqual({ state: 'held' });
  });
});
