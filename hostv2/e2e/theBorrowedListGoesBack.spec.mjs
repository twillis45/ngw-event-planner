// ─── THE BORROWED LIST GOES BACK (owner pick B, 11/21/2026) ──────────────────
//
// Retirement's "Return every borrowed platter, urn, and folding chair…" opens
// "Borrowed · N of M back" on Space, seats & helpers. What a helper brings on
// What to bring is on it already; Add it (What + From whom) adds the rest;
// Mark returned records each; "Still to go back" names who is owed what; the
// row checks off once everything is back.
// Jest twin: src/lib/__tests__/theBorrowedListGoesBack.test.js.
import { test, expect, settled, sheetSettled, dateIn, openSectionByName, checklistStepAction, openAllPhases } from './fixtures.mjs';

const STEP = 'Return every borrowed platter, urn, and folding chair, and write down what you owe whom before you forget whose is whose';
const EVENT = {
  id: 'e2e-borrow', name: 'Coach Dan’s retirement', type: 'Retirement Party', date: dateIn(-1), startTime: '17:00', startTimeSource: 'host',
  createdAt: new Date(Date.now() - 40 * 864e5).toISOString(), venue: 'Home', venueKind: 'home', venueCity: 'Austin', venueState: 'TX',
  guestMode: 'count', guestEstimate: 40, guestCountSource: 'host', guests: [], vendors: [], budget: [], foodChoices: {},
  borrowed: [{ id: 'b1', what: 'Three platters', from: 'Grandma June', returned: false }],
  timeline: [{ id: 'pbt-e2e-borrow-t_settle_borrowed', task: STEP, leadDays: -7, week: 'Week after', done: false, owner: '', category: 'planning', phase: 'payment' }],
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);

test('the return row opens the borrowed list; add, mark returned, and the row checks off', async ({ page }) => {
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
  await (await checklistStepAction(page, 'Open the borrowed list')).click();
  await sheetSettled(page);
  const list = page.locator('.sheet').last().locator('[data-borrowed]');
  await expect(list).toBeInViewport();
  await expect(list).toContainText('Borrowed · 0 of 1 back');
  await list.getByLabel('What was borrowed').fill('Coffee urn');
  await list.getByLabel('Borrowed from whom').fill('Aunt Rose');
  await list.getByRole('button', { name: 'Add it' }).click();
  await expect(list).toContainText('Borrowed · 0 of 2 back');
  await expect(list.locator('[data-borrowed-owed]')).toHaveText('Still to go back: Grandma June (Three platters) · Aunt Rose (Coffee urn)');
  for (const el of await list.locator('input, button').all()) expect((await el.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await list.getByRole('button', { name: 'Mark returned: Three platters' }).click();
  await list.getByRole('button', { name: 'Mark returned: Coffee urn' }).click();
  await expect(list).toContainText('Borrowed · 2 of 2 back');
  await expect(list.locator('[data-borrowed-owed]')).toHaveText('Everything borrowed is back.');
  await expect.poll(async () => (await stored(page)).borrowed.map((b) => [b.what, b.from, b.returned]))
    .toEqual([['Three platters', 'Grandma June', true], ['Coffee urn', 'Aunt Rose', true]]);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await openAllPhases(page);   // a step the plan handled sits in its phase (cohesion batch D)
  await expect(page.locator('.sheet').last().locator('.frow').filter({ hasText: 'Return every borrowed platter' })).toHaveClass(/\bgot\b/);
});
