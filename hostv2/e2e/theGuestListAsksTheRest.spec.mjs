// ─── THE GUEST LIST ASKS THE REST (G2c-2b-2b; owner, 11/28/2026: "Approved, go
// with your recommendations", calls A and B; UX_12 §8a, render screen 1) ─────
// A headcount plan with kids welcome is asked how many are kids; a list shows
// how many are likely on the day (its reason one tap down), asks "Same person?"
// for a reply signed differently, says how many you can reach haven't had the
// invite, and links to Who sits where (8+ names) and guest photos (from the
// event day). Made-up names; nothing is sent.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const at = '2026-11-24T15:00:00.000Z';
const seed = async (page, ev, w = 390, h = 844) => {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1&guests=kit');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  return page.locator('[data-guests-kit]');
};
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);

test('a headcount plan with kids welcome is asked how many are kids, and it saves', async ({ page }) => {
  const kit = await seed(page, { id: 'gk-kids', name: 'Cookout', type: 'Backyard BBQ', createdAt: '2026-11-20', date: dateIn(20),
    guestMode: 'count', guestCount: 20, guestCountSource: 'host', plusOnePolicy: 'no_plus_ones', kidsPolicy: 'kids_welcome', rsvpDeadline: dateIn(10),
    vendors: [], budget: [], timeline: [] });
  await expect(kit.locator('h2.gk-q')).toHaveText('How many of your 20 are kids?');
  await kit.getByRole('button', { name: 'More kids' }).click();
  await kit.getByRole('button', { name: 'More kids' }).click();
  await kit.locator('[data-kids-save]').click();
  await expect.poll(async () => (await saved(page)).kidsCount).toBe(2);
});

const NAMES = ['Rosa Lane', 'Marcus Bell', 'Priya Shah', 'Dev Okafor', 'Ana Ruiz', 'Bo Reed', 'Cy Lark', 'Di Moss'];
const LIST = {
  id: 'gk-rest', name: 'Thanksgiving at ours', type: 'Thanksgiving', createdAt: '2026-11-20', date: dateIn(0),
  guestMode: 'list', guestEstimate: 8, guestCountSource: 'host', plusOnePolicy: 'no_plus_ones', kidsPolicy: 'adults_only', rsvpDeadline: dateIn(-1),
  invitesSentAt: at, vendors: [], budget: [], timeline: [],
  guests: [
    ...NAMES.map((name, i) => ({ id: 'g' + i, name, email: name.split(' ')[0].toLowerCase() + '@example.com',
      ...(i < 6 ? { invitedAt: at } : {}), ...(i < 3 ? { rsvp: 'Yes' } : i === 3 ? { rsvp: 'No' } : {}) })),
    { id: 'x', name: 'Dev O.', rsvp: 'Yes', maybeSameAs: 'g3' },
  ],
};

test('the list: turnout with its reason, Same person?, who hasn’t had the invite, Who sits where, photos — 390', async ({ page }) => {
  const kit = await seed(page, LIST);
  const t = kit.locator('[data-turnout]');
  await expect(t).toContainText(/^Likely \d+–\d+ on the day\./);
  await t.getByRole('button', { name: 'How we got this' }).click();
  await expect(kit.locator('[data-turnout-why]')).toContainText(/confirmed · \d+ repl(y|ies) still out/);
  await expect(kit.locator('[data-untold]')).toHaveText('2 you can reach haven’t had the invite yet.');
  await expect(kit.locator('[data-same="x"]')).toContainText('“Dev O.” replied. Is that Dev Okafor?');
  await kit.locator('[data-same="x"] [data-same-yes]').click();
  await expect(kit.locator('[data-same]')).toHaveCount(0);
  expect((await saved(page)).guests.find((g) => g.id === 'g3').rsvp).toBe('Yes');
  await expect(kit.locator('[data-photos]')).toBeVisible();
  await kit.locator('[data-seating]').click();
  await expect(page.locator('.sheet #sheet-title')).toHaveText('Who sits where');
});

test('NEGATIVE CONTROL: before the event day there is no photos row', async ({ page }) => {
  const kit = await seed(page, { ...LIST, date: dateIn(5), rsvpDeadline: dateIn(2) });
  await expect(kit.locator('[data-seating]')).toBeVisible();
  await expect(kit.locator('[data-photos]')).toHaveCount(0);
});

test('on an iPad in landscape the list carries them too — 1194x834', async ({ page }) => {
  const kit = await seed(page, LIST, 1194, 834);
  await expect(kit.locator('[data-turnout]')).toContainText(/^Likely \d+–\d+ on the day\./);
  await expect(kit.locator('[data-untold]')).toBeVisible();
  await expect(kit.locator('[data-same="x"]')).toBeVisible();
  await expect(kit.locator('[data-seating]')).toBeVisible();
});
