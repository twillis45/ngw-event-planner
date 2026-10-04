// ─── A SHORTLIST IS A THINKING TOOL, AND THINKING REVERSES ──────────────────
//
// Host, 2026-10-04: "allow host to remove properties." Soft remove with undo
// was the chosen design.
//
// TWO THINGS THIS GUARDS, and only one is about removing.
//
// 1. The control has to be WHERE THE HOST IS. The first cut put it only in
//    the list, which is unreachable in the normal case — `deckShown` is true
//    the moment one place is live, and the deck replaces the list. A button
//    nobody can reach is not a feature, and jest cannot see that at all.
//
// 2. A removal must never read as a fall-through. `gone` already existed and
//    was the obvious reuse; it drives "Casa Verde fell through", which is a
//    lie about a decision the host made on purpose.
import { test, expect } from './fixtures.mjs';

const EV = {
  id: 'E2E_remove', type: 'Reunion', name: 'Anaheim reunion',
  isDestination: true, venueCity: 'Anaheim', venueState: 'CA',
  date: '2027-03-12', endDate: '2027-03-15',
  guestMode: 'count', guestEstimate: 16, guestCount: 16, totalBudget: 12000,
  budget: [], guests: [], vendors: [], timeline: [],
  lodgingOptions: [
    { id: 'o1', label: 'Casa Grande', url: 'https://www.airbnb.com/rooms/1', bedrooms: 8, beds: 12, pricePerNight: 900, status: 'option' },
    { id: 'o2', label: 'Hilltop House', url: 'https://www.airbnb.com/rooms/2', bedrooms: 5, beds: 9, pricePerNight: 700, status: 'option' },
  ],
};

const boot = async (page) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('./?demo=lodging');
  await page.locator('.lc-wrap').waitFor({ state: 'visible', timeout: 20_000 });
};

test('the host can take a place off the shortlist, and put it back', async ({ page }) => {
  await boot(page);

  // REACHABLE: named by the place, because with two houses on screen a bare
  // "Remove" cannot say which one answered.
  const remove = page.getByRole('button', { name: /Remove Casa Grande from the shortlist/i }).first();
  await expect(remove).toBeVisible();
  await remove.click();

  // The way back is offered immediately and NAMES the place.
  const undo = page.getByRole('button', { name: /Put Casa Grande back on the shortlist/i }).first();
  await expect(undo).toBeVisible({ timeout: 10_000 });

  // And it is never described as a loss.
  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).not.toContain('fell through');
  expect(body).not.toContain('no longer available');

  await undo.click();
  // Back on the shortlist means the remove control is offered again.
  await expect(
    page.getByRole('button', { name: /Remove Casa Grande from the shortlist/i }).first(),
  ).toBeVisible({ timeout: 10_000 });
});

test('removing survives a reload — soft is not the same as temporary', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: /Remove Hilltop House from the shortlist/i }).first().click();
  await page.getByRole('button', { name: /Put Hilltop House back/i }).first().waitFor({ timeout: 10_000 });

  // The seed is an addInitScript and re-runs on reload, so it would wipe the
  // write and this would pass for the wrong reason. Assert SURVIVAL by
  // reading what was actually stored, which the seed cannot fake.
  const stored = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]');
    const ev = list.find((e) => e.id === 'E2E_remove');
    return (ev.lodgingOptions || []).map((o) => [o.id, o.status]);
  });
  expect(stored).toContainEqual(['o2', 'removed']);
  expect(stored).toContainEqual(['o1', 'option']);
});
