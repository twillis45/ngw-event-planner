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
