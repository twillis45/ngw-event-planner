// ─── A BORROWED PLAYBOOK SAYS SO, ON THE SCREEN ─────────────────────────────
//
// Nine of the taxonomy's 48 types had no playbook and the app said nothing at
// all for them. The floor borrows a near playbook so those hosts get real work.
// The whole justification for that rests on the host being TOLD — a borrowed
// list presented as the type's own is the app claiming knowledge it does not
// have. So this asserts the sentence reaches the screen, and just as
// importantly that it stays off the 39 authored types.
import { test, expect, settled } from './fixtures.mjs';

const boot = async (page, type) => {
  await page.addInitScript((t) => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'borrow-probe');
    const date = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'borrow-probe', type: t, name: `${t} probe`, date, guestCount: 40,
      guests: [], vendors: [], budget: [], timeline: [],
    }]));
  }, type);
  await page.goto('?elegant=1');
  await settled(page);
};

const openChecklist = async (page) => {
  const rail = page.locator('.srail-row', { hasText: 'Your checklist' });
  if (await rail.count()) { await rail.first().click(); } else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click();
    await settled(page);
    await page.locator('.sheet').last().getByText('Your checklist', { exact: false }).first().click();
  }
  await settled(page);
};

test('a town hall is told whose playbook it is using', async ({ page }) => {
  await boot(page, 'Town Hall');
  await openChecklist(page);
  const note = page.locator('.borrowed-note');
  await expect(note).toBeVisible();
  const text = await note.innerText();
  expect(text).toMatch(/no playbook written for Town Hall/i);
  expect(text).toMatch(/Board Meeting/);
  // The reason travels with the claim — "borrowed" alone tells a host nothing.
  expect(text).toMatch(/all-hands/i);
});

test('an authored type is never told any such thing', async ({ page }) => {
  // Red-proofs the flag from the UI side: if `isDefault` leaked onto authored
  // playbooks, the note would appear on all 39 and the test above would still
  // be perfectly green.
  await boot(page, 'Wedding');
  await openChecklist(page);
  await expect(page.locator('.borrowed-note')).toHaveCount(0);
});
