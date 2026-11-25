// ─── SPONSORS ARE MONEY COMING IN (owner pick B + A's ask, 11/21/2026) ───────
//
// PTA's "Ask local businesses to sponsor…" opens the draft sheet on "The
// sponsor ask"; "Thank the sponsors…" opens "Money coming in · sponsors" in
// Your money: add a business, amount and what their name goes on; Mark
// received, Mark thanked; Draft their report. Pledged vs in hand, never spend.
// Jest twin: src/lib/__tests__/sponsorsAreMoneyComingIn.test.js.
import { test, expect, settled, sheetSettled, dateIn, openSectionByName, checklistStepAction, openAllPhases } from './fixtures.mjs';

const ASK = 'Ask local businesses to sponsor, with a one-page ask that names the goal and what their name goes on';
const THANKS = 'Thank the sponsors, the volunteers, and the custodian by name, and send sponsors a photo of their name on the banner';
const EVENT = {
  id: 'e2e-spons', name: 'Lincoln Elementary Fall Festival', type: 'PTA / Booster Fundraiser', date: dateIn(70), startTime: '11:00', startTimeSource: 'host',
  createdAt: new Date(Date.now() - 20 * 864e5).toISOString(), venue: 'Lincoln Elementary', venueKind: 'venue', venueCity: 'Austin', venueState: 'TX',
  guestMode: 'count', guestEstimate: 300, guestCountSource: 'host', guests: [], vendors: [], budget: [], foodChoices: {},
  timeline: [
    { id: 'pbt-e2e-spons-t_sponsor_ask', task: ASK, leadDays: 75, week: '10 weeks out', done: false, owner: '', category: 'planning', phase: 'revenue' },
    { id: 'pbt-e2e-spons-t_thanks', task: THANKS, leadDays: -3, week: '3 days after', done: false, owner: '', category: 'planning', phase: 'revenue' },
  ],
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
// A draft opened from a sheet goes BACK to that sheet on Escape; close them all.
const closeSheets = async (page) => {
  for (let i = 0; i < 4 && await page.locator('.sheet').count(); i += 1) { await page.keyboard.press('Escape'); await page.waitForTimeout(350); }
};
// A step's own action, wherever it sits (Up next, or inside its opened step).
const rowBtn = (page, label) => checklistStepAction(page, label);

test('the ask drafts; the sponsor list records pledges, receipts and thanks, apart from spending', async ({ page }) => {
  await page.addInitScript((ev) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await (await rowBtn(page, 'Draft the sponsor ask')).click();
  await sheetSettled(page);
  await expect(page.locator('#sheet-title')).toHaveText('The sponsor ask');
  await expect(page.locator('.sheet').last()).toContainText('blanks still to fill');

  await closeSheets(page);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await (await rowBtn(page, 'Open your sponsors')).click();
  await sheetSettled(page);
  await expect(page.locator('#sheet-title')).toHaveText('Your money');
  const list = page.locator('.sheet').last().locator('[data-sponsors]');
  await expect(list).toBeInViewport();
  const add = async (business, amount, recognition) => {
    await list.getByLabel('Sponsor business').fill(business);
    await list.getByLabel('Sponsor amount').fill(amount);
    await list.getByLabel('What their name goes on').fill(recognition);
    await list.getByRole('button', { name: 'Add a sponsor' }).click();
  };
  await add('Main St. Hardware', '500', 'The banner and the program');
  await add('Rosa’s Taqueria', '250', 'The banner');
  await list.getByRole('button', { name: 'Mark received: Main St. Hardware' }).click();
  await list.getByRole('button', { name: 'Mark thanked: Main St. Hardware' }).click();
  await expect(list.locator('[data-sponsor-totals]')).toContainText('$750');
  await expect(list.locator('[data-sponsor-totals]')).toContainText('$500 in hand');
  await expect.poll(async () => (await stored(page)).sponsors.map((s) => [s.business, s.amount, s.received, s.thanked]))
    .toEqual([['Main St. Hardware', 500, true, true], ['Rosa’s Taqueria', 250, false, false]]);
  for (const el of await list.locator('input, button').all()) expect((await el.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await list.getByRole('button', { name: 'Draft their report: Main St. Hardware' }).click();
  await sheetSettled(page);
  await expect(page.locator('.sheet').last()).toContainText('Your $500 came in, and your name went on The banner and the program.');

  // A sponsor on the list is the ask made; the thank-you row stays the host's.
  await closeSheets(page);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await openAllPhases(page);   // a step the plan handled sits in its phase (cohesion batch D)
  await expect(page.locator('.sheet').last().locator('.frow').filter({ hasText: 'Ask local businesses to sponsor' })).toHaveClass(/\bgot\b/);
  await expect(page.locator('.sheet').last().locator('.frow').filter({ hasText: 'Thank the sponsors' })).not.toHaveClass(/\bgot\b/);
});
