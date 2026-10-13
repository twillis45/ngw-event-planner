// ─── THE PASS FACT, AND WHICH ANSWER WINS ────────────────────────────────────
//
// `supabase/migrations/017_event_passes.sql` + `GET /api/stripe/pass` exist so
// that a host who paid can still prove it after closing the tab. This file pins
// the three properties that make that true, each of which is a way to turn the
// server record into something worse than the blob it replaced:
//
//   · a server "no" REVOKES a blob claim        (otherwise nothing is gained)
//   · a server "yes" works with NO blob at all  (this is the recovery)
//   · a FAILED lookup records nothing           (otherwise a cold backend
//                                                revokes a real purchase)
//
// No network: `stripeApi.fetchEventPass` is mocked, which is the seam under
// test — everything below is about what this module does with its answers.
import { fetchEventPass } from '../stripeApi';
import {
  serverPassHeld, recordServerPass, refreshEventPass, resetPassEntitlements,
  subscribePassEntitlements, CLAIM_RETRY_DELAYS_MS,
} from '../passEntitlement';
import { passHeld, briefAllowed, destinationLocked } from '../passGate';

// Below the imports on purpose: babel hoists `jest.mock` above them anyway, and
// CRA escalates eslint's `import/first` to a BUILD failure, so a mock written
// at the top of the file is a trap worth not laying.
jest.mock('../stripeApi', () => ({ fetchEventPass: jest.fn() }));

const OLD_ENV = { ...process.env };
const billingOn = () => {
  process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
  process.env.REACT_APP_BILLING_LIVE = '1';
};

beforeEach(() => { resetPassEntitlements(); fetchEventPass.mockReset(); });
afterEach(() => { process.env = { ...OLD_ENV }; });

const ev = (over = {}) => ({ id: 'cust-abc123', type: 'Birthday', date: '2026-10-01', ...over });

describe('never asked is not the same as no', () => {
  test('an event nobody has looked up reads null, not false', () => {
    expect(serverPassHeld('cust-abc123')).toBe(null);
    expect(serverPassHeld(null)).toBe(null);
  });

  test('…and passHeld falls back to the blob claim, labelled as a claim', () => {
    expect(passHeld(ev({ passPurchased: true }))).toEqual({ held: true, source: 'claim' });
    expect(passHeld(ev())).toEqual({ held: false, source: 'claim' });
  });
});

describe('the server answer wins in BOTH directions', () => {
  test('server yes grants with no blob field at all — this is the recovery', () => {
    recordServerPass('cust-abc123', true);
    expect(passHeld(ev())).toEqual({ held: true, source: 'server' });
  });

  test('server NO revokes a blob that claims a pass', () => {
    // The whole point. Before public.event_passes this boolean was the only
    // answer, and it was a persisted, hand-editable field.
    recordServerPass('cust-abc123', false);
    expect(passHeld(ev({ passPurchased: true }))).toEqual({ held: false, source: 'server' });
  });

  test('the record is per event — one event holding a pass never unlocks another', () => {
    recordServerPass('cust-paid', true);
    expect(passHeld({ id: 'cust-paid' }).held).toBe(true);
    expect(passHeld({ id: 'cust-other' }).held).toBe(false);
  });
});

describe('a lookup that FAILS must record nothing', () => {
  test('a thrown lookup leaves the event never-asked, so a paid host keeps their unlock', () => {
    // A 403, a cold backend, a dropped connection. Writing `false` here would
    // revoke a real purchase on a network blip — the worst thing this module
    // could do.
    fetchEventPass.mockRejectedValue(new Error('Pass lookup error 503'));
    return refreshEventPass('cust-abc123').then((out) => {
      expect(out).toBe(null);
      expect(serverPassHeld('cust-abc123')).toBe(null);
      expect(passHeld(ev({ passPurchased: true }))).toEqual({ held: true, source: 'claim' });
    });
  });

  test('a response of an unrecognised shape records nothing either', () => {
    fetchEventPass.mockResolvedValue({ event_id: 'cust-abc123' });   // no `held`
    return refreshEventPass('cust-abc123').then(() => {
      expect(serverPassHeld('cust-abc123')).toBe(null);
    });
  });
});

describe('refresh writes down what the server said', () => {
  test('held true and held false are both recorded', async () => {
    fetchEventPass.mockResolvedValue({ event_id: 'cust-abc123', held: true, sku: 'one-event-pass' });
    await refreshEventPass('cust-abc123');
    expect(serverPassHeld('cust-abc123')).toBe(true);

    resetPassEntitlements();
    fetchEventPass.mockResolvedValue({ event_id: 'cust-abc123', held: false });
    await refreshEventPass('cust-abc123');
    expect(serverPassHeld('cust-abc123')).toBe(false);
  });

  test('concurrent asks for the same event issue ONE request', async () => {
    fetchEventPass.mockResolvedValue({ event_id: 'cust-abc123', held: true });
    await Promise.all([
      refreshEventPass('cust-abc123'),
      refreshEventPass('cust-abc123'),
      refreshEventPass('cust-abc123'),
    ]);
    expect(fetchEventPass).toHaveBeenCalledTimes(1);
  });

  test('a no-op id never reaches the network', async () => {
    expect(await refreshEventPass('')).toBe(null);
    expect(fetchEventPass).not.toHaveBeenCalled();
  });
});

// ─── THE RE-RENDER SEAM ──────────────────────────────────────────────────────
// passGate is synchronous and the three destinationLocked call sites are in
// RENDER. Without a subscription a landing answer is invisible: the teased
// lodging/ground/arrivals surfaces stay teased until something unrelated
// re-renders them. This is what useSyncExternalStore binds to.
describe('subscribers hear a change, and only a change', () => {
  test('a recorded answer notifies; an identical repeat does not', () => {
    const seen = jest.fn();
    subscribePassEntitlements(seen);

    recordServerPass('cust-abc123', true);
    expect(seen).toHaveBeenCalledTimes(1);

    recordServerPass('cust-abc123', true);        // same answer
    expect(seen).toHaveBeenCalledTimes(1);        // no needless render

    recordServerPass('cust-abc123', false);       // changed
    expect(seen).toHaveBeenCalledTimes(2);
  });

  test('unsubscribe stops the notifications', () => {
    const seen = jest.fn();
    const off = subscribePassEntitlements(seen);
    off();
    recordServerPass('cust-abc123', true);
    expect(seen).not.toHaveBeenCalled();
  });

  test('a listener that throws does not stop the others, or the write', () => {
    const good = jest.fn();
    subscribePassEntitlements(() => { throw new Error('bad listener'); });
    subscribePassEntitlements(good);
    expect(() => recordServerPass('cust-abc123', true)).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
    expect(serverPassHeld('cust-abc123')).toBe(true);
  });

  test('a non-function subscriber is a no-op, not a crash', () => {
    expect(() => subscribePassEntitlements(null)()).not.toThrow();
  });
});

// ─── THE WEBHOOK/REDIRECT RACE ───────────────────────────────────────────────
// Stripe redirects the browser and POSTs the webhook INDEPENDENTLY. If the
// redirect wins, the host lands with a blob claiming a pass and no row yet. A
// refresh on event open would read held:false and revoke the unlock of someone
// who paid seconds ago. `claimed` makes that "no" provisional.
describe('a NO is provisional while the blob claims a pass', () => {
  // REAL logic, real timers, a cadence of 1ms. `retryDelaysMs` is an option on
  // the function rather than a constant closed over, so the retry path under
  // test here is the same code production runs — only faster. CRA's jest has no
  // `advanceTimersByTimeAsync`, and hand-flushing microtasks through three
  // awaited fetches plus two awaited timers is the kind of test that passes for
  // the wrong reason.
  const FAST = { retryDelaysMs: [1, 1] };

  test('the production cadence is what ships — two delays, three asks', () => {
    // The guard on the line above: if this constant is widened into a poll, or
    // the fast cadence above silently stops matching its SHAPE, say so here.
    expect(CLAIM_RETRY_DELAYS_MS).toEqual([2000, 4000]);
    expect(FAST.retryDelaysMs).toHaveLength(CLAIM_RETRY_DELAYS_MS.length);
  });

  test('the row arriving late is picked up, and nothing is revoked in between', async () => {
    fetchEventPass
      .mockResolvedValueOnce({ event_id: 'cust-abc123', held: false })   // webhook not landed
      .mockResolvedValueOnce({ event_id: 'cust-abc123', held: true });   // it landed

    const done = refreshEventPass('cust-abc123', { claimed: true, ...FAST });
    await Promise.resolve();
    // The provisional no was NOT written: the blob claim still stands here.
    expect(serverPassHeld('cust-abc123')).toBe(null);

    await done;
    expect(serverPassHeld('cust-abc123')).toBe(true);
    expect(fetchEventPass).toHaveBeenCalledTimes(2);
  });

  test('a claim the server never backs IS revoked, after bounded re-asks', async () => {
    fetchEventPass.mockResolvedValue({ event_id: 'cust-abc123', held: false });

    await refreshEventPass('cust-abc123', { claimed: true, ...FAST });

    expect(serverPassHeld('cust-abc123')).toBe(false);
    // Two delays configured, so three asks in total — not an open-ended poll.
    expect(fetchEventPass).toHaveBeenCalledTimes(3);
  });

  test('a YES is never retried, claimed or not', async () => {
    fetchEventPass.mockResolvedValue({ event_id: 'cust-abc123', held: true });
    await refreshEventPass('cust-abc123', { claimed: true, ...FAST });
    expect(fetchEventPass).toHaveBeenCalledTimes(1);
  });

  test('an UNCLAIMED no is written straight away — no retries for nobody', async () => {
    fetchEventPass.mockResolvedValue({ event_id: 'cust-abc123', held: false });
    await refreshEventPass('cust-abc123', FAST);
    expect(serverPassHeld('cust-abc123')).toBe(false);
    expect(fetchEventPass).toHaveBeenCalledTimes(1);
  });

  test('a FAILED ask is never retried into a revocation either', async () => {
    fetchEventPass.mockRejectedValue(new Error('Pass lookup error 503'));
    expect(await refreshEventPass('cust-abc123', { claimed: true, ...FAST })).toBe(null);
    expect(serverPassHeld('cust-abc123')).toBe(null);
    expect(fetchEventPass).toHaveBeenCalledTimes(1);
  });

  test('an in-flight ask is UPGRADED by a later claimed caller', async () => {
    // The paid-return ordering: the shell asks on mount before the handler has
    // written the claim, then again once it has. Applying the FIRST call's
    // policy to the deduped answer would write the race's "no" down as a
    // revocation of a purchase made seconds earlier.
    fetchEventPass
      .mockResolvedValueOnce({ event_id: 'cust-abc123', held: false })
      .mockResolvedValueOnce({ event_id: 'cust-abc123', held: true });

    const first = refreshEventPass('cust-abc123', FAST);                      // claimed: false
    const second = refreshEventPass('cust-abc123', { claimed: true, ...FAST }); // the upgrade
    await Promise.all([first, second]);

    expect(fetchEventPass).toHaveBeenCalledTimes(2);   // ONE ask, which retried
    expect(serverPassHeld('cust-abc123')).toBe(true);
  });

  test('…and without the upgrade that same ordering revokes — the bug it prevents', async () => {
    // The negative that makes the test above mean something: identical mock,
    // identical ordering, no second caller. The "no" is written down.
    fetchEventPass
      .mockResolvedValueOnce({ event_id: 'cust-abc123', held: false })
      .mockResolvedValueOnce({ event_id: 'cust-abc123', held: true });

    await refreshEventPass('cust-abc123', FAST);
    expect(serverPassHeld('cust-abc123')).toBe(false);
    expect(fetchEventPass).toHaveBeenCalledTimes(1);
  });
});

describe('what the GATES do with it', () => {
  test('a server-confirmed pass unlocks the whole event, and says so', () => {
    billingOn();
    recordServerPass('cust-abc123', true);
    const e = ev({ passRequired: true, passReasons: ['destination', 'additional-event'] });
    expect(briefAllowed(e, 'v1')).toEqual({ allowed: true, reason: 'pass' });
    expect(destinationLocked(e)).toBe(false);
  });

  test('a blob-only pass still unlocks, but the reason names it a CLAIM', () => {
    // Deliberate: refusing to grant while the server has not answered buys no
    // security — this gate is client-side either way — and costs a host who
    // genuinely paid their unlock on every cold load. The distinction is kept
    // in the reason so copy can be honest instead of the shell guessing.
    billingOn();
    const e = ev({ passRequired: true, passReasons: ['additional-event'], passPurchased: true });
    expect(briefAllowed(e, 'v1')).toEqual({ allowed: true, reason: 'pass-claimed' });
    expect(destinationLocked(ev({ passRequired: true, passReasons: ['destination'], passPurchased: true }))).toBe(false);
  });

  test('a server NO re-locks an event whose blob claims a pass', () => {
    billingOn();
    recordServerPass('cust-abc123', false);
    const e = ev({ passRequired: true, passReasons: ['destination'], passPurchased: true });
    expect(briefAllowed(e, 'v1')).toEqual({ allowed: false, reason: 'pass-required' });
    expect(destinationLocked(e)).toBe(true);
  });

  test('NEVER MID-CONVERSATION still outranks a server NO', () => {
    // The ruling's clause, unchanged by any of this: a brief already shared is
    // an open conversation with a real vendor, and is never interrupted —
    // including when the server says the pass is gone.
    billingOn();
    recordServerPass('cust-abc123', false);
    const e = ev({ passRequired: true, passReasons: ['additional-event'], briefSharedVendorIds: ['v1'] });
    expect(briefAllowed(e, 'v1')).toEqual({ allowed: true, reason: 'already-shared' });
  });

  test('billing dormant still short-circuits everything, server record or not', () => {
    recordServerPass('cust-abc123', false);
    const e = ev({ passRequired: true, passReasons: ['destination'] });
    expect(briefAllowed(e, 'v2')).toEqual({ allowed: true, reason: 'billing-dormant' });
    expect(destinationLocked(e)).toBe(false);
  });
});
