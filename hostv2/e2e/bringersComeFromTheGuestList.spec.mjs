// ─── WHO'S BRINGING IT, FROM THE GUEST LIST ─────────────────────────────────
// Owner, 11/18/2026: "For who's bringing it. Make those drop downs from guest
// list." Both "who's bringing" fields were free text. Now each is a dropdown of
// the guests who haven't declined, plus "Someone not on the list…" for the
// church kitchen or a neighbor. With no named guests it stays a text field
// (friendsBringTheSides covers that).
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const EV = {
  id: 'e2e-bringers', name: 'My Friendsgiving', type: 'Friendsgiving', date: dateIn(10), startTime: '16:00',
  venue: "Vida's", venueCity: 'Baltimore', venueState: 'MD', guestMode: 'list', guestEstimate: 15, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Maya', rsvp: 'Yes' }, { id: 'g2', name: 'Jordan', rsvp: 'Pending' }, { id: 'g3', name: 'Sam', rsvp: 'No' }],
  vendors: [], budget: [], timeline: [],
};
const boot = async (page) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, /spread/i);
  await settled(page);
};
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);

test('Bringing: each dish picks from guests who haven\'t declined, or someone not on the list', async ({ page }) => {
  await boot(page);
  // One food page (owner, 11/24/2026): Bringing is a section, not a tab.
  const sheet = page.locator('.sheet').last();
  await sheet.locator('.fstat', { hasText: 'Mac and cheese' }).first().click();
  const pick = sheet.getByLabel(/Who is bringing/);
  const options = await pick.locator('option').allTextContents();
  expect(options).toEqual(['Not named yet', 'Maya', 'Jordan', 'Someone not on the list…']);   // Sam declined
  await pick.selectOption('Jordan');
  await expect.poll(async () => (await saved(page)).foodOwner || {}).toEqual({ p_mac: 'Jordan' });

  // Her own dishes sit behind one door in the Bringing section (11/24/2026).
  await sheet.locator('[data-yours-door]').click();
  await sheet.locator('.fstat', { hasText: 'Stuffing' }).first().click();
  await sheet.getByLabel(/Who is bringing/).selectOption({ label: 'Someone not on the list…' });
  const typed = sheet.locator('[data-bringer-text]');
  await typed.fill('The church kitchen');
  await typed.press('Enter');
  await expect.poll(async () => (await saved(page)).foodOwner || {}).toEqual({ p_mac: 'Jordan', p_stuffing: 'The church kitchen' });
});

test('Add an item: who\'s bringing it is picked from the guest list too', async ({ page }) => {
  await boot(page);
  // One food page (owner, 11/24/2026): no Shop tab.
  await page.getByRole('button', { name: /Add an item you/ }).first().click();
  await page.getByRole('textbox', { name: 'Items to add, one per line' }).fill('Dinner rolls');
  await page.getByLabel("Who's bringing it (optional)").selectOption('Maya');
  await page.locator('[data-food-add-commit]').click();
  // The name goes to the one record of who brings what (foodOwner, 11/21/2026),
  // the same place Bringing writes, not onto the line.
  await expect.poll(async () => {
    const ev = await saved(page);
    return (ev.foodAdd || []).map((a) => [a.name, a.owner, (ev.foodOwner || {})[a.id]]);
  }).toEqual([['Dinner rolls', undefined, 'Maya']]);
});

test('Bringing: tapping away closes the picker, and Escape leaves a dish as it was', async ({ page }) => {
  await boot(page);
  // One food page (owner, 11/24/2026): Bringing is a section, not a tab.
  const sheet = page.locator('.sheet').last();
  await sheet.locator('.fstat', { hasText: 'Mac and cheese' }).first().click();
  await expect(sheet.getByLabel(/Who is bringing/)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(sheet.getByLabel(/Who is bringing/)).toHaveCount(0);
  await sheet.locator('.fstat', { hasText: 'Mac and cheese' }).first().click();
  await sheet.getByLabel(/Who is bringing/).press('Escape');
  await expect(page.getByLabel(/Who is bringing/)).toHaveCount(0);
  expect((await saved(page)).foodOwner || {}).toEqual({});
});
