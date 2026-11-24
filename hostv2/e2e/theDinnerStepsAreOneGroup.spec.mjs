// ─── THE DINNER'S STEPS ARE ONE GROUP IN THE CHECKLIST (queued from #222) ────
//
// Driven through the real creation flow on the owner's Santa Fe sentence. The
// celebration dinner's steps (the night, the place, the dinner's food) render
// together in Your checklist under the dinner's title, and each opens where its
// part is owned. Picking the night ticks its step.
import { test, expect, settled, openSectionByName, openAllPhases, checklistActionByTitle } from './fixtures.mjs';

const SANTA_FE = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, about 30 people flying in for 3 nights, dinner at an adobe courtyard, she uses a walker and the altitude is hard on her";
const API = 'https://e2e-mock.invalid';
const sheet = (page) => page.locator('.sheet').last();

const create = async (page) => {
  await page.route(API + '/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.addInitScript(() => {
    try { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); sessionStorage.setItem('seeded', '1'); } } catch { /* fresh */ }
  });
  await page.goto('?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(SANTA_FE);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await page.getByRole('button', { name: /^Open your plan$/ }).click();
  await settled(page);
};

test('the dinner\'s steps sit together under the dinner, and the night step opens the dinner', async ({ page }) => {
  await create(page);
  await openSectionByName(page, 'Your checklist');
  // The checklist is grouped by when (cohesion batch D); the dinner's group
  // sits whole in one phase. Open every phase so every step is on screen. The
  // first open step may be "Up next", above the phases, so the night step is
  // looked for on the sheet as a whole.
  await openAllPhases(page);
  const group = sheet(page).locator('[data-dinner-steps]');
  await expect(group).toHaveCount(1);
  await expect(group.locator('.shelf-label')).toHaveText('Mom’s 80th dinner');
  await expect(sheet(page)).toContainText('Pick the night of the dinner');
  await expect(group).toContainText('Book the place for the dinner');
  await expect(group).toContainText('Cake + candles moment');
  // Not the dinner's: the invite and the trip's travel steps stay in the list.
  await expect(group).not.toContainText('Send invites');
  await expect(group).not.toContainText('visitors bureau');
  await expect(sheet(page).getByText('Send invites', { exact: false }).first()).toBeVisible();

  // The night step opens the dinner, where the night is picked.
  const night = await checklistActionByTitle(page, 'Pick the night of the dinner');
  await expect(night).toHaveText(/^Open the dinner/);
  await night.click();
  await expect(page.locator('#sheet-title')).toHaveText('Mom’s 80th dinner');
  await sheet(page).getByRole('radio', { name: /Wed, Jun 16/ }).click();
  await settled(page);
  await page.keyboard.press('Escape');
  await settled(page);

  // Picked: the step reads as handled by the plan; the place step is still open.
  await openSectionByName(page, 'Your checklist');
  await openAllPhases(page);
  const after = sheet(page).locator('[data-dinner-steps]');
  await expect(after.locator('.frow', { hasText: 'Pick the night of the dinner' })).toHaveClass(/\bgot\b/);
  await expect(after.locator('.frow', { hasText: 'Book the place for the dinner' })).not.toHaveClass(/\bgot\b/);
});
