// ─── GOLD-09: THE PASS ENTITLEMENT, IN A BROWSER ────────────────────────────
//
// The GOLD acceptance matrix has carried "pass entitlement (Postgres) not in
// any e2e" since the gate. Measured again 2026-11-02 and still true: a grep
// across all 133 specs for passGate|event_passes|passPurchased|stripe returns
// ONE hit, and it is a negative control inside the demo spec asserting a demo
// id is NOT treated as a purchase. Nothing drove purchase -> entitlement ->
// unlock in a browser.
//
// That gap sits directly on stage-9 precondition #4 ("live-keys Stripe
// purchase, then REACT_APP_BILLING_LIVE=1"), which is to say: the money path
// was about to be switched on without one browser ever having walked it.
//
// WHAT THE UNIT SUITES ALREADY DO, so this does not repeat them.
// `passGate.test.js` and `passEntitlement.test.js` drive the MODULES and drive
// them well — the grandfather stamp, briefAllowed's never-mid-conversation
// clause, the in-flight upgrade, the retry ladder. What they structurally
// cannot see is the SHELL: whether the refresh effect fires at all, whether
// its two guards hold, and whether a server answer reaches the sheet a host
// actually reads. Those are the four things below.
//
// THE RACE IS THE REASON THIS SPEC EXISTS. Stripe redirects the browser and
// POSTs the webhook independently, so a host who just paid can land with the
// event blob already claiming a pass and `public.event_passes` not yet
// written. The fifty-third handoff entry records that adding the refresh
// WITHOUT handling that "would have revoked the unlock of a host who paid
// seconds earlier". `refreshEventPass` makes that "no" provisional and retries
// (2s, 4s). Test 6 is the only thing anywhere that proves the shell wires
// `claimed` through to it, and test 7 is its negative control: an unclaimed
// "no" must still revoke, or the fix would just be a blanket ignore-the-server.
//
// RUN: cd hostv2 && npm run e2e:build && npm run test:e2e
// This spec has its OWN bundle on 5266 (see playwright.config.mjs and
// .env.passgate) because the shared one has billing dormant by design.
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';
import { openSectionByName } from './fixtures.mjs';

// Only the passgate bundle has REACT_APP_BILLING_LIVE=1. Addressing 5233 here
// would measure a dormant paywall and pass vacuously.
const BASE = previewUrl(Number(process.env.PW_PASSGATE_PORT || 5266));
const API = 'https://passgate-mock.invalid';

const EVENT_ID = 'cust-passgate-1';   // cust- => isUserCreatedEvent true
const SAMPLE_ID = 'ev-x-sample-1';    // neither cust- nor ev-copy- => a sample

const eventFixture = (over = {}) => ({
  id: EVENT_ID,
  name: 'Pass Harness Event',
  type: 'birthday',
  date: '2026-12-12',
  guestCount: 40,
  // The grandfather stamp. passGate reads this and never recomputes it, so an
  // unstamped event reads as free and the sheet would never offer a pass.
  passRequired: true,
  passReasons: ['destination'],
  ...over,
});

/**
 * Serve GET /api/stripe/pass from a queue of answers, one per ask, and record
 * every ask with the time it arrived. The queue is what makes the race
 * testable: the retry ladder only shows up as three asks with gaps between.
 *
 * ORDER IS LOAD-BEARING AND COST ME A RUN. Playwright tries the
 * MOST-RECENTLY-REGISTERED route first, so the catch-all goes down FIRST and
 * the specific stub second, where it wins. Registered the other way round —
 * which is how this spec was first written — the catch-all aborts every
 * /api/stripe/pass call before the stub sees it, `fetchEventPass` throws,
 * `refreshEventPass` returns null, and the suite reports zero asks. That reads
 * exactly like "the shell never asked", which is the wrong bug to go chasing.
 * The trap is recorded in HANDOFF's fifty-ninth entry; I had quoted it earlier
 * the same session and still wrote it backwards.
 */
const stubPass = async (page, answers) => {
  const asks = [];
  let i = 0;
  // Catch-all FIRST — everything else on the fake host fails fast rather than
  // hanging for the navigation timeout.
  await page.route(`${API}/**`, (route) => route.abort());
  // Specific stub SECOND, so it is tried first and beats the catch-all.
  await page.route(`${API}/api/stripe/pass**`, async (route) => {
    const held = answers[Math.min(i, answers.length - 1)];
    asks.push({ at: Date.now(), held });
    i += 1;
    await route.fulfill({ status: 200, json: { held } });
  });
  return asks;
};

const boot = async (page, { event = eventFixture(), id = EVENT_ID } = {}) => {
  await page.addInitScript(([e, lastId]) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', lastId);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [event, id]);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
};

/**
 * Open the pass sheet and return its text, flattened.
 *
 * The opener is the MORE-nav item "The One-Event Pass", read off the live
 * shell. The contextual "See the One-Event Pass — $39" buttons also open the
 * same sheet, but they are conditional on surfaces this fixture does not
 * always reach, so keying on one of those made the spec fail for a reason that
 * had nothing to do with entitlement.
 */
const readPassSheet = async (page) => {
  await openSectionByName(page, 'The One-Event Pass');
  await page.waitForTimeout(900);
  const t = await page.evaluate(() => {
    const sh = document.querySelector('.sheet');
    return sh ? (sh.innerText || '').replace(/\s+/g, ' ') : '';
  });
  return t;
};

// The two sentences that distinguish the three states, copied from
// HostShellV2's pass sheet. Owned and for-sale are mutually exclusive.
const OWNED = /the pass covers it/i;
const FOR_SALE = /Get the pass\s*—\s*\$39/i;
const DORMANT = /fully unlocked right now/i;

test.describe('GOLD-09 — the pass entitlement reaches the shell', () => {
  // ── 1 · THE PREMISE ──────────────────────────────────────────────────────
  // Without this, every test below could pass against a dormant bundle while
  // measuring nothing — which is exactly the failure mode that let GOLD-09
  // stay open with two green unit suites. Red-proofed: pointed at 5233 this
  // fails on DORMANT, which is the proof it is reading the switch.
  test('(premise) billing is LIVE in this bundle — the paywall is awake', async ({ page }) => {
    await stubPass(page, [false]);
    await boot(page);
    const sheet = await readPassSheet(page);
    expect(sheet, 'the dormant copy means REACT_APP_BILLING_LIVE never reached this bundle')
      .not.toMatch(DORMANT);
    expect(sheet).toMatch(FOR_SALE);
  });

  // ── 2 · THE SHELL ASKS ───────────────────────────────────────────────────
  test('the shell asks the server for the pass when an event opens', async ({ page }) => {
    const asks = await stubPass(page, [false]);
    await boot(page);
    expect(asks.length, 'no GET /api/stripe/pass — the refresh effect never fired').toBeGreaterThan(0);
  });

  // ── 3 · THE GUARD HOLDS ──────────────────────────────────────────────────
  // isUserCreatedEvent: the route resolves a tenant key from a public.events
  // row, which only the host's own events have. Asking for a sample earns a
  // 409 that means nothing. This is the engine's own predicate, so the test
  // asserts the shell CONSULTS it rather than re-deriving the idea.
  test('it does NOT ask for a sample event', async ({ page }) => {
    const asks = await stubPass(page, [true]);
    await boot(page, {
      event: eventFixture({ id: SAMPLE_ID }),
      id: SAMPLE_ID,
    });
    expect(asks.length, 'a sample must never be asked about — it cannot have a tenant row').toBe(0);
  });

  // ── 4 · A SERVER YES UNLOCKS ─────────────────────────────────────────────
  test('held:true from the server unlocks the event', async ({ page }) => {
    await stubPass(page, [true]);
    await boot(page);
    const sheet = await readPassSheet(page);
    expect(sheet).toMatch(OWNED);
    expect(sheet, 'a host who owns the pass must never be offered it again').not.toMatch(FOR_SALE);
  });

  // ── 5 · A SERVER NO, WITH NO CLAIM, REVOKES ──────────────────────────────
  // The negative control for test 6. If the race handling were a blanket
  // "ignore a no", this would also read as owned and the revocation half of
  // the server record — the thing it was built for — would be gone.
  test('held:false with no claim leaves the event locked', async ({ page }) => {
    await stubPass(page, [false]);
    await boot(page);
    const sheet = await readPassSheet(page);
    expect(sheet).toMatch(FOR_SALE);
    expect(sheet).not.toMatch(OWNED);
  });

  // ── 6 · THE RACE ─────────────────────────────────────────────────────────
  // A host who paid seconds ago: the blob claims the pass, the webhook has not
  // landed, so the first two asks answer false. The unlock must survive, and
  // the shell must have passed `claimed` through for that to happen.
  test('a paid host is NOT revoked while the webhook is still in flight', async ({ page }) => {
    const asks = await stubPass(page, [false, false, true]);
    await boot(page, { event: eventFixture({ passPurchased: true }) });
    // The ladder is 2s + 4s; wait past it with margin.
    await page.waitForTimeout(8000);
    const sheet = await readPassSheet(page);
    expect(sheet, 'the host paid — a provisional no must not read as a revocation').toMatch(OWNED);
    expect(sheet).not.toMatch(FOR_SALE);
    expect(asks.length, 'the retry ladder did not run — `claimed` never reached refreshEventPass')
      .toBeGreaterThanOrEqual(3);
  });

  // ── 7 · AND THE CLAIM ALONE IS NOT ENOUGH ────────────────────────────────
  // The blob claims a pass and the server keeps saying no past the ladder.
  // That is the cleared-browser / refunded / revoked case, and it must end
  // locked — otherwise `passPurchased` on the blob is still the authority and
  // the whole server record bought nothing.
  // Nielsen re-run N7 (2026-11-02, P3): "Get the pass" had no busy state while
  // checkout opened, so on a slow network a second tap opened a second
  // checkout session. Red-proofed by removing the in-flight guard.
  test('a double tap on "Get the pass" opens ONE checkout, and says it is opening', async ({ page }) => {
    await stubPass(page, [false]);
    let sessions = 0;
    await page.route(`${API}/api/stripe/create-pass-session**`, async (route) => {
      sessions += 1;
      await new Promise((r) => setTimeout(r, 2500));   // a slow network
      await route.fulfill({ status: 500, json: { detail: 'stub' } });
    });
    await boot(page);
    const sheet = await readPassSheet(page);
    expect(sheet, 'premise: the pass is for sale here').toMatch(FOR_SALE);
    // The SAME button, whatever it says after the first tap.
    const buy = page.locator('.sheet').last().locator('button.cta', { hasText: /Get the pass|Opening checkout/i }).first();
    await buy.click();
    await page.waitForTimeout(150);
    await buy.click({ force: true, timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(3500);
    expect(sessions, 'a second tap opened a second checkout').toBe(1);
    // And while it was opening, the button said so (checked on a fresh tap).
    await buy.click();
    await expect(buy, 'no busy state while checkout opens').toHaveText(/Opening checkout/i, { timeout: 1500 });
    await expect(buy).toBeDisabled();
  });

  // Nielsen re-run N8 (2026-11-02, P3, truthfulness): coming back from checkout
  // with the pass not yet confirmed, the host was told "your payment went
  // through" — a claim this code's own comment says the redirect is not
  // evidence of. The notice may say what we know (we have not seen it land)
  // and what to do, never that money moved. Red-proofed against the old copy.
  test('an unconfirmed return says what we know, never that payment went through', async ({ page }) => {
    await stubPass(page, [false, false, false]);
    await page.addInitScript(([e, lastId]) => {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
      localStorage.setItem('ngw-hostv2-last-event', lastId);
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
      window.__toastsSeen = [];
      setInterval(() => {
        const n = document.querySelector('div.toast');
        const t = n ? (n.innerText || '').replace(/\s+/g, ' ').trim() : '';
        if (t && !window.__toastsSeen.includes(t)) window.__toastsSeen.push(t);
      }, 80);
    }, [eventFixture(), EVENT_ID]);
    await page.goto(`${BASE}?pass_paid=1&event_id=${encodeURIComponent(EVENT_ID)}`, { waitUntil: 'load' });
    await page.waitForTimeout(9000);
    const toasts = await page.evaluate(() => window.__toastsSeen);
    const notice = toasts.filter((t) => /haven.t seen|not seen|yet/i.test(t));
    expect(notice.length, `premise: no not-yet notice. Toasts seen: ${JSON.stringify(toasts)}`).toBeGreaterThanOrEqual(1);
    expect(toasts.filter((t) => /payment went through|you paid|payment (is|was) (complete|received)/i.test(t)),
      'an unconfirmed return claimed the payment').toHaveLength(0);
  });

  test('a claim the server never confirms ends revoked', async ({ page }) => {
    const asks = await stubPass(page, [false, false, false]);
    await boot(page, { event: eventFixture({ passPurchased: true }) });
    await page.waitForTimeout(8000);
    const sheet = await readPassSheet(page);
    expect(sheet, 'the server is the record — an unconfirmed claim cannot hold the gate open')
      .toMatch(FOR_SALE);
    expect(asks.length).toBeGreaterThanOrEqual(3);
  });
});
