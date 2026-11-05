// ─── "ON THE LIST" MEANS ON THE LIST ─────────────────────────────────────────
//
// Gold run (11/5/2026): a headcount host with five names saw "—" over "on the
// list — counted, never chased": the number was the yes-count, the label said
// the list. Rail viewports only, as theCouplesSheSaidReachTheList explains.
import { test, expect } from './fixtures.mjs';

const RAIL = /tablet-land|tablet-tall|desktop|wide/;
const names = ['Ana Rivera', 'Bea Chen', 'Cara Odom', 'Dee Patel', 'Eve Brooks'];

const boot = async (page, guestMode) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, {
    id: 'E2E_onlist_' + guestMode, type: 'Get-Together', name: 'Book club', date: '2027-03-12',
    guestMode, guestEstimate: 5, budget: [], vendors: [], timeline: [],
    guests: names.map((name, i) => ({ id: 'g' + i, name, rsvp: '' })),
  });
  await page.goto('./');
  const row = page.getByRole('button', { name: /^Guests$/ }).first();
  await row.waitFor({ state: 'visible', timeout: 20000 });
  await row.click();
  await page.getByText('Your people').first().waitFor({ state: 'visible', timeout: 20000 });
  return page.evaluate(() => {
    const eb = [...document.querySelectorAll('*')].find((x) => x.children.length === 0 && (x.textContent || '').trim() === 'Your people');
    return eb ? (eb.parentElement.innerText || '').replace(/\s+/g, ' ') : '';
  });
};

test('a headcount host with five names and no replies reads 5 on the list', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'the section rail exists at tablet-land and above');
  const hero = await boot(page, 'count');
  expect(hero).toMatch(/Your people 5 on the list/);
});

test('CONTROL — a list host still sees the yes-count, not the list size', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'the section rail exists at tablet-land and above');
  const hero = await boot(page, 'list');
  expect(hero).toMatch(/Your people — no yes replies yet/);
});
