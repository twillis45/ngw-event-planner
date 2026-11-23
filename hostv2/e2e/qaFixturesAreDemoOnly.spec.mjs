// ─── QA FIXTURES ARE NOT PUBLIC SAMPLES (stage-4 P1, N2) ────────────────────
//
// Six "Test — …" fixtures (hostv2/src/eventPool.js) were listed to every
// visitor in "Your events" and in Search. They are QA chrome: they list only
// while the demo tools are armed (?demo=1). They still RESOLVE by id either
// way, which is how ~30 specs boot on them — the last test pins that.
//
// The filter itself is executed in jest (src/lib/__tests__/
// qaFixturesAreDemoOnly.test.js) and against the real pool in vitest
// (hostv2/test/qaFixturesAreDemoOnly.test.mjs). This spec pins the WIRING:
// both list surfaces read the filtered roster.
//
// Self-pinned to 390px: the list is reached the phone way, as in
// herOwnEventIsFirst.spec.mjs.
import { test, expect, openEventsSheet } from './fixtures.mjs';

// The board's header: the tall header on a phone since owner ruling 1
// (11/23/2026), the ☰ eyebrow where it remains.
const HEAD = '[data-tt-head], .ev-eyebrow';

const TEST_ROW = /Test —/;

const seed = async (page, lastEvent) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((id) => {
    if (id) localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, lastEvent || null);
};

const openTheList = async (page) => {
  await openEventsSheet(page);
  await expect(page.getByRole('heading', { name: 'Your events' })).toBeVisible({ timeout: 15000 });
};

const searchFor = async (page, q) => {
  // The board must be up before the shortcut has a listener; then open Search
  // by its own button (⌘K is the same toggle).
  await expect(page.locator(HEAD).first()).toBeVisible({ timeout: 20000 });
  if (await page.locator('.sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
  // Search is the pill's on a phone (owner ruling 4), the menu's row elsewhere.
  if (await page.locator('[data-tt-bar]').count()) await page.locator('[data-tt-bar]').getByRole('button', { name: 'Search', exact: true }).click();
  else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.navrow', { hasText: /^Search/ }).first().click();
  }
  const input = page.locator('.palette-input');
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(q);
};

test('a visitor sees no Test fixture in Your events', async ({ page }) => {
  await seed(page);
  await page.goto('?elegant=1&demo=0');
  await openTheList(page);
  const rows = page.locator('.sheet .frow');
  // PREMISE: the sample shelf is really there, so "no Test row" is not vacuous.
  await expect(rows.filter({ hasText: 'Sample' }).first()).toBeVisible();
  await expect(rows.filter({ hasText: TEST_ROW })).toHaveCount(0);
});

test('a visitor finds no Test fixture in Search', async ({ page }) => {
  await seed(page);
  await page.goto('?elegant=1&demo=0');
  await searchFor(page, 'Test —');
  await expect(page.locator('.palette-row .palette-label', { hasText: TEST_ROW })).toHaveCount(0);
  // PREMISE: Search does list sample events.
  await page.locator('.palette-input').fill('Wedding');
  await expect(page.locator('.palette-row .palette-kind', { hasText: 'Event' }).first()).toBeVisible();
});

test('with the demo tools on, all six fixtures list in both places', async ({ page }) => {
  await seed(page);
  await page.goto('?elegant=1&demo=1');
  await openTheList(page);
  await expect(page.locator('.sheet .frow').filter({ hasText: TEST_ROW })).toHaveCount(6);
  await page.keyboard.press('Escape');
  await searchFor(page, 'Test —');
  await expect(page.locator('.palette-row .palette-label', { hasText: TEST_ROW })).toHaveCount(6);
});

test('hidden from the list, a fixture still boots by id', async ({ page }) => {
  await seed(page, 'test-day-before-vendors');
  await page.goto('?elegant=1&demo=0');
  await expect(page.locator(HEAD).first()).toBeVisible({ timeout: 20000 });
  // The board is the fixture's own, booted by id with the list filtered.
  await expect(page.locator('.app')).toContainText(/Test — Dinner/i);
});
