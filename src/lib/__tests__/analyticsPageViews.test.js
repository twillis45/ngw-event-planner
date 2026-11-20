/**
 * @jest-environment jsdom
 */
// Page views for PostHog's Web analytics tab (owner, 11/20/2026), and no code
// from a link ever leaving the browser in an address PostHog sees.
let config = null;
const captured = [];
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: { init: (_k, c) => { config = c; }, capture: (e, p) => { captured.push({ e, p }); }, set_config: () => {}, register_once: () => {} },
}));

const APP = 'https://twillis45.github.io/ngw-event-planner/hostv2/';
const load = () => {
  delete window.location;
  window.location = new URL(APP);   // a deployed build, not dev
  jest.resetModules();
  captured.length = 0;
  return require('../analytics');
};

describe('addresses PostHog sees', () => {
  test('invite, helper, vendor, family codes, event ids and tokens are removed; campaign tags stay', () => {
    const { cleanUrl } = load();
    const own = 'twillis45.github.io';
    expect(cleanUrl(APP + '?rsvp=AbC123xYz&utm_source=ig&utm_campaign=fall', own)).toBe(APP + '?utm_source=ig&utm_campaign=fall');
    for (const q of ['helper=H9', 'vendor=V9', 'family=F9', 'event=cust-1', 'token=T9', 'from=reminder', 'v=1']) {
      expect(cleanUrl(APP + '?' + q, own)).toBe(APP);
    }
    expect(cleanUrl(APP + '#access_token=SECRET&type=magiclink', own)).toBe(APP);
    expect(cleanUrl('https://events.noguessworksystems.com/hostv2/?rsvp=X', own)).toBe('https://events.noguessworksystems.com/hostv2/');
  });
  test('another site (a referrer) is reduced to its origin', () => {
    const { cleanUrl } = load();
    expect(cleanUrl('https://www.facebook.com/groups/123/posts/456?ref=x', 'twillis45.github.io')).toBe('https://www.facebook.com/');
  });
  test('non-addresses pass through untouched', () => {
    const { cleanUrl } = load();
    expect(cleanUrl('board')).toBe('board');
    expect(cleanUrl(42)).toBe(42);
    expect(cleanUrl(undefined)).toBe(undefined);
  });
  test('before_send scrubs every address in the event and in person properties', async () => {
    const { track } = load();
    await track('host_home_viewed', {});
    const out = config.before_send({ event: '$pageview',
      properties: { $current_url: APP + '?rsvp=SECRETCODE', $referrer: 'https://mail.google.com/mail/u/0/#inbox/abc', page: 'invite' },
      $set_once: { $initial_current_url: APP + '?helper=SECRET2', $initial_referrer: 'https://x.com/someone/status/1' } });
    const all = JSON.stringify(out);
    expect(all).not.toMatch(/SECRET|inbox|someone/);
    expect(out.properties.$current_url).toBe(APP);
    expect(out.properties.$referrer).toBe('https://mail.google.com/');
    expect(out.properties.page).toBe('invite');
  });
});

describe('page views', () => {
  test('each screen-level event also records one $pageview naming the page', async () => {
    const { track } = load();
    await track('host_home_viewed', { page: 'host_shell_v2' });
    await track('section_opened', { section: 'Guests' });
    await track('invite_viewed', { event_type: 'birthday' });
    await track('pass_sheet_viewed', {});
    await track('messages_view_opened', { entry: 'route' });
    await track('nudge_sent', { emailed: 2 });   // not a screen: no page view
    expect(captured.filter(c => c.e === '$pageview').map(c => c.p.page))
      .toEqual(['board', 'section/guests', 'invite', 'pass', 'messages']);
  });
  test('opted out: no page view either', async () => {
    const { track } = load();
    localStorage.setItem('ngw-analytics-optout', '1');
    await track('host_home_viewed', {});
    localStorage.removeItem('ngw-analytics-optout');
    expect(captured).toEqual([]);
  });
});
