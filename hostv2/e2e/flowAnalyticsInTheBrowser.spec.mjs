// ─── THE NEW COUNTERS FIRE IN THE BROWSER (owner, 11/20/2026: the six events) ─
// Not just in jest: opening Messages records messages_view_opened with which
// door and counts by kind, and loading the app from the week-before reminder's
// `?from=reminder` records plan_opened_from_reminder once and drops the tag
// from the address. Read from the dev tap (window.__NGW_TRACK__), the way the
// other analytics specs do: this runs on localhost, where PostHog is off.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const tap = (page, name) => page.evaluate((n) => (window.__NGW_TRACK__ || []).filter((t) => t.event === n), name);

const seed = (page) => page.addInitScript(() => {
  localStorage.setItem('ngw-hostv2-last-event', 'ev-x-retirement-party');
  localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
  localStorage.setItem('ngw-welcomed', '1');
  localStorage.setItem('ngw-v2-welcomed', '1');
});

test('opening Messages is counted once: the door and counts by kind, nothing else', async ({ page }) => {
  await seed(page);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Messages');
  await expect(page.locator('[data-messages]')).toBeVisible();
  await expect.poll(async () => (await tap(page, 'messages_view_opened')).length).toBe(1);
  const [ev] = await tap(page, 'messages_view_opened');
  expect(Object.keys(ev).sort()).toEqual(['cohost', 'emails', 'entry', 'event', 'handoffs', 'helper', 'signed_in']);
  expect(ev.entry).toBe('section_list');
  expect(ev.signed_in).toBe(false);
  expect(JSON.stringify(ev)).not.toContain('@');
});

test('the reminder link is counted once and leaves the address bar', async ({ page }) => {
  await seed(page);
  await page.goto('?from=reminder&elegant=1');
  await settled(page);
  await expect.poll(async () => (await tap(page, 'plan_opened_from_reminder')).length).toBe(1);
  const [ev] = await tap(page, 'plan_opened_from_reminder');
  expect(Object.keys(ev)).toEqual(['event']);
  expect(page.url()).not.toContain('from=reminder');
  expect(page.url()).toContain('elegant=1');
});
