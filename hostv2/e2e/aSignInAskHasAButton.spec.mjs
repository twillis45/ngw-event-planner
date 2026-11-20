// ─── A SIGN-IN ASK HAS A BUTTON (design audit batch 1, 11/20/2026) ──────────
//
// Co-hosts, Share with family and the calendar subscription each told a
// signed-out host "Sign in and keep this plan first — …" and offered no way to
// do it: Co-hosts and Share rendered exactly two controls, back and close.
// Each now carries "Sign in", the same keep-this-plan sign-in the plan's
// banner opens (You & settings, scrolled to the email field), and Close from
// there returns to the sheet that asked.
//
// On the rsvpsync bundle (5277): the one built with BOTH a (fake) Supabase
// project and an API base. Without Supabase there is no sign-in to offer, and
// the button is rightly absent; without an API base these sheets do not render
// their account half at all. Every request to either host is answered here.
import { test, expect, settled, sheetSettled, openSectionByName } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

const BASE = previewUrl(5277);
const PROJECT = 'https://rsvpsync.supabase.co';
const API = 'https://rsvpsync-mock.invalid';

const EVENT = { id: 'signin-ask-ev', name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: '2027-11-20',
  createdAt: '2026-11-01T10:00:00.000Z', guests: [], vendors: [], budget: [], timeline: [] };

const boot = async (page) => {
  await page.route(`${PROJECT}/**`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto(BASE + '?elegant=1');
  await settled(page);
};

const SHEETS = [
  ['Co-hosts', '[data-cohosts-signed-out]'],
  ['Share with family', '[data-family-signed-out]'],
  ['Calendar', '[data-cal-sub-signed-out]'],
];

for (const [section, ask] of SHEETS) {
  test(`${section}: signed out, the ask to sign in comes with a Sign in button that opens sign-in`, async ({ page }) => {
    await boot(page);
    await openSectionByName(page, section);
    await expect(page.locator('#sheet-title')).toHaveText(section, { timeout: 8000 });
    await sheetSettled(page);
    await expect(page.locator(`.sheet ${ask}`)).toContainText('Sign in and keep this plan first');
    const btn = page.locator('.sheet').getByRole('button', { name: 'Sign in', exact: true });
    await expect(btn).toHaveCount(1);
    await btn.scrollIntoViewIfNeeded();
    await expect(btn).toBeVisible();
    await btn.click();
    // It opens sign-in: the keep-this-plan sign-in, with its email field.
    await expect(page.locator('#sheet-title')).toHaveText('You & settings', { timeout: 8000 });
    await expect(page.locator('[data-keep-signin]')).toBeVisible();
    await expect(page.locator('input[aria-label="Email for sign-in link"]')).toBeVisible();
    // And the way out of sign-in goes back to the sheet that asked.
    await page.locator('.sheet .sheet-head .sheet-x').click();
    await expect(page.locator('#sheet-title')).toHaveText(section, { timeout: 8000 });
  });
}
