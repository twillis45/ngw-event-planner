// ─── THE GIFT LOG LIVES ON THE GUEST ROWS (owner pick A, 11/21/2026) ─────────
//
// Birthday's "Record the cash and gift cards…" and "Add the gifts that arrived
// by mail…" open After › Thank-yous & gifts. A received gift takes What it was
// and $ cash/card on the guest's own row; No/Maybe guests join "Couldn't come,
// sent a gift" from + chips; the cash is totaled; the rows check off when the
// work is on the log; the thank-you note names the gift.
// Jest twin: src/lib/__tests__/theGiftLogLivesOnTheGuestRows.test.js.
import { test, expect, settled, sheetSettled, dateIn, openSectionByName, checklistStepAction, openAllPhases } from './fixtures.mjs';

const CASH = 'Record the cash and gift cards separately, with the amount, then put them somewhere that is not the card box on the counter';
const MAILED = 'Add the gifts that arrived by mail or came from people who could not make it — those are the ones that get thanked last, if at all';
const EVENT = {
  id: 'e2e-gifts', name: 'Maya turns 40', type: 'Birthday', date: dateIn(-2), startTime: '19:00', startTimeSource: 'host',
  createdAt: new Date(Date.now() - 40 * 864e5).toISOString(), venue: 'Home', venueKind: 'home', venueCity: 'Austin', venueState: 'TX',
  guestMode: 'list', guestEstimate: 10, guestCountSource: 'host', vendors: [], budget: [], foodChoices: {},
  guests: [
    { id: 'g1', name: 'Lena Park', rsvp: 'Yes', phone: '(512) 555-0100' },
    { id: 'g2', name: 'Jordan Hale', rsvp: 'Yes' },
    { id: 'g3', name: 'Uncle Ray', rsvp: 'No' },
    { id: 'g4', name: 'Tess Wu', rsvp: 'Maybe' },
  ],
  timeline: [
    { id: 'pbt-e2e-gifts-t_after_cashgifts', task: CASH, leadDays: -1, week: 'Day after', done: false, owner: '', category: 'planning', phase: 'after' },
    { id: 'pbt-e2e-gifts-t_after_absent', task: MAILED, leadDays: -7, week: 'Week after', done: false, owner: '', category: 'planning', phase: 'after' },
  ],
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);

test('the gift rows open the log on the guest rows, and the log checks them off', async ({ page }) => {
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
  // The two seeded rows, plus the playbook's own "Go through the gifts…".
  // Each carries the action (cohesion batch D: Up next, or inside its step).
  await openAllPhases(page);
  await expect(page.locator('.sheet').last().locator('[data-up-next][data-step-action="Log gifts and cash"], [data-step-row][data-step-action="Log gifts and cash"]')).toHaveCount(3);
  await (await checklistStepAction(page, 'Log gifts and cash')).click();
  const log = page.locator('[data-gift-log]');
  await expect(log).toBeVisible();
  await expect(page.locator('.sheet')).toHaveCount(0);
  await expect(log.getByRole('heading', { name: 'Thank-yous & gifts' })).toBeVisible();

  // Jordan's gift: a card with cash.
  const jordan = log.locator('[data-gift-row="g2"]');
  await jordan.getByRole('button', { name: 'gift?' }).click();
  await jordan.getByLabel('What Jordan Hale gave').fill('Card with cash');
  await jordan.getByLabel('Cash or card amount from Jordan Hale').fill('100');
  await jordan.getByLabel('Cash or card amount from Jordan Hale').blur();
  // Uncle Ray couldn't come and mailed a check.
  await log.getByRole('button', { name: '+ Uncle Ray' }).click();
  await expect(log.getByText('Couldn’t come, sent a gift')).toBeVisible();
  const ray = log.locator('[data-gift-row="g3"]');
  await ray.getByLabel('What Uncle Ray gave').fill('Check in a card');
  await ray.getByLabel('Cash or card amount from Uncle Ray').fill('50');
  await ray.getByLabel('Cash or card amount from Uncle Ray').blur();
  await expect(log.locator('[data-gift-cash]')).toContainText('$150');
  await expect(log.locator('[data-gift-cash]')).toContainText('from 2');
  await expect.poll(async () => (await stored(page)).guests.map((g) => [g.giftReceived || false, g.giftWhat || '', g.giftCash || 0]))
    .toEqual([[false, '', 0], [true, 'Card with cash', 100], [true, 'Check in a card', 50], [false, '', 0]]);
  // The new fields are 44 tall at every size (the row's two flags are the
  // existing .mini pair, held by tapTargets / mobileTapFloor).
  for (const el of await log.locator('input').all()) expect((await el.boundingBox()).height).toBeGreaterThanOrEqual(44);

  // Both rows are on the log now.
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await openAllPhases(page);
  for (const lead of ['Record the cash and gift cards', 'Add the gifts that arrived by mail']) {
    await expect(page.locator('.sheet').last().locator('.frow').filter({ hasText: lead })).toHaveClass(/\bgot\b/);
  }
});

test('the thank-you note names the gift', async ({ page }) => {
  const ev = { ...EVENT, id: 'e2e-gifts-note', timeline: EVENT.timeline.slice(0, 1), guests: [{ id: 'g1', name: 'Lena Park', rsvp: 'Yes', giftReceived: true, giftWhat: 'Spa day voucher' }] };
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await (await checklistStepAction(page, 'Log gifts and cash')).click();
  await page.getByRole('button', { name: 'Start the thank-you run' }).click();
  await sheetSettled(page);
  await expect(page.locator('.sheet').last()).toContainText('thank you for the Spa day voucher');
});
