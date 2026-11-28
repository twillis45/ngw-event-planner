// ─── THE GUESTS KIT OPENS IN HOSTV2 (owner, 11/27/2026: "Bring the guest
// workflow and screens from v4 with v2 styling") ─────────────────────────────
// G2c-1, behind ?guests=kit while the old Guests sheet's specs are ported.
// With the switch on, opening Guests shows the shared kit's screens
// (src/guestsKit), the ones hostv4 shows, in hostv2's colors: one question at a
// time, then the path and the list with its swipes, the step's one button in
// steel. The answer saves through hostv2's own write path, so hostv2's Undo
// line says so, on screen. Back leaves the way it came. With the switch off,
// Guests is the sheet it was. Made-up names only.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const NAMES = ['Rosa Lane', 'Marcus Bell', 'Priya Shah', 'Dev Okafor'];
const BASE = {
  id: 'gk-v2', name: 'Thanksgiving at ours', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(20), startTime: '15:00', startTimeSource: 'host', venueKind: 'home', venueCity: 'Springfield, VA',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host', vendors: [], budget: [], timeline: [],
  guests: NAMES.map((name, i) => ({ id: 'g' + i, name, email: name.split(' ')[0].toLowerCase() + '@example.com' })),
};
const ANSWERED = { ...BASE, plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: dateIn(10) };

const boot = async (page, ev, { w = 390, h = 844, theme = 'dark', kit = true } = {}) => {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1&theme=' + theme + (kit ? '&guests=kit' : ''));
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
};
const kit = (page) => page.locator('[data-guests-kit]');

test('with the switch on, Guests is the kit: one question at a time, saved through hostv2 — 390x844', async ({ page }) => {
  await boot(page, BASE);
  await expect(kit(page)).toBeVisible();
  await expect(kit(page).locator('h1.lt')).toHaveText('Guests');
  await expect(kit(page).locator('h2.gk-q')).toHaveText('Can guests bring someone?');
  await kit(page).getByRole('button', { name: 'Yes, plus-ones are welcome' }).click();
  // The next question, and hostv2's own line with its Undo, on the screen: in
  // the page, where hostv4 shows it (theGuestsKitStaysInHostv2: covering nothing).
  await expect(kit(page).locator('h2.gk-q')).toHaveText('Are kids welcome?');
  const toast = kit(page).locator('[data-done]');
  await expect(toast).toContainText(/plus-ones/i);
  await expect(toast.getByRole('button', { name: 'Undo' })).toBeVisible();
  const box = await toast.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].plusOnePolicy);
  expect(saved).toBe('plus_one_ok');
});

for (const theme of ['dark', 'light'])
test(`the path, the list and its swipes, in hostv2's colors — 390x844 ${theme}`, async ({ page }) => {
  await boot(page, ANSWERED, { theme });
  await expect(kit(page).locator('[data-path]')).toBeVisible();
  // The step's one button is hostv2's steel, not v4's bone.
  const btn = kit(page).locator('.action .primary');
  await expect(btn).toHaveText('Review your invite');
  const bg = await btn.evaluate((e) => getComputedStyle(e).backgroundImage);
  expect(bg).toContain('gradient');
  // The surfaces are hostv2's: a group is its card.
  const [grp, card] = await kit(page).locator('.grp').first().evaluate((e) => {
    const d = document.createElement('i'); d.style.color = 'var(--card)'; document.body.appendChild(d);
    const c = getComputedStyle(d).color; d.remove(); return [getComputedStyle(e).backgroundColor, c];
  });
  expect(grp).toBe(card);
  // The list opens and a row swipes open: Coming and Maybe under it.
  await kit(page).locator('[data-group="pending"]').click();
  const row = kit(page).locator('[data-guest="g0"]');
  await expect(row).toBeVisible();
  const r = await row.boundingBox();
  await page.mouse.move(r.x + 16, r.y + r.height / 2); await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(r.x + 16 + i * 12, r.y + r.height / 2);
  await page.mouse.up();
  await expect(kit(page).getByRole('button', { name: 'Mark Rosa Lane coming' })).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/(^|\s)gk(\s|$)/); // the kit's scope is the layer, not the page
});

test('Back closes the kit and leaves the board as it was', async ({ page }) => {
  await boot(page, ANSWERED);
  await expect(kit(page)).toBeVisible();
  await kit(page).locator('.backbtn').first().click();
  await expect(kit(page)).toHaveCount(0);
  await expect(page.locator('h2.ask')).toBeVisible();
});

test('on an iPad in landscape, three panes: the path and list beside the guest — 1194x834', async ({ page }) => {
  await boot(page, ANSWERED, { w: 1194, h: 834 });
  await expect(kit(page).locator('.gsplit[data-layout="split"]')).toBeVisible();
  await expect(kit(page).locator('.gk-gdetail .dhead')).toHaveText('Rosa Lane');
  await expect(kit(page).locator('.action .primary')).toHaveText('Review your invite');
  // hostv2's section rail stays the left column (the approved iPad render): the
  // list starts at its edge, never under it.
  const [rail, list] = await page.evaluate(() => [document.querySelector('.srail').getBoundingClientRect().right, document.querySelector('[data-guests-kit] .listpane').getBoundingClientRect().left]);
  expect(rail).toBeGreaterThan(0);
  expect(list).toBeGreaterThanOrEqual(rail - 1);
});

test('NEGATIVE CONTROL: with the switch off, Guests is the sheet it was', async ({ page }) => {
  await boot(page, ANSWERED, { kit: false });
  await expect(kit(page)).toHaveCount(0);
  await expect(page.locator('.sheet #sheet-title')).toBeVisible();
});
