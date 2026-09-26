// ─── THE INSTACART BUTTON IS DRIVEN, NOT JUST READ ──────────────────────────
//
// The only e2e coverage this button had was
//
//     expect(text).toContain('send the list to instacart');
//
// which asserts a LABEL. The owner asked whether the button had been driven
// end to end. It had not — by any test, or by me. Driving it by hand on
// 2026-09-26 found the handler works and produces a sticky stepper toast:
//
//     1 of 15 — Blue crabs. Add it, then come back.   Next: Old Bay
//
// …and also found that I could not tell a working button from a dead one by
// looking, because `window.open` is wrapped in a try/catch that swallows a
// blocked popup. A stubbed or blocked `open` looks exactly like a no-op. I
// called it a confirmed defect on that basis and was wrong. This spec exists so
// nobody has to make that judgement by eye again.
//
// WHY THE TOAST IS THE ASSERTION AND NOT THE NAVIGATION. The handler opens
// `instacartSearchUrl(term)` in a new tab. A test cannot follow that without
// leaving the app and hitting a third-party site, which would make the suite
// depend on instacart.com being up — so the observable contract is the sticky
// notice the host is left holding, which is the thing that has to survive the
// trip to the store and back. The comment in HostShellV2 says exactly that:
// "Toast BEFORE navigating ... the sticky notice has to already be in the DOM
// so the bfcache restore brings it back with the host."
import { test, expect, settled, dateIn } from './fixtures.mjs';

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
  // The host's real route: the board's food row, then the Shop tab.
  await page.getByText('Plan the food', { exact: false }).first().click();
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
  await expect(sheet.getByRole('button', { name: /Send the list to Instacart/i })).toBeVisible();
  await expect(sheet.getByText(/of \d+ bought/).first()).toBeVisible();
});

test('THE STEPPER RUNS: tapping it names the first item and how many there are', async ({ page }) => {
  const sheet = await boot(page);
  // Block the new tab rather than stub window.open: the handler catches a
  // failed open on purpose, so stubbing it proves nothing about the handler.
  // Refusing the popup at the context level is what a real blocker does.
  await page.context().route('**instacart.com/**', (r) => r.abort());

  await sheet.getByRole('button', { name: /Send the list to Instacart/i }).click();
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
  await sheet.getByRole('button', { name: /Send the list to Instacart/i }).click();
  await settled(page);
  await expect(page.getByText(/^Next: /).first()).toBeVisible();
});

test('NEGATIVE CONTROL: the notice is STICKY — it survives, it does not flash', async ({ page }) => {
  // The whole design rests on the notice still being there when the host comes
  // back from the store. A toast that auto-dismisses would leave them holding
  // nothing, and would still have passed the assertions above.
  const sheet = await boot(page);
  await page.context().route('**instacart.com/**', (r) => r.abort());
  await sheet.getByRole('button', { name: /Send the list to Instacart/i }).click();
  await settled(page);
  await expect(page.getByText(/Add it, then come back/)).toBeVisible();
  await page.waitForTimeout(6000);   // well past any ordinary toast lifetime
  await expect(page.getByText(/Add it, then come back/)).toBeVisible();
});
