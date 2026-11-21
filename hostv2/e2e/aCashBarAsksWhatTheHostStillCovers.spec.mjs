// ─── A CASH BAR ASKS WHAT THE HOST STILL COVERS (owner, 11/21/2026) ──────────
//
// After "Cash/limited bar", Calls to make asks what the host still puts out.
// The options are built from the playbook's real drink lines (no "Bartender
// only"), the card says the budget moves (never "nothing else changes"), and
// Your money's "Bar / Beverage" line follows the answer.
// Jest twin: src/lib/__tests__/aCashBarAsksWhatTheHostStillCovers.test.js.
import { test, expect, settled, sheetSettled, dateIn, openSectionByName } from './fixtures.mjs';

const seed = (id, foodChoices) => ({
  id, name: 'Sam & Jo’s engagement', type: 'Engagement Party', date: dateIn(45), startTime: '18:00', startTimeSource: 'host',
  createdAt: new Date(Date.now() - 20 * 864e5).toISOString(), venue: 'Home', venueKind: 'home', venueCity: 'Austin', venueState: 'TX',
  guestMode: 'count', guestEstimate: 40, guestCountSource: 'host', guests: [], vendors: [], budget: [], totalBudget: 5000, foodChoices, timeline: [],
});
const boot = async (page, e) => {
  await page.addInitScript((ev) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, e);
  await page.goto('?elegant=1');
  await settled(page);
};
const barLine = async (page) => {
  await openSectionByName(page, 'Your money');
  await sheetSettled(page);
  const row = page.locator('.sheet').last().getByRole('button', { name: 'Open Bar / Beverage' });
  if (!(await row.count())) return null;
  return (await row.innerText()).replace(/\s+/g, ' ');
};

test('after a cash-bar pick the follow-up asks, and says the budget moves', async ({ page }) => {
  await boot(page, seed('e2e-cashbar', { bar: 'Cash/limited bar' }));
  await openSectionByName(page, 'Calls to make');
  await sheetSettled(page);
  const sheet = page.locator('.sheet').last();
  const card = sheet.getByText('What you still cover at a cash bar').first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(sheet.getByText('Ice and the zero-proof drinks').first()).toBeVisible();
  await expect(sheet.getByText(/Bartender only/)).toHaveCount(0);
  await expect(sheet.getByText(/nothing else changes/)).toHaveCount(0);
});

test('the drinks line follows the answer: the first set by default, nothing when fully cash', async ({ page }) => {
  await boot(page, seed('e2e-cashbar-a', { bar: 'Cash/limited bar' }));
  const def = await barLine(page);
  expect(def).toContain('$177');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'));
    list[0].foodChoices.bar_cover = 'The champagne toast, plus ice and zero-proof';
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify(list));
  });
  await page.reload();
  await settled(page);
  expect(await barLine(page)).toContain('$318');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'));
    list[0].foodChoices.bar_cover = 'Nothing — the bar is fully cash';
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify(list));
  });
  await page.reload();
  await settled(page);
  const none = await barLine(page);
  expect(none === null || /\$0\b/.test(none)).toBe(true);
});
