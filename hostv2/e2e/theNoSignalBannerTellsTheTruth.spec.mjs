// ─── THE BANNER IS A CLAIM ABOUT WHAT IS ON SCREEN ────────────────────────
//
// Found by driving, iOS Simulator, 2026-10-06. A brand-new event, typed into
// the creation screen over a reachable 127.0.0.1, and the first sentence the
// host read was:
//
//   "No signal — showing your saved plan. Up to date as of a moment ago."
//
// Both halves cannot be true. The page had just loaded over the network —
// that is what the second half says, and `markSignal()` stamps it at the top
// of `registerOfflineShell` precisely because the load reaching the page IS
// the definition of signal. The first half fired anyway, because the shell
// took `navigator.onLine === false` as proof, and iOS reports that flag off
// whatever loopback is doing.
//
// The HTML spec is explicit that only one direction of that flag means
// anything: false MAY mean offline, true guarantees nothing. The shell was
// reading the weak direction as a verdict and printing a failure notice over
// a working app — on the creation screen, where there is no saved plan to
// show at all.
//
// Two tests, and the second is the one that keeps the fix honest. It would
// be trivial to silence the banner by deleting the feature; the whole reason
// it exists is the grocery aisle, where the host IS offline and the numbers
// on screen were priced whenever she last had bars.
import { test, expect } from './fixtures.mjs';

const BANNER = /No signal — showing your saved plan/;

const seed = async (page) => {
  await page.addInitScript(() => {
    // GUARDED. An unconditional seed re-runs on reload and wipes the state
    // the test is about.
    if (localStorage.getItem('ngw-hostv2-last-event') === 'e2e-signal') return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-signal', name: 'Signal test', type: 'Birthday', date: '2027-06-17',
      venueCity: 'Annapolis', state: 'MD', guestMode: 'count', guestCount: 12,
      totalBudget: 2000, budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-signal');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
};

test('A LYING FLAG IS NOT A FAILURE: navigator.onLine false over a reachable origin says nothing', async ({ page }) => {
  // Exactly what the simulator does: the flag is off, the origin answers.
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'onLine', { get: () => false, configurable: true });
  });
  await seed(page);
  await page.goto('?elegant=1');
  await expect(page.locator('.app, .sheet').first()).toBeVisible({ timeout: 20000 });

  // Give the shell longer than any reachability check needs. A banner that
  // appears late is the same lie arriving slowly.
  await page.waitForTimeout(2500);
  const txt = await page.evaluate(() => document.body.innerText || '');
  expect(BANNER.test(txt)).toBe(false);
});

test('AND THE AISLE STILL WORKS: genuinely unreachable still says so', async ({ page, context }) => {
  await seed(page);
  await page.goto('?elegant=1');
  await expect(page.locator('.app, .sheet').first()).toBeVisible({ timeout: 20000 });

  await context.setOffline(true);
  // The banner is allowed to take as long as a probe; it is not allowed to
  // never arrive.
  await expect(page.getByText(BANNER)).toBeVisible({ timeout: 15000 });
  await context.setOffline(false);
});
