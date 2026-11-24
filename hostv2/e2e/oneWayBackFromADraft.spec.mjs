// ─── ONE WAY BACK FROM A DRAFT (design audit batch 1, 11/20/2026) ───────────
//
// Measured and click-verified: the note drafted from a vendor card in People
// you're hiring opened with TWO ways back that went to two places. "‹ Sections"
// (top left) dropped the host on the section directory and lost the vendor;
// a pill reading "Back" (top right — every other sheet's says "Close") went to
// People you're hiring. And "‹ Sections" also sat on Jump to, Feeling stuck?
// and Your events, which are not sections and are not in that directory.
//
// The rule now: a sheet opened from inside another has ONE control in its
// header, "Close", and it returns to the sheet it came from. "‹ Sections" shows
// only where the sheet is a section. Checked again after the phone turns.
import { test, expect, settled, sheetSettled, openSectionByName, dateIn, openEventsSheet } from './fixtures.mjs';

const EVENT = {
  id: 'oneback-ev', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Jordan Avery', phone: '(555) 010-0101', rsvp: 'Yes' }],
  vendors: [{ id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', phone: '(410) 555-0142', cost: 2400, budgetCategory: 'Food' }],
  budget: [], timeline: [],
};

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

const openDraft = async (page) => {
  await openSectionByName(page, 'People you’re hiring');
  await expect(page.locator('#sheet-title')).toHaveText('People you’re hiring', { timeout: 8000 });
  await sheetSettled(page);
  const card = page.locator('.vcard', { hasText: 'Harvest Table Catering' }).first();
  const title = page.locator('#sheet-title');
  // The card opens on tap, and a card can already be open when the sheet lands
  // (then the tap closes it). Measured ~1 in 60 on tablet. Retry the pair
  // until the draft is what is showing — the draft is the precondition here,
  // not the thing under test.
  await expect(async () => {
    await card.evaluate((c) => c.click());
    await card.getByRole('button', { name: 'Draft note', exact: true }).click({ timeout: 2000 });
    await expect(title).toHaveText(/Harvest Table Catering/, { timeout: 2000 });
  }).toPass({ timeout: 15000 });
  await sheetSettled(page);
};

// What the sheet header offers, as a host sees it: every visible control.
const headControls = (page) => page.locator('.sheet .sheet-head button:visible').allInnerTexts()
  .then((t) => t.map((s) => s.trim()));

// The label every other sheet's way out uses.
const closeLabelOfASection = async (page) => {
  await openSectionByName(page, 'Your money');
  await sheetSettled(page);
  return page.locator('.sheet .sheet-head .sheet-x').innerText();
};

test('the draft note has one way back, labeled like the rest, to where it came from', async ({ page }) => {
  await boot(page);
  const label = await closeLabelOfASection(page);
  expect(label).toBe('Close');
  await openDraft(page);
  expect(await headControls(page)).toEqual([label]);
  await page.locator('.sheet .sheet-head .sheet-x').click();
  await expect(page.locator('#sheet-title')).toHaveText('People you’re hiring', { timeout: 8000 });
});

test('turning the device keeps one way back on the draft note', async ({ page }) => {
  const vp = page.viewportSize();
  await boot(page);
  await openDraft(page);
  // Portrait → landscape (or the reverse, if this project starts landscape).
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await page.waitForTimeout(400);
  await expect(page.locator('#sheet-title')).toHaveText(/Harvest Table Catering/);
  expect(await headControls(page)).toEqual(['Close']);
  await page.locator('.sheet .sheet-head .sheet-x').click();
  await expect(page.locator('#sheet-title')).toHaveText('People you’re hiring', { timeout: 8000 });
});

test('"‹ Sections" is on a section, and not on sheets that are not one', async ({ page }) => {
  await boot(page);
  await openSectionByName(page, 'Your money');
  await sheetSettled(page);
  // A section keeps the door to the directory below the rail. Where the rail
  // is up the rail IS the list, so "‹ Sections" is not shown (cohesion F4,
  // owner 11/24/2026: it was a third door beside the rail and ☰).
  const railUp = (await page.locator('.srail').count()) > 0;
  await expect(page.locator('.sheet .sheet-back')).toHaveCount(railUp ? 0 : 1);
  await page.keyboard.press('Escape');
  // Your events is a list of events, not a section of this one.
  const rail = page.locator('.srail-row[aria-label="This event"]');
  if (await rail.count()) await rail.first().click();
  // A tall iPad's events list opens from the board's title (11/22/2026).
  else if (await page.locator('[data-tt-title]').count()) await openEventsSheet(page);
  else {
    await page.locator('[aria-label="Menu"]').first().click();
    await sheetSettled(page);
    // Jump to is the menu itself, not a section.
    await expect(page.locator('#sheet-title')).toHaveText('Jump to');
    await expect(page.locator('.sheet .sheet-back')).toHaveCount(0);
    await page.locator('.sheet').last().locator('button', { hasText: /^This event/ }).first().click();
  }
  await expect(page.locator('#sheet-title')).toHaveText('Your events', { timeout: 8000 });
  await expect(page.locator('.sheet .sheet-back')).toHaveCount(0);
  await expect(page.locator('.sheet .sheet-head .sheet-x')).toHaveText('Close');
});
