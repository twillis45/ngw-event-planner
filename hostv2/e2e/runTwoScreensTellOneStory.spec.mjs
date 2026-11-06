// ─── RUN 2: EACH SCREEN TELLS THE SAME STORY ─────────────────────────────────
//
// Run 2 break run (11/6/2026), the P2s that reach a screen. A Vida-shaped
// event: an address and no venue name, created today, the event tomorrow, a
// caterer considered. Rail viewports, as theCouplesSheSaidReachTheList explains.
import { test, expect } from './fixtures.mjs';

const RAIL = /tablet-land|tablet-tall|desktop|wide/;
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const EV = () => ({
  id: 'E2E_run2', type: 'Game Night', name: 'Game night', date: day(1), createdAt: new Date().toISOString(),
  guestMode: 'count', guestEstimate: 10, totalBudget: 5000, venueAddress: '12 Sample Rd', venueCity: 'Pasadena', venueState: 'MD',
  budget: [], timeline: [], guests: [],
  vendors: [{ id: 'v1', category: 'Catering', name: '', status: 'Considering' }],
});
const open = async (page, section) => {
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV());
  await page.goto('./');
  const row = page.getByRole('button', { name: new RegExp('^' + section) }).first();
  await row.waitFor({ state: 'visible', timeout: 20000 });
  await row.click();
  await page.waitForTimeout(800);
};
const sheetText = (page) => page.evaluate(() => (([...document.querySelectorAll('[role=dialog], .sheet')].pop() || document.body).innerText || '').replace(/\s+/g, ' '));

test('R2-10: an address is a place — no "No venue named yet" under it', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'rail viewports');
  await open(page, 'Space, seats');
  const t = await sheetText(page);
  expect(t).not.toMatch(/No venue named yet/);
  expect(t).toMatch(/12 Sample Rd is set/);
});

test('R2-11: a vendor deadline on an event planned today is not "overdue", and never ISO', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'rail viewports');
  await open(page, 'People you');
  const t = await sheetText(page);
  expect(t).not.toMatch(/overdue/i);
  expect(t).not.toMatch(/\d{4}-\d{2}-\d{2}/);
});

test('R2-17/18: Ask speaks the expected total and never says "crab" on a game night', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'rail viewports');
  await open(page, 'Ask No Guesswork');
  await page.getByLabel('Ask a question about your plan').fill('Will $5,000 cover it?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await page.waitForTimeout(1200);
  const t = await sheetText(page);
  expect(t).toMatch(/Your plan comes to about \$/);
  expect(t).not.toMatch(/crab/i);
});

test('R2-20: "$650" is a price; $1,000,000 is asked about once, then kept', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'rail viewports');
  await open(page, 'People you');
  await page.getByText('Unnamed').first().click();
  const pay = page.getByLabel('What you agreed to pay').first();
  const cost = () => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].vendors[0].cost);
  await pay.fill('$650'); await pay.press('Enter');
  await expect.poll(cost).toBe(650);
  await pay.fill('1,000,000'); await pay.press('Enter');
  await expect(page.getByText(/\$1,000,000.* is more than your whole plan/)).toBeVisible();
  expect(await cost()).toBe(650);
  await pay.press('Enter');
  await expect.poll(cost).toBe(1000000);
});

// R2-15 (owner-approved): "team-oriented games" becomes her pick, with the
// team-split task on the checklist and labeled suggestions on the decision.
test('R2-15: Vida\'s "team-oriented games" is recorded as her pick', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill('Vida is hosting a girls’ game night on Saturday, March 13, 2027 at 12 Sample Rd in Pasadena, Maryland. Ten girlfriends are coming. We want fun, team-oriented games, food, drinks, and a relaxed atmosphere.');
  const creation = await page.evaluate(() => document.body.innerText || '');
  expect(creation).not.toMatch(/didn.t make it into the plan[\s\S]{0,200}team-oriented/i);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect.poll(() => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').length; } catch { return 0; } }), { timeout: 15000 }).toBeGreaterThan(0);
  const ev = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
  expect(ev.foodChoices && ev.foodChoices.game_type).toBe('Team games');
  expect(ev.choiceSource && ev.choiceSource.game_type).toBe('host');
  expect((ev.timeline || []).some((t) => /Plan the teams/.test(t.task))).toBe(true);
});

// Owner request (11/6/2026): the host adds the games she has; each counts
// toward the game library's need, and she can take one back off.
test('her own games: added, counted toward the library, removable', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'rail viewports');
  await open(page, 'Space, seats');
  await page.getByRole('button', { name: /game library/i }).first().click();
  const box = page.getByLabel('Add a game you have');
  const ev = () => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
  await box.fill('Codenames'); await box.press('Enter');
  await box.fill('Catan'); await box.press('Enter');
  await box.fill('codenames'); await box.press('Enter');
  await expect.poll(async () => ((await ev()).gameLineup || []).map((g) => g.name).join('|')).toBe('Codenames|Catan');
  const key = Object.keys((await ev()).capacityHave || {}).find((k) => /game/i.test(k));
  expect(key, 'the library item has a have-count').toBeTruthy();
  expect((await ev()).capacityHave[key]).toBe(2);
  await page.getByRole('button', { name: 'Remove Catan' }).click();
  await expect.poll(async () => (await ev()).capacityHave[key]).toBe(1);
  expect(((await ev()).gameLineup || []).map((g) => g.name)).toEqual(['Codenames']);
});
