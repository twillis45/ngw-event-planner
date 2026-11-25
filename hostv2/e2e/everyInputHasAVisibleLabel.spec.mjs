// ─── EVERY INPUT HAS A VISIBLE LABEL (cohesion G, UX_11 rule 2; owner 11/24/2026) ──
//
// Measured on the Wanda sample before the change (desktop, every rail door):
// You & settings had 2 fields named only by their placeholders, Make it yours 6
// (its words were a <div>, not a <label>), Venue 1, Ask No Guesswork 1, Guests
// & invite 2, Split the costs 1, and each card in People you're hiring 8. A
// placeholder vanishes as she types, so the field forgets what it asks.
//
// The rule: every text field, text area and select a host can see is named by a
// <label> she can see — the label element tied to it, with words in it. An
// aria-label alone does not count. Walked over every section door the rail
// lists at 1440, and the phone's sheets at 390.
import { test, expect } from '@playwright/test';
import { settled, openSectionByName, sheetSettled } from './fixtures.mjs';

const boot = async (browser, [w, h, touch]) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch });
  const page = await ctx.newPage();
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-theme', 'light');
  });
  await page.goto('./?elegant=1&noanalytics=1&theme=light');
  await settled(page);
  await page.waitForTimeout(600);
  return { ctx, page };
};

// Runs in the page: every visible field in the open sheet with no visible label.
const unlabeled = () => {
  const vis = (e) => !!e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && parseFloat(getComputedStyle(e).opacity) > 0.01;
  const SKIP = new Set(['hidden', 'checkbox', 'radio', 'file', 'range', 'submit', 'button', 'color']);
  return [...document.querySelectorAll('.sheet input, .sheet textarea, .sheet select')]
    .filter((e) => vis(e) && !SKIP.has(e.type))
    .filter((e) => !(e.labels ? [...e.labels] : []).some((l) => vis(l) && (l.innerText || '').replace(e.value || '', '').trim()))
    .map((e) => `${e.tagName.toLowerCase()} "${e.getAttribute('aria-label') || e.placeholder || e.name || '?'}"`);
};

test('1440: every field on every section sheet has a visible label', async ({ browser }) => {
  test.setTimeout(180_000);
  const { ctx, page } = await boot(browser, [1440, 900, false]);
  const doors = await page.evaluate(() => [...document.querySelectorAll('.srail .srail-row:not(.srail-min):not([data-rail-stage])')]
    .map((e) => (e.getAttribute('aria-label') || e.innerText || '').trim()).filter(Boolean));
  expect(doors.length, 'the rail lists the sections').toBeGreaterThan(12);
  const bad = {};
  const noSheet = [];
  let fields = 0;
  for (const d of doors) {
    if (await page.locator('.sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
    const row = page.locator('.srail .srail-row', { hasText: d.split('\n')[0] }).first();
    if (!(await row.count())) continue;
    if (!(await row.click({ timeout: 3000 }).then(() => true, () => false))) { noSheet.push(d + ' (not clickable)'); continue; }
    await page.waitForTimeout(700);
    if (!(await page.locator('.sheet').count())) { noSheet.push(d); await page.keyboard.press('Escape'); continue; }
    fields += await page.evaluate(() => document.querySelectorAll('.sheet input:not([type=hidden]):not([type=checkbox]):not([type=radio]), .sheet textarea').length);
    const miss = await page.evaluate(unlabeled);
    if (miss.length) bad[d] = [...new Set(miss)];
  }
  test.info().annotations.push({ type: 'fields seen', description: String(fields) });
  expect(fields, 'premise: the walk saw fields').toBeGreaterThan(15);
  // Every door opened its sheet (a sheet that fails to render would otherwise
  // read as "no unlabeled fields"). Search opens the palette, not a sheet.
  expect(noSheet.filter((d) => !/^Search\b/.test(d)), 'doors that opened no sheet').toEqual([]);
  expect(bad).toEqual({});
  await ctx.close();
});

for (const name of ['You & settings', 'Make it yours', 'Venue', 'Ask No Guesswork', 'Guests & invite', 'Split the costs', 'People you’re hiring']) {
  test(`390: ${name} — every field has a visible label`, async ({ browser }) => {
    test.setTimeout(60_000);
    const { ctx, page } = await boot(browser, [390, 844, true]);
    await openSectionByName(page, name);
    await sheetSettled(page);
    // The vendor card's fields show once a card is open.
    if (name === 'People you’re hiring') { await page.locator('.sheet .vcard').first().click(); await page.waitForTimeout(600); }
    expect(await page.evaluate(unlabeled)).toEqual([]);
    await ctx.close();
  });
}
