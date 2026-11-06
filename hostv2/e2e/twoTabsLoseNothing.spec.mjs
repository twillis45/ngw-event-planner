// ─── TWO TABS LOSE NOTHING ───────────────────────────────────────────────────
//
// Run 3 (11/6/2026, R3-5): with two tabs open, a guest added in tab A was wiped
// when tab B — still holding the older list — added one of its own. B wrote its
// stale guests array over A's. Rail viewports, as theCouplesSheSaidReachTheList
// explains; two pages in one context share storage the way two tabs do.
import { test, expect } from './fixtures.mjs';

const RAIL = /tablet-land|tablet-tall|desktop|wide/;
const EV = { id: 'E2E_two_tabs', type: 'Get-Together', name: 'Book club', date: '2027-03-12', guestMode: 'list', guestEstimate: 6, budget: [], vendors: [], timeline: [], guests: [] };

const addGuest = async (page, name) => {
  await page.getByRole('button', { name: /^Guests$/ }).first().click();
  await page.getByLabel(/Add guest names/i).fill(name);
  await page.getByRole('button', { name: 'Add them' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).first().click().catch(() => {});
};

test('a guest added in one tab survives an edit in the other', async ({ page, context }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'the section rail exists at tablet-land and above');
  await context.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('./');
  const tabB = await context.newPage();
  await tabB.goto(page.url());
  await page.getByRole('button', { name: /^Guests$/ }).first().waitFor({ timeout: 20000 });
  await tabB.getByRole('button', { name: /^Guests$/ }).first().waitFor({ timeout: 20000 });
  await addGuest(page, 'Tab One Tina');
  await addGuest(tabB, 'Tab Two Tom');
  const names = () => page.evaluate(() => (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].guests || []).map((g) => g.name).sort().join('|'));
  await expect.poll(names).toBe('Tab One Tina|Tab Two Tom');
  await page.reload();
  await expect.poll(names).toBe('Tab One Tina|Tab Two Tom');
});
