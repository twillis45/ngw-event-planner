// ─── THE FOOD SHE NAMED IS ON THE MENU ───────────────────────────────────────
//
// Gold run (GOLD-05, 11/5/2026): "burgers and hot dogs" was listed under
// "didn't make it into the plan" on a cookout whose plan already carried them,
// and on any other event a named dish was lost. Driven through the host's own
// creation route; the stored event is what the menu reads.
import { test, expect } from './fixtures.mjs';

const create = async (page, seed) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(seed);
  const creation = await page.evaluate(() => document.body.innerText || '');
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  await expect.poll(() => page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').length; } catch { return 0; }
  }), { timeout: 15000 }).toBeGreaterThan(0);
  const ev = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
  return { creation, ev };
};

test('a cookout that names burgers and hot dogs: not "dropped", and no duplicate line', async ({ page }) => {
  const { creation, ev } = await create(page, 'Backyard cookout at my house for 25 people on Saturday, burgers and hot dogs');
  expect(creation).not.toMatch(/didn.t make it into the plan[\s\S]{0,200}(burgers|hot dogs)/i);
  expect((ev.foodAdd || []).map((f) => f.name)).not.toContain('Burgers');
  expect((ev.foodAdd || []).map((f) => f.name)).not.toContain('Hot dogs');
});

test('a dish the playbook does not carry becomes a host-named line', async ({ page }) => {
  const { ev } = await create(page, 'Game night at my place for 10 people on Friday, pizza and wings');
  const named = (ev.foodAdd || []).map((f) => f.name);
  expect(named).toEqual(expect.arrayContaining(['Pizza', 'Wings']));
});
