// ─── THE CANONICAL OWNERSHIP VIEW CAN BE ACTED ON ───────────────────────────
//
// The ownership board found `helperConfirmed` had NO WRITER in hostv2 — it
// existed only in the frozen CRA, and only for food — so the Helpers panel
// showed a permanent "not confirmed" chip that no control in the shipping app
// could ever clear. Giving it a writer on the checklist row fixed half of that
// and left this surface inert, which just moved the dead end: this panel is
// where a host READS who owes what, and it was the one place they could not
// act on it.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
  });
  await page.goto('?elegant=1');
  await settled(page);
};

// Give someone a job, so the panel has something to show. Assigning is the
// app's own path into this state and exercises it end to end.
const assignSomething = async (page) => {
  await openSectionByName(page, 'Your checklist');
  await settled(page);
  const draft = page.getByRole('button', { name: /Draft my checklist/i });
  if (await draft.count()) { await draft.click(); await settled(page); }
  const assign = page.locator('.assign-btn').first();
  if (!(await assign.count())) return null;
  await assign.click();
  await settled(page);
  const opt = page.locator('.assign-opt').first();
  const who = (await opt.locator('.assign-who').innerText()).trim();
  await opt.click();
  await settled(page);
  return who;
};

test('a helper row can be confirmed from the panel that shows it', async ({ page }) => {
  await boot(page);
  const who = await assignSomething(page);
  if (!who) test.skip(true, 'no assignable people on this event');

  await openSectionByName(page, 'Space, seats');
  await settled(page);

  const chip = page.locator('.helper-confirm').first();
  await expect(chip, 'the helpers panel shows no confirmable row').toBeVisible();

  // PREMISE: it starts unconfirmed. Without this the toggle assertion could
  // pass on a row that was already confirmed and never moved.
  await expect(chip).toHaveText(/not confirmed/i);
  const name = await chip.getAttribute('aria-label');
  expect(name, 'the control does not say what it does or to whom').toMatch(/confirmed/i);
  expect(name).toMatch(new RegExp(who.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

  await chip.click();
  await settled(page);
  await expect(page.locator('.helper-confirm').first()).toHaveText(/covered/i);
});

test('and unconfirmed again — a promise can be withdrawn', async ({ page }) => {
  // Confirmed is a promise, not a fact. A host who learns otherwise must be
  // able to put it back, or the panel starts lying the moment plans change.
  await boot(page);
  const who = await assignSomething(page);
  if (!who) test.skip(true, 'no assignable people');
  await openSectionByName(page, 'Space, seats');
  await settled(page);

  const chip = () => page.locator('.helper-confirm').first();
  await chip().click();
  await settled(page);
  await expect(chip()).toHaveText(/covered/i);

  await chip().click();
  await settled(page);
  await expect(chip()).toHaveText(/not confirmed/i);
});

test('the confirmation survives a reload — it is event state', async ({ page }) => {
  await boot(page);
  const who = await assignSomething(page);
  if (!who) test.skip(true, 'no assignable people');
  await openSectionByName(page, 'Space, seats');
  await settled(page);
  await page.locator('.helper-confirm').first().click();
  await settled(page);

  await page.reload();
  await settled(page);
  await openSectionByName(page, 'Space, seats');
  await settled(page);
  await expect(page.locator('.helper-confirm').first()).toHaveText(/covered/i);
});
