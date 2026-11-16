// ─── A TOWN SUGGESTS ITS MARKET (11/16/2026) ─────────────────────────────────
// "Which market" read "National baseline" for an event in Alexandria, VA: no
// city-to-metro table existed. Now the row PROPOSES the market from the venue's
// town, and nothing is stored until the host taps "Use …". Pinned to 390px.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const EV = {
  id: 'cust-town-mkt', demoSeed: true, name: 'Town Probe', type: 'Wedding',
  date: '2027-05-15', guestMode: 'count', guestCount: 80, guests: [],
  venueCity: 'Alexandria', venueState: 'VA', budget: [], vendors: [], lodgingOptions: [],
};
const stored = (page) => page.evaluate(() => {
  const e = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').find((x) => x && x.id === 'cust-town-mkt') || {};
  return e.market ?? null;
});

test('the venue town proposes its market, and only a tap stores it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((ev) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  const sheet = page.locator('.sheet').last();
  const row = sheet.locator('.fstat', { hasText: 'Which market' }).first();

  await expect(row).toContainText('Suggested: Washington DC / NoVA');
  expect(await stored(page)).toBe(null); // a proposal, not a write

  await row.click();
  await settled(page);
  const use = sheet.getByRole('button', { name: /Use Washington DC \/ NoVA — from Alexandria, VA/ });
  // Never past the select's right edge (live check 11/16: it ran off the side at 390px).
  const [u, sel] = await Promise.all([use.boundingBox(), page.locator('#metro-market-pick').boundingBox()]);
  expect(u.x + u.width).toBeLessThanOrEqual(Math.max(sel.x + sel.width, 390 - 16) + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await use.click();
  await settled(page);
  expect(await stored(page)).toBe('dc');
  await expect(page.locator('#metro-market-pick')).toHaveValue('dc');
  await expect(sheet.getByRole('button', { name: /^Use Washington/ })).toHaveCount(0);
});
