// Run 3 (11/6/2026, R3-3): a last day set before the first day was refused
// without a word. Rail viewports, as theCouplesSheSaidReachTheList explains.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const RAIL = /tablet-land|tablet-tall|desktop|wide/;

test('R3-3: a last day before the first day is refused, and says why', async ({ page }, testInfo) => {
  test.skip(!RAIL.test(testInfo.project.name), 'the section rail exists at tablet-land and above');
  await page.addInitScript(() => {
    window.__t = []; new MutationObserver(() => document.querySelectorAll('[role=status]').forEach((n) => { const x = (n.innerText || '').trim(); if (x && window.__t[window.__t.length - 1] !== x) window.__t.push(x); })).observe(document, { subtree: true, childList: true, characterData: true });
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{ id: 'E2E_span', type: 'Reunion', name: 'Reunion', date: '2027-07-10', guestMode: 'count', guestEstimate: 30, budget: [], vendors: [], guests: [], timeline: [] }]));
    localStorage.setItem('ngw-hostv2-last-event', 'E2E_span'); localStorage.setItem('ngw-v2-splash-seen', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('./');
  await settled(page);
  await openSectionByName(page, 'Space, seats', { settle: 0 });
  // The range is set in Date & time now (owner, 11/21/2026); Space links to it.
  await page.getByRole('button', { name: 'Change the dates in Date & time' }).click();
  await page.locator('[data-date-range]').getByLabel('Last day').fill('2027-07-01');
  await page.getByRole('button', { name: /^Move everything to th(is date|ese dates)$/ }).click();
  await expect.poll(() => page.evaluate(() => window.__t.join(' | '))).toMatch(/The last day has to come after the first day \(Jul 10(, 2027)?\)/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].endDate || null)).toBeNull();
});
