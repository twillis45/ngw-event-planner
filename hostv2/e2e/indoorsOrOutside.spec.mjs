// ─── INDOORS OR OUTSIDE ──────────────────────────────────────────────────────
// Owner, 11/18/2026: "App needs an indoor and outdoor". hostv2 never asked, so
// the rain backup was guessed from the venue name. The host's answer now sets
// it: "Indoors" takes the rain backup off, "Outside" puts it on.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const openSpace = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, {
    id: 'e2e-io', name: 'Game night', type: 'Game Night', date: dateIn(10), recordKind: 'host_event',
    venue: '271 Whitaker Rd, Pasadena MD', venueKind: 'home', venueConfirmed: true, venueCity: 'Pasadena',
    guestMode: 'count', guestEstimate: 8, guestCountSource: 'host', budget: [], vendors: [], guests: [],
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Space, seats');
  return page.locator('.sheet').last();
};
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].indoorOutdoor || null);

test('"Indoors" takes the rain backup off the place checks', async ({ page }) => {
  const sheet = await openSpace(page);
  await expect(sheet).toContainText('Rain backup');                 // premise: asked before she answers
  await sheet.locator('[data-indoor-outdoor="indoor"]').click();
  await expect.poll(() => saved(page)).toBe('indoor');
  await expect(sheet).not.toContainText('Rain backup');
  await expect(sheet.locator('[data-indoor-outdoor="indoor"]')).toHaveAttribute('aria-pressed', 'true');
});

test('"Outside" makes the rain backup a risk, and a second tap clears the answer', async ({ page }) => {
  const sheet = await openSpace(page);
  const outside = sheet.locator('[data-indoor-outdoor="outdoor"]');
  await outside.click();
  await expect.poll(() => saved(page)).toBe('outdoor');
  await expect(sheet).toContainText('Rain backup');
  await page.screenshot({ path: test.info().outputPath('indoor-outdoor.png') });
  await outside.click();
  await expect.poll(() => saved(page)).toBe(null);
});

// DIFM (owner, 11/18/2026): the inference is kept and offered, not removed.
test('a park venue: the app proposes "outside" with its reason, and one tap takes it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, {
    id: 'e2e-park', name: 'Game night', type: 'Game Night', date: dateIn(10), recordKind: 'host_event',
    venue: 'Druid Hill Park pavilion', venueKind: 'venue', venueCity: 'Baltimore', venueState: 'MD',
    guestMode: 'count', guestEstimate: 8, guestCountSource: 'host', budget: [], vendors: [], guests: [],
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Space, seats');
  const offer = page.locator('[data-outdoors-guess]');
  await expect(offer).toContainText('Druid Hill Park pavilion');
  expect(await saved(page)).toBe(null);                               // proposing stores nothing
  await page.screenshot({ path: test.info().outputPath('outdoors-guess.png') });
  await offer.getByRole('button', { name: 'Yes, outside' }).click();
  await expect.poll(() => saved(page)).toBe('outdoor');
  await expect(offer).toHaveCount(0);
});
