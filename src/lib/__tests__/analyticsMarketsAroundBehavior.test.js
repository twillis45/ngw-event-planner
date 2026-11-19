/**
 * @jest-environment jsdom
 */
// Owner, 11/19/2026: "Do we have everything for PostHog that's needed to market
// and promote around behavior?" then "Build the PostHog fixes after #176." The
// live app never identified anyone, never fired signed_up / returned_d7 /
// event_qualified, did not count email or text invites, and could lose the
// landing URL's campaign tags (PostHog loads at the first tracked action).
// What is pinned here, and what must stay true about privacy while it is:
//   · a signed-in host is ONE person across devices, by a one-way hash of the
//     account id (the server labels a purchase the same way), never an email;
//   · campaign tags are read at boot and ride every event as the FIRST touch;
//   · sign-up, day-1/day-7 returns, real plans and a second plan fire once;
//   · an opted-out host sends nothing at all.

const calls = { init: 0, identify: [], capture: [], registerOnce: [], reset: 0 };
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: () => { calls.init += 1; },
    identify: (id, set, setOnce) => { calls.identify.push({ id, set, setOnce }); },
    capture: (e, p) => { calls.capture.push({ e, p }); },
    register_once: (p) => { calls.registerOnce.push(p); },
    reset: () => { calls.reset += 1; },
    opt_out_capturing: () => {}, opt_in_capturing: () => {},
  },
}));

beforeAll(() => {
  Object.defineProperty(global, 'crypto', { value: require('crypto').webcrypto, configurable: true });
  if (typeof global.TextEncoder === 'undefined') global.TextEncoder = require('util').TextEncoder;
});

const deployed = (search = '') => {
  delete window.location;
  window.location = new URL('https://twillis45.github.io/ngw-event-planner/hostv2/' + search);
};
const load = () => { jest.resetModules(); return require('../analytics'); };
const flush = () => new Promise((r) => setTimeout(r, 0));
const names = () => calls.capture.map((c) => c.e);

beforeEach(() => {
  localStorage.clear();
  calls.init = 0; calls.identify = []; calls.capture = []; calls.registerOnce = []; calls.reset = 0;
  deployed();
});

const USER = { id: '9f1c2d3e-aaaa-bbbb-cccc-0123456789ab', email: 'host@example.test', created_at: new Date().toISOString(), app_metadata: { provider: 'email' } };

describe('campaign tags', () => {
  test('a landing URL’s utm tags and referring site are kept as the first touch', () => {
    const a = load();
    const c = a.campaignFrom('?utm_source=instagram&utm_medium=social&utm_campaign=friendsgiving&rsvp=x', 'https://l.instagram.com/some/path?u=secret', 'twillis45.github.io');
    expect(c).toEqual({ utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'friendsgiving', referrer_host: 'l.instagram.com' });
    expect(JSON.stringify(c)).not.toContain('secret');            // the referrer's path and query are never kept
  });

  test('this app’s own pages are not a referrer, and no tags is no campaign', () => {
    const a = load();
    expect(a.campaignFrom('', 'https://twillis45.github.io/ngw-event-planner/', 'twillis45.github.io')).toBeNull();
  });

  test('read at boot, kept once, and registered on every event when PostHog starts', async () => {
    deployed('?utm_source=newsletter&utm_campaign=nov');
    const a = load();
    expect(a.firstTouchProps(localStorage)).toEqual({ first_utm_source: 'newsletter', first_utm_campaign: 'nov' });
    deployed('?utm_source=later');
    load();                                                         // a later visit never overwrites the first
    expect(a.firstTouchProps(localStorage).first_utm_source).toBe('newsletter');
    await a.track('section_opened', { section: 'guests' });
    expect(calls.registerOnce).toEqual([{ first_utm_source: 'newsletter', first_utm_campaign: 'nov' }]);
  });
});

describe('one person across devices', () => {
  test('a signed-in host is identified by a hash of the account id: never the email or the raw id', async () => {
    const a = load();
    await a.identifyAccount(USER);
    expect(calls.identify).toHaveLength(1);
    expect(calls.identify[0].id).toMatch(/^host_[0-9a-f]{16}$/);
    const wire = JSON.stringify(calls.identify);
    expect(wire).not.toContain(USER.id);
    expect(wire).not.toContain('host@example.test');
  });

  test('the label matches the server’s (backend app/analytics.account_label: sha256 → 16 hex)', async () => {
    const a = load();
    const want = 'host_' + require('crypto').createHash('sha256').update(USER.id).digest('hex').slice(0, 16);
    expect(await a.accountLabel(USER.id)).toBe(want);
  });

  test('sign-out resets, so the next person on this browser is someone else', async () => {
    const a = load();
    await a.identifyAccount(USER);
    await a.resetAnalytics();
    expect(calls.reset).toBe(1);
  });
});

describe('sign-up and return', () => {
  test('a new account fires signed_up once, with how they signed in and where they first came from', async () => {
    deployed('?utm_source=google');
    const a = load();
    await a.trackAccountSession(USER);
    await a.trackAccountSession(USER);
    await flush();
    const ups = calls.capture.filter((c) => c.e === 'signed_up');
    expect(ups).toHaveLength(1);
    expect(ups[0].p).toMatchObject({ is_new_account: true, auth_method: 'email', first_utm_source: 'google' });
  });

  test('day 1 and day 7 returns fire once each from the account’s own age', async () => {
    const a = load();
    const old = { ...USER, created_at: new Date(Date.now() - 8 * 86400000).toISOString() };
    await a.trackAccountSession(old);
    await a.trackAccountSession(old);
    await flush();
    expect(names().filter((n) => n === 'returned_d1')).toHaveLength(1);
    expect(names().filter((n) => n === 'returned_d7')).toHaveLength(1);
    expect(calls.capture.find((c) => c.e === 'signed_up').p.is_new_account).toBe(false);
  });
});

describe('real plans', () => {
  const plan = (id, extra) => ({ id, type: 'Friendsgiving', date: '2026-11-26', guestEstimate: 12, createdAt: new Date().toISOString(), ...extra });

  test('a date and a head count make a plan real: once per plan, and a second plan once', async () => {
    const a = load();
    a.trackActivation([plan('a'), { id: 'b', type: 'Birthday', date: '' }]);
    a.trackActivation([plan('a'), plan('b2', { acquisitionSource: { from: 'invite' } })]);
    a.trackActivation([plan('a'), plan('b2')]);
    await flush();
    const q = calls.capture.filter((c) => c.e === 'event_qualified');
    expect(q).toHaveLength(2);
    expect(q[1].p).toMatchObject({ event_type: 'Friendsgiving', acquisition_source: 'invite' });
    expect(names().filter((n) => n === 'second_event_created')).toHaveLength(1);
    expect(JSON.stringify(q)).not.toContain('"b2"');                // no event id is sent
  });
});

test('an opted-out host sends nothing: no identify, no sign-up, no plans', async () => {
  localStorage.setItem('ngw-analytics-optout', '1');
  const a = load();
  await a.trackAccountSession(USER);
  a.trackActivation([{ id: 'a', date: '2026-11-26', guestEstimate: 4 }]);
  await flush();
  expect(calls.identify).toEqual([]);
  expect(calls.capture).toEqual([]);
});
