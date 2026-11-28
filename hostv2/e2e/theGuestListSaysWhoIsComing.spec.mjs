// ─── THE GUEST LIST SAYS WHO IS COMING (G2c-2b-2a; owner, 11/28/2026:
// "Approved, go with your recommendations"; UX_12 §8a, render screen 1) ──────
// Each row shows its +1, partner, kids and diet tags under the name; an open
// group reads by household once anyone has one; a line totals the plus-ones
// and kids; the find box shows from 8 names and matches the +1, the group and
// the email too. Made-up names.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const NAMES = ['Rosa Lane', 'Marcus Bell', 'Nia Bell', 'Dev Okafor', 'Priya Shah', 'Ana Ruiz', 'Bo Reed', 'Cy Lark'];
const EV = {
  id: 'gk-list', name: 'Thanksgiving at ours', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(20), startTime: '15:00', startTimeSource: 'host', venueKind: 'home', venueCity: 'Springfield, VA',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: dateIn(10),
  vendors: [], budget: [], timeline: [],
  guests: NAMES.map((name, i) => ({ id: 'g' + i, name, rsvp: 'Yes' })).map((g) => (
    g.id === 'g0' ? { ...g, plusOne: 'Sam Lane', diets: ['Vegetarian'], group: 'Family' }
    : g.id === 'g1' ? { ...g, coupleId: 'c1', allergens: ['Tree nuts'] }
    : g.id === 'g2' ? { ...g, coupleId: 'c1', kids: 2, group: 'Family' }
    : g.id === 'g3' ? { ...g, email: 'dev@example.com', group: 'Work' } : g)),
};

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
  return page.locator('[data-guests-kit]');
};

test('rows say +1, partner, kids and diet; an open group reads by household; a line totals them — 390', async ({ page }) => {
  const kit = await boot(page);
  await expect(kit.locator('[data-party]')).toHaveText('+1 plus-one · 2 kids. Food sizes kids lighter.');
  await kit.locator('[data-group="yes"]').click();
  await expect(kit.locator('[data-guest="g0"] [data-tags]')).toHaveText('+1 Sam Lane · Vegetarian');
  await expect(kit.locator('[data-guest="g1"] [data-tags]')).toHaveText('with Nia · Tree nuts allergy');
  await expect(kit.locator('[data-guest="g2"] [data-tags]')).toHaveText('with Marcus · 2 kids');
  await expect(kit.locator('[data-household]')).toHaveText(['Family · 2', 'Work · 1', 'Everyone else · 5']);
  // The household heading comes right before its guests.
  const order = await kit.locator('[data-names] > *').evaluateAll((els) => els.map((e) => e.dataset.household || (e.querySelector('[data-guest]') || {}).dataset?.guest || ''));
  expect(order.slice(0, 3)).toEqual(['Family', 'g0', 'g2']);
});

test('the find box shows from 8 names and matches the group and the email', async ({ page }) => {
  const kit = await boot(page);
  const find = kit.getByRole('searchbox', { name: 'Find someone on the list' });
  await expect(find).toBeVisible();
  await find.fill('work');
  await expect(kit.locator('[data-names] [data-guest]')).toHaveCount(1);
  await expect(kit.locator('[data-guest="g3"]')).toBeVisible();
  await find.fill('sam lane');
  await expect(kit.locator('[data-names] [data-guest]')).toHaveCount(1);
  await expect(kit.locator('[data-guest="g0"]')).toBeVisible();
});

test('on an iPad in landscape the rows carry their tags too — 1194x834', async ({ page }) => {
  const kit = await boot(page, 1194, 834);
  // On an iPad the first guest's group is already open (three panes, UX_13).
  const yes = kit.locator('[data-group="yes"]');
  if ((await yes.getAttribute('aria-expanded')) !== 'true') await yes.click();
  await expect(kit.locator('[data-guest="g0"] [data-tags]')).toHaveText('+1 Sam Lane · Vegetarian');
  await expect(kit.locator('[data-household]').first()).toHaveText('Family · 2');
});
