// ─── PASS SALES PAUSED: THE SHEET SAYS "PAUSED", NOT "FREE IN PREVIEW" ───────
//
// Stage 9 work order #9 (11/11/2026). The backend's PASS_SALES_PAUSED flag
// makes /api/capabilities report `stripe_can_honour_purchases: false` and
// `pass_sales_paused: true`. The first alone would hide the buy button and drop
// the sheet into "Free while … is in preview" — untrue when billing is live
// and only new sales are stopped. Backend half: backend/tests/test_pass_sales_pause.py.
// The sheet's copy is a rendered claim, so it lives in an e2e spec, not here:
// hostv2/e2e/passSalesPausedSaysPaused.spec.mjs.
jest.mock('../supabaseClient', () => ({ supabase: null, isSupabaseConfigured: () => false }));

// Both modules capture BASE at import time, so load them after the env is set,
// in one isolated registry so commApi writes into the stripeApi we read.
const load = () => {
  process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
  let comm; let stripe;
  jest.isolateModules(() => {
    stripe = require('../stripeApi');
    comm = require('../commApi');
  });
  return { comm, stripe };
};

const caps = (body) => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => body }));
};

afterEach(() => { delete global.fetch; });

describe('commApi records pass_sales_paused from capabilities', () => {
  test('a paused backend sets the flag true (and cannot-honour false)', async () => {
    const { comm, stripe } = load();
    caps({ stripe_configured: true, stripe_can_honour_purchases: false, pass_sales_paused: true });
    await comm.getCapabilities();
    expect(stripe.passSalesPaused()).toBe(true);
    expect(stripe.stripeCanHonourPurchases()).toBe(false);
  });

  test('an unpaused backend sets it false', async () => {
    const { comm, stripe } = load();
    caps({ stripe_configured: true, stripe_can_honour_purchases: true, pass_sales_paused: false });
    await comm.getCapabilities();
    expect(stripe.passSalesPaused()).toBe(false);
  });

  test('an older backend without the key leaves it UNKNOWN, not false', async () => {
    const { comm, stripe } = load();
    caps({ stripe_configured: true, stripe_can_honour_purchases: true });
    await comm.getCapabilities();
    expect(stripe.passSalesPaused()).toBeNull();
  });
});
