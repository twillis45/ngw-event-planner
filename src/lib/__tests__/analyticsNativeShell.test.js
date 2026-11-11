/**
 * @jest-environment jsdom
 */
// NAT-7: a Capacitor shell serves the bundle from a localhost origin
// (capacitor://localhost on iOS, https://localhost or http://localhost on
// Android). IS_LOCAL matched the hostname alone, so PostHog was silently OFF
// in every native install. A native shell is a real install, not local dev;
// real local dev (vite :5173, CRA :3000, 127.0.0.1) must stay off, and the
// opt-out must still win. Red-proofed against the hostname-only IS_LOCAL.

const calls = { init: 0, capture: [] };
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: () => { calls.init += 1; },
    identify: () => {},
    capture: (e, p) => { calls.capture.push({ e, p }); },
    set_config: () => {},
    opt_out_capturing: () => {},
    opt_in_capturing: () => {},
  },
}));

const at = (href, native) => {
  delete window.location;
  window.location = new URL(href);
  if (native === undefined) delete window.Capacitor;
  else window.Capacitor = { isNativePlatform: () => native };
  jest.resetModules();
  return require('../analytics');
};

beforeEach(() => {
  localStorage.clear();
  calls.init = 0; calls.capture = [];
});
afterAll(() => { delete window.Capacitor; });

test.each([
  ['capacitor://localhost/', 'iOS'],
  ['https://localhost/', 'Android (https scheme)'],
  ['http://localhost/', 'Android (http scheme)'],
])('a native shell at %s (%s) reports', async (href) => {
  const a = at(href, true);
  expect(a.isAnalyticsConfigured()).toBe(true);
  await a.track('pass_sheet_viewed', { surface: 'test' });
  expect(calls.capture.map((c) => c.e)).toEqual(['pass_sheet_viewed']);
});

test.each([
  ['http://localhost:5173/', undefined],          // vite dev server
  ['http://127.0.0.1:5173/', undefined],
  ['http://localhost:3000/', undefined],          // CRA dev server
  ['http://localhost:5173/', false],              // @capacitor/core on the web: not native
])('local dev at %s (Capacitor native=%s) never reports', async (href, native) => {
  const a = at(href, native);
  expect(a.isAnalyticsConfigured()).toBe(false);
  await a.track('pass_sheet_viewed');
  expect(calls.init).toBe(0);
  expect(calls.capture).toEqual([]);
});

test('an opted-out native shell sends nothing', async () => {
  localStorage.setItem('ngw-analytics-optout', '1');
  const a = at('capacitor://localhost/', true);
  await a.track('pass_sheet_viewed');
  expect(calls.init).toBe(0);
  expect(calls.capture).toEqual([]);
});
