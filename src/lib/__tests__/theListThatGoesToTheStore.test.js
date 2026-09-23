// ─── THE SHOPPING LIST THAT COULD ONLY BE SENT FROM THE OLD SHELL ────────────
//
// The CRA could push the shopping list to a pre-filled Instacart cart. The app
// people actually use could not. It was one of four host capabilities found
// living only in a shell CLAUDE.md schedules for deletion — the shipping list
// had aisle order, a day-of section and per-item prices, and no way out of the
// app.
//
// Ported to hostv2 on 2026-09-23. The engine did not change; it did not need to.
// What it needed was a caller.
//
// ── WHY THIS MODULE IS WORTH A TEST OF ITS OWN ─────────────────────────────
// It had none. And it is the exact shape that goes wrong quietly: a button that
// promises a store it may not be able to reach. The Instacart key lives on the
// server and is not set today, so the interesting path — the one every host
// takes right now — is the FALLBACK. A test that only covered the happy path
// would cover the case that never happens.
//
// THE CONTRACT: never a broken promise. Ask the backend for a real cart; if one
// comes back, open it. If not, copy the list, open Instacart's search, and SAY
// SO. The label says "Send the list to Instacart", which is the act either way —
// a label promising a filled cart would be false exactly when the key is
// missing, which is to say always, today.

describe('sending the list to the store degrades honestly', () => {
  const OLD = process.env.REACT_APP_API_BASE_URL;
  afterEach(() => {
    process.env.REACT_APP_API_BASE_URL = OLD;
    global.fetch = undefined;
    jest.resetModules();
  });

  const load = () => {
    jest.resetModules();
    // eslint-disable-next-line global-require
    return require('../instacart');
  };

  test('(premise) the fallback is a real Instacart URL, not a placeholder', () => {
    // The whole honest path rests on this link working. A dead URL would make
    // the "we copied it, go paste it" message a lie.
    const { INSTACART_FALLBACK } = load();
    expect(INSTACART_FALLBACK).toMatch(/^https:\/\/www\.instacart\.com\//);
    expect(INSTACART_FALLBACK).not.toMatch(/example|TODO|localhost/i);
  });

  test('NO BACKEND CONFIGURED: says so, and does not invent a cart', () => {
    // The state the public demo ships in. `configured:false` is what tells the
    // caller to take the copy-and-paste path rather than claim a cart.
    delete process.env.REACT_APP_API_BASE_URL;
    const { instacartCart } = load();
    return instacartCart('x', [{ name: 'ice', qty: 2, unit: 'bag' }]).then((r) => {
      expect(r).toEqual({ configured: false, url: null });
    });
  });

  test('BACKEND UP, NO KEY: configured, but still no cart — and the two are distinguished', () => {
    // This is today's live path, and the distinction is the point: the service
    // is reachable, the store is not. A caller that treated both as "offline"
    // could not tell a host anything useful.
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    const { instacartCart } = load();
    return instacartCart('x', [{ name: 'ice', qty: 1 }]).then((r) => {
      expect(r).toEqual({ configured: true, url: null });
    });
  });

  test('THE NETWORK FAILS: it is caught, not thrown at the host', () => {
    // A rejected fetch inside a click handler is an unhandled rejection and a
    // button that appears to do nothing.
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const { instacartCart } = load();
    return instacartCart('x', [{ name: 'ice' }]).then((r) => {
      expect(r).toEqual({ configured: false, url: null });
    });
  });

  test('A REAL CART COMES BACK: it is passed through untouched', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ url: 'https://instacart.com/cart/abc' }) });
    const { instacartCart } = load();
    return instacartCart('Spring Carnival', [{ name: 'ice', qty: 4, unit: 'bag' }]).then((r) => {
      expect(r.url).toBe('https://instacart.com/cart/abc');
    });
  });

  test('THE ITEMS ARE NORMALISED, because the shopping list and the store disagree on shape', () => {
    // `foodShopItems` returns { name, qty, unit }; the cart API wants
    // { name, quantity, unit }. The mapping lives in one place so a caller
    // cannot get it subtly wrong — the same single-owner rule this whole
    // session has been applying.
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
    let sent = null;
    global.fetch = jest.fn().mockImplementation((_u, opts) => {
      sent = JSON.parse(opts.body);
      return Promise.resolve({ ok: true, json: async () => ({ url: 'https://x' }) });
    });
    const { instacartCart } = load();
    return instacartCart('T', [
      { name: '  Ice  ', qty: 4, unit: 'bag' },
      { name: 'Buns' },                    // no qty, no unit
      { name: '   ' },                     // blank — must not reach the store
      null,
    ]).then(() => {
      expect(sent.items).toEqual([
        { name: 'Ice', quantity: 4, unit: 'bag' },
        { name: 'Buns', quantity: 1, unit: 'each' },
      ]);
      expect(sent.title).toBe('T');
    });
  });

  test('the default title carries the product name from its owner', () => {
    // Not retyped here. The rename earlier today is the reason that matters.
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
    let sent = null;
    global.fetch = jest.fn().mockImplementation((_u, opts) => {
      sent = JSON.parse(opts.body);
      return Promise.resolve({ ok: true, json: async () => ({ url: 'https://x' }) });
    });
    const { instacartCart } = load();
    // eslint-disable-next-line global-require
    const { BRAND } = require('../brand');
    return instacartCart('', []).then(() => {
      expect(sent.title).toBe(`${BRAND.full} shopping list`);
      expect(sent.title).not.toMatch(/boss/i);
    });
  });
});
