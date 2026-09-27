// ─── EVERY FOOD TAB REPORTS ITS OWN PROGRESS, AND SAYS IT ONCE ─────────────
//
// HOST, 2026-09-27: "do bar for plan and bringing".
//
// The pinned bar was Shop-only. That made it the answer to one question
// ("how far through the shopping am I") and left the other two tabs with no
// running account of their own work — and, because the drill-in exit had just
// moved INTO the bar, it also left the Plan tab as the one place a host could
// open a section and find no way out of it. Extending the bar closes that at
// its source rather than special-casing it.
//
// ── WHAT EACH TAB COUNTS, AND WHY IT IS NOT THE SAME THING ────────────────
//
//   Plan       N of M decided        the choices that size the plan
//   Shop       N of M bought         the tick-off through the list
//   Bringing   N of M spoken for     dishes with somebody's name against them
//
// The words are the surfaces' own — "spoken for" is lifted off the Bringing
// screen, not invented beside it.
//
// ── THE RULE THAT COST A ROUND TRIP ───────────────────────────────────────
//
// Say each fact ONCE per screen. The bar's own source comment cites this as
// the reason its right-hand slot stays empty on Plan and Bringing (the
// estimate is the Plan headline; "nothing here costs you anything" is already
// the Bringing grounding). Driving it caught me breaking that rule in the
// LEFT slot instead: the Bringing grounding read "0 of 11 spoken for ·
// nothing here costs you anything" and the new bar, four inches below, read
// "0 of 11 spoken for". The grounding gave the count up — the bar does not
// scroll away and the grounding does — and kept the fact the bar cannot
// carry, that none of it is the host's bill.
//
// This gate pins both halves: each tab's own count, and no tab saying its
// count twice.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, src);

const barText = (page) => page.evaluate(() => {
  const b = document.querySelector('.ftotal');
  return b ? (b.innerText || '').replace(/\s+/g, ' ').trim() : null;
});

// Everything on the sheet EXCEPT the bar — so "is this said twice" compares
// the bar against the screen rather than against itself.
const sheetTextWithoutBar = (page) => page.evaluate(() => {
  const sheet = document.querySelector('.sheet');
  if (!sheet) return '';
  const clone = sheet.cloneNode(true);
  clone.querySelectorAll('.ftotal').forEach((n) => n.remove());
  return (clone.innerText || '').replace(/\s+/g, ' ').trim();
});

// A Repast defaults to the committee carrying the meal, which is what
// produces `broughtByCommunity` rows and therefore the Bringing tab at all.
// Taken from playbooks/__tests__/communityBringsIsAttributedNotDeleted.
const openSpread = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    if (localStorage.getItem('ngw-hostv2-last-event') === 'e2e-bar3') return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-bar3', name: 'My repast', type: 'Repast', date: '2027-03-14',
      venueCity: 'Annapolis', state: 'MD',
      guestMode: 'count', guestCount: 40, totalBudget: 1200,
      budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-bar3');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, 'Plan the food|what you.?re serving|dietary needs on the food plan');
  await page.waitForTimeout(1500);
  await settled(page);
};

const toTab = async (page, label) => {
  await tapText(page, label);
  await page.waitForTimeout(1000);
  await settled(page);
};

test('(premise) a repast really does carry all three tabs', async ({ page }) => {
  // Without this, a missing Bringing tab would make the assertions below pass
  // by never running the case they exist for.
  await openSpread(page);
  const txt = await sheetTextWithoutBar(page);
  expect(txt).toMatch(/Bringing/);
  expect(txt).toMatch(/Plan/);
  expect(txt).toMatch(/Shop/);
});

test('Shop counts what is bought', async ({ page }) => {
  await openSpread(page);
  await toTab(page, '^Shop$');
  expect(await barText(page)).toMatch(/\d+ of \d+ bought/);
});

test('Plan counts what is decided', async ({ page }) => {
  await openSpread(page);
  await toTab(page, '^Plan$');
  expect(await barText(page)).toMatch(/\d+ of \d+ decided/);
});

test('Bringing counts who is spoken for', async ({ page }) => {
  await openSpread(page);
  await toTab(page, '^Bringing');
  expect(await barText(page)).toMatch(/\d+ of \d+ spoken for/);
});

test('THE DUPLICATION: no tab states its own count twice', async ({ page }) => {
  // The defect this caught on the way in, on Bringing. Checked on all three
  // because the rule is not about one screen.
  await openSpread(page);
  for (const tab of ['^Plan$', '^Shop$', '^Bringing']) {
    await toTab(page, tab);
    const bar = await barText(page);
    expect(bar, `no bar on ${tab}`).toBeTruthy();
    const count = (bar.match(/\d+ of \d+ \w+( \w+)?/) || [])[0];
    expect(count, `bar on ${tab} has no count: ${bar}`).toBeTruthy();
    expect(await sheetTextWithoutBar(page), `"${count}" is on ${tab} twice`)
      .not.toContain(count);
  }
});

test('at completion the bar carries the Bringing screen\u2019s own words', async ({ page }) => {
  // "Everyone is spoken for." was the grounding line's completion state. It
  // moved into the bar with the count rather than being deleted with it, so
  // this drives every dish to a name and reads the bar — the branch is proven
  // rather than assumed, which is the whole reason for naming all eleven.
  await openSpread(page);
  await toTab(page, '^Bringing');

  for (let guard = 0; guard < 40; guard += 1) {
    const opened = await page.evaluate(() => {
      const row = [...document.querySelectorAll('.fstat')]
        .find((b) => b.tagName === 'BUTTON' && /add a name/i.test(b.innerText || ''));
      if (!row) return false;
      row.click();
      return true;
    });
    if (!opened) break;                       // every dish is named
    const box = page.locator('input[id^="bringer-"]').first();
    await box.fill('Aunt Rose');
    await box.press('Enter');
    await page.waitForTimeout(150);
  }
  await settled(page);

  expect(await barText(page)).toContain('Everyone is spoken for');
  // …and it still is not said twice.
  expect(await sheetTextWithoutBar(page)).not.toContain('Everyone is spoken for');
});

test('THE PHANTOM EXIT: a section open on Shop is not an exit on Bringing', async ({ page }) => {
  // `foodSect` does not reset when the tab changes, so `drillOpen` stayed
  // true across the switch and the Bringing bar rendered a Done for a panel
  // that was not on that screen. Caught on the device, not in the code.
  await openSpread(page);
  await toTab(page, '^Shop$');
  await tapText(page, 'The list[\\s\\S]*item');      // open a drill-in HERE
  await page.waitForTimeout(1200);
  await settled(page);
  const onShop = await page.evaluate(() => [...document.querySelectorAll('.ftotal button')]
    .some((x) => /^done$/i.test((x.innerText || '').trim())));
  expect(onShop, 'premise: Shop really does offer the exit').toBe(true);

  await toTab(page, '^Bringing');
  const onBringing = await page.evaluate(() => [...document.querySelectorAll('.ftotal button')]
    .some((x) => /^done$/i.test((x.innerText || '').trim())));
  expect(onBringing).toBe(false);
  // …and the bar is still there doing its other job.
  expect(await barText(page)).toMatch(/spoken for/);
});

test('and the Bringing screen keeps the fact the bar cannot carry', async ({ page }) => {
  // Dropping the count from the grounding line must not drop the reassurance
  // with it — that is the sentence a host reading other people's dishes needs.
  await openSpread(page);
  await toTab(page, '^Bringing');
  expect(await sheetTextWithoutBar(page)).toContain('nothing here costs you anything');
});
