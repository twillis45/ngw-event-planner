// Kept draft text was keyed by draft TITLE alone, and switching events did not
// clear it (Nielsen re-run 2026-11-02, N5, P2 — H5 error prevention). Every
// event has a "Your shopping list" draft, so words a host typed for one event
// reappeared in another event's draft, labeled as hers, one tap from sending.
// The key now carries the event too. Red-proofed by restoring the title-only key.
//
// Self-pinned (390px, runs once): the event switch below is the phone path —
// the masthead opens "Jump to", and "This event" inside it opens the list.
import { test, expect, openSectionByName } from './fixtures.mjs';

const MARK = 'ZQX words typed for the first event only';

const boot = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'test-day-before-vendors');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
};

const openShoppingDraft = async (page) => {
  await openSectionByName(page, 'spread');
  const copy = page.locator('.sheet').last().getByText('Copy the shopping list').first();
  await copy.click({ timeout: 10_000 });
  await expect(page.locator('#sheet-title')).toHaveText(/shopping list/i, { timeout: 8000 });
  return page.locator('.sheet').last().getByRole('textbox', { name: 'Edit the draft' });
};

const closeAllSheets = async (page) => {
  for (let i = 0; i < 4; i += 1) {
    const btn = page.locator('.sheet').last().getByRole('button', { name: /^(Close|Back)$/ }).first();
    if (!(await btn.count()) || !(await btn.isVisible().catch(() => false))) break;
    await btn.click();
    await page.waitForTimeout(400);
  }
};

test("a host's typed words stay with the event she typed them for", async ({ page }) => {
  await boot(page);
  const first = await openShoppingDraft(page);
  await first.fill(MARK);
  await expect(first).toHaveValue(MARK);   // premise: the edit is held
  await closeAllSheets(page);

  // PREMISE: in the SAME event, reopening keeps her words (the August fix).
  const again = await openShoppingDraft(page);
  await expect(again, 'premise: kept text no longer survives reopening in the same event').toHaveValue(MARK);
  await closeAllSheets(page);

  // Switch to a different event, the phone way.
  const before = (await page.locator('.ev-eyebrow').first().innerText()).trim();
  await page.locator('.ev-eyebrow').first().click();
  await page.locator('.navrow', { hasText: 'This event' }).first().click();
  await expect(page.getByRole('heading', { name: 'Your events' })).toBeVisible({ timeout: 15000 });
  await page.locator('.sheet .frow').filter({ hasNotText: 'current' }).first().click();
  await expect.poll(async () => (await page.locator('.ev-eyebrow').first().innerText()).trim(),
    { timeout: 10_000, message: 'premise: the event really changed' }).not.toBe(before);
  await closeAllSheets(page);

  const other = await openShoppingDraft(page);
  await expect(other, "another event's draft carries words she typed for the first event")
    .not.toHaveValue(new RegExp(MARK));
});
