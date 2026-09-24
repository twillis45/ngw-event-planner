// ─── THE PINNED TOTAL HAS TO COUNT THE LIST IT PRICES ────────────────────────
//
// Host, 2026-09-24, on the shipped footer: it read
//
//   0 of 9 bought                              $435–$860 estimated
//
// on a sheet whose list renders FOURTEEN tickable rows. Measured against the
// engine on the shipped retirement sample:
//
//   active lines   Food 2 · Drinks 7 · Supplies 5   = 14
//   itemCount                                       =  9
//   the money      foodLow+suppliesLow .. High      = all 14
//
// `itemCount`/`boughtCount` filter the engine's `isFood`, which is
// `group !== 'Supplies'` — supplies are a separate dollar line to the BUDGET,
// and rightly so. To a SHOPPING list they are five more things the host ticks.
// So one sentence counted nine and priced fourteen, two inches under a comment
// declaring "IT STATES WHAT IT COUNTS".
//
// WHY THIS IS AN E2E AND NOT A UNIT TEST. The defect is a disagreement between
// a number and the rows beside it. A unit test on the engine can only assert
// the engine against itself, and would have passed throughout — every figure
// above is individually correct. The only place the contradiction exists is the
// rendered sheet, so the assertion is: the denominator equals the number of
// tick-off rows actually on screen. Nothing here hardcodes 14; a playbook may
// change its list freely and this still holds.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'The spread & shopping');
  await settled(page);
  await page.locator('.sheet').first().waitFor({ state: 'visible', timeout: 8000 });
  // Open the list and every fold, so the rows the denominator claims to count
  // are actually in the DOM to be counted.
  const listRow = page.locator('.fstat', { hasText: 'The list' }).first();
  if (await listRow.count()) { await listRow.click(); await settled(page); }
  const folds = page.locator('.fgroup');
  const n = await folds.count();
  for (let i = 0; i < n; i += 1) {
    const f = folds.nth(i);
    if (await f.isVisible()) { await f.click(); await page.waitForTimeout(110); }
  }
  await settled(page);
};

const EV = {
  id: 'e2e-tally', name: 'The Cookout', type: 'The Cookout',
  date: '2027-06-17', venueCity: '21014',
  guestMode: 'count', guestCount: 20, totalBudget: 1200,
  budget: [], vendors: [], guests: [],
};

// SCOPED TO `.fgroup` DELIBERATELY. `.frow` is this app's generic row class —
// guests, decisions, vendors and a second checklist all render it, and an
// unscoped count returned 27 against a 22-line list on the first run of this
// spec. The shopping lines are the ones inside a group fold.

/** "0 of 14 bought" -> {bought:0, total:14} */
const readTally = (s) => {
  const m = /(\d+)\s+of\s+(\d+)\s+bought/i.exec(String(s || ''));
  return m ? { bought: Number(m[1]), total: Number(m[2]) } : null;
};

test('(premise) the sheet has more than one GROUP, or this proves nothing', async ({ page }) => {
  // The bug was supplies falling outside the count. On a list with a single
  // group there is nothing to fall outside of, and every assertion below would
  // pass on the broken build. This fails loudly rather than passing quietly.
  await boot(page, { ...EV, id: 'e2e-tally-premise' });
  const groups = await page.locator('.fgroup').count();
  expect(groups).toBeGreaterThan(1);
  const rows = await page.locator('.fgroup .frow').count();
  expect(rows).toBeGreaterThan(groups);
});

test('THE DENOMINATOR IS THE NUMBER OF ROWS ON SCREEN', async ({ page }) => {
  await boot(page, EV);
  // Every tick-off row, skipped ones excluded — a skipped line is not something
  // the host is going to buy, and the engine leaves it out of both halves.
  const rows = await page.locator('.fgroup .frow:not(.skipped)').count();
  expect(rows).toBeGreaterThan(0);

  const footer = readTally(await page.locator('.ftotal .ftotal-l').first().innerText());
  expect(footer).not.toBeNull();
  expect(footer.total).toBe(rows);
});

test('the hero, the list row and the pinned footer all say the same thing', async ({ page }) => {
  // Three readouts of one fact. Before the fix they agreed with each other and
  // disagreed with the list; the risk now is the reverse, so pin all three.
  await boot(page, EV);
  const rows = await page.locator('.fgroup .frow:not(.skipped)').count();

  const footer = readTally(await page.locator('.ftotal .ftotal-l').first().innerText());
  expect(footer.total).toBe(rows);

  // THE HERO NO LONGER CARRIES A COUNT (2026-09-24, board D). It led with
  // "Bought so far / N of M"; the headline is now the money and the count lives
  // in the pinned footer alone. Two readouts of one fact instead of three, so
  // what is asserted here is that the hero states the SAME money the footer
  // does — the remaining pair that could drift.
  const hero = (await page.locator('.sheet').first().innerText()).replace(/\s+/g, ' ');
  const heroMoney = /(\$[\d,]+)[\u2013-](\$[\d,]+)/.exec(hero);
  expect(heroMoney, 'the hero states an estimate').not.toBeNull();
  const footMoney = /(\$[\d,]+)[\u2013-](\$[\d,]+)\s+estimated/.exec(
    (await page.locator('.ftotal').first().innerText()).replace(/\s+/g, ' '));
  if (footMoney) {
    expect(`${heroMoney[1]}-${heroMoney[2]}`).toBe(`${footMoney[1]}-${footMoney[2]}`);
  }

  // The collapsed list row is only present while the list fold is closed on
  // some widths; assert it only when it is actually rendered.
  const listRow = page.locator('.fstat', { hasText: 'The list' });
  if (await listRow.count()) {
    const t = readTally(await listRow.first().innerText());
    if (t) expect(t.total).toBe(rows);
  }
});

test('ticking a SUPPLY moves the pinned count — it used to be invisible to it', async ({ page }) => {
  // The sharpest form of the defect: a host ticks a supply off and the number
  // they are watching does not move, because supplies were priced but not
  // counted. Drives a real click on a row in the Supplies group.
  await boot(page, EV);
  const before = readTally(await page.locator('.ftotal .ftotal-l').first().innerText());

  const supplies = page.locator('.fgroup', { hasText: /Supplies/i }).first();
  expect(await supplies.count()).toBeGreaterThan(0);
  const row = supplies.locator('.frow:not(.skipped)').first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await settled(page);

  const after = readTally(await page.locator('.ftotal .ftotal-l').first().innerText());
  expect(after.total).toBe(before.total);          // the list did not change
  expect(after.bought).toBe(before.bought + 1);    // the count did
});
