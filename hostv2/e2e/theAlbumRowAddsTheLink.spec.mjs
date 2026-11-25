// ─── THE ALBUM ROW ADDS THE LINK (owner pick "Combine A + B line", 11/21/2026) ──
//
// Halloween's and NYE's "Share the … photos in one album link" had no button.
// Now "Add the album link" opens After on the invite recap's "Photo album
// link" field; the recap is previewed, "Put it on the invite link" saves it
// (cohesion batch E, owner E2 11/24/2026: was one-tap "Publish the recap"),
// and the row checks off.
// Under the button, ONLY when guests' uploads wait for approval, a quiet line
// opens the Guest list on Guest photos. Its count is the server's list; signed
// out (401) or unreadable, there is no line at all.
// Jest twin: src/lib/__tests__/theAlbumRowAddsTheLink.test.js.
import { test, expect, settled, sheetSettled, dateIn, openSectionByName, checklistStepAction, openAllPhases } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const HW_STEP = 'Share the photo corner pictures in one album link while the costumes are still the thing people are talking about — a week later it is last year';
const NYE_STEP = 'Share the midnight photos and the countdown video in one album link — this is the picture people want on January 1';

const seed = (id, type, date, task) => ({
  id, name: 'Our party', type, date, createdAt: new Date(Date.now() - 40 * 864e5).toISOString(),
  venue: 'Home', venueKind: 'home', venueCity: 'Austin', venueState: 'TX', startTime: '19:00', startTimeSource: 'host',
  guestMode: 'count', guestEstimate: 20, guestCountSource: 'host', guests: [], vendors: [], budget: [], foodChoices: {},
  timeline: [{ id: `pbt-${id}-t_photos`, task, leadDays: 2, week: 'After', done: false, owner: '', category: 'planning', phase: 'guest' }],
});

const boot = async (page, e, photos) => {
  // The host's photo list, as the server answers it: a list, a 401 (signed
  // out) or a failure. Registered after the fixture's catch-all, so it wins.
  if (photos) await page.route(`${API}/api/events/${e.id}/guest-photos`, (r) => (
    typeof photos === 'number' ? r.fulfill({ status: photos, json: { detail: 'no' } }) : r.fulfill({ status: 200, json: { photos } })));
  await page.addInitScript((ev) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, e);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  return page.locator('.sheet').last();
};
const stored = (page, id) => page.evaluate((i) => (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').find((x) => x.id === i) || {}), id);
const pending = (n) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, status: 'pending', created_at: '2026-11-01T20:00:00Z', url: 'https://e2e-mock.invalid/p.jpg' }));

test('Halloween: "Add the album link" opens After on the album field, and a published link checks the row off', async ({ page }) => {
  const e = seed('e2e-hw-album', 'Halloween Party', dateIn(-2), HW_STEP);
  const sheet = await boot(page, e);
  const btn = await checklistStepAction(page, 'Add the album link');
  await expect(btn).toHaveCount(1);
  await btn.click();
  const field = page.getByRole('textbox', { name: 'Photo album link' });
  await expect(field).toBeVisible();
  await expect(field).toBeFocused();
  await expect(page.locator('.sheet')).toHaveCount(0);
  await field.fill('https://photos.app.goo.gl/e2eAlbum');
  await page.getByRole('button', { name: 'Preview what guests see' }).click();
  await page.getByRole('button', { name: 'Put it on the invite link' }).click();
  await expect.poll(async () => (await stored(page, e.id)).albumUrl).toBe('https://photos.app.goo.gl/e2eAlbum');
  // The step is handled now: back on the checklist it reads done by the plan.
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  await openAllPhases(page);   // a step the plan handled sits in its phase (cohesion batch D)
  const row = page.locator('.sheet').last().locator('.frow').filter({ hasText: 'Share the photo corner pictures' });
  await expect(row).toHaveClass(/\bgot\b/);
  await expect(row).toContainText('your plan did this');
});

test('NYE, before the day: the field is there to fill in early, and says when guests see it', async ({ page }) => {
  const e = seed('e2e-nye-album', "New Year's Eve Party", dateIn(10), NYE_STEP);
  const sheet = await boot(page, e);
  await (await checklistStepAction(page, 'Add the album link')).click();
  await expect(page.getByRole('textbox', { name: 'Photo album link' })).toBeFocused();
  await expect(page.getByText('On your invite link, guests see it once the party’s over.')).toBeVisible();
});

test('photos waiting: a quiet line under the button opens Guest photos', async ({ page }) => {
  const e = seed('e2e-hw-photos', 'Halloween Party', dateIn(-2), HW_STEP);
  const sheet = await boot(page, e, pending(3));
  await checklistStepAction(page, 'Add the album link');   // opens its step when it is not up next
  const line = sheet.locator('button[data-row-photos]');
  await expect(line).toHaveText('3 guest photos waiting for you to approve →');
  // Quiet: not a second pill and not lit.
  const look = await line.evaluate((el) => { const cs = getComputedStyle(el); return { bg: cs.backgroundImage, fill: cs.backgroundColor, border: cs.borderTopColor }; });
  expect(look.bg).toBe('none');
  expect(look.fill).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  await line.click();
  await sheetSettled(page);
  await expect(page.locator('.sheet').last().locator('[data-host-photos]')).toBeVisible();
});

for (const [what, answer] of [['signed out (401)', 401], ['unreadable (500)', 500], ['none waiting', []]])
test(`no photos line when the count is ${what}`, async ({ page }) => {
  const e = seed('e2e-hw-nophotos', 'Halloween Party', dateIn(-2), HW_STEP);
  const sheet = await boot(page, e, answer);
  await expect(await checklistStepAction(page, 'Add the album link')).toHaveCount(1);
  await page.waitForTimeout(600);
  await expect(sheet.locator('button[data-row-photos]')).toHaveCount(0);
});
