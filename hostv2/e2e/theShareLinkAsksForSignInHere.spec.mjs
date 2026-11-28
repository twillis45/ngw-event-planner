// ─── SHARE THE LINK ASKS FOR SIGN-IN HERE (live check of 2b71d6e0, 11/28/2026) ─
// After #322 every kit step that needs an account offers hostv2's own sign-in,
// except one: signed out, ⋯ More → "Share the link" still said "Open it once in
// the current app, signed in, and it saves." Owner: "Fix both." The line now
// says why in plain words and offers Sign in right there, which opens hostv2's
// sign-in over Guests. Made-up names only.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const EV = {
  id: 'gk-share', name: 'Thanksgiving at ours', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(20), startTime: '15:00', startTimeSource: 'host', venueKind: 'home', venueCity: 'Springfield, VA',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: dateIn(10),
  vendors: [], budget: [], timeline: [],
  guests: [{ id: 'g0', name: 'Rosa Lane', email: 'rosa@example.com' }],
};

test('signed out, Share the link says why and offers Sign in here — 390x844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
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
  await kit.locator('[data-share-link]').click();
  const line = kit.locator('[data-share-line]');
  await expect(line).toContainText('Your reply link isn’t ready.');
  await expect(line).not.toContainText(/current app/i);
  await line.getByRole('button', { name: 'Sign in' }).click();
  await expect(kit).toHaveCount(0);
  await expect(page.locator('.sheet')).toBeVisible();
});
