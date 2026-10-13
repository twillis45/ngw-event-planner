// ─── THE PRICE IS NOT THE BROWSER'S TO SEND ──────────────────────────────────
//
// `docs/audits/2026-10-03_STRIPE_CONSUMER_CHECKOUT_READINESS.md` listed, as gap
// #3, that the One-Event Pass checkout took its amount from the caller. That
// was not a hypothetical: the hostv2 pass sheet called
//
//     createCheckoutSession({ amountCents: 3900,
//                             feeId: 'one-event-pass-' + event.id, … })
//
// so a buyer who edited the bundle posted one cent and received the same
// entitlement. `amount_cents` is CORRECT for a planner's own fee — the planner
// sets that number, and App.js still uses it that way — and wrong for a fixed
// price product. `/api/stripe/create-pass-session` exists to take the number
// away from the browser.
//
// The backend half is pinned in `backend/tests/test_stripe_pass_entitlement.py`
// (`test_the_pass_request_has_no_price_field_at_all`). This is the FRONTEND
// half, which is the half that regressed: the server growing a price field is
// unlikely; a shell reaching for the helper that accepts one is exactly the
// change someone makes while fixing something else.
import fs from 'fs';
import path from 'path';

jest.mock('../commApi', () => ({
  plannerAuthHeaders: async () => ({ Authorization: 'Bearer test-token' }),
}));

// `stripeApi` captures `BASE` from the environment at IMPORT time — the wart
// `passGate.isBillingLive()` exists to work around, written up in its own
// header. So the module has to be loaded AFTER the env is set, not at the top
// of this file, or every call throws "No API backend configured".
const loadApi = () => {
  process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
  let mod;
  jest.isolateModules(() => { mod = require('../stripeApi'); });
  return mod;
};

const SHELL = path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx');
const shell = () => fs.readFileSync(SHELL, 'utf8');

// Comments stripped, because this file's own explanation of the defect QUOTES
// the old call — `createCheckoutSession({ amountCents: 3900, … })` — and a
// matcher that reads comments reports the documentation as the regression. The
// first run of this suite did exactly that.
const code = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// The sheet's own block, so a match somewhere else in an 18k-line file cannot
// stand in for the thing under test.
// Bounded by the NEXT sheet block, not by a character count. The first version
// took a fixed 5,000-char window and silently stopped short of the render
// branch, so three assertions failed on correct code — a window that can end
// mid-block is a matcher that reports absence it never looked for.
const passSheet = () => {
  const src = shell();
  const at = src.indexOf("sheet.kind === 'pass' && (() => {");
  expect(at).toBeGreaterThan(-1);          // premise: the block still exists
  const end = src.indexOf("{sheet.kind === 'help' && (() => {", at);
  expect(end).toBeGreaterThan(at);         // premise: the next block still follows
  return src.slice(at, end);
};

describe('the pass checkout sends no price', () => {
  let body;
  let createPassSession;

  beforeEach(() => {
    body = null;
    ({ createPassSession } = loadApi());
    global.fetch = jest.fn(async (_url, opts) => {
      body = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/x', session_id: 'cs_1' }) };
    });
    delete window.location;
    window.location = { origin: 'https://twillis45.github.io', pathname: '/ngw-event-planner/', assign: jest.fn() };
  });

  afterEach(() => { delete global.fetch; });

  test('the request carries an event and NOTHING that looks like money', async () => {
    await createPassSession({ eventId: 'cust-abc123' });

    expect(body.event_id).toBe('cust-abc123');
    for (const k of ['amount_cents', 'amountCents', 'amount', 'price', 'unit_amount', 'currency']) {
      expect(body).not.toHaveProperty(k);
    }
    // Named exhaustively AND shape-checked, so a differently-spelled money
    // field (`cents`, `total`) fails too rather than slipping past the list.
    expect(Object.keys(body).sort()).toEqual(['cancel_url', 'event_id', 'success_url']);
  });

  test('it posts to create-pass-session, with planner auth', async () => {
    await createPassSession({ eventId: 'cust-abc123' });
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/stripe/create-pass-session');
    expect(opts.method).toBe('POST');
    expect(opts.headers.Authorization).toBe('Bearer test-token');
  });

  test('the return url is the PASS shape, and carries Stripe\'s own session token', async () => {
    await createPassSession({ eventId: 'cust-abc123' });
    // `?pass_paid=1`, not the fee flow's `?stripe_paid=1&fee_id=…`: a pass
    // session's metadata holds `kind: 'pass'` and no fee_id, so the old return
    // shape has nothing to verify against.
    expect(body.success_url).toContain('pass_paid=1');
    expect(body.success_url).toContain('event_id=cust-abc123');
    // Stripe's substitution token, literal — if this were interpolated away the
    // return trip could not name the session it came from.
    expect(body.success_url).toContain('{CHECKOUT_SESSION_ID}');
    expect(body.success_url.startsWith('https://twillis45.github.io/ngw-event-planner/')).toBe(true);
    expect(body.cancel_url).toContain('pass_cancel=1');
  });

  test('an id with url-significant characters is encoded, not concatenated', async () => {
    await createPassSession({ eventId: 'cust-a&b=c' });
    expect(body.success_url).toContain('event_id=cust-a%26b%3Dc');
  });

  test('a refusal surfaces the server\'s reason, not a generic failure', async () => {
    // The 409s are real answers — "already has a pass", "not synced yet" — and
    // the sheet branches on them to avoid telling a host to "try again" when
    // trying again is not the fix.
    global.fetch = jest.fn(async () => ({
      ok: false, status: 409, json: async () => ({ detail: 'This event already has a pass. Nothing more to buy.' }),
    }));
    await expect(createPassSession({ eventId: 'cust-abc123' })).rejects.toThrow(/already has a pass/);
  });
});

describe('…and the shell does not reach for the helper that accepts one', () => {
  test('the pass sheet calls createPassSession', () => {
    expect(passSheet()).toMatch(/createPassSession\(\{\s*eventId:/);
  });

  test('hostv2 does not import createCheckoutSession at all', () => {
    // Not merely unused — not imported. An import is an invitation, and this
    // shell sells exactly one thing at exactly one price.
    const imports = code(shell()).split('\n').filter((l) => /^import .*stripeApi/.test(l)).join('\n');
    expect(imports).toContain('createPassSession');
    expect(imports).not.toContain('createCheckoutSession');
  });

  test('no literal $39 amount is posted from the pass sheet', () => {
    // 3900 as an argument is the regression. The string "$39" in COPY is
    // correct and must stay, so this looks for the number in code shape.
    const sheet = code(passSheet());
    expect(sheet).not.toMatch(/amountCents\s*:/);
    expect(sheet).not.toMatch(/amount_cents\s*:/);
    expect(sheet).not.toMatch(/\b3900\b/);
    expect(passSheet()).toContain('$39');    // the price still gets SHOWN
  });

  test('(premise) the fee helper is still live where a caller DOES set the price', () => {
    // If this ever fails, the assertions above have stopped meaning "the pass
    // uses the right route" and started meaning "nothing uses either".
    const app = fs.readFileSync(path.join(__dirname, '..', '..', 'App.js'), 'utf8');
    expect(app).toMatch(/createCheckoutSession/);
  });
});

describe('the sheet never offers to sell a pass the event already owns', () => {
  // `canCharge` answers "may this deployment take money", which is not the
  // question "does this host owe any". Nothing asked the second one until
  // 2026-10-13, so an owner opened this sheet to a "Get the pass — $39" button
  // and the server's 409 caught it only AFTER the tap. UX_07: the refusal was
  // honest and the button was a lie.
  test('held is checked, and it wins over BOTH other states', () => {
    const sheet = code(passSheet());
    expect(sheet).toMatch(/const held = passHeld\(event\)/);
    // Ordering is the whole fix: a held pass must be checked before canCharge
    // (don't sell it twice) and before the preview state (don't tell someone
    // who paid that the app is free).
    const heldAt = sheet.indexOf('held.held ?');
    const chargeAt = sheet.indexOf('canCharge ?');
    expect(heldAt).toBeGreaterThan(-1);
    expect(chargeAt).toBeGreaterThan(heldAt);
  });

  test('the owned state does not claim a confirmation it may not have', () => {
    // passHeld can answer from the event's own record when the server has not
    // been asked. "Unlocked" is true either way; "confirmed with Stripe" would
    // be inventing the part we do not know.
    const sheet = passSheet();
    const at = sheet.indexOf('This event has the pass');
    expect(at).toBeGreaterThan(-1);
    const block = sheet.slice(at, at + 700);
    expect(block).not.toMatch(/confirmed with Stripe|verified with Stripe|Stripe confirmed/i);
  });

  test('(premise) the buy button and the preview state both still exist', () => {
    // Without this, the ordering assertions above would keep passing on a sheet
    // that had lost one of the branches entirely.
    const sheet = passSheet();
    expect(sheet).toContain('Get the pass — $39');
    expect(sheet).toMatch(/Free while .* is in preview/);
  });
});

describe('a charge is never offered where it cannot be recorded', () => {
  // The audit's core finding, finally enforceable: "flipping
  // REACT_APP_BILLING_LIVE would take money and deliver nothing recoverable."
  // No client-side flag can know that — with no STRIPE_WEBHOOK_SECRET the
  // server refuses the grant — so the backend reports it through
  // /api/capabilities and the sheet's third gate reads it.
  test('canCharge consults it, and treats UNKNOWN as carry-on', () => {
    const sheet = code(passSheet());
    expect(sheet).toMatch(/stripeCanHonourPurchases\(\) !== false/);
    // `!== false`, never a truthiness test. The capability is null until the
    // one-shot capabilities fetch resolves, and a truthy test would read null
    // as "cannot" — showing "free while in preview" on first paint and
    // swapping to a $39 button a moment later. Two claims about price on the
    // one surface where that cannot happen.
    expect(sheet).not.toMatch(/&&\s*stripeCanHonourPurchases\(\)\s*&&/);
  });

  test('the flag really is three-state, and a missing key stays unknown', () => {
    const { setStripeCanHonourPurchases, stripeCanHonourPurchases } = loadApi();
    expect(stripeCanHonourPurchases()).toBe(null);      // nothing asked yet
    setStripeCanHonourPurchases(false);
    expect(stripeCanHonourPurchases()).toBe(false);
    setStripeCanHonourPurchases(true);
    expect(stripeCanHonourPurchases()).toBe(true);
    setStripeCanHonourPurchases(null);
    expect(stripeCanHonourPurchases()).toBe(null);
  });

  test('commApi records it ONLY when the backend actually sent a boolean', () => {
    // An older deployment that has not shipped the new capabilities key must
    // leave the flag null. Reading a missing key as false would hide the buy
    // button everywhere that has not redeployed yet.
    const src = fs.readFileSync(path.join(__dirname, '..', 'commApi.js'), 'utf8');
    expect(src).toMatch(/typeof data\.stripe_can_honour_purchases === 'boolean'/);
  });

  test('the backend computes it from BOTH secrets', () => {
    const main = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'backend', 'app', 'main.py'), 'utf8');
    expect(main).toMatch(/"stripe_can_honour_purchases":\s*bool\(STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET\)/);
  });
});

describe('the paid return reads our own record, and keeps old receipts working', () => {
  test('the pass branch asks the entitlement, and does not verify the redirect', () => {
    const src = shell();
    const at = src.indexOf('const passPaidApplied = useRef(false);');
    expect(at).toBeGreaterThan(-1);
    const handler = src.slice(at, at + 3000);
    // The row is the proof: only a signature-verified webhook can write it.
    expect(handler).toMatch(/kind === 'pass'/);
    expect(handler).toMatch(/refreshEventPass\(paidEventId, \{ claimed: true \}\)/);
    expect(handler).toMatch(/serverPassHeld\(paidEventId\) === true/);
  });

  test('the legacy fee-shaped return is STILL parsed — a receipt email is permanent', () => {
    // Deleting this branch would turn a real Stripe receipt link into one that
    // silently does nothing, and the handler's own copy tells people to use it.
    const src = shell();
    expect(src).toMatch(/q\.get\('stripe_paid'\) === '1'/);
    expect(src).toMatch(/q\.get\('pass_paid'\) === '1'/);
    expect(src).toMatch(/verifySession\(sessionId\)/);
  });

  test('the blob is only written AFTER something confirmed it', () => {
    // `passPurchased` is the fallback claim passGate reads when the server has
    // not answered. If this handler could write it before confirmation, the
    // shell would be manufacturing the very claim the server record exists to
    // replace.
    const src = shell();
    const at = src.indexOf('const passPaidApplied = useRef(false);');
    const handler = src.slice(at, at + 3000);
    const writeAt = handler.indexOf('passPurchased: true');
    expect(writeAt).toBeGreaterThan(-1);
    // The only write lives inside `unlocked()`, which both confirmed paths call
    // and neither unconfirmed path does.
    expect(handler.slice(Math.max(0, writeAt - 400), writeAt)).toMatch(/const unlocked = \(\) => \{/);
    expect((handler.match(/passPurchased: true/g) || []).length).toBe(1);
  });
});
