// ─── EVERY PART OPENS ITS SECTION, AND THE PANEL SPEAKS TO HOSTS ─────────────
// Owner, 11/24/2026 (a live report): the parts listed under "What's counted"
// read "handled" and did nothing when tapped, and the panel around them
// explained the app's own counting ("They read from the same list but won't
// match", "this count reads", "Each part counts once here"). Every part is now
// a door to its section (the one opener the chips and the tall iPad's ribbon
// use), and the panel says what a host needs and nothing about the engine.
import { test, expect } from '@playwright/test';
import { settled, dateIn } from './fixtures.mjs';

const EV = { id: 'ev-parts-open', name: 'Rosa’s Harvest Dinner', type: 'Dinner Party', date: dateIn(24), startTime: '18:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '42 Elm Ct, Springfield, VA 22150', venueCity: 'Springfield', venueState: 'VA',
  guestMode: 'count', guestCount: 10, guestEstimate: 10, guestCountSource: 'host', totalBudget: 0, budget: [], vendors: [], guests: [], timeline: [] };

const boot = async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('./?elegant=1&noanalytics=1');
  await settled(page);
  await expect(page.locator('[data-pp-line]')).toBeVisible({ timeout: 15_000 });
  return { ctx, page };
};
const openPanel = async (page) => {
  // The line toggles the panel; it stays open after a section closes.
  if (await page.locator('#whats-counted').getAttribute('inert') !== null) await page.locator('[data-pp-line]').click();
  await expect(page.locator('#whats-counted')).not.toHaveAttribute('inert', '');
  await page.waitForTimeout(700);
};
const part = (page, name) => page.locator('#whats-counted [data-plan-part]', { hasText: name }).first();

test('a handled part opens its section: Date & time, Where it happens, Guests', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await boot(browser);
  for (const [name, sheetText] of [['Date & time', /date/i], ['Where it happens', /venue|where/i], ['Guests', /guests/i]]) {
    await openPanel(page);
    const row = part(page, name);
    await expect(row, name).toContainText('handled');
    expect(await row.evaluate((e) => e.tagName), `${name} is a button`).toBe('BUTTON');
    await row.click();
    const sh = page.locator('.sheet').last();
    await expect(sh, `${name} opens a section`).toBeVisible();
    await expect(sh).toContainText(sheetText);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
  await ctx.close();
});

test('the panel speaks to hosts: no word about how the app counts', async ({ browser }) => {
  const { ctx, page } = await boot(browser);
  await openPanel(page);
  const t = (await page.locator('#whats-counted').innerText()).replace(/\s+/g, ' ');
  for (const dev of [/this count reads/i, /read from the same list/i, /won.t match/i, /counts once here/i, /keep their own counts/i, /one job can close two parts/i]) {
    expect(t, String(dev)).not.toMatch(dev);
  }
  await expect(page.locator('#whats-counted')).toContainText(/Your plan, part by part/i);
  await ctx.close();
});
