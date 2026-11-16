/**
 * @jest-environment jsdom
 */
// Email, name and phone never leave for PostHog. The hook that did this,
// `sanitize_properties`, is deprecated in posthog-js (it logs "Use before_send
// instead", seen on the live site 11/16/2026), so the stripping now lives in
// `before_send`, set at init — not in a `loaded` callback that runs later.
let config = null;
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: { init: (_k, c) => { config = c; }, capture: () => {}, set_config: () => {} },
}));

test('PostHog is started with a before_send that removes contact details', async () => {
  delete window.location;
  window.location = new URL('https://twillis45.github.io/ngw-event-planner/');   // a deployed build, not dev
  jest.resetModules();
  const { track } = require('../analytics');
  await track('host_home_viewed', { page: 'host_shell_v2' });
  expect(config).toBeTruthy();
  expect('sanitize_properties' in config).toBe(false);
  expect(typeof config.before_send).toBe('function');
  const out = config.before_send({ event: 'x', properties: { page: 'p', email: 'a@b.co', name: 'Ann', phone: '555', $email: 'a@b.co', $name: 'Ann' } });
  expect(out.properties).toEqual({ page: 'p' });
  expect(out.event).toBe('x');
  expect(config.before_send(null)).toBe(null);          // nothing to send stays nothing
});
