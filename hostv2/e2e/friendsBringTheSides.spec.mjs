// ─── FRIENDS BRING THE SIDES ────────────────────────────────────────────────
//
// Owner, 11/18/2026: "Friendsgiving and like events need more traditional
// sides." Each traditional side is now its own line. Under the default potluck
// (the host makes the main) every side is a friend's dish: listed under
// Bringing, $0 to the host, and each one asks who is bringing it.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, {
    id: 'e2e-sides', name: 'My Friendsgiving', type: 'Friendsgiving', date: dateIn(10), startTime: '16:00',
    venue: "Vida's", venueCity: 'Baltimore', venueState: 'MD', guestMode: 'count', guestEstimate: 15, guestCountSource: 'host',
    guests: [], vendors: [], budget: [], timeline: [],
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, /spread/i);
  await settled(page);
};

test('the potluck sides are friends\' dishes: under Bringing, each one asks who brings it', async ({ page }) => {
  await boot(page);
  const bringing = page.getByRole('tab', { name: /^Bringing · \d+$/ });
  await expect(bringing).toBeVisible();
  await bringing.click();
  await settled(page);
  const sheet = page.locator('.sheet').last();
  await expect(sheet).toContainText('Your friends are bringing these dishes. You are buying the rest.');
  for (const dish of ['Green beans', 'Sweet potatoes', 'Mac and cheese', 'Cranberry sauce', 'Stuffing']) {
    await expect(sheet.locator('.fstat', { hasText: dish }).first()).toBeVisible();
  }
  await sheet.locator('.fstat', { hasText: 'Mac and cheese' }).first().click();
  const who = sheet.getByLabel(/Who is bringing/);
  await who.fill('Maya');
  await who.press('Enter');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].foodOwner || {}))
    .toEqual({ p_mac: 'Maya' });
});
