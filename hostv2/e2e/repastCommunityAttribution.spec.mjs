// ─── THE MEAL A COMMUNITY CARRIES MUST STILL BE ON THE SCREEN ────────────────
//
// Review board, 2026-09-24. Verified by running the engine before a line was
// written: a 40-guest Repast returned SIX lines and ZERO food lines. The host's
// sheet listed sweet tea, ice, plates, to-go containers, serving utensils and
// trash bags — and not one item of the meal.
//
// `communityBringsIsAttributedNotDeleted.test.js` pins the engine. This pins
// the SCREEN, because the engine returning a row proves nothing about whether a
// host can see it, and jest cannot execute hostv2 at all.
//
// WHY AN E2E AND NOT A JEST TEXT GATE: `textGateRatchet.test.js` exists to stop
// exactly that substitution. A readFileSync + regex over HostShellV2.jsx would
// assert the JSX contains a string; it would not catch the row being filtered
// out three layers upstream, which is precisely how this defect shipped.
//
// SEEDED WITH addInitScript ON PURPOSE. The bundle carries a hardcoded backend
// fallback, so a plain localStorage write after load loses a race with the
// sync — driven by hand first and watched the server restore a different event
// over the seed, twice. addInitScript runs before the app boots and wins.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const REPAST_ID = 'e2e-repast-community';

const boot = async (page) => {
  await page.addInitScript((id) => {
    const d = new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10);
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id, name: 'A repast for Deacon Willie Hayes', type: 'Repast',
      date: d, venueCity: 'Annapolis', venueState: 'MD',
      guestMode: 'count', guestCount: 40, totalBudget: 1200,
      budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, REPAST_ID);
  await page.goto('?elegant=1');
  await settled(page);
  // The SPREAD sheet, not the seating one. The first cut of this opened
  // 'Space, seats' — copied from a sibling spec — and every assertion below
  // then searched a screen that never contained a shopping list.
  await openSectionByName(page, 'The spread & shopping');
  await settled(page);
  // WAIT FOR THE SHEET, don't assume the click opened it. `settled` waits for
  // the splash, not for a sheet, so without this the assertions can run
  // against the hero — which is exactly how the first run read as "the dishes
  // are missing" when the sheet had simply not opened yet.
  await page.locator('.sheet').first().waitFor({ state: 'visible', timeout: 8000 });
  // The rows live behind the list drill-in; the sheet's own summary shows
  // "The list · N bought ›" and not the items.
  const listRow = page.locator('.fstat', { hasText: 'The list' }).first();
  if (await listRow.count()) { await listRow.click(); await settled(page); }
  // AND EXPAND THE CATEGORY ACCORDIONS. The list groups its rows into
  // Food / Drinks / Supplies folds, and a collapsed fold contributes nothing to
  // innerText — so a search of the page reads exactly like the rows not
  // existing. That is what it read like for several runs.
  const folds = page.locator('.fgroup');
  const n = await folds.count();
  for (let i = 0; i < n; i += 1) {
    const f = folds.nth(i);
    if (await f.isVisible()) { await f.click(); await page.waitForTimeout(120); }
  }
  await settled(page);
};

const sheetText = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');

test('(premise) the repast sheet actually opened — without this every assertion below is vacuous', async ({ page }) => {
  await boot(page);
  const t = await sheetText(page);
  expect(t).toMatch(/repast/i);
});

test('THE DEFECT: the four dishes the committee carries are on the screen', async ({ page }) => {
  await boot(page);
  const t = await sheetText(page);
  // Authored in repast.js, all four sourced "Brought by the community", all
  // four previously dropped before the host ever saw them.
  expect(t).toMatch(/chicken|ham/i);
  expect(t).toMatch(/greens|mac|potato salad/i);
  expect(t).toMatch(/roll|cornbread/i);
  expect(t).toMatch(/cake|pie|pudding/i);
});

test('each one names who is carrying it, rather than sitting there unattributed', async ({ page }) => {
  await boot(page);
  const t = await sheetText(page);
  // The bringer chip was gated on `it.added`, so a playbook row could never
  // show one however full its `owner` field was.
  expect(t).toMatch(/repast committee|the community|friends and neighbors/i);
});

test('THE STORE PICKER DOES NOT OFFER A SHOP CALLED "BROUGHT BY THE COMMUNITY"', async ({ page }) => {
  await boot(page);
  const t = await sheetText(page);
  // `storeOf` read `where[0]` raw, and for these four lines `where[0]` is a
  // sentence about people. A grieving family was offered it as a storefront,
  // in the same chip row as Grocery and Caterer.
  expect(t).not.toMatch(/shopping at brought by/i);
  expect(t).not.toMatch(/brought by the community\s*›/i);
});

// ─── THE THIRD MODE (host ruling 2026-09-24) ─────────────────────────────────
//
// "What I buy" and "what I am waiting on" are two jobs, and the review board's
// communal-host seat found every proposed direction assumed one host with one
// cart at one store. For a repast that is structurally wrong: the committee is
// carrying the meal, and the host needs to see it without it being priced to her.
const bootCookout = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-cookout-modes', name: 'The Cookout', type: 'The Cookout',
      date: '2027-06-17', venueCity: '21014',
      guestMode: 'count', guestCount: 20, totalBudget: 1200,
      budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-cookout-modes');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'The spread & shopping');
  await settled(page);
  await page.locator('.sheet').first().waitFor({ state: 'visible', timeout: 8000 });
};

test('the mode control offers Bringing, counted', async ({ page }) => {
  await boot(page);
  const tabs = await page.locator('.fmode').allInnerTexts();
  expect(tabs.join(' ')).toMatch(/Shop/);
  expect(tabs.join(' ')).toMatch(/Bringing\s*·\s*4/);
});

test('the Bringing panel lists the dishes and charges the host nothing', async ({ page }) => {
  await boot(page);
  await page.locator('.fmode', { hasText: 'Bringing' }).click();
  await settled(page);
  const t = (await page.locator('.sheet').first().innerText()).replace(/\s+/g, ' ');
  expect(t).toMatch(/chicken|ham/i);
  expect(t).toMatch(/cake|pudding/i);
  expect(t).toMatch(/nothing here costs you anything/i);
  // A RECORD, NOT A REQUEST — the repast carries its own ruling about not
  // instructing a grieving family, and a screen that looked like it chased the
  // church for dishes would be that error in another register.
  expect(t).toMatch(/nothing here is sent to anyone/i);
});

test('NO DEAD CHROME: an event with nothing to bring gets no mode control', async ({ page }) => {
  // A permanent "Bringing · 0" tab would advertise an empty room. This is the
  // assertion that keeps the control honest as more playbooks gain community
  // sources — it fails loudly if the control ever renders unconditionally.
  await bootCookout(page);
  const t = (await page.locator('.sheet').first().innerText()).replace(/\s+/g, ' ');
  expect(t).toMatch(/bought|spread/i);          // premise: the sheet really opened
  expect(await page.locator('.fmode').count()).toBe(0);
});
