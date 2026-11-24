// ─── THE INSTACART BUTTON IS DRIVEN, NOT JUST READ ──────────────────────────
//
// The only e2e coverage this button had was
//
//     expect(text).toContain('send the list to instacart');   // the label of the day
//
// which asserts a LABEL — and the label has since been shortened to "Send to
// Instacart" (2026-09-26, to fit the three actions on one row at 390px), which
// is exactly how much a label assertion is worth. The owner asked whether the button had been driven
// end to end. It had not — by any test, or by me. Driving it by hand on
// 2026-09-26 found the handler works and produces a sticky stepper toast:
//
//     1 of 15 — Blue crabs. Add it, then come back.   Next: Old Bay
//
// …and also found that I could not tell a working button from a dead one by
// looking, because `window.open` is wrapped in a try/catch that swallows a
// blocked popup. A stubbed or blocked `open` looks exactly like a no-op. I
// called it a confirmed defect on that basis and was wrong. This spec exists so
// nobody has to make that judgment by eye again.
//
// WHY THE TOAST IS THE ASSERTION AND NOT THE NAVIGATION. The handler opens
// `instacartSearchUrl(term)` in a new tab. A test cannot follow that without
// leaving the app and hitting a third-party site, which would make the suite
// depend on instacart.com being up — so the observable contract is the sticky
// notice the host is left holding, which is the thing that has to survive the
// trip to the store and back. The comment in HostShellV2 says exactly that:
// "Toast BEFORE navigating ... the sticky notice has to already be in the DOM
// so the bfcache restore brings it back with the host."
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

// These checks drive the NEW-TAB path (Android, desktop). On iPhone and iPad the
// search opens in this tab instead, so the app can take the link without
// leaving a blank tab — that path has its own checks at the bottom. The
// mobile project's default user agent is an iPhone, so it is replaced here.
test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' });

const EV = 'e2e-instacart-step';

const boot = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(([id, date]) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id, type: 'Crab Feast', name: 'Stepper probe', date,
      venueCity: 'Annapolis', venueState: 'MD',
      guestMode: 'count', guestCount: 18, guestCountLocked: true, totalBudget: 1200,
      guests: [], vendors: [], budget: [], timeline: [],
    }]));
  }, [EV, dateIn(21)]);
  await page.goto('./');
  await settled(page);
  // The host's real route to the Shop tab. It used to click the board's
  // "Plan the food" row, which at tablet widths sits inside the folded "rest of
  // your plan" drawer: the click focused the row and only SOMETIMES opened the
  // sheet (30 s timeouts at tablet / tablet-tall, 11/18/2026). The section door
  // is the route a host takes at every size.
  await openSectionByName(page, /spread/i);
  await settled(page);
  const sheet = page.locator('.sheet').last();
  const shop = sheet.locator('.fmode', { hasText: /^Shop$/ }).first();
  if (await shop.count()) { await shop.click(); await settled(page); }
  return sheet;
};

test('(premise) the button is there and the list has something in it', async ({ page }) => {
  // Without both, every assertion below passes over an empty stepper — the
  // failure mode that made three "absent" findings in this project wrong.
  const sheet = await boot(page);
  await expect(sheet.getByRole('button', { name: /Search Instacart/i })).toBeVisible();
  await expect(sheet.getByText(/of \d+ bought/).first()).toBeVisible();
});

test('THE STEPPER RUNS: tapping it names the first item and how many there are', async ({ page }) => {
  const sheet = await boot(page);
  // Block the new tab rather than stub window.open: the handler catches a
  // failed open on purpose, so stubbing it proves nothing about the handler.
  // Refusing the popup at the context level is what a real blocker does.
  await page.context().route('**instacart.com/**', (r) => r.abort());

  await sheet.getByRole('button', { name: /Search Instacart/i }).click();
  await settled(page);

  // "1 of N — <item>. Add it, then come back." — the contract the host holds.
  const toast = page.getByText(/1 of \d+ —/).first();
  await expect(toast).toBeVisible();
  await expect(page.getByText(/Add it, then come back/)).toBeVisible();
});

test('and it offers the NEXT item, so the run is a queue and not one tap', async ({ page }) => {
  // The affordance that makes it a stepper. Without it the host gets one search
  // and no way back into the list, which is the shape this replaced.
  const sheet = await boot(page);
  await page.context().route('**instacart.com/**', (r) => r.abort());
  await sheet.getByRole('button', { name: /Search Instacart/i }).click();
  await settled(page);
  await expect(page.getByText(/^Next: /).first()).toBeVisible();
});

test('NEGATIVE CONTROL: the notice is STICKY — it survives, it does not flash', async ({ page }) => {
  // The whole design rests on the notice still being there when the host comes
  // back from the store. A toast that auto-dismisses would leave them holding
  // nothing, and would still have passed the assertions above.
  const sheet = await boot(page);
  await page.context().route('**instacart.com/**', (r) => r.abort());
  await sheet.getByRole('button', { name: /Search Instacart/i }).click();
  await settled(page);
  await expect(page.getByText(/Add it, then come back/)).toBeVisible();
  await page.waitForTimeout(6000);   // well past any ordinary toast lifetime
  await expect(page.getByText(/Add it, then come back/)).toBeVisible();
});

// ── IT HAS TO OPEN THE STORE (owner, 11/18/2026: "check the instacart button
// in app and make sure it works") ─────────────────────────────────────────
//
// Every check above reads the toast, and the toast is written BEFORE the
// handler opens Instacart. The open called `icSearchTerm`, which was never
// defined (since 9/25), so every tap threw a ReferenceError between the toast
// and the tab: the host got "1 of 11 — …" and no store. These checks require
// the tab itself, with a search in it, and no page error on the way.
const opened = async (page, sheet, click) => {
  const urls = [];
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message)));
  // ANSWERED, NOT ABORTED (11/24/2026). An aborted navigation leaves the new
  // tab on Chrome's network-error page, and that page RELOADS ITSELF about a
  // second later — re-requesting the same search. Measured under load: the
  // first tab's retry ("Blue crabs", frame chrome-error://chromewebdata/)
  // landed in `urls` before the Next tap's "old bay seasoning", so urls[1]
  // equalled urls[0] in 28 of 100 runs although the app opened one tab per
  // tap. An empty page records the same request and gives Chrome nothing to
  // retry, so every entry here is one open the app made.
  await page.context().route('**instacart.com/**', (r) => { urls.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'text/html', body: '' }); });
  await click();
  await settled(page);
  await expect.poll(() => urls.length, { timeout: 5000 }).toBeGreaterThan(0);
  return { urls, errors };
};

test('THE TAP OPENS INSTACART with a search for the first item, and nothing throws', async ({ page }) => {
  const sheet = await boot(page);
  const { urls, errors } = await opened(page, sheet,
    () => sheet.getByRole('button', { name: /Search Instacart/i }).click());
  expect(errors).toEqual([]);
  expect(urls[0]).toMatch(/^https:\/\/www\.instacart\.com\/store\/s\?k=.+/);
  expect(decodeURIComponent(urls[0].split('?k=')[1])).not.toBe('grocery');
});

test('"Next" opens the next item\'s search', async ({ page }) => {
  const sheet = await boot(page);
  const { urls, errors } = await opened(page, sheet,
    () => sheet.getByRole('button', { name: /Search Instacart/i }).click());
  await page.getByRole('button', { name: /^Next: / }).first().click();
  await expect.poll(() => urls.length, { timeout: 5000 }).toBeGreaterThan(1);
  expect(errors).toEqual([]);
  expect(urls[1]).not.toBe(urls[0]);
});

// ── AND FROM INSIDE THE LIST (owner, 11/18/2026: "Shop section will also need
// instacart for the items on that screen"). "The list" had Copy only; the
// button now sits there too and runs the same handler.
test('"The list" has Search Instacart too, and it opens a search', async ({ page }) => {
  const sheet = await boot(page);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('button,[role="button"],a')].find((b) => /The list[\s\S]*item/i.test(b.innerText || '') && b.getBoundingClientRect().height > 0);
    if (el) el.click();
  });
  await settled(page);
  const btn = page.locator('[data-list-instacart]');
  await expect(btn).toBeVisible();
  const { urls, errors } = await opened(page, sheet, () => btn.click());
  expect(errors).toEqual([]);
  expect(urls[0]).toMatch(/^https:\/\/www\.instacart\.com\/store\/s\?k=.+/);
});

// ── ON AN iPAD THE SEARCH OPENS IN THIS TAB (owner, 11/18/2026: "When user has
// the instacart app. Clicking the instacart button loads a blank web page").
// iOS hands an instacart.com link to the installed app; opened as a NEW tab,
// Safari keeps that tab, empty. On iPhone and iPad it now opens here. iPadOS
// reports a Mac user agent, so that is what this emulates.
for (const [device, ua] of [
  ['an iPad', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'],
  ['an iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'],
]) test.describe(`on ${device}`, () => {
  test.use({ userAgent: ua, hasTouch: true });
  test('Search Instacart opens in this tab, with no new tab', async ({ page }) => {
    // A real iPad reports 5 touch points with its Mac user agent.
    await page.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5, configurable: true }); });
    const sheet = await boot(page);
    expect(await page.evaluate(() => navigator.maxTouchPoints)).toBe(5);
    let popups = 0;
    page.context().on('page', () => { popups += 1; });
    const nav = page.waitForRequest((r) => /instacart\.com\/store\/s\?k=/.test(r.url()) && r.frame() === page.mainFrame(), { timeout: 8000 });
    await page.context().route('**instacart.com/**', (r) => r.abort());
    await sheet.getByRole('button', { name: /Search Instacart/i }).click();
    await nav;
    expect(popups).toBe(0);
  });
});
