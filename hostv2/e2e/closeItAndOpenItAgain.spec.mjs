// ─── "AN UPDATE IS READY. CLOSE THE APP AND OPEN IT AGAIN." ────────────────
//
// The 2026-08-16 offline-shell board's fifth order: state recovery as TWO
// page loads in host-facing copy. There is no skipWaiting — a new worker
// installs on one load and takes charge on the next — so a fix reaches a host
// on their second visit and nothing in the app used to say so.
//
// A permanent disclaimer would have satisfied the letter and not the order:
// "updates arrive eventually" is not a statement a host can act on. The line
// appears only when a newer shell is genuinely installed and waiting.
//
// WHAT THIS FILE PROVES, AND WHAT IT DOES NOT.
//
// It proves the RENDER: the line is absent on an ordinary load, present when
// the shell reports a waiting update, and suppressed while the host is
// offline. It drives that with the window event the registration dispatches.
//
// It does NOT drive a real second worker version, and the first attempt to do
// so is worth recording because it would have passed for the wrong reason.
// Measured 2026-09-27: `context.route('**/sw.js')` intercepted the script
// fetch ZERO times — the browser's update check does not go through
// Playwright's routing — so `registration.update()` found identical bytes,
// installed nothing, and the test failed. Had the line been rendered
// unconditionally it would have passed while testing nothing at all.
//
// The browser-side trigger is therefore proved separately, against a fake
// registration, in test/offlineShell.test.mjs — the controller gate, the
// already-waiting case, and installing → installed. Both halves are needed;
// neither is the whole thing.
import { test, expect } from './fixtures.mjs';

const seed = async (page) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ngw-hostv2-last-event') === 'e2e-upd') return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-upd', name: 'Update test', type: 'Birthday', date: '2027-06-17',
      venueCity: 'Annapolis', state: 'MD', guestMode: 'count', guestCount: 12,
      totalBudget: 2000, budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-upd');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
};

// WAITING FOR THE WORKER IS NOT WAITING FOR THE APP. This helper used to stop
// at `navigator.serviceWorker.controller`, and the test was then flaky in ALL
// SEVEN viewport projects — not luck, a race. The controller arrives while
// React is still mounting, so the dispatched event could land before
// HostShellV2 had attached its listener, and an event with no listener is
// simply lost: the line never appeared and the failure looked like a broken
// feature. The app's own mount is the thing to wait for.
const controlled = async (page) => {
  await page.waitForFunction(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return !!(r && r.active);
  }, null, { timeout: 20000 });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller,
    null, { timeout: 20000 });
  await expect(page.locator('.app, .sheet').first()).toBeVisible({ timeout: 20000 });
  await page.waitForFunction(
    () => !/Getting your plan/.test(document.body.innerText || '')
      && (document.body.innerText || '').length > 200,
    null, { timeout: 20000 },
  );
};

test('a waiting update tells the host to close and reopen', async ({ page }) => {
  await seed(page);
  await page.goto('?elegant=1');
  await controlled(page);

  // PREMISE: the line is NOT up on an ordinary controlled load. Without this
  // the test could pass on a line that is always there, which is the
  // disclaimer the board rejected.
  await expect(page.locator('.shell-update')).toHaveCount(0);

  // The shell reports a waiting update. This is the same event the
  // registration dispatches; what it stands in for is a deploy.
  await page.evaluate(() => window.dispatchEvent(new Event('ngw-shell-update-waiting')));

  const line = page.locator('.shell-update');
  await expect(line).toBeVisible({ timeout: 10000 });
  await expect(line).toContainText('An update is ready.');
  await expect(line).toContainText('Close the app and open it again.');

  // …and it does not take the plan away to say so.
  expect(await page.evaluate(() => document.body.innerText || '')).toMatch(/Update test|Birthday/i);
});

test('it is not raised while the host is offline', async ({ page, context }) => {
  // Two lines in the same slot, and offline is the one she can do nothing
  // about. Telling someone with no signal to reopen the app is telling them
  // to lose the screen they have for a fix that cannot arrive.
  await seed(page);
  await page.goto('?elegant=1');
  await controlled(page);
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('ngw-shell-update-waiting')));
  await expect(page.locator('.no-signal')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.shell-update')).toHaveCount(0);
  await context.setOffline(false);
});
