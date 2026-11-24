// ─── ONE UNDO, AND A QUIET THAT IS TRUE ──────────────────────────────────────
//
// Audit 2 lane A (11/22/2026), on fresh custom events walked from the first ask:
//
//   P0-1  After "Use $400", a venue save and a food pick, the budget toast's
//         "Undo" was still up beside the hero's own Undo. Tapping it cleared
//         the budget and kept the pick. A newer edit retires an older Undo:
//         one Undo on screen, and it belongs to the last edit.
//   P0-5  One cleared bundle was announced as "All decided. Every open call is
//         made" while Calls to make still read "Open now".
//   P1-3  "All quiet" / "The plan is quiet" while Calls to make read
//         "Open now · N to settle" (NYE, Reunion, Elopement…).
//   P1-1  The hero's Undo on a food pick put the data back but not the ask.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const dateIn = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const mk = (id, type, name, guestCount, days = 86) => ({ id, name, type, date: dateIn(days), guestMode: 'count', guestCount,
  totalBudget: 0, budget: [], vendors: [], guests: [], timeline: [] });

const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1&noanalytics=1');
  await settled(page);
  await page.waitForTimeout(600);
};
const hero = (page) => page.locator('.escreen.on');
const heroText = async (page) => ((await hero(page).count()) ? (await hero(page).first().innerText()) : (await page.locator('.hero').first().innerText()));
const askText = async (page) => { const h = page.locator('.escreen.on h2.ask'); return (await h.count()) ? (await h.first().innerText()).trim() : ''; };
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
const visibleUndos = (page) => page.evaluate(() => [...document.querySelectorAll('button')]
  .filter((b) => /^Undo$/.test((b.innerText || '').trim()) && b.getBoundingClientRect().width > 0)
  .map((b) => (b.closest('.toast') ? 'toast: ' + b.closest('.toast').innerText.replace(/\s+/g, ' ') : 'hero')));
const budgetThenVenue = async (page) => {
  await hero(page).locator('button.cta').first().click(); await page.waitForTimeout(1200);
  const inp = hero(page).locator('input:visible');
  if (await inp.count()) {
    await inp.first().fill('Our place, Annapolis, MD');
    await hero(page).locator('button').filter({ hasText: /^Save/ }).first().click(); await page.waitForTimeout(1200);
  }
};
// The Calls to make sheet's own words: "Open now" is its eyebrow while calls wait.
const callsOpenNow = async (page) => {
  await openSectionByName(page, 'Calls to make');
  const sheet = page.locator('.sheet').last();
  await expect(sheet).toBeVisible();
  const open = /Open now/.test(await sheet.innerText());
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  return open;
};
const CALM = /All quiet|The plan is quiet|Everything’s ready|Every open call is made/;

test('a newer edit retires the older Undo: one Undo, and it is the last edit\'s', async ({ page }) => {
  await boot(page, mk('ev-one-undo', 'Get-Together', 'Saturday Get-Together', 16));
  await budgetThenVenue(page);
  const undos = await visibleUndos(page);
  expect(undos.length, `Undo buttons after the venue save: ${JSON.stringify(undos)}`).toBeLessThanOrEqual(1);
  expect(undos.filter((u) => /Budget/.test(u)), 'the budget toast Undo outlived the venue save').toEqual([]);
  const pick = hero(page).locator('.decopt.pick');
  if (await pick.count()) { await pick.first().click(); await page.waitForTimeout(1200); }
  const after = await visibleUndos(page);
  expect(after.length, `Undo buttons after the pick: ${JSON.stringify(after)}`).toBeLessThanOrEqual(1);
  expect(after.filter((u) => /Budget/.test(u))).toEqual([]);
  expect(Number((await stored(page)).totalBudget)).toBeGreaterThan(0);
});

test('a cleared bundle is not "every open call is made" while anything is open', async ({ page }) => {
  await boot(page, mk('ev-all-decided', 'Get-Together', 'Saturday Get-Together', 16));
  await budgetThenVenue(page);
  const pick = hero(page).locator('.decopt.pick');
  if (await pick.count()) { await pick.first().click(); await page.waitForTimeout(1400); }
  const t = await heroText(page);
  // Changed 11/24/2026 (owner, render 2: after a decision the hero advances).
  // Was: the premise that the pick stops on the payoff ("That’s decided.")
  // with a "Next: …" link. Now, with work still open, the hero goes straight
  // to the next item under "✓ Decided · Undo", and claims nothing is done.
  expect(t).not.toMatch(/All decided|Those are decided|That’s decided/);
  await expect(hero(page).locator('[data-decided]')).toBeVisible();
  expect(await page.locator('.ac-next').count(), 'no "Next: …" link').toBe(0);
  expect(t, 'nothing claims every call is made while work is open').not.toMatch(/Every open call is made|nothing pending/);
});

// Walk the hero the way the audit did (our pick, else the lit button), and at
// every calm sentence ask Calls to make whether anything is open.
for (const [type, name, n] of [['New Year’s Eve', 'NYE at ours', 30], ['Reunion', 'Bell Family Reunion', 50]]) {
  test(`calm is never claimed over open calls — ${type}`, async ({ page }) => {
    test.setTimeout(120_000);
    await boot(page, mk('ev-calm-' + type.length, type, name, n, 90));
    await budgetThenVenue(page);
    const seen = [];
    for (let step = 0; step < 16; step++) {
      const t = await heroText(page);
      if (CALM.test(t)) {
        expect(await callsOpenNow(page), `"${(t.match(CALM) || [])[0]}" while Calls to make reads "Open now"`).toBe(false);
        if (/All quiet/.test(t)) break;
      }
      const ask = await askText(page);
      seen.push(ask);
      if (seen.filter((a) => a === ask).length > 2) break;
      const pick = hero(page).locator('.decopt.pick');
      const cta = hero(page).locator('button.cta:not(.soft)');
      const use = hero(page).locator('button').filter({ hasText: /^use /i });
      const opt = hero(page).locator('.decopt');
      const inp = hero(page).locator('input:visible:not([type=date]):not([type=checkbox]):not([type=radio]), textarea:visible');
      if (await pick.count()) await pick.first().click();
      else if (await opt.count()) await opt.first().click();
      else if (await use.count()) await use.first().click();
      else if (await inp.count()) {
        for (let i = 0; i < await inp.count(); i++) {
          const el = inp.nth(i); const ty = await el.getAttribute('type');
          await el.fill(ty === 'time' ? '17:00' : ty === 'number' ? '40' : 'Move under the garage and the big tent');
        }
        const sv = hero(page).locator('button').filter({ hasText: /^(Save|Done|Set|Add|Next|Continue)/ });
        if (await sv.count()) await sv.first().click();
      } else if (await cta.count()) await cta.first().click();
      else {
        const next = page.locator('button.ac-next');
        if (await next.count()) { await next.first().click(); } else break;
      }
      await page.waitForTimeout(1300);
      // An action that opened a sheet is not an answer; close it and move on.
      for (let i = 0; i < 3 && await page.locator('.sheet:visible').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    }
  });
}

test('the hero Undo on a food pick brings the ask back', async ({ page }) => {
  test.setTimeout(90_000);
  await boot(page, mk('ev-undo-food', 'Crab Feast', 'Crab Feast', 40, 90));
  await budgetThenVenue(page);
  for (let k = 0; k < 4; k++) {
    const before = await askText(page);
    const opt = hero(page).locator('.decopt');
    if (!(await opt.count())) break;
    const pick = hero(page).locator('.decopt.pick');
    await ((await pick.count()) ? pick.first() : opt.first()).click();
    await page.waitForTimeout(1300);
    const undo = page.locator('.hero button, .escreen.on button').filter({ hasText: /^Undo$/ });
    if (!(await undo.count())) continue;
    await undo.first().click();
    await page.waitForTimeout(1300);
    expect(await askText(page), `Undo after "${before}"`).toBe(before);
    const again = hero(page).locator('.decopt.pick');
    await ((await again.count()) ? again.first() : hero(page).locator('.decopt').first()).click();
    await page.waitForTimeout(1300);
  }
});
