// ─── THE GUESTS KIT NEVER SENDS HER ELSEWHERE (G2c-2a, 11/28/2026) ──────────
// In hostv4 the kit's screens said "in the current app for now" and linked to
// hostv2 for what hostv4 could not do: the day, time and place, sign-in, the
// photo, the QR code, importing a list, sending the day's details. Inside
// hostv2 those are hostv2's own sheets, so each becomes an action that opens
// the sheet right there, over Guests, and Back returns to the page she was on
// (owner, 11/28/2026: "go with your recommendations"; UX_12 §8a). Signed out,
// as a new host is. Made-up names only.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const NAMES = ['Rosa Lane', 'Marcus Bell', 'Priya Shah', 'Dev Okafor'];
const EV = {
  id: 'gk-stay', name: 'Thanksgiving at ours', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(20), startTime: '15:00', startTimeSource: 'host', venueKind: 'home', venueCity: 'Springfield, VA',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: dateIn(10),
  vendors: [], budget: [], timeline: [],
  guests: NAMES.map((name, i) => ({ id: 'g' + i, name, email: name.split(' ')[0].toLowerCase() + '@example.com' })),
};

const boot = async (page, ev = EV) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1&guests=kit');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  await expect(page.locator('[data-guests-kit="guests"]')).toBeVisible();
};
const kit = (page) => page.locator('[data-guests-kit]');
const noElsewhere = async (page) => expect(kit(page)).not.toContainText(/current app/i);

test('no kit page in hostv2 points to "the current app"', async ({ page }) => {
  await boot(page, { ...EV, venue: '', venueKind: '' });
  await noElsewhere(page);
  await kit(page).getByRole('button', { name: 'More' }).click();
  await noElsewhere(page);
  await kit(page).getByRole('button', { name: 'Done' }).click();
  await kit(page).locator('.action .primary').click();             // Review your invite
  await expect(page.locator('[data-guests-kit="invite"]')).toBeVisible();
  await noElsewhere(page);
  await kit(page).locator('[data-open-design]').click();
  await expect(page.locator('[data-guests-kit="invite-design"]')).toBeVisible();
  await noElsewhere(page);
});

test('a missing place opens hostv2’s own Venue sheet, and Back returns to the invite', async ({ page }) => {
  await boot(page, { ...EV, venue: '', venueKind: '' });
  await kit(page).locator('.action .primary').click();
  await expect(page.locator('[data-guests-kit="invite"]')).toBeVisible();
  // One button: the step's own (UX_12), not a link beside it saying the same.
  await expect(kit(page).getByRole('button', { name: 'Set where it is' })).toHaveCount(1);
  await kit(page).locator('.action .primary', { hasText: 'Set where it is' }).click();
  await expect(page.locator('.sheet #sheet-title')).toHaveText('Venue');
  await expect(kit(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-guests-kit="invite"]')).toBeVisible();
});

test('⋯ More imports a list and shows the QR code here', async ({ page }) => {
  await boot(page);
  await kit(page).getByRole('button', { name: 'More' }).click();
  await expect(kit(page).locator('[data-import]')).toHaveText(/Import a list/);
  await expect(kit(page).locator('[data-show-qr]')).toHaveText(/Show QR code/);
  // Since G2c-2b-3 the import is the kit's own sheet (theKitImportsAList).
  await kit(page).locator('[data-import]').click();
  await expect(kit(page).locator('[data-import-sheet] input[aria-label="Guest CSV file"]')).toBeAttached();
  await expect(page.locator('.sheet #sheet-title')).toHaveCount(0);
});

// #323's fix, kept: on the old Guests sheet's own import (still there for
// ?guests=old), Escape with focus on the file picker closes the sheet, since
// a file picker has no typing for Escape to cancel.
test('on the old sheet’s import, Escape from the file picker closes the sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  await expect(page.locator('.sheet #sheet-title')).toBeVisible();
  await page.locator('#guests-import-anchor').first().click();
  const picker = page.locator('input[aria-label="Guest CSV file"]');
  await picker.focus();
  await expect.poll(() => page.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'))).toBe('Guest CSV file');
  await page.keyboard.press('Escape');
  await expect(page.locator('.sheet #sheet-title')).toHaveCount(0);
});

test('signed out, sending asks for sign-in here: hostv2’s own sign-in opens over Guests', async ({ page }) => {
  // The plan has its day, time and place, so the step's button is Send.
  await boot(page, { ...EV, venue: 'Our place', venueAddress: '12 Elm St, Springfield, VA' });
  await kit(page).locator('.action .primary').click();             // Review your invite
  await kit(page).locator('[data-open-send]').click();             // Send the invite
  const signIn = kit(page).getByRole('button', { name: 'Sign in' });
  await expect(signIn).toBeVisible();
  await signIn.click();
  await expect(kit(page)).toHaveCount(0);
  await expect(page.locator('.sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-guests-kit="invite"]')).toBeVisible();
});

test('the preview frame shows hostv2’s own guest page', async ({ page }) => {
  await boot(page);
  await kit(page).locator('.action .primary').click();
  const src = await kit(page).locator('iframe[data-invite-preview]').getAttribute('src');
  expect(src).toMatch(/^\.\/\?invite-preview=gk-stay$/);
});

// ─── THE SAVED LINE COVERS NOTHING (live check, 11/28/2026) ─────────────────
// hostv2's floating toast sat over the "No reply yet" group at 390, across the
// list and the guest at 1194, and over the message on Design this page, for its
// 6 seconds; taps in that window hit the toast. UX_12 §1.3: "Confirmations never
// cover a control." Inside the kit the line is the kit's own, in the page where
// hostv4 shows it, with its Undo; the floating toast stays away.
for (const [w, h] of [[390, 844], [1194, 834]])
test(`a saved answer says so in the page, covering nothing, and Undo puts it back — ${w}x${h}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: h });
  const ev = { ...EV, rsvpDeadline: '' };
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1&guests=kit');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  await expect(kit(page).locator('h2.gk-q')).toHaveText('When should replies be in by?');
  await kit(page).locator('[data-question] button.row', { hasText: 'Our suggestion' }).click();
  const line = kit(page).locator('[data-done]');
  await expect(line).toBeVisible();
  await expect(line.getByRole('button', { name: 'Undo' })).toBeVisible();
  await expect(page.locator('.toast')).toHaveCount(0);
  // Nothing tappable in the kit sits under the line, other than its own Undo.
  const hits = await page.evaluate(() => {
    const l = document.querySelector('[data-guests-kit] [data-done]').getBoundingClientRect();
    return [...document.querySelectorAll('[data-guests-kit] button, [data-guests-kit] a, [data-guests-kit] input, [data-guests-kit] textarea')]
      .filter((b) => !b.closest('[data-done]'))
      .map((b) => b.getBoundingClientRect())
      .filter((r) => r.width && r.height && r.left < l.right && r.right > l.left && r.top < l.bottom && r.bottom > l.top).length;
  });
  expect(hits).toBe(0);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].rsvpDeadline);
  expect(await saved()).toBeTruthy();
  await line.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(saved).toBeFalsy();
});
