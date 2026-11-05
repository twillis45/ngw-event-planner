jest.mock('../commApi', () => ({ plannerAuthHeaders: jest.fn(async () => ({})) }));
test('native digital purchase never creates Stripe session before a store billing decision', async () => {
  const original = process.env.REACT_APP_API_BASE_URL;
  const fetchOriginal = global.fetch;
  process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
  process.env.REACT_APP_PUBLIC_APP_URL = 'https://app.example.test/';
  window.Capacitor = { isNativePlatform: () => true };
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ url: 'https://checkout.stripe.test/' }) }));
  try {
    let api;
    jest.isolateModules(() => { api = require('../stripeApi'); });
    await expect(api.createPassSession({ eventId: 'cust-test' })).rejects.toThrow(/not available in this app/i);
    await expect(api.createSubscriptionSession({ plan: 'pro' })).rejects.toThrow(/not available in this app/i);
    expect(global.fetch).not.toHaveBeenCalled();
  } finally {
    delete window.Capacitor;
    delete process.env.REACT_APP_PUBLIC_APP_URL;
    if (original === undefined) delete process.env.REACT_APP_API_BASE_URL; else process.env.REACT_APP_API_BASE_URL = original;
    global.fetch = fetchOriginal;
  }
});
