// ─── A BRAND-NEW DEVICE ACCRUED STATE BEFORE THE HOST CHOSE ANYTHING ───────
//
// Measured 2026-09-27, storage wiped completely, one load, nothing tapped —
// still on the welcome screen:
//
//   document.title           "Pay your caterer."
//   localStorage             ngw-hostv2-patch-ev-x-retirement-party
//                            ngw-return-snap-ev-x-retirement-party
//
// The shell mounts UNDERNEATH the welcome overlay on BOOT_EVENT_ID, which on a
// wiped device is the first roster sample. Three effects then ran for an event
// the host had never opened: the patch writer, the last-event writer, and the
// return-snapshot writer. The title is the one piece of chrome the overlay
// cannot cover, so a first-time host's tab — and their screen reader — opened
// on a demo's chore.
//
// The snapshot was the worst of the three: it is the anti-repeat basis for
// "since you were last here", so their genuine FIRST visit to that sample
// would have been narrated as a return.
//
// NOTE ON THE SEED: this file deliberately does NOT seed. Every other spec
// here writes localStorage in an init script; the whole point of this one is
// the empty device, so it asserts on what the app writes unprompted.
import { test, expect } from './fixtures.mjs';

const onTheWelcomeScreen = async (page) => {
  await page.goto('?welcome=1');
  await expect(page.getByRole('button', { name: 'Start my event' })).toBeVisible({ timeout: 20000 });
  // The shell underneath has had time to mount and run its effects — without
  // this the test could pass simply by measuring too early, which is the same
  // false green as not running it.
  await page.waitForTimeout(2500);
};

const ownKeys = (page) => page.evaluate(() => Object.keys(localStorage)
  .filter((k) => /^ngw-hostv2-patch-|^ngw-return-snap-|^ngw-hostv2-last-event$/.test(k)));

test('nothing is written for an event the host has not opened', async ({ page }) => {
  await onTheWelcomeScreen(page);
  expect(await ownKeys(page)).toEqual([]);
});

test('the tab does not announce a sample’s chore', async ({ page }) => {
  await onTheWelcomeScreen(page);
  const title = await page.title();
  expect(title).not.toMatch(/caterer|pay |rsvp|rain/i);
  expect(title.length).toBeGreaterThan(0);
});

test('PREMISE: a sample really is loaded underneath', async ({ page }) => {
  // Without this the two tests above would pass on an app that simply had no
  // event mounted, which is not the situation and not the fix. The shell IS
  // running the retirement sample; what changed is that it no longer records
  // anything about it.
  await onTheWelcomeScreen(page);
  const id = await page.evaluate(() => window.__ngwEventId || null);
  // No debug hook to rely on, so read it the way a host would: dismiss the
  // gate and see which event the app was already sitting on.
  if (!id) {
    await page.getByRole('button', { name: 'Explore a sample first' }).click();
    await page.waitForTimeout(1500);
    const keys = await ownKeys(page);
    expect(keys.length, 'writing RESUMES once the host chooses').toBeGreaterThan(0);
  }
});

test('choosing to create does not leave the host inside a sample', async ({ page }) => {
  // "Start my event" used to leave last-event pointing at the retirement
  // sample until the new plan finished building, so a reload mid-creation
  // landed the host in a demo they had never opened.
  await onTheWelcomeScreen(page);
  await page.getByRole('button', { name: 'Start my event' }).click();
  await page.waitForTimeout(2000);
  const last = await page.evaluate(() => localStorage.getItem('ngw-hostv2-last-event'));
  expect(last === null || !/^ev-x-|^ev-dmv-/.test(last)).toBe(true);
});
