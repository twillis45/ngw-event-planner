// ─── A SHEET OPENS AT ITS TOP (design audit 2, 11/20/2026) ──────────────────
//
// Measured on the built bundle: `.sheet` is one scroller reused across sheet
// kinds, and its scrollTop was reset only for the three food tabs. A section
// opened from the scrolled Sections list (or from the rail, over a scrolled
// section) inherited that offset and opened with its title, "‹ Sections" and
// Close above the screen: 10 of 19 sections at 844x390 and 860x430, Calendar
// and Calls to make at 390x844. The host landed mid-sheet with no way out in
// view.
//
// Now every sheet opens at its top. Measured here, for each section, as the
// header's box against the sheet's and the viewport's, after the door the host
// uses at this width was left scrolled to its end. Checked again after the
// device turns.
//
// 11/21/2026 (owner: the running total becomes a docked footer): the sheet
// scrolls by `.sheet-body` now, the scroller inside the `.sheet` dialog, so
// that is what this file scrolls to the end and reads scrollTop from. The
// claim is unchanged; only the element that holds the offset moved.
import { test, expect, settled, sheetSettled, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 'sheettop-ev', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  // A LIST LONG ENOUGH TO SCROLL ON ANY SCREEN (11/21/2026). The "scrolled
  // door" premise needs the Guests sheet to overflow. Two guests did while a
  // tablet-landscape sheet was a 680px panel capped at 760px tall; since owner
  // ruling 27 a sheet from 1024 fills the column, so at 1080x1920 (the `wide`
  // project turned) the two-guest list fit in 1,918px and the premise read 0.
  // Thirty guests overflow there; nothing this file asserts reads the count.
  guests: [
    { id: 'g1', name: 'Jordan Avery', phone: '(555) 010-0101', rsvp: 'Yes' },
    { id: 'g2', name: 'Riley Park', phone: '(555) 010-0102', rsvp: 'Yes' },
    ...Array.from({ length: 28 }, (_, i) => ({ id: `g${i + 3}`, name: `Guest ${i + 3}`, rsvp: 'Yes' })),
  ],
  vendors: [{ id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', phone: '(410) 555-0142', cost: 2400, budgetCategory: 'Food' }],
  budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }],
  timeline: [{ id: 't1', task: 'Confirm final headcount with caterer', week: 'This week' }],
};

// The last rows of the Sections list: the furthest a host scrolls to reach them.
const TARGETS = ['Your money', 'Calendar', 'Calls to make', 'You & settings'];

const boot = async (page) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
};

const scrollSheetToEnd = (page) => page.evaluate(() => {
  const sh = [...document.querySelectorAll('.sheet')].pop().querySelector(':scope > .sheet-body');
  sh.scrollTop = sh.scrollHeight;
  return sh.scrollTop;
});

// Leave the door scrolled to its end, then go through it to `name`.
//   rail up:   a section is open and scrolled; the rail opens the next one.
//   rail down: the Sections list is open and scrolled; its row opens it.
const titleNow = (page) => page.locator('#sheet-title').first().innerText().catch(() => '');
const openFromAScrolledSheet = async (page, name) => {
  let before = '';
  const rail = page.locator('.srail-row');
  if (await rail.count()) {
    await page.locator('.srail-row', { hasText: 'Guests' }).first().click();
    await sheetSettled(page);
    expect(await scrollSheetToEnd(page), 'premise: the open section scrolled').toBeGreaterThan(0);
    before = await titleNow(page);
    await page.locator('.srail-row', { hasText: name }).first().click();
  } else {
    if (await page.locator('.sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
    await page.locator('.ev-eyebrow').first().click();
    await sheetSettled(page);
    await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click();
    await sheetSettled(page);
    expect(await scrollSheetToEnd(page), 'premise: the Sections list scrolled').toBeGreaterThan(0);
    before = await titleNow(page);
    await page.locator('.sheet').last().getByText(name, { exact: false }).first().click();
  }
  await expect.poll(() => titleNow(page), { timeout: 8000 }).not.toBe(before);
  await page.waitForTimeout(500);
};

const header = (page) => page.evaluate(() => {
  const sh = [...document.querySelectorAll('.sheet')].pop();
  const t = document.querySelector('#sheet-title').getBoundingClientRect();
  const x = sh.querySelector('.sheet-head .sheet-x');
  const xr = x ? x.getBoundingClientRect() : null;
  const s = sh.getBoundingClientRect();
  return { title: Math.round(t.top), sheetTop: Math.round(s.top), close: xr ? Math.round(xr.top) : null,
    closeBottom: xr ? Math.round(xr.bottom) : null, vh: innerHeight, scrollTop: Math.round(sh.querySelector(':scope > .sheet-body').scrollTop) };
});

const expectHeaderInView = (h, where) => {
  expect(h.title, `${where}: the title is inside the sheet (scrollTop ${h.scrollTop})`).toBeGreaterThanOrEqual(Math.max(0, h.sheetTop) - 1);
  expect(h.close, `${where}: Close exists`).not.toBeNull();
  expect(h.close, `${where}: Close is on screen`).toBeGreaterThanOrEqual(0);
  expect(h.closeBottom, `${where}: Close is on screen`).toBeLessThanOrEqual(h.vh);
};

test('every section opens with its title and Close on screen, from a scrolled door', async ({ page }) => {
  await boot(page);
  for (const name of TARGETS) {
    await openFromAScrolledSheet(page, name);
    expectHeaderInView(await header(page), name);
  }
});

test('turning the device: the next section still opens at its top', async ({ page }) => {
  const vp = page.viewportSize();
  await boot(page);
  // Portrait -> landscape (or the reverse, if this project starts landscape).
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await page.waitForTimeout(400);
  await openFromAScrolledSheet(page, 'Calendar');
  expectHeaderInView(await header(page), 'Calendar, turned');
  await page.setViewportSize(vp);
  await page.waitForTimeout(400);
  await openFromAScrolledSheet(page, 'Calls to make');
  expectHeaderInView(await header(page), 'Calls to make, turned back');
});
