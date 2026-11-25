// ─── DRAFT THE TRIP DETAILS (owner pick "Yes, combined", 11/21/2026) ─────────
//
// Group Trip's "Send everyone the trip details" had no button. "Draft the trip
// details" opens the draft sheet on doItForMe.draftTripDetails: the dates, the
// booked stay by name and town, the booked plans (an "Inquired" brunch is not
// one), and each person's share from Split the costs. What is missing is named
// to the host. The sheet keeps its handoffs (Text it, Open WhatsApp, Copy it,
// Mark it sent); "Post to everyone's invite" needs a signed-in host, so here,
// signed out, one line says why and nothing is lit for it.
// The signed-in post: theTripDetailsPostToEveryone.spec.mjs (5277 bundle).
// Jest twin: src/lib/__tests__/draftTripDetails.test.js.
import { test, expect, settled, sheetSettled, openSectionByName, checklistStepAction } from './fixtures.mjs';
import { tripEvent, litButtons, STEP } from './tripDetailsFixture.mjs';

const ID = 'e2e-trip-details';

const boot = async (page, e) => {
  await page.addInitScript((ev) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Vida Ramos' }));
  }, e);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await (await checklistStepAction(page, 'Draft the trip details')).click();
  await sheetSettled(page);
  return page.locator('.sheet').last();
};

test('the draft is built from what is on file, and keeps its handoffs', async ({ page }) => {
  const sheet = await boot(page, tripEvent(ID));
  await expect(sheet.locator('#sheet-title')).toHaveText('The trip details');
  const body = await sheet.getByRole('textbox', { name: 'Edit the draft' }).inputValue();
  expect(body).toContain('The Gulch House, Nashville, TN');
  expect(body).toContain('- Pinewood Social bowling');
  expect(body).not.toContain('Biscuit Love');
  expect(body).toContain('$300.00 each');
  expect(body).toMatch(/When: \w+day, \w+ \d+ through \w+day, \w+ \d+\./);
  expect(body).not.toMatch(/\[|street/i);
  for (const name of ['Text it', 'Open WhatsApp', 'Copy it', 'Mark it sent — I sent it myself'])
    await expect(sheet.getByRole(name === 'Text it' || name === 'Open WhatsApp' ? 'link' : 'button', { name, exact: true })).toBeVisible();
  // Signed out: the post is not offered, and the sheet says why.
  await expect(sheet.locator('[data-post-invite-why]')).toHaveText('Sign in to post this on everyone’s invite.');
  await expect(sheet.locator('[data-post-invite-btn]')).toHaveCount(0);
  expect((await page.evaluate(litButtons)).length).toBeLessThanOrEqual(1);
});

test('what is missing is left out and named to the host', async ({ page }) => {
  const sheet = await boot(page, tripEvent(ID + '-thin', { lodging: { hotelName: 'Maybe Cabin', from: 'the option you picked' }, vendors: [], costSplit: null }));
  const body = await sheet.getByRole('textbox', { name: 'Edit the draft' }).inputValue();
  expect(body).not.toContain('Maybe Cabin');
  expect(body).not.toMatch(/share|each/i);
  await expect(sheet).toContainText('No stay booked yet — add it in Where everyone stays.');
  await expect(sheet).toContainText('Nothing booked to do together yet — add it in People you’re hiring.');
  await expect(sheet).toContainText('No costs split yet — add them in Split the costs.');
});

// Marking it sent (or any handoff but Copy) is the send ledger's record, and
// the ledger is the step's proof (taskEngine, 11/21/2026): the row reads
// "your plan did this · confirm" (was "done by your plan", cohesion batch D) instead of asking for the send again.
test('marking it sent ticks “Send everyone the trip details”', async ({ page }) => {
  const sheet = await boot(page, tripEvent(ID + '-marked'));
  await sheet.getByRole('button', { name: 'Mark it sent — I sent it myself', exact: true }).click();
  await expect(sheet).toContainText('Handed off yourself');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  const row = page.locator('.sheet').last().locator('.frow').filter({ hasText: STEP.split(':')[0] });
  await expect(row).toHaveClass(/\bgot\b/);
  await expect(row).toContainText('your plan did this');
});

test('copying it is not sending it', async ({ page }) => {
  const sheet = await boot(page, tripEvent(ID + '-copied'));
  await sheet.getByRole('button', { name: 'Copy it', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  const row = page.locator('.sheet').last().locator('.frow').filter({ hasText: STEP.split(':')[0] });
  await expect(row).not.toHaveClass(/\bgot\b/);
});
