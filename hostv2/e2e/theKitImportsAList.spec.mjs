// ─── THE KIT IMPORTS A LIST (G2c-2b-3; owner, 11/28/2026: "Approved, go with
// your recommendations"; UX_12 §8a, render screen 3) ─────────────────────────
// ⋯ More → Import a list opens the kit's own sheet, not the old Guests sheet:
// where the list is from, the file, a preview before anything changes (new,
// updated, skipped), Bring them in, then Past imports with Undo and Clear.
// The rules are lib/guestImport's, the same the old sheet uses. Made-up names.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const EV = {
  id: 'gk-imp', name: 'Thanksgiving at ours', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(20), guestMode: 'list', guestEstimate: 14, guestCountSource: 'host', plusOnePolicy: 'no_plus_ones', kidsPolicy: 'adults_only', rsvpDeadline: dateIn(10),
  vendors: [], budget: [], timeline: [],
  guests: [{ id: 'g0', name: 'Rosa Lane', email: 'rosa@example.com' }],
};
const CSV = 'name,email,phone,rsvp_status\nRosa Lane,rosa@example.com,(555) 010-0100,Yes\nPriya Shah,priya@example.com,,\nDev Okafor,,,\n,nobody@example.com,,\n';

const boot = async (page, w = 390, h = 844) => {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1&guests=kit');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  const kit = page.locator('[data-guests-kit]');
  await kit.getByRole('button', { name: 'More' }).click();
  await kit.locator('[data-import]').click();
  return kit;
};
const names = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].guests.map((g) => g.name).sort());

for (const [w, h] of [[390, 844], [1194, 834]])
test(`Import a list in the kit: preview, bring them in, then undo — ${w}x${h}`, async ({ page }) => {
  const kit = await boot(page, w, h);
  const sheet = kit.locator('[data-import-sheet]');
  await expect(sheet).toBeVisible();
  await expect(page.locator('.sheet #sheet-title')).toHaveCount(0);       // not the old Guests sheet
  await sheet.locator('input[aria-label="Guest CSV file"]').setInputFiles({ name: 'family.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) });
  await expect(sheet.locator('[data-import-preview]')).toHaveText('3 of 4 rows read cleanly from family.csv: 2 new, 1 already on your list (their replies update). Rows without a name are skipped.');
  expect(await names(page)).toEqual(['Rosa Lane']);                           // nothing changes before Bring them in
  await sheet.getByRole('button', { name: 'Bring them in' }).click();
  await expect.poll(() => names(page)).toEqual(['Dev Okafor', 'Priya Shah', 'Rosa Lane']);
  await kit.getByRole('button', { name: 'More' }).click();
  await kit.locator('[data-import]').click();
  await expect(sheet.locator('[data-past-import]')).toHaveCount(1);
  await sheet.getByRole('button', { name: 'Undo last import' }).click();
  await expect.poll(() => names(page)).toEqual(['Rosa Lane']);
});
