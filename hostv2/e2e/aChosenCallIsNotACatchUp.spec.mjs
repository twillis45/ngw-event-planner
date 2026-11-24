// ─── A CHOSEN CALL IS NOT A CATCH-UP (owner's iPad, 11/21/2026) ──────────────
//
// "My Thanksgiving Hosting", Thu Nov 26, 12 guests, $400, five days out. The
// hero read "Catch up on this step." under "past its window", asking "Who
// cooks: the whole meal, a split with assigned dishes, or a full potluck" —
// and its options showed "Host cooks the whole meal" marked chosen. Owner:
// "Make sure ask is not repeated. Say chosen already".
//
// The step names its call (`answeredBy`), and a picked call handles it
// (playbooks.stepCallsAnswered via taskEngine), so no tier leads with it. Where
// the call is still shown, opened to change it, it says "Chosen already".
// Jest twin: src/lib/__tests__/aChosenCallIsNotACatchUp.test.js.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const ID = 'e2e-chosen-call';
const PICK = 'Host cooks the whole meal';
const seed = {
  id: ID, name: 'My Thanksgiving Hosting', type: 'Thanksgiving Hosting', date: dateIn(5),
  createdAt: new Date(Date.now() - 40 * 864e5).toISOString(),
  venue: 'Home', venueKind: 'home', venueCity: 'Austin', venueState: 'TX', startTime: '16:00', startTimeSource: 'host',
  guestMode: 'count', guestEstimate: 12, guestCountSource: 'host', guests: [], vendors: [],
  totalBudget: 400, budget: [], foodChoices: { hosting_model: PICK },
  timeline: [{ id: `pbt-${ID}-t_model`, task: 'Decide who cooks: the whole meal, a split with assigned dishes, or a full potluck',
    leadDays: -21, week: '3 weeks out', done: false, owner: '', category: 'planning', phase: 'planning' }],
};

const boot = async (page) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, seed);
  await page.goto('?elegant=1');
  await settled(page);
};

test('the hero does not ask a call the host already made', async ({ page }) => {
  await boot(page);
  const hero = page.locator('.hero').first();
  await expect(hero).toBeVisible();
  const text = await hero.innerText();
  expect(text).not.toMatch(/who cooks/i);
  // No "chosen" pick under a catch-up ask.
  await expect(hero.locator('.decopt-badge').filter({ hasText: 'chosen' })).toHaveCount(0);
  await expect(page.locator(`[id="card-decision:pbt-${ID}-t_model"]`)).toHaveCount(0);
});

test('opened to change it, the call says it is chosen already', async ({ page }) => {
  await boot(page);
  await openSectionByName(page, 'Calls to make');
  const sheet = page.locator('.sheet').last();
  // The decided calls are one green row until reopened (DoneFold, owner 11/24/2026).
  await sheet.locator('[data-done-fold]', { hasText: /Settled · all \d+ decided/ }).click();
  const card = sheet.locator('button.settled-card').filter({ hasText: PICK }).first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(sheet.getByText(`Chosen already: ${PICK}`)).toBeVisible();
  // …with the way to change it still there.
  await expect(sheet.locator('button.chip').filter({ hasText: 'potluck' }).first()).toBeVisible();
});
