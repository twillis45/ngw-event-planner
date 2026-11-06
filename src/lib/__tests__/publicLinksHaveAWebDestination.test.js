import { publicAppUrl } from '../publicAppUrl';

const original = process.env.REACT_APP_PUBLIC_APP_URL;
afterEach(() => {
  if (original === undefined) delete process.env.REACT_APP_PUBLIC_APP_URL;
  else process.env.REACT_APP_PUBLIC_APP_URL = original;
});

test('an explicitly configured public URL wins over a bundled native origin', () => {
  process.env.REACT_APP_PUBLIC_APP_URL = 'https://app.example.com/hostv2/';
  expect(publicAppUrl({ origin: 'capacitor://localhost', pathname: '/' })).toBe('https://app.example.com/hostv2/');
});

test('ordinary web deployments keep their current path until a cutover is configured', () => {
  delete process.env.REACT_APP_PUBLIC_APP_URL;
  expect(publicAppUrl({ origin: 'https://example.com', pathname: '/site/hostv2/' })).toBe('https://example.com/site/hostv2/');
});

test.each(['capacitor://localhost', 'http://localhost', 'file://'])('a native runtime cannot become an invitation or payment return URL: %s', origin => {
  delete process.env.REACT_APP_PUBLIC_APP_URL;
  expect(() => publicAppUrl({ origin, pathname: '/' }, true)).toThrow(/public web address/i);
});

test.each(['javascript:alert(1)', 'https://user:secret@example.com/', 'https://example.com/?token=secret', 'https://example.com/#access_token=secret', 'http://example.com/'])('unsafe configured destinations fail visibly: %s', value => {
  process.env.REACT_APP_PUBLIC_APP_URL = value;
  expect(() => publicAppUrl()).toThrow(/public web address/i);
});

jest.mock('../commApi', () => ({ plannerAuthHeaders: jest.fn(async () => ({})) }));

test('actual checkout requests use the public path and keep Stripe verification parameters', async () => {
  const apiBase = process.env.REACT_APP_API_BASE_URL;
  const originalFetch = global.fetch;
  process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
  process.env.REACT_APP_PUBLIC_APP_URL = 'https://app.example.com/hostv2/';
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ session_id: 'cs_example' }) }));
  try {
    let api;
    jest.isolateModules(() => { api = require('../stripeApi'); });
    await api.createPassSession({ eventId: 'event one' });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.success_url).toBe('https://app.example.com/hostv2/?pass_paid=1&event_id=event%20one&session_id={CHECKOUT_SESSION_ID}');
    expect(body.cancel_url).toBe('https://app.example.com/hostv2/?pass_cancel=1');
    expect(body).not.toHaveProperty('amount_cents');
    process.env.REACT_APP_PUBLIC_APP_URL = 'capacitor://localhost/';
    await expect(api.createPassSession({ eventId: 'event one' })).rejects.toThrow(/public web address/i);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  } finally {
    global.fetch = originalFetch;
    if (apiBase === undefined) delete process.env.REACT_APP_API_BASE_URL;
    else process.env.REACT_APP_API_BASE_URL = apiBase;
  }
});
