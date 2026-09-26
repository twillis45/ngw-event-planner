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
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const REPAST_ID = 'e2e-repast-community';

const boot = async (page) => {
  // `d` is a LOCAL calendar date computed in Node and passed in — see
  // fixtures.dateIn. Deriving it in the page with toISOString() is UTC.
  await page.addInitScript(([id, d]) => {
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
  }, [REPAST_ID, dateIn(21)]);
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
  expect(tabs.join(' ')).toMatch(/Bringing\s*·\s*11/);
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

test('NO DEAD CHROME: an event with nothing to bring gets no BRINGING tab', async ({ page }) => {
  // A permanent "Bringing · 0" tab would advertise an empty room. This is the
  // assertion that keeps the control honest as more playbooks gain community
  // sources.
  //
  // NARROWED 2026-09-24, with the rule it guards. It read "gets no mode
  // control" and asserted zero `.fmode` buttons, which was right while the
  // control was Shop|Bringing — with nothing brought there was nothing to
  // switch between. Board D's control is three wide (Shop · Bringing · Plan),
  // and Shop and Plan exist on every event, so the whole control can no longer
  // be absent: hiding it would hide the only door to the planning rows on
  // almost every event in the corpus.
  //
  // The property this test exists for is untouched — a tab for a room with
  // nobody in it — so it now asserts exactly that, and nothing more.
  await bootCookout(page);
  const t = (await page.locator('.sheet').first().innerText()).replace(/\s+/g, ' ');
  expect(t).toMatch(/bought|spread|estimate/i);   // premise: the sheet really opened
  const labels = await page.locator('.fmode').allInnerTexts();
  expect(labels.length).toBeGreaterThan(0);       // the control is there…
  expect(labels.join(' | ')).not.toMatch(/Bringing/i);  // … without the empty room
  expect(labels.join(' | ')).toMatch(/Plan/);     // and the planning door is reachable
});

// ─── THE CONTROL HAS TO DO WHAT IT SAYS (UX_07) ──────────────────────────────
//
// The first cut of the Bringing row read "Who's bringing?" with a chevron and
// then navigated to the Shop sheet. It named one act and performed another —
// the exact shape `ctaNamesTheAct` exists to stop, and I shipped it.
test('naming a bringer actually records one, and both surfaces agree', async ({ page }) => {
  await boot(page);
  await page.locator('.fmode', { hasText: 'Bringing' }).click();
  await settled(page);

  // Before: nobody named.
  const first = page.locator('.fstat').first();
  expect((await first.innerText()).replace(/\s+/g, ' ')).toMatch(/Add a name/);

  await first.click();
  const input = page.locator('input#bringer-p_protein, .sheet input.field').first();
  await input.fill('Sister Vaughn');
  await input.press('Enter');
  await settled(page);

  // The row now carries the name, and the count moved.
  const panel = (await page.locator('.sheet').first().innerText()).replace(/\s+/g, ' ');
  expect(panel).toMatch(/Sister Vaughn/);
  expect(panel).toMatch(/1 of 11 spoken for/);

  // AND THE SHOP LIST AGREES. One fact, two surfaces — the chip must stop
  // saying "The repast committee" for a dish that now has a person.
  await page.locator('.fmode', { hasText: 'Shop' }).click();
  await settled(page);
  const listRow = page.locator('.fstat', { hasText: 'The list' }).first();
  if (await listRow.count()) { await listRow.click(); await settled(page); }

  // OPEN ONLY WHAT IS CLOSED. The first cut clicked every `.fgroup` in a loop,
  // and a click on an OPEN fold shuts it — so whether the chicken row was on
  // screen at the end depended on the order the folds happened to be in. The
  // run that failed and the run that passed differed by exactly that, which is
  // how a real defect got reported as flake.
  const folds = page.locator('.fgroup');
  const total = await folds.count();
  for (let i = 0; i < total; i += 1) {
    const f = folds.nth(i);
    if (!(await f.isVisible())) continue;
    const open = (await f.getAttribute('class') || '').split(/\s+/).includes('open');
    if (!open) { await f.click(); await page.waitForTimeout(110); }
  }
  await settled(page);

  // ASSERT ON THE ROW, NOT ON THE SHEET. A sheet-wide `toMatch` passes if the
  // name survives anywhere at all — including in the Bringing panel behind it —
  // so it could go green while the Shop chip still said "The repast committee".
  // The claim is that THIS DISH, in the Shop list, names the person.
  const chickenRow = page.locator('.fgroup .frow', { hasText: /chicken/i }).first();
  await expect(chickenRow).toBeVisible();
  const rowText = (await chickenRow.innerText()).replace(/\s+/g, ' ');
  expect(rowText).toMatch(/Sister Vaughn/);
  // And the collective noun is gone from it — one fact, one answer.
  expect(rowText).not.toMatch(/The repast committee/);
});
