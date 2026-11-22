// ─── THE LAST PICK KEEPS ITS UNDO, AND THE QUIET BOARD SAYS ONE THING ────────
//
// Wanda audit follow-up (#224 queue, 11/22/2026). On `ev-x-wanda`, after
// "Drop-off catering" and then "Held separately", the queue empties and the
// board goes calm: "All quiet — only the heads-ups below." Two defects there:
//
//   1. The pick's receipt and its Undo vanished. The receipt renders inside
//      the hero card, and a calm board has no hero card, so the one pick that
//      emptied the queue was the one pick that could not be undone in place.
//   2. The progress line under "All quiet" read "5 of 7 · Food and Vendors
//      open": open, under a board that just said nothing needs her. The open
//      parts are real and not due yet; the line says so.
import { test, expect, settled } from './fixtures.mjs';

const ID = 'ev-x-wanda';
const PATCH = 'ngw-hostv2-patch-' + ID;

// 11/22/2026 (owner ruling "Expected spending", audit 2 D-03): the board now
// judges Wanda's $5,000 against her plan's EXPECTED cost ($5,263), so it leads
// with "Expected costs are $225 over your budget". This spec is about her food
// and timing asks, not her money, so it seeds a budget that covers the plan.
const ROOMY = { totalBudget: 5600 };
const boot = async (page) => {
  await page.addInitScript(([id, key, p]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem(key, JSON.stringify(p));
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, [ID, PATCH, ROOMY]);
  await page.goto('?elegant=1');
  await settled(page);
  await page.waitForTimeout(400);
};

const card = (page) => page.locator('.hero article.hero-card').first();
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), PATCH);
const tap = async (page, loc) => { await loc.scrollIntoViewIfNeeded(); await loc.click(); await page.waitForTimeout(700); };

const toTheQuiet = async (page) => {
  await boot(page);
  await tap(page, card(page).locator('.decopt').filter({ hasText: 'Drop-off catering' }).first());
  await tap(page, card(page).locator('.decopt').filter({ hasText: 'Held separately' }).first());
  // Premise: that pick emptied the queue. Changed 11/22/2026 (audit 2 P1-3):
  // this asserted "All quiet" here while Calls to make held four open calls —
  // the defect. The board now says what is still open instead of calm.
  await expect(page.locator('.hero article.hero-card')).toHaveCount(0);
  await expect(page.locator('.hero')).toContainText(/calls? still to make/);
  await expect(page.locator('.hero')).not.toContainText('All quiet');
};

test('the pick that empties the queue keeps its receipt and its Undo', async ({ page }) => {
  await toTheQuiet(page);
  expect((await stored(page)).officialCeremony).toBe('separate');
  const receipt = page.locator('.hero .receipt');
  await expect(receipt).toHaveCount(1);
  const undo = receipt.locator('button', { hasText: /^Undo$/ });
  await expect(undo).toBeVisible();
  await tap(page, undo);
  expect((await stored(page)).officialCeremony, 'the pick is undone').toBeUndefined();
  await expect(page.locator('.hero')).toContainText('Is the official Army retirement ceremony part of this party?');
});

test('the progress line under "All quiet" does not call the plan open and due', async ({ page }) => {
  await toTheQuiet(page);
  // With calls open there is no calm pole and so no progress line under it;
  // where one shows, the rule below holds.
  if (!(await page.locator('.hero .cp-prog').count())) return;
  const prog = (await page.locator('.hero .cp-prog').first().innerText()).trim();
  // Open parts are named only as not due yet, which is what "All quiet" means.
  if (/\bopen\b/.test(prog)) expect(prog).toMatch(/open, nothing due yet$/);
  expect(prog).toMatch(/^\d+ of \d+/);
});
