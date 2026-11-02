/**
 * @jest-environment jsdom
 */
// Owner ruling 2026-11-02 (option A, "hash it, build the toggle") on
// docs/legal/CONSENT_AND_TRACKING_COPY_DRAFT.md §2:
//  1. identifyStudio sent a slug of the business name AND the name itself to
//     PostHog — a sole proprietor's business name is often their own. Now it
//     sends a one-way hash and nothing else identifying.
//  2. An opted-out host was still identified (identifyStudio never checked the
//     opt-out) — PostHog loaded and an identify went out.
//  3. The opt-out had no control; the setter here is what the Settings toggle
//     calls, and the notice predicate decides the one-time first-open line.
// Red-proofed against the pre-ruling module.

const calls = { init: 0, identify: [], capture: [], optOut: 0, optIn: 0 };
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: () => { calls.init += 1; },
    identify: (id, props) => { calls.identify.push({ id, props }); },
    capture: (e, p) => { calls.capture.push({ e, p }); },
    set_config: () => {},
    opt_out_capturing: () => { calls.optOut += 1; },
    opt_in_capturing: () => { calls.optIn += 1; },
  },
}));

// jsdom 16 has neither SubtleCrypto nor TextEncoder; every browser this ships
// to has both. Use Node's real ones — the module refuses to identify without
// them, which is the fail-closed behavior, not the case under test here.
beforeAll(() => {
  Object.defineProperty(global, 'crypto', { value: require('crypto').webcrypto, configurable: true });
  if (typeof global.TextEncoder === 'undefined') global.TextEncoder = require('util').TextEncoder;
});

const load = () => {
  jest.resetModules();
  return require('../analytics');
};

beforeEach(() => {
  localStorage.clear();
  calls.init = 0; calls.identify = []; calls.capture = []; calls.optOut = 0; calls.optIn = 0;
  delete window.location;
  window.location = new URL('http://localhost/');     // every test starts local
});

// jsdom's default host is localhost, where analytics never runs. Pretend to be
// the deployed site for the identify/notice tests.
const asDeployed = () => {
  delete window.location;
  window.location = new URL('https://twillis45.github.io/ngw-event-planner/');
};

test('identify sends a one-way hash of the studio — never the name', async () => {
  asDeployed();
  const a = load();
  await a.identifyStudio({ businessName: 'Jane Doe Events', role: 'Owner' });
  expect(calls.identify).toHaveLength(1);
  const { id, props } = calls.identify[0];
  expect(id).toMatch(/^studio_[0-9a-f]{16}$/);
  const wire = JSON.stringify(calls.identify).toLowerCase();
  expect(wire).not.toContain('jane');
  expect(wire).not.toContain('doe');
  expect(props).toEqual({ role: 'Owner' });           // no studio_name
});

test('the same studio hashes to the same id (case and spacing ignored)', async () => {
  asDeployed();
  const a = load();
  await a.identifyStudio({ businessName: 'Jane Doe Events' });
  await a.identifyStudio({ businessName: '  jane doe events ' });
  expect(calls.identify[0].id).toBe(calls.identify[1].id);
});

test('an opted-out host is never identified, and PostHog never loads for it', async () => {
  asDeployed();
  localStorage.setItem('ngw-analytics-optout', '1');
  const a = load();
  await a.identifyStudio({ businessName: 'Jane Doe Events' });
  expect(calls.identify).toHaveLength(0);
  expect(calls.init).toBe(0);
});

test('the toggle setter writes the opt-out the module honors, and can undo it', () => {
  const a = load();
  expect(a.isAnalyticsOptedOut()).toBe(false);
  a.setAnalyticsOptOut(true);
  expect(localStorage.getItem(a.ANALYTICS_OPTOUT_KEY)).toBe('1');
  expect(a.isAnalyticsOptedOut()).toBe(true);
  a.setAnalyticsOptOut(false);
  expect(localStorage.getItem(a.ANALYTICS_OPTOUT_KEY)).toBe(null);
  expect(a.isAnalyticsOptedOut()).toBe(false);
});

test('the first-open notice shows once, only where analytics would actually run', () => {
  const local = load();
  expect(local.shouldShowAnalyticsNotice()).toBe(false);      // localhost: nothing is sent, nothing to say
  asDeployed();
  const a = load();
  expect(a.shouldShowAnalyticsNotice()).toBe(true);
  a.markAnalyticsNoticeSeen();
  expect(a.shouldShowAnalyticsNotice()).toBe(false);
  localStorage.clear();
  a.setAnalyticsOptOut(true);
  expect(a.shouldShowAnalyticsNotice()).toBe(false);          // already off: nothing to tell her
});

test('a browser that cannot hash is never identified — no readable fallback', async () => {
  asDeployed();
  const saved = global.crypto;
  Object.defineProperty(global, 'crypto', { value: {}, configurable: true });
  try {
    const a = load();
    await a.identifyStudio({ businessName: 'Jane Doe Events' });
    expect(calls.identify).toHaveLength(0);
  } finally {
    Object.defineProperty(global, 'crypto', { value: saved, configurable: true });
  }
});
